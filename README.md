# 3D Space Invaders

A modern 3D recreation of the classic Space Invaders arcade game built with THREE.js, featuring a third-person camera view, blocky/pixel-art aesthetic, and unique alien designs.

## Features

### Gameplay
- **Third-Person View**: Dynamic camera that follows your spaceship from behind
- **Mouse Controls**:
  - Move mouse left/right to control your spaceship
  - Click to fire missiles
- **Camera Tilting**: The camera dynamically tilts based on your mouse position for an immersive experience
- **Pixel-Perfect 3D**: Blocky, voxel-style graphics that combine retro aesthetics with 3D gameplay

### Aliens
The game features 5 rows of aliens, each with distinctive 3D designs and animations:

1. **Octopus Aliens** (Top Row - Purple)
   - Features animated waving tentacles
   - Glowing yellow eyes
   - Body rotation animation
   - Worth 50 points

2. **Crab Aliens** (Row 2 - Red)
   - Eye stalks that bob
   - Snapping claws animation
   - Vertical bobbing movement
   - Worth 40 points

3. **Squid Aliens** (Row 3 - Green)
   - Six wiggling legs
   - Tilting body animation
   - Red glowing eyes
   - Worth 30 points

4. **UFO Aliens** (Row 4 - Yellow)
   - Rotating body
   - Pulsing lights around the rim
   - Floating animation
   - Worth 20 points

5. **Tank Aliens** (Row 5 - Cyan)
   - Moving cannon turret
   - Tank treads
   - Armored appearance
   - Worth 10 points

### Visual Effects
- **Starfield Background**: Thousands of stars for space atmosphere
- **Particle Explosions**: When aliens are destroyed
- **Glowing Effects**: Emissive materials on engines, eyes, and alien features
- **Dynamic Lighting**: Point lights and directional shadows
- **Fog Effect**: Atmospheric depth fog

### Game Mechanics
- **Score Tracking**: Points based on alien type
- **Progressive Difficulty**: Aliens speed up as more are destroyed
- **Edge Detection**: Aliens move down when reaching screen edges
- **Win/Lose Conditions**:
  - Win: Destroy all aliens
  - Lose: Aliens reach your position
- **Restart**: Click to restart after game over

## How to Play

1. Open `index.html` in a modern web browser
2. Move your mouse left and right to control your spaceship
3. Click to fire missiles at the invading aliens
4. Destroy all aliens before they reach you!
5. Watch the camera tilt dynamically as you move

## Technical Details

- **Engine**: THREE.js (v0.158.0)
- **Rendering**: WebGL with shadows enabled
- **Geometry**: Box geometries for pixel/voxel aesthetic
- **Materials**: Phong materials with emissive properties
- **Animation**: RequestAnimationFrame loop running at 60 FPS
- **Physics**: Basic collision detection using distance calculations

## File Structure

```
3d-space-invaders/
├── index.html          # Main game file (self-contained)
└── README.md          # This file
```

## Browser Compatibility

Works in all modern browsers that support:
- ES6 Modules
- WebGL
- Import Maps

Tested on:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Future Enhancements

Potential features to add:
- Player shields/barriers
- Alien projectiles
- Power-ups
- Multiple lives system
- High score persistence
- Sound effects and music
- Mobile touch controls
- More alien types
- Boss battles

## Credits

Built with THREE.js - A JavaScript 3D library
Inspired by the classic Space Invaders arcade game by Tomohiro Nishikado

## License

MIT License - Feel free to modify and distribute
