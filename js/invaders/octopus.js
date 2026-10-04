import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

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


function animateOctopus(alien, time) {
    switch (alien.userData.row) {
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
    }
}

export { getOctopusParts };
export { createOctopusAlien };
