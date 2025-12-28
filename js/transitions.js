// Level transition system - handles visual transitions between levels
import * as THREE from 'three';
import { getLevelBonus, getWaveAnnouncement } from './levels.js';
import {
    playLevelComplete,
    playWarpSound,
    playBossWarning,
    playLevelStart
} from './audio.js';
import { setStarfieldSpeed } from './starfield.js';

// Transition state
let isTransitioning = false;
let transitionGroup = null;
let currentScene = null;
let transitionCallback = null;

// HTML elements
let overlay = null;
let mainText = null;
let subText = null;

// Transition timing constants
const TIMING = {
    LEVEL_COMPLETE_DURATION: 2000,
    BONUS_DISPLAY_DURATION: 1500,
    HYPERSPACE_DURATION: 1500,
    LEVEL_ANNOUNCE_DURATION: 2000,
    REST_DURATION: 800
};

// Warp line objects for hyperspace effect
let warpLines = [];

/**
 * Initialize HTML overlay references
 */
function initOverlay() {
    overlay = document.getElementById('transitionOverlay');
    mainText = overlay?.querySelector('.main-text');
    subText = overlay?.querySelector('.sub-text');
}

/**
 * Show text on the overlay
 */
function showOverlayText(main, sub, mainClass, subClass) {
    if (!overlay) initOverlay();
    if (!overlay || !mainText || !subText) return;

    // Reset classes
    mainText.className = 'main-text ' + (mainClass || 'text-green');
    subText.className = 'sub-text ' + (subClass || 'text-cyan');

    // Set text
    mainText.textContent = main;
    subText.textContent = sub || '';

    // Show overlay
    overlay.classList.add('active');

    // Trigger animation
    requestAnimationFrame(() => {
        mainText.classList.add('show');
        if (sub) subText.classList.add('show');
    });
}

/**
 * Hide the overlay
 */
function hideOverlayText(callback) {
    if (!overlay || !mainText || !subText) {
        if (callback) callback();
        return;
    }

    mainText.classList.remove('show');
    subText.classList.remove('show');

    setTimeout(() => {
        overlay.classList.remove('active');
        mainText.textContent = '';
        subText.textContent = '';
        if (callback) callback();
    }, 400);
}

/**
 * Check if a transition is currently in progress
 * @returns {boolean}
 */
export function isInTransition() {
    return isTransitioning;
}

/**
 * Start the level completion transition sequence
 */
export function startLevelTransition(completedLevel, currentScore, noDamageTaken, lives, scene, onComplete) {
    if (isTransitioning) return;

    isTransitioning = true;
    currentScene = scene;
    transitionCallback = onComplete;

    // Initialize overlay
    initOverlay();

    // Create transition container group for 3D effects
    transitionGroup = new THREE.Group();
    transitionGroup.position.set(0, 0, 0);
    scene.add(transitionGroup);

    const nextLevel = completedLevel + 1;
    const bonus = getLevelBonus(completedLevel, noDamageTaken, lives);

    // Start the transition sequence
    showLevelComplete(completedLevel, () => {
        showBonusDisplay(bonus, currentScore, () => {
            playHyperspaceEffect(() => {
                showLevelAnnounce(nextLevel, () => {
                    showGetReady(() => {
                        cleanupTransition();
                        if (transitionCallback) {
                            transitionCallback(nextLevel, bonus.total);
                        }
                    });
                });
            });
        });
    });
}

/**
 * Show "LEVEL COMPLETE" message
 */
function showLevelComplete(level, onDone) {
    playLevelComplete();

    showOverlayText('LEVEL COMPLETE!', `Wave ${level} cleared`, 'text-green', 'text-cyan');

    // Create celebration particles in 3D
    createCelebrationParticles();

    setTimeout(() => {
        hideOverlayText(onDone);
    }, TIMING.LEVEL_COMPLETE_DURATION);
}

/**
 * Create celebration particles
 */
