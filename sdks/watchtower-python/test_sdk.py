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
    client = MagicMock()

    def _post(url, headers=None, json=None):
        sent.append({"url": url, "headers": headers, "body": json})
        return MagicMock(status_code=202)

    client.post.side_effect = _post
    wt._client = client
    return sent


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


if __name__ == "__main__":
    test_capture_exception()
    test_capture_message()
    test_dsn_missing_key_raises()
    print("all checks passed")
