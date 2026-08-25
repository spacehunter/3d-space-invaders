import * as THREE from 'three';
import { MISSILE_SPEED } from './constants.js';
import { playMissileFire, playUFOMissileLaunch } from './audio.js';
import { createExplosion, createShrapnelExplosion, getParticles } from './particles.js';
import { playExplosion } from './audio.js';
import { getAliens, removeAlien } from './aliens.js';
import { getBonusUFO, removeBonusUFO, setUFOMissileFireCallback } from './bonus-ufo.js';
import { checkBarrierCollision } from './barriers.js';
import { getCurrentBoss, damageBoss, getBossHitRadius } from './boss.js';

import { getActivePowerUp, POWERUP_TYPES } from './powerups.js';

let missiles = [];
let alienMissiles = [];
let ufoMissiles = [];
let webBombs = [];
let webZones = [];
let blasterBolts = [];
let venomDarts = [];
let waspNeedles = [];
let prismLances = [];
let haloWaves = [];
let vortexBolts = [];
let ambushSpurs = [];
let lastAlienFireTime = 0;
let lastPlayerFireTime = 0;

// Level complete callback (set by game.js)
let levelCompleteCallback = null;

/**
 * Set the callback for when a level is completed
 * @param {Function} callback - Function to call when level is complete
 */
export function setLevelCompleteCallback(callback) {
    levelCompleteCallback = callback;
}

// Initialize UFO missile callback
export function initUFOMissiles() {
    setUFOMissileFireCallback(fireUFOMissile);
}

// Fire a player missile
export function fireMissile(player, scene) {
    const now = Date.now();
    const activePowerUp = getActivePowerUp();

    // Determine fire rate
    let fireDelay = 400; // Default 400ms
    if (activePowerUp === POWERUP_TYPES.RAPID_FIRE) {
        fireDelay = 100; // Rapid fire 100ms
    }

    // Check cooldown
    if (now - lastPlayerFireTime < fireDelay) {
        return false;
    }
    lastPlayerFireTime = now;

    // Fire logic
    if (activePowerUp === POWERUP_TYPES.SPREAD_SHOT) {
        // Fire 3 missiles
        createMissile(player.position, 0, scene);
        createMissile(player.position, -0.2, scene); // Left angle
        createMissile(player.position, 0.2, scene);  // Right angle
    } else {
        // Normal single shot
        createMissile(player.position, 0, scene);
    }

    playMissileFire();
    return true;
}

// Helper to create a single missile
function createMissile(position, angleOffset, scene) {
    const missileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const missileMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 4.0
    });
    const missile = new THREE.Mesh(missileGeometry, missileMaterial);

    missile.position.copy(position);
    missile.position.y = 0;
    missile.position.z -= 1;

    // Apply angle for spread shot
    if (angleOffset !== 0) {
        missile.rotation.y = angleOffset;
    }

    // Store velocity vector for angled shots
    missile.userData = {
        velocity: new THREE.Vector3(
            Math.sin(angleOffset) * MISSILE_SPEED,
            0,
            -Math.cos(angleOffset) * MISSILE_SPEED
        )
    };

    missiles.push(missile);
    scene.add(missile);
}

// Check missile-to-missile collision (player missile vs alien missile)
function checkMissileToMissileCollision(missile, missileIndex, scene) {
    for (let j = alienMissiles.length - 1; j >= 0; j--) {
        const alienMissile = alienMissiles[j];
        const distance = missile.position.distanceTo(alienMissile.position);

        // Check if missiles collided (using larger radius for easier interception)
        if (distance < 0.8) {
            // Remove both missiles
            scene.remove(missile);
            missiles.splice(missileIndex, 1);

            scene.remove(alienMissile);
            alienMissiles.splice(j, 1);

            // Create explosion at collision point
            const collisionPoint = new THREE.Vector3();
            collisionPoint.lerpVectors(missile.position, alienMissile.position, 0.5);
            createExplosion(collisionPoint, scene);
            playExplosion(0.4);  // Quieter explosion for missile intercept

            return true;  // Missile was destroyed
        }
    }
    return false;  // No collision
}

// Update player missiles
export function updateMissiles(scene, scoreCallback, gameOverCallback, isBossLevel = false) {
    const bonusUFO = getBonusUFO();

    for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];

        // Move missile
        if (missile.userData.velocity) {
            missile.position.add(missile.userData.velocity);
        } else {
            missile.position.z -= MISSILE_SPEED;
        }

        // Smart Missile Logic: Climb if aligned with Bonus UFO
        if (bonusUFO) {
            // Check horizontal alignment (within 2 units)
            if (Math.abs(missile.position.x - bonusUFO.position.x) < 2.0) {
                // Check if UFO is ahead (in -Z direction)
                if (missile.position.z > bonusUFO.position.z) {
                    // Climb towards UFO height (usually Y=5)
                    const targetY = bonusUFO.position.y;

                    // Smoothly interpolate Y position
                    missile.position.y += (targetY - missile.position.y) * 0.1;

                    // Maintain forward orientation (no tilt)
                    missile.rotation.x = 0;
                }
            } else {
                // Return to normal flight if alignment lost
                if (missile.position.y > 0) {
                    missile.position.y -= 0.1;
                    // Ensure rotation is reset
                    missile.rotation.x = 0;
                }
            }
        }

        // Remove if off screen
        if (missile.position.z < -60) { // Increased range from -30 to -60 to hit back row aliens
            scene.remove(missile);
            missiles.splice(i, 1);
            continue;
        }

        // Check collision with alien missiles first (defensive play)
        if (checkMissileToMissileCollision(missile, i, scene)) {
            continue;  // Missile was destroyed, skip alien collision check
        }

        // Check collision with barriers
        if (checkBarrierCollision(missile.position, 0.1, scene)) {
            scene.remove(missile);
            missiles.splice(i, 1);
            continue;
        }

        // Check collision with boss if in boss level
        if (isBossLevel) {
            if (checkBossCollision(missile, i, scene, scoreCallback)) {
                continue;  // Missile hit boss
            }
        } else {
            // Check collision with aliens
            checkMissileCollision(missile, i, scene, scoreCallback, gameOverCallback);
        }
    }
}

