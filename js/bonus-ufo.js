import * as THREE from 'three';
import { playUFOSpawn, playUFOTravel, stopUFOTravel, updateUFOTravelPanning } from './audio.js';
import { buildVoxelGeometry, mirrorBoxes, saucerTier } from './voxel.js';

let bonusUFO = null;
let ufoSpeed = 0.05; // Slower movement speed (50% of original) - makes UFO more shootable
let lastSpawnTime = 0;
let spawnInterval = 20000; // Spawn every 20 seconds (can be adjusted)
const minSpawnInterval = 15000; // Minimum time between spawns
const maxSpawnInterval = 30000; // Maximum time between spawns

// Callback for firing UFO missile (set by missiles.js)
let ufoMissileFireCallback = null;

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
// which reads far rounder than a box. Widest tier is 2.36 wide (1.18 radius);
// the collar lights sit further out and set the real 2.0 budget (measured via
// the corrected vertex-distance harness, not the AABB-corner one - see
// UFO_LIGHT_RADIUS).
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

// One light pod, instanced around the collar at radius 1.82. Rotation about
// the group origin never changes a vertex's distance from it, so the
// farthest pod corner - not the radius alone - sets the real reach: with 12
// pods every 30 degrees, one always sits near a diagonal where its corner
// extends past the radius. Tuned via the vertex-distance harness (not an
// AABB-corner one, which over-reports by ~sqrt(2) for a round object) to a
// measured peak of ~1.96 against the 2.0 collision radius in missiles.js.
const UFO_LIGHT_POD = [
    { size: [0.20, 0.16, 0.20], pos: [0, 0, 0], color: UFO_GOLD_DIM },
    { size: [0.14, 0.14, 0.14], pos: [0, 0.02, 0], color: 0xffe89a }
];

const UFO_LIGHT_COUNT = 12;
const UFO_LIGHT_RADIUS = 1.82;

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

// Centred on its own origin - the mesh, not the geometry, carries the y
// offset, so animateBonusUFO()'s scale pulse grows it in place instead of
// scaling the offset itself and flinging it outward.
const UFO_BEACON = [
    { size: [0.24, 0.24, 0.24], pos: [0, 0, 0], color: 0xff3a6a }
];

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

/**
 * Creates a distinctive bonus UFO with elaborate design
 */
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
    beacon.position.y = 1.40;
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

/**
 * Spawns a bonus UFO if conditions are met
 */
export function spawnBonusUFO(scene, currentTime) {
    // Don't spawn if one already exists
    if (bonusUFO) return;

    // Check if enough time has passed since last spawn
    if (currentTime - lastSpawnTime < spawnInterval) return;

    // Create the UFO
    bonusUFO = createBonusUFO();

    // Randomly choose direction (left-to-right or right-to-left)
    const direction = Math.random() > 0.5 ? 1 : -1;
    bonusUFO.userData.direction = direction;

    // Position at top of screen, off to the side
    bonusUFO.position.y = 5; // Higher than player
    bonusUFO.position.z = -28; // At the back, near the alien formation
    bonusUFO.position.x = direction === 1 ? -18 : 18; // Start off-screen

    bonusUFO.userData.isBonusUFO = true;
    bonusUFO.userData.points = 500;

    // 25% chance this UFO will attack
    bonusUFO.userData.willAttack = Math.random() < 0.75;
    bonusUFO.userData.hasFired = false;
    bonusUFO.userData.startX = bonusUFO.position.x;

    scene.add(bonusUFO);
    lastSpawnTime = currentTime;

    // Play spawn sound (warp in effect)
    playUFOSpawn();

    // Start continuous travel sound
    playUFOTravel(bonusUFO);

    return bonusUFO;
}

/**
 * Updates the bonus UFO position and animation
 */
export function updateBonusUFO() {
    if (!bonusUFO) return;

    const time = Date.now() * 0.001 + bonusUFO.userData.animationOffset;

    // Move horizontally
    bonusUFO.position.x += bonusUFO.userData.direction * ufoSpeed;

    // Check if UFO should fire missile (40-60% through traverse)
    if (bonusUFO.userData.willAttack && !bonusUFO.userData.hasFired) {
        const totalDistance = 36; // From -18 to 18
        const traveledDistance = Math.abs(bonusUFO.position.x - bonusUFO.userData.startX);
        const traversePercent = (traveledDistance / totalDistance) * 100;

        // Fire when UFO is 40-60% through screen
        if (traversePercent >= 40 && traversePercent <= 60) {
            bonusUFO.userData.hasFired = true;
            if (ufoMissileFireCallback) {
                ufoMissileFireCallback(bonusUFO.position, bonusUFO.parent);
            }
        }
    }

    // Animate the UFO
    animateBonusUFO(bonusUFO, time);

    // Update travel sound panning based on position
    updateUFOTravelPanning(bonusUFO);

    // Remove if off-screen
    if (Math.abs(bonusUFO.position.x) > 20) {
        removeBonusUFO(bonusUFO.parent);
    }
}

/**
 * Animates the bonus UFO with spinning, pulsing, and light effects
 */
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

/**
 * Removes the bonus UFO from the scene
 */
export function removeBonusUFO(scene) {
    if (bonusUFO && scene) {
        // Stop travel sound
        stopUFOTravel();
        scene.remove(bonusUFO);
    }
    bonusUFO = null;
}

/**
 * Gets the current bonus UFO (if any)
 */
export function getBonusUFO() {
    return bonusUFO;
}

/**
 * Resets the bonus UFO system (for game restart)
 */
export function resetBonusUFO(scene) {
    removeBonusUFO(scene);
    lastSpawnTime = 0;
}

/**
 * Sets the spawn interval for testing/balancing
 */
export function setSpawnInterval(interval) {
    spawnInterval = Math.max(minSpawnInterval, Math.min(maxSpawnInterval, interval));
}

/**
 * Sets the callback for firing UFO missiles
 */
export function setUFOMissileFireCallback(callback) {
    ufoMissileFireCallback = callback;
}
