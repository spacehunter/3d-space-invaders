import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// TYPE 19 — PEACOCK: iridescent peacock spider nurse with raised hairy arms
// ---------------------------------------------------------------------------

// Ramp: deep navy → steel blue → bright cyan → emerald green → vivid red band
// Eye flash: warm yellow.  Body base is very dark so the abdomen pops.
const PEACOCK_DARK   = 0x0a1628;
const PEACOCK_SHADE  = 0x1a3a5c;
const PEACOCK_MID    = 0x22d3ee;
const PEACOCK_GREEN  = 0x10b981;
const PEACOCK_RED    = 0xff3366;
const PEACOCK_EYE    = 0xffee88;
const PEACOCK_HAIR   = 0x888888;

// === CEPHALOTHORAX (head) — small compared to abdomen ===
const PEACOCK_HEAD = [
    // Main head block - compact, rounded
    { size: [0.50, 0.35, 0.42], pos: [0, 0.0, 0.35], color: PEACOCK_DARK },
    // Red forehead patch (the "nurse" marking)
    { size: [0.42, 0.20, 0.10], pos: [0, 0.15, 0.55], color: PEACOCK_RED },
    // Mouth/chelicerae area - fuzzy beige
    { size: [0.30, 0.14, 0.12], pos: [0, -0.18, 0.48], color: 0xc4a882 },
];

// === EYES — two enormous front-facing black eyes ===
const PEACOCK_EYES = [
    { size: [0.28, 0.28, 0.12], pos: [-0.15, 0.05, 0.60], color: 0x050505 },
    { size: [0.28, 0.28, 0.12], pos: [0.15, 0.05, 0.60], color: 0x050505 },
    // Eye flash highlights
    { size: [0.12, 0.12, 0.04], pos: [-0.15, 0.10, 0.66], color: PEACOCK_EYE },
    { size: [0.12, 0.12, 0.04], pos: [0.15, 0.10, 0.66], color: PEACOCK_EYE },
];

// === ABDOMEN (nurse hat / iridescent bulb) — large, bulbous, colorful ===
const PEACOCK_ABDOMEN = [
    // Main body — tall bulbous dome, held upright
    { size: [0.80, 0.60, 0.70], pos: [0, 0.55, -0.10], color: PEACOCK_SHADE },
    // Cyan band
    { size: [0.88, 0.12, 0.76], pos: [0, 0.72, -0.12], color: PEACOCK_MID },
    // Emerald green band
    { size: [0.82, 0.14, 0.72], pos: [0, 0.58, -0.14], color: PEACOCK_GREEN },
    // Red accent band
    { size: [0.76, 0.10, 0.68], pos: [0, 0.44, -0.16], color: PEACOCK_RED },
    // Base taper
    { size: [0.56, 0.30, 0.48], pos: [0, 0.20, -0.18], color: PEACOCK_DARK },
    // Top of abdomen — rounded peak
    { size: [0.44, 0.18, 0.36], pos: [0, 0.88, -0.12], color: PEACOCK_SHADE },
];

// === RAISED ARMS (front legs held high — the signature pose) ===
const PEACOCK_ARM_SEG1 = [
    { size: [0.08, 0.22, 0.08], pos: [0, -0.18, 0], color: PEACOCK_SHADE },
];
const PEACOCK_ARM_SEG2 = [
    { size: [0.06, 0.16, 0.06], pos: [0, -0.14, 0], color: PEACOCK_MID },
];
const PEACOCK_ARM_TIP = [
    { size: [0.05, 0.08, 0.05], pos: [0, -0.10, 0], color: PEACOCK_RED },
];

// === Hairy arm decorations (setae — long white hairs along the arms) ===
const PEACOCK_HAIR_SETAE = [
    // Hairs on left arm
    { size: [0.015, 0.12, 0.015], pos: [-0.055, 0.00, 0.00], color: PEACOCK_HAIR },
    { size: [0.015, 0.10, 0.015], pos: [-0.050, 0.05, 0.03], color: PEACOCK_HAIR },
    { size: [0.015, 0.08, 0.015], pos: [-0.048, 0.08, -0.03], color: PEACOCK_HAIR },
    // Hairs on right arm
    { size: [0.015, 0.12, 0.015], pos: [0.055, 0.00, 0.00], color: PEACOCK_HAIR },
    { size: [0.015, 0.10, 0.015], pos: [0.050, 0.05, 0.03], color: PEACOCK_HAIR },
    { size: [0.015, 0.08, 0.015], pos: [0.048, 0.08, -0.03], color: PEACOCK_HAIR },
];

