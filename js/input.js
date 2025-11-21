// Input handling
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let onFireCallback = null;

// Initialize input handlers
export function initInput(fireCallback) {
    onFireCallback = fireCallback;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    // Keep click for single fire fallback or menu interactions
    window.addEventListener('click', onMouseClick);
}

// Mouse move handler
function onMouseMove(event) {
    // Normalize mouse position
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;  // -1 at top, 1 at bottom
}

// Mouse down handler
function onMouseDown(event) {
    isMouseDown = true;
    if (onFireCallback) {
        onFireCallback();
    }
}

// Mouse up handler
function onMouseUp(event) {
    isMouseDown = false;
}

// Mouse click handler (optional, mostly covered by mousedown)
function onMouseClick(event) {
    // Can be left empty if mousedown handles firing
}

// Get mouse position
export function getMousePosition() {
    return { x: mouseX, y: mouseY };
}

// Check if mouse is held down
export function getIsMouseDown() {
    return isMouseDown;
}
