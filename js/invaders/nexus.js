import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// TYPE 15 — NEXUS: orbital station with rotating crystal arms and energy ring
// ---------------------------------------------------------------------------

const NEXUS_DARK    = 0x0a0a1e;
const NEXUS_SHADE   = 0x1a2a6e;
const NEXUS_MID     = 0x2a4aaa;
const NEXUS_BRIGHT  = 0x4a7aff;
const NEXUS_HOT     = 0x7aaaff;
const NEXUS_CORE    = 0xffffff;

// Central core — glowing crystal sphere.
const NEXUS_CORE_BOX = [
    { size: [0.28, 0.28, 0.28], pos: [0, 0, 0], color: NEXUS_CORE }
];

// Crystal arms — one quarter-arm, mirrored to make 4.
// Each arm is a tapered crystal spike pointing outward.
const NEXUS_ARM_HALF = [
    // Main arm body — tapered toward tip
    { size: [0.06, 0.06, 0.52], pos: [0.05, 0, 0.38], color: NEXUS_SHADE },
    { size: [0.08, 0.08, 0.36], pos: [0.05, 0, 0.18], color: NEXUS_MID },
    // Tip accent — brighter crystal
    { size: [0.04, 0.04, 0.10], pos: [0.05, 0, 0.68], color: NEXUS_HOT }
];

// Energy ring — a flat disc around the core, between the arms.
const NEXUS_RING = [
    // Outer ring segments — four quadrants form a ring
    { size: [0.60, 0.04, 0.04], pos: [0.30, 0, 0.0], color: NEXUS_BRIGHT },
    { size: [0.04, 0.04, 0.60], pos: [0.0, 0, 0.30], color: NEXUS_BRIGHT },
    // Inner ring — thinner, brighter
    { size: [0.36, 0.03, 0.03], pos: [0.18, 0, 0.0], color: NEXUS_HOT },
    { size: [0.03, 0.03, 0.36], pos: [0.0, 0, 0.18], color: NEXUS_HOT }
];

// Cross-bracing — subtle structural elements connecting arms to core.
const NEXUS_BRACE = [
    { size: [0.04, 0.04, 0.14], pos: [0.10, 0, 0.10], color: NEXUS_SHADE },
    { size: [0.14, 0.04, 0.04], pos: [0.10, 0, 0.10], color: NEXUS_SHADE }
];

let nexusParts = null;

function getNexusParts() {
    if (nexusParts) return nexusParts;

    nexusParts = {
        coreGeometry: buildVoxelGeometry(NEXUS_CORE_BOX),
        armGeometries: {
            '-1': buildVoxelGeometry(NEXUS_ARM_HALF),
            '1':  buildVoxelGeometry(mirrorBoxes(NEXUS_ARM_HALF))
        },
        ringGeometry: buildVoxelGeometry(NEXUS_RING),
        braceGeometry: buildVoxelGeometry(NEXUS_BRACE),
        coreMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: NEXUS_CORE,
            emissiveIntensity: 2.0,
            shininess: 120,
            flatShading: true
        }),
        armMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: NEXUS_SHADE,
            emissiveIntensity: 0.4,
            shininess: 60,
            flatShading: true
        }),
        ringMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: NEXUS_BRIGHT,
            emissiveIntensity: 1.0,
            shininess: 90,
            flatShading: true
        }),
        braceMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: NEXUS_DARK,
            emissiveIntensity: 0.2,
            shininess: 40,
            flatShading: true
        })
    };

    return nexusParts;
}