function createCelebrationParticles() {
    if (!transitionGroup || !currentScene) return;

    const colors = [0x00ff00, 0xffff00, 0x00ffff, 0xff00ff];

    for (let i = 0; i < 50; i++) {
        const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const material = new THREE.MeshPhongMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            emissive: colors[Math.floor(Math.random() * colors.length)],
            emissiveIntensity: 3.0,
            transparent: true
        });
        const particle = new THREE.Mesh(geometry, material);

        // Start at center
        particle.position.set(0, 2, -5);

        // Random velocity
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            Math.random() * 0.3 + 0.1,
            (Math.random() - 0.5) * 0.2
        );
        particle.userData.life = 1.0;
        particle.userData.rotSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );

        transitionGroup.add(particle);

        // Animate particle
        const animateParticle = () => {
            if (!particle.userData || particle.userData.life <= 0) return;

            particle.position.add(particle.userData.velocity);
            particle.userData.velocity.y -= 0.01; // Gravity
            particle.rotation.x += particle.userData.rotSpeed.x;
            particle.rotation.y += particle.userData.rotSpeed.y;
            particle.rotation.z += particle.userData.rotSpeed.z;

            particle.userData.life -= 0.02;
            if (particle.material) {
                particle.material.opacity = particle.userData.life;
            }

            if (particle.userData.life > 0) {
                requestAnimationFrame(animateParticle);
            } else {
                if (transitionGroup) {
                    transitionGroup.remove(particle);
                }
                particle.geometry?.dispose();
                particle.material?.dispose();
            }
        };

        requestAnimationFrame(animateParticle);
    }
}

/**
 * Show bonus display
 */
function showBonusDisplay(bonus, currentScore, onDone) {
    const perfectText = bonus.perfectBonus > 0 ? 'PERFECT ROUND!' : '';
    showOverlayText(`+${bonus.total} POINTS`, perfectText, 'text-yellow', 'text-magenta');

    setTimeout(() => {
        hideOverlayText(onDone);
    }, TIMING.BONUS_DISPLAY_DURATION);
}

/**
 * Play hyperspace warp effect
 */
function playHyperspaceEffect(onDone) {
    playWarpSound();
    setStarfieldSpeed(15.0); // Super fast stars

    // Hide any text during warp
    hideOverlayText();

    if (!transitionGroup || !currentScene) {
        setTimeout(() => {
            setStarfieldSpeed(0.5);
            if (onDone) onDone();
        }, TIMING.HYPERSPACE_DURATION);
        return;
    }

    // Create warp lines - tunnel effect streaming toward camera
    // Camera is at approx (0, 8, 15) looking toward (0, 0, -10)
    warpLines = [];
    for (let i = 0; i < 100; i++) {
        // Create elongated line along Z-axis
        const geometry = new THREE.BoxGeometry(0.05, 0.05, 30);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 4.0,
            transparent: true,
            opacity: 0.9
        });
        const line = new THREE.Mesh(geometry, material);

        // Position in a tunnel/cylinder around the camera's forward view
        // Spread lines in a ring pattern
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 12;

        // Center the tunnel around camera position (0, 8, 15)
        // Lines start far ahead and stream toward/past the camera
        line.position.x = Math.cos(angle) * radius;
        line.position.y = 8 + Math.sin(angle) * radius;  // Centered on camera Y
        line.position.z = -60 + Math.random() * 40;  // Start far in front

        // Lines are already aligned with Z-axis (no rotation needed)
        // This makes them stream straight toward the camera

        // Store initial position for animation
        line.userData.startZ = line.position.z;

        warpLines.push(line);
        transitionGroup.add(line);
    }

    // Animate warp - lines rush toward and past the camera
    const startTime = Date.now();
    const animateWarp = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / TIMING.HYPERSPACE_DURATION;

        // Move lines toward camera (increasing Z)
        warpLines.forEach(line => {
            if (!line) return;

            // Fast movement toward camera
            line.position.z += 3;

            // Stretch effect - lines get longer as they approach
            const stretch = 1 + progress * 3;
            line.scale.z = stretch;

            // Fade out as lines pass the camera
            if (line.position.z > 10 && line.material) {
                line.material.opacity = Math.max(0, 1 - (line.position.z - 10) / 15);
            }

            // Wrap lines that go too far past camera back to the front
            if (line.position.z > 30) {
                line.position.z = -60;
                if (line.material) {
                    line.material.opacity = 0.9;
                }
            }
        });

        if (progress < 1) {
            requestAnimationFrame(animateWarp);
        } else {
            // Cleanup warp lines
            warpLines.forEach(line => {
                if (!line) return;
                if (transitionGroup) {
                    transitionGroup.remove(line);
                }
                line.geometry?.dispose();
                line.material?.dispose();
            });
            warpLines = [];

            // Reset starfield speed
            setStarfieldSpeed(0.5);

            if (onDone) onDone();
        }
    };

    requestAnimationFrame(animateWarp);
}

