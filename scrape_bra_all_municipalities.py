from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import urllib3

from bra_scraper.BRA import BRA
from scrape_bra import (
    HISTORY_COLUMNS,
    category_meta,
    normalize_text,
    select_topics,
    transform,
)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "data" / "annual_all"
MUNICIPALITIES_PATH = OUT_DIR / "municipalities.csv"
CATEGORIES_PATH = OUT_DIR / "categories_annual.csv"
METADATA_PATH = OUT_DIR / "metadata.json"

START_YEAR = int(os.getenv("START_YEAR", "1996"))
MODE = os.getenv("BRA_ALL_MODE", "update").strip().lower()
TARGET_YEAR = os.getenv("TARGET_YEAR", "").strip()
REGION_BATCH_SIZE = int(os.getenv("REGION_BATCH_SIZE", "25"))

SOURCE_URL = "https://statistik.bra.se/solwebb/action/anmalda/urval/urval?menyid=101"

# Municipalities created after the start of the BRÅ series. They should not be
# required in years before they existed as municipalities.
MUNICIPALITY_START_YEAR = {
    "Nykvarn": 1999,
    "Knivsta": 2003,
}

if MODE not in {"update", "bootstrap", "refresh"}:
    raise SystemExit("BRA_ALL_MODE must be update, bootstrap or refresh")


def annual_topic(scraper: BRA):
    matches = []
    for topic in scraper.topics:
        try:
            if topic.level != "brottstyp":
                continue
        except Exception:
            continue
        label = normalize_text(topic.label)
        if "kommun" in label and "1996" in label and "årsvis" in label and "månads" not in label:
            matches.append(topic)
    if len(matches) != 1:
        raise RuntimeError(
            f"Kunde inte entydigt välja BRÅ:s årsvisa kommun-topic. "
            f"Matchningar: {[getattr(x, 'label', '') for x in matches]}"
        )
    print(f"Vald års-topic: {matches[0].label}")
    return matches[0]


def clean_region_name(region) -> str:
    label = str(getattr(region, "label_short", "") or getattr(region, "label", ""))
    # BRÅ has two Heby categories because the municipality changed county in 2007.
    # Both should map to the same municipality name and be used in their respective years.
    label = re.sub(r"\s*\([^)]*(?:län|lan)[^)]*\)\s*$", "", label, flags=re.IGNORECASE)
    label = re.sub(r"\s+kommun\s*$", "", label, flags=re.IGNORECASE)
    if normalize_text(label) in {"region gotland", "gotland"}:
        return "Gotland"
    return label.strip()


def municipality_regions(topic) -> list[object]:
    rows = []
    excluded = []
    for region in topic.regions:
        label = str(getattr(region, "label", "") or "")
        short = str(getattr(region, "label_short", "") or "")
        norm = normalize_text(label + " | " + short)

        # Exclude metropolitan subareas explicitly.
        if any(x in norm for x in ["stadsområde", "stadsomrade", "stadsdelsområde", "stadsdelsomrade"]):
            excluded.append(label)
            continue

        is_kommun = bool(re.search(r"\bkommun(?:\s*\([^)]*\))?\s*$", label, flags=re.IGNORECASE)) or bool(
            re.search(r"\bkommun(?:\s*\([^)]*\))?\s*$", short, flags=re.IGNORECASE)
        )
        is_gotland = "gotland" in norm and "kommun" not in norm

        if is_kommun or is_gotland:
            rows.append(region)
        else:
            excluded.append(label)

    # BRÅ exposes Heby twice (Uppsala län from 2007 and Västmanlands län through 2006).
    # That is correct for a 1996- series. Validate 290 unique municipality names,
    # while allowing more than 290 raw BRÅ region categories.
    municipality_names = {clean_region_name(r) for r in rows}
    if len(municipality_names) != 290:
        raise RuntimeError(
            f"Expected 290 unique municipalities in BRÅ annual topic, found {len(municipality_names)} "
            f"from {len(rows)} BRÅ region categories. "
            f"Missing/duplicate diagnosis: selected sample={[getattr(x,'label','') for x in rows[:35]]}; "
            f"excluded sample={excluded[:40]}"
        )
    print(
        f"Kommunurval: {len(municipality_names)} kommuner via {len(rows)} BRÅ-regionkategorier "
        "(Heby har separata historiska länskategorier)."
    )
    return rows

def available_years(topic) -> list[int]:
    years = sorted(
        {
            int(p.period_start.year)
            for p in topic.periods
            if getattr(p, "periodicity", None) == "yearly"
            and int(p.period_start.year) >= START_YEAR
        }
    )
    if not years:
        raise RuntimeError("No annual BRÅ periods from 1996 onward were found")
    return years


