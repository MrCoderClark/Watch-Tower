"""Fingerprint an event into a stable grouping key.

Order of preference:
1. Client-supplied `fingerprint` (list of strings)
2. Last three stacktrace frames (function + module, line numbers dropped)
3. exception.type + message
4. message alone
"""

from __future__ import annotations

import hashlib

from app.schemas.envelope import EventEnvelope, Frame


def fingerprint(event: EventEnvelope) -> str:
    parts = _parts(event)
    joined = "\x1f".join(parts)  # unit separator, safer than any ascii glyph
    return hashlib.blake2b(joined.encode("utf-8"), digest_size=16).hexdigest()


def _parts(event: EventEnvelope) -> list[str]:
    if event.fingerprint:
        return [_normalize(p) for p in event.fingerprint if p]

    exc = event.exception
    if exc is not None and exc.stacktrace is not None and exc.stacktrace.frames:
        frames = _significant_frames(exc.stacktrace.frames)[-3:]
        if frames:
            return [f"stack:{_frame_key(f)}" for f in frames]

    if exc is not None:
        return [f"type:{exc.type}", f"msg:{_normalize(exc.value or event.message or '')}"]

    return [f"msg:{_normalize(event.message or '')}"]


def _significant_frames(frames: list[Frame]) -> list[Frame]:
    in_app = [f for f in frames if f.in_app]
    return in_app or frames


def _frame_key(frame: Frame) -> str:
    fn = frame.function or "?"
    mod = frame.module or frame.filename or "?"
    return f"{mod}:{fn}"


def _normalize(s: str) -> str:
    return " ".join(s.strip().split())


if __name__ == "__main__":
    from app.schemas.envelope import ExceptionInfo, Stacktrace

    a = EventEnvelope(exception=ExceptionInfo(type="TypeError", value="undefined"))
    b = EventEnvelope(exception=ExceptionInfo(type="TypeError", value="undefined"))
    assert fingerprint(a) == fingerprint(b)

    c = EventEnvelope(
        exception=ExceptionInfo(
            type="TypeError",
            value="x",
            stacktrace=Stacktrace(
                frames=[
                    Frame(function="foo", module="app.a", lineno=1),
                    Frame(function="bar", module="app.b", lineno=2),
                ]
            ),
        )
    )
    d = EventEnvelope(
        exception=ExceptionInfo(
            type="TypeError",
            value="y",  # different message
            stacktrace=Stacktrace(
                frames=[
                    Frame(function="foo", module="app.a", lineno=999),  # different line
                    Frame(function="bar", module="app.b", lineno=888),
                ]
            ),
        )
    )
    assert fingerprint(c) == fingerprint(d), "stacktrace groups regardless of line/msg"

    e = EventEnvelope(
        fingerprint=["custom", "override"], exception=ExceptionInfo(type="X")
    )
    f = EventEnvelope(fingerprint=["custom", "override"])
    assert fingerprint(e) == fingerprint(f), "custom fingerprint wins"

    print("fingerprint self-check ok")
