"""Reconstruct the approved private P11 candidate and run native Unity gates."""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from apply_verified_overlay import apply
from prepare_p11_dependencies import SCRIPT, prepare

UNITY_VERSION = "2021.3.8f1"
EDITOR_STEPS = (
    ("validate", "PreviewBuild.Validate", "Static scene/prefab inspection passed"),
    ("save_fixture", "P07SaveFixture.Run", "P07 isolated storage self-test PASS"),
    ("legacy_fixture", "P06AssetFixture.Generate", "P06 legacy fixture created"),
    ("build", "PreviewBuild.BuildAndroidQA", "QA APK compiled;"),
)
EDITOR_ERRORS = re.compile(
    r"error CS\d{4}|Unresolved serialized GUID:|Missing/error material shader:|"
    r"Missing script:|Broken reference:"
)


def digest(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def prepare_project(checkpoint, source, output):
    checkpoint = checkpoint.resolve(strict=True)
    report = output / "P09_STATIC_EVIDENCE.json"
    subprocess.run([
        sys.executable, str(checkpoint / "qa/verify_p09.py"),
        "--source", str(source.resolve(strict=True)), "--report", str(report),
    ], check=True)
    expected = json.loads(report.read_text(encoding="utf-8"))["project_manifest"]
    overlay = output / "overlay"
    prepare(checkpoint / "UnityProject", overlay, SCRIPT / "P11_DEPENDENCY_LOCK.json")
    manifest = overlay / "P11_OVERLAY_MANIFEST.json"
    overlay_files = json.loads(manifest.read_text(encoding="utf-8"))
    for name, entry in overlay_files.items():
        if expected.get(name) != entry["before"]:
            raise ValueError(f"Overlay is outside the verified P09 baseline: {name}")
        expected[name] = entry["after"]

    project = output / "UnityProject"
    shutil.copytree(checkpoint / "UnityProject", project)
    apply(project, overlay, manifest)
    actual = {
        path.relative_to(project).as_posix(): digest(path)
        for path in project.rglob("*") if path.is_file()
    }
    if actual != expected:
        raise ValueError("Prepared project differs from the verified P11 source")
    candidate = output / "P11_PROJECT_SHA256.json"
    candidate.write_text(json.dumps(actual, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return project, {"files": len(actual), "manifest_sha256": digest(candidate)}


def run(args, output, status, record):
    project, preparation = prepare_project(args.checkpoint, args.source, output)
    status["steps"]["prepare"] = preparation
    status["status"] = "PREPARED"
    record()
    if args.unity is None:
        return

    unity = args.unity.resolve(strict=True)
    probe = subprocess.run([str(unity), "-version"], capture_output=True, text=True, timeout=60)
    if probe.returncode != 0 or UNITY_VERSION not in (probe.stdout + probe.stderr).split():
        raise ValueError(f"Exact baseline Unity {UNITY_VERSION} is required")

    apk = output / "DragonArena-P11-QA.apk"
    env = dict(os.environ, DRAGON_ARENA_APK=str(apk))
    for name, method, marker in EDITOR_STEPS:
        log = output / f"{name}.log"
        result = subprocess.run([
            str(unity), "-batchmode", "-nographics", "-quit", "-projectPath", str(project),
            "-buildTarget", "Android", "-executeMethod", "DragonArena.EditorTools." + method,
            "-logFile", str(log),
        ], env=env, timeout=3600)
        status["steps"][name] = {"exit_code": result.returncode, "log": log.name}
        contents = log.read_text(errors="replace") if log.is_file() else ""
        if result.returncode or marker not in contents or EDITOR_ERRORS.search(contents):
            raise ValueError(f"{name} failed or lacks required evidence")
        status["steps"][name]["status"] = "PASS"
        record()
    if not apk.is_file() or not apk.stat().st_size:
        raise ValueError("Unity reported success without a QA APK")
    status.update(status="BUILT_AWAITING_ARTIFACT_AND_DEVICE_QA", apk=apk.name, apk_sha256=digest(apk))
    record()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--unity", type=Path, help="Unity executable. Omit to prepare source only.")
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(args.checkpoint.resolve()):
        parser.error("The output must be outside the immutable checkpoint.")
    output.mkdir(mode=0o700)
    status = {"status": "BLOCKED", "steps": {}, "device_qa": "NOT_RUN", "release_gate": "BLOCKED"}

    def record():
        (output / "P11_NATIVE_STATUS.json").write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")

    record()
    try:
        run(args, output, status, record)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        status.update(status="BLOCKED", blocker=str(error))
        record()
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
