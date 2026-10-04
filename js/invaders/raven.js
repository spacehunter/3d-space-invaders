import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Raven (row 14) — a compact bird-like form with sweeping wings, sharp beak,
// crown crest and taloned feet
// ---------------------------------------------------------------------------

// A standing-raptor silhouette: body, swept-back wings, beak, crest, talons.
// Silhouette is distinct from every other type: bird shape + beak + wings
// + talons. No other row has a beak or talons.

const RAVEN_DARK    = 0x1c1c1c;
const RAVEN_SHADE   = 0x2a2a3a;
const RAVEN_MID     = 0x3d3d5c;
const RAVEN_BRIGHT  = 0x5a5a7a;
const RAVEN_HOT     = 0x7a7a9a;
const RAVEN_HIGHLIGHT = 0x9a9aba;

// Core body — slightly tapered, blocky bird torso.
const RAVEN_BODY = [
    // Upper body (chest / shoulder area)
    { size: [0.52, 0.30, 0.36], pos: [0, 0.08, 0.0], color: RAVEN_MID },
    // Mid body
    { size: [0.44, 0.24, 0.34], pos: [0, -0.08, 0.0], color: RAVEN_SHADE },
    // Lower body / belly
    { size: [0.36, 0.18, 0.30], pos: [0, -0.24, 0.0], color: RAVEN_DARK }
];

// Wings — each wing is a swept-back panel. We store one half and mirror.
// When spread, the outer edge reaches ~0.95 half-width, right at budget.
const RAVEN_WING = [
    { size: [0.56, 0.08, 0.28], pos: [0.52, 0.00, -0.06], rotZ: -0.55, color: RAVEN_SHADE }
];

// Crown crest — feathers on top of the head.
const RAVEN_CREST = [
    { size: [0.12, 0.14, 0.06], pos: [0.0, 0.28, -0.14], rotX: 0.35, color: RAVEN_BRIGHT },
    { size: [0.08, 0.10, 0.06], pos: [-0.07, 0.25, -0.18], rotX: 0.25, color: RAVEN_MID },
    { size: [0.08, 0.10, 0.06], pos: [0.07, 0.25, -0.18], rotX: 0.25, color: RAVEN_MID }
];

// Beak — sharp triangular nose.
const RAVEN_BEAK = [
    { size: [0.14, 0.08, 0.18], pos: [0.0, 0.00, 0.24], rotX: 0.2, color: RAVEN_BRIGHT }
];

// Eyes — bright spots on the sides of the head.
const RAVEN_EYES = [
    { size: [0.08, 0.08, 0.06], pos: [-0.22, 0.14, 0.10], color: 0xe8e8ff },
    { size: [0.08, 0.08, 0.06], pos: [0.22, 0.14, 0.10], color: 0xe8e8ff }
];

// Talons — small feet beneath the body.
const RAVEN_TALON = [
    { size: [0.10, 0.06, 0.08], pos: [0.0, -0.36, 0.02], color: RAVEN_HOT }
];

let ravenParts = null;

function getRavenParts() {
    if (ravenParts) return ravenParts;

    ravenParts = {
        bodyGeometry: buildVoxelGeometry(RAVEN_BODY),
        wingGeometries: {
            '-1': buildVoxelGeometry(RAVEN_WING),
            '1':  buildVoxelGeometry(mirrorBoxes(RAVEN_WING))
        },
        crestGeometry: buildVoxelGeometry(RAVEN_CREST),
        beakGeometry: buildVoxelGeometry(RAVEN_BEAK),
        eyeGeometry: buildVoxelGeometry(RAVEN_EYES),
        talonGeometry: buildVoxelGeometry(RAVEN_TALON),
        bodyMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: RAVEN_DARK,
            emissiveIntensity: 0.45,
            shininess: 30,
            flatShading: true
        }),
        wingMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: RAVEN_SHADE,
            emissiveIntensity: 0.55,
            shininess: 40,
            flatShading: true
        }),
        crestMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: RAVEN_BRIGHT,
            emissiveIntensity: 1.5,
            flatShading: true
        }),
        beakMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: RAVEN_BRIGHT,
            emissiveIntensity: 0.9,
            shininess: 60,
            flatShading: true
        }),
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xe8e8ff,
            emissiveIntensity: 2.0,
            flatShading: true
        }),
        talonMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: RAVEN_HOT,
            emissiveIntensity: 1.2,
            flatShading: true
        })
    };

    return ravenParts;
}

