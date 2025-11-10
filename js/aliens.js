import * as THREE from 'three';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_SPACING } from './constants.js';

let aliens = [];
let alienDirection = 1;
let alienSpeed = 0.02;

// Create all aliens in formation
export function createAliens(scene) {
    const startX = -10;
    const startZ = -15;

    for (let row = 0; row < ALIEN_ROWS; row++) {
        for (let col = 0; col < ALIEN_COLS; col++) {
            const alien = createAlien(row);
            alien.position.x = startX + col * ALIEN_SPACING;
            alien.position.z = startZ - row * ALIEN_SPACING;
            alien.position.y = 0;  // On same plane as player
            alien.userData = {
                row: row,
                col: col,
                animationOffset: Math.random() * Math.PI * 2,
                destroyed: false
            };
            aliens.push(alien);
            scene.add(alien);
        }
    }

    return aliens;
}

// Create a single alien based on row type
function createAlien(row) {
    const group = new THREE.Group();

    // Different alien types for each row
    switch(row) {
        case 0: // Top row - Octopus style
            createOctopusAlien(group);
            break;
        case 1: // Crab style
            createCrabAlien(group);
            break;
        case 2: // Squid style
            createSquidAlien(group);
            break;
        case 3: // UFO style
            createUFOAlien(group);
            break;
        case 4: // Tank style
            createTankAlien(group);
            break;
    }

    return group;
}

function createOctopusAlien(group) {
    const material = new THREE.MeshPhongMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 0.3,
        flatShading: true
    });

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1), material);
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.8
    });
    const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), eyeMaterial);
    eyeLeft.position.set(-0.3, 0.2, 0.5);
    group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), eyeMaterial);
    eyeRight.position.set(0.3, 0.2, 0.5);
    group.add(eyeRight);

    // Tentacles
    for (let i = 0; i < 4; i++) {
        const tentacle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), material);
        tentacle.position.set(-0.45 + i * 0.3, -0.7, 0);
        tentacle.userData.baseY = -0.7;
        group.add(tentacle);
        group.userData.tentacles = group.userData.tentacles || [];
        group.userData.tentacles.push(tentacle);
    }
}

function createCrabAlien(group) {
    const material = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.3,
        flatShading: true
    });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.8), material);
    body.castShadow = true;
    group.add(body);

    // Eyes on stalks
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.8
    });

    const stalkLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), material);
    stalkLeft.position.set(-0.4, 0.5, 0.2);
    group.add(stalkLeft);

    const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), eyeMaterial);
    eyeLeft.position.set(-0.4, 0.75, 0.2);
    group.add(eyeLeft);

    const stalkRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), material);
    stalkRight.position.set(0.4, 0.5, 0.2);
    group.add(stalkRight);

    const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), eyeMaterial);
    eyeRight.position.set(0.4, 0.75, 0.2);
    group.add(eyeRight);

    // Claws
    const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), material);
    clawLeft.position.set(-0.8, 0, 0.3);
    group.add(clawLeft);
    group.userData.clawLeft = clawLeft;

    const clawRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), material);
    clawRight.position.set(0.8, 0, 0.3);
    group.add(clawRight);
    group.userData.clawRight = clawRight;
}

function createSquidAlien(group) {
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.3,
        flatShading: true
    });

    // Head/body
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.8), material);
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8
    });
    const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.2), eyeMaterial);
    eyeLeft.position.set(-0.25, 0.3, 0.4);
    group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.2), eyeMaterial);
    eyeRight.position.set(0.25, 0.3, 0.4);
    group.add(eyeRight);

    // Bottom tentacles
    group.userData.legs = [];
    for (let i = 0; i < 6; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), material);
        leg.position.set(-0.5 + i * 0.2, -0.8, 0);
        leg.userData.baseY = -0.8;
        group.add(leg);
        group.userData.legs.push(leg);
    }
}

function createUFOAlien(group) {
    const material = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.3,
        flatShading: true,
        shininess: 100
    });

    // Dome
    const dome = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), material);
    dome.position.y = 0.3;
    dome.castShadow = true;
    group.add(dome);

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), material);
    base.castShadow = true;
    group.add(base);

    // Lights around the edge
    const lightMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1
    });

    group.userData.lights = [];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), lightMaterial);
        light.position.set(Math.cos(angle) * 0.7, -0.1, Math.sin(angle) * 0.7);
        group.add(light);
        group.userData.lights.push(light);
    }
}

function createTankAlien(group) {
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.3,
        flatShading: true
    });

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.2), material);
    body.castShadow = true;
    group.add(body);

    // Top block
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), material);
    top.position.y = 0.6;
    top.castShadow = true;
    group.add(top);

    // Cannon
    const cannon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.8), material);
    cannon.position.set(0, 0.6, 0.6);
    group.add(cannon);
    group.userData.cannon = cannon;

    // Treads
    const treadMaterial = new THREE.MeshPhongMaterial({
        color: 0x008888,
        flatShading: true
    });

    const treadLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.4), treadMaterial);
    treadLeft.position.set(-0.7, -0.3, 0);
    group.add(treadLeft);

    const treadRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.4), treadMaterial);
    treadRight.position.set(0.7, -0.3, 0);
    group.add(treadRight);
}

