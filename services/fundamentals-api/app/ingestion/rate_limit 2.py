"""A simple async token-bucket limiter.

Used to keep Tier 1 traffic to NSE/BSE at the community-reported practical
rate limit (~3 req/s) as ordinary etiquette, not as evasion of anything —
NSE has no published official rate limit for these endpoints since they're
not an official public API in the first place (see ADR 0011).
"""

from __future__ import annotations

import asyncio
import time


class RateLimiter:
    def __init__(self, requests_per_second: float) -> None:
        self._interval = 1.0 / requests_per_second
        self._lock = asyncio.Lock()
        self._last_call = 0.0

    async def wait(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_call
            delay = self._interval - elapsed
            if delay > 0:
                await asyncio.sleep(delay)
            self._last_call = time.monotonic()
