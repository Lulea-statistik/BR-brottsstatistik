from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd
import requests

CATALOG = Path("data/handlagda_source_catalog.csv")
OUT = Path("data/handlagda_schema_probe.json")


def compact(value):
    if pd.isna(value):
        return None
    if isinstance(value, (int, float, str, bool)):
        return value
    return str(value)


def main():
    catalog = pd.read_csv(CATALOG)
    out = {}

    for table_id in ("300", "310", "320"):
        rows = catalog[catalog["table_id"].astype(str) == table_id].copy()
        rows = rows[rows["file_name"].str.lower().str.endswith(".xlsx")]
        rows = rows.sort_values(["year", "region_code"], ascending=[False, True])
        sample = rows.iloc[0]
        url = sample["file_url"]
        print("download", table_id, sample["year"], sample["region_code"], url)

        r = requests.get(url, timeout=90, headers={"User-Agent":"Lulea-statistik/1.0"})
        r.raise_for_status()
        book = pd.ExcelFile(io.BytesIO(r.content), engine="openpyxl")

        table = {
            "year": int(sample["year"]),
            "region_code": sample["region_code"],
            "file_name": sample["file_name"],
            "sheets": {}
        }
        for sheet in book.sheet_names:
            df = pd.read_excel(book, sheet_name=sheet, header=None, engine="openpyxl")
            preview = []
            for _, row in df.head(25).iterrows():
                preview.append([compact(v) for v in row.iloc[:25].tolist()])
            table["sheets"][sheet] = {
                "shape": [int(df.shape[0]), int(df.shape[1])],
                "preview": preview
            }
        out[table_id] = table

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
