"""Runnable check: `python test_sdk.py`. No pytest dep.

Verifies init parses DSN, capture_exception builds a valid envelope, and the
payload matches the shape the backend ingest endpoint accepts.
"""
from __future__ import annotations

import json
import sys
from unittest.mock import MagicMock

sys.path.insert(0, ".")

import watchtower_sdk as wt


def _patch_client():
    sent = []

    def _capture(kind, batch):
        if not batch:
            return
        sent.append(
            {
                "url": wt._endpoint_url(kind),
                "headers": {"X-Watchtower-Key": wt._cfg["key"]},
                "body": list(batch),
            }
        )

    wt._do_post = _capture
    return sent


def _flush():
    wt._flush_all()


def test_capture_exception():
    wt._reset()
    wt.init(
        dsn="http://localhost:8000/wt_pub_test",
        environment="test",
        release="0.1.0",
        install_excepthook=False,
    )
    sent = _patch_client()

    try:
        raise ValueError("boom")
    except ValueError:
        eid = wt.capture_exception()
    _flush()

    assert eid is not None
    assert len(sent) == 1
    assert sent[0]["url"] == "http://localhost:8000/api/v1/ingest/events"
    assert sent[0]["headers"]["X-Watchtower-Key"] == "wt_pub_test"
    [event] = sent[0]["body"]
    assert event["platform"] == "python"
    assert event["environment"] == "test"
    assert event["release"] == "0.1.0"
    assert event["exception"]["type"] == "ValueError"
    assert event["exception"]["value"] == "boom"
    frames = event["exception"]["stacktrace"]["frames"]
    assert len(frames) > 0
    assert frames[-1]["function"] == "test_capture_exception"
    # Envelope must be JSON-serializable end-to-end.
    json.dumps(sent[0]["body"])
    print("capture_exception OK")


def test_capture_message():
    wt._reset()
    wt.init(dsn="http://localhost:8000/wt_pub_test", install_excepthook=False)
    sent = _patch_client()
    eid = wt.capture_message("hello", level="warning")
    _flush()
    assert eid is not None
    [event] = sent[0]["body"]
    assert event["message"] == "hello"
    assert event["level"] == "warning"
    print("capture_message OK")


def test_dsn_missing_key_raises():
    wt._reset()
    try:
        wt.init(dsn="http://localhost:8000/")
    except ValueError as e:
        assert "project key" in str(e)
        print("dsn validation OK")
        return
    raise AssertionError("expected ValueError")


def test_log_handler():
    import logging
    from watchtower_sdk.logging import WatchtowerLogHandler

    wt._reset()
    wt.init(dsn="http://localhost:8000/wt_pub_test", install_excepthook=False)
    sent = _patch_client()
    logger = logging.getLogger("test.demo")
    logger.addHandler(WatchtowerLogHandler())
    logger.setLevel(logging.INFO)
    logger.info("hello from tests", extra={"user_id": "42"})
    _flush()
    assert len(sent) == 1
    assert sent[0]["url"].endswith("/api/v1/ingest/logs")
    [env] = sent[0]["body"]
    assert env["level"] == "info"
    assert env["service"] == "test.demo"
    assert env["message"] == "hello from tests"
    assert env["attributes"]["user_id"] == "42"
    print("log_handler OK")


def test_start_transaction_with_spans():
    wt._reset()
    wt.init(dsn="http://localhost:8000/wt_pub_test", install_excepthook=False)
    sent = _patch_client()
    with wt.start_transaction("GET /demo", op="http.server") as txn:
        with wt.start_span("db.query", "SELECT 1"):
            pass
        with wt.start_span("db.query", "SELECT 2"):
            pass
    _flush()
    assert len(sent) == 1
    assert sent[0]["url"].endswith("/api/v1/ingest/transactions")
    [env] = sent[0]["body"]
    assert env["name"] == "GET /demo"
    assert env["op"] == "http.server"
    assert env["status"] == "ok"
    assert len(env["spans"]) == 2
    assert env["spans"][0]["op"] == "db.query"
    assert env["spans"][0]["description"] == "SELECT 1"
    print("start_transaction OK")


if __name__ == "__main__":
    test_capture_exception()
    test_capture_message()
    test_dsn_missing_key_raises()
    test_log_handler()
    test_start_transaction_with_spans()
    print("all checks passed")
