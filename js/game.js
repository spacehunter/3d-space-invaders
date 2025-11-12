import * as THREE from 'three';
import { initAudio } from './audio.js';
import { getPlayer, updatePlayer } from './player.js';
import { updateStarfield } from './starfield.js';
import { createAliens, updateAliens, animateAlien, getAliens, resetAliens } from './aliens.js';
import { fireMissile, updateMissiles, updateAlienMissiles, checkAlienFire, resetMissiles } from './missiles.js';
import { updateParticles, resetParticles } from './particles.js';
import { getMousePosition } from './input.js';
import { isHighScore, showInitialEntry, updateHighScoreUI, hideInitialEntry, isInitialEntryActive } from './highscores.js';

// Game state
let scene;
let camera;
let score = 0;
let lives = 3;
let gameActive = true;

// Initialize game state
export function initGame(sceneRef, cameraRef) {
    scene = sceneRef;
    camera = cameraRef;
    score = 0;
    lives = 3;
    gameActive = true;

    updateUI();
}

// Update camera position based on player and mouse
export function updateCamera(player, mouseX, mouseY) {
    // Smooth camera follow with subtle tilt
    const targetX = player.position.x * 0.15;  // Reduced from 0.3
    const targetRotY = -mouseX * 0.05;  // Reduced from 0.2

    // Mouse Y controls camera depth (Z position)
    // Mouse up (negative Y) = camera moves forward (closer)
    // Mouse down (positive Y) = camera moves backward (further)
    const targetZ = 15 - mouseY * 5;  // Range from 10 to 20
    const targetY = 8 + Math.abs(mouseY) * 2;  // Height increases slightly when looking from extreme angles

    camera.position.x += (targetX - camera.position.x) * 0.08;  // Smoother interpolation
    camera.position.z += (targetZ - camera.position.z) * 0.08;  // Smooth Z movement
    camera.position.y += (targetY - camera.position.y) * 0.08;  // Keep camera above plane
    camera.rotation.y += (targetRotY - camera.rotation.y) * 0.08;

    // Always look at a point slightly ahead of the player
    const lookAtPoint = new THREE.Vector3(player.position.x * 0.3, 0, player.position.z - 5);
    camera.lookAt(lookAtPoint);
}

// Handle firing
export function handleFire() {
    initAudio();  // Initialize audio on first click

    // If initial entry is active, don't fire or reset
    if (isInitialEntryActive()) {
        return;
    }

    if (!gameActive) {
        resetGame();
        return;
    }

    const player = getPlayer();
    if (player) {
        fireMissile(player, scene);
    }
}

// Update score
function updateScore(points) {
    score += points;
    document.getElementById('score').textContent = score;
}

// Decrease lives and return new life count
function decreaseLives() {
    lives--;
    document.getElementById('lives').textContent = lives;
    return lives;
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
}

// Game over handler
function gameOver(won) {
    gameActive = false;

    // Check if this is a high score
    if (isHighScore(score)) {
        // Show initial entry UI instead of regular game over
        showInitialEntry(scene, camera, score, (initials) => {
            // After initials are entered, show regular game over
            showGameOverScreen(won, initials);
        });
    } else {
        // Regular game over
        showGameOverScreen(won, null);
    }
}

// Show game over screen
function showGameOverScreen(won, initials) {
    const gameOverDiv = document.getElementById('gameOver');
    gameOverDiv.style.display = 'block';

    let message = '';
    if (initials) {
        message = `<div style="color: #00ff00; font-size: 36px; margin-bottom: 10px;">HIGH SCORE!</div>`;
        message += `<div style="color: #ffff00; font-size: 28px; margin-bottom: 20px;">${initials}: ${score}</div>`;
    }

    if (won) {
        message += '<div style="color: #0f0;">YOU WIN!</div><div style="font-size: 24px; margin-top: 20px;">Click to Restart</div>';
    } else {
        message += '<div style="color: #f00;">GAME OVER</div><div style="font-size: 24px; margin-top: 20px;">Click to Restart</div>';
    }

    gameOverDiv.innerHTML = message;
}

// Reset game
function resetGame() {
    // Hide initial entry if active
    hideInitialEntry();

    // Reset game state
    resetAliens(scene);
    resetMissiles(scene);
    resetParticles(scene);

    score = 0;
    lives = 3;

    updateUI();
    document.getElementById('gameOver').style.display = 'none';

    createAliens(scene);
    gameActive = true;
}

// Main game update loop
export function update() {
    const mouse = getMousePosition();
    const player = getPlayer();

    if (!player) return;

    if (gameActive) {
        updatePlayer(mouse.x);
        updateAliens(gameOver);
        checkAlienFire(scene);
    }

    // Always update missiles, camera, particles, and starfield (even after game over)
    updateMissiles(scene, updateScore, gameOver);
    updateAlienMissiles(player, scene, gameActive, decreaseLives, gameOver);
    updateCamera(player, mouse.x, mouse.y);
    updateParticles(scene);
    updateStarfield();

    // Update high score UI animations
    updateHighScoreUI();

    // Always animate aliens (even after game over)
    const aliens = getAliens();
    for (let alien of aliens) {
        if (!alien.userData.destroyed) {
            animateAlien(alien);
        }
    }
}

// Get game active state
export function isGameActive() {
    return gameActive;
}

// Get current score
export function getScore() {
    return score;
}
