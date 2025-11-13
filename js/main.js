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
        1.0,    // strength - adjustable via slider
        0.6,    // radius - larger for more diffuse glow
        0.3     // threshold - lower to make more objects glow
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

    // Glow intensity slider
    const glowSlider = document.getElementById('glowSlider');
    const glowValue = document.getElementById('glowValue');
    glowSlider.addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        bloomPass.strength = intensity;
        glowValue.textContent = intensity.toFixed(2);
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update game state
    update();

    // Render scene with post-processing
    composer.render();
}

// Start the game
init();
animate();
