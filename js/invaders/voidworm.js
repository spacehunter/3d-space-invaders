import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Voidworm (row 13) - a sinuous chain of 7 linked crystalline spheres
// ---------------------------------------------------------------------------

// A floating worm/serpent of segmented spheres with an undulating wave.
// Silhouette: completely unlike any row — a sinuous chain, not a solid body.
const VOIDWORM_DEEP   = 0x3a0070;
const VOIDWORM_DARK   = 0x6a22aa;
const VOIDWORM_MID    = 0xaa55ee;
const VOIDWORM_BRIGHT = 0xdd99ff;
const VOIDWORM_HOT    = 0xffccff;

// Crown teeth — 4 small spikes at the front of the head.
const VOIDWORM_TEETH = [
    { size: [0.04, 0.08, 0.04], pos: [-0.08, 0.06, 0.16], color: VOIDWORM_HOT },
    { size: [0.04, 0.08, 0.04], pos: [0.08, 0.06, 0.16], color: VOIDWORM_HOT },
    { size: [0.04, 0.08, 0.04], pos: [-0.08, 0.06, -0.12], color: VOIDWORM_HOT },
    { size: [0.04, 0.08, 0.04], pos: [0.08, 0.06, -0.12], color: VOIDWORM_HOT }
];

// Eyes — small bright spots on the head.
const VOIDWORM_EYES = [
    { size: [0.05, 0.05, 0.04], pos: [-0.07, 0.04, 0.045], color: 0xffffff },
    { size: [0.05, 0.05, 0.04], pos: [0.07, 0.04, 0.045], color: 0xffffff }
];

// Arm voxels — two crystal prisms that hang from the mid-body and swing.
// Each arm has an upper prism and a forearm prism, joined at a "joint."
// Slimmed prisms: at 0.14 wide they read as slabs beside the 0.26-diameter
// body segment; narrower boxes read as limbs hanging against the chain.
const VOIDWORM_UPPER_ARM = [
    { size: [0.10, 0.22, 0.10], pos: [0, -0.11, 0], color: VOIDWORM_MID },
    { size: [0.12, 0.05, 0.12], pos: [0, -0.23, 0], color: VOIDWORM_DARK }  // joint bead
];
const VOIDWORM_FORE_ARM = [
    { size: [0.08, 0.20, 0.08], pos: [0, -0.10, 0], color: VOIDWORM_MID },
    { size: [0.06, 0.04, 0.06], pos: [0, -0.21, 0], color: VOIDWORM_BRIGHT }  // glowing tip
];

// Per-segment radii (sphere-like segments, tapering head/tail)
const VOIDWORM_RADII = [0.16, 0.13, 0.12, 0.14, 0.11, 0.09, 0.07];
const VOIDWORM_Y     = [0, -0.28, -0.56, -0.82, -1.08, -1.30, -1.52];

let voidwormParts = null;

