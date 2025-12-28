// Boss system - unique bosses with multi-phase health and special attacks
import * as THREE from 'three';
import { createExplosion } from './particles.js';
import { playExplosion, playBossHit, playBossDefeat, playBossPhaseTransition } from './audio.js';

// Current boss state
let currentBoss = null;
let bossHealthBar = null;
let bossPhase = 1;

// Boss type definitions with DRY configuration
const BOSS_DEFINITIONS = {
    mothership: {
        name: 'THE MOTHERSHIP',
        baseHealth: 30,
        phases: 5,
        scale: 3.0,
        colors: { primary: 0xff00ff, secondary: 0x00ffff, eye: 0xff0000 },
        createGeometry: createMothershipGeometry,
        attackPatterns: ['sweepLaser', 'sweepLaser', 'spawnDrones', 'spawnDrones', 'barrage'],
        movePattern: 'hover'
    },
    hiveQueen: {
        name: 'THE HIVE QUEEN',
        baseHealth: 35,
        phases: 5,
        scale: 3.5,
        colors: { primary: 0xff8800, secondary: 0x44ff44, eye: 0x00ff00 },
        createGeometry: createHiveQueenGeometry,
        attackPatterns: ['webCluster', 'webCluster', 'spawnMinions', 'spawnMinions', 'acidRain'],
        movePattern: 'weave'
    },
    dreadnought: {
        name: 'THE DREADNOUGHT',
        baseHealth: 45,
        phases: 5,
        scale: 4.0,
        colors: { primary: 0x00ffff, secondary: 0xffffff, eye: 0xff4444 },
        createGeometry: createDreadnoughtGeometry,
        attackPatterns: ['tripleHoming', 'tripleHoming', 'turretBarrage', 'turretBarrage', 'railgun'],
        movePattern: 'tank'
    },
    phantom: {
        name: 'THE PHANTOM',
        baseHealth: 25,
        phases: 5,
        scale: 2.5,
        colors: { primary: 0x8800ff, secondary: 0xffffff, eye: 0xff00ff },
        createGeometry: createPhantomGeometry,
        attackPatterns: ['teleportStrike', 'teleportStrike', 'clones', 'clones', 'gravityWell'],
        movePattern: 'phase'
    },
    titan: {
        name: 'THE TITAN',
        baseHealth: 50,
        phases: 5,
        scale: 5.0,
        colors: { primary: 0xff4400, secondary: 0xffff00, eye: 0xffffff },
        createGeometry: createTitanGeometry,
        attackPatterns: ['segmentSlam', 'segmentSlam', 'solarFlare', 'solarFlare', 'regenerate'],
        movePattern: 'massive'
    }
};

// ============== BOSS GEOMETRY CREATORS ==============

function createMothershipGeometry(colors, scale) {
    const group = new THREE.Group();

    // Main saucer body
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: colors.primary,
        emissive: colors.primary,
        emissiveIntensity: 1.8,
        flatShading: true
    });

    // Dome top
    const domeGeometry = new THREE.BoxGeometry(2.5 * scale, 0.8 * scale, 2.5 * scale);
    const dome = new THREE.Mesh(domeGeometry, bodyMaterial);
    dome.position.y = 0.5 * scale;
    group.add(dome);

    // Main body disc
    const discGeometry = new THREE.BoxGeometry(4 * scale, 0.5 * scale, 4 * scale);
    const disc = new THREE.Mesh(discGeometry, bodyMaterial);
    group.add(disc);

    // Bottom section
    const bottomGeometry = new THREE.BoxGeometry(2 * scale, 0.6 * scale, 2 * scale);
    const bottom = new THREE.Mesh(bottomGeometry, bodyMaterial);
    bottom.position.y = -0.4 * scale;
    group.add(bottom);

    // Central eye
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: colors.eye,
        emissive: colors.eye,
        emissiveIntensity: 5.0
    });
    const eyeGeometry = new THREE.BoxGeometry(0.6 * scale, 0.4 * scale, 0.6 * scale);
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.y = -0.6 * scale;
    group.add(eye);
    group.userData.eye = eye;

    // Rotating lights ring
    const lightMaterial = new THREE.MeshPhongMaterial({
        color: colors.secondary,
        emissive: colors.secondary,
        emissiveIntensity: 4.0
    });

    group.userData.lights = [];
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const light = new THREE.Mesh(
            new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 0.25 * scale),
            lightMaterial.clone()
        );
        light.position.x = Math.cos(angle) * 1.8 * scale;
        light.position.z = Math.sin(angle) * 1.8 * scale;
        light.position.y = -0.1 * scale;
        group.add(light);
        group.userData.lights.push(light);
    }

    return group;
}

