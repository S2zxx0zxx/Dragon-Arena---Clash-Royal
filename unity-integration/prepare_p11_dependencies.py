"""Prepare the reviewed P11 dependency and Android build overlay."""

import argparse
import hashlib
import json
import re
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent
ROOT = Path("Assets/SnakeWarzIO")
ANDROID_BUILD = Path("Assets/DragonArena/Editor/PreviewBuild.cs")
MIGRATION_ACTIVITY = Path("Assets/Plugins/Android/MigrationActivity.java")
BACKGROUND = b"12c8895a4e193334c93064441b077296"
SOLID = b"80b9845f9959e9a4887ea35c0cb4dff7"
PARTICLE_LIGHT = b"3622f5ddd78508c4f9fd52e7488ebbef"
LIGHTING_SETTINGS = b"f47ed205fcb433b409cf46dff4625ce5"
SUPPLIED_BACKGROUND = b"d394d2e40bceb8549907d1cb991dfeb8"
MISSING_GUIDS = (BACKGROUND, SOLID, PARTICLE_LIGHT, LIGHTING_SETTINGS)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def material_change(data, missing, replacement):
    anchor = rb"(_MainTex:\r?\n[ \t]+m_Texture: )\{fileID: 2800000, guid: " + missing + rb", type: 3\}"
    result, count = re.subn(anchor, lambda match: match[1] + replacement, data)
    if count != 1:
        raise ValueError("Expected one missing _MainTex reference")
    return result


def particle_change(data, expected_count, expected_enabled):
    anchor = (
        rb"(  LightsModule:\r?\n    enabled: )([01])(\r?\n    ratio: 1\r?\n    light: )"
        rb"\{fileID: 108478085895960704, guid: " + PARTICLE_LIGHT + rb", type: 3\}"
    )
    matches = list(re.finditer(anchor, data))
    if len(matches) != expected_count or sum(match[2] == b"1" for match in matches) != expected_enabled:
        raise ValueError("Unexpected particle light module reference or activation count")
    return re.sub(anchor, rb"\g<1>0\g<3>{fileID: 0}", data)


def lighting_change(data):
    anchor = (
        rb"(  m_LightingDataAsset: \{fileID: 0\}\r?\n  m_LightingSettings: )"
        rb"\{fileID: 4890085278179872738, guid: " + LIGHTING_SETTINGS + rb",\r?\n    type: 2\}"
    )
    result, count = re.subn(anchor, rb"\g<1>{fileID: 0}", data)
    if count != 1:
        raise ValueError("Expected the Game scene's missing LightingSettings reference without baked data")
    return result


def android_build_change(data):
    newline = b"\r\n" if b"\r\n" in data else b"\n"

    def replace(before, after):
        nonlocal data
        anchor = newline.join(before)
        if data.count(anchor) != 1:
            raise ValueError("Unexpected Android build source anchor")
        data = data.replace(anchor, newline.join(after), 1)

    reference = b"                            it.objectReferenceValue == null && it.objectReferenceInstanceIDValue != 0)"
    replace((reference,), (
        b"#if UNITY_6000_3_OR_NEWER",
        b"                            it.objectReferenceValue == null && it.objectReferenceEntityIdValue != EntityId.None)",
        b"#else",
        reference,
        b"#endif",
    ))

    backend = b"            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);"
    replace((backend,), (
        b"#if UNITY_6000_0_OR_NEWER",
        b"            PlayerSettings.Android.applicationEntry = AndroidApplicationEntry.Activity;",
        b"#endif",
        backend,
    ))
    validate = b"        public static void Validate() { ValidateCommon(false); }"
    replace((validate,), (
        validate,
        b"        public static void GenerateLegacyFixture()",
        b"        {",
        b"            EditorSceneManager.OpenScene(Root + Scenes[0] + \".unity\", OpenSceneMode.Single);",
        b"            P06AssetFixture.Generate();",
        b"        }",
        b"        public static void ValidateQA()",
        b"        {",
        b"#if UNITY_6000_0_OR_NEWER",
        b'            if (Application.unityVersion != Required("DRAGON_ARENA_QA_EDITOR"))',
        b'                throw new Exception("Modern QA editor mismatch");',
        b"            ValidateCommon(true);",
        b"#else",
        b"            Validate();",
        b"#endif",
        b"        }",
    ))
    build = (b"        public static void BuildAndroidQA()", b"        {")
    replace((*build, b"            Validate();"), (*build, b"            ValidateQA();"))
    legacy_sdk = b"            PlayerSettings.Android.targetSdkVersion = (AndroidSdkVersions)30; // exact baseline only; never publish to Play"
    replace((legacy_sdk,), (
        b"#if UNITY_6000_0_OR_NEWER",
        b"            PlayerSettings.Android.targetSdkVersion = (AndroidSdkVersions)36;",
        b"#else",
        legacy_sdk,
        b"#endif",
    ))
    return data


