import * as THREE from 'three';
import { createBarriers } from './barriers.js';

let powerUps = [];
let activePowerUp = null;
let powerUpTimer = 0;

// Shield state
let shieldActive = false;
let shieldMesh = null;
let shieldPulsePhase = 0;

// Power-Up Types
export const POWERUP_TYPES = {
    RAPID_FIRE: 'RAPID_FIRE',
    SPREAD_SHOT: 'SPREAD_SHOT',
    BARRIER_REPAIR: 'BARRIER_REPAIR',
    SHIELD: 'SHIELD'
};

// Spawn a power-up at a position
export function spawnPowerUp(position, scene) {
    // Random type
    const rand = Math.random();
    let type;
    let color;

    if (rand < 0.4) {
        type = POWERUP_TYPES.RAPID_FIRE;
        color = 0xff0000; // Red
    } else if (rand < 0.8) {
        type = POWERUP_TYPES.SPREAD_SHOT;
        color = 0xffff00; // Yellow
    } else if (rand < 0.95) {
        type = POWERUP_TYPES.BARRIER_REPAIR;
        color = 0x00ff00; // Green
    } else {
        type = POWERUP_TYPES.SHIELD;
        color = 0x0088ff; // Blue
    }

    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    const powerUp = new THREE.Mesh(geometry, material);

    powerUp.position.copy(position);
    powerUp.userData = { type: type, rotationSpeed: Math.random() * 0.05 + 0.02 };

    scene.add(powerUp);
    powerUps.push(powerUp);
}

// Update power-ups (movement and collision)
export function updatePowerUps(scene, player) {
    // Update active power-up timer
    if (activePowerUp) {
        if (Date.now() > powerUpTimer) {
            activePowerUp = null;
            console.log("Power-up expired");
        }
    }

    // Animate shield dome if active
    if (shieldActive && shieldMesh) {
        shieldPulsePhase += 0.06;
        const pulse = 0.30 + Math.sin(shieldPulsePhase * 3) * 0.15;
        shieldMesh.material.opacity = pulse;
        shieldMesh.material.emissiveIntensity = 0.4 + Math.sin(shieldPulsePhase * 2) * 0.3;

        // Follow player
        if (player) {
            shieldMesh.position.x = player.position.x;
            shieldMesh.position.z = player.position.z;
            shieldMesh.position.y = player.position.y + 0.3;
        }
    }

    // Update dropped power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];

        // Move down
        powerUp.position.z += 0.1;

        // Rotate
        powerUp.rotation.x += powerUp.userData.rotationSpeed;
        powerUp.rotation.y += powerUp.userData.rotationSpeed;

        // Check collision with player
        const distance = powerUp.position.distanceTo(player.position);
        if (distance < 1.5) {
            activatePowerUp(powerUp.userData.type, scene, player);

            // Remove
            scene.remove(powerUp);
            powerUps.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (powerUp.position.z > 15) {
            scene.remove(powerUp);
            powerUps.splice(i, 1);
        }
    }
}

// Activate a power-up
function activatePowerUp(type, scene, player) {
    console.log("Activated power-up:", type);

    if (type === POWERUP_TYPES.BARRIER_REPAIR) {
        // Instant effect
        createBarriers(scene);
    } else if (type === POWERUP_TYPES.SHIELD) {
        // Shield: absorb next hit for 15 seconds, visual dome
        shieldActive = true;
        shieldPulsePhase = 0;
        powerUpTimer = Date.now() + 15000;
        // Create shield dome mesh
        if (player) {
            const shieldGeom = new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
            const shieldMat = new THREE.MeshPhongMaterial({
                color: 0x44aaff,
                emissive: 0x2266cc,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
            shieldMesh.position.copy(player.position);
            shieldMesh.position.y += 0.3;
            scene.add(shieldMesh);
        }
    } else {
        // Timed effect
        activePowerUp = type;
        powerUpTimer = Date.now() + 10000; // 10 seconds
    }
}

// Get current active power-up
export function getActivePowerUp() {
    return activePowerUp;
}

// Check if shield is active
export function isShieldActive() {
    return shieldActive;
}

// Consume shield (absorb one hit)
export function consumeShield() {
    if (!shieldActive) return false;
    shieldActive = false;
    if (shieldMesh && shieldMesh.parent) {
        shieldMesh.parent.remove(shieldMesh);
    }
    shieldMesh = null;
    return true;
}

// Get shield mesh for animation
export function getShieldMesh() {
    return shieldMesh;
}

// Reset power-ups
export function resetPowerUps(scene) {
    powerUps.forEach(p => scene.remove(p));
    powerUps = [];
    activePowerUp = null;
    if (shieldMesh && shieldMesh.parent) {
        shieldMesh.parent.remove(shieldMesh);
    }
    shieldMesh = null;
    shieldActive = false;
    shieldPulsePhase = 0;
}
