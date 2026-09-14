// ---------------------------------------------------------------------------
// GRAVWORM (row 13) — the crawler
//
// Full rebuild of the VOIDWORM slot (2026-09-14): a HORIZONTAL blocky larva
// that spans the whole formation cell. The two END segments stay planted on
// the baseline (stub feet) while the four middle segments INCH — a phase-
// delayed arch travels tail→head, the inchworm gait. Nothing else in the
// roster crawls along the row axis; every other type is a vertical stack or
// a floater, so the outline (a low wide beam, not a column) is new.
//
// The beam is built along local +Z and the rig yaws -90°, mapping local +Z
// to world -X (along the row) and local +X to world +Z (camera side). The
// head therefore sits at one end of the row, facing the player.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { buildVoxelGeometry } from '../voxel.js';

// Ramp: deep void -> violet -> hot magenta. Mid tones sit well above the
// background so the beam reads at formation distance.
const GRAVWORM_DEEP   = 0x2a0a45;
const GRAVWORM_DARK   = 0x4a1580;
const GRAVWORM_MID    = 0x8a35cc;
const GRAVWORM_BRIGHT = 0xc46cff;
const GRAVWORM_HOT    = 0xff8cff;

const GW_SEGMENTS = 6;
const GW_STEP = 0.24;          // joint spacing along the beam

// Boxes for ONE segment i (0..5) in segment-local space: the box occupies
// z 0..0.26 (overlapping the joint by a hair so the beam reads continuous),
// origin at the joint that precedes it. Gentle taper toward the tail.
function gravwormSegmentBoxes(i) {
    const w = 0.44 - i * 0.020;
    const h = 0.30 - i * 0.014;
    return [
        { size: [w, h * 0.50, 0.26], pos: [0, -h * 0.28, 0.13], color: GRAVWORM_DEEP },       // belly
        { size: [w, h * 0.55, 0.24], pos: [0, h * 0.14, 0.13], color: GRAVWORM_MID },          // flank
        { size: [w * 0.55, h * 0.35, 0.24], pos: [0, h * 0.50, 0.13], color: GRAVWORM_BRIGHT } // dorsum
    ];
}

// Head cap for segment 0. Under the rig's -90° yaw, local +X maps to world
// +Z (the camera side): the face is built toward +X so it protrudes forward
// toward the player instead of along the row.
const GRAVWORM_HEAD = [
    { size: [0.16, 0.20, 0.34], pos: [0.30, 0.02, 0.13], color: GRAVWORM_DARK },  // skull
    { size: [0.12, 0.12, 0.22], pos: [0.45, -0.05, 0.13], color: GRAVWORM_MID },  // snout
    { size: [0.10, 0.07, 0.36], pos: [0.30, 0.15, 0.13], color: GRAVWORM_DEEP },  // brow ridge
    { size: [0.05, 0.07, 0.07], pos: [0.43, 0.06, 0.02], color: GRAVWORM_HOT },
    { size: [0.05, 0.07, 0.07], pos: [0.43, 0.06, 0.24], color: GRAVWORM_HOT }
];

// Tail fin for the last segment (thin plate along the beam).
const GRAVWORM_TAIL = [
    { size: [0.18, 0.22, 0.06], pos: [0, 0.10, 0.28], color: GRAVWORM_BRIGHT }
];

// Dorsal spike (middle segments only) — small and hot, reads as an accent.
const GRAVWORM_SPIKE = [
    { size: [0.10, 0.13, 0.10], pos: [0, 0.24, 0.13], color: GRAVWORM_HOT },
    { size: [0.05, 0.08, 0.05], pos: [0, 0.34, 0.13], color: GRAVWORM_HOT }
];

// Stubby planted foot (end segments only).
const GRAVWORM_FOOT = [
    { size: [0.12, 0.16, 0.13], pos: [0, -0.22, 0.13], color: GRAVWORM_DARK },
    { size: [0.17, 0.06, 0.17], pos: [0, -0.32, 0.13], color: GRAVWORM_DEEP }
];

let gravwormParts = null;

export function getGravwormParts() {
    if (gravwormParts) return gravwormParts;
    gravwormParts = {
        segGeometries: Array.from({ length: GW_SEGMENTS }, (_, i) =>
            buildVoxelGeometry(gravwormSegmentBoxes(i))),
        headGeometry: buildVoxelGeometry(GRAVWORM_HEAD),
        tailGeometry: buildVoxelGeometry(GRAVWORM_TAIL),
        spikeGeometry: buildVoxelGeometry(GRAVWORM_SPIKE),
        footGeometry: buildVoxelGeometry(GRAVWORM_FOOT),
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: GRAVWORM_DARK,
            emissiveIntensity: 0.35,
            shininess: 30,
            flatShading: true
        }),
        spikeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: GRAVWORM_HOT,
            emissiveIntensity: 1.2,
            flatShading: true
        }),
        footMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: GRAVWORM_DEEP,
            emissiveIntensity: 0.25,
            flatShading: true
        })
    };
    return gravwormParts;
}

