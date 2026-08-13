import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes } from './voxel.js';

let player;
let playerParts = null;

// Deep value ramp keeps the interceptor's bevels and recesses readable under bloom.
const PLAYER_HI = 0xdffcff;
const PLAYER_PLATE = 0x38d9e8;
const PLAYER_TRIM = 0x1683b8;
const PLAYER_SHADE = 0x17285c;
const PLAYER_RECESS = 0x080f2d;
const PLAYER_CANOPY_SHADE = 0x1c7894;
const PLAYER_CANOPY_HI = 0x9ff7ff;
const PLAYER_SCAN = 0xbaffff;
const PLAYER_EXHAUST_SHADE = 0x16516f;
const PLAYER_EXHAUST_CORE_COLOR = 0x7fffff;
const PLAYER_FIRE_SHADE = 0x8e4813;
const PLAYER_FIRE_CORE = 0xfff4b0;

const PLAYER_HULL = [
    { size: [0.46, 0.22, 1.55], pos: [0, 0.00, 0.08], color: PLAYER_PLATE },
    { size: [0.68, 0.18, 0.88], pos: [0, 0.02, 0.26], color: PLAYER_TRIM },
    { size: [0.38, 0.12, 0.44], pos: [0, 0.13, -0.60], color: PLAYER_HI },
    { size: [0.82, 0.12, 0.34], pos: [0, -0.14, 0.38], color: PLAYER_SHADE },
    { size: [0.24, 0.10, 0.58], pos: [0, -0.22, 0.30], color: PLAYER_RECESS },
    { size: [0.16, 0.08, 0.22], pos: [0, 0.15, -0.86], color: PLAYER_HI },
    { size: [0.12, 0.06, 0.48], pos: [0, 0.08, 0.46], color: PLAYER_RECESS }
];

// Local +X is the left wing's outward direction. The right half is generated
// with mirrorBoxes() so its normals remain correct under Phong lighting.
const PLAYER_WING_HALF = [
    { size: [0.70, 0.12, 0.28], pos: [0.42, -0.02, 0.05], rotY: -0.18, color: PLAYER_PLATE },
    { size: [0.54, 0.06, 0.18], pos: [0.88, 0.05, -0.04], rotY: -0.18, color: PLAYER_HI },
    { size: [0.38, 0.08, 0.18], pos: [1.15, -0.08, 0.18], rotY: -0.18, color: PLAYER_SHADE }
];

const PLAYER_WING_TIP_HALF = [
    { size: [0.22, 0.10, 0.22], pos: [1.35, 0.00, -0.15], rotY: -0.18, color: PLAYER_TRIM },
    { size: [0.12, 0.06, 0.18], pos: [1.43, 0.08, -0.18], rotY: -0.18, color: PLAYER_HI }
];

const PLAYER_ENGINE_POD = [
    { size: [0.30, 0.26, 0.68], pos: [0, -0.04, 0.55], color: PLAYER_PLATE },
    { size: [0.36, 0.08, 0.34], pos: [0, 0.08, 0.40], color: PLAYER_HI },
    { size: [0.22, 0.16, 0.16], pos: [0, -0.10, 0.88], color: PLAYER_SHADE },
    { size: [0.18, 0.10, 0.12], pos: [0, -0.10, 0.94], color: PLAYER_RECESS }
];

const PLAYER_STABILIZER = [
    { size: [0.18, 0.12, 0.42], pos: [0.08, 0.08, 0.62], rotY: -0.20, color: PLAYER_TRIM },
    { size: [0.12, 0.06, 0.28], pos: [0.18, 0.16, 0.72], rotY: -0.20, color: PLAYER_HI }
];

const PLAYER_CANOPY = [
    { size: [0.42, 0.10, 0.54], pos: [0, 0.18, -0.20], color: PLAYER_CANOPY_SHADE },
    { size: [0.30, 0.08, 0.34], pos: [0, 0.25, -0.30], color: PLAYER_CANOPY_HI },
    { size: [0.20, 0.06, 0.18], pos: [0, 0.31, -0.38], color: PLAYER_RECESS }
];

