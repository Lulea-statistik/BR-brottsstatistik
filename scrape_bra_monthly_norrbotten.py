"""Fetch monthly total reported crimes for Norrbotten's 14 municipalities.

Uses the monthly municipal Brå topic and crime 13192, *not* annual data.
Store one observation per municipality/year/month; do not invent missing months.
"""
from __future__ import annotations

import csv
import os
import re
from datetime import date
from pathlib import Path

import pandas as pd
import urllib3
from bra_scraper.BRA import BRA

from scrape_bra import normalize_text, select_topics

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "data" / "monthly_norrbotten.csv"
MUNICIPALITIES = ["Arjeplog","Arvidsjaur","Boden","Gällivare","Haparanda","Jokkmokk","Kalix","Kiruna","Luleå","Pajala","Piteå","Älvsbyn","Överkalix","Övertorneå"]
FIRST_YEAR = int(os.getenv("MONTHLY_FIRST_YEAR", str(date.today().year - 5)))
CRIME_ID = 13192


def resolve_regions(topic):
    matches = {}
    for name in MUNICIPALITIES:
        found = []
        for region in topic.regions:
            label = str(getattr(region, "label", "") or "")
            short = str(getattr(region, "label_short", "") or "")
            # Match municipality name as a separate word, allowing e.g. Bodens kommun.
            candidate = re.escape(name) + ("s?" if name == "Boden" else "")
            if any(re.search(r"\\b" + candidate + r"\\s+kommun\\b", t, re.I)
                   for t in (label, short)):
                found.append(region)
        if len(found) != 1:
            raise RuntimeError(f"Expected exactly one Brå region for {name}: {[r.label for r in found]}")
        matches[str(found[0].id)] = (name, found[0])
    if len(matches) != len(MUNICIPALITIES):
        raise RuntimeError("Ambiguous or duplicate Brå region IDs")
    return matches


def main():
    topic = select_topics(BRA()).month_quarter
    regions = resolve_regions(topic)
    crimes = [c for c in topic.crimes if str(getattr(c, "id", "")) == str(CRIME_ID)]
    if len(crimes) != 1:
        raise RuntimeError(f"Expected one Brå total crime category {CRIME_ID}, found {len(crimes)}")
    today = date.today()
    records = {}
    # Query in smaller batches to keep source response sizes manageable.
    names = list(regions.values())
    for offset in range(0, len(names), 4):
        batch = names[offset:offset + 4]
        print("Fetching:", [name for name, _ in batch], flush=True)
        result = topic.query(
            regions=[region.label for _, region in batch],
            crimes=[crimes[0].label],
            period_start=f"{FIRST_YEAR}-01-01",
            period_end=today.strftime("%Y-%m-%d"),
            measures=["count"],
            ignore_ceased_regions=True,
            ignore_ceased_crimes=False,
        )
        df = result.data.dataframe
        if df.empty:
            raise RuntimeError("Empty Brå response for batch " + repr([x[0] for x in batch]))
        df = df[(df["periodicity"] == "monthly")
                & (df["crime_id"].astype(str) == str(CRIME_ID))
                & (df["measure_id"].astype(str) == "count")]
        for row in df.itertuples(index=False):
            region_id = str(row.region_id)
            if region_id not in regions:
                raise RuntimeError(f"Unexpected Brå region ID: {region_id}")
            municipality = regions[region_id][0]
            stamp = pd.Timestamp(row.timepoint)
            count = pd.to_numeric(row.value, errors="coerce")
            if pd.isna(count) or count < 0:
                continue  # Suppressed/missing observations are not zero.
            if not float(count).is_integer():
                raise RuntimeError(f"Noninteger count: {municipality} {stamp}: {count}")
            key = (municipality, int(stamp.year), int(stamp.month))
            value = (municipality, int(stamp.year), int(stamp.month), int(count),
                     "prel" in normalize_text(row.period))
            if key in records and records[key] != value:
                raise RuntimeError(f"Conflicting monthly values: {key}")
            records[key] = value
    if not records:
        raise RuntimeError("No monthly data found; refusing empty overwrite")
    coverage = {key[0] for key in records}
    if coverage != set(MUNICIPALITIES):
        raise RuntimeError(f"Incomplete municipality coverage, missing {sorted(set(MUNICIPALITIES) - coverage)}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["kommun", "year", "month", "count", "preliminary"])
        for key in sorted(records):
            writer.writerow(records[key])
    print(f"Wrote {len(records)} monthly totals across {len(coverage)} municipalities to {OUT}")


if __name__ == "__main__":
    main()
