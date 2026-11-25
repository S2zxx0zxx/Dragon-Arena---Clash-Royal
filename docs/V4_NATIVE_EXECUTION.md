# Dragon Arena v4 integration foundation (draft, not merge-ready)

Approved rebuild scope: native Unity, original private asset import, all five game modes, 13 skin pairs, 67 food assets, four boosters, all source scenes, animation/audio/VFX and migration. Existing v3 remains active until the replacement passes all gates.

## Evidence from private workspace
570 source paths, 2,019 internal package files, 518 payloads matched against prior SHA256 ledger, 550 original metadata files restored (1,068 written files). 22 external GUID candidates require editor resolution. No Unity Editor or Android SDK in the current execution environment. No native compile, gameplay or APK evidence.

## Reproduce privately
Run python3 unity-integration/import_private_template.py <local zip> UnityProject --report private-import-report.json.
Copy unity-integration/Packages/manifest.json into UnityProject/Packages/manifest.json (provisional dependencies).
Copy unity-integration/Editor/PreviewBuild.cs into UnityProject/Assets/DragonArena/Editor/PreviewBuild.cs.
Use Unity 2021.3.8f1 with Android modules and an active Unity license. Run batchmode executeMethod DragonArena.EditorTools.PreviewBuild.Validate, then BuildAndroidQA with DRAGON_ARENA_APK set to an absolute APK path. Review editor logs and package resolution. The QA application ID io.dragonarena.unityqa is intentionally separate from the existing preview until migration/signing are tested.

## Gate status
P00 static restoration complete; P01 native import/compile pending. P02–P11 pending. Original branding is not yet replaced. The editor script is not compiled here. Do not merge this draft, replace v3, publish vendor source or claim a release until the approved plan is actually executed. Keep generated UnityProject and raw private assets outside public Git. No production multiplayer/billing claims.