// Check missile collision with boss
function checkBossCollision(missile, missileIndex, scene, scoreCallback) {
    const boss = getCurrentBoss();
    if (!boss) return false;

    const distance = missile.position.distanceTo(boss.position);
    const hitRadius = getBossHitRadius();

    if (distance < hitRadius) {
        // Hit the boss!
        scene.remove(missile);
        missiles.splice(missileIndex, 1);

        // Damage boss and check if defeated
        const wasDefeated = damageBoss(1, scene);
        scoreCallback(50);  // Points per boss hit

        if (wasDefeated) {
            // Boss defeated - trigger level complete
            scoreCallback(1000);  // Bonus for defeating boss
            if (levelCompleteCallback) {
                // Small delay to let defeat animation play
                setTimeout(() => {
                    levelCompleteCallback();
                }, 1500);
            }
        }

        return true;
    }

    return false;
}

// Check missile collision with aliens
function checkMissileCollision(missile, missileIndex, scene, scoreCallback, gameOverCallback) {
    // First check collision with bonus UFO
    const bonusUFO = getBonusUFO();
    if (bonusUFO) {
        const distance = missile.position.distanceTo(bonusUFO.position);
        if (distance < 2.0) { // Larger collision radius for the bigger bonus UFO
            // Hit the bonus UFO!
            scene.remove(missile);
            missiles.splice(missileIndex, 1);

            // Big explosion effect
            createExplosion(bonusUFO.position, scene);
            playExplosion(1.5); // Louder explosion for bonus

            // Award 500 points
            scoreCallback(500);

            // Remove the bonus UFO
            removeBonusUFO(scene);

            return; // Early return, don't check regular aliens
        }
    }

    // Check collision with regular aliens
    const aliens = getAliens();
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;

        const distance = missile.position.distanceTo(alien.position);
        if (distance < 1.2) { // Increased collision radius from 1.0 to 1.2 for easier hits
            // Hit!
            scene.remove(missile);
            missiles.splice(missileIndex, 1);

            // Explosion effect
            createExplosion(alien.position, scene);
            playExplosion(1.0);

            // Update score (13 rows: row 0 = 60pts down to row 6, and every row
            // from 6 to 12 scores 0 — the formula clamps at zero)
            const points = Math.max(0, (6 - alien.userData.row) * 10);
            scoreCallback(points);

            // Remove alien
            removeAlien(alien, scene);

            // Check win condition - trigger level complete instead of game over
            if (getAliens().length === 0) {
                if (levelCompleteCallback) {
                    levelCompleteCallback();
                } else {
                    // Fallback to game over if no callback set
                    gameOverCallback(true);
                }
            }

            break;
        }
    }
}

// Create tank missile with homing capabilities
function createTankMissile(position) {
    // Create aerial missile model with nose cone, body, and fins
    const group = new THREE.Group();

    // Nose cone (points toward +Z, direction of travel)
    const noseGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
    const noseMaterial = new THREE.MeshPhongMaterial({
        color: 0xff4400,
        emissive: 0xff4400,
        emissiveIntensity: 3.0,
        flatShading: true
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.rotation.x = Math.PI / 2;  // Point nose toward +Z
    nose.position.z = 0.35;  // Nose at front
    group.add(nose);

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Fins
    const finGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.2);
    const finMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2.0,
        flatShading: true
    });

    // 4 fins in cross pattern
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        const angle = (i / 4) * Math.PI * 2;
        fin.position.x = Math.cos(angle) * 0.12;
        fin.position.y = Math.sin(angle) * 0.12;
        fin.position.z = -0.2;  // Fins toward rear
        fin.rotation.z = angle;
        group.add(fin);
    }

    // Engine glow (at rear)
    const engineGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 6);
    const engineMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 5.0,
        flatShading: true
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.rotation.x = Math.PI / 2;
    engine.position.z = -0.3;  // Engine at back
    group.add(engine);

    group.position.copy(position);
    group.position.y = 0;

    // Mark as tank missile for special behavior
    group.userData.isTankMissile = true;
    group.userData.lastTrailTime = Date.now();
    // Add inaccuracy - 75% miss rate with smaller offset
    group.userData.targetOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 8,  // Reduced from 15 to 8 for better gameplay
        0,
        0
    );

    return group;
}

// Create Beetle web bomb - slower projectile that creates danger zone
function createWebBombMissile(position) {
    const group = new THREE.Group();

    // Main web glob - sticky greenish appearance
    const globGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const globMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ff44,
        emissive: 0x44aa22,
        emissiveIntensity: 2.0,
        flatShading: true,
        transparent: true,
        opacity: 0.9
    });
    const glob = new THREE.Mesh(globGeometry, globMaterial);
    group.add(glob);

    // Inner core - brighter
    const coreGeometry = new THREE.SphereGeometry(0.12, 6, 6);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xccff88,
        emissive: 0xaaff44,
        emissiveIntensity: 4.0
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    // Dripping strands effect (4 hanging strands)
    const strandMaterial = new THREE.MeshPhongMaterial({
        color: 0x66cc33,
        emissive: 0x44aa22,
        emissiveIntensity: 1.5,
        flatShading: true
    });

    group.userData.strands = [];
    for (let i = 0; i < 4; i++) {
        const strand = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.3, 0.05),
            strandMaterial
        );
        const angle = (i / 4) * Math.PI * 2;
        strand.position.set(
            Math.cos(angle) * 0.15,
            -0.25,
            Math.sin(angle) * 0.15
        );
        strand.userData.baseY = -0.25;
        strand.userData.phase = i * (Math.PI / 2);
        group.add(strand);
        group.userData.strands.push(strand);
    }

    group.position.copy(position);
    group.position.y = 0;

    // Mark as web bomb for special behavior
    group.userData.isWebBomb = true;
    group.userData.speed = 0.15; // Slower than regular missiles
    group.userData.wobbleOffset = Math.random() * Math.PI * 2;

    return group;
}

