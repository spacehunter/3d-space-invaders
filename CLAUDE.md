# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D Space Invaders is a browser-based game built with THREE.js featuring a third-person camera, blocky/voxel aesthetic, procedural audio, infinite level progression, and epic boss battles. Uses Vite for production builds with minification.

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server with hot reload (http://localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run package    # Build + bump version + create zip for distribution
```

## Running the Game

**Development**: `npm run dev` - opens with hot reload at localhost:5173

**Direct**: Open `index.html` in browser (uses CDN for THREE.js, no build needed)

## Architecture

### Entry Point & Initialization
- `js/main.js` - Creates THREE.js scene, camera, renderer, post-processing (bloom effect), and initializes all game systems
- `index.html` - Contains UI elements, import map for THREE.js CDN, and glow intensity slider

### Core Game Loop (`js/game.js`)
- `initGame()` - Initializes game state (score, lives, barriers, level system)
- `update()` - Main loop called via requestAnimationFrame, orchestrates all system updates
- `handleFire()` - Processes player firing, handles game restart on click after game over
- `handleLevelComplete()` - Manages level progression, boss spawning, and transition effects
- Game state: `score`, `lives`, `gameActive`
- Level state: `currentLevel`, `levelConfig`, `isBossLevel`, `damageTakenThisLevel`, `livesAtLevelStart`

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| `player.js` | Player spaceship creation and movement |
| `aliens.js` | 7 alien types (Octopus, Crab, Squid, UFO, Tank, Beetle, Invader) with unique animations and Kamikaze Swoop behavior |
| `missiles.js` | Player missiles, alien missiles (standard, homing, web bombs, blaster bolts), UFO missiles, collision detection, interception system |
| `particles.js` | Explosion and trail particle systems |
| `audio.js` | Procedural Web Audio API sound synthesis (explosions, firing, level complete, hyperspace, boss warnings) |
| `input.js` | Mouse position tracking and click handling |
| `starfield.js` | Animated background stars |
| `highscores.js` | 3D high score entry UI and localStorage persistence |
| `barriers.js` | Destructible voxel barriers with radial damage |
| `powerups.js` | Power-up drops (Rapid Fire, Spread Shot, Barrier Repair) |
| `bonus-ufo.js` | Periodic bonus UFO that flies across screen |
| `levels.js` | Level progression system with formula-based scaling difficulty |
| `boss.js` | 5 boss types (Mothership, Hive Queen, Dreadnought, Phantom, Titan) with multi-phase health systems |
| `transitions.js` | Level transition effects (hyperspace warp) and level announcement UI |
| `constants.js` | Game constants (PLAYER_SPEED, MISSILE_SPEED, ALIEN_ROWS/COLS, ALIEN_SPACING) |

### Key Patterns

**Alien Types by Row**: Each row (0-6) has distinct geometry, animation, and behavior:
- Row 0: Octopus (ripple tentacles, breathing, 60 points)
- Row 1: Crab (snapping claws, scuttle, 50 points)
- Row 2: Squid (jet propulsion, squash/stretch, 40 points)
- Row 3: UFO (chasing lights, gyroscopic hover, 30 points)
- Row 4: Tank (tracking cannon, fires homing missiles, 20 points)
- Row 5: Beetle (scuttling legs, antenna waggle, fires web bombs, 10 points)
- Row 6: Invader (classic 1-bit style, marching feet, fires blaster bolts, 0 points bonus row)

**Missile System**: Three separate arrays managed in `missiles.js`:
- `missiles` - Player projectiles (can intercept alien missiles)
- `alienMissiles` - Standard red missiles, tank homing missiles, beetle web bombs, invader blaster bolts
- `ufoMissiles` - Special bonus UFO missiles with shrapnel

**Animation**: Time-based with per-entity `animationOffset` for variety. Aliens animate even after game over via `animateAlien()`.

**Camera**: Dynamic third-person following player with mouse-controlled zoom (Y-axis depth).

**Level Progression System**: Managed in `levels.js`:
- Infinite levels with formula-based scaling difficulty
- Speed multiplier, fire rate, and alien count increase per level
- Difficulty tiers: RECRUIT, SOLDIER, VETERAN, ELITE, COMMANDER, LEGENDARY, IMPOSSIBLE
- Level completion bonuses and perfect round rewards (no damage)
- Hyperspace warp transition effects between levels

**Boss Battles**: Managed in `boss.js`:
- Every 5 levels, a boss appears instead of regular alien waves
- 5 boss types that cycle: Mothership (L5), Hive Queen (L10), Dreadnought (L15), Phantom (L20), Titan (L25)
- Multi-phase health system with boss health bar UI
- Bosses scale up each time they reappear (enhanced versions)
- Full barrier repair before each boss fight
- Special audio cues (warning alarm, phase transitions)

### State Reset Pattern

On game restart, each module exposes a `reset*()` function called from `resetGame()` in game.js:
- `resetAliens()`, `resetMissiles()`, `resetParticles()`, `resetPowerUps()`, `resetBonusUFO()`, `resetBarriers()`, `resetBoss()`, `resetLevel()`

### THREE.js Usage
- Uses import maps to load THREE.js v0.158.0 from CDN (dev) or bundled (production)
- Post-processing: EffectComposer with UnrealBloomPass for retro glow
- Materials: MeshPhongMaterial with emissive properties for glow effects
- Geometries: BoxGeometry for blocky aesthetic, CylinderGeometry/ConeGeometry for missiles

### Build System (Vite)
- `vite.config.js` - Build configuration with relative paths for web deployment
- `package.json` - Scripts and dependencies (THREE.js, Vite)
- Version in `package.json` auto-increments on `npm run package`
- `__APP_VERSION__` injected at build time, displayed in bottom-right corner
- Production build bundles THREE.js locally (no CDN dependency)
