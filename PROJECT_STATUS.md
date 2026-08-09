# Project Status

**Date:** 2026-08-09
**Status:** Active development — Scorpion consistency pass complete

## Current State

- All 8 alien rows have distinct voxel models and row-specific animation.
- Row 7 Scorpion now follows the Beetle's visual language: compact body mass, saturated burnt-orange palette, dark recesses, chunky appendages, and one dominant signature feature.
- The Scorpion's raised five-segment tail and amber stinger are readable from the formation camera.
- Existing venom-dart firing, scoring, collision, and level behavior are unchanged.
- The standalone Scorpion preview now instantiates the production model through `createAlienPreview(7)`.

## Validation

- `npm run build` — passed.
- `git diff --check` — passed.
- Preview module syntax check — passed.
- Formation-angle visual review — approximately 7.5/10 consistency against Beetle, Tank, and Invader.

## Test Locally

```bash
npm run dev
```

Open `http://localhost:5173/` for gameplay or `http://localhost:5173/alien-preview.html` for the Scorpion turntable.

## Known Follow-up

The UFO row remains wider than the preferred collision-radius budget and is documented as a separate cleanup item in `CLAUDE.md`.
