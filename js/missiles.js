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
let crystalShards = [];
let serpentineBeams = [];
let fractalSpores = [];
let ravenNeedles = [];
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

            // Update score (15 rows: row 0 = 60pts down to row 14 = 0pts)
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

// Create Spire crystal shard projectile - diamond-shaped shard that tumbles
function createSpireShard(position) {
    const group = new THREE.Group();

    // --- faceted crystal body ---
    // Build an elongated diamond (octahedron with stretched z) from 8 triangular faces.
    // Each pair of opposite faces gets a different vertex colour to give a crystal
    // colour ramp — deep amethyst → gold → amber → white core.
    const h = 0.18; // half-length along z
    const r = 0.14; // half-width along x/y in the middle
    const rEnd = 0.04; // half-width at the pointed ends

    const pos = [
        // front+back tips
        [ 0,  0, -h], [ 0,  0,  h],
        // middle ring — 4 vertices
        [ r,  0,  0], [ 0,  r,  0], [-r,  0,  0], [ 0, -r,  0]
    ];
    // 8 faces: 4 pointing toward -z, 4 toward +z
    const faces = [
        [0,4,5], [0,5,6], [0,6,7], [0,7,4],   // -z half
        [1,5,4], [1,6,5], [1,7,6], [1,4,7]    // +z half
    ];
    const colRamp = [0x8B3FC9, 0xA855F7, 0xDAA520, 0xFFD700, 0xFFF2CC];

    const vertPositions = [];
    const vertColors    = [];
    const vertNormals   = [];

    for (const f of faces) {
        const v0 = pos[f[0]], v1 = pos[f[1]], v2 = pos[f[2]];
        // face normal (cross product)
        const ex = v1[0]-v0[0], ey = v1[1]-v0[1], ez = v1[2]-v0[2];
        const fx = v2[0]-v0[0], fy = v2[1]-v0[1], fz = v2[2]-v0[2];
        let nx = ey*fz - ez*fy, ny = ez*fx - ex*fz, nz = ex*fy - ey*fx;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        nx /= len; ny /= len; nz /= len;

        // pick colour from ramp based on face index in array (0-7)
        const ci = Math.min(Math.floor(f[0] / 2), colRamp.length - 1);
        const c   = new THREE.Color(colRamp[ci]);
        for (const v of [v0, v1, v2]) {
            vertPositions.push(v[0], v[1], v[2]);
            vertColors.push(c.r, c.g, c.b);
            vertNormals.push(nx, ny, nz);
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertPositions, 3));
    geom.setAttribute('color',    new THREE.Float32BufferAttribute(vertColors, 3));
    geom.setAttribute('normal',   new THREE.Float32BufferAttribute(vertNormals, 3));
    geom.computeBoundingSphere();

    const bodyMat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        emissive: 0xff9900,
        emissiveIntensity: 2.5,
        flatShading: true,
        shininess: 120,
        transparent: true,
        opacity: 0.92
    });
    const body = new THREE.Mesh(geom, bodyMat);
    group.add(body);

    // Inner glow core — small bright diamond
    const coreGeom = new THREE.BufferGeometry();
    const cPos = [0, 0, -0.06,  0.03, 0, 0,  0, 0.03, 0,  0, -0.03, 0];
    const cCol = [1, 1, 1,  1, 1, 1,  1, 1, 1,  1, 1, 1];
    coreGeom.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
    coreGeom.setAttribute('color',    new THREE.Float32BufferAttribute(cCol, 3));
    coreGeom.computeBoundingSphere();
    const coreMat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        emissive: 0xffffff,
        emissiveIntensity: 6.0,
        flatShading: true,
        transparent: true,
        opacity: 0.8
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    group.add(core);
    group.userData.coreMesh = core;
    group.userData.bodyMesh = body;

    group.position.copy(position);
    group.position.y = 0;
    group.position.z += 0.78;
    group.userData.isSpireShard = true;
    group.userData.speed = 0.35;
    group.userData.createdAt = Date.now();

    // Per-shard random tumbling — delta-based, not absolute-time
    const angleDeg = Math.random() * 360;
    const rad = angleDeg * Math.PI / 180;
    group.userData.rotXSpeed = (0.8 + Math.random() * 2.4) * (Math.random() < 0.5 ? -1 : 1);
    group.userData.rotYSpeed = (1.2 + Math.random() * 2.8) * (Math.random() < 0.5 ? -1 : 1);
    group.userData.rotZSpeed = (0.5 + Math.random() * 1.6) * (Math.random() < 0.5 ? -1 : 1);
    group.userData.lastTime = Date.now();
    group.userData.shimmerTimer = Math.random() * 1000; // stagger shimmer bursts

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
                // Spire aliens fire crystal shards in a V-pattern — 3 diverging shards
                const left = createSpireShard(randomAlien.position);
                left.userData.driftX = -0.35;
                crystalShards.push(left);
                scene.add(left);
                const center = createSpireShard(randomAlien.position);
                center.userData.driftX = 0;
                crystalShards.push(center);
                scene.add(center);
                const right = createSpireShard(randomAlien.position);
                right.userData.driftX = 0.35;
                crystalShards.push(right);
                scene.add(right);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 12) {
                // Prism aliens fire a single serpentine beam — sinusoidal wave
                const beam = createSerpentineBeam(randomAlien.position);
                serpentineBeams.push(beam);
                scene.add(beam);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 13) {
                // Voidworm aliens fire fractal spores — split mid-flight into 3
                const spore = createVoidwormSpore(randomAlien.position);
                fractalSpores.push(spore);
                scene.add(spore);
                continue; // Skip adding to alienMissiles
            } else if (randomAlien.userData.row === 14) {
                // Raven aliens fire accelerating zigzag needles
                missile = createRavenNeedle(randomAlien.position);
                ravenNeedles.push(missile);
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

// Update Spire crystal shards (Spire weapon)
export function updateSpireShards(player, scene, gameActive, livesCallback, gameOverCallback) {
    const particles = getParticles();

    for (let i = crystalShards.length - 1; i >= 0; i--) {
        const p = crystalShards[i];

        // --- delta-based tumbling (no absolute-time jitter) ---
        const now = Date.now();
        const dt = (now - p.userData.lastTime) / 1000; // seconds
        p.userData.lastTime = now;

        p.rotation.x += p.userData.rotXSpeed * dt;
        p.rotation.y += p.userData.rotYSpeed * dt;
        p.rotation.z += p.userData.rotZSpeed * dt;

        // --- flight model: drift + forward ---
        p.position.z += p.userData.speed;
        p.position.x += (p.userData.driftX || 0);

        // --- brief shimmer burst on core every ~600ms (not steady glow) ---
        p.userData.shimmerTimer += dt * 1000;
        const shimmerPeriod = 600;
        const burstDuration = 120; // ms
        const elapsed = p.userData.shimmerTimer % shimmerPeriod;
        if (p.userData.bodyMesh && p.userData.coreMesh) {
            if (elapsed < burstDuration) {
                // Burst phase — bright core
                const intensity = 1.0 - (elapsed / burstDuration); // fade out during burst
                p.userData.coreMesh.material.emissiveIntensity = 6.0 + intensity * 8.0;
                p.userData.bodyMesh.material.emissiveIntensity = 2.5 + intensity * 3.0;
            } else {
                p.userData.coreMesh.material.emissiveIntensity = 6.0;
                p.userData.bodyMesh.material.emissiveIntensity = 2.5;
            }
        }

        // --- trail particles (spawn every 40ms) ---
        if (!p.userData.lastTrailTime || now - p.userData.lastTrailTime > 40) {
            p.userData.lastTrailTime = now;

            // Spawn 2-3 trail particles per crystal
            const trailColor = Math.random() < 0.5 ? 0xA855F7 : 0xFFD700; // purple or gold

            for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
                const trailGeom = new THREE.SphereGeometry(0.06, 6, 6);
                const trailMat = new THREE.MeshPhongMaterial({
                    color: trailColor,
                    emissive: trailColor,
                    emissiveIntensity: 3.5,
                    transparent: true,
                    opacity: 0.9
                });
                const trail = new THREE.Mesh(trailGeom, trailMat);

                trail.position.copy(p.position);
                trail.position.x += (Math.random() - 0.5) * 0.15;
                trail.position.y += (Math.random() - 0.5) * 0.15;
                trail.position.z += (Math.random() - 0.5) * 0.1;

                trail.userData = {
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.02,
                        (Math.random() - 0.5) * 0.02,
                        -p.userData.speed * 0.3 + (Math.random() - 0.5) * 0.05
                    ),
                    life: 0.6 + Math.random() * 0.3,
                    rotationSpeed: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.15,
                        (Math.random() - 0.5) * 0.15,
                        (Math.random() - 0.5) * 0.15
                    )
                };

                particles.push(trail);
                scene.add(trail);
            }
        }

        // --- barriers ---
        if (checkBarrierCollision(p.position, 0.14, scene)) {
            createExplosion(p.position, scene);
            scene.remove(p);
            crystalShards.splice(i, 1);
            continue;
        }

        // --- off-screen cleanup ---
        if (p.position.z > 20) {
            scene.remove(p);
            crystalShards.splice(i, 1);
            continue;
        }

        // --- player ---
        if (gameActive) {
            if (p.position.distanceTo(player.position) < 1.2) {
                scene.remove(p);
                crystalShards.splice(i, 1);

                createExplosion(p.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Prism serpentine beam — travels in a sinusoidal wave
// ---------------------------------------------------------------------------

function createSerpentineBeam(position) {
    const group = new THREE.Group();

    // Elongated crystal beam — wider and longer than standard missile
    const bodyGeom = new THREE.BoxGeometry(0.08, 0.08, 0.60);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0xcc99ff,
        emissive: 0x9966dd,
        emissiveIntensity: 3.5,
        flatShading: true,
        transparent: true,
        opacity: 0.95
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    // Core glow — white bright centre
    const coreGeom = new THREE.BoxGeometry(0.04, 0.04, 0.50);
    const coreMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 5.0,
        transparent: true,
        opacity: 0.7,
        flatShading: true
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    group.add(core);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z += 0.78;
    group.userData.isSerpentineBeam = true;
    group.userData.speed = 0.32;
    group.userData.waveAmplitude = 0.08 + Math.random() * 0.04; // lateral drift range
    group.userData.waveFrequency = 4.0 + Math.random() * 2.0;   // wave cycles per second
    group.userData.createdAt = Date.now();
    group.userData.lastTrailTime = 0;

    return group;
}

// Create Voidworm fractal spore — splits into 3 after 0.6s
function createVoidwormSpore(position) {
    const group = new THREE.Group();

    // Main spore body — small faceted crystal
    const bodyGeom = new THREE.BoxGeometry(0.08, 0.08, 0.20);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0xc8a0ff,
        emissive: 0x9b6dcf,
        emissiveIntensity: 4.5,
        flatShading: true
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z += 0.78;
    group.userData.isFractalSpore = true;
    group.userData.speed = 0.35;
    group.userData.splitTimer = 0;
    group.userData.hasSplit = false;

    return group;
}

// Create Raven needle — accelerating zigzag projectile
function createRavenNeedle(position) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.32),
        new THREE.MeshPhongMaterial({
            color: 0x7a7a9a, emissive: 0x5a5a7a,
            emissiveIntensity: 5.0, flatShading: true
        })
    );
    group.add(body);

    const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.08),
        new THREE.MeshPhongMaterial({
            color: 0xffffff, emissive: 0x9a9aba,
            emissiveIntensity: 8.0, flatShading: true
        })
    );
    tip.position.z = 0.18;
    group.add(tip);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z += 0.78;
    group.userData.isRavenNeedle = true;
    group.userData.speed = 0.15;
    group.userData.zigzagPhase = Math.random() * Math.PI * 2;
    group.userData.zigzagSpeed = 6.0 + Math.random() * 3.0;
    group.userData.createdAt = Date.now();

    return group;
}

