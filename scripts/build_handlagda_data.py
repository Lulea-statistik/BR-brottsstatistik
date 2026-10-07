from __future__ import annotations

import io
import json
import math
import re
import shutil
from pathlib import Path

import pandas as pd
import requests

CATALOG = Path("data/handlagda_source_catalog.csv")
OUT_ROOT = Path("docs/data/handlagda")
MANIFEST = OUT_ROOT / "manifest.json"

SKIP_SHEETS = {"Information", "Förekomst av stora ärenden"}


def clean(value):
    if pd.isna(value):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        if value.is_integer():
            return int(value)
        return round(value, 8)
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def load_book(content: bytes, file_name: str):
    if file_name.lower().endswith(".xlsx"):
        return pd.ExcelFile(io.BytesIO(content), engine="openpyxl")
    return pd.ExcelFile(io.BytesIO(content), engine="xlrd")


def legacy_headers(table_id: str, year: int, width: int) -> list[str] | None:
    # Äldre tabeller har flernivårubriker som inte kan läsas som en enda rad.
    if table_id == "310" and width == 12:
        return [
            "Brottstyp",
            "Samtliga handlagda brott",
            "Brott med misstänkt person, totalt",
            "Brott med misstänkt person som personuppklarats",
            "Personuppklarade brott där åtal väckts",
            "Personuppklarade brott där strafföreläggande utfärdats",
            "Personuppklarade brott där åtalsunderlåtelse meddelats",
            "Brott med misstänkt person som förundersökningsbegränsats",
            "Brott med misstänkt person som avslutats med övriga beslut",
            "Brott utan misstänkt person, totalt",
            "Brott utan misstänkt person som förundersökningsbegränsats",
            "Brott utan misstänkt person som avslutats med övriga beslut",
        ]

    if table_id == "320" and width == 19:
        return [
            "Brottstyp",
            f"Samtliga handlagda brott {year}",
            f"Andel handlagda brott anmälda {year} (%)",
            f"Andel brott anmälda {year-1} (%)",
            f"Andel brott anmälda {year-2} (%)",
            "Andel brott anmälda tidigare år (%)",
            "Andel brott med okänt anmälningsår (%)",
            f"Samtliga personuppklarade brott {year}",
            f"Andel personuppklarade brott anmälda {year} (%)",
            f"Andel personuppklarade brott anmälda {year-1} (%)",
            f"Andel personuppklarade brott anmälda {year-2} (%)",
            "Andel personuppklarade brott anmälda tidigare år (%)",
            "Andel personuppklarade brott med okänt anmälningsår (%)",
            f"Övriga handlagda brott {year}",
            f"Andel övriga handlagda brott anmälda {year} (%)",
            f"Andel övriga handlagda brott anmälda {year-1} (%)",
            f"Andel övriga handlagda brott anmälda {year-2} (%)",
            "Andel övriga handlagda brott anmälda tidigare år (%)",
            "Andel övriga handlagda brott med okänt anmälningsår (%)",
        ]

    if table_id == "300" and width == 14:
        return [
            "Brottstyp",
            "Handlagda brott, totalt",
            "Utredda brott, totalt",
            "Utredda brott som personuppklarats",
            "Personuppklarade brott där åtal väckts",
            "Personuppklarade brott där strafföreläggande utfärdats",
            "Personuppklarade brott där åtalsunderlåtelse meddelats",
            "Lagföringsprocent (%)",
            "Utredda brott som förundersökningsbegränsats",
            "Utredda brott som avslutats med övriga beslut",
            "Direktavskrivna brott, totalt",
            "Direktavskrivna brott som förundersökningsbegränsats",
            "Direktavskrivna brott som avslutats med övriga beslut",
            "Personuppklaringsprocent (%)",
        ]
    return None


