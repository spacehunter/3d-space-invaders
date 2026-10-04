import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Invader (row 6) - the 1-bit arcade homage, sculpted but deliberately crisp
// ---------------------------------------------------------------------------

// This row is the homage row, so form comes from stacked bevels and hard
// shadow steps rather than from hue. The ramp is a cool blue-grey rather than
// neutral white: at a glance it still reads as the white/silver row, but a
// near-white ramp (fff -> eaeaea -> cccccc) spans too little value for the
// bevels to survive bloom, so the sculpt flattened into one mass. These steps
// are spread much wider and tinted, which is what actually makes the form
// legible. Red stays reserved for the blaster, cyan for the optics.
const INVADER_WHITE = 0xf8fbff;   // highlight - bevel tops catching the light
const INVADER_PLATE = 0xdfe9f6;   // main armour plate
const INVADER_TRIM = 0xb2c1d4;    // edge trim and secondary panels
const INVADER_SHADE = 0x7d8da5;   // shadow step under an overhang
const INVADER_RECESS = 0x3d4860;  // sockets and seams only

// Centre column of the hull - straddles x=0, so it is never mirrored
const INVADER_HULL_CORE = [
    { size: [0.44, 0.12, 0.36], pos: [0, 0.62, -0.02], color: INVADER_WHITE },  // crown cap
    { size: [0.64, 0.16, 0.46], pos: [0, 0.50, -0.02], color: INVADER_PLATE },
    { size: [0.92, 0.20, 0.58], pos: [0, 0.33, 0.00], color: INVADER_PLATE },   // head
    { size: [0.84, 0.05, 0.50], pos: [0, 0.45, 0.00], color: INVADER_WHITE },   // head bevel
    { size: [1.00, 0.09, 0.12], pos: [0, 0.21, 0.31], color: INVADER_SHADE },   // brow band
    { size: [1.14, 0.26, 0.68], pos: [0, 0.06, 0.00], color: INVADER_PLATE },   // chest
    { size: [1.06, 0.05, 0.60], pos: [0, 0.21, 0.00], color: INVADER_WHITE },   // chest bevel
    { size: [1.22, 0.20, 0.72], pos: [0, -0.16, 0.00], color: INVADER_PLATE },  // belly, widest tier
    { size: [1.10, 0.06, 0.64], pos: [0, -0.28, 0.00], color: INVADER_SHADE },  // under-lip
    { size: [0.78, 0.16, 0.52], pos: [0, -0.38, 0.00], color: INVADER_PLATE },  // pelvis
    { size: [0.66, 0.06, 0.44], pos: [0, -0.47, 0.00], color: INVADER_TRIM },
    // Front-face detail: a centre seam and a stepped grille
    { size: [0.07, 0.44, 0.06], pos: [0, 0.14, 0.37], color: INVADER_SHADE },
    { size: [0.34, 0.07, 0.08], pos: [0, -0.06, 0.37], color: INVADER_RECESS },
    { size: [0.26, 0.06, 0.08], pos: [0, -0.16, 0.37], color: INVADER_RECESS },
    // Cannon housing the barrel slides into
    { size: [0.34, 0.24, 0.26], pos: [0, -0.22, 0.36], color: INVADER_TRIM },
    { size: [0.38, 0.06, 0.22], pos: [0, -0.09, 0.36], color: INVADER_WHITE }
];

// One half of the hull. mirrorBoxes() builds the other, so the two sides are
// exact - symmetry carries this silhouette more than any other model's.
const INVADER_HULL_SIDE = [
    { size: [0.16, 0.26, 0.30], pos: [-0.44, 0.30, 0.16], color: INVADER_PLATE },   // cheek
    { size: [0.30, 0.24, 0.12], pos: [-0.26, 0.15, 0.32], color: INVADER_RECESS },  // eye socket
    { size: [0.34, 0.06, 0.16], pos: [-0.26, 0.29, 0.32], color: INVADER_TRIM },    // socket hood
    { size: [0.24, 0.22, 0.44], pos: [-0.60, 0.10, 0.00], color: INVADER_PLATE },   // shoulder pad
    { size: [0.20, 0.05, 0.38], pos: [-0.60, 0.22, 0.00], color: INVADER_WHITE },   // shoulder bevel
    { size: [0.22, 0.06, 0.10], pos: [-0.60, -0.02, 0.00], color: INVADER_SHADE },  // shoulder shadow
    { size: [0.08, 0.08, 0.08], pos: [-0.42, -0.16, 0.38], color: INVADER_SHADE },  // rivet
    { size: [0.08, 0.08, 0.08], pos: [-0.42, 0.06, 0.36], color: INVADER_SHADE },
    { size: [0.20, 0.14, 0.34], pos: [-0.42, -0.42, 0.00], color: INVADER_SHADE }   // hip block
];

