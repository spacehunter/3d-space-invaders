import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// UFO (row 3) - hard-surface saucer
// ---------------------------------------------------------------------------

const UFO_HULL = [
    // Stacked discs taper up from the rim into the fuselage
    ...saucerTier(1.68, 1.12, 0.13, -0.06, 0xd8a800),   // rim, darker trim
    ...saucerTier(1.34, 0.90, 0.16, 0.07, 0xffe814),
    ...saucerTier(0.96, 0.64, 0.14, 0.21, 0xfff268),
    // Underside taper
    ...saucerTier(1.16, 0.78, 0.12, -0.18, 0xb8860b),
    ...saucerTier(0.62, 0.42, 0.10, -0.28, 0x8a6508),
    // Hull panel seams across the rim
    { size: [1.74, 0.05, 0.10], pos: [0, 0.02, 0], color: 0x8a6508 },
    { size: [0.10, 0.05, 1.74], pos: [0, 0.02, 0], color: 0x8a6508 },
    // Landing struts tucked under the rim
    { size: [0.12, 0.20, 0.12], pos: [-0.52, -0.34, 0.52], color: 0x8a6508 },
    { size: [0.12, 0.20, 0.12], pos: [0.52, -0.34, 0.52], color: 0x8a6508 },
    { size: [0.12, 0.20, 0.12], pos: [-0.52, -0.34, -0.52], color: 0x8a6508 },
    { size: [0.12, 0.20, 0.12], pos: [0.52, -0.34, -0.52], color: 0x8a6508 }
];

// Canopy tiers, kept translucent so the pilot reads through them
const UFO_DOME = [
    ...saucerTier(0.66, 0.46, 0.14, 0.35, 0x9ff5ff),
    ...saucerTier(0.48, 0.34, 0.14, 0.49, 0xc8faff),
    { size: [0.24, 0.10, 0.24], pos: [0, 0.60, 0], color: 0xe8feff }
];

// A pilot silhouette inside the canopy
const UFO_PILOT = [
    { size: [0.24, 0.20, 0.20], pos: [0, 0.44, 0], color: 0x86b32e },
    { size: [0.16, 0.12, 0.14], pos: [0, 0.31, 0], color: 0x5e8020 },
    { size: [0.05, 0.05, 0.04], pos: [-0.06, 0.47, 0.10], color: 0xff3b3b },
    { size: [0.05, 0.05, 0.04], pos: [0.06, 0.47, 0.10], color: 0xff3b3b }
];

// Downward scan beam, hidden until a sweep fires
const UFO_BEAM = [
    { size: [0.30, 0.40, 0.30], pos: [0, -0.60, 0], color: 0x9ff8ff },
    { size: [0.46, 0.40, 0.46], pos: [0, -1.00, 0], color: 0x4fc0e0 },
    { size: [0.62, 0.40, 0.62], pos: [0, -1.40, 0], color: 0x1a5a70 }
];

const UFO_LIGHT_COUNT = 8;
const UFO_LIGHT_RADIUS = 0.84;

let ufoParts = null;

function getUfoParts() {
    if (ufoParts) return ufoParts;

    // Rotating collar the running lights are mounted to
    const ringBoxes = [];
    for (let i = 0; i < UFO_LIGHT_COUNT; i++) {
        const angle = (i / UFO_LIGHT_COUNT) * Math.PI * 2;
        ringBoxes.push({
            size: [0.30, 0.10, 0.16],
            pos: [Math.cos(angle) * 0.74, -0.02, Math.sin(angle) * 0.74],
            rotY: -angle,
            color: 0x8a6508
        });
    }

    ufoParts = {
        hullGeometry: buildVoxelGeometry(UFO_HULL),
        domeGeometry: buildVoxelGeometry(UFO_DOME),
        pilotGeometry: buildVoxelGeometry(UFO_PILOT),
        beamGeometry: buildVoxelGeometry(UFO_BEAM),
        ringGeometry: buildVoxelGeometry(ringBoxes),
        lightGeometry: buildVoxelGeometry([
            { size: [0.14, 0.14, 0.14], pos: [0, 0, 0], color: 0x8ffcff }
        ]),
        emitterGeometry: buildVoxelGeometry([
            { size: [0.34, 0.10, 0.34], pos: [0, -0.36, 0], color: 0x6fe8ff },
            { size: [0.22, 0.08, 0.22], pos: [0, -0.44, 0], color: 0xc8faff }
        ]),
        hullMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xb8860b,
            emissiveIntensity: 0.85,
            shininess: 100,
            flatShading: true
        }),
        ringMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x7a5a08,
            emissiveIntensity: 0.7,
            flatShading: true
        }),
        pilotMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x2e4a08,
            emissiveIntensity: 1.1,
            flatShading: true
        }),
        // Cloned per alien (and per light) so each can pulse independently
        domeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x2ad8f0,
            emissiveIntensity: 0.7,
            shininess: 120,
            flatShading: true,
            transparent: true,
            opacity: 0.42
        }),
        lightMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.5,
            flatShading: true
        }),
        beamMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x5fe0ff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            flatShading: true
        })
    };

    return ufoParts;
}

