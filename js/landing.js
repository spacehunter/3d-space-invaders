// Landing page management
let landingElement = null;
let isLandingVisible = true;
let onStartCallback = null;

// Initialize the landing page
export function initLanding(onStart) {
    landingElement = document.getElementById('landingPage');
    onStartCallback = onStart;

    if (landingElement) {
        // Handle click on landing page
        landingElement.addEventListener('click', handleStart);

        // Also handle key press to start
        document.addEventListener('keydown', handleKeyStart);
    }
}

// Handle start action
function handleStart(e) {
    if (!isLandingVisible) return;

    // Prevent the click from propagating to game
    e.stopPropagation();

    hideLanding();

    if (onStartCallback) {
        onStartCallback();
    }
}

// Handle key press to start
function handleKeyStart(e) {
    if (!isLandingVisible) return;

    // Start on Space or Enter
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        hideLanding();

        if (onStartCallback) {
            onStartCallback();
        }
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
