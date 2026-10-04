import * as THREE from 'three';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from '../voxel.js';

// ---------------------------------------------------------------------------
// Spire (row 11) - tall crystalline tower with accent crystals
// ---------------------------------------------------------------------------

// Tall vertical silhouette: stacked diamond tiers tapering to a sharp apex,
// with small gold crystals jutting from the mid-section on all four sides.
const SPIRE_DARK  = 0x2e1550;    // lighter dark base — reads against space
const SPIRE_MID   = 0x8a3ccf;    // purple body
const SPIRE_BRIGHT= 0xca60ff;    // bright purple (lifted from deep)
const SPIRE_HOT   = 0xda70d6;    // magenta (unchanged)
const SPIRE_GOLD  = 0xffd700;    // gold accent crystals
const SPIRE_WARM  = 0xffdf70;    // warm gold tip

// Main crystal body — stacked diamond tiers, widest at the base, tapering up.
// Sharper size steps for crystal-silhouette contrast; gold apex dominates top.
const SPIRE_BODY = [
    // Base tier — wide diamond footprint, dark base
    { size: [1.00, 0.34, 1.00], pos: [0, 0.50, 0.00], color: SPIRE_DARK },
    // Lower body — significant step up from base
    { size: [0.76, 0.30, 0.76], pos: [0, 0.84, 0.00], color: SPIRE_DARK },
    // Mid body — widest for crystal cluster attachment zone
    { size: [0.56, 0.28, 0.56], pos: [0, 1.16, 0.00], color: SPIRE_MID },
    // Upper body
    { size: [0.34, 0.26, 0.34], pos: [0, 1.46, 0.00], color: SPIRE_MID },
    // Upper taper — transition to gold
    { size: [0.20, 0.24, 0.20], pos: [0, 1.72, 0.00], color: SPIRE_GOLD },
    // Apex crystal — substantial gold tower
    { size: [0.10, 0.22, 0.10], pos: [0, 1.96, 0.00], color: SPIRE_GOLD },
    // Gold cap tip
    { size: [0.04, 0.22, 0.04], pos: [0, 2.18, 0.00], color: SPIRE_WARM }
];

// Accent crystal cluster — small gold crystals jutting outward from the mid
// section at the four cardinal points. Each cluster is a single box so it
// renders as a tight diamond shape.
const SPIRE_CLUSTER = [
    // Front cluster
    { size: [0.14, 0.14, 0.10], pos: [0, 1.15, 0.45], color: SPIRE_GOLD },
    { size: [0.10, 0.10, 0.08], pos: [0, 1.24, 0.42], color: SPIRE_WARM }
];

// Lazily built once, shared by every instance.
let spireParts = null;

function getSpireParts() {
    if (spireParts) return spireParts;

    spireParts = {
        bodyGeometry: buildVoxelGeometry(SPIRE_BODY),
        crystalGeometry: buildVoxelGeometry(SPIRE_CLUSTER),
        bodyMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: SPIRE_DARK,
            emissiveIntensity: 0.38,     // lifted: lighter base needs more glow to read vs space
            shininess: 70,
            flatShading: true
        }),
        crystalMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,
            emissive: SPIRE_GOLD,
            emissiveIntensity: 0.9,      // reduced: gold color ramp must survive bloom
            flatShading: true
        })
    };

    return spireParts;
}

function createSpireAlien(group) {
    const parts = getSpireParts();

    // bodyPivot carries all display motion so the formation keeps ownership
    // of group.position.x / .z.
    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    const body = new THREE.Mesh(parts.bodyGeometry, parts.bodyMaterial);
    body.castShadow = true;
    bodyPivot.add(body);
    group.userData.body = body;

    // Gold crystals at the four cardinal points.
    const crystals = [];
    [-1, 1].forEach(side => {
        // Front
        const fCrystal = new THREE.Mesh(parts.crystalGeometry, parts.crystalMaterial.clone());
        fCrystal.position.set(0, 0, side * 0.38);
        bodyPivot.add(fCrystal);
        crystals.push({ mesh: fCrystal, side: side, axis: 'z' });

        // Back
        const bCrystal = new THREE.Mesh(parts.crystalGeometry, parts.crystalMaterial.clone());
        bCrystal.position.set(0, 0, -side * 0.38);
        bCrystal.rotation.y = Math.PI;
        bodyPivot.add(bCrystal);
        crystals.push({ mesh: bCrystal, side: -side, axis: 'z' });
    });
    // Left and right crystals (offset in X)
    const leftCrystal = new THREE.Mesh(parts.crystalGeometry, parts.crystalMaterial.clone());
    leftCrystal.position.set(-0.38, 0, 0);
    leftCrystal.rotation.y = -Math.PI / 2;
    bodyPivot.add(leftCrystal);
    crystals.push({ mesh: leftCrystal, side: -1, axis: 'x' });

    const rightCrystal = new THREE.Mesh(parts.crystalGeometry, parts.crystalMaterial.clone());
    rightCrystal.position.set(0.38, 0, 0);
    rightCrystal.rotation.y = Math.PI / 2;
    bodyPivot.add(rightCrystal);
    crystals.push({ mesh: rightCrystal, side: 1, axis: 'x' });

    group.userData.crystals = crystals;
}


