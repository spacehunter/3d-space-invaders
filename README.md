# 3D Space Invaders

A modern 3D recreation of the classic Space Invaders arcade game built with THREE.js, featuring a third-person camera view, blocky/pixel-art aesthetic, unique alien designs, and intense alien counter-fire mechanics.

## Features

### Gameplay
- **Third-Person View**: Dynamic camera that follows your spaceship from behind
- **Advanced Mouse Controls**:
  - Move mouse left/right to control your spaceship horizontally
  - Move mouse up/down to adjust camera distance (zoom in/out)
  - Click to fire missiles
- **Dynamic Camera**: The camera smoothly tilts and adjusts based on your mouse position for an immersive experience
- **Pixel-Perfect 3D**: Blocky, voxel-style graphics that combine retro aesthetics with 3D gameplay
- **Lives System**: Start with 3 lives - survive as long as you can!

### Aliens
The game features 5 rows of aliens, each with distinctive 3D designs and dramatically enhanced animations:

1. **Octopus Aliens** (Top Row - Purple)
   - **Dramatic tentacle waving** with synchronized wave motion
   - **Pulsing body** that scales up and down
   - Glowing yellow eyes
   - **Rotation wobble** for menacing appearance
   - Fires standard red missiles
   - Worth 50 points

2. **Crab Aliens** (Row 2 - Red)
   - **Aggressive claw snapping** with sharp, jerky motions
   - Eye stalks that bob
   - **Side-to-side sway** for crab-like movement
   - **Aggressive bobbing** animation
   - Fires standard red missiles
   - Worth 40 points

3. **Squid Aliens** (Row 3 - Green)
   - **Swimming motion** with six wiggling legs
   - **Squash and stretch effect** for realistic movement
   - **Tilting body** animation with multiple axes
   - **Vertical swimming motion**
   - Red glowing eyes
   - Fires standard red missiles
   - Worth 30 points

4. **UFO Aliens** (Row 4 - Yellow)
   - **Fast spinning** rotation
   - **Dramatic pulsing light show** with 8 lights around the rim
   - **Wobble motion** simulating anti-gravity
   - **Tilting on multiple axes**
   - Fires standard red missiles
   - Worth 20 points

5. **Tank Aliens** (Row 5 - Cyan)
   - **Tracking cannon** that aims aggressively
   - **Tank body tilts** as if moving
   - **Forward-back rocking** motion
   - Tank treads and armored appearance
   - **Fires special homing missiles** with particle trails!
   - Worth 10 points

### Alien Counter-Fire System
Aliens fight back! Every 1.5 seconds, random aliens fire at you:

- **Standard Missiles** (Rows 0-3): Red projectiles that fly straight toward your position
- **Homing Missiles** (Row 4 - Tank Aliens):
  - Sophisticated aerial missile design with nose cone, body, fins, and engine glow
  - **Smart tracking** with 70% accuracy (30% random offset for dodge-ability)
  - **Realistic physics**: Limited turn rate (0.03 rad/frame) and maximum turn angle (25 degrees)
  - **Particle trails** from the engine exhaust
  - **One-pass behavior**: Can't circle back once they pass you
  - All missiles orient nose-first in their direction of travel

### Visual Effects
- **Animated Starfield**: Thousands of stars flying toward you for immersive depth
- **Particle Explosions**: Bright, rotating particles when aliens or missiles are destroyed
- **Missile Particle Trails**: Orange exhaust trails from tank homing missiles
- **Glowing Effects**: Emissive materials on engines, eyes, missiles, and alien features
- **Dynamic Lighting**: Point lights and directional shadows
- **Fog Effect**: Atmospheric depth fog
- **Post-Game Animation**: Aliens continue their distinctive animations even after game over!