function getVoidwormParts() {
    if (voidwormParts) return voidwormParts;

    // 7 segment geometries — elongated octahedrons for crystal-prism look.
    // 8 sharp faces: reads as faceted crystal, not soft blob.
    const segmentGeometries = VOIDWORM_RADII.map((r, i) => {
        const geo = new THREE.OctahedronGeometry(r, 0); // 8 sharp triangular faces
        geo.scale(1, 1.15, 1); // slight elongation into diamonds
        return geo;
    });

    // Interconnectors — small voxel tapered crystals between segments
    const connectorGeometries = [];
    for (let i = 0; i < VOIDWORM_RADII.length - 1; i++) {
        const r1 = VOIDWORM_RADII[i], r2 = VOIDWORM_RADII[i + 1];
        const avgR = (r1 + r2) * 0.5;
        // Tapered crystal connector: wider at top, narrower at bottom
        connectorGeometries.push(
            buildVoxelGeometry([
                { size: [avgR * 1.6, 0.08, avgR * 1.6], pos: [0, 0, 0], color: VOIDWORM_DARK }
            ])
        );
    }

    // Core glow — small bright crystal sphere at center of each segment
    // Half-radius so it sits inside the outer shell
    const coreGeometries = VOIDWORM_RADII.map(r =>
        new THREE.IcosahedronGeometry(r * 0.35, 1)
    );

    // Dorsal spines — sharp crystal spikes running along the top of each segment.
    // Only on segments thick enough to support them (radii ≥ 0.12).
    const spineGeometry = buildVoxelGeometry([
        // Pointed crystal spine: wider at base, tapering to a point
        { size: [0.06, 0.14, 0.04], pos: [0, 0.07, 0], color: VOIDWORM_BRIGHT }
    ]);

    // Segment accent plates — flat diamond-shaped plates that wrap across each
    // segment's surface, catching light as the worm waves. Adds surface detail
    // without changing the chain silhouette.
    const plateGeometry = buildVoxelGeometry([
        { size: [0.28, 0.04, 0.22], pos: [0, 0, 0], rotX: 0, color: VOIDWORM_MID }
    ]);

    // Joint beads — small ring-like beads between segments that catch light as
    // the sine wave passes. Emphasizes the segmented, articulated nature.
    const beadGeometry = buildVoxelGeometry([
        { size: [0.12, 0.06, 0.12], pos: [0, 0, 0], color: VOIDWORM_DARK }
    ]);

    // Arms — two crystal-prism limbs hanging from the mid-body, swinging like
    // pendulums. Each arm has an upper prism + joint bead and a forearm + tip.
    const armUpperGeometry = buildVoxelGeometry(VOIDWORM_UPPER_ARM);
    const armForeGeometry = buildVoxelGeometry(VOIDWORM_FORE_ARM);

    // Barrel tips — glowing weapon tips at the end of each forearm that aim,
    // flash, and recoil. The barrel is a short cylinder with a bright emissive
    // tip that becomes the muzzle flash during firing.
    const barrelTipGeometry = buildVoxelGeometry([
        { size: [0.04, 0.10, 0.04], pos: [0, -0.05, 0], color: 0x444466 }  // barrel body
    ]);
    const muzzleFlareGeometry = buildVoxelGeometry([
        { size: [0.06, 0.06, 0.06], pos: [0, -0.10, 0], color: 0xffffff }  // flash sphere
    ]);

    voidwormParts = {
        segmentGeometries,
        connectorGeometries,
        coreGeometries,
        teethGeometry: buildVoxelGeometry(VOIDWORM_TEETH),
        eyeGeometry: buildVoxelGeometry(VOIDWORM_EYES),
        armUpperGeometry,
        armForeGeometry,
        barrelTipGeometry,
        muzzleFlareGeometry,
        spineGeometry,
        plateGeometry,
        beadGeometry,
        segmentMaterials: VOIDWORM_RADII.map((_, i) => {
            // Each segment gets a distinct hue so the chain reads as individual crystals,
            // not a uniform tube. Wide spectrum: magenta → purple → violet → blue-violet → deep indigo.
            // Bottom segments boosted to stay visible against the black starfield.
            const colors = [0xdd55ff, 0xbb33ee, 0x9922dd, 0x8833cc, 0x7722bb, 0x6611aa, 0x551199];
            const emissives = [0xdd55ff, 0xbb33ee, 0x9922dd, 0x7711cc, 0x6611bb, 0x5511aa, 0x4411aa];
            const intensities = [0.7, 0.7, 0.7, 0.7, 0.9, 0.9, 1.0];
            return new THREE.MeshPhongMaterial({
                color: colors[i],
                emissive: emissives[i],
                emissiveIntensity: intensities[i],
                // Brighter specular makes each facet catch light like cut crystal.
                // The high shininess + vivid specular creates sharp facet highlights
                // that sell the "crystalline spheres" description.
                specular: 0xffffff,
                shininess: 200,
                flatShading: true
            });
        }),
        connectorMaterial: new THREE.MeshPhongMaterial({
            color: VOIDWORM_DARK,
            emissive: VOIDWORM_DEEP,
            emissiveIntensity: 0.5,
            shininess: 60,
            flatShading: true
        }),
        coreMaterial: new THREE.MeshPhongMaterial({
            color: VOIDWORM_HOT,
            emissive: VOIDWORM_HOT,
            emissiveIntensity: 1.1,
            transparent: true,
            opacity: 0.7,
            flatShading: true
        }),
        spineMaterial: new THREE.MeshPhongMaterial({
            color: VOIDWORM_BRIGHT,
            emissive: VOIDWORM_DARK,
            emissiveIntensity: 1.2,
            shininess: 100,
            flatShading: true
        }),
        plateMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: VOIDWORM_MID,
            emissiveIntensity: 0.3,
            shininess: 80,
            flatShading: true
        }),
        beadMaterial: new THREE.MeshPhongMaterial({
            color: VOIDWORM_DARK,
            emissive: VOIDWORM_DEEP,
            emissiveIntensity: 0.4,
            shininess: 40,
            flatShading: true
        }),
        teethMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            // Violet, not near-white. VOIDWORM_HOT (0xffccff) clipped under
            // bloom and turned the whole crown into a featureless white blob,
            // so the teeth the bestiary promises were never visible.
            emissive: VOIDWORM_BRIGHT,
            emissiveIntensity: 1.0,
            flatShading: true
        }),
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: 0xffffff,
            emissiveIntensity: 1.1,
            flatShading: true
        }),
        armUpperMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: VOIDWORM_DARK,
            emissiveIntensity: 0.4,
            specular: 0xbb88ff,
            shininess: 100,
            flatShading: true
        }),
        armForeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: VOIDWORM_DARK,
            emissiveIntensity: 0.4,
            specular: 0xbb88ff,
            shininess: 100,
            flatShading: true
        }),
        // Barrel tips — dark metal body with glowing barrel mouth
        barrelTipMaterial: new THREE.MeshPhongMaterial({
            color: 0x444466,
            emissive: 0x5522aa,
            emissiveIntensity: 0.6,
            specular: 0x8888cc,
            shininess: 80,
            flatShading: true
        }),
        // Muzzle flash — bright white-yellow point light glow
        muzzleFlareMaterial: new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffddaa,
            emissiveIntensity: 0.0,  // driven by animation
            transparent: true,
            opacity: 0.0,
            flatShading: true
        })
    };

    return voidwormParts;
}

