import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

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


function animateWasp(alien, time) {
    switch (alien.userData.row) {
        case 8: { // Wasp - hover, wingstorm, sting lunge
            const wasp = alien.userData;
            const t = time;
            const phase = (t % 8.4) / 8.4;
            const windup = phase >= 0.24 && phase < 0.40
                ? Math.sin(((phase - 0.24) / 0.16) * Math.PI / 2)
                : phase >= 0.40 && phase < 0.54 ? 1 : 0;
            const charge = phase >= 0.40 && phase < 0.62
                ? Math.sin(Math.min(1, (phase - 0.40) / 0.22) * Math.PI / 2)
                : phase >= 0.62 && phase < 0.72 ? 1 : 0;
            const storm = phase >= 0.54 && phase < 0.78
                ? Math.sin(Math.min(1, (phase - 0.54) / 0.24) * Math.PI)
                : 0;
            const lunge = phase >= 0.70 && phase < 0.84
                ? Math.sin(Math.min(1, (phase - 0.70) / 0.14) * Math.PI)
                : 0;
            const recoil = phase >= 0.84 ? Math.max(0, 1 - (phase - 0.84) / 0.16) : 0;
            const hover = Math.sin(t * 2.2) * 0.035;

            // The body pivot carries the display motion; formation x/z remain
            // untouched so the Wasp cannot drift away from its column.
            if (wasp.bodyPivot) {
                wasp.bodyPivot.rotation.x = -charge * 0.08 - lunge * 0.24 + recoil * 0.10;
                wasp.bodyPivot.rotation.z = Math.sin(t * 1.4) * 0.035 + lunge * 0.04;
                wasp.bodyPivot.position.y = hover + windup * 0.025 - lunge * 0.04;
            }

            // Paired wings fold, snap open, then beat out of phase. The edge
            // accents carry the bright event while the transparent panels keep
            // the voxel silhouette visible under bloom.
            if (wasp.wings) {
                wasp.wings.forEach(wing => {
                    const fold = 1 - Math.min(1, windup + storm * 0.2 + lunge * 0.35);
                    const beat = storm * Math.sin(t * (42 + wing.pair * 5) + wing.pair * 1.7);
                    wing.hinge.rotation.z = wing.side * (
                        0.16 + fold * 0.46 + beat * (0.045 + wing.pair * 0.012)
                    );
                    wing.hinge.rotation.x = Math.sin(t * 2 + wing.pair) * 0.03
                        + storm * Math.sin(t * 28 + wing.pair) * 0.04;
                    wing.edge.material.emissiveIntensity = 0.8 + storm * 2.8 + charge * 1.2;
                    wing.wing.material.opacity = 0.24 + storm * 0.16;
                });
            }

            if (wasp.abdomenPivot) {
                wasp.abdomenPivot.rotation.x = -charge * 0.18 - lunge * 0.36 + recoil * 0.12;
                wasp.abdomenPivot.rotation.z = Math.sin(t * 1.7) * 0.025;
            }

            if (wasp.stinger) {
                const strike = Math.max(charge, lunge * 1.5);
                wasp.stinger.material.emissiveIntensity = 0.75 + strike * 3.4 + storm * 1.2;
                wasp.stinger.scale.set(
                    1 + strike * 0.18,
                    1 + strike * 0.18,
                    1 + strike * 0.32
                );
            }

            if (wasp.eyes) {
                wasp.eyes.material.emissiveIntensity = 1.8 + windup * 1.5 + charge * 2.4 + lunge * 1.2;
                wasp.eyes.scale.y = 1 + storm * 0.10;
            }

            if (wasp.mandibles) {
                wasp.mandibles.forEach(mandible => {
                    const jaw = 0.06 + charge * 0.24 + lunge * 0.12;
                    mandible.mesh.rotation.x = mandible.side * jaw + Math.sin(t * 9 + mandible.side) * 0.035;
                });
            }

            if (wasp.legs) {
                wasp.legs.forEach(leg => {
                    const step = Math.sin(t * 8 + leg.phase);
                    const lift = Math.max(0, step) * (1 - storm * 0.75);
                    leg.segments[0].rotation.z = leg.segments[0].userData.baseBend - lift * 0.30 - charge * 0.08;
                    leg.segments[0].rotation.x = Math.cos(t * 8 + leg.phase) * 0.22 * (1 - charge * 0.7);
                    leg.segments[1].rotation.z = leg.segments[1].userData.baseBend + lift * 0.38 + charge * 0.10;
                    leg.segments[2].rotation.z = leg.segments[2].userData.baseBend + lift * 0.16;
                });
            }

            // Y is formation-safe during a swoop; only the child body pivot
            // receives hover motion while the swoop controller owns the group.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.abs(hover) + windup * 0.03 - lunge * 0.02;
            }
            break;
        }
    }
}

export { getWaspParts };
export { createWaspAlien };
