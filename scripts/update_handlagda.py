from __future__ import annotations

import csv
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests

BASE = "https://bra.se"
OUT = Path("data/handlagda_source_catalog.csv")
TABLES = {
    "300": "Utredning och beslut",
    "310": "Misstankt person och beslut",
    "320": "Anmalningsar",
}
REGIONS = {
    "La": "Hela landet",
    "Rn01": "Region Nord",
    "Rn02": "Region Mitt",
    "Rn03": "Region Stockholm",
    "Rn04": "Region Ost",
    "Rn05": "Region Vast",
    "Rn06": "Region Syd",
    "Rn07": "Region Bergslagen",
}


def extract_links(html: str, page_url: str) -> list[str]:
    links = []
    for href in re.findall(r'href\s*=\s*["\']([^"\']+)["\']', html, flags=re.I):
        url = urljoin(page_url, href)
        low = url.lower()
        if any(ext in low for ext in (".xlsx", ".xls", ".csv")):
            links.append(url)
    return sorted(set(links))


def main() -> None:
    session = requests.Session()
    session.headers.update({"User-Agent": "Lulea-statistik/1.0"})
    current_year = datetime.now().year
    rows = []

    for table_id, table_name in TABLES.items():
        for year in range(2014, current_year + 1):
            region_items = {"La": REGIONS["La"]} if year == 2014 else REGIONS
            for region_code, region_name in region_items.items():
                page_url = f"{BASE}/statistik_sidor/{table_id}/{year}/{table_id}{region_code}-{year}.html"
                try:
                    r = session.get(page_url, timeout=45)
                except Exception as exc:
                    print("request_error", table_id, year, region_code, repr(exc))
                    continue
                if r.status_code != 200:
                    print("skip", r.status_code, page_url)
                    continue
                links = extract_links(r.text, page_url)
                if not links:
                    print("no_files", page_url)
                for file_url in links:
                    rows.append({
                        "table_id": table_id,
                        "table_name": table_name,
                        "year": year,
                        "region_code": region_code,
                        "region_name": region_name,
                        "source_page": page_url,
                        "file_url": file_url,
                        "file_name": file_url.rsplit("/", 1)[-1],
                    })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["table_id","table_name","year","region_code","region_name","source_page","file_url","file_name"]
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print("rows", len(rows))
    for table_id in TABLES:
        subset = [r for r in rows if r["table_id"] == table_id]
        print("table", table_id, "files", len(subset))
        for r in subset[-5:]:
            print(r)


if __name__ == "__main__":
    main()
