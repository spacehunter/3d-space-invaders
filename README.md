# 3D Space Invaders

A modern 3D recreation of the classic Space Invaders arcade game built with THREE.js, featuring a third-person camera view, blocky/pixel-art aesthetic, unique alien designs, and intense alien counter-fire mechanics.

## Current Project Status

As of 2026-08-17, all 13 alien rows have distinct rebuilt voxel models and animations. The newest is the Row 12 Mantis, an upright ambush predator in olive and bone: it is the only invader that holds almost completely still, tracking you with its head while its oversized raptorial forearms stay folded — until they unfold and snap out in a fraction of a second, and it looses a spur that drifts in slowly, coils to a near-standstill, and then lunges.

Latest validation: `npm run build` passes. Run the dev server with the browser-safe host command below and open `http://127.0.0.1:5173/` to test the game, or `http://127.0.0.1:5173/alien-preview.html` to inspect the Scorpion directly.

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
The game features 13 rows of aliens, each with distinctive 3D designs and dramatically enhanced animations:

1. **Octopus Aliens** (Top Row - Purple)
   - **Sculpted voxel mantle**: tapering domed hood with a crest, brow ridge, cheek plates and side fins
   - **Six jointed tentacles**, each three nested segments with suction cups, so a **curl travels down the limb**
   - **Jet propulsion cycle** - the hood flares as the body contracts and the tentacles sweep
   - **Blinking eyes** with heavy hooded lids, plus glowing yellow irises that drift and look around
   - **Bioluminescent collar vents** that flare on each contraction
   - **Chomping beak** and gentle rotation wobble over a breathing body
   - Fires standard red missiles
   - Worth 60 points

2. **Crab Aliens** (Row 2 - Red)
   - **Tiered armoured carapace**: low and wide, with a serrated front rim, lateral spikes and shoulder blocks
   - **Jointed pincer claws** on two-segment arms - the elbow straightens and thrusts as the jaws snap shut
   - **Six walking legs** with a real knee bend, driven as **alternating tripods**
   - **Swivelling eye stalks** carrying cyan compound eyes that flinch and duck
   - **Molten shell seams** that glow hotter with every snap
   - **Chattering mandibles** over a body that rocks with the gait
   - Fires standard red missiles
   - Worth 50 points

3. **Squid Aliens** (Row 3 - Green)
   - **Deep-green mantle** with a dorsal keel fin and a wide mint-to-shadow colour ramp
   - **Amber bioluminescent veins** that pump bright as the jet coils - the "inhale" before every thrust
   - **Coil-then-jet cycle**: the mantle stretches tall, then squeezes narrow as the siphon flashes and the plume stabs out
   - **Diamond fin wings** that ripple root-to-tip, then sweep flat to streamline into the thrust
   - **Chromatophore spots** that flush mint-bright with each jet
   - **Eight-arm crown** with a curl that travels around the ring and down each arm, sucker glow rippling behind it
   - **Amber lure clubs** on the two feeding tentacles - they drift, then lash out and flare every few seconds
   - **Blinking amber eyes** with horizontal slit pupils that flare on the strike
   - Fires standard red missiles
   - Worth 40 points

4. **UFO Aliens** (Row 4 - Yellow)
   - **Layered saucer hull** built from stacked voxel discs, with panel seams and landing struts
   - **Counter-rotating construction**: the hull spins one way beneath a level canopy while the light collar spins the other
   - **True chase lights** - the bright spot travels around the ring, each lamp lit independently
   - **Translucent canopy** with a pilot silhouette that looks around inside it
   - **Scan beam** that charges at the emitter and stabs downward every few seconds
   - **Gyroscopic hover** with complex multi-axis wobble
   - Fires standard red missiles
   - Worth 30 points

5. **Tank Aliens** (Row 5 - Cyan)
   - **Sloped armour hull** with glacis plate, side skirts, fenders, bolt heads and exhaust stacks
   - **Rolling treads**: a real belt of plates that wraps the bogies and sprockets, scrolling at the formation's actual speed
   - **Spinning road wheels** with contrasting spokes, geared to the track's surface speed
   - **Rotating turret** with cupola and a **sweeping radar dish**
   - **Recoiling gun**: the barrel snaps back into the mantlet on the shot and eases out, with a crisp muzzle flash
   - **Charging energy coils** that glow back up between shots
   - **Engine rumble** vibration effect
   - **Fires special homing missiles** with particle trails!
   - Worth 20 points

