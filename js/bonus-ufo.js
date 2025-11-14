import * as THREE from 'three';
import { playUFOSpawn, playUFOTravel, stopUFOTravel, updateUFOTravelPanning } from './audio.js';

let bonusUFO = null;
let ufoSpeed = 0.15; // Slower movement speed (50% of original) - makes UFO more shootable
let lastSpawnTime = 0;
let spawnInterval = 20000; // Spawn every 20 seconds (can be adjusted)
const minSpawnInterval = 15000; // Minimum time between spawns
const maxSpawnInterval = 30000; // Maximum time between spawns

// Callback for firing UFO missile (set by missiles.js)
let ufoMissileFireCallback = null;

/**
 * Creates a distinctive bonus UFO with elaborate design
 */
function createBonusUFO() {
    const ufo = new THREE.Group();

    // Main saucer body (larger and more elaborate than regular UFO)
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 2.0, 0.6, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xff00ff, // Magenta/purple for distinction
        emissive: 0xff00ff,
        emissiveIntensity: 2.0,
        flatShading: true
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.y = Math.PI / 16; // Slight rotation for visual interest
    ufo.add(body);

    // Dome on top
    const domeGeometry = new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00, // Yellow dome
        emissive: 0xffff00,
        emissiveIntensity: 2.5,
        flatShading: true
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.3;
    ufo.add(dome);

    // Bottom disc
    const bottomGeometry = new THREE.CylinderGeometry(1.8, 1.2, 0.3, 16);
    const bottomMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0080,
        emissive: 0xff0080,
        emissiveIntensity: 1.8,
        flatShading: true
    });
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.position.y = -0.45;
    ufo.add(bottom);

    // Create multiple lights around the rim (12 lights for bonus UFO)
    const lights = [];
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const lightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const lightMaterial = new THREE.MeshPhongMaterial({
            color: i % 2 === 0 ? 0x00ffff : 0xffff00, // Alternating cyan and yellow
            emissive: i % 2 === 0 ? 0x00ffff : 0xffff00,
            emissiveIntensity: 3.0,
            flatShading: true
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.x = Math.cos(angle) * 1.8;
        light.position.z = Math.sin(angle) * 1.8;
        light.position.y = -0.2;
        lights.push(light);
        ufo.add(light);
    }

    // Add antenna on top of dome
    const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const antennaMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.0,
        flatShading: true
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.y = 0.9;
    ufo.add(antenna);

    // Antenna tip (glowing sphere)
    const tipGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const tipMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 3.5,
        flatShading: true
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.y = 1.3;
    ufo.add(tip);

    // Store references for animation
    ufo.userData.body = body;
    ufo.userData.dome = dome;
    ufo.userData.lights = lights;
    ufo.userData.antenna = antenna;
    ufo.userData.tip = tip;
    ufo.userData.animationOffset = Math.random() * Math.PI * 2;

    return ufo;
}

/**
 * Spawns a bonus UFO if conditions are met
 */
export function spawnBonusUFO(scene, currentTime) {
    // Don't spawn if one already exists
    if (bonusUFO) return;

    // Check if enough time has passed since last spawn
    if (currentTime - lastSpawnTime < spawnInterval) return;

    // Create the UFO
    bonusUFO = createBonusUFO();

    // Randomly choose direction (left-to-right or right-to-left)
    const direction = Math.random() > 0.5 ? 1 : -1;
    bonusUFO.userData.direction = direction;

    // Position at top of screen, off to the side
    bonusUFO.position.y = 5; // Higher than player
    bonusUFO.position.z = -28; // At the back, near the alien formation
    bonusUFO.position.x = direction === 1 ? -18 : 18; // Start off-screen

    bonusUFO.userData.isBonusUFO = true;
    bonusUFO.userData.points = 500;

    // 25% chance this UFO will attack
    bonusUFO.userData.willAttack = Math.random() < 0.25;
    bonusUFO.userData.hasFired = false;
    bonusUFO.userData.startX = bonusUFO.position.x;

    scene.add(bonusUFO);
    lastSpawnTime = currentTime;

    // Play spawn sound (warp in effect)
    playUFOSpawn();

    // Start continuous travel sound
    playUFOTravel(bonusUFO);

    return bonusUFO;
}

