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
| `bonus-ufo.js` | Periodic bonus UFO that flies across screen — voxel sculpt with counter-rotating hull and light collar, level canopy with pilot |
| `levels.js` | Level progression system with formula-based scaling difficulty |
| `boss.js` | 5 boss types (Mothership, Hive Queen, Dreadnought, Phantom, Titan) with multi-phase health systems |
| `transitions.js` | Level transition effects (hyperspace warp) and level announcement UI |
| `landing.js` | Landing page menu (New Game / Continue / Bestiary / Settings) |
| `bestiary.js` | Bestiary gallery - browse the 7 alien models one at a time, fully animated |
| `voxel.js` | Shared voxel toolkit — `buildVoxelGeometry`, `mirrorBoxes`, `saucerTier`, `buildLimbSegmentGeometry`, `buildLimbChain` — used by both `aliens.js` and `bonus-ufo.js` |
| `constants.js` | Game constants (PLAYER_SPEED, MISSILE_SPEED, ALIEN_ROWS/COLS, ALIEN_SPACING) |

### Key Patterns

**Alien Types by Row**: Each row (0-7) has distinct geometry, animation, and behavior:
- Row 0: Octopus (sculpted voxel mantle, 6 jointed tentacles that curl, blinking eyes, pulsing vents, 60 points)
- Row 1: Crab (tiered carapace, jointed pincers, tripod walking gait, swivelling eye stalks, 50 points)
- Row 2: Squid (tapered mantle, undulating fins, six-arm crown wave, lashing feeding tentacles, jet siphon flash, 40 points)
- Row 3: UFO (layered saucer hull, counter-rotating light collar, canopy pilot, scan beam, 30 points)
- Row 4: Tank (sloped armour, rolling tread belts, rotating turret, recoiling gun, fires homing missiles, 20 points)
- Row 5: Beetle (splitting elytra, buzzing flight wings, creeping gait, glowing web-bomb sac, fires web bombs, 10 points)
- Row 6: Invader (layered 1-bit plates, recessed optics, two-frame sprite march, recoiling blaster cannon, fires blaster bolts, 0 points)
- Row 7: Scorpion (segmented arachnid carapace, S-curved tail with glowing stinger, pedipalp pincers, 8-legged tripod gait, fires mortar-arcing venom darts)

**Voxel Sculpt System**: The rebuilt alien models, plus the bonus UFO, share one construction approach — read this before adding or editing a model. The shared helpers below now live in `js/voxel.js`, not `aliens.js`, so both `aliens.js` and `bonus-ufo.js` import from there.
- `buildVoxelGeometry(boxes)` merges a list of `{size, pos, rotX/rotY/rotZ, color}` boxes into a **single** geometry, baking each box's colour into vertex colours. Detail then costs vertices rather than draw calls, so an elaborate part stays one mesh. Materials rendering it must set `vertexColors: true`.
- `mirrorBoxes(boxes)` builds the opposite half of a symmetrical part. Use it instead of `scale.x = -1`, which inverts normals and breaks lighting on that half.
- `saucerTier(width, depth, height, y, color)` unions three boxes into a disc with cut corners — reads far rounder than a box (UFO hull).
- `buildLimbSegmentGeometry()` + `buildLimbChain()` build jointed limbs: each segment's origin sits at its joint and parents the next, so a bend propagates down the limb rather than swinging it rigidly. Used by crab arms/legs/eye stalks and beetle legs.
- Each rebuilt type caches its geometries and static materials in a lazily-built module-level registry (`getOctopusParts()`, `getCrabParts()`, `getSquidParts()`, `getUfoParts()`, `getTankParts()`, `getBeetleParts()`, `getInvaderParts()`, `getScorpionParts()`, `getBonusUfoParts()`), shared by every instance (or, for the bonus UFO, every spawn).
- The bonus UFO is **not** in the Bestiary gallery, so unlike the alien models it can only be verified in gameplay — allow up to ~20s per spawn.
- **All eight rows are now rebuilt.** Row 6 (Invader) is the deliberate exception to "more detail is better": it is the 1-bit homage row, so it gains depth through layered plates and bevels while keeping a crisp, symmetrical, hard-edged silhouette. Do not organicise it.
- **Give the colour ramp room, and keep emissive low enough that it doesn't erase it.** Emissive is added flat, on top of the vertex colours rather than through them, so a bright emissive floods every tier equally. The Invader originally ran a `0xffffff → 0xeaeaea → 0xcccccc` ramp (~8% of value) under a `0x9e9e9e` emissive at 1.15, and the whole sculpt flattened into one white mass under bloom — all the bevel detail was present and invisible. Spread the ramp wide, tint it, and let the plate colours carry the form.
- Keep a model's half-width under ~0.95 — `ALIEN_SPACING` is 2, and the missile collision radius is 1.2 from the group origin. Measure the **animated peak**, not the rest pose: a limb at full extension is what actually overlaps the neighbouring column. Row 3 (UFO) hull half-width is ~1.68 (saucerTier-based) which exceeds the collision radius — the UFO reads as a distinct saucer shape rather than an invader, but this is an outstanding cleanup item. Other rows (0, 1, 5) have peak animated limbs that may approach 0.95; keep an eye on them before adding new detail.

