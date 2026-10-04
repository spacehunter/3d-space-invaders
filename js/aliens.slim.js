import * as THREE from 'three';
import { playSwoopWarning } from './audio.js';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_SPACING } from './constants.js';
import { buildVoxelGeometry, mirrorBoxes, saucerTier, buildLimbSegmentGeometry, buildLimbChain } from './voxel.js';

let aliens = [];
let alienDirection = 1;
let alienSpeed = 0.02;

// Dynamic level configuration
let levelConfig = {
    rows: ALIEN_ROWS,
    cols: ALIEN_COLS,
    baseSpeed: 0.02,
    fireInterval: 1500,
    swoopThreshold: 5
};

/**
 * Set alien configuration from level config
 * @param {Object} config - Level configuration object
 */
export function setAlienConfig(config) {
    levelConfig = {
        rows: config.alienRows || ALIEN_ROWS,
        cols: config.alienCols || ALIEN_COLS,
        baseSpeed: config.alienSpeed || 0.02,
        fireInterval: config.alienFireInterval || 1500,
        swoopThreshold: config.swoopThreshold || 5
    };
    alienSpeed = levelConfig.baseSpeed;
}

/**
 * Get current alien fire interval
 */
export function getAlienFireInterval() {
    return levelConfig.fireInterval;
}

// Create all aliens in formation
export function createAliens(scene, customRows = null, customCols = null) {
    const rows = customRows !== null ? customRows : levelConfig.rows;
    const cols = customCols !== null ? customCols : levelConfig.cols;

    // Center the formation based on column count
    const startX = -((cols - 1) * ALIEN_SPACING) / 2;
    const startZ = -15;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Cycle through 20 alien types based on row
            const alienType = row % 20;
            const alien = createAlien(alienType);
            alien.position.x = startX + col * ALIEN_SPACING;
            alien.position.z = startZ - row * ALIEN_SPACING;
            alien.position.y = 0;  // On same plane as player
            // Merge rather than replace: the model builders stash references to
            // their animated parts in userData, and animateAlien() needs them
            Object.assign(alien.userData, {
                row: alienType,  // Use alien type for scoring/behavior
                actualRow: row,  // Keep track of actual grid row
                col: col,
                animationOffset: Math.random() * Math.PI * 2,
                destroyed: false
            });
            aliens.push(alien);
            scene.add(alien);
        }
    }

    return aliens;
}

/**
 * Build one standalone alien for display (the bestiary gallery).
 *
 * Unlike createAliens(), this does not touch the shared `aliens` array or add
 * anything to a scene, so it can be called while a game is in progress without
 * corrupting the formation. The caller owns the returned Group.
 *
 * @param {number} type - alien type 0-19 (same numbering as the row types)
 * @returns {THREE.Group} an alien ready to be passed to animateAlien()
 */
export function createAlienPreview(type) {
    const alien = createAlien(type);

    // Merge rather than replace: the model builders stash references to their
    // animated parts in userData, and animateAlien() needs them
    Object.assign(alien.userData, {
        row: type,
        animationOffset: Math.random() * Math.PI * 2,
        destroyed: false
    });

    return alien;
}
import {
  getOctopusParts, createOctopusAlien,
  getCrabParts, createCrabAlien,
  getSquidParts, createSquidAlien,
  getUfoParts, createUFOAlien,
  getTankParts, createTankAlien,
  getBeetleParts, createBeetleAlien,
  getWaspParts, createWaspAlien,
  getInvaderParts, createInvaderAlien,
  getScorpionParts, createScorpionAlien,
  getSentinelParts, createSentinelAlien,
  getWardenParts, createWardenAlien,
  getSpireParts, createSpireAlien,
  getPrismParts, createPrismAlien,
  getVoidwormParts, createVoidwormAlien,
  getRavenParts, createRavenAlien,
  getNexusParts, createNexusAlien,
  getApexParts, createApexAlien,
  getBasiliskParts, createBasiliskAlien,
  getMantaParts, createMantaAlien,
} from './invaders/index.js';

function createAlien(row) {
    const group = new THREE.Group();

    const creators = [
        createOctopusAlien,
        createCrabAlien,
        createSquidAlien,
        createUFOAlien,
        createTankAlien,
        createBeetleAlien,
        createWaspAlien,
        createInvaderAlien,
        createScorpionAlien,
        createSentinelAlien,
        createWardenAlien,
        createSpireAlien,
        createPrismAlien,
        createVoidwormAlien,
        createRavenAlien,
        createNexusAlien,
        createApexAlien,
        createBasiliskAlien,
        createMantaAlien,
        createPeacockAlien,
    ];

    creators[row](group);

    return group;
}

export function updateAliens(gameOverCallback) {
    if (aliens.length === 0) return;

    // Dynamic speed calculation based on remaining aliens
    // As aliens are destroyed, they speed up significantly
    const totalAliens = levelConfig.rows * levelConfig.cols;
    const remainingRatio = Math.min(aliens.length / totalAliens, 1.0);  // Clamp to prevent NaN

    // Use level config base speed, scale up to 6x at the end
    const minSpeed = levelConfig.baseSpeed;
    const maxSpeed = levelConfig.baseSpeed * 6;

    // Non-linear speed curve (gets faster more quickly at the end)
    alienSpeed = minSpeed + (maxSpeed - minSpeed) * Math.pow(1 - remainingRatio, 1.5);

    let shouldMoveDown = false;

    // Check if any alien hit the edge
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;
        if (alien.userData.isSwooping || alien.userData.isTelegraphing) continue; // Ignore swooping aliens for edge check

        if ((alienDirection > 0 && alien.position.x > 13) ||
            (alienDirection < 0 && alien.position.x < -13)) {
            shouldMoveDown = true;
            break;
        }
    }

    if (shouldMoveDown) {
        alienDirection *= -1;
        for (let alien of aliens) {
            if (!alien.userData.destroyed && !alien.userData.isSwooping && !alien.userData.isTelegraphing) {
                alien.position.z += 1;

                // Check if aliens reached player
                if (alien.position.z > 8) {
                    gameOverCallback(false);
                }
            }
        }
        // Speed is now calculated per frame, so we don't need to multiply here
    }

    // Move aliens
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;

        // Handle Kamikaze Swoop
        if (alien.userData.isTelegraphing) {
            updateTelegraph(alien);
        } else if (alien.userData.isSwooping) {
            updateSwoop(alien);
        } else {
            // Normal formation movement
            alien.position.x += alienDirection * alienSpeed;
        }
    }

    // Check for new swoop triggers
    checkSwoopTrigger();
}

// Swoop state
let lastSwoopTime = 0;
const SWOOP_INTERVAL_MIN = 5000; // 5 seconds
const SWOOP_INTERVAL_MAX = 10000; // 10 seconds
let nextSwoopInterval = 5000;

function checkSwoopTrigger() {
    // Only swoop if few aliens remain (based on level config)
    if (aliens.length >= levelConfig.swoopThreshold) return;

    const now = Date.now();
    if (now - lastSwoopTime > nextSwoopInterval) {
        triggerSwoop();
        lastSwoopTime = now;
        nextSwoopInterval = SWOOP_INTERVAL_MIN + Math.random() * (SWOOP_INTERVAL_MAX - SWOOP_INTERVAL_MIN);
    }
}

function triggerSwoop() {
    // Find available aliens not already swooping
    const availableAliens = aliens.filter(a => !a.userData.destroyed && !a.userData.isSwooping);

    if (availableAliens.length === 0) return;

    // Pick a random alien
    const alien = availableAliens[Math.floor(Math.random() * availableAliens.length)];

    // Initialize telegraph state (Warning phase)
    alien.userData.isTelegraphing = true;
    alien.userData.telegraphStartTime = Date.now();
    alien.userData.originalScale = alien.scale.clone();

    // Play warning sound
    playSwoopWarning();
}

