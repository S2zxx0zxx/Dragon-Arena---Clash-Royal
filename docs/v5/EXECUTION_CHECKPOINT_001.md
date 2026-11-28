# V5 execution checkpoint 001 — V5-00
2026-11-28. Owner supplied START V5 MAJOR UPGRADE — PR #6 — R2 LOCKED PLAN — ONE-SHOT EXECUTION. Authorization applies to 30 active tasks, not merge/publication. Status BLOCKED_PRIVATE_R4_AND_EXECUTION_ENVIRONMENT.

## Verified facts
- PR6 starts at 10a89f29f88bee0b7fb4bd0efcae4410c03777fb, stacked on PR5 c318902ed8e30ff9e17a1ad9e5aeedafbb8de445. PR4 remains a9e2efe3e7cf1ab852e18b68f553a64021b87497 and its recorded main base is b6d130742a87c11840e77510f2744eeaf4672da8. No protected refs modified in this execution.
- R2 plan archive, reference base APK and ten screenshots were listed in the execution filesystem. Recovered two earlier private archives from Library into the working environment: Dragon_Arena_V4_Codex_Remote_Handoff.zip (202055209 bytes) and Dragon-Arena-P13-Combined-Private-Patch-R2.zip (54545 bytes). Archive CRC/hash verification could not run because subsequent Python/container calls repeatedly returned ClientError. Materialization is not verification.
- Latest actual private P13 R4 project and overlay are recorded on the Windows builder at C:/DA4/build-002/QA/UnityProject and C:/DA4/P13_R4_OVERLAY. No direct access to these paths here. R2 archives cannot be substituted for R4. Unity executable was not found in initial environment inspection.
- R4 report: https://github.com/S2zxx0zxx/Dragon-Arena---Clash-Royal/blob/3d21d172fbb8f427eadca71df216723ee9541fb8/docs/V4_P13_COMBINED_EXECUTION.md. Prior 20/20 match soak and 1078-file reproducibility are reported historical evidence, not new V5 verification.

## Resume V5-00 on authorized Windows builder
Use existing PR6 branch; do not change PR4, PR5 or main. Locate original R2 final locked ZIP and ten captures, validate archive hashes/CRC. Copy exact R4 project into a new private V5 workspace, never modify original. Check ProjectVersion, P13 R4 overlay manifest, 1078 asset file inventory and SHA256 of retained APK a81a1544f97b59e75b25f455ee91a6eb875bb3fb5bd09aa52361c8f6964e257f; compare original/repro trees. At minimum confirm known R4 file hashes:
- BotController.cs: 94b00bf8a5ee01d86d997c7c059b8492a133fbafa7c0e0f6ca9b3472631d3520
- BotSensorController.cs: 2341bad41309645e0dc5008fde6cb47b3fbf88fc55159b3209eb9fc2de983d9d
- P13SafeArea.cs: 789fc6569dc999496d0b68183aacd523e524ed3ccb27d6b91f1c11852373c02b
- ShopController.cs: 82bac57bf3aad4240b801f9a830400d3c009bac9c57a4e8409519267ae
- Skins.unity: 3c070adcfdf05e79702666a0e712deaf917cfa6c49f5523678174856c61c6ef5
- SkinItem.prefab: 909a2222412433adb0de51e9a83dbc1386543fe9e33a63168b820f178ba62631
- BotSpawner.cs: a4a23c09b2224dc23a479d9fcf19ca39b5e18c79544ea815ba4016f9ae13018c
These seven hashes are anchors, not full project verification. Reconcile all overlay and package manifests, own asset entitlement, toolchain, and snapshot actual source. Then update V5-00 with real evidence and proceed to V5-01, V5-26 and remaining tasks in locked order without per-task approval. No new modes or reference character assets. Keep original durable saves and P13 fixes. No new game code, tests, APK, AAB or merge in checkpoint 001. Do not repeat prior unrelated gameplay testing.
