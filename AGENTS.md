# Dragon Arena v4

- Continue the Unity rebuild on `feat/dragon-arena-v4-unity-rebuild` in PR #4. Read [the execution ledger](docs/V4_P11_EXECUTION.md) before changing the branch or rerunning gates.
- Keep archive inputs, vendor source and art, Unity licenses, and signing secrets on the authorized private builder. Commit original integration code, safe manifests, and non-sensitive evidence that identifies the tested revision.
- Keep the exact Unity 2021.3.8f1 baseline and the supported Unity 6 production copy separate. Record private source overlays with before and after hashes. Keep static checks, editor builds, device tests, and signed release evidence distinct.
- Keep the native release gate closed until all 57 acceptance rows pass with exact-source evidence. Preserve the installed legacy app and existing release tags. Treat a missing legacy signing key as a migration blocker.
