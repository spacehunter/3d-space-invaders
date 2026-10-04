import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Tank (row 4) - armoured chassis with rolling treads
// ---------------------------------------------------------------------------

// Sloped and stepped armour rather than one slab
const TANK_HULL = [
    { size: [1.28, 0.30, 1.28], pos: [0, -0.06, 0], color: 0x1fb8c4 },       // lower hull
    { size: [1.08, 0.22, 1.02], pos: [0, 0.20, 0], color: 0x2ad4e0 },        // upper deck
    { size: [1.04, 0.34, 0.12], pos: [0, 0.10, 0.60], rotX: -0.60, color: 0x2ad4e0 },  // glacis
    { size: [0.98, 0.26, 0.12], pos: [0, 0.12, -0.60], rotX: 0.40, color: 0x0d6b78 },  // rear plate
    // Side skirts armouring the treads, with fenders over the top
    { size: [0.10, 0.18, 1.22], pos: [-0.70, 0.09, 0], color: 0x0d6b78 },
    { size: [0.10, 0.18, 1.22], pos: [0.70, 0.09, 0], color: 0x0d6b78 },
    { size: [0.26, 0.06, 1.34], pos: [-0.62, 0.20, 0], color: 0x1fb8c4 },
    { size: [0.26, 0.06, 1.34], pos: [0.62, 0.20, 0], color: 0x1fb8c4 },
    // Bolt heads across the glacis
    { size: [0.08, 0.08, 0.08], pos: [-0.36, 0.22, 0.56], color: 0x0a4a55 },
    { size: [0.08, 0.08, 0.08], pos: [0.36, 0.22, 0.56], color: 0x0a4a55 },
    { size: [0.08, 0.08, 0.08], pos: [-0.36, -0.06, 0.66], color: 0x0a4a55 },
    { size: [0.08, 0.08, 0.08], pos: [0.36, -0.06, 0.66], color: 0x0a4a55 },
    // Exhaust stacks at the rear deck
    { size: [0.11, 0.20, 0.11], pos: [-0.34, 0.32, -0.42], color: 0x0a4a55 },
    { size: [0.11, 0.20, 0.11], pos: [0.34, 0.32, -0.42], color: 0x0a4a55 },
    // Stowage box
    { size: [0.44, 0.14, 0.20], pos: [0, 0.28, -0.44], color: 0x0d6b78 },
    // Bogie frames the track belts ride around
    { size: [0.16, 0.24, 0.92], pos: [-0.58, -0.20, 0], color: 0x0a4a55 },
    { size: [0.16, 0.24, 0.92], pos: [0.58, -0.20, 0], color: 0x0a4a55 }
];

// Turret yaws as one piece, so it is built in its own local space
const TANK_TURRET = [
    { size: [0.64, 0.09, 0.64], pos: [0, 0.34, 0], color: 0x0d6b78 },        // turret ring
    { size: [0.72, 0.26, 0.78], pos: [0, 0.50, 0.02], color: 0x2ad4e0 },
    { size: [0.60, 0.30, 0.12], pos: [0, 0.48, 0.42], rotX: -0.50, color: 0x2ad4e0 },  // sloped face
    { size: [0.48, 0.08, 0.54], pos: [0, 0.66, 0.02], color: 0x37e4f0 },     // roof
    { size: [0.32, 0.24, 0.18], pos: [0, 0.46, 0.44], color: 0x0d6b78 },     // mantlet
    { size: [0.22, 0.13, 0.22], pos: [0.15, 0.74, -0.10], color: 0x1fb8c4 }, // cupola
    { size: [0.07, 0.16, 0.07], pos: [-0.20, 0.76, -0.24], color: 0x0a4a55 } // radar mast
];

// Energy coils - the tank's glowing accent, charging between shots
const TANK_COILS = [
    { size: [0.90, 0.06, 0.09], pos: [0, 0.32, 0.44], color: 0x7ff8ff },
    { size: [0.09, 0.06, 0.60], pos: [-0.50, 0.24, -0.10], color: 0x7ff8ff },
    { size: [0.09, 0.06, 0.60], pos: [0.50, 0.24, -0.10], color: 0x7ff8ff },
    { size: [0.10, 0.09, 0.10], pos: [-0.34, 0.43, -0.42], color: 0xc8feff },
    { size: [0.10, 0.09, 0.10], pos: [0.34, 0.43, -0.42], color: 0xc8feff }
];

const TANK_TREAD_X = 0.58;
const TANK_TREAD_PLATES = 14;
const TANK_WHEEL_Z = [-0.40, 0, 0.40];
const TANK_WHEEL_SIZE = 0.26;
// Tread path: two straight runs joined by semicircles at each end
const TANK_TREAD_RUN = 0.80;
const TANK_TREAD_RADIUS = 0.20;

