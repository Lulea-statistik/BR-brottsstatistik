from __future__ import annotations
import io, json
from pathlib import Path
import pandas as pd, requests

CAT=Path("data/handlagda_source_catalog.csv")
OUT=Path("data/handlagda_legacy_probe.json")
TARGETS=[("300",2021,"La"),("310",2019,"La"),("310",2014,"La"),("320",2019,"La"),("320",2014,"La")]

def clean(v):
    if pd.isna(v): return None
    return str(v) if not isinstance(v,(int,float,bool)) else v

def main():
    cat=pd.read_csv(CAT,dtype={"table_id":"string","region_code":"string"})
    out={}
    s=requests.Session(); s.headers.update({"User-Agent":"Lulea-statistik/1.0"})
    for table,year,region in TARGETS:
        hit=cat[(cat.table_id==table)&(cat.year==year)&(cat.region_code==region)]
        if hit.empty:
            out[f"{table}-{year}-{region}"]={"error":"catalog miss"}; continue
        row=hit.iloc[0]
        r=s.get(row.file_url,timeout=90); r.raise_for_status()
        engine="openpyxl" if str(row.file_name).lower().endswith(".xlsx") else "xlrd"
        book=pd.ExcelFile(io.BytesIO(r.content),engine=engine)
        rec={"file_name":row.file_name,"sheets":{}}
        for sheet in book.sheet_names:
            df=pd.read_excel(book,sheet_name=sheet,header=None,engine=engine)
            preview=[]
            for _,rr in df.head(35).iterrows():
                preview.append([clean(x) for x in rr.iloc[:20].tolist()])
            rec["sheets"][sheet]={"shape":[int(df.shape[0]),int(df.shape[1])],"preview":preview}
        out[f"{table}-{year}-{region}"]=rec
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print("wrote",OUT)

if __name__=="__main__": main()
