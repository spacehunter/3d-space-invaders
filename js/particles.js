import * as THREE from 'three';
import { playShrapnelExplosion } from './audio.js';
import { getPlayer } from './player.js';

let particles = [];
let shrapnelParticles = [];

// Create explosion effect at given position
export function createExplosion(position, scene) {
    const particleCount = 30;  // Increased from 20
    for (let i = 0; i < particleCount; i++) {
        const size = 0.2 + Math.random() * 0.3;  // Larger, varied sizes
        const geometry = new THREE.BoxGeometry(size, size, size);
        const color = Math.random() > 0.5 ? 0xff0000 : (Math.random() > 0.5 ? 0xffff00 : 0xff8800);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2.0  // Brighter
        });
        const particle = new THREE.Mesh(geometry, material);

        particle.position.copy(position);
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,  // Faster spread
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            ),
            life: 1.0,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            )
        };

        particles.push(particle);
        scene.add(particle);
    }
}

// Create shrapnel explosion from UFO missile
export function createShrapnelExplosion(position, scene, gameActive, livesCallback, gameOverCallback) {
    // Create large explosion (2x normal)
    const largeExplosionCount = 60;
    for (let i = 0; i < largeExplosionCount; i++) {
        const size = 0.3 + Math.random() * 0.5;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const color = Math.random() > 0.5 ? 0xff0000 : (Math.random() > 0.5 ? 0xffff00 : 0xff8800);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2.5
        });
        const particle = new THREE.Mesh(geometry, material);

        particle.position.copy(position);
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ),
            life: 1.0,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            )
        };

        particles.push(particle);
        scene.add(particle);
    }

    // Create 20-30 shrapnel particles
    const shrapnelCount = 20 + Math.floor(Math.random() * 11); // 20-30
    for (let i = 0; i < shrapnelCount; i++) {
        // Calculate angle for 360° circular spread
        const angle = (i / shrapnelCount) * Math.PI * 2;
        const speed = 0.15 + Math.random() * 0.1; // Vary speed slightly

        const shrapnelGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const shrapnelMaterial = new THREE.MeshPhongMaterial({
            color: 0xff2200,
            emissive: 0xff2200,
            emissiveIntensity: 3.0
        });
        const shrapnel = new THREE.Mesh(shrapnelGeometry, shrapnelMaterial);

        shrapnel.position.copy(position);
        shrapnel.userData = {
            velocity: new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed * 0.5 + Math.random() * 0.05, // Some upward velocity
                (Math.random() - 0.5) * speed * 0.5 // Some Z variation
            ),
            gravity: -0.004, // Gravity effect
            life: 2.0, // Longer life for shrapnel
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            ),
            isShrapnel: true,
            gameActive: gameActive,
            livesCallback: livesCallback,
            gameOverCallback: gameOverCallback
        };

        shrapnelParticles.push(shrapnel);
        scene.add(shrapnel);
    }

    // Play shrapnel explosion sound
    playShrapnelExplosion();
}

// Update all particles
export function updateParticles(scene) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.position.add(particle.userData.velocity);

        // Add rotation for more dynamic effect
        if (particle.userData.rotationSpeed) {
            particle.rotation.x += particle.userData.rotationSpeed.x;
            particle.rotation.y += particle.userData.rotationSpeed.y;
            particle.rotation.z += particle.userData.rotationSpeed.z;
        }

        particle.userData.life -= 0.015;  // Slightly slower fade
        particle.material.opacity = particle.userData.life;
        particle.material.transparent = true;

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(i, 1);
        }
    }
}

// Update shrapnel particles (with collision detection)
export function updateShrapnelParticles(scene) {
    const player = getPlayer();
    if (!player) return;

    for (let i = shrapnelParticles.length - 1; i >= 0; i--) {
        const shrapnel = shrapnelParticles[i];

        // Apply velocity
        shrapnel.position.add(shrapnel.userData.velocity);

        // Apply gravity
        shrapnel.userData.velocity.y += shrapnel.userData.gravity;

        // Add rotation
        if (shrapnel.userData.rotationSpeed) {
            shrapnel.rotation.x += shrapnel.userData.rotationSpeed.x;
            shrapnel.rotation.y += shrapnel.userData.rotationSpeed.y;
            shrapnel.rotation.z += shrapnel.userData.rotationSpeed.z;
        }

        // Fade out
        shrapnel.userData.life -= 0.01;
        shrapnel.material.opacity = shrapnel.userData.life / 2.0;
        shrapnel.material.transparent = true;

        // Check collision with player (only if game is active)
        if (shrapnel.userData.gameActive) {
            const distance = shrapnel.position.distanceTo(player.position);
            if (distance < 0.8) {
                // Hit! Remove shrapnel and damage player
                scene.remove(shrapnel);
                shrapnelParticles.splice(i, 1);

                // Create small explosion at hit point
                createExplosion(shrapnel.position, scene);

                // Red flash effect (visual feedback)
                flashScreen();

                // Decrease lives
                const newLives = shrapnel.userData.livesCallback();
                if (newLives <= 0) {
                    shrapnel.userData.gameOverCallback(false);
                }
                continue;
            }
        }

        // Remove if life is over
        if (shrapnel.userData.life <= 0) {
            scene.remove(shrapnel);
            shrapnelParticles.splice(i, 1);
        }
    }
}

// Flash screen red when hit by shrapnel
function flashScreen() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9999';
    overlay.style.transition = 'opacity 0.3s';
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 300);
    }, 100);
}

// Reset particles for new game
export function resetParticles(scene) {
    particles.forEach(particle => scene.remove(particle));
    shrapnelParticles.forEach(shrapnel => scene.remove(shrapnel));
    particles = [];
    shrapnelParticles = [];
}

// Get particles array
export function getParticles() {
    return particles;
}
