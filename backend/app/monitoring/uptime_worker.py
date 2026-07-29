"""Uptime worker. Runs a periodic loop that:
1. selects due uptime_checks
2. probes each URL via httpx.AsyncClient
3. records the result
4. on state transition to down (2+ consecutive failures) posts to Slack

Can run standalone via `python -m app.monitoring.uptime_worker`, or attached
to the API process via a FastAPI lifespan task (see main.py). Both are fine
until throughput matters — ponytail: split into its own process when the
uptime volume is worth an isolated deploy.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Project, UptimeCheck, UptimeResult

log = logging.getLogger("watchtower.uptime")

_FAILURES_TO_ALERT = 2
_SUCCESSES_TO_CLEAR = 2
_TICK_SECONDS = 5
_HTTP_SEMAPHORE = asyncio.Semaphore(50)


async def _select_due(session: AsyncSession, now: datetime) -> list[UptimeCheck]:
    stmt = (
        select(UptimeCheck)
        .where(
            and_(
                UptimeCheck.is_enabled.is_(True),
                or_(
                    UptimeCheck.next_run_at.is_(None),
                    UptimeCheck.next_run_at <= now,
                ),
            )
        )
        .limit(200)
    )
    return list((await session.execute(stmt)).scalars().all())


async def _probe(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        r = await client.get(url, timeout=5.0, follow_redirects=True)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return {
            "ok": r.status_code < 400,
            "status_code": r.status_code,
            "latency_ms": latency_ms,
            "error": None,
        }
    except httpx.HTTPError as e:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return {
            "ok": False,
            "status_code": None,
            "latency_ms": latency_ms,
            "error": str(e)[:500],
        }


async def _post_slack(webhook_url: str, text: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(webhook_url, json={"text": text})
    except httpx.HTTPError:
        log.warning("Slack post failed", exc_info=True)


async def _handle_result(
    session: AsyncSession,
    check: UptimeCheck,
    result: dict[str, Any],
    slack_webhook: str | None,
) -> None:
    session.add(
        UptimeResult(
            check_id=check.id,
            ok=result["ok"],
            status_code=result["status_code"],
            latency_ms=result["latency_ms"],
            error=result["error"],
        )
    )

    prev_status = check.last_status
    consecutive = check.consecutive_failures

    if result["ok"]:
        new_consecutive = 0
        # Only flip up once we've cleared the debounce, so a single flaky
        # success doesn't close a real incident.
        should_be_up = (
            prev_status == "up"
            or prev_status is None
            or consecutive < _FAILURES_TO_ALERT
        )
        new_status = "up" if should_be_up else prev_status
    else:
        new_consecutive = consecutive + 1
        new_status = "down" if new_consecutive >= _FAILURES_TO_ALERT else prev_status

    flipped_down = prev_status != "down" and new_status == "down"
    flipped_up = prev_status == "down" and new_status == "up"

    await session.execute(
        update(UptimeCheck)
        .where(UptimeCheck.id == check.id)
        .values(
            last_status=new_status,
            consecutive_failures=new_consecutive,
            last_checked_at=datetime.now(UTC),
            next_run_at=datetime.now(UTC) + timedelta(seconds=check.interval_seconds),
        )
    )
    await session.commit()

    if slack_webhook and flipped_down:
        await _post_slack(
            slack_webhook,
            f":rotating_light: *{check.name}* is DOWN — {check.url}\n"
            f"status: {result['status_code']} error: {result['error'] or 'n/a'}",
        )
    elif slack_webhook and flipped_up:
        await _post_slack(
            slack_webhook,
            f":white_check_mark: *{check.name}* is back UP — {check.url}",
        )


async def _check_once(check: UptimeCheck, client: httpx.AsyncClient) -> None:
    settings = get_settings()
    async with _HTTP_SEMAPHORE:
        result = await _probe(client, check.url)
    async with SessionLocal() as session:
        # Re-fetch inside the new session so state is fresh.
        fresh = await session.get(UptimeCheck, check.id)
        if fresh is None:
            return
        await _handle_result(session, fresh, result, settings.slack_webhook_url)


async def run_worker() -> None:
    log.info("uptime worker started")
    async with httpx.AsyncClient() as client:
        while True:
            now = datetime.now(UTC)
            async with SessionLocal() as session:
                due = await _select_due(session, now)
            if due:
                await asyncio.gather(
                    *(_check_once(c, client) for c in due), return_exceptions=True
                )
            await asyncio.sleep(_TICK_SECONDS)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(run_worker())