// Create web zone (danger area left by web bomb)
function createWebZone(position, scene) {
    const group = new THREE.Group();

    // Main web pattern - flat disc on the ground plane
    const webGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.05, 8);
    const webMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ff44,
        emissive: 0x44aa22,
        emissiveIntensity: 2.5,
        flatShading: true,
        transparent: true,
        opacity: 0.7
    });
    const web = new THREE.Mesh(webGeometry, webMaterial);
    group.add(web);

    // Web strands radiating outward
    const strandMaterial = new THREE.MeshPhongMaterial({
        color: 0x66cc33,
        emissive: 0x44aa22,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.8
    });

    for (let i = 0; i < 8; i++) {
        const strand = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 1.2),
            strandMaterial
        );
        strand.rotation.y = (i / 8) * Math.PI * 2;
        strand.position.y = 0.03;
        group.add(strand);
    }

    // Center glow
    const centerGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const centerMaterial = new THREE.MeshPhongMaterial({
        color: 0xccff88,
        emissive: 0xaaff44,
        emissiveIntensity: 4.0,
        transparent: true,
        opacity: 0.9
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.1;
    group.add(center);

    group.position.set(position.x, 0, position.z);

    // Zone properties
    group.userData.isWebZone = true;
    group.userData.createdAt = Date.now();
    group.userData.duration = 2500; // 2.5 seconds
    group.userData.radius = 1.5;

    webZones.push(group);
    scene.add(group);

    return group;
}

// Create Invader blaster bolt - fast straight-shooting projectile
function createBlasterBolt(position) {
    const group = new THREE.Group();

    // Main bolt body - elongated bright red/white core
    const boltGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.6);
    const boltMaterial = new THREE.MeshPhongMaterial({
        color: 0xff2222,
        emissive: 0xff2222,
        emissiveIntensity: 5.0,
        flatShading: true
    });
    const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
    group.add(bolt);

    // Inner white-hot core
    const coreGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.5);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffaaaa,
        emissiveIntensity: 6.0
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    // Front tip - brighter point
    const tipGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.15);
    const tipMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 8.0
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.z = 0.35;
    group.add(tip);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z += 0.8; // Start from cannon tip

    // Blaster bolt properties
    group.userData.isBlasterBolt = true;
    group.userData.speed = 0.4; // Fast - faster than regular missiles
    group.userData.createdAt = Date.now();

    return group;
}

// Create Wasp needle - compact amber projectile with a bright stinger core
function createWaspNeedle(position) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.10, 0.48),
        new THREE.MeshPhongMaterial({
            color: 0xff9d16,
            emissive: 0xff7a00,
            emissiveIntensity: 5.0,
            flatShading: true
        })
    );
    group.add(body);

    const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.34),
        new THREE.MeshPhongMaterial({
            color: 0xffffc0,
            emissive: 0xffe066,
            emissiveIntensity: 8.0,
            flatShading: true
        })
    );
    group.add(core);

    const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, 0.12),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xfff2a8,
            emissiveIntensity: 9.0,
            flatShading: true
        })
    );
    tip.position.z = 0.28;
    group.add(tip);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z += 0.78;
    group.userData.isWaspNeedle = true;
    group.userData.speed = 0.46;
    group.userData.createdAt = Date.now();

    return group;
}

// ---------------------------------------------------------------------------
// Sentinel prism lance — fired as a diverging three-shot fan, so the Sentinel
// denies a cone of the play area rather than a single lane
// ---------------------------------------------------------------------------

function createPrismLance(position, driftX) {
    const group = new THREE.Group();

    const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.09, 0.9),
        new THREE.MeshPhongMaterial({
            color: 0x9fd8ff,
            emissive: 0x6fe0ff,
            emissiveIntensity: 5.0,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            flatShading: true
        })
    );
    group.add(shaft);

    const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 1.1),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xd6f4ff,
            emissiveIntensity: 9.0,
            flatShading: true
        })
    );
    group.add(core);

    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 8.0,
            flatShading: true
        })
    );
    head.position.z = 0.5;
    group.add(head);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z += 0.6;

    group.userData.isPrismLance = true;
    group.userData.speed = 0.42;
    group.userData.driftX = driftX;   // constant lateral drift gives the fan
    group.userData.createdAt = Date.now();

    // Point the lance along its actual heading so the fan reads as a spread
    group.rotation.y = -Math.atan2(driftX, group.userData.speed);

    return group;
}

// ---------------------------------------------------------------------------
// Warden halo wave — an expanding hollow ring. Every other alien projectile is
// dodged by moving away from it; this one is dodged by being in its hole or
// outside its rim, so the safe ground is both the centre line and the far
// edges, and standing at the wrong radius is what kills you.
// ---------------------------------------------------------------------------

const HALO_BAND = 0.55;      // half-thickness of the lethal rim, in world units
const HALO_MAX_RADIUS = 3.4;

function createHaloWave(position) {
    const group = new THREE.Group();

    // Built at radius 1.0 and centred on the origin, so scaling the group
    // expands the ring about its own centre rather than sliding it sideways.
    const steps = 14;
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const rim = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.16, 0.16),
            new THREE.MeshPhongMaterial({
                color: i % 3 === 0 ? 0xffc94a : 0xd77aa0,
                emissive: i % 3 === 0 ? 0xffe9a8 : 0xc2568f,
                emissiveIntensity: 5.5,
                transparent: true,
                opacity: 0.92,
                depthWrite: false,
                flatShading: true
            })
        );
        rim.position.set(Math.cos(a), Math.sin(a), 0);
        rim.rotation.z = a + Math.PI / 2;
        group.add(rim);
    }

    group.position.copy(position);
    group.position.y = 0;       // play happens on the y = 0 plane
    group.position.z += 0.7;    // clear the firing alien's own hitbox

    group.userData.isHaloWave = true;
    group.userData.speed = 0.30;
    group.userData.radius = 0.45;
    group.userData.growth = 0.055;
    group.userData.createdAt = Date.now();

    group.scale.set(0.45, 0.45, 1);

    return group;
}

// ---------------------------------------------------------------------------
// Scorpion venom dart — mortar arc: launches upward, then dives toward player
// ---------------------------------------------------------------------------

