import * as THREE from 'three';
import { playSwoopWarning } from './audio.js';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_SPACING } from './constants.js';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from './voxel.js';

let aliens = [];
let alienDirection = 1;
let alienSpeed = 0.02;

// Dynamic level configuration
let levelConfig = {
    rows: ALIEN_ROWS,
    cols: ALIEN_COLS,
    baseSpeed: 0.02,
    fireInterval: 1500,
    swoopThreshold: 5
};

/**
 * Set alien configuration from level config
 * @param {Object} config - Level configuration object
 */
export function setAlienConfig(config) {
    levelConfig = {
        rows: config.alienRows || ALIEN_ROWS,
        cols: config.alienCols || ALIEN_COLS,
        baseSpeed: config.alienSpeed || 0.02,
        fireInterval: config.alienFireInterval || 1500,
        swoopThreshold: config.swoopThreshold || 5
    };
    alienSpeed = levelConfig.baseSpeed;
}

/**
 * Get current alien fire interval
 */
export function getAlienFireInterval() {
    return levelConfig.fireInterval;
}

// Create all aliens in formation
export function createAliens(scene, customRows = null, customCols = null) {
    const rows = customRows !== null ? customRows : levelConfig.rows;
    const cols = customCols !== null ? customCols : levelConfig.cols;

    // Center the formation based on column count
    const startX = -((cols - 1) * ALIEN_SPACING) / 2;
    const startZ = -15;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Cycle through 9 alien types based on row
            const alienType = row % 9;
            const alien = createAlien(alienType);
            alien.position.x = startX + col * ALIEN_SPACING;
            alien.position.z = startZ - row * ALIEN_SPACING;
            alien.position.y = 0;  // On same plane as player
            // Merge rather than replace: the model builders stash references to
            // their animated parts in userData, and animateAlien() needs them
            Object.assign(alien.userData, {
                row: alienType,  // Use alien type for scoring/behavior
                actualRow: row,  // Keep track of actual grid row
                col: col,
                animationOffset: Math.random() * Math.PI * 2,
                destroyed: false
            });
            aliens.push(alien);
            scene.add(alien);
        }
    }

    return aliens;
}

/**
 * Build one standalone alien for display (the bestiary gallery).
 *
 * Unlike createAliens(), this does not touch the shared `aliens` array or add
 * anything to a scene, so it can be called while a game is in progress without
 * corrupting the formation. The caller owns the returned Group.
 *
 * @param {number} type - alien type 0-6 (same numbering as the row types)
 * @returns {THREE.Group} an alien ready to be passed to animateAlien()
 */
export function createAlienPreview(type) {
    const alien = createAlien(type);

    // Merge rather than replace: the model builders stash references to their
    // animated parts in userData, and animateAlien() needs them
    Object.assign(alien.userData, {
        row: type,
        animationOffset: Math.random() * Math.PI * 2,
        destroyed: false
    });

    return alien;
}

// Create a single alien based on row type
function createAlien(row) {
    const group = new THREE.Group();

    // Different alien types for each row
    switch (row) {
        case 0: // Top row - Octopus style
            createOctopusAlien(group);
            break;
        case 1: // Crab style
            createCrabAlien(group);
            break;
        case 2: // Squid style
            createSquidAlien(group);
            break;
        case 3: // UFO style
            createUFOAlien(group);
            break;
        case 4: // Tank style
            createTankAlien(group);
            break;
        case 5: // Beetle style - classic 70s arcade insect
            createBeetleAlien(group);
            break;
        case 6: // Invader style - classic retro arcade invader
            createInvaderAlien(group);
            break;
        case 7: // Scorpion style - arachnid with segmented tail and venom darts
            createScorpionAlien(group);
            break;
        case 8: // Wasp style - striped insect with wingstorm animation
            createWaspAlien(group);
            break;
    }

    return group;
}

// ---------------------------------------------------------------------------
// Octopus (row 0) - detailed voxel sculpt
// ---------------------------------------------------------------------------

// Mantle: tapering tiers read as a rounded dome while staying blocky
const OCTOPUS_MANTLE = [
    { size: [0.44, 0.18, 0.44], pos: [0, 0.80, -0.02], color: 0xff7bf9 },
    { size: [0.80, 0.24, 0.66], pos: [0, 0.60, -0.02], color: 0xff45ee },
    { size: [1.06, 0.28, 0.86], pos: [0, 0.34, 0.00], color: 0xff1ce2 },
    { size: [1.22, 0.30, 1.00], pos: [0, 0.05, 0.02], color: 0xef00d6 },
    { size: [1.10, 0.14, 0.90], pos: [0, -0.16, 0.02], color: 0x8e0aa6 },  // collar
    { size: [0.94, 0.14, 0.78], pos: [0, -0.29, 0.02], color: 0xc400b4 },  // base
    // Crest spikes along the top of the hood
    { size: [0.12, 0.16, 0.12], pos: [-0.20, 0.94, -0.02], color: 0xffd0ff },
    { size: [0.12, 0.20, 0.12], pos: [0.00, 0.97, -0.02], color: 0xffd0ff },
    { size: [0.12, 0.16, 0.12], pos: [0.20, 0.94, -0.02], color: 0xffd0ff },
    // Side fins widen the silhouette
    { size: [0.18, 0.22, 0.62], pos: [-0.68, 0.10, 0.00], color: 0xff45ee },
    { size: [0.18, 0.22, 0.62], pos: [0.68, 0.10, 0.00], color: 0xff45ee },
    // Dark brow ridge, angled at the outer ends for a scowl
    { size: [1.00, 0.13, 0.16], pos: [0, 0.30, 0.48], color: 0x6d0080 },
    { size: [0.30, 0.12, 0.14], pos: [-0.44, 0.36, 0.44], rotZ: 0.35, color: 0x6d0080 },
    { size: [0.30, 0.12, 0.14], pos: [0.44, 0.36, 0.44], rotZ: -0.35, color: 0x6d0080 },
    // Cheek plates frame the face
    { size: [0.16, 0.30, 0.22], pos: [-0.56, 0.02, 0.40], color: 0xff45ee },
    { size: [0.16, 0.30, 0.22], pos: [0.56, 0.02, 0.40], color: 0xff45ee }
];

const OCTOPUS_SOCKETS = [
    { size: [0.36, 0.30, 0.16], pos: [-0.30, 0.12, 0.42], color: 0x2a0030 },
    { size: [0.36, 0.30, 0.16], pos: [0.30, 0.12, 0.42], color: 0x2a0030 }
];

// Iris plus a hotter pupil, merged so both eyes track together as one mesh
const OCTOPUS_EYES = [
    { size: [0.24, 0.20, 0.10], pos: [-0.30, 0.12, 0.50], color: 0xffe000 },
    { size: [0.24, 0.20, 0.10], pos: [0.30, 0.12, 0.50], color: 0xffe000 },
    { size: [0.10, 0.13, 0.06], pos: [-0.30, 0.12, 0.545], color: 0xfffbe0 },
    { size: [0.10, 0.13, 0.06], pos: [0.30, 0.12, 0.545], color: 0xfffbe0 }
];

// Heavy hooded lids, parked under the brow until a blink drops them
const OCTOPUS_LIDS = [
    { size: [0.38, 0.18, 0.12], pos: [-0.30, 0, 0.44], color: 0xd11ce0 },
    { size: [0.38, 0.18, 0.12], pos: [0.30, 0, 0.44], color: 0xd11ce0 }
];
const OCTOPUS_LID_OPEN_Y = 0.38;
const OCTOPUS_LID_CLOSED_Y = 0.10;

// Bioluminescent vents ringing the collar - these carry most of the bloom
const OCTOPUS_VENTS = [
    { size: [0.34, 0.08, 0.12], pos: [0, -0.16, 0.47], color: 0xff9cf0 },
    { size: [0.12, 0.08, 0.12], pos: [-0.55, -0.16, 0.20], color: 0xff9cf0 },
    { size: [0.12, 0.08, 0.12], pos: [0.55, -0.16, 0.20], color: 0xff9cf0 },
    { size: [0.12, 0.08, 0.12], pos: [-0.55, -0.16, -0.20], color: 0xff9cf0 },
    { size: [0.12, 0.08, 0.12], pos: [0.55, -0.16, -0.20], color: 0xff9cf0 }
];

const OCTOPUS_TENTACLE_COUNT = 6;
const OCTOPUS_MOUNT_RADIUS = 0.42;
const OCTOPUS_MOUNT_Y = -0.30;

// Segments taper toward the tip; baseTilt splays then curls them back inward
const OCTOPUS_SEGMENTS = [
    { length: 0.34, width: 0.20, baseTilt: 0.55, color: 0xff3cf0 },
    { length: 0.30, width: 0.16, baseTilt: -0.20, color: 0xf215e0 },
    { length: 0.26, width: 0.12, baseTilt: -0.45, color: 0xd400c8 }
];

// Geometries and non-animated materials are built once and shared by every
// octopus in the formation
let octopusParts = null;

function getOctopusParts() {
    if (octopusParts) return octopusParts;

    const segmentGeometries = OCTOPUS_SEGMENTS.map(segment => {
        const cup = Math.max(0.05, segment.width * 0.36);
        // Origin sits at the top of the segment so it doubles as the joint pivot
        return buildVoxelGeometry([
            { size: [segment.width, segment.length, segment.width], pos: [0, -segment.length / 2, 0], color: segment.color },
            { size: [segment.width + 0.05, 0.07, segment.width + 0.05], pos: [0, -0.02, 0], color: 0x8e0aa6 },
            { size: [cup, cup, cup], pos: [-segment.width / 2, -segment.length * 0.3, 0], color: 0xffd6ff },
            { size: [cup, cup, cup], pos: [segment.width / 2, -segment.length * 0.5, 0], color: 0xffd6ff },
            { size: [cup, cup, cup], pos: [-segment.width / 2, -segment.length * 0.7, 0], color: 0xffd6ff }
        ]);
    });

    octopusParts = {
        mantleGeometry: buildVoxelGeometry(OCTOPUS_MANTLE),
        socketGeometry: buildVoxelGeometry(OCTOPUS_SOCKETS),
        eyeGeometry: buildVoxelGeometry(OCTOPUS_EYES),
        lidGeometry: buildVoxelGeometry(OCTOPUS_LIDS),
        ventGeometry: buildVoxelGeometry(OCTOPUS_VENTS),
        beakGeometry: new THREE.BoxGeometry(0.26, 0.14, 0.20),
        segmentGeometries,
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xb800c4,
            emissiveIntensity: 1.0,
            shininess: 30,
            flatShading: true
        }),
        socketMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x18001c,
            emissiveIntensity: 0.4,
            flatShading: true
        }),
        lidMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x8e0aa6,
            emissiveIntensity: 1.0,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xc800c8,
            emissiveIntensity: 1.3,
            flatShading: true
        }),
        beakMaterial: new THREE.MeshPhongMaterial({
            color: 0xffe0a8,
            emissive: 0xff9c3c,
            emissiveIntensity: 0.9,
            flatShading: true
        }),
        // Cloned per alien so each one can pulse on its own animation offset
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xffe23a,
            emissiveIntensity: 2.0,
            flatShading: true
        }),
        ventMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xff5cff,
            emissiveIntensity: 1.1,
            flatShading: true
        })
    };

    return octopusParts;
}

function createOctopusAlien(group) {
    const parts = getOctopusParts();

    const mantle = new THREE.Mesh(parts.mantleGeometry, parts.shellMaterial);
    mantle.castShadow = true;
    group.add(mantle);
    group.userData.mantle = mantle;

    group.add(new THREE.Mesh(parts.socketGeometry, parts.socketMaterial));

    const eyes = new THREE.Mesh(parts.eyeGeometry, parts.eyeMaterial.clone());
    group.add(eyes);
    group.userData.eyes = eyes;

    const lids = new THREE.Mesh(parts.lidGeometry, parts.lidMaterial);
    lids.position.y = OCTOPUS_LID_OPEN_Y;
    group.add(lids);
    group.userData.lids = lids;

    const vents = new THREE.Mesh(parts.ventGeometry, parts.ventMaterial.clone());
    group.add(vents);
    group.userData.vents = vents;

    // Beak halves chomp open and shut between the front tentacles
    const beakUpper = new THREE.Mesh(parts.beakGeometry, parts.beakMaterial);
    beakUpper.position.set(0, -0.40, 0.26);
    group.add(beakUpper);
    group.userData.beakUpper = beakUpper;

    const beakLower = new THREE.Mesh(parts.beakGeometry, parts.beakMaterial);
    beakLower.position.set(0, -0.52, 0.26);
    group.add(beakLower);
    group.userData.beakLower = beakLower;

    // Six tentacles, each a chain of nested segments so a curl travels down the
    // limb instead of the whole thing swinging rigidly
    group.userData.tentacles = [];
    for (let i = 0; i < OCTOPUS_TENTACLE_COUNT; i++) {
        const angle = (i / OCTOPUS_TENTACLE_COUNT) * Math.PI * 2;

        const mount = new THREE.Group();
        mount.position.set(
            Math.cos(angle) * OCTOPUS_MOUNT_RADIUS,
            OCTOPUS_MOUNT_Y,
            Math.sin(angle) * OCTOPUS_MOUNT_RADIUS
        );
        // Local +X now points away from the body, so Z rotation flexes outward
        mount.rotation.y = -angle;
        group.add(mount);

        const segments = [];
        let parent = mount;
        OCTOPUS_SEGMENTS.forEach((segment, j) => {
            const mesh = new THREE.Mesh(parts.segmentGeometries[j], parts.limbMaterial);
            mesh.position.y = j === 0 ? 0 : -OCTOPUS_SEGMENTS[j - 1].length;
            mesh.rotation.z = segment.baseTilt;
            mesh.userData.baseTilt = segment.baseTilt;
            parent.add(mesh);
            parent = mesh;
            segments.push(mesh);
        });

        group.userData.tentacles.push(segments);
    }
}

// ---------------------------------------------------------------------------
// Crab (row 1) - detailed voxel sculpt
// ---------------------------------------------------------------------------

// Low, wide carapace - the counterpoint to the octopus's tall dome
const CRAB_CARAPACE = [
    { size: [1.50, 0.18, 0.95], pos: [0, -0.04, 0.02], color: 0xd41414 },  // shell rim
    { size: [1.32, 0.24, 0.85], pos: [0, 0.14, 0.00], color: 0xff2a2a },
    { size: [1.00, 0.20, 0.68], pos: [0, 0.34, -0.02], color: 0xff4a3a },
    { size: [0.60, 0.14, 0.44], pos: [0, 0.48, -0.04], color: 0xff6b4a },  // crown
    { size: [1.10, 0.12, 0.70], pos: [0, -0.18, 0.02], color: 0x9c0d0d },  // underplate
    // Serrated front rim
    { size: [0.14, 0.10, 0.16], pos: [-0.56, -0.02, 0.50], color: 0xff4a3a },
    { size: [0.14, 0.10, 0.16], pos: [-0.28, -0.02, 0.52], color: 0xff4a3a },
    { size: [0.14, 0.10, 0.16], pos: [0.28, -0.02, 0.52], color: 0xff4a3a },
    { size: [0.14, 0.10, 0.16], pos: [0.56, -0.02, 0.50], color: 0xff4a3a },
    // Lateral spikes
    { size: [0.18, 0.12, 0.16], pos: [-0.78, -0.02, 0.10], color: 0xff4a3a },
    { size: [0.18, 0.12, 0.16], pos: [0.78, -0.02, 0.10], color: 0xff4a3a },
    { size: [0.14, 0.10, 0.14], pos: [-0.74, -0.02, -0.24], color: 0xd41414 },
    { size: [0.14, 0.10, 0.14], pos: [0.74, -0.02, -0.24], color: 0xd41414 },
    // Dark brow shading the eye stalks
    { size: [0.92, 0.12, 0.16], pos: [0, 0.30, 0.40], color: 0x6b0505 },
    // Shoulder blocks where the claw arms mount
    { size: [0.20, 0.22, 0.26], pos: [-0.66, 0.04, 0.34], color: 0xd41414 },
    { size: [0.20, 0.22, 0.26], pos: [0.66, 0.04, 0.34], color: 0xd41414 }
];

// Molten seams in the shell - the crab's answer to the octopus's vents
const CRAB_SEAMS = [
    { size: [0.44, 0.07, 0.16], pos: [0, 0.55, -0.02], color: 0xff8a1e },
    { size: [0.30, 0.07, 0.13], pos: [-0.30, 0.45, 0.12], color: 0xff8a1e },
    { size: [0.30, 0.07, 0.13], pos: [0.30, 0.45, 0.12], color: 0xff8a1e },
    { size: [0.15, 0.07, 0.32], pos: [-0.54, 0.26, -0.06], color: 0xff8a1e },
    { size: [0.15, 0.07, 0.32], pos: [0.54, 0.26, -0.06], color: 0xff8a1e }
];

// Compound eye: bright cyan block crossed by a dark slit
const CRAB_EYE = [
    { size: [0.22, 0.21, 0.21], pos: [0, 0.11, 0], color: 0x2ad8e8 },
    { size: [0.24, 0.06, 0.09], pos: [0, 0.13, 0.09], color: 0x04333a },
    { size: [0.24, 0.05, 0.07], pos: [0, 0.20, 0.00], color: 0x04333a }
];

const CRAB_MANDIBLE = [
    { size: [0.14, 0.12, 0.20], pos: [0, -0.06, 0.06], color: 0xffb08a }
];

// Stalks and limbs grow upward from their origin so the origin doubles as the joint
const CRAB_STALK_Y = 0.30;

const CRAB_STALK_SEGMENTS = [
    { length: 0.26, width: 0.13, baseTilt: 0.12 },
    { length: 0.22, width: 0.11, baseTilt: -0.20 }
];

// Arm segments run forward along +Z, so yaw swings the claw in and out,
// lift raises it, and the jaws hinge about X
const CRAB_ARM_SEGMENTS = [
    { length: 0.34, width: 0.22, yaw: 0.34, lift: -0.10 },   // upper arm, out and forward
    { length: 0.30, width: 0.19, yaw: -0.60, lift: 0.06 }    // forearm turns back inward
];

const CRAB_LEG_SEGMENTS = [
    { length: 0.34, width: 0.14, baseBend: 0.80 },   // femur, splays outward
    { length: 0.32, width: 0.10, baseBend: -1.15 }   // tibia, kinks back down
];

// Three legs per side; z offset places them front to back
const CRAB_LEG_MOUNTS = [
    { side: -1, z: 0.24, phase: 0 },
    { side: -1, z: -0.02, phase: Math.PI },
    { side: -1, z: -0.28, phase: 0 },
    { side: 1, z: 0.24, phase: Math.PI },
    { side: 1, z: -0.02, phase: 0 },
    { side: 1, z: -0.28, phase: Math.PI }
];

