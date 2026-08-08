// Landing page management
import { getSavedProgress } from './game.js';
import { settingsManager } from './settings.js';

let landingElement = null;
let isLandingVisible = true;
let onNewGameCallback = null;
let onContinueCallback = null;
let onBestiaryCallback = null;
let savedLevel = 1;

// Initialize the landing page
export function initLanding(onNewGame, onContinue, onBestiary) {
    landingElement = document.getElementById('landingPage');
    onNewGameCallback = onNewGame;
    onContinueCallback = onContinue;
    onBestiaryCallback = onBestiary;

    // Check for saved progress
    savedLevel = getSavedProgress();

    if (landingElement) {
        const startNewBtn = document.getElementById('startNew');
        const continueBtn = document.getElementById('continueGame');
        const savedLevelSpan = document.getElementById('savedLevel');

        // Show continue option if player has progress beyond level 1
        if (savedLevel > 1 && continueBtn && savedLevelSpan) {
            savedLevelSpan.textContent = savedLevel;
            continueBtn.style.display = 'block';

            // Handle continue click
            continueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleContinue();
            });
        }

        // Handle new game click
        if (startNewBtn) {
            startNewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleNewGame();
            });
        }

        // Handle bestiary click
        const bestiaryBtn = document.getElementById('openBestiary');
        if (bestiaryBtn) {
            bestiaryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleOpenBestiary();
            });
        }

        // Handle settings click
        const settingsBtn = document.getElementById('openSettings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleOpenSettings();
            });
        }

        // Handle key press to start (defaults to new game)
        document.addEventListener('keydown', handleKeyStart);
    }
}

// Handle new game action
function handleNewGame() {
    if (!isLandingVisible) return;

    hideLanding();

    if (onNewGameCallback) {
        onNewGameCallback();
    }
}

// Handle continue action
function handleContinue() {
    if (!isLandingVisible) return;

    hideLanding();

    if (onContinueCallback) {
        onContinueCallback(savedLevel);
    }
}

// Handle bestiary open action - the landing page has to get out of the way so
// the gallery's 3D model is visible through the canvas behind it
function handleOpenBestiary() {
    if (!isLandingVisible) return;

    hideLanding();

    if (onBestiaryCallback) {
        onBestiaryCallback();
    }
}

// Handle settings open action
function handleOpenSettings() {
    if (!isLandingVisible) return;

    // Open settings panel without hiding landing page
    settingsManager.open();
}

// Handle key press to start
function handleKeyStart(e) {
    if (!isLandingVisible) return;

    // Start new game on Space or Enter
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleNewGame();
    }
    // Continue on 'C' key if there's saved progress
    if (e.code === 'KeyC' && savedLevel > 1) {
        e.preventDefault();
        handleContinue();
    }
    // Open bestiary on 'B' key
    if (e.code === 'KeyB') {
        e.preventDefault();
        handleOpenBestiary();
    }
    // Open settings on 'S' key
    if (e.code === 'KeyS') {
        e.preventDefault();
        handleOpenSettings();
    }
}

// Hide the landing page with animation
function hideLanding() {
    if (!landingElement || !isLandingVisible) return;

    isLandingVisible = false;
    landingElement.classList.add('hidden');

    // Remove from DOM after transition
    setTimeout(() => {
        if (landingElement) {
            landingElement.style.display = 'none';
        }
    }, 800);
}

// Check if landing is currently visible
export function isLandingActive() {
    return isLandingVisible;
}

// Show landing page (used when returning after game over)
export function showLanding() {
    if (!landingElement) return;

    // Update saved progress in case user just completed more levels
    savedLevel = getSavedProgress();

    const continueBtn = document.getElementById('continueGame');
    const savedLevelSpan = document.getElementById('savedLevel');

    // Update continue button visibility and level display
    if (savedLevel > 1 && continueBtn && savedLevelSpan) {
        savedLevelSpan.textContent = savedLevel;
        continueBtn.style.display = 'block';
    } else if (continueBtn) {
        continueBtn.style.display = 'none';
    }

    isLandingVisible = true;
    landingElement.style.display = 'flex';
    landingElement.classList.remove('hidden');
}