function createVoidwormAlien(group) {
    const parts = getVoidwormParts();

    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    // Crown teeth — bright crown on the head (attached to head segment, NOT bodyPivot)
    const teeth = new THREE.Mesh(parts.teethGeometry, parts.teethMaterial.clone());
    teeth.position.set(0, 0.10, 0);
    group.userData.teeth = teeth;

    // Eyes — paired bright spots on the head (attached to head segment, NOT bodyPivot)
    const eyes = new THREE.Mesh(parts.eyeGeometry, parts.eyeMaterial.clone());
    eyes.position.set(0, 0, 0);
    group.userData.eyes = eyes;

    // 7 crystalline segments, each parented to its own pivot for undulation
    const segments = [];
    const segmentPhases = [0, 0.35, 0.70, 1.05, 1.40, 1.75, 2.10];
    for (let i = 0; i < 7; i++) {
        const pivot = new THREE.Group();
        pivot.position.y = VOIDWORM_Y[i];
        bodyPivot.add(pivot);

        // Icosahedron segment mesh — faceted crystal sphere
        const segMesh = new THREE.Mesh(
            parts.segmentGeometries[i],
            parts.segmentMaterials[i].clone()
        );
        segMesh.castShadow = true;
        pivot.add(segMesh);

        // Core glow — tiny bright crystal at the center, visible through facets
        const coreMesh = new THREE.Mesh(
            parts.coreGeometries[i],
            parts.coreMaterial.clone()
        );
        pivot.add(coreMesh);

        // Crystal connector between this segment and the next
        if (i < 6) {
            const connMesh = new THREE.Mesh(
                parts.connectorGeometries[i],
                parts.connectorMaterial.clone()
            );
            // Position connector at bottom of segment
            connMesh.position.y = -VOIDWORM_RADII[i];
            pivot.add(connMesh);
        }

        // Accent plate — flat surface on the side, catches light during sway
        const plateMesh = new THREE.Mesh(
            parts.plateGeometry,
            parts.plateMaterial.clone()
        );
        plateMesh.position.set(VOIDWORM_RADII[i] * 0.7, 0, 0);
        plateMesh.rotation.y = Math.PI / 2;
        // Scale the footprint to the segment, keeping thickness. A fixed
        // 0.28 plate on the 0.07-radius tail segments was four times their
        // diameter and read as a flat fin hanging off the chain.
        const plateFit = VOIDWORM_RADII[i] / VOIDWORM_RADII[0];
        plateMesh.scale.set(plateFit, 1, plateFit);
        pivot.add(plateMesh);

        const seg = { pivot, phase: segmentPhases[i], mesh: segMesh, core: coreMesh, spine: null, plate: plateMesh, bead: null };

        // Dorsal spine — crystal spike on top of each segment (only on thick-enough segments)
        if (VOIDWORM_RADII[i] >= 0.12) {
            const spineMesh = new THREE.Mesh(
                parts.spineGeometry,
                parts.spineMaterial.clone()
            );
            spineMesh.position.set(0, VOIDWORM_RADII[i] + 0.05, 0);
            pivot.add(spineMesh);
            seg.spine = spineMesh;
        }

        // Joint bead — ring between this segment and the next
        if (i < 6) {
            const beadMesh = new THREE.Mesh(
                parts.beadGeometry,
                parts.beadMaterial.clone()
            );
            beadMesh.position.y = -VOIDWORM_RADII[i] * 0.85;
            pivot.add(beadMesh);
            seg.bead = beadMesh;
        }

        segments.push(seg);
    }
    group.userData.segments = segments;

    // The face rides the head. Segment 0 sways (pivot.position.x, +/-0.22) and
    // tilts (pivot.rotation.z) every frame, so teeth and eyes left on
    // bodyPivot visibly detached and floated over the body below.
    segments[0].pivot.add(teeth);
    segments[0].pivot.add(eyes);

    // Crystal arms — a matched pair mounted on the SAME segment. (Mounting one
    // on segment 1 and one on segment 2 put them 0.28 units apart in Y — the
    // "not a pair" bug from the status file.) Shoulder sits INSIDE the crystal
    // (x ≈ 0.55r, slightly above centre) so the limb roots into the segment
    // rather than floating beside its widest vertex.
    group.userData.arms = [-1, 1].map((side, idx) => {
        const segIdx = 1;
        const mount = new THREE.Group();
        mount.position.set(side * VOIDWORM_RADII[segIdx] * 0.55, 0.03, 0);
        segments[segIdx].pivot.add(mount);

        // Upper arm — vertical crystal prism. Geometry already spans y 0→−0.22,
        // so no extra offset: a mesh-level −0.11 here doubled the baked offset
        // and left dead air between the shoulder and the first prism.
        const upper = new THREE.Mesh(
            parts.armUpperGeometry,
            parts.armUpperMaterial.clone()
        );
        mount.add(upper);

        // Forearm — hangs from the joint bead at the upper arm's bottom tip
        const fore = new THREE.Mesh(
            parts.armForeGeometry,
            parts.armForeMaterial.clone()
        );
        fore.position.y = -0.22;
        mount.add(fore);

        // Barrel tip — dark metal cylinder at forearm end
        const barrel = new THREE.Mesh(
            parts.barrelTipGeometry,
            parts.barrelTipMaterial.clone()
        );
        barrel.position.y = -0.40;
        mount.add(barrel);

        // Muzzle flare — bright flash sphere at barrel tip
        const flare = new THREE.Mesh(
            parts.muzzleFlareGeometry,
            parts.muzzleFlareMaterial.clone()
        );
        flare.position.y = -0.46;
        mount.add(flare);

        return { mount, upper, fore, barrel, muzzleFlare: flare, side, idx };
    });
}


