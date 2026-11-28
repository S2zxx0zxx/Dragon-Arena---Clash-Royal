#!/usr/bin/env python3
"""Read-only evidence inventory; never grants release approval."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ANDROID = "{http://schemas.android.com/apk/res/android}"
RISK = re.compile(r"(LOCATION|CONTACTS|CAMERA|RECORD_AUDIO|READ_SMS|SEND_SMS|READ_CALL_LOG|MANAGE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|QUERY_ALL_PACKAGES|REQUEST_INSTALL_PACKAGES|AD_ID|POST_NOTIFICATIONS|READ_MEDIA|BLUETOOTH|SCHEDULE_EXACT_ALARM)", re.I)
SDK = re.compile(r"(play-services-games|play-services-ads|firebase|appsflyer|adjust|facebook|unity-ads|ironsource|applovin|billingclient|crashlytics|analytics)", re.I)

def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024*1024), b""):
            h.update(block)
    return h.hexdigest()

def manifest_report(xml):
    root = ET.fromstring(xml)
    if root.tag != "manifest":
        raise ValueError("not an Android manifest")
    def attr(el, name):
        return el.get(ANDROID+name) if el is not None else None
    perms = sorted({attr(e, "name") for e in root if e.tag.startswith("uses-permission") and attr(e, "name")})
    sdk = root.find("uses-sdk")
    app = root.find("application")
    exported = []
    if app is not None:
        for e in app:
            if e.tag in {"activity", "activity-alias", "service", "receiver", "provider"}:
                exported.append({"type": e.tag, "name": attr(e,"name"), "exported": attr(e,"exported"),
                                 "permission": attr(e,"permission"), "intent_filters": len(e.findall("intent-filter"))})
    return {"package": root.get("package"), "versionCode": attr(root,"versionCode"),
            "versionName": attr(root,"versionName"), "minSdk": attr(sdk,"minSdkVersion"),
            "targetSdk": attr(sdk,"targetSdkVersion"), "debuggable": attr(app,"debuggable"),
            "allowBackup": attr(app,"allowBackup"), "usesCleartextTraffic": attr(app,"usesCleartextTraffic"),
            "permissions": perms, "review_permissions": [p for p in perms if RISK.search(p)],
            "queries_present": root.find("queries") is not None, "components": exported}

def inspect_bundle(bundle, bundletool, gradle_report, package):
    if not bundle.is_file() or bundle.suffix.lower() != ".aab":
        raise ValueError("a real .aab file is required")
    if not bundletool.is_file() or not gradle_report.is_file():
        raise ValueError("bundletool and resolved Gradle dependency report required")
    with zipfile.ZipFile(bundle) as z:
        if z.testzip() is not None:
            raise ValueError("invalid bundle CRC")
        names = z.namelist()
        modules = sorted({n.split("/")[0] for n in names if n.endswith("/manifest/AndroidManifest.xml")})
        native = sorted(n for n in names if re.search(r"/lib/[^/]+/[^/]+\.so$", n))
        abis = sorted({n.split("/")[-2] for n in native})
    if "base" not in modules:
        raise ValueError("missing base manifest")
    subprocess.run(["java","-jar",str(bundletool),"validate","--bundle="+str(bundle)],
                   check=True,capture_output=True,timeout=180)
    manifests = {}
    for module in modules:
        r = subprocess.run(["java","-jar",str(bundletool),"dump","manifest","--bundle="+str(bundle),"--module="+module],
                           check=True,capture_output=True,text=True,timeout=90)
        manifests[module] = manifest_report(r.stdout)
    gradle = gradle_report.read_text(encoding="utf-8",errors="replace")
    if not gradle.strip():
        raise ValueError("empty dependency report")
    findings = sorted({line.strip() for line in gradle.splitlines() if SDK.search(line)})
    m = manifests["base"]
    blockers = []
    if m["package"] != package or package.endswith(".unityqa") or package.endswith(".preview"):
        blockers.append("production package mismatch or QA identity")
    if not (m["targetSdk"] or "").isdigit() or int(m["targetSdk"]) < 36:
        blockers.append("target SDK below proposed production floor 36 or unknown")
    if m["debuggable"] not in {None,"false"}:
        blockers.append("debuggable or unresolved manifest value")
    if native and "arm64-v8a" not in abis:
        blockers.append("native bundle lacks ARM64")
    if any(v["usesCleartextTraffic"] == "true" for v in manifests.values()):
        blockers.append("explicit cleartext traffic allowed")
    return {"status":"REVIEW_REQUIRED","bundle_sha256":sha256(bundle),"bundletool_sha256":sha256(bundletool),
            "dependency_report_sha256":sha256(gradle_report),"manifests":manifests,"native_libraries":native,
            "abis":abis,"sdk_keyword_matches":findings,"automatic_blockers":blockers,
            "manual_required":["signing certificate and versionCode availability","all SDK versions and data flows",
              "16 KB ELF and delivered APK alignment","actual endpoint/consent/ads/AAID review","asset licenses",
              "PGS configuration and Console declarations"]}

def inventory(root, approvals):
    root = root.resolve()
    if not root.is_dir() or not (root/"Assets").is_dir() or not (root/"Packages").is_dir():
        raise ValueError("private Unity project root with Assets and Packages required")
    records = json.loads(approvals.read_text(encoding="utf-8")) if approvals else []
    if not isinstance(records,list):
        raise ValueError("approval file must be an array")
    by_path = {}
    for row in records:
        if not isinstance(row,dict) or not isinstance(row.get("path"),str) or row["path"] in by_path:
            raise ValueError("invalid/duplicate approval path")
        by_path[row["path"]] = row
    out = []
    for folder in ("Assets","Packages"):
        for path in sorted((root/folder).rglob("*")):
            if path.is_symlink():
                raise ValueError("symlink requires manual review: "+str(path))
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            digest = sha256(path)
            approval = by_path.get(rel,{})
            covered = (approval.get("sha256")==digest and approval.get("decision")=="approved" and
                       all(isinstance(approval.get(k),str) and approval[k].strip()
                           for k in ("origin","license","proof_ref","reviewer")))
            out.append({"path":rel,"sha256":digest,"size":path.stat().st_size,"reviewed_coverage":covered})
    known = {r["path"] for r in out}
    missing = [r["path"] for r in out if not r["reviewed_coverage"]]
    return {"status":"REVIEW_REQUIRED","total":len(out),"covered":len(out)-len(missing),
            "uncovered":missing,"stale_approvals":sorted(set(by_path)-known),"files":out,
            "limitations":"Inventory only. License rights, transitive SDKs, external promo assets, trademarks and original-content requirements require separate review. Keep this report private."}

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="command",required=True)
    a=sub.add_parser("bundle")
    for name in ("bundle","bundletool","gradle-report","output"):
        a.add_argument("--"+name,type=Path,required=True)
    a.add_argument("--package",required=True)
    i=sub.add_parser("inventory")
    i.add_argument("--project",type=Path,required=True)
    i.add_argument("--approvals",type=Path)
    i.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    result=inspect_bundle(args.bundle,args.bundletool,args.gradle_report,args.package) if args.command=="bundle" else inventory(args.project,args.approvals)
    with args.output.open("x",encoding="utf-8") as f:
        json.dump(result,f,indent=2)
    print("Evidence written; manual release review required.")
    return 2 if result.get("automatic_blockers") or result.get("uncovered") or result.get("stale_approvals") else 0

if __name__=="__main__":
    try:
        sys.exit(main())
    except (ValueError,OSError,subprocess.SubprocessError,zipfile.BadZipFile,ET.ParseError) as e:
        print("BLOCKED:",e,file=sys.stderr)
        sys.exit(2)