// === TRAILING LEGS (6 legs planted on ground) ===
const PEACOCK_LEG_SEG1 = [
    { size: [0.06, 0.18, 0.06], pos: [0, -0.14, 0], color: PEACOCK_SHADE },
];
const PEACOCK_LEG_SEG2 = [
    { size: [0.05, 0.14, 0.05], pos: [0, -0.12, 0], color: PEACOCK_MID },
];
const PEACOCK_LEG_TIP = [
    { size: [0.04, 0.06, 0.04], pos: [0, -0.05, 0], color: PEACOCK_DARK },
];

let peacockParts = null;

function getPeacockParts() {
    if (peacockParts) return peacockParts;

    const headGeometry = buildVoxelGeometry(PEACOCK_HEAD);
    const eyeRight = buildVoxelGeometry(PEACOCK_EYES.filter(e => e.pos[0] > 0));
    const eyeLeft = buildVoxelGeometry(mirrorBoxes(PEACOCK_EYES.filter(e => e.pos[0] > 0)));
    const abdomenGeometry = buildVoxelGeometry(PEACOCK_ABDOMEN);
    const hairGeo = buildVoxelGeometry(PEACOCK_HAIR_SETAE);

    // Arm segments
    const armSeg1Geo = buildVoxelGeometry(PEACOCK_ARM_SEG1);
    const armSeg2Geo = buildVoxelGeometry(PEACOCK_ARM_SEG2);
    const armTipGeo = buildVoxelGeometry(PEACOCK_ARM_TIP);
    const hairArmGeo = buildVoxelGeometry(PEACOCK_HAIR_SETAE);

    // Leg segments
    const legSeg1Geo = buildVoxelGeometry(PEACOCK_LEG_SEG1);
    const legSeg2Geo = buildVoxelGeometry(PEACOCK_LEG_SEG2);
    const legTipGeo = buildVoxelGeometry(PEACOCK_LEG_TIP);

    peacockParts = {
        headGeometry,
        eyeGeometries: { '-1': eyeLeft, '1': eyeRight },
        abdomenGeometry,
        hairGeometry: hairGeo,
        armSegmentGeometries: { 1: armSeg1Geo, 2: armSeg2Geo },
        armTipGeometry: armTipGeo,
        armHairGeometry: hairArmGeo,
        legSegment1Geometry: legSeg1Geo,
        legSegment2Geometry: legSeg2Geo,
        legTipGeometry: legTipGeo,
        headMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: PEACOCK_SHADE, emissiveIntensity: 0.08,
            shininess: 200, flatShading: true
        }),
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: PEACOCK_EYE, emissiveIntensity: 2.0,
            flatShading: true
        }),
        abdomenMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: PEACOCK_MID, emissiveIntensity: 0.4,
            shininess: 200, flatShading: true
        }),
        hairMaterial: new THREE.MeshPhongMaterial({
            color: PEACOCK_HAIR, flatShading: true
        }),
        armMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: PEACOCK_MID, emissiveIntensity: 0.15,
            shininess: 200, flatShading: true
        }),
        legMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: PEACOCK_SHADE, emissiveIntensity: 0.05,
            flatShading: true
        })
    };

    return peacockParts;
}

