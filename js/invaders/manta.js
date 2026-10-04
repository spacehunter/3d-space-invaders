import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// TYPE 18 — MANTA (redesigned): wide manta ray with broad diamond wings,
// cephalic lobes, forward mouth, dorsal/ventral contrast.
//
// KEY DESIGN CHANGES:
// - Body is much larger and wider so the silhouette reads clearly.
// - Wings are built per-segment with pivot chains — NO double-offsetting.
//   Each segment pivot has position() + mesh. Mesh geometry is small,
//   positioned at the pivot origin.
// - Colors: dark dorsal (0x1a2a50) on top, bright pale ventral (0xc8d8ee)
//   underneath so the belly is clearly visible against black.
// - Cephalic horns are prominent paired cones at the head front.
// - Mouth is a dark wide plate below the head.
// - Eyes are lateral gold dots on the head sides.
// ---------------------------------------------------------------------------

// Color ramp: dark dorsal top, pale ventral bottom, coral accents.
const MANTA_DORSAL   = 0x1a2a50;   // dark blue dorsal (top side)
const MANTA_DARK     = 0x081020;   // near-black deep edges
const MANTA_VENTRAL  = 0xc8d8ee;   // pale bright belly (high contrast vs black)
const MANTA_WING_MID = 0x3a5a8a;   // wing midtone
const MANTA_WING_TIP = 0x80a0cc;   // bright wing tip
const MANTA_HOT      = 0xff6040;   // coral accent
const MANTA_GOLD     = 0xffd060;   // gold eyes
const MANTA_MOUTH_C  = 0x2a1020;   // dark mouth interior

// ============================================================
// BODY — wide cross-section. Dark dorsal top, pale ventral bottom.
// ============================================================
const MANTA_BODY = [
    // Nose / head — forward point, dark
    { size: [0.20, 0.10, 0.16], pos: [0, 0.02, 0.30], color: MANTA_DARK },
    // Upper head dome — dark dorsal
    { size: [0.36, 0.14, 0.22], pos: [0, 0.04, 0.18], color: MANTA_DORSAL },
    // Ventral belly under head — pale
    { size: [0.32, 0.06, 0.20], pos: [0, -0.08, 0.16], color: MANTA_VENTRAL },
    // Mid-body — main dorsal plate, wide and dark
    { size: [0.50, 0.12, 0.28], pos: [0, 0.02, 0.00], color: MANTA_DORSAL },
    // Mid-body ventral — pale belly plate
    { size: [0.48, 0.06, 0.26], pos: [0, -0.08, -0.01], color: MANTA_VENTRAL },
    // Rear body taper
    { size: [0.32, 0.10, 0.22], pos: [0, 0.00, -0.18], color: MANTA_DARK },
    { size: [0.22, 0.08, 0.18], pos: [0, -0.01, -0.30], color: MANTA_DARK },
    // Central ventral stripe — pale, helps silhouette
    { size: [0.12, 0.02, 0.55], pos: [0, -0.10, -0.06], color: MANTA_VENTRAL },
];

// ============================================================
// CEPHALIC LOBES — paired horn-like rolls at the nose.
// ============================================================
const MANTA_HORN = [
    { size: [0.06, 0.04, 0.16], pos: [0, 0, 0], color: MANTA_DARK },
    { size: [0.04, 0.03, 0.10], pos: [0, 0, 0], color: MANTA_HOT },
];

// ============================================================
// MOUTH — wide dark opening below the head.
// ============================================================
const MANTA_MOUTH = [
    { size: [0.24, 0.05, 0.14], pos: [0, -0.12, 0.22], color: MANTA_MOUTH_C },
];

// ============================================================
// EYES — small gold lateral dots on the head.
// ============================================================
const MANTA_EYE = [
    { size: [0.06, 0.06, 0.04], pos: [0, 0, 0], color: MANTA_GOLD },
];