// Both optics in one mesh, so a blink scales them together. Built around y=0
// and lifted by INVADER_EYE_Y at mount time, so the squash closes the eyes in
// place instead of sliding them down toward the group origin.
const INVADER_EYE_Y = 0.15;
const INVADER_EYE_HALF = [
    { size: [0.22, 0.14, 0.10], pos: [-0.26, 0, 0.37], color: 0x00ffff },
    { size: [0.10, 0.07, 0.06], pos: [-0.26, 0, 0.41], color: 0xd8ffff }
];

// Antenna: a stepped pixel stalk leaning outward from its base
const INVADER_ANTENNA = [
    { size: [0.10, 0.16, 0.10], pos: [0.00, 0.08, 0], color: INVADER_TRIM },
    { size: [0.08, 0.14, 0.08], pos: [-0.05, 0.21, 0], color: INVADER_PLATE },
    { size: [0.08, 0.12, 0.08], pos: [-0.10, 0.32, 0], color: INVADER_WHITE }
];
const INVADER_ANTENNA_PIP = [-0.13, 0.40, 0];

// Arm, built extending along -X from its shoulder joint so it can swing
const INVADER_ARM = [
    { size: [0.22, 0.20, 0.34], pos: [-0.11, 0.00, 0], color: INVADER_PLATE },
    { size: [0.24, 0.05, 0.30], pos: [-0.11, 0.10, 0], color: INVADER_WHITE },
    { size: [0.20, 0.06, 0.32], pos: [-0.11, -0.10, 0], color: INVADER_SHADE },
    { size: [0.16, 0.26, 0.26], pos: [-0.24, 0.14, 0], color: INVADER_PLATE },   // forearm
    { size: [0.16, 0.05, 0.22], pos: [-0.24, 0.26, 0], color: INVADER_WHITE },
    { size: [0.13, 0.16, 0.18], pos: [-0.28, 0.32, 0], color: INVADER_TRIM },    // claw
    { size: [0.09, 0.09, 0.09], pos: [-0.28, 0.43, 0], color: INVADER_WHITE }
];

// Blaster coils - the one accent colour, matching the red bolt it fires
const INVADER_COILS = [
    { size: [0.30, 0.06, 0.08], pos: [0, -0.09, 0.44], color: 0xff6a6a },
    { size: [0.09, 0.06, 0.26], pos: [-0.40, -0.14, 0.18], color: 0xff6a6a },
    { size: [0.09, 0.06, 0.26], pos: [0.40, -0.14, 0.18], color: 0xff6a6a },
    { size: [0.12, 0.05, 0.12], pos: [0, -0.35, 0.28], color: 0xffb0b0 }
];

// Straight pixel legs - no splay, because the crisp vertical stance is the
// silhouette. All the march lives in fore/aft rotation.
const INVADER_LEG_SEGMENTS = [
    { length: 0.15, width: 0.16, baseBend: 0 },   // thigh
    { length: 0.15, width: 0.13, baseBend: 0 }    // shin
];

const INVADER_LEG_X = 0.30;
const INVADER_LEG_Y = -0.42;

let invaderParts = null;

