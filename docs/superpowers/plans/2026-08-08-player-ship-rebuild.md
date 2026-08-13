# Player Ship Voxel Interceptor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the player's five-box spaceship with a cached, voxel-sculpted nimble interceptor whose local animation matches the rebuilt invaders.

**Architecture:** Keep `js/player.js` as the player model and movement boundary. Add a lazily-built player-parts registry using the shared voxel helpers, construct a stable gameplay root with a separate animated visual hierarchy, and expose one explicit fire-animation hook for the existing fire path. Do not alter collision, camera, missile, lives, or control semantics.

**Tech Stack:** JavaScript ES modules, THREE.js 0.158.0, `buildVoxelGeometry`, `mirrorBoxes`, `MeshPhongMaterial` vertex colours, Vite.

## Global Constraints

- Use the shared voxel toolkit in `js/voxel.js` and cache module-level player parts in `js/player.js`.
- Keep the player root as the gameplay position and collision reference; visual animation must stay on child groups/meshes.
- Keep `createPlayer(scene)`, `getPlayer()`, visibility helpers, and `updatePlayer(mouseX)` compatible with existing callers.
- Use deep blue-violet shadow plates, electric cyan/teal main plates, pale ice highlights, and restrained amber-white firing accents.
- Keep emissive intensity low enough for vertex colours, bevels, and recesses to remain visible under bloom.
- Clone any material whose intensity changes independently per engine, cockpit, or firing effect.
- Use explicit phase windows for discrete flashes; do not replace event pulses with a permanently bright power curve.
- Do not change missile collision radii, player limits, camera behavior, lives, damage handling, audio, HUD, power-ups, death effects, or the Bestiary gallery.
- Preserve the existing untracked `test.py`; do not stage or modify it.
- The repository has no test runner; verification is `npm run build` plus normal gameplay inspection.

## File map

- Modify: `js/player.js` — voxel geometry/material registry, ship hierarchy, movement animation, and fire hook.
- Modify: `js/game.js` — call `triggerPlayerFire()` at the existing player-fire boundary.
- Create: none.
- Test: none; use the build and gameplay verification commands in Task 4.

### Task 1: Build the cached voxel interceptor parts

**Files:**
- Modify: `js/player.js`

**Interfaces:**
- Consumes: `buildVoxelGeometry()` and `mirrorBoxes()` from `js/voxel.js`.
- Produces: internal `getPlayerParts()` returning cached geometries and materials for the ship constructor.

- [ ] **Step 1: Add the shared voxel imports and colour ramp.**

Replace the single THREE-only import with THREE plus the shared helpers. Define named colour constants for highlight, plate, trim, shade, recess, canopy, exhaust, and firing accent. Keep the ramp visibly separated, following the invader pattern rather than using one neon colour for every surface.

- [ ] **Step 2: Define the interceptor box lists.**

Use the player root's existing orientation: the ship sits near `z = 10` and points toward negative Z. Add named box lists for:

```
const PLAYER_HULL = [
    { size: [0.46, 0.22, 1.55], pos: [0, 0.00, 0.08], color: PLAYER_PLATE },
    { size: [0.68, 0.18, 0.88], pos: [0, 0.02, 0.26], color: PLAYER_TRIM },
    { size: [0.38, 0.12, 0.44], pos: [0, 0.13, -0.60], color: PLAYER_HI },
    { size: [0.82, 0.12, 0.34], pos: [0, -0.14, 0.38], color: PLAYER_SHADE },
    { size: [0.24, 0.10, 0.58], pos: [0, -0.22, 0.30], color: PLAYER_RECESS },
    { size: [0.16, 0.08, 0.22], pos: [0, 0.15, -0.86], color: PLAYER_HI }
];
const PLAYER_WING_HALF = [
    { size: [0.82, 0.12, 0.28], pos: [0.50, -0.02, 0.05], rotY: -0.18, color: PLAYER_PLATE },
    { size: [0.66, 0.06, 0.18], pos: [0.82, 0.05, -0.04], rotY: -0.18, color: PLAYER_HI },
    { size: [0.42, 0.08, 0.20], pos: [1.03, -0.08, 0.20], rotY: -0.18, color: PLAYER_SHADE },
    { size: [0.20, 0.10, 0.22], pos: [1.20, 0.00, -0.16], rotY: -0.18, color: PLAYER_TRIM }
];
const PLAYER_ENGINE_POD = [
    { size: [0.30, 0.26, 0.68], pos: [0, -0.04, 0.55], color: PLAYER_PLATE },
    { size: [0.36, 0.08, 0.34], pos: [0, 0.08, 0.40], color: PLAYER_HI },
    { size: [0.22, 0.16, 0.16], pos: [0, -0.10, 0.88], color: PLAYER_SHADE },
    { size: [0.18, 0.10, 0.12], pos: [0, -0.10, 0.94], color: PLAYER_RECESS }
];
const PLAYER_STABILIZER = [
    { size: [0.18, 0.12, 0.42], pos: [0.50, 0.08, 0.62], rotY: -0.20, color: PLAYER_TRIM },
    { size: [0.12, 0.06, 0.28], pos: [0.56, 0.16, 0.72], rotY: -0.20, color: PLAYER_HI }
];
const PLAYER_CANOPY = [
    { size: [0.42, 0.10, 0.54], pos: [0, 0.18, -0.20], color: PLAYER_CANOPY_SHADE },
    { size: [0.30, 0.08, 0.34], pos: [0, 0.25, -0.30], color: PLAYER_CANOPY_HI },
    { size: [0.18, 0.05, 0.18], pos: [0, 0.31, -0.38], color: PLAYER_SCAN }
];
const PLAYER_EXHAUST = [
    { size: [0.20, 0.16, 0.14], pos: [0, 0, 0], color: PLAYER_EXHAUST_SHADE },
    { size: [0.12, 0.12, 0.10], pos: [0, 0, 0.08], color: PLAYER_EXHAUST_CORE }
];
const PLAYER_FIRE_EMITTER = [
    { size: [0.20, 0.08, 0.20], pos: [0, 0, 0], color: PLAYER_FIRE_SHADE },
    { size: [0.10, 0.06, 0.10], pos: [0, -0.05, -0.04], color: PLAYER_FIRE_CORE }
];
```

