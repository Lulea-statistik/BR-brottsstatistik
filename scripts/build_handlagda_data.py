from __future__ import annotations

import io
import json
import math
import re
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


def normalize_sheet(book, sheet: str):
    raw = pd.read_excel(book, sheet_name=sheet, header=None)
    if raw.shape[0] < 3 or raw.shape[1] < 3:
        return None

    # Layouten skiljer sig mellan äldre .xls och nyare .xlsx. Hitta därför
    # rubrikraden genom innehållet i stället för ett fast radnummer.
    header_idx = None
    for idx in range(min(30, len(raw))):
        vals = [clean(v) for v in raw.iloc[idx].tolist()]
        text = " | ".join(str(v or "") for v in vals).casefold()
        nonempty = sum(v is not None for v in vals)
        if "brottstyp" in text and nonempty >= 3:
            header_idx = idx
            break

    if header_idx is None:
        return None

    headers = [clean(v) for v in raw.iloc[header_idx].tolist()]
    if len(headers) < 3:
        return None

    # I vissa äldre filer är första rubriken tom men andra kolumnen är Brottstyp.
    if not headers[0]:
        headers[0] = "Lagrum"
    if len(headers) > 1 and not headers[1]:
        headers[1] = "Brottstyp"

    columns = []
    seen = {}
    for idx, h in enumerate(headers):
        label = h or f"Kolumn {idx+1}"
        n = seen.get(label, 0) + 1
        seen[label] = n
        if n > 1:
            label = f"{label} ({n})"
        columns.append(label)

    rows = []
    for _, series in raw.iloc[header_idx + 1:].iterrows():
        vals = [clean(v) for v in series.iloc[:len(columns)].tolist()]
        if not vals or all(v is None for v in vals):
            continue

        # Behåll endast faktiska datarader. Äldre filer kan ha fotnoter efter
        # tabellen som annars riskerar att följa med.
        first = str(vals[0] or "").strip()
        second = str(vals[1] or "").strip() if len(vals) > 1 else ""
        numeric_count = sum(
            isinstance(v, (int, float)) and not isinstance(v, bool)
            for v in vals[2:]
        )
        if not first and not second:
            continue
        if numeric_count == 0:
            continue
        rows.append(vals)

    if not rows:
        return None
    return {"columns": columns, "rows": rows}


def main():
    catalog = pd.read_csv(CATALOG, dtype={"table_id":"string","region_code":"string"})
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
                normalized = normalize_sheet(book, sheet)
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
