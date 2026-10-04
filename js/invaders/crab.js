import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

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


function animateCrab(alien, time) {
    switch (alien.userData.row) {
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
    }
}

export { getCrabParts };
export { createCrabAlien };