function createUFOAlien(group) {
    const parts = getUfoParts();

    // Hull spins on its own axis so the canopy and pilot stay level
    const hull = new THREE.Mesh(parts.hullGeometry, parts.hullMaterial);
    hull.castShadow = true;
    group.add(hull);
    group.userData.hull = hull;

    const dome = new THREE.Mesh(parts.domeGeometry, parts.domeMaterial.clone());
    group.add(dome);
    group.userData.dome = dome;

    const pilot = new THREE.Mesh(parts.pilotGeometry, parts.pilotMaterial);
    group.add(pilot);
    group.userData.pilot = pilot;

    // Light collar counter-rotates against the hull
    const ring = new THREE.Group();
    group.add(ring);
    group.userData.ring = ring;
    ring.add(new THREE.Mesh(parts.ringGeometry, parts.ringMaterial));

    group.userData.lights = [];
    for (let i = 0; i < UFO_LIGHT_COUNT; i++) {
        const angle = (i / UFO_LIGHT_COUNT) * Math.PI * 2;
        // Each light owns its material - a shared one would make the chase
        // write the same intensity eight times and never actually chase
        const light = new THREE.Mesh(parts.lightGeometry, parts.lightMaterial.clone());
        light.position.set(
            Math.cos(angle) * UFO_LIGHT_RADIUS,
            -0.02,
            Math.sin(angle) * UFO_LIGHT_RADIUS
        );
        ring.add(light);
        group.userData.lights.push(light);
    }

    const emitter = new THREE.Mesh(parts.emitterGeometry, parts.domeMaterial.clone());
    group.add(emitter);
    group.userData.emitter = emitter;

    const beam = new THREE.Mesh(parts.beamGeometry, parts.beamMaterial.clone());
    beam.visible = false;
    group.add(beam);
    group.userData.beam = beam;
}


function animateUfo(alien, time) {
    switch (alien.userData.row) {
        case 3: { // UFO - counter-rotating saucer, chase lights, scan beam
            const ufo = alien.userData;

            if (ufo.lights) {
                ufo.lights.forEach((light, i) => {
                    // Chase effect: the bright spot travels around the ring
                    const angle = (i / UFO_LIGHT_COUNT) * Math.PI * 2;
                    const intensity = (Math.sin(time * 5 + angle) + 1) / 2;

                    light.material.emissiveIntensity = 0.5 + intensity * 2.6;
                    const lightScale = 1 + intensity * 0.6;
                    light.scale.setScalar(lightScale);
                });
            }

            // Hull spins beneath a level canopy; the light collar counter-rotates
            if (ufo.hull) ufo.hull.rotation.y = time * 1.6;
            if (ufo.ring) ufo.ring.rotation.y = -time * 1.1;

            // Canopy glow breathes, and the pilot looks around inside it
            if (ufo.dome) {
                ufo.dome.material.emissiveIntensity = 0.6 + Math.sin(time * 2.4) * 0.35;
            }
            if (ufo.pilot) {
                ufo.pilot.rotation.y = Math.sin(time * 0.6) * 0.5;
                ufo.pilot.position.y = Math.sin(time * 3) * 0.012;
            }

            // Scan sweep: the emitter charges, then a beam stabs downward
            const scanPhase = (time % 5.5) / 5.5;
            const scanning = scanPhase < 0.16;
            const scan = scanning ? Math.sin((scanPhase / 0.16) * Math.PI) : 0;

            if (ufo.emitter) {
                ufo.emitter.material.emissiveIntensity = 1.0 + scan * 3.0;
                ufo.emitter.scale.set(1 + scan * 0.2, 1, 1 + scan * 0.2);
            }
            if (ufo.beam) {
                ufo.beam.visible = scan > 0.01;
                ufo.beam.material.opacity = scan * 0.32;
                ufo.beam.scale.set(0.4 + scan * 0.6, 1, 0.4 + scan * 0.6);
            }

            // Complex hover (superimposed waves). Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.sin(time * 1.5) * 0.2 + Math.sin(time * 4.2) * 0.1;
            }

            // Gyroscopic wobble of the craft as a whole
            alien.rotation.x = Math.sin(time * 2) * 0.15;
            alien.rotation.z = Math.cos(time * 1.7) * 0.15;
            break;
        }
    }
}

export { getUfoParts };
export { createUFOAlien };