function createPeacockAlien(group) {
    const parts = getPeacockParts();

    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    // Abdomen — bulbous, behind the head
    const abdomen = new THREE.Mesh(parts.abdomenGeometry, parts.abdomenMaterial);
    abdomen.castShadow = true;
    bodyPivot.add(abdomen);
    group.userData.abdomen = abdomen;

    // Head — in front of abdomen
    const head = new THREE.Mesh(parts.headGeometry, parts.headMaterial);
    head.castShadow = true;
    head.position.set(0, -0.08, 0.30);
    bodyPivot.add(head);
    group.userData.head = head;

    // Eyes — big, front-facing
    group.userData.eyes = new THREE.Mesh(
        buildVoxelGeometry([
            ...PEACOCK_EYES.filter(e => e.pos[0] < 0),
            ...PEACOCK_EYES.filter(e => e.pos[0] > 0)
        ]),
        parts.eyeMaterial.clone()
    );
    group.userData.eyes.position.set(0, 0.00, 0.52);
    bodyPivot.add(group.userData.eyes);

    // Hair accents along body
    const hair = new THREE.Mesh(parts.hairGeometry, parts.hairMaterial);
    hair.position.set(0, 0.00, 0.30);
    bodyPivot.add(hair);

    // Two raised arms — the signature pose
    group.userData.arms = [-1, 1].map(side => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.32, 0.12, 0.28);
        bodyPivot.add(pivot);

        // Upper arm
        const seg1 = new THREE.Mesh(parts.armSegmentGeometries[1], parts.armMaterial);
        seg1.position.set(side * 0.18, 0.22, 0);
        pivot.add(seg1);

        // Forearm
        const seg2 = new THREE.Mesh(parts.armSegmentGeometries[2], parts.armMaterial);
        seg2.position.set(side * 0.24, 0.38, 0.04);
        seg2.rotation.x = -0.6;
        pivot.add(seg2);

        // Arm tip
        const tip = new THREE.Mesh(parts.armTipGeometry, parts.armMaterial);
        tip.position.set(side * 0.30, 0.52, 0.08);
        tip.rotation.x = -0.3;
        pivot.add(tip);

        // Hairs on arms
        const armHair = new THREE.Mesh(parts.armHairGeometry, parts.hairMaterial);
        armHair.position.set(side * 0.22, 0.25, 0.02);
        pivot.add(armHair);

        return { pivot, side, seg1, seg2, tip, armHair };
    });

    // Six trailing legs
    group.userData.legs = [];
    const legAngles = [-1.3, -0.8, -0.3, 0.3, 0.8, 1.3];
    legAngles.forEach((angle, i) => {
        const legPivot = new THREE.Group();
        legPivot.position.set(
            Math.sin(angle) * 0.30,
            -0.25,
            Math.cos(angle) * 0.22 - 0.10
        );
        bodyPivot.add(legPivot);

        const seg1 = new THREE.Mesh(parts.legSegment1Geometry, parts.legMaterial);
        seg1.position.set(0, -0.14, 0);
        legPivot.add(seg1);

        const seg2 = new THREE.Mesh(parts.legSegment2Geometry, parts.legMaterial);
        seg2.position.set(0, -0.28, 0);
        seg2.rotation.x = -0.5;
        legPivot.add(seg2);

        const tip = new THREE.Mesh(parts.legTipGeometry, parts.legMaterial);
        tip.position.set(0, -0.36, -0.05);
        legPivot.add(tip);

        group.userData.legs.push({
            pivot: legPivot,
            segments: [seg1, seg2, tip],
            phase: Math.random() * Math.PI * 2,
            angle
        });
    });

    // Store random phases for animation
    Object.assign(group.userData, {
        abdomenPhase: Math.random() * Math.PI * 2,
        armPhase: Math.random() * Math.PI * 2,
        eyePulse: Math.random() * Math.PI * 2
    });
}

// Export the animation function
export function animatePeacock(alien, time, phase) {
    const peacock = alien.userData;
    const t = time;

    // Iridescent abdomen color cycle (cyan→green→red shimmer)
    const abdPhase = t * 2.5 + peacock.abdomenPhase;
    const abdShimmer = (Math.sin(abdPhase) + 1) / 2;

    if (peacock.abdomen && peacock.abdomen.material) {
        peacock.abdomen.material.emissive.setHSL(
            0.5 + abdShimmer * 0.3,  // Shift hue from cyan to green-red
            0.8,
            0.5 + abdShimmer * 0.2
        );
        peacock.abdomen.material.emissiveIntensity = 0.55 + abdShimmer * 0.8;
    }

    // Abdomen fans/pulses (the nurse hat display)
    if (peacock.abdomen) {
        const fanScale = 1 + Math.sin(t * 3.2 + peacock.abdomenPhase) * 0.08;
        peacock.abdomen.scale.set(fanScale, fanScale * 1.05, fanScale);
    }

    // Raised arms wave in display dance
    if (peacock.arms) {
        peacock.arms.forEach((arm, i) => {
            const wavePhase = t * 4 + i * Math.PI + peacock.armPhase;
            const waveAngle = Math.sin(wavePhase) * 0.6;
            arm.pivot.rotation.z = waveAngle;
            arm.pivot.rotation.y = Math.sin(wavePhase * 0.7) * 0.3;
        });
    }

    // Large eyes pulse and shift focus
    if (peacock.eyes && peacock.eyes.material) {
        const eyePulse = (Math.sin(t * 5 + peacock.eyePulse) + 1) / 2;
        peacock.eyes.material.emissiveIntensity = 2.5 + eyePulse * 2.5;
        // Slight eye tracking
        peacock.eyes.position.z = 0.52 + eyePulse * 0.02;
    }

    // Head bobs subtly with display
    if (peacock.head) {
        peacock.head.position.z = 0.30 + Math.sin(t * 2.8 + peacock.abdomenPhase) * 0.015;
        peacock.head.rotation.y = Math.sin(t * 1.6) * 0.08;
    }

    // Legs adjust slightly
    if (peacock.legs) {
        peacock.legs.forEach((leg) => {
            leg.pivot.rotation.z = Math.sin(t * 3 + leg.phase) * 0.06;
        });
    }

    // Gentle rotation wobble (display sway)
    alien.rotation.y = Math.sin(t * 1.4 + peacock.armPhase) * 0.12;

    // Guarded: updateSwoop() owns Y during a kamikaze dive.
    if (!alien.userData.isSwooping) {
        alien.position.y = 0.03 + Math.sin(t * 1.5) * 0.02;
    }
}

export { getPeacockParts, createPeacockAlien };