// ============================================================
// WING SEGMENTS — per-segment geometries built as single-box
// geometries. Each segment is a box positioned at (0,0,0) so
// that placing the mesh inside a pivot group positions it
// at that pivot's world position without double-offsetting.
// ============================================================
// Right wing box list: each box centered at origin.
// Segment placement is handled by the pivot chain — meshes are at (0,0,0)
// inside their pivot, and pivots define the spacing. Adjacent extents overlap
// so the wing reads as one continuous shape from body to tip.
const MANTA_WING_BOXES = [
    // Segment 0 (root) — thickest, attached to body. x=0.36 so half-extent=0.18 overlaps
    // 0.15 delta to next segment.
    { size: [0.36, 0.05, 0.18], pos: [0, 0, 0], color: MANTA_DORSAL },
    // Segment 1
    { size: [0.36, 0.04, 0.20], pos: [0, 0, 0], color: MANTA_WING_MID },
    // Segment 2
    { size: [0.34, 0.04, 0.22], pos: [0, 0, 0], color: MANTA_WING_TIP },
    // Segment 3 (tip) — thinnest
    { size: [0.32, 0.03, 0.18], pos: [0, 0, 0], color: MANTA_WING_TIP },
];

// Wing tip glow accent — subtle point-light feel, centered at origin.
const MANTA_WING_TIP_ACCENT = [
    { size: [0.08, 0.03, 0.08], pos: [0, 0, 0], color: MANTA_HOT },
];

// ============================================================
// TAIL
// ============================================================
const MANTA_TAIL_SEGMENTS = [
    { length: 0.14, width: 0.05, baseBend: 0 },
    { length: 0.12, width: 0.04, baseBend: 0 },
    { length: 0.10, width: 0.03, baseBend: 0 }
];

// ============================================================
// PARTS CACHE
// ============================================================
let mantaParts = null;

function getMantaParts() {
    if (mantaParts) return mantaParts;

    const bodyGeom = buildVoxelGeometry(MANTA_BODY);
    const hornRight = buildVoxelGeometry(MANTA_HORN);
    const hornLeft = buildVoxelGeometry(mirrorBoxes(MANTA_HORN));
    const mouthGeom = buildVoxelGeometry(MANTA_MOUTH);
    const eyeRight = buildVoxelGeometry(MANTA_EYE);
    const eyeLeft = buildVoxelGeometry(mirrorBoxes(MANTA_EYE));

    // Wing segment geometries: ONE geometry per segment per side.
    // Right side: direct. Left side: mirrored.
    const wingSegGeosRight = MANTA_WING_BOXES.map(box =>
        buildVoxelGeometry([box])
    );
    const wingSegGeosLeft = MANTA_WING_BOXES.map(box =>
        buildVoxelGeometry([mirrorBoxes([box])[0]])
    );

    const wingTipRight = buildVoxelGeometry(MANTA_WING_TIP_ACCENT);
    const wingTipLeft = buildVoxelGeometry(mirrorBoxes(MANTA_WING_TIP_ACCENT));

    const tailSegGeometries = MANTA_TAIL_SEGMENTS.map(seg =>
        buildLimbSegmentGeometry(seg, MANTA_DARK, MANTA_DORSAL)
    );

    mantaParts = {
        bodyGeometry: bodyGeom,
        mouthGeometry: mouthGeom,
        hornGeometries: { '-1': hornLeft, '1': hornRight },
        wingTipGeometries: { '-1': wingTipLeft, '1': wingTipRight },
        eyeGeometries: { '-1': eyeLeft, '1': eyeRight },
        wingSegGeometries: {
            '-1': wingSegGeosLeft,
            '1': wingSegGeosRight
        },

        // Materials
        dorsalMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: MANTA_DARK,
            emissiveIntensity: 0.15, shininess: 45, flatShading: true
        }),
        ventralMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: MANTA_VENTRAL,
            emissiveIntensity: 0.35, shininess: 30, flatShading: true
        }),
        wingMidMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: MANTA_WING_MID,
            emissiveIntensity: 0.5, shininess: 50, flatShading: true
        }),
        accentMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: MANTA_HOT,
            emissiveIntensity: 0.3, flatShading: true
        }),
        // Horns — coral accent, brighter than body
        hornMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: MANTA_HOT,
            emissiveIntensity: 1.2, flatShading: true
        }),
        goldMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: MANTA_GOLD,
            emissiveIntensity: 2.0, flatShading: true
        }),
        mouthMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: MANTA_MOUTH_C,
            emissiveIntensity: 0.6, flatShading: true
        }),
        tailGeometries: tailSegGeometries
    };

    return mantaParts;
}

