import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPlayer } from './player.js';
import { createStarfield } from './starfield.js';
import { createAliens } from './aliens.js';
import { initInput, setMouseSensitivity } from './input.js';
import { initGame, update, handleFire, startGame, startFromLevel, resetGame, pauseGame, resumeGame } from './game.js';
import { updateHighScoresDisplay } from './highscores.js';
import { initLanding, isLandingActive, showLanding } from './landing.js';
import { initBestiary, openBestiary, isBestiaryActive, updateBestiary, getBestiaryScene, getBestiaryCamera, onBestiaryResize } from './bestiary.js';
import { initAudio, setMasterVolume, setSFXVolume, setMusicVolume, setMute } from './audio.js';
import { settingsManager } from './settings.js';

let scene, camera, renderer, composer, bloomPass, renderPass;

// Glow intensity from settings, and the factor applied on top of it. The
// bestiary views models from close up, where full gameplay bloom blows the
// bright emissive types (the white Invader especially) out to a flat blob.
let baseBloomStrength = 1.5;
const BESTIARY_BLOOM_SCALE = 0.5;

function applyBloomStrength() {
    bloomPass.strength = baseBloomStrength * (isBestiaryActive() ? BESTIARY_BLOOM_SCALE : 1);
}

// Initialize the game
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010208);
    scene.fog = new THREE.Fog(0x02030a, 10, 110);

    // Camera - 3rd person view
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    document.body.appendChild(renderer.domElement);

    // Post-processing for retro glow effect
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // UnrealBloomPass for that 80s vector glow aesthetic
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,    // strength - adjustable via slider (increased default)
        0.8,    // radius - larger for more diffuse glow
        0.6     // threshold - higher to only affect bright emissive objects
    );
    composer.addPass(bloomPass);

    // OutputPass applies tone mapping + sRGB conversion after bloom
    composer.addPass(new OutputPass());

    // Lighting - hemisphere for cool space ambience, directional key light with soft shadows
    const hemiLight = new THREE.HemisphereLight(0x3a4a8a, 0x1a0b2e, 0.7);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x303040);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    // Accent point lights for arcade atmosphere
    const greenLight = new THREE.PointLight(0x00ff88, 0.8, 50);
    greenLight.position.set(0, 5, 8);
    scene.add(greenLight);

    const magentaLight = new THREE.PointLight(0xff00aa, 0.6, 60);
    magentaLight.position.set(-15, 3, -20);
    scene.add(magentaLight);

    const cyanLight = new THREE.PointLight(0x00aaff, 0.6, 60);
    cyanLight.position.set(15, 3, -20);
    scene.add(cyanLight);

    // Create game entities
    createPlayer(scene);
    createStarfield(scene);

    // Initialize game state (must be before createAliens so levelConfig is set)
    initGame(scene, camera);

    // Create aliens after initGame so they use Level 1 config (5x7)
    createAliens(scene);

    // Initialize input
    initInput(handleFire);

    // Initialize high scores display
    updateHighScoresDisplay();

    // Initialize the bestiary gallery before the landing page so its document
    // keydown listener runs first and never sees the keypress that opened it
    initBestiary(() => showLanding());

    // Initialize landing page with start callbacks
    initLanding(
        // New game callback
        () => {
            initAudio();
            resetGame();  // Reset everything and start from level 1
        },
        // Continue from level callback
        (level) => {
            initAudio();
            startFromLevel(level);
        },
        // Bestiary callback
        () => {
            openBestiary();
        }
    );

    // Wire up settings to game systems BEFORE initializing settings manager
    // This ensures loaded settings are applied when init() calls applyAllSettings()
    settingsManager.on('masterVolume', (value) => {
        setMasterVolume(value);
    });

    settingsManager.on('sfxVolume', (value) => {
        setSFXVolume(value);
    });

    settingsManager.on('musicVolume', (value) => {
        setMusicVolume(value);
    });

    settingsManager.on('muteAll', (value) => {
        setMute(value);
    });

    settingsManager.on('glowIntensity', (value) => {
        baseBloomStrength = value;
        applyBloomStrength();
    });

    settingsManager.on('showFPS', (value) => {
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.style.display = value ? 'block' : 'none';
        }
    });

    settingsManager.on('mouseSensitivity', (value) => {
        setMouseSensitivity(value);
    });

    settingsManager.on('particleDensity', (value) => {
        // Will be implemented in particles.js
        console.log('Particle density:', value);
    });

    settingsManager.on('showHitboxes', (value) => {
        // Debug feature - will be implemented later
        console.log('Show hitboxes:', value);
    });

    // Initialize settings manager AFTER listeners are registered
    // This allows applyAllSettings() to notify all listeners with loaded values
    settingsManager.init();

    // Pause/resume game when settings panel opens/closes
    settingsManager.on('panelOpen', (isOpen) => {
        if (isOpen) {
            pauseGame();
        } else {
            // Only resume if we're not on the landing page or in the bestiary
            if (!isLandingActive() && !isBestiaryActive()) {
                resumeGame();
            }
        }
    });

    // Event listeners
    window.addEventListener('resize', onWindowResize);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    onBestiaryResize();
}

// FPS tracking
let lastTime = performance.now();
let frameCount = 0;
const fpsElement = document.getElementById('fps');

// Version display
const versionElement = document.getElementById('version');
versionElement.textContent = `v${__APP_VERSION__}`;

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Calculate FPS
    const currentTime = performance.now();
    frameCount++;

    if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        fpsElement.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastTime = currentTime;
    }

    // The bestiary borrows the composer: point the RenderPass at its scene so
    // the gallery gets the same bloom and tone mapping as the game
    applyBloomStrength();

    if (isBestiaryActive()) {
        updateBestiary();
        renderPass.scene = getBestiaryScene();
        renderPass.camera = getBestiaryCamera();
    } else {
        renderPass.scene = scene;
        renderPass.camera = camera;

        // Update game state
        update();
    }

    // Render scene with post-processing
    composer.render();
}

// Start the game
init();
animate();