function getInvaderParts() {
    if (invaderParts) return invaderParts;

    invaderParts = {
        hullGeometry: buildVoxelGeometry([
            ...INVADER_HULL_CORE,
            ...INVADER_HULL_SIDE,
            ...mirrorBoxes(INVADER_HULL_SIDE)
        ]),
        eyeGeometry: buildVoxelGeometry([
            ...INVADER_EYE_HALF,
            ...mirrorBoxes(INVADER_EYE_HALF)
        ]),
        antennaGeometries: {
            '-1': buildVoxelGeometry(INVADER_ANTENNA),
            '1': buildVoxelGeometry(mirrorBoxes(INVADER_ANTENNA))
        },
        armGeometries: {
            '-1': buildVoxelGeometry(INVADER_ARM),
            '1': buildVoxelGeometry(mirrorBoxes(INVADER_ARM))
        },
        coilGeometry: buildVoxelGeometry(INVADER_COILS),
        pipGeometry: buildVoxelGeometry([
            { size: [0.11, 0.11, 0.11], pos: [0, 0, 0], color: 0x9ffcff }
        ]),
        // Barrel runs forward from its breech, so recoil is a slide along Z
        barrelGeometry: buildVoxelGeometry([
            { size: [0.25, 0.25, 0.08], pos: [0, 0, 0.05], color: INVADER_SHADE },
            { size: [0.20, 0.20, 0.34], pos: [0, 0, 0.18], color: INVADER_PLATE },
            { size: [0.28, 0.05, 0.16], pos: [0, 0.11, 0.18], color: INVADER_WHITE },  // vent fin
            { size: [0.24, 0.24, 0.10], pos: [0, 0, 0.35], color: INVADER_TRIM },      // muzzle ring
            { size: [0.11, 0.11, 0.08], pos: [0, 0, 0.41], color: 0xff5a5a }           // bore
        ]),
        muzzleGeometry: buildVoxelGeometry([
            { size: [0.26, 0.26, 0.09], pos: [0, 0, 0], color: 0xfff3d0 },
            { size: [0.14, 0.14, 0.22], pos: [0, 0, 0.08], color: 0xffc44a }
        ]),
        footGeometry: buildVoxelGeometry([
            { size: [0.24, 0.10, 0.30], pos: [0, -0.05, 0.05], color: INVADER_PLATE },
            { size: [0.26, 0.05, 0.32], pos: [0, -0.11, 0.05], color: INVADER_SHADE }
        ]),
        legGeometries: INVADER_LEG_SEGMENTS.map(s => buildLimbSegmentGeometry(s, INVADER_PLATE, INVADER_TRIM)),
        // Emissive is added flat, on top of the vertex colours rather than
        // through them, so a bright grey emissive floods every tier equally and
        // erases the ramp. Tinted cool and pulled well down, so the plate
        // colours - not the glow - carry the form.
        plateMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x647691,
            emissiveIntensity: 0.85,
            shininess: 20,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x4e5d76,
            emissiveIntensity: 0.75,
            flatShading: true
        }),
        // Cloned per alien so each invader blinks and charges on its own clock
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0x00e5ff,
            emissiveIntensity: 3.0,
            flatShading: true
        }),
        coilMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xff3a3a,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        muzzleMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xffc44a,
            emissiveIntensity: 2.2,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            flatShading: true
        })
    };

    return invaderParts;
}

function createInvaderAlien(group) {
    const parts = getInvaderParts();
    // Optics and antenna pips share one clone, so the blink reads as one system
    const eyeMaterial = parts.eyeMaterial.clone();

    const hull = new THREE.Mesh(parts.hullGeometry, parts.plateMaterial);
    hull.castShadow = true;
    group.add(hull);
    group.userData.hull = hull;

    const eyes = new THREE.Mesh(parts.eyeGeometry, eyeMaterial);
    eyes.position.y = INVADER_EYE_Y;
    group.add(eyes);
    group.userData.eyes = eyes;

    const coils = new THREE.Mesh(parts.coilGeometry, parts.coilMaterial.clone());
    group.add(coils);
    group.userData.coils = coils;

    // Blaster barrel slides back into its housing on recoil
    const barrel = new THREE.Mesh(parts.barrelGeometry, parts.plateMaterial);
    barrel.position.set(0, -0.22, 0.44);
    group.add(barrel);
    group.userData.barrel = barrel;
    group.userData.barrelRestZ = 0.44;

    const muzzle = new THREE.Mesh(parts.muzzleGeometry, parts.muzzleMaterial.clone());
    muzzle.position.set(0, 0, 0.48);
    muzzle.visible = false;
    barrel.add(muzzle);
    group.userData.muzzle = muzzle;

    // Stepped antennae with a sensor pip that blinks with the optics
    group.userData.antennae = [-1, 1].map(side => {
        const antenna = new THREE.Mesh(parts.antennaGeometries[side], parts.limbMaterial);
        antenna.position.set(side * 0.22, 0.54, -0.02);
        group.add(antenna);

        const pip = new THREE.Mesh(parts.pipGeometry, eyeMaterial);
        pip.position.set(side * INVADER_ANTENNA_PIP[0], INVADER_ANTENNA_PIP[1], INVADER_ANTENNA_PIP[2]);
        antenna.add(pip);

        return { mesh: antenna, side };
    });

    // Arms hinge at the shoulder so they can pump with the march
    group.userData.arms = [-1, 1].map(side => {
        const arm = new THREE.Mesh(parts.armGeometries[side], parts.plateMaterial);
        arm.position.set(side * 0.46, 0.10, 0);
        group.add(arm);
        return { mesh: arm, side };
    });

    // Two straight pixel legs, jointed at the knee
    group.userData.legs = [-1, 1].map(side => {
        const mount = new THREE.Group();
        mount.position.set(side * INVADER_LEG_X, INVADER_LEG_Y, 0);
        group.add(mount);

        const segments = buildLimbChain(mount, parts.legGeometries, INVADER_LEG_SEGMENTS, parts.limbMaterial, -1);

        const foot = new THREE.Mesh(parts.footGeometry, parts.limbMaterial);
        foot.position.y = -INVADER_LEG_SEGMENTS[1].length;
        segments[1].add(foot);

        return { mount, segments, foot, side };
    });
}


