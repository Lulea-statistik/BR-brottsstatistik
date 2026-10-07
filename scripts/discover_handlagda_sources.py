from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urljoin

import requests

URL = "https://bra.se/statistik/statistik-om-rattsvasendet/handlagda-brott"
OUT = Path("data/handlagda_source_discovery.json")


def main() -> None:
    r = requests.get(URL, timeout=60, headers={"User-Agent": "Lulea-statistik/1.0"})
    r.raise_for_status()
    html = r.text

    urls = set()
    for attr in ("href", "src", "action"):
        for value in re.findall(rf'{attr}\s*=\s*["\']([^"\']+)["\']', html, flags=re.I):
            urls.add(urljoin(URL, value))

    interesting = sorted(
        u for u in urls
        if any(k in u.lower() for k in (
            "300", "310", "320", "handlag", "xlsx", "xls", "excel", "download",
            "api", "statistik", "table", "tabell"
        ))
    )

    snippets = {}
    flat = re.sub(r"\s+", " ", html)
    for table_id in ("300", "310", "320"):
        hits = []
        for m in re.finditer(table_id, flat, flags=re.I):
            hits.append(flat[max(0, m.start()-500):m.end()+900])
            if len(hits) >= 8:
                break
        snippets[table_id] = hits

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source_url": URL,
        "status_code": r.status_code,
        "content_type": r.headers.get("content-type"),
        "html_length": len(html),
        "interesting_urls": interesting,
        "table_snippets": snippets,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"html_length={len(html)}")
    print(f"interesting_urls={len(interesting)}")
    for u in interesting:
        print(u)


if __name__ == "__main__":
    main()
