# Bonus UFO Voxel Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the bonus UFO — the last model still made of smooth primitives — as a voxel sculpt with counter-rotating layers, changing nothing about how the game plays.

**Architecture:** Extract the five voxel helpers out of `aliens.js` into a new shared `js/voxel.js`, then rebuild `createBonusUFO()` as four independently-rotating layers (hull, light collar, level canopy, level antenna) behind a lazily-built parts registry, and rewrite `animateBonusUFO()` to drive them.

**Tech Stack:** THREE.js v0.158.0 (ES modules, import map in dev / bundled by Vite in prod), no framework, no test runner.

## Global Constraints

- **This project has no test runner.** There is no `test` script in `package.json` and no test library in dependencies. Do not add one — it is out of scope. Verification in every task is: `npm run build` succeeds, plus the headless measurement harness in Task 1, plus a visual check in Task 3.
- **Max radial extent ≤ 2.0** measured across a full animation sweep. Collision is `missile.position.distanceTo(bonusUFO.position) < 2.0` at `js/missiles.js:236`.
- **No gameplay change.** Do not touch movement speed, path, spawn interval, the 500-point value, the firing logic, or the collision radius.
- **Do not fix** the `// 25% chance this UFO will attack` comment above `Math.random() < 0.75`, and do not fix the unused `setSpawnInterval()` / `minSpawnInterval` / `maxSpawnInterval`. Both are deliberate non-goals; fixing them would change balance or widen scope.
- Materials rendering merged voxel geometry must set `vertexColors: true`.
- Any material that is animated must be `.clone()`d per instance.
- Use `mirrorBoxes()` for symmetrical parts, never `scale.x = -1` — it inverts normals and breaks lighting on that half.
- Merge into `userData`, never replace it.

---

### Task 1: Extract the voxel toolkit into `js/voxel.js`

This is a **pure move**. If any alien model changes shape by even a fraction, the move was done wrong — Step 2 captures a baseline to prove it didn't.

**Files:**
- Create: `js/voxel.js`
- Create: `scratch/measure.mjs` (harness; not committed — see Step 1)
- Modify: `js/aliens.js` — delete lines `137-158` (`buildVoxelGeometry`), `162-169` (`mirrorBoxes`), `459-464` (`buildLimbSegmentGeometry`), `536-550` (`buildLimbChain`), `951-957` (`saucerTier`); add one import at the top

**Interfaces:**
- Consumes: nothing
- Produces: `js/voxel.js` exporting `buildVoxelGeometry(boxes) -> THREE.BufferGeometry`, `mirrorBoxes(boxes) -> Array`, `saucerTier(width, depth, height, y, color) -> Array`, `buildLimbSegmentGeometry(segment, color, trimColor) -> THREE.BufferGeometry`, `buildLimbChain(mount, geometries, segments, material, offsetSign) -> Array`

- [ ] **Step 1: Create the measurement harness**

Write to `/tmp/measure.mjs` (or your scratchpad — it is a tool, not a deliverable, and must not be committed):

```js
import * as THREE from '/Users/moog/Documents/3d-space-invaders/node_modules/three/build/three.module.js';
import { createAlienPreview, animateAlien } from '/Users/moog/Documents/3d-space-invaders/js/aliens.js';

// animateAlien() reads Date.now() internally, so driving the clock is the
// only way to sweep a full animation cycle.
let fakeMs = 0;
Date.now = () => fakeMs;

const NAMES = ['Octopus', 'Crab', 'Squid', 'UFO', 'Tank', 'Beetle', 'Invader'];
const box = new THREE.Box3();

for (let row = 0; row < 7; row++) {
    const alien = createAlienPreview(row);
    alien.userData.animationOffset = 0;
    let peakW = 0, peakD = 0;
    for (fakeMs = 0; fakeMs <= 12000; fakeMs += 1000 / 60) {
        animateAlien(alien);
        alien.updateMatrixWorld(true);
        box.setFromObject(alien);
        if (!isFinite(box.min.x)) continue;
        peakW = Math.max(peakW, Math.abs(box.min.x), Math.abs(box.max.x));
        peakD = Math.max(peakD, Math.abs(box.min.z), Math.abs(box.max.z));
    }
    console.log(`${NAMES[row].padEnd(9)} peakW=${peakW.toFixed(4)} peakD=${peakD.toFixed(4)}`);
}
```

