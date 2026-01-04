// Landing page management
import { getSavedProgress } from './game.js';

let landingElement = null;
let isLandingVisible = true;
let onNewGameCallback = null;
let onContinueCallback = null;
let savedLevel = 1;

// Initialize the landing page
export function initLanding(onNewGame, onContinue) {
    landingElement = document.getElementById('landingPage');
    onNewGameCallback = onNewGame;
    onContinueCallback = onContinue;

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

// Show landing page (for potential future use)
export function showLanding() {
    if (!landingElement) return;

    isLandingVisible = true;
    landingElement.style.display = 'flex';
    landingElement.classList.remove('hidden');
}
