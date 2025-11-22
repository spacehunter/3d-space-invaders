import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createPlayer } from './player.js';
import { createStarfield } from './starfield.js';
import { createAliens } from './aliens.js';
import { initInput } from './input.js';
import { initGame, update, handleFire } from './game.js';
import { updateHighScoresDisplay } from './highscores.js';

let scene, camera, renderer, composer, bloomPass;

// Initialize the game
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 100);

    // Camera - 3rd person view
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Post-processing for retro glow effect
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // UnrealBloomPass for that 80s vector glow aesthetic
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,    // strength - adjustable via slider (increased default)
        0.8,    // radius - larger for more diffuse glow
        0.6     // threshold - higher to only affect bright emissive objects
    );
    composer.addPass(bloomPass);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Point lights for atmosphere
    const greenLight = new THREE.PointLight(0x00ff00, 1, 50);
    greenLight.position.set(0, 5, 0);
    scene.add(greenLight);

    // Create game entities
    createPlayer(scene);
    createAliens(scene);
    createStarfield(scene);

    // Initialize game state
    initGame(scene, camera);

    // Initialize input
    initInput(handleFire);

    // Initialize high scores display
    updateHighScoresDisplay();

    // Glow intensity slider with localStorage persistence
    const glowSlider = document.getElementById('glowSlider');
    const glowValue = document.getElementById('glowValue');

    // Load saved glow intensity from localStorage
    const savedGlowIntensity = localStorage.getItem('spaceInvaders3D_glowIntensity');
    if (savedGlowIntensity !== null) {
        const intensity = parseFloat(savedGlowIntensity);
        bloomPass.strength = intensity;
        glowSlider.value = intensity;
        glowValue.textContent = intensity.toFixed(2);
    }

    glowSlider.addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        bloomPass.strength = intensity;
        glowValue.textContent = intensity.toFixed(2);
        // Save to localStorage
        localStorage.setItem('spaceInvaders3D_glowIntensity', intensity.toString());
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
}

// FPS tracking
let lastTime = performance.now();
let frameCount = 0;
const fpsElement = document.getElementById('fps');

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

    // Update game state
    update();

    // Render scene with post-processing
    composer.render();
}

// Start the game
init();
animate();