function createHiveQueenGeometry(colors, scale) {
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: colors.primary,
        emissive: colors.primary,
        emissiveIntensity: 1.6,
        flatShading: true
    });

    // Segmented body (insect-like)
    for (let i = 0; i < 4; i++) {
        const segmentSize = (4 - i) * 0.3 + 0.8;
        const segment = new THREE.Mesh(
            new THREE.BoxGeometry(segmentSize * scale, 0.6 * scale, segmentSize * scale),
            bodyMaterial
        );
        segment.position.z = -i * 0.8 * scale;
        segment.position.y = i * 0.15 * scale;
        group.add(segment);
    }

    // Head
    const headMaterial = new THREE.MeshPhongMaterial({
        color: colors.secondary,
        emissive: colors.secondary,
        emissiveIntensity: 2.0,
        flatShading: true
    });

    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.2 * scale, 0.8 * scale, 0.8 * scale),
        headMaterial
    );
    head.position.z = 1.5 * scale;
    group.add(head);

    // Mandibles
    const mandibleMaterial = new THREE.MeshPhongMaterial({
        color: 0xcc6600,
        emissive: 0xcc6600,
        emissiveIntensity: 1.5
    });

    for (let side = -1; side <= 1; side += 2) {
        const mandible = new THREE.Mesh(
            new THREE.BoxGeometry(0.3 * scale, 0.2 * scale, 0.6 * scale),
            mandibleMaterial
        );
        mandible.position.set(side * 0.5 * scale, -0.2 * scale, 2 * scale);
        mandible.rotation.y = side * 0.3;
        group.add(mandible);
    }

    // Eyes
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: colors.eye,
        emissive: colors.eye,
        emissiveIntensity: 4.0
    });

    for (let side = -1; side <= 1; side += 2) {
        const eye = new THREE.Mesh(
            new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.2 * scale),
            eyeMaterial
        );
        eye.position.set(side * 0.35 * scale, 0.2 * scale, 1.8 * scale);
        group.add(eye);
    }

    // Legs
    group.userData.legs = [];
    for (let i = 0; i < 6; i++) {
        const side = i < 3 ? -1 : 1;
        const legIndex = i % 3;

        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.15 * scale, 0.8 * scale, 0.15 * scale),
            bodyMaterial
        );
        leg.position.set(
            side * 1.2 * scale,
            -0.6 * scale,
            (1 - legIndex) * 0.8 * scale
        );
        leg.rotation.z = side * 0.5;
        group.add(leg);
        group.userData.legs.push(leg);
    }

    return group;
}

function createDreadnoughtGeometry(colors, scale) {
    const group = new THREE.Group();

    const armorMaterial = new THREE.MeshPhongMaterial({
        color: colors.primary,
        emissive: colors.primary,
        emissiveIntensity: 1.4,
        flatShading: true
    });

    // Main hull
    const hull = new THREE.Mesh(
        new THREE.BoxGeometry(3 * scale, 1 * scale, 4 * scale),
        armorMaterial
    );
    group.add(hull);

    // Bridge/command tower
    const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 * scale, 0.8 * scale, 1.5 * scale),
        armorMaterial
    );
    bridge.position.set(0, 0.8 * scale, -0.5 * scale);
    group.add(bridge);

    // Forward weapons array
    const weaponMaterial = new THREE.MeshPhongMaterial({
        color: colors.secondary,
        emissive: colors.secondary,
        emissiveIntensity: 2.5
    });

    // Triple cannons
    group.userData.cannons = [];
    for (let i = -1; i <= 1; i++) {
        const cannon = new THREE.Mesh(
            new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 1.2 * scale),
            weaponMaterial
        );
        cannon.position.set(i * 0.6 * scale, 0, 2.5 * scale);
        group.add(cannon);
        group.userData.cannons.push(cannon);
    }

    // Side turrets
    group.userData.turrets = [];
    for (let side = -1; side <= 1; side += 2) {
        const turret = new THREE.Mesh(
            new THREE.BoxGeometry(0.6 * scale, 0.5 * scale, 0.6 * scale),
            armorMaterial
        );
        turret.position.set(side * 1.8 * scale, 0.3 * scale, 0);
        group.add(turret);

        const turretCannon = new THREE.Mesh(
            new THREE.BoxGeometry(0.15 * scale, 0.15 * scale, 0.8 * scale),
            weaponMaterial
        );
        turretCannon.position.set(side * 1.8 * scale, 0.3 * scale, 0.6 * scale);
        group.add(turretCannon);
        group.userData.turrets.push({ base: turret, cannon: turretCannon });
    }

    // Engine glow
    const engineMaterial = new THREE.MeshPhongMaterial({
        color: colors.eye,
        emissive: colors.eye,
        emissiveIntensity: 4.0
    });

    for (let i = -1; i <= 1; i++) {
        const engine = new THREE.Mesh(
            new THREE.BoxGeometry(0.5 * scale, 0.4 * scale, 0.3 * scale),
            engineMaterial
        );
        engine.position.set(i * 0.8 * scale, 0, -2.2 * scale);
        group.add(engine);
    }

    return group;
}