6. **Beetle Aliens** (Row 6 - Orange)
   - **Ribbed elytra** (hard wing cases) over a dark body, with a pronotum shield and a **rhinoceros horn**
   - **Breaks into flight**: the shell splits, the cases lift and splay into a V, and hidden wings unfold
   - **Buzzing flight wings** that blur as it lifts clear of the formation, then fold away again
   - **Creeping tripod gait** with three-jointed legs that tuck up in flight
   - **Club-tipped antennae** that sweep and waggle
   - **Glowing web-bomb sac** slung under the abdomen, charging between shots
   - **Fires Web Bombs** - slow projectiles that create danger zones!
   - Worth 10 points

8. **Scorpion Aliens** (Row 7 - Burnt Orange)
    - **Compact chunky carapace** with a dark underbody and a Beetle-consistent voxel silhouette
    - **Raised five-segment tail** that curls above the body and whips on strike
    - **Amber stinger** at the tail tip that pulses with venom
    - **Chunky pedipalp pincers** that snap at the front
    - **8 jointed walking legs** with a clear alternating tripod gait
    - **Fires venom darts** - slow-arcing mortar projectiles that drop from above!
    - Worth 0 points

9. **Wasp Aliens** (Row 8 - Amber)
    - **Compact charcoal thorax** with amber-and-black warning stripes, angular face plates and a bright terminal stinger
    - **Two pairs of smoky voxel wings** that fold, vibrate, snap open and beat through a spectacular wingstorm sequence
    - **Six jointed legs** driven by alternating tripod shifts while the body hovers and leans into a sting lunge
    - **Compound eyes and mandibles** that intensify and open during the charge
    - **Fires amber needles** - fast, straight-flying stinger volleys
    - Worth 0 points

10. **Sentinel Aliens** (Row 9 - Obsidian)
    - **A levitating construct with no limbs at all** - ten angular armour shards closed around an exposed plasma core, with a keel spike that never touches the ground
    - **Two counter-rotating gimbal rings** tilted against each other, orbiting the core continuously
    - **Shatter bloom** - the shell unlocks, blows apart into a tumbling orbital cloud, then locks into a flat firing lens in front of the core
    - **Iris and lance** - the front plates slide open, the core charges, and a lance discharges before the shards slam back together
    - **Fires prism lances** - a diverging three-shot fan that denies a cone rather than a lane
    - Worth 0 points

11. **Warden Aliens** (Row 10 - Plum)
    - **The only invader with a hole through it** - a standing plum hoop with inward-pointing teeth and a bright ring of bevels, empty in the middle
    - **A molten gold core** suspended at the centre on four spokes that retract toward it
    - **The gimbal flip** - the hoop rolls, the spokes pull in, and it turns fully edge-on, collapsing the silhouette from a circle to a line before snapping back face-on
    - **Fires halo waves** - expanding hollow rings, lethal only at the rim, so you survive by lining up with the hole or getting outside the edge rather than by running away
    - Worth 0 points

12. **Gyre Aliens** (Row 11 - Nacre)
    - **Not a body but a whirlpool** - fourteen loose nacre shell plates wound in a receding conical spiral, widest at the back and tapering forward to a gold bead aimed down the lane
    - **Dust motes** caught orbiting outside the funnel, counter-rotating against the coil
    - **A pearl chase light** stepping inward from the mouth to the core, over a slow travelling ripple
    - **The drain** - the whole funnel corkscrews down into its own core, flares white-gold, spits a bolt and springs open again on a rebound wave
    - **Fires vortex bolts** - projectiles that corkscrew around a descending axis on a helix that widens as it travels
    - Worth 0 points

13. **Mantis Aliens** (Row 12 - Olive)
    - **An upright ambush predator** - a narrow prothorax carried at an angle, in olive shading to bone, with a triangular head on its own neck
    - **Two oversized raptorial forearms** folded in front, leaving a deep notch in the outline that shuts when it strikes
    - **The only invader that holds still** - between attacks only the head tracks you and the antennae sweep, which is what makes the strike land
    - **The ambush** - the arms unfold and snap out and shut in a fraction of a second, cyan spine teeth flashing as the folded wings crack open
    - **Fires ambush spurs** - they drift in slower than any other projectile, coil to a near-standstill, then lunge
    - Worth 0 points

