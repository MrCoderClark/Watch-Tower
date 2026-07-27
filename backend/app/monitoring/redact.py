"""Walks a decoded payload and masks anything that looks like a secret.

Applied at ingest time, before persistence. There is no un-redact — err
toward masking too much rather than too little.
"""

from __future__ import annotations

import re
from typing import Any

REDACTED = "[Filtered]"

_SENSITIVE_KEY = re.compile(
    r"(?i)(password|passwd|secret|token|api[_-]?key|apikey|authorization|"
    r"auth|access[_-]?token|refresh[_-]?token|session[_-]?id|"
    r"ssn|credit[_-]?card|card[_-]?number|cvv|cvc|pin)"
)
_SENSITIVE_HEADER = re.compile(
    r"(?i)^(authorization|proxy-authorization|cookie|set-cookie|"
    r"x-api-key|x-auth-token|x-access-token|x-csrf-token)$"
)
_JWT_LIKE = re.compile(r"^ey[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{4,}$")
_LONG_DIGITS = re.compile(r"^\d{13,19}$")


def redact(payload: Any) -> Any:
    """Return a new payload with sensitive values masked. Never mutates input."""
    return _walk(payload, parent_key=None)


def _walk(value: Any, parent_key: str | None) -> Any:
    if isinstance(value, dict):
        return {k: _walk(v, parent_key=k) for k, v in value.items()}
    if isinstance(value, list):
        return [_walk(v, parent_key=parent_key) for v in value]
    if isinstance(value, str):
        return _mask_string(value, parent_key)
    return value


def _mask_string(value: str, parent_key: str | None) -> str:
    if parent_key is not None and _SENSITIVE_HEADER.match(parent_key):
        return REDACTED
    if parent_key is not None and _SENSITIVE_KEY.search(parent_key):
        return REDACTED
    if _JWT_LIKE.match(value):
        return REDACTED
    if _LONG_DIGITS.match(value) and _luhn(value):
        return REDACTED
    return value


def _luhn(digits: str) -> bool:
    total = 0
    reverse = digits[::-1]
    for i, ch in enumerate(reverse):
        n = int(ch)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


if __name__ == "__main__":
    # tiny self-check, ponytail
    assert redact({"password": "hunter2"}) == {"password": REDACTED}
    assert redact({"Authorization": "Bearer x"}) == {"Authorization": REDACTED}
    assert redact({"credit_card": "4111111111111111"}) == {"credit_card": REDACTED}
    assert redact({"note": "hello"}) == {"note": "hello"}
    assert redact({"headers": {"Cookie": "sid=abc"}}) == {"headers": {"Cookie": REDACTED}}
    assert redact({"token": "eyJhbGciOi.eyJzdWIiOi.abcdef"}) == {"token": REDACTED}
    # a bare JWT value under a non-sensitive key still gets masked
    assert redact({"note": "eyJhbGciOi.eyJzdWIiOi.abcdef"}) == {"note": REDACTED}
    # digit strings that aren't valid Luhn stay
    assert redact({"any": "1234567890123"}) == {"any": "1234567890123"}
    print("redact self-check ok")
