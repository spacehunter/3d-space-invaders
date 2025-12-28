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

// Transition timing constants
const TIMING = {
    LEVEL_COMPLETE_DURATION: 2000,
    BONUS_DISPLAY_DURATION: 2000,
    HYPERSPACE_DURATION: 1500,
    LEVEL_ANNOUNCE_DURATION: 2000,
    REST_DURATION: 1000
};

// Warp line objects for hyperspace effect
let warpLines = [];

/**
 * Check if a transition is currently in progress
 * @returns {boolean}
 */
export function isInTransition() {
    return isTransitioning;
}

/**
 * Start the level completion transition sequence
 * @param {number} completedLevel - Level just completed
 * @param {number} currentScore - Current player score
 * @param {boolean} noDamageTaken - True if player took no damage
 * @param {number} lives - Remaining lives
 * @param {THREE.Scene} scene - Scene reference
 * @param {Function} onComplete - Callback when transition finishes (nextLevel, bonusPoints)
 */
export function startLevelTransition(completedLevel, currentScore, noDamageTaken, lives, scene, onComplete) {
    if (isTransitioning) return;

    isTransitioning = true;
    currentScene = scene;
    transitionCallback = onComplete;

    // Create transition container group
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
 * Create a 3D text banner using box geometries
 * @param {string} text - Text to display
 * @param {Object} options - Style options
 * @returns {THREE.Group}
 */
function createTextBanner(text, options = {}) {
    const {
        color = 0x00ff00,
        scale = 1.0,
        emissiveIntensity = 3.0
    } = options;

    const group = new THREE.Group();

    // Create a glowing backdrop
    const backdropGeometry = new THREE.PlaneGeometry(text.length * 0.8 * scale, 1.5 * scale);
    const backdropMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    backdrop.position.z = -0.1;
    group.add(backdrop);

    // Create letter blocks (simplified 3D text)
    const letterWidth = 0.6 * scale;
    const startX = -(text.length * letterWidth) / 2 + letterWidth / 2;

    for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') continue;

        const letterGeometry = new THREE.BoxGeometry(
            letterWidth * 0.8,
            scale,
            0.2
        );
        const letterMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: emissiveIntensity,
            flatShading: true
        });
        const letter = new THREE.Mesh(letterGeometry, letterMaterial);
        letter.position.x = startX + i * letterWidth;
        letter.userData.originalY = 0;
        letter.userData.index = i;
        group.add(letter);
    }

    return group;
}

/**
 * Show "LEVEL COMPLETE" banner with celebration
 */
function showLevelComplete(level, onDone) {
    playLevelComplete();

    const banner = createTextBanner('LEVEL COMPLETE', {
        color: 0x00ff00,
        scale: 1.2,
        emissiveIntensity: 4.0
    });
    banner.position.set(0, 2, -5);
    banner.scale.set(0, 0, 0);
    transitionGroup.add(banner);

    // Create celebration particles
    createCelebrationParticles();

    // Animate in
    const startTime = Date.now();
    const animateIn = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 500, 1);

        // Bounce easing
        const bounce = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        banner.scale.set(bounce, bounce, bounce);

        // Wave animation for letters
        banner.children.forEach((child, index) => {
            if (child.userData.index !== undefined) {
                child.position.y = Math.sin(elapsed * 0.005 + index * 0.3) * 0.15;
            }
        });

        if (progress < 1) {
            requestAnimationFrame(animateIn);
        } else {
            // Hold for a moment then fade out
            setTimeout(() => {
                animateBannerOut(banner, onDone);
            }, TIMING.LEVEL_COMPLETE_DURATION - 500);
        }
    };

    requestAnimationFrame(animateIn);
}

/**
 * Animate banner fading out
 */
function animateBannerOut(banner, onDone) {
    const startTime = Date.now();
    const duration = 400;

    const animateOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        banner.scale.set(1 - progress, 1 - progress, 1 - progress);
        banner.position.y += 0.05;

        banner.children.forEach(child => {
            if (child.material) {
                child.material.opacity = 1 - progress;
            }
        });

        if (progress < 1) {
            requestAnimationFrame(animateOut);
        } else {
            transitionGroup.remove(banner);
            if (onDone) onDone();
        }
    };

    requestAnimationFrame(animateOut);
}