// Animate a single alien
export function animateAlien(alien) {
    const time = Date.now() * 0.001 + alien.userData.animationOffset;
    const row = alien.userData.row;

    // Different animations for each row
    switch(row) {
        case 0: // Octopus - dramatic pulsing and tentacle waving
            if (alien.userData.tentacles) {
                alien.userData.tentacles.forEach((tentacle, i) => {
                    // Dramatic wave motion
                    tentacle.position.y = tentacle.userData.baseY + Math.sin(time * 4 + i * 0.8) * 0.35;
                    tentacle.rotation.z = Math.sin(time * 3 + i) * 0.3;
                });
            }
            // Pulsing body scale
            const pulseScale = 1 + Math.sin(time * 3) * 0.1;
            alien.scale.set(pulseScale, pulseScale, pulseScale);
            // Rotation wobble
            alien.rotation.y = Math.sin(time * 2) * 0.3;
            alien.rotation.z = Math.sin(time * 1.5) * 0.15;
            break;

        case 1: // Crab - aggressive claw snapping and side-to-side sway
            if (alien.userData.clawLeft) {
                // Sharp snapping motion
                const snapLeft = Math.sin(time * 6) > 0.5 ? 0.5 : 0.3;
                alien.userData.clawLeft.position.z = snapLeft;
                alien.userData.clawLeft.rotation.y = Math.sin(time * 6) * 0.4;
            }
            if (alien.userData.clawRight) {
                const snapRight = Math.sin(time * 6 + Math.PI) > 0.5 ? 0.5 : 0.3;
                alien.userData.clawRight.position.z = snapRight;
                alien.userData.clawRight.rotation.y = Math.sin(time * 6 + Math.PI) * 0.4;
            }
            // Side-to-side sway
            alien.rotation.z = Math.sin(time * 3) * 0.25;
            // Aggressive bobbing
            alien.position.y = 0 + Math.sin(time * 4) * 0.2;
            break;

        case 2: // Squid - swimming motion with squash and stretch
            if (alien.userData.legs) {
                alien.userData.legs.forEach((leg, i) => {
                    // Wave motion like swimming
                    leg.position.y = leg.userData.baseY + Math.sin(time * 5 + i * 0.7) * 0.25;
                    leg.rotation.x = Math.sin(time * 4 + i * 0.5) * 0.2;
                });
            }
            // Squash and stretch effect
            const stretch = 1 + Math.sin(time * 4) * 0.15;
            alien.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
            // Tilting motion
            alien.rotation.x = Math.sin(time * 3) * 0.2;
            alien.rotation.z = Math.sin(time * 2.5) * 0.15;
            // Vertical swimming motion
            alien.position.y = 0 + Math.sin(time * 3) * 0.15;
            break;

        case 3: // UFO - spinning with dramatic light show and wobble
            if (alien.userData.lights) {
                alien.userData.lights.forEach((light, i) => {
                    // Dramatic pulsing sequence
                    const phase = time * 8 + i * 0.785;
                    const intensity = Math.pow((Math.sin(phase) + 1) / 2, 2);
                    light.material.emissiveIntensity = intensity * 2;
                    // Make lights scale pulse
                    const lightScale = 1 + intensity * 0.5;
                    light.scale.set(lightScale, lightScale, lightScale);
                });
            }
            // Fast rotation
            alien.rotation.y = time * 1.5;
            // Wobble motion like anti-gravity
            alien.position.y = 0 + Math.sin(time * 2) * 0.25 + Math.sin(time * 5) * 0.1;
            alien.rotation.x = Math.sin(time * 3) * 0.15;
            alien.rotation.z = Math.sin(time * 2.3) * 0.15;
            break;

        case 4: // Tank - aggressive targeting and movement
            if (alien.userData.cannon) {
                // Cannon tracks and aims aggressively
                alien.userData.cannon.rotation.x = Math.sin(time * 3) * 0.4;
                alien.userData.cannon.rotation.y = Math.sin(time * 2) * 0.2;
            }
            // Tank body tilts as if moving
            alien.rotation.z = Math.sin(time * 4) * 0.1;
            alien.rotation.x = Math.sin(time * 3.5) * 0.08;
            // Slight forward-back rocking
            alien.position.y = 0 + Math.abs(Math.sin(time * 8)) * 0.05;
            break;
    }
}

// Update alien formation movement
export function updateAliens(gameOverCallback) {
    if (aliens.length === 0) return;

    let shouldMoveDown = false;

    // Check if any alien hit the edge
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;

        if ((alienDirection > 0 && alien.position.x > 13) ||
            (alienDirection < 0 && alien.position.x < -13)) {
            shouldMoveDown = true;
            break;
        }
    }

    if (shouldMoveDown) {
        alienDirection *= -1;
        for (let alien of aliens) {
            if (!alien.userData.destroyed) {
                alien.position.z += 1;

                // Check if aliens reached player
                if (alien.position.z > 8) {
                    gameOverCallback(false);
                }
            }
        }
        alienSpeed *= 1.05; // Speed up over time
    }

    // Move aliens
    for (let alien of aliens) {
        if (alien.userData.destroyed) continue;

        alien.position.x += alienDirection * alienSpeed;
    }
}

// Get all aliens
export function getAliens() {
    return aliens;
}

// Remove alien from array
export function removeAlien(alien, scene) {
    alien.userData.destroyed = true;
    scene.remove(alien);
    const alienIndex = aliens.indexOf(alien);
    if (alienIndex > -1) {
        aliens.splice(alienIndex, 1);
    }
}

// Reset aliens for new game
export function resetAliens(scene) {
    aliens.forEach(alien => scene.remove(alien));
    aliens = [];
    alienDirection = 1;
    alienSpeed = 0.02;
}

// Get alien state for reset
export function getAlienState() {
    return {
        direction: alienDirection,
        speed: alienSpeed
    };
}
