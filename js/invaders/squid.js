import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

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


function animateSquid(alien, time) {
    switch (alien.userData.row) {
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
    }
}

export { getSquidParts };
export { createSquidAlien };