function updateTelegraph(alien) {
    const now = Date.now();
    const elapsed = (now - alien.userData.telegraphStartTime) / 1000;

    // Pulse effect (scale up and down rapidly)
    const pulse = 1 + Math.sin(elapsed * 20) * 0.3;
    alien.scale.set(
        alien.userData.originalScale.x * pulse,
        alien.userData.originalScale.y * pulse,
        alien.userData.originalScale.z * pulse
    );

    // Shake effect
    alien.position.x += (Math.random() - 0.5) * 0.2;

    // End telegraph after 1 second
    if (elapsed > 1.0) {
        alien.userData.isTelegraphing = false;
        alien.scale.copy(alien.userData.originalScale); // Reset scale
        startSwoop(alien);
    }
}

function startSwoop(alien) {
    // Initialize swoop state
    alien.userData.isSwooping = true;
    alien.userData.swoopStartTime = Date.now();
    alien.userData.swoopStartX = alien.position.x;
    alien.userData.swoopStartZ = alien.position.z;

    // Randomize swoop pattern
    alien.userData.swoopFreqX = 2 + Math.random() * 3; // Frequency of X wobble
    alien.userData.swoopAmpX = 3 + Math.random() * 4;  // Amplitude of X wobble

    // Increased speed: 0.25 to 0.40 (was 0.15 to 0.25)
    alien.userData.swoopSpeedZ = 0.25 + Math.random() * 0.15;
}

function updateSwoop(alien) {
    const time = (Date.now() - alien.userData.swoopStartTime) * 0.001;

    // Move forward rapidly
    alien.position.z += alien.userData.swoopSpeedZ;

    // Sine wave motion on X
    alien.position.x = alien.userData.swoopStartX + Math.sin(time * alien.userData.swoopFreqX) * alien.userData.swoopAmpX;

    // Dive motion on Y (dip down then up)
    alien.position.y = Math.sin(time * 3) * 2;

    // Banking rotation
    alien.rotation.z = Math.cos(time * alien.userData.swoopFreqX) * 0.5;

    // Check if passed player (Z > 15)
    if (alien.position.z > 15) {
        resetSwoop(alien);
    }
}

function resetSwoop(alien) {
    alien.userData.isSwooping = false;

    // Reset to back of formation
    alien.position.z = -25;

    // Random X position within bounds
    alien.position.x = (Math.random() - 0.5) * 20;

    // Reset rotation
    alien.rotation.z = 0;
    alien.position.y = 0;

    // Ensure it's not too close to edges immediately
    alien.position.x = Math.max(-10, Math.min(10, alien.position.x));
}

// Get all aliens
export function getAliens() {
    return aliens;
}

// Hide all aliens
export function hideAliens() {
    aliens.forEach(alien => {
        alien.visible = false;
    });
}

// Show all aliens
export function showAliens() {
    aliens.forEach(alien => {
        alien.visible = true;
    });
}

import { spawnPowerUp } from './powerups.js';

// Remove alien from array
export function removeAlien(alien, scene) {
    alien.userData.destroyed = true;

    // Chance to drop power-up (10%)
    if (Math.random() < 0.1) {
        spawnPowerUp(alien.position, scene);
    }

    scene.remove(alien);
    const alienIndex = aliens.indexOf(alien);
    if (alienIndex > -1) {
        aliens.splice(alienIndex, 1);
    }
}

// Reset aliens for new game
export function resetAliens(scene) {
    aliens.forEach(alien => scene.remove(alien));
    aliens = [];
    alienDirection = 1;
    alienSpeed = levelConfig.baseSpeed;
    lastSwoopTime = 0;
    nextSwoopInterval = 5000;
}

