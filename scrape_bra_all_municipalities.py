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

if MODE not in {"update", "bootstrap", "refresh"}:
    raise SystemExit("BRA_ALL_MODE must be update, bootstrap or refresh")


def annual_topic(scraper: BRA):
    return select_topics(scraper).yearly


def municipality_regions(topic) -> list[object]:
    rows = []
    for region in topic.regions:
        if bool(getattr(region, "ceased", False)):
            continue
        labels = [
            str(getattr(region, "label", "") or ""),
            str(getattr(region, "label_short", "") or ""),
        ]
        # The annual topic also contains Stockholm/Goteborg/Malmo city areas.
        # Keep municipality categories only.
        if any(re.search(r"\bkommun\s*$", x, flags=re.IGNORECASE) for x in labels):
            rows.append(region)

    # Sweden has 290 municipalities. Fail loudly rather than silently publishing
    # an incomplete municipality set if BRÅ changes the page structure.
    if len(rows) != 290:
        sample = [getattr(x, "label", "") for x in rows[:30]]
        raise RuntimeError(
            f"Expected 290 current municipalities in BRÅ annual topic, found {len(rows)}. "
            f"Sample: {sample}"
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


def clean_region_name(region) -> str:
    label = str(getattr(region, "label_short", "") or getattr(region, "label", ""))
    return re.sub(r"\s+kommun\s*$", "", label, flags=re.IGNORECASE).strip()


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
        "storage": "One Parquet file per year, all current municipalities",
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
        all_parts.append(transform(raw, meta))

    df = pd.concat(all_parts, ignore_index=True, sort=False)
    df = df[df["År"] == year].copy()

    # Validation: every selected municipality should occur in the result. Some
    # individual crime categories may be unavailable historically; that is valid.
    region_ids_expected = {str(getattr(r, "id", "")) for r in regions}
    region_ids_found = set(df["Region_ID"].astype(str).unique())
    missing = region_ids_expected - region_ids_found
    if missing:
        raise RuntimeError(f"{year}: missing {len(missing)} municipalities in result")

    if df.duplicated(["År", "Kommun", "Brott_ID"]).any():
        raise RuntimeError(f"{year}: duplicate municipality/crime keys after transform")

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
    print(f"Municipalities: {len(regions)}")
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
