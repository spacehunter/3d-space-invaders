# Wiring checklist

`N` = new type index. `COUNT` = N + 1 = number of types after your change.
`<Name>` = PascalCase name (e.g. `Hornet`). `<array>` = plural camelCase
projectile array (e.g. `hornetSpikes`).

Every anchor is a literal string to search for. Line numbers are deliberately
omitted — they rot. Anchors were also chosen to avoid embedding the current
type count, so they survive another type being added alongside yours. Tick each
row as you complete it.

## Model + spawn (Step 3)

| # | File | Search anchor | Change |
|---|------|--------------|--------|
| 1 | `js/constants.js` | `export const ALIEN_ROWS` | Increment by 1 (`ALIEN_ROWS` equals `COUNT`). |
| 2 | `js/levels.js` | `maxRows:` (inside `const CAPS`) | Set it **equal to** `ALIEN_ROWS` / `COUNT`, not one below. `createAliens()` builds `rows` grid rows and picks `row % COUNT`, so a cap of `COUNT - 1` means the highest type index never spawns. This exact off-by-one shipped the Wasp (type 8) under `maxRows: 8`, leaving it fully implemented and unreachable in real waves. |
| 3 | `js/aliens.js` | `const alienType = row %` | Bump the modulus to `COUNT`, and fix the comment above it (`// Cycle through COUNT alien types based on row`). **This is the line that makes the type spawn at all.** |
| 4 | `js/aliens.js` | `function createAlien(row)` | In its `switch (row)`, after the last case, add `case N: // <Name> style - <one-line description>` calling `create<Name>Alien(group);` then `break;`. |
| 5 | `js/aliens.js` | `@param {number} type - alien type 0-` | Widen the JSDoc range on `createAlienPreview` to `0-N`. |
| 6 | `js/bestiary.js` | `const BESTIARY_ENTRIES = [` | Append an entry object at the end of the array. Copy the last existing entry and edit it. Fields: `name` (UPPERCASE), `row: N`, `points`, `color` (CSS hex string, e.g. `'#8fd8ff'`), `tagline`, `description`, `weapon`. **The tagline is 1-indexed** — for `row: 9` it reads `tagline: 'ROW 10 - OBSIDIAN'`, i.e. the number is `COUNT`, not `N`. |

## Weapon (Step 5)

| # | File | Search anchor | Change |
|---|------|--------------|--------|
| 7 | `js/missiles.js` | `let lastAlienFireTime = 0;` | Add `let <array> = [];` immediately **above** it, joining the run of projectile-array declarations. |
| 8 | `js/missiles.js` | `export function alienFire(scene)` | Add `function create<Name>Projectile(position)` above it, after the last existing factory (see `weapon-projectile.md`). |
| 9 | `js/missiles.js` | `// Regular missiles for other aliens` | Add another `} else if (randomAlien.userData.row === N) {` branch **before** the `} else {` that this comment sits inside. Push to `<array>`, `scene.add(missile)`, then `continue;`. Omitting `continue` double-adds the projectile to `alienMissiles`. |
| 10 | `js/missiles.js` | `// Check if aliens should fire` | Add `export function update<Name>Projectiles(player, scene, gameActive, livesCallback, gameOverCallback)` above it, after the last existing updater. Same five-parameter signature as every other projectile updater. |
| 11 | `js/missiles.js` | `export function resetMissiles(scene)` | Two edits inside it: add `<array>.forEach(p => scene.remove(p));` with the other `forEach` removals, **and** `<array> = [];` with the other reassignments. Both are required. |
| 12 | `js/missiles.js` | `export function getMissiles()` | Add `<array>` to the returned object. Low-stakes (the export is currently unused), but `venomDarts` was omitted here and it is an inconsistency worth not repeating. |
| 13 | `js/game.js` | `from './missiles.js';` | Add `update<Name>Projectiles` to the import list. |
| 14 | `js/game.js` | `updateWebBombs(player, scene,` | Inside `export function update()`, this starts a run of consecutive projectile update calls. Add `update<Name>Projectiles(player, scene, gameActive, decreaseLives, gameOver);` as the **last** line of that run (just before `updateCamera(...)`). Missing this means the projectile spawns and then hangs motionless in space. |

## Scoring + docs (Step 6)

| # | File | Search anchor | Change |
|---|------|--------------|--------|
| 15 | `js/missiles.js` | `(6 - alien.userData.row) * 10` | The formula awards **0 points for every row ≥ 6**, so a new type scores nothing by default. Either accept that and update the comment above it (`// Update score (COUNT rows: row 0 = 60pts down to row N = 0pts)`), or change the formula. If you change it, keep row 0 the highest-value row and re-check the `points` value in your Bestiary entry. |
| 16 | `README.md` | `rows of aliens, each with distinctive` | Update the count in that sentence, and add a numbered entry to the `### Aliens` list matching the existing format. |
| 17 | `README.md` | `### Alien Counter-Fire System` | Add a bullet for the new weapon alongside the existing `**Blaster Bolts**` / `**Web Bombs**` entries. |
| 18 | `README.md` | `alien types one at a time` | Update the count in the Bestiary section. |
| 19 | `README.md` | `As of 20` (the status line near the top) | Update the roster count and the summary sentence. |
| 20 | `CLAUDE.md` | `alien types (Octopus, Crab,` | Add the name to the `aliens.js` row of the module table. |
| 21 | `CLAUDE.md` | `**Alien Types by Row**` | Add a `- Row N: <Name> (...)` bullet describing model, animation and points. |
| 22 | `CLAUDE.md` | `**Missile System**` | Add your array to the bullet list under it. |
| 23 | `CLAUDE.md` | `getBonusUfoParts()` | Add `get<Name>Parts()` to that registry enumeration under **Voxel Sculpt System**. |
| 24 | `CLAUDE.md` | `rows are now rebuilt` | Update the count in that sentence. |
| 25 | `PROJECT_STATUS.md` | `alien rows have distinct` | Update the count and add a line for the new type. |
| 26 | `index.html` | `ALIEN TYPES` | Update the count in the landing-page feature strip (`<span class="feature">N ALIEN TYPES</span>`). This is the one per-type string outside `js/` and the markdown docs; it sat stale at `5` through four type additions. |

## Not a wiring point

Verified by reading — these do **not** need changes for a new type:

- `js/main.js` — no per-type knowledge.
- `js/landing.js` — no per-type knowledge. Note the landing page's visible
  "N ALIEN TYPES" text is **not** here — it is static markup in `index.html`
  (row 26 above).
- `js/boss.js` — bosses are a separate system.
- `js/particles.js`, `js/barriers.js` — generic; called with your positions.
- `js/audio.js` — new projectiles reuse `playMissileFire` unless you add a cue.
- `alien-preview.html` — a standalone Scorpion-only inspection page
  (`createAlienPreview(7)` is hardcoded and the surrounding code reaches into
  Scorpion-specific `userData` keys). It is not a general preview harness; use
  the Bestiary instead.
