#!/usr/bin/env python3
"""Download official Lulea graphical mark and website favicon for the statistics site."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin
from html.parser import HTMLParser
from io import BytesIO
from PIL import Image
import re

ROOT=Path(__file__).resolve().parents[1]/"docs"
SITE="https://www.lulea.se/"
LOGO="https://www.lulea.se/images/200.5c423106183ec4269e12abde/1666117198401/x800p/LK_logotype_1400x557_test.png"

def get(url):
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; public-statistics-assets/1.0)"})
    with urlopen(req,timeout=35) as response:
        return response.read()

class IconParser(HTMLParser):
    icons=[]
    def handle_starttag(self,tag,attrs):
        if tag.lower()!="link": return
        attrs=dict(attrs)
        if "icon" in attrs.get("rel","").lower() and attrs.get("href"):
            self.icons.append(attrs["href"])

logo=Image.open(BytesIO(get(LOGO))).convert("RGBA")
# Logo supplied by user is a horizontal lockup: extract left-hand municipal mark.
# Preserve transparent margins, use all of its vertical extent.
crop_width=min(logo.width,round(logo.height*1.10))
mark=logo.crop((0,0,crop_width,logo.height))
mark.save(ROOT/"lulea-kommun-mark.png",optimize=True)
print("Saved municipal mark",mark.size)

parser=IconParser()
parser.feed(get(SITE).decode("utf-8","replace"))
candidates=[urljoin(SITE,x) for x in parser.icons]+[urljoin(SITE,"favicon.ico")]
for candidate in candidates:
    try:
        data=get(candidate)
        icon=Image.open(BytesIO(data))
        icon.load()
        (ROOT/"kommun-favicon.ico").write_bytes(data) if data[:4]==b"\\x00\\x00\\x01\\x00" else icon.convert("RGBA").save(ROOT/"kommun-favicon.png")
        print("Saved favicon from",candidate)
        break
    except Exception as ex:
        print("Skipping",candidate,ex)
else:
    raise RuntimeError("Unable to locate official site favicon")