// ============================================================
// MODEL CONSTRUCTION
// ============================================================
function createMantaAlien(group) {
    const parts = getMantaParts();

    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    // --- Body ---
    const body = new THREE.Mesh(parts.bodyGeometry, parts.dorsalMaterial);
    body.castShadow = true;
    bodyPivot.add(body);
    group.userData.body = body;

    // --- Mouth ---
    const mouth = new THREE.Mesh(parts.mouthGeometry, parts.mouthMaterial);
    mouth.castShadow = true;
    bodyPivot.add(mouth);
    group.userData.mouth = mouth;

    // --- Cephalic horns: paired, mounted with pivot offset only ---
    // Geometry is centered at origin; pivot position handles placement on head.
    group.userData.horns = [-1, 1].map(side => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.10, -0.02, 0.26);
        bodyPivot.add(pivot);

        const horn = new THREE.Mesh(parts.hornGeometries[side], parts.hornMaterial);
        horn.castShadow = true;
        // Apply horn's original roll tilt
        horn.rotation.x = 0.35;
        pivot.add(horn);

        return { pivot, side, horn };
    });

    // --- Eyes: centered geometry, mesh position handles placement ---
    group.userData.eyes = [-1, 1].map(side => {
        const eye = new THREE.Mesh(parts.eyeGeometries[side], parts.goldMaterial.clone());
        eye.position.set(side * 0.28, 0.06, 0.20);
        bodyPivot.add(eye);
        return eye;
    });

    // --- Wings: per-segment pivot chains with RELATIVE deltas ---
    // Each segment pivot is a child of the previous one. Segment positions
    // are SMALL RELATIVE DELTAS (not absolute), so child extents overlap and
    // the wing reads as one continuous shape from body edge to tip.
    // x: ~0.15-0.16 per step, z: small trailing sweep.
    group.userData.wings = [-1, 1].map(side => {
        const wingGroup = new THREE.Group();
        // Mount at body edge
        wingGroup.position.set(side * 0.18, -0.04, 0.02);
        bodyPivot.add(wingGroup);

        const segments = [];
        // RELATIVE deltas: each pivot offset from its parent.
        // Small x deltas (0.15-0.16) per step extend outward from
        // the wing origin. Multiplied by side so right wing (+x) and
        // left wing (-x) both extend away from body.
        const segDeltas = [
            { x: side * 0.00, z: 0.08 },   // root — right at wing attachment
            { x: side * 0.15, z: -0.04 },  // segment 1
            { x: side * 0.16, z: -0.02 },  // segment 2
            { x: side * 0.15, z: -0.04 },  // segment 3 (tip)
        ];

        // Build pivot chain: each pivot is a child of the previous
        let parent = wingGroup;
        segDeltas.forEach((d, i) => {
            const pivot = new THREE.Group();
            // Position relative to parent — small deltas for overlap
            pivot.position.set(d.x, -0.02, d.z);
            parent.add(pivot);

            const geom = parts.wingSegGeometries[side][i];
            // Alternate materials for visual contrast
            let mat;
            if (i === 0) mat = parts.dorsalMaterial;
            else if (i === 3) mat = parts.ventralMaterial;
            else if (i % 2 === 0) mat = parts.dorsalMaterial;
            else mat = parts.wingMidMaterial;

            const mesh = new THREE.Mesh(geom, mat);
            // Geometry is centered at (0,0,0); pivot handles placement.
            mesh.castShadow = true;
            pivot.add(mesh);

            segments.push({ pivot, mesh, index: i });
            parent = pivot;
        });

        return { segments, side, wingGroup };
    });

    // --- Wing tip accents ---
    group.userData.wingTips = group.userData.wings.map(wing => {
        const tip = new THREE.Mesh(
            parts.wingTipGeometries[wing.side],
            parts.accentMaterial
        );
        // Positioned at the last segment's pivot (the tip)
        const lastSeg = wing.segments[wing.segments.length - 1];
        lastSeg.pivot.add(tip);
        return tip;
    });

    // --- Tail ---
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -0.03, -0.36);
    bodyPivot.add(tailGroup);
    group.userData.tailGroup = tailGroup;

    const tailSegments = buildLimbChain(
        tailGroup,
        parts.tailGeometries,
        MANTA_TAIL_SEGMENTS,
        parts.dorsalMaterial,
        -1
    );
    group.userData.tailSegments = tailSegments;
}

// Animation is in aliens.js case 18.
export { getMantaParts };
export { createMantaAlien };