- [ ] **Step 2: Capture the pre-move baseline**

```bash
node /tmp/measure.mjs > /tmp/baseline.txt 2>/dev/null
cat /tmp/baseline.txt
```

Expected: seven lines. These exact numbers must still hold after the move.

- [ ] **Step 3: Create `js/voxel.js`**

Move the five functions **verbatim** — same bodies, no edits — adding `export` to each. The file starts with:

```js
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
```

Then `export function buildVoxelGeometry(boxes) { ... }` and the other four, bodies copied exactly as they are in `aliens.js`.

- [ ] **Step 4: Delete the originals from `aliens.js` and import them**

Remove the five function definitions. Add below the existing imports:

```js
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from './voxel.js';
```

If `mergeGeometries` is now unused in `aliens.js`, remove that import too. Leave every call site untouched — the names are identical.

- [ ] **Step 5: Verify the build**

```bash
npm run build
```

Expected: `✓ built`. A missed helper surfaces here as "X is not defined".

- [ ] **Step 6: Verify no model changed**

```bash
node /tmp/measure.mjs > /tmp/after.txt 2>/dev/null
diff /tmp/baseline.txt /tmp/after.txt && echo "IDENTICAL - move was clean"
```

Expected: `IDENTICAL`. Any diff means the move altered a model — stop and find out why.

- [ ] **Step 7: Commit**

```bash
git add js/voxel.js js/aliens.js
git commit -m "Extract the voxel toolkit from aliens.js into js/voxel.js

Pure move, no behaviour change. The bonus UFO rebuild is the second
consumer of these helpers, so they no longer belong to the alien module.
Verified identical model extents before and after."
```

---

### Task 2: Build and animate the bonus UFO voxel model

The model and its animation land in **one commit**. They are inseparable:
`animateBonusUFO()` reads the exact `userData` keys `createBonusUFO()` writes,
so replacing one without the other leaves a commit that builds fine but throws
at runtime the moment a bonus UFO spawns.

**Files:**
- Modify: `js/bonus-ufo.js` — replace `createBonusUFO()` and `animateBonusUFO()` entirely; add palette constants, box arrays and `getBonusUfoParts()` above them

**Interfaces:**
- Consumes: `buildVoxelGeometry`, `mirrorBoxes`, `saucerTier` from `js/voxel.js`
- Produces: `createBonusUFO() -> THREE.Group` whose `userData` carries `{ hull, collar, canopy, pilot, antenna, beacon, beaconMaterial, lights }` — `lights` is an array of `{ mesh, material, angle }`. `animateBonusUFO()` reads exactly these keys.

- [ ] **Step 1: Add the import**

At the top of `js/bonus-ufo.js`:

```js
import { buildVoxelGeometry, mirrorBoxes, saucerTier } from './voxel.js';
```

- [ ] **Step 2: Add palette and box arrays above `createBonusUFO()`**

