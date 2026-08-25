# Wasp Invader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully integrated voxel Wasp invader with a readable wingstorm animation, amber needle weapon, Bestiary entry, and later-wave gameplay presence.

**Architecture:** Extend the existing row/type switch in `js/aliens.js` with a cached `getWaspParts()` sculpt, local child-pivot animation, and `createAlienPreview(8)` support. Add a dedicated `waspNeedles` projectile lifecycle in `js/missiles.js`, called from the existing game loop, while extending the row cap/type cycle and Bestiary metadata without replacing the current scene architecture.

**Tech Stack:** JavaScript ES modules, Three.js 0.158.0, Vite, MeshPhongMaterial, voxel geometry helpers, existing game loop and collision systems.

## Global Constraints

- Preserve the project’s voxel/arcade aesthetic and shared geometry helpers.
- Keep the Wasp’s peak wing and leg extension within the project’s formation spacing/collision guidance.
- Never accumulate Wasp animation into formation-owned `position.x` or `position.z`.
- Guard Wasp `position.y` while swooping and keep animated scale on child meshes.
- Reuse static geometries/materials; clone materials that pulse or animate per instance.
- Keep the Wasp needle projectile independently resettable and removable on every exit path.
- Preserve unrelated existing working-tree changes in `CLAUDE.md`, `PROJECT_STATUS.md`, and `README.md`.

---

## File map

- Modify `js/aliens.js`: add Wasp constants, cached geometry/material registry, model factory, type-cycle support, and row 8 animation.
- Modify `js/constants.js`: make the fallback alien row count nine.
- Modify `js/levels.js`: allow the level progression cap to reach the Wasp row without increasing early-wave size.
- Modify `js/missiles.js`: add Wasp needle creation, dispatch, update, collision, reset, and state exposure; keep existing low-row scoring explicit.
- Modify `js/game.js`: import and call the Wasp needle updater in the always-running projectile update section.
- Modify `js/bestiary.js`: append the Wasp entry with row, points, description, and armament.
- Modify `README.md`, `CLAUDE.md`, and `PROJECT_STATUS.md`: update roster/type counts and describe Wasp behaviour without rewriting unrelated local edits.
- Create `docs/superpowers/plans/2026-08-09-wasp-invader.md`: this implementation plan.

## Interfaces

- `createAlienPreview(8)` returns a standalone `THREE.Group` whose `userData.row` is `8` and whose animated parts are available to `animateAlien()`.
- `updateWaspNeedles(player, scene, gameActive, livesCallback, gameOverCallback)` updates and cleans the dedicated Wasp projectile array.
- `getMissiles()` returns a `waspNeedles` property alongside the existing projectile arrays.
- Wasp firing is selected in `alienFire(scene)` when `randomAlien.userData.row === 8`.

### Task 1: Add Wasp model and roster wiring

**Files:**
- Modify: `js/aliens.js` near the Beetle/Invader model registries and top-level type switch.
- Modify: `js/constants.js:4`.
- Modify: `js/levels.js:28-34`.

**Interfaces:**
- Consumes: `buildVoxelGeometry`, `mirrorBoxes`, `buildLimbSegmentGeometry`, `buildLimbChain`, and the existing `createAlien()`/`createAlienPreview()` flow.
- Produces: `createAlien(8)` and `createAlienPreview(8)` that return a Wasp group with `userData` references for body, abdomen, wings, stinger, eyes, mandibles, and legs.

- [ ] **Step 1: Add row/type capacity before model code.**

  Change the fallback `ALIEN_ROWS` value from `8` to `9`, change the level cap from `7` to `8`, and leave `BASE_CONFIG.alienRows` at `5` so early waves remain unchanged. In `createAliens()`, change the cycle expression from `row % 8` to `row % 9` and add `case 8: createWaspAlien(group)`.