let crabParts = null;

// Arm segment that extends forward from its origin
function buildCrabArmGeometry(segment) {
    const height = segment.width * 0.9;
    return buildVoxelGeometry([
        { size: [segment.width, height, segment.length], pos: [0, 0, segment.length / 2], color: 0xff3a2a },
        { size: [segment.width + 0.05, height + 0.05, 0.07], pos: [0, 0, 0.03], color: 0x8c0808 }
    ]);
}

// Stalk segment that extends upward from its origin
function buildCrabStalkGeometry(segment) {
    return buildVoxelGeometry([
        { size: [segment.width, segment.length, segment.width], pos: [0, segment.length / 2, 0], color: 0xe01c1c },
        { size: [segment.width + 0.05, 0.06, segment.width + 0.05], pos: [0, 0.02, 0], color: 0x8c0808 }
    ]);
}

function getCrabParts() {
    if (crabParts) return crabParts;

    crabParts = {
        carapaceGeometry: buildVoxelGeometry(CRAB_CARAPACE),
        seamGeometry: buildVoxelGeometry(CRAB_SEAMS),
        eyeGeometry: buildVoxelGeometry(CRAB_EYE),
        mandibleGeometry: buildVoxelGeometry(CRAB_MANDIBLE),
        stalkGeometries: CRAB_STALK_SEGMENTS.map(buildCrabStalkGeometry),
        armGeometries: CRAB_ARM_SEGMENTS.map(buildCrabArmGeometry),
        legGeometries: CRAB_LEG_SEGMENTS.map(s => buildLimbSegmentGeometry(s, 0xe01c1c, 0x8c0808)),
        // Pincer jaws: a tapered blade with a lighter biting edge
        jawGeometry: buildVoxelGeometry([
            { size: [0.19, 0.13, 0.34], pos: [0, 0, 0.17], color: 0xff3a2a },
            { size: [0.15, 0.06, 0.18], pos: [0, 0, 0.41], color: 0xffb08a }
        ]),
        // Palm block the jaws hinge from
        palmGeometry: buildVoxelGeometry([
            { size: [0.26, 0.30, 0.26], pos: [0, 0, 0.11], color: 0xff3a2a },
            { size: [0.28, 0.09, 0.10], pos: [0, 0, 0.02], color: 0x8c0808 }
        ]),
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xa81010,
            emissiveIntensity: 1.0,
            shininess: 40,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xb01414,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        // Cloned per alien so each one pulses on its own animation offset
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x00c8e0,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        seamMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xff7a10,
            emissiveIntensity: 1.2,
            flatShading: true
        })
    };

    return crabParts;
}

function createCrabAlien(group) {
    const parts = getCrabParts();
    const eyeMaterial = parts.eyeMaterial.clone();

    const carapace = new THREE.Mesh(parts.carapaceGeometry, parts.shellMaterial);
    carapace.castShadow = true;
    group.add(carapace);
    group.userData.carapace = carapace;

    const seams = new THREE.Mesh(parts.seamGeometry, parts.seamMaterial.clone());
    group.add(seams);
    group.userData.seams = seams;

    // Chattering mandibles under the front rim
    group.userData.mandibles = [-1, 1].map(side => {
        const mandible = new THREE.Mesh(parts.mandibleGeometry, parts.limbMaterial);
        mandible.position.set(side * 0.13, -0.14, 0.44);
        group.add(mandible);
        return mandible;
    });

    // Two jointed eye stalks that swivel and retract independently
    group.userData.stalks = [-1, 1].map(side => {
        const mount = new THREE.Group();
        mount.position.set(side * 0.32, CRAB_STALK_Y, 0.26);
        group.add(mount);

        const segments = buildLimbChain(mount, parts.stalkGeometries, CRAB_STALK_SEGMENTS, parts.limbMaterial, 1);

        const eye = new THREE.Mesh(parts.eyeGeometry, eyeMaterial);
        eye.position.y = CRAB_STALK_SEGMENTS[1].length;
        segments[1].add(eye);

        return { mount, segments, eye, side };
    });

    // Pincer claws on jointed arms - the arm thrusts as the jaws snap
    group.userData.claws = [-1, 1].map(side => {
        const mount = new THREE.Group();
        mount.position.set(side * 0.74, 0.06, 0.42);
        group.add(mount);

        // Arm segments chain forward along +Z; mirroring yaw keeps both arms
        // sweeping outward from the body
        const segments = [];
        let parent = mount;
        CRAB_ARM_SEGMENTS.forEach((segment, j) => {
            const mesh = new THREE.Mesh(parts.armGeometries[j], parts.limbMaterial);
            mesh.position.z = j === 0 ? 0 : CRAB_ARM_SEGMENTS[j - 1].length;
            mesh.rotation.y = side * segment.yaw;
            mesh.rotation.x = segment.lift;
            mesh.userData.baseYaw = side * segment.yaw;
            mesh.userData.baseLift = segment.lift;
            parent.add(mesh);
            parent = mesh;
            segments.push(mesh);
        });

        const palm = new THREE.Group();
        palm.position.z = CRAB_ARM_SEGMENTS[1].length;
        segments[1].add(palm);
        palm.add(new THREE.Mesh(parts.palmGeometry, parts.limbMaterial));

        // Jaws hinge about X so the pincer opens vertically, facing the player
        const jawUpper = new THREE.Mesh(parts.jawGeometry, parts.limbMaterial);
        jawUpper.position.y = 0.09;
        palm.add(jawUpper);

        const jawLower = new THREE.Mesh(parts.jawGeometry, parts.limbMaterial);
        jawLower.position.y = -0.09;
        palm.add(jawLower);

        return { mount, segments, jawUpper, jawLower, side };
    });

    // Six walking legs with a real knee bend, driven as alternating tripods
    group.userData.legs = CRAB_LEG_MOUNTS.map(config => {
        const mount = new THREE.Group();
        mount.position.set(config.side * 0.62, -0.10, config.z);
        // Local +X points outward on both sides, so Z rotation always splays out
        mount.rotation.y = config.side > 0 ? 0 : Math.PI;
        group.add(mount);

        const segments = buildLimbChain(mount, parts.legGeometries, CRAB_LEG_SEGMENTS, parts.limbMaterial, -1);

        return { mount, segments, phase: config.phase, side: config.side };
    });
}

// ---------------------------------------------------------------------------
// Squid (row 2) - jet-propelled voxel sculpt
// ---------------------------------------------------------------------------

// Mantle: tapering tiers from a pointed tail down to the collar. saucerTier()
// (shared with the UFO hull) unions three boxes into a cut-corner disc, which
// reads as a round mantle where a plain stack of boxes would look like a
// chimney.
const SQUID_MANTLE = [
    ...saucerTier(0.18, 0.16, 0.16, 1.00, 0xb4ffb8),
    ...saucerTier(0.38, 0.32, 0.17, 0.85, 0x5cff64),
    ...saucerTier(0.56, 0.46, 0.19, 0.68, 0x2cec38),
    ...saucerTier(0.70, 0.58, 0.20, 0.49, 0x14cc20),
    ...saucerTier(0.80, 0.66, 0.20, 0.29, 0x11b81c),
    ...saucerTier(0.82, 0.68, 0.20, 0.09, 0x0fa418),
    ...saucerTier(0.74, 0.62, 0.14, -0.05, 0x0a7d14),   // collar
    // Dorsal keel running down the back of the hood
    { size: [0.10, 0.16, 0.32], pos: [0, 0.86, -0.16], color: 0x7cff88 },
    { size: [0.12, 0.16, 0.28], pos: [0, 0.66, -0.28], color: 0x3cf048 },
    { size: [0.12, 0.14, 0.24], pos: [0, 0.44, -0.33], color: 0x22d02e },
    // Darker belly panels, so the front reads as underside rather than more back
    { size: [0.56, 0.50, 0.10], pos: [0, 0.30, 0.30], color: 0x0c8c16 },
    { size: [0.60, 0.46, 0.09], pos: [0, 0.08, 0.31], color: 0x0a7d14 }
];

// Chromatophore spots scattered over the skin - these carry most of the bloom
// and flush together on the jet
const SQUID_SPOTS = [
    { size: [0.11, 0.11, 0.06], pos: [-0.17, 0.62, 0.23], color: 0x8cffb4 },
    { size: [0.09, 0.09, 0.06], pos: [0.13, 0.47, 0.29], color: 0xc8ffd8 },
    { size: [0.12, 0.12, 0.06], pos: [-0.05, 0.28, 0.33], color: 0x8cffb4 },
    { size: [0.08, 0.08, 0.06], pos: [0.21, 0.13, 0.32], color: 0xc8ffd8 },
    { size: [0.06, 0.11, 0.13], pos: [-0.36, 0.36, 0.05], color: 0x8cffb4 },
    { size: [0.06, 0.09, 0.11], pos: [0.36, 0.50, -0.06], color: 0xc8ffd8 },
    { size: [0.06, 0.10, 0.12], pos: [-0.39, 0.14, -0.12], color: 0x8cffb4 },
    { size: [0.06, 0.09, 0.11], pos: [0.38, 0.24, 0.12], color: 0x8cffb4 },
    { size: [0.10, 0.10, 0.06], pos: [0.09, 0.62, -0.26], color: 0xc8ffd8 },
    { size: [0.10, 0.10, 0.06], pos: [-0.13, 0.36, -0.31], color: 0x8cffb4 }
];

// Head under the collar: eye pods, jaw plate and the beak between the arms
const SQUID_HEAD = [
    { size: [0.62, 0.20, 0.54], pos: [0, -0.16, 0.00], color: 0x0fa418 },
    { size: [0.66, 0.09, 0.18], pos: [0, -0.04, 0.24], color: 0x075c0e },   // brow
    { size: [0.30, 0.30, 0.24], pos: [-0.28, -0.18, 0.14], color: 0x064a0c },
    { size: [0.30, 0.30, 0.24], pos: [0.28, -0.18, 0.14], color: 0x064a0c },
    { size: [0.46, 0.14, 0.20], pos: [0, -0.32, 0.16], color: 0x0a7d14 },   // jaw plate
    { size: [0.18, 0.14, 0.16], pos: [0, -0.44, 0.06], color: 0x053c0a },
    { size: [0.14, 0.09, 0.10], pos: [0, -0.51, 0.08], color: 0xd8ffc8 }    // beak tip
];

// Iris plus a horizontal slit pupil, merged so both eyes pulse as one mesh
const SQUID_EYES = [
    { size: [0.26, 0.24, 0.12], pos: [-0.30, -0.17, 0.26], color: 0xff2a1e },
    { size: [0.26, 0.24, 0.12], pos: [0.30, -0.17, 0.26], color: 0xff2a1e },
    { size: [0.17, 0.07, 0.06], pos: [-0.30, -0.17, 0.325], color: 0xfff0d0 },
    { size: [0.17, 0.07, 0.06], pos: [0.30, -0.17, 0.325], color: 0xfff0d0 }
];

// Nictitating lids, parked up under the brow until a blink drops them
const SQUID_LIDS = [
    { size: [0.30, 0.16, 0.16], pos: [-0.30, 0, 0.29], color: 0x0a7d14 },
    { size: [0.30, 0.16, 0.16], pos: [0.30, 0, 0.29], color: 0x0a7d14 }
];
const SQUID_LID_OPEN_Y = 0.04;
const SQUID_LID_CLOSED_Y = -0.17;

// One side fin, hinged at the mantle wall so it can undulate outward
const SQUID_FIN = [
    { size: [0.26, 0.10, 0.56], pos: [-0.13, 0, -0.02], color: 0x2cec38 },
    { size: [0.22, 0.08, 0.44], pos: [-0.34, 0, -0.06], color: 0x1ed42a },
    { size: [0.13, 0.06, 0.26], pos: [-0.51, 0, -0.12], color: 0x14bc20 },
    { size: [0.58, 0.05, 0.07], pos: [-0.29, 0.035, 0.22], color: 0x9cff9c }, // leading edge
    { size: [0.10, 0.07, 0.50], pos: [-0.05, -0.02, -0.02], color: 0x0a7d14 } // root rib
];
const SQUID_FIN_X = 0.26;
const SQUID_FIN_Y = 0.52;

// Siphon slung under the head - the nozzle the jet fires from
const SQUID_SIPHON = [
    { size: [0.24, 0.18, 0.24], pos: [0, -0.28, 0.30], color: 0x3cff5a },
    { size: [0.18, 0.12, 0.12], pos: [0, -0.30, 0.44], color: 0x9cffb4 },
    { size: [0.12, 0.08, 0.06], pos: [0, -0.31, 0.52], color: 0xe0ffd8 }
];

// Expelled water, hidden until a thrust burst. Kept inside a ~0.95 reach so it
// never pokes into the neighbouring column.
const SQUID_PLUME = [
    { size: [0.14, 0.14, 0.20], pos: [0, -0.31, 0.62], color: 0xe0ffd8 },
    { size: [0.20, 0.20, 0.20], pos: [0, -0.32, 0.74], color: 0x6cff86 },
    { size: [0.26, 0.26, 0.14], pos: [0, -0.33, 0.85], color: 0x1a9f2a }
];

const SQUID_ARM_COUNT = 6;
const SQUID_ARM_RADIUS = 0.24;
const SQUID_ARM_Y = -0.44;

// Arms taper toward the tip; baseBend splays them then curls them back inward
const SQUID_ARM_SEGMENTS = [
    { length: 0.30, width: 0.17, baseBend: 0.42, color: 0x22d02e },
    { length: 0.26, width: 0.13, baseBend: -0.28, color: 0x16a820 },
    { length: 0.22, width: 0.10, baseBend: -0.52, color: 0x0f8a18 }
];

// The two long feeding tentacles hang almost straight and lash on a strike
const SQUID_TENTACLE_SEGMENTS = [
    { length: 0.30, width: 0.11, baseBend: 0.16, color: 0x1ed42a },
    { length: 0.28, width: 0.09, baseBend: -0.10, color: 0x16a820 },
    { length: 0.26, width: 0.07, baseBend: -0.14, color: 0x0f8a18 }
];
const SQUID_TENTACLE_Y = -0.46;
// Yaw aims each tentacle's local +X outward; the forward lash rides on a
// separate un-yawed pivot so both sides strike toward the player
const SQUID_TENTACLE_MOUNTS = [
    { side: -1, yaw: Math.PI + 0.7 },
    { side: 1, yaw: -0.7 }
];

// Geometries and non-animated materials are built once and shared by every
// squid in the formation
let squidParts = null;

// Arm segment with a row of suckers on its inner face
function buildSquidArmGeometry(segment) {
    const sucker = Math.max(0.05, segment.width * 0.32);
    const inner = -segment.width / 2;
    // Origin sits at the top of the segment so it doubles as the joint pivot
    return buildVoxelGeometry([
        { size: [segment.width, segment.length, segment.width * 0.85], pos: [0, -segment.length / 2, 0], color: segment.color },
        { size: [segment.width + 0.04, 0.06, segment.width * 0.85 + 0.04], pos: [0, -0.02, 0], color: 0x075c0e },
        { size: [sucker, sucker, sucker], pos: [inner, -segment.length * 0.28, 0], color: 0xd8ffc8 },
        { size: [sucker, sucker, sucker], pos: [inner, -segment.length * 0.55, 0], color: 0xd8ffc8 },
        { size: [sucker, sucker, sucker], pos: [inner, -segment.length * 0.82, 0], color: 0xd8ffc8 }
    ]);
}

function getSquidParts() {
    if (squidParts) return squidParts;

    squidParts = {
        mantleGeometry: buildVoxelGeometry(SQUID_MANTLE),
        spotGeometry: buildVoxelGeometry(SQUID_SPOTS),
        headGeometry: buildVoxelGeometry(SQUID_HEAD),
        eyeGeometry: buildVoxelGeometry(SQUID_EYES),
        lidGeometry: buildVoxelGeometry(SQUID_LIDS),
        siphonGeometry: buildVoxelGeometry(SQUID_SIPHON),
        plumeGeometry: buildVoxelGeometry(SQUID_PLUME),
        finGeometries: {
            '-1': buildVoxelGeometry(SQUID_FIN),
            '1': buildVoxelGeometry(mirrorBoxes(SQUID_FIN))
        },
        armGeometries: SQUID_ARM_SEGMENTS.map(buildSquidArmGeometry),
        tentacleGeometries: SQUID_TENTACLE_SEGMENTS.map(s => buildLimbSegmentGeometry(s, s.color, 0x075c0e)),
        // Paddle club on the end of each feeding tentacle
        clubGeometry: buildVoxelGeometry([
            { size: [0.15, 0.24, 0.11], pos: [0, -0.12, 0], color: 0x2ee03a },
            { size: [0.07, 0.07, 0.05], pos: [-0.08, -0.07, 0], color: 0xd8ffc8 },
            { size: [0.07, 0.07, 0.05], pos: [-0.08, -0.17, 0], color: 0xd8ffc8 }
        ]),
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x0a8c16,
            emissiveIntensity: 1.0,
            shininess: 45,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x0f9c1a,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        lidMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x086010,
            emissiveIntensity: 0.9,
            flatShading: true
        }),
        // Cloned per alien so each squid pulses on its own animation offset
eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x000000,
            emissiveIntensity: 0,
            flatShading: true
        }),
        eyeHighlightMaterial: new THREE.MeshPhongMaterial({
            color: 0xffdd66,
            emissive: 0xffaa00,
            emissiveIntensity: 0.6,
            flatShading: true
        }),
        spotMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x6cff9c,
            emissiveIntensity: 1.0,
            flatShading: true
        }),
        siphonMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x5cff78,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        plumeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x8cffa0,
            emissiveIntensity: 1.4,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            flatShading: true
        })
    };

    return squidParts;
}

