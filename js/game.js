import * as THREE from 'three';
import { initAudio } from './audio.js';
import { getPlayer, updatePlayer, showPlayer, triggerPlayerFire } from './player.js';
import { updateStarfield, setStarfieldSpeed } from './starfield.js';
import { createAliens, updateAliens, animateAlien, getAliens, resetAliens, setAlienConfig } from './aliens.js';
import { fireMissile, updateMissiles, updateAlienMissiles, updateUFOMissiles, updateWebBombs, updateBlasterBolts, updateVenomDarts, updateWaspNeedles, checkAlienFire, resetMissiles, initUFOMissiles, setLevelCompleteCallback } from './missiles.js';
import { updateParticles, updateShrapnelParticles, resetParticles } from './particles.js';
import { getMousePosition } from './input.js';
import { isHighScore, showInitialEntry, updateHighScoreUI, hideInitialEntry, isInitialEntryActive } from './highscores.js';
import { spawnBonusUFO, updateBonusUFO, resetBonusUFO } from './bonus-ufo.js';
import { createBarriers, resetBarriers } from './barriers.js';
import { updatePowerUps, resetPowerUps } from './powerups.js';
import { getIsMouseDown } from './input.js';
import { getLevelConfig } from './levels.js';
import { startLevelTransition, isInTransition, forceEndTransition, updateTransition } from './transitions.js';
import { spawnBoss, updateBoss, getCurrentBoss, resetBoss, damageBoss, getBossHitRadius } from './boss.js';
import { showLanding } from './landing.js';
import { isBestiaryActive } from './bestiary.js';

// Game state
let scene;
let camera;
let score = 0;
let lives = 3;
let gameActive = false;  // Start inactive, wait for landing page
let gameStarted = false;  // Track if game has been started from landing

// Level state
let currentLevel = 1;
let levelConfig = null;
let damageTakenThisLevel = false;
let livesAtLevelStart = 3;
let isBossLevel = false;

// Initialize game state
export function initGame(sceneRef, cameraRef) {
    scene = sceneRef;
    camera = cameraRef;
    score = 0;
    lives = 3;
    gameActive = false;  // Wait for startGame() call
    gameStarted = false;

    // Initialize level system
    currentLevel = 1;
    damageTakenThisLevel = false;
    livesAtLevelStart = lives;

    // Get level 1 configuration
    levelConfig = getLevelConfig(currentLevel);
    isBossLevel = levelConfig.isBossLevel;

    // Apply level config to aliens
    setAlienConfig(levelConfig);

    // Initialize UFO missile system
    initUFOMissiles();

    // Set up level complete callback
    setLevelCompleteCallback(handleLevelComplete);

    // Create barriers
    createBarriers(scene);

    updateUI();
    updateLevelDisplay();
}

// Start the game (called from landing page)
export function startGame() {
    if (gameStarted) return;  // Prevent double start
    gameStarted = true;
    gameActive = true;
}

// Start from a specific level (for continue feature)
export function startFromLevel(targetLevel) {
    // Allow restart by setting flag
    gameStarted = true;

    // Reset game state for fresh start at target level
    resetMissiles(scene);
    resetParticles(scene);
    resetBonusUFO(scene);
    resetPowerUps(scene);
    resetBoss(scene);

    // Reset barriers to full health
    createBarriers(scene);

    // Reset lives and score for fresh start
    score = 0;
    lives = 3;
    livesAtLevelStart = 3;
    damageTakenThisLevel = false;

    updateUI();  // Update the UI to show 3 lives

    // Hide and clear game over screen (if visible)
    const gameOverDiv = document.getElementById('gameOver');
    if (gameOverDiv) {
        gameOverDiv.style.display = 'none';
        gameOverDiv.innerHTML = '';
    }

    // Ensure player is visible for new game
    showPlayer();

    // Set up the target level
    currentLevel = targetLevel;
    levelConfig = getLevelConfig(currentLevel);
    isBossLevel = levelConfig.isBossLevel;

    // Apply level config
    setAlienConfig(levelConfig);

    // Clear existing aliens and create new ones for this level
    resetAliens(scene);

    if (isBossLevel) {
        spawnBoss(levelConfig.bossType, levelConfig.bossEnhancement, scene);
    } else {
        createAliens(scene);
    }

    updateLevelDisplay();
    gameActive = true;
}

// Save progress to localStorage
function saveProgress(level) {
    const savedLevel = getSavedProgress();
    // Only save if this is a higher level than previously saved
    if (level > savedLevel) {
        localStorage.setItem('spaceInvaders3D_highestLevel', level.toString());
    }
}