def migration_activity_change(data):
    newline = b"\r\n" if b"\r\n" in data else b"\n"
    anchor = b"        setContentView(view);"
    if data.count(anchor) != 1:
        raise ValueError("Unexpected migration content view anchor")
    replacement = newline.join((
        b"        // Keep the explicit import choice clear of system bars and display cutouts.",
        b"        view.setOnApplyWindowInsetsListener((v, insets) -> {",
        b"            int left, top, right, bottom;",
        b"            if (android.os.Build.VERSION.SDK_INT >= 30) {",
        b"                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());",
        b"                left = bars.left; top = bars.top; right = bars.right; bottom = bars.bottom;",
        b"            } else {",
        b"                left = insets.getSystemWindowInsetLeft(); top = insets.getSystemWindowInsetTop();",
        b"                right = insets.getSystemWindowInsetRight(); bottom = insets.getSystemWindowInsetBottom();",
        b"                if (android.os.Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {",
        b"                    android.view.DisplayCutout cutout = insets.getDisplayCutout();",
        b"                    left = Math.max(left, cutout.getSafeInsetLeft()); top = Math.max(top, cutout.getSafeInsetTop());",
        b"                    right = Math.max(right, cutout.getSafeInsetRight()); bottom = Math.max(bottom, cutout.getSafeInsetBottom());",
        b"                }",
        b"            }",
        b"            v.setPadding(40 + left, 24 + top, 40 + right, 24 + bottom);",
        b"            return insets;",
        b"        });",
        anchor,
        b"        view.requestApplyInsets();",
    ))
    return data.replace(anchor, replacement, 1)


def repair(data, relative):
    if relative == ANDROID_BUILD:
        return android_build_change(data)
    if relative == MIGRATION_ACTIVITY:
        return migration_activity_change(data)
    name = relative.name
    if name in {"Background-02.mat", "GameoverPanel.mat"}:
        texture = b"{fileID: 2800000, guid: " + SUPPLIED_BACKGROUND + b", type: 3}"
        return material_change(data, BACKGROUND, texture)
    if name in {"SolidColor-Cyan.mat", "SolidColor-White.mat"}:
        return material_change(data, SOLID, b"{fileID: 0}")
    if name == "BigHitEffect-01.prefab":
        return particle_change(data, 2, 2)
    if name == "BigHitEffect-02.prefab":
        return particle_change(data, 2, 1)
    if name == "Game.unity":
        return lighting_change(data)
    raise ValueError(f"Unsupported reference target: {relative}")


def read_private(project, relative):
    if relative.is_absolute() or ".." in relative.parts or not (
        relative.is_relative_to(ROOT) or relative in (ANDROID_BUILD, MIGRATION_ACTIVITY)
    ):
        raise ValueError(f"Unexpected Unity asset path: {relative}")
    path = (project / relative).resolve(strict=True)
    if not path.is_relative_to(project):
        raise ValueError(f"Source path escapes the private project: {relative}")
    return path.read_bytes()


def prepare(project, output, lock):
    project = project.resolve(strict=True)
    output = output.resolve()
    if output.is_relative_to(project) or output.exists():
        raise ValueError("Choose a new overlay directory outside the immutable source project")

    spec = json.loads(lock.read_text(encoding="utf-8"))
    for name, expected in spec["source_evidence"].items():
        if sha(read_private(project, Path(name))) != expected:
            raise ValueError(f"Source evidence changed: {name}")

    changes = {}
    for name, record in spec["files"].items():
        relative = Path(name)
        data = read_private(project, relative)
        if sha(data) != record["before"]:
            raise ValueError(f"P10 input hash mismatch: {name}")
        patched = repair(data, relative)
        if sha(patched) != record["after"] or any(guid in patched for guid in MISSING_GUIDS):
            raise ValueError(f"P11 output validation failed: {name}")
        changes[relative] = patched

    output.mkdir(mode=0o700, parents=False)
    for relative, data in changes.items():
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    manifest = output / "P11_OVERLAY_MANIFEST.json"
    manifest.write_text(json.dumps(spec["files"], indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(changes)} verified private files in {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="Immutable reconstructed P10 UnityProject")
    parser.add_argument("output", type=Path, help="Fresh private overlay directory")
    args = parser.parse_args()
    prepare(args.project, args.output, SCRIPT / "P11_DEPENDENCY_LOCK.json")


if __name__ == "__main__":
    main()