function createSquidAlien(group) {
    const parts = getSquidParts();

    // The mantle carries the squash and stretch. Scaling it rather than the
    // group leaves alien.scale free for the swoop telegraph.
    const mantle = new THREE.Mesh(parts.mantleGeometry, parts.shellMaterial);
    mantle.castShadow = true;
    group.add(mantle);
    group.userData.mantle = mantle;

    // Spots ride on the mantle so they flex with it
    const spots = new THREE.Mesh(parts.spotGeometry, parts.spotMaterial.clone());
    mantle.add(spots);
    group.userData.spots = spots;

    // Head cranes against the body pitch; eyes and lids are parented to it so
    // they stay in their sockets while it moves
    const head = new THREE.Mesh(parts.headGeometry, parts.shellMaterial);
    group.add(head);
    group.userData.head = head;

    const eyes = new THREE.Mesh(parts.eyeGeometry, parts.eyeMaterial.clone());
    head.add(eyes);
    group.userData.eyes = eyes;

    const lids = new THREE.Mesh(parts.lidGeometry, parts.lidMaterial);
    lids.position.y = SQUID_LID_OPEN_Y;
    head.add(lids);
    group.userData.lids = lids;

    const siphon = new THREE.Mesh(parts.siphonGeometry, parts.siphonMaterial.clone());
    group.add(siphon);
    group.userData.siphon = siphon;

    const plume = new THREE.Mesh(parts.plumeGeometry, parts.plumeMaterial.clone());
    plume.visible = false;
    group.add(plume);
    group.userData.plume = plume;

    // Side fins hinge at the mantle wall. Mirrored geometry rather than
    // scale.x = -1, which would invert the normals on one side.
    group.userData.fins = [-1, 1].map(side => {
        const fin = new THREE.Mesh(parts.finGeometries[side], parts.shellMaterial);
        fin.position.set(side * SQUID_FIN_X, SQUID_FIN_Y, -0.02);
        fin.castShadow = true;
        group.add(fin);
        return { mesh: fin, side };
    });

    // Arm crown: each arm is a chain of nested segments, so a curl travels down
    // the limb instead of the whole thing swinging rigidly
    group.userData.arms = [];
    for (let i = 0; i < SQUID_ARM_COUNT; i++) {
        const angle = (i / SQUID_ARM_COUNT) * Math.PI * 2;

        const mount = new THREE.Group();
        mount.position.set(
            Math.cos(angle) * SQUID_ARM_RADIUS,
            SQUID_ARM_Y,
            Math.sin(angle) * SQUID_ARM_RADIUS
        );
        // Local +X now points away from the crown, so Z rotation splays outward
        mount.rotation.y = -angle;
        group.add(mount);

        const segments = buildLimbChain(mount, parts.armGeometries, SQUID_ARM_SEGMENTS, parts.limbMaterial, -1);

        group.userData.arms.push({ mount, segments, phase: i * 0.9 });
    }

    // Two long feeding tentacles. The pivot is un-yawed so a rotation about its
    // X axis lashes both tentacles toward the player; the mount under it holds
    // the outward yaw the segment bends splay against.
    group.userData.tentacles = SQUID_TENTACLE_MOUNTS.map(config => {
        const pivot = new THREE.Group();
        pivot.position.set(config.side * 0.20, SQUID_TENTACLE_Y, 0.20);
        group.add(pivot);

        const mount = new THREE.Group();
        mount.rotation.y = config.yaw;
        pivot.add(mount);

        const segments = buildLimbChain(mount, parts.tentacleGeometries, SQUID_TENTACLE_SEGMENTS, parts.limbMaterial, -1);

        const club = new THREE.Mesh(parts.clubGeometry, parts.limbMaterial);
        club.position.y = -SQUID_TENTACLE_SEGMENTS[2].length;
        segments[2].add(club);

        return { pivot, mount, segments, club, side: config.side };
    });
}

// ---------------------------------------------------------------------------
// UFO (row 3) - hard-surface saucer
// ---------------------------------------------------------------------------

const UFO_HULL = [
    // Stacked discs taper up from the rim into the fuselage
    ...saucerTier(1.68, 1.12, 0.13, -0.06, 0xd8a800),   // rim, darker trim
    ...saucerTier(1.34, 0.90, 0.16, 0.07, 0xffe814),
    ...saucerTier(0.96, 0.64, 0.14, 0.21, 0xfff268),
    // Underside taper
    ...saucerTier(1.16, 0.78, 0.12, -0.18, 0xb8860b),
    ...saucerTier(0.62, 0.42, 0.10, -0.28, 0x8a6508),
    // Hull panel seams across the rim
    { size: [1.74, 0.05, 0.10], pos: [0, 0.02, 0], color: 0x8a6508 },
    { size: [0.10, 0.05, 1.74], pos: [0, 0.02, 0], color: 0x8a6508 },
    // Landing struts tucked under the rim
    { size: [0.12, 0.20, 0.12], pos: [-0.52, -0.34, 0.52], color: 0x8a6508 },
    { size: [0.12, 0.20, 0.12], pos: [0.52, -0.34, 0.52], color: 0x8a6508 },
    { size: [0.12, 0.20, 0.12], pos: [-0.52, -0.34, -0.52], color: 0x8a6508 },
    { size: [0.12, 0.20, 0.12], pos: [0.52, -0.34, -0.52], color: 0x8a6508 }
];

// Canopy tiers, kept translucent so the pilot reads through them
const UFO_DOME = [
    ...saucerTier(0.66, 0.46, 0.14, 0.35, 0x9ff5ff),
    ...saucerTier(0.48, 0.34, 0.14, 0.49, 0xc8faff),
    { size: [0.24, 0.10, 0.24], pos: [0, 0.60, 0], color: 0xe8feff }
];

// A pilot silhouette inside the canopy
const UFO_PILOT = [
    { size: [0.24, 0.20, 0.20], pos: [0, 0.44, 0], color: 0x86b32e },
    { size: [0.16, 0.12, 0.14], pos: [0, 0.31, 0], color: 0x5e8020 },
    { size: [0.05, 0.05, 0.04], pos: [-0.06, 0.47, 0.10], color: 0xff3b3b },
    { size: [0.05, 0.05, 0.04], pos: [0.06, 0.47, 0.10], color: 0xff3b3b }
];

// Downward scan beam, hidden until a sweep fires
const UFO_BEAM = [
    { size: [0.30, 0.40, 0.30], pos: [0, -0.60, 0], color: 0x9ff8ff },
    { size: [0.46, 0.40, 0.46], pos: [0, -1.00, 0], color: 0x4fc0e0 },
    { size: [0.62, 0.40, 0.62], pos: [0, -1.40, 0], color: 0x1a5a70 }
];

const UFO_LIGHT_COUNT = 8;
const UFO_LIGHT_RADIUS = 0.84;

let ufoParts = null;

function getUfoParts() {
    if (ufoParts) return ufoParts;

    // Rotating collar the running lights are mounted to
    const ringBoxes = [];
    for (let i = 0; i < UFO_LIGHT_COUNT; i++) {
        const angle = (i / UFO_LIGHT_COUNT) * Math.PI * 2;
        ringBoxes.push({
            size: [0.30, 0.10, 0.16],
            pos: [Math.cos(angle) * 0.74, -0.02, Math.sin(angle) * 0.74],
            rotY: -angle,
            color: 0x8a6508
        });
    }

    ufoParts = {
        hullGeometry: buildVoxelGeometry(UFO_HULL),
        domeGeometry: buildVoxelGeometry(UFO_DOME),
        pilotGeometry: buildVoxelGeometry(UFO_PILOT),
        beamGeometry: buildVoxelGeometry(UFO_BEAM),
        ringGeometry: buildVoxelGeometry(ringBoxes),
        lightGeometry: buildVoxelGeometry([
            { size: [0.14, 0.14, 0.14], pos: [0, 0, 0], color: 0x8ffcff }
        ]),
        emitterGeometry: buildVoxelGeometry([
            { size: [0.34, 0.10, 0.34], pos: [0, -0.36, 0], color: 0x6fe8ff },
            { size: [0.22, 0.08, 0.22], pos: [0, -0.44, 0], color: 0xc8faff }
        ]),
        hullMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xb8860b,
            emissiveIntensity: 0.85,
            shininess: 100,
            flatShading: true
        }),
        ringMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x7a5a08,
            emissiveIntensity: 0.7,
            flatShading: true
        }),
        pilotMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x2e4a08,
            emissiveIntensity: 1.1,
            flatShading: true
        }),
        // Cloned per alien (and per light) so each can pulse independently
        domeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x2ad8f0,
            emissiveIntensity: 0.7,
            shininess: 120,
            flatShading: true,
            transparent: true,
            opacity: 0.42
        }),
        lightMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.5,
            flatShading: true
        }),
        beamMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x5fe0ff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            flatShading: true
        })
    };

    return ufoParts;
}

function createUFOAlien(group) {
    const parts = getUfoParts();

    // Hull spins on its own axis so the canopy and pilot stay level
    const hull = new THREE.Mesh(parts.hullGeometry, parts.hullMaterial);
    hull.castShadow = true;
    group.add(hull);
    group.userData.hull = hull;

    const dome = new THREE.Mesh(parts.domeGeometry, parts.domeMaterial.clone());
    group.add(dome);
    group.userData.dome = dome;

    const pilot = new THREE.Mesh(parts.pilotGeometry, parts.pilotMaterial);
    group.add(pilot);
    group.userData.pilot = pilot;

    // Light collar counter-rotates against the hull
    const ring = new THREE.Group();
    group.add(ring);
    group.userData.ring = ring;
    ring.add(new THREE.Mesh(parts.ringGeometry, parts.ringMaterial));

    group.userData.lights = [];
    for (let i = 0; i < UFO_LIGHT_COUNT; i++) {
        const angle = (i / UFO_LIGHT_COUNT) * Math.PI * 2;
        // Each light owns its material - a shared one would make the chase
        // write the same intensity eight times and never actually chase
        const light = new THREE.Mesh(parts.lightGeometry, parts.lightMaterial.clone());
        light.position.set(
            Math.cos(angle) * UFO_LIGHT_RADIUS,
            -0.02,
            Math.sin(angle) * UFO_LIGHT_RADIUS
        );
        ring.add(light);
        group.userData.lights.push(light);
    }

    const emitter = new THREE.Mesh(parts.emitterGeometry, parts.domeMaterial.clone());
    group.add(emitter);
    group.userData.emitter = emitter;

    const beam = new THREE.Mesh(parts.beamGeometry, parts.beamMaterial.clone());
    beam.visible = false;
    group.add(beam);
    group.userData.beam = beam;
}

// ---------------------------------------------------------------------------
// Tank (row 4) - armoured chassis with rolling treads
// ---------------------------------------------------------------------------

// Sloped and stepped armour rather than one slab
const TANK_HULL = [
    { size: [1.28, 0.30, 1.28], pos: [0, -0.06, 0], color: 0x1fb8c4 },       // lower hull
    { size: [1.08, 0.22, 1.02], pos: [0, 0.20, 0], color: 0x2ad4e0 },        // upper deck
    { size: [1.04, 0.34, 0.12], pos: [0, 0.10, 0.60], rotX: -0.60, color: 0x2ad4e0 },  // glacis
    { size: [0.98, 0.26, 0.12], pos: [0, 0.12, -0.60], rotX: 0.40, color: 0x0d6b78 },  // rear plate
    // Side skirts armouring the treads, with fenders over the top
    { size: [0.10, 0.18, 1.22], pos: [-0.70, 0.09, 0], color: 0x0d6b78 },
    { size: [0.10, 0.18, 1.22], pos: [0.70, 0.09, 0], color: 0x0d6b78 },
    { size: [0.26, 0.06, 1.34], pos: [-0.62, 0.20, 0], color: 0x1fb8c4 },
    { size: [0.26, 0.06, 1.34], pos: [0.62, 0.20, 0], color: 0x1fb8c4 },
    // Bolt heads across the glacis
    { size: [0.08, 0.08, 0.08], pos: [-0.36, 0.22, 0.56], color: 0x0a4a55 },
    { size: [0.08, 0.08, 0.08], pos: [0.36, 0.22, 0.56], color: 0x0a4a55 },
    { size: [0.08, 0.08, 0.08], pos: [-0.36, -0.06, 0.66], color: 0x0a4a55 },
    { size: [0.08, 0.08, 0.08], pos: [0.36, -0.06, 0.66], color: 0x0a4a55 },
    // Exhaust stacks at the rear deck
    { size: [0.11, 0.20, 0.11], pos: [-0.34, 0.32, -0.42], color: 0x0a4a55 },
    { size: [0.11, 0.20, 0.11], pos: [0.34, 0.32, -0.42], color: 0x0a4a55 },
    // Stowage box
    { size: [0.44, 0.14, 0.20], pos: [0, 0.28, -0.44], color: 0x0d6b78 },
    // Bogie frames the track belts ride around
    { size: [0.16, 0.24, 0.92], pos: [-0.58, -0.20, 0], color: 0x0a4a55 },
    { size: [0.16, 0.24, 0.92], pos: [0.58, -0.20, 0], color: 0x0a4a55 }
];

// Turret yaws as one piece, so it is built in its own local space
const TANK_TURRET = [
    { size: [0.64, 0.09, 0.64], pos: [0, 0.34, 0], color: 0x0d6b78 },        // turret ring
    { size: [0.72, 0.26, 0.78], pos: [0, 0.50, 0.02], color: 0x2ad4e0 },
    { size: [0.60, 0.30, 0.12], pos: [0, 0.48, 0.42], rotX: -0.50, color: 0x2ad4e0 },  // sloped face
    { size: [0.48, 0.08, 0.54], pos: [0, 0.66, 0.02], color: 0x37e4f0 },     // roof
    { size: [0.32, 0.24, 0.18], pos: [0, 0.46, 0.44], color: 0x0d6b78 },     // mantlet
    { size: [0.22, 0.13, 0.22], pos: [0.15, 0.74, -0.10], color: 0x1fb8c4 }, // cupola
    { size: [0.07, 0.16, 0.07], pos: [-0.20, 0.76, -0.24], color: 0x0a4a55 } // radar mast
];

// Energy coils - the tank's glowing accent, charging between shots
const TANK_COILS = [
    { size: [0.90, 0.06, 0.09], pos: [0, 0.32, 0.44], color: 0x7ff8ff },
    { size: [0.09, 0.06, 0.60], pos: [-0.50, 0.24, -0.10], color: 0x7ff8ff },
    { size: [0.09, 0.06, 0.60], pos: [0.50, 0.24, -0.10], color: 0x7ff8ff },
    { size: [0.10, 0.09, 0.10], pos: [-0.34, 0.43, -0.42], color: 0xc8feff },
    { size: [0.10, 0.09, 0.10], pos: [0.34, 0.43, -0.42], color: 0xc8feff }
];

const TANK_TREAD_X = 0.58;
const TANK_TREAD_PLATES = 14;
const TANK_WHEEL_Z = [-0.40, 0, 0.40];
const TANK_WHEEL_SIZE = 0.26;
// Tread path: two straight runs joined by semicircles at each end
const TANK_TREAD_RUN = 0.80;
const TANK_TREAD_RADIUS = 0.20;

// Position along the tread loop, 0..1, returning the local Y/Z and the angle
// the plate should sit at
function treadPointAt(u) {
    const run = TANK_TREAD_RUN;
    const r = TANK_TREAD_RADIUS;
    const half = run / 2;
    const arc = Math.PI * r;
    const perimeter = 2 * run + 2 * arc;
    let s = ((u % 1) + 1) % 1 * perimeter;

    if (s < run) {                       // bottom run, front-ward
        return { y: -r, z: -half + s, angle: 0 };
    }
    s -= run;
    if (s < arc) {                       // front sprocket
        const t = s / r;
        return { y: -r * Math.cos(t), z: half + r * Math.sin(t), angle: t };
    }
    s -= arc;
    if (s < run) {                       // top run, rear-ward
        return { y: r, z: half - s, angle: Math.PI };
    }
    s -= run;
    const t = s / r;                     // rear sprocket
    return { y: r * Math.cos(t), z: -half - r * Math.sin(t), angle: Math.PI + t };
}

let tankParts = null;

function getTankParts() {
    if (tankParts) return tankParts;

    tankParts = {
        hullGeometry: buildVoxelGeometry(TANK_HULL),
        turretGeometry: buildVoxelGeometry(TANK_TURRET),
        coilGeometry: buildVoxelGeometry(TANK_COILS),
        // Barrel runs forward from its breech so recoil is a slide along Z
        barrelGeometry: buildVoxelGeometry([
            { size: [0.13, 0.13, 0.64], pos: [0, 0, 0.32], color: 0x1fb8c4 },
            { size: [0.17, 0.17, 0.09], pos: [0, 0, 0.30], color: 0x0a4a55 },
            { size: [0.19, 0.19, 0.15], pos: [0, 0, 0.68], color: 0x0d6b78 }   // muzzle brake
        ]),
        muzzleGeometry: buildVoxelGeometry([
            { size: [0.26, 0.26, 0.10], pos: [0, 0, 0], color: 0xd8ffff },
            { size: [0.14, 0.14, 0.22], pos: [0, 0, 0.08], color: 0x9ff4ff }
        ]),
        dishGeometry: buildVoxelGeometry([
            { size: [0.26, 0.05, 0.20], pos: [0, 0, 0.04], color: 0x37e4f0 },
            { size: [0.06, 0.05, 0.06], pos: [0, 0, -0.06], color: 0x0a4a55 }
        ]),
        // Contrasting spokes make the wheel rotation legible
        wheelGeometry: buildVoxelGeometry([
            { size: [0.08, TANK_WHEEL_SIZE, TANK_WHEEL_SIZE], pos: [0, 0, 0], color: 0x0d6b78 },
            { size: [0.09, TANK_WHEEL_SIZE, 0.06], pos: [0, 0, 0], color: 0x37e4f0 },
            { size: [0.09, 0.06, TANK_WHEEL_SIZE], pos: [0, 0, 0], color: 0x37e4f0 }
        ]),
        plateGeometry: buildVoxelGeometry([
            { size: [0.30, 0.07, 0.19], pos: [0, 0, 0], color: 0x14555f },
            { size: [0.32, 0.04, 0.07], pos: [0, 0.03, 0], color: 0x2a8a99 }
        ]),
        armourMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x0a5a66,
            emissiveIntensity: 0.9,
            shininess: 60,
            flatShading: true
        }),
        treadMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x062a33,
            emissiveIntensity: 0.5,
            flatShading: true
        }),
        // Cloned per alien so charge and muzzle flash run on each tank's own clock
        coilMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        muzzleMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x9ff4ff,
            emissiveIntensity: 1.8,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            flatShading: true
        })
    };

    return tankParts;
}