function createVenomDart(position) {
    const group = new THREE.Group();

    // Glowing amber warhead — larger and brighter than a standard missile
    const warheadGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const warheadMaterial = new THREE.MeshPhongMaterial({
        color: 0xcc8800,
        emissive: 0xffaa00,
        emissiveIntensity: 5.0,
        flatShading: true
    });
    const warhead = new THREE.Mesh(warheadGeometry, warheadMaterial);
    group.add(warhead);

    // Inner core
    const coreGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xffcc44,
        emissive: 0xffdd44,
        emissiveIntensity: 8.0
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.z = 0.12;
    group.add(core);

    group.position.copy(position);
    group.position.y = -0.1;

    // Velocity — shoots upward initially, then arcs down toward player.
    // Horizontal homing computed here with a slight random spread.
    const spread = (Math.random() - 0.5) * 0.3;

    group.userData.isVenomDart = true;
    group.userData.speed = 0.28;
    group.userData.upwardSpeed = 0.05 + Math.random() * 0.03; // upward component
    group.userData.homingX = spread;
    group.userData.maxHeight = 3 + Math.random() * 2.5; // peak altitude
    group.userData.hasPeaked = false;

    return group;
}

// ---------------------------------------------------------------------------
// Gyre vortex bolt — corkscrews around a descending axis on a widening helix.
// Every other alien projectile occupies one lane the whole way down, so it is
// dodged by leaving that lane. This one sweeps a corridor that opens as it
// travels, and it is only over any given point for part of each turn: the dodge
// is a matter of timing rather than of position.
// ---------------------------------------------------------------------------

const VORTEX_MAX_RADIUS = 1.05;   // half-width of the corridor, once fully open
const VORTEX_FLARE = 0.0142;      // world units per frame the helix widens
const VORTEX_SPIN = 0.0867;       // radians per frame the bolt winds
const VORTEX_Y_SQUASH = 0.45;     // keeps the helix near the y = 0 play plane

function createVortexBolt(position) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.13, 0.40),
        new THREE.MeshPhongMaterial({
            color: 0xb79cf0,
            emissive: 0x9d7fdc,
            emissiveIntensity: 5.0,
            flatShading: true
        })
    );
    group.add(body);

    const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.14),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffe7b8,
            emissiveIntensity: 9.0,
            flatShading: true
        })
    );
    tip.position.z = 0.24;      // offset on the mesh, not baked in the geometry
    group.add(tip);

    // Vanes make the roll readable — without them a symmetrical bolt spinning
    // about its own axis looks stationary.
    [-1, 1].forEach(side => {
        const vane = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 0.05, 0.12),
            new THREE.MeshPhongMaterial({
                color: 0xdb9ccc,
                emissive: 0xdb9ccc,
                emissiveIntensity: 4.2,
                transparent: true,
                opacity: 0.9,
                flatShading: true
            })
        );
        vane.position.set(side * 0.14, 0, -0.10);
        group.add(vane);
    });

    group.position.copy(position);
    group.position.y = 0;       // play happens on the y = 0 plane
    group.position.z += 0.8;    // clear the firing alien's own hitbox

    group.userData.isVortexBolt = true;
    group.userData.speed = 0.34;
    group.userData.axisX = position.x;                       // the axis it winds around
    // Angle and radius accumulate per frame, like the halo wave's radius, so the
    // helix stays in step with the per-frame +Z march. Driving the wind off
    // wall-clock age instead would tighten the corkscrew whenever the frame rate
    // dropped, since only the Z advance would slow down.
    group.userData.angle = Math.random() * Math.PI * 2;
    group.userData.radius = 0;
    group.userData.dir = Math.random() < 0.5 ? -1 : 1;       // handedness
    group.userData.createdAt = Date.now();

    return group;
}

// ---------------------------------------------------------------------------
// Mantis ambush spur — a two-phase *speed* profile. Every other projectile in
// the game holds one speed for its whole flight (the venom dart is two-phase in
// height, not speed). This one drifts in slower than anything else, coils
// almost to a standstill at a fixed distance, then lunges. The tell is the
// coil: the danger is not where it is, it is when it stops.
// ---------------------------------------------------------------------------

const SPUR_STALK_SPEED = 0.16;
const SPUR_LUNGE_SPEED = 0.46;
const SPUR_TRIGGER_GAP = 9.0;    // world units ahead of the player it coils at
const SPUR_COIL_FRAMES = 14;     // ~0.23s of telegraph before the lunge

function createAmbushSpur(position) {
    const group = new THREE.Group();

    const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.11, 0.42),
        new THREE.MeshPhongMaterial({
            color: 0xc2c98a,
            emissive: 0x8fa04e,
            emissiveIntensity: 4.2,
            flatShading: true
        })
    );
    group.add(shaft);

    const barb = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, 0.16),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0x6ff5e0,
            emissiveIntensity: 7.0,
            flatShading: true
        })
    );
    barb.position.z = 0.26;      // offset on the mesh, not baked in the geometry
    group.add(barb);

    // Backward-swept flukes, so the rear-up during the coil is readable.
    [-1, 1].forEach(side => {
        const fluke = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.04, 0.12),
            new THREE.MeshPhongMaterial({
                color: 0x5d7033,
                emissive: 0x6ff5e0,
                emissiveIntensity: 3.0,
                transparent: true,
                opacity: 0.9,
                flatShading: true
            })
        );
        fluke.position.set(side * 0.11, 0, -0.16);
        fluke.rotation.z = side * 0.35;
        group.add(fluke);
    });

    group.position.copy(position);
    group.position.y = 0;        // play happens on the y = 0 plane
    group.position.z += 0.8;     // clear the firing alien's own hitbox

    group.userData.isAmbushSpur = true;
    group.userData.speed = SPUR_STALK_SPEED;
    group.userData.coil = 0;
    group.userData.hasLunged = false;
    group.userData.createdAt = Date.now();

    return group;
}