// Position along the tread loop, 0..1, returning the local Y/Z and the angle
// the plate should sit at
function treadPointAt(u) {
    const run = TANK_TREAD_RUN;
    const r = TANK_TREAD_RADIUS;
    const half = run / 2;
    const arc = Math.PI * r;
    const perimeter = 2 * run + 2 * arc;
    let s = ((u % 1) + 1) % 1 * perimeter;

    if (s < run) {                       // bottom run, front-ward
        return { y: -r, z: -half + s, angle: 0 };
    }
    s -= run;
    if (s < arc) {                       // front sprocket
        const t = s / r;
        return { y: -r * Math.cos(t), z: half + r * Math.sin(t), angle: t };
    }
    s -= arc;
    if (s < run) {                       // top run, rear-ward
        return { y: r, z: half - s, angle: Math.PI };
    }
    s -= run;
    const t = s / r;                     // rear sprocket
    return { y: r * Math.cos(t), z: -half - r * Math.sin(t), angle: Math.PI + t };
}

let tankParts = null;

function getTankParts() {
    if (tankParts) return tankParts;

    tankParts = {
        hullGeometry: buildVoxelGeometry(TANK_HULL),
        turretGeometry: buildVoxelGeometry(TANK_TURRET),
        coilGeometry: buildVoxelGeometry(TANK_COILS),
        // Barrel runs forward from its breech so recoil is a slide along Z
        barrelGeometry: buildVoxelGeometry([
            { size: [0.13, 0.13, 0.64], pos: [0, 0, 0.32], color: 0x1fb8c4 },
            { size: [0.17, 0.17, 0.09], pos: [0, 0, 0.30], color: 0x0a4a55 },
            { size: [0.19, 0.19, 0.15], pos: [0, 0, 0.68], color: 0x0d6b78 }   // muzzle brake
        ]),
        muzzleGeometry: buildVoxelGeometry([
            { size: [0.26, 0.26, 0.10], pos: [0, 0, 0], color: 0xd8ffff },
            { size: [0.14, 0.14, 0.22], pos: [0, 0, 0.08], color: 0x9ff4ff }
        ]),
        dishGeometry: buildVoxelGeometry([
            { size: [0.26, 0.05, 0.20], pos: [0, 0, 0.04], color: 0x37e4f0 },
            { size: [0.06, 0.05, 0.06], pos: [0, 0, -0.06], color: 0x0a4a55 }
        ]),
        // Contrasting spokes make the wheel rotation legible
        wheelGeometry: buildVoxelGeometry([
            { size: [0.08, TANK_WHEEL_SIZE, TANK_WHEEL_SIZE], pos: [0, 0, 0], color: 0x0d6b78 },
            { size: [0.09, TANK_WHEEL_SIZE, 0.06], pos: [0, 0, 0], color: 0x37e4f0 },
            { size: [0.09, 0.06, TANK_WHEEL_SIZE], pos: [0, 0, 0], color: 0x37e4f0 }
        ]),
        plateGeometry: buildVoxelGeometry([
            { size: [0.30, 0.07, 0.19], pos: [0, 0, 0], color: 0x14555f },
            { size: [0.32, 0.04, 0.07], pos: [0, 0.03, 0], color: 0x2a8a99 }
        ]),
        armourMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x0a5a66,
            emissiveIntensity: 0.9,
            shininess: 60,
            flatShading: true
        }),
        treadMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x062a33,
            emissiveIntensity: 0.5,
            flatShading: true
        }),
        // Cloned per alien so charge and muzzle flash run on each tank's own clock
        coilMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        muzzleMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x9ff4ff,
            emissiveIntensity: 1.8,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            flatShading: true
        })
    };

    return tankParts;
}