```js
// Magenta signature with gold trim. Wide value ramp rather than flat
// saturation: emissive is added on top of vertex colours, not through them,
// so a narrow ramp under bloom flattens into one glowing blob.
const UFO_HI = 0xffd4f6;
const UFO_PLATE = 0xff5ce0;
const UFO_MID = 0xc81fa8;
const UFO_SHADE = 0x7d1268;
const UFO_RECESS = 0x3a0733;
const UFO_GOLD = 0xffc44a;
const UFO_GOLD_DIM = 0xa87413;

// Hull: stacked discs. saucerTier() unions three boxes into a cut-corner disc,
// which reads far rounder than a box. Widest tier is 1.72 wide (0.86 radius);
// the collar lights sit further out and set the real 2.0 budget.
const UFO_HULL = [
    ...saucerTier(1.30, 0.86, 0.14, 0.30, UFO_MID),
    ...saucerTier(1.72, 1.14, 0.16, 0.17, UFO_PLATE),
    ...saucerTier(2.20, 1.46, 0.18, 0.00, UFO_PLATE),
    ...saucerTier(2.36, 1.56, 0.07, -0.11, UFO_GOLD_DIM),
    ...saucerTier(2.00, 1.32, 0.16, -0.22, UFO_MID),
    ...saucerTier(1.48, 0.98, 0.14, -0.36, UFO_SHADE),
    ...saucerTier(0.92, 0.60, 0.12, -0.47, UFO_RECESS),
    { size: [2.46, 0.05, 0.20], pos: [0, 0.02, 0], color: UFO_GOLD },
    { size: [0.20, 0.05, 2.46], pos: [0, 0.02, 0], color: UFO_GOLD },
    { size: [0.62, 0.05, 0.30], pos: [0, 0.10, 0.74], color: UFO_HI },
    { size: [0.62, 0.05, 0.30], pos: [0, 0.10, -0.74], color: UFO_HI }
];

// Underside emitter the missile originates from
const UFO_EMITTER = [
    { size: [0.54, 0.10, 0.54], pos: [0, -0.56, 0], color: UFO_GOLD },
    { size: [0.30, 0.10, 0.30], pos: [0, -0.64, 0], color: UFO_HI }
];

// One light pod, instanced around the collar at radius 1.86
const UFO_LIGHT_POD = [
    { size: [0.20, 0.16, 0.20], pos: [0, 0, 0], color: UFO_GOLD_DIM },
    { size: [0.14, 0.14, 0.14], pos: [0, 0.02, 0], color: 0xffe89a }
];

const UFO_LIGHT_COUNT = 12;
const UFO_LIGHT_RADIUS = 1.86;

const UFO_CANOPY = [
    ...saucerTier(0.92, 0.62, 0.14, 0.44, 0x6fe4f4),
    ...saucerTier(0.70, 0.48, 0.14, 0.56, 0x9ff4ff),
    ...saucerTier(0.44, 0.30, 0.10, 0.66, 0xd8fbff),
    { size: [0.98, 0.05, 0.66], pos: [0, 0.36, 0], color: UFO_GOLD }
];

const UFO_PILOT = [
    { size: [0.26, 0.20, 0.22], pos: [0, 0.52, 0], color: 0x2b0f3a },
    { size: [0.16, 0.10, 0.14], pos: [0, 0.64, 0.02], color: 0x50205e },
    { size: [0.06, 0.05, 0.05], pos: [-0.05, 0.65, 0.10], color: 0xff5ce0 },
    { size: [0.06, 0.05, 0.05], pos: [0.05, 0.65, 0.10], color: 0xff5ce0 }
];

const UFO_ANTENNA = [
    { size: [0.09, 0.62, 0.09], pos: [0, 1.02, 0], color: UFO_GOLD_DIM },
    { size: [0.16, 0.07, 0.16], pos: [0, 0.76, 0], color: UFO_GOLD }
];

const UFO_BEACON = [
    { size: [0.24, 0.24, 0.24], pos: [0, 1.40, 0], color: 0xff3a6a }
];
```

- [ ] **Step 3: Add the lazily-built registry**

