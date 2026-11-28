"""P13-01 only: apply immersive Android settings to the local P12 Unity 6.6 project.
No vendor files are committed. Close Unity before running. Python 3.11+.
Usage: py -3 p13_fullscreen.py [--project PATH] [--unity PATH] [--apply-only]
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime
import tempfile
import unittest

VERSION = "6000.6.10f1"
PROJECT = Path(r"C:\DA4\build-002\QA\UnityProject")
ARTIFACTS = Path(r"C:\DA4\artifacts")
REL = Path("Assets/DragonArena/Editor/P13Fullscreen.cs")
GUID = "90a3626424454a439ad75a87c13e01da"
META = ("fileFormatVersion: 2\nguid: " + GUID + "\nMonoImporter:\n"
        "  externalObjects: {}\n  serializedVersion: 2\n  defaultReferences: []\n"
        "  executionOrder: 0\n  icon: {instanceID: 0}\n  userData: \n"
        "  assetBundleName: \n  assetBundleVariant: \n")
CS = r'''// Original Dragon Arena integration. P13-01 only.
#if UNITY_6000_6_OR_NEWER
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace DragonArena.EditorTools
{
    public sealed class P13Fullscreen : IPreprocessBuildWithReport
    {
        public int callbackOrder => -100;
        public static void Apply()
        {
            if (Application.unityVersion != "6000.6.10f1")
                throw new Exception("P13 requires the verified Unity 6.6 editor");
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.Android)
                throw new Exception("P13 requires Android target");
            PlayerSettings.Android.fullscreenMode = FullScreenMode.FullScreenWindow;
            PlayerSettings.Android.requestedVisibleInsets = AndroidWindowInsetsType.None;
            PlayerSettings.Android.systemBarsBehavior = AndroidSystemBarsBehavior.ShowTransientBarsBySwipe;
            PlayerSettings.Android.renderOutsideSafeArea = true;
            AssetDatabase.SaveAssets();
            Verify();
            Debug.Log("P13_FULLSCREEN_SETTINGS_PASS");
        }

        private static void Verify()
        {
            if (PlayerSettings.Android.fullscreenMode != FullScreenMode.FullScreenWindow ||
                PlayerSettings.Android.requestedVisibleInsets != AndroidWindowInsetsType.None ||
                PlayerSettings.Android.systemBarsBehavior != AndroidSystemBarsBehavior.ShowTransientBarsBySwipe ||
                !PlayerSettings.Android.renderOutsideSafeArea)
                throw new BuildFailedException("P13 fullscreen settings drifted; apply P13 again.");
        }

        public void OnPreprocessBuild(BuildReport report)
        {
            if (report.summary.platform == BuildTarget.Android)
                Verify();
        }

        [MenuItem("Dragon Arena/P13 Apply Fullscreen")]
        public static void ApplyFromMenu() { Apply(); }

        public static void ApplyAndBuild()
        {
            Apply();
            EditorUserBuildSettings.development = false;
            EditorUserBuildSettings.buildAppBundle = false;
            PreviewBuild.BuildAndroidQA();
            Verify();
            Debug.Log("P13_FULLSCREEN_APK_BUILD_PASS");
        }
    }
}
#endif
'''

def sha(data):
    return hashlib.sha256(data).hexdigest()

def meta_guid_matches(path):
    return re.findall(r"^guid: ([0-9a-f]{32})\s*$", path.read_text(encoding="utf-8-sig"), re.M) == [GUID]

def prepare(project, backup):
    project = project.resolve(strict=True)
    version = (project / "ProjectSettings/ProjectVersion.txt").read_text(encoding="utf-8-sig")
    if not re.search(r"^m_EditorVersion:\s*" + re.escape(VERSION) + r"\s*$", version, re.M):
        raise ValueError("Unexpected Unity project version")
    settings = project / "ProjectSettings/ProjectSettings.asset"
    builder = project / "Assets/DragonArena/Editor/PreviewBuild.cs"
    java = project / "Assets/Plugins/Android/MigrationActivity.java"
    manifest = project / "Assets/Plugins/Android/AndroidManifest.xml"
    for p in (settings, builder, java, manifest):
        if not p.is_file():
            raise ValueError("Missing P12 project input: " + str(p))
    build = builder.read_text(encoding="utf-8-sig")
    if ("BuildOptions.Development" in build or '"Dragon Arena QA"' in build
        or "BuildAndroidQA()" not in build or "io.dragonarena.unityqa" not in build
        or "BuildOptions.None" not in build):
        raise ValueError("Local P12 build-script changes are missing or unexpected")
    if "hasLegacyApp()" not in java.read_text(encoding="utf-8-sig") or "io.dragonarena.preview" not in manifest.read_text(encoding="utf-8-sig"):
        raise ValueError("Local P12 startup changes are missing; refusing to replace them")
    if (project / "Temp/UnityLockfile").exists():
        raise ValueError("Unity project appears open. Close Unity Editor first.")
    dst = project / REL
    meta = dst.with_suffix(".cs.meta")
    new = {dst: CS.encode("utf-8"), meta: META.encode("utf-8")}
    for p, data in new.items():
        if p.exists() and p.read_bytes() != data:
            if p == meta and meta_guid_matches(p):
                new[p] = p.read_bytes()
            else:
                raise ValueError("Conflicting P13 file: " + str(p))
    backup = backup.resolve()
    if backup.is_relative_to(project):
        raise ValueError("Backup must be outside Unity project")
    backup.mkdir(parents=True, exist_ok=False)
    records = {}
    # Copy only affected settings and reference inputs; never copy secrets or user saves.
    for p in (settings, builder, java, manifest, *new):
        rel = p.relative_to(project)
        before = p.read_bytes() if p.exists() else None
        if before is not None:
            b = backup / rel
            b.parent.mkdir(parents=True, exist_ok=True)
            b.write_bytes(before)
        records[rel.as_posix()] = {"before": sha(before) if before is not None else None,
                                 "expected_after": sha(new[p]) if p in new else None}
    (backup / "before.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
    created = []
    try:
        for p, data in new.items():
            if not p.exists():
                with p.open("xb") as f:
                    created.append(p)
                    f.write(data)
    except Exception:
        for p in reversed(created):
            p.unlink(missing_ok=True)
        raise
    return records

def unity_exe(explicit):
    if explicit:
        return explicit.resolve(strict=True)
    candidates = [
        Path(r"C:\Unity") / VERSION / "Editor/Unity.exe",
        Path(r"C:\Unity\Editor") / VERSION / "Editor/Unity.exe",
        Path(r"C:\Unity\Editor\Unity.exe"),
        Path(r"C:\Unity\Unity.exe"),
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Unity/Hub/Editor" / VERSION / "Editor/Unity.exe",
    ]
    found = sorted({p.resolve() for p in candidates if p.is_file()})
    if len(found) != 1:
        raise ValueError("Unity executable not uniquely found; supply --unity with its exact path")
    return found[0]

def run(args):
    project = args.project.resolve(strict=True)
    editor = unity_exe(args.unity)
    probe = subprocess.run([str(editor), "-version"], capture_output=True, text=True, timeout=60)
    if probe.returncode or VERSION not in (probe.stdout + probe.stderr).split():
        raise ValueError("Unity executable version mismatch")
    artifacts = args.artifacts.resolve()
    if artifacts.is_relative_to(project):
        raise ValueError("Artifact directory must be outside Unity project")
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    evidence = artifacts / ("P13-01-" + stamp)
    backup = evidence / "backup"
    records = prepare(project, backup)
    apk = artifacts / ("Dragon-Arena-v4-P13-01-" + stamp + ".apk")
    log = evidence / "unity.log"
    status = {"status": "PENDING", "release_gate": "BLOCKED", "device_qa": "NOT_RUN"}
    status_path = evidence / "status.json"
    def record():
        status_path.write_text(json.dumps(status, indent=2), encoding="utf-8")
    record()
    try:
        env = dict(os.environ, DRAGON_ARENA_QA_EDITOR=VERSION, DRAGON_ARENA_APK=str(apk))
        method = "Apply" if args.apply_only else "ApplyAndBuild"
        result = subprocess.run([str(editor), "-batchmode", "-nographics", "-quit",
            "-projectPath", str(project), "-buildTarget", "Android",
            "-executeMethod", "DragonArena.EditorTools.P13Fullscreen." + method,
            "-logFile", str(log)], env=env)
        contents = log.read_text(encoding="utf-8", errors="replace") if log.exists() else ""
        marker = "P13_FULLSCREEN_SETTINGS_PASS" if args.apply_only else "P13_FULLSCREEN_APK_BUILD_PASS"
        if result.returncode or marker not in contents or re.search(r"error CS\d{4}", contents):
            raise ValueError("Unity failed or did not emit the required evidence; see " + str(log))
        for rel, entry in records.items():
            entry["after"] = sha((project / rel).read_bytes())
            if entry["expected_after"] is not None and entry["after"] != entry["expected_after"]:
                if rel != REL.as_posix() + ".meta" or not meta_guid_matches(project / rel):
                    raise ValueError("Unexpected P13 source mutation: " + rel)
            if rel != "ProjectSettings/ProjectSettings.asset" and entry["before"] is not None and entry["expected_after"] is None and entry["after"] != entry["before"]:
                raise ValueError("Unexpected P12 source mutation: " + rel)
        if not args.apply_only:
            if not apk.is_file() or apk.stat().st_size == 0:
                raise ValueError("Missing new APK")
            status.update(apk=str(apk), apk_sha256=sha(apk.read_bytes()))
        status["status"] = "SETTINGS_APPLIED" if args.apply_only else "BUILT_AWAITING_DEVICE_QA"
        print("SUCCESS:", status["status"], status.get("apk", ""))
    except Exception as exc:
        status.update(status="BLOCKED", error=str(exc))
        raise
    finally:
        status["files"] = records
        record()
        print("Evidence:", evidence)

def self_test():
    class Tests(unittest.TestCase):
        def fixture(self, root):
            p = root / "project"
            data = {"ProjectSettings/ProjectVersion.txt": "m_EditorVersion: " + VERSION + "\n",
                    "ProjectSettings/ProjectSettings.asset": "fixture",
                    "Assets/DragonArena/Editor/PreviewBuild.cs": 'BuildAndroidQA() io.dragonarena.unityqa BuildOptions.None',
                    "Assets/Plugins/Android/MigrationActivity.java": "hasLegacyApp()",
                    "Assets/Plugins/Android/AndroidManifest.xml": "io.dragonarena.preview"}
            for rel, value in data.items():
                f = p / rel
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_text(value, encoding="utf-8")
            return p
        def test_apply_and_repeat(self):
            with tempfile.TemporaryDirectory() as t:
                root = Path(t)
                p = self.fixture(root)
                r = prepare(p, root / "backup1")
                self.assertEqual((p / REL).read_text(), CS)
                self.assertEqual(r[REL.as_posix()]["expected_after"], sha(CS.encode()))
                self.assertEqual((root / "backup1/ProjectSettings/ProjectSettings.asset").read_text(), "fixture")
                prepare(p, root / "backup2")
        def test_conflict_rejected(self):
            with tempfile.TemporaryDirectory() as t:
                root = Path(t)
                p = self.fixture(root)
                (p / REL).write_text("unrelated")
                with self.assertRaises(ValueError):
                    prepare(p, root / "backup")
                self.assertEqual((p / REL).read_text(), "unrelated")
                self.assertFalse((root / "backup").exists())
        def test_development_build_rejected(self):
            with tempfile.TemporaryDirectory() as t:
                root = Path(t)
                p = self.fixture(root)
                (p / "Assets/DragonArena/Editor/PreviewBuild.cs").write_text("BuildOptions.Development")
                with self.assertRaises(ValueError):
                    prepare(p, root / "backup")
                self.assertFalse((p / REL).exists())
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(Tests)
    return unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=PROJECT)
    parser.add_argument("--unity", type=Path)
    parser.add_argument("--artifacts", type=Path, default=ARTIFACTS)
    parser.add_argument("--apply-only", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        sys.exit(0 if self_test() else 1)
    try:
        run(args)
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        sys.exit("P13 BLOCKED: " + str(exc))