function animateInvader(alien, time) {
    switch (alien.userData.row) {
        case 6: { // Invader - two-frame retro march, blinking optics, blaster recoil
            const invader = alien.userData;

            // The march is a hard two-frame sprite flip, not a smooth walk
            // cycle - that stutter is the whole point of the homage row.
            // Accumulated from a frame delta, so the formation speeding up
            // changes the cadence instead of jumping the pose.
            const now = performance.now() * 0.001;
            const dt = Math.min(0.05, now - (invader.marchClock !== undefined ? invader.marchClock : now));
            invader.marchClock = now;
            invader.marchStep = ((invader.marchStep || 0) + dt * (0.9 + alienSpeed * 20)) % 2;

            // Square wave with a short blended edge: crisp at any frame rate,
            // without the tearing a true instant flip would give
            const stepPhase = invader.marchStep % 1;
            const snap = Math.min(1, stepPhase / 0.12);
            const frame = invader.marchStep < 1 ? snap : 1 - snap;
            const swing = frame * 2 - 1;   // -1..1, holding at the extremes

            // Fire cycle as explicit events: a crisp flash, a recoil that snaps
            // back and eases out, then a long recharge
            const firePhase = (time % 2.6) / 2.6;
            const flash = firePhase < 0.05 ? Math.sin((firePhase / 0.05) * Math.PI) : 0;
            const recoil = firePhase < 0.02
                ? firePhase / 0.02
                : Math.max(0, 1 - (firePhase - 0.02) / 0.16);
            const charge = Math.max(0, (firePhase - 0.07) / 0.93);

            // Legs: one strides while the other plants, swapping on the flip
            if (invader.legs) {
                invader.legs.forEach(leg => {
                    const lead = leg.side * swing;
                    const lift = Math.max(0, lead);
                    // Hip swings fore/aft; -X rotation carries the foot forward
                    leg.segments[0].rotation.x = -lead * 0.32;
                    leg.segments[1].rotation.x = lift * 0.55;
                    leg.foot.rotation.x = -lift * 0.30;
                });
            }

            // Arms pump against the legs, and both snap up on the shot
            if (invader.arms) {
                const raise = 0.06 + flash * 0.12;   // symmetric, so it stays square-on
                invader.arms.forEach(arm => {
                    arm.mesh.rotation.z = arm.side * raise - swing * 0.16;
                    arm.mesh.rotation.x = arm.side * swing * 0.20;
                });
            }

            // Antennae sway outward together and twitch on each footfall
            if (invader.antennae) {
                invader.antennae.forEach(antenna => {
                    antenna.mesh.rotation.z = antenna.side * (Math.sin(time * 5) * 0.22 + swing * 0.10);
                    antenna.mesh.rotation.x = Math.sin(time * 4 + antenna.side) * 0.16;
                });
            }

            // Optics: a slow scan glow with an occasional hard blink
            if (invader.eyes) {
                const blinkPhase = (time % 3.7) / 3.7;
                const blink = blinkPhase < 0.04 ? Math.sin((blinkPhase / 0.04) * Math.PI) : 0;
                invader.eyes.scale.y = 1 - blink * 0.9;
                invader.eyes.material.emissiveIntensity =
                    2.0 + Math.sin(time * 3) * 0.5 + charge * 0.8 - blink * 1.6;
            }

            // Barrel recoils into its housing, then eases back out
            if (invader.barrel) {
                invader.barrel.position.z = invader.barrelRestZ - recoil * 0.18;
            }
            if (invader.muzzle) {
                invader.muzzle.visible = flash > 0.01;
                invader.muzzle.material.opacity = flash * 0.6;
                invader.muzzle.scale.setScalar(0.3 + flash * 0.7);
            }

            // Coils glow back up while recharging and dump on the shot
            if (invader.coils) {
                invader.coils.material.emissiveIntensity = 0.7 + charge * 2.4 + flash * 2.0;
            }

            // Body rocks with the march and kicks back on the shot. The
            // formation owns position.z, so the kick stays in rotation.
            alien.rotation.z = swing * 0.06;
            alien.rotation.x = -recoil * 0.10;

            // Stomp: the body dips as a foot plants. Skipped mid-swoop,
            // which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.abs(swing) * 0.05;
            }
            break;
        }
    }
}

export { getInvaderParts };
export { createInvaderAlien };
