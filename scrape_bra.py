from __future__ import annotations

import os
import re
import sys
import warnings
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

import pandas as pd
import urllib3
from dateutil.relativedelta import relativedelta

from bra_scraper.BRA import BRA

# bra-scraper mirrors BRÅ's legacy service and currently uses verify=False.
# Silence only the corresponding warning; HTTP failures still raise errors.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

START_YEAR = int(os.getenv("START_YEAR", "1996"))
RECENT_YEARS = int(os.getenv("RECENT_YEARS", "2"))
FULL_REFRESH = os.getenv("FULL_REFRESH", "0") == "1"

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
HISTORY_PATH = DATA_DIR / "history.csv"
LATEST_PATH = DATA_DIR / "latest.csv"
CATEGORIES_PATH = DATA_DIR / "categories.csv"
REVISIONS_PATH = DATA_DIR / "revisions.csv"

TARGET_REGION_PATTERNS = {
    "Luleå": re.compile(r"\bluleå\b.*\bkommun", re.IGNORECASE),
    "Boden": re.compile(r"\bboden(?:s)?\b.*\bkommun", re.IGNORECASE),
}

PERIOD_TYPES = {
    "yearly": "Helår",
    "quarterly": "Kvartal",
    "monthly": "Månad",
}

KEY_COLUMNS = ["Periodnyckel", "Kommun", "Brott_ID"]
VALUE_COLUMNS = ["Antal", "Per100000", "Status_Antal", "Status_Per100000", "Preliminär"]

HISTORY_COLUMNS = [
    "År",
    "Månad",
    "Kvartal",
    "Periodtyp",
    "Periodetikett",
    "Periodnyckel",
    "Period_start",
    "Period_slut",
    "Preliminär",
    "Kommun",
    "Region_ID",
    "Brott",
    "Brott_ID",
    "Brottsnivå",
    "Förälder_ID",
    "Förälder",
    "Nivå1",
    "Nivå2",
    "Nivå3",
    "Nivå4",
    "Nivå5",
    "Antal",
    "Per100000",
    "Status_Antal",
    "Status_Per100000",
]

REVISION_COLUMNS = [
    "Kontrolldatum",
    "Typ",
    "Periodnyckel",
    "Kommun",
    "Brott_ID",
    "Brott",
    "Fält",
    "Gammalt_värde",
    "Nytt_värde",
]


@dataclass(frozen=True)
class SelectedTopics:
    yearly: object
    month_quarter: object


def normalize_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def is_preliminary(label: object) -> bool:
    return "prel" in normalize_text(label)


def category_path(category: object) -> list[object]:
    path = []
    current = category
    seen = set()
    while current is not None:
        ident = getattr(current, "id", None)
        if ident in seen:
            break
        seen.add(ident)
        path.append(current)
        current = getattr(current, "parent", None)
    return list(reversed(path))


def category_meta(categories: Iterable[object]) -> dict[object, dict]:
    meta: dict[object, dict] = {}
    for cat in categories:
        path = category_path(cat)
        parent = getattr(cat, "parent", None)
        row = {
            "Brott_ID": getattr(cat, "id", None),
            "Brott": getattr(cat, "label", None),
            "Brottsnivå": len(path),
            "Förälder_ID": getattr(parent, "id", None) if parent else None,
            "Förälder": getattr(parent, "label", None) if parent else None,
            "Upphört": bool(getattr(cat, "ceased", False)),
        }
        for idx in range(1, 6):
            row[f"Nivå{idx}"] = getattr(path[idx - 1], "label", None) if len(path) >= idx else None
        meta[row["Brott_ID"]] = row
    return meta