// Chain spans local z -0.60..+0.60 around the rig origin: half-width 0.60
// along the row, well inside the 0.95 budget even at full arch projection.
const GW_ORIGIN = -((GW_SEGMENTS - 1) * GW_STEP) / 2 - 0.13;

export function createGravwormAlien(group) {
    const parts = getGravwormParts();

    // Display pivot: all visual motion lives here; formation owns x/z.
    const pivot = new THREE.Group();
    group.add(pivot);

    // Beam rig. Set up once; never rotated at runtime — the gait rotates
    // the SEGMENTS.
    const rig = new THREE.Group();
    rig.rotation.y = -Math.PI / 2;
    pivot.add(rig);

    const segments = [];
    let node = rig;
    for (let i = 0; i < GW_SEGMENTS; i++) {
        const seg = new THREE.Group();
        seg.position.z = i === 0 ? GW_ORIGIN : GW_STEP;
        node.add(seg);

        const body = new THREE.Mesh(parts.segGeometries[i], parts.shellMaterial);
        seg.add(body);

        if (i >= 1 && i <= GW_SEGMENTS - 2) {
            const spike = new THREE.Mesh(parts.spikeGeometry, parts.spikeMaterial.clone());
            seg.add(spike);
            seg.userData.spike = spike;
        }
        if (i === 0) {
            const head = new THREE.Mesh(parts.headGeometry, parts.shellMaterial);
            seg.add(head);
            seg.userData.head = head;
        }
        if (i === GW_SEGMENTS - 1) {
            const tail = new THREE.Mesh(parts.tailGeometry, parts.shellMaterial);
            seg.add(tail);
        }
        if (i === 0 || i === GW_SEGMENTS - 1) {
            const foot = new THREE.Mesh(parts.footGeometry, parts.footMaterial);
            seg.add(foot);
            seg.userData.foot = foot;
        }

        seg.userData.i = i;
        segments.push(seg);
        node = seg;
    }

    Object.assign(group.userData, {
        type: 'gravworm',
        pivot,
        rig,
        segments
    });
}

// ---------------------------------------------------------------------------
// Animation (case 13). Signature event: an inchworm ARCH — a hump travels
// tail→head twice per period, feet planted; plus a windup coil before firing.
// Never touches alien.position.x/z; y write guarded by isSwooping.
// ---------------------------------------------------------------------------

export function animateGravworm(alien, time) {
    const self = alien.userData;
    if (!self.segments) return;

    const period = 8.0;
    // `time` already carries this alien's random animationOffset.
    const p = (time % period) / period;

    // Fire telegraph: coil tight 0.30→0.42, release flash 0.42→0.46.
    const windup = p >= 0.28 && p < 0.42
        ? Math.sin(((p - 0.28) / 0.14) * Math.PI / 2)
        : p >= 0.42 && p < 0.46 ? 1.0
        : p >= 0.46 && p < 0.56
            ? Math.sin(((0.56 - p) / 0.10) * Math.PI / 2)
            : 0;
    const flashTrigger = p >= 0.42 && p < 0.45
        ? Math.sin(((p - 0.42) / 0.03) * Math.PI)
        : 0;

    // Idle breathing keeps the beam alive between gaits.
    const breathe = Math.sin(time * 1.4) * 0.015;

    self.segments.forEach((seg, i) => {
        if (i === 0 || i === GW_SEGMENTS - 1) {
            // Planted feet: only a whisper of flex.
            seg.rotation.x = breathe * 0.3;
        } else {
            // Hump travelling tail→head: two cycles per period, phase-lagged
            // by segment index so the arch visibly moves along the row.
            const gaitPhase = time * (Math.PI * 2 / (period / 2)) + i * 0.9;
            const arch = Math.max(0, Math.sin(gaitPhase));           // 0..1, hump only
            const lifted = arch * arch;                               // sharper snap
            seg.rotation.x = lifted * 0.42 + breathe
                - windup * (i % 2 === 0 ? 0.30 : -0.30);              // coil zigzag
        }

        if (seg.userData.spike) {
            const pulse = Math.sin(time * 2.6 + i * 1.1) * 0.5 + 0.5;
            seg.userData.spike.material.emissiveIntensity =
                0.7 + pulse * 0.8 + windup * 2.2 + flashTrigger * 3.0;
        }
    });

    // Whole-beam lift while a hump is mid-travel (feet stay planted — only
    // the body arcs; pivot y never leaves 0 on average).
    const gaitLift = Math.sin(time * (Math.PI * 2 / (period / 2))) * 0.02;
    self.pivot.position.y = gaitLift + breathe - windup * 0.05;

    if (self.rig) {
        // Coil compression: the row-span shortens slightly during windup by
        // scaling the pivot along the beam's world axis (X). Scale of a
        // CHILD is allowed; group.scale is never touched.
        self.pivot.scale.x = 1.0 - windup * 0.12;
    }
}