Keep the rest-pose envelope compact: the wings should be clearly wider than
the fuselage but not wider than the current `x = +/-12` movement range requires,
and all animated wing/engine deflections must remain close to the root so the
existing distance-based hit behavior stays fair. Use `mirrorBoxes()` for the
right wing, engine, and stabilizer lists rather than negative mesh scale.

- [ ] **Step 3: Add a lazy `getPlayerParts()` registry.**

Build each static geometry once with `buildVoxelGeometry()`. Create static vertex-colour materials with `vertexColors: true` and `flatShading: true`. Create independent material instances for left/right exhaust cores, cockpit scan light, and the fire emitter because their emissive intensities will change separately. Do not dispose cached geometry or shared static materials during normal gameplay.

- [ ] **Step 4: Run the production build before constructing the model.**

Run:

```
npm run build
```

Expected: exit code 0. This proves the new imports, constants, and registry compile before later hierarchy work.

- [ ] **Step 5: Commit the parts registry.**

```
git add js/player.js
git commit -m "Build cached voxel player ship parts"
```

### Task 2: Construct the stable player hierarchy

**Files:**
- Modify: `js/player.js`

**Interfaces:**
- Consumes: `getPlayerParts()` from Task 1.
- Produces: `createPlayer(scene)` returning the same root group contract, with named child references in `player.userData`.

- [ ] **Step 1: Replace the old five-box constructor.**

Create a root `THREE.Group`, then add a `visual` child group. Put the following under `visual`:

```
visual
├── hull
├── cockpit
│   └── scanLight
├── wingLeft
│   └── wingTipLeft
├── wingRight
│   └── wingTipRight
├── engineLeft
│   ├── exhaustLeft
│   └── vectorMountLeft
├── engineRight
│   ├── exhaustRight
│   └── vectorMountRight
├── stabilizerLeft
├── stabilizerRight
└── fireEmitter
```

Use mesh-local positions for pivot offsets. The engine pod, wingtip, and
stabilizer origins must sit at the joint about which they will rotate; do not
bake a mount offset into geometry that will later be scaled or rotated.

- [ ] **Step 2: Populate `userData` without replacing existing state.**

Store `visual`, hull, cockpit, scan light, both wing groups, both engine groups,
both exhaust meshes/materials, both stabilizers, and fire-emitter references in
`player.userData` using `Object.assign()`. Also store `animationOffset`,
`firePulse`, and `lastUpdateTime`. This makes the animation boundary explicit and
prevents future initialization from erasing moving-part references.

- [ ] **Step 3: Preserve gameplay placement and visibility behavior.**

Keep `group.position.y = 0`, `group.position.z = 10`, the existing scene add,
and the same `player` module singleton. Leave `hidePlayer()`, `showPlayer()`,
and `getPlayer()` behavior unchanged.

- [ ] **Step 4: Build and inspect the static silhouette.**

Run:

```
npm run build
```

Expected: exit code 0. Start the dev server with `npm run dev`, open the game,
and confirm the ship reads as a compact forward-pointing interceptor from the
normal camera angle before adding animation.

- [ ] **Step 5: Commit the hierarchy.**

```
git add js/player.js
git commit -m "Replace player ship with voxel interceptor hierarchy"
```

### Task 3: Add responsive flight and firing animation

**Files:**
- Modify: `js/player.js`
- Modify: `js/game.js`

