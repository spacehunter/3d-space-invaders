import * as THREE from 'three';

let starfield;
let brightStars;
let gridTop, gridBottom;
let nebulaSprites = [];
let starSpeed = 0.5;  // Default speed

// Star color palette - mostly white/blue with occasional warm tints
const STAR_COLORS = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xffffff),
    new THREE.Color(0xaaccff),
    new THREE.Color(0xccddff),
    new THREE.Color(0xffeecc),
    new THREE.Color(0xffccaa),
    new THREE.Color(0x88ffee)
];

// Generate a soft round sprite texture so stars render as glowing dots, not squares
function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Generate a large soft radial blob used for distant nebulae
function createNebulaTexture(hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const c = new THREE.Color(hexColor);
    const r = Math.floor(c.r * 255), g = Math.floor(c.g * 255), b = Math.floor(c.b * 255);
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
    gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

function createStarLayer(count, size, opacity) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < count; i++) {
        positions.push(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            -Math.random() * 200 - 20
        );
        const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size,
        map: createStarTexture(),
        vertexColors: true,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
}

// Create the animated starfield background
export function createStarfield(scene) {
    // Main dense layer of small stars + sparse layer of big bright ones
    starfield = createStarLayer(1600, 0.25, 0.9);
    scene.add(starfield);

    brightStars = createStarLayer(220, 0.7, 1.0);
    scene.add(brightStars);

    // Distant nebula blobs for color depth (drawn behind everything, no fog)
    const nebulaConfigs = [
        { color: 0x4422aa, x: -45, y: 25, z: -160, scale: 130 },
        { color: 0xaa2266, x: 50, y: -15, z: -170, scale: 110 },
        { color: 0x2266aa, x: 10, y: 40, z: -180, scale: 150 },
        { color: 0x116655, x: -25, y: -35, z: -165, scale: 100 }
    ];
    for (const cfg of nebulaConfigs) {
        const material = new THREE.SpriteMaterial({
            map: createNebulaTexture(cfg.color),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(cfg.x, cfg.y, cfg.z);
        sprite.scale.set(cfg.scale, cfg.scale, 1);
        scene.add(sprite);
        nebulaSprites.push(sprite);
    }

    // Retro synthwave grids above and below the play area, fading into the fog
    gridBottom = new THREE.GridHelper(400, 100, 0xff00aa, 0x220a44);
    gridBottom.position.y = -8;
    gridBottom.material.transparent = true;
    gridBottom.material.opacity = 0.4;
    gridBottom.material.depthWrite = false;
    scene.add(gridBottom);

    gridTop = new THREE.GridHelper(400, 100, 0x00aaff, 0x0a2244);
    gridTop.position.y = 26;
    gridTop.material.transparent = true;
    gridTop.material.opacity = 0.25;
    gridTop.material.depthWrite = false;
    scene.add(gridTop);
}

// Set starfield speed (for hyperspace effect)
export function setStarfieldSpeed(speed) {
    starSpeed = speed;
}

// Get current starfield speed
export function getStarfieldSpeed() {
    return starSpeed;
}

function updateStarLayer(points, speedScale) {
    const positions = points.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        // Move stars toward player (increase Z) at current speed
        positions[i + 2] += starSpeed * speedScale;

        // Reset star to far distance if it passes the player
        if (positions[i + 2] > 20) {
            positions[i + 2] = -200;
            positions[i] = (Math.random() - 0.5) * 100;  // New random X
            positions[i + 1] = (Math.random() - 0.5) * 100;  // New random Y
        }
    }

    points.geometry.attributes.position.needsUpdate = true;
}

// Update starfield animation
export function updateStarfield() {
    if (!starfield) return;

    updateStarLayer(starfield, 1);
    // Bright stars drift slightly faster for parallax depth
    updateStarLayer(brightStars, 1.35);

    // Subtle twinkle on the bright layer
    brightStars.material.opacity = 0.85 + Math.sin(performance.now() * 0.003) * 0.15;

    // Scroll grids toward the player; wrap every cell (400/100 = 4 units) for a seamless loop
    const gridScroll = starSpeed * 0.25;
    for (const grid of [gridBottom, gridTop]) {
        if (!grid) continue;
        grid.position.z += gridScroll;
        if (grid.position.z > 4) grid.position.z -= 4;
    }
}
