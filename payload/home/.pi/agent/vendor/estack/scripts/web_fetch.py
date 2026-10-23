#!/usr/bin/env python3
"""Fetch a URL and print readable text (HTML stripped)."""

from __future__ import annotations

import re
import sys
import urllib.request
from html.parser import HTMLParser


class ToText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.out: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        if tag in ("p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "pre"):
            self.out.append("\n")

    def handle_data(self, data: str) -> None:
        self.out.append(data)


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: web_fetch.py <url>", file=sys.stderr)
        return 2

    url = sys.argv[1]
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; estack-webfetch/1.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            ctype = resp.headers.get("Content-Type", "")
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001 — surface fetch failures clearly
        print(f"Error: fetch failed: {exc}", file=sys.stderr)
        return 1

    if "html" not in ctype.lower():
        print(raw[:40000])
        return 0

    raw = re.sub(r"(?is)<(script|style|noscript|svg).*?>.*?</\1>", "", raw)
    parser = ToText()
    parser.feed(raw)
    text = re.sub(r"\n{3,}", "\n\n", "".join(parser.out)).strip()
    print(text[:40000])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
