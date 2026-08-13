# Bonus UFO Voxel Rebuild — Design

**Date:** 2026-08-08
**Scope:** Visual rebuild only. No gameplay change.

## Problem

The bonus UFO (`js/bonus-ufo.js`) is the last model in the game still built from
smooth primitives — `CylinderGeometry(1.5, 2.0, 0.6, 16)` for the hull,
`SphereGeometry` for the dome and the twelve rim lights, `CylinderGeometry` for
the antenna. Every other model in the game is a blocky voxel sculpt.

So it does not merely look less detailed than the seven rebuilt alien rows, it
actively contradicts the game's aesthetic: a smooth spinning saucer among voxel
sculpts. It is also the single most visible reward in the game — a 500-point
target that appears every ~20 seconds — which makes it the worst place for the
art to fall down.

Two secondary problems:

1. **Palette noise.** Six saturated hues (magenta hull, yellow dome, pink
   underside, alternating cyan *and* yellow rim lights, red beacon) all at
   `emissiveIntensity` 2.0–3.5. Under bloom these melt into one glowing blob.
   It also borrows magenta from the Octopus, yellow from the row-3 UFO, and cyan
   from the Tank, so it reads as a mixture of other rows rather than its own
   thing.
2. **Rebuild cost.** `createBonusUFO()` constructs all 17 meshes and 17
   materials from scratch on every spawn. Every other model type caches its
   geometry in a lazily-built registry.

## Non-goals

Explicitly out of scope, agreed with the user:

- Movement speed, path, spawn interval, 500-point value, firing behaviour, and
  the 2.0 collision radius all stay exactly as they are.
- The `// 25% chance this UFO will attack` comment sitting above
  `Math.random() < 0.75` (which is 75%) is **logged, not fixed**.
- `setSpawnInterval()` is exported but never called, leaving `minSpawnInterval`
  and `maxSpawnInterval` dead. **Logged, not fixed.**

Both are real defects. They are deliberately deferred so this change stays
purely visual and cannot alter game balance.

## Architecture

### Extract the voxel toolkit into `js/voxel.js`

The helpers this rebuild needs are currently module-private inside `aliens.js`,
which has grown to 2,584 lines:

| Helper | Line | Needed by bonus UFO |
|---|---|---|
| `buildVoxelGeometry(boxes)` | 137 | yes |
| `mirrorBoxes(boxes)` | 162 | yes |
| `saucerTier(w, d, h, y, color)` | 951 | yes |
| `buildLimbSegmentGeometry(...)` | 459 | no |
| `buildLimbChain(...)` | 536 | no |

Move all five into a new `js/voxel.js` and import them where used. Rationale:

- These are not alien-specific. They are the game's voxel toolkit, and the bonus
  UFO is the second consumer that proves it.
- The alternative — exporting them from `aliens.js` — would make `bonus-ufo.js`
  depend on the alien module for geometry utilities, which is a confusing
  dependency direction.
- Duplicating them into `bonus-ufo.js` is rejected outright: two copies of
  `buildVoxelGeometry` will drift.

Moving all five rather than only the three needed keeps the toolkit in one
place instead of splitting it across two modules. This is a pure move: no
behaviour change, and the production build verifies nothing was missed.

### Model structure — counter-rotating layers

A single spinning group cannot carry asymmetric detail; at 2 rad/s anything
off-axis blurs past. The row-3 UFO already solved this, and this model follows
the same pattern.

| Layer | Rotation | Contents |
|---|---|---|
| Hull | `+2.0` rad/s | Stacked `saucerTier()` discs, gold trim seams, panel recesses |
| Light collar | `-1.2` rad/s | Voxel rim lights, each with its own cloned material |
| Canopy | level, never spins | Pale cyan dome, pilot silhouette inside |
| Underside | with hull | Tapered tiers, gold emitter ring where the missile originates |
| Antenna + beacon | level | Sways; beacon flashes on a discrete phase window |

### Palette

Magenta stays as the established signature so players still recognise it
instantly, but as a wide value ramp rather than flat saturation, with gold as
the only second hue.

```
hull highlight  #ffd4f6
hull plate      #ff5ce0
hull mid        #c81fa8
hull shade      #7d1268
hull recess     #3a0733

gold trim       #ffc44a
rim lights      #ffe89a   single chasing colour, not alternating
canopy          #9ff4ff
```

This follows the lesson recorded in CLAUDE.md from the Invader retint: form
comes from a wide value ramp, and emissive must stay low enough not to flood
it. Emissive is added flat, on top of vertex colours rather than through them.

## Animation

- Hull spins `+2.0` rad/s, collar counter-spins `-1.2` rad/s.
- Rim lights chase around the collar. Each light needs its **own cloned
  material** — a shared material holds one value and the chase silently fails.
  This exact bug already happened once on the row-3 UFO's eight ring lights.
- Beacon flashes on an explicit phase window, e.g. `(time % period) / period <
  0.06`. Not a steep power curve: `charge^12` reads as a permanent glow rather
  than a flash.
- Pilot silhouette looks around inside the level canopy.
- The existing hover bob (`position.y = 5 + sin(time * 3) * 0.3`) is preserved.

## Constraints

1. **Max radius ≤ 2.0**, measured across a full animation sweep, not just the
   rest pose. The collision check is `distance < 2.0` from the group origin
   (`missiles.js:236`), and the current model's outer extent — rim lights at
   radius 1.8 plus their 0.15 sphere radius — is ~1.95. Visual and hitbox
   currently agree, and the rebuild must keep them agreeing. Verified with the
   same headless `Box3` sweep used on the alien models.
2. Per-instance material cloning for every animated material.
3. A lazily-built parts registry so respawns reuse geometry.
4. Materials rendering merged voxel geometry set `vertexColors: true`.
5. `mirrorBoxes()` for symmetrical parts, never `scale.x = -1`, which inverts
   normals and breaks lighting on that half.

## Verification

- `npm run build` succeeds.
- Headless `Box3` sweep confirms max radius ≤ 2.0 across a full animation cycle.
- Visual check in-game: spawn a bonus UFO and confirm the hull spins, the collar
  counter-rotates, the canopy holds level with the pilot readable, and the rim
  lights actually chase rather than pulsing in unison.
- Confirm a second spawn reuses the cached registry rather than rebuilding.

The bonus UFO is not in the Bestiary, so unlike the alien rebuilds this cannot
be verified in the gallery — it has to be observed in gameplay, which takes up
to ~20 seconds of play per spawn.