function createTankAlien(group) {
    const parts = getTankParts();

    const hull = new THREE.Mesh(parts.hullGeometry, parts.armourMaterial);
    hull.castShadow = true;
    group.add(hull);
    group.userData.hull = hull;

    const coils = new THREE.Mesh(parts.coilGeometry, parts.coilMaterial.clone());
    group.add(coils);
    group.userData.coils = coils;

    // Turret assembly yaws to track the player
    const turret = new THREE.Group();
    group.add(turret);
    group.userData.turret = turret;
    turret.add(new THREE.Mesh(parts.turretGeometry, parts.armourMaterial));

    // Sweeping radar dish on the turret rear
    const dish = new THREE.Mesh(parts.dishGeometry, parts.armourMaterial);
    dish.position.set(-0.20, 0.86, -0.24);
    turret.add(dish);
    group.userData.dish = dish;

    // Barrel slides back into the mantlet on recoil
    const barrel = new THREE.Mesh(parts.barrelGeometry, parts.armourMaterial);
    barrel.position.set(0, 0.46, 0.44);
    turret.add(barrel);
    group.userData.barrel = barrel;
    group.userData.barrelRestZ = 0.44;

    const muzzle = new THREE.Mesh(parts.muzzleGeometry, parts.muzzleMaterial.clone());
    muzzle.position.set(0, 0, 0.80);
    muzzle.visible = false;
    barrel.add(muzzle);
    group.userData.muzzle = muzzle;

    // Road wheels and a loop of tread plates per side
    group.userData.wheels = [];
    group.userData.treadPlates = [];
    [-1, 1].forEach(side => {
        TANK_WHEEL_Z.forEach(z => {
            const wheel = new THREE.Mesh(parts.wheelGeometry, parts.treadMaterial);
            wheel.position.set(side * TANK_TREAD_X, -TANK_TREAD_RADIUS, z);
            group.add(wheel);
            group.userData.wheels.push(wheel);
        });

        for (let i = 0; i < TANK_TREAD_PLATES; i++) {
            const plate = new THREE.Mesh(parts.plateGeometry, parts.treadMaterial);
            plate.position.x = side * TANK_TREAD_X;
            group.add(plate);
            group.userData.treadPlates.push({ mesh: plate, offset: i / TANK_TREAD_PLATES });
        }
    });
}


function animateTank(alien, time) {
    switch (alien.userData.row) {
        case 4: { // Tank - rolling treads, tracking turret, recoiling gun
            const tank = alien.userData;

            // Fire cycle as an explicit event: a crisp shot, a recoil that
            // snaps back and eases out, then a long recharge
            const firePhase = (time % 3.1) / 3.1;
            const flash = firePhase < 0.06 ? Math.sin((firePhase / 0.06) * Math.PI) : 0;
            const recoil = firePhase < 0.02
                ? firePhase / 0.02
                : Math.max(0, 1 - (firePhase - 0.02) / 0.18);
            const charge = Math.max(0, (firePhase - 0.08) / 0.92);
            const isFiring = recoil > 0.5;

            // Treads scroll at the formation's real speed. Accumulated from a
            // delta rather than multiplied into `time`, so the changing speed
            // never makes the tracks jump.
            const now = performance.now() * 0.001;
            const dt = Math.min(0.05, now - (tank.treadClock !== undefined ? tank.treadClock : now));
            tank.treadClock = now;
            tank.treadScroll = ((tank.treadScroll || 0) + dt * (0.25 + alienSpeed * 7)) % 1;

            if (tank.treadPlates) {
                tank.treadPlates.forEach(plate => {
                    const point = treadPointAt(tank.treadScroll + plate.offset);
                    plate.mesh.position.y = point.y;
                    plate.mesh.position.z = point.z;
                    plate.mesh.rotation.x = point.angle;
                });
            }
            if (tank.wheels) {
                // Wheel rotation matches the track's surface speed
                const spin = tank.treadScroll * (2 * TANK_TREAD_RUN + 2 * Math.PI * TANK_TREAD_RADIUS) / TANK_TREAD_RADIUS;
                tank.wheels.forEach(wheel => { wheel.rotation.x = spin; });
            }

            // Turret sweeps for a target, dish sweeps faster
            if (tank.turret) {
                tank.turret.rotation.y = Math.sin(time * 0.8) * 0.45;
            }
            if (tank.dish) {
                tank.dish.rotation.y = time * 2.2;
            }

            // Barrel recoils into the mantlet, then eases back out
            if (tank.barrel) {
                tank.barrel.position.z = tank.barrelRestZ - recoil * 0.22;
                tank.barrel.rotation.x = -0.04 + Math.sin(time * 0.8 + 1) * 0.06;
            }
            if (tank.muzzle) {
                tank.muzzle.visible = flash > 0.01;
                tank.muzzle.material.opacity = flash * 0.55;
                tank.muzzle.scale.setScalar(0.3 + flash * 0.6);
            }

            // Coils glow back up while recharging, and dump on the shot
            if (tank.coils) {
                tank.coils.material.emissiveIntensity = 0.6 + charge * 2.4;
            }

            // Hull pitches on the shot, otherwise idles with an engine rumble.
            // The formation owns position.z, so the kick stays in rotation -
            // nudging Z here accumulates and walks tanks backwards.
            alien.rotation.x = isFiring ? -0.1 : Math.sin(time * 4) * 0.04;

            // Rumble/Vibration. Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.sin(time * 20) * 0.02;
            }
            break;
        }
    }
}

export { getTankParts };
export { createTankAlien };
