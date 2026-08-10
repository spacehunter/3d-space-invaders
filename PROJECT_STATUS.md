# Project Status

**Date:** 2026-08-09
**Status:** Active development — Wasp invader integration complete

## Current State

- All 9 alien rows have distinct voxel models and row-specific animation.
- Row 8 Wasp now follows the roster’s voxel language with a charcoal thorax, amber warning stripes, smoky wings, a wingstorm cycle, and fast amber needle volleys.
- Row 7 Scorpion now follows the Beetle's visual language: compact body mass, saturated burnt-orange palette, dark recesses, chunky appendages, and one dominant signature feature.
- The Scorpion's raised five-segment tail and amber stinger are readable from the formation camera.
- Existing venom-dart firing, scoring, collision, and level behavior are unchanged.
- The standalone Scorpion preview now instantiates the production model through `createAlienPreview(7)`.
- The Bestiary now instantiates the production Wasp through `createAlienPreview(8)`.

## Validation

- `npm run build` — passed for the Wasp integration.
- `git diff --check` — passed.
- Preview module syntax check — passed.
- Formation-angle visual review — approximately 7.5/10 consistency against Beetle, Tank, and Invader.

## Test Locally

```bash
npm run dev -- --host 0.0.0.0 --strictPort
```

Open `http://127.0.0.1:5173/` for gameplay or `http://127.0.0.1:5173/alien-preview.html` for the Scorpion turntable. From another device on the same Wi-Fi, use the Mac's current LAN address (for example `http://192.168.0.61:5173/`). Do not use the `172.23.7.133` tunnel/VPN address or `https://`.

To verify a reported outage, run `curl -I http://127.0.0.1:5173/` and `lsof -nP -iTCP:5173 -sTCP:LISTEN`. The expected response is `HTTP/1.1 200 OK` with Vite listening on `*:5173`.

## Known Follow-up

The UFO row remains wider than the preferred collision-radius budget and is documented as a separate cleanup item in `CLAUDE.md`.
