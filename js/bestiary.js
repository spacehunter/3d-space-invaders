// Bestiary - a gallery view for browsing the alien models up close.
//
// Runs in its own THREE.Scene with its own camera and lighting, but reuses the
// game's renderer and EffectComposer (main.js swaps the RenderPass over while
// the gallery is open) so the bloom/tone mapping look matches the game exactly.
import * as THREE from 'three';
import { createAlienPreview, animateAlien } from './aliens.js';

// Facts pulled from README.md's "Aliens" section - do not invent capabilities.
const BESTIARY_ENTRIES = [
    {
        name: 'OCTOPUS',
        row: 0,
        points: 60,
        color: '#c060ff',
        tagline: 'TOP ROW - PURPLE',
        description: 'Sculpted voxel mantle with a domed hood, brow ridge and side fins. Six jointed tentacles curl a wave down their length while a jet propulsion cycle flares the hood, bioluminescent collar vents pulse, hooded eyes blink and the beak chomps.',
        weapon: 'Standard red missiles'
    },
    {
        name: 'CRAB',
        row: 1,
        points: 50,
        color: '#ff4444',
        tagline: 'ROW 2 - RED',
        description: 'Tiered armoured carapace with a serrated front rim and lateral spikes. Jointed pincer claws straighten and snap, six legs walk an alternating tripod gait, eye stalks swivel and duck, and molten shell seams glow hotter with every snap.',
        weapon: 'Standard red missiles'
    },
    {
        name: 'SQUID',
        row: 2,
        points: 40,
        color: '#44ff88',
        tagline: 'ROW 3 - GREEN',
        description: 'Tapered voxel mantle with side fins and a jet siphon. The mantle squashes and the siphon flashes on each thrust, chromatophore spots flush with the jet, the fins undulate then sweep flat to streamline, a wave travels around the six-arm crown and down each arm, and two clubbed feeding tentacles lash out every few seconds.',
        weapon: 'Standard red missiles'
    },
    {
        name: 'UFO',
        row: 3,
        points: 30,
        color: '#ffee44',
        tagline: 'ROW 4 - YELLOW',
        description: 'Layered saucer hull of stacked voxel discs with panel seams and landing struts. The hull spins one way beneath a level canopy while the light collar counter-rotates, true chase lights travel around the ring, a pilot silhouette looks around inside, and a scan beam stabs downward every few seconds.',
        weapon: 'Standard red missiles'
    },
    {
        name: 'TANK',
        row: 4,
        points: 20,
        color: '#44ddff',
        tagline: 'ROW 5 - CYAN',
        description: 'Sloped armour hull with glacis plate, side skirts and exhaust stacks. A real belt of tread plates wraps the bogies at the formation\'s actual speed, road wheels spin geared to it, the turret rotates under a sweeping radar dish, and the gun recoils into the mantlet on each shot.',
        weapon: 'Homing missiles with particle trails'
    },
    {
        name: 'BEETLE',
        row: 5,
        points: 10,
        color: '#ff9933',
        tagline: 'ROW 6 - ORANGE',
        description: 'Classic 70s arcade insect with a rounded shell, scuttling six-leg animation in an alternating tripod gait, and antennae that waggle above glowing pulsing tips.',
        weapon: 'Web bombs - slow projectiles that create danger zones'
    },
    {
        name: 'INVADER',
        row: 6,
        points: 0,
        color: '#ffffff',
        tagline: 'ROW 7 - WHITE - BONUS ROW',
        description: 'Classic 1-bit arcade silhouette rebuilt in layered pale steel plates with bevelled edges and cyan recessed optics. It marches in a hard two-frame sprite flip rather than a smooth walk, antennae sway above the crown, and the centre blaster cannon charges, flashes and recoils into its housing on each shot.',
        weapon: 'Blaster bolts - straight-shooting, high speed'
    }
];

// The models differ a lot in footprint, so each is scaled to fit this box
// rather than carrying a hand-tuned number that would rot as models change.
// Measured on the rest pose, so it leaves headroom for animations that grow
// the model (the squid's squash-and-stretch runs to about 1.3x).
const TARGET_SIZE = 2.1;

let bestiaryScene = null;
let bestiaryCamera = null;
let pivot = null;              // turntable - rotates the whole display
let holder = null;             // fit transform - scales/centres the model
let currentAlien = null;
let currentIndex = 0;
let active = false;
let onCloseCallback = null;
// The keypress that opens the gallery keeps bubbling to this module's own
// document listener; ignore that first event so 'B' does not open and close
let justOpened = false;

// Cache built models so paging back and forth does not rebuild geometry
const previewCache = new Map();

// UI elements
let overlay = null;
let nameEl = null;
let taglineEl = null;
let pointsEl = null;
let descriptionEl = null;
let weaponEl = null;
let counterEl = null;

/**
 * Build the gallery scene and wire up its UI. Called once at startup.
 * @param {Function} onClose - invoked when the player leaves the gallery
 */
