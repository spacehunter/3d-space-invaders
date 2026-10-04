import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Sentinel (row 9) - a levitating construct whose shell comes apart
// ---------------------------------------------------------------------------

// Every other invader is a body with limbs. This one has no limbs at all: it is
// ten armour shards closed around an exposed plasma core, and its signature move
// is disassembling itself. Form therefore has to come from the shard silhouette
// and the obsidian value ramp, so the ramp is spread very wide (near-black to
// pale ice) and the shard emissive is kept low - only the core, the baked glyph
// strips and the lance are allowed to blow out under bloom.
// The ramp is spread wide but its midpoint is deliberately lifted off black:
// a near-black plate has nothing to read against space at formation distance,
// so the sculpt collapsed into just its bright glyphs and core - a white
// sparkle rather than a silhouette. The plate carries the shape; ICE and GLYPH
// stay accents, and the core is tinted cyan rather than left pure white.
const SENTINEL_VOID = 0x0c1422;      // seam shadow, deepest step
const SENTINEL_OBSIDIAN = 0x1d2c45;  // shard underside
const SENTINEL_PLATE = 0x36537a;     // main armour face
const SENTINEL_EDGE = 0x6d9ad6;      // bevel highlight catching the light
const SENTINEL_ICE = 0x9fd8ff;       // rim trim
const SENTINEL_GLYPH = 0x5fd0f5;     // baked glyph strips
const SENTINEL_CORE = 0x8fe4ff;      // plasma core body
const SENTINEL_HOT = 0xdff6ff;       // core spines and lance

// Three shard profiles, each centred on its own origin so the shard tumbles and
// scales about itself rather than swinging around a baked-in offset. Local +Z is
// "outward" for every shard: the shard's pivot carries the ring angle, so bloom
// is a push along local +Z and orbit is a spin of the pivot.
const SENTINEL_SHARD_UPPER = [
    { size: [0.34, 0.15, 0.22], pos: [0, 0, 0], color: SENTINEL_PLATE },
    { size: [0.26, 0.10, 0.18], pos: [0, 0.10, -0.03], color: SENTINEL_OBSIDIAN },
    { size: [0.38, 0.05, 0.08], pos: [0, -0.05, 0.07], color: SENTINEL_EDGE },
    { size: [0.08, 0.035, 0.20], pos: [0, 0.09, 0.01], color: SENTINEL_GLYPH },
    { size: [0.30, 0.06, 0.07], pos: [0, -0.09, -0.07], color: SENTINEL_VOID },
    { size: [0.14, 0.04, 0.06], pos: [0, 0.02, 0.11], color: SENTINEL_ICE }
];

const SENTINEL_SHARD_LOWER = [
    { size: [0.30, 0.20, 0.20], pos: [0, 0, 0], color: SENTINEL_PLATE },
    { size: [0.22, 0.12, 0.16], pos: [0, -0.11, -0.02], color: SENTINEL_OBSIDIAN },
    { size: [0.34, 0.05, 0.08], pos: [0, 0.07, 0.06], color: SENTINEL_EDGE },
    { size: [0.06, 0.16, 0.05], pos: [0, 0.00, 0.10], color: SENTINEL_GLYPH },
    { size: [0.26, 0.05, 0.07], pos: [0, -0.14, 0.02], color: SENTINEL_VOID },
    { size: [0.12, 0.04, 0.05], pos: [0, 0.10, -0.06], color: SENTINEL_ICE }
];

const SENTINEL_SHARD_SPIKE = [
    { size: [0.22, 0.26, 0.22], pos: [0, 0, 0], color: SENTINEL_PLATE },
    { size: [0.14, 0.20, 0.14], pos: [0, 0.16, 0], color: SENTINEL_OBSIDIAN },
    { size: [0.07, 0.16, 0.07], pos: [0, 0.30, 0], color: SENTINEL_EDGE },
    { size: [0.26, 0.05, 0.26], pos: [0, -0.10, 0], color: SENTINEL_VOID },
    { size: [0.05, 0.24, 0.05], pos: [0, 0.05, 0.09], color: SENTINEL_GLYPH }
];

