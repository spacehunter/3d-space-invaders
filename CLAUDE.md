# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D Space Invaders is a browser-based game built with THREE.js featuring a third-person camera, blocky/voxel aesthetic, procedural audio, infinite level progression, and epic boss battles. Uses Vite for production builds with minification.

## Development

```bash
npm install        # Install dependencies
npm run dev -- --host 0.0.0.0 --strictPort  # Start dev server with hot reload on port 5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run package    # Build + bump version + create zip for distribution
```

## Running the Game

**Development**: `npm run dev -- --host 0.0.0.0 --strictPort` - opens with hot reload on port 5173.

Use `http://127.0.0.1:5173/` in a browser on this Mac. For another device on the same Wi-Fi, use the Mac's current LAN address, for example `http://192.168.0.61:5173/`. The `172.23.7.133` address sometimes printed by Vite belongs to a tunnel/VPN interface and is not a reliable browser URL. Vite serves local development over `http`, not `https`.

If access fails, confirm the actual listener and response before changing application code:

```bash
curl -I http://127.0.0.1:5173/
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

Expect `HTTP/1.1 200 OK` and a Vite process listening on `*:5173`. `--strictPort` makes a port conflict fail visibly instead of silently moving the server to another port.

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
| `aliens.js` | 13 alien types (Octopus, Crab, Squid, UFO, Tank, Beetle, Invader, Scorpion, Wasp, Sentinel, Warden, Gyre, Mantis) with unique animations and Kamikaze Swoop behavior |
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
| `bestiary.js` | Bestiary gallery - browse the 11 alien models one at a time, fully animated |
| `voxel.js` | Shared voxel toolkit — `buildVoxelGeometry`, `mirrorBoxes`, `saucerTier`, `buildLimbSegmentGeometry`, `buildLimbChain` — used by both `aliens.js` and `bonus-ufo.js` |
| `constants.js` | Game constants (PLAYER_SPEED, MISSILE_SPEED, ALIEN_ROWS/COLS, ALIEN_SPACING) |

### Key Patterns

**Alien Types by Row**: Each row (0-10) has distinct geometry, animation, and behavior:
- Row 0: Octopus (sculpted voxel mantle, 6 jointed tentacles that curl, blinking eyes, pulsing vents, 60 points)
- Row 1: Crab (tiered carapace, jointed pincers, tripod walking gait, swivelling eye stalks, 50 points)
- Row 2: Squid (deep-green mantle with a dorsal keel and amber vein glow, diamond fin wings that ripple root-to-tip, eight-arm crown wave with a sucker-glow ripple, coil-then-jet siphon cycle, feeding tentacles ending in amber lure clubs, 40 points)
- Row 3: UFO (layered saucer hull, counter-rotating light collar, canopy pilot, scan beam, 30 points)
- Row 4: Tank (sloped armour, rolling tread belts, rotating turret, recoiling gun, fires homing missiles, 20 points)
- Row 5: Beetle (splitting elytra, buzzing flight wings, creeping gait, glowing web-bomb sac, fires web bombs, 10 points)
- Row 6: Invader (layered 1-bit plates, recessed optics, two-frame sprite march, recoiling blaster cannon, fires blaster bolts, 0 points)
- Row 7: Scorpion (compact burnt-orange carapace, raised five-segment tail with glowing stinger, chunky pedipalp pincers, 8-legged tripod gait, fires mortar-arcing venom darts)
- Row 8: Wasp (charcoal thorax, amber warning stripes, two pairs of smoky voxel wings, six-legged tripod shift, spectacular wingstorm and sting lunge, fires fast amber needles)
- Row 9: Sentinel (limbless levitating construct — ten obsidian armour shards around an exposed plasma core, two counter-rotating gimbal rings, a shatter-bloom disassembly that locks into a firing lens, fires diverging prism lance fans)
- Row 10: Warden (hollow standing hoop with inward teeth and a gold core on four retractable spokes, rolls then turns fully edge-on in a gimbal flip and fires through its own middle, fires expanding halo waves)
- Row 11: Gyre (a vortex rather than a body — fourteen loose nacre shell plates wound in a receding conical spiral around a gold bead, orbiting dust motes, a pearl chase light stepping inward, and "the drain": the whole funnel corkscrews down into its own core, flares and springs back on a rebound; fires corkscrewing vortex bolts)
- Row 12: Mantis (upright olive-and-bone ambush predator — angled prothorax, a head that tracks on its own neck, folded wings, four walking legs and two oversized raptorial forearms folded in front; the only model that is deliberately *still* between events, then unfolds and snaps the arms out and shut in under a second with cyan spine teeth flashing; fires ambush spurs)

**Voxel Sculpt System**: The rebuilt alien models, plus the bonus UFO, share one construction approach — read this before adding or editing a model. The shared helpers below now live in `js/voxel.js`, not `aliens.js`, so both `aliens.js` and `bonus-ufo.js` import from there.
- `buildVoxelGeometry(boxes)` merges a list of `{size, pos, rotX/rotY/rotZ, color}` boxes into a **single** geometry, baking each box's colour into vertex colours. Detail then costs vertices rather than draw calls, so an elaborate part stays one mesh. Materials rendering it must set `vertexColors: true`.
- `mirrorBoxes(boxes)` builds the opposite half of a symmetrical part. Use it instead of `scale.x = -1`, which inverts normals and breaks lighting on that half.
- `saucerTier(width, depth, height, y, color)` unions three boxes into a disc with cut corners — reads far rounder than a box (UFO hull).
- `buildLimbSegmentGeometry()` + `buildLimbChain()` build jointed limbs: each segment's origin sits at its joint and parents the next, so a bend propagates down the limb rather than swinging it rigidly. Used by crab arms/legs/eye stalks and beetle legs.
- Each rebuilt type caches its geometries and static materials in a lazily-built module-level registry (`getOctopusParts()`, `getCrabParts()`, `getSquidParts()`, `getUfoParts()`, `getTankParts()`, `getBeetleParts()`, `getInvaderParts()`, `getScorpionParts()`, `getWaspParts()`, `getSentinelParts()`, `getWardenParts()`, `getGyreParts()`, `getMantisParts()`, `getBonusUfoParts()`), shared by every instance (or, for the bonus UFO, every spawn).
- The bonus UFO is **not** in the Bestiary gallery, so unlike the alien models it can only be verified in gameplay — allow up to ~20s per spawn.
- **All thirteen rows are now rebuilt.** Row 6 (Invader) is the deliberate exception to "more detail is better": it is the 1-bit homage row, so it gains depth through layered plates and bevels while keeping a crisp, symmetrical, hard-edged silhouette. Do not organicise it.
- **Give the colour ramp room, and keep emissive low enough that it doesn't erase it.** Emissive is added flat, on top of the vertex colours rather than through them, so a bright emissive floods every tier equally. The Invader originally ran a `0xffffff → 0xeaeaea → 0xcccccc` ramp (~8% of value) under a `0x9e9e9e` emissive at 1.15, and the whole sculpt flattened into one white mass under bloom — all the bevel detail was present and invisible. Spread the ramp wide, tint it, and let the plate colours carry the form.
- **Lift the ramp's midpoint off black, too.** The opposite mistake to the Invader's: the Sentinel first ran a near-black obsidian ramp (`0x162236 → 0x27405f`) with bright ice glyphs and a white core. In the Bestiary it looked right, but at formation distance in gameplay the dark plates had nothing to read against space, so all that survived was the glyphs and core — the sculpt collapsed into a white sparkle. A model has to be checked at gameplay distance under gameplay bloom, not just in the Bestiary, which deliberately dials bloom down. The fix was to lift the plate to `0x36537a`, tint the core cyan instead of white, and cut every emissive roughly in half.
- **A new type is not in the game until the row cap admits it.** `createAliens()` builds `rows` grid rows and picks the type as `row % <type count>`, so a type only ever spawns if `CAPS.maxRows` in `levels.js` is greater than its index. `maxRows` was 8 when the Wasp (type 8) shipped, so the Wasp was fully implemented and completely unreachable in real waves for two commits. Raise the cap with the type.
- Keep a model's half-width under ~0.95 — `ALIEN_SPACING` is 2, and the missile collision radius is 1.2 from the group origin. Measure the **animated peak**, not the rest pose: a limb at full extension is what actually overlaps the neighbouring column. Row 3 (UFO) hull half-width is ~1.68 (saucerTier-based) which exceeds the collision radius — the UFO reads as a distinct saucer shape rather than an invader, but this is an outstanding cleanup item. Other rows (0, 1, 5) have peak animated limbs that may approach 0.95; keep an eye on them before adding new detail.

**Missile System**: Three separate arrays managed in `missiles.js`:
- `missiles` - Player projectiles (can intercept alien missiles)
- `alienMissiles` - Standard red missiles, tank homing missiles, beetle web bombs, invader blaster bolts
- `ufoMissiles` - Special bonus UFO missiles with shrapnel
- `venomDarts` - Scorpion mortar-arcing venom darts with two-phase flight (upward launch then gravity-driven dive)
- `waspNeedles` - Wasp amber needles with fast straight flight
- `prismLances` - Sentinel prism lances, fired as a diverging three-shot fan
- `haloWaves` - Warden expanding hollow rings; lethal only near the rim, so the centre line and the far edges are both safe
- `vortexBolts` - Gyre corkscrew bolts; the axis marches straight down the lane while the bolt winds around it on a helix that widens with age, so it sweeps a corridor instead of holding a lane
- `ambushSpurs` - Mantis stalking spurs; two-phase in *speed* rather than height — a slow drift, a coil that brakes almost to a standstill at a fixed distance from the ship, then a lunge

**Animation**: Time-based with per-entity `animationOffset` for variety. Aliens animate even after game over via `animateAlien()`.

**Animation invariants** — each of these has already caused a silent failure in this codebase, so violating them produces no error, just missing motion:
- **Merge, never replace, `userData`.** Model builders stash references to their moving parts there (`tentacles`, `cannon`, `legs`, `lights`...). `createAliens()` replacing the object once killed per-part animation for all eight alien types at once.
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
