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
- **3D High Score Interface**:
  - Stunning glowing panel with pulsing cyan border
  - 3D character meshes with emissive glow
  - Animated wireframe selectors
  - 50 floating ambient particles
  - Rainbow color cycling on completion
  - Dynamic point lights for each character
  - Canvas-rendered text with perfect clarity
- **Post-Game Animation**: Aliens continue their distinctive animations even after game over!

### Audio & Sound Effects
Massive, earth-shaking sound effects using procedurally generated Web Audio API synthesis:

- **ASTEROID-IMPACT EXPLOSIONS**: 7-layer synthesized BOOM sounds
  - **Layer 1 - Sub-Bass Impact** (25-10 Hz, 2.5x gain): Ultra-low frequencies you feel in your chest
  - **Layer 2 - Deep Bass Rumble** (60-20 Hz, 2.0x gain): Prolonged 1.2-second BOOOOOM
  - **Layer 3 - Massive White Noise** (1.8x gain): The initial crack and atmospheric explosion
  - **Layer 4 - Mid-Range Body** (150-30 Hz, 1.5x gain): Meaty impact punch
  - **Layer 5 - Thunder Crack** (1200-80 Hz, 1.2x gain): Sharp transient crack
  - **Layer 6 - Distorted Low End** (45-15 Hz, 1.8x gain): Extra weight and power
  - **Layer 7 - Textured Noise** (1.5x gain): Exponentially decaying for realism

- **EXPLOSION TYPES**:
  - **Alien Destruction**: Full-power explosion (1.0x intensity)
  - **Player Hit**: EXTRA LOUD explosion (1.5x intensity) - you'll definitely know you got hit!
  - **Missile Interception**: Quieter explosion (0.4x intensity) when shooting down enemy missiles

- **MISSILE FIRING**: Quick laser-like "pewpew" sound when firing

- **TECHNICAL**:
  - All sounds procedurally generated in real-time (no audio files needed)
  - Duration up to 1.5 seconds for realistic rumble and decay
  - Multi-frequency layering creates convincing, powerful explosions
  - Audio context initializes on first user click (browser requirement)

### Game Mechanics
- **Score Tracking**: Points based on alien type (50-10 points)
- **High Score System**:
  - Top 10 high scores saved in localStorage (persists across sessions)
  - Beautiful 3D initial entry interface when you achieve a high score
  - Mouse wheel to select letters (A-Z, 0-9) for your 3-letter initials
  - Stunning visual effects with glowing panels, particles, and animations
  - High scores displayed in top-right corner of screen
- **Lives System**: 3 lives - lose one when hit by alien missiles
- **Defensive Interception**: Shoot down incoming alien missiles with your own missiles for strategic defense!
- **Progressive Difficulty**: Aliens speed up as more are destroyed (5% faster per wave down)
- **Edge Detection**: Aliens move down when reaching screen edges
- **Collision Detection**:
  - Your missiles vs. aliens
  - Alien missiles vs. your ship
  - **Your missiles vs. alien missiles** (defensive interception)
  - Distance-based detection on the same Y plane
- **Win/Lose Conditions**:
  - Win: Destroy all aliens
  - Lose: Run out of lives or aliens reach your position
- **Restart**: Click to restart after game over
- **Continuous Animation**: Camera movement, particles, missiles, and alien animations continue even after game over

## How to Play

1. Open `index.html` in a modern web browser
2. **Click once to start** - this initializes the audio system
3. Move your mouse left and right to control your spaceship horizontally
4. Move your mouse up and down to adjust camera distance (zoom)
5. Click to fire yellow missiles at the invading aliens (hear that satisfying "pewpew"!)
6. **Defend yourself!** You can:
   - Dodge alien missiles by moving left/right
   - **Shoot down incoming missiles** with your own missiles for defensive play!
7. **Watch for enemy fire**:
   - Red straight missiles from most aliens
   - Cyan homing missiles with particle trails from tank aliens
8. **Listen for explosions!** Massive BOOM sounds when:
   - Your missiles destroy aliens
   - Enemy missiles hit you (EXTRA LOUD!)
   - You intercept enemy missiles (quieter defensive explosion)
9. Destroy all aliens before they reach you or you run out of lives!
10. **Beat a high score?** You'll see a stunning 3D interface:
   - Use mouse wheel to cycle through letters (A-Z, 0-9)
   - Click to confirm each of your 3 initials
   - Watch the beautiful glow and particle effects!
11. Watch the camera tilt dynamically as you move

## Controls Summary

### During Gameplay
| Input | Action |
|-------|--------|
| Mouse Left/Right | Move spaceship horizontally |
| Mouse Up/Down | Adjust camera distance (zoom in/out) |
| Left Click | Fire missile |
| Click (Game Over) | Restart game |

### During High Score Entry
| Input | Action |
|-------|--------|
| Mouse Wheel Up/Down | Cycle through letters (A-Z, 0-9) |
| Left Click | Confirm current letter and move to next |

## Technical Details

### Core Technology
- **Engine**: THREE.js (v0.158.0)
- **Rendering**: WebGL with shadows enabled
- **Audio**: Web Audio API for procedurally generated sound effects
- **Persistence**: localStorage API for high score data
- **Geometry**: Box geometries for pixel/voxel aesthetic
- **Materials**: Phong materials with emissive properties
- **Animation**: RequestAnimationFrame loop running at 60 FPS
- **Physics**: Distance-based collision detection on aligned Y plane