def select_topics(scraper: BRA) -> SelectedTopics:
    topics = []
    for topic in scraper.topics:
        try:
            if topic.level == "brottstyp":
                topics.append(topic)
        except Exception:
            continue

    for t in topics:
        print(f"Tillgängligt ämne: {t.label}")

    def choose(kind: str):
        matches = []
        for topic in topics:
            label = normalize_text(topic.label)
            if "kommun" not in label or "1996" not in label:
                continue
            if kind == "yearly" and "årsvis" in label and "månads" not in label:
                matches.append(topic)
            if kind == "mq" and "månads" in label and "kvartals" in label:
                matches.append(topic)
        if len(matches) != 1:
            labels = [x.label for x in matches]
            raise RuntimeError(
                f"Kunde inte entydigt välja BRÅ-topic för {kind}. Matchningar: {labels}"
            )
        return matches[0]

    selected = SelectedTopics(yearly=choose("yearly"), month_quarter=choose("mq"))
    print(f"Vald helårs-topic: {selected.yearly.label}")
    print(f"Vald månads-/kvartals-topic: {selected.month_quarter.label}")
    return selected


def resolve_regions(topic: object) -> list[str]:
    available = list(topic.regions)
    selected = []
    for short_name, pattern in TARGET_REGION_PATTERNS.items():
        matches = []
        for region in available:
            labels = [getattr(region, "label", ""), getattr(region, "label_short", "")]
            if any(pattern.search(str(label)) for label in labels):
                matches.append(region)
        if len(matches) != 1:
            raise RuntimeError(
                f"Kunde inte entydigt hitta {short_name} kommun i BRÅ. "
                f"Matchningar: {[getattr(x, 'label', '') for x in matches]}"
            )
        selected.append(matches[0].label)
    print(f"Valda kommuner: {selected}")
    return selected


def query_topic(topic: object, start_date: date, end_date: date, keep_periodicities: set[str]) -> tuple[pd.DataFrame, dict]:
    region_labels = resolve_regions(topic)
    print(
        f"Hämtar {topic.label}: {start_date.isoformat()}–{end_date.isoformat()}, "
        f"{len(list(topic.crimes))} brottskategorier."
    )
    result = topic.query(
        regions=region_labels,
        crimes="*",
        period_start=start_date.strftime("%Y-%m-%d"),
        period_end=end_date.strftime("%Y-%m-%d"),
        measures=["count", "per capita"],
        ignore_ceased_regions=True,
        ignore_ceased_crimes=False,
    )
    df = result.data.dataframe.copy()
    if df.empty:
        raise RuntimeError(f"BRÅ returnerade inga datapunkter för {topic.label}")
    df = df[df["periodicity"].isin(keep_periodicities)].copy()
    if df.empty:
        raise RuntimeError(
            f"BRÅ returnerade inga datapunkter med periodtyper {keep_periodicities} för {topic.label}"
        )
    return df, category_meta(topic.crimes)


def region_short(label: object) -> str:
    text = str(label or "")
    last = text.split(",")[-1].strip()
    last = re.sub(r"\s+kommun$", "", last, flags=re.IGNORECASE)
    last = re.sub(r"s$", "", last, flags=re.IGNORECASE) if last.casefold().startswith("boden") else last
    if last.casefold().startswith("luleå"):
        return "Luleå"
    if last.casefold().startswith("boden"):
        return "Boden"
    return last


def period_end(start: pd.Timestamp, periodicity: str) -> pd.Timestamp:
    if periodicity == "yearly":
        return start + pd.DateOffset(years=1) - pd.Timedelta(days=1)
    if periodicity == "quarterly":
        return start + pd.DateOffset(months=3) - pd.Timedelta(days=1)
    return start + pd.DateOffset(months=1) - pd.Timedelta(days=1)