/**
 * Create celebration particles
 */
function createCelebrationParticles() {
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
            particle.position.add(particle.userData.velocity);
            particle.userData.velocity.y -= 0.01; // Gravity
            particle.rotation.x += particle.userData.rotSpeed.x;
            particle.rotation.y += particle.userData.rotSpeed.y;
            particle.rotation.z += particle.userData.rotSpeed.z;

            particle.userData.life -= 0.02;
            particle.material.opacity = particle.userData.life;

            if (particle.userData.life > 0) {
                requestAnimationFrame(animateParticle);
            } else {
                transitionGroup.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
            }
        };

        requestAnimationFrame(animateParticle);
    }
}

/**
 * Show bonus display with animated counter
 */
function showBonusDisplay(bonus, currentScore, onDone) {
    const bonusText = createTextBanner(`+${bonus.total}`, {
        color: 0xffff00,
        scale: 1.5,
        emissiveIntensity: 4.0
    });
    bonusText.position.set(0, 1, -5);
    bonusText.scale.set(0, 0, 0);
    transitionGroup.add(bonusText);

    // If perfect round, add extra text
    let perfectText = null;
    if (bonus.perfectBonus > 0) {
        perfectText = createTextBanner('PERFECT', {
            color: 0xff00ff,
            scale: 0.8,
            emissiveIntensity: 5.0
        });
        perfectText.position.set(0, 3, -5);
        perfectText.scale.set(0, 0, 0);
        transitionGroup.add(perfectText);
    }

    // Animate in
    const startTime = Date.now();
    const animateBonus = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 400, 1);

        const scale = progress * (2 - progress); // Ease out
        bonusText.scale.set(scale, scale, scale);

        if (perfectText) {
            const perfectProgress = Math.max(0, (elapsed - 200) / 400);
            const perfectScale = Math.min(perfectProgress, 1) * (2 - Math.min(perfectProgress, 1));
            perfectText.scale.set(perfectScale, perfectScale, perfectScale);
        }

        // Pulse effect
        const pulse = 1 + Math.sin(elapsed * 0.01) * 0.05;
        bonusText.scale.multiplyScalar(pulse);

        if (elapsed < TIMING.BONUS_DISPLAY_DURATION) {
            requestAnimationFrame(animateBonus);
        } else {
            // Fade out
            animateBannerOut(bonusText, () => {
                if (perfectText) {
                    transitionGroup.remove(perfectText);
                }
                onDone();
            });
        }
    };

    requestAnimationFrame(animateBonus);
}

/**
 * Play hyperspace warp effect
 */
