# Deferred native gates — P01/P02

User authorized proceeding around blockers, not bypassing final release gates.

P01: deferred. Unity 2021.3.8f1 editor, license and Android build modules unavailable. Actual package resolution, native compile, APK and material rendering not run. 18 UI GUIDs identified upstream; four non-UI GUIDs unresolved (two textures, one particle light, one Game lighting settings). These may affect P03/P06 and all builds.

P02: implemented in the private workspace, static verification passed. 7 original files edited, 2 new branding files, 1,068 restored file hashes checked against original or intentional patch hashes, 30/30 Menu scene serialized callbacks mapped to actual methods, mode IDs 0–4 retained. 1,116 static checks plus 3 private overlay tests passed. Actual source/scene edits are in the private P02 package, not in this public repository. The committed overlay applicator validates exact input/output hashes; supply PrivateOverlay from the private package. Preserve all original artwork, menu animation, demo snake and existing source paths. New Dragon Arena logo and splash; guard modal navigation and duplicate scene changes, fix first-launch mode selection through tutorial, nickname and sound preference persistence, apply safe area to menu camera. QA application ID stays separate.

P02 unresolved: Unity compilation, real clicks, rendered screenshots 16:9 and 20:9, safe-area and native audio validation. P03 uses the selected-mode handoff; P04/P05 entry points are retained but not runtime validated. P03 not started. PR remains draft. All deferred gates must be resolved before merge or release. No APK or public vendor assets.