### Bestiary Gallery
A field guide reached from the **BESTIARY** option on the landing page (or the **B** key):
- Browse all 13 alien types one at a time, rendered large and centred on a slowly turning display
- Each model runs its full in-game animation - tentacle curls, snapping claws, chase lights, rolling treads and all
- Shows the alien's name, row colour, point value, behaviour summary and armament
- **← / →** (or the on-screen arrows) page between types and wrap around at both ends
- **B**, Backspace or the **BACK** button returns to the landing page
- Models are auto-framed to the viewport, so each type fills the display regardless of its size
- Uses the same bloom and lighting as the game, dialled back slightly so bright emissive types stay readable up close

### Level Progression System
- **Infinite levels** with formula-based scaling difficulty
- **Progressive challenge**: More aliens, faster speed, quicker fire rate each level
- **Level announcements** with hyperspace warp effect between waves
- **Bonus points** for completing levels
- **Perfect round bonus** for no-damage clears
- **Difficulty tiers**: RECRUIT, SOLDIER, VETERAN, ELITE, COMMANDER, LEGENDARY, IMPOSSIBLE

### Boss Battles
Every 5 levels, face a unique boss instead of alien waves:

1. **Mothership** (Level 5, 25, 45...)
   - Classic UFO boss with rotating lights
   - Multi-phase health system

2. **Hive Queen** (Level 10, 30, 50...)
   - Insectoid swarm leader
   - Spawns minions during battle

3. **Dreadnought** (Level 15, 35, 55...)
   - Heavy armored warship
   - Devastating firepower

4. **Phantom** (Level 20, 40, 60...)
   - Stealth/phasing abilities
   - Unpredictable attack patterns

5. **Titan** (Level 25, 45, 65...)
   - Massive final boss of each cycle
   - Ultimate challenge

**Boss features:**
- **Health bar UI** with boss name display
- **Multi-phase damage system** - bosses get harder as health drops
- **Bosses scale up** each time they reappear (enhanced versions)
- **Full barrier repair** before each boss fight

### Kamikaze Swoop Attack
When fewer than 5 aliens remain, they become desperate and aggressive:

- **Telegraph Warning**: Aliens pulse and shake while a high-pitched siren plays (1 second warning)
- **High-Speed Dive**: After the warning, aliens break formation and dive at the player at 60% faster speed
- **Random Patterns**: Swooping aliens follow unpredictable sine-wave paths on both X and Y axes
- **Banking Motion**: Aliens tilt and rotate as they weave through the air
- **Reset Behavior**: If they miss, they teleport back to the rear formation and can attack again
- **Interval**: Swoops occur every 5-10 seconds (randomized)

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
- **Web Bombs** (Row 5 - Beetle Aliens):
  - Slow-moving green sticky projectiles with dripping strands
  - **Creates danger zones** on the ground that persist for 2.5 seconds
  - Wobbling flight animation with pulsing glow
  - Step into a web zone and lose a life!
- **Blaster Bolts** (Row 6 - Invader Aliens):
  - Fast straight-shooting red/white energy bolts
  - **High speed** (0.4 units/frame - faster than other projectiles)
  - Pulsing glow animation as they travel
  - Fires from the center blaster cannon
- **Venom Darts** (Row 7 - Scorpion Aliens):
  - Amber mortar rounds that climb to a peak, then dive at you under gravity
  - **Come down from above**, so a barrier in front of you is no cover
- **Amber Needles** (Row 8 - Wasp Aliens):
  - Small, bright, fast-flying stinger volleys on a straight line
  - **Tumble as they travel**, with a hot white tip leading
- **Prism Lances** (Row 9 - Sentinel Aliens):
  - Three ice-white lances fired at once on slightly diverging headings
  - **Denies a cone rather than a lane** - sidestepping one can put you into another
- **Halo Waves** (Row 10 - Warden Aliens):
  - An expanding hollow ring that grows as it closes on you
  - **Lethal only at the rim**: you are safe lined up with the hole in the middle, and safe outside the edge
  - **Dodge through it, not away from it** - backing straight up keeps you at the wrong radius as it widens
- **Vortex Bolts** (Row 11 - Gyre Aliens):
  - A single bolt that corkscrews around the lane it was fired down, on a helix that opens out as it travels
  - **Sweeps a corridor rather than holding a lane** - by the time it reaches you it is crossing roughly two units of ground, so sidestepping into the next lane is not automatically safe
  - **Only over any one point for part of each turn**, so the dodge is a matter of timing: hold still and let it wind past, or move as it swings away
