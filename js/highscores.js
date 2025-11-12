import * as THREE from 'three';

const HIGHSCORE_KEY = 'spaceInvaders3D_highscores';
const MAX_HIGHSCORES = 10;
const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

let scene;
let camera;
let highScoreGroup;
let initialEntryActive = false;
let completionAnimationActive = false;
let currentInitials = ['A', 'A', 'A'];
let currentCharIndex = 0;
let characterMeshes = [];
let selectorMeshes = [];
let glowLights = [];
let onCompleteCallback = null;
let currentScore = 0;

// Load high scores from localStorage
export function loadHighScores() {
    try {
        const data = localStorage.getItem(HIGHSCORE_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error loading high scores:', e);
    }
    return [];
}

// Save high scores to localStorage
function saveHighScores(scores) {
    try {
        localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(scores));
    } catch (e) {
        console.error('Error saving high scores:', e);
    }
}

// Check if score qualifies for high score list
export function isHighScore(score) {
    const scores = loadHighScores();
    if (scores.length < MAX_HIGHSCORES) return true;
    return score > scores[scores.length - 1].score;
}

// Add a new high score
export function addHighScore(initials, score) {
    const scores = loadHighScores();
    scores.push({ initials, score, date: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > MAX_HIGHSCORES) {
        scores.length = MAX_HIGHSCORES;
    }
    saveHighScores(scores);
    return scores;
}

// Get top high scores
export function getTopHighScores(count = 5) {
    const scores = loadHighScores();
    return scores.slice(0, count);
}

// Create 3D initial entry interface
export function showInitialEntry(sceneRef, cameraRef, score, onComplete) {
    scene = sceneRef;
    camera = cameraRef;
    currentScore = score;
    onCompleteCallback = onComplete;
    initialEntryActive = true;
    currentInitials = ['A', 'A', 'A'];
    currentCharIndex = 0;

    createInitialEntryUI();

    // Add mouse wheel listener
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('click', handleClick);
}

// Create beautiful 3D UI for initial entry
function createInitialEntryUI() {
    highScoreGroup = new THREE.Group();
    highScoreGroup.position.set(0, -2, 5);
    scene.add(highScoreGroup);

    // Background panel - dark for better contrast
    const panelGeometry = new THREE.BoxGeometry(12, 6, 0.3);
    const panelMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x001122,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.95,
        shininess: 100
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    highScoreGroup.add(panel);

    // Border glow
    const borderGeometry = new THREE.BoxGeometry(12.4, 6.4, 0.2);
    const borderMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.3
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.z = -0.1;
    highScoreGroup.add(border);

    // Title text "NEW HIGH SCORE!"
    createText('NEW HIGH SCORE!', 0, 2.2, 0.5, 0x00ff00);

    // Score display
    createText(`SCORE: ${currentScore}`, 0, 1.4, 0.35, 0xffff00);

    // Instructions
    createText('ENTER YOUR INITIALS', 0, 0.6, 0.25, 0x00ffff);
    createText('Mouse Wheel: Change Letter', 0, -2, 0.18, 0xaaaaaa);
    createText('Click: Confirm Letter', 0, -2.4, 0.18, 0xaaaaaa);

    // Create character slots
    characterMeshes = [];
    selectorMeshes = [];
    glowLights = [];

    const spacing = 2.5;
    for (let i = 0; i < 3; i++) {
        const xPos = (i - 1) * spacing;

        // Character display
        const charMesh = createCharacterMesh(currentInitials[i], xPos, -0.5);
        characterMeshes.push(charMesh);
        highScoreGroup.add(charMesh);

        // Selection indicator - glowing underline instead of wireframe box
        const selectorGeometry = new THREE.BoxGeometry(1.6, 0.15, 0.1);
        const selectorMaterial = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0
        });
        const selector = new THREE.Mesh(selectorGeometry, selectorMaterial);
        selector.position.set(xPos, -1.5, 0.3);  // Below the character
        selectorMeshes.push(selector);
        highScoreGroup.add(selector);

        // Point light for glow effect - yellow to match selector
        const light = new THREE.PointLight(0xffff00, 0, 3);
        light.position.set(xPos, -0.5, 1);
        glowLights.push(light);
        highScoreGroup.add(light);
    }

    // Activate first selector
    updateSelector();

    // Add ambient particles
    createAmbientParticles();
}