function createTankAlien(group) {
    const parts = getTankParts();

    const hull = new THREE.Mesh(parts.hullGeometry, parts.armourMaterial);
    hull.castShadow = true;
    group.add(hull);
    group.userData.hull = hull;

    const coils = new THREE.Mesh(parts.coilGeometry, parts.coilMaterial.clone());
    group.add(coils);
    group.userData.coils = coils;

    // Turret assembly yaws to track the player
    const turret = new THREE.Group();
    group.add(turret);
    group.userData.turret = turret;
    turret.add(new THREE.Mesh(parts.turretGeometry, parts.armourMaterial));

    // Sweeping radar dish on the turret rear
    const dish = new THREE.Mesh(parts.dishGeometry, parts.armourMaterial);
    dish.position.set(-0.20, 0.86, -0.24);
    turret.add(dish);
    group.userData.dish = dish;

    // Barrel slides back into the mantlet on recoil
    const barrel = new THREE.Mesh(parts.barrelGeometry, parts.armourMaterial);
    barrel.position.set(0, 0.46, 0.44);
    turret.add(barrel);
    group.userData.barrel = barrel;
    group.userData.barrelRestZ = 0.44;

    const muzzle = new THREE.Mesh(parts.muzzleGeometry, parts.muzzleMaterial.clone());
    muzzle.position.set(0, 0, 0.80);
    muzzle.visible = false;
    barrel.add(muzzle);
    group.userData.muzzle = muzzle;

    // Road wheels and a loop of tread plates per side
    group.userData.wheels = [];
    group.userData.treadPlates = [];
    [-1, 1].forEach(side => {
        TANK_WHEEL_Z.forEach(z => {
            const wheel = new THREE.Mesh(parts.wheelGeometry, parts.treadMaterial);
            wheel.position.set(side * TANK_TREAD_X, -TANK_TREAD_RADIUS, z);
            group.add(wheel);
            group.userData.wheels.push(wheel);
        });

        for (let i = 0; i < TANK_TREAD_PLATES; i++) {
            const plate = new THREE.Mesh(parts.plateGeometry, parts.treadMaterial);
            plate.position.x = side * TANK_TREAD_X;
            group.add(plate);
            group.userData.treadPlates.push({ mesh: plate, offset: i / TANK_TREAD_PLATES });
        }
    });
}

// ---------------------------------------------------------------------------
// Beetle (row 5) - armoured shell that opens into flight
// ---------------------------------------------------------------------------

// Body under the wing cases: dark, only fully seen when the elytra lift
const BEETLE_BODY = [
    { size: [1.00, 0.34, 0.90], pos: [0, 0.02, -0.18], color: 0x6b3200 },   // abdomen
    { size: [0.86, 0.14, 0.86], pos: [0, 0.20, -0.18], color: 0x532600 },   // wing bed
    { size: [0.80, 0.28, 0.44], pos: [0, 0.16, 0.42], color: 0xff8f14 },    // pronotum shield
    { size: [0.86, 0.10, 0.14], pos: [0, 0.26, 0.30], color: 0xa34e00 },    // pronotum lip
    { size: [0.30, 0.12, 0.16], pos: [-0.34, 0.06, 0.36], color: 0xa34e00 },
    { size: [0.30, 0.12, 0.16], pos: [0.34, 0.06, 0.36], color: 0xa34e00 }
];

// Head carries the rhinoceros horn - the beetle's signature silhouette
const BEETLE_HEAD = [
    { size: [0.46, 0.26, 0.34], pos: [0, 0.02, 0.16], color: 0xd96a00 },
    { size: [0.34, 0.12, 0.12], pos: [0, -0.10, 0.32], color: 0xa34e00 },   // clypeus
    // Horn curving up and forward
    { size: [0.13, 0.26, 0.13], pos: [0, 0.22, 0.22], rotX: -0.30, color: 0xffa838 },
    { size: [0.12, 0.22, 0.12], pos: [0, 0.40, 0.31], rotX: -0.75, color: 0xffa838 },
    { size: [0.10, 0.18, 0.10], pos: [0, 0.51, 0.44], rotX: -1.15, color: 0xffc86a },
    // Compound eyes
    { size: [0.14, 0.14, 0.12], pos: [-0.22, 0.06, 0.26], color: 0x3cff3c },
    { size: [0.14, 0.14, 0.12], pos: [0.22, 0.06, 0.26], color: 0x3cff3c }
];

// One wing case, hinged at the spine so it lifts outward
const BEETLE_ELYTRON = [
    { size: [0.44, 0.16, 0.92], pos: [-0.24, 0.00, -0.16], color: 0xff8f14 },
    { size: [0.36, 0.12, 0.78], pos: [-0.21, 0.11, -0.18], color: 0xffa838 },
    { size: [0.10, 0.06, 0.80], pos: [-0.40, 0.06, -0.16], color: 0xa34e00 },  // outer rib
    { size: [0.07, 0.05, 0.68], pos: [-0.14, 0.16, -0.18], color: 0xa34e00 },  // inner stripe
    { size: [0.30, 0.10, 0.14], pos: [-0.22, 0.02, -0.60], color: 0xd96a00 }   // tail taper
];

// Flight wing, revealed and blurred when the elytra open
const BEETLE_WING = [
    { size: [0.86, 0.05, 0.94], pos: [-0.50, 0, -0.22], color: 0xffe2b0 },
    { size: [0.62, 0.05, 0.34], pos: [-0.42, 0, -0.74], color: 0xffd9a0 },
    { size: [0.07, 0.06, 0.96], pos: [-0.06, 0, -0.22], color: 0xd9a860 }      // leading spar
];

// Web-bomb sac slung under the abdomen, charging between shots
const BEETLE_SAC = [
    { size: [0.38, 0.18, 0.32], pos: [0, -0.18, -0.46], color: 0xc8ff4a },
    { size: [0.20, 0.12, 0.16], pos: [0, -0.26, -0.62], color: 0xe8ff9a }
];

// Club-tipped antenna, built as one piece extending forward from its origin
const BEETLE_ANTENNA = [
    { size: [0.07, 0.07, 0.26], pos: [0, 0, 0.13], color: 0xa34e00 },
    { size: [0.09, 0.09, 0.18], pos: [0, 0.04, 0.32], color: 0xcc6600 },
    { size: [0.15, 0.13, 0.14], pos: [0, 0.09, 0.46], color: 0xffe14a }        // club
];

const BEETLE_LEG_SEGMENTS = [
    { length: 0.26, width: 0.10, baseBend: 0.90 },   // femur, out from the body
    { length: 0.24, width: 0.08, baseBend: -1.30 },  // tibia, down
    { length: 0.14, width: 0.06, baseBend: -0.35 }   // tarsus
];

const BEETLE_LEG_MOUNTS = [
    { side: -1, z: 0.30, phase: 0 },
    { side: -1, z: 0.00, phase: Math.PI },
    { side: -1, z: -0.30, phase: 0 },
    { side: 1, z: 0.30, phase: Math.PI },
    { side: 1, z: 0.00, phase: 0 },
    { side: 1, z: -0.30, phase: Math.PI }
];

let beetleParts = null;

function getBeetleParts() {
    if (beetleParts) return beetleParts;

    beetleParts = {
        bodyGeometry: buildVoxelGeometry(BEETLE_BODY),
        headGeometry: buildVoxelGeometry(BEETLE_HEAD),
        elytronGeometries: {
            '-1': buildVoxelGeometry(BEETLE_ELYTRON),
            '1': buildVoxelGeometry(mirrorBoxes(BEETLE_ELYTRON))
        },
        wingGeometries: {
            '-1': buildVoxelGeometry(BEETLE_WING),
            '1': buildVoxelGeometry(mirrorBoxes(BEETLE_WING))
        },
        sacGeometry: buildVoxelGeometry(BEETLE_SAC),
        antennaGeometry: buildVoxelGeometry(BEETLE_ANTENNA),
        legGeometries: BEETLE_LEG_SEGMENTS.map(s => buildLimbSegmentGeometry(s, 0xcc6600, 0x7a3c00)),
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x8a4400,
            emissiveIntensity: 1.0,
            shininess: 80,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x7a3c00,
            emissiveIntensity: 1.0,
            flatShading: true
        }),
        // Cloned per alien so each beetle runs its own flight and charge cycle
        wingMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xffd9a0,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            side: THREE.DoubleSide,
            flatShading: true
        }),
        sacMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x9de026,
            emissiveIntensity: 1.2,
            flatShading: true
        })
    };

    return beetleParts;
}

function createBeetleAlien(group) {
    const parts = getBeetleParts();

    const body = new THREE.Mesh(parts.bodyGeometry, parts.shellMaterial);
    body.castShadow = true;
    group.add(body);
    group.userData.body = body;

    const head = new THREE.Mesh(parts.headGeometry, parts.shellMaterial);
    head.position.set(0, 0.10, 0.66);
    group.add(head);
    group.userData.head = head;

    const sac = new THREE.Mesh(parts.sacGeometry, parts.sacMaterial.clone());
    group.add(sac);
    group.userData.sac = sac;

    // Club-tipped antennae sweeping forward from the head
    group.userData.antennae = [-1, 1].map(side => {
        const antenna = new THREE.Mesh(parts.antennaGeometry, parts.limbMaterial);
        antenna.position.set(side * 0.16, 0.10, 0.28);
        antenna.rotation.y = side * 0.45;
        antenna.rotation.x = -0.25;
        antenna.userData.baseYaw = side * 0.45;
        head.add(antenna);
        return { mesh: antenna, side };
    });

    // Elytra hinge at the spine; wings sit underneath them
    group.userData.elytra = [];
    group.userData.wings = [];
    [-1, 1].forEach(side => {
        const elytron = new THREE.Mesh(parts.elytronGeometries[side], parts.shellMaterial);
        elytron.position.set(side * 0.05, 0.28, 0);
        elytron.castShadow = true;
        group.add(elytron);
        group.userData.elytra.push({ mesh: elytron, side });

        const wing = new THREE.Mesh(parts.wingGeometries[side], parts.wingMaterial.clone());
        wing.position.set(side * 0.05, 0.17, 0);
        wing.visible = false;
        group.add(wing);
        group.userData.wings.push({ mesh: wing, side });
    });

    // Six jointed legs that tuck up in flight
    group.userData.legs = BEETLE_LEG_MOUNTS.map(config => {
        const mount = new THREE.Group();
        mount.position.set(config.side * 0.46, -0.10, config.z);
        // Local +X points outward on both sides
        mount.rotation.y = config.side > 0 ? 0 : Math.PI;
        group.add(mount);

        const segments = buildLimbChain(mount, parts.legGeometries, BEETLE_LEG_SEGMENTS, parts.limbMaterial, -1);

        return { mount, segments, phase: config.phase, side: config.side };
    });
}


// ---------------------------------------------------------------------------
// Wasp (row 8) - striped voxel insect with a wingstorm cycle
// ---------------------------------------------------------------------------

const WASP_DARK = 0x1c100d;
const WASP_RECESS = 0x24150d;
const WASP_SHADE = 0x65300f;
const WASP_AMBER = 0xc8620d;
const WASP_GOLD = 0xffad28;
const WASP_HOT = 0xffdf70;
const WASP_EYE = 0xffe05b;
const WASP_WING_COLOR = 0xa5e7f0;

const WASP_THORAX = [
    { size: [0.72, 0.28, 0.50], pos: [0, 0.10, 0.08], color: WASP_SHADE },
    { size: [0.88, 0.20, 0.42], pos: [0, -0.04, 0.02], color: WASP_AMBER },
    { size: [0.62, 0.14, 0.34], pos: [0, 0.30, 0.00], color: WASP_GOLD },
    { size: [0.24, 0.08, 0.46], pos: [0, 0.38, -0.02], color: WASP_DARK },
    { size: [0.20, 0.22, 0.30], pos: [-0.48, 0.08, 0.00], color: WASP_SHADE },
    { size: [0.20, 0.22, 0.30], pos: [0.48, 0.08, 0.00], color: WASP_SHADE },
    { size: [0.10, 0.10, 0.20], pos: [-0.56, 0.24, 0.08], color: WASP_GOLD },
    { size: [0.10, 0.10, 0.20], pos: [0.56, 0.24, 0.08], color: WASP_GOLD },
    { size: [0.12, 0.06, 0.28], pos: [0, -0.22, 0.12], color: WASP_DARK },
    { size: [0.20, 0.06, 0.16], pos: [0, 0.16, 0.34], color: WASP_RECESS }
];

// Thin coloured plates make the amber/black warning stripes survive the
// formation camera and bloom.
const WASP_ABDOMEN = [
    { size: [0.56, 0.40, 0.72], pos: [0, 0.04, -0.34], color: WASP_DARK },
    { size: [0.62, 0.08, 0.16], pos: [0, 0.18, -0.08], color: WASP_GOLD },
    { size: [0.62, 0.07, 0.16], pos: [0, 0.17, -0.28], color: WASP_DARK },
    { size: [0.58, 0.08, 0.16], pos: [0, 0.16, -0.48], color: WASP_AMBER },
    { size: [0.52, 0.06, 0.16], pos: [0, 0.14, -0.66], color: WASP_DARK },
    { size: [0.42, 0.10, 0.38], pos: [0, 0.06, -0.75], color: WASP_SHADE },
    { size: [0.14, 0.07, 0.70], pos: [0, 0.26, -0.36], color: WASP_HOT },
    { size: [0.08, 0.08, 0.18], pos: [-0.34, 0.06, -0.26], color: WASP_AMBER },
    { size: [0.08, 0.08, 0.18], pos: [0.34, 0.06, -0.26], color: WASP_AMBER }
];

const WASP_FACE = [
    { size: [0.48, 0.24, 0.16], pos: [0, 0.10, 0.38], color: WASP_RECESS },
    { size: [0.34, 0.12, 0.10], pos: [0, 0.24, 0.42], color: WASP_DARK },
    { size: [0.14, 0.10, 0.12], pos: [-0.28, 0.12, 0.30], color: WASP_SHADE },
    { size: [0.14, 0.10, 0.12], pos: [0.28, 0.12, 0.30], color: WASP_SHADE },
    { size: [0.08, 0.08, 0.16], pos: [-0.12, -0.10, 0.38], color: WASP_DARK },
    { size: [0.08, 0.08, 0.16], pos: [0.12, -0.10, 0.38], color: WASP_DARK }
];

const WASP_EYES = [
    { size: [0.20, 0.18, 0.08], pos: [-0.23, 0.13, 0.48], color: WASP_EYE },
    { size: [0.20, 0.18, 0.08], pos: [0.23, 0.13, 0.48], color: WASP_EYE },
    { size: [0.06, 0.08, 0.04], pos: [-0.23, 0.13, 0.53], color: WASP_HOT },
    { size: [0.06, 0.08, 0.04], pos: [0.23, 0.13, 0.53], color: WASP_HOT }
];

// One side of each angular wing. The second side is mirrored to keep normals
// and lighting correct, just like the Beetle elytra and Invader shoulders.
const WASP_WING = [
    { size: [0.30, 0.035, 0.42], pos: [-0.18, 0.20, 0.00], rotZ: -0.18, color: WASP_WING_COLOR },
    { size: [0.36, 0.035, 0.34], pos: [-0.48, 0.29, -0.04], rotZ: -0.38, color: WASP_WING_COLOR },
    { size: [0.28, 0.035, 0.26], pos: [-0.78, 0.42, -0.08], rotZ: -0.56, color: WASP_WING_COLOR }
];

const WASP_WING_EDGES = [
    { size: [0.06, 0.045, 0.34], pos: [-0.28, 0.24, 0.18], rotZ: -0.18, color: WASP_HOT },
    { size: [0.06, 0.045, 0.28], pos: [-0.59, 0.34, 0.11], rotZ: -0.38, color: WASP_HOT },
    { size: [0.05, 0.045, 0.20], pos: [-0.84, 0.46, 0.05], rotZ: -0.56, color: WASP_GOLD }
];

const WASP_MANDIBLES = [
    { size: [0.12, 0.08, 0.22], pos: [-0.16, -0.04, 0.52], rotX: -0.22, color: WASP_GOLD },
    { size: [0.08, 0.06, 0.16], pos: [-0.20, -0.12, 0.68], rotX: -0.40, color: WASP_SHADE }
];

const WASP_STINGER = [
    { size: [0.20, 0.20, 0.22], pos: [0, 0.00, -0.18], color: WASP_SHADE },
    { size: [0.12, 0.12, 0.24], pos: [0, 0.00, -0.38], color: WASP_GOLD },
    { size: [0.05, 0.05, 0.24], pos: [0, 0.00, -0.58], color: WASP_HOT }
];

const WASP_LEG_SEGMENTS = [
    { length: 0.24, width: 0.10, baseBend: 0.88 },
    { length: 0.20, width: 0.08, baseBend: -1.25 },
    { length: 0.12, width: 0.06, baseBend: -0.28 }
];

const WASP_LEG_MOUNTS = [
    { side: -1, z: 0.22, phase: 0 },
    { side: -1, z: 0.00, phase: Math.PI },
    { side: -1, z: -0.22, phase: 0 },
    { side: 1, z: 0.22, phase: Math.PI },
    { side: 1, z: 0.00, phase: 0 },
    { side: 1, z: -0.22, phase: Math.PI }
];

let waspParts = null;

function getWaspParts() {
    if (waspParts) return waspParts;

    waspParts = {
        thoraxGeometry: buildVoxelGeometry(WASP_THORAX),
        abdomenGeometry: buildVoxelGeometry(WASP_ABDOMEN),
        faceGeometry: buildVoxelGeometry(WASP_FACE),
        eyeGeometry: buildVoxelGeometry(WASP_EYES),
        wingGeometries: {
            '-1': buildVoxelGeometry(WASP_WING),
            '1': buildVoxelGeometry(mirrorBoxes(WASP_WING))
        },
        wingEdgeGeometries: {
            '-1': buildVoxelGeometry(WASP_WING_EDGES),
            '1': buildVoxelGeometry(mirrorBoxes(WASP_WING_EDGES))
        },
        mandibleGeometries: {
            '-1': buildVoxelGeometry(WASP_MANDIBLES),
            '1': buildVoxelGeometry(mirrorBoxes(WASP_MANDIBLES))
        },
        stingerGeometry: buildVoxelGeometry(WASP_STINGER),
        legGeometries: WASP_LEG_SEGMENTS.map(segment =>
            buildLimbSegmentGeometry(segment, WASP_AMBER, WASP_SHADE)
        ),
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WASP_SHADE,
            emissiveIntensity: 0.65,
            shininess: 45,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WASP_SHADE,
            emissiveIntensity: 0.7,
            flatShading: true
        }),
        wingMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WASP_WING_COLOR,
            emissiveIntensity: 0.65,
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
            side: THREE.DoubleSide,
            flatShading: true
        }),
        wingEdgeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WASP_HOT,
            emissiveIntensity: 1.0,
            flatShading: true
        }),
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WASP_EYE,
            emissiveIntensity: 2.0,
            flatShading: true
        }),
        stingerMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WASP_GOLD,
            emissiveIntensity: 1.0,
            flatShading: true
        })
    };

    return waspParts;
}