/**
 * Updates the bonus UFO position and animation
 */
export function updateBonusUFO() {
    if (!bonusUFO) return;

    const time = Date.now() * 0.001 + bonusUFO.userData.animationOffset;

    // Move horizontally
    bonusUFO.position.x += bonusUFO.userData.direction * ufoSpeed;

    // Check if UFO should fire missile (40-60% through traverse)
    if (bonusUFO.userData.willAttack && !bonusUFO.userData.hasFired) {
        const totalDistance = 36; // From -18 to 18
        const traveledDistance = Math.abs(bonusUFO.position.x - bonusUFO.userData.startX);
        const traversePercent = (traveledDistance / totalDistance) * 100;

        // Fire when UFO is 40-60% through screen
        if (traversePercent >= 40 && traversePercent <= 60) {
            bonusUFO.userData.hasFired = true;
            if (ufoMissileFireCallback) {
                ufoMissileFireCallback(bonusUFO.position, bonusUFO.parent);
            }
        }
    }

    // Animate the UFO
    animateBonusUFO(bonusUFO, time);

    // Update travel sound panning based on position
    updateUFOTravelPanning(bonusUFO);

    // Remove if off-screen
    if (Math.abs(bonusUFO.position.x) > 20) {
        removeBonusUFO(bonusUFO.parent);
    }
}

/**
 * Animates the bonus UFO with spinning, pulsing, and light effects
 */
function animateBonusUFO(ufo, time) {
    // Spin the entire UFO
    ufo.rotation.y = time * 2.0; // Fast spin

    // Wobble motion
    ufo.position.y = 5 + Math.sin(time * 3) * 0.3;

    // Pulsing body
    const pulseScale = 1.0 + Math.sin(time * 4) * 0.1;
    ufo.userData.body.scale.set(pulseScale, 1, pulseScale);

    // Dome pulse (different frequency)
    const domePulse = 1.0 + Math.sin(time * 5) * 0.15;
    ufo.userData.dome.scale.set(domePulse, domePulse, domePulse);

    // Animate lights (pulsing intensity effect)
    ufo.userData.lights.forEach((light, index) => {
        const offset = (index / ufo.userData.lights.length) * Math.PI * 2;
        const intensity = 2.5 + Math.sin(time * 8 + offset) * 1.5;
        light.material.emissiveIntensity = Math.max(1.0, intensity);

        // Slight bobbing of lights
        light.position.y = -0.2 + Math.sin(time * 6 + offset) * 0.1;
    });

    // Antenna sway
    ufo.userData.antenna.rotation.z = Math.sin(time * 3) * 0.2;

    // Tip pulse
    const tipPulse = 1.0 + Math.sin(time * 10) * 0.3;
    ufo.userData.tip.scale.set(tipPulse, tipPulse, tipPulse);
}

/**
 * Removes the bonus UFO from the scene
 */
export function removeBonusUFO(scene) {
    if (bonusUFO && scene) {
        // Stop travel sound
        stopUFOTravel();
        scene.remove(bonusUFO);
    }
    bonusUFO = null;
}

/**
 * Gets the current bonus UFO (if any)
 */
export function getBonusUFO() {
    return bonusUFO;
}

/**
 * Resets the bonus UFO system (for game restart)
 */
export function resetBonusUFO(scene) {
    removeBonusUFO(scene);
    lastSpawnTime = 0;
}

/**
 * Sets the spawn interval for testing/balancing
 */
export function setSpawnInterval(interval) {
    spawnInterval = Math.max(minSpawnInterval, Math.min(maxSpawnInterval, interval));
}

/**
 * Sets the callback for firing UFO missiles
 */
export function setUFOMissileFireCallback(callback) {
    ufoMissileFireCallback = callback;
}
