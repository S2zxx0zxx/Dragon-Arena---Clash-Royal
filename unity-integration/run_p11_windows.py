"""Check Windows Unity installs and run the private Dragon Arena Android QA build."""

import argparse
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import time
from pathlib import Path, PurePosixPath
from types import SimpleNamespace
from zipfile import ZipFile

from android.verify_android_artifact import verify_apk
from run_p11_native import MODERN_QA_VERSION, UNITY_VERSION, digest

HANDOFF_SHA = "ef6b31387d92745fcfe0eb40971944ffe4b28fc93fbf540c40daf076d7e5780e"
SOURCE_ZIP = "Snake Warz IO slither worm complete game template v1.3.2.zip"
CHECKPOINT_ZIP = "Dragon_Arena_V4_P10_Private_Integration_Checkpoint.zip"
SDK_LEVELS = {UNITY_VERSION: 30, MODERN_QA_VERSION: 36}


def read_version(executable):
    result = subprocess.run([str(executable), "-version"], capture_output=True, text=True, timeout=45)
    candidates = re.findall(r"\b(?:2021|6000)\.\d+\.\d+[abfp]\d+\b", result.stdout + result.stderr)
    return candidates[0] if result.returncode == 0 and candidates else None


def probe_android(executable, version):
    root = executable.parent / "Data/PlaybackEngines/AndroidPlayer"
    sdk = root / "SDK"
    java = root / "OpenJDK/bin/java.exe"
    tools = [
        directory for directory in (sdk / "build-tools").glob("*")
        if re.fullmatch(r"\d+\.\d+\.\d+", directory.name)
        and (directory / "aapt.exe").is_file()
        and (directory / "lib/apksigner.jar").is_file()
    ]
    tools.sort(key=lambda path: tuple(map(int, path.name.split("."))), reverse=True)
    ndk = root / "NDK"
    checks = {
        "android_build_support": (root / "UnityEditor.Android.Extensions.dll").is_file(),
        "sdk_platform": (sdk / f"platforms/android-{SDK_LEVELS[version]}/android.jar").is_file(),
        "sdk_build_tools": bool(tools),
        "ndk": (ndk / "source.properties").is_file()
        and any(ndk.glob("toolchains/llvm/prebuilt/*/bin/clang++.exe")),
        "openjdk": java.is_file(),
    }
    return {
        "editor": str(executable),
        "sdk_api": SDK_LEVELS[version],
        "checks": checks,
        "ready_for_build_attempt": all(checks.values()),
        "build_tools": str(tools[0]) if tools else None,
        "java": str(java),
    }


def installed_editors(roots):
    candidates = set()
    for root in roots:
        for pattern in ("Unity.exe", "Editor/Unity.exe", "*/Editor/Unity.exe", "Editor/*/Editor/Unity.exe"):
            candidates.update(path.resolve() for path in root.glob(pattern) if path.is_file())
    found = {}
    for path in sorted(candidates):
        try:
            version = read_version(path)
        except (OSError, subprocess.TimeoutExpired) as error:
            print(f"Unity version probe failed for {path}: {error}", file=sys.stderr)
            continue
        if version not in SDK_LEVELS:
            print(f"Unity {path}: unexpected or unreadable editor version {version}", file=sys.stderr)
            continue
        info = probe_android(path, version)
        if version not in found or not found[version]["ready_for_build_attempt"]:
            found[version] = info
    return {version: found.get(version) for version in SDK_LEVELS}


def safe_checkpoint(archive, destination):
    with ZipFile(archive) as zip_file:
        for entry in zip_file.infolist():
            path = PurePosixPath(entry.filename)
            mode = entry.external_attr >> 16
            if (
                path.is_absolute() or ".." in path.parts or "\\" in entry.filename
                or ":" in entry.filename or stat.S_ISLNK(mode)
            ):
                raise ValueError(f"Unsafe checkpoint entry: {entry.filename}")
        zip_file.extractall(destination)


def unpack_handoff(handoff, workspace):
    candidates = [handoff] if handoff else sorted(
        (Path.home() / "Downloads").glob("Dragon_Arena_V4_Codex_Remote_Handoff*.zip")
    )
    archive = next((path for path in candidates if path.is_file() and digest(path) == HANDOFF_SHA), None)
    if archive is None:
        raise ValueError("Download the approved private handoff ZIP or pass its path with --handoff.")
    inputs = workspace / "Inputs"
    inputs.mkdir()
    with ZipFile(archive) as zip_file:
        for name in (SOURCE_ZIP, CHECKPOINT_ZIP):
            with zip_file.open(name) as source, (inputs / name).open("xb") as target:
                shutil.copyfileobj(source, target)
    checkpoint = inputs / "P10"
    safe_checkpoint(inputs / CHECKPOINT_ZIP, checkpoint)
    return checkpoint, inputs / SOURCE_ZIP


def execute(args):
    roots = args.unity_root or [
        Path("C:/Unity"),
        Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Unity/Hub/Editor",
    ]
    installed = installed_editors(roots)
    print(json.dumps({"unity": installed}, indent=2), flush=True)
    if args.preflight_only:
        return
    order = (args.editor_version,) if args.editor_version else (UNITY_VERSION, MODERN_QA_VERSION)
    chosen = next((
        version for version in order if installed[version] and installed[version]["ready_for_build_attempt"]
    ), None)
    if chosen is None:
        raise ValueError("No supported editor has every required Unity Android module. See the checks above.")

    workspace = args.output.resolve()
    workspace.mkdir(parents=True)
    (workspace / "P11_WINDOWS_PREFLIGHT.json").write_text(
        json.dumps({"unity": installed, "selected": chosen}, indent=2) + "\n", encoding="utf-8"
    )
    checkpoint, source = unpack_handoff(args.handoff, workspace)
    output = workspace / "QA"
    info = installed[chosen]
    runner = Path(__file__).with_name("run_p11_native.py")
    subprocess.run([
        sys.executable, str(runner), "--checkpoint", str(checkpoint), "--source", str(source),
        "--output", str(output), "--unity", info["editor"], "--editor-version", chosen,
    ], check=True)
    tools = Path(info["build_tools"])
    apk = output / "DragonArena-P11-QA.apk"
    verification = verify_apk(
        apk, SimpleNamespace(aapt=tools / "aapt.exe", package="io.dragonarena.unityqa",
                             code=15, version="4.0.0", cert=None),
        qa_target_sdk=info["sdk_api"],
        apksigner_command=(info["java"], "-jar", tools / "lib/apksigner.jar"),
    )
    verification.update(status="ARTIFACT_CHECKS_PASS", device_qa="NOT_RUN")
    (output / "P11_APK_VERIFICATION.json").write_text(
        json.dumps(verification, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Verified QA APK: {apk}")
    print(f"SHA-256: {verification['sha256']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unity-root", type=Path, action="append", help="Unity install search root, repeatable")
    parser.add_argument("--handoff", type=Path, help="Approved private handoff ZIP, defaults to Downloads")
    parser.add_argument("--output", type=Path, default=Path.home() / "P11" / time.strftime("%Y%m%d-%H%M%S"))
    parser.add_argument("--editor-version", choices=tuple(SDK_LEVELS))
    parser.add_argument("--preflight-only", action="store_true")
    args = parser.parse_args()
    if os.name != "nt":
        parser.error("Run this helper on the Windows PC with the activated Unity Editor.")
    try:
        execute(args)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