### Advanced Features
- **Smooth Camera Interpolation**: Reduces frantic movement
- **3D High Score System**:
  - localStorage persistence for top 10 scores
  - Automatic high score detection on game over
  - Beautiful 3D initial entry interface with THREE.js
  - Mouse wheel character selection (A-Z, 0-9)
  - Real-time 3D animations (pulse, rotation, glow)
  - Canvas texture generation for text rendering
  - Ambient particle system with 50 floating particles
  - Rainbow HSL color cycling on completion
  - Dynamic point lighting per character
  - Wireframe selector boxes with pulsing opacity
  - Prevents input conflicts during entry
- **Defensive Missile Interception**:
  - Collision detection between player missiles and enemy missiles
  - 0.8 unit collision radius for easier interception
  - Both missiles destroyed on impact
  - Explosion spawns at midpoint between colliding missiles
  - Lower intensity audio feedback (0.4x) for defensive hits
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
- **Procedural Audio Synthesis**:
  - 7-layer explosion sounds with multiple oscillators and noise generators
  - Real-time frequency sweeps and envelope shaping
  - Gain values tuned for maximum impact (2.0-2.5x for bass layers)
  - Multi-second decay times for realistic rumble

## File Structure

```
3d-space-invaders/
├── index.html          # Main HTML file with game UI
├── js/                 # Modular JavaScript game code
│   ├── main.js         # Entry point and initialization
│   ├── game.js         # Game state and main update loop
│   ├── player.js       # Player spaceship logic
│   ├── aliens.js       # Alien entities and animations
│   ├── missiles.js     # Missile systems (player + alien + interception)
│   ├── particles.js    # Particle effects system
│   ├── audio.js        # Procedural sound effects
│   ├── input.js        # Mouse input handling
│   ├── starfield.js    # Animated starfield background
│   ├── highscores.js   # High score system with 3D UI and localStorage
│   ├── barriers.js     # Destructible barrier system
│   ├── powerups.js     # Power-up system (drops and effects)
│   └── constants.js    # Game constants and configuration
└── README.md           # This file
```

## Browser Compatibility

Works in all modern browsers that support:
- ES6 Modules
- WebGL
- Web Audio API
- localStorage API
- Import Maps

Tested on:
- Chrome/Edge (recommended)
- Firefox
- Safari

**Notes**:
- Audio requires user interaction (click) to initialize due to browser autoplay policies
- High scores are saved in localStorage and persist across browser sessions

## Performance

- Renders 50+ aliens with individual animations
- Hundreds of particles for explosions and trails
- Thousands of animated stars
- Runs at 60 FPS on modern hardware

## Development Highlights

### Recent Improvements
- ✅ **Power-Up System** - Collect drops for enhanced abilities!
  - **Rapid Fire (Red)**: Hold to unleash a stream of missiles (100ms delay)
  - **Spread Shot (Yellow)**: Fire 3 missiles at once to clear wide areas
  - **Barrier Repair (Green)**: Instantly rebuilds all defensive barriers
  - 10% drop chance from destroyed aliens
  - Effects last for 10 seconds
- ✅ **Destructible Barriers** - Classic defense with modern physics!
  - 4 voxel-based barriers provide cover
  - **Radial Destruction**: Missiles blast holes in the structure
  - **Audio Feedback**: Satisfying crunch sound on impact
  - Fully destructible and repairable
- ✅ **Smart Missiles** - Anti-air capability!
  - Missiles automatically climb to intercept high-flying UFOs
  - "Strafe" elevation change maintains forward orientation
  - Visual tilt removed for cleaner aesthetic
- ✅ **Beautiful 3D high score system** - Stunning arcade-style interface with localStorage persistence!
  - Mouse wheel character selection for 3-letter initials
  - Gorgeous glowing panels, particles, and animations
  - Top 10 scores saved permanently across sessions
  - Real-time display in top-right corner
- ✅ **Missile interception system** - Shoot down incoming enemy missiles defensively!
- ✅ **MASSIVE explosion sound effects** - 7-layer asteroid-impact BOOM sounds
- ✅ **Procedural audio synthesis** with Web Audio API (no external files)
- ✅ **Enhanced alien animations** for each row type (dramatically more noticeable)
- ✅ **Tank alien homing missiles** with realistic physics
- ✅ **Particle trail system** for missile exhaust
- ✅ **Fixed missile orientations** to point nose-first
- ✅ **Animated starfield** with flying stars
- ✅ **Smooth camera controls** with Y-axis depth adjustment
- ✅ **Alien counter-fire system**
- ✅ **Lives system** (3 lives)
- ✅ **Post-game animation continuation**
- ✅ **Enhanced explosion visual effects**

### Physics & Balancing
- Turn rate tuned for dodge-ability (0.03 rad/frame)
- Maximum turn angle prevents impossible-to-dodge missiles (25 degrees)
- Missile speed reduced for better gameplay (0.15 units/frame)
- 75% miss rate on homing missiles through random offset
- Smooth camera movement to reduce motion sickness

## Future Enhancements

Potential features to add:
- Background music and additional sound effects
- Mobile touch controls
- More alien types and formations
- Boss battles
- Multiple difficulty levels

## Credits

Built with THREE.js - A JavaScript 3D library
Inspired by the classic Space Invaders arcade game by Tomohiro Nishikado

## License

MIT License - Feel free to modify and distribute