### Game Mechanics
- **Score Tracking**: Points based on alien type (50-10 points)
- **Lives System**: 3 lives - lose one when hit by alien missiles
- **Progressive Difficulty**: Aliens speed up as more are destroyed (5% faster per wave down)
- **Edge Detection**: Aliens move down when reaching screen edges
- **Collision Detection**:
  - Your missiles vs. aliens
  - Alien missiles vs. your ship
  - Distance-based detection on the same Y plane
- **Win/Lose Conditions**:
  - Win: Destroy all aliens
  - Lose: Run out of lives or aliens reach your position
- **Restart**: Click to restart after game over
- **Continuous Animation**: Camera movement, particles, missiles, and alien animations continue even after game over

## How to Play

1. Open `index.html` in a modern web browser
2. Move your mouse left and right to control your spaceship horizontally
3. Move your mouse up and down to adjust camera distance (zoom)
4. Click to fire yellow missiles at the invading aliens
5. **Dodge alien missiles!** Watch for:
   - Red straight missiles from most aliens
   - Cyan homing missiles with particle trails from tank aliens
6. Destroy all aliens before they reach you or you run out of lives!
7. Watch the camera tilt dynamically as you move

## Controls Summary

| Input | Action |
|-------|--------|
| Mouse Left/Right | Move spaceship horizontally |
| Mouse Up/Down | Adjust camera distance (zoom in/out) |
| Left Click | Fire missile |
| Click (Game Over) | Restart game |

## Technical Details

### Core Technology
- **Engine**: THREE.js (v0.158.0)
- **Rendering**: WebGL with shadows enabled
- **Geometry**: Box geometries for pixel/voxel aesthetic
- **Materials**: Phong materials with emissive properties
- **Animation**: RequestAnimationFrame loop running at 60 FPS
- **Physics**: Distance-based collision detection on aligned Y plane

### Advanced Features
- **Smooth Camera Interpolation**: Reduces frantic movement
- **Homing Missile AI**:
  - Turn rate limiting (0.03 radians/frame)
  - Maximum turn angle (25 degrees from current heading)
  - Target blending (70% player position + 30% random offset)
  - One-pass behavior (can't turn back after passing player)
- **Particle Systems**:
  - Explosion particles with rotation and velocity
  - Missile trail particles with engine position calculation
  - Life-based particle decay
- **Animation System**: Time-based animations with per-alien offsets for variety
- **Game State Management**: Separate update loops for active gameplay vs. post-game visuals

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

## Performance

- Renders 50+ aliens with individual animations
- Hundreds of particles for explosions and trails
- Thousands of animated stars
- Runs at 60 FPS on modern hardware

## Development Highlights

### Recent Improvements
- ✅ Enhanced alien animations for each row type (dramatically more noticeable)
- ✅ Tank alien homing missiles with realistic physics
- ✅ Particle trail system for missile exhaust
- ✅ Fixed missile orientations to point nose-first
- ✅ Animated starfield with flying stars
- ✅ Smooth camera controls with Y-axis depth adjustment
- ✅ Alien counter-fire system
- ✅ Lives system (3 lives)
- ✅ Post-game animation continuation
- ✅ Enhanced explosion effects

### Physics & Balancing
- Turn rate tuned for dodge-ability (0.03 rad/frame)
- Maximum turn angle prevents impossible-to-dodge missiles (25 degrees)
- Missile speed reduced for better gameplay (0.15 units/frame)
- 75% miss rate on homing missiles through random offset
- Smooth camera movement to reduce motion sickness

## Future Enhancements

Potential features to add:
- Player shields/barriers
- Power-ups (rapid fire, shields, etc.)
- High score persistence (localStorage)
- Sound effects and music
- Mobile touch controls
- More alien types and formations
- Boss battles
- Multiple difficulty levels
- Mystery UFO bonus enemy

## Credits

Built with THREE.js - A JavaScript 3D library
Inspired by the classic Space Invaders arcade game by Tomohiro Nishikado

## License

MIT License - Feel free to modify and distribute