function playHyperspaceEffect(onDone) {
    playWarpSound();
    setStarfieldSpeed(15.0); // Super fast stars

    // Create warp lines
    warpLines = [];
    for (let i = 0; i < 80; i++) {
        const geometry = new THREE.BoxGeometry(0.03, 0.03, 25);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 4.0,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Mesh(geometry, material);

        // Random positions in a cylinder around camera view
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 15;
        line.position.x = Math.cos(angle) * radius;
        line.position.y = Math.sin(angle) * radius - 5;
        line.position.z = -50 + Math.random() * 30;

        // Stretch toward viewer
        line.lookAt(0, 0, 10);

        warpLines.push(line);
        transitionGroup.add(line);
    }

    // Animate warp
    const startTime = Date.now();
    const animateWarp = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / TIMING.HYPERSPACE_DURATION;

        // Move lines toward camera
        warpLines.forEach(line => {
            line.position.z += 2;

            // Stretch effect
            const stretch = 1 + progress * 2;
            line.scale.z = stretch;

            // Fade based on position
            if (line.position.z > 5) {
                line.material.opacity = Math.max(0, 1 - (line.position.z - 5) / 10);
            }
        });

        if (progress < 1) {
            requestAnimationFrame(animateWarp);
        } else {
            // Cleanup warp lines
            warpLines.forEach(line => {
                transitionGroup.remove(line);
                line.geometry.dispose();
                line.material.dispose();
            });
            warpLines = [];

            // Reset starfield speed
            setStarfieldSpeed(0.5);

            onDone();
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
    } else {
        playLevelStart();
    }

    // Main title
    const titleBanner = createTextBanner(announcement.title, {
        color: announcement.color,
        scale: 2.0,
        emissiveIntensity: 5.0
    });
    titleBanner.position.set(0, 2, -5);
    titleBanner.scale.set(0, 0, 0);
    transitionGroup.add(titleBanner);

    // Subtitle
    const subtitleBanner = createTextBanner(announcement.subtitle, {
        color: announcement.isBoss ? 0xff4444 : 0x88ffff,
        scale: 0.7,
        emissiveIntensity: 3.0
    });
    subtitleBanner.position.set(0, 0.5, -5);
    subtitleBanner.scale.set(0, 0, 0);
    transitionGroup.add(subtitleBanner);

    // Animate in with dramatic effect
    const startTime = Date.now();
    const animateAnnounce = () => {
        const elapsed = Date.now() - startTime;

        // Title animation
        const titleProgress = Math.min(elapsed / 500, 1);
        const titleScale = titleProgress < 0.8
            ? titleProgress / 0.8 * 1.2
            : 1.2 - (titleProgress - 0.8) / 0.2 * 0.2;
        titleBanner.scale.set(titleScale, titleScale, titleScale);

        // Subtitle animation (delayed)
        const subtitleProgress = Math.max(0, Math.min((elapsed - 300) / 400, 1));
        subtitleBanner.scale.set(subtitleProgress, subtitleProgress, subtitleProgress);

        // Boss pulsing effect
        if (announcement.isBoss) {
            const pulse = 1 + Math.sin(elapsed * 0.02) * 0.1;
            titleBanner.scale.multiplyScalar(pulse);
        }

        if (elapsed < TIMING.LEVEL_ANNOUNCE_DURATION) {
            requestAnimationFrame(animateAnnounce);
        } else {
            animateBannerOut(titleBanner, () => {
                transitionGroup.remove(subtitleBanner);
                onDone();
            });
        }
    };

    requestAnimationFrame(animateAnnounce);
}

/**
 * Create boss warning visual effect (red flashes)
 */
function createBossWarningEffect() {
    // Create red overlay flashes
    const overlay = document.createElement('div');
    overlay.id = 'bossWarningOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 0, 0, 0);
        pointer-events: none;
        z-index: 150;
    `;
    document.body.appendChild(overlay);

    let flashCount = 0;
    const maxFlashes = 3;

    const flash = () => {
        if (flashCount >= maxFlashes) {
            document.body.removeChild(overlay);
            return;
        }

        overlay.style.background = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
            overlay.style.background = 'rgba(255, 0, 0, 0)';
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
    const readyBanner = createTextBanner('GET READY', {
        color: 0x00ff00,
        scale: 1.0,
        emissiveIntensity: 4.0
    });
    readyBanner.position.set(0, 1, -5);
    transitionGroup.add(readyBanner);

    // Pulsing animation
    const startTime = Date.now();
    const animateReady = () => {
        const elapsed = Date.now() - startTime;
        const pulse = 1 + Math.sin(elapsed * 0.015) * 0.15;
        readyBanner.scale.set(pulse, pulse, pulse);

        if (elapsed < TIMING.REST_DURATION) {
            requestAnimationFrame(animateReady);
        } else {
            transitionGroup.remove(readyBanner);
            onDone();
        }
    };

    requestAnimationFrame(animateReady);
}

/**
 * Clean up transition resources
 */
function cleanupTransition() {
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

    transitionGroup = null;
    currentScene = null;
    isTransitioning = false;
    warpLines = [];
}

/**
 * Force end transition (for game reset)
 */
export function forceEndTransition() {
    cleanupTransition();
    setStarfieldSpeed(0.5);

    // Remove any overlay
    const overlay = document.getElementById('bossWarningOverlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

/**
 * Update transition animations (called each frame from game loop)
 */
export function updateTransition() {
    // Currently handled by requestAnimationFrame in each phase
    // This function exists for future expansion
}
