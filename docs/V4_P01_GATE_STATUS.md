# P01 — native baseline acceptance

Status: BLOCKED. P02 not started. No merge authorized while incomplete.

Private source re-verification: all 1,068 restored payload/metadata files matched SHA256; 19 ProjectSettings payloads checked; 5 importer tests passed. 22 external GUID candidates across 689 reference occurrences: 18 UI MonoScript candidates and four non-script references (two textures, particle light, lighting settings). No vendor payload changed. Package versions remain provisional. No substitutions made.

Unity executable not present; editor download host did not resolve in the execution environment. Native compile, package resolution, shader render validation and APK build are NOT RUN. Prior importer CI is not Unity CI.

The stricter editor gate now checks serialized GUID resolution and missing/error material shaders, in addition to scene and prefab checks. This C# gate is authored, not compiled. Resolve missing references against the original dependency package in a licensed local Unity 2021.3.8f1 editor with Android Build Support; do not invent replacement GUIDs. Record import/compiler logs, clean scene and prefab audit, native QA APK, and rendered material evidence before declaring P01 complete. Keep source private and preserve current main.
