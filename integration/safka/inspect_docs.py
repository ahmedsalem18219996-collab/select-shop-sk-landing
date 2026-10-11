#!/usr/bin/env python3
"""Extract public Safka API documentation into a research report.
Read-only, no credentials, no private endpoints or customer records.
"""
import html, json, re, urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT="https://public-api-docs.safka-eg.com"
PATHS=["/","/api/products-list","/api/product-by-id","/api/create-order","/api/price-list","/integration-flow","/authentication"]
OUTPUT=Path("integration/safka/research-contract.md")
class Visible(HTMLParser):
  def __init__(self): super().__init__(); self.text=[];self.hidden=0
  def handle_starttag(self,t,a):
    if t in ("script","style","svg"):self.hidden+=1
  def handle_endtag(self,t):
    if t in ("script","style","svg"):self.hidden=max(0,self.hidden-1)
  def handle_data(self,d):
    if not self.hidden and d.strip():self.text.append(d.strip())
def extract_next_f(raw):
  chunks=re.findall(r'self\.__next_f\.push\((\[[\s\S]*?\])\)\s*<',raw)
  out=[]
  for ch in chunks:
    try:
      doc=json.loads(ch)
      s=doc[-1] if isinstance(doc,list) else ""
      if isinstance(s,str):out.append(s)
    except Exception:pass
  return "\n".join(out)
report=["# Safka API read-only contract research","Source: official public site "+ROOT,"All sections below were fetched without API keys; treat routes/schema as unverified if missing.",""]
for path in PATHS:
  req=urllib.request.Request(ROOT+path,headers={"User-Agent":"Mozilla/5.0 (compatible; SelectShopIntegrationProbe/1.0)"})
  try:
    with urllib.request.urlopen(req,timeout=22) as result:
      raw=result.read(900_000).decode("utf-8","replace")
      status=result.status
    parser=Visible();parser.feed(raw)
    visible="\n".join(parser.text)
    next_f=extract_next_f(raw)
    report += [f"## {path} — HTTP {status}, HTML {len(raw)} bytes, extracted text {len(visible)}"]
    report += ["\n### Visible HTML\n", visible[:18000] or "(not server-rendered)"]
    if next_f:report += ["\n### Next.js payload excerpt\n",html.unescape(next_f[:30000])]
    else:
      report += ["\n### Page metadata\n", "\n".join(re.findall(r'<meta[^>]{0,350}>',raw)[:15])]
    report+=["\n---\n"]
  except Exception as exc:
    report += [f"## {path} — FETCH_ERROR {type(exc).__name__}: {str(exc)[:170]}",""]
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
OUTPUT.write_text("\n".join(report),encoding="utf-8")
print(f"Research written to {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
