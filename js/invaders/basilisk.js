import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// TYPE 17 — AMPHISBAENA: two-headed serpent with twin arching necks
// ---------------------------------------------------------------------------

// Ramp: dark forest -> venom green -> pale venom glow. Midpoint is clearly
// lighter than space so the sculpt reads at formation distance; the chartreuse
// hot tone is reserved for small accents (eyes, crest).
const BASILISK_DARK   = 0x0d1f14;
const BASILISK_SHADE  = 0x1f4d2a;
const BASILISK_MID    = 0x3fa34d;
const BASILISK_BRIGHT = 0x8fd84a;
const BASILISK_HOT    = 0xe8ff8a;

// Torso: compact cut-corner disc with a dorsal fin and a belly plate.
const BASILISK_TORSO = [
    ...saucerTier(0.62, 0.46, 0.16, -0.10, BASILISK_SHADE),
    ...saucerTier(0.52, 0.38, 0.14,  0.02, BASILISK_MID),
    ...saucerTier(0.38, 0.28, 0.12,  0.13, BASILISK_BRIGHT),
    // dorsal fin behind the heads
    { size: [0.10, 0.26, 0.20], pos: [0, 0.24, -0.10], rotX: -0.12, color: BASILISK_BRIGHT },
    { size: [0.06, 0.14, 0.12], pos: [0, 0.38, -0.14], rotX: -0.12, color: BASILISK_HOT },
    // belly plate toward the player
    { size: [0.30, 0.05, 0.14], pos: [0, -0.19, 0.08], color: BASILISK_DARK },
    // ventral ridge accent at the front
    { size: [0.12, 0.08, 0.06], pos: [0, -0.02, 0.21], color: BASILISK_MID }
];

// Neck (right side): three stepped segments arching up, then curving inward
// toward the player. One side only — mirrorBoxes() builds the left.
const BASILISK_NECK = [
    { size: [0.17, 0.30, 0.17], pos: [0.34, 0.14, 0.06], rotZ: -0.50, color: BASILISK_MID },
    { size: [0.14, 0.26, 0.14], pos: [0.53, 0.29, 0.14], rotZ: -0.95, color: BASILISK_BRIGHT },
    { size: [0.12, 0.20, 0.12], pos: [0.66, 0.43, 0.23], rotZ: -1.35, color: BASILISK_MID }
];

// Eyes: one glowing venom pit per head, on the outer face. Each is parented
// to its neck pivot so the eyes travel with the head through the strike;
// materials are cloned per instance so the flare pulses out of phase.
const BASILISK_EYE_RIGHT = [
    { size: [0.07, 0.05, 0.05], pos: [0.58, 0.55, 0.365], color: BASILISK_HOT }
];

// Head accents (both heads): brow crest spike and lower jaw — merged so the
// bright crest stays one draw call per head.
const BASILISK_HEAD_ACCENT_RIGHT = [
    { size: [0.08, 0.11, 0.08], pos: [0.52, 0.63, 0.20], rotZ: 0.12, color: BASILISK_HOT },
    { size: [0.20, 0.06, 0.15], pos: [0.52, 0.445, 0.29], color: BASILISK_SHADE }
];

// Fangs (both heads): two dripping teeth under each jaw, aimed at the player.
const BASILISK_FANGS_RIGHT = [
    { size: [0.05, 0.12, 0.05], pos: [0.58, 0.40, 0.375], color: BASILISK_HOT },
    { size: [0.05, 0.12, 0.05], pos: [0.46, 0.40, 0.375], color: BASILISK_HOT }
];

// Head (right side): skull box facing the player, mirrored for the left.
const BASILISK_HEAD_RIGHT = [
    { size: [0.24, 0.14, 0.18], pos: [0.52, 0.53, 0.27], color: BASILISK_BRIGHT }
];

let basiliskParts = null;

function getBasiliskParts() {
    if (basiliskParts) return basiliskParts;

    const neckRight = buildVoxelGeometry(BASILISK_NECK);
    const neckLeft = buildVoxelGeometry(mirrorBoxes(BASILISK_NECK));
    const headRight = buildVoxelGeometry(BASILISK_HEAD_RIGHT);
    const headLeft = buildVoxelGeometry(mirrorBoxes(BASILISK_HEAD_RIGHT));
    const accentRight = buildVoxelGeometry(BASILISK_HEAD_ACCENT_RIGHT);
    const accentLeft = buildVoxelGeometry(mirrorBoxes(BASILISK_HEAD_ACCENT_RIGHT));
    const fangsRight = buildVoxelGeometry(BASILISK_FANGS_RIGHT);
    const fangsLeft = buildVoxelGeometry(mirrorBoxes(BASILISK_FANGS_RIGHT));

    basiliskParts = {
        torsoGeometry: buildVoxelGeometry(BASILISK_TORSO),
        neckGeometries: { '-1': neckLeft, '1': neckRight },
        headGeometries: { '-1': headLeft, '1': headRight },
        accentGeometries: { '-1': accentLeft, '1': accentRight },
        fangGeometries: { '-1': fangsLeft, '1': fangsRight },
        eyeGeometries: {
            '-1': buildVoxelGeometry(mirrorBoxes(BASILISK_EYE_RIGHT)),
            '1': buildVoxelGeometry(BASILISK_EYE_RIGHT)
        },
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: BASILISK_MID,
            emissiveIntensity: 0.22,
            shininess: 50,
            flatShading: true
        }),
        accentMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: BASILISK_HOT,
            emissiveIntensity: 0.9,
            flatShading: true
        }),
        fangMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: BASILISK_HOT,
            emissiveIntensity: 0.7,
            flatShading: true
        }),
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: BASILISK_HOT,
            emissiveIntensity: 2.2,
            flatShading: true
        })
    };

    return basiliskParts;
}