// Rest shell. `angle` goes on the shard's pivot, `radius` is the mesh's local +Z
// offset, and `ring` is where the shard parks when the shell locks into a lens.
const SENTINEL_SHARDS = [
    { profile: 'upper', angle: Math.PI * 0.25, radius: 0.25, y: 0.28, lift: 0.34, spin: 1 },
    { profile: 'upper', angle: Math.PI * 0.75, radius: 0.25, y: 0.28, lift: 0.34, spin: -1 },
    { profile: 'upper', angle: Math.PI * 1.25, radius: 0.25, y: 0.28, lift: 0.34, spin: 1 },
    { profile: 'upper', angle: Math.PI * 1.75, radius: 0.25, y: 0.28, lift: 0.34, spin: -1 },
    { profile: 'lower', angle: 0, radius: 0.28, y: -0.17, lift: -0.26, spin: -1 },
    { profile: 'lower', angle: Math.PI * 0.5, radius: 0.28, y: -0.17, lift: -0.26, spin: 1 },
    { profile: 'lower', angle: Math.PI, radius: 0.28, y: -0.17, lift: -0.26, spin: -1 },
    { profile: 'lower', angle: Math.PI * 1.5, radius: 0.28, y: -0.17, lift: -0.26, spin: 1 },
    { profile: 'spike', angle: 0, radius: 0, y: 0.56, lift: 0.20, spin: 1, tilt: 0 },
    { profile: 'spike', angle: Math.PI, radius: 0, y: -0.54, lift: -0.20, spin: -1, tilt: Math.PI }
];

// Gimbal ring: tangential blocks around a circle read as a ring at formation
// distance for a fraction of a torus's vertices.
function sentinelRingBoxes(radius, thickness, color, accent) {
    const boxes = [];
    const steps = 14;
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        boxes.push({
            size: [0.22, thickness, thickness],
            pos: [Math.cos(a) * radius, 0, Math.sin(a) * radius],
            rotY: -a,
            color: i % 4 === 0 ? accent : color
        });
    }
    return boxes;
}

const SENTINEL_CORE_BOXES = [
    { size: [0.24, 0.24, 0.24], pos: [0, 0, 0], rotY: Math.PI * 0.25, color: SENTINEL_CORE },
    { size: [0.36, 0.09, 0.09], pos: [0, 0, 0], color: SENTINEL_HOT },
    { size: [0.09, 0.36, 0.09], pos: [0, 0, 0], color: SENTINEL_HOT },
    { size: [0.09, 0.09, 0.36], pos: [0, 0, 0], color: SENTINEL_HOT },
    { size: [0.19, 0.19, 0.19], pos: [0, 0, 0], rotX: Math.PI * 0.25, rotZ: Math.PI * 0.25, color: SENTINEL_ICE }
];

const SENTINEL_IRIS_BOXES = [
    { size: [0.13, 0.30, 0.05], pos: [0, 0, 0], color: SENTINEL_PLATE },
    { size: [0.05, 0.30, 0.06], pos: [0.05, 0, 0.01], color: SENTINEL_EDGE },
    { size: [0.09, 0.06, 0.05], pos: [-0.01, 0.13, 0.01], color: SENTINEL_VOID }
];

// Lance beam: this is the one place a baked-in offset is correct. The geometry
// runs from z=0 forward, so scale.z grows the beam out of the emitter mount
// instead of sliding a centred box away from it.
const SENTINEL_LANCE_BOXES = [
    { size: [0.11, 0.11, 1.70], pos: [0, 0, 0.85], color: SENTINEL_HOT },
    { size: [0.20, 0.20, 1.30], pos: [0, 0, 0.68], color: SENTINEL_ICE }
];

let sentinelParts = null;

function getSentinelParts() {
    if (sentinelParts) return sentinelParts;

    sentinelParts = {
        shardGeometries: {
            upper: buildVoxelGeometry(SENTINEL_SHARD_UPPER),
            lower: buildVoxelGeometry(SENTINEL_SHARD_LOWER),
            spike: buildVoxelGeometry(SENTINEL_SHARD_SPIKE)
        },
        coreGeometry: buildVoxelGeometry(SENTINEL_CORE_BOXES),
        glowGeometry: new THREE.BoxGeometry(0.36, 0.36, 0.36),
        irisGeometries: {
            '-1': buildVoxelGeometry(SENTINEL_IRIS_BOXES),
            '1': buildVoxelGeometry(mirrorBoxes(SENTINEL_IRIS_BOXES))
        },
        ringGeometries: [
            buildVoxelGeometry(sentinelRingBoxes(0.50, 0.075, SENTINEL_PLATE, SENTINEL_GLYPH)),
            buildVoxelGeometry(sentinelRingBoxes(0.42, 0.060, SENTINEL_OBSIDIAN, SENTINEL_EDGE))
        ],
        lanceGeometry: buildVoxelGeometry(SENTINEL_LANCE_BOXES),
        // Deliberately dim. Gameplay bloom is much stronger than the Bestiary's,
        // and emissive is added flat on top of the vertex colours, so anything
        // higher collapses the whole obsidian ramp into one white sparkle.
        shardMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: SENTINEL_OBSIDIAN,
            emissiveIntensity: 0.18,
            shininess: 70,
            flatShading: true
        }),
        ringMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: SENTINEL_OBSIDIAN,
            emissiveIntensity: 0.3,
            flatShading: true
        }),
        coreMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: SENTINEL_CORE,
            emissiveIntensity: 0.9,
            flatShading: true
        }),
        glowMaterial: new THREE.MeshPhongMaterial({
            color: SENTINEL_GLYPH,
            emissive: SENTINEL_GLYPH,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
            flatShading: true
        }),
        lanceMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: SENTINEL_HOT,
            emissiveIntensity: 6.0,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            flatShading: true
        })
    };

    return sentinelParts;
}

