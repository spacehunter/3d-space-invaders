// Input handling — supports both mouse (desktop) and touch (mobile)
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let onFireCallback = null;
let mouseSensitivity = 1.0;

// Initialize input handlers
export function initInput(fireCallback) {
    onFireCallback = fireCallback;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('click', onMouseClick);
}

// Mouse move handler
function onMouseMove(event) {
    const rawX = (event.clientX / window.innerWidth) * 2 - 1;
    const rawY = (event.clientY / window.innerHeight) * 2 - 1;
    mouseX = rawX * mouseSensitivity;
    mouseY = rawY * mouseSensitivity;
    mouseX = Math.max(-1, Math.min(1, mouseX));
    mouseY = Math.max(-1, Math.min(1, mouseY));
}

// Set mouse sensitivity
export function setMouseSensitivity(sensitivity) {
    mouseSensitivity = Math.max(0.5, Math.min(2.0, sensitivity));
}

// Mouse down handler
function onMouseDown(event) {
    isMouseDown = true;
    if (onFireCallback) onFireCallback();
}

// Mouse up handler
function onMouseUp(event) {
    isMouseDown = false;
}

// Mouse click handler
function onMouseClick(event) {
    // Intentionally left empty; mousedown handles firing
}

// Get mouse position
export function getMousePosition() {
    return { x: mouseX, y: mouseY };
}

// Check if mouse is held down
export function getIsMouseDown() {
    return isMouseDown;
}

// --- Touch bridge ---
// touch-input.js calls these to update state. This module is the single
// source of truth — game.js reads from here and never talks to touch-input.js.

/**
 * Set the current touch joystick X value (-1 to +1).
 * When a touch joystick is active this value is read instead of mouseX.
 */
let _touchX = 0;
let _touchActive = false;
let _touchFiring = false;

export function syncTouchX(x) {
    _touchX = x;
    _touchActive = true;
}

export function syncTouchInactive() {
    if (!_touchFiring) {
        _touchActive = false;
        _touchX = 0;
    }
}

export function syncTouchFire(firing) {
    _touchFiring = firing;
    if (firing && onFireCallback) onFireCallback();
    if (!firing) {
        _touchActive = false;
        _touchX = 0;
    }
}

/**
 * Called by game.js to get the effective horizontal position for movement.
 * Returns touch X if a touch device is active, otherwise mouse X.
 */
export function getMovementX() {
    return _touchActive ? _touchX : mouseX;
}