function createWaspAlien(group) {
    const parts = getWaspParts();
    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    const thorax = new THREE.Mesh(parts.thoraxGeometry, parts.shellMaterial);
    thorax.castShadow = true;
    bodyPivot.add(thorax);
    group.userData.thorax = thorax;

    const abdomenPivot = new THREE.Group();
    abdomenPivot.position.set(0, 0.02, -0.24);
    bodyPivot.add(abdomenPivot);
    const abdomen = new THREE.Mesh(parts.abdomenGeometry, parts.shellMaterial);
    abdomen.position.z = -0.18;
    abdomenPivot.add(abdomen);
    group.userData.abdomenPivot = abdomenPivot;
    group.userData.abdomen = abdomen;

    const face = new THREE.Mesh(parts.faceGeometry, parts.shellMaterial);
    bodyPivot.add(face);
    group.userData.face = face;

    const eyes = new THREE.Mesh(parts.eyeGeometry, parts.eyeMaterial.clone());
    bodyPivot.add(eyes);
    group.userData.eyes = eyes;

    group.userData.mandibles = [-1, 1].map(side => {
        const mandible = new THREE.Mesh(parts.mandibleGeometries[side], parts.limbMaterial);
        mandible.position.x = side * 0.16;
        bodyPivot.add(mandible);
        return { mesh: mandible, side };
    });

    const stinger = new THREE.Mesh(parts.stingerGeometry, parts.stingerMaterial.clone());
    stinger.position.set(0, 0.04, -0.70);
    abdomenPivot.add(stinger);
    group.userData.stinger = stinger;

    group.userData.wings = [];
    [-1, 1].forEach(side => {
        [-1, 1].forEach((pair, pairIndex) => {
            const hinge = new THREE.Group();
            hinge.position.set(side * 0.18, 0.16 - pairIndex * 0.08, 0.04 - pairIndex * 0.18);
            bodyPivot.add(hinge);

            const wing = new THREE.Mesh(parts.wingGeometries[side], parts.wingMaterial.clone());
            hinge.add(wing);

            const edge = new THREE.Mesh(parts.wingEdgeGeometries[side], parts.wingEdgeMaterial.clone());
            hinge.add(edge);

            group.userData.wings.push({ hinge, wing, edge, side, pair: pairIndex });
        });
    });

    group.userData.legs = WASP_LEG_MOUNTS.map(config => {
        const mount = new THREE.Group();
        mount.position.set(config.side * 0.46, -0.10, config.z);
        mount.rotation.y = config.side > 0 ? 0 : Math.PI;
        bodyPivot.add(mount);

        const segments = buildLimbChain(
            mount,
            parts.legGeometries,
            WASP_LEG_SEGMENTS,
            parts.limbMaterial,
            -1
        );

        return { mount, segments, phase: config.phase, side: config.side };
    });
}

// ---------------------------------------------------------------------------
// Invader (row 6) - the 1-bit arcade homage, sculpted but deliberately crisp
// ---------------------------------------------------------------------------

// This row is the homage row, so form comes from stacked bevels and hard
// shadow steps rather than from hue. The ramp is a cool blue-grey rather than
// neutral white: at a glance it still reads as the white/silver row, but a
// near-white ramp (fff -> eaeaea -> cccccc) spans too little value for the
// bevels to survive bloom, so the sculpt flattened into one mass. These steps
// are spread much wider and tinted, which is what actually makes the form
// legible. Red stays reserved for the blaster, cyan for the optics.
const INVADER_WHITE = 0xf8fbff;   // highlight - bevel tops catching the light
const INVADER_PLATE = 0xdfe9f6;   // main armour plate
const INVADER_TRIM = 0xb2c1d4;    // edge trim and secondary panels
const INVADER_SHADE = 0x7d8da5;   // shadow step under an overhang
const INVADER_RECESS = 0x3d4860;  // sockets and seams only

// Centre column of the hull - straddles x=0, so it is never mirrored
const INVADER_HULL_CORE = [
    { size: [0.44, 0.12, 0.36], pos: [0, 0.62, -0.02], color: INVADER_WHITE },  // crown cap
    { size: [0.64, 0.16, 0.46], pos: [0, 0.50, -0.02], color: INVADER_PLATE },
    { size: [0.92, 0.20, 0.58], pos: [0, 0.33, 0.00], color: INVADER_PLATE },   // head
    { size: [0.84, 0.05, 0.50], pos: [0, 0.45, 0.00], color: INVADER_WHITE },   // head bevel
    { size: [1.00, 0.09, 0.12], pos: [0, 0.21, 0.31], color: INVADER_SHADE },   // brow band
    { size: [1.14, 0.26, 0.68], pos: [0, 0.06, 0.00], color: INVADER_PLATE },   // chest
    { size: [1.06, 0.05, 0.60], pos: [0, 0.21, 0.00], color: INVADER_WHITE },   // chest bevel
    { size: [1.22, 0.20, 0.72], pos: [0, -0.16, 0.00], color: INVADER_PLATE },  // belly, widest tier
    { size: [1.10, 0.06, 0.64], pos: [0, -0.28, 0.00], color: INVADER_SHADE },  // under-lip
    { size: [0.78, 0.16, 0.52], pos: [0, -0.38, 0.00], color: INVADER_PLATE },  // pelvis
    { size: [0.66, 0.06, 0.44], pos: [0, -0.47, 0.00], color: INVADER_TRIM },
    // Front-face detail: a centre seam and a stepped grille
    { size: [0.07, 0.44, 0.06], pos: [0, 0.14, 0.37], color: INVADER_SHADE },
    { size: [0.34, 0.07, 0.08], pos: [0, -0.06, 0.37], color: INVADER_RECESS },
    { size: [0.26, 0.06, 0.08], pos: [0, -0.16, 0.37], color: INVADER_RECESS },
    // Cannon housing the barrel slides into
    { size: [0.34, 0.24, 0.26], pos: [0, -0.22, 0.36], color: INVADER_TRIM },
    { size: [0.38, 0.06, 0.22], pos: [0, -0.09, 0.36], color: INVADER_WHITE }
];

// One half of the hull. mirrorBoxes() builds the other, so the two sides are
// exact - symmetry carries this silhouette more than any other model's.
const INVADER_HULL_SIDE = [
    { size: [0.16, 0.26, 0.30], pos: [-0.44, 0.30, 0.16], color: INVADER_PLATE },   // cheek
    { size: [0.30, 0.24, 0.12], pos: [-0.26, 0.15, 0.32], color: INVADER_RECESS },  // eye socket
    { size: [0.34, 0.06, 0.16], pos: [-0.26, 0.29, 0.32], color: INVADER_TRIM },    // socket hood
    { size: [0.24, 0.22, 0.44], pos: [-0.60, 0.10, 0.00], color: INVADER_PLATE },   // shoulder pad
    { size: [0.20, 0.05, 0.38], pos: [-0.60, 0.22, 0.00], color: INVADER_WHITE },   // shoulder bevel
    { size: [0.22, 0.06, 0.10], pos: [-0.60, -0.02, 0.00], color: INVADER_SHADE },  // shoulder shadow
    { size: [0.08, 0.08, 0.08], pos: [-0.42, -0.16, 0.38], color: INVADER_SHADE },  // rivet
    { size: [0.08, 0.08, 0.08], pos: [-0.42, 0.06, 0.36], color: INVADER_SHADE },
    { size: [0.20, 0.14, 0.34], pos: [-0.42, -0.42, 0.00], color: INVADER_SHADE }   // hip block
];

// Both optics in one mesh, so a blink scales them together. Built around y=0
// and lifted by INVADER_EYE_Y at mount time, so the squash closes the eyes in
// place instead of sliding them down toward the group origin.
const INVADER_EYE_Y = 0.15;
const INVADER_EYE_HALF = [
    { size: [0.22, 0.14, 0.10], pos: [-0.26, 0, 0.37], color: 0x00ffff },
    { size: [0.10, 0.07, 0.06], pos: [-0.26, 0, 0.41], color: 0xd8ffff }
];

// Antenna: a stepped pixel stalk leaning outward from its base
const INVADER_ANTENNA = [
    { size: [0.10, 0.16, 0.10], pos: [0.00, 0.08, 0], color: INVADER_TRIM },
    { size: [0.08, 0.14, 0.08], pos: [-0.05, 0.21, 0], color: INVADER_PLATE },
    { size: [0.08, 0.12, 0.08], pos: [-0.10, 0.32, 0], color: INVADER_WHITE }
];
const INVADER_ANTENNA_PIP = [-0.13, 0.40, 0];

// Arm, built extending along -X from its shoulder joint so it can swing
const INVADER_ARM = [
    { size: [0.22, 0.20, 0.34], pos: [-0.11, 0.00, 0], color: INVADER_PLATE },
    { size: [0.24, 0.05, 0.30], pos: [-0.11, 0.10, 0], color: INVADER_WHITE },
    { size: [0.20, 0.06, 0.32], pos: [-0.11, -0.10, 0], color: INVADER_SHADE },
    { size: [0.16, 0.26, 0.26], pos: [-0.24, 0.14, 0], color: INVADER_PLATE },   // forearm
    { size: [0.16, 0.05, 0.22], pos: [-0.24, 0.26, 0], color: INVADER_WHITE },
    { size: [0.13, 0.16, 0.18], pos: [-0.28, 0.32, 0], color: INVADER_TRIM },    // claw
    { size: [0.09, 0.09, 0.09], pos: [-0.28, 0.43, 0], color: INVADER_WHITE }
];

// Blaster coils - the one accent colour, matching the red bolt it fires
const INVADER_COILS = [
    { size: [0.30, 0.06, 0.08], pos: [0, -0.09, 0.44], color: 0xff6a6a },
    { size: [0.09, 0.06, 0.26], pos: [-0.40, -0.14, 0.18], color: 0xff6a6a },
    { size: [0.09, 0.06, 0.26], pos: [0.40, -0.14, 0.18], color: 0xff6a6a },
    { size: [0.12, 0.05, 0.12], pos: [0, -0.35, 0.28], color: 0xffb0b0 }
];

// Straight pixel legs - no splay, because the crisp vertical stance is the
// silhouette. All the march lives in fore/aft rotation.
const INVADER_LEG_SEGMENTS = [
    { length: 0.15, width: 0.16, baseBend: 0 },   // thigh
    { length: 0.15, width: 0.13, baseBend: 0 }    // shin
];

const INVADER_LEG_X = 0.30;
const INVADER_LEG_Y = -0.42;

let invaderParts = null;

function getInvaderParts() {
    if (invaderParts) return invaderParts;

    invaderParts = {
        hullGeometry: buildVoxelGeometry([
            ...INVADER_HULL_CORE,
            ...INVADER_HULL_SIDE,
            ...mirrorBoxes(INVADER_HULL_SIDE)
        ]),
        eyeGeometry: buildVoxelGeometry([
            ...INVADER_EYE_HALF,
            ...mirrorBoxes(INVADER_EYE_HALF)
        ]),
        antennaGeometries: {
            '-1': buildVoxelGeometry(INVADER_ANTENNA),
            '1': buildVoxelGeometry(mirrorBoxes(INVADER_ANTENNA))
        },
        armGeometries: {
            '-1': buildVoxelGeometry(INVADER_ARM),
            '1': buildVoxelGeometry(mirrorBoxes(INVADER_ARM))
        },
        coilGeometry: buildVoxelGeometry(INVADER_COILS),
        pipGeometry: buildVoxelGeometry([
            { size: [0.11, 0.11, 0.11], pos: [0, 0, 0], color: 0x9ffcff }
        ]),
        // Barrel runs forward from its breech, so recoil is a slide along Z
        barrelGeometry: buildVoxelGeometry([
            { size: [0.25, 0.25, 0.08], pos: [0, 0, 0.05], color: INVADER_SHADE },
            { size: [0.20, 0.20, 0.34], pos: [0, 0, 0.18], color: INVADER_PLATE },
            { size: [0.28, 0.05, 0.16], pos: [0, 0.11, 0.18], color: INVADER_WHITE },  // vent fin
            { size: [0.24, 0.24, 0.10], pos: [0, 0, 0.35], color: INVADER_TRIM },      // muzzle ring
            { size: [0.11, 0.11, 0.08], pos: [0, 0, 0.41], color: 0xff5a5a }           // bore
        ]),
        muzzleGeometry: buildVoxelGeometry([
            { size: [0.26, 0.26, 0.09], pos: [0, 0, 0], color: 0xfff3d0 },
            { size: [0.14, 0.14, 0.22], pos: [0, 0, 0.08], color: 0xffc44a }
        ]),
        footGeometry: buildVoxelGeometry([
            { size: [0.24, 0.10, 0.30], pos: [0, -0.05, 0.05], color: INVADER_PLATE },
            { size: [0.26, 0.05, 0.32], pos: [0, -0.11, 0.05], color: INVADER_SHADE }
        ]),
        legGeometries: INVADER_LEG_SEGMENTS.map(s => buildLimbSegmentGeometry(s, INVADER_PLATE, INVADER_TRIM)),
        // Emissive is added flat, on top of the vertex colours rather than
        // through them, so a bright grey emissive floods every tier equally and
        // erases the ramp. Tinted cool and pulled well down, so the plate
        // colours - not the glow - carry the form.
        plateMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x647691,
            emissiveIntensity: 0.85,
            shininess: 20,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x4e5d76,
            emissiveIntensity: 0.75,
            flatShading: true
        }),
        // Cloned per alien so each invader blinks and charges on its own clock
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x00e5ff,
            emissiveIntensity: 3.0,
            flatShading: true
        }),
        coilMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xff3a3a,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        muzzleMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xffc44a,
            emissiveIntensity: 2.2,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            flatShading: true
        })
    };

    return invaderParts;
}

function createInvaderAlien(group) {
    const parts = getInvaderParts();
    // Optics and antenna pips share one clone, so the blink reads as one system
    const eyeMaterial = parts.eyeMaterial.clone();

    const hull = new THREE.Mesh(parts.hullGeometry, parts.plateMaterial);
    hull.castShadow = true;
    group.add(hull);
    group.userData.hull = hull;

    const eyes = new THREE.Mesh(parts.eyeGeometry, eyeMaterial);
    eyes.position.y = INVADER_EYE_Y;
    group.add(eyes);
    group.userData.eyes = eyes;

    const coils = new THREE.Mesh(parts.coilGeometry, parts.coilMaterial.clone());
    group.add(coils);
    group.userData.coils = coils;

    // Blaster barrel slides back into its housing on recoil
    const barrel = new THREE.Mesh(parts.barrelGeometry, parts.plateMaterial);
    barrel.position.set(0, -0.22, 0.44);
    group.add(barrel);
    group.userData.barrel = barrel;
    group.userData.barrelRestZ = 0.44;

    const muzzle = new THREE.Mesh(parts.muzzleGeometry, parts.muzzleMaterial.clone());
    muzzle.position.set(0, 0, 0.48);
    muzzle.visible = false;
    barrel.add(muzzle);
    group.userData.muzzle = muzzle;

    // Stepped antennae with a sensor pip that blinks with the optics
    group.userData.antennae = [-1, 1].map(side => {
        const antenna = new THREE.Mesh(parts.antennaGeometries[side], parts.limbMaterial);
        antenna.position.set(side * 0.22, 0.54, -0.02);
        group.add(antenna);

        const pip = new THREE.Mesh(parts.pipGeometry, eyeMaterial);
        pip.position.set(side * INVADER_ANTENNA_PIP[0], INVADER_ANTENNA_PIP[1], INVADER_ANTENNA_PIP[2]);
        antenna.add(pip);

        return { mesh: antenna, side };
    });

    // Arms hinge at the shoulder so they can pump with the march
    group.userData.arms = [-1, 1].map(side => {
        const arm = new THREE.Mesh(parts.armGeometries[side], parts.plateMaterial);
        arm.position.set(side * 0.46, 0.10, 0);
        group.add(arm);
        return { mesh: arm, side };
    });

    // Two straight pixel legs, jointed at the knee
    group.userData.legs = [-1, 1].map(side => {
        const mount = new THREE.Group();
        mount.position.set(side * INVADER_LEG_X, INVADER_LEG_Y, 0);
        group.add(mount);

        const segments = buildLimbChain(mount, parts.legGeometries, INVADER_LEG_SEGMENTS, parts.limbMaterial, -1);

        const foot = new THREE.Mesh(parts.footGeometry, parts.limbMaterial);
        foot.position.y = -INVADER_LEG_SEGMENTS[1].length;
        segments[1].add(foot);

        return { mount, segments, foot, side };
    });
}

// ---------------------------------------------------------------------------
// Scorpion (row 7) - segmented arachnid with venom arc
// ---------------------------------------------------------------------------

// Body — a compact Beetle-style hero mass with a raised rear and clear front
// shield. The silhouette is intentionally chunkier than anatomically exact.
const SCORPION_DARK = 0x351707;
const SCORPION_SHADE = 0x6f2d0a;
const SCORPION_RUST = 0xb94d0d;
const SCORPION_ORANGE = 0xe87317;
const SCORPION_GOLD = 0xffa52b;
const SCORPION_RECESS = 0x21100a;

const SCORPION_ABDOMEN = [
    { size: [0.88, 0.18, 0.86], pos: [0, -0.08, -0.13], color: SCORPION_DARK },
    { size: [0.82, 0.22, 0.74], pos: [0, 0.06, -0.10], color: SCORPION_SHADE },
    { size: [0.72, 0.12, 0.66], pos: [0, 0.19, -0.03], color: SCORPION_ORANGE },
    { size: [0.52, 0.07, 0.54], pos: [0, 0.29, 0.03], color: SCORPION_GOLD },
    { size: [0.10, 0.06, 0.70], pos: [0, 0.33, -0.08], color: SCORPION_RUST },
    { size: [0.12, 0.05, 0.12], pos: [-0.42, 0.04, -0.22], color: SCORPION_RUST },
    { size: [0.12, 0.05, 0.12], pos: [0.42, 0.04, -0.22], color: SCORPION_RUST },
];

const SCORPION_CEPHALOTHORAX = [
    { size: [0.74, 0.20, 0.34], pos: [0, 0.04, 0.34], color: SCORPION_SHADE },
    { size: [0.62, 0.10, 0.26], pos: [0, 0.18, 0.39], color: SCORPION_ORANGE },
    { size: [0.82, 0.08, 0.18], pos: [0, -0.04, 0.46], color: SCORPION_DARK },
    { size: [0.22, 0.14, 0.24], pos: [-0.46, 0.03, 0.25], color: SCORPION_RUST },
    { size: [0.22, 0.14, 0.24], pos: [0.46, 0.03, 0.25], color: SCORPION_RUST },
    { size: [0.12, 0.08, 0.18], pos: [-0.59, -0.05, 0.28], color: SCORPION_SHADE },
    { size: [0.12, 0.08, 0.18], pos: [0.59, -0.05, 0.28], color: SCORPION_SHADE },
    { size: [0.42, 0.05, 0.08], pos: [0, 0.22, 0.46], color: SCORPION_GOLD },
];