def normalize_sheet(book, sheet: str, table_id: str, year: int):
    raw = pd.read_excel(book, sheet_name=sheet, header=None)
    if raw.shape[0] < 3 or raw.shape[1] < 2:
        return None

    # Hitta början på tabellhuvudet. Äldre filer kan ha många rubrikrader.
    header_idx = None
    for idx in range(min(35, len(raw))):
        vals = [clean(v) for v in raw.iloc[idx].tolist()]
        text = " | ".join(str(v or "") for v in vals).casefold()
        if "brottstyp" in text or "lagrum" in text:
            header_idx = idx
            break
    if header_idx is None:
        return None

    # Hitta första faktiska dataraden.
    data_start = None
    for idx in range(header_idx + 1, min(len(raw), header_idx + 25)):
        vals = [clean(v) for v in raw.iloc[idx].tolist()]
        first = str(vals[0] or "").strip() if vals else ""
        numeric_count = sum(
            isinstance(v, (int, float)) and not isinstance(v, bool)
            for v in vals[1:]
        )
        if first and numeric_count > 0:
            data_start = idx
            break
    if data_start is None:
        return None

    width = int(raw.shape[1])
    forced = legacy_headers(table_id, year, width)

    if forced:
        source_headers = forced
    elif table_id == "320" and width == 8:
        # Från 2020 ligger tabell 320 i tre separata blad. Den synliga
        # rubrikraden innehåller tabelltiteln snarare än kolumnnamnen.
        if sheet == "Personuppklarade brott":
            total_label = "Personuppklarade brott, totalt"
            prefix = "Andel personuppklarade brott anmälda"
            unknown = "Andel personuppklarade brott med okänt anmälningsår (%)"
        elif sheet == "Övriga handlagda brott":
            total_label = "Övriga handlagda brott, totalt"
            prefix = "Andel övriga handlagda brott anmälda"
            unknown = "Andel övriga handlagda brott med okänt anmälningsår (%)"
        else:
            total_label = "Handlagda brott, totalt"
            prefix = "Andel handlagda brott anmälda"
            unknown = "Andel handlagda brott med okänt anmälningsår (%)"
        source_headers = [
            "Lagrum",
            "Brottstyp",
            total_label,
            f"{prefix} {year} (%)",
            f"{prefix} {year-1} (%)",
            f"{prefix} {year-2} (%)",
            f"{prefix} tidigare år (%)",
            unknown,
        ]
    else:
        # Nyare filer har en enkel rubrikrad.
        source_headers = [clean(v) for v in raw.iloc[header_idx].tolist()]
        source_headers = [
            h or f"Kolumn {i+1}" for i, h in enumerate(source_headers)
        ]

    # Avgör om filen har en eller två beskrivande kolumner.
    first_data = [clean(v) for v in raw.iloc[data_start].tolist()]
    second_is_numeric = (
        len(first_data) > 1
        and isinstance(first_data[1], (int, float))
        and not isinstance(first_data[1], bool)
    )
    one_text_column = second_is_numeric

    if one_text_column:
        # Duplicera kategoritexten som Lagrum/Brottstyp så frontend får samma
        # schema som de moderna filerna.
        measure_headers = source_headers[1:]
        columns = ["Lagrum", "Brottstyp"] + measure_headers
    else:
        columns = source_headers
        if len(columns) > 0 and not columns[0]:
            columns[0] = "Lagrum"
        if len(columns) > 1 and not columns[1]:
            columns[1] = "Brottstyp"

    # Gör rubriker unika.
    unique_columns = []
    seen = {}
    for i, h in enumerate(columns):
        label = str(h or f"Kolumn {i+1}").strip()
        n = seen.get(label, 0) + 1
        seen[label] = n
        if n > 1:
            label = f"{label} ({n})"
        unique_columns.append(label)
    columns = unique_columns

    rows = []
    for _, series in raw.iloc[data_start:].iterrows():
        src = [clean(v) for v in series.iloc[:width].tolist()]
        if not src or all(v is None for v in src):
            continue
        first = str(src[0] or "").strip()
        numeric_count = sum(
            isinstance(v, (int, float)) and not isinstance(v, bool)
            for v in src[1:]
        )
        if not first or numeric_count == 0:
            continue

        if one_text_column:
            vals = [src[0], src[0]] + src[1:]
        else:
            vals = src

        # Anpassa längden till kolumnerna.
        vals = vals[:len(columns)] + [None] * max(0, len(columns) - len(vals))
        rows.append(vals)

    if not rows:
        return None
    return {"columns": columns, "rows": rows}


def main():
    catalog = pd.read_csv(CATALOG, dtype={"table_id":"string","region_code":"string"})
    if OUT_ROOT.exists():
        shutil.rmtree(OUT_ROOT)
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent":"Lulea-statistik/1.0"})

    manifest = {"tables": {}, "files": []}
    failures = []

    for _, src in catalog.iterrows():
        table_id = str(src["table_id"])
        year = int(src["year"])
        region_code = str(src["region_code"])
        file_name = str(src["file_name"])
        file_url = str(src["file_url"])

        try:
            r = session.get(file_url, timeout=90)
            r.raise_for_status()
            book = load_book(r.content, file_name)
            sheets = {}
            for sheet in book.sheet_names:
                if sheet in SKIP_SHEETS:
                    continue
                normalized = normalize_sheet(book, sheet, table_id, year)
                if normalized:
                    sheets[sheet] = normalized

            if not sheets:
                raise RuntimeError("inga datasheets")

            payload = {
                "table_id": table_id,
                "year": year,
                "region_code": region_code,
                "region_name": str(src["region_name"]),
                "source_page": str(src["source_page"]),
                "source_file": file_url,
                "file_name": file_name,
                "sheets": sheets,
            }

            rel = Path(table_id) / str(year) / f"{region_code}.json"
            dest = OUT_ROOT / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )

            manifest["files"].append({
                "table_id": table_id,
                "year": year,
                "region_code": region_code,
                "region_name": str(src["region_name"]),
                "path": str(rel).replace("\\", "/"),
                "sheets": list(sheets),
            })
            manifest["tables"].setdefault(table_id, {
                "table_name": str(src["table_name"]),
                "years": [],
                "regions": {},
            })
            manifest["tables"][table_id]["years"].append(year)
            manifest["tables"][table_id]["regions"][region_code] = str(src["region_name"])
            print("ok", table_id, year, region_code, len(sheets))
        except Exception as exc:
            failures.append({
                "table_id": table_id, "year": year,
                "region_code": region_code, "error": repr(exc)
            })
            print("fail", table_id, year, region_code, repr(exc))

    for table in manifest["tables"].values():
        table["years"] = sorted(set(table["years"]))
        table["regions"] = dict(sorted(table["regions"].items()))

    manifest["failures"] = failures
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("normalized_files", len(manifest["files"]))
    print("failures", len(failures))
    if failures:
        print(json.dumps(failures[:20], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