function animateSpire(alien, time) {
    switch (alien.userData.row) {
        case 11: { // Spire - tall crystal tower that pulses and extends
            const self = alien.userData;
            const t = time;
            const period = 6.0;
            const p = (t % period) / period;

            // --- Signature animation: squash → release → extend → fire → retract ---
            // Spike ramp: 0.30→0.45 (rise), 0.45→0.50 (plateau), 0.50→0.70 (retract)
            const spike = p >= 0.30 && p < 0.45
                ? Math.sin(((p - 0.30) / 0.15) * Math.PI / 2)
                : p >= 0.45 && p < 0.50
                    ? 1.0
                    : p >= 0.50 && p < 0.70
                        ? Math.sin(((0.70 - p) / 0.20) * Math.PI / 2)
                        : 0;

            // Squash (wind-up telegraph): tower compresses at ~0.27, giving a clear
            // visual cue that a shot is imminent.  Scales: 1.0 → 0.85 tall, ~1.08 wide.
            // Triangle: 0 (pre-squash) → 1 (0.275, peak) → 0 (0.30, release).
            let squash = 0;
            if (p >= 0.25 && p < 0.275) {
                squash = ((p - 0.25) / 0.025);
            } else if (p >= 0.275 && p < 0.30) {
                squash = 1.0 - ((p - 0.275) / 0.025);
            }

            // Crystal unfurl: crystals push outward during squash AND peak.
            // During squash the crystals flare out (expanding silhouette).
            const unfurl = (p >= 0.25 && p < 0.275) ? (p - 0.25) / 0.025
                : (p >= 0.275 && p < 0.35) ? 1.0
                : (p >= 0.35 && p < 0.50) ? Math.sin(((p - 0.35) / 0.15) * Math.PI)
                : 0;

            // Burst flash — fires on the *release* from squash (0.26-0.33), not at
            // peak extension.  The bright flash tells the player "it just wound up."
            const burstHalfWidth = 0.03 / 2;
            const burstCenter = 0.275;
            const burstPulse = (p >= burstCenter - burstHalfWidth && p < burstCenter + burstHalfWidth)
                ? Math.sin(((p - (burstCenter - burstHalfWidth)) / (burstHalfWidth * 2)) * Math.PI)
                : 0;

            // Idle micro-sway (subtle, bounded, no accumulation)
            const sway = Math.sin(t * 0.9) * 0.02;

            if (self.bodyPivot) {
                // Base scale: squash compresses from 1.0 → 0.85 tall (~1.08 wide).
                // Spike then extends back + beyond; unfurl widens slightly.
                const squashScale = 1.0 - squash * 0.15;
                const extScale = spike * 0.12 + unfurl * 0.04;
                self.bodyPivot.scale.set(
                    squashScale * (1.0 + extScale * 0.3),
                    squashScale + extScale,
                    squashScale * (1.0 + extScale * 0.3)
                );
                self.bodyPivot.rotation.y = sway;
            }

            if (self.crystals) {
                self.crystals.forEach(crystal => {
                    // Emissive burst: base 1.4 → peak ~14.0 for ~60 ms (release flash).
                    crystal.mesh.material.emissiveIntensity = 1.4 + burstPulse * 12.6;
                    // Crystal unfurl: extend outward from body during squash and peak.
                    const crystalScale = 1.0 + unfurl * 0.45;
                    crystal.mesh.scale.setScalar(crystalScale);
                });
            }

            // Guarded: updateSwoop() owns Y during a kamikaze dive.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.05 + Math.sin(t * 0.8) * 0.03 - squash * 0.04;
            }
            break;
        }
    }
}

export { getSpireParts };
export { createSpireAlien };
