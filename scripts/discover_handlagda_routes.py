from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urljoin

import requests

PAGE = "https://bra.se/statistik/statistik-om-rattsvasendet/handlagda-brott"
OUT = Path("data/handlagda_route_discovery.json")


def main() -> None:
    s = requests.Session()
    s.headers.update({"User-Agent": "Lulea-statistik/1.0"})
    html = s.get(PAGE, timeout=60).text

    resource_urls = sorted(set(
        urljoin(PAGE, u)
        for u in re.findall(r'(?:src|href)=["\']([^"\']*webapp-resource[^"\']+)["\']', html, flags=re.I)
    ))

    # If a CSS asset exists for an app version, try its JS sibling too.
    candidates = set(resource_urls)
    for u in list(resource_urls):
        if u.endswith(".css"):
            candidates.add(u[:-4] + ".js")

    assets = []
    terms = ("formPeriodRegion", "category", "prefix", "period", "region",
             "download", "statisticsdownload", "fetch(", "request(", "router",
             "axios", "api/", "/rest", "fileId")
    for u in sorted(candidates):
        if not u.endswith(".js"):
            continue
        try:
            r = s.get(u, timeout=60)
            rec = {"url": u, "status": r.status_code, "length": len(r.text), "matches": []}
            if r.ok:
                text = r.text
                low = text.lower()
                for term in terms:
                    pos = low.find(term.lower())
                    if pos >= 0:
                        rec["matches"].append({
                            "term": term,
                            "excerpt": text[max(0, pos-700):pos+1800],
                        })
                # Capture string literals that look like route names/paths.
                routeish = sorted(set(re.findall(
                    r'["\']([^"\']{1,180}(?:download|region|period|statistic|file|route|api)[^"\']{0,180})["\']',
                    text, flags=re.I
                )))
                rec["routeish_strings"] = routeish[:200]
            assets.append(rec)
        except Exception as exc:
            assets.append({"url": u, "error": repr(exc)})

    OUT.write_text(json.dumps({
        "page": PAGE,
        "resource_urls": resource_urls,
        "assets": assets,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    for a in assets:
        print(a.get("url"), a.get("status"), a.get("length"), len(a.get("matches", [])))


if __name__ == "__main__":
    main()