- [ ] **Step 2: Define the Wasp sculpt data and cached parts registry.**

  Add charcoal/amber/gold palette constants and box arrays for a compact thorax, striped abdomen, face/eyes, mandibles, wing panels, wing edge accents, stinger, and six-leg segment definitions. Add `WASP_LEG_MOUNTS` with alternating phases. Implement `getWaspParts()` with cached geometry and materials:

  ```js
  let waspParts = null;

  function getWaspParts() {
      if (waspParts) return waspParts;
      waspParts = {
          thoraxGeometry: buildVoxelGeometry(WASP_THORAX),
          abdomenGeometry: buildVoxelGeometry(WASP_ABDOMEN),
          faceGeometry: buildVoxelGeometry(WASP_FACE),
          wingGeometries: {
              '-1': buildVoxelGeometry(WASP_WING),
              '1': buildVoxelGeometry(mirrorBoxes(WASP_WING))
          },
          legGeometries: WASP_LEG_SEGMENTS.map(segment =>
              buildLimbSegmentGeometry(segment, WASP_AMBER, WASP_SHADE)
          ),
          // Shared static materials; clone pulsing materials in createWaspAlien.
          shellMaterial: new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, emissive: WASP_SHADE, emissiveIntensity: 0.55 }),
          wingMaterial: new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, emissive: WASP_WING_GLOW, emissiveIntensity: 0.55 }),
          eyeMaterial: new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, emissive: WASP_EYE_GLOW, emissiveIntensity: 2.0 }),
          stingerMaterial: new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, emissive: WASP_STINGER_GLOW, emissiveIntensity: 1.0 })
      };
      return waspParts;
  }
  ```

- [ ] **Step 3: Build the Wasp group and preserve animation references.**

  Implement `createWaspAlien(group)` using the cached parts. Mount the abdomen on a `bodyPivot`, each wing pair on a left/right hinge group, the stinger on the abdomen tip, the mandibles under the face, and six jointed leg chains on the thorax sides. Store all moving references in `group.userData`, including `bodyPivot`, `wings`, `abdomen`, `stinger`, `eyes`, `mandibles`, and `legs`.

- [ ] **Step 4: Run the build and inspect the type import.**

  Run: `npm run build`

  Expected: Vite exits `0`; the bundle includes no missing Wasp symbol or syntax error.

- [ ] **Step 5: Commit the model/roster slice.**

  ```bash
  git add js/aliens.js js/constants.js js/levels.js
  git commit -m "feat: add Wasp invader model"
  ```

### Task 2: Add the wingstorm animation

**Files:**
- Modify: `js/aliens.js` in `animateAlien()` after the Scorpion branch.

**Interfaces:**
- Consumes: the `userData` references produced by `createWaspAlien()` and the existing per-alien `animationOffset`.
- Produces: a time-based row 8 animation that is seek-safe, formation-safe, and visibly distinct in the Bestiary and gameplay.

- [ ] **Step 1: Add the row 8 animation branch.**

  Use a phase derived from `time + animationOffset` with hover, wind-up, charge, wingstorm, sting-lunge, and recoil windows. Animate only local child pivots/meshes and emissive values. Keep the main group’s `position.x` and `position.z` untouched; update `position.y` only inside `if (!alien.userData.isSwooping)`.

- [ ] **Step 2: Animate wings, stinger, body, and legs as one sequence.**

  Use paired wing hinges with opposite signs and a high-frequency wingbeat during the wingstorm window. Pulse abdomen stripe/stinger materials during charge, lean the `bodyPivot` for the lunge, open/close mandibles, and drive six legs with two alternating tripods. Assign every animated material per instance in the model factory so one Wasp cannot change another Wasp’s glow.

- [ ] **Step 3: Verify the animation branch is reachable.**

  Run: `npm run build`

  Expected: exit `0`. Then use the existing Bestiary after Task 4 to verify the complete cycle at close range.

- [ ] **Step 4: Commit the animation slice.**

  ```bash
  git add js/aliens.js
  git commit -m "feat: animate Wasp wingstorm"
  ```

### Task 3: Add the amber needle projectile lifecycle

**Files:**
- Modify: `js/missiles.js` near the existing blaster/venom projectile helpers and update functions.
- Modify: `js/game.js:6,517-522`.

**Interfaces:**
- Consumes: `checkBarrierCollision`, `createExplosion`, `playExplosion`, player position, and the existing alien fire/reset loop.
- Produces: `updateWaspNeedles(player, scene, gameActive, livesCallback, gameOverCallback)` and `getMissiles().waspNeedles`.

- [ ] **Step 1: Add the dedicated state and creator.**

  Declare `let waspNeedles = []`. Implement `createWaspNeedle(position)` as a small elongated amber/gold group with an emissive core, copy the Wasp position, start it slightly forward, and set `userData.isWaspNeedle`, `speed`, and `createdAt`.

- [ ] **Step 2: Dispatch row 8 firing.**

  In `alienFire(scene)`, add a `randomAlien.userData.row === 8` branch that creates one Wasp needle, pushes it to `waspNeedles`, adds it to the scene, and continues so it is not also added to `alienMissiles`.