// Head — one dark eye band and two bright readable lenses.
const SCORPION_HEAD = [
    { size: [0.48, 0.12, 0.10], pos: [0, 0.06, 0.48], color: SCORPION_RECESS },
    { size: [0.14, 0.08, 0.06], pos: [-0.18, 0.08, 0.54], color: SCORPION_GOLD },
    { size: [0.14, 0.08, 0.06], pos: [0.18, 0.08, 0.54], color: SCORPION_GOLD },
    { size: [0.22, 0.06, 0.10], pos: [0, -0.02, 0.50], color: SCORPION_DARK },
];

// Tail segments — the signature S-curve, built as a chain of 5 tapered segments
// that extend upward from their joint, each one bending slightly to form the
// arc. Origin of each segment sits at its lower joint.
// Lengths increased so the tail reads at formation distance.
const SCORPION_TAIL_SEGMENTS = [
    { length: 0.28, width: 0.24, bend: 0.08, name: 'base' },
    { length: 0.24, width: 0.20, bend: 0.26, name: 'mid1' },
    { length: 0.20, width: 0.16, bend: 0.48, name: 'mid2' },
    { length: 0.16, width: 0.12, bend: 0.58, name: 'mid3' },
    { length: 0.12, width: 0.08, bend: -0.12, name: 'tip' }
];
// Dermal plates at the join between each segment — read as carapace ridges
// 5 plates for 5 tail segments for consistent indexing.
const SCORPION_PLATES = [
    { color: SCORPION_SHADE },
    { color: SCORPION_RUST },
    { color: SCORPION_ORANGE },
    { color: SCORPION_GOLD },
    { color: SCORPION_ORANGE }
];

// Stinger (aculeus) — a tapered poison spike, the very tip of the tail
// All components centered on local origin for clean stacking.
const SCORPION_STINGER = [
    { size: [0.08, 0.24, 0.08], pos: [0, 0.00, 0], color: SCORPION_DARK },
    { size: [0.16, 0.10, 0.14], pos: [0, 0.12, 0], color: SCORPION_RUST },
    { size: [0.08, 0.07, 0.08], pos: [0, 0.19, 0], color: 0xffc331 },
    { size: [0.04, 0.06, 0.05], pos: [0, 0.24, 0], color: 0xfff0a0 }
];

// Pedipalp (pincer) — a jointed grasping limb at the front
// One side only; the other is mirrored via mirrorBoxes()
const SCORPION_PINCER = [
    { size: [0.20, 0.12, 0.22], pos: [0, 0, 0.08], color: SCORPION_SHADE },
    { size: [0.16, 0.10, 0.22], pos: [0, 0.02, 0.26], color: SCORPION_RUST },
    { size: [0.12, 0.08, 0.18], pos: [0, 0.01, 0.42], color: SCORPION_ORANGE },
];

const SCORPION_CLAW = [
    { size: [0.10, 0.06, 0.18], pos: [0, 0, 0.12], color: SCORPION_RUST },
    { size: [0.07, 0.05, 0.16], pos: [0, 0.02, 0.25], color: SCORPION_GOLD },
];

// Legs — four per side, each a three-segment chain
const SCORPION_LEG_SEGMENTS = [
    { length: 0.20, width: 0.11, baseBend: 0.85 },
    { length: 0.17, width: 0.09, baseBend: -1.30 },
    { length: 0.12, width: 0.06, baseBend: -0.20 }
];

const SCORPION_LEG_MOUNTS = [
    { side: -1, z: 0.34, phase: 0 },
    { side: -1, z: 0.12, phase: Math.PI },
    { side: -1, z: -0.08, phase: 0 },
    { side: -1, z: -0.26, phase: Math.PI },
    { side: 1, z: 0.34, phase: 0 },
    { side: 1, z: 0.12, phase: Math.PI },
    { side: 1, z: -0.08, phase: 0 },
    { side: 1, z: -0.26, phase: Math.PI }
];

// The tail rises above the rear of the carapace so its silhouette reads from
// the same front-facing formation camera as the Beetle's horn and elytra.
function buildScorpionTailChain(mount, geometries, segments, material) {
    const chain = [];
    let parent = mount;
    segments.forEach((segment, index) => {
        const mesh = new THREE.Mesh(geometries[index], material);
        mesh.position.y = index === 0 ? 0 : segments[index - 1].length;
        mesh.rotation.z = segment.bend;
        mesh.userData.baseBend = segment.bend;
        parent.add(mesh);
        parent = mesh;
        chain.push(mesh);
    });
    return chain;
}

// Geometries and materials are built once and cached — the scorpion follows
// the same lazy registry pattern as all other alien types.

let scorpionParts = null;

function getScorpionParts() {
    if (scorpionParts) return scorpionParts;

    scorpionParts = {
        abdomenGeometry: buildVoxelGeometry(SCORPION_ABDOMEN),
        cephaloGeometry: buildVoxelGeometry(SCORPION_CEPHALOTHORAX),
        eyeGeometry: buildVoxelGeometry(SCORPION_HEAD),
        // A separate eye mesh lets the lenses pulse without flooding the shell.
        eyeHighlightGeometry: buildVoxelGeometry([
            { size: [0.05, 0.04, 0.04], pos: [-0.18, 0.08, 0.54], color: 0xffc331 },
            { size: [0.05, 0.04, 0.04], pos: [0.18, 0.08, 0.54], color: 0xffc331 }
        ]),
        tailGeometries: SCORPION_TAIL_SEGMENTS.map((s, i) =>
            buildVoxelGeometry([
                { size: [s.width, s.length, s.width], pos: [0, s.length / 2, 0], color: SCORPION_RUST },
                { size: [s.width + 0.05, 0.04, s.width + 0.05], pos: [0, 0.02, 0], color: SCORPION_PLATES[i].color }
            ])
        ),
        stingerGeometry: buildVoxelGeometry(SCORPION_STINGER),
        pincerGeometries: {
            '-1': buildVoxelGeometry(mirrorBoxes(SCORPION_PINCER)),
            '1': buildVoxelGeometry(SCORPION_PINCER)
        },
        clawGeometries: {
            '-1': buildVoxelGeometry(mirrorBoxes(SCORPION_CLAW)),
            '1': buildVoxelGeometry(SCORPION_CLAW)
        },
        legGeometries: SCORPION_LEG_SEGMENTS.map(s =>
            buildLimbSegmentGeometry(s, SCORPION_RUST, SCORPION_DARK)
        ),
        abdomenMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x5b2106,
            emissiveIntensity: 0.45,
            shininess: 35,
            flatShading: true
        }),
        cephaloMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x6d2608,
            emissiveIntensity: 0.55,
            shininess: 45,
            flatShading: true
        }),
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x2a1005,
            emissiveIntensity: 0.2,
            flatShading: true
        }),
        // The eyes and stinger are the only bright accents.
        eyeHighlightMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xff9d16,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        stingerMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xff9d16,
            emissiveIntensity: 1.4,
            flatShading: true
        }),
        pincerMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x571d06,
            emissiveIntensity: 0.35,
            flatShading: true
        }),
        legMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x4a1906,
            emissiveIntensity: 0.3,
            flatShading: true
        }),
        tailMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x7b2b06,
            emissiveIntensity: 0.45,
            flatShading: true
        })
    };

    return scorpionParts;
}

function createScorpionAlien(group) {
    const parts = getScorpionParts();

    // Abdomen — rear body half — clone material so animation doesn't leak
    const abdomen = new THREE.Mesh(parts.abdomenGeometry, parts.abdomenMaterial.clone());
    abdomen.position.z = -0.10;
    group.add(abdomen);
    group.userData.abdomen = abdomen;

    // Cephalothorax (head shield) — front body half
    const cephalo = new THREE.Mesh(parts.cephaloGeometry, parts.cephaloMaterial.clone());
    cephalo.position.z = 0.36;
    group.add(cephalo);
    group.userData.cephalo = cephalo;

    // Eyes + fangs cluster — body, separated highlights glow independently
    const eyeBody = new THREE.Mesh(parts.eyeGeometry, parts.eyeMaterial.clone());
    eyeBody.position.set(0, 0.04, 0.50);
    group.add(eyeBody);
    group.userData.eyes = eyeBody;

    // Separate glow-only mesh for eye highlights (compound eye reflections)
    const eyeHighlights = new THREE.Mesh(parts.eyeHighlightGeometry, parts.eyeHighlightMaterial.clone());
    eyeHighlights.position.set(0, 0.04, 0.50);
    group.add(eyeHighlights);
    group.userData.eyeHighlights = eyeHighlights;

    // Tail chain — base mount at rear of abdomen, slightly elevated
    const tailMount = new THREE.Group();
    tailMount.position.set(0, 0.10, -0.48);
    group.add(tailMount);

    const tailChain = buildScorpionTailChain(
        tailMount,
        parts.tailGeometries,
        SCORPION_TAIL_SEGMENTS,
        parts.tailMaterial
    );

    // Stinger — venom sac + needle with glow
    const stingerMesh = new THREE.Mesh(
        parts.stingerGeometry,
        parts.stingerMaterial.clone()
    );
    // Attach to the last (5th) segment tip
    stingerMesh.position.y = SCORPION_TAIL_SEGMENTS[4].length + 0.02;
    tailChain[4].add(stingerMesh);

    // Pincers — two chunky arm sections and a distinct claw tip.
    group.userData.pincers = [-1, 1].map(side => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.50, 0.05, 0.24);
        pivot.rotation.y = -side * 0.3;
        group.add(pivot);

        const upperArm = new THREE.Mesh(
            parts.pincerGeometries[side.toString()],
            parts.pincerMaterial.clone()
        );
        upperArm.position.z = 0.10;
        upperArm.rotation.x = -0.35;
        pivot.add(upperArm);

        // Lower jaw / pincer tip — opens independently
        const jaw = new THREE.Mesh(
            parts.clawGeometries[side.toString()],
            parts.pincerMaterial.clone()
        );
        jaw.position.z = 0.52;
        jaw.rotation.x = 0.35;
        pivot.add(jaw);

        return { pivot, upperArm, jaw, side };
    });

    // Store tail references for animation
    group.userData.tailChain = tailChain;
    group.userData.tailPivot = tailMount;
    group.userData.stinger = stingerMesh;

    // Eight legs — tripod gait with joint spurs
    group.userData.legs = SCORPION_LEG_MOUNTS.map(config => {
        const legMount = new THREE.Group();
        legMount.position.set(config.side * 0.55, -0.10, config.z);
        legMount.rotation.y = config.side > 0 ? 0 : Math.PI;
        group.add(legMount);

        const segments = buildLimbChain(
            legMount,
            parts.legGeometries,
            SCORPION_LEG_SEGMENTS,
            parts.legMaterial,
            -1
        );

        return { mount: legMount, segments, phase: config.phase, side: config.side };
    });
}

