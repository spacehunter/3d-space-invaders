# Wasp Invader Design

**Date:** 2026-08-09  
**Status:** Approved design  
**Scope:** Add a fully integrated Wasp invader with a signature wingstorm animation.

## Goal

Add a ninth invader type that feels native to the existing voxel/arcade roster while being immediately recognizable as a wasp. It must appear in the Bestiary, enter later gameplay waves, animate spectacularly without fighting formation movement, and use a distinct amber needle weapon.

## Design

### Visual identity

The Wasp is a compact, forward-facing voxel insect built around a readable three-part silhouette:

- dark thorax with angular shoulder plates and a recessed face;
- amber-and-black striped abdomen with a bright terminal stinger;
- two pairs of smoky, angular block-built wings with pale hot edges.

It has compound eyes, small mandibles, six jointed legs, and enough lateral wing width to read clearly at formation distance without exceeding the project’s normal animated footprint budget. The model uses the existing `buildVoxelGeometry`, `mirrorBoxes`, `buildLimbSegmentGeometry`, and `buildLimbChain` helpers. Static geometry and materials are cached by a `getWaspParts()` registry; materials that pulse or animate are cloned per instance.

The palette is deep charcoal for recesses, burnt amber for the abdomen, golden yellow for highlights and stinger energy, and restrained pale wing emissive accents. Emissive intensity stays low enough for the vertex-colour ramp and stripe layering to remain visible under bloom.

### Animation

`animateAlien()` receives a new row/type 8 branch. The repeating wingstorm sequence is time-based and offset per alien:

1. **Hover:** body breathes and bobs subtly while planted leg groups make a small alternating tripod shift.
2. **Wind-up:** the wings fold closer to the thorax and begin a visible high-frequency vibration; abdomen stripes pulse in sequence.
3. **Charge:** the abdomen lifts through a child pivot, the stinger brightens, mandibles open, and the eyes intensify.
4. **Wingstorm:** both wing pairs snap open, beat rapidly with a phase offset, and flare their edge accents.
5. **Sting lunge:** the thorax leans and the abdomen/stinger thrusts forward using local pivots and rotation only.
6. **Recoil:** the stinger retracts, wings settle, and the insect returns to hover.

The animation may modify child transforms, local rotations, local scales, and emissive values. It must not accumulate movement in formation-owned `position.x` or `position.z`, and it must guard `position.y` while a Wasp is swooping. Group scale remains available to the swoop telegraph; animated scaling belongs on child meshes.

### Gameplay and armament

The Wasp is type/row 8 and enters normal formation cycling through the same `createAliens()` path as the existing eight types. The level row cap increases by one so the Wasp appears in later non-boss waves without making early levels larger. The default fallback row constant and row-cycle logic both support nine types.

Wasp firing uses a new amber needle-volley path in `missiles.js`:

- a short charge/telegraph is visible through the Wasp’s stinger animation;
- the projectile is a small, bright, straight-flying needle with an amber core;
- it participates in barrier collision, player collision, off-screen cleanup, and reset handling like the existing special projectile arrays;
- its speed and collision radius remain close to the existing blaster-bolt tier so it is threatening but readable.

Scoring remains explicit and stable for the existing roster. The Wasp uses the low-row point tier, with its displayed Bestiary value matching the actual score callback.

### Bestiary and inspection

Add a Wasp entry to `BESTIARY_ENTRIES` with its name, row colour, point value, animation summary, and needle armament. `createAlienPreview(8)` must return a standalone Wasp without touching the live formation array. Existing auto-fit, turntable, bloom, and animation behaviour remains unchanged.

A dedicated Wasp preview page is optional only if the existing Bestiary is insufficient for visual QA; the primary inspection path is the shared Bestiary so the production model is verified in the same scene and lighting as every other invader.

### Documentation

Update only the roster-specific counts and descriptions that become stale: alien type/row counts, Wasp appearance and behaviour, Bestiary count, performance count, and the current project status. Preserve unrelated working-tree changes.

## Architecture and data flow

```text
level config row cap
        |
        v
createAliens() -> createAlien(8) -> getWaspParts() -> Wasp Group/userData
        |                                      |
        |                                      v
        |                              animateAlien(row 8)
        v
alienFire(row 8) -> needle volley -> updateWaspNeedles()
                                      |       |
                                      v       v
                              barrier collision  player collision

Bestiary entry(row 8) -> createAlienPreview(8) -> auto-fit turntable -> animateAlien()
```

The Wasp’s animated-part references live in `userData`, merged with the shared formation metadata. The live formation owns the group’s grid position; the Wasp animation owns only its local model parts. The projectile array is independent from regular missiles and is cleared by `resetMissiles()`.

## Error handling and invariants

- If an animated Wasp part is absent, the animation branch skips that part rather than throwing.
- Projectile updates remove needles on barrier impact, player impact, or leaving the play area.
- Reset removes every active Wasp needle from the scene and clears the array.
- Preview creation never mutates the module-level live alien array.
- Shared geometries/materials are reused where static; pulsing materials are cloned per Wasp instance.
- The model’s peak wing and leg extension stay within the project’s formation spacing/collision guidance.

## Verification

Run the following checks after implementation:

1. `npm run build` completes successfully.
2. `git diff --check` reports no whitespace errors.
3. Load the Bestiary and confirm Wasp pagination, auto-fit, animation, text, and armament.
4. Run a later gameplay wave and confirm Wasp formation placement, wingstorm animation, needle firing, barrier interactions, player collision, and level completion.
5. Restart the game during active Wasp fire and confirm no needles or stale animated state remain.
6. Inspect the Wasp from formation distance and close-up bloom lighting to confirm the stripe ramp and silhouette remain readable.

## Out of scope

- Reworking existing alien models or their animations.
- Changing boss behaviour, level pacing beyond the single row-cap extension, or unrelated projectile systems.
- Replacing the Bestiary renderer or scene architecture.