- [ ] **Step 3: Implement movement, glow, collisions, and cleanup.**

  Export `updateWaspNeedles(player, scene, gameActive, livesCallback, gameOverCallback)`. Advance needles toward the player, pulse their scale/emissive look, remove them after barrier collision or leaving the play area, and on active player collision create the same explosion/audio and decrement lives callbacks used by the other special projectiles. Call `gameOverCallback(false)` when lives reach zero.

- [ ] **Step 4: Wire the game loop and reset/state APIs.**

  Import `updateWaspNeedles` in `js/game.js`, call it beside `updateVenomDarts()` so it also updates after game over, and add `waspNeedles` to `resetMissiles()` and `getMissiles()`.

- [ ] **Step 5: Build and smoke-check projectile symbols.**

  Run: `npm run build`

  Expected: exit `0`; no missing export/import or undeclared `waspNeedles` error.

- [ ] **Step 6: Commit the projectile slice.**

  ```bash
  git add js/missiles.js js/game.js
  git commit -m "feat: add Wasp needle weapon"
  ```

### Task 4: Add Bestiary coverage and roster documentation

**Files:**
- Modify: `js/bestiary.js:10-86`.
- Modify: `README.md`, `CLAUDE.md`, `PROJECT_STATUS.md` at their roster/status sections.

**Interfaces:**
- Consumes: `createAlienPreview(8)`, `animateAlien()`, and the Wasp point/weapon behavior from Tasks 1–3.
- Produces: a paginatable Wasp Bestiary entry and accurate project documentation.

- [ ] **Step 1: Add the Wasp Bestiary entry.**

  Append a type 8 entry with `name: 'WASP'`, amber row colour, the low-row point value used by `missiles.js`, a concise description of the striped thorax/abdomen, wingstorm, sting lunge, and amber needle volley, plus matching `weapon` text.

- [ ] **Step 2: Update roster counts and descriptions.**

  Change stale references from eight types/rows to nine, add Wasp to the alien module responsibilities and roster lists, describe its wingstorm and needle armament, and update performance counts from 88 aliens to 99 at the nine-row maximum. Keep server/access documentation and unrelated user edits unchanged.

- [ ] **Step 3: Build and check documentation references.**

  Run: `rg -n "8 alien|8 rows|eight alien|88 aliens|Scorpion|Wasp|Bestiary" README.md CLAUDE.md PROJECT_STATUS.md js/bestiary.js`

  Expected: Wasp references are present, intended old-count references are removed or explicitly historical, and Bestiary text matches the implementation.

- [ ] **Step 4: Commit the Bestiary/documentation slice.**

  ```bash
  git add js/bestiary.js README.md CLAUDE.md PROJECT_STATUS.md
  git commit -m "docs: add Wasp to alien roster"
  ```

### Task 5: Verify the integrated feature

**Files:**
- Verify: `js/aliens.js`, `js/missiles.js`, `js/game.js`, `js/bestiary.js`, `js/constants.js`, `js/levels.js`, and documentation files.

- [ ] **Step 1: Run clean build and whitespace checks.**

  ```bash
  npm run build
  git diff --check
  ```

  Expected: both commands exit `0`.

- [ ] **Step 2: Verify the Wasp preview path.**

  Start the local server with `npm run dev -- --host 0.0.0.0 --strictPort`, open `http://127.0.0.1:5173/`, enter the Bestiary, page to Wasp, and confirm the model auto-fits, turns, hovers, opens both wing pairs, pulses its stinger, performs the sting lunge, and returns to hover without console errors.

- [ ] **Step 3: Verify a later wave and projectile reset.**

  Start from a level at or above 13 using the existing Continue/start-from-level path, confirm the Wasp row appears, wait for a needle volley, and verify amber needles move toward the player and are removed by barriers, the play-area boundary, or player collision. Restart during active fire and confirm no stale needles remain.

- [ ] **Step 4: Review the final diff for scope and consistency.**

  Run: `git status --short && git diff HEAD~3 --stat && git diff --check`

  Confirm only the intended Wasp code, documentation, and plan/spec commits are present; preserve unrelated pre-existing edits if still uncommitted.

- [ ] **Step 5: Report completion with evidence.**

  Include the build result, whitespace result, Bestiary verification, later-wave verification, and any environment limitation that prevented manual browser testing.
