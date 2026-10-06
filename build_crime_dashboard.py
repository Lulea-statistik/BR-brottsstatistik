from __future__ import annotations

import json
import math
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

import pandas as pd
import requests
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "data" / "annual_all"
DOCS = ROOT / "docs"
OUT = DOCS / "data"
PARQUET_OUT = OUT / "parquet"

SCB_WFS = "https://geodata.scb.se/geoserver/stat/wfs"
FALLBACK_GEOJSON = "https://raw.githubusercontent.com/okfse/sweden-geojson/master/swedish_municipalities.geojson"


def clean_municipality(value: object) -> str:
    s = str(value or "").strip()
    s = re.sub(r"\s+kommun$", "", s, flags=re.I)
    if s.lower() in {"region gotland", "gotlands kommun"}:
        return "Gotland"
    return s


def json_records(df: pd.DataFrame) -> list[dict]:
    records = df.to_dict(orient="records")
    def clean_value(value):
        if value is None:
            return None
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return None
        return value
    return [
        {key: clean_value(value) for key, value in row.items()}
        for row in records
    ]


def build_metadata() -> dict:
    source_meta = json.loads((SRC / "metadata.json").read_text(encoding="utf-8"))
    coverage = pd.read_csv(SRC / "coverage.csv", encoding="utf-8-sig")
    years = [int(x) for x in source_meta["available_years"]]
    out = {
        "title": "BRÅ brottsstatistik – Sveriges kommuner",
        "source": source_meta["source"],
        "source_url": source_meta["source_url"],
        "topic": source_meta["topic"],
        "start_year": min(years),
        "latest_year": max(years),
        "available_years": years,
        "municipalities": 290,
        "updated_at": source_meta.get("updated_at"),
        "coverage": json_records(coverage),
        "default_crime_id": 5036,
        "default_municipality": "Luleå",
    }
    (OUT / "metadata.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8"
    )
    return out


