from __future__ import annotations

import json
import re
from pathlib import Path

import requests

ASSET = "https://bra.se/webapp-resource/4.63eed38e192716a4afc1718/360.5efe631a19493c8efed2de96/1738664703154/webapp-assets.js"
OUT = Path("data/handlagda_statselector_probe.json")
RAW = Path("data/statselector_assets.js")


def contexts(text: str, term: str, radius: int = 1800):
    out = []
    low = text.lower()
    needle = term.lower()
    pos = 0
    while True:
        i = low.find(needle, pos)
        if i < 0:
            break
        out.append(text[max(0, i-radius):min(len(text), i+len(term)+radius)])
        pos = i + len(term)
        if len(out) >= 30:
            break
    return out


def main():
    r = requests.get(ASSET, timeout=60, headers={"User-Agent":"Lulea-statistik/1.0"})
    r.raise_for_status()
    text = r.text
    RAW.write_text(text, encoding="utf-8")

    terms = [
        "requester", "router", "formPeriodRegion", "statisticsdownload",
        "downloadLink", "get(", "post(", "region_", "period_", "category",
        "download_", "fileName", "excel", ".xlsx", ".xls"
    ]
    data = {
        "asset": ASSET,
        "length": len(text),
        "contexts": {t: contexts(text, t) for t in terms},
        "route_literals": sorted(set(re.findall(
            r'["\']([/A-Za-z0-9_.?=&%-]{2,160})["\']', text
        )))
    }
    data["route_literals"] = [
        x for x in data["route_literals"]
        if any(k in x.lower() for k in ("region","period","download","stat","file","excel","xlsx","api"))
    ][:500]

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("length", len(text))
    for term, vals in data["contexts"].items():
        print(term, len(vals))
    print("route_literals", data["route_literals"])


if __name__ == "__main__":
    main()