// Aliens fire missiles
export function alienFire(scene) {
    const aliens = getAliens();
    if (aliens.length === 0) return;

    // Randomly select 1-3 aliens to fire
    const fireCount = Math.min(Math.floor(Math.random() * 3) + 1, aliens.length);

    for (let i = 0; i < fireCount; i++) {
        const randomAlien = aliens[Math.floor(Math.random() * aliens.length)];
        if (randomAlien && !randomAlien.userData.destroyed) {
            let missile;

            // Tank aliens (row 4) fire special homing missiles
            if (randomAlien.userData.row === 4) {
                missile = createTankMissile(randomAlien.position);
            } else if (randomAlien.userData.row === 5) {
                // Beetle aliens fire web bombs
                missile = createWebBombMissile(randomAlien.position);
                webBombs.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 6) {
                // Invader aliens fire fast blaster bolts
                missile = createBlasterBolt(randomAlien.position);
                blasterBolts.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 7) {
                // Scorpion aliens fire venom darts — mortar arc toward player
                missile = createVenomDart(randomAlien.position);
                venomDarts.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 8) {
                // Wasp aliens fire fast amber needles
                missile = createWaspNeedle(randomAlien.position);
                waspNeedles.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 9) {
                // Sentinel aliens discharge a diverging three-lance fan
                [-0.085, 0, 0.085].forEach(drift => {
                    const lance = createPrismLance(randomAlien.position, drift);
                    prismLances.push(lance);
                    scene.add(lance);
                });
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 10) {
                // Warden aliens launch an expanding halo wave
                missile = createHaloWave(randomAlien.position);
                haloWaves.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 11) {
                // Gyre aliens spit a corkscrewing vortex bolt
                missile = createVortexBolt(randomAlien.position);
                vortexBolts.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 12) {
                // Mantis aliens loose an ambush spur that stalks, then lunges
                missile = createAmbushSpur(randomAlien.position);
                ambushSpurs.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
            } else {
                // Regular missiles for other aliens
                const missileGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.4);  // Elongated in Z to point forward
                const missileMaterial = new THREE.MeshPhongMaterial({
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 4.0
                });
                missile = new THREE.Mesh(missileGeometry, missileMaterial);

                missile.position.copy(randomAlien.position);
                missile.position.y = 0;  // Same Y plane as targets
            }

            alienMissiles.push(missile);
            scene.add(missile);
        }
    }
}

// Create UFO smart missile
function createUFOMissile(position) {
    const group = new THREE.Group();

    // Large glowing sphere warhead (2-3x normal missile size)
    const warheadGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const warheadMaterial = new THREE.MeshPhongMaterial({
        color: 0xff4400,
        emissive: 0xff4400,
        emissiveIntensity: 5.0,
        flatShading: true
    });
    const warhead = new THREE.Mesh(warheadGeometry, warheadMaterial);
    group.add(warhead);

    // Inner core (brighter)
    const coreGeometry = new THREE.SphereGeometry(0.25, 12, 12);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 8.0
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    group.position.copy(position);
    group.position.y = 0;

    // Mark as UFO missile
    group.userData.isUFOMissile = true;
    group.userData.lastTrailTime = Date.now();
    group.userData.speed = 0.2; // Configurable speed

    return group;
}

// Fire UFO missile (callback from bonus-ufo.js)
function fireUFOMissile(ufoPosition, scene) {
    const missile = createUFOMissile(ufoPosition);
    ufoMissiles.push(missile);
    scene.add(missile);

    // Play launch sound
    playUFOMissileLaunch();
}

// Update UFO missiles
export function updateUFOMissiles(player, scene, gameActive, livesCallback, gameOverCallback) {
    const particles = getParticles();

    for (let i = ufoMissiles.length - 1; i >= 0; i--) {
        const missile = ufoMissiles[i];

        // Track player's X position
        const targetX = player.position.x;
        const currentX = missile.position.x;
        const diffX = targetX - currentX;

        // Smoothly adjust X position toward player (homing behavior)
        const trackingSpeed = 0.08; // How quickly it tracks
        missile.position.x += diffX * trackingSpeed;

        // Move forward toward player (increase Z)
        missile.position.z += missile.userData.speed;

        // Pulsing warhead animation
        const time = Date.now() * 0.005;
        const pulseScale = 1.0 + Math.sin(time * 5) * 0.15;
        missile.children[0].scale.set(pulseScale, pulseScale, pulseScale);
        missile.children[1].scale.set(pulseScale, pulseScale, pulseScale);

        // Create particle trail
        const currentTime = Date.now();
        if (currentTime - missile.userData.lastTrailTime > 30) {
            missile.userData.lastTrailTime = currentTime;

            // Create multiple trail particles for thick trail
            for (let j = 0; j < 3; j++) {
                const trailGeometry = new THREE.SphereGeometry(0.15, 8, 8);
                const trailMaterial = new THREE.MeshPhongMaterial({
                    color: 0xff6600,
                    emissive: 0xff6600,
                    emissiveIntensity: 4.0,
                    transparent: true
                });
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);

                trail.position.copy(missile.position);
                trail.position.x += (Math.random() - 0.5) * 0.3;
                trail.position.y += (Math.random() - 0.5) * 0.3;
                trail.position.z -= 0.3 - j * 0.15;

                trail.userData = {
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.03,
                        (Math.random() - 0.5) * 0.03,
                        -0.05
                    ),
                    life: 0.8,
                    rotationSpeed: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1
                    )
                };

                particles.push(trail);
                scene.add(trail);
            }
        }

        // Check collision with barriers
        if (checkBarrierCollision(missile.position, 0.4, scene)) {
            // Create shrapnel explosion
            createShrapnelExplosion(missile.position, scene, gameActive, livesCallback, gameOverCallback);

            // Remove missile
            scene.remove(missile);
            ufoMissiles.splice(i, 1);
            continue;
        }

        // Auto-detonate at Z = 8 (just in front of player)
        if (missile.position.z >= 8) {
            // Create shrapnel explosion
            createShrapnelExplosion(missile.position, scene, gameActive, livesCallback, gameOverCallback);

            // Remove missile
            scene.remove(missile);
            ufoMissiles.splice(i, 1);
        }
    }
}