// Get saved progress from localStorage
export function getSavedProgress() {
    const saved = localStorage.getItem('spaceInvaders3D_highestLevel');
    return saved ? parseInt(saved, 10) : 1;
}

// Update camera position based on player and mouse
export function updateCamera(player, mouseX, mouseY) {
    // If high score entry is active, lock camera to face the panel
    if (isInitialEntryActive()) {
        // High score panel is at position (0, -2, 5)
        // Position camera to face it directly
        const targetX = 0;
        const targetY = 2;  // Slightly above for better viewing angle
        const targetZ = 12;  // Back from the panel

        camera.position.x += (targetX - camera.position.x) * 0.1;
        camera.position.y += (targetY - camera.position.y) * 0.1;
        camera.position.z += (targetZ - camera.position.z) * 0.1;

        // Look directly at the high score panel
        camera.lookAt(0, -2, 5);
        return;
    }

    // Normal gameplay camera
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

    // Clicks belong to the gallery while it is open - they must not fire or
    // bounce the player back to the landing page
    if (isBestiaryActive()) {
        return;
    }

    // If initial entry is active, don't fire or reset
    if (isInitialEntryActive()) {
        return;
    }

    // Don't allow reset during level transition
    if (isInTransition()) {
        return;
    }

    if (!gameActive) {
        // Return to landing page instead of restarting directly
        returnToLanding();
        return;
    }

    const player = getPlayer();
    if (player) {
        if (fireMissile(player, scene)) {
            triggerPlayerFire();
        }
    }
}

// Update score
function updateScore(points) {
    score += points;
    document.getElementById('score').textContent = score;
}

// Decrease lives and return new life count
function decreaseLives() {
    lives = Math.max(0, lives - 1);  // Clamp at 0 to prevent negative lives
    damageTakenThisLevel = true;  // Track for perfect bonus
    document.getElementById('lives').textContent = lives;
    return lives;
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
}

// Update level display
function updateLevelDisplay() {
    const levelElement = document.getElementById('levelIndicator');
    if (levelElement) {
        if (isBossLevel) {
            levelElement.textContent = `BOSS - ${levelConfig.bossType.toUpperCase()}`;
            levelElement.style.color = '#ff0000';
            levelElement.style.textShadow = '0 0 10px #ff0000, 0 0 20px #ff0000';
        } else {
            levelElement.textContent = `LEVEL ${currentLevel}`;
            levelElement.style.color = '#00ffff';
            levelElement.style.textShadow = '0 0 10px #00ffff, 0 0 20px #00ffff';
        }
    }
}

// Handle level completion (called when all aliens destroyed or boss defeated)
export function handleLevelComplete() {
    if (isInTransition()) return;

    gameActive = false;  // Pause gameplay during transition

    const expectedLevel = currentLevel;  // Capture current level for callback validation
    startLevelTransition(
        currentLevel,
        score,
        !damageTakenThisLevel,
        lives,
        scene,
        (nextLevel, bonusPoints) => {
            // Ignore callback if game was reset during transition
            if (currentLevel !== expectedLevel) {
                return;
            }

            // Update score with bonus
            score += bonusPoints;
            updateUI();

            // Advance to next level
            currentLevel = nextLevel;
            levelConfig = getLevelConfig(currentLevel);
            isBossLevel = levelConfig.isBossLevel;
            damageTakenThisLevel = false;
            livesAtLevelStart = lives;

            // Save progress - player has unlocked this level
            saveProgress(currentLevel);

            // Start next level
            if (isBossLevel) {
                startBossLevel();
            } else {
                startWaveLevel();
            }

            gameActive = true;
            updateLevelDisplay();
        }
    );
}

// Start a regular wave level
function startWaveLevel() {
    // Reset systems for new level
    resetMissiles(scene);
    resetParticles(scene);
    resetPowerUps(scene);
    resetBonusUFO(scene);
    resetBoss(scene);
    resetAliens(scene);  // Clear any leftover alien state

    // Apply level configuration
    setAlienConfig(levelConfig);

    // Create new alien wave
    createAliens(scene);

    // Partial barrier repair (50% of damage)
    partialBarrierRepair(0.5);
}

// Start a boss level
function startBossLevel() {
    // Reset systems
    resetMissiles(scene);
    resetParticles(scene);
    resetPowerUps(scene);
    resetBonusUFO(scene);
    resetAliens(scene);

    // Spawn boss
    spawnBoss(levelConfig.bossType, levelConfig.bossEnhancement, scene);

    // Full barrier repair for boss fight
    partialBarrierRepair(1.0);
}