def build_categories() -> None:
    df = pd.read_csv(SRC / "categories_annual.csv", encoding="utf-8-sig")
    cols = ["Brott_ID", "Brott", "Brottsnivå", "Förälder_ID", "Förälder",
            "Nivå1", "Nivå2", "Nivå3", "Nivå4", "Nivå5", "Upphört"]
    df = df[cols].copy()
    df["Brott_ID"] = df["Brott_ID"].astype(int)
    df["Brottsnivå"] = pd.to_numeric(df["Brottsnivå"], errors="coerce").fillna(1).astype(int)
    df = df.sort_values(["Brottsnivå", "Brott"], kind="stable")
    (OUT / "categories.json").write_text(
        json.dumps(json_records(df), ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )


def build_municipalities() -> set[str]:
    df = pd.read_csv(SRC / "municipalities.csv", encoding="utf-8-sig")
    names = sorted({clean_municipality(x) for x in df["Kommun"] if str(x).strip()})
    if len(names) != 290:
        raise RuntimeError(f"Expected 290 unique municipalities, found {len(names)}")
    (OUT / "municipalities.json").write_text(
        json.dumps(names, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8"
    )
    return set(names)


def _property_key(props: dict, kind: str) -> str | None:
    keys = list(props)
    lowered = {k: re.sub(r"[^a-z0-9]", "", k.lower()) for k in keys}
    if kind == "name":
        preferred = [
            k for k, n in lowered.items()
            if ("kommun" in n or n.startswith("kom")) and ("namn" in n or "name" in n)
        ]
        preferred += [k for k, n in lowered.items() if n in {"kommun", "komnamn"}]
    else:
        preferred = [
            k for k, n in lowered.items()
            if ("kommun" in n or n.startswith("kom")) and ("kod" in n or "code" in n)
        ]
    return preferred[0] if preferred else None


def _dissolve(features: list[dict], valid_names: set[str], source: str) -> dict:
    if not features:
        raise RuntimeError("No geometry features returned")
    sample = features[0].get("properties") or {}
    name_key = _property_key(sample, "name")
    if not name_key:
        # Fallback datasets often simply use name/name_1.
        for candidate in ("name", "NAME_2", "name_2", "kommun"):
            if candidate in sample:
                name_key = candidate
                break
    if not name_key:
        raise RuntimeError(f"Could not identify municipality name property: {list(sample)}")

    grouped: dict[str, list] = {}
    for f in features:
        props = f.get("properties") or {}
        name = clean_municipality(props.get(name_key))
        if name not in valid_names:
            continue
        try:
            geom = shape(f["geometry"])
        except Exception:
            continue
        if geom.is_empty:
            continue
        grouped.setdefault(name, []).append(geom)

    output = []
    for name in sorted(grouped):
        geom = unary_union(grouped[name]).buffer(0)
        # About 100 m at Swedish latitudes; enough for a national browser map.
        geom = geom.simplify(0.001, preserve_topology=True)
        output.append({
            "type": "Feature",
            "properties": {"Kommun": name},
            "geometry": mapping(geom),
        })

    if len(output) < 285:
        missing = sorted(valid_names - {x["properties"]["Kommun"] for x in output})
        raise RuntimeError(f"Only {len(output)} municipality geometries matched; missing sample: {missing[:20]}")

    return {
        "type": "FeatureCollection",
        "properties": {"source": source, "municipalities": len(output)},
        "features": output,
    }


def fetch_scb_geometry(valid_names: set[str]) -> dict:
    cap = requests.get(
        SCB_WFS,
        params={"service": "WFS", "version": "1.1.0", "request": "GetCapabilities"},
        timeout=90,
    )
    cap.raise_for_status()
    root = ET.fromstring(cap.content)
    candidates = []
    for ft in root.findall(".//{*}FeatureType"):
        name = ft.findtext("{*}Name") or ""
        title = ft.findtext("{*}Title") or ""
        hay = (name + " " + title).lower()
        if "regso" in hay and "2025" in hay:
            candidates.append((name, title))
    if not candidates:
        for ft in root.findall(".//{*}FeatureType"):
            name = ft.findtext("{*}Name") or ""
            title = ft.findtext("{*}Title") or ""
            if "regso" in (name + " " + title).lower():
                candidates.append((name, title))
    if not candidates:
        raise RuntimeError("No RegSO feature type found in SCB WFS capabilities")

    type_name, title = candidates[0]
    r = requests.get(
        SCB_WFS,
        params={
            "service": "WFS",
            "version": "1.1.0",
            "request": "GetFeature",
            "typeName": type_name,
            "outputFormat": "application/json",
            "srsName": "EPSG:4326",
        },
        timeout=180,
    )
    r.raise_for_status()
    data = r.json()
    return _dissolve(data.get("features", []), valid_names, f"SCB WFS – {title or type_name}")


def fetch_geometry(valid_names: set[str]) -> dict:
    try:
        geo = fetch_scb_geometry(valid_names)
        print("Municipality geometry: SCB WFS")
        return geo
    except Exception as exc:
        print(f"SCB geometry warning: {exc}")
        print("Trying lightweight fallback geometry from okfse/sweden-geojson.")
        r = requests.get(FALLBACK_GEOJSON, timeout=120)
        r.raise_for_status()
        data = r.json()
        return _dissolve(
            data.get("features", []),
            valid_names,
            "Fallback: okfse/sweden-geojson (visualisation only)",
        )


def copy_parquet(years: list[int]) -> None:
    PARQUET_OUT.mkdir(parents=True, exist_ok=True)
    keep = set()
    for year in years:
        src = SRC / f"year={year}.parquet"
        if not src.exists():
            raise RuntimeError(f"Missing {src}")
        dst = PARQUET_OUT / src.name
        shutil.copy2(src, dst)
        keep.add(dst.name)
    for old in PARQUET_OUT.glob("year=*.parquet"):
        if old.name not in keep:
            old.unlink()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = build_metadata()
    build_categories()
    municipalities = build_municipalities()
    copy_parquet(meta["available_years"])

    geo = fetch_geometry(municipalities)
    (OUT / "municipalities.geojson").write_text(
        json.dumps(geo, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8"
    )
    build_info = {
        "geometry_source": geo.get("properties", {}).get("source"),
        "geometry_municipalities": len(geo.get("features", [])),
        "parquet_years": len(meta["available_years"]),
    }
    (OUT / "build.json").write_text(
        json.dumps(build_info, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8"
    )
    print(json.dumps(build_info, ensure_ascii=False))


if __name__ == "__main__":
    main()