function createSentinelAlien(group) {
    const parts = getSentinelParts();

    // Everything hangs off a hover pivot so the levitation bob, the yaw drift
    // and the reassembly shudder never touch the formation-owned group axes.
    const hoverPivot = new THREE.Group();
    group.add(hoverPivot);
    group.userData.hoverPivot = hoverPivot;

    const core = new THREE.Mesh(parts.coreGeometry, parts.coreMaterial.clone());
    hoverPivot.add(core);
    group.userData.core = core;

    const glow = new THREE.Mesh(parts.glowGeometry, parts.glowMaterial.clone());
    hoverPivot.add(glow);
    group.userData.glow = glow;

    group.userData.rings = parts.ringGeometries.map((geometry, index) => {
        const tilt = new THREE.Group();
        tilt.rotation.x = index === 0 ? 0.42 : -0.34;
        tilt.rotation.z = index === 0 ? -0.28 : 0.36;
        hoverPivot.add(tilt);

        const ring = new THREE.Mesh(geometry, parts.ringMaterial.clone());
        tilt.add(ring);

        return { tilt, ring, direction: index === 0 ? 1 : -1 };
    });

    group.userData.iris = [-1, 1].map(side => {
        const plate = new THREE.Mesh(parts.irisGeometries[side], parts.shardMaterial.clone());
        plate.position.set(side * 0.07, 0, 0.42);
        hoverPivot.add(plate);
        return { mesh: plate, side };
    });

    const lanceMount = new THREE.Group();
    lanceMount.position.set(0, 0, 0.5);
    hoverPivot.add(lanceMount);
    const lance = new THREE.Mesh(parts.lanceGeometry, parts.lanceMaterial.clone());
    lance.scale.set(0.001, 0.001, 0.001);
    lanceMount.add(lance);
    group.userData.lance = lance;

    group.userData.shards = SENTINEL_SHARDS.map((config, index) => {
        const pivot = new THREE.Group();
        pivot.rotation.y = config.angle;
        hoverPivot.add(pivot);

        const mesh = new THREE.Mesh(
            parts.shardGeometries[config.profile],
            parts.shardMaterial.clone()
        );
        mesh.position.set(0, config.y, config.radius);
        mesh.rotation.x = config.tilt !== undefined ? config.tilt : (config.y > 0 ? -0.32 : 0.30);
        mesh.castShadow = true;
        pivot.add(mesh);

        return {
            pivot,
            mesh,
            angle: config.angle,
            radius: config.radius,
            y: config.y,
            lift: config.lift,
            spin: config.spin,
            restTilt: mesh.rotation.x,
            // Where this shard parks when the blown-apart shell locks into a
            // firing lens in front of the core.
            ringAngle: (index / SENTINEL_SHARDS.length) * Math.PI * 2,
            phase: index * 0.63
        };
    });
}


