# Scorpion Consistency Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Row 7 Scorpion into a Beetle-consistent, formation-readable invader while preserving venom-dart gameplay.

**Architecture:** Keep the existing lazy `getScorpionParts()` registry and `createScorpionAlien()`/`animateAlien()` interfaces. Replace only the Scorpion's geometry, materials, and animation branch; leave missile creation, scoring, and collision code untouched.

**Tech Stack:** JavaScript ES modules, Three.js 0.158.0, Vite, voxel geometry with vertex colors and MeshPhongMaterial.

## Global Constraints

- Keep the existing Row 7 type, scoring, and venom-dart projectile behavior.
- Keep animated motion on child meshes and never accumulate movement into formation `position.x` or `position.z`.
- Keep the animated silhouette close to the roster's approximate 0.95 half-width budget.
- Use shared voxel helpers and clone per-instance materials for animated emissive parts.

### Task 1: Rebuild the Scorpion visual language

**Files:**
- Modify: `js/aliens.js` Scorpion constants, part registry, and `createScorpionAlien()`

**Interfaces:**
- Consumes: existing `buildVoxelGeometry`, `mirrorBoxes`, `buildLimbSegmentGeometry`, `buildLimbChain`, `buildTailChain` helpers.
- Produces: the existing `createScorpionAlien(group)` userData references consumed by `animateAlien()`.

- [ ] Replace the current many-layer body with a compact abdomen, front shield/head, dark underbody, two pincers, eight legs, and a five-segment tail using the burnt-orange ramp defined in the design.
- [ ] Keep the stinger as the only strong emissive accent and consolidate eye geometry into a readable amber eye band.
- [ ] Reuse cached geometries/materials and clone only per-instance animated materials.
- [ ] Confirm all animation references (`abdomen`, `cephalo`, `eyes`, `eyeHighlights`, `tailChain`, `tailPivot`, `stinger`, `pincers`, `legs`) remain present.

### Task 2: Tune Beetle-consistent animation

**Files:**
- Modify: `js/aliens.js` Row 7 branch in `animateAlien()`

**Interfaces:**
- Consumes: the Scorpion userData contract from Task 1 and the existing `alien.userData.isSwooping` invariant.
- Produces: readable stand/idle/walk/charge/strike motion without changing gameplay state.

- [ ] Keep a slow crouched idle and compact breathing/bobbing motion.
- [ ] Drive alternating tripod leg steps with joint-local rotations and a small body rock.
- [ ] Raise and curl the tail during charge, then give it one short strike whip while pulsing the stinger.
- [ ] Keep pincers as a restrained secondary motion and skip `position.y` writes during swoops.

### Task 3: Verify and iterate

**Files:**
- Modify: `alien-preview.html` only if preview wiring or labels need to match the final model.
- Test: `npm run build`; preview/runtime inspection.

- [ ] Run `npm run build` and fix any syntax/import errors.
- [ ] Inspect the preview in all five modes and at a zoom that approximates formation distance.
- [ ] Compare against Beetle, Tank, and Invader for silhouette, palette, chunkiness, and animation; make one focused refinement pass if the result is below 7/10.
