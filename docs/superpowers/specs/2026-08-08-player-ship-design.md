# Player Ship Voxel Interceptor Design

**Date:** 2026-08-08
**Status:** Approved for implementation

## Goal

Replace the player's outdated five-box spaceship with a distinctive voxel-sculpted
nimble interceptor that belongs to the same visual and animation family as the
rebuilt invaders. The ship should be readable from the third-person camera,
retain the current gameplay behavior, and communicate movement, thrust, cockpit
activity, and firing through purposeful local animation.

## Visual design

The ship is a compact voxel needle aimed into the playfield:

- A stepped, tapered nose and recessed underside form the central fuselage.
- Swept, layered wings replace the current flat slab. Upturned tips reinforce
  the fast, predatory silhouette.
- Twin rear engine pods sit on articulated mounts and remain visible from the
  camera angle.
- A low cockpit canopy is inset into the fuselage rather than perched on top.
- Small stabilizer fins and panel seams add secondary structure without making
  the silhouette noisy at gameplay distance.

Geometry uses the shared voxel toolkit in `js/voxel.js`, with cached module-level
parts in `js/player.js`. Symmetrical pieces use `mirrorBoxes()` so both halves
retain correct normals. Static details are merged into a small number of
geometries; only parts that animate independently receive separate meshes.

The colour ramp uses deep blue-violet shadow plates, electric cyan/teal main
plates, pale ice highlights, and restrained amber-white firing accents. Emissive
intensity remains low enough for the vertex-colour ramp, bevels, and recesses to
remain visible under bloom.

The player root group continues to own the gameplay position and remains the
collision reference. Visual animation is kept on child groups/meshes so it does
not alter movement, missile targeting, or collision behavior.

## Animation design

Animation is time-based and local to the visual hierarchy:

- **Flight idle:** subtle pitch/roll breathing and counter-rotating stabilizer
  corrections make the ship feel powered-on while stationary.
- **Movement response:** horizontal movement drives a stronger bank; the outer
  wing dips, the inner wing lifts, and the engine pods counter-steer with a
  delayed, damped response.
- **Engine thrust:** left and right exhaust cores use independent cloned
  materials and phase-shifted pulses. Moving produces a brighter, longer
  exhaust; stationary flight uses a shorter low-power flicker. Engine pods
  vector a few degrees locally, with the deflection driven by the same
  horizontal movement response as the bank.
- **Cockpit activity:** a cyan scan light sweeps across the canopy periodically
  and produces a brief lock pulse.
- **Wing mechanics:** layered wingtip plates flex slightly during turns and
  settle back with damping.
- **Firing feedback:** an underside/nose emitter charges briefly, flashes
  amber-white, and gives the fuselage a small local recoil. Firing is triggered
  explicitly by the existing fire path, not inferred from a timer.

Discrete flashes use explicit phase windows. Per-instance animated materials are
cloned where intensity changes, following the animation invariants documented in
`CLAUDE.md`.

## Integration boundaries

`createPlayer(scene)` remains the public factory and still returns the player
group. `getPlayer()`, visibility helpers, and `updatePlayer(mouseX)` remain
compatible with current callers. `updatePlayer()` continues to own horizontal
movement and root banking; it also calls an internal visual animator using the
current motion and elapsed time. A small exported `triggerPlayerFire()` hook is
added where needed by the current missile/game fire path.

No changes are planned to missile collision radii, player position limits,
camera behavior, lives, or damage handling. The finished model must remain
within a predictable envelope around the root so the current distance-based
collision behavior stays fair.

## Verification

- Run `npm run build` and require a successful production build.
- Inspect the generated model in gameplay from the normal camera angle.
- Verify stationary idle, left/right banking, engine pulses, cockpit sweep, and
  firing flash/recoil.
- Confirm the ship still moves within its existing horizontal limits, fires from
  the expected location, and can be hit normally.
- Check that no per-frame animation accumulates into the root position and that
  no shared material is mutated by independent animated parts.

## Scope exclusions

This pass does not redesign missiles, player controls, camera framing, audio,
HUD, power-ups, the player death effect, or the Bestiary gallery. The new ship is
verified only in normal gameplay.