/**
 * Show level announcement
 */
function showLevelAnnounce(level, onDone) {
    const announcement = getWaveAnnouncement(level);

    if (announcement.isBoss) {
        playBossWarning();
        createBossWarningEffect();
        showOverlayText('⚠ WARNING ⚠', announcement.subtitle, 'text-red', 'text-red');
    } else {
        playLevelStart();
        showOverlayText(`LEVEL ${level}`, announcement.subtitle, 'text-cyan', 'text-green');
    }

    setTimeout(() => {
        hideOverlayText(onDone);
    }, TIMING.LEVEL_ANNOUNCE_DURATION);
}

/**
 * Create boss warning visual effect (red flashes)
 */
function createBossWarningEffect() {
    // Create red overlay flashes
    const flashOverlay = document.createElement('div');
    flashOverlay.id = 'bossWarningOverlay';
    flashOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 0, 0, 0);
        pointer-events: none;
        z-index: 150;
    `;
    document.body.appendChild(flashOverlay);

    let flashCount = 0;
    const maxFlashes = 3;

    const flash = () => {
        if (flashCount >= maxFlashes) {
            const el = document.getElementById('bossWarningOverlay');
            if (el) document.body.removeChild(el);
            return;
        }

        flashOverlay.style.background = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
            flashOverlay.style.background = 'rgba(255, 0, 0, 0)';
            flashCount++;
            setTimeout(flash, 300);
        }, 150);
    };

    flash();
}

/**
 * Show "GET READY" message
 */
function showGetReady(onDone) {
    showOverlayText('GET READY!', '', 'text-green', '');

    setTimeout(() => {
        hideOverlayText(onDone);
    }, TIMING.REST_DURATION);
}

/**
 * Clean up transition resources
 */
function cleanupTransition() {
    // Clean up 3D objects
    if (transitionGroup && currentScene) {
        // Dispose all children
        transitionGroup.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        currentScene.remove(transitionGroup);
    }

    // Clean up warp lines
    warpLines.forEach(line => {
        if (line) {
            line.geometry?.dispose();
            line.material?.dispose();
        }
    });
    warpLines = [];

    // Hide overlay
    hideOverlayText();

    transitionGroup = null;
    currentScene = null;
    isTransitioning = false;
}

/**
 * Force end transition (for game reset)
 */
export function forceEndTransition() {
    cleanupTransition();
    setStarfieldSpeed(0.5);

    // Remove any overlay
    const bossOverlay = document.getElementById('bossWarningOverlay');
    if (bossOverlay && bossOverlay.parentNode) {
        bossOverlay.parentNode.removeChild(bossOverlay);
    }

    // Hide transition overlay
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Update transition animations (called each frame from game loop)
 */
export function updateTransition() {
    // Currently handled by requestAnimationFrame in each phase
    // This function exists for future expansion
}
