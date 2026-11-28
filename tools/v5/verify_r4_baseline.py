"""Read-only V5-00 R4 baseline verification. No asset copying, patching or signing."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

APK_SHA = "a81a1544f97b59e75b25f455ee91a6eb875bb3fb5bd09aa52361c8f6964e257f"
APK_SIZE = 40293307
ASSET_COUNT = 1078
UNITY_VERSION = "6000.6.10f1"
ANCHORS = {
    "Assets/SnakeWarzIO/Classes/BotController.cs": "94b00bf8a5ee01d86d997c7c059b8492a133fbafa7c0e0f6ca9b3472631d3520",
    "Assets/SnakeWarzIO/Classes/BotSensorController.cs": "2341bad41309645e0dc5008fde6cb47b3fbf88fc55159b3209eb9fc2de983d9d",
    "Assets/DragonArena/Runtime/P13SafeArea.cs": "789fc6569dc999496d0b68183aacd523e524ed3ccb27d6b91f1c11852373c02b",
    "Assets/SnakeWarzIO/Classes/ShopController.cs": "82bac57bf3aad4240b80e406801f9a830400d3c009bac9c57a4e8409519267ae",
    "Assets/SnakeWarzIO/_Scenes/Skins.unity": "3c070adcfdf05e79702666a0e712deaf917cfa6c49f5523678174856c61c6ef5",
    "Assets/SnakeWarzIO/Classes/BotSpawner.cs": "a4a23c09b2224dc23a479d9fcf19ca39b5e18c79544ea815ba4016f9ae13018c",
}
PREFAB_SHA = "909a2222412433adb0de51e9a83dbc1386543fe9e33a63168b820f178ba62631"


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def tree(project):
    root = project / "Assets"
    if not root.is_dir() or root.is_symlink():
        raise ValueError("Missing or linked Assets directory")
    result = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
            raise ValueError("Linked Assets entry: " + path.relative_to(project).as_posix())
        if path.is_file():
            result[path.relative_to(project).as_posix()] = digest(path)
    return result


def differences(left, right):
    return sorted(k for k in left.keys() | right.keys() if left.get(k) != right.get(k))


def version(project):
    path = project / "ProjectSettings" / "ProjectVersion.txt"
    match = re.search(r"(?m)^m_EditorVersion:\s*([^\s]+)", path.read_text(encoding="utf-8-sig"))
    return match.group(1) if match else None


def verify(project, repro, apk):
    if any(not re.fullmatch(r"[0-9a-f]{64}", h) for h in [*ANCHORS.values(), PREFAB_SHA, APK_SHA]):
        raise ValueError("Invalid baseline SHA-256 constant")
    if project.resolve() == repro.resolve():
        raise ValueError("Reproduction must be a distinct project, not the same path")
    left, right = tree(project), tree(repro)
    diff = differences(left, right)
    anchors = {k: left.get(k) == v for k, v in ANCHORS.items()}
    prefabs = [k for k in left if k.endswith("/SkinItem.prefab")]
    anchors["SkinItem.prefab (unique)"] = len(prefabs) == 1 and left[prefabs[0]] == PREFAB_SHA
    checks = {
        "project_version": version(project) == UNITY_VERSION,
        "reproduction_version": version(repro) == UNITY_VERSION,
        "asset_count": len(left) == ASSET_COUNT and len(right) == ASSET_COUNT,
        "asset_tree_equal": not diff,
        "critical_anchors": all(anchors.values()),
        "apk_size": apk.stat().st_size == APK_SIZE,
        "apk_sha256": digest(apk) == APK_SHA,
    }
    return {
        "status": "R4_HASH_CHECKS_PASS" if all(checks.values()) else "BLOCKED_BASELINE_MISMATCH",
        "checks": checks,
        "anchors": anchors,
        "asset_counts": [len(left), len(right)],
        "differing_paths": diff,
        "asset_manifest": left,
        "limitations": [
            "Tree equality and seven historical hash anchors do not authenticate every R4 byte against a trusted manifest.",
            "Review full private overlay/package provenance, ProjectSettings/Packages, license entitlement and toolchain separately.",
            "This is not Unity compilation, gameplay QA, signing or V5-00 approval."
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--repro", type=Path, required=True)
    parser.add_argument("--apk", type=Path, required=True)
    args = parser.parse_args()
    try:
        report = verify(args.project, args.repro, args.apk)
    except (OSError, ValueError) as exc:
        print(json.dumps({"status": "BLOCKED_INPUT", "error": str(exc)}, indent=2))
        return 2
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["status"] == "R4_HASH_CHECKS_PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