function createRavenAlien(group) {
    const parts = getRavenParts();

    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    // Core body
    const body = new THREE.Mesh(parts.bodyGeometry, parts.bodyMaterial.clone());
    body.castShadow = true;
    bodyPivot.add(body);
    group.userData.body = body;

    // Wings — separate meshes so we can rotate them open/close
    group.userData.wings = [-1, 1].map(side => {
        const wing = new THREE.Mesh(parts.wingGeometries[side], parts.wingMaterial.clone());
        wing.position.x = side * 0.32;
        bodyPivot.add(wing);
        return { mesh: wing, side };
    });

    // Crest
    const crest = new THREE.Mesh(parts.crestGeometry, parts.crestMaterial.clone());
    bodyPivot.add(crest);
    group.userData.crest = crest;

    // Beak
    const beak = new THREE.Mesh(parts.beakGeometry, parts.beakMaterial.clone());
    bodyPivot.add(beak);
    group.userData.beak = beak;

    // Eyes
    const eyes = new THREE.Mesh(parts.eyeGeometry, parts.eyeMaterial.clone());
    bodyPivot.add(eyes);
    group.userData.eyes = eyes;

    // Talons (2 sides)
    group.userData.talons = [-1, 1].map(side => {
        const talon = new THREE.Mesh(parts.talonGeometry, parts.talonMaterial.clone());
        talon.position.x = side * 0.10;
        talon.position.z = 0.14;
        talon.position.y = -0.36;
        bodyPivot.add(talon);
        return { mesh: talon, side };
    });
}


function animateRaven(alien, time) {
    switch (alien.userData.row) {
        case 14: { // Raven
            const self = alien.userData;
            const t = time;
            const period = 6.0;
            const p = (t % period) / period;

            // Wing spread cycle: windup at 0.20→0.32 (snap open),
            // hold at 0.32→0.40, return at 0.40→0.52, idle.
            const wingWindup = p >= 0.20 && p < 0.32
                ? Math.sin(((p - 0.20) / 0.12) * Math.PI / 2)
                : p >= 0.32 && p < 0.40 ? 1.0
                : p >= 0.40 && p < 0.52
                    ? Math.sin(((0.52 - p) / 0.12) * Math.PI / 2)
                    : 0;

            // Beak clack — brief sharp closure during windup peak.
            const beakClack = p >= 0.28 && p < 0.38
                ? Math.sin(((p - 0.28) / 0.10) * Math.PI)
                : 0;

            // Crest pulse — bright flash on windup peak.
            const crestPulse = p >= 0.30 && p < 0.44
                ? Math.sin(((p - 0.30) / 0.14) * Math.PI)
                : 0;

            // Head bob — subtle side-to-side idle motion.
            const headBob = Math.sin(t * 1.8) * 0.04;

            // Apply wing spread to both wings.
            if (self.wings) {
                self.wings.forEach(arm => {
                    // Rotate outward (positive rotZ spreads right, negative spreads left).
                    const spread = wingWindup * 0.65 * arm.side;
                    arm.mesh.rotation.z = -0.55 + spread;
                    // Slight lift on spread.
                    arm.mesh.position.y = wingWindup * 0.04;
                });
            }

            // Beak clack — slight yaw pulse on closure.
            if (self.beak) {
                self.beak.rotation.y = beakClack * 0.12;
                self.beak.material.emissiveIntensity = 0.9 + beakClack * 1.2;
            }

            // Crest pulse — emissive flash.
            if (self.crest) {
                self.crest.material.emissiveIntensity = 1.5 + crestPulse * 2.0;
            }

            // Eyes — subtle pulse.
            if (self.eyes) {
                self.eyes.material.emissiveIntensity = 2.0 + wingWindup * 0.6;
            }

            // Talons — slight grip tension during windup.
            if (self.talons) {
                self.talons.forEach(tal => {
            tal.mesh.rotation.x = wingWindup * 0.15 * tal.side;
            });
            }

            // Body pivot — slight tilt on wing spread.
            if (self.bodyPivot) {
                self.bodyPivot.rotation.z = headBob;
                self.bodyPivot.rotation.y = Math.sin(t * 0.9) * 0.03;
            }

            // Idle hover.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.03 + Math.sin(t * 2.0) * 0.02;
            }
            break;
        }
    }
}

export { getRavenParts };
export { createRavenAlien };