const PLAYER_SCAN_LIGHT = [
    { size: [0.10, 0.04, 0.18], pos: [0, 0, 0], color: PLAYER_SCAN }
];

const PLAYER_EXHAUST = [
    { size: [0.20, 0.16, 0.14], pos: [0, 0, 0], color: PLAYER_EXHAUST_SHADE },
    { size: [0.12, 0.12, 0.10], pos: [0, 0, 0.08], color: PLAYER_EXHAUST_CORE_COLOR }
];

const PLAYER_FIRE_EMITTER = [
    { size: [0.20, 0.08, 0.20], pos: [0, 0, 0], color: PLAYER_FIRE_SHADE },
    { size: [0.10, 0.06, 0.10], pos: [0, -0.05, -0.04], color: PLAYER_FIRE_CORE }
];

function createMaterial(emissive, emissiveIntensity, options = {}) {
    return new THREE.MeshPhongMaterial({
        color: 0xffffff,
        vertexColors: true,
        emissive,
        emissiveIntensity,
        shininess: 35,
        flatShading: true,
        ...options
    });
}

function getPlayerParts() {
    if (playerParts) return playerParts;

    playerParts = {
        hullGeometry: buildVoxelGeometry(PLAYER_HULL),
        wingGeometry: buildVoxelGeometry(PLAYER_WING_HALF),
        wingRightGeometry: buildVoxelGeometry(mirrorBoxes(PLAYER_WING_HALF)),
        wingTipGeometry: buildVoxelGeometry(PLAYER_WING_TIP_HALF),
        wingTipRightGeometry: buildVoxelGeometry(mirrorBoxes(PLAYER_WING_TIP_HALF)),
        engineGeometry: buildVoxelGeometry(PLAYER_ENGINE_POD),
        stabilizerGeometry: buildVoxelGeometry(PLAYER_STABILIZER),
        stabilizerRightGeometry: buildVoxelGeometry(mirrorBoxes(PLAYER_STABILIZER)),
        canopyGeometry: buildVoxelGeometry(PLAYER_CANOPY),
        scanGeometry: buildVoxelGeometry(PLAYER_SCAN_LIGHT),
        exhaustGeometry: buildVoxelGeometry(PLAYER_EXHAUST),
        fireGeometry: buildVoxelGeometry(PLAYER_FIRE_EMITTER),
        hullMaterial: createMaterial(0x071936, 0.22),
        wingMaterial: createMaterial(0x08244c, 0.20),
        engineMaterial: createMaterial(0x071936, 0.24),
        stabilizerMaterial: createMaterial(0x08244c, 0.20),
        canopyMaterial: createMaterial(0x0d5c70, 0.45, {
            transparent: true,
            opacity: 0.88
        }),
        scanMaterial: createMaterial(0x72faff, 0.75),
        exhaustMaterial: createMaterial(PLAYER_EXHAUST_CORE_COLOR, 1.05),
        fireMaterial: createMaterial(PLAYER_FIRE_CORE, 0.50)
    };

    return playerParts;
}