// Animate a single alien
export function animateAlien(alien) {
    const time = Date.now() * 0.001 + alien.userData.animationOffset;
    const row = alien.userData.row;

    // Different animations for each row
    switch (row) {
        case 0: { // Octopus - curling tentacles, pulsing vents, blinking eyes
            const octopus = alien.userData;

            // Jet cycle: quick contraction, slow glide back out
            const jetCycle = (Math.sin(time * 2.2) + 1) / 2;
            const thrust = Math.pow(jetCycle, 2.5);

            if (octopus.tentacles) {
                octopus.tentacles.forEach((segments, i) => {
                    // Wave travels around the ring of limbs...
                    const ringPhase = time * 4 + i * 0.9;
                    segments.forEach((segment, j) => {
                        // ...and then down each limb, growing toward the tip
                        const lag = ringPhase - j * 0.7;
                        const amplitude = 0.22 + j * 0.16;
                        segment.rotation.z = segment.userData.baseTilt
                            + Math.sin(lag) * amplitude
                            - thrust * 0.12 * (j + 1);
                        segment.rotation.x = Math.cos(lag * 0.8) * amplitude * 0.5;
                    });
                });
            }

            // Hood flares against the jet. Scaling the mantle rather than the
            // group keeps the swoop telegraph's scale handling intact.
            if (octopus.mantle) {
                octopus.mantle.scale.set(1 + thrust * 0.1, 1 - thrust * 0.12, 1 + thrust * 0.1);
            }

            // Vents flare as the body contracts
            if (octopus.vents) {
                octopus.vents.material.emissiveIntensity = 1.1 + thrust * 2.4;
            }

            // Eyes drift around and pulse
            if (octopus.eyes) {
                octopus.eyes.position.x = Math.sin(time * 0.7) * 0.05;
                octopus.eyes.position.y = Math.sin(time * 0.5) * 0.03;
                octopus.eyes.material.emissiveIntensity = 1.9 + Math.sin(time * 3) * 0.6;
            }

            // Blink: lids snap shut and reopen roughly every 4 seconds. The
            // per-alien animation offset keeps the formation out of sync.
            if (octopus.lids) {
                const blinkPhase = (time % 4.1) / 4.1;
                const blink = blinkPhase < 0.09 ? Math.sin((blinkPhase / 0.09) * Math.PI) : 0;
                octopus.lids.position.y = OCTOPUS_LID_OPEN_Y
                    - blink * (OCTOPUS_LID_OPEN_Y - OCTOPUS_LID_CLOSED_Y);
            }

            // Beak chomps on the contraction
            if (octopus.beakUpper && octopus.beakLower) {
                const chomp = Math.pow((Math.sin(time * 2.2 - 1) + 1) / 2, 6) * 0.5;
                octopus.beakUpper.rotation.x = -0.25 - chomp;
                octopus.beakLower.rotation.x = 0.25 + chomp;
            }

            // Breathing body scale (out of sync with the tentacles)
            const breathScale = 1 + Math.sin(time * 2) * 0.06;
            alien.scale.set(breathScale, breathScale, breathScale);
            // Gentle rotation wobble
            alien.rotation.y = Math.sin(time * 0.8) * 0.18;
            alien.rotation.z = Math.sin(time * 1.2) * 0.08;
            break;
        }

        case 1: { // Crab - tripod gait, snapping pincers, swivelling eye stalks
            const crab = alien.userData;
            const gait = time * 7;

            // Walking legs: each tripod plants while the other swings
            if (crab.legs) {
                crab.legs.forEach(leg => {
                    const step = Math.sin(gait + leg.phase);
                    const lift = Math.max(0, step);
                    // Femur lifts the leg, tibia extends to reach for the ground
                    leg.segments[0].rotation.z = leg.segments[0].userData.baseBend - lift * 0.45;
                    leg.segments[1].rotation.z = leg.segments[1].userData.baseBend + lift * 0.35;
                    // Swing fore and aft through the step
                    leg.segments[0].rotation.x = Math.cos(gait + leg.phase) * 0.3;
                });
            }

            // Pincers: fast close, slow open, with the arm thrusting on the snap
            if (crab.claws) {
                crab.claws.forEach((claw, i) => {
                    const snapCycle = (Math.sin(time * 4 + i * Math.PI) + 1) / 2;
                    const snap = Math.pow(snapCycle, 4);   // spikes near the close

                    claw.jawUpper.rotation.x = -0.5 + snap * 0.45;
                    claw.jawLower.rotation.x = 0.5 - snap * 0.45;
                    // Elbow straightens as the claw closes, thrusting it forward
                    claw.segments[0].rotation.x = claw.segments[0].userData.baseLift - snap * 0.2;
                    claw.segments[1].rotation.y = claw.segments[1].userData.baseYaw + claw.side * snap * 0.28;
                });
            }

            // Eye stalks swivel, bob, and occasionally flinch down
            if (crab.stalks) {
                crab.stalks.forEach((stalk, i) => {
                    const look = Math.sin(time * 1.3 + i * 1.7);
                    stalk.segments[0].rotation.z = stalk.segments[0].userData.baseBend + look * 0.3;
                    stalk.segments[1].rotation.z = stalk.segments[1].userData.baseBend - look * 0.4;
                    stalk.segments[0].rotation.x = Math.sin(time * 2.1 + i) * 0.18;
                    // Flinch: both stalks duck briefly, roughly every 3.4s
                    const flinchPhase = (time % 3.4) / 3.4;
                    const flinch = flinchPhase < 0.12 ? Math.sin((flinchPhase / 0.12) * Math.PI) : 0;
                    stalk.mount.position.y = CRAB_STALK_Y - flinch * 0.16;
                    stalk.eye.scale.setScalar(1 - flinch * 0.25);
                });
            }

            // Mandibles chatter fast under the rim
            if (crab.mandibles) {
                crab.mandibles.forEach((mandible, i) => {
                    mandible.rotation.x = Math.sin(time * 14 + i * Math.PI) * 0.35;
                });
            }

            // Molten seams glow hotter as the claws close
            if (crab.seams) {
                const heat = Math.pow((Math.sin(time * 4) + 1) / 2, 3);
                crab.seams.material.emissiveIntensity = 1.2 + heat * 2.2;
            }

            // Eyes pulse
            if (crab.stalks && crab.stalks[0]) {
                crab.stalks[0].eye.material.emissiveIntensity = 1.1 + Math.sin(time * 3.5) * 0.4;
            }

            // Body bobs and rocks with the gait. This rides on the carapace and
            // rotation, never position.x - the formation owns that.
            if (crab.carapace) {
                crab.carapace.position.y = Math.abs(Math.sin(gait)) * 0.05;
            }
            alien.rotation.z = Math.sin(gait) * 0.12;
            alien.rotation.x = Math.sin(gait * 2) * 0.04;
            break;
        }

        case 2: { // Squid - jet propulsion, rippling fins, lashing tentacles
            const squid = alien.userData;

            // Jet cycle as an explicit event: a hard contraction, then a long
            // glide. `vent` is a much tighter window, so the siphon reads as a
            // flash rather than a permanent glow.
            const jetPhase = (time % 2.4) / 2.4;
            const thrust = jetPhase < 0.26 ? Math.sin((jetPhase / 0.26) * Math.PI) : 0;
            const vent = jetPhase < 0.07 ? Math.sin((jetPhase / 0.07) * Math.PI) : 0;

            // Squash and stretch as the mantle expels its water. This rides on
            // the mantle, not the group - the swoop telegraph owns alien.scale.
            if (squid.mantle) {
                squid.mantle.scale.set(1 - thrust * 0.17, 1 + thrust * 0.16, 1 - thrust * 0.17);
            }

            // Chromatophores flush with the jet
            if (squid.spots) {
                squid.spots.material.emissiveIntensity =
                    0.9 + (Math.sin(time * 2.3) + 1) * 0.55 + thrust * 1.8;
            }

            // Fins undulate constantly, then sweep flat and back on the power
            // stroke so the squid streamlines into the jet
            if (squid.fins) {
                squid.fins.forEach(fin => {
                    const wave = Math.sin(time * 3.4 + fin.side * 0.6);
                    fin.mesh.rotation.z = fin.side * (wave * 0.34 - thrust * 0.40);
                    fin.mesh.rotation.x = Math.sin(time * 3.4 - 0.9) * 0.24;
                    fin.mesh.rotation.y = fin.side * thrust * 0.22;
                });
            }

            // Arm crown: a wave travels around the ring...
            if (squid.arms) {
                squid.arms.forEach(arm => {
                    const ringPhase = time * 4.6 + arm.phase;
                    arm.segments.forEach((segment, j) => {
                        // ...and then down each arm, growing toward the tip.
                        // Thrust pulls the whole crown into a spear.
                        const lag = ringPhase - j * 0.8;
                        const amplitude = 0.16 + j * 0.14;
                        segment.rotation.z = segment.userData.baseBend
                            + Math.sin(lag) * amplitude
                            - thrust * (0.26 + j * 0.10);
                        segment.rotation.x = Math.cos(lag * 0.7) * amplitude * 0.6;
                    });
                });
            }

            // Feeding tentacles drift, then lash out roughly every five seconds
            const strikePhase = (time % 5.3) / 5.3;
            const strike = strikePhase < 0.13 ? Math.sin((strikePhase / 0.13) * Math.PI) : 0;

            if (squid.tentacles) {
                squid.tentacles.forEach((tentacle, i) => {
                    // The lash lives on the un-yawed pivot, so both tentacles
                    // swing toward the player rather than mirroring apart
                    tentacle.pivot.rotation.x = -strike * 0.95;
                    tentacle.pivot.rotation.y = Math.sin(time * 1.6 + i * 2.1) * 0.12;

                    tentacle.segments.forEach((segment, j) => {
                        const drift = Math.sin(time * 2.6 - j * 0.9 + i * 1.4);
                        // Straightens as it strikes, coils back as it recovers
                        segment.rotation.z = segment.userData.baseBend * (1 - strike * 0.9)
                            + drift * (0.10 + j * 0.07);
                    });

                    tentacle.club.scale.setScalar(1 + strike * 0.45);
                });
            }

            // Head cranes against the body pitch, keeping the eyes on the player
            if (squid.head) {
                squid.head.rotation.x = thrust * 0.20;
            }

            // Eyes drift and pulse, and widen on the strike
            if (squid.eyes) {
                squid.eyes.position.x = Math.sin(time * 0.9) * 0.03;
                squid.eyes.material.emissiveIntensity = 2.0 + Math.sin(time * 3.2) * 0.7 + strike * 1.5;
            }

            // Blink: lids drop and lift roughly every 3.7 seconds. The per-alien
            // animation offset keeps the formation out of sync.
            if (squid.lids) {
                const blinkPhase = (time % 3.7) / 3.7;
                const blink = blinkPhase < 0.08 ? Math.sin((blinkPhase / 0.08) * Math.PI) : 0;
                squid.lids.position.y = SQUID_LID_OPEN_Y
                    - blink * (SQUID_LID_OPEN_Y - SQUID_LID_CLOSED_Y);
            }

            // Siphon flashes as the jet fires, and the plume stabs out with it
            if (squid.siphon) {
                squid.siphon.material.emissiveIntensity = 1.1 + vent * 3.4 + thrust * 1.0;
                squid.siphon.scale.set(1 + vent * 0.25, 1 + vent * 0.20, 1);
            }
            if (squid.plume) {
                squid.plume.visible = thrust > 0.02;
                squid.plume.material.opacity = thrust * 0.5;
                squid.plume.scale.set(0.5 + thrust * 0.5, 0.5 + thrust * 0.5, 0.35 + thrust * 0.65);
            }

            // Pitches nose-up into the jet, then sways through the glide
            alien.rotation.x = -thrust * 0.24 + Math.sin(time * 1.3) * 0.05;
            alien.rotation.z = Math.sin(time * 1.1) * 0.09;
            alien.rotation.y = Math.sin(time * 0.7) * 0.16;

            // Each jet kicks the squid upward and it settles back on the glide.
            // Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = thrust * 0.34 + Math.sin(time * 1.3) * 0.06;
            }
            break;
        }

        case 3: { // UFO - counter-rotating saucer, chase lights, scan beam
            const ufo = alien.userData;

            if (ufo.lights) {
                ufo.lights.forEach((light, i) => {
                    // Chase effect: the bright spot travels around the ring
                    const angle = (i / UFO_LIGHT_COUNT) * Math.PI * 2;
                    const intensity = (Math.sin(time * 5 + angle) + 1) / 2;

                    light.material.emissiveIntensity = 0.5 + intensity * 2.6;
                    const lightScale = 1 + intensity * 0.6;
                    light.scale.setScalar(lightScale);
                });
            }

            // Hull spins beneath a level canopy; the light collar counter-rotates
            if (ufo.hull) ufo.hull.rotation.y = time * 1.6;
            if (ufo.ring) ufo.ring.rotation.y = -time * 1.1;

            // Canopy glow breathes, and the pilot looks around inside it
            if (ufo.dome) {
                ufo.dome.material.emissiveIntensity = 0.6 + Math.sin(time * 2.4) * 0.35;
            }
            if (ufo.pilot) {
                ufo.pilot.rotation.y = Math.sin(time * 0.6) * 0.5;
                ufo.pilot.position.y = Math.sin(time * 3) * 0.012;
            }

            // Scan sweep: the emitter charges, then a beam stabs downward
            const scanPhase = (time % 5.5) / 5.5;
            const scanning = scanPhase < 0.16;
            const scan = scanning ? Math.sin((scanPhase / 0.16) * Math.PI) : 0;

            if (ufo.emitter) {
                ufo.emitter.material.emissiveIntensity = 1.0 + scan * 3.0;
                ufo.emitter.scale.set(1 + scan * 0.2, 1, 1 + scan * 0.2);
            }
            if (ufo.beam) {
                ufo.beam.visible = scan > 0.01;
                ufo.beam.material.opacity = scan * 0.32;
                ufo.beam.scale.set(0.4 + scan * 0.6, 1, 0.4 + scan * 0.6);
            }

            // Complex hover (superimposed waves). Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.sin(time * 1.5) * 0.2 + Math.sin(time * 4.2) * 0.1;
            }

            // Gyroscopic wobble of the craft as a whole
            alien.rotation.x = Math.sin(time * 2) * 0.15;
            alien.rotation.z = Math.cos(time * 1.7) * 0.15;
            break;
        }

        case 4: { // Tank - rolling treads, tracking turret, recoiling gun
            const tank = alien.userData;

            // Fire cycle as an explicit event: a crisp shot, a recoil that
            // snaps back and eases out, then a long recharge
            const firePhase = (time % 3.1) / 3.1;
            const flash = firePhase < 0.06 ? Math.sin((firePhase / 0.06) * Math.PI) : 0;
            const recoil = firePhase < 0.02
                ? firePhase / 0.02
                : Math.max(0, 1 - (firePhase - 0.02) / 0.18);
            const charge = Math.max(0, (firePhase - 0.08) / 0.92);
            const isFiring = recoil > 0.5;

            // Treads scroll at the formation's real speed. Accumulated from a
            // delta rather than multiplied into `time`, so the changing speed
            // never makes the tracks jump.
            const now = performance.now() * 0.001;
            const dt = Math.min(0.05, now - (tank.treadClock !== undefined ? tank.treadClock : now));
            tank.treadClock = now;
            tank.treadScroll = ((tank.treadScroll || 0) + dt * (0.25 + alienSpeed * 7)) % 1;

            if (tank.treadPlates) {
                tank.treadPlates.forEach(plate => {
                    const point = treadPointAt(tank.treadScroll + plate.offset);
                    plate.mesh.position.y = point.y;
                    plate.mesh.position.z = point.z;
                    plate.mesh.rotation.x = point.angle;
                });
            }
            if (tank.wheels) {
                // Wheel rotation matches the track's surface speed
                const spin = tank.treadScroll * (2 * TANK_TREAD_RUN + 2 * Math.PI * TANK_TREAD_RADIUS) / TANK_TREAD_RADIUS;
                tank.wheels.forEach(wheel => { wheel.rotation.x = spin; });
            }

            // Turret sweeps for a target, dish sweeps faster
            if (tank.turret) {
                tank.turret.rotation.y = Math.sin(time * 0.8) * 0.45;
            }
            if (tank.dish) {
                tank.dish.rotation.y = time * 2.2;
            }

            // Barrel recoils into the mantlet, then eases back out
            if (tank.barrel) {
                tank.barrel.position.z = tank.barrelRestZ - recoil * 0.22;
                tank.barrel.rotation.x = -0.04 + Math.sin(time * 0.8 + 1) * 0.06;
            }
            if (tank.muzzle) {
                tank.muzzle.visible = flash > 0.01;
                tank.muzzle.material.opacity = flash * 0.55;
                tank.muzzle.scale.setScalar(0.3 + flash * 0.6);
            }

            // Coils glow back up while recharging, and dump on the shot
            if (tank.coils) {
                tank.coils.material.emissiveIntensity = 0.6 + charge * 2.4;
            }

            // Hull pitches on the shot, otherwise idles with an engine rumble.
            // The formation owns position.z, so the kick stays in rotation -
            // nudging Z here accumulates and walks tanks backwards.
            alien.rotation.x = isFiring ? -0.1 : Math.sin(time * 4) * 0.04;

            // Rumble/Vibration. Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.sin(time * 20) * 0.02;
            }
            break;
        }

        case 5: { // Beetle - creeping gait that breaks into buzzing flight
            const beetle = alien.userData;

            // Flight cycle: shell splits, wings buzz, beetle lifts, then settles
            const flightPhase = (time % 7.2) / 7.2;
            let openness = 0;
            if (flightPhase < 0.06) {
                openness = flightPhase / 0.06;                    // shell cracks open
            } else if (flightPhase < 0.30) {
                openness = 1;                                     // airborne
            } else if (flightPhase < 0.38) {
                openness = 1 - (flightPhase - 0.30) / 0.08;       // folds away
            }
            const airborne = openness > 0.05;

            // Elytra hinge up and outward from the spine
            if (beetle.elytra) {
                beetle.elytra.forEach(elytron => {
                    elytron.mesh.rotation.z = elytron.side * openness * 0.75;
                    // Splay backward as they lift, so they open as a V from above
                    elytron.mesh.rotation.y = -elytron.side * openness * 0.32;
                    elytron.mesh.rotation.x = -openness * 0.24;
                });
            }

            // Wings unfold and blur. The fast oscillation deliberately aliases
            // at frame rate, which is what sells the blur.
            if (beetle.wings) {
                beetle.wings.forEach(wing => {
                    wing.mesh.visible = airborne;
                    if (!airborne) return;
                    const beat = Math.sin(time * 55 + wing.side);
                    wing.mesh.rotation.z = wing.side * (openness * 0.30 + beat * 0.28);
                    wing.mesh.rotation.x = beat * 0.16;
                    wing.mesh.material.opacity = 0.20 + openness * 0.26;
                });
            }

            // Legs: creeping tripod on the ground, tucked up in flight
            if (beetle.legs) {
                beetle.legs.forEach(leg => {
                    const step = Math.sin(time * 9 + leg.phase);
                    const lift = Math.max(0, step) * (1 - openness);
                    leg.segments[0].rotation.z = leg.segments[0].userData.baseBend
                        - lift * 0.40 - openness * 0.55;
                    leg.segments[1].rotation.z = leg.segments[1].userData.baseBend
                        + lift * 0.30 + openness * 0.70;
                    leg.segments[2].rotation.z = leg.segments[2].userData.baseBend + openness * 0.40;
                    // Reach forward and back through the step - a creep, not a sideways scuttle
                    leg.segments[0].rotation.x = Math.cos(time * 9 + leg.phase) * 0.38 * (1 - openness);
                });
            }

            // Antennae sweep and waggle, tucking back in flight
            if (beetle.antennae) {
                beetle.antennae.forEach((antenna, i) => {
                    antenna.mesh.rotation.y = antenna.mesh.userData.baseYaw
                        + Math.sin(time * 4 + i * Math.PI) * 0.28;
                    antenna.mesh.rotation.x = -0.25 + Math.sin(time * 3 + i) * 0.20 - openness * 0.35;
                });
            }

            // Head bobs with the creep and lifts to look ahead in flight
            if (beetle.head) {
                beetle.head.rotation.x = Math.sin(time * 9) * 0.06 - openness * 0.22;
            }

            // Web-bomb sac charges on the ground and flares as it lifts off
            if (beetle.sac) {
                const charge = (Math.sin(time * 2.2) + 1) / 2;
                beetle.sac.material.emissiveIntensity = 1.0 + charge * 1.6 + openness * 1.4;
                const swell = 1 + charge * 0.12;
                beetle.sac.scale.set(swell, swell, swell);
            }

            // Body rocks with the gait, and tilts nose-up once airborne
            alien.rotation.z = Math.sin(time * 9) * 0.07 * (1 - openness);
            alien.rotation.x = Math.sin(time * 6) * 0.04 - openness * 0.12;

            // Creeping bob on the ground, real lift when the wings are out.
            // Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.abs(Math.sin(time * 9)) * 0.03 * (1 - openness)
                    + openness * 0.42;
            }
            break;
        }


        case 6: { // Invader - two-frame retro march, blinking optics, blaster recoil
            const invader = alien.userData;

            // The march is a hard two-frame sprite flip, not a smooth walk
            // cycle - that stutter is the whole point of the homage row.
            // Accumulated from a frame delta, so the formation speeding up
            // changes the cadence instead of jumping the pose.
            const now = performance.now() * 0.001;
            const dt = Math.min(0.05, now - (invader.marchClock !== undefined ? invader.marchClock : now));
            invader.marchClock = now;
            invader.marchStep = ((invader.marchStep || 0) + dt * (0.9 + alienSpeed * 20)) % 2;

            // Square wave with a short blended edge: crisp at any frame rate,
            // without the tearing a true instant flip would give
            const stepPhase = invader.marchStep % 1;
            const snap = Math.min(1, stepPhase / 0.12);
            const frame = invader.marchStep < 1 ? snap : 1 - snap;
            const swing = frame * 2 - 1;   // -1..1, holding at the extremes

            // Fire cycle as explicit events: a crisp flash, a recoil that snaps
            // back and eases out, then a long recharge
            const firePhase = (time % 2.6) / 2.6;
            const flash = firePhase < 0.05 ? Math.sin((firePhase / 0.05) * Math.PI) : 0;
            const recoil = firePhase < 0.02
                ? firePhase / 0.02
                : Math.max(0, 1 - (firePhase - 0.02) / 0.16);
            const charge = Math.max(0, (firePhase - 0.07) / 0.93);

            // Legs: one strides while the other plants, swapping on the flip
            if (invader.legs) {
                invader.legs.forEach(leg => {
                    const lead = leg.side * swing;
                    const lift = Math.max(0, lead);
                    // Hip swings fore/aft; -X rotation carries the foot forward
                    leg.segments[0].rotation.x = -lead * 0.32;
                    leg.segments[1].rotation.x = lift * 0.55;
                    leg.foot.rotation.x = -lift * 0.30;
                });
            }

            // Arms pump against the legs, and both snap up on the shot
            if (invader.arms) {
                const raise = 0.06 + flash * 0.12;   // symmetric, so it stays square-on
                invader.arms.forEach(arm => {
                    arm.mesh.rotation.z = arm.side * raise - swing * 0.16;
                    arm.mesh.rotation.x = arm.side * swing * 0.20;
                });
            }

            // Antennae sway outward together and twitch on each footfall
            if (invader.antennae) {
                invader.antennae.forEach(antenna => {
                    antenna.mesh.rotation.z = antenna.side * (Math.sin(time * 5) * 0.22 + swing * 0.10);
                    antenna.mesh.rotation.x = Math.sin(time * 4 + antenna.side) * 0.16;
                });
            }

            // Optics: a slow scan glow with an occasional hard blink
            if (invader.eyes) {
                const blinkPhase = (time % 3.7) / 3.7;
                const blink = blinkPhase < 0.04 ? Math.sin((blinkPhase / 0.04) * Math.PI) : 0;
                invader.eyes.scale.y = 1 - blink * 0.9;
                invader.eyes.material.emissiveIntensity =
                    2.0 + Math.sin(time * 3) * 0.5 + charge * 0.8 - blink * 1.6;
            }

            // Barrel recoils into its housing, then eases back out
            if (invader.barrel) {
                invader.barrel.position.z = invader.barrelRestZ - recoil * 0.18;
            }
            if (invader.muzzle) {
                invader.muzzle.visible = flash > 0.01;
                invader.muzzle.material.opacity = flash * 0.6;
                invader.muzzle.scale.setScalar(0.3 + flash * 0.7);
            }

            // Coils glow back up while recharging and dump on the shot
            if (invader.coils) {
                invader.coils.material.emissiveIntensity = 0.7 + charge * 2.4 + flash * 2.0;
            }

            // Body rocks with the march and kicks back on the shot. The
            // formation owns position.z, so the kick stays in rotation.
            alien.rotation.z = swing * 0.06;
            alien.rotation.x = -recoil * 0.10;

            // Stomp: the body dips as a foot plants. Skipped mid-swoop,
            // which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.abs(swing) * 0.05;
            }
            break;
        }

        case 7: { // Scorpion — stalking arachnid
            const scorpion = alien.userData;
            const t = time + (scorpion._animT0 ?? 0);

            // 10s cycle: stand→idle→walk→charge→strike→repeat
            // Gives each state enough time to be visible
            const phase = t % 10;
            const state = phase < 1 ? 'stand'
                : phase < 4 ? 'idle'
                : phase < 7 ? 'walk'
                : phase < 8.5 ? 'charge'
                : 'strike';

            // Shared parameters
            const breathe = Math.sin(t * 2.5) * 0.04;
            const scan = Math.sin(t * 0.6) * 0.08;

            // ---- TAIL ANIMATION ----
            if (scorpion.tailPivot) {
                let targetAngle = 0;
                switch (state) {
                    case 'stand':
                        // Resting vertical with slight ambient sway
                        targetAngle = scan * 0.3;
                        break;
                    case 'idle':
                        // Slow searching sweep
                        targetAngle = Math.sin(t * 0.7) * 0.20;
                        break;
                    case 'walk':
                        // Moderate tracking with step sync
                        targetAngle = Math.sin(t * 0.9) * 0.12 + Math.sin(t * 8) * 0.03;
                        break;
                    case 'charge':
                        // Raised high — coiled for strike
                        targetAngle = 0.55 + Math.sin(t * 1.5) * 0.04;
                        break;
                    case 'strike':
                        // Whip over head — sudden lunge
                        if (!scorpion._strikePhased) {
                            scorpion._strikePhased = true;
                            scorpion._strikeAt = t + 0.6;
                        }
                        const strikeT = Math.min(1, Math.max(0, (t - scorpion._strikeAt) * 3));
                        const strikeF = strikeT < 0.5
                            ? strikeT * 2 : 2 - strikeT * 2;
                        targetAngle = 0.7 * strikeF - 0.4 * Math.max(0, strikeT - 0.5) * 2;
                        if (strikeT >= 1) { scorpion._strikePhased = false; }
                        break;
                }
                scorpion.tailPivot.rotation.z = targetAngle;
            }

            // Tail chain segments follow smoothly
            if (scorpion.tailChain) {
                scorpion.tailChain.forEach((seg, i) => {
                    const baseBend = seg.userData.baseBend || 0;
                    const tailPivZ = scorpion.tailPivot ? scorpion.tailPivot.rotation.z : 0;
                    // Amplification propagates base motion to tip
                    const amp = 1 + i * 0.5;
                    let follow = 0;
                    switch (state) {
                        case 'stand':
                            follow = Math.sin(t * 1.2 + i * 0.6) * 0.015;
                            break;
                        case 'idle':
                            follow = Math.sin(t * 0.7 + i * 0.5) * 0.025;
                            break;
                        case 'walk':
                            follow = Math.sin(t * 0.9 + i * 0.4) * 0.02;
                            break;
                        case 'charge':
                            follow = i * 0.06;
                            break;
                        case 'strike':
                            if (scorpion._strikePhased && scorpion._strikeAt) {
                                const strikeT = Math.min(1, Math.max(0, (t - scorpion._strikeAt) * 3));
                                const strikeF = strikeT < 0.5 ? strikeT * 2 : 2 - strikeT * 2;
                                follow = strikeF * i * 0.12;
                            }
                            break;
                    }
                    seg.rotation.z = baseBend - tailPivZ * (0.3 + i * 0.15) + follow;
                    seg.rotation.x = Math.cos(t * 1.5 + i) * 0.025 * (state === 'charge' ? 1.5 : 1);
                });
            }

            // ---- STINGER ANIMATION ----
            if (scorpion.stinger) {
                let intensity = 0.5;
                let sc = 1;
                switch (state) {
                    case 'stand':
                        intensity = 0.5 + Math.sin(t * 3) * 0.15;
                        break;
                    case 'idle':
                        intensity = 0.6 + Math.sin(t * 2) * 0.4;
                        break;
                    case 'walk':
                        intensity = 0.6 + Math.sin(t * 3) * 0.3;
                        break;
                    case 'charge':
                        // Ramp up to bright during charge
                        intensity = 1.0 + Math.sin(t * 4) * 0.6;
                        sc = 1 + Math.sin(t * 3) * 0.06;
                        break;
                    case 'strike':
                        if (scorpion._strikePhased && scorpion._strikeAt) {
                            const strikeT = Math.min(1, Math.max(0, (t - scorpion._strikeAt) * 3));
                            const strikeF = strikeT < 0.5 ? strikeT * 2 : 2 - strikeT * 2;
                            intensity = 0.5 + strikeF * 3.5;
                            sc = 1 + strikeF * 0.25;
                        }
                        break;
                }
                scorpion.stinger.material.emissiveIntensity = intensity;
                scorpion.stinger.scale.set(sc, sc, sc);
            }

            // ---- PINCERS ANIMATION ----
            if (scorpion.pincers) {
                scorpion.pincers.forEach((p, _) => {
                    let yaw = 0;
                    let jawOpen = 0;
                    let armTilt = -0.35;
                    switch (state) {
                        case 'stand':
                            yaw = Math.sin(t * 1.5) * 0.04 * p.side;
                            jawOpen = 0;
                            armTilt = -0.35;
                            break;
                        case 'idle':
                            yaw = Math.sin(t * 1.2) * 0.06 * p.side;
                            jawOpen = Math.sin(t * 2.5) * 0.04;
                            armTilt = -0.35 - jawOpen * 0.5;
                            break;
                        case 'walk':
                            yaw = Math.sin(t * 2) * 0.08 * p.side;
                            jawOpen = Math.sin(t * 3) * 0.05;
                            armTilt = -0.35 - jawOpen * 0.4;
                            break;
                        case 'charge':
                            yaw = p.pincerSpread ? p.pincerSpread * 0.2 * p.side : 0.15 * p.side;
                            jawOpen = 0.12;
                            armTilt = -0.35 - 0.15 - jawOpen * 0.5;
                            break;
                        case 'strike':
                            // Pincers clamp down
                            yaw = p.side * 0.05;
                            jawOpen = -0.05;
                            armTilt = -0.35;
                            break;
                    }
                    p.pivot.rotation.z = p.side * (Math.sin(t * 1.8) * 0.03 + yaw);
                    p.jaw.rotation.x = 0.35 + jawOpen;
                    p.upperArm.rotation.x = armTilt;
                });
            }

            // ---- LEGS ANIMATION ----
            if (scorpion.legs) {
                scorpion.legs.forEach(leg => {
                    switch (state) {
                        case 'stand':
                        case 'idle': {
                            // Legs planted, subtle weight shift
                            const sway = Math.sin(t * 1.8 + leg.phase) * 0.02;
                            leg.segments[0].rotation.z = (leg.segments[0].userData.baseBend || 0.85) + sway;
                            leg.segments[0].rotation.x = Math.cos(t * 2 + leg.phase) * 0.04;
                            leg.segments[1].rotation.z = leg.segments[1].userData.baseBend || -1.30;
                            leg.segments[2].rotation.z = leg.segments[2].userData.baseBend || -0.20;
                            break;
                        }
                        case 'walk': {
                            // Full tripod gait — two groups alternate
                            const step = Math.sin(t * 6 + leg.phase);
                            const lift = Math.max(0, step);
                            leg.segments[0].rotation.z = (leg.segments[0].userData.baseBend || 0.85) - lift * 0.30;
                            leg.segments[0].rotation.x = Math.cos(t * 6 + leg.phase) * 0.25;
                            leg.segments[1].rotation.z = (leg.segments[1].userData.baseBend || -1.30) + lift * 0.40;
                            leg.segments[2].rotation.z = (leg.segments[2].userData.baseBend || -0.20) + lift * 0.18;
                            break;
                        }
                        case 'charge': {
                            // Legs braced forward, extended
                            leg.segments[0].rotation.z = (leg.segments[0].userData.baseBend || 0.85) - 0.10;
                            leg.segments[0].rotation.x = 0;
                            leg.segments[1].rotation.z = (leg.segments[1].userData.baseBend || -1.30) + 0.08;
                            leg.segments[2].rotation.z = (leg.segments[2].userData.baseBend || -0.20) + 0.04;
                            break;
                        }
                        case 'strike': {
                            // Legs planted firm
                            leg.segments[0].rotation.z = leg.segments[0].userData.baseBend || 0.85;
                            leg.segments[0].rotation.x = Math.sin(t * 20) * 0.02; // vibration
                            leg.segments[1].rotation.z = leg.segments[1].userData.baseBend || -1.30;
                            leg.segments[2].rotation.z = leg.segments[2].userData.baseBend || -0.20;
                            break;
                        }
                    }
                });
            }

            // ---- BODY ANIMATION ----
            if (scorpion.cephalo) {
                switch (state) {
                    case 'stand':
                        scorpion.cephalo.rotation.z = scan * 0.3;
                        scorpion.cephalo.rotation.x = 0;
                        break;
                    case 'idle':
                        scorpion.cephalo.rotation.z = scan + breathe * 0.5;
                        scorpion.cephalo.rotation.x = Math.sin(t * 0.8) * 0.04;
                        break;
                    case 'walk':
                        scorpion.cephalo.rotation.z = scan * 0.5 + Math.sin(t * 8) * 0.04;
                        scorpion.cephalo.rotation.x = -Math.abs(Math.sin(t * 8)) * 0.04;
                        break;
                    case 'charge':
                        scorpion.cephalo.rotation.z = scan * 0.3 + 0.06;
                        scorpion.cephalo.rotation.x = -0.08; // leans forward
                        break;
                    case 'strike':
                        scorpion.cephalo.rotation.z = scan * 0.2;
                        scorpion.cephalo.rotation.x = 0.08; // recoils back on strike
                        break;
                }
            }

            if (scorpion.abdomen) {
                switch (state) {
                    case 'stand':
                        scorpion.abdomen.rotation.z = 0;
                        scorpion.abdomen.rotation.x = breathe * 2;
                        break;
                    case 'idle':
                        scorpion.abdomen.rotation.z = Math.sin(t * 0.5) * 0.02;
                        scorpion.abdomen.rotation.x = Math.sin(t * 2.5) * 0.03;
                        break;
                    case 'walk':
                        scorpion.abdomen.rotation.z = Math.sin(t * 8) * 0.03;
                        scorpion.abdomen.rotation.x = Math.abs(Math.sin(t * 8)) * 0.04;
                        break;
                    case 'charge': {
                        scorpion.abdomen.rotation.z = 0;
                        const breathe2 = Math.sin(t * 3) * 0.02;
                        // Abdomen rises with tail
                        scorpion.abdomen.rotation.x = breathe2 - 0.06;
                        break;
                    }
                    case 'strike':
                        scorpion.abdomen.rotation.z = 0;
                        scorpion.abdomen.rotation.x = 0.08; // body bounces
                        break;
                }
            }

            // ---- EYE ANIMATION ----
            if (scorpion.eyeHighlights) {
                let eyeS = 1;
                let hIntensity = 0.6;
                switch (state) {
                    case 'stand':
                        hIntensity = 0.6 + Math.sin(t * 1.5) * 0.15;
                        eyeS = 1;
                        break;
                    case 'idle':
                        hIntensity = 0.7 + Math.sin(t * 2) * 0.2;
                        eyeS = 1;
                        break;
                    case 'walk':
                        hIntensity = 0.7 + Math.sin(t * 2.5) * 0.18;
                        eyeS = 1;
                        break;
                    case 'charge':
                        // Eyes glow brighter during charge
                        hIntensity = 1.2 + Math.sin(t * 4) * 0.5;
                        eyeS = 1;
                        break;
                    case 'strike':
                        // Intense flash on strike
                        hIntensity = 3.0;
                        eyeS = 1.08;
                        break;
                }
                scorpion.eyeHighlights.material.emissiveIntensity = hIntensity;
                scorpion.eyeHighlights.scale.set(eyeS, eyeS, eyeS);
            }

            // Overall body sway
            alien.rotation.z = state === 'stand' ? scan * 0.4
                : state === 'walk' ? Math.sin(t * 8) * 0.06
                : state === 'strike' ? Math.sin(t * 20) * 0.04
                : Math.sin(t * 1.2) * 0.05;

            // Y-position — stomp, breathing, bounce
            if (!alien.userData.isSwooping) {
                switch (state) {
                    case 'stand':
                        alien.position.y = breathe;
                        break;
                    case 'idle':
                        alien.position.y = breathe * 1.5 + Math.sin(t * 0.8) * 0.02;
                        break;
                    case 'walk':
                        alien.position.y = Math.abs(Math.sin(t * 8)) * 0.04;
                        break;
                    case 'charge':
                        alien.position.y = breathe * 0.5 - 0.02;
                        break;
                    case 'strike':
                        alien.position.y = Math.abs(Math.sin(t * 18)) * 0.03;
                        break;
                }
            }
            break;
        }
    }
}