def period_key(start: pd.Timestamp, periodicity: str) -> str:
    if periodicity == "yearly":
        return f"{start.year}"
    if periodicity == "quarterly":
        q = ((start.month - 1) // 3) + 1
        return f"{start.year}Q{q}"
    return f"{start.year}{start.month:02d}"


def transform(raw: pd.DataFrame, meta: dict) -> pd.DataFrame:
    df = raw.copy()
    df["timepoint"] = pd.to_datetime(df["timepoint"])
    df["Kommun"] = df["region"].map(region_short)
    df["Periodtyp"] = df["periodicity"].map(PERIOD_TYPES)
    if df["Periodtyp"].isna().any():
        bad = sorted(df.loc[df["Periodtyp"].isna(), "periodicity"].astype(str).unique())
        raise RuntimeError(f"Okända periodtyper från BRÅ: {bad}")

    df["År"] = df["timepoint"].dt.year.astype(int)
    df["Månad"] = pd.array(
        [x.month if p == "monthly" else pd.NA for x, p in zip(df["timepoint"], df["periodicity"])],
        dtype="Int64",
    )
    df["Kvartal"] = pd.array(
        [((x.month - 1) // 3) + 1 if p == "quarterly" else pd.NA for x, p in zip(df["timepoint"], df["periodicity"])],
        dtype="Int64",
    )
    df["Periodetikett"] = df["period"].astype(str)
    df["Periodnyckel"] = [period_key(x, p) for x, p in zip(df["timepoint"], df["periodicity"])]
    df["Period_start"] = df["timepoint"].dt.strftime("%Y-%m-%d")
    df["Period_slut"] = [
        period_end(x, p).strftime("%Y-%m-%d") for x, p in zip(df["timepoint"], df["periodicity"])
    ]
    df["Preliminär"] = df["Periodetikett"].map(is_preliminary)
    df["Region_ID"] = df["region_id"]
    df["Brott"] = df["crime"].astype(str)
    df["Brott_ID"] = df["crime_id"]

    def mget(cid, field):
        row = meta.get(cid, {})
        return row.get(field)

    for col in ["Brottsnivå", "Förälder_ID", "Förälder", "Nivå1", "Nivå2", "Nivå3", "Nivå4", "Nivå5"]:
        df[col] = [mget(cid, col) for cid in df["Brott_ID"]]

    df["measure_key"] = df["measure_id"].astype(str)
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    base_cols = [
        "År", "Månad", "Kvartal", "Periodtyp", "Periodetikett", "Periodnyckel",
        "Period_start", "Period_slut", "Preliminär", "Kommun", "Region_ID",
        "Brott", "Brott_ID", "Brottsnivå", "Förälder_ID", "Förälder",
        "Nivå1", "Nivå2", "Nivå3", "Nivå4", "Nivå5",
    ]

    # Use the natural key rather than pivoting on all metadata columns. Several
    # metadata fields (Månad/Kvartal) are intentionally blank for other period
    # types, and pandas pivot can otherwise discard rows containing NA.
    if df.duplicated(KEY_COLUMNS + ["measure_key"]).any():
        dup = df[df.duplicated(KEY_COLUMNS + ["measure_key"], keep=False)].head(10)
        raise RuntimeError(f"Oväntade dubbletter i BRÅ-resultat:\n{dup.to_string(index=False)}")

    metadata = df[base_cols].drop_duplicates(KEY_COLUMNS).copy()

    count = df.loc[df["measure_key"] == "count", KEY_COLUMNS + ["value", "status"]].copy()
    count = count.rename(columns={"value": "Antal", "status": "Status_Antal"})

    per_capita = df.loc[df["measure_key"] == "per capita", KEY_COLUMNS + ["value", "status"]].copy()
    per_capita = per_capita.rename(
        columns={"value": "Per100000", "status": "Status_Per100000"}
    )

    out = metadata.merge(count, on=KEY_COLUMNS, how="left", validate="one_to_one")
    out = out.merge(per_capita, on=KEY_COLUMNS, how="left", validate="one_to_one")

    out["Antal"] = pd.to_numeric(out["Antal"], errors="coerce").round().astype("Int64")
    out["Per100000"] = pd.to_numeric(out["Per100000"], errors="coerce").round().astype("Int64")
    out = out.sort_values(["Period_start", "Kommun", "Brottsnivå", "Brott"], kind="stable").reset_index(drop=True)

    if out.duplicated(KEY_COLUMNS).any():
        dups = out[out.duplicated(KEY_COLUMNS, keep=False)].head(20)
        raise RuntimeError(f"Nyckeldubbletter efter transformering:\n{dups.to_string(index=False)}")

    return out[HISTORY_COLUMNS]


def build_categories(year_meta: dict, mq_meta: dict) -> pd.DataFrame:
    ids = sorted(set(year_meta) | set(mq_meta), key=lambda x: (str(type(x)), str(x)))
    rows = []
    for cid in ids:
        base = dict(year_meta.get(cid) or mq_meta.get(cid) or {})
        row = {
            "Brott_ID": cid,
            "Brott": base.get("Brott"),
            "Brottsnivå": base.get("Brottsnivå"),
            "Förälder_ID": base.get("Förälder_ID"),
            "Förälder": base.get("Förälder"),
            "Nivå1": base.get("Nivå1"),
            "Nivå2": base.get("Nivå2"),
            "Nivå3": base.get("Nivå3"),
            "Nivå4": base.get("Nivå4"),
            "Nivå5": base.get("Nivå5"),
            "Tillgänglig_helår": cid in year_meta,
            "Tillgänglig_månad_kvartal": cid in mq_meta,
            "Upphört": bool(base.get("Upphört", False)),
        }
        rows.append(row)
    return pd.DataFrame(rows).sort_values(["Brottsnivå", "Brott"], kind="stable").reset_index(drop=True)


def read_csv(path: Path) -> pd.DataFrame | None:
    if not path.exists() or path.stat().st_size == 0:
        return None
    return pd.read_csv(path, encoding="utf-8-sig", dtype={"Periodnyckel": "string"})


def same_scalar(a: object, b: object) -> bool:
    if pd.isna(a) and pd.isna(b):
        return True
    if pd.isna(a) or pd.isna(b):
        return False
    return str(a) == str(b)


def build_revisions(old: pd.DataFrame | None, fresh: pd.DataFrame) -> pd.DataFrame:
    if old is None or old.empty:
        return pd.DataFrame(columns=REVISION_COLUMNS)

    old_i = old.set_index(KEY_COLUMNS)
    new_i = fresh.set_index(KEY_COLUMNS)
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    rows = []

    for key in old_i.index.intersection(new_i.index):
        old_row = old_i.loc[key]
        new_row = new_i.loc[key]
        for field in VALUE_COLUMNS:
            old_value = old_row.get(field, pd.NA)
            new_value = new_row.get(field, pd.NA)
            if not same_scalar(old_value, new_value):
                period_key_value, kommun, brott_id = key
                rows.append(
                    {
                        "Kontrolldatum": now,
                        "Typ": "REVIDERAD",
                        "Periodnyckel": period_key_value,
                        "Kommun": kommun,
                        "Brott_ID": brott_id,
                        "Brott": new_row.get("Brott", old_row.get("Brott")),
                        "Fält": field,
                        "Gammalt_värde": old_value,
                        "Nytt_värde": new_value,
                    }
                )

    for key in new_i.index.difference(old_i.index):
        period_key_value, kommun, brott_id = key
        new_row = new_i.loc[key]
        rows.append(
            {
                "Kontrolldatum": now,
                "Typ": "TILLAGD",
                "Periodnyckel": period_key_value,
                "Kommun": kommun,
                "Brott_ID": brott_id,
                "Brott": new_row.get("Brott"),
                "Fält": "rad",
                "Gammalt_värde": pd.NA,
                "Nytt_värde": "ny rad",
            }
        )

    return pd.DataFrame(rows, columns=REVISION_COLUMNS)


def merge_incremental(old: pd.DataFrame | None, fresh: pd.DataFrame, full_refresh: bool) -> pd.DataFrame:
    if old is None or old.empty or full_refresh:
        combined = fresh.copy()
    else:
        old_idx = old.set_index(KEY_COLUMNS)
        fresh_idx = fresh.set_index(KEY_COLUMNS)
        # Fresh data overwrites matching keys. Old keys that are absent from the
        # fresh response are preserved rather than deleted, which protects the
        # history against temporary source/session failures.
        keep_old = old_idx.loc[~old_idx.index.isin(fresh_idx.index)].reset_index()
        combined = pd.concat([keep_old, fresh], ignore_index=True, sort=False)

    combined = combined[HISTORY_COLUMNS].copy()
    combined = combined.sort_values(["Period_start", "Kommun", "Brottsnivå", "Brott"], kind="stable").reset_index(drop=True)
    if combined.duplicated(KEY_COLUMNS).any():
        raise RuntimeError("Dubbletter i sammanslagen history.csv; avbryter.")
    return combined


def append_revisions(changes: pd.DataFrame) -> None:
    previous = read_csv(REVISIONS_PATH)
    if previous is None:
        previous = pd.DataFrame(columns=REVISION_COLUMNS)
    if changes.empty:
        combined = previous
    else:
        combined = pd.concat([previous, changes], ignore_index=True)
    combined.to_csv(REVISIONS_PATH, index=False, encoding="utf-8-sig")


def write_outputs(history: pd.DataFrame, categories: pd.DataFrame, revisions: pd.DataFrame) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    history.to_csv(HISTORY_PATH, index=False, encoding="utf-8-sig")
    categories.to_csv(CATEGORIES_PATH, index=False, encoding="utf-8-sig")
    append_revisions(revisions)

    monthly = history[history["Periodtyp"] == "Månad"].copy()
    monthly_with_data = monthly[monthly[["Antal", "Per100000"]].notna().any(axis=1)]
    if not monthly_with_data.empty:
        latest_start = monthly_with_data["Period_start"].max()
        latest = monthly_with_data[monthly_with_data["Period_start"] == latest_start].copy()
    else:
        latest_start = history["Period_start"].max()
        latest = history[history["Period_start"] == latest_start].copy()
    latest.to_csv(LATEST_PATH, index=False, encoding="utf-8-sig")

    print("\nKlart")
    print(f"  Rader i history.csv: {len(history):,}")
    print(f"  Period: {history['Period_start'].min()} – {history['Period_slut'].max()}")
    print(f"  Kommuner: {', '.join(sorted(history['Kommun'].dropna().unique()))}")
    print(f"  Brottskategorier: {history['Brott_ID'].nunique():,}")
    print(f"  Senaste månadsperiod: {latest_start}")
    print(f"  Revisionshändelser denna körning: {len(revisions):,}")


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    old = read_csv(HISTORY_PATH)
    today = date.today()
    full = FULL_REFRESH or old is None or old.empty

    if full:
        start = date(START_YEAR, 1, 1)
        print(f"Full historikhämtning från {START_YEAR}.")
    else:
        start_year = today.year - max(RECENT_YEARS - 1, 0)
        start = date(start_year, 1, 1)
        print(f"Inkrementell uppdatering från {start_year}.")

    scraper = BRA()
    topics = select_topics(scraper)

    raw_year, year_meta = query_topic(topics.yearly, start, today, {"yearly"})
    raw_mq, mq_meta = query_topic(topics.month_quarter, start, today, {"monthly", "quarterly"})

    fresh = pd.concat(
        [transform(raw_year, year_meta), transform(raw_mq, mq_meta)],
        ignore_index=True,
        sort=False,
    )
    fresh = fresh[HISTORY_COLUMNS].sort_values(
        ["Period_start", "Kommun", "Brottsnivå", "Brott"], kind="stable"
    ).reset_index(drop=True)

    if fresh.empty:
        raise RuntimeError("Ingen data återstod efter hämtning och transformering.")
    if set(fresh["Kommun"].dropna().unique()) != {"Luleå", "Boden"}:
        raise RuntimeError(
            f"Förväntade Luleå och Boden, fick: {sorted(fresh['Kommun'].dropna().unique())}"
        )
    if int(fresh["År"].min()) > (START_YEAR if full else start.year):
        raise RuntimeError(
            f"Hämtningen börjar {int(fresh['År'].min())}, senare än förväntat. Avbryter."
        )

    revisions = build_revisions(old, fresh)
    history = merge_incremental(old, fresh, full)
    categories = build_categories(year_meta, mq_meta)
    write_outputs(history, categories, revisions)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\nFEL: {exc}", file=sys.stderr)
        raise