function createNexusAlien(group) {
    const parts = getNexusParts();

    // Pivot for rotating arms — entire alien rotates as a unit
    const pivot = new THREE.Group();
    group.add(pivot);
    group.userData.pivot = pivot;

    // Central core — static, bright crystal
    const core = new THREE.Mesh(parts.coreGeometry, parts.coreMaterial.clone());
    pivot.add(core);
    group.userData.core = core;

    // Four crystal arms — each is a pair of mirrored halves
    group.userData.arms = [-1, 1].map((side, idx) => {
        // Each arm quadrant: two mirrored halves for the arm pointing in the +Z direction,
        // rotated to point in all 4 cardinal directions
        const angle = idx * Math.PI / 2;
        const armGroup = new THREE.Group();
        armGroup.rotation.z = angle;
        pivot.add(armGroup);

        // Inner half (closer to core)
        const inner = new THREE.Mesh(parts.armGeometries['1'], parts.armMaterial.clone());
        armGroup.add(inner);

        // Outer half (mirrored, farther from core) — placed further out
        const outer = new THREE.Mesh(parts.armGeometries['-1'], parts.armMaterial.clone());
        outer.position.z = 0.12; // shift outward along arm axis
        armGroup.add(outer);

        // Arm tip glow — small bright accent at the tip
        const tipGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const tipMat = new THREE.MeshPhongMaterial({
            color: NEXUS_HOT,
            emissive: NEXUS_HOT,
            emissiveIntensity: 1.5,
            flatShading: true
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.z = 0.72;
        armGroup.add(tip);

        return { group: armGroup, inner, outer, tip, side, angle };
    });

    // Energy ring — rotating disc between arms
    const ring = new THREE.Mesh(parts.ringGeometry, parts.ringMaterial.clone());
    pivot.add(ring);
    ring.rotation.x = Math.PI / 2; // flat in XZ plane
    group.userData.ring = ring;

    // Cross-braces — subtle structural links
    group.userData.braces = [-1, 1].map((side) => {
        const brace = new THREE.Mesh(parts.braceGeometry, parts.braceMaterial.clone());
        pivot.add(brace);
        brace.rotation.z = side * Math.PI / 4; // diagonal
        return brace;
    });

    // Store reference for animation
    group.userData.corePulse = 0;
    group.userData.ringAngle = 0;
    group.userData.chargePhase = 0;
    group.userData.wasFiring = false;
}


function animateNexus(alien, time) {
    switch (alien.userData.row) {
        case 15: { // Nexus — orbital station with rotating arms, pulsing core, spinning ring
            const self = alien.userData;
            const t = time;
            const period = 5.0;
            const p = (t % period) / period;

            // Slow continuous rotation of entire arm assembly.
            if (self.pivot) {
                self.pivot.rotation.z = t * 0.3;
            }

            // Energy ring counter-rotation.
            if (self.ring) {
                self.ring.rotation.z = -t * 0.8;
                self.ring.material.emissiveIntensity = 0.8 + Math.sin(t * 3.0) * 0.3;
            }

            // Weapon windup: arms snap inward (telegraph) at 0.15→0.25, fire at 0.25,
            // arms spring outward at 0.25→0.35, then idle.
            const armSweep = p >= 0.15 && p < 0.25
                ? Math.sin(((p - 0.15) / 0.10) * Math.PI / 2)
                : p >= 0.25 && p < 0.35
                    ? 1.0 - Math.sin(((p - 0.25) / 0.10) * Math.PI / 2)
                    : 0;

            if (self.arms) {
                self.arms.forEach((arm) => {
                    const s = armSweep * 0.4;
                    arm.inner.scale.setScalar(1.0 - s * 0.3);
                    arm.outer.scale.setScalar(1.0 - s * 0.3);
                    arm.tip.material.emissiveIntensity = 1.5 + armSweep * 2.0;
                });
            }

            // Core pulse — brightens on windup, steady otherwise.
            if (self.core) {
                self.core.material.emissiveIntensity = 1.8 + armSweep * 1.5;
            }

            // Brace glow — subtle on idle.
            if (self.braces) {
                self.braces.forEach((b) => {
                    b.material.emissiveIntensity = 0.2 + Math.sin(t * 1.5) * 0.05;
                });
            }

            // Idle hover.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.04 + Math.sin(t * 1.4) * 0.015;
            }
            break;
        }
    }
}

export { getNexusParts };
export { createNexusAlien };