// Get alien state for reset
export function getAlienState() {
    return {
        direction: alienDirection,
        speed: alienSpeed
    };

// ---------------------------------------------------------------------------
// Shared constants referenced by animateAlien
// ---------------------------------------------------------------------------
const OCTOPUS_LID_OPEN_Y = 0.38;
const OCTOPUS_LID_CLOSED_Y = 0.10;
const CRAB_STALK_Y = 0.30;
const SQUID_LID_OPEN_Y = 0.04;
const SQUID_LID_CLOSED_Y = -0.17;
const UFO_LIGHT_COUNT = 8;
const TANK_TREAD_X = 0.58;
const TANK_TREAD_PLATES = 14;
const TANK_WHEEL_Z = [-0.40, 0, 0.40];
const TANK_WHEEL_SIZE = 0.26;
// Tread path: two straight runs joined by semicircles at each end
const TANK_TREAD_RUN = 0.80;
const TANK_TREAD_RADIUS = 0.20;

const VOIDWORM_RADII = [0.16, 0.13, 0.12, 0.14, 0.11, 0.09, 0.07];

// ---------------------------------------------------------------------------
// Helper: tread point along tank tread loop
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Animate all aliens
// ---------------------------------------------------------------------------
export function animateAlien(alien) {
    const time = Date.now() * 0.001 + alien.userData.animationOffset;
    const row = alien.userData.row;

    // Different animations for each row
    switch (row) {
        case 0: { // Octopus - curling tentacles, pulsing vents, blinking eyes
            const octopus = alien.userData;

            // Jet cycle: quick contraction, slow glide back out
            const jetCycle = (Math.sin(time * 2.2) + 1) / 2;
            const thrust = Math.pow(jetCycle, 2.5);

            if (octopus.tentacles) {
                octopus.tentacles.forEach((segments, i) => {
                    // Wave travels around the ring of limbs...
                    const ringPhase = time * 4 + i * 0.9;
                    segments.forEach((segment, j) => {
                        // ...and then down each limb, growing toward the tip
                        const lag = ringPhase - j * 0.7;
                        const amplitude = 0.22 + j * 0.16;
                        segment.rotation.z = segment.userData.baseTilt
                            + Math.sin(lag) * amplitude
                            - thrust * 0.12 * (j + 1);
                        segment.rotation.x = Math.cos(lag * 0.8) * amplitude * 0.5;
                    });
                });
            }

            // Hood flares against the jet. Scaling the mantle rather than the
            // group keeps the swoop telegraph's scale handling intact.
            if (octopus.mantle) {
                octopus.mantle.scale.set(1 + thrust * 0.1, 1 - thrust * 0.12, 1 + thrust * 0.1);
            }

            // Vents flare as the body contracts
            if (octopus.vents) {
                octopus.vents.material.emissiveIntensity = 1.1 + thrust * 2.4;
            }

            // Eyes drift around and pulse
            if (octopus.eyes) {
                octopus.eyes.position.x = Math.sin(time * 0.7) * 0.05;
                octopus.eyes.position.y = Math.sin(time * 0.5) * 0.03;
                octopus.eyes.material.emissiveIntensity = 1.9 + Math.sin(time * 3) * 0.6;
            }

            // Blink: lids snap shut and reopen roughly every 4 seconds. The
            // per-alien animation offset keeps the formation out of sync.
            if (octopus.lids) {
                const blinkPhase = (time % 4.1) / 4.1;
                const blink = blinkPhase < 0.09 ? Math.sin((blinkPhase / 0.09) * Math.PI) : 0;
                octopus.lids.position.y = OCTOPUS_LID_OPEN_Y
                    - blink * (OCTOPUS_LID_OPEN_Y - OCTOPUS_LID_CLOSED_Y);
            }

            // Beak chomps on the contraction
            if (octopus.beakUpper && octopus.beakLower) {
                const chomp = Math.pow((Math.sin(time * 2.2 - 1) + 1) / 2, 6) * 0.5;
                octopus.beakUpper.rotation.x = -0.25 - chomp;
                octopus.beakLower.rotation.x = 0.25 + chomp;
            }

            // Breathing body scale (out of sync with the tentacles)
            const breathScale = 1 + Math.sin(time * 2) * 0.06;
            alien.scale.set(breathScale, breathScale, breathScale);
            // Gentle rotation wobble
            alien.rotation.y = Math.sin(time * 0.8) * 0.18;
            alien.rotation.z = Math.sin(time * 1.2) * 0.08;
            break;
        }

        case 1: { // Crab - tripod gait, snapping pincers, swivelling eye stalks
            const crab = alien.userData;
            const gait = time * 7;

            // Walking legs: each tripod plants while the other swings
            if (crab.legs) {
                crab.legs.forEach(leg => {
                    const step = Math.sin(gait + leg.phase);
                    const lift = Math.max(0, step);
                    // Femur lifts the leg, tibia extends to reach for the ground
                    leg.segments[0].rotation.z = leg.segments[0].userData.baseBend - lift * 0.45;
                    leg.segments[1].rotation.z = leg.segments[1].userData.baseBend + lift * 0.35;
                    // Swing fore and aft through the step
                    leg.segments[0].rotation.x = Math.cos(gait + leg.phase) * 0.3;
                });
            }

            // Pincers: fast close, slow open, with the arm thrusting on the snap
            if (crab.claws) {
                crab.claws.forEach((claw, i) => {
                    const snapCycle = (Math.sin(time * 4 + i * Math.PI) + 1) / 2;
                    const snap = Math.pow(snapCycle, 4);   // spikes near the close

                    claw.jawUpper.rotation.x = -0.5 + snap * 0.45;
                    claw.jawLower.rotation.x = 0.5 - snap * 0.45;
                    // Elbow straightens as the claw closes, thrusting it forward
                    claw.segments[0].rotation.x = claw.segments[0].userData.baseLift - snap * 0.2;
                    claw.segments[1].rotation.y = claw.segments[1].userData.baseYaw + claw.side * snap * 0.28;
                });
            }

            // Eye stalks swivel, bob, and occasionally flinch down
            if (crab.stalks) {
                crab.stalks.forEach((stalk, i) => {
                    const look = Math.sin(time * 1.3 + i * 1.7);
                    stalk.segments[0].rotation.z = stalk.segments[0].userData.baseBend + look * 0.3;
                    stalk.segments[1].rotation.z = stalk.segments[1].userData.baseBend - look * 0.4;
                    stalk.segments[0].rotation.x = Math.sin(time * 2.1 + i) * 0.18;
                    // Flinch: both stalks duck briefly, roughly every 3.4s
                    const flinchPhase = (time % 3.4) / 3.4;
                    const flinch = flinchPhase < 0.12 ? Math.sin((flinchPhase / 0.12) * Math.PI) : 0;
                    stalk.mount.position.y = CRAB_STALK_Y - flinch * 0.16;
                    stalk.eye.scale.setScalar(1 - flinch * 0.25);
                });
            }

            // Mandibles chatter fast under the rim
            if (crab.mandibles) {
                crab.mandibles.forEach((mandible, i) => {
                    mandible.rotation.x = Math.sin(time * 14 + i * Math.PI) * 0.35;
                });
            }

            // Molten seams glow hotter as the claws close
            if (crab.seams) {
                const heat = Math.pow((Math.sin(time * 4) + 1) / 2, 3);
                crab.seams.material.emissiveIntensity = 1.2 + heat * 2.2;
            }

            // Eyes pulse
            if (crab.stalks && crab.stalks[0]) {
                crab.stalks[0].eye.material.emissiveIntensity = 1.1 + Math.sin(time * 3.5) * 0.4;
            }

            // Body bobs and rocks with the gait. This rides on the carapace and
            // rotation, never position.x - the formation owns that.
            if (crab.carapace) {
                crab.carapace.position.y = Math.abs(Math.sin(gait)) * 0.05;
            }
            alien.rotation.z = Math.sin(gait) * 0.12;
            alien.rotation.x = Math.sin(gait * 2) * 0.04;
            break;
        }

        case 2: { // Squid - jet propulsion, rippling fins, lashing tentacles
            const squid = alien.userData;

            // Jet cycle as an explicit event: a hard contraction, then a long
            // glide. `vent` is a much tighter window, so the siphon reads as a
            // flash rather than a permanent glow.
            const jetPhase = (time % 2.4) / 2.4;
            const thrust = jetPhase < 0.26 ? Math.sin((jetPhase / 0.26) * Math.PI) : 0;
            const vent = jetPhase < 0.07 ? Math.sin((jetPhase / 0.07) * Math.PI) : 0;

            // Squash and stretch as the mantle expels its water. This rides on
            // the mantle, not the group - the swoop telegraph owns alien.scale.
            if (squid.mantle) {
                squid.mantle.scale.set(1 - thrust * 0.17, 1 + thrust * 0.16, 1 - thrust * 0.17);
            }

            // Chromatophores flush with the jet
            if (squid.spots) {
                squid.spots.material.emissiveIntensity =
                    0.9 + (Math.sin(time * 2.3) + 1) * 0.55 + thrust * 1.8;
            }

            // Fins undulate constantly, then sweep flat and back on the power
            // stroke so the squid streamlines into the jet
            if (squid.fins) {
                squid.fins.forEach(fin => {
                    const wave = Math.sin(time * 3.4 + fin.side * 0.6);
                    fin.mesh.rotation.z = fin.side * (wave * 0.34 - thrust * 0.40);
                    fin.mesh.rotation.x = Math.sin(time * 3.4 - 0.9) * 0.24;
                    fin.mesh.rotation.y = fin.side * thrust * 0.22;
                });
            }

            // Arm crown: a wave travels around the ring...
            if (squid.arms) {
                squid.arms.forEach(arm => {
                    const ringPhase = time * 4.6 + arm.phase;
                    arm.segments.forEach((segment, j) => {
                        // ...and then down each arm, growing toward the tip.
                        // Thrust pulls the whole crown into a spear.
                        const lag = ringPhase - j * 0.8;
                        const amplitude = 0.16 + j * 0.14;
                        segment.rotation.z = segment.userData.baseBend
                            + Math.sin(lag) * amplitude
                            - thrust * (0.26 + j * 0.10);
                        segment.rotation.x = Math.cos(lag * 0.7) * amplitude * 0.6;
                    });
                });
            }

            // Feeding tentacles drift, then lash out roughly every five seconds
            const strikePhase = (time % 5.3) / 5.3;
            const strike = strikePhase < 0.13 ? Math.sin((strikePhase / 0.13) * Math.PI) : 0;

            if (squid.tentacles) {
                squid.tentacles.forEach((tentacle, i) => {
                    // The lash lives on the un-yawed pivot, so both tentacles
                    // swing toward the player rather than mirroring apart
                    tentacle.pivot.rotation.x = -strike * 0.95;
                    tentacle.pivot.rotation.y = Math.sin(time * 1.6 + i * 2.1) * 0.12;

                    tentacle.segments.forEach((segment, j) => {
                        const drift = Math.sin(time * 2.6 - j * 0.9 + i * 1.4);
                        // Straightens as it strikes, coils back as it recovers
                        segment.rotation.z = segment.userData.baseBend * (1 - strike * 0.9)
                            + drift * (0.10 + j * 0.07);
                    });

                    tentacle.club.scale.setScalar(1 + strike * 0.45);
                });
            }

            // Head cranes against the body pitch, keeping the eyes on the player
            if (squid.head) {
                squid.head.rotation.x = thrust * 0.20;
            }

            // Eyes drift and pulse, and widen on the strike
            if (squid.eyes) {
                squid.eyes.position.x = Math.sin(time * 0.9) * 0.03;
                squid.eyes.material.emissiveIntensity = 2.0 + Math.sin(time * 3.2) * 0.7 + strike * 1.5;
            }

            // Blink: lids drop and lift roughly every 3.7 seconds. The per-alien
            // animation offset keeps the formation out of sync.
            if (squid.lids) {
                const blinkPhase = (time % 3.7) / 3.7;
                const blink = blinkPhase < 0.08 ? Math.sin((blinkPhase / 0.08) * Math.PI) : 0;
                squid.lids.position.y = SQUID_LID_OPEN_Y
                    - blink * (SQUID_LID_OPEN_Y - SQUID_LID_CLOSED_Y);
            }

            // Siphon flashes as the jet fires, and the plume stabs out with it
            if (squid.siphon) {
                squid.siphon.material.emissiveIntensity = 1.1 + vent * 3.4 + thrust * 1.0;
                squid.siphon.scale.set(1 + vent * 0.25, 1 + vent * 0.20, 1);
            }
            if (squid.plume) {
                squid.plume.visible = thrust > 0.02;
                squid.plume.material.opacity = thrust * 0.5;
                squid.plume.scale.set(0.5 + thrust * 0.5, 0.5 + thrust * 0.5, 0.35 + thrust * 0.65);
            }

            // Pitches nose-up into the jet, then sways through the glide
            alien.rotation.x = -thrust * 0.24 + Math.sin(time * 1.3) * 0.05;
            alien.rotation.z = Math.sin(time * 1.1) * 0.09;
            alien.rotation.y = Math.sin(time * 0.7) * 0.16;

            // Each jet kicks the squid upward and it settles back on the glide.
            // Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = thrust * 0.34 + Math.sin(time * 1.3) * 0.06;
            }
            break;
        }

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

        case 5: { // Beetle - creeping gait that breaks into buzzing flight
            const beetle = alien.userData;

            // Flight cycle: shell splits, wings buzz, beetle lifts, then settles
            const flightPhase = (time % 7.2) / 7.2;
            let openness = 0;
            if (flightPhase < 0.06) {
                openness = flightPhase / 0.06;                    // shell cracks open
            } else if (flightPhase < 0.30) {
                openness = 1;                                     // airborne
            } else if (flightPhase < 0.38) {
                openness = 1 - (flightPhase - 0.30) / 0.08;       // folds away
            }
            const airborne = openness > 0.05;

            // Elytra hinge up and outward from the spine
            if (beetle.elytra) {
                beetle.elytra.forEach(elytron => {
                    elytron.mesh.rotation.z = elytron.side * openness * 0.75;
                    // Splay backward as they lift, so they open as a V from above
                    elytron.mesh.rotation.y = -elytron.side * openness * 0.32;
                    elytron.mesh.rotation.x = -openness * 0.24;
                });
            }

            // Wings unfold and blur. The fast oscillation deliberately aliases
            // at frame rate, which is what sells the blur.
            if (beetle.wings) {
                beetle.wings.forEach(wing => {
                    wing.mesh.visible = airborne;
                    if (!airborne) return;
                    const beat = Math.sin(time * 55 + wing.side);
                    wing.mesh.rotation.z = wing.side * (openness * 0.30 + beat * 0.28);
                    wing.mesh.rotation.x = beat * 0.16;
                    wing.mesh.material.opacity = 0.20 + openness * 0.26;
                });
            }

            // Legs: creeping tripod on the ground, tucked up in flight
            if (beetle.legs) {
                beetle.legs.forEach(leg => {
                    const step = Math.sin(time * 9 + leg.phase);
                    const lift = Math.max(0, step) * (1 - openness);
                    leg.segments[0].rotation.z = leg.segments[0].userData.baseBend
                        - lift * 0.40 - openness * 0.55;
                    leg.segments[1].rotation.z = leg.segments[1].userData.baseBend
                        + lift * 0.30 + openness * 0.70;
                    leg.segments[2].rotation.z = leg.segments[2].userData.baseBend + openness * 0.40;
                    // Reach forward and back through the step - a creep, not a sideways scuttle
                    leg.segments[0].rotation.x = Math.cos(time * 9 + leg.phase) * 0.38 * (1 - openness);
                });
            }

            // Antennae sweep and waggle, tucking back in flight
            if (beetle.antennae) {
                beetle.antennae.forEach((antenna, i) => {
                    antenna.mesh.rotation.y = antenna.mesh.userData.baseYaw
                        + Math.sin(time * 4 + i * Math.PI) * 0.28;
                    antenna.mesh.rotation.x = -0.25 + Math.sin(time * 3 + i) * 0.20 - openness * 0.35;
                });
            }

            // Head bobs with the creep and lifts to look ahead in flight
            if (beetle.head) {
                beetle.head.rotation.x = Math.sin(time * 9) * 0.06 - openness * 0.22;
            }

            // Web-bomb sac charges on the ground and flares as it lifts off
            if (beetle.sac) {
                const charge = (Math.sin(time * 2.2) + 1) / 2;
                beetle.sac.material.emissiveIntensity = 1.0 + charge * 1.6 + openness * 1.4;
                const swell = 1 + charge * 0.12;
                beetle.sac.scale.set(swell, swell, swell);
            }

            // Body rocks with the gait, and tilts nose-up once airborne
            alien.rotation.z = Math.sin(time * 9) * 0.07 * (1 - openness);
            alien.rotation.x = Math.sin(time * 6) * 0.04 - openness * 0.12;

            // Creeping bob on the ground, real lift when the wings are out.
            // Skipped mid-swoop, which owns Y.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.abs(Math.sin(time * 9)) * 0.03 * (1 - openness)
                    + openness * 0.42;
            }
            break;
        }


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

        case 7: { // Scorpion — stalking arachnid
            const scorpion = alien.userData;
            const t = time + (scorpion._animT0 ?? 0);

            // 10s cycle: stand→idle→walk→charge→strike→repeat
            // Gives each state enough time to be visible
            const phase = t % 10;
            const state = phase < 1 ? 'stand'
                : phase < 4 ? 'idle'
                : phase < 7 ? 'walk'
                : phase < 8.5 ? 'charge'
                : 'strike';

            // Shared parameters
            const breathe = Math.sin(t * 2.5) * 0.04;
            const scan = Math.sin(t * 0.6) * 0.08;

            // ---- TAIL ANIMATION ----
            if (scorpion.tailPivot) {
                let targetAngle = 0;
                switch (state) {
                    case 'stand':
                        // Resting vertical with slight ambient sway
                        targetAngle = scan * 0.3;
                        break;
                    case 'idle':
                        // Slow searching sweep
                        targetAngle = Math.sin(t * 0.7) * 0.20;
                        break;
                    case 'walk':
                        // Moderate tracking with step sync
                        targetAngle = Math.sin(t * 0.9) * 0.12 + Math.sin(t * 8) * 0.03;
                        break;
                    case 'charge':
                        // Raised high — coiled for strike
                        targetAngle = 0.55 + Math.sin(t * 1.5) * 0.04;
                        break;
                    case 'strike':
                        // Whip over head — sudden lunge
                        if (!scorpion._strikePhased) {
                            scorpion._strikePhased = true;
                            scorpion._strikeAt = t + 0.6;
                        }
                        const strikeT = Math.min(1, Math.max(0, (t - scorpion._strikeAt) * 3));
                        const strikeF = strikeT < 0.5
                            ? strikeT * 2 : 2 - strikeT * 2;
                        targetAngle = 0.7 * strikeF - 0.4 * Math.max(0, strikeT - 0.5) * 2;
                        if (strikeT >= 1) { scorpion._strikePhased = false; }
                        break;
                }
                scorpion.tailPivot.rotation.z = targetAngle;
            }

            // Tail chain segments follow smoothly
            if (scorpion.tailChain) {
                scorpion.tailChain.forEach((seg, i) => {
                    const baseBend = seg.userData.baseBend || 0;
                    const tailPivZ = scorpion.tailPivot ? scorpion.tailPivot.rotation.z : 0;
                    // Amplification propagates base motion to tip
                    const amp = 1 + i * 0.5;
                    let follow = 0;
                    switch (state) {
                        case 'stand':
                            follow = Math.sin(t * 1.2 + i * 0.6) * 0.015;
                            break;
                        case 'idle':
                            follow = Math.sin(t * 0.7 + i * 0.5) * 0.025;
                            break;
                        case 'walk':
                            follow = Math.sin(t * 0.9 + i * 0.4) * 0.02;
                            break;
                        case 'charge':
                            follow = i * 0.06;
                            break;
                        case 'strike':
                            if (scorpion._strikePhased && scorpion._strikeAt) {
                                const strikeT = Math.min(1, Math.max(0, (t - scorpion._strikeAt) * 3));
                                const strikeF = strikeT < 0.5 ? strikeT * 2 : 2 - strikeT * 2;
                                follow = strikeF * i * 0.12;
                            }
                            break;
                    }
                    seg.rotation.z = baseBend - tailPivZ * (0.3 + i * 0.15) + follow;
                    seg.rotation.x = Math.cos(t * 1.5 + i) * 0.025 * (state === 'charge' ? 1.5 : 1);
                });
            }

            // ---- STINGER ANIMATION ----
            if (scorpion.stinger) {
                let intensity = 0.5;
                let sc = 1;
                switch (state) {
                    case 'stand':
                        intensity = 0.5 + Math.sin(t * 3) * 0.15;
                        break;
                    case 'idle':
                        intensity = 0.6 + Math.sin(t * 2) * 0.4;
                        break;
                    case 'walk':
                        intensity = 0.6 + Math.sin(t * 3) * 0.3;
                        break;
                    case 'charge':
                        // Ramp up to bright during charge
                        intensity = 1.0 + Math.sin(t * 4) * 0.6;
                        sc = 1 + Math.sin(t * 3) * 0.06;
                        break;
                    case 'strike':
                        if (scorpion._strikePhased && scorpion._strikeAt) {
                            const strikeT = Math.min(1, Math.max(0, (t - scorpion._strikeAt) * 3));
                            const strikeF = strikeT < 0.5 ? strikeT * 2 : 2 - strikeT * 2;
                            intensity = 0.5 + strikeF * 3.5;
                            sc = 1 + strikeF * 0.25;
                        }
                        break;
                }
                scorpion.stinger.material.emissiveIntensity = intensity;
                scorpion.stinger.scale.set(sc, sc, sc);
            }

            // ---- PINCERS ANIMATION ----
            if (scorpion.pincers) {
                scorpion.pincers.forEach((p, _) => {
                    let yaw = 0;
                    let jawOpen = 0;
                    let armTilt = -0.35;
                    switch (state) {
                        case 'stand':
                            yaw = Math.sin(t * 1.5) * 0.04 * p.side;
                            jawOpen = 0;
                            armTilt = -0.35;
                            break;
                        case 'idle':
                            yaw = Math.sin(t * 1.2) * 0.06 * p.side;
                            jawOpen = Math.sin(t * 2.5) * 0.04;
                            armTilt = -0.35 - jawOpen * 0.5;
                            break;
                        case 'walk':
                            yaw = Math.sin(t * 2) * 0.08 * p.side;
                            jawOpen = Math.sin(t * 3) * 0.05;
                            armTilt = -0.35 - jawOpen * 0.4;
                            break;
                        case 'charge':
                            yaw = p.pincerSpread ? p.pincerSpread * 0.2 * p.side : 0.15 * p.side;
                            jawOpen = 0.12;
                            armTilt = -0.35 - 0.15 - jawOpen * 0.5;
                            break;
                        case 'strike':
                            // Pincers clamp down
                            yaw = p.side * 0.05;
                            jawOpen = -0.05;
                            armTilt = -0.35;
                            break;
                    }
                    p.pivot.rotation.z = p.side * (Math.sin(t * 1.8) * 0.03 + yaw);
                    p.jaw.rotation.x = 0.35 + jawOpen;
                    p.upperArm.rotation.x = armTilt;
                });
            }

            // ---- LEGS ANIMATION ----
            if (scorpion.legs) {
                scorpion.legs.forEach(leg => {
                    switch (state) {
                        case 'stand':
                        case 'idle': {
                            // Legs planted, subtle weight shift
                            const sway = Math.sin(t * 1.8 + leg.phase) * 0.02;
                            leg.segments[0].rotation.z = (leg.segments[0].userData.baseBend || 0.85) + sway;
                            leg.segments[0].rotation.x = Math.cos(t * 2 + leg.phase) * 0.04;
                            leg.segments[1].rotation.z = leg.segments[1].userData.baseBend || -1.30;
                            leg.segments[2].rotation.z = leg.segments[2].userData.baseBend || -0.20;
                            break;
                        }
                        case 'walk': {
                            // Full tripod gait — two groups alternate
                            const step = Math.sin(t * 6 + leg.phase);
                            const lift = Math.max(0, step);
                            leg.segments[0].rotation.z = (leg.segments[0].userData.baseBend || 0.85) - lift * 0.30;
                            leg.segments[0].rotation.x = Math.cos(t * 6 + leg.phase) * 0.25;
                            leg.segments[1].rotation.z = (leg.segments[1].userData.baseBend || -1.30) + lift * 0.40;
                            leg.segments[2].rotation.z = (leg.segments[2].userData.baseBend || -0.20) + lift * 0.18;
                            break;
                        }
                        case 'charge': {
                            // Legs braced forward, extended
                            leg.segments[0].rotation.z = (leg.segments[0].userData.baseBend || 0.85) - 0.10;
                            leg.segments[0].rotation.x = 0;
                            leg.segments[1].rotation.z = (leg.segments[1].userData.baseBend || -1.30) + 0.08;
                            leg.segments[2].rotation.z = (leg.segments[2].userData.baseBend || -0.20) + 0.04;
                            break;
                        }
                        case 'strike': {
                            // Legs planted firm
                            leg.segments[0].rotation.z = leg.segments[0].userData.baseBend || 0.85;
                            leg.segments[0].rotation.x = Math.sin(t * 20) * 0.02; // vibration
                            leg.segments[1].rotation.z = leg.segments[1].userData.baseBend || -1.30;
                            leg.segments[2].rotation.z = leg.segments[2].userData.baseBend || -0.20;
                            break;
                        }
                    }
                });
            }

            // ---- BODY ANIMATION ----
            if (scorpion.cephalo) {
                switch (state) {
                    case 'stand':
                        scorpion.cephalo.rotation.z = scan * 0.3;
                        scorpion.cephalo.rotation.x = 0;
                        break;
                    case 'idle':
                        scorpion.cephalo.rotation.z = scan + breathe * 0.5;
                        scorpion.cephalo.rotation.x = Math.sin(t * 0.8) * 0.04;
                        break;
                    case 'walk':
                        scorpion.cephalo.rotation.z = scan * 0.5 + Math.sin(t * 8) * 0.04;
                        scorpion.cephalo.rotation.x = -Math.abs(Math.sin(t * 8)) * 0.04;
                        break;
                    case 'charge':
                        scorpion.cephalo.rotation.z = scan * 0.3 + 0.06;
                        scorpion.cephalo.rotation.x = -0.08; // leans forward
                        break;
                    case 'strike':
                        scorpion.cephalo.rotation.z = scan * 0.2;
                        scorpion.cephalo.rotation.x = 0.08; // recoils back on strike
                        break;
                }
            }

            if (scorpion.abdomen) {
                switch (state) {
                    case 'stand':
                        scorpion.abdomen.rotation.z = 0;
                        scorpion.abdomen.rotation.x = breathe * 2;
                        break;
                    case 'idle':
                        scorpion.abdomen.rotation.z = Math.sin(t * 0.5) * 0.02;
                        scorpion.abdomen.rotation.x = Math.sin(t * 2.5) * 0.03;
                        break;
                    case 'walk':
                        scorpion.abdomen.rotation.z = Math.sin(t * 8) * 0.03;
                        scorpion.abdomen.rotation.x = Math.abs(Math.sin(t * 8)) * 0.04;
                        break;
                    case 'charge': {
                        scorpion.abdomen.rotation.z = 0;
                        const breathe2 = Math.sin(t * 3) * 0.02;
                        // Abdomen rises with tail
                        scorpion.abdomen.rotation.x = breathe2 - 0.06;
                        break;
                    }
                    case 'strike':
                        scorpion.abdomen.rotation.z = 0;
                        scorpion.abdomen.rotation.x = 0.08; // body bounces
                        break;
                }
            }

            // ---- EYE ANIMATION ----
            if (scorpion.eyeHighlights) {
                let eyeS = 1;
                let hIntensity = 0.6;
                switch (state) {
                    case 'stand':
                        hIntensity = 0.6 + Math.sin(t * 1.5) * 0.15;
                        eyeS = 1;
                        break;
                    case 'idle':
                        hIntensity = 0.7 + Math.sin(t * 2) * 0.2;
                        eyeS = 1;
                        break;
                    case 'walk':
                        hIntensity = 0.7 + Math.sin(t * 2.5) * 0.18;
                        eyeS = 1;
                        break;
                    case 'charge':
                        // Eyes glow brighter during charge
                        hIntensity = 1.2 + Math.sin(t * 4) * 0.5;
                        eyeS = 1;
                        break;
                    case 'strike':
                        // Intense flash on strike
                        hIntensity = 3.0;
                        eyeS = 1.08;
                        break;
                }
                scorpion.eyeHighlights.material.emissiveIntensity = hIntensity;
                scorpion.eyeHighlights.scale.set(eyeS, eyeS, eyeS);
            }

            // Overall body sway
            alien.rotation.z = state === 'stand' ? scan * 0.4
                : state === 'walk' ? Math.sin(t * 8) * 0.06
                : state === 'strike' ? Math.sin(t * 20) * 0.04
                : Math.sin(t * 1.2) * 0.05;

            // Y-position — stomp, breathing, bounce
            if (!alien.userData.isSwooping) {
                switch (state) {
                    case 'stand':
                        alien.position.y = breathe;
                        break;
                    case 'idle':
                        alien.position.y = breathe * 1.5 + Math.sin(t * 0.8) * 0.02;
                        break;
                    case 'walk':
                        alien.position.y = Math.abs(Math.sin(t * 8)) * 0.04;
                        break;
                    case 'charge':
                        alien.position.y = breathe * 0.5 - 0.02;
                        break;
                    case 'strike':
                        alien.position.y = Math.abs(Math.sin(t * 18)) * 0.03;
                        break;
                }
            }
            break;
        }

        case 8: { // Wasp - hover, wingstorm, sting lunge
            const wasp = alien.userData;
            const t = time;
            const phase = (t % 8.4) / 8.4;
            const windup = phase >= 0.24 && phase < 0.40
                ? Math.sin(((phase - 0.24) / 0.16) * Math.PI / 2)
                : phase >= 0.40 && phase < 0.54 ? 1 : 0;
            const charge = phase >= 0.40 && phase < 0.62
                ? Math.sin(Math.min(1, (phase - 0.40) / 0.22) * Math.PI / 2)
                : phase >= 0.62 && phase < 0.72 ? 1 : 0;
            const storm = phase >= 0.54 && phase < 0.78
                ? Math.sin(Math.min(1, (phase - 0.54) / 0.24) * Math.PI)
                : 0;
            const lunge = phase >= 0.70 && phase < 0.84
                ? Math.sin(Math.min(1, (phase - 0.70) / 0.14) * Math.PI)
                : 0;
            const recoil = phase >= 0.84 ? Math.max(0, 1 - (phase - 0.84) / 0.16) : 0;
            const hover = Math.sin(t * 2.2) * 0.035;

            // The body pivot carries the display motion; formation x/z remain
            // untouched so the Wasp cannot drift away from its column.
            if (wasp.bodyPivot) {
                wasp.bodyPivot.rotation.x = -charge * 0.08 - lunge * 0.24 + recoil * 0.10;
                wasp.bodyPivot.rotation.z = Math.sin(t * 1.4) * 0.035 + lunge * 0.04;
                wasp.bodyPivot.position.y = hover + windup * 0.025 - lunge * 0.04;
            }

            // Paired wings fold, snap open, then beat out of phase. The edge
            // accents carry the bright event while the transparent panels keep
            // the voxel silhouette visible under bloom.
            if (wasp.wings) {
                wasp.wings.forEach(wing => {
                    const fold = 1 - Math.min(1, windup + storm * 0.2 + lunge * 0.35);
                    const beat = storm * Math.sin(t * (42 + wing.pair * 5) + wing.pair * 1.7);
                    wing.hinge.rotation.z = wing.side * (
                        0.16 + fold * 0.46 + beat * (0.045 + wing.pair * 0.012)
                    );
                    wing.hinge.rotation.x = Math.sin(t * 2 + wing.pair) * 0.03
                        + storm * Math.sin(t * 28 + wing.pair) * 0.04;
                    wing.edge.material.emissiveIntensity = 0.8 + storm * 2.8 + charge * 1.2;
                    wing.wing.material.opacity = 0.24 + storm * 0.16;
                });
            }

            if (wasp.abdomenPivot) {
                wasp.abdomenPivot.rotation.x = -charge * 0.18 - lunge * 0.36 + recoil * 0.12;
                wasp.abdomenPivot.rotation.z = Math.sin(t * 1.7) * 0.025;
            }

            if (wasp.stinger) {
                const strike = Math.max(charge, lunge * 1.5);
                wasp.stinger.material.emissiveIntensity = 0.75 + strike * 3.4 + storm * 1.2;
                wasp.stinger.scale.set(
                    1 + strike * 0.18,
                    1 + strike * 0.18,
                    1 + strike * 0.32
                );
            }

            if (wasp.eyes) {
                wasp.eyes.material.emissiveIntensity = 1.8 + windup * 1.5 + charge * 2.4 + lunge * 1.2;
                wasp.eyes.scale.y = 1 + storm * 0.10;
            }

            if (wasp.mandibles) {
                wasp.mandibles.forEach(mandible => {
                    const jaw = 0.06 + charge * 0.24 + lunge * 0.12;
                    mandible.mesh.rotation.x = mandible.side * jaw + Math.sin(t * 9 + mandible.side) * 0.035;
                });
            }

            if (wasp.legs) {
                wasp.legs.forEach(leg => {
                    const step = Math.sin(t * 8 + leg.phase);
                    const lift = Math.max(0, step) * (1 - storm * 0.75);
                    leg.segments[0].rotation.z = leg.segments[0].userData.baseBend - lift * 0.30 - charge * 0.08;
                    leg.segments[0].rotation.x = Math.cos(t * 8 + leg.phase) * 0.22 * (1 - charge * 0.7);
                    leg.segments[1].rotation.z = leg.segments[1].userData.baseBend + lift * 0.38 + charge * 0.10;
                    leg.segments[2].rotation.z = leg.segments[2].userData.baseBend + lift * 0.16;
                });
            }

            // Y is formation-safe during a swoop; only the child body pivot
            // receives hover motion while the swoop controller owns the group.
            if (!alien.userData.isSwooping) {
                alien.position.y = Math.abs(hover) + windup * 0.03 - lunge * 0.02;
            }
            break;
        }

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

        case 10: { // Warden - rolling hoop, gimbal flip, halo wave launch
            const warden = alien.userData;
            const t = time;
            const p = (t % 8.8) / 8.8;

            const seg = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
            const ease = v => v * v * (3 - 2 * v);

            // Rises 0->1 across the flip, holds edge-on, then snaps back.
            const flip = ease(seg(0.36, 0.56)) * (1 - ease(seg(0.66, 0.74)));
            const windup = ease(seg(0.22, 0.40)) * (1 - ease(seg(0.78, 0.94)));
            const retract = ease(seg(0.28, 0.44)) * (1 - ease(seg(0.80, 0.96)));
            const charge = ease(seg(0.40, 0.72)) * (1 - ease(seg(0.74, 0.80)));
            // Explicit window so the launch reads as one event, not a glow.
            const flash = p >= 0.740 && p < 0.778
                ? Math.sin(((p - 0.740) / 0.038) * Math.PI)
                : 0;
            // The wave leaves through the hoop's own hole.
            const inWave = p >= 0.740 && p < 0.870;
            const wave = inWave ? (p - 0.740) / 0.130 : 0;
            const breathe = Math.sin(t * 1.9) * 0.5 + 0.5;

            if (warden.hoverPivot) {
                warden.hoverPivot.position.y = Math.sin(t * 1.25) * 0.045;
                warden.hoverPivot.rotation.x = Math.sin(t * 0.8) * 0.05 - charge * 0.05;
                warden.hoverPivot.rotation.z = Math.cos(t * 0.6) * 0.035 + flash * 0.05;
            }

            // The signature: the hoop turns fully edge-on, so the silhouette
            // collapses from a circle to a line and back.
            if (warden.flipPivot) {
                warden.flipPivot.rotation.y = flip * (Math.PI / 2);
            }

            // Roll gains are added to a t-driven base as rate * weight, never
            // as t * changingRate, so a phase change cannot jump the cycle.
            if (warden.hoop) {
                warden.hoop.rotation.z = t * 0.45 + windup * 2.4 + flash * 0.7;
                warden.hoop.material.emissiveIntensity =
                    0.45 + windup * 0.25 + charge * 0.30 + flash * 0.9;
            }

            if (warden.teeth) {
                warden.teeth.rotation.z = -t * 0.7 - windup * 1.8;
                warden.teeth.material.emissiveIntensity =
                    0.8 + breathe * 0.15 + charge * 1.1 + flash * 2.2;
                const bite = 1 - retract * 0.10 + flash * 0.06;
                warden.teeth.scale.set(bite, bite, 1);
            }

            // Geometry is centred on the origin, so scaling retracts the spokes
            // toward the core instead of sliding them sideways.
            if (warden.spokes) {
                const reach = 1 - retract * 0.62;
                warden.spokes.scale.set(reach, reach, 1);
                warden.spokes.material.emissiveIntensity = 0.45 + retract * 0.35;
            }

            if (warden.core) {
                warden.core.material.emissiveIntensity =
                    1.1 + breathe * 0.2 + charge * 1.3 + flash * 1.9;
                const swell = 1 + breathe * 0.05 + charge * 0.28 + flash * 0.35;
                warden.core.scale.setScalar(swell);
                warden.core.rotation.z = t * 1.1 + charge * 1.6;
            }

            if (warden.halo) {
                warden.halo.scale.setScalar(inWave ? 0.35 + wave * 1.55 : 0.001);
                warden.halo.material.opacity = inWave ? (1 - wave) * 0.85 : 0;
                warden.halo.rotation.z = t * 2.0;
            }

            if (warden.anchor) {
                warden.anchor.rotation.x = Math.sin(t * 1.1) * 0.06 + charge * 0.10;
                warden.anchor.rotation.y = Math.sin(t * 0.9) * 0.08;
            }

            // Guarded: updateSwoop() owns Y during a kamikaze dive.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.05 + Math.abs(Math.sin(t * 1.25)) * 0.04;
            }
            break;
        }

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
                    // Forearm hangs loosely
                    arm.fore.position.y = -0.28;

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

        case 14: { // Raven
            const self = alien.userData;
            const t = time;
            const period = 6.0;
            const p = (t % period) / period;

            // Wing spread cycle: windup at 0.20→0.32 (snap open),
            // hold at 0.32→0.40, return at 0.40→0.52, idle.
            const wingWindup = p >= 0.20 && p < 0.32
                ? Math.sin(((p - 0.20) / 0.12) * Math.PI / 2)
                : p >= 0.32 && p < 0.40 ? 1.0
                : p >= 0.40 && p < 0.52
                    ? Math.sin(((0.52 - p) / 0.12) * Math.PI / 2)
                    : 0;

            // Beak clack — brief sharp closure during windup peak.
            const beakClack = p >= 0.28 && p < 0.38
                ? Math.sin(((p - 0.28) / 0.10) * Math.PI)
                : 0;

            // Crest pulse — bright flash on windup peak.
            const crestPulse = p >= 0.30 && p < 0.44
                ? Math.sin(((p - 0.30) / 0.14) * Math.PI)
                : 0;

            // Head bob — subtle side-to-side idle motion.
            const headBob = Math.sin(t * 1.8) * 0.04;

            // Apply wing spread to both wings.
            if (self.wings) {
                self.wings.forEach(arm => {
                    // Rotate outward (positive rotZ spreads right, negative spreads left).
                    const spread = wingWindup * 0.65 * arm.side;
                    arm.mesh.rotation.z = -0.55 + spread;
                    // Slight lift on spread.
                    arm.mesh.position.y = wingWindup * 0.04;
                });
            }

            // Beak clack — slight yaw pulse on closure.
            if (self.beak) {
                self.beak.rotation.y = beakClack * 0.12;
                self.beak.material.emissiveIntensity = 0.9 + beakClack * 1.2;
            }

            // Crest pulse — emissive flash.
            if (self.crest) {
                self.crest.material.emissiveIntensity = 1.5 + crestPulse * 2.0;
            }

            // Eyes — subtle pulse.
            if (self.eyes) {
                self.eyes.material.emissiveIntensity = 2.0 + wingWindup * 0.6;
            }

            // Talons — slight grip tension during windup.
            if (self.talons) {
                self.talons.forEach(tal => {
            tal.mesh.rotation.x = wingWindup * 0.15 * tal.side;
            });
            }

            // Body pivot — slight tilt on wing spread.
            if (self.bodyPivot) {
                self.bodyPivot.rotation.z = headBob;
                self.bodyPivot.rotation.y = Math.sin(t * 0.9) * 0.03;
            }

            // Idle hover.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.03 + Math.sin(t * 2.0) * 0.02;
            }
            break;
        }
        case 15: { // Nexus — orbital station with rotating arms, pulsing core, spinning ring
            const self = alien.userData;
            const t = time;
            const period = 5.0;
            const p = (t % period) / period;

            // Slow continuous rotation of entire arm assembly.
            if (self.pivot) {
                self.pivot.rotation.z = t * 0.3;
            }

            // Energy ring counter-rotation.
            if (self.ring) {
                self.ring.rotation.z = -t * 0.8;
                self.ring.material.emissiveIntensity = 0.8 + Math.sin(t * 3.0) * 0.3;
            }

            // Weapon windup: arms snap inward (telegraph) at 0.15→0.25, fire at 0.25,
            // arms spring outward at 0.25→0.35, then idle.
            const armSweep = p >= 0.15 && p < 0.25
                ? Math.sin(((p - 0.15) / 0.10) * Math.PI / 2)
                : p >= 0.25 && p < 0.35
                    ? 1.0 - Math.sin(((p - 0.25) / 0.10) * Math.PI / 2)
                    : 0;

            if (self.arms) {
                self.arms.forEach((arm) => {
                    const s = armSweep * 0.4;
                    arm.inner.scale.setScalar(1.0 - s * 0.3);
                    arm.outer.scale.setScalar(1.0 - s * 0.3);
                    arm.tip.material.emissiveIntensity = 1.5 + armSweep * 2.0;
                });
            }

            // Core pulse — brightens on windup, steady otherwise.
            if (self.core) {
                self.core.material.emissiveIntensity = 1.8 + armSweep * 1.5;
            }

            // Brace glow — subtle on idle.
            if (self.braces) {
                self.braces.forEach((b) => {
                    b.material.emissiveIntensity = 0.2 + Math.sin(t * 1.5) * 0.05;
                });
            }

            // Idle hover.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.04 + Math.sin(t * 1.4) * 0.015;
            }
            break;
        }
        case 16: { // Apex — orbiting shards rotate, brighten on windup, horizontal beam fires
            const self = alien.userData;
            const t = time;
            const period = 7.0;
            const p = (t % period) / period;

            // Shard orbit: continuous rotation of the shard group.
            if (self.pivot) {
                self.pivot.rotation.z = t * 0.25;
            }

            // Weapon windup: shards contract inward, core brightens at 0.20→0.30,
            // fires at 0.30, shards spring outward at 0.30→0.40, then idle.
            const charge = p >= 0.20 && p < 0.30
                ? Math.sin(((p - 0.20) / 0.10) * Math.PI / 2)
                : p >= 0.30 && p < 0.40 ? 1 : 0;
            const release = p >= 0.40 ? Math.max(0, 1 - (p - 0.40) / 0.20) : 0;

            if (self.shards) {
                self.shards.forEach((shard, i) => {
                    const s = 1.0 - charge * 0.3; // contract on windup
                    shard.scale.setScalar(s);
                    shard.material.emissiveIntensity = 0.6 + charge * 2.0 + release * 0.5;
                });
            }

            // Core pulses on windup, steady otherwise.
            if (self.core) {
                self.core.material.emissiveIntensity = 1.8 + charge * 2.5 + release * 0.8;
            }

            // Orbit ring fades on windup, returns on release.
            if (self.orbitRing) {
                self.orbitRing.material.emissiveIntensity = 0.15 + charge * 0.3;
            }

            // Idle hover.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.03 + Math.sin(t * 1.8) * 0.02;
            }
            break;
        }
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
        case 18: { // Manta — continuous wing-sweep glide, snap wide on windup, settle back
            const self = alien.userData;
            const t = time;

            const windup = phase >= 0.30 && phase < 0.45
                ? Math.sin(((phase - 0.30) / 0.15) * Math.PI / 2)
                : phase >= 0.45 && phase < 0.55 ? 1 : 0;
            const strike = phase >= 0.55 && phase < 0.70
                ? Math.sin(((phase - 0.55) / 0.15) * Math.PI)
                : 0;
            const recoil = phase >= 0.70 ? Math.max(0, 1 - (phase - 0.70) / 0.18) : 0;

            if (self.wings) {
                self.wings.forEach(wing => {
                    // Wing sweep: continuous idle motion + windup flare + strike + recoil
                    wing.pivot.rotation.x = Math.sin(t * 3.5 + wing.side) * 0.04
                                          + windup * wing.side * 0.28
                                          + strike * wing.side * 0.18
                                          - recoil * wing.side * 0.10;
                    // Cloned per instance -> safe.
                    wing.eye.material.emissiveIntensity = 2.5 + windup * 1.8 + strike * 3.0;
                    // Wing tip accent flashes on windup.
                    wing.wingTip.scale.y = 1 + windup * 0.20 + strike * 0.10;
                });
            }

            if (self.bodyPivot) {
                // Body rises slightly on windup, crouches on strike.
                self.bodyPivot.position.y = Math.sin(t * 2.8) * 0.025 + windup * 0.04 - strike * 0.03;
                self.bodyPivot.rotation.z = Math.sin(t * 1.3) * 0.025;
            }

            if (self.body) {
                // Body compresses slightly on windup (child-mesh scale only).
                self.body.scale.y = 1 - windup * 0.12 + strike * 0.06;
            }

            // updateSwoop() owns Y during a kamikaze dive.
            if (!alien.userData.isSwooping) {
                alien.position.y = 0.02 + Math.sin(t * 1.8) * 0.02;
            }
            break;
        }
        case 19: { // Peacock - iridescent abdomen display, waving arms, pulsing eyes
            const peacock = alien.userData;

            // Iridescent abdomen color cycle (cyan→green→red shimmer)
            const abdPhase = t * 2.5 + peacock.abdomenPhase;
            const abdShimmer = (Math.sin(abdPhase) + 1) / 2;
            const colorR = Math.sin(abdPhase) * 0.5 + 0.5;
            const colorG = Math.cos(abdPhase * 0.7) * 0.5 + 0.5;
            if (peacock.abdomen && peacock.abdomen.material) {
                peacock.abdomen.material.emissive.setHSL(
                    0.5 + abdShimmer * 0.3,  // Shift hue from cyan to green-red
                    0.8,
                    0.5 + abdShimmer * 0.2
                );
                peacock.abdomen.material.emissiveIntensity = 0.55 + abdShimmer * 0.8;
            }

            // Abdomen fans/pulses (the nurse hat display)
            if (peacock.abdomen) {
                const fanScale = 1 + Math.sin(t * 3.2 + peacock.abdomenPhase) * 0.08;
                peacock.abdomen.scale.set(fanScale, fanScale * 1.05, fanScale);
            }

            // Raised arms wave in display dance
            if (peacock.arms) {
                peacock.arms.forEach((arm, i) => {
                    const wavePhase = t * 4 + i * Math.PI + peacock.armPhase;
                    const waveAngle = Math.sin(wavePhase) * 0.6;
                    arm.pivot.rotation.z = waveAngle;
                    arm.pivot.rotation.y = Math.sin(wavePhase * 0.7) * 0.3;
                });
            }

            // Large eyes pulse and shift focus
            if (peacock.eyes && peacock.eyes.material) {
                const eyePulse = (Math.sin(t * 5 + peacock.eyePulse) + 1) / 2;
                peacock.eyes.material.emissiveIntensity = 2.5 + eyePulse * 2.5;
                // Slight eye tracking
                peacock.eyes.position.z = 0.36 + eyePulse * 0.02;
            }

            // Head bobs subtly with display
            if (peacock.head) {
                peacock.head.position.z = 0.36 + Math.sin(t * 2.8 + peacock.abdomenPhase) * 0.015;
                peacock.head.rotation.y = Math.sin(t * 1.6) * 0.08;
            }

            // Legs adjust slightly
            if (peacock.legs) {
                peacock.legs.forEach((leg, i) => {
                    leg.leg.rotation.z = Math.sin(t * 3 + leg.phase) * 0.06;
                });
            }

            // Gentle rotation wobble (display sway)
            alien.rotation.y = Math.sin(t * 1.4 + peacock.armPhase) * 0.12;
            break;
        }
    }
}

}
