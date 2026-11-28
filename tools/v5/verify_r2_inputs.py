"""Verify original V5 screenshots and required R2 plan archive without modifying inputs."""
import argparse
import csv
import hashlib
import json
import sys
import zipfile
from pathlib import Path

MANIFEST = Path(__file__).resolve().parents[2] / "docs/v5/REFERENCE_CAPTURE_MANIFEST.csv"
ZIP_NAME = "Dragon_Arena_V5_R2_Final_Locked_Build_Plan.zip"
REQUIRED_PLAN_FILES = {
    "DRAGON_ARENA_V5_MASTER_BUILD_PLAN.md", "README.md", "V5_ASSET_NAME_REVIEW.csv",
    "V5_CATALOG.csv", "V5_EXECUTION_LEDGER.csv", "V5_REFERENCE_CAPTURE_MANIFEST.csv",
    "V5_SCREEN_GEOMETRY.csv", "V5_TYPE_METHOD_FIELD_MAP.csv",
}

def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

def verify(root):
    with MANIFEST.open(encoding="utf-8", newline="") as stream:
        expected = list(csv.DictReader(stream))
    if len(expected) != 10 or len({row["File"] for row in expected}) != 10:
        raise ValueError("Invalid capture manifest")
    captures = {}
    for row in expected:
        path = root / row["File"]
        actual = sha(path) if path.is_file() else None
        captures[row["File"]] = {
            "status": "PASS" if actual == row["SHA256"] else ("MISSING" if actual is None else "HASH_MISMATCH"),
            "sha256": actual,
        }
    archive = root / ZIP_NAME
    plan = {"status": "MISSING"}
    if archive.is_file():
        try:
            with zipfile.ZipFile(archive) as z:
                names = {Path(n).name for n in z.namelist() if not n.endswith("/")}
                missing = sorted(REQUIRED_PLAN_FILES - names)
                corrupt = z.testzip()
                plan = {"status": "STRUCTURE_PASS" if not missing and corrupt is None else "BLOCKED",
                        "missing_members": missing, "corrupt_member": corrupt, "sha256": sha(archive)}
        except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
            plan = {"status": "BLOCKED", "error": str(exc)}
    passed = all(v["status"] == "PASS" for v in captures.values()) and plan["status"] == "STRUCTURE_PASS"
    return {"status": "INPUT_CHECKS_PASS" if passed else "BLOCKED_INPUTS", "captures": captures,
            "plan": plan, "limitations": ["ZIP member names and CRC do not establish authoritative plan identity; reconcile R2 scope and manifest with owner-approved archive.", "No Unity implementation or license approval implied."]}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", type=Path, required=True)
    args = parser.parse_args()
    try:
        report = verify(args.inputs)
    except (OSError, ValueError) as exc:
        print(json.dumps({"status": "BLOCKED_INPUTS", "error": str(exc)}, indent=2))
        return 2
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "INPUT_CHECKS_PASS" else 1

if __name__ == "__main__":
    sys.exit(main())