```js
// Built once and shared across respawns. The old code rebuilt 17 meshes and
// 17 materials on every spawn.
let ufoParts = null;

function getBonusUfoParts() {
    if (ufoParts) return ufoParts;

    ufoParts = {
        hullGeometry: buildVoxelGeometry(UFO_HULL),
        emitterGeometry: buildVoxelGeometry(UFO_EMITTER),
        podGeometry: buildVoxelGeometry(UFO_LIGHT_POD),
        canopyGeometry: buildVoxelGeometry(UFO_CANOPY),
        pilotGeometry: buildVoxelGeometry(UFO_PILOT),
        antennaGeometry: buildVoxelGeometry(UFO_ANTENNA),
        beaconGeometry: buildVoxelGeometry(UFO_BEACON),
        hullMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x6a1152,
            emissiveIntensity: 0.9,
            shininess: 30,
            flatShading: true
        }),
        canopyMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x2f7f8c,
            emissiveIntensity: 1.1,
            transparent: true,
            opacity: 0.85,
            flatShading: true
        }),
        pilotMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x40103f,
            emissiveIntensity: 0.7,
            flatShading: true
        }),
        antennaMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x7a5510,
            emissiveIntensity: 0.9,
            flatShading: true
        }),
        // Cloned per instance by callers - these are animated
        podMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xffe89a,
            emissiveIntensity: 1.6,
            flatShading: true
        }),
        beaconMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xff3a6a,
            emissiveIntensity: 2.0,
            flatShading: true
        })
    };

    return ufoParts;
}
```

- [ ] **Step 4: Replace `createBonusUFO()`**

Delete the whole existing function body and replace with:

```js
function createBonusUFO() {
    const ufo = new THREE.Group();
    const parts = getBonusUfoParts();

    // Hull spins; the collar counter-spins; canopy and antenna stay level so
    // their asymmetric detail stays readable at 2 rad/s.
    const hull = new THREE.Mesh(parts.hullGeometry, parts.hullMaterial);
    hull.add(new THREE.Mesh(parts.emitterGeometry, parts.hullMaterial));
    ufo.add(hull);

    const collar = new THREE.Group();
    const lights = [];
    for (let i = 0; i < UFO_LIGHT_COUNT; i++) {
        const angle = (i / UFO_LIGHT_COUNT) * Math.PI * 2;
        // Own material per pod, or the chase writes one value 12 times and
        // every light pulses in unison instead of chasing.
        const material = parts.podMaterial.clone();
        const mesh = new THREE.Mesh(parts.podGeometry, material);
        mesh.position.set(Math.cos(angle) * UFO_LIGHT_RADIUS, -0.06, Math.sin(angle) * UFO_LIGHT_RADIUS);
        collar.add(mesh);
        lights.push({ mesh, material, angle });
    }
    ufo.add(collar);

    const canopy = new THREE.Mesh(parts.canopyGeometry, parts.canopyMaterial);
    const pilot = new THREE.Mesh(parts.pilotGeometry, parts.pilotMaterial);
    canopy.add(pilot);
    ufo.add(canopy);

    const antenna = new THREE.Mesh(parts.antennaGeometry, parts.antennaMaterial);
    const beacon = new THREE.Mesh(parts.beaconGeometry, parts.beaconMaterial.clone());
    antenna.add(beacon);
    ufo.add(antenna);

    // Merge, never replace: spawnBonusUFO() writes direction, points and
    // willAttack into this same object.
    Object.assign(ufo.userData, {
        hull, collar, canopy, pilot, antenna, beacon, lights,
        beaconMaterial: beacon.material,
        animationOffset: Math.random() * Math.PI * 2
    });

    return ufo;
}
```

- [ ] **Step 5: Replace `animateBonusUFO()`**

This must land in the same commit as Step 4. The old body reads
`userData.body`, `.dome` and `.tip`, which Step 4 just removed.

