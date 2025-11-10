import * as THREE from 'three';

let particles = [];

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

// Reset particles for new game
export function resetParticles(scene) {
    particles.forEach(particle => scene.remove(particle));
    particles = [];
}

// Get particles array
export function getParticles() {
    return particles;
}
