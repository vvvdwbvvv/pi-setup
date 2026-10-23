#!/usr/bin/env python3
"""Search DuckDuckGo Lite HTML and print title / resolved URL / snippet."""

from __future__ import annotations

import re
import sys
import urllib.parse
import urllib.request


def clean_html(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value).strip()


def resolve_url(href: str) -> str:
    """Unwrap DuckDuckGo redirect links when possible."""
    parsed = urllib.parse.urlparse(href)
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        qs = urllib.parse.parse_qs(parsed.query)
        if "uddg" in qs and qs["uddg"]:
            return urllib.parse.unquote(qs["uddg"][0])
    return href


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: web_search.py <search_term>", file=sys.stderr)
        return 2

    query = urllib.parse.urlencode({"q": sys.argv[1]})
    req = urllib.request.Request(
        f"https://html.duckduckgo.com/html/?{query}",
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
    )
    try:
        html = urllib.request.urlopen(req, timeout=15).read().decode(
            "utf-8", errors="replace"
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Error: search failed: {exc}", file=sys.stderr)
        return 1

    pattern = re.compile(
        r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>'
        r'.*?class="result__snippet"[^>]*>(.*?)</(?:a|td)>',
        re.S,
    )
    found = 0
    for match in pattern.finditer(html):
        href, title, snippet = match.groups()
        url = resolve_url(href)
        print(f"- {clean_html(title)}")
        print(f"  URL: {url}")
        print(f"  Snippet: {clean_html(snippet)}")
        print()
        found += 1

    if found == 0:
        print("No results parsed from DuckDuckGo Lite HTML.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
