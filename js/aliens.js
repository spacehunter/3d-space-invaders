import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { playSwoopWarning } from './audio.js';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_SPACING } from './constants.js';

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
            // Cycle through 7 alien types based on row
            const alienType = row % 7;
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
    }

    return group;
}

// ---------------------------------------------------------------------------
// Octopus (row 0) - detailed voxel sculpt
// ---------------------------------------------------------------------------

// Bake a list of coloured boxes into a single geometry. Detail lives in vertex
// colours instead of extra meshes, so an elaborate part is still one draw call.
function buildVoxelGeometry(boxes) {
    const parts = boxes.map(box => {
        const geometry = new THREE.BoxGeometry(box.size[0], box.size[1], box.size[2]);
        if (box.rotX) geometry.rotateX(box.rotX);
        if (box.rotY) geometry.rotateY(box.rotY);
        if (box.rotZ) geometry.rotateZ(box.rotZ);
        if (box.pos) geometry.translate(box.pos[0], box.pos[1], box.pos[2]);

        const color = new THREE.Color(box.color);
        const vertexCount = geometry.attributes.position.count;
        const colors = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geometry;
    });

    return parts.length === 1 ? parts[0] : mergeGeometries(parts);
}

// Mirror a box list across X. Building a real mirrored geometry beats setting
// scale.x = -1, which inverts normals and breaks the lighting on that half.
function mirrorBoxes(boxes) {
    return boxes.map(box => ({
        ...box,
        pos: [-box.pos[0], box.pos[1], box.pos[2]],
        rotY: box.rotY ? -box.rotY : box.rotY,
        rotZ: box.rotZ ? -box.rotZ : box.rotZ
    }));
}

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

// Limb segment that extends downward from its origin (arms, legs)
function buildLimbSegmentGeometry(segment, color, trimColor) {
    return buildVoxelGeometry([
        { size: [segment.width, segment.length, segment.width], pos: [0, -segment.length / 2, 0], color },
        { size: [segment.width + 0.05, 0.07, segment.width + 0.05], pos: [0, -0.02, 0], color: trimColor }
    ]);
}

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

// Chain meshes so each segment is the next one's pivot
function buildLimbChain(mount, geometries, segments, material, offsetSign) {
    const chain = [];
    let parent = mount;
    segments.forEach((segment, j) => {
        const mesh = new THREE.Mesh(geometries[j], material);
        mesh.position.y = j === 0 ? 0 : offsetSign * segments[j - 1].length;
        const bend = segment.baseBend !== undefined ? segment.baseBend : segment.baseTilt;
        mesh.rotation.z = bend;
        mesh.userData.baseBend = bend;
        parent.add(mesh);
        parent = mesh;
        chain.push(mesh);
    });
    return chain;
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

function createSquidAlien(group) {
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 1.6,
        flatShading: true
    });

    // Head/body
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.8), material);
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 3.0
    });
    const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.2), eyeMaterial);
    eyeLeft.position.set(-0.25, 0.3, 0.4);
    group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.2), eyeMaterial);
    eyeRight.position.set(0.25, 0.3, 0.4);
    group.add(eyeRight);

    // Bottom tentacles
    group.userData.legs = [];
    for (let i = 0; i < 6; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), material);
        leg.position.set(-0.5 + i * 0.2, -0.8, 0);
        leg.userData.baseY = -0.8;
        group.add(leg);
        group.userData.legs.push(leg);
    }
}

// ---------------------------------------------------------------------------
// UFO (row 3) - hard-surface saucer
// ---------------------------------------------------------------------------

// A voxel disc: three overlapping boxes union into a square with cut corners,
// which reads as round far better than a single box does
function saucerTier(width, depth, height, y, color) {
    return [
        { size: [width, height, depth], pos: [0, y, 0], color },
        { size: [depth, height, width], pos: [0, y, 0], color },
        { size: [(width + depth) / 2, height, (width + depth) / 2], pos: [0, y, 0], color }
    ];
}

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


