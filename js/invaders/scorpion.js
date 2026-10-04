import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

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


function animateScorpion(alien, time) {
    switch (alien.userData.row) {
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

export { getScorpionParts };
export { createScorpionAlien };