// Update alien missiles
export function updateAlienMissiles(player, scene, gameActive, livesCallback, gameOverCallback) {
    const particles = getParticles();

    for (let i = alienMissiles.length - 1; i >= 0; i--) {
        const missile = alienMissiles[i];

        // Tank missiles have homing behavior
        if (missile.userData.isTankMissile) {
            // Check if missile has passed the player
            if (!missile.userData.hasPassed && missile.position.z > player.position.z) {
                missile.userData.hasPassed = true;
                missile.userData.passedTime = Date.now();
            }

            // Only track player if missile hasn't passed yet
            if (!missile.userData.hasPassed) {
                // Track player's current position with offset for inaccuracy
                // Blend 70% tracking with 30% random offset for realistic homing
                const targetX = player.position.x * 0.7 + missile.userData.targetOffset.x * 0.3;
                const targetPos = new THREE.Vector3(
                    targetX,
                    player.position.y,
                    player.position.z
                );

                // Calculate desired angle to target
                const direction = new THREE.Vector3();
                direction.subVectors(targetPos, missile.position).normalize();
                const targetAngle = Math.atan2(direction.x, direction.z);  // Angle for nose pointing at +Z

                // Slowly rotate toward target (turn rate)
                let angleDiff = targetAngle - missile.rotation.y;

                // Normalize angle difference to -PI to PI range
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Limit maximum turn angle to 25 degrees (0.4363 radians) from current heading
                const maxTurnAngle = 25 * Math.PI / 180;  // 25 degrees
                if (Math.abs(angleDiff) > maxTurnAngle) {
                    // If target is beyond max turn angle, stop tracking and continue straight
                    angleDiff = 0;
                } else {
                    // Apply turn rate (limited to 0.03 radians per frame for dodge-ability)
                    const turnRate = 0.03;  // Reduced from 0.05 to make missiles easier to dodge
                    missile.rotation.y += Math.max(-turnRate, Math.min(turnRate, angleDiff));
                }
            }

            // Move missile forward in the direction it's currently facing (nose leads)
            const moveSpeed = 0.15;  // Reduced from 0.25 for better dodge-ability
            missile.position.x += Math.sin(missile.rotation.y) * moveSpeed;
            missile.position.z += Math.cos(missile.rotation.y) * moveSpeed;

            // If missile passed player more than 2 seconds ago, explode it
            if (missile.userData.hasPassed && Date.now() - missile.userData.passedTime > 2000) {
                createExplosion(missile.position, scene);
                scene.remove(missile);
                alienMissiles.splice(i, 1);
                continue;
            }

            // Create particle trail
            const currentTime = Date.now();
            if (currentTime - missile.userData.lastTrailTime > 50) {  // Every 50ms
                missile.userData.lastTrailTime = currentTime;

                // Create trail particle at engine position
                const trailGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
                const trailMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffaa00,
                    emissive: 0xffaa00,
                    emissiveIntensity: 4.0,
                    transparent: true
                });
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);

                // Position at back of missile (rear engine)
                // Calculate engine position based on missile rotation
                const engineOffsetZ = -0.3;
                trail.position.copy(missile.position);
                trail.position.x += Math.sin(missile.rotation.y) * engineOffsetZ;
                trail.position.z += Math.cos(missile.rotation.y) * engineOffsetZ;

                trail.userData = {
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.05,
                        (Math.random() - 0.5) * 0.05,
                        (Math.random() - 0.5) * 0.05
                    ),
                    life: 0.6,
                    rotationSpeed: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.15,
                        (Math.random() - 0.5) * 0.15,
                        (Math.random() - 0.5) * 0.15
                    )
                };

                particles.push(trail);
                scene.add(trail);
            }
        } else {
            // Regular missiles just move straight
            missile.position.z += 0.3;
        }

        // Remove if off screen
        if (missile.position.z > 20) {
            scene.remove(missile);
            alienMissiles.splice(i, 1);
            continue;
        }

        // Check collision with barriers
        if (checkBarrierCollision(missile.position, 0.15, scene)) {
            createExplosion(missile.position, scene);
            scene.remove(missile);
            alienMissiles.splice(i, 1);
            continue;
        }

        // Check collision with player (only if game is active)
        if (gameActive) {
            const distance = missile.position.distanceTo(player.position);
            if (distance < 1.5) {
                // Hit!
                scene.remove(missile);
                alienMissiles.splice(i, 1);

                // Create explosion at player
                createExplosion(missile.position, scene);
                playExplosion(1.5);  // Extra loud for player hits!

                // Decrease lives
                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// Update web bombs and web zones
export function updateWebBombs(player, scene, gameActive, livesCallback, gameOverCallback) {
    const currentTime = Date.now();

    // Update web bombs in flight
    for (let i = webBombs.length - 1; i >= 0; i--) {
        const bomb = webBombs[i];
        const time = currentTime * 0.001 + bomb.userData.wobbleOffset;

        // Move forward (slower than regular missiles)
        bomb.position.z += bomb.userData.speed;

        // Wobble animation
        bomb.rotation.x = Math.sin(time * 4) * 0.3;
        bomb.rotation.z = Math.sin(time * 3) * 0.2;

        // Pulsing scale
        const pulseScale = 1 + Math.sin(time * 5) * 0.1;
        bomb.scale.set(pulseScale, pulseScale, pulseScale);

        // Animate dripping strands
        if (bomb.userData.strands) {
            bomb.userData.strands.forEach((strand) => {
                strand.position.y = strand.userData.baseY + Math.sin(time * 6 + strand.userData.phase) * 0.08;
                strand.scale.y = 1 + Math.sin(time * 4 + strand.userData.phase) * 0.3;
            });
        }

        // Check collision with barriers
        if (checkBarrierCollision(bomb.position, 0.25, scene)) {
            createExplosion(bomb.position, scene);
            scene.remove(bomb);
            webBombs.splice(i, 1);
            continue;
        }

        // Create web zone when reaching player area (Z >= 9)
        if (bomb.position.z >= 9) {
            createWebZone(bomb.position, scene);
            scene.remove(bomb);
            webBombs.splice(i, 1);
            continue;
        }

        // Remove if way off screen
        if (bomb.position.z > 20) {
            scene.remove(bomb);
            webBombs.splice(i, 1);
        }
    }

    // Update web zones
    for (let i = webZones.length - 1; i >= 0; i--) {
        const zone = webZones[i];
        const elapsed = currentTime - zone.userData.createdAt;
        const progress = elapsed / zone.userData.duration;

        // Fade out over time
        const opacity = Math.max(0, 1 - progress);
        zone.children.forEach(child => {
            if (child.material.transparent) {
                child.material.opacity = opacity * (child.material === zone.children[0].material ? 0.7 : 0.9);
            }
        });

        // Pulsing animation
        const time = currentTime * 0.003;
        const pulseScale = 1 + Math.sin(time * 4) * 0.05;
        zone.scale.set(pulseScale, 1, pulseScale);

        // Rotate strands
        zone.rotation.y = time * 0.5;

        // Check player collision with zone (only if game is active)
        if (gameActive && progress < 1) {
            const dx = player.position.x - zone.position.x;
            const dz = player.position.z - zone.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < zone.userData.radius) {
                // Player caught in web!
                createExplosion(player.position, scene);
                playExplosion(1.5);

                // Remove the zone that hit the player
                scene.remove(zone);
                webZones.splice(i, 1);

                // Decrease lives
                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
                continue;
            }
        }

        // Remove expired zones
        if (progress >= 1) {
            scene.remove(zone);
            webZones.splice(i, 1);
        }
    }
}

// Update blaster bolts (Invader weapon)
export function updateBlasterBolts(player, scene, gameActive, livesCallback, gameOverCallback) {
    for (let i = blasterBolts.length - 1; i >= 0; i--) {
        const bolt = blasterBolts[i];

        // Move fast and straight toward player
        bolt.position.z += bolt.userData.speed;

        // Pulsing glow animation
        const time = Date.now() * 0.01;
        const pulseScale = 1 + Math.sin(time * 10) * 0.15;
        bolt.scale.set(1, 1, pulseScale);

        // Check collision with barriers
        if (checkBarrierCollision(bolt.position, 0.15, scene)) {
            createExplosion(bolt.position, scene);
            scene.remove(bolt);
            blasterBolts.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (bolt.position.z > 20) {
            scene.remove(bolt);
            blasterBolts.splice(i, 1);
            continue;
        }

        // Check collision with player (only if game is active)
        if (gameActive) {
            const distance = bolt.position.distanceTo(player.position);
            if (distance < 1.2) {
                // Hit!
                scene.remove(bolt);
                blasterBolts.splice(i, 1);

                // Create explosion at player
                createExplosion(bolt.position, scene);
                playExplosion(1.3);

                // Decrease lives
                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Scorpion venom darts — mortar arc: launches upward, then dives toward player
// ---------------------------------------------------------------------------

export function updateVenomDarts(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = venomDarts.length - 1; i >= 0; i--) {
        const dart = venomDarts[i];

        // Phase 1 — upward acceleration; Phase 2 — gravity + homing X toward player
        if (!dart.userData.hasPeaked) {
            dart.position.z += dart.userData.speed;
            dart.position.y += dart.userData.upwardSpeed;
            dart.position.x += dart.userData.homingX * 0.02;
        } else {
            // Gravity curves the descent
            dart.position.z += dart.userData.speed * 1.1;
            dart.position.y -= (dart.userData.upwardSpeed * 1.8);
            dart.position.x += dart.userData.homingX * 0.03;
        }

        // Rotate to match flight direction (tells player it's coming from above)
        dart.rotation.x = time * 12;
        dart.rotation.z = time * 9;

        // Pulsing amber glow
        const pulse = 1 + Math.sin(time * 8) * 0.12;
        dart.scale.set(pulse, pulse, pulse);

        // Check if peak reached (start coming down)
        if (dart.position.y >= dart.userData.maxHeight) {
            dart.userData.hasPeaked = true;
        }

        // Barriers
        if (checkBarrierCollision(dart.position, 0.2, scene)) {
            createExplosion(dart.position, scene);
            scene.remove(dart);
            venomDarts.splice(i, 1);
            continue;
        }

        // Off screen — removed after reaching player area
        if (dart.position.z > 20 || dart.position.y < -5) {
            scene.remove(dart);
            venomDarts.splice(i, 1);
            continue;
        }

        // Player collision
        if (gameActive) {
            const distance = dart.position.distanceTo(player.position);
            if (distance < 1.3) {
                scene.remove(dart);
                venomDarts.splice(i, 1);

                createExplosion(dart.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// Update Wasp needles (Wasp weapon)
export function updateWaspNeedles(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = waspNeedles.length - 1; i >= 0; i--) {
        const needle = waspNeedles[i];

        needle.position.z += needle.userData.speed;
        needle.rotation.x = time * 14;
        needle.rotation.z = time * 10;

        const pulse = 1 + Math.sin(time * 12) * 0.12;
        needle.scale.set(pulse, pulse, 1 + (pulse - 1) * 0.4);

        if (checkBarrierCollision(needle.position, 0.14, scene)) {
            createExplosion(needle.position, scene);
            scene.remove(needle);
            waspNeedles.splice(i, 1);
            continue;
        }

        if (needle.position.z > 20) {
            scene.remove(needle);
            waspNeedles.splice(i, 1);
            continue;
        }

        if (gameActive) {
            const distance = needle.position.distanceTo(player.position);
            if (distance < 1.2) {
                scene.remove(needle);
                waspNeedles.splice(i, 1);

                createExplosion(needle.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// Update Sentinel prism lances (Sentinel weapon)
export function updatePrismLances(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = prismLances.length - 1; i >= 0; i--) {
        const lance = prismLances[i];

        lance.position.z += lance.userData.speed;
        lance.position.x += lance.userData.driftX;
        lance.rotation.z = time * 16;

        const shimmer = 1 + Math.sin(time * 22 + i) * 0.18;
        lance.scale.set(shimmer, shimmer, 1);

        if (checkBarrierCollision(lance.position, 0.16, scene)) {
            createExplosion(lance.position, scene);
            scene.remove(lance);
            prismLances.splice(i, 1);
            continue;
        }

        if (lance.position.z > 20 || Math.abs(lance.position.x) > 26) {
            scene.remove(lance);
            prismLances.splice(i, 1);
            continue;
        }

        if (gameActive) {
            const distance = lance.position.distanceTo(player.position);
            if (distance < 1.2) {
                scene.remove(lance);
                prismLances.splice(i, 1);

                createExplosion(lance.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// Update Warden halo waves (Warden weapon)
export function updateHaloWaves(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = haloWaves.length - 1; i >= 0; i--) {
        const wave = haloWaves[i];

        wave.position.z += wave.userData.speed;
        wave.userData.radius = Math.min(
            HALO_MAX_RADIUS,
            wave.userData.radius + wave.userData.growth
        );

        const r = wave.userData.radius;
        wave.scale.set(r, r, 1);
        wave.rotation.z = time * 1.4;

        // Sample the rim at four points rather than the centre: the middle of a
        // halo wave is empty, so a centre-point test would never touch anything.
        let hitBarrier = false;
        for (let k = 0; k < 4 && !hitBarrier; k++) {
            const a = (k / 4) * Math.PI * 2;
            const probe = new THREE.Vector3(
                wave.position.x + Math.cos(a) * r,
                0,
                wave.position.z
            );
            if (checkBarrierCollision(probe, 0.3, scene)) {
                createExplosion(probe, scene);
                hitBarrier = true;
            }
        }
        if (hitBarrier) {
            scene.remove(wave);
            haloWaves.splice(i, 1);
            continue;
        }

        if (wave.position.z > 20) {
            scene.remove(wave);
            haloWaves.splice(i, 1);
            continue;
        }

        if (gameActive) {
            // Annulus test: lethal only near the rim. Being close to the centre
            // line or well outside the ring is safe, which is the whole point.
            const dz = Math.abs(wave.position.z - player.position.z);
            if (dz < 0.7) {
                const dx = Math.abs(player.position.x - wave.position.x);
                if (Math.abs(dx - r) < HALO_BAND) {
                    scene.remove(wave);
                    haloWaves.splice(i, 1);

                    createExplosion(player.position, scene);
                    playExplosion(1.3);

                    const newLives = livesCallback();
                    if (newLives <= 0) {
                        gameOverCallback(false);
                    }
                }
            }
        }
    }
}

// Update vortex bolts (Gyre weapon)
export function updateVortexBolts(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = vortexBolts.length - 1; i >= 0; i--) {
        const bolt = vortexBolts[i];

        // The axis marches straight down the lane; the bolt itself winds around
        // it on a helix that opens out as it travels.
        bolt.userData.radius = Math.min(VORTEX_MAX_RADIUS, bolt.userData.radius + VORTEX_FLARE);
        bolt.userData.angle += VORTEX_SPIN * bolt.userData.dir;

        const radius = bolt.userData.radius;
        const angle = bolt.userData.angle;

        bolt.position.z += bolt.userData.speed;
        bolt.position.x = bolt.userData.axisX + Math.cos(angle) * radius;
        bolt.position.y = Math.sin(angle) * radius * VORTEX_Y_SQUASH;
        bolt.rotation.z = angle;
        bolt.rotation.x = time * 9;

        if (checkBarrierCollision(bolt.position, 0.15, scene)) {
            createExplosion(bolt.position, scene);
            scene.remove(bolt);
            vortexBolts.splice(i, 1);
            continue;
        }

        if (bolt.position.z > 20) {
            scene.remove(bolt);
            vortexBolts.splice(i, 1);
            continue;
        }

        if (gameActive) {
            if (bolt.position.distanceTo(player.position) < 1.2) {
                scene.remove(bolt);
                vortexBolts.splice(i, 1);

                createExplosion(bolt.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// Update ambush spurs (Mantis weapon)
export function updateAmbushSpurs(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = ambushSpurs.length - 1; i >= 0; i--) {
        const spur = ambushSpurs[i];

        // Phase 1: a slow drift. Phase 2: a coil that brakes almost to nothing
        // at a fixed distance from the ship. Phase 3: the lunge.
        if (!spur.userData.hasLunged && player.position.z - spur.position.z < SPUR_TRIGGER_GAP) {
            spur.userData.coil++;
            if (spur.userData.coil >= SPUR_COIL_FRAMES) {
                spur.userData.hasLunged = true;
                spur.userData.speed = SPUR_LUNGE_SPEED;
            } else {
                spur.userData.speed =
                    SPUR_STALK_SPEED * (1 - spur.userData.coil / SPUR_COIL_FRAMES);
            }
        }

        spur.position.z += spur.userData.speed;

        // Rears back while coiling and snaps flat on the lunge, so the tell is
        // visible from the ship rather than only in the speed change.
        const coilAmount = spur.userData.hasLunged
            ? 0
            : spur.userData.coil / SPUR_COIL_FRAMES;
        spur.rotation.x = -coilAmount * 0.9;
        spur.rotation.z = spur.userData.hasLunged ? time * 16 : time * 1.6;
        spur.scale.set(1, 1, 1 + (spur.userData.hasLunged ? 0.6 : coilAmount * -0.25));

        if (checkBarrierCollision(spur.position, 0.15, scene)) {
            createExplosion(spur.position, scene);
            scene.remove(spur);
            ambushSpurs.splice(i, 1);
            continue;
        }

        if (spur.position.z > 20) {
            scene.remove(spur);
            ambushSpurs.splice(i, 1);
            continue;
        }

        if (gameActive) {
            if (spur.position.distanceTo(player.position) < 1.2) {
                scene.remove(spur);
                ambushSpurs.splice(i, 1);

                createExplosion(spur.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// Check if aliens should fire
export function checkAlienFire(scene) {
    const currentTime = Date.now();
    if (currentTime - lastAlienFireTime > 1500) {  // Fire every 1.5 seconds
        alienFire(scene);
        lastAlienFireTime = currentTime;
    }
}

// Reset missiles for new game
export function resetMissiles(scene) {
    missiles.forEach(missile => scene.remove(missile));
    alienMissiles.forEach(missile => scene.remove(missile));
    ufoMissiles.forEach(missile => scene.remove(missile));
    webBombs.forEach(bomb => scene.remove(bomb));
    webZones.forEach(zone => scene.remove(zone));
    blasterBolts.forEach(bolt => scene.remove(bolt));
    venomDarts.forEach(dart => scene.remove(dart));
    waspNeedles.forEach(needle => scene.remove(needle));
    prismLances.forEach(lance => scene.remove(lance));
    haloWaves.forEach(wave => scene.remove(wave));
    vortexBolts.forEach(bolt => scene.remove(bolt));
    ambushSpurs.forEach(spur => scene.remove(spur));
    missiles = [];
    alienMissiles = [];
    ufoMissiles = [];
    webBombs = [];
    webZones = [];
    blasterBolts = [];
    venomDarts = [];
    waspNeedles = [];
    prismLances = [];
    haloWaves = [];
    vortexBolts = [];
    ambushSpurs = [];
    lastAlienFireTime = 0;
}

// Get missile arrays
export function getMissiles() {
    return { missiles, alienMissiles, ufoMissiles, webBombs, webZones, blasterBolts, waspNeedles, prismLances, haloWaves, vortexBolts, ambushSpurs };
}
