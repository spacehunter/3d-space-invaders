// Input handling
let mouseX = 0;
let mouseY = 0;
let onFireCallback = null;

// Initialize input handlers
export function initInput(fireCallback) {
    onFireCallback = fireCallback;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
}

// Mouse move handler
function onMouseMove(event) {
    // Normalize mouse position
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;  // -1 at top, 1 at bottom
}

// Mouse click handler
function onMouseClick(event) {
    if (onFireCallback) {
        onFireCallback();
    }
}

// Get mouse position
export function getMousePosition() {
    return { x: mouseX, y: mouseY };
}
