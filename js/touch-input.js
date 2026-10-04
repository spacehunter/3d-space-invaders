// Touch input handling for mobile — writes to input.js exports
// Supports multitouch: virtual joystick (left), fire button (right)

import { syncTouchX, syncTouchInactive, syncTouchFire } from './input.js';

let screenW = window.innerWidth;
let screenH = window.innerHeight;

// --- Layout constants ---
// Adjusted for better touch targets on portrait (phone held upright) vs landscape
const JOYSTICK_CX_FRAC = 0.22;
const JOYSTICK_CY_FRAC = 0.75;
const JOYSTICK_R_FRAC  = 0.13;
const FIRE_CX_FRAC     = 0.78;
const FIRE_CY_FRAC     = 0.75;
const FIRE_R_FRAC      = 0.08;

// Minimum button radius in pixels (ensures usable targets on small screens)
const MIN_JOYSTICK_R = 50;
const MIN_FIRE_R = 40;

let joystickId = null;
let fireId     = null;
let touchFiring = false;

// UI element refs
let joystickBase = null;
let joystickStick = null;
let fireBtn = null;

function resetSize() {
    screenW = window.innerWidth;
    screenH = window.innerHeight;
}
window.addEventListener('resize', resetSize);

// ---------- layout ----------
function joystickCX() { return Math.max(screenW * JOYSTICK_CX_FRAC, 60); }
function joystickCY() { return Math.min(screenH * JOYSTICK_CY_FRAC, screenH - 80); }
function joystickR()  { return Math.max(Math.min(screenW, screenH) * JOYSTICK_R_FRAC, MIN_JOYSTICK_R); }

function fireCX() { return Math.min(screenW * FIRE_CX_FRAC, screenW - 60); }
function fireCY() { return Math.min(screenH * FIRE_CY_FRAC, screenH - 80); }
function fireR()  { return Math.max(Math.min(screenW, screenH) * FIRE_R_FRAC, MIN_FIRE_R); }

function midX() { return screenW / 2; }

// ---------- public API ----------

/**
 * Initialize touch input. Must be called with the canvas element.
 * Also prevents scrolling/zooming on the game area.
 */
export function initTouchInput() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // Build the overlay before wiring input. Its interactive child zones receive
    // touches above the canvas; events bubble to this shared surface so a
    // joystick touch and FIRE touch can be tracked simultaneously.
    createTouchUI();
    const touchSurface = document.getElementById('touchControls') || canvas;

    // Prevent default touch behaviors (scroll, zoom, context menu)
    canvas.style.touchAction = 'none';
    canvas.style.userSelect  = 'none';
    canvas.style.webkitUserSelect = 'none';
    document.body.style.webkitTouchCallout = 'none';

    touchSurface.addEventListener('touchstart', onTouchStart,  { passive: false });
    touchSurface.addEventListener('touchmove',  onTouchMove,   { passive: false });
    touchSurface.addEventListener('touchend',   onTouchEnd,    { passive: false });
    touchSurface.addEventListener('touchcancel', onTouchCancel, { passive: false });
    touchSurface.addEventListener('contextmenu', e => e.preventDefault(), { passive: false });
}

// ---------- touch handlers ----------

function onTouchStart(e) {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < midX()) {
            if (joystickId === null) {
                joystickId = t.identifier;
                handleJoystickStart(t.clientX, t.clientY);
            }
        } else {
            if (fireId === null) {
                fireId = t.identifier;
                fireActive();
            }
        }
    }
}

function onTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickId) {
            handleJoystickMove(t.clientX, t.clientY);
        }
    }
}

function onTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickId) {
            joystickId = null;
            handleJoystickEnd();
        }
        if (t.identifier === fireId) {
            fireId = null;
            fireInactive();
        }
    }
    // Only deactivate everything if no touches remain
    if (e.touches.length === 0) {
        touchFiring = false;
        handleJoystickEnd();
    }
}