// Update alien formation movement
export function updateAliens(gameOverCallback) {
    if (aliens.length === 0) return;

    // Dynamic speed calculation based on remaining aliens
    // As aliens are destroyed, they speed up significantly
    const totalAliens = levelConfig.rows * levelConfig.cols;
    const remainingRatio = Math.min(aliens.length / totalAliens, 1.0);  // Clamp to prevent NaN

    // Use level config base speed, scale up to 6x at the end
    const minSpeed = levelConfig.baseSpeed;
    const maxSpeed = levelConfig.baseSpeed * 6;

    // Non-linear speed curve (gets faster more quickly at the end)
    alienSpeed = minSpeed + (maxSpeed - minSpeed) * Math.pow(1 - remainingRatio, 1.5);

    let shouldMoveDown = false;

    // Check if any alien hit the edge
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;
        if (alien.userData.isSwooping || alien.userData.isTelegraphing) continue; // Ignore swooping aliens for edge check

        if ((alienDirection > 0 && alien.position.x > 13) ||
            (alienDirection < 0 && alien.position.x < -13)) {
            shouldMoveDown = true;
            break;
        }
    }

    if (shouldMoveDown) {
        alienDirection *= -1;
        for (let alien of aliens) {
            if (!alien.userData.destroyed && !alien.userData.isSwooping && !alien.userData.isTelegraphing) {
                alien.position.z += 1;

                // Check if aliens reached player
                if (alien.position.z > 8) {
                    gameOverCallback(false);
                }
            }
        }
        // Speed is now calculated per frame, so we don't need to multiply here
    }

    // Move aliens
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;

        // Handle Kamikaze Swoop
        if (alien.userData.isTelegraphing) {
            updateTelegraph(alien);
        } else if (alien.userData.isSwooping) {
            updateSwoop(alien);
        } else {
            // Normal formation movement
            alien.position.x += alienDirection * alienSpeed;
        }
    }

    // Check for new swoop triggers
    checkSwoopTrigger();
}

// Swoop state
let lastSwoopTime = 0;
const SWOOP_INTERVAL_MIN = 5000; // 5 seconds
const SWOOP_INTERVAL_MAX = 10000; // 10 seconds
let nextSwoopInterval = 5000;

function checkSwoopTrigger() {
    // Only swoop if few aliens remain (based on level config)
    if (aliens.length >= levelConfig.swoopThreshold) return;

    const now = Date.now();
    if (now - lastSwoopTime > nextSwoopInterval) {
        triggerSwoop();
        lastSwoopTime = now;
        nextSwoopInterval = SWOOP_INTERVAL_MIN + Math.random() * (SWOOP_INTERVAL_MAX - SWOOP_INTERVAL_MIN);
    }
}

function triggerSwoop() {
    // Find available aliens not already swooping
    const availableAliens = aliens.filter(a => !a.userData.destroyed && !a.userData.isSwooping);

    if (availableAliens.length === 0) return;

    // Pick a random alien
    const alien = availableAliens[Math.floor(Math.random() * availableAliens.length)];

    // Initialize telegraph state (Warning phase)
    alien.userData.isTelegraphing = true;
    alien.userData.telegraphStartTime = Date.now();
    alien.userData.originalScale = alien.scale.clone();

    // Play warning sound
    playSwoopWarning();
}

function updateTelegraph(alien) {
    const now = Date.now();
    const elapsed = (now - alien.userData.telegraphStartTime) / 1000;

    // Pulse effect (scale up and down rapidly)
    const pulse = 1 + Math.sin(elapsed * 20) * 0.3;
    alien.scale.set(
        alien.userData.originalScale.x * pulse,
        alien.userData.originalScale.y * pulse,
        alien.userData.originalScale.z * pulse
    );

    // Shake effect
    alien.position.x += (Math.random() - 0.5) * 0.2;

    // End telegraph after 1 second
    if (elapsed > 1.0) {
        alien.userData.isTelegraphing = false;
        alien.scale.copy(alien.userData.originalScale); // Reset scale
        startSwoop(alien);
    }
}

function startSwoop(alien) {
    // Initialize swoop state
    alien.userData.isSwooping = true;
    alien.userData.swoopStartTime = Date.now();
    alien.userData.swoopStartX = alien.position.x;
    alien.userData.swoopStartZ = alien.position.z;

    // Randomize swoop pattern
    alien.userData.swoopFreqX = 2 + Math.random() * 3; // Frequency of X wobble
    alien.userData.swoopAmpX = 3 + Math.random() * 4;  // Amplitude of X wobble

    // Increased speed: 0.25 to 0.40 (was 0.15 to 0.25)
    alien.userData.swoopSpeedZ = 0.25 + Math.random() * 0.15;
}

function updateSwoop(alien) {
    const time = (Date.now() - alien.userData.swoopStartTime) * 0.001;

    // Move forward rapidly
    alien.position.z += alien.userData.swoopSpeedZ;

    // Sine wave motion on X
    alien.position.x = alien.userData.swoopStartX + Math.sin(time * alien.userData.swoopFreqX) * alien.userData.swoopAmpX;

    // Dive motion on Y (dip down then up)
    alien.position.y = Math.sin(time * 3) * 2;

    // Banking rotation
    alien.rotation.z = Math.cos(time * alien.userData.swoopFreqX) * 0.5;

    // Check if passed player (Z > 15)
    if (alien.position.z > 15) {
        resetSwoop(alien);
    }
}

function resetSwoop(alien) {
    alien.userData.isSwooping = false;

    // Reset to back of formation
    alien.position.z = -25;

    // Random X position within bounds
    alien.position.x = (Math.random() - 0.5) * 20;

    // Reset rotation
    alien.rotation.z = 0;
    alien.position.y = 0;

    // Ensure it's not too close to edges immediately
    alien.position.x = Math.max(-10, Math.min(10, alien.position.x));
}

// Get all aliens
export function getAliens() {
    return aliens;
}

// Hide all aliens
export function hideAliens() {
    aliens.forEach(alien => {
        alien.visible = false;
    });
}

// Show all aliens
export function showAliens() {
    aliens.forEach(alien => {
        alien.visible = true;
    });
}

import { spawnPowerUp } from './powerups.js';

// Remove alien from array
export function removeAlien(alien, scene) {
    alien.userData.destroyed = true;

    // Chance to drop power-up (10%)
    if (Math.random() < 0.1) {
        spawnPowerUp(alien.position, scene);
    }

    scene.remove(alien);
    const alienIndex = aliens.indexOf(alien);
    if (alienIndex > -1) {
        aliens.splice(alienIndex, 1);
    }
}

// Reset aliens for new game
export function resetAliens(scene) {
    aliens.forEach(alien => scene.remove(alien));
    aliens = [];
    alienDirection = 1;
    alienSpeed = levelConfig.baseSpeed;
    lastSwoopTime = 0;
    nextSwoopInterval = 5000;
}

// Get alien state for reset
export function getAlienState() {
    return {
        direction: alienDirection,
        speed: alienSpeed
    };
}
