## UI polish v0.6.0 (reference sheets 92600/92601)

This is an **offline Android preview, not a production release**. The supplied two sheets are the visual design contract. New work: dynamic 3D home/lab showcase, rarity-specific platform treatments, compact card unlock pricing, drag rotation, live actual-food minimap, larger GLB pickups, seamless deep-space ground, lethal 3D barrier and camera clamp, mobile Result layout, and centered 3D splash with supporting dragons. No backend-enabled payments, global rankings, or multiplayer are claimed.

Run `node --test app/tests/*.test.mjs`. Android debug APK: GitHub Actions `.github/workflows/android-preview.yml` on `feat/reference-locked-premium-3d-ui`. Physical Android GPU/UX QA remains required before merging to main.

# Dragon Arena — Clash Royale (working title)

**Status: prototype / draft. NOT production-ready and NOT merged.** Crystal Creatures is the internal family name of the original dragon/food/death-effect assets.

This repository holds the first original **3D arena game UI-first implementation** locked to the user's two approved reference sheets. It includes 24 different 3D creature sets, 24 death burst meshes, 10 food types, a WebGL2 rendering engine with instanced body segments, a local deterministic arena and 10 reference-aligned screen states. The real checkout, ads and online PvP are **not** included.

### Run locally

```sh
python serve.py --port 8000
```

Then open `http://localhost:8000/` in a WebGL2-capable browser. The bootstrap automatically restores all original models, PNGs and visual reference images from the checked-in sha256-verified asset packs if they are not already unpacked. Browser requires **landscape** for intended composition. Alternatively run `python tools/unpack_assets.py` and serve the `app` directory.

### Test

```sh
python tools/unpack_assets.py
python -m pip install numpy trimesh pillow
node --test app/tests/*.test.mjs
python tools/validate_premium_assets.py
python tests/validate_bundle.py
```

### Release gate

See [locked screen map](docs/MASTER_IMPLEMENTATION_LOCK.md) and [blocking QA ledger](docs/QA_BLOCKERS.md). Static tests are not substitutes for Chrome/WebGL screenshot capture and physical Android performance/accessibility validation.

### Naming / legal caveat

The word **“Clash Royale”** is the name of an existing Supercell game; using it in public consumer branding entails trademark/store-confusion risk. This is a user-requested **working title**, not a final store-approved brand, and no affiliation is implied. Repository path is `S2zxx0zxx/Dragon-Arena---Clash-Royal` (without final 'e').

### Reference priorities

1. `app/references/LOCKED_BLUEPRINT_SHEET_v2.png` (PRIMARY visual target)
2. `app/references/LOCKED_GAME_FLOW_SHEET_v1.png` (SECONDARY visual target)

**Do not merge while any release-blocking gate remains unverified.**
