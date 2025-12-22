# Alien Craft Design Skill

Use this skill when creating a new type of alien craft with unique animation and firepower for the 3D Space Invaders game.

## Overview

This skill guides you through designing and implementing a new alien type with:
- Custom 3D mesh geometry using THREE.js
- Unique animation patterns
- Special weapon/firepower mechanics

## File Locations

- **Alien definitions**: `js/aliens.js` - Contains alien mesh creation and animation
- **Weapon systems**: `js/missiles.js` - Contains missile/projectile mechanics
- **Game constants**: `js/constants.js` - Contains ALIEN_ROWS, ALIEN_COLS, etc.
- **Audio effects**: `js/audio.js` - Sound effect functions

## Implementation Steps

### Step 1: Update Constants (if adding a new row)

In `js/constants.js`, increment `ALIEN_ROWS` if adding a new alien type as a new row:
```javascript
export const ALIEN_ROWS = 6; // Was 5, now 6 for new alien type
```

### Step 2: Create the Alien Mesh Function

In `js/aliens.js`, add a new creation function following this pattern:

```javascript
function createYourAlien(group) {
    // Main material with emissive glow
    const material = new THREE.MeshPhongMaterial({
        color: 0xHEXCOLOR,
        emissive: 0xHEXCOLOR,
        emissiveIntensity: 1.6,
        flatShading: true
    });

    // Body mesh
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    body.castShadow = true;
    group.add(body);

    // Store animated parts in userData for animation access
    group.userData.animatedPart = somePartMesh;
}
```

### Step 3: Register in Switch Statement

In the `createAlien(row)` function, add a case for your new alien:

```javascript
case 5: // Your new alien type
    createYourAlien(group);
    break;
```

### Step 4: Add Animation

In the `animateAlien(alien)` function, add animation logic:

```javascript
case 5: // Your alien animation
    const time = Date.now() * 0.001 + alien.userData.animationOffset;

    // Animate stored parts
    if (alien.userData.animatedPart) {
        alien.userData.animatedPart.rotation.z = Math.sin(time * 4) * 0.5;
    }

    // Body animation
    alien.rotation.y = Math.sin(time * 2) * 0.2;
    alien.position.y = Math.sin(time * 3) * 0.1;
    break;
```

### Step 5: Add Special Weapon (Optional)

In `js/missiles.js`, create a special missile/attack function:

```javascript
function createYourAlienMissile(position) {
    const group = new THREE.Group();

    // Missile geometry and materials
    const projectile = new THREE.Mesh(geometry, material);
    group.add(projectile);

    group.position.copy(position);
    group.userData.isYourMissile = true;
    group.userData.speed = 0.2;

    return group;
}
```

Then modify `alienFire()` to use this for your alien's row:

```javascript
if (randomAlien.userData.row === 5) {
    missile = createYourAlienMissile(randomAlien.position);
}
```

## Existing Alien Types Reference

| Row | Type | Color | Special Feature |
|-----|------|-------|-----------------|
| 0 | Octopus | Magenta | Tentacle waving, pulsing |
| 1 | Crab | Red | Claw snapping, side sway |
| 2 | Squid | Green | Swimming motion, squash/stretch |
| 3 | UFO | Yellow | Spinning lights, wobble |
| 4 | Tank | Cyan | Turret tracking, homing missiles |

## Animation Patterns

Common animation techniques used:
- **Oscillation**: `Math.sin(time * frequency) * amplitude`
- **Pulsing scale**: `1 + Math.sin(time * 3) * 0.1`
- **Part movement**: Store parts in `userData`, animate in switch case
- **Rotation wobble**: Apply to `rotation.x/y/z`
- **Vertical bob**: Modify `position.y`

## Material Guidelines

- Use `MeshPhongMaterial` with `emissive` for glow effect
- `emissiveIntensity: 1.6` for body, `3.0-4.0` for glowing parts (eyes, lights)
- `flatShading: true` for retro aesthetic
- Common eye colors: Yellow, Cyan, Red (high emissive)

## Scoring

Update scoring in `js/missiles.js` `checkMissileCollision()`:
```javascript
const points = (6 - alien.userData.row) * 10; // Adjust formula for new rows
```

## Testing Checklist

- [ ] Alien mesh renders correctly
- [ ] Animation plays smoothly
- [ ] Special weapon fires properly
- [ ] Collision detection works
- [ ] No console errors
- [ ] Performance is acceptable with full formation