// Partial barrier repair between levels
function partialBarrierRepair(repairRatio) {
    // For now, just recreate barriers if heavily damaged
    // A more sophisticated version could track and partially heal
    if (repairRatio >= 0.8) {
        createBarriers(scene);
    }
    // Could be enhanced to partially repair existing barriers
}

// Get current level (for external access)
export function getCurrentLevel() {
    return currentLevel;
}

// Get level configuration (for external access)
export function getLevelConfiguration() {
    return levelConfig;
}

// Check if currently in a boss level
export function isCurrentlyBossLevel() {
    return isBossLevel;
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

// Return to landing page after game over
function returnToLanding() {
    // Hide game over screen
    const gameOverDiv = document.getElementById('gameOver');
    gameOverDiv.style.display = 'none';
    gameOverDiv.innerHTML = '';

    // Hide initial entry if active
    hideInitialEntry();

    // Show landing page
    showLanding();
}

// Reset game - exported so landing page can call it
export function resetGame() {
    // Hide initial entry if active
    hideInitialEntry();

    // Force end any transitions
    forceEndTransition();
    setStarfieldSpeed(0.5);

    // Reset game state
    resetAliens(scene);
    resetMissiles(scene);
    resetParticles(scene);
    resetBonusUFO(scene);
    resetPowerUps(scene);
    resetBoss(scene);

    // Reset level state
    currentLevel = 1;
    levelConfig = getLevelConfig(currentLevel);
    isBossLevel = levelConfig.isBossLevel;
    damageTakenThisLevel = false;

    // Apply level config
    setAlienConfig(levelConfig);

    // Reset and recreate barriers
    createBarriers(scene);

    score = 0;
    lives = 3;
    livesAtLevelStart = 3;
    gameStarted = false;  // Reset game started flag

    updateUI();
    updateLevelDisplay();

    // Hide and clear game over screen
    const gameOverDiv = document.getElementById('gameOver');
    gameOverDiv.style.display = 'none';
    gameOverDiv.innerHTML = '';  // Clear old content

    // Ensure player is visible for new game
    showPlayer();

    createAliens(scene);
    gameActive = true;
}

// Main game update loop
export function update() {
    const mouse = getMousePosition();
    const player = getPlayer();

    if (!player) return;

    // Handle transitions
    if (isInTransition()) {
        updateTransition();
        // Still update camera, starfield, and particles during transitions
        updateCamera(player, mouse.x, mouse.y);
        updateParticles(scene);
        updateShrapnelParticles(scene);
        updateStarfield();
        return;
    }

    // Ensure game over screen is hidden during active gameplay (defensive)
    if (gameActive) {
        const gameOverDiv = document.getElementById('gameOver');
        if (gameOverDiv && gameOverDiv.style.display !== 'none') {
            gameOverDiv.style.display = 'none';
            gameOverDiv.innerHTML = '';
        }
    }

    if (gameActive) {
        updatePlayer(mouse.x);

        // Update based on level type
        if (isBossLevel) {
            // Boss level - update boss instead of aliens
            updateBoss(scene, player, 16.67);  // ~60fps delta
        } else {
            // Normal wave level
            updateAliens(gameOver);
            checkAlienFire(scene);

            // Spawn and update bonus UFO (only in wave levels)
            spawnBonusUFO(scene, Date.now());
            updateBonusUFO();
        }

        // Update power-ups
        updatePowerUps(scene, player);

        // Auto-fire check
        if (getIsMouseDown()) {
            handleFire();
        }
    }

    // Always update missiles, camera, particles, and starfield (even after game over)
    updateMissiles(scene, updateScore, gameOver, isBossLevel);
    updateAlienMissiles(player, scene, gameActive, decreaseLives, gameOver);
    updateUFOMissiles(player, scene, gameActive, decreaseLives, gameOver);
    updateWebBombs(player, scene, gameActive, decreaseLives, gameOver);
    updateBlasterBolts(player, scene, gameActive, decreaseLives, gameOver);
    updateVenomDarts(player, scene, gameActive, decreaseLives, gameOver);
    updateWaspNeedles(player, scene, gameActive, decreaseLives, gameOver);
    updateCamera(player, mouse.x, mouse.y);
    updateParticles(scene);
    updateShrapnelParticles(scene);
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

    // Animate boss if present
    const boss = getCurrentBoss();
    if (boss) {
        // Boss animation is handled in updateBoss
    }
}

// Get game active state
export function isGameActive() {
    return gameActive;
}

// Pause the game (for settings panel, etc.)
export function pauseGame() {
    gameActive = false;
}

// Resume the game
export function resumeGame() {
    // Only resume if game has been started
    if (gameStarted) {
        gameActive = true;
    }
}

// Get current score
export function getScore() {
    return score;
}
