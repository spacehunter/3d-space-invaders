import * as THREE from 'three';
import { createExplosion } from './particles.js';
import { playExplosion } from './audio.js';

let barriers = [];
const BARRIER_Y = 0; // Same plane as player/aliens
const BARRIER_Z = 5; // Positioned in front of player
const BLOCK_SIZE = 0.25; // Size of each voxel

/**
 * Creates a single barrier structure
 */
function createBarrier(xOffset) {
    const barrierGroup = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5,
        flatShading: true
    });
    const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    // Classic "bunker" shape design (10x8 grid approx)
    const shape = [
        "  XXXXXX  ",
        " XXXXXXXX ",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        "XXXXXXXXXX",
        "XXX    XXX",
        "XX      XX",
        "XX      XX"
    ];

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] === 'X') {
                const block = new THREE.Mesh(geometry, material.clone()); // Clone material for individual destruction if needed

                // Position blocks centered around (0,0)
                block.position.x = (x - shape[y].length / 2) * BLOCK_SIZE;
                block.position.y = (shape.length - y - shape.length / 2) * BLOCK_SIZE; // Flip Y so top row is at top
                block.position.z = 0;

                // Add some random offset for "voxel" look
                block.position.z += (Math.random() - 0.5) * 0.05;

                block.userData = { isBarrierBlock: true };
                barrierGroup.add(block);
            }
        }
    }

    barrierGroup.position.set(xOffset, 0, BARRIER_Z);
    return barrierGroup;
}

/**
 * Creates all 4 barriers
 */
export function createBarriers(scene) {
    // Clear existing barriers if any
    resetBarriers(scene);

    const positions = [-12, -4, 4, 12]; // X positions for 4 barriers

    positions.forEach(x => {
        const barrier = createBarrier(x);
        scene.add(barrier);
        barriers.push(barrier);
    });
}

/**
 * Checks collision between a position (missile) and barrier blocks
 * Returns true if a block was hit and destroyed
 */
/**
 * Checks collision between a position (missile) and barrier blocks
 * Returns true if a block was hit and destroyed
 */
export function checkBarrierCollision(position, radius, scene) {
    for (const barrier of barriers) {
        // Quick bounding box check first
        const barrierPos = barrier.position;
        if (Math.abs(position.x - barrierPos.x) > 3 || Math.abs(position.z - barrierPos.z) > 1) {
            continue;
        }

        // Check individual blocks
        // Iterate backwards so we can remove safely
        for (let i = barrier.children.length - 1; i >= 0; i--) {
            const block = barrier.children[i];

            // Get world position of block
            const blockWorldPos = new THREE.Vector3();
            block.getWorldPosition(blockWorldPos);

            const distance = position.distanceTo(blockWorldPos);

            // Collision!
            if (distance < radius + BLOCK_SIZE / 2) {
                // Trigger radial explosion
                explodeBarrier(barrier, blockWorldPos, 0.6, scene); // 0.6 radius destroys ~3x3 area
                return true;
            }
        }
    }
    return false;
}

/**
 * Destroys blocks within a radius of an impact point
 */
function explodeBarrier(barrier, impactPoint, blastRadius, scene) {
    // Create main explosion effect
    createExplosion(impactPoint, scene, 0x00ff00, 8);

    // Play explosion sound (lower intensity for barriers)
    playExplosion(0.5);

    // Iterate backwards to remove blocks
    for (let i = barrier.children.length - 1; i >= 0; i--) {
        const block = barrier.children[i];

        const blockWorldPos = new THREE.Vector3();
        block.getWorldPosition(blockWorldPos);

        // Check if block is within blast radius
        if (blockWorldPos.distanceTo(impactPoint) < blastRadius) {
            // Create mini debris for each destroyed block (optional, might be too heavy)
            // createExplosion(blockWorldPos, scene, 0x00ff00, 2);

            barrier.remove(block);
        }
    }
}

/**
 * Resets/Removes all barriers
 */
export function resetBarriers(scene) {
    barriers.forEach(barrier => {
        scene.remove(barrier);
    });
    barriers = [];
}

/**
 * Get barriers list
 */
export function getBarriers() {
    return barriers;
}

/**
 * Hide all barriers
 */
export function hideBarriers() {
    barriers.forEach(barrier => {
        barrier.visible = false;
    });
}

/**
 * Show all barriers
 */
export function showBarriers() {
    barriers.forEach(barrier => {
        barrier.visible = true;
    });
}
