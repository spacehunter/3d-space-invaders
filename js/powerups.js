import * as THREE from 'three';
import { createBarriers } from './barriers.js';

let powerUps = [];
let activePowerUp = null;
let powerUpTimer = 0;

// Power-Up Types
export const POWERUP_TYPES = {
    RAPID_FIRE: 'RAPID_FIRE',
    SPREAD_SHOT: 'SPREAD_SHOT',
    BARRIER_REPAIR: 'BARRIER_REPAIR'
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
    } else {
        type = POWERUP_TYPES.BARRIER_REPAIR;
        color = 0x00ff00; // Green
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
            activatePowerUp(powerUp.userData.type, scene);

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
function activatePowerUp(type, scene) {
    console.log("Activated power-up:", type);

    if (type === POWERUP_TYPES.BARRIER_REPAIR) {
        // Instant effect
        createBarriers(scene);
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

// Reset power-ups
export function resetPowerUps(scene) {
    powerUps.forEach(p => scene.remove(p));
    powerUps = [];
    activePowerUp = null;
}
