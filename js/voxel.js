import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Bake a list of coloured boxes into a single geometry. Detail lives in vertex
// colours instead of extra meshes, so an elaborate part is still one draw call.
export function buildVoxelGeometry(boxes) {
    const parts = boxes.map(box => {
        const geometry = new THREE.BoxGeometry(box.size[0], box.size[1], box.size[2]);
        if (box.rotX) geometry.rotateX(box.rotX);
        if (box.rotY) geometry.rotateY(box.rotY);
        if (box.rotZ) geometry.rotateZ(box.rotZ);
        if (box.pos) geometry.translate(box.pos[0], box.pos[1], box.pos[2]);

        const color = new THREE.Color(box.color);
        const vertexCount = geometry.attributes.position.count;
        const colors = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geometry;
    });

    return parts.length === 1 ? parts[0] : mergeGeometries(parts);
}

// Mirror a box list across X. Building a real mirrored geometry beats setting
// scale.x = -1, which inverts normals and breaks the lighting on that half.
export function mirrorBoxes(boxes) {
    return boxes.map(box => ({
        ...box,
        pos: [-box.pos[0], box.pos[1], box.pos[2]],
        rotY: box.rotY ? -box.rotY : box.rotY,
        rotZ: box.rotZ ? -box.rotZ : box.rotZ
    }));
}

// Limb segment that extends downward from its origin (arms, legs)
export function buildLimbSegmentGeometry(segment, color, trimColor) {
    return buildVoxelGeometry([
        { size: [segment.width, segment.length, segment.width], pos: [0, -segment.length / 2, 0], color },
        { size: [segment.width + 0.05, 0.07, segment.width + 0.05], pos: [0, -0.02, 0], color: trimColor }
    ]);
}

// Tail segment — extends backward along +Z from its origin (scorpion tail)
export function buildTailSegmentGeometry(segment, color, trimColor) {
    return buildVoxelGeometry([
        { size: [segment.width, segment.width, segment.length], pos: [0, 0, -segment.length / 2], color },
        { size: [segment.width + 0.04, segment.width + 0.04, 0.03], pos: [0, 0, -segment.length + 0.01], color: trimColor }
    ]);
}

// Chain meshes so each segment is the next one's pivot
export function buildLimbChain(mount, geometries, segments, material, offsetSign) {
    const chain = [];
    let parent = mount;
    segments.forEach((segment, j) => {
        const mesh = new THREE.Mesh(geometries[j], material);
        mesh.position.y = j === 0 ? 0 : offsetSign * segments[j - 1].length;
        const bend = segment.baseBend !== undefined ? segment.baseBend
            : segment.baseTilt !== undefined ? segment.baseTilt : segment.bend;
        mesh.userData.baseBend = bend;
        mesh.rotation.z = bend;
        parent.add(mesh);
        parent = mesh;
        chain.push(mesh);
    });
    return chain;
}

// Same as buildLimbChain but segments run along +Z (for tails)
export function buildTailChain(mount, geometries, segments, material) {
    const chain = [];
    let parent = mount;
    segments.forEach((segment, j) => {
        const mesh = new THREE.Mesh(geometries[j], material);
        mesh.position.z = j === 0 ? 0 : segments[j - 1].length;
        const bend = segment.baseBend !== undefined ? segment.baseBend
            : segment.baseTilt !== undefined ? segment.baseTilt : segment.bend;
        mesh.userData.baseBend = bend;
        mesh.rotation.z = bend;
        parent.add(mesh);
        parent = mesh;
        chain.push(mesh);
    });
    return chain;
}

// A voxel disc: three overlapping boxes union into a square with cut corners,
// which reads as round far better than a single box does
export function saucerTier(width, depth, height, y, color) {
    return [
        { size: [width, height, depth], pos: [0, y, 0], color },
        { size: [depth, height, width], pos: [0, y, 0], color },
        { size: [(width + depth) / 2, height, (width + depth) / 2], pos: [0, y, 0], color }
    ];
}