function createBasiliskAlien(group) {
    const parts = getBasiliskParts();

    // Body pivot carries all display motion; the formation keeps ownership of
    // group.position.x / .z.
    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    const torso = new THREE.Mesh(parts.torsoGeometry, parts.shellMaterial);
    torso.castShadow = true;
    bodyPivot.add(torso);
    group.userData.torso = torso;

    // Twin necks: each side gets a pivot at its shoulder so the whole neck
    // coils and strikes as one arc. The neck carries head + accents + fangs.
    group.userData.necks = [-1, 1].map(side => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.14, 0.02, 0.04);
        bodyPivot.add(pivot);

        const neck = new THREE.Mesh(parts.neckGeometries[side], parts.shellMaterial);
        neck.position.set(-side * 0.14, -0.02, -0.04); // neck boxes are in body space
        pivot.add(neck);

        const head = new THREE.Mesh(parts.headGeometries[side], parts.shellMaterial);
        head.position.set(-side * 0.14, -0.02, -0.04);
        pivot.add(head);

        const accent = new THREE.Mesh(parts.accentGeometries[side], parts.accentMaterial);
        accent.position.set(-side * 0.14, -0.02, -0.04);
        pivot.add(accent);

        const fangs = new THREE.Mesh(parts.fangGeometries[side], parts.fangMaterial);
        fangs.position.set(-side * 0.14, -0.02, -0.04);
        pivot.add(fangs);

        // Cloned per instance: emissiveIntensity is animated.
        const eye = new THREE.Mesh(parts.eyeGeometries[side], parts.eyeMaterial.clone());
        eye.position.set(-side * 0.14, -0.02, -0.04);
        pivot.add(eye);

        return { pivot, side, eye };
    });
}


function animateBasilisk(alien, time) {
    switch (alien.userData.row) {
        case 17: { // Basilisk — counter-phase head sway, coil-back windup, twin strike snap
            const self = alien.userData;
            const t = time;
            const period = 7.2;
            const phase = (t % period) / period;

            // Explicit phase windows: windup ramps and holds, the strike is a
            // brief burst, recoil decays after it.
            const windup = phase >= 0.50 && phase < 0.65
                ? Math.sin(((phase - 0.50) / 0.15) * Math.PI / 2)
                : phase >= 0.65 && phase < 0.70 ? 1 : 0;
            const strike = phase >= 0.70 && phase < 0.82
                ? Math.sin(((phase - 0.70) / 0.12) * Math.PI)
                : 0;
            const recoil = phase >= 0.82 ? Math.max(0, 1 - (phase - 0.82) / 0.18) : 0;

            // Idle counter-phase head sway, independent of the strike cycle.
            const sway = Math.sin(t * 1.9);

            if (self.necks) {
                self.necks.forEach(neck => {
                    // Sway is counter-phase per side; windup coils the neck back,
                    // the strike snaps it forward, recoil settles it.
                    neck.pivot.rotation.z = neck.side * sway * 0.07
                                          - strike * neck.side * 0.10;
                    neck.pivot.rotation.x = -windup * 0.34
                                          + strike * 0.52
                                          - recoil * 0.10;
                    // Eyes travel with their head and flash through the event.
                    // Cloned per instance -> safe to write here.
                    neck.eye.material.emissiveIntensity = 2.2 + windup * 2.4 + strike * 3.6;
                });
            }

            // Body pivot carries the hover; a slight crouch on windup.
            if (self.bodyPivot) {
                self.bodyPivot.position.y = Math.sin(t * 2.2) * 0.03 - windup * 0.05;
            }

            // Torso compresses on windup and springs on the strike. Child-mesh
            // scale only — the group's scale belongs to the swoop telegraph.
            if (self.torso) {
                self.torso.scale.y = 1 - windup * 0.14 + strike * 0.10;
            }

            // updateSwoop() owns Y during a kamikaze dive.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.03 + Math.sin(t * 2.0) * 0.02;
            }
            break;
        }
    }
}

export { getBasiliskParts };
export { createBasiliskAlien };