// Create a 3D character mesh with beautiful styling
function createCharacterMesh(char, x, y) {
    const group = new THREE.Group();

    // Create character using boxes (pixel art style) - bright yellow/orange for visibility
    const charGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.3);
    const charMaterial = new THREE.MeshPhongMaterial({
        color: 0xffaa00,
        emissive: 0xff8800,
        emissiveIntensity: 1.2,
        shininess: 100
    });
    const charBox = new THREE.Mesh(charGeometry, charMaterial);
    group.add(charBox);

    // Add text using canvas texture - bright yellow text
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Add dark outline for better readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.font = 'bold 100px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(char, 64, 64);

    // Fill with bright yellow
    ctx.fillStyle = '#ffff00';
    ctx.fillText(char, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const textGeometry = new THREE.PlaneGeometry(1.4, 1.4);
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.2;
    group.add(textMesh);

    group.position.set(x, y, 0.2);
    group.userData.char = char;
    group.userData.textMesh = textMesh;
    group.userData.charBox = charBox;

    return group;
}

// Create text using canvas texture
function createText(text, x, y, size, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = `bold ${Math.floor(size * 200)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(size * 20, size * 2.5);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0.3);
    highScoreGroup.add(mesh);

    return mesh;
}

// Create ambient particles for atmosphere
function createAmbientParticles() {
    for (let i = 0; i < 50; i++) {
        const particleGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2,
            transparent: true,
            opacity: Math.random() * 0.5 + 0.3
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.set(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 2 + 0.5
        );

        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                0
            ),
            life: 1,
            baseOpacity: particle.material.opacity
        };

        highScoreGroup.add(particle);
    }
}

// Update character display
function updateCharacterDisplay(index) {
    const char = currentInitials[index];
    const mesh = characterMeshes[index];

    // Update canvas texture with yellow text and outline
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Add dark outline for better readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.font = 'bold 100px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(char, 64, 64);

    // Fill with bright yellow
    ctx.fillStyle = '#ffff00';
    ctx.fillText(char, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    mesh.userData.textMesh.material.map = texture;
    mesh.userData.textMesh.material.needsUpdate = true;
}

// Update selector appearance
function updateSelector() {
    selectorMeshes.forEach((selector, i) => {
        if (i === currentCharIndex) {
            selector.material.opacity = 0.8;
            glowLights[i].intensity = 2;
        } else if (i < currentCharIndex) {
            // Already confirmed
            selector.material.opacity = 0.3;
            selector.material.color.setHex(0xffff00);
            selector.material.emissive.setHex(0xffff00);
            glowLights[i].intensity = 0.5;
            glowLights[i].color.setHex(0xffff00);
        } else {
            selector.material.opacity = 0;
            glowLights[i].intensity = 0;
        }
    });
}

// Handle mouse wheel for character selection
function handleWheel(event) {
    if (!initialEntryActive) return;

    event.preventDefault();

    const charArray = CHARACTERS.split('');
    const currentIndex = charArray.indexOf(currentInitials[currentCharIndex]);

    let newIndex;
    if (event.deltaY < 0) {
        // Scroll up
        newIndex = (currentIndex + 1) % charArray.length;
    } else {
        // Scroll down
        newIndex = (currentIndex - 1 + charArray.length) % charArray.length;
    }

    currentInitials[currentCharIndex] = charArray[newIndex];
    updateCharacterDisplay(currentCharIndex);

    // Play a subtle sound effect (using existing audio)
    animateCharacterChange(currentCharIndex);
}

// Handle mouse click to confirm character
function handleClick(event) {
    if (!initialEntryActive) return;

    // Move to next character
    currentCharIndex++;

    if (currentCharIndex >= 3) {
        // All initials entered, complete the process
        completeInitialEntry();
    } else {
        updateSelector();
        animateConfirm(currentCharIndex - 1);
    }
}

// Animate character change
function animateCharacterChange(index) {
    const mesh = characterMeshes[index];
    const startScale = mesh.scale.clone();
    const time = Date.now();

    mesh.userData.animateTime = time;
    mesh.userData.animateType = 'change';
}

// Animate character confirmation
function animateConfirm(index) {
    const mesh = characterMeshes[index];
    const time = Date.now();

    mesh.userData.animateTime = time;
    mesh.userData.animateType = 'confirm';
}

// Complete initial entry and save high score
function completeInitialEntry() {
    // Prevent double completion
    if (!initialEntryActive || completionAnimationActive) return;

    const initials = currentInitials.join('');
    addHighScore(initials, currentScore);

    // Update high scores display
    updateHighScoresDisplay();

    // Disable further input immediately
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('click', handleClick);

    // Mark as completing - prevents input but allows animation
    completionAnimationActive = true;
    initialEntryActive = false;

    // Animate completion
    animateCompletion();

    // Store callback to call after cleanup
    const callback = onCompleteCallback;

    // Clean up after animation
    setTimeout(() => {
        completionAnimationActive = false;
        hideInitialEntry();
        if (callback) {
            callback(initials);
        }
    }, 2000);
}

// Animate completion with a flourish
function animateCompletion() {
    // Flash all characters
    characterMeshes.forEach((mesh, i) => {
        mesh.userData.animateTime = Date.now();
        mesh.userData.animateType = 'complete';
    });

    // Burst all lights
    glowLights.forEach(light => {
        light.intensity = 5;
        light.color.setHex(0x00ff00);
    });
}

// Hide initial entry UI
export function hideInitialEntry() {
    if (highScoreGroup && scene) {
        // Dispose of all materials and geometries
        highScoreGroup.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });

        // Remove from scene
        scene.remove(highScoreGroup);
        highScoreGroup = null;
    }

    // Reset all state flags
    initialEntryActive = false;
    completionAnimationActive = false;
    characterMeshes = [];
    selectorMeshes = [];
    glowLights = [];
    onCompleteCallback = null;
    currentCharIndex = 0;
    currentInitials = ['A', 'A', 'A'];

    // Remove event listeners (safe to call even if already removed)
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('click', handleClick);
}

// Update animations
export function updateHighScoreUI() {
    // Allow updates during initial entry OR completion animation
    if ((!initialEntryActive && !completionAnimationActive) || !highScoreGroup) return;

    const time = Date.now();

    // Animate characters
    characterMeshes.forEach((mesh, i) => {
        if (mesh.userData.animateTime) {
            const elapsed = time - mesh.userData.animateTime;

            if (mesh.userData.animateType === 'change') {
                // Pulse effect
                const scale = 1 + Math.sin(elapsed * 0.02) * 0.1;
                mesh.scale.set(scale, scale, scale);

                if (elapsed > 200) {
                    mesh.userData.animateTime = null;
                    mesh.scale.set(1, 1, 1);
                }
            } else if (mesh.userData.animateType === 'confirm') {
                // Flash and lock
                const intensity = Math.max(0, 1 - elapsed / 500);
                mesh.userData.charBox.material.emissiveIntensity = 1.2 + intensity * 2;

                if (elapsed > 500) {
                    mesh.userData.animateTime = null;
                    mesh.userData.charBox.material.emissiveIntensity = 1.2;
                }
            } else if (mesh.userData.animateType === 'complete') {
                // Rainbow flash
                const hue = (elapsed * 0.001) % 1;
                const color = new THREE.Color().setHSL(hue, 1, 0.5);
                mesh.userData.charBox.material.emissive = color;
                mesh.userData.charBox.material.emissiveIntensity = 2;

                const scale = 1 + Math.sin(elapsed * 0.01) * 0.2;
                mesh.scale.set(scale, scale, scale);
            }
        }

        // Idle floating animation
        if (!mesh.userData.animateTime || mesh.userData.animateType === 'change') {
            mesh.rotation.y = Math.sin(time * 0.001 + i) * 0.1;
        }
    });

    // Animate selectors - just pulse, no rotation
    selectorMeshes.forEach((selector, i) => {
        if (selector.material.opacity > 0) {
            const pulse = Math.sin(time * 0.005) * 0.3 + 0.7;  // Smoother pulsing
            if (i === currentCharIndex) {
                selector.material.opacity = pulse;
                selector.material.emissiveIntensity = pulse * 3;  // Intensity pulses too
            }
        }
    });

    // Animate ambient particles
    highScoreGroup.children.forEach(child => {
        if (child.userData.velocity) {
            child.position.add(child.userData.velocity);

            // Wrap around
            if (Math.abs(child.position.x) > 7) child.position.x *= -1;
            if (Math.abs(child.position.y) > 4) child.position.y *= -1;

            // Pulsing opacity
            const pulse = Math.sin(time * 0.003 + child.position.x) * 0.3 + 0.7;
            child.material.opacity = child.userData.baseOpacity * pulse;
        }
    });

    // Animate border glow
    const borderMesh = highScoreGroup.children.find(child =>
        child.geometry && child.geometry.parameters &&
        child.geometry.parameters.width > 12
    );
    if (borderMesh) {
        const pulse = Math.sin(time * 0.003) * 0.5 + 1;
        borderMesh.material.emissiveIntensity = pulse;
    }
}

// Check if initial entry is active
export function isInitialEntryActive() {
    return initialEntryActive;
}

// Update high scores display in HTML
export function updateHighScoresDisplay() {
    const scores = getTopHighScores(5);
    const listElement = document.getElementById('highscores-list');

    if (!listElement) return;

    if (scores.length === 0) {
        listElement.innerHTML = '<div class="score-entry">No scores yet!</div>';
        return;
    }

    listElement.innerHTML = scores.map((entry, index) => {
        return `<div class="score-entry"><span class="rank">${index + 1}.</span> ${entry.initials} - ${entry.score}</div>`;
    }).join('');
}