// Update Raven needles — accelerating zigzag flight
export function updateRavenNeedles(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = ravenNeedles.length - 1; i >= 0; i--) {
        const n = ravenNeedles[i];

        // Accelerate from 0.15 to 0.42 over 2 seconds of flight
        const age = (Date.now() - n.userData.createdAt) / 1000;
        n.userData.speed = 0.15 + Math.min(age * 0.135, 0.27); // cap at 0.42

        // Zigzag lateral drift
        n.position.x += Math.sin(time * n.userData.zigzagSpeed + n.userData.zigzagPhase) * 0.012;

        // Flight forward (+Z)
        n.position.z += n.userData.speed;

        // Spin the needle
        n.rotation.x = time * 10.0;
        n.rotation.y = time * 7.0;

        // --- barriers ---
        if (checkBarrierCollision(n.position, 0.12, scene)) {
            createExplosion(n.position, scene);
            scene.remove(n);
            ravenNeedles.splice(i, 1);
            continue;
        }

        // --- off-screen cleanup ---
        if (n.position.z > 20) {
            scene.remove(n);
            ravenNeedles.splice(i, 1);
            continue;
        }

        // --- player ---
        if (gameActive) {
            if (n.position.distanceTo(player.position) < 1.2) {
                scene.remove(n);
                ravenNeedles.splice(i, 1);

                createExplosion(n.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

// Update Voidworm fractal spores — split into 3 sub-projectiles mid-flight
export function updateVoidwormSpores(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = fractalSpores.length - 1; i >= 0; i--) {
        const spore = fractalSpores[i];

        // Advance timer each frame
        spore.userData.splitTimer += 0.016; // approx 60fps delta

        // Split after 0.6 seconds into 3 diverging projectiles
        if (!spore.userData.hasSplit && spore.userData.splitTimer >= 0.6) {
            spore.userData.hasSplit = true;
            scene.remove(spore);
            fractalSpores.splice(i, 1);

            // Spawn 3 sub-spores with diverging drift
            [-0.55, 0, 0.55].forEach((drift, j) => {
                const child = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.06, 0.16),
                    new THREE.MeshPhongMaterial({
                        color: 0xe8d0ff,
                        emissive: 0xc8a0ff,
                        emissiveIntensity: 5.0,
                        flatShading: true
                    })
                );
                child.position.copy(spore.position);
                child.userData.isFractalSporeSub = true;
                child.userData.speed = 0.42;
                child.userData.driftX = drift;
                child.userData.createdAt = Date.now();
                fractalSpores.push(child);
                scene.add(child);
            });
            continue;
        }

        // If this is a sub-spore, apply lateral drift
        if (spore.userData.isFractalSporeSub) {
            spore.position.x += spore.userData.driftX * 0.016;
        } else {
            // Main spore drift — slight wobble
            spore.position.x += Math.sin(time * 5.0 + i) * 0.002;
        }

        // Flight forward (+Z)
        spore.position.z += spore.userData.speed;

        // Spin the crystal
        spore.rotation.x = time * 6.0;
        spore.rotation.y = time * 4.0;

        // --- barriers ---
        if (checkBarrierCollision(spore.position, 0.14, scene)) {
            createExplosion(spore.position, scene);
            scene.remove(spore);
            fractalSpores.splice(i, 1);
            continue;
        }

        // --- off-screen cleanup ---
        if (spore.position.z > 20) {
            scene.remove(spore);
            fractalSpores.splice(i, 1);
            continue;
        }

        // --- player collision ---
        if (gameActive) {
            if (spore.position.distanceTo(player.position) < 1.2) {
                scene.remove(spore);
                fractalSpores.splice(i, 1);

                createExplosion(spore.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}

export function updateSerpentineBeams(player, scene, gameActive, livesCallback, gameOverCallback) {
    const particles = getParticles();

    for (let i = serpentineBeams.length - 1; i >= 0; i--) {
        const beam = serpentineBeams[i];

        // Sinusoidal lateral drift (serpentine flight)
        const t = (Date.now() * 0.001) + beam.userData.createdAt;
        beam.position.x += Math.sin(t * beam.userData.waveFrequency) * beam.userData.waveAmplitude;

        // Forward motion
        beam.position.z += beam.userData.speed;

        // Gentle body tilt following the wave slope
        beam.rotation.z = Math.cos(t * beam.userData.waveFrequency) * 0.25;
        beam.rotation.y = Math.sin(t * beam.userData.waveFrequency * 0.5) * 0.15;

        // Core shimmer burst every ~500ms
        beam.userData.shimmerTimer = (beam.userData.shimmerTimer || 0) + 16;
        if (beam.userData.shimmerTimer > 500) {
            beam.userData.shimmerTimer = 0;
            beam.userData.shimmerPulse = 1.0;
        }
        if (beam.userData.shimmerPulse > 0) {
            beam.userData.shimmerPulse -= 0.05;
            beam.children.forEach(c => {
                if (c.material.emissiveIntensity !== undefined) {
                    c.material.emissiveIntensity = (c === beam.children[0] ? 3.5 : 5.0) + beam.userData.shimmerPulse * 3.0;
                }
            });
        } else {
            beam.children.forEach(c => {
                if (c.material.emissiveIntensity !== undefined) {
                    c.material.emissiveIntensity = c === beam.children[0] ? 3.5 : 5.0;
                }
            });
        }

        // Trail particles every ~60ms
        const now = Date.now();
        if (!beam.userData.lastTrailTime || now - beam.userData.lastTrailTime > 60) {
            beam.userData.lastTrailTime = now;
            const trailGeom = new THREE.SphereGeometry(0.04, 4, 4);
            const trailColor = Math.random() < 0.5 ? 0x9966dd : 0xcc99ff;
            const trailMat = new THREE.MeshPhongMaterial({
                color: trailColor,
                emissive: trailColor,
                emissiveIntensity: 2.0,
                transparent: true,
                opacity: 0.7,
                flatShading: true
            });
            const trail = new THREE.Mesh(trailGeom, trailMat);
            trail.position.copy(beam.position);
            trail.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.03,
                    (Math.random() - 0.5) * 0.03,
                    -beam.userData.speed * 0.2
                ),
                life: 0.4 + Math.random() * 0.2
            };
            particles.push(trail);
            scene.add(trail);
        }

        // --- barriers ---
        if (checkBarrierCollision(beam.position, 0.12, scene)) {
            createExplosion(beam.position, scene);
            scene.remove(beam);
            serpentineBeams.splice(i, 1);
            continue;
        }

        // --- off-screen cleanup ---
        if (beam.position.z > 20) {
            scene.remove(beam);
            serpentineBeams.splice(i, 1);
            continue;
        }

        // --- player collision ---
        if (gameActive) {
            if (beam.position.distanceTo(player.position) < 1.2) {
                scene.remove(beam);
                serpentineBeams.splice(i, 1);
                createExplosion(beam.position, scene);
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
    crystalShards.forEach(shard => scene.remove(shard));
    serpentineBeams.forEach(beam => scene.remove(beam));
    fractalSpores.forEach(spore => scene.remove(spore));
    ravenNeedles.forEach(needle => scene.remove(needle));
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
    crystalShards = [];
    serpentineBeams = [];
    fractalSpores = [];
    ravenNeedles = [];
    lastAlienFireTime = 0;
}

// Get missile arrays
export function getMissiles() {
    return { missiles, alienMissiles, ufoMissiles, webBombs, webZones, blasterBolts, waspNeedles, prismLances, haloWaves, crystalShards, serpentineBeams, fractalSpores, ravenNeedles };
}