function damp(current, target, speed, delta) {
    const amount = 1 - Math.exp(-speed * delta);
    return current + (target - current) * amount;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function makeMesh(geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
}

function createPlayerModel() {
    const group = new THREE.Group();
    const parts = getPlayerParts();
    const visual = new THREE.Group();

    const hull = makeMesh(parts.hullGeometry, parts.hullMaterial);
    visual.add(hull);

    const cockpit = makeMesh(parts.canopyGeometry, parts.canopyMaterial);
    const scanLight = makeMesh(parts.scanGeometry, parts.scanMaterial.clone());
    scanLight.position.set(0, 0.31, -0.38);
    cockpit.add(scanLight);
    visual.add(cockpit);

    const wingLeft = new THREE.Group();
    wingLeft.position.set(0, -0.01, 0);
    wingLeft.add(makeMesh(parts.wingGeometry, parts.wingMaterial));
    const wingTipLeft = new THREE.Group();
    wingTipLeft.add(makeMesh(parts.wingTipGeometry, parts.wingMaterial));
    wingLeft.add(wingTipLeft);
    visual.add(wingLeft);

    const wingRight = new THREE.Group();
    wingRight.position.set(0, -0.01, 0);
    wingRight.add(makeMesh(parts.wingRightGeometry, parts.wingMaterial));
    const wingTipRight = new THREE.Group();
    wingTipRight.add(makeMesh(parts.wingTipRightGeometry, parts.wingMaterial));
    wingRight.add(wingTipRight);
    visual.add(wingRight);

    const engineLeft = new THREE.Group();
    engineLeft.position.set(0.68, -0.05, 0.08);
    engineLeft.add(makeMesh(parts.engineGeometry, parts.engineMaterial));
    const exhaustLeft = makeMesh(parts.exhaustGeometry, parts.exhaustMaterial.clone());
    exhaustLeft.position.set(0, -0.10, 1.00);
    engineLeft.add(exhaustLeft);
    visual.add(engineLeft);

    const engineRight = new THREE.Group();
    engineRight.position.set(-0.68, -0.05, 0.08);
    engineRight.add(makeMesh(parts.engineGeometry, parts.engineMaterial));
    const exhaustRight = makeMesh(parts.exhaustGeometry, parts.exhaustMaterial.clone());
    exhaustRight.position.set(0, -0.10, 1.00);
    engineRight.add(exhaustRight);
    visual.add(engineRight);

    const stabilizerLeft = new THREE.Group();
    stabilizerLeft.position.set(0.38, 0.02, 0.05);
    stabilizerLeft.add(makeMesh(parts.stabilizerGeometry, parts.stabilizerMaterial));
    visual.add(stabilizerLeft);

    const stabilizerRight = new THREE.Group();
    stabilizerRight.position.set(-0.38, 0.02, 0.05);
    stabilizerRight.add(makeMesh(parts.stabilizerRightGeometry, parts.stabilizerMaterial));
    visual.add(stabilizerRight);

    const fireEmitter = makeMesh(parts.fireGeometry, parts.fireMaterial.clone());
    fireEmitter.position.set(0, -0.25, -0.84);
    fireEmitter.visible = false;
    visual.add(fireEmitter);

    group.add(visual);
    group.position.y = 0;
    group.position.z = 10;

    Object.assign(group.userData, {
        visual,
        hull,
        cockpit,
        scanLight,
        scanMaterial: scanLight.material,
        wingLeft,
        wingRight,
        wingTipLeft,
        wingTipRight,
        engineLeft,
        engineRight,
        exhaustLeft,
        exhaustRight,
        exhaustLeftMaterial: exhaustLeft.material,
        exhaustRightMaterial: exhaustRight.material,
        stabilizerLeft,
        stabilizerRight,
        fireEmitter,
        fireMaterial: fireEmitter.material,
        animationOffset: Math.random() * Math.PI * 2,
        firePulse: 0,
        lastUpdateTime: null,
        fireBaseZ: fireEmitter.position.z
    });

    return group;
}

function animatePlayer(timeSeconds, movementError) {
    if (!player) return;

    const data = player.userData;
    const delta = data.lastUpdateTime === null
        ? 0
        : Math.min(0.05, Math.max(0, timeSeconds - data.lastUpdateTime));
    data.lastUpdateTime = timeSeconds;

    const offset = data.animationOffset;
    const turn = clamp(movementError / 4, -1, 1);
    const turnAmount = Math.abs(turn);
    const idlePitch = Math.sin(timeSeconds * 1.7 + offset) * 0.025;
    const idleRoll = Math.sin(timeSeconds * 2.1 + offset * 0.7) * 0.018;

    data.visual.rotation.x = idlePitch;
    data.visual.rotation.y = Math.sin(timeSeconds * 0.8 + offset) * 0.010;
    data.visual.rotation.z = idleRoll;
    data.visual.position.y = Math.sin(timeSeconds * 3.0 + offset) * 0.025;

    data.wingLeft.rotation.z = damp(data.wingLeft.rotation.z, turn * 0.13, 8, delta);
    data.wingRight.rotation.z = damp(data.wingRight.rotation.z, -turn * 0.13, 8, delta);
    data.wingTipLeft.rotation.z = damp(data.wingTipLeft.rotation.z, -turn * 0.10, 10, delta);
    data.wingTipRight.rotation.z = damp(data.wingTipRight.rotation.z, turn * 0.10, 10, delta);
    data.stabilizerLeft.rotation.z = damp(data.stabilizerLeft.rotation.z, -turn * 0.07, 9, delta);
    data.stabilizerRight.rotation.z = damp(data.stabilizerRight.rotation.z, turn * 0.07, 9, delta);
    data.engineLeft.rotation.y = damp(data.engineLeft.rotation.y, turn * 0.10, 7, delta);
    data.engineRight.rotation.y = damp(data.engineRight.rotation.y, -turn * 0.10, 7, delta);

    const thrust = 0.35 + turnAmount * 0.70;
    const leftPulse = (Math.sin(timeSeconds * 8.0 + offset) + 1) / 2;
    const rightPulse = (Math.sin(timeSeconds * 8.0 + offset + Math.PI * 0.7) + 1) / 2;
    const leftLength = 0.78 + thrust * 0.16 + leftPulse * 0.25;
    const rightLength = 0.78 + thrust * 0.16 + rightPulse * 0.25;
    data.exhaustLeft.scale.set(1, 1, leftLength);
    data.exhaustRight.scale.set(1, 1, rightLength);
    data.exhaustLeftMaterial.emissiveIntensity = 0.55 + thrust * 0.65 + leftPulse * 0.45;
    data.exhaustRightMaterial.emissiveIntensity = 0.55 + thrust * 0.65 + rightPulse * 0.45;

    const scanPhase = (timeSeconds % 3.6) / 3.6;
    data.scanLight.position.x = (scanPhase * 2 - 1) * 0.14;
    const scanFlash = scanPhase < 0.08
        ? Math.sin((scanPhase / 0.08) * Math.PI)
        : 0;
    data.scanMaterial.emissiveIntensity = 0.40 + scanFlash * 0.85;

    data.firePulse = Math.max(0, data.firePulse - delta * 6);
    const fireProgress = 1 - data.firePulse;
    const fireFlash = data.firePulse > 0 ? Math.sin(Math.min(1, fireProgress) * Math.PI) : 0;
    data.fireEmitter.visible = fireFlash > 0.01;
    data.fireEmitter.position.z = data.fireBaseZ - fireFlash * 0.06;
    data.fireEmitter.scale.setScalar(0.80 + fireFlash * 0.90);
    data.fireMaterial.emissiveIntensity = 0.50 + fireFlash * 3.50;
}

// Create the player spaceship.
export function createPlayer(scene) {
    player = createPlayerModel();
    scene.add(player);
    return player;
}

// Update player position based on mouse input.
export function updatePlayer(mouseX) {
    if (!player) return;

    const targetX = mouseX * 12;
    player.position.x += (targetX - player.position.x) * 0.15;
    player.position.x = Math.max(-12, Math.min(12, player.position.x));

    const velocityX = targetX - player.position.x;
    player.rotation.z = -velocityX * 0.02;
    animatePlayer(performance.now() * 0.001, velocityX);
}

// Trigger the short local recoil and emitter flash used by player firing.
export function triggerPlayerFire() {
    if (player) player.userData.firePulse = 1;
}

export function getPlayer() {
    return player;
}

export function hidePlayer() {
    if (player) player.visible = false;
}

export function showPlayer() {
    if (player) player.visible = true;
}
