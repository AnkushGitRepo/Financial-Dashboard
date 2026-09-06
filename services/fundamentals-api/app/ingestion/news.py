"""News ingestion (ADR 0015) — free RSS only.

- Broad Indian-markets RSS feeds -> the global markets stream.
- Google News RSS, one query per company name -> stock / portfolio views
  (the symbol tag is exact by construction).

`feedparser` and `vaderSentiment` are synchronous, so parsing runs through
`asyncio.to_thread`. We keep only title + summary + link + published-at +
a VADER *headline-tone* label — no article bodies are fetched or scraped.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import UTC, datetime
from urllib.parse import quote_plus

import feedparser
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

logger = logging.getLogger("fundamentals.news")

# (source label, RSS URL). Markets/business-desk feeds from mainstream
# Indian outlets — each verified live (entries > 0, HTTP 200) when picked.
# Business Standard's markets RSS 403s to non-browser clients, and NDTV
# Profit's feedburner "latest" carries too much non-markets content, so
# neither is here.
BROAD_FEEDS: list[tuple[str, str]] = [
    ("Economic Times Markets", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"),
    ("LiveMint Markets", "https://www.livemint.com/rss/markets"),
    ("BusinessLine Markets", "https://www.thehindubusinessline.com/markets/feeder/default.rss"),
    ("Moneycontrol Business", "https://www.moneycontrol.com/rss/business.xml"),
]

# Corporate suffixes stripped before building a broad-feed name matcher.
_SUFFIX_RE = re.compile(
    r"\b(limited|ltd|corporation|corp|company|co|inc|plc|pvt|private|the)\b\.?",
    re.IGNORECASE,
)
_NONWORD_RE = re.compile(r"[^a-z0-9\s&]+", re.IGNORECASE)

_analyzer = SentimentIntensityAnalyzer()

SENTIMENT_LABELS = ("positive", "neutral", "negative")


def score_sentiment(text: str) -> tuple[str, float]:
    """VADER compound score -> (label, score). Headline tone only — not an
    analyst rating or a trading signal."""
    compound = _analyzer.polarity_scores(text or "")["compound"]
    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    return label, round(compound, 4)


def google_news_rss_url(company_name: str) -> str:
    return (
        "https://news.google.com/rss/search?q="
        + quote_plus(f'"{company_name}" NSE')
        + "&hl=en-IN&gl=IN&ceid=IN:en"
    )


def matcher_name(raw_name: str) -> str | None:
    """A normalised company name for broad-feed tagging, or None if what's
    left after stripping corporate suffixes is too short / ambiguous to
    match on safely (guards against 'ITC', 'MRF', 'LT' as ordinary words)."""
    stripped = _SUFFIX_RE.sub(" ", raw_name)
    stripped = _NONWORD_RE.sub(" ", stripped)
    stripped = re.sub(r"\s+", " ", stripped).strip()
    if len(stripped) < 10 or len(stripped.split()) < 2:
        return None
    return stripped


def build_name_pattern(name: str) -> re.Pattern[str]:
    return re.compile(r"\b" + re.escape(name) + r"\b", re.IGNORECASE)


def tag_symbols(text: str, name_index: list[tuple[str, re.Pattern[str]]]) -> list[str]:
    """Symbols whose matcher-name appears (whole phrase, word-bounded) in
    `text`. Order-preserving, deduped. Empty is a normal result."""
    hits: list[str] = []
    for symbol, pattern in name_index:
        if symbol not in hits and pattern.search(text):
            hits.append(symbol)
    return hits


def _published_at(entry: feedparser.FeedParserDict) -> datetime:
    for key in ("published_parsed", "updated_parsed"):
        parsed = entry.get(key)
        if parsed:
            return datetime(*parsed[:6], tzinfo=UTC)
    return datetime.now(tz=UTC)


def _clean_summary(raw: str | None) -> str | None:
    if not raw:
        return None
    text = re.sub(r"<[^>]+>", "", raw)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None
    return (text[:1996] + "…") if len(text) > 1997 else text


def _google_source(entry: feedparser.FeedParserDict) -> str:
    src = entry.get("source")
    if isinstance(src, dict):
        return (src.get("title") or "Google News").strip()[:128]
    return "Google News"


def entry_to_item(entry: feedparser.FeedParserDict, source: str) -> dict | None:
    title = (entry.get("title") or "").strip()
    link = (entry.get("link") or "").strip()
    if not title or not link:
        return None
    summary = _clean_summary(entry.get("summary"))
    label, score = score_sentiment(f"{title}. {summary or ''}")
    return {
        "url": link[:1024],
        "title": title[:512],
        "summary": summary,
        "source": source[:128],
        "published_at": _published_at(entry),
        "sentiment": label,
        "sentiment_score": score,
    }


def _parse(url: str) -> list[feedparser.FeedParserDict]:
    return list(feedparser.parse(url).entries)


async def fetch_broad_items() -> list[dict]:
    """All items across BROAD_FEEDS. A failing feed is skipped, not fatal."""
    out: list[dict] = []
    for source, url in BROAD_FEEDS:
        try:
            entries = await asyncio.to_thread(_parse, url)
        except Exception as exc:  # noqa: BLE001
            logger.warning("broad feed %s failed: %s", source, exc)
            continue
        out.extend(item for e in entries if (item := entry_to_item(e, source)))
    return out


async def fetch_symbol_items(company_name: str) -> list[dict]:
    """Google-News-RSS items for one company name."""
    try:
        entries = await asyncio.to_thread(_parse, google_news_rss_url(company_name))
    except Exception as exc:  # noqa: BLE001
        logger.warning("google news feed for %r failed: %s", company_name, exc)
        return []
    return [item for e in entries if (item := entry_to_item(e, _google_source(e)))]