**Interfaces:**
- Consumes: the named child references from Task 1 and the existing `handleFire()` path.
- Produces: `triggerPlayerFire()` exported from `js/player.js`; `handleFire()` invokes it once per accepted fire action.

- [ ] **Step 1: Add the explicit fire hook before wiring the caller.**

Export:

```
export function triggerPlayerFire() {
    if (player) player.userData.firePulse = 1;
}
```

The hook must be harmless before player creation and must not create missiles or
change score/lives.

- [ ] **Step 2: Add the internal time-based animator.**

Create `animatePlayer(timeSeconds, movementError)` inside `js/player.js`. Use
the player `userData` references and a clamped frame delta. Implement:

```
idlePitch = Math.sin(time * 1.7 + offset) * 0.025;
idleRoll = Math.sin(time * 2.1 + offset * 0.7) * 0.018;
turn = clamp(movementError / 2.0, -1, 1);
```

Apply idle motion to `visual`, wing/engine response to local child rotations,
and decay `firePulse` from 1 to 0. Do not accumulate offsets into root
`position.x`, `position.y`, or `position.z`.

- [ ] **Step 3: Implement the engine and cockpit effects.**

Drive left/right exhaust scale and emissive intensity from phase-shifted pulses.
Stationary pulse must remain dim and compact; movement increases thrust using
the absolute turn/movement amount. Drive engine vectoring with the same clamped
turn value and use separate material objects for left and right intensity.

Drive the cockpit scan light across its local X position with a slow periodic
cycle. Add a short explicit lock pulse only within a narrow phase window so the
scan is visible without becoming a constant bloom source.

- [ ] **Step 4: Implement wing, stabilizer, and firing motion.**

Set wing and tip rotations from the current turn target and ease them toward
that target using the frame delta. Counter-rotate stabilizers and engine mounts
slightly. When `firePulse > 0`, move the local fire emitter forward by a small
fixed amount, scale it briefly, and raise its cloned amber-white emissive
material; return all local transforms to their rest values as the pulse decays.

- [ ] **Step 5: Preserve and extend `updatePlayer(mouseX)`.**

Keep the existing target calculation, smoothing, clamp, and root `rotation.z`
banking semantics. After calculating `velocityX`, call `animatePlayer()` with a
monotonic current time and the movement error. Initialize the first-frame time
so the first update cannot create a large delta.

- [ ] **Step 6: Wire the fire hook in `js/game.js`.**

Import `triggerPlayerFire` alongside the existing player imports. In the existing
accepted-fire branch, call `triggerPlayerFire()` immediately before or after
`fireMissile(player, scene)`; call it once for the click/shot action, not once
per missile in spread-shot mode.

- [ ] **Step 7: Build and run a gameplay animation pass.**

Run:

```
npm run build
npm run dev
```

Inspect the normal game view and verify stationary idle, left/right bank,
phase-shifted engines, cockpit scan, wing settling, and firing flash/recoil.
Confirm the ship remains inside the current horizontal limits and that missiles
still originate and collide using the unchanged root position.

- [ ] **Step 8: Commit the animation integration.**

```
git add js/player.js js/game.js
git commit -m "Animate player interceptor flight and firing response"
```

### Task 4: Final verification and documentation consistency

**Files:**
- Verify: `js/player.js`
- Verify: `js/game.js`
- Verify: `docs/superpowers/specs/2026-08-08-player-ship-design.md`

**Interfaces:**
- Consumes: completed player ship implementation from Tasks 1–3.
- Produces: verified build and gameplay behavior with no unrelated file changes.

- [ ] **Step 1: Check the final diff and whitespace.**

Run:

```
git diff HEAD~3..HEAD --check
git status --short
```

Expected: no whitespace errors. `test.py` may remain untracked; it must not be
included in the player ship commits.

- [ ] **Step 2: Run the complete production build.**

Run:

```
npm run build
```

Expected: Vite exits 0 and emits `dist/` without import or syntax errors.

- [ ] **Step 3: Perform the gameplay checklist.**

At the normal game camera, verify:

1. The silhouette is a narrow, layered interceptor rather than five obvious boxes.
2. Vertex-colour tiers remain visible under bloom.
3. Idle pitch/roll is subtle and never changes the gameplay root position.
4. Turning banks the ship, flexes wings, counter-steers engines, and settles smoothly.
5. Left/right exhausts pulse independently without synchronizing through a shared material.
6. The cockpit scan and explicit firing flash are visible but not permanently blown out.
7. The ship remains controllable, fires normally, and can still be hit.

- [ ] **Step 4: Review scope and commit only if needed.**

If the verification pass finds a focused defect, fix it in the owning file, rerun
`npm run build`, and commit that fix separately. Do not alter unrelated gameplay
systems or stage `test.py`.
