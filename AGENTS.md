# AGENTS.md

Browser-based 3D Space Invaders: THREE.js v0.158, plain ES modules in `js/`, Vite for dev/build. No framework, no TypeScript.

**Read `CLAUDE.md` before touching game code.** It holds the detailed architecture map, the voxel sculpt system, and a list of animation invariants — each one earned by a silent regression (merged-away `userData`, shared materials breaking chase lights, recoil drifting aliens out of formation).

## Commands

```bash
npm install
npm run dev -- --host 0.0.0.0 --strictPort   # dev server on port 5173
npm run build                                # production build to dist/
npm run package                              # build + patch-bump package.json + zip dist
```

## Verification — there are no tests

No test runner, linter, or typechecker is configured (`test.py` is an unrelated scratch script). The only automated gate is `npm run build`.

Behaviour changes must be verified manually in a browser at `http://127.0.0.1:5173/` (plain HTTP — never try HTTPS). If the page won't load, diagnose with `curl -I http://127.0.0.1:5173/` and `lsof -nP -iTCP:5173 -sTCP:LISTEN` before changing application code. LAN IPs like `192.168.0.61` work from other devices; `172.23.x.x` addresses printed by Vite are tunnel/VPN interfaces and are not usable browser URLs.

Audio requires a user click to initialize (browser autoplay policy), so sound bugs can't be checked by curl alone.

## Gotchas

- **Adding an alien type**: follow `.claude/skills/new-invader/SKILL.md`. A fully implemented type is still unreachable until `CAPS.maxRows` in `js/levels.js` exceeds its row index — this shipped broken once. Raise the cap with the type.
- **Voxel models**: shared builders live in `js/voxel.js` (`buildVoxelGeometry`, `mirrorBoxes`, `buildLimbChain`, …), used by both `aliens.js` and `bonus-ufo.js`. Mirror parts with `mirrorBoxes`, never negative `scale.x` — it inverts normals and breaks lighting.
- **Display-only models**: use `createAlienPreview()` from `aliens.js` (Bestiary, preview pages). Never `createAliens()` for display — it mutates the shared formation state.
- **New game subsystems**: expose a `reset*()` function and call it from `resetGame()` in `js/game.js` (see existing modules for the pattern).
- **`index.html` is source**, not boilerplate: HUD, menus, and UI elements live there alongside `<script type="module" src="js/main.js">`. `alien-preview.html` is a standalone CDN-import-map page for inspecting single alien models.
- The in-game version string comes from `__APP_VERSION__`, injected in `vite.config.js` from `package.json` — it only updates on rebuild/package.