def write_lookups(topic, regions: list[object], years: list[int]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    reg_rows = []
    for r in regions:
        reg_rows.append(
            {
                "Region_ID": getattr(r, "id", None),
                "Kommun": clean_region_name(r),
                "Region_BRÅ": getattr(r, "label", None),
            }
        )
    pd.DataFrame(reg_rows).sort_values("Kommun", kind="stable").to_csv(
        MUNICIPALITIES_PATH, index=False, encoding="utf-8-sig"
    )

    meta = category_meta(topic.crimes)
    cat_rows = []
    for cid, row in meta.items():
        cat_rows.append(
            {
                "Brott_ID": cid,
                "Brott": row.get("Brott"),
                "Brottsnivå": row.get("Brottsnivå"),
                "Förälder_ID": row.get("Förälder_ID"),
                "Förälder": row.get("Förälder"),
                "Nivå1": row.get("Nivå1"),
                "Nivå2": row.get("Nivå2"),
                "Nivå3": row.get("Nivå3"),
                "Nivå4": row.get("Nivå4"),
                "Nivå5": row.get("Nivå5"),
                "Upphört": bool(row.get("Upphört", False)),
            }
        )
    pd.DataFrame(cat_rows).sort_values(["Brottsnivå", "Brott"], kind="stable").to_csv(
        CATEGORIES_PATH, index=False, encoding="utf-8-sig"
    )

    metadata = {
        "source": "Brottsförebyggande rådet (Brå), anmälda brott",
        "source_url": SOURCE_URL,
        "topic": getattr(topic, "label", ""),
        "start_year": START_YEAR,
        "available_years": years,
        "municipalities": len(regions),
        "storage": "Annual-only dataset; one Parquet file per year for municipalities existing in that year",
        "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    METADATA_PATH.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def query_year(topic, regions: list[object], year: int) -> pd.DataFrame:
    all_parts = []
    meta = category_meta(topic.crimes)

    for i in range(0, len(regions), REGION_BATCH_SIZE):
        batch = regions[i : i + REGION_BATCH_SIZE]
        labels = [r.label for r in batch]
        print(
            f"{year}: kommunbatch {i + 1}-{min(i + len(batch), len(regions))} "
            f"av {len(regions)}"
        )
        result = topic.query(
            regions=labels,
            crimes="*",
            period_start=f"{year}-01-01",
            period_end=f"{year}-12-31",
            measures=["count", "per capita"],
            ignore_ceased_regions=True,
            ignore_ceased_crimes=False,
        )
        raw = result.data.dataframe.copy()
        if raw.empty:
            raise RuntimeError(f"BRÅ returned no annual data for {year}, batch starting {i + 1}")
        raw = raw[raw["periodicity"] == "yearly"].copy()
        if raw.empty:
            raise RuntimeError(f"BRÅ returned no yearly rows for {year}, batch starting {i + 1}")
        part = transform(raw, meta)
        region_name_by_id = {str(getattr(r, "id", "")): clean_region_name(r) for r in regions}
        part["Kommun"] = part["Region_ID"].astype(str).map(region_name_by_id).fillna(part["Kommun"])
        all_parts.append(part)

    df = pd.concat(all_parts, ignore_index=True, sort=False)
    df = df[df["År"] == year].copy()

    # Validation: every selected municipality should occur in the result. Some
    # individual crime categories may be unavailable historically; that is valid.
    # Remove completely empty rows; BRÅ can return inactive historical region
    # categories outside their valid years (notably Heby before/after the 2007 county change).
    df = df[df[["Antal", "Per100000"]].notna().any(axis=1)].copy()

    all_names = {clean_region_name(r) for r in regions}
    expected_names = {
        name for name in all_names
        if year >= MUNICIPALITY_START_YEAR.get(name, START_YEAR)
    }
    found_names = set(df["Kommun"].astype(str).unique())
    missing = expected_names - found_names
    unexpected = found_names - expected_names
    if missing:
        raise RuntimeError(
            f"{year}: missing {len(missing)} municipalities that should exist that year: "
            f"{sorted(missing)[:20]}"
        )
    if unexpected:
        print(f"{year}: note: BRÅ returned {len(unexpected)} historical/extra region names: {sorted(unexpected)[:20]}")

    print(f"{year}: validated {len(found_names)} municipalities (expected at least {len(expected_names)})")

    if df.duplicated(["År", "Kommun", "Brott_ID"]).any():
        dup = df[df.duplicated(["År", "Kommun", "Brott_ID"], keep=False)].head(20)
        raise RuntimeError(f"{year}: duplicate municipality/crime keys after transform:\n{dup.to_string(index=False)}")

    # Parquet compresses repeated municipality/category metadata well and avoids
    # GitHub's 100 MB single-file limit that a national CSV can approach.
    return df[HISTORY_COLUMNS].sort_values(
        ["Kommun", "Brottsnivå", "Brott"], kind="stable"
    ).reset_index(drop=True)


def target_years(years: list[int]) -> list[int]:
    if TARGET_YEAR:
        y = int(TARGET_YEAR)
        if y not in years:
            raise RuntimeError(f"TARGET_YEAR={y} is not available from BRÅ")
        return [y]

    if MODE in {"bootstrap", "refresh"}:
        return years

    # Normal scheduled update: only the two latest annual periods. This captures
    # revisions without re-querying the whole 1996-present history.
    return years[-2:]


def main() -> int:
    scraper = BRA()
    topic = annual_topic(scraper)
    regions = municipality_regions(topic)
    years = available_years(topic)
    targets = target_years(years)

    write_lookups(topic, regions, years)

    print(f"BRÅ annual topic: {topic.label}")
    print(f"Municipalities: 290 unique names via {len(regions)} BRÅ region categories")
    print(f"Available annual years: {years[0]}-{years[-1]}")
    print(f"Years to fetch this run: {targets}")

    for y in targets:
        path = OUT_DIR / f"year={y}.parquet"
        if MODE == "bootstrap" and path.exists() and not TARGET_YEAR:
            print(f"{y}: already stored, skipping")
            continue

        df = query_year(topic, regions, y)
        df.to_parquet(path, index=False, compression="snappy")
        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb >= 95:
            raise RuntimeError(
                f"{path.name} became {size_mb:.1f} MB, too close to GitHub's 100 MB file limit"
            )
        print(
            f"{y}: wrote {len(df):,} rows, {df['Kommun'].nunique()} municipalities, "
            f"{df['Brott_ID'].nunique()} crime categories, {size_mb:.1f} MB"
        )

    print("All-municipality annual BRÅ update complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
