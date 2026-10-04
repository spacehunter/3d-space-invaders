import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Warden (row 10) - a standing hoop with a hole through the middle
// ---------------------------------------------------------------------------

// The first hollow silhouette in the roster: every other type is a solid mass
// or a tight cluster, so the Warden's read at distance comes from the gap in
// its outline rather than from its mass. That makes the flip its signature —
// turning the hoop edge-on collapses a circle to a line, which is legible from
// the formation camera in a way a limb movement is not.
const WARDEN_VOID = 0x1a0a1e;    // deepest recess, seams only
const WARDEN_DARK = 0x2f1233;    // hoop underside
const WARDEN_PLATE = 0x6b2a5f;   // main hoop face - the midpoint, kept well off black
const WARDEN_TRIM = 0xa84a7d;    // bevel highlight
const WARDEN_GLOW = 0xd77aa0;    // inner teeth
const WARDEN_CORE = 0xffc94a;    // molten gold core
const WARDEN_HOT = 0xffe9a8;     // core spines and halo

// A ring standing in the XY plane, so it faces the player. Tangential boxes
// around a circle read as a hoop for a fraction of a torus's vertices.
function wardenHoopBoxes(radius, span, thickness, depth, color, accent) {
    const boxes = [];
    const steps = 16;
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        boxes.push({
            size: [span, thickness, depth],
            pos: [Math.cos(a) * radius, Math.sin(a) * radius, 0],
            rotZ: a + Math.PI / 2,
            color: i % 4 === 0 ? accent : color
        });
    }
    return boxes;
}

const WARDEN_HOOP = [
    ...wardenHoopBoxes(0.62, 0.30, 0.13, 0.17, WARDEN_PLATE, WARDEN_TRIM),
    ...wardenHoopBoxes(0.62, 0.26, 0.05, 0.21, WARDEN_DARK, WARDEN_DARK),
    ...wardenHoopBoxes(0.70, 0.16, 0.05, 0.07, WARDEN_TRIM, WARDEN_GLOW)
];

// Inward-pointing teeth on a smaller radius, animated as their own mesh so the
// ring can brighten independently of the hoop plates.
const WARDEN_TEETH = wardenHoopBoxes(0.47, 0.10, 0.10, 0.09, WARDEN_GLOW, WARDEN_HOT);

// Centred on the origin, so scaling the mesh retracts the spokes toward the
// core instead of sliding them off to one side.
const WARDEN_SPOKES = [
    { size: [1.04, 0.055, 0.055], pos: [0, 0, 0], color: WARDEN_TRIM },
    { size: [0.055, 1.04, 0.055], pos: [0, 0, 0], color: WARDEN_TRIM },
    { size: [0.86, 0.04, 0.04], pos: [0, 0, 0], rotZ: Math.PI / 4, color: WARDEN_DARK },
    { size: [0.86, 0.04, 0.04], pos: [0, 0, 0], rotZ: -Math.PI / 4, color: WARDEN_DARK }
];

const WARDEN_CORE_BOXES = [
    { size: [0.21, 0.21, 0.21], pos: [0, 0, 0], rotZ: Math.PI * 0.25, color: WARDEN_CORE },
    { size: [0.30, 0.07, 0.07], pos: [0, 0, 0], color: WARDEN_HOT },
    { size: [0.07, 0.30, 0.07], pos: [0, 0, 0], color: WARDEN_HOT },
    { size: [0.15, 0.15, 0.26], pos: [0, 0, 0], color: WARDEN_VOID }
];

// Short keel behind the hoop so the model still has depth when seen edge-on at
// the midpoint of the flip.
const WARDEN_ANCHOR = [
    { size: [0.22, 0.22, 0.20], pos: [0, 0, -0.24], color: WARDEN_DARK },
    { size: [0.14, 0.14, 0.26], pos: [0, 0, -0.42], color: WARDEN_PLATE },
    { size: [0.30, 0.06, 0.10], pos: [0, -0.14, -0.34], color: WARDEN_TRIM },
    { size: [0.06, 0.26, 0.08], pos: [0, 0.16, -0.36], color: WARDEN_VOID }
];

// The launch flash: a thin disc that grows outward through the hoop. Centred on
// the origin so scale expands it about the core.
const WARDEN_HALO = [
    ...wardenHoopBoxes(0.40, 0.20, 0.09, 0.04, WARDEN_HOT, WARDEN_HOT)
];

let wardenParts = null;

function getWardenParts() {
    if (wardenParts) return wardenParts;

    wardenParts = {
        hoopGeometry: buildVoxelGeometry(WARDEN_HOOP),
        teethGeometry: buildVoxelGeometry(WARDEN_TEETH),
        spokeGeometry: buildVoxelGeometry(WARDEN_SPOKES),
        coreGeometry: buildVoxelGeometry(WARDEN_CORE_BOXES),
        anchorGeometry: buildVoxelGeometry(WARDEN_ANCHOR),
        haloGeometry: buildVoxelGeometry(WARDEN_HALO),
        hoopMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WARDEN_DARK,
            emissiveIntensity: 0.45,
            shininess: 55,
            flatShading: true
        }),
        teethMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WARDEN_GLOW,
            emissiveIntensity: 0.8,
            flatShading: true
        }),
        coreMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WARDEN_CORE,
            emissiveIntensity: 1.1,
            flatShading: true
        }),
        haloMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: WARDEN_HOT,
            emissiveIntensity: 3.5,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            flatShading: true
        })
    };

    return wardenParts;
}