function createInvaderAlien(group) {
    // Classic retro 1-bit white/bright look - high contrast
    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.8,
        flatShading: true
    });

    // Main body - chunky symmetrical block (classic invader shape)
    const bodyTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.6), material);
    bodyTop.position.y = 0.25;
    bodyTop.castShadow = true;
    group.add(bodyTop);

    const bodyMiddle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.7), material);
    bodyMiddle.position.y = 0;
    bodyMiddle.castShadow = true;
    group.add(bodyMiddle);

    const bodyBottom = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.6), material);
    bodyBottom.position.y = -0.25;
    bodyBottom.castShadow = true;
    group.add(bodyBottom);

    // Side wings/arms - symmetrical pixel blocks
    const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.3), material);
    wingLeft.position.set(-0.7, 0.1, 0);
    group.add(wingLeft);

    const wingRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.3), material);
    wingRight.position.set(0.7, 0.1, 0);
    group.add(wingRight);

    // Two short antennae - symmetrical
    const antennaMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        emissive: 0xcccccc,
        emissiveIntensity: 1.5,
        flatShading: true
    });

    const antennaLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), antennaMaterial);
    antennaLeft.position.set(-0.25, 0.55, 0);
    antennaLeft.rotation.z = -0.3;
    group.add(antennaLeft);
    group.userData.antennaLeft = antennaLeft;

    const antennaRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), antennaMaterial);
    antennaRight.position.set(0.25, 0.55, 0);
    antennaRight.rotation.z = 0.3;
    group.add(antennaRight);
    group.userData.antennaRight = antennaRight;

    // Eyes - classic arcade style, high contrast
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 3.5
    });

    const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.15), eyeMaterial);
    eyeLeft.position.set(-0.25, 0.1, 0.35);
    group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.15), eyeMaterial);
    eyeRight.position.set(0.25, 0.1, 0.35);
    group.add(eyeRight);

    // Single center blaster cannon
    const cannonMaterial = new THREE.MeshPhongMaterial({
        color: 0xff4444,
        emissive: 0xff4444,
        emissiveIntensity: 1.6,
        flatShading: true
    });

    const cannon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.5), cannonMaterial);
    cannon.position.set(0, -0.15, 0.5);
    group.add(cannon);
    group.userData.cannon = cannon;

    // Cannon tip - glowing muzzle
    const tipMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 4.0
    });

    const cannonTip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.1), tipMaterial);
    cannonTip.position.set(0, -0.15, 0.75);
    group.add(cannonTip);
    group.userData.cannonTip = cannonTip;

    // Bottom pixel feet - symmetrical
    const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), material);
    footLeft.position.set(-0.35, -0.45, 0);
    footLeft.userData.baseY = -0.45;
    group.add(footLeft);
    group.userData.footLeft = footLeft;

    const footRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), material);
    footRight.position.set(0.35, -0.45, 0);
    footRight.userData.baseY = -0.45;
    group.add(footRight);
    group.userData.footRight = footRight;
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

        case 2: // Squid - propulsion cycle
            // Propulsion: fast stretch/move, slow relax
            const swimCycle = (Math.sin(time * 3) + 1) / 2; // 0 to 1
            const propulsion = Math.pow(swimCycle, 2); // Non-linear

            if (alien.userData.legs) {
                alien.userData.legs.forEach((leg, i) => {
                    // Legs trail behind during propulsion
                    const legLag = propulsion * 0.5;
                    leg.rotation.x = legLag + Math.sin(time * 8 + i) * 0.2;
                    leg.position.y = leg.userData.baseY - legLag * 0.2;
                });
            }

            // Squash and stretch
            const stretch = 1 + propulsion * 0.3;
            const squash = 1 - propulsion * 0.15;
            alien.scale.set(squash, stretch, squash);

            // Move forward (up/down in this view) with propulsion
            alien.position.y = Math.sin(time * 3) * 0.3;

            // Tilt into movement
            alien.rotation.x = propulsion * 0.3;
            break;

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


        case 6: // Invader - classic retro march with cannon charge
            // Antenna waggle - visible swaying motion
            if (alien.userData.antennaLeft) {
                // Sway back and forth with some vertical bobbing
                alien.userData.antennaLeft.rotation.z = -0.3 + Math.sin(time * 5) * 0.4;
                alien.userData.antennaLeft.rotation.x = Math.sin(time * 4) * 0.25;
            }
            if (alien.userData.antennaRight) {
                // Opposite phase for alternating effect
                alien.userData.antennaRight.rotation.z = 0.3 + Math.sin(time * 5 + Math.PI) * 0.4;
                alien.userData.antennaRight.rotation.x = Math.sin(time * 4 + Math.PI) * 0.25;
            }
            // Marching feet - alternating lift like walking
            if (alien.userData.footLeft) {
                const leftLift = Math.max(0, Math.sin(time * 6)) * 0.12;
                alien.userData.footLeft.position.y = alien.userData.footLeft.userData.baseY + leftLift;
                alien.userData.footLeft.position.z = Math.sin(time * 6) * 0.08;
            }
            if (alien.userData.footRight) {
                const rightLift = Math.max(0, Math.sin(time * 6 + Math.PI)) * 0.12;
                alien.userData.footRight.position.y = alien.userData.footRight.userData.baseY + rightLift;
                alien.userData.footRight.position.z = Math.sin(time * 6 + Math.PI) * 0.08;
            }
            // Cannon charge pulse - grows brighter then dims (charging to fire)
            if (alien.userData.cannon) {
                const chargeIntensity = (Math.sin(time * 4) + 1) / 2;
                alien.userData.cannon.material.emissiveIntensity = 1.6 + chargeIntensity * 1.5;
            }
            // Cannon tip glow pulse - pulsing muzzle glow
            if (alien.userData.cannonTip) {
                const tipPulse = (Math.sin(time * 8) + 1) / 2;
                const tipScale = 1 + tipPulse * 0.5;
                alien.userData.cannonTip.scale.set(tipScale, tipScale, tipScale);
                alien.userData.cannonTip.material.emissiveIntensity = 3.0 + tipPulse * 2.0;
            }
            // Slight body rock during march
            alien.rotation.z = Math.sin(time * 6) * 0.08;
            break;
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