- **Ambush Spurs** (Row 12 - Mantis Aliens):
  - A barbed spur that drifts in at a third of the usual speed, so it is easy to stop watching
  - **Coils to a near-standstill** about nine units out, rearing back with its flukes flared - that pause is the only warning you get
  - **Then lunges** at nearly three times its approach speed. Judge it by the coil, not by how slowly it started

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

- **LEVEL SYSTEM AUDIO**:
  - **Level Complete Fanfare**: Triumphant multi-tone celebration
  - **Hyperspace Warp**: Whooshing sound during level transitions
  - **Boss Warning Alarm**: Ominous alert when boss appears
  - **Boss Phase Transition**: Sound cue when boss enters new damage phase

- **TECHNICAL**:
  - All sounds procedurally generated in real-time (no audio files needed)
  - Duration up to 1.5 seconds for realistic rumble and decay
  - Multi-frequency layering creates convincing, powerful explosions
  - Audio context initializes on first user click (browser requirement)

### Performance
- **FPS Counter**: Real-time frames-per-second display in the bottom-left corner for performance monitoring

### Game Mechanics
- **Score Tracking**: Points based on alien type (60-0 points, top rows worth more)
- **High Score System**:
  - Top 10 high scores saved in localStorage (persists across sessions)
  - Beautiful 3D initial entry interface when you achieve a high score
  - Mouse wheel to select letters (A-Z, 0-9) for your 3-letter initials
  - Stunning visual effects with glowing panels, particles, and animations
  - High scores displayed in top-right corner of screen
- **Lives System**: 3 lives - lose one when hit by alien missiles
- **Defensive Interception**: Shoot down incoming alien missiles with your own missiles for strategic defense!
- **Dynamic Alien Speed**: Aliens automatically speed up as their numbers decrease (6x faster when only 1 remains)
  - Non-linear speed curve that accelerates more quickly in the endgame
  - Compensates for longer travel distances when outer columns are destroyed
  - Maintains game intensity throughout
- **Edge Detection**: Aliens move down when reaching screen edges
- **Collision Detection**:
  - Your missiles vs. aliens (1.2 unit radius for easier hits)
  - Alien missiles vs. your ship
  - **Your missiles vs. alien missiles** (defensive interception)
  - Distance-based detection on the same Y plane
  - Extended missile range (-60 units) ensures hits on back-row aliens
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

### On the Landing Page
| Input | Action |
|-------|--------|
| SPACE / ENTER | Start a new game |
| C | Continue from your saved level |
| B | Open the Bestiary gallery |
| S | Open Settings |

### In the Bestiary
| Input | Action |
|-------|--------|
| ← / → (or A / D) | Previous / next alien |
| On-screen ‹ › arrows | Previous / next alien |
| B / Backspace / BACK | Return to the landing page |

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

## Development & Deployment

### Quick Start
```bash
npm install        # Install dependencies
npm run dev -- --host 0.0.0.0 --strictPort  # Start dev server on port 5173
```

### Local Server Access

Use these exact HTTP addresses after starting Vite:

