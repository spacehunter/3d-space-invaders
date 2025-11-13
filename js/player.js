import * as THREE from 'three';

let player;

// Create the player spaceship
export function createPlayer(scene) {
    const group = new THREE.Group();

    // Blocky spaceship design
    const bodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 2);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.3,
        flatShading: true
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Cockpit
    const cockpitGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    const cockpitMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5,
        flatShading: true
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.y = 0.5;
    cockpit.castShadow = true;
    group.add(cockpit);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(3, 0.2, 1);
    const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x00aa00,
        flatShading: true
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = -0.2;
    wings.position.z = -0.3;
    wings.castShadow = true;
    group.add(wings);

    // Engine glow (left and right)
    const engineGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.6);
    const engineMaterial = new THREE.MeshPhongMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 0.8,
        flatShading: true
    });

    const engineLeft = new THREE.Mesh(engineGeometry, engineMaterial);
    engineLeft.position.set(-1, -0.2, -0.8);
    group.add(engineLeft);

    const engineRight = new THREE.Mesh(engineGeometry, engineMaterial);
    engineRight.position.set(1, -0.2, -0.8);
    group.add(engineRight);

    group.position.y = 0;  // On same plane as aliens
    group.position.z = 10;

    player = group;
    scene.add(player);

    return player;
}

// Update player position based on mouse input
export function updatePlayer(mouseX) {
    if (!player) return;

    // Move player based on mouse position - more direct control
    const targetX = mouseX * 12;
    player.position.x += (targetX - player.position.x) * 0.15;

    // Clamp player position
    player.position.x = Math.max(-12, Math.min(12, player.position.x));

    // Tilt player slightly based on movement direction
    const velocityX = targetX - player.position.x;
    player.rotation.z = -velocityX * 0.02;
}

// Get player reference
export function getPlayer() {
    return player;
}

// Hide player (e.g., during high score entry)
export function hidePlayer() {
    if (player) {
        player.visible = false;
    }
}

// Show player
export function showPlayer() {
    if (player) {
        player.visible = true;
    }
}