**Missile System**: Three separate arrays managed in `missiles.js`:
- `missiles` - Player projectiles (can intercept alien missiles)
- `alienMissiles` - Standard red missiles, tank homing missiles, beetle web bombs, invader blaster bolts
- `ufoMissiles` - Special bonus UFO missiles with shrapnel
- `venomDarts` - Scorpion mortar-arcing venom darts with two-phase flight (upward launch then gravity-driven dive)

**Animation**: Time-based with per-entity `animationOffset` for variety. Aliens animate even after game over via `animateAlien()`.

**Animation invariants** — each of these has already caused a silent failure in this codebase, so violating them produces no error, just missing motion:
- **Merge, never replace, `userData`.** Model builders stash references to their moving parts there (`tentacles`, `cannon`, `legs`, `lights`...). `createAliens()` replacing the object once killed per-part animation for *all seven* alien types at once.
- **Clone any material you animate per-instance.** A material shared across meshes holds one value: the UFO's eight ring lights shared one material, so the chase effect wrote the same intensity eight times and never chased. The same applies between aliens — each instance needs its own material to pulse on its own `animationOffset`.
- **The formation owns `position.x` / `position.z`.** Animation must never accumulate into them; a per-frame nudge walks the alien out of formation (the tank's recoil used to drift it backwards forever). Put the motion in rotation, or in a child mesh's local transform.
- **Guard `position.y` while swooping.** `updateSwoop()` owns Y during a kamikaze dive, so hover/bob animation must check `!alien.userData.isSwooping`.
- **Prefer animating a child mesh's scale over the group's.** `updateTelegraph()` captures and restores `alien.scale` for the swoop warning.
- **Drive discrete events from an explicit phase window**, not a steep power curve. `charge^12` reads as a permanent glow, not a muzzle flash; `(time % period) / period < 0.06` gives a crisp event.
- **Accumulate speed-linked motion from a frame delta**, not by multiplying a changing rate into `time` — the latter makes the whole cycle jump whenever the rate changes (tank tread scroll).
- **A mesh's origin must sit at the point you intend to rotate or scale about.** Baking a positional offset into the geometry and then transforming the mesh moves the part instead of transforming it in place. The bonus UFO's beacon had `pos: [0, 1.40, 0]` baked into its geometry, so `scale.setScalar()` scaled the offset too and threw the beacon from y=1.52 to y=2.13 on every flash, past its own collision sphere; the antenna's base sat at y=0.710 while `rotation.z` pivoted about y=0, sliding the base 0.170 units across the hull each sway. The fix in both cases is to centre the geometry on the intended pivot and carry the offset on the mesh via `mesh.position`. Note that moving a parent's origin also moves its children, so child offsets need compensating.

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

**Bestiary Gallery**: Managed in `bestiary.js`, opened from the landing page (button or `B` key):
- Owns a separate `THREE.Scene` with its own camera, lights and star backdrop. It does **not** own a renderer: `main.js` swaps `renderPass.scene`/`renderPass.camera` over to it while it is active, so the gallery inherits the game's bloom and tone mapping. Bloom strength is scaled down (`BESTIARY_BLOOM_SCALE`) while it is open, since gameplay bloom blows out bright emissive models at close range.
- Builds models via `createAlienPreview(type)` in `aliens.js` - a standalone factory that does **not** push into the shared module-level `aliens` array, so opening the gallery cannot corrupt an in-progress formation. Never use `createAliens()` for display purposes.
- Scene graph is `pivot` (turntable rotation) → `holder` (auto-fit scale/centering) → alien. The rotation must live on a parent because `animateAlien()` writes `alien.rotation` and `alien.position.y` itself.
- Models are auto-framed from a `Box3` measured on the rest pose, scaled to `TARGET_SIZE`, so new or resized models need no hand-tuning.
- While it is open, `game.js`'s `handleFire()` and the settings panel's resume-on-close both bail out via `isBestiaryActive()`.

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
