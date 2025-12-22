# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D Space Invaders is a browser-based game built with THREE.js featuring a third-person camera, blocky/voxel aesthetic, and procedural audio. Uses Vite for production builds with minification for itch.io deployment.

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server with hot reload (http://localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run package    # Build + bump version + create zip for itch.io
```

## Running the Game

**Development**: `npm run dev` - opens with hot reload at localhost:5173

**Direct**: Open `index.html` in browser (uses CDN for THREE.js, no build needed)

## Architecture

### Entry Point & Initialization
- `js/main.js` - Creates THREE.js scene, camera, renderer, post-processing (bloom effect), and initializes all game systems
- `index.html` - Contains UI elements, import map for THREE.js CDN, and glow intensity slider

### Core Game Loop (`js/game.js`)
- `initGame()` - Initializes game state (score, lives, barriers)
- `update()` - Main loop called via requestAnimationFrame, orchestrates all system updates
- `handleFire()` - Processes player firing, handles game restart on click after game over
- Game state: `score`, `lives`, `gameActive`

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| `player.js` | Player spaceship creation and movement |
| `aliens.js` | 5 alien types (Octopus, Crab, Squid, UFO, Tank) with unique animations and Kamikaze Swoop behavior |
| `missiles.js` | Player missiles, alien missiles (standard + tank homing), UFO missiles, collision detection, interception system |
| `particles.js` | Explosion and trail particle systems |
| `audio.js` | Procedural Web Audio API sound synthesis (no audio files) |
| `input.js` | Mouse position tracking and click handling |
| `starfield.js` | Animated background stars |
| `highscores.js` | 3D high score entry UI and localStorage persistence |
| `barriers.js` | Destructible voxel barriers with radial damage |
| `powerups.js` | Power-up drops (Rapid Fire, Spread Shot, Barrier Repair) |
| `bonus-ufo.js` | Periodic bonus UFO that flies across screen |
| `constants.js` | Game constants (PLAYER_SPEED, MISSILE_SPEED, ALIEN_ROWS/COLS, ALIEN_SPACING) |

### Key Patterns

**Alien Types by Row**: Each row (0-4) has distinct geometry, animation, and behavior:
- Row 0: Octopus (ripple tentacles, breathing)
- Row 1: Crab (snapping claws, scuttle)
- Row 2: Squid (jet propulsion, squash/stretch)
- Row 3: UFO (chasing lights, gyroscopic hover)
- Row 4: Tank (tracking cannon, fires homing missiles)

**Missile System**: Three separate arrays managed in `missiles.js`:
- `missiles` - Player projectiles (can intercept alien missiles)
- `alienMissiles` - Standard red missiles + tank homing missiles
- `ufoMissiles` - Special bonus UFO missiles with shrapnel

**Animation**: Time-based with per-entity `animationOffset` for variety. Aliens animate even after game over via `animateAlien()`.

**Camera**: Dynamic third-person following player with mouse-controlled zoom (Y-axis depth).

### State Reset Pattern

On game restart, each module exposes a `reset*()` function called from `resetGame()` in game.js:
- `resetAliens()`, `resetMissiles()`, `resetParticles()`, `resetPowerUps()`, `resetBonusUFO()`, `resetBarriers()`

### THREE.js Usage
- Uses import maps to load THREE.js v0.158.0 from CDN (dev) or bundled (production)
- Post-processing: EffectComposer with UnrealBloomPass for retro glow
- Materials: MeshPhongMaterial with emissive properties for glow effects
- Geometries: BoxGeometry for blocky aesthetic, CylinderGeometry/ConeGeometry for missiles

### Build System (Vite)
- `vite.config.js` - Build configuration with relative paths for itch.io
- `package.json` - Scripts and dependencies (THREE.js, Vite)
- Version in `package.json` auto-increments on `npm run package`
- `__APP_VERSION__` injected at build time, displayed in bottom-right corner
- Production build bundles THREE.js locally (no CDN dependency)