```js
function animateBonusUFO(ufo, time) {
    const data = ufo.userData;

    // Counter-rotating layers. The group itself never spins, so the canopy and
    // antenna can hold level while the hull and collar turn against each other.
    data.hull.rotation.y = time * 2.0;
    data.collar.rotation.y = -time * 1.2;

    // Hover bob - unchanged from the original.
    ufo.position.y = 5 + Math.sin(time * 3) * 0.3;

    // Chase: a bright crest travels around the collar. Each pod has its own
    // cloned material, so the phase offset actually produces a chase.
    data.lights.forEach(light => {
        const phase = time * 5.0 - light.angle * 2.0;
        const crest = Math.pow((Math.sin(phase) + 1) / 2, 3);
        light.material.emissiveIntensity = 0.7 + crest * 3.0;
        light.mesh.position.y = -0.06 + crest * 0.05;
    });

    // Canopy holds level and sways gently; the pilot looks around inside it.
    data.canopy.rotation.y = Math.sin(time * 0.7) * 0.18;
    data.pilot.rotation.y = Math.sin(time * 1.3) * 0.5;

    // Antenna sways. Beacon flashes on an explicit phase window - a steep
    // power curve would read as a permanent glow rather than a flash.
    data.antenna.rotation.z = Math.sin(time * 3) * 0.12;
    const beaconPhase = (time % 1.4) / 1.4;
    const flash = beaconPhase < 0.08 ? Math.sin((beaconPhase / 0.08) * Math.PI) : 0;
    data.beaconMaterial.emissiveIntensity = 0.8 + flash * 4.0;
    data.beacon.scale.setScalar(1 + flash * 0.4);
}
```

- [ ] **Step 6: Verify the build**

```bash
npm run build
```

Expected: `✓ built`.

- [ ] **Step 7: Verify the radial budget**

Write `/tmp/measure-ufo.mjs`:

```js
import * as THREE from '/Users/moog/Documents/3d-space-invaders/node_modules/three/build/three.module.js';
import { spawnBonusUFO, updateBonusUFO, getBonusUFO } from '/Users/moog/Documents/3d-space-invaders/js/bonus-ufo.js';

let fakeMs = 0;
Date.now = () => fakeMs;

const scene = new THREE.Scene();
spawnBonusUFO(scene, 999999);
const ufo = getBonusUFO();

let peak = 0, peakY = 0;
const box = new THREE.Box3();
for (fakeMs = 0; fakeMs <= 12000; fakeMs += 1000 / 60) {
    updateBonusUFO();
    if (!getBonusUFO()) break;   // drifted off-screen and despawned
    ufo.updateMatrixWorld(true);
    box.setFromObject(ufo);
    const c = ufo.position;
    for (const [x, z] of [[box.min.x, box.min.z], [box.max.x, box.max.z],
                          [box.min.x, box.max.z], [box.max.x, box.min.z]]) {
        peak = Math.max(peak, Math.hypot(x - c.x, z - c.z));
    }
    peakY = Math.max(peakY, Math.abs(box.max.y - c.y), Math.abs(box.min.y - c.y));
}
console.log(`peak radial = ${peak.toFixed(3)}  (budget 2.0)`);
console.log(`peak |y|    = ${peakY.toFixed(3)}`);
console.log(peak <= 2.0 ? 'WITHIN BUDGET' : '*** OVER BUDGET ***');
```

```bash
node /tmp/measure-ufo.mjs 2>/dev/null
```

Expected: `WITHIN BUDGET`. If over, reduce `UFO_LIGHT_RADIUS` or the widest `saucerTier` width and re-run. Do not proceed while over budget — the model would extend past its own hitbox and shots that look like hits would miss.

- [ ] **Step 8: Verify per-instance material cloning**

```bash
node --input-type=module -e "
import('/Users/moog/Documents/3d-space-invaders/js/bonus-ufo.js').then(async m => {
  const THREE = await import('/Users/moog/Documents/3d-space-invaders/node_modules/three/build/three.module.js');
  Date.now = () => 999999;
  m.spawnBonusUFO(new THREE.Scene(), 999999);
  const l = m.getBonusUFO().userData.lights;
  const unique = new Set(l.map(x => x.material.uuid)).size;
  console.log(unique === l.length
    ? 'PASS: ' + unique + ' distinct pod materials'
    : 'FAIL: only ' + unique + ' materials for ' + l.length + ' pods');
});
" 2>/dev/null
```

