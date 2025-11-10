import * as THREE from 'three';
import { createPlayer } from './player.js';
import { createStarfield } from './starfield.js';
import { createAliens } from './aliens.js';
import { initInput } from './input.js';
import { initGame, update, handleFire } from './game.js';

let scene, camera, renderer;

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

    // Event listeners
    window.addEventListener('resize', onWindowResize);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update game state
    update();

    // Render scene
    renderer.render(scene, camera);
}

// Start the game
init();
animate();
