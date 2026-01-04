import * as THREE from 'three';
import { MISSILE_SPEED } from './constants.js';
import { playMissileFire, playUFOMissileLaunch, playPlasmaFire, playScatterFire, playHomingFire, playRailgunFire, playNovaFire } from './audio.js';
import { createExplosion, createShrapnelExplosion, getParticles } from './particles.js';
import { playExplosion } from './audio.js';
import { getAliens, removeAlien } from './aliens.js';
import { getBonusUFO, removeBonusUFO, setUFOMissileFireCallback } from './bonus-ufo.js';
import { checkBarrierCollision } from './barriers.js';
import { getCurrentBoss, damageBoss, getBossHitRadius } from './boss.js';

import { getActivePowerUp, POWERUP_TYPES } from './powerups.js';
import { getCurrentWeaponConfig, WEAPONS } from './weapons.js';

let missiles = [];
let alienMissiles = [];
let ufoMissiles = [];
let webBombs = [];
let webZones = [];
let blasterBolts = [];
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

// Fire a player missile based on current weapon
export function fireMissile(player, scene) {
    const now = Date.now();
    const activePowerUp = getActivePowerUp();
    const weapon = getCurrentWeaponConfig();

    // Determine fire rate from weapon, modified by power-up
    let fireDelay = weapon.fireRate;
    if (activePowerUp === POWERUP_TYPES.RAPID_FIRE) {
        fireDelay = Math.floor(weapon.fireRate * 0.25); // 75% faster
    }

    // Check cooldown
    if (now - lastPlayerFireTime < fireDelay) {
        return;
    }
    lastPlayerFireTime = now;

    // Calculate projectile count (weapon base + spread shot bonus)
    let projectileCount = weapon.projectileCount;
    let extraSpread = 0;
    if (activePowerUp === POWERUP_TYPES.SPREAD_SHOT) {
        projectileCount += 2;
        extraSpread = 0.15; // Add extra spread angle when power-up active
    }

    // Fire based on weapon type
    switch (weapon.special) {
        case 'piercing':
            firePiercingShot(player, scene, weapon, projectileCount, extraSpread);
            playPlasmaFire();
            break;
        case 'homing':
            fireHomingMissiles(player, scene, weapon, projectileCount);
            playHomingFire();
            break;
        case 'instant':
            fireRailgun(player, scene, weapon);
            playRailgunFire();
            break;
        case 'aoe':
            fireNovaBurst(player, scene, weapon);
            playNovaFire();
            break;
        default:
            fireStandardShots(player, scene, weapon, projectileCount, extraSpread);
            if (weapon.id === 'SCATTER_CANNON') {
                playScatterFire();
            } else {
                playMissileFire();
            }
    }
}

// Fire standard projectile shots (Pulse, Twin, Scatter)
function fireStandardShots(player, scene, weapon, projectileCount, extraSpread) {
    const baseSpread = weapon.spread + extraSpread;

    if (projectileCount === 1) {
        // Single shot
        createWeaponMissile(player.position, 0, scene, weapon);
    } else if (weapon.projectileSpacing > 0) {
        // Parallel shots (Twin Blasters style)
        const spacing = weapon.projectileSpacing;
        const halfCount = Math.floor(projectileCount / 2);

        for (let i = 0; i < projectileCount; i++) {
            const offset = (i - halfCount) * spacing + (projectileCount % 2 === 0 ? spacing / 2 : 0);
            createWeaponMissile(player.position, 0, scene, weapon, offset);
        }
    } else {
        // Spread shots (Scatter Cannon style)
        const angleStep = baseSpread / (projectileCount - 1);
        const startAngle = -baseSpread / 2;

        for (let i = 0; i < projectileCount; i++) {
            const angle = startAngle + (angleStep * i);
            createWeaponMissile(player.position, angle, scene, weapon);
        }
    }
}

// Fire piercing plasma shots
function firePiercingShot(player, scene, weapon, projectileCount, extraSpread) {
    if (projectileCount === 1) {
        createPlasmaMissile(player.position, 0, scene, weapon);
    } else {
        const spread = 0.2 + extraSpread;
        const angleStep = spread / (projectileCount - 1);
        const startAngle = -spread / 2;

        for (let i = 0; i < projectileCount; i++) {
            const angle = startAngle + (angleStep * i);
            createPlasmaMissile(player.position, angle, scene, weapon);
        }
    }
}

// Fire homing missiles
function fireHomingMissiles(player, scene, weapon, projectileCount) {
    for (let i = 0; i < projectileCount; i++) {
        createHomingMissile(player.position, scene, weapon, i * 0.1);
    }
}

// Fire railgun instant beam
function fireRailgun(player, scene, weapon) {
    // Create visual beam effect
    createRailgunBeamEffect(player, scene, weapon);

    // Instant hit detection along the beam path
    const beamStart = player.position.clone();
    beamStart.z -= 1;

    // Check all aliens in a line
    const aliens = getAliens();
    const hitAliens = [];

    for (const alien of aliens) {
        if (alien.userData.destroyed) continue;

        // Check if alien is roughly in line with player (X within threshold)
        if (Math.abs(alien.position.x - player.position.x) < 1.5) {
            // Check if alien is in front of player
            if (alien.position.z < player.position.z) {
                hitAliens.push(alien);
            }
        }
    }

    // Damage all aliens hit by the beam
    for (const alien of hitAliens) {
        createExplosion(alien.position, scene);
        playExplosion(0.8);

        const points = (6 - alien.userData.row) * 10 * weapon.damage;
        // Score callback will be handled by game.js
        removeAlien(alien, scene);
    }

    // Check boss hit
    const boss = getCurrentBoss();
    if (boss) {
        if (Math.abs(boss.position.x - player.position.x) < getBossHitRadius()) {
            damageBoss(weapon.damage, scene);
            createExplosion(boss.position, scene);
        }
    }

    // Check bonus UFO
    const bonusUFO = getBonusUFO();
    if (bonusUFO) {
        if (Math.abs(bonusUFO.position.x - player.position.x) < 2.0) {
            createExplosion(bonusUFO.position, scene);
            playExplosion(1.5);
            removeBonusUFO(scene);
        }
    }
}

// Fire nova burst AOE
function fireNovaBurst(player, scene, weapon) {
    // Create expanding shockwave visual
    createNovaExplosionEffect(player.position, scene, weapon);

    // Damage all enemies within AOE radius
    const aliens = getAliens();
    const hitAliens = [];

    for (const alien of aliens) {
        if (alien.userData.destroyed) continue;

        const distance = player.position.distanceTo(alien.position);
        if (distance < weapon.aoeRadius) {
            hitAliens.push(alien);
        }
    }

    // Damage and remove hit aliens
    for (const alien of hitAliens) {
        createExplosion(alien.position, scene);
        playExplosion(0.6);
        removeAlien(alien, scene);
    }
}

// Helper to create a single missile (legacy - kept for compatibility)
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
        ),
        damage: 1
    };

    missiles.push(missile);
    scene.add(missile);
}

// Create weapon-based missile with custom color and properties
function createWeaponMissile(position, angleOffset, scene, weapon, xOffset = 0) {
    const missileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const missileMaterial = new THREE.MeshPhongMaterial({
        color: weapon.color,
        emissive: weapon.color,
        emissiveIntensity: weapon.emissiveIntensity
    });
    const missile = new THREE.Mesh(missileGeometry, missileMaterial);

    missile.position.copy(position);
    missile.position.x += xOffset;
    missile.position.y = 0;
    missile.position.z -= 1;

    if (angleOffset !== 0) {
        missile.rotation.y = angleOffset;
    }

    missile.userData = {
        velocity: new THREE.Vector3(
            Math.sin(angleOffset) * MISSILE_SPEED,
            0,
            -Math.cos(angleOffset) * MISSILE_SPEED
        ),
        damage: weapon.damage,
        weaponId: weapon.id
    };

    missiles.push(missile);
    scene.add(missile);
}

// Create piercing plasma missile
function createPlasmaMissile(position, angleOffset, scene, weapon) {
    const group = new THREE.Group();

    // Core plasma bolt
    const coreGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.8);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: weapon.color,
        emissive: weapon.color,
        emissiveIntensity: weapon.emissiveIntensity,
        transparent: true,
        opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    // Outer glow
    const glowGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.7);
    const glowMaterial = new THREE.MeshPhongMaterial({
        color: weapon.color,
        emissive: weapon.color,
        emissiveIntensity: weapon.emissiveIntensity * 0.5,
        transparent: true,
        opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z -= 1;

    if (angleOffset !== 0) {
        group.rotation.y = angleOffset;
    }

    group.userData = {
        velocity: new THREE.Vector3(
            Math.sin(angleOffset) * MISSILE_SPEED * 0.8,
            0,
            -Math.cos(angleOffset) * MISSILE_SPEED * 0.8
        ),
        damage: weapon.damage,
        weaponId: weapon.id,
        isPiercing: true,
        lastTrailTime: Date.now()
    };

    missiles.push(group);
    scene.add(group);
}

// Create player homing missile
function createHomingMissile(position, scene, weapon, delay = 0) {
    const group = new THREE.Group();

    // Missile body
    const bodyGeometry = new THREE.ConeGeometry(0.1, 0.5, 6);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: weapon.color,
        emissive: weapon.color,
        emissiveIntensity: weapon.emissiveIntensity
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = -Math.PI / 2;
    group.add(body);

    // Fins
    const finGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.15);
    const finMaterial = new THREE.MeshPhongMaterial({
        color: 0x00aa00,
        emissive: 0x00aa00,
        emissiveIntensity: 2.0
    });

    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        const angle = (i / 4) * Math.PI * 2;
        fin.position.x = Math.cos(angle) * 0.08;
        fin.position.y = Math.sin(angle) * 0.08;
        fin.position.z = 0.15;
        fin.rotation.z = angle;
        group.add(fin);
    }

    // Engine glow
    const engineGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const engineMaterial = new THREE.MeshPhongMaterial({
        color: 0x44ff44,
        emissive: 0x44ff44,
        emissiveIntensity: 6.0
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.z = 0.25;
    group.add(engine);

    group.position.copy(position);
    group.position.y = 0;
    group.position.z -= 1;

    group.userData = {
        velocity: new THREE.Vector3(0, 0, -MISSILE_SPEED * 0.7),
        damage: weapon.damage,
        weaponId: weapon.id,
        isHoming: true,
        target: null,
        launchTime: Date.now() + delay * 100,
        lastTrailTime: Date.now()
    };

    missiles.push(group);
    scene.add(group);
}

// Create railgun beam visual effect
function createRailgunBeamEffect(player, scene, weapon) {
    const beamLength = 70;

    // Main beam
    const beamGeometry = new THREE.BoxGeometry(0.3, 0.3, beamLength);
    const beamMaterial = new THREE.MeshPhongMaterial({
        color: weapon.color,
        emissive: weapon.color,
        emissiveIntensity: weapon.emissiveIntensity,
        transparent: true,
        opacity: 0.8
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);

    beam.position.copy(player.position);
    beam.position.z -= beamLength / 2;

    // Inner bright core
    const coreGeometry = new THREE.BoxGeometry(0.15, 0.15, beamLength);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 10.0,
        transparent: true,
        opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    beam.add(core);

    scene.add(beam);

    // Fade out and remove beam
    let opacity = 0.8;
    const fadeInterval = setInterval(() => {
        opacity -= 0.1;
        beamMaterial.opacity = opacity;
        coreMaterial.opacity = opacity + 0.1;

        if (opacity <= 0) {
            clearInterval(fadeInterval);
            scene.remove(beam);
        }
    }, 30);
}

// Create nova burst explosion effect
function createNovaExplosionEffect(position, scene, weapon) {
    const particles = getParticles();

    // Create expanding ring
    const ringGeometry = new THREE.RingGeometry(0.5, 1, 32);
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: weapon.color,
        emissive: weapon.color,
        emissiveIntensity: weapon.emissiveIntensity,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    // Animate ring expansion
    let scale = 1;
    let opacity = 1.0;
    const expandInterval = setInterval(() => {
        scale += 0.8;
        opacity -= 0.05;
        ring.scale.set(scale, scale, 1);
        ringMaterial.opacity = opacity;

        if (opacity <= 0) {
            clearInterval(expandInterval);
            scene.remove(ring);
        }
    }, 30);

    // Create burst particles
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: weapon.color,
            emissive: weapon.color,
            emissiveIntensity: weapon.emissiveIntensity,
            transparent: true
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(position);
        particle.userData = {
            velocity: new THREE.Vector3(
                Math.cos(angle) * 0.3,
                0.1,
                Math.sin(angle) * 0.3
            ),
            life: 1.0,
            rotationSpeed: new THREE.Vector3(0.1, 0.1, 0.1)
        };

        particles.push(particle);
        scene.add(particle);
    }
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
    const aliens = getAliens();
    const particles = getParticles();

    for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];
        const isPiercing = missile.userData.isPiercing;
        const isHoming = missile.userData.isHoming;

        // Homing missile behavior
        if (isHoming && Date.now() > missile.userData.launchTime) {
            // Find nearest target
            let nearestTarget = null;
            let nearestDistance = Infinity;

            for (const alien of aliens) {
                if (alien.userData.destroyed) continue;
                const distance = missile.position.distanceTo(alien.position);
                if (distance < nearestDistance && alien.position.z < missile.position.z) {
                    nearestDistance = distance;
                    nearestTarget = alien;
                }
            }

            // Also check boss
            const boss = getCurrentBoss();
            if (boss) {
                const bossDistance = missile.position.distanceTo(boss.position);
                if (bossDistance < nearestDistance) {
                    nearestTarget = boss;
                }
            }

            if (nearestTarget) {
                // Calculate direction to target
                const direction = new THREE.Vector3();
                direction.subVectors(nearestTarget.position, missile.position).normalize();

                // Smoothly adjust velocity toward target
                const turnRate = 0.08;
                missile.userData.velocity.x += (direction.x * MISSILE_SPEED * 0.7 - missile.userData.velocity.x) * turnRate;
                missile.userData.velocity.z += (direction.z * MISSILE_SPEED * 0.7 - missile.userData.velocity.z) * turnRate;

                // Point missile toward velocity direction
                missile.rotation.y = Math.atan2(missile.userData.velocity.x, -missile.userData.velocity.z);
            }

            // Create smoke trail for homing missiles
            const currentTime = Date.now();
            if (currentTime - missile.userData.lastTrailTime > 50) {
                missile.userData.lastTrailTime = currentTime;
                const trailGeometry = new THREE.SphereGeometry(0.06, 6, 6);
                const trailMaterial = new THREE.MeshPhongMaterial({
                    color: 0x88ff88,
                    emissive: 0x44aa44,
                    emissiveIntensity: 2.0,
                    transparent: true
                });
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);
                trail.position.copy(missile.position);
                trail.userData = {
                    velocity: new THREE.Vector3(0, 0.02, 0),
                    life: 0.5,
                    rotationSpeed: new THREE.Vector3(0, 0, 0)
                };
                particles.push(trail);
                scene.add(trail);
            }
        }

        // Create plasma trail for piercing missiles
        if (isPiercing) {
            const currentTime = Date.now();
            if (currentTime - missile.userData.lastTrailTime > 40) {
                missile.userData.lastTrailTime = currentTime;
                const trailGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
                const trailMaterial = new THREE.MeshPhongMaterial({
                    color: 0xff00ff,
                    emissive: 0xff00ff,
                    emissiveIntensity: 3.0,
                    transparent: true
                });
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);
                trail.position.copy(missile.position);
                trail.userData = {
                    velocity: new THREE.Vector3(0, 0, 0.02),
                    life: 0.4,
                    rotationSpeed: new THREE.Vector3(0.1, 0.1, 0.1)
                };
                particles.push(trail);
                scene.add(trail);
            }
        }

        // Move missile
        if (missile.userData.velocity) {
            missile.position.add(missile.userData.velocity);
        } else {
            missile.position.z -= MISSILE_SPEED;
        }

        // Smart Missile Logic: Climb if aligned with Bonus UFO (not for homing - they have their own logic)
        if (bonusUFO && !isHoming) {
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

        // Check collision with alien missiles first (defensive play) - piercing missiles don't intercept
        if (!isPiercing && checkMissileToMissileCollision(missile, i, scene)) {
            continue;  // Missile was destroyed, skip alien collision check
        }

        // Check collision with barriers - piercing missiles pass through
        if (!isPiercing && checkBarrierCollision(missile.position, 0.1, scene)) {
            scene.remove(missile);
            missiles.splice(i, 1);
            continue;
        }

        // Check collision with boss if in boss level
        if (isBossLevel) {
            if (checkBossCollision(missile, i, scene, scoreCallback, isPiercing)) {
                if (!isPiercing) continue;  // Piercing missiles continue after hitting
            }
        } else {
            // Check collision with aliens
            const wasDestroyed = checkMissileCollision(missile, i, scene, scoreCallback, gameOverCallback, isPiercing);
            if (wasDestroyed && !isPiercing) continue;
        }
    }
}

// Check missile collision with boss
function checkBossCollision(missile, missileIndex, scene, scoreCallback, isPiercing = false) {
    const boss = getCurrentBoss();
    if (!boss) return false;

    const distance = missile.position.distanceTo(boss.position);
    const hitRadius = getBossHitRadius();

    if (distance < hitRadius) {
        // Hit the boss!
        if (!isPiercing) {
            scene.remove(missile);
            missiles.splice(missileIndex, 1);
        }

        // Damage boss based on weapon damage
        const damage = missile.userData.damage || 1;
        const wasDefeated = damageBoss(damage, scene);
        scoreCallback(50 * damage);  // Points per boss hit, scaled by damage

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
function checkMissileCollision(missile, missileIndex, scene, scoreCallback, gameOverCallback, isPiercing = false) {
    let hitSomething = false;

    // First check collision with bonus UFO
    const bonusUFO = getBonusUFO();
    if (bonusUFO) {
        const distance = missile.position.distanceTo(bonusUFO.position);
        if (distance < 2.0) { // Larger collision radius for the bigger bonus UFO
            // Hit the bonus UFO!
            if (!isPiercing) {
                scene.remove(missile);
                missiles.splice(missileIndex, 1);
            }

            // Big explosion effect
            createExplosion(bonusUFO.position, scene);
            playExplosion(1.5); // Louder explosion for bonus

            // Award 500 points (scaled by damage)
            const damage = missile.userData.damage || 1;
            scoreCallback(500 * damage);

            // Remove the bonus UFO
            removeBonusUFO(scene);

            if (!isPiercing) return true; // Early return for non-piercing
            hitSomething = true;
        }
    }

    // Check collision with regular aliens
    const aliens = getAliens();
    const aliensToRemove = [];

    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;

        const distance = missile.position.distanceTo(alien.position);
        if (distance < 1.2) { // Increased collision radius from 1.0 to 1.2 for easier hits
            // Hit!
            aliensToRemove.push(alien);

            // For non-piercing missiles, only hit one target
            if (!isPiercing) break;
        }
    }

    // Process hits
    for (const alien of aliensToRemove) {
        // Explosion effect
        createExplosion(alien.position, scene);
        playExplosion(isPiercing ? 0.7 : 1.0);

        // Update score (6 rows: row 0 = 60pts down to row 5 = 10pts)
        const damage = missile.userData.damage || 1;
        const points = (6 - alien.userData.row) * 10 * damage;
        scoreCallback(points);

        // Remove alien
        removeAlien(alien, scene);
        hitSomething = true;
    }

    // Remove missile if not piercing and hit something
    if (hitSomething && !isPiercing) {
        scene.remove(missile);
        missiles.splice(missileIndex, 1);
    }

    // Check win condition - trigger level complete instead of game over
    if (getAliens().length === 0) {
        if (levelCompleteCallback) {
            levelCompleteCallback();
        } else {
            // Fallback to game over if no callback set
            gameOverCallback(true);
        }
    }

    return hitSomething;
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
    missiles = [];
    alienMissiles = [];
    ufoMissiles = [];
    webBombs = [];
    webZones = [];
    blasterBolts = [];
    lastAlienFireTime = 0;
}

// Get missile arrays
export function getMissiles() {
    return { missiles, alienMissiles, ufoMissiles, webBombs, webZones, blasterBolts };
}
