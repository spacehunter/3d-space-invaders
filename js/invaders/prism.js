import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Prism (row 12) - crystal diamond frame with four orbiting shards
// ---------------------------------------------------------------------------

// Diamond silhouette with hollow centre — a geometric construct with orbiting
// shards at each corner. Colours form a wide ramp that survives bloom at
// gameplay distance.
const PRISM_DARK   = 0x0a0018;    // near-black void
const PRISM_BODY   = 0x2a0066;    // deep purple body
const PRISM_MID    = 0x6633aa;    // mid purple
const PRISM_BRIGHT = 0x9966dd;    // bright purple frame
const PRISM_HOT    = 0xcc99ff;    // hot purple accent
const PRISM_SHARD  = 0xffccff;    // luminous shard tip

// Diamond frame — four boxes forming a tilted square outline, hollow centre.
// Each side is a slightly tapered box to give the crystal facets.
const PRISM_FRAME = [
    // Top-left diagonal bar
    { size: [0.14, 0.14, 0.72], pos: [-0.34, 0.76, 0.00], color: PRISM_BODY },
    { size: [0.16, 0.16, 0.60], pos: [-0.18, 0.74, 0.04], color: PRISM_MID },
    // Top-right diagonal bar
    { size: [0.14, 0.14, 0.72], pos: [0.34, 0.76, 0.00], color: PRISM_BODY },
    { size: [0.16, 0.16, 0.60], pos: [0.18, 0.74, 0.04], color: PRISM_MID },
    // Bottom-left diagonal bar
    { size: [0.14, 0.14, 0.72], pos: [-0.34, 0.14, 0.00], color: PRISM_BODY },
    { size: [0.16, 0.16, 0.60], pos: [-0.18, 0.16, 0.04], color: PRISM_MID },
    // Bottom-right diagonal bar
    { size: [0.14, 0.14, 0.72], pos: [0.34, 0.14, 0.00], color: PRISM_BODY },
    { size: [0.16, 0.16, 0.60], pos: [0.18, 0.16, 0.04], color: PRISM_MID },
    // Centre accent — small bright diamond plate at the hollow centre
    { size: [0.10, 0.10, 0.06], pos: [0, 0.45, 0.30], color: PRISM_BRIGHT },
    // Frame corners — slightly thicker at joints for voxel-join feel
    { size: [0.18, 0.18, 0.18], pos: [-0.50, 0.90, 0.00], color: PRISM_MID },
    { size: [0.18, 0.18, 0.18], pos: [0.50, 0.90, 0.00], color: PRISM_MID },
    { size: [0.18, 0.18, 0.18], pos: [-0.50, 0.00, 0.00], color: PRISM_MID },
    { size: [0.18, 0.18, 0.18], pos: [0.50, 0.00, 0.00], color: PRISM_MID }
];

// Orbiting shard — a small faceted crystal that orbits each corner.
// Each shard is a tapered shape (diamond cross-section in XZ, tall in Y).
const PRISM_SHARD_BOX = [
    // Main shard body — tall tapered crystal
    { size: [0.08, 0.28, 0.06], pos: [0, 0, 0.00], color: PRISM_SHARD },
    // Shard tip — bright point
    { size: [0.05, 0.06, 0.04], pos: [0, 0.17, 0.00], color: 0xffffff }
];

let prismParts = null;

function getPrismParts() {
    if (prismParts) return prismParts;

    prismParts = {
        frameGeometry: buildVoxelGeometry(PRISM_FRAME),
        frameMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: PRISM_BODY,
            emissiveIntensity: 0.25,
            shininess: 90,
            flatShading: true
        }),
        shardGeometry: buildVoxelGeometry(PRISM_SHARD_BOX),
        shardMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: PRISM_SHARD,
            emissiveIntensity: 1.2,
            shininess: 100,
            flatShading: true
        })
    };

    return prismParts;
}

function createPrismAlien(group) {
    const parts = getPrismParts();

    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    // Diamond frame
    const frame = new THREE.Mesh(parts.frameGeometry, parts.frameMaterial.clone());
    frame.castShadow = true;
    bodyPivot.add(frame);
    group.userData.frame = frame;

    // Four orbiting shards at the diamond corners
    const shards = [];
    const corners = [
        { x: -0.50, y: 0.90, angle: 0.0 },       // top-left
        { x: 0.50,  y: 0.90, angle: Math.PI },    // top-right
        { x: -0.50, y: 0.00, angle: -Math.PI / 2 }, // bottom-left
        { x: 0.50,  y: 0.00, angle: Math.PI / 2 }   // bottom-right
    ];

    corners.forEach((corner, i) => {
        const shard = new THREE.Mesh(parts.shardGeometry, parts.shardMaterial.clone());
        shard.position.set(corner.x, corner.y, 0);
        bodyPivot.add(shard);
        shards.push({
            mesh: shard,
            restAngle: corner.angle,
            orbitRadius: 0.14,
            phase: i * Math.PI / 2
        });
    });

    group.userData.shards = shards;
}


function animatePrism(alien, time) {
    switch (alien.userData.row) {
        case 12: { // Prism - diamond frame rotation with orbiting shards
            const prism = alien.userData;
            const t = time;
            const period = 8.0;
            const p = (t % period) / period;

            // Diamond frame Z rotation — slow continuous spin
            if (prism.frame) {
                prism.frame.rotation.z = Math.sin(t * 0.3) * 0.15;
                prism.frame.material.emissiveIntensity =
                    0.25 + Math.sin(t * 2.0) * 0.08;
            }

            // Orbiting shards pulse in sequence around the perimeter.
            // Each shard reaches peak intensity as it passes the "front" of
            // the diamond, creating a travelling light circuit.
            if (prism.shards) {
                prism.shards.forEach((shard, i) => {
                    const orbitAngle = shard.restAngle + t * 1.5;
                    const pulsePhase = (orbitAngle % (Math.PI * 2)) / (Math.PI * 2);
                    // Narrow burst window — only bright when shard is near "front"
                    const pulse = pulsePhase < 0.12
                        ? Math.sin((pulsePhase / 0.12) * Math.PI)
                        : 0;

                    // Orbital wobble — small radius oscillation
                    const wobble = Math.sin(t * 3.0 + shard.phase) * shard.orbitRadius * 0.3;
                    shard.mesh.position.x = shard.restAngle === 0 || shard.restAngle === Math.PI
                        ? shard.mesh.position.x // keep X fixed for left/right corners
                        : shard.mesh.position.x;
                    shard.mesh.position.y = shard.mesh.position.y + wobble * 0.01;

                    // Shard pulse — bright burst, then fade
                    shard.mesh.material.emissiveIntensity =
                        1.2 + pulse * 2.8;

                    // Individual shard micro-rotation
                    shard.mesh.rotation.z = Math.sin(t * 2.5 + shard.phase) * 0.4;
                });
            }

            // Idle hover
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.03 + Math.sin(t * 0.7) * 0.02;
            }
            break;
        }
    }
}

export { getPrismParts };
export { createPrismAlien };
