import * as THREE from 'three';

let starfield;
let starPositions;
let starSpeed = 0.5;  // Default speed

// Create the animated starfield background
export function createStarfield(scene) {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        transparent: true
    });

    // Create stars spread across a large area in front of the player
    starPositions = [];
    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = -Math.random() * 200 - 20;  // Stars in front of player
        starPositions.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);
}

// Set starfield speed (for hyperspace effect)
export function setStarfieldSpeed(speed) {
    starSpeed = speed;
}

// Get current starfield speed
export function getStarfieldSpeed() {
    return starSpeed;
}

// Update starfield animation
export function updateStarfield() {
    if (!starfield) return;

    const positions = starfield.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        // Move stars toward player (increase Z) at current speed
        positions[i + 2] += starSpeed;

        // Reset star to far distance if it passes the player
        if (positions[i + 2] > 20) {
            positions[i + 2] = -200;
            positions[i] = (Math.random() - 0.5) * 100;  // New random X
            positions[i + 1] = (Math.random() - 0.5) * 100;  // New random Y
        }
    }

    starfield.geometry.attributes.position.needsUpdate = true;
}