export function initBestiary(onClose) {
    onCloseCallback = onClose;

    bestiaryScene = new THREE.Scene();
    bestiaryScene.background = new THREE.Color(0x010208);

    bestiaryCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    bestiaryCamera.position.set(0, 0.8, 6.5);
    bestiaryCamera.lookAt(0, 0, 0);

    // Lighting mirrors main.js so the models read the same as they do in game
    bestiaryScene.add(new THREE.HemisphereLight(0x3a4a8a, 0x1a0b2e, 0.7));
    bestiaryScene.add(new THREE.AmbientLight(0x303040));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 5);
    bestiaryScene.add(dirLight);

    // Rim lights either side pick the silhouette out against the dark
    const greenLight = new THREE.PointLight(0x00ff88, 0.9, 30);
    greenLight.position.set(0, 3, 5);
    bestiaryScene.add(greenLight);

    const magentaLight = new THREE.PointLight(0xff00aa, 0.9, 30);
    magentaLight.position.set(-5, 1, -3);
    bestiaryScene.add(magentaLight);

    const cyanLight = new THREE.PointLight(0x00aaff, 0.9, 30);
    cyanLight.position.set(5, 1, -3);
    bestiaryScene.add(cyanLight);

    bestiaryScene.add(createBackdropStars());

    pivot = new THREE.Group();
    pivot.position.y = 0.7;    // sit the model above the info panel
    bestiaryScene.add(pivot);

    holder = new THREE.Group();
    pivot.add(holder);

    cacheUIElements();
    wireUIEvents();
}

// A local star field for depth. Deliberately not starfield.js - that module
// keeps its stars in module state that the game scene owns.
function createBackdropStars() {
    const count = 600;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 90;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = -20 - Math.random() * 50;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x88bbff,
        size: 0.28,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75
    });

    return new THREE.Points(geometry, material);
}

function cacheUIElements() {
    overlay = document.getElementById('bestiaryOverlay');
    nameEl = document.getElementById('bestiaryName');
    taglineEl = document.getElementById('bestiaryTagline');
    pointsEl = document.getElementById('bestiaryPoints');
    descriptionEl = document.getElementById('bestiaryDescription');
    weaponEl = document.getElementById('bestiaryWeapon');
    counterEl = document.getElementById('bestiaryCounter');
}

function wireUIEvents() {
    const prevBtn = document.getElementById('bestiaryPrev');
    const nextBtn = document.getElementById('bestiaryNext');
    const backBtn = document.getElementById('bestiaryBack');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEntry(currentIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEntry(currentIndex + 1);
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeBestiary();
        });
    }

    document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
    if (!active || justOpened) return;

    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            e.preventDefault();
            showEntry(currentIndex - 1);
            break;
        case 'ArrowRight':
        case 'KeyD':
            e.preventDefault();
            showEntry(currentIndex + 1);
            break;
        case 'KeyB':
        case 'Backspace':
            e.preventDefault();
            closeBestiary();
            break;
    }
}

/** Open the gallery. */
export function openBestiary() {
    if (active) return;

    active = true;
    justOpened = true;
    requestAnimationFrame(() => { justOpened = false; });

    document.body.classList.add('bestiary-open');

    if (overlay) {
        overlay.style.display = 'flex';
        // Next frame so the fade-in transition actually runs
        requestAnimationFrame(() => overlay.classList.add('visible'));
    }

    showEntry(currentIndex);
}

/** Leave the gallery and hand control back to the landing page. */
export function closeBestiary() {
    if (!active) return;

    active = false;
    document.body.classList.remove('bestiary-open');

    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            if (!active && overlay) overlay.style.display = 'none';
        }, 400);
    }

    if (onCloseCallback) onCloseCallback();
}

export function isBestiaryActive() {
    return active;
}

export function getBestiaryScene() {
    return bestiaryScene;
}

export function getBestiaryCamera() {
    return bestiaryCamera;
}

// Swap the displayed alien, wrapping around at both ends
function showEntry(index) {
    const count = BESTIARY_ENTRIES.length;
    currentIndex = ((index % count) + count) % count;
    const entry = BESTIARY_ENTRIES[currentIndex];

    if (currentAlien) holder.remove(currentAlien);

    const preview = getPreview(entry.row);
    currentAlien = preview.alien;
    holder.add(currentAlien);
    holder.scale.setScalar(preview.fit.scale);
    holder.position.set(-preview.fit.centerX * preview.fit.scale, -preview.fit.centerY * preview.fit.scale, 0);
    pivot.rotation.y = 0;

    if (nameEl) {
        nameEl.textContent = entry.name;
        nameEl.style.color = entry.color;
        nameEl.style.textShadow = `0 0 10px ${entry.color}, 0 0 25px ${entry.color}`;
    }
    if (taglineEl) taglineEl.textContent = entry.tagline;
    if (pointsEl) pointsEl.textContent = `${entry.points} PTS`;
    if (descriptionEl) descriptionEl.textContent = entry.description;
    if (weaponEl) weaponEl.textContent = `ARMAMENT: ${entry.weapon}`;
    if (counterEl) counterEl.textContent = `${currentIndex + 1} / ${count}`;
}

// Build (once) a model plus the transform that frames it. The fit is measured
// on the freshly built model, before any animation has moved its parts.
function getPreview(row) {
    if (!previewCache.has(row)) {
        const alien = createAlienPreview(row);

        const box = new THREE.Box3().setFromObject(alien);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const largest = Math.max(size.x, size.y, size.z) || 1;

        previewCache.set(row, {
            alien,
            fit: {
                scale: TARGET_SIZE / largest,
                centerX: center.x,
                centerY: center.y
            }
        });
    }
    return previewCache.get(row);
}

/** Per-frame update: slow turntable plus the model's own animation. */
export function updateBestiary() {
    if (!active || !currentAlien) return;

    // The alien's own animation owns its rotation and Y position, so the
    // turntable spin has to live on the parent pivot.
    pivot.rotation.y += 0.006;

    animateAlien(currentAlien);
}

export function onBestiaryResize() {
    if (!bestiaryCamera) return;

    bestiaryCamera.aspect = window.innerWidth / window.innerHeight;
    bestiaryCamera.updateProjectionMatrix();
}
