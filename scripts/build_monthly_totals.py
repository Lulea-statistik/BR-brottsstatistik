"""Build a compact monthly series from BRÅ's existing Luleå/Boden history.

No aggregation across overlapping crime categories: uses only category ID 13192
(Totalt antal brott). Missing or unpublished months remain missing, never zero.
"""
import csv
import json
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "history.csv"
NORTH = ROOT / "data" / "monthly_norrbotten.csv"
OUTPUT = ROOT / "docs" / "data" / "monthly_totals.json"
YEAR = date.today().year
FIRST = YEAR - 5
series = {}
category_names = {}
with (ROOT / "data" / "categories.csv").open(encoding="utf-8-sig", newline="") as category_stream:
    for cat in csv.DictReader(category_stream):
        if cat.get("Tillgänglig_månad_kvartal", "").strip().lower() != "true":
            continue
        try:
            cid = int(cat["Brott_ID"])
        except (TypeError, ValueError):
            continue
        parent = cat.get("Förälder_ID", "")
        category_names[cid] = {
            "id": cid, "name": cat["Brott"],
            "parent": int(float(parent)) if parent.strip() else None,
            "level": int(cat["Brottsnivå"]),
            "ceased": cat.get("Upphört", "").strip().lower() == "true",
        }
with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
    for row in csv.DictReader(handle):
        if row["Periodtyp"] != "Månad":
            continue
        try:
            year = int(row["År"])
            month = int(float(row["Månad"]))
            crime_id = int(row["Brott_ID"])
            count = float(row["Antal"].replace(",", "."))
        except (ValueError, TypeError, KeyError, AttributeError):
            continue
        if not (FIRST <= year <= YEAR and 1 <= month <= 12) or count < 0 or not count.is_integer():
            continue
        municipality = row["Kommun"].strip()
        if municipality not in ("Luleå", "Boden"):
            continue
        if crime_id not in category_names:
            continue
        key = (municipality, year, month, crime_id)
        value = {"kommun": municipality, "year": year, "month": month, "crime_id": crime_id,
                 "count": int(count),
                 "preliminary": row["Preliminär"].lower() in ("true", "1", "ja")}
        if key in series and series[key] != value:
            raise ValueError(f"Conflicting monthly observations: {key}")
        series[key] = value

# Prefer the separately fetched Norrbotten-wide monthly source for new regions.
# Preserve existing Luleå/Boden observations and fail on discrepancies.
if NORTH.exists():
    north_series = {}
    with NORTH.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            try:
                municipality = row["kommun"].strip()
                year, month = int(row["year"]), int(row["month"])
                count = int(row["count"])
            except (KeyError, TypeError, ValueError) as exc:
                raise RuntimeError("Invalid Norrbotten monthly record") from exc
            if not (FIRST <= year <= YEAR and 1 <= month <= 12 and count >= 0):
                continue
            key = (municipality, year, month, 13192)
            value = {"kommun": municipality, "year": year, "month": month, "crime_id": 13192,
                     "count": count, "preliminary": row["preliminary"].strip().lower() in ("true", "1", "ja")}
            if key in north_series and north_series[key] != value:
                raise RuntimeError(f"Conflicting Norrbotten rows: {key}")
            north_series[key] = value
    for key, value in north_series.items():
        if key in series and series[key]["count"] != value["count"]:
            raise RuntimeError(f"Brå monthly mismatch for {key}: history={series[key]['count']}, Norrbotten={value['count']}")
        series[key] = value

if not series:
    raise RuntimeError("No monthly total crime observations found; refusing empty export")
present_ids = {key[3] for key in series}
visible_ids = set(present_ids)
for cid in list(present_ids):
    parent = category_names.get(cid, {}).get("parent")
    while parent is not None and parent in category_names and parent not in visible_ids:
        visible_ids.add(parent)
        parent = category_names[parent]["parent"]
payload = {"source": "Brå anmälda brott per månad; kategorier från Brås månadsklassificering",
           "categories": [category_names[cid] for cid in sorted(visible_ids) if cid in category_names],
           "generated_utc": datetime.now(timezone.utc).isoformat(),
           "start_year": FIRST, "end_year": YEAR,
           "rows": [series[key] for key in sorted(series)]}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Wrote {len(series)} monthly observations to {OUTPUT}")
