# Sentinel Invader Design

**Date:** 2026-08-12
**Status:** Approved design
**Scope:** Add a tenth invader — the Sentinel — built around a self-disassembling shard shell.

## Goal

Every current invader is a limbed creature (Octopus, Crab, Squid, Beetle, Invader, Scorpion, Wasp) or a
vehicle with a fixed hull (UFO, Tank). Their animations are all limb motion: legs walk, wings beat, tails
whip, treads roll. The Sentinel is deliberately outside both categories — a levitating geometric construct
with **no limbs at all**, whose signature move is that the model itself **comes apart**.

## Design

### Visual identity

An obsidian obelisk-diamond suspended in air around a white-hot plasma core:

- ten angular armour shards that close into a single faceted hull at rest, each carrying baked glyph
  strips along its bevels;
- a bright core cluster at the exact model origin, visible only through the seams until the shell opens;
- two counter-rotating gimbal rings tilted against each other, orbiting the core continuously;
- a two-plate iris in front of the core that slides apart to expose the emitter;
- a downward keel spike with no ground contact, so the model reads as levitating rather than standing.

Palette is near-black obsidian through slate blue to a pale ice edge, with the only saturated colour
reserved for the glyphs and core. Emissive on the shards stays low (0.35–1.1) so the four-step obsidian
ramp still reads under bloom; only the core, glyphs and lance are allowed to blow out.

### Animation — the shatter bloom

Period ≈ 9.2s, offset per instance. Phase windows drive discrete events; nothing accumulates into
formation-owned axes.

1. **Hover:** the whole model bobs on a hover pivot and yaws slowly; rings counter-rotate; the core
   breathes.
2. **Unlock:** shards push out a few hundredths along their own radials, seams brighten, rings gain speed.
3. **Shatter bloom:** all ten shards fly outward along their rest radials, tumbling, while their pivots
   orbit the core in alternating directions. The core is fully exposed and blazing.
4. **Aperture lock:** the orbiting shards blend from their bloom positions into a flat ring standing in
   front of the core — the shell becomes a firing lens. The iris opens; the core charges to peak.
5. **Lance discharge:** a crisp, short phase window. The core flares and a lance beam grows forward from
   the emitter mount.
6. **Reassemble:** shards spiral home and slam shut, with a short settle shudder on the hover pivot.

Radial budget: shard rest radius is 0.36 with ~0.2 of half-geometry, and bloom scales X by a smaller
factor than Y/Z, so the animated peak half-width stays near 0.72 — inside the ~0.95 guidance and inside
the 1.2 collision radius, so every shard remains shootable.

### Gameplay and armament

The Sentinel is type/row 9. `createAliens()` cycles `row % 10`, and `CAPS.maxRows` rises to 10.

Note: `CAPS.maxRows` was 8, which caps grid rows at 0–7 and meant type 8 (Wasp) could never spawn in a
real wave despite being fully implemented. Raising the cap to 10 fixes that as well as admitting the
Sentinel.

Armament is a **prism lance fan**: one shot spawns three thin, fast, ice-white lances on slightly
diverging headings, so the Sentinel denies a cone rather than a line. Lances live in their own array with
their own update, barrier collision, player collision, off-screen cleanup and reset, matching the wasp
needle path.

Scoring uses the existing `(6 - row) * 10` formula, which floors at 0 for this tier — consistent with
Invader, Scorpion and Wasp.

### Bestiary

A tenth `BESTIARY_ENTRIES` record, and `createAlienPreview(9)` returns a standalone Sentinel without
touching the live formation array. Auto-fit, turntable and bloom handling are unchanged.

## Architecture and data flow

```text
levels CAPS.maxRows
        |
        v
createAliens() -> createAlien(9) -> getSentinelParts() -> Sentinel Group/userData
        |                                   |
        |                                   v
        |                           animateAlien(row 9)
        v
alienFire(row 9) -> 3x prism lance -> updatePrismLances()
                                        |          |
                                        v          v
                                barrier collision  player collision

Bestiary entry(row 9) -> createAlienPreview(9) -> auto-fit turntable -> animateAlien()
```

## Invariants

- `userData` is merged, never replaced; shard/core/ring references live there.
- Every animated material is cloned per instance (core, glow, iris, shards, rings, lance).
- The animation writes only child transforms and `position.y`; `position.x`/`position.z` stay
  formation-owned. `position.y` is guarded behind `!alien.userData.isSwooping`.
- All shard, core and lance geometries are centred on their intended pivot; positional offset is carried
  on `mesh.position`, never baked into geometry that is later scaled. The lance is the deliberate
  exception: its geometry runs from z=0 forward so `scale.z` grows the beam out of its emitter.
- Rotation gains from a changing rate are expressed as `rate * weight` added to a `t`-driven base, never
  as `t * changingRate`, so a phase change cannot jump the cycle.

## Verification

1. `npm run build` succeeds.
2. `git diff --check` is clean.
3. Bestiary shows ten entries; the Sentinel auto-fits, blooms and reassembles.
4. A late wave spawns Sentinels; they fire three-lance fans that damage barriers and the player.
5. Restart during active lance fire leaves no projectiles or stale state.

## Out of scope

- Reworking existing invaders, bosses, or level pacing beyond the row cap fix.
