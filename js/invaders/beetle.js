import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

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



function animateBeetle(alien, time) {
    switch (alien.userData.row) {
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
    }
}

export { getBeetleParts };
export { createBeetleAlien };
