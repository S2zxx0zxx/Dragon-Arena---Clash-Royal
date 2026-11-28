#!/usr/bin/env python3
"""Generate static legal pages only from explicitly approved, final content."""
import argparse
import datetime
import html
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

PAGES={"privacy":"Privacy Policy","terms":"Terms of Use","delete-data":"Delete Game Data","support":"Help & Support"}
BAD=re.compile(r"\b(TBD|TODO|PLACEHOLDER|INTERNAL DRAFT|DO NOT PUBLISH|UNVERIFIED)\b|\[[^\]\n]+\]",re.I)

def validate(cfg):
    if cfg.get("approved") is not True:
        raise ValueError("explicit final policy approval required")
    for k in ("developer","support_email","base_url","effective_date","approval_evidence"):
        v=cfg.get(k)
        if not isinstance(v,str) or not v.strip() or BAD.search(v):
            raise ValueError("missing or draft "+k)
    email=cfg["support_email"]
    if not re.fullmatch(r"[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",email):
        raise ValueError("invalid support email")
    if email.lower().split("@")[-1] in {"example.com","example.org","example.net"} or email.lower().endswith((".invalid",".test",".example",".localhost")):
        raise ValueError("example support address")
    u=urlsplit(cfg["base_url"])
    if u.scheme!="https" or not u.hostname or u.username or u.password or u.query or u.fragment or u.hostname in {"localhost","example.com","example.org","example.net"} or u.hostname.endswith((".invalid",".test",".example",".localhost")):
        raise ValueError("real HTTPS base URL required")
    datetime.date.fromisoformat(cfg["effective_date"])
    pages=cfg.get("pages")
    if not isinstance(pages,dict) or set(pages)!=set(PAGES):
        raise ValueError("four final page bodies required")
    for key,body in pages.items():
        if not isinstance(body,str) or len(body.strip())<60 or BAD.search(body):
            raise ValueError("incomplete or draft content: "+key)
    return cfg

def render(cfg,key):
    e=html.escape
    links="".join('<a href="../'+name+'/">'+e(title)+'</a>' for name,title in PAGES.items())
    body="".join("<p>"+e(part.strip()).replace("\n","<br>")+"</p>" for part in cfg["pages"][key].split("\n\n") if part.strip())
    canonical=cfg["base_url"].rstrip("/")+"/"+key+"/"
    return """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>"""+e(PAGES[key])+' | Dragon Arena</title><link rel="canonical" href="'+e(canonical,quote=True)+"""">
<style>body{font:16px/1.65 system-ui,sans-serif;color:#222;background:#fff;margin:0}main,nav{max-width:760px;margin:auto;padding:24px}nav{display:flex;flex-wrap:wrap;gap:16px;border-bottom:1px solid #ddd}a{color:#164c83}h1{line-height:1.2}footer{border-top:1px solid #ddd;margin-top:32px;padding-top:20px}</style></head>
<body><nav aria-label="Legal navigation">"""+links+"""</nav><main><h1>"""+e(PAGES[key])+"""</h1><p>Dragon Arena · """+e(cfg["developer"])+""" · Effective """+e(cfg["effective_date"])+"""</p>"""+body+"""<footer>Contact: <a href="mailto:"""+e(cfg["support_email"],quote=True)+"""">"""+e(cfg["support_email"])+"""</a></footer></main></body></html>"""

def build(cfg,out):
    validate(cfg)
    out.mkdir(parents=True,exist_ok=False)
    for key in PAGES:
        path=out/key
        path.mkdir()
        (path/"index.html").write_text(render(cfg,key),encoding="utf-8")
    return [cfg["base_url"].rstrip("/")+"/"+key+"/" for key in PAGES]

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--config",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    try:
        print("\n".join(build(json.loads(a.config.read_text(encoding="utf-8")),a.output)))
    except (ValueError,OSError) as e:
        p.exit(2,"BLOCKED: "+str(e)+"\n")