function createWardenAlien(group) {
    const parts = getWardenParts();

    // Hover carries the idle bob; the formation keeps group.position.x / .z.
    const hoverPivot = new THREE.Group();
    group.add(hoverPivot);
    group.userData.hoverPivot = hoverPivot;

    // Only the hoop assembly flips. The core stays face-on so it is still
    // readable at the midpoint of the flip, when the hoop is edge-on.
    const flipPivot = new THREE.Group();
    hoverPivot.add(flipPivot);
    group.userData.flipPivot = flipPivot;

    const hoop = new THREE.Mesh(parts.hoopGeometry, parts.hoopMaterial.clone());
    hoop.castShadow = true;
    flipPivot.add(hoop);
    group.userData.hoop = hoop;

    const teeth = new THREE.Mesh(parts.teethGeometry, parts.teethMaterial.clone());
    flipPivot.add(teeth);
    group.userData.teeth = teeth;

    const spokes = new THREE.Mesh(parts.spokeGeometry, parts.hoopMaterial.clone());
    flipPivot.add(spokes);
    group.userData.spokes = spokes;

    const core = new THREE.Mesh(parts.coreGeometry, parts.coreMaterial.clone());
    hoverPivot.add(core);
    group.userData.core = core;

    const halo = new THREE.Mesh(parts.haloGeometry, parts.haloMaterial.clone());
    halo.scale.setScalar(0.001);
    hoverPivot.add(halo);
    group.userData.halo = halo;

    const anchor = new THREE.Mesh(parts.anchorGeometry, parts.hoopMaterial);
    hoverPivot.add(anchor);
    group.userData.anchor = anchor;
}


function animateWarden(alien, time) {
    switch (alien.userData.row) {
        case 10: { // Warden - rolling hoop, gimbal flip, halo wave launch
            const warden = alien.userData;
            const t = time;
            const p = (t % 8.8) / 8.8;

            const seg = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
            const ease = v => v * v * (3 - 2 * v);

            // Rises 0->1 across the flip, holds edge-on, then snaps back.
            const flip = ease(seg(0.36, 0.56)) * (1 - ease(seg(0.66, 0.74)));
            const windup = ease(seg(0.22, 0.40)) * (1 - ease(seg(0.78, 0.94)));
            const retract = ease(seg(0.28, 0.44)) * (1 - ease(seg(0.80, 0.96)));
            const charge = ease(seg(0.40, 0.72)) * (1 - ease(seg(0.74, 0.80)));
            // Explicit window so the launch reads as one event, not a glow.
            const flash = p >= 0.740 && p < 0.778
                ? Math.sin(((p - 0.740) / 0.038) * Math.PI)
                : 0;
            // The wave leaves through the hoop's own hole.
            const inWave = p >= 0.740 && p < 0.870;
            const wave = inWave ? (p - 0.740) / 0.130 : 0;
            const breathe = Math.sin(t * 1.9) * 0.5 + 0.5;

            if (warden.hoverPivot) {
                warden.hoverPivot.position.y = Math.sin(t * 1.25) * 0.045;
                warden.hoverPivot.rotation.x = Math.sin(t * 0.8) * 0.05 - charge * 0.05;
                warden.hoverPivot.rotation.z = Math.cos(t * 0.6) * 0.035 + flash * 0.05;
            }

            // The signature: the hoop turns fully edge-on, so the silhouette
            // collapses from a circle to a line and back.
            if (warden.flipPivot) {
                warden.flipPivot.rotation.y = flip * (Math.PI / 2);
            }

            // Roll gains are added to a t-driven base as rate * weight, never
            // as t * changingRate, so a phase change cannot jump the cycle.
            if (warden.hoop) {
                warden.hoop.rotation.z = t * 0.45 + windup * 2.4 + flash * 0.7;
                warden.hoop.material.emissiveIntensity =
                    0.45 + windup * 0.25 + charge * 0.30 + flash * 0.9;
            }

            if (warden.teeth) {
                warden.teeth.rotation.z = -t * 0.7 - windup * 1.8;
                warden.teeth.material.emissiveIntensity =
                    0.8 + breathe * 0.15 + charge * 1.1 + flash * 2.2;
                const bite = 1 - retract * 0.10 + flash * 0.06;
                warden.teeth.scale.set(bite, bite, 1);
            }

            // Geometry is centred on the origin, so scaling retracts the spokes
            // toward the core instead of sliding them sideways.
            if (warden.spokes) {
                const reach = 1 - retract * 0.62;
                warden.spokes.scale.set(reach, reach, 1);
                warden.spokes.material.emissiveIntensity = 0.45 + retract * 0.35;
            }

            if (warden.core) {
                warden.core.material.emissiveIntensity =
                    1.1 + breathe * 0.2 + charge * 1.3 + flash * 1.9;
                const swell = 1 + breathe * 0.05 + charge * 0.28 + flash * 0.35;
                warden.core.scale.setScalar(swell);
                warden.core.rotation.z = t * 1.1 + charge * 1.6;
            }

            if (warden.halo) {
                warden.halo.scale.setScalar(inWave ? 0.35 + wave * 1.55 : 0.001);
                warden.halo.material.opacity = inWave ? (1 - wave) * 0.85 : 0;
                warden.halo.rotation.z = t * 2.0;
            }

            if (warden.anchor) {
                warden.anchor.rotation.x = Math.sin(t * 1.1) * 0.06 + charge * 0.10;
                warden.anchor.rotation.y = Math.sin(t * 0.9) * 0.08;
            }

            // Guarded: updateSwoop() owns Y during a kamikaze dive.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.05 + Math.abs(Math.sin(t * 1.25)) * 0.04;
            }
            break;
        }
    }
}

export { getWardenParts };
export { createWardenAlien };