function onTouchCancel(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickId) {
            joystickId = null;
            handleJoystickEnd();
        }
        if (t.identifier === fireId) {
            fireId = null;
            fireInactive();
        }
    }
    touchFiring = false;
    if (e.touches.length === 0) handleJoystickEnd();
}

// ---------- joystick ----------

function handleJoystickStart(cx, cy) {
    moveStickVisual(cx, cy);
    joystickDelta(cx, cy);
}

function handleJoystickMove(cx, cy) {
    moveStickVisual(cx, cy);
    joystickDelta(cx, cy);
}

function handleJoystickEnd() {
    if (joystickStick) {
        joystickStick.style.transform = 'translate(0, 0)';
    }
    syncTouchX(0);
    syncTouchInactive();
}

function moveStickVisual(cx, cy) {
    if (!joystickBase || !joystickStick) return;
    const jcx = joystickCX();
    const jcy = joystickCY();
    const dx  = cx - jcx;
    const dy  = cy - jcy;
    const r   = joystickR();
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = r * 0.7;
    const scale = Math.min(1, dist / maxR);
    if (dist > 0) {
        const nx = (dx / dist) * scale * maxR;
        const ny = (dy / dist) * scale * maxR;
        joystickStick.style.transform = `translate(${nx}px, ${ny}px)`;
    }
}

function joystickDelta(cx, cy) {
    const jcx = joystickCX();
    const jcy = joystickCY();
    const r   = joystickR();
    let dx = cx - jcx;
    let dy = cy - jcy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = r * 0.7;
    if (dist > 0) {
        const scale = Math.min(1, dist / maxR);
        const nx = (dx / dist) * scale;
        syncTouchX(nx);
    } else {
        syncTouchX(0);
    }
}

// ---------- fire ----------

function fireActive() {
    touchFiring = true;
    if (fireBtn) {
        fireBtn.style.background = 'rgba(255, 0, 0, 0.55)';
        fireBtn.style.boxShadow  = '0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.4)';
    }
    syncTouchFire(true);
}

function fireInactive() {
    touchFiring = false;
    if (fireBtn) {
        fireBtn.style.background = 'rgba(255, 60, 60, 0.3)';
        fireBtn.style.boxShadow  = '0 0 15px rgba(255,0,0,0.5)';
    }
    syncTouchFire(false);
}

// ---------- touch UI ----------

function createTouchUI() {
    if (document.getElementById('touchControls')) return;

    const div = document.createElement('div');
    div.id = 'touchControls';
    div.innerHTML = `
        <div id="joystickZone">
            <div id="joystickBase"></div>
            <div id="joystickStick"></div>
        </div>
        <div id="fireZone">
            <div id="fireBtn">FIRE</div>
        </div>
    `;

    document.body.appendChild(div);

    joystickBase  = document.getElementById('joystickBase');
    joystickStick = document.getElementById('joystickStick');
    fireBtn       = document.getElementById('fireBtn');

    // Position joystick base and stick at the calculated center point
    positionJoystick();

    // Listen for orientation changes and resize to reposition elements
    window.addEventListener('orientationchange', positionJoystick);
    window.addEventListener('resize', positionJoystick);
}

function positionJoystick() {
    const cx = joystickCX();
    const cy = joystickCY();
    const r  = joystickR();

    // Joystick base
    if (joystickBase) {
        joystickBase.style.left    = (cx - r) + 'px';
        joystickBase.style.top     = (cy - r) + 'px';
        joystickBase.style.width   = (r * 2) + 'px';
        joystickBase.style.height  = (r * 2) + 'px';
    }

    // Stick — centered inside base
    if (joystickStick) {
        joystickStick.style.left    = (cx - r * 0.35) + 'px';
        joystickStick.style.top     = (cy - r * 0.35) + 'px';
        joystickStick.style.width   = (r * 0.7) + 'px';
        joystickStick.style.height  = (r * 0.7) + 'px';
    }
}