function createPhantomGeometry(colors, scale) {
    const group = new THREE.Group();

    // Ethereal, ghost-like appearance with transparency
    const ghostMaterial = new THREE.MeshPhongMaterial({
        color: colors.primary,
        emissive: colors.primary,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.7,
        flatShading: true
    });

    // Flowing robed body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 * scale, 2 * scale, 1 * scale),
        ghostMaterial
    );
    group.add(body);

    // Head/hood
    const hood = new THREE.Mesh(
        new THREE.BoxGeometry(1 * scale, 0.8 * scale, 0.8 * scale),
        ghostMaterial
    );
    hood.position.y = 1.2 * scale;
    group.add(hood);

    // Glowing eyes
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: colors.eye,
        emissive: colors.eye,
        emissiveIntensity: 6.0
    });

    for (let side = -1; side <= 1; side += 2) {
        const eye = new THREE.Mesh(
            new THREE.BoxGeometry(0.2 * scale, 0.15 * scale, 0.1 * scale),
            eyeMaterial
        );
        eye.position.set(side * 0.25 * scale, 1.3 * scale, 0.4 * scale);
        group.add(eye);
    }

    // Wispy tendrils at bottom
    group.userData.tendrils = [];
    for (let i = 0; i < 5; i++) {
        const tendril = new THREE.Mesh(
            new THREE.BoxGeometry(0.15 * scale, 0.8 * scale, 0.1 * scale),
            ghostMaterial.clone()
        );
        tendril.position.set((i - 2) * 0.3 * scale, -1.2 * scale, 0);
        tendril.userData.phase = i * 0.5;
        group.add(tendril);
        group.userData.tendrils.push(tendril);
    }

    // Orbiting soul orbs
    group.userData.orbs = [];
    const orbMaterial = new THREE.MeshPhongMaterial({
        color: colors.secondary,
        emissive: colors.secondary,
        emissiveIntensity: 4.0,
        transparent: true,
        opacity: 0.8
    });

    for (let i = 0; i < 3; i++) {
        const orb = new THREE.Mesh(
            new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.3 * scale),
            orbMaterial
        );
        orb.userData.orbitAngle = (i / 3) * Math.PI * 2;
        orb.userData.orbitRadius = 1.5 * scale;
        group.add(orb);
        group.userData.orbs.push(orb);
    }

    return group;
}

function createTitanGeometry(colors, scale) {
    const group = new THREE.Group();

    const titanMaterial = new THREE.MeshPhongMaterial({
        color: colors.primary,
        emissive: colors.primary,
        emissiveIntensity: 1.8,
        flatShading: true
    });

    // Massive multi-segment body spanning width
    group.userData.segments = [];
    for (let i = 0; i < 5; i++) {
        const segment = new THREE.Mesh(
            new THREE.BoxGeometry(2 * scale, 1.5 * scale, 1.5 * scale),
            titanMaterial.clone()
        );
        segment.position.x = (i - 2) * 2.2 * scale;
        segment.userData.baseY = 0;
        segment.userData.segmentIndex = i;
        group.add(segment);
        group.userData.segments.push(segment);
    }

    // Central core (weak point)
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: colors.secondary,
        emissive: colors.secondary,
        emissiveIntensity: 4.0
    });

    const core = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 * scale, 1 * scale, 1 * scale),
        coreMaterial
    );
    core.position.y = 0.5 * scale;
    group.add(core);
    group.userData.core = core;

    // Eyes across segments
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: colors.eye,
        emissive: colors.eye,
        emissiveIntensity: 5.0
    });

    for (let i = 0; i < 5; i++) {
        const eye = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.2 * scale),
            eyeMaterial
        );
        eye.position.set((i - 2) * 2.2 * scale, 0.5 * scale, 0.8 * scale);
        group.add(eye);
    }

    // Heat vents
    group.userData.vents = [];
    const ventMaterial = new THREE.MeshPhongMaterial({
        color: 0xff8800,
        emissive: 0xff8800,
        emissiveIntensity: 3.0
    });

    for (let i = 0; i < 4; i++) {
        const vent = new THREE.Mesh(
            new THREE.BoxGeometry(0.5 * scale, 0.3 * scale, 0.2 * scale),
            ventMaterial.clone()
        );
        vent.position.set((i - 1.5) * 2.5 * scale, -0.6 * scale, 0);
        group.add(vent);
        group.userData.vents.push(vent);
    }

    return group;
}

// ============== BOSS SPAWNING & MANAGEMENT ==============

/**
 * Spawn a boss
 * @param {string} bossType - Key from BOSS_DEFINITIONS
 * @param {number} enhancement - Enhancement tier (1+)
 * @param {THREE.Scene} scene - Scene to add boss to
 */
export function spawnBoss(bossType, enhancement, scene) {
    const definition = BOSS_DEFINITIONS[bossType];
    if (!definition) {
        console.error(`Unknown boss type: ${bossType}`);
        return null;
    }

    // Apply enhancement multipliers
    const healthMultiplier = 1 + (enhancement - 1) * 0.5; // 50% more health per tier
    const totalHealth = Math.floor(definition.baseHealth * healthMultiplier);

    // Create boss geometry
    currentBoss = definition.createGeometry(definition.colors, definition.scale * 0.4);

    // Set boss properties
    currentBoss.userData = {
        type: bossType,
        name: definition.name,
        health: totalHealth,
        maxHealth: totalHealth,
        phase: 1,
        totalPhases: definition.phases,
        healthPerPhase: totalHealth / definition.phases,
        isInvulnerable: false,
        attackCooldown: 0,
        lastAttackTime: 0,
        movePattern: definition.movePattern,
        attackPatterns: definition.attackPatterns,
        enhancement: enhancement,
        spawnTime: Date.now(),
        lastDamageTime: 0
    };

    // Position at top of play area
    currentBoss.position.set(0, 0, -20);

    scene.add(currentBoss);

    // Create health bar UI
    createBossHealthBar(definition.name, totalHealth);

    // Animate entrance
    animateBossEntrance(currentBoss);

    return currentBoss;
}

/**
 * Get the current boss
 */
export function getCurrentBoss() {
    return currentBoss;
}

/**
 * Animate boss entrance
 */
function animateBossEntrance(boss) {
    const targetZ = -12;
    const startTime = Date.now();
    const duration = 2000;

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);

        boss.position.z = -25 + (targetZ + 25) * eased;

        // Dramatic scaling entrance
        const scale = 0.5 + 0.5 * eased;
        boss.scale.set(scale, scale, scale);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}

/**
 * Update boss behavior (called each frame)
 */
export function updateBoss(scene, player, deltaTime) {
    if (!currentBoss) return;

    const time = Date.now() * 0.001;
    const userData = currentBoss.userData;

    // Movement patterns
    switch (userData.movePattern) {
        case 'hover':
            currentBoss.position.x = Math.sin(time * 0.5) * 8;
            currentBoss.position.y = Math.sin(time * 0.8) * 0.5;
            currentBoss.rotation.y = time * 0.3;
            break;

        case 'weave':
            currentBoss.position.x = Math.sin(time * 0.7) * 10;
            currentBoss.position.y = Math.sin(time * 1.2) * 0.8;
            currentBoss.rotation.z = Math.sin(time) * 0.1;
            break;

        case 'tank':
            // Slow, menacing advance and retreat
            currentBoss.position.x = Math.sin(time * 0.3) * 6;
            currentBoss.position.z = -12 + Math.sin(time * 0.2) * 2;
            break;

        case 'phase':
            // Teleport-like movement
            if (Math.random() < 0.002) {
                currentBoss.position.x = (Math.random() - 0.5) * 16;
            }
            // Ghostly floating
            currentBoss.position.y = Math.sin(time * 2) * 0.8;
            currentBoss.rotation.y = time * 0.5;
            break;

        case 'massive':
            // Minimal movement for massive boss
            currentBoss.position.y = Math.sin(time * 0.5) * 0.3;
            break;
    }

    // Type-specific animations
    animateBossType(currentBoss, time);

    // Invulnerability flash effect
    if (userData.isInvulnerable) {
        const flash = Math.sin(time * 30) > 0;
        currentBoss.visible = flash;
    } else {
        currentBoss.visible = true;
    }
}

/**
 * Type-specific boss animations
 */
function animateBossType(boss, time) {
    const type = boss.userData.type;

    switch (type) {
        case 'mothership':
            // Rotate lights in chase pattern
            if (boss.userData.lights) {
                boss.userData.lights.forEach((light, i) => {
                    const phase = time * 5 + (i / 12) * Math.PI * 2;
                    const intensity = (Math.sin(phase) + 1) / 2;
                    light.material.emissiveIntensity = 1 + intensity * 4;
                    light.scale.setScalar(1 + intensity * 0.5);
                });
            }
            // Pulsing eye
            if (boss.userData.eye) {
                boss.userData.eye.material.emissiveIntensity = 3 + Math.sin(time * 4) * 2;
            }
            break;

        case 'hiveQueen':
            // Scuttling legs
            if (boss.userData.legs) {
                boss.userData.legs.forEach((leg, i) => {
                    const phase = time * 8 + i * 0.5;
                    leg.rotation.x = Math.sin(phase) * 0.3;
                });
            }
            break;

        case 'dreadnought':
            // Rotating turrets
            if (boss.userData.turrets) {
                boss.userData.turrets.forEach(turret => {
                    turret.base.rotation.y = time * 0.5;
                    turret.cannon.rotation.y = time * 0.5;
                });
            }
            // Cannon charge pulse
            if (boss.userData.cannons) {
                const charge = (Math.sin(time * 3) + 1) / 2;
                boss.userData.cannons.forEach(cannon => {
                    cannon.scale.z = 1 + charge * 0.2;
                });
            }
            break;

        case 'phantom':
            // Flowing tendrils
            if (boss.userData.tendrils) {
                boss.userData.tendrils.forEach(tendril => {
                    const phase = time * 3 + tendril.userData.phase;
                    tendril.position.y = -1.2 + Math.sin(phase) * 0.3;
                    tendril.rotation.z = Math.sin(phase * 0.7) * 0.4;
                });
            }
            // Orbiting orbs
            if (boss.userData.orbs) {
                boss.userData.orbs.forEach(orb => {
                    orb.userData.orbitAngle += 0.02;
                    orb.position.x = Math.cos(orb.userData.orbitAngle) * orb.userData.orbitRadius;
                    orb.position.z = Math.sin(orb.userData.orbitAngle) * orb.userData.orbitRadius * 0.5;
                    orb.position.y = Math.sin(time * 2 + orb.userData.orbitAngle) * 0.5;
                });
            }
            break;

        case 'titan':
            // Segment wave motion
            if (boss.userData.segments) {
                boss.userData.segments.forEach((segment, i) => {
                    const phase = time * 2 + i * 0.5;
                    segment.position.y = Math.sin(phase) * 0.3;
                    segment.rotation.z = Math.sin(phase * 0.5) * 0.1;
                });
            }
            // Core pulsing
            if (boss.userData.core) {
                const pulse = 1 + Math.sin(time * 3) * 0.1;
                boss.userData.core.scale.set(pulse, pulse, pulse);
            }
            // Vent heat
            if (boss.userData.vents) {
                boss.userData.vents.forEach((vent, i) => {
                    vent.material.emissiveIntensity = 2 + Math.sin(time * 5 + i) * 1.5;
                });
            }
            break;
    }
}

/**
 * Damage the boss
 * @param {number} damage - Amount of damage
 * @param {THREE.Scene} scene - Scene reference
 * @returns {boolean} True if boss was destroyed
 */
export function damageBoss(damage, scene) {
    if (!currentBoss || currentBoss.userData.isInvulnerable) return false;

    const now = Date.now();

    // Damage cooldown to prevent rapid hits
    if (now - currentBoss.userData.lastDamageTime < 100) return false;
    currentBoss.userData.lastDamageTime = now;

    currentBoss.userData.health -= damage;
    playBossHit();

    // Flash effect
    flashBoss();

    // Update health bar
    updateBossHealthBar();

    // Check phase transition
    const currentPhaseHealth = currentBoss.userData.maxHealth -
        (currentBoss.userData.phase - 1) * currentBoss.userData.healthPerPhase;

    if (currentBoss.userData.health <= currentPhaseHealth - currentBoss.userData.healthPerPhase) {
        if (currentBoss.userData.phase < currentBoss.userData.totalPhases) {
            triggerPhaseTransition(scene);
        }
    }

    // Check if defeated
    if (currentBoss.userData.health <= 0) {
        destroyBoss(scene);
        return true;
    }

    return false;
}

/**
 * Flash boss white when hit
 */
function flashBoss() {
    if (!currentBoss) return;

    // Store original materials and flash white
    currentBoss.traverse(child => {
        if (child.material && !child.userData.originalEmissive) {
            child.userData.originalEmissive = child.material.emissive.getHex();
            child.material.emissive.setHex(0xffffff);
            child.material.emissiveIntensity = 5;
        }
    });

    // Restore after brief flash
    setTimeout(() => {
        if (!currentBoss) return;
        currentBoss.traverse(child => {
            if (child.material && child.userData.originalEmissive !== undefined) {
                child.material.emissive.setHex(child.userData.originalEmissive);
                child.material.emissiveIntensity = child.userData.originalIntensity || 2;
                delete child.userData.originalEmissive;
            }
        });
    }, 100);
}

/**
 * Trigger phase transition
 */
function triggerPhaseTransition(scene) {
    currentBoss.userData.phase++;
    currentBoss.userData.isInvulnerable = true;

    playBossPhaseTransition();

    // Create energy burst effect
    createPhaseTransitionEffect(currentBoss.position, scene);

    // Brief invulnerability
    setTimeout(() => {
        if (currentBoss) {
            currentBoss.userData.isInvulnerable = false;
        }
    }, 1500);
}

/**
 * Create phase transition visual effect
 */
function createPhaseTransitionEffect(position, scene) {
    // Burst of particles
    for (let i = 0; i < 30; i++) {
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 5.0,
            transparent: true
        });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);

        const angle = (i / 30) * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.2;
        particle.userData.velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            (Math.random() - 0.5) * speed,
            Math.sin(angle) * speed
        );
        particle.userData.life = 1.0;

        scene.add(particle);

        const animateParticle = () => {
            particle.position.add(particle.userData.velocity);
            particle.userData.life -= 0.02;
            particle.material.opacity = particle.userData.life;
            particle.scale.multiplyScalar(0.98);

            if (particle.userData.life > 0) {
                requestAnimationFrame(animateParticle);
            } else {
                scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
            }
        };

        requestAnimationFrame(animateParticle);
    }
}

/**
 * Destroy the boss
 */
function destroyBoss(scene) {
    if (!currentBoss) return;

    playBossDefeat();

    // Massive explosion
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            if (currentBoss) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 4
                );
                const explosionPos = currentBoss.position.clone().add(offset);
                createExplosion(explosionPos, scene);
                playExplosion(1.5);
            }
        }, i * 200);
    }

    // Final cleanup after explosions
    setTimeout(() => {
        if (currentBoss) {
            scene.remove(currentBoss);
            currentBoss.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            currentBoss = null;
        }
        removeBossHealthBar();
    }, 1200);
}

/**
 * Get boss hit radius for collision detection
 */
export function getBossHitRadius() {
    if (!currentBoss) return 0;
    return 2.5; // Base collision radius
}

/**
 * Reset boss (for game reset)
 */
export function resetBoss(scene) {
    if (currentBoss) {
        scene.remove(currentBoss);
        currentBoss.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        currentBoss = null;
    }
    removeBossHealthBar();
}

// ============== HEALTH BAR UI ==============

function createBossHealthBar(bossName, maxHealth) {
    removeBossHealthBar();

    const container = document.createElement('div');
    container.id = 'bossHealthBar';
    container.innerHTML = `
        <div class="boss-name">${bossName}</div>
        <div class="health-bar-container">
            <div class="health-bar-fill"></div>
        </div>
    `;
    document.body.appendChild(container);
    bossHealthBar = container;
}

function updateBossHealthBar() {
    if (!bossHealthBar || !currentBoss) return;

    const healthPercent = (currentBoss.userData.health / currentBoss.userData.maxHealth) * 100;
    const fill = bossHealthBar.querySelector('.health-bar-fill');

    if (fill) {
        fill.style.width = `${Math.max(0, healthPercent)}%`;

        // Color based on health
        if (healthPercent > 60) {
            fill.style.background = 'linear-gradient(90deg, #00ff00, #88ff88)';
        } else if (healthPercent > 30) {
            fill.style.background = 'linear-gradient(90deg, #ffff00, #ffaa00)';
        } else {
            fill.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
        }
    }
}

function removeBossHealthBar() {
    if (bossHealthBar) {
        bossHealthBar.remove();
        bossHealthBar = null;
    }
}
