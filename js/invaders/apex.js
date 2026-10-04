import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// TYPE 16 — APEX: floating geometric core with orbiting prismatic shards
// ---------------------------------------------------------------------------

const APEX_DARK    = 0x1a0a2e;
const APEX_SHADE   = 0x3d1f6e;
const APEX_MID     = 0x8b45c7;
const APEX_BRIGHT  = 0xc77dff;
const APEX_HOT     = 0xe8b4ff;
const APEX_CORE    = 0xffeeff;

// Central core — inverted tetrahedron (diamond pointing down)
const APEX_CORE_BOX = [
    { size: [0.18, 0.18, 0.18], pos: [0, 0, 0], color: APEX_CORE }
];

// Three orbiting prismatic shards — one shard definition, replicated 3x
const APEX_SHARD = [
    // Main shard body — elongated diamond
    { size: [0.08, 0.08, 0.36], pos: [0, 0, 0], color: APEX_BRIGHT },
    // Tip accent — brighter at the point
    { size: [0.04, 0.04, 0.12], pos: [0, 0, 0.22], color: APEX_HOT }
];

// Orbit ring — subtle ring showing the orbit path
const APEX_ORBIT = [
    { size: [0.60, 0.02, 0.02], pos: [0.30, 0, 0.0], color: APEX_DARK },
    { size: [0.02, 0.02, 0.60], pos: [0.0, 0, 0.30], color: APEX_DARK },
    { size: [0.40, 0.02, 0.40], pos: [0.20, 0, 0.20], color: APEX_DARK },
    { size: [0.40, 0.02, 0.02], pos: [0.20, 0, 0.20], color: APEX_DARK },
    { size: [0.02, 0.02, 0.40], pos: [0.20, 0, 0.20], color: APEX_DARK }
];

let apexParts = null;

function getApexParts() {
    if (apexParts) return apexParts;

    apexParts = {
        coreGeometry: buildVoxelGeometry(APEX_CORE_BOX),
        shardGeometry: buildVoxelGeometry(APEX_SHARD),
        orbitGeometry: buildVoxelGeometry(APEX_ORBIT),
        coreMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: APEX_CORE,
            emissiveIntensity: 2.0,
            shininess: 120,
            flatShading: true
        }),
        shardMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: APEX_BRIGHT,
            emissiveIntensity: 0.6,
            shininess: 80,
            flatShading: true
        }),
        orbitMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: APEX_DARK,
            emissiveIntensity: 0.15,
            shininess: 20,
            flatShading: true
        })
    };

    return apexParts;
}

function createApexAlien(group) {
    const parts = getApexParts();

    // Pivot for orbiting shards — entire alien rotates as a unit
    const pivot = new THREE.Group();
    group.add(pivot);
    group.userData.pivot = pivot;

    // Central core — static, bright crystal
    const core = new THREE.Mesh(parts.coreGeometry, parts.coreMaterial.clone());
    pivot.add(core);
    group.userData.core = core;

    // Orbit path — subtle ring
    const orbitRing = new THREE.Mesh(parts.orbitGeometry, parts.orbitMaterial.clone());
    orbitRing.rotation.x = Math.PI / 2; // flat in XZ plane
    pivot.add(orbitRing);
    group.userData.orbitRing = orbitRing;

    // Three prismatic shards — orbit at 120° intervals
    group.userData.shards = [];
    for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3; // 0°, 120°, 240°
        const shard = new THREE.Mesh(parts.shardGeometry, parts.shardMaterial.clone());
        // Position on orbit circle
        shard.position.x = Math.cos(angle) * 0.55;
        shard.position.z = Math.sin(angle) * 0.55;
        shard.position.y = 0.05; // slight lift
        pivot.add(shard);
        group.userData.shards.push(shard);
    }

    // Store reference for animation
    group.userData.orbitAngle = 0;
    group.userData.chargePhase = 0;
    group.userData.wasFiring = false;
}

function animateApex(alien, time) {
    switch (alien.userData.row) {
        case 16: { // Apex — orbiting shards rotate, brighten on windup, horizontal beam fires
            const self = alien.userData;
            const t = time;
            const period = 7.0;
            const p = (t % period) / period;

            // Shard orbit: continuous rotation of the shard group.
            if (self.pivot) {
                self.pivot.rotation.z = t * 0.25;
            }

            // Weapon windup: shards contract inward, core brightens at 0.20->0.30,
            // fires at 0.30, shards spring outward at 0.30->0.40, then idle.
            const charge = p >= 0.20 && p < 0.30
                ? Math.sin(((p - 0.20) / 0.10) * Math.PI / 2)
                : p >= 0.30 && p < 0.40 ? 1 : 0;
            const release = p >= 0.40 ? Math.max(0, 1 - (p - 0.40) / 0.20) : 0;

            if (self.shards) {
                self.shards.forEach((shard, i) => {
                    const s = 1.0 - charge * 0.3; // contract on windup
                    shard.scale.setScalar(s);
                    shard.material.emissiveIntensity = 0.6 + charge * 2.0 + release * 0.5;
                });
            }

            // Core pulses on windup, steady otherwise.
            if (self.core) {
                self.core.material.emissiveIntensity = 1.8 + charge * 2.5 + release * 0.8;
            }

            // Orbit ring fades on windup, returns on release.
            if (self.orbitRing) {
                self.orbitRing.material.emissiveIntensity = 0.15 + charge * 0.3;
            }

            // Idle hover.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.03 + Math.sin(t * 1.8) * 0.02;
            }
            break;
        }
    }
}

export { getApexParts };
export { createApexAlien };