import * as THREE from 'three';
import { MISSILE_SPEED } from './constants.js';
import { playMissileFire } from './audio.js';
import { createExplosion, getParticles } from './particles.js';
import { playExplosion } from './audio.js';
import { getAliens, removeAlien } from './aliens.js';

let missiles = [];
let alienMissiles = [];
let lastAlienFireTime = 0;

// Fire a player missile
export function fireMissile(player, scene) {
    const missileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);  // Elongated in Z to point forward
    const missileMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 4.0
    });
    const missile = new THREE.Mesh(missileGeometry, missileMaterial);

    missile.position.copy(player.position);
    missile.position.y = 0;  // Same Y plane as targets
    missile.position.z -= 1;

    missiles.push(missile);
    scene.add(missile);
    playMissileFire();
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
export function updateMissiles(scene, scoreCallback, gameOverCallback) {
    for (let i = missiles.length - 1; i >= 0; i--) {
        const missile = missiles[i];
        missile.position.z -= MISSILE_SPEED;

        // Remove if off screen
        if (missile.position.z < -30) {
            scene.remove(missile);
            missiles.splice(i, 1);
            continue;
        }

        // Check collision with alien missiles first (defensive play)
        if (checkMissileToMissileCollision(missile, i, scene)) {
            continue;  // Missile was destroyed, skip alien collision check
        }

        // Check collision with aliens
        checkMissileCollision(missile, i, scene, scoreCallback, gameOverCallback);
    }
}

// Check missile collision with aliens
function checkMissileCollision(missile, missileIndex, scene, scoreCallback, gameOverCallback) {
    const aliens = getAliens();
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;

        const distance = missile.position.distanceTo(alien.position);
        if (distance < 1) {
            // Hit!
            scene.remove(missile);
            missiles.splice(missileIndex, 1);

            // Explosion effect
            createExplosion(alien.position, scene);
            playExplosion(1.0);

            // Update score
            const points = (5 - alien.userData.row) * 10;
            scoreCallback(points);

            // Remove alien
            removeAlien(alien, scene);

            // Check win condition
            if (getAliens().length === 0) {
                gameOverCallback(true);
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
    missiles = [];
    alienMissiles = [];
    lastAlienFireTime = 0;
}

// Get missile arrays
export function getMissiles() {
    return { missiles, alienMissiles };
}