function animateSentinel(alien, time) {
    switch (alien.userData.row) {
        case 9: { // Sentinel - shatter bloom, aperture lock, lance discharge
            const sentinel = alien.userData;
            const t = time;
            const p = (t % 9.2) / 9.2;

            // Phase weights. Every gain that varies is expressed as
            // rate * weight added to a t-driven base, never as t * rate, so a
            // phase change can never jump the cycle.
            const seg = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
            const ease = v => v * v * (3 - 2 * v);

            const bloom = ease(seg(0.18, 0.42)) * (1 - ease(seg(0.78, 0.96)));
            const lock = ease(seg(0.50, 0.66)) * (1 - ease(seg(0.72, 0.82)));
            const charge = ease(seg(0.46, 0.70)) * (1 - ease(seg(0.70, 0.77)));
            // Explicit window, not a steep power curve: this has to read as a
            // discharge, not a permanent glow.
            const flash = p >= 0.700 && p < 0.742
                ? Math.sin(((p - 0.700) / 0.042) * Math.PI)
                : 0;
            const slam = p >= 0.90 ? Math.sin(((p - 0.90) / 0.10) * Math.PI) : 0;
            const breathe = Math.sin(t * 1.6) * 0.5 + 0.5;

            if (sentinel.hoverPivot) {
                sentinel.hoverPivot.rotation.y = Math.sin(t * 0.5) * 0.22 + bloom * 0.30;
                sentinel.hoverPivot.rotation.x = Math.sin(t * 0.9) * 0.05 - charge * 0.06 + slam * 0.10;
                sentinel.hoverPivot.rotation.z = Math.cos(t * 0.7) * 0.04 + slam * Math.sin(t * 34) * 0.03;
                sentinel.hoverPivot.position.y = Math.sin(t * 1.3) * 0.04 - slam * 0.05;
            }

            // The shell comes apart: each shard pushes out along its own radial,
            // its pivot orbits the core, then the whole cloud blends into a flat
            // ring standing in front of the emitter.
            if (sentinel.shards) {
                sentinel.shards.forEach(shard => {
                    const orbit = shard.angle + shard.spin * (bloom * 2.4 + Math.sin(t * 0.8 + shard.phase) * 0.10);
                    shard.pivot.rotation.y = orbit * (1 - lock);

                    // Kept tight on purpose: at ALIEN_SPACING 2 the animated
                    // peak half-width has to stay near 0.8, so the shatter
                    // reads through tumble and orbit rather than through throw.
                    const outY = shard.y * (1 + bloom * 0.5) + shard.lift * bloom * 0.5;
                    const outZ = shard.radius * (1 + bloom * 0.75) + bloom * 0.09;
                    const ringX = Math.cos(shard.ringAngle) * 0.50;
                    const ringY = Math.sin(shard.ringAngle) * 0.50;

                    shard.mesh.position.set(
                        ringX * lock,
                        outY * (1 - lock) + ringY * lock,
                        outZ * (1 - lock) + 0.42 * lock
                    );

                    const tumble = bloom * (1 - lock);
                    shard.mesh.rotation.x = shard.restTilt
                        + Math.sin(t * 2.6 + shard.phase) * 1.5 * tumble
                        - lock * shard.restTilt;
                    shard.mesh.rotation.y = Math.cos(t * 2.1 + shard.phase) * 1.2 * tumble;
                    shard.mesh.rotation.z = Math.sin(t * 1.8 + shard.phase * 1.7) * 1.0 * tumble
                        + lock * (shard.ringAngle + Math.PI / 2);

                    shard.mesh.material.emissiveIntensity =
                        0.18 + bloom * 0.20 + lock * 0.18 + flash * 0.45 + slam * 0.25;
                });
            }

            // Counter-rotating gimbals spin up with the bloom.
            if (sentinel.rings) {
                sentinel.rings.forEach((ring, index) => {
                    ring.ring.rotation.y = ring.direction * (t * (0.6 + index * 0.35) + bloom * 3.6 + flash * 0.5);
                    ring.tilt.rotation.z = (index === 0 ? -0.28 : 0.36) + Math.sin(t * 0.6 + index) * 0.12 * (1 + bloom);
                    ring.ring.material.emissiveIntensity = 0.30 + bloom * 0.35 + charge * 0.45 + flash * 1.0;
                });
            }

            // The iris slides open on the charge, exposing the emitter.
            if (sentinel.iris) {
                sentinel.iris.forEach(plate => {
                    const open = Math.max(bloom * 0.35, charge);
                    plate.mesh.position.x = plate.side * (0.07 + open * 0.26);
                    plate.mesh.rotation.y = plate.side * open * 0.6;
                    plate.mesh.material.emissiveIntensity = 0.35 + charge * 0.9 + flash * 1.6;
                });
            }

            // Kept deliberately dim. Emissive is added flat on top of the vertex
            // colours, so a hot core does not read as "bright core against dark
            // shards" - it floods the whole sculpt and erases the obsidian ramp
            // under bloom. The charge reads through scale and the iris instead.
            if (sentinel.core) {
                const heat = 0.9 + breathe * 0.18 + bloom * 0.35 + charge * 0.9 + flash * 1.5;
                sentinel.core.material.emissiveIntensity = heat;
                const swell = 1 + breathe * 0.04 + charge * 0.16 + flash * 0.26;
                sentinel.core.scale.setScalar(swell);
                sentinel.core.rotation.y = t * 0.9;
                sentinel.core.rotation.x = t * 0.4;
            }

            if (sentinel.glow) {
                sentinel.glow.material.opacity = 0.05 + bloom * 0.04 + charge * 0.06 + flash * 0.11;
                sentinel.glow.scale.setScalar(1 + charge * 0.14 + flash * 0.30);
                sentinel.glow.rotation.y = -t * 0.6;
            }

            // The lance geometry starts at its mount and runs forward, so
            // scale.z grows the beam out of the emitter rather than sliding it.
            if (sentinel.lance) {
                sentinel.lance.scale.set(
                    0.001 + flash * 1.1,
                    0.001 + flash * 1.1,
                    0.001 + flash
                );
                sentinel.lance.material.opacity = flash * 0.95;
            }

            // Guarded: updateSwoop() owns Y during a kamikaze dive.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.06 + Math.sin(t * 1.1) * 0.05 + flash * 0.04;
            }
            break;
        }
    }
}

export { getSentinelParts };
export { createSentinelAlien };