- **This Mac:** `http://127.0.0.1:5173/` (also works as `http://localhost:5173/`)
- **Another device on the same Wi-Fi:** `http://192.168.0.61:5173/` (use the Mac's current LAN address if it changes)
- **Scorpion preview:** append `/alien-preview.html` to either address

Do not use `172.23.7.133`; that is a tunnel/VPN interface address and is not the browser-facing LAN address. Do not use `https://`; Vite serves plain HTTP locally. If the terminal reports a different port, use that reported port rather than a stale `5173` URL.

If a browser reports that the server is down, verify the server and port from the same Mac:

```bash
curl -I http://127.0.0.1:5173/
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

The first command should return `HTTP/1.1 200 OK`, and the second should show Vite listening on `*:5173`.

### Build Commands
| Command | Description |
|---------|-------------|
| `npm run dev -- --host 0.0.0.0 --strictPort` | Development server with hot reload on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run package` | Build + bump version + create `3d-space-invaders.zip` for distribution |

### Distribution
1. Run `npm run package`
2. Upload `3d-space-invaders.zip` to your hosting platform
3. The zip contains `index.html` at root with bundled assets

### Version Display
- Version number shown in bottom-right corner (e.g., `v1.0.7`)
- Auto-increments on each `npm run package`

## File Structure

```
3d-space-invaders/
├── index.html          # Main HTML file with game UI
├── package.json        # Dependencies and build scripts
├── vite.config.js      # Vite build configuration
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
│   ├── levels.js       # Level configuration and scaling system
│   ├── boss.js         # Boss entities and battle mechanics
│   ├── transitions.js  # Level transition effects and UI
│   ├── landing.js      # Landing page menu
│   ├── bestiary.js     # Bestiary gallery view of the alien models
│   ├── settings.js     # Settings panel and persistence
│   ├── bonus-ufo.js    # Periodic bonus UFO
│   └── constants.js    # Game constants and configuration
├── dist/               # Production build output (generated)
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

- Renders up to 121 aliens (11 rows × 11 columns) with individual animations
- Hundreds of particles for explosions and trails
- Thousands of animated stars
- Runs at 60 FPS on modern hardware

## Development Highlights

### Recent Improvements
- ✅ **Alien Model Overhaul** - All eleven alien types now use distinct voxel sculpts and animations!
  - **Octopus** - domed mantle, six jointed tentacles that curl a wave down their length, blinking hooded eyes, pulsing collar vents
  - **Crab** - tiered carapace, jointed pincers that thrust as the jaws snap, alternating tripod gait, swivelling eye stalks
  - **UFO** - layered saucer hull, counter-rotating light collar, pilot visible in the canopy, downward scan beam
  - **Tank** - sloped armour, tread belts that roll at the formation's actual speed, rotating turret, recoiling gun
  - **Beetle** - wing cases that split open into buzzing flight, creeping gait, glowing web-bomb sac
  - **Scorpion** - compact burnt-orange carapace, raised five-segment tail, amber stinger, snapping pincers and tripod gait
  - **Wasp** - charcoal thorax, amber warning stripes, smoky wings, wingstorm animation and fast needle volleys
  - **Sentinel** - obsidian shard shell around an exposed plasma core, counter-rotating gimbals, a shatter-bloom disassembly cycle and diverging prism lance fans
  - **Warden** - a hollow plum hoop with a gold core on retractable spokes, a gimbal flip that turns it edge-on, and expanding halo waves
  - **Per-part animation restored across all eleven types** - claws, legs, chase lights, cannons, marching feet, Wasp wings and Sentinel shards are animated independently
- ✅ **Bestiary Gallery** - Browse every alien model up close from the landing page
- ✅ **Settings Panel** - Comprehensive game customization!
  - Audio controls (Master, SFX, Music volumes, Mute All)
  - Visual settings (Glow Intensity, Particle Density, FPS Counter)
  - Gameplay settings (Mouse Sensitivity, Debug Hitboxes)
  - Retro CRT aesthetic with **4 animated scanlines** moving at different speeds
  - Accessible from landing page or during gameplay (ESC key)
  - Settings persist across sessions in localStorage
- ✅ **Continue System Fixed** - Proper game state reset!
  - Starting from any level now correctly resets lives to 3
  - Score resets to 0 for a fresh start
  - Barriers fully repaired before continuing
  - Lives can never go negative (clamped at 0)
- ✅ **Level Progression System** - Infinite scaling difficulty!
  - Formula-based difficulty scaling (speed, fire rate, alien count)
  - Hyperspace warp transitions between levels
  - Bonus points and perfect round rewards
  - Difficulty tiers from RECRUIT to IMPOSSIBLE
- ✅ **Boss Battles** - Epic encounters every 5 levels!
  - 5 unique boss types: Mothership, Hive Queen, Dreadnought, Phantom, Titan
  - Multi-phase health systems with scaling difficulty
  - Boss health bar UI with dramatic warning effects
  - Bosses get stronger each time they reappear
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
- ✅ **Beetle Alien** - Classic 70s arcade insect with Web Bomb weapon!
  - Scuttling leg animation with alternating tripod gait
  - Web Bombs create persistent danger zones
- ✅ **Invader Alien** - Retro 1-bit arcade style with Blaster Cannon!
  - Symmetrical silhouette with antennae and center cannon
  - Fast Blaster Bolts for high-speed attacks

### Physics & Balancing
- Turn rate tuned for dodge-ability (0.03 rad/frame)
- Maximum turn angle prevents impossible-to-dodge missiles (25 degrees)
- Missile speed reduced for better gameplay (0.15 units/frame)
- 75% miss rate on homing missiles through random offset
- Smooth camera movement to reduce motion sickness

## Future Enhancements

Potential features to add:
- Background music
- Mobile touch controls
- More alien types and formations
- Multiplayer support

## Credits

Built with THREE.js - A JavaScript 3D library
Inspired by the classic Space Invaders arcade game by Tomohiro Nishikado

## License

MIT License - Feel free to modify and distribute
