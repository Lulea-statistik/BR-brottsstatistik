from __future__ import annotations

import json
import math
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urljoin
from html import unescape

import pandas as pd
import pdfplumber
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
SKR_GROUP_PAGE = "https://skr.se/kommunerochregioner/kommungruppsindelning.8281.html"
SKR_GROUP_PDF_FALLBACK = "https://extra.skr.se/download/18.ef4ba7d1849a2f55db2898a/1669978414789/Kommungruppsindelning-2023.pdf"

COUNTY_NAMES = {
    "01": "Stockholms län",
    "03": "Uppsala län",
    "04": "Södermanlands län",
    "05": "Östergötlands län",
    "06": "Jönköpings län",
    "07": "Kronobergs län",
    "08": "Kalmar län",
    "09": "Gotlands län",
    "10": "Blekinge län",
    "12": "Skåne län",
    "13": "Hallands län",
    "14": "Västra Götalands län",
    "17": "Värmlands län",
    "18": "Örebro län",
    "19": "Västmanlands län",
    "20": "Dalarnas län",
    "21": "Gävleborgs län",
    "22": "Västernorrlands län",
    "23": "Jämtlands län",
    "24": "Västerbottens län",
    "25": "Norrbottens län",
}


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
    grouped_props: dict[str, dict] = {}
    code_key = _property_key(sample, "code")
    if not code_key:
        for candidate in ("id", "kommunkod", "kom_kod"):
            if candidate in sample:
                code_key = candidate
                break
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
        if name not in grouped_props:
            kommun_code = str(props.get(code_key) or "").zfill(4) if code_key else ""
            lan_code = str(props.get("lan_code") or props.get("lanskod") or (kommun_code[:2] if len(kommun_code) == 4 else ""))
            grouped_props[name] = {
                "Kommunkod": kommun_code or None,
                "Lanskod": lan_code or None,
                "Lan": COUNTY_NAMES.get(lan_code),
            }

    output = []
    for name in sorted(grouped):
        geom = unary_union(grouped[name]).buffer(0)
        # About 100 m at Swedish latitudes; enough for a national browser map.
        geom = geom.simplify(0.001, preserve_topology=True)
        output.append({
            "type": "Feature",
            "properties": {"Kommun": name, **grouped_props.get(name, {})},
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



def fetch_skr_groups(valid_names: set[str]) -> list[dict]:
    pdf_url = SKR_GROUP_PDF_FALLBACK
    try:
        page = requests.get(SKR_GROUP_PAGE, timeout=60)
        page.raise_for_status()
        match = re.search(r"""href=["']([^"']*Kommungruppsindelning-2023\.pdf[^"']*)""", page.text, flags=re.I)
        if match:
            pdf_url = urljoin(SKR_GROUP_PAGE, unescape(match.group(1)))
    except Exception as exc:
        print(f"SKR page lookup warning: {exc}")

    pdf_path = OUT / "_skr_kommungrupp_2023.pdf"
    response = requests.get(pdf_url, timeout=120)
    response.raise_for_status()
    pdf_path.write_bytes(response.content)

    groups = {
        "A1": ("Storstäder och storstadsnära kommuner", "Storstäder"),
        "A2": ("Storstäder och storstadsnära kommuner", "Pendlingskommun nära storstad"),
        "B3": ("Större städer och kommuner nära större stad", "Större stad"),
        "B4": ("Större städer och kommuner nära större stad", "Pendlingskommun nära större stad"),
        "B5": ("Större städer och kommuner nära större stad", "Lågpendlingskommun nära större stad"),
        "C6": ("Mindre städer/tätorter och landsbygdskommuner", "Mindre stad/tätort"),
        "C7": ("Mindre städer/tätorter och landsbygdskommuner", "Pendlingskommun nära mindre tätort"),
        "C8": ("Mindre städer/tätorter och landsbygdskommuner", "Landsbygdskommun"),
        "C9": ("Mindre städer/tätorter och landsbygdskommuner", "Landsbygdskommun med besöksnäring"),
    }

    rows: list[dict] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Bilaga 1 starts on report page 38/39 and contains all 290 municipalities.
            for page in pdf.pages[38:48]:
                text = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
                for raw_line in text.splitlines():
                    line = " ".join(raw_line.split())
                    m = re.match(r"^([ABC][1-9])\s+(\d{4})\s+(.+)$", line)
                    if not m:
                        continue
                    code, kommun_code, rest = m.groups()
                    if code not in groups:
                        continue
                    main_group, kommun_group = groups[code]
                    suffix = f"{main_group} {kommun_group}"
                    if not rest.endswith(suffix):
                        continue
                    name = clean_municipality(rest[:-len(suffix)].strip())
                    rows.append({
                        "Gruppkod": code,
                        "Kommunkod": kommun_code,
                        "Kommun": name,
                        "Huvudgrupp": main_group,
                        "Kommungrupp": kommun_group,
                    })
    finally:
        pdf_path.unlink(missing_ok=True)

    by_name = {row["Kommun"]: row for row in rows if row["Kommun"] in valid_names}
    if len(by_name) != 290:
        missing = sorted(valid_names - set(by_name))
        found_sample = sorted(set(by_name))[:20]
        raise RuntimeError(
            f"SKR 2023 classification extraction matched {len(by_name)} of 290 municipalities; "
            f"missing sample: {missing[:20]}; found sample: {found_sample}"
        )
    print(f"SKR 2023 classification: {len(by_name)} municipalities from {pdf_url}")
    return [by_name[name] for name in sorted(by_name)]


def build_municipality_meta(geo: dict, skr_rows: list[dict], valid_names: set[str]) -> None:
    geo_by_name = {f["properties"]["Kommun"]: f["properties"] for f in geo.get("features", [])}
    skr_by_name = {row["Kommun"]: row for row in skr_rows}
    records = []
    for name in sorted(valid_names):
        gp = geo_by_name.get(name, {})
        sp = skr_by_name.get(name, {})
        kommun_code = str(gp.get("Kommunkod") or sp.get("Kommunkod") or "").zfill(4)
        lan_code = str(gp.get("Lanskod") or (kommun_code[:2] if len(kommun_code) == 4 else ""))
        records.append({
            "Kommun": name,
            "Kommunkod": kommun_code or None,
            "Lanskod": lan_code or None,
            "Lan": COUNTY_NAMES.get(lan_code),
            "SKR_Gruppkod": sp.get("Gruppkod"),
            "SKR_Huvudgrupp": sp.get("Huvudgrupp"),
            "SKR_Kommungrupp": sp.get("Kommungrupp"),
        })

    if sum(1 for r in records if r["Lan"]) != 290:
        missing = [r["Kommun"] for r in records if not r["Lan"]]
        raise RuntimeError(f"County metadata missing for municipalities: {missing[:20]}")
    if sum(1 for r in records if r["SKR_Gruppkod"]) != 290:
        missing = [r["Kommun"] for r in records if not r["SKR_Gruppkod"]]
        raise RuntimeError(f"SKR metadata missing for municipalities: {missing[:20]}")

    (OUT / "municipality_meta.json").write_text(
        json.dumps(records, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
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
    skr_rows = fetch_skr_groups(municipalities)
    build_municipality_meta(geo, skr_rows, municipalities)
    (OUT / "municipalities.geojson").write_text(
        json.dumps(geo, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8"
    )
    build_info = {
        "geometry_source": geo.get("properties", {}).get("source"),
        "geometry_municipalities": len(geo.get("features", [])),
        "parquet_years": len(meta["available_years"]),
        "skr_classification": "SKR kommungruppsindelning 2023",
        "skr_source": SKR_GROUP_PAGE,
    }
    (OUT / "build.json").write_text(
        json.dumps(build_info, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8"
    )
    print(json.dumps(build_info, ensure_ascii=False))


if __name__ == "__main__":
    main()