Expected: `PASS: 12 distinct pod materials`. A `FAIL` here means the chase will silently pulse in unison — the exact bug CLAUDE.md records from the row-3 UFO.

- [ ] **Step 9: Commit**

```bash
git add js/bonus-ufo.js
git commit -m "Rebuild the bonus UFO as a voxel sculpt with counter-rotating layers

Replaces cylinders and spheres with merged voxel geometry behind a
lazily-built parts registry. Magenta value ramp with gold trim, a level
canopy with a pilot, chasing rim lights and a phase-window beacon.

Model and animation land together because animateBonusUFO() reads the
exact userData keys createBonusUFO() writes."
```

---

### Task 3: Verify in-game and update documentation

**Files:**
- Modify: `CLAUDE.md` — the `bonus-ufo.js` row in the module table, and the voxel sculpt section

- [ ] **Step 1: Run the game and observe a spawn**

```bash
npm run dev
```

Open `http://localhost:5173/`, start a new game, and wait up to 20 seconds for a bonus UFO. Confirm all five:

1. The hull spins and the light collar counter-rotates.
2. The canopy stays level — it does not spin with the hull.
3. The pilot is visible inside the canopy.
4. The rim lights **chase** around the collar rather than pulsing together.
5. The beacon flashes intermittently, not glowing constantly.

- [ ] **Step 2: Confirm shooting it still works**

Shoot the bonus UFO. Confirm it explodes, awards 500 points, and that hits register where the model looks like it is — no shots passing through the visible hull.

- [ ] **Step 3: Update `CLAUDE.md`**

In the module table, change the `bonus-ufo.js` row to:

```
| `bonus-ufo.js` | Periodic bonus UFO that flies across screen — voxel sculpt with counter-rotating hull and light collar, level canopy with pilot |
```

In the Voxel Sculpt System section, update the helper list to note they now live in `js/voxel.js`, and add:

```
- The toolkit lives in `js/voxel.js`, shared by `aliens.js` and `bonus-ufo.js`. The bonus UFO is not in the Bestiary, so it can only be verified in gameplay — allow up to ~20s per spawn.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Document the bonus UFO rebuild and the shared voxel toolkit"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Extract voxel toolkit into `js/voxel.js` | 1 |
| Counter-rotating hull / collar / level canopy | 2 (structure), 3 (motion) |
| Magenta + gold wide value ramp | 2 |
| Pilot silhouette in level canopy | 2, 3 |
| Gold emitter ring underside | 2 (`UFO_EMITTER`) |
| Beacon on explicit phase window | 3 |
| Chasing rim lights, own material each | 2 (clone), 3 (chase), verified 3.4 |
| Lazily-built parts registry | 2 |
| Max radius ≤ 2.0 across animation sweep | 2.6, 3.3 |
| Hover bob preserved | 3 |
| No gameplay change | Global constraints; verified 4.2 |
| Two defects deferred, not fixed | Global constraints |

No gaps.

**Placeholder scan:** No TBD/TODO. Every code step carries real code. Every verification step names an exact command and its expected output.

**Type consistency:** `userData` keys written in Task 2 (`hull`, `collar`, `canopy`, `pilot`, `antenna`, `beacon`, `lights`, `beaconMaterial`) are exactly the keys read in Task 3. `lights` entries are `{ mesh, material, angle }` in both. `getBonusUfoParts()` is spelled identically in Steps 3 and 4 of Task 2.

**Known deviation from the skill's default:** this plan is not TDD. The project has no test runner and adding one is out of scope, so each task instead ends with an executable check — a build, a headless `Box3` assertion, or a material-identity assertion — plus one gameplay observation pass in Task 4.
