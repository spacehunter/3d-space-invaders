import { selectWeaponByHotkey, cycleWeapon, getCurrentWeaponConfig } from './weapons.js';

// Input handling
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let onFireCallback = null;
let onWeaponSwitchCallback = null;

// Initialize input handlers
export function initInput(fireCallback, weaponSwitchCallback = null) {
    onFireCallback = fireCallback;
    onWeaponSwitchCallback = weaponSwitchCallback;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    // Keep click for single fire fallback or menu interactions
    window.addEventListener('click', onMouseClick);

    // Keyboard handlers for weapon switching
    window.addEventListener('keydown', onKeyDown);

    // Mouse wheel for cycling weapons
    window.addEventListener('wheel', onMouseWheel);
}

// Keyboard handler for weapon selection
function onKeyDown(event) {
    const key = event.key;

    // Number keys 1-7 for weapon selection
    if (key >= '1' && key <= '7') {
        const hotkeyNum = parseInt(key);
        if (selectWeaponByHotkey(hotkeyNum)) {
            if (onWeaponSwitchCallback) {
                onWeaponSwitchCallback(getCurrentWeaponConfig());
            }
        }
    }

    // Q/E for previous/next weapon
    if (key === 'q' || key === 'Q') {
        if (cycleWeapon(-1)) {
            if (onWeaponSwitchCallback) {
                onWeaponSwitchCallback(getCurrentWeaponConfig());
            }
        }
    }
    if (key === 'e' || key === 'E') {
        if (cycleWeapon(1)) {
            if (onWeaponSwitchCallback) {
                onWeaponSwitchCallback(getCurrentWeaponConfig());
            }
        }
    }
}

// Mouse wheel handler for weapon cycling
function onMouseWheel(event) {
    // Prevent page scrolling
    event.preventDefault();

    const direction = event.deltaY > 0 ? 1 : -1;
    if (cycleWeapon(direction)) {
        if (onWeaponSwitchCallback) {
            onWeaponSwitchCallback(getCurrentWeaponConfig());
        }
    }
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
