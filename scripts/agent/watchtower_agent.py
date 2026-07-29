"""Watchtower host agent — single file, psutil-based.

    pip install psutil httpx
    python watchtower_agent.py --config agent.toml

Config (agent.toml):
    dsn = "http://localhost:8000/wt_sec_xxx"
    hostname = "web-1"          # optional, defaults to socket.gethostname()
    interval_seconds = 60

Sends one metric envelope per tick to POST /api/v1/ingest/metrics.
Requires a **secret** project key (wt_sec_...). Public keys are rejected.
"""
from __future__ import annotations

import argparse
import logging
import socket
import sys
import time
import tomllib
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx
import psutil

__version__ = "0.1.0"

log = logging.getLogger("watchtower.agent")


def _parse_dsn(dsn: str) -> tuple[str, str]:
    """Returns (ingest_url, key). DSN shape: <origin>/<key>."""
    p = urlparse(dsn)
    key = p.path.strip("/").split("/")[-1]
    if not key:
        raise SystemExit("agent: DSN missing project key")
    return f"{p.scheme}://{p.netloc}/api/v1/ingest/metrics", key


def _sample(hostname: str, interval: int, last_net: dict[str, int]) -> dict:
    vm = psutil.virtual_memory()
    du = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    rx_delta = max(0, net.bytes_recv - last_net.get("rx", net.bytes_recv))
    tx_delta = max(0, net.bytes_sent - last_net.get("tx", net.bytes_sent))
    last_net["rx"] = net.bytes_recv
    last_net["tx"] = net.bytes_sent
    return {
        "hostname": hostname,
        "agent_version": __version__,
        "interval_seconds": interval,
        "ts": datetime.now(timezone.utc).isoformat(),
        "cpu_pct": psutil.cpu_percent(interval=None),
        "mem_used_bytes": vm.used,
        "mem_total_bytes": vm.total,
        "disk_used_bytes": du.used,
        "disk_total_bytes": du.total,
        "net_rx_bytes": rx_delta,
        "net_tx_bytes": tx_delta,
        "process_count": len(psutil.pids()),
    }


def run(config_path: Path) -> None:
    cfg = tomllib.loads(config_path.read_text())
    dsn = cfg["dsn"]
    hostname = cfg.get("hostname") or socket.gethostname()
    interval = int(cfg.get("interval_seconds", 60))
    url, key = _parse_dsn(dsn)

    log.info("watchtower agent starting: host=%s interval=%ss", hostname, interval)
    # Prime cpu_percent so the first real sample is non-zero.
    psutil.cpu_percent(interval=None)
    last_net: dict[str, int] = {}
    with httpx.Client(timeout=10.0) as client:
        while True:
            envelope = _sample(hostname, interval, last_net)
            try:
                client.post(
                    url, headers={"X-Watchtower-Key": key}, json=[envelope]
                )
            except httpx.HTTPError as e:
                log.warning("send failed: %s", e)
            time.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        type=Path,
        default=Path.home() / ".watchtower" / "agent.toml",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not args.config.exists():
        sys.exit(f"agent: config not found: {args.config}")
    try:
        run(args.config)
    except KeyboardInterrupt:
        log.info("agent stopped")


if __name__ == "__main__":
    main()
