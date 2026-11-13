"""Fetch Brå monthly observations by crime category for Norrbotten.

Uses exactly the monthly crime IDs from data/categories.csv, not annual IDs.
Does not sum overlapping categories. Suppressed/missing observations remain absent.
Fetches in small region/crime batches to limit API response size.
The existing data/monthly_norrbotten.csv remains the authoritative total-crimes source.
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
OUTPUT = ROOT / "data" / "monthly_norrbotten_categories.csv"
CATEGORY_FILE = ROOT / "data" / "categories.csv"
MUNICIPALITIES = [
    "Arjeplog", "Arvidsjaur", "Boden", "Gällivare", "Haparanda",
    "Jokkmokk", "Kalix", "Kiruna", "Luleå", "Pajala",
    "Piteå", "Älvsbyn", "Överkalix", "Övertorneå",
]
FIRST_YEAR = int(os.getenv("MONTHLY_FIRST_YEAR", str(date.today().year - 5)))
REGION_BATCH = int(os.getenv("MONTHLY_REGION_BATCH", "2"))
CRIME_BATCH = int(os.getenv("MONTHLY_CRIME_BATCH", "10"))
# Zero means all monthly categories, including detailed levels.
MAX_LEVEL = int(os.getenv("MONTHLY_MAX_CRIME_LEVEL", "0"))


def regions_by_id(topic):
    selected = {}
    for name in MUNICIPALITIES:
        pattern = re.compile(r"\b" + re.escape(name) + (r"s?" if name == "Boden" else "") + r"\s+kommun\b", re.I)
        candidates = [
            region for region in topic.regions
            if any(pattern.search(str(getattr(region, field, "") or "")) for field in ("label", "label_short"))
        ]
        if len(candidates) != 1:
            raise RuntimeError(f"Ambiguous region for {name}: {[r.label for r in candidates]}")
        selected[str(candidates[0].id)] = (name, candidates[0])
    if len(selected) != len(MUNICIPALITIES):
        raise RuntimeError("Duplicate region IDs")
    return selected


def monthly_crimes(topic):
    with CATEGORY_FILE.open(encoding="utf-8-sig", newline="") as handle:
        entries = {
            int(row["Brott_ID"]): row
            for row in csv.DictReader(handle)
            if row["Tillgänglig_månad_kvartal"].strip().lower() == "true"
            and (not MAX_LEVEL or int(row["Brottsnivå"]) <= MAX_LEVEL)
        }
    catalog = {}
    for crime in topic.crimes:
        try:
            crime_id = int(crime.id)
        except (TypeError, ValueError):
            continue
        if crime_id in entries and crime_id != 13192:
            catalog[crime_id] = crime
    missing = sorted(set(entries) - set(catalog) - {13192})
    if missing:
        # Brå may cease older categories. Log but do not invent observations.
        print(f"Categories absent in current Brå topic ({len(missing)}): {missing[:30]}", flush=True)
    if not catalog:
        raise RuntimeError("No monthly crime categories available")
    return sorted(catalog.items())


def main():
    if REGION_BATCH < 1 or CRIME_BATCH < 1:
        raise ValueError("Batch sizes must be positive")
    topic = select_topics(BRA()).month_quarter
    regions = regions_by_id(topic)
    crimes = monthly_crimes(topic)
    selected_regions = list(regions.values())
    print(f"Fetching {len(crimes)} categories across {len(regions)} municipalities", flush=True)
    records = {}
    today = date.today()

    for start in range(0, len(crimes), CRIME_BATCH):
        crime_batch = crimes[start:start + CRIME_BATCH]
        allowed = {str(cid) for cid, _ in crime_batch}
        print(f"Category batch {start//CRIME_BATCH+1}/{(len(crimes)+CRIME_BATCH-1)//CRIME_BATCH}", flush=True)
        for offset in range(0, len(selected_regions), REGION_BATCH):
            region_batch = selected_regions[offset:offset + REGION_BATCH]
            result = topic.query(
                regions=[region.label for _, region in region_batch],
                crimes=[crime.label for _, crime in crime_batch],
                period_start=f"{FIRST_YEAR}-01-01",
                period_end=today.strftime("%Y-%m-%d"),
                measures=["count"],
                ignore_ceased_regions=True,
                ignore_ceased_crimes=False,
            )
            frame = result.data.dataframe
            if frame.empty:
                # No reported category observations for the given region batch.
                continue
            frame = frame[
                (frame["periodicity"] == "monthly")
                & (frame["crime_id"].astype(str).isin(allowed))
                & (frame["measure_id"].astype(str) == "count")
            ]
            for row in frame.itertuples(index=False):
                region_id = str(row.region_id)
                if region_id not in regions:
                    raise RuntimeError(f"Unexpected Brå region {region_id}")
                crime_id = int(row.crime_id)
                municipality = regions[region_id][0]
                stamp = pd.Timestamp(row.timepoint)
                value = pd.to_numeric(row.value, errors="coerce")
                if pd.isna(value) or value < 0:
                    continue
                if not float(value).is_integer():
                    raise RuntimeError(f"Fractional count: {municipality}, {crime_id}, {stamp}")
                key = (municipality, stamp.year, stamp.month, crime_id)
                item = (municipality, int(stamp.year), int(stamp.month), crime_id,
                        int(value), "prel" in normalize_text(row.period))
                if key in records and records[key] != item:
                    raise RuntimeError(f"Conflicting category observation: {key}")
                records[key] = item
    if not records:
        raise RuntimeError("No category observations found; refusing overwrite")
    municipalities = {key[0] for key in records}
    if municipalities != set(MUNICIPALITIES):
        raise RuntimeError(f"Municipalities without category observations: {sorted(set(MUNICIPALITIES)-municipalities)}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["kommun", "year", "month", "crime_id", "count", "preliminary"])
        for key in sorted(records):
            writer.writerow(records[key])
    temporary.replace(OUTPUT)
    print(f"Wrote {len(records)} observations, {len({key[3] for key in records})} categories", flush=True)


if __name__ == "__main__":
    main()