function animateVoidworm(alien, time) {
    switch (alien.userData.row) {
        case 13: { // Voidworm — sinuous undulating wave through 7 segments
            const self = alien.userData;
            const t = time;
            const period = 7.0;
            const p = (t % period) / period;

            // Crown teeth windup — open before firing, snap shut on burst.
            // Period-based firing telegraph: teeth flare out at 0.30→0.40,
            // snap shut at 0.40, burst flash at 0.40→0.46.
            const windup = p >= 0.28 && p < 0.42
                ? Math.sin(((p - 0.28) / 0.14) * Math.PI / 2)
                : p >= 0.42 && p < 0.48 ? 1.0
                : p >= 0.48 && p < 0.60
                    ? Math.sin(((0.60 - p) / 0.12) * Math.PI / 2)
                    : 0;

            // Flash trigger — brief momentary burst at the VERY start of the
            // attack window (first 0.04 of the period). This is a sharp,
            // one-frame flash, not a sustained glow.
            const flashTrigger = p >= 0.42 && p < 0.46
                ? Math.sin(((p - 0.42) / 0.04) * Math.PI)
                : 0;

            // Sinuous body wave — subtle S-curve sway through the chain.
            // Drastically simplified: only lateral position offset per segment,
            // no rotation.z twist (that made it wobble like a wind-up toy).
            if (self.segments) {
                self.segments.forEach((seg, i) => {
                    // Lateral position wave — each segment shifts slightly,
                    // phase offset creates a travelling wave down the chain.
                    // Amplitude kept low: 0.06-0.09, not the old 0.22+.
                    const waveAmp = 0.06 + (i / 6) * 0.04;
                    seg.pivot.position.x = Math.sin(t * 1.8 + seg.phase) * waveAmp;

                    // Core glow — travelling pulse along the chain.
                    // Each segment's core brightens and dims in sequence.
                    if (seg.core) {
                        const corePulse = Math.sin(t * 3.2 + seg.phase * 0.8);
                        seg.core.material.emissiveIntensity =
                            0.6 + (corePulse * 0.5 + 0.5) * 1.8;
                    }

                    // Per-segment mesh scale pulse — crystal shimmer
                    if (seg.mesh) {
                        const shimmer = Math.sin(t * 5.5 + seg.phase * 1.3);
                        seg.mesh.scale.setScalar(1.0 + shimmer * 0.04);
                    }

                    // Spine brightening — peaks during windup, faint pulse otherwise
                    if (seg.spine) {
                        const spinePulse = Math.sin(t * 3.2 + seg.phase);
                        seg.spine.material.emissiveIntensity =
                            0.6 + (spinePulse * 0.3 + 0.3) * 2.0 + windup * 1.5;
                        // Spine extends outward during windup
                        const spineExt = windup * 0.08;
                        seg.spine.position.y = VOIDWORM_RADII[i] + 0.05 + spineExt;
                    }

                    // Plate rotation — minimal, just a hint of surface detail
                    if (seg.plate) {
                        const plateSway = Math.sin(t * 2.8 + seg.phase) * 0.15;
                        seg.plate.rotation.y = Math.PI / 2 + plateSway;
                    }

                    // Joint bead — subtle scale pulse on the bead between segments
                    if (seg.bead) {
                        const beadPulse = Math.sin(t * 4.0 + seg.phase * 1.1);
                        seg.bead.scale.setScalar(1.0 + beadPulse * 0.15 + windup * 0.12);
                    }
                });
            }

            if (self.teeth) {
                // Teeth emissive — bright flash during windup
                self.teeth.material.emissiveIntensity =
                    0.6 + windup * 1.7;
                // Teeth open: scale outward during windup, snap shut on burst
                const teethScale = 1.0 + windup * 0.6;
                self.teeth.scale.setScalar(teethScale);
            }

            // Crystal arms — subtle tension hold. No pendulum swing.
            // The arms hang from the body like heavy, weapon-laden limbs.
            // A tiny micro-sway adds life without looking toy-like.
            // When windup starts, arms raise toward player. On burst, they kick back.
            if (self.arms) {
                self.arms.forEach(arm => {
                    const phase = arm.idx * Math.PI; // opposite phase for left/right
                    // Micro-swing only: tiny oscillation for life, not a pendulum.
                    // Max ±4° (0.07 rad) — barely perceptible idle twitch.
                    const swing = Math.sin(t * 1.2 + phase) * 0.07;
                    arm.mount.rotation.x = swing;
                    // Tiny Y drift
                    arm.mount.rotation.z = Math.sin(t * 0.9 + phase + 0.7) * 0.04;
                    // Forearm hangs from the upper arm's joint bead
                    arm.fore.position.y = -0.22;

                    // === Aiming ===
                    // During windup, arms raise and barrel tips point toward the player.
                    const aimAmount = windup * 1.2; // ~68° up toward camera
                    arm.mount.rotation.x -= aimAmount;
                    arm.mount.rotation.y = arm.side * windup * 0.5; // turn inward

                    // === Muzzle flash ===
                    // Flash only fires during the brief burst window,
                    // NOT during windup. During windup the barrel is just
                    // aiming (visible in idle frames — no flash).
                    const flashIntensity = flashTrigger * 5.0;
                    const flashScale = 1.0 + flashTrigger * 4.0;
                    arm.muzzleFlare.material.emissiveIntensity = flashIntensity;
                    arm.muzzleFlare.material.opacity = flashTrigger * 0.95;
                    arm.muzzleFlare.scale.setScalar(flashScale);

                    // === Recoil — dramatic arm kickback on burst ===
                    // The whole arm group kicks backward and the barrel extends
                    // far back on its axis so the recoil is clearly readable.
                    if (flashTrigger > 0.3) {
                        const recoil = flashTrigger;
                        // Barrel extends backward (long stroke)
                        arm.barrel.position.z = -recoil * 0.35;
                        // Muzzle flare follows
                        arm.muzzleFlare.position.z = -recoil * 0.35;
                        // Arm group kicks back too
                        arm.mount.position.z = -recoil * 0.08;
                    } else {
                        arm.barrel.position.z = 0;
                        arm.muzzleFlare.position.z = 0;
                        arm.mount.position.z = 0;
                    }
                });
            }

            // Body lurch — the whole worm leans back and compresses during the burst
            // to sell the weight of the recoil.
            if (flashTrigger > 0.3) {
                const lurch = flashTrigger;
                alien.position.y -= lurch * 0.06;
                alien.position.z = -lurch * 0.08;
            }
            break;
        }
    }
}

export { getVoidwormParts };
export { createVoidwormAlien };
