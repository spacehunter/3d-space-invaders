# Project Status

**Date:** 2026-08-25
**Status:** Active development — Row 2 Squid visual rebuild complete

## Current State

- Row 2 Squid rebuilt (2026-08-25): deep-green mantle with a dorsal keel and a wide mint-to-shadow ramp, amber bioluminescent veins, two-segment diamond fin wings that ripple, an eight-arm crown with glowing suckers, and feeding tentacles ending in amber lure clubs. The jet cycle gained a coil anticipation phase. Fixed a latent bug where the eye-glow pulse multiplied a black emissive, so the eyes never glowed. Bestiary framing raised (pivot 1.3, TARGET_SIZE 1.8) so height-dominant models clear more of the info panel.
- All 13 alien rows have distinct voxel models and row-specific animation.
- Row 12 Mantis is the roster's first deliberately *still* invader: an upright olive-and-bone ambush predator with folded raptorial forearms, a head that tracks on its own neck, a sub-second arm strike, and ambush spurs that stalk, coil, then lunge.
- `CAPS.maxRows` raised from 12 to 13 alongside `ALIEN_ROWS`, so the Mantis actually reaches waves.
- Row 11 Gyre is the roster's first type that is a vortex rather than a body: fourteen nacre shell plates wound in a receding conical spiral around a gold bead, orbiting dust motes, an inward pearl chase light, a "drain" collapse into its own core, and corkscrewing vortex bolts that sweep a widening corridor.
- `CAPS.maxRows` raised from 11 to 12 alongside `ALIEN_ROWS`, so the Gyre actually reaches waves.
- Row 10 Warden is the roster's first hollow silhouette: a standing hoop with a gold core on retractable spokes, a gimbal flip that collapses it edge-on, and expanding halo waves that are lethal only at the rim.
- Row 9 Sentinel is the roster's first limbless type: ten obsidian armour shards around an exposed plasma core, two counter-rotating gimbal rings, a shatter-bloom disassembly that locks into a firing lens, and diverging three-shot prism lance fans.
- `CAPS.maxRows` raised from 8 to 10. At 8 the grid could only reach rows 0-7, so the Row 8 Wasp had never actually spawned in a wave; both it and the Sentinel now do.
- Row 8 Wasp now follows the roster’s voxel language with a charcoal thorax, amber warning stripes, smoky wings, a wingstorm cycle, and fast amber needle volleys.
- Row 7 Scorpion now follows the Beetle's visual language: compact body mass, saturated burnt-orange palette, dark recesses, chunky appendages, and one dominant signature feature.
- The Scorpion's raised five-segment tail and amber stinger are readable from the formation camera.
- Existing venom-dart firing, scoring, collision, and level behavior are unchanged.
- The standalone Scorpion preview now instantiates the production model through `createAlienPreview(7)`.
- The Bestiary now instantiates the production Wasp through `createAlienPreview(8)`.

## Validation

- `npm run build` — passed for the Sentinel integration.
- `git diff --check` — passed.
- Bestiary — 10/10 entries, Sentinel auto-fits, animates and reassembles at 120 FPS.
- Gameplay — verified with a temporarily forced all-Sentinel wave: formation placement, shatter-bloom animation, diverging prism lance fans, barrier erosion, player collision and life loss all confirmed, then the test overrides were reverted.
- Formation-distance colour review — the first obsidian ramp washed out to a white sparkle under gameplay bloom and was re-tinted; the current ramp reads as a distinct shard construct.

## Test Locally

```bash
npm run dev -- --host 0.0.0.0 --strictPort
```

Open `http://127.0.0.1:5173/` for gameplay or `http://127.0.0.1:5173/alien-preview.html` for the Scorpion turntable. From another device on the same Wi-Fi, use the Mac's current LAN address (for example `http://192.168.0.61:5173/`). Do not use the `172.23.7.133` tunnel/VPN address or `https://`.

To verify a reported outage, run `curl -I http://127.0.0.1:5173/` and `lsof -nP -iTCP:5173 -sTCP:LISTEN`. The expected response is `HTTP/1.1 200 OK` with Vite listening on `*:5173`.

## Known Follow-up

The UFO row remains wider than the preferred collision-radius budget and is documented as a separate cleanup item in `CLAUDE.md`.
