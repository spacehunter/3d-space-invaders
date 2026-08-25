---
name: new-invader
description: Use when adding a new alien/invader type to the 3D Space Invaders game — covers voxel modeling, animation, weapon wiring, bestiary, level caps, and verification.
---

# Add a new invader

Adds one new alien type end-to-end, in 8 steps.

Rules for using this file:

1. Do the steps in order. Do not read ahead.
2. Each step ends with a **Done when** line. Check it before starting the next
   step. If it fails, fix it now — do not carry a broken step forward.
3. Every failure in this codebase is **silent**. `npm run build` passes when the
   model does not move, when the type never spawns, and when the projectile
   hangs frozen in space. Passing the build proves nothing.
4. Never guess a number or a name. Read it from a file first.

---

## Step 0 — Fill in your names

Everything later is copy-paste **once you have these values**. Run this:

```bash
cd /Users/moog/Documents/3d-space-invaders
grep -n "const alienType = row %" js/aliens.js
```

It prints one line, like `const alienType = row % 10;`.

**That number is `N`, your new type's index.** Add 1 to get `COUNT`.

Now copy this table into your reply and fill in the last column. The middle
column shows the real values used when the Sentinel was added (at that time the
grep printed `row % 9`):

| Name | Meaning | Sentinel example | Yours |
|------|---------|------------------|-------|
| `N` | new type index = the number from the grep above | `9` | |
| `COUNT` | `N + 1` | `10` | |
| `<Name>` | type name, PascalCase | `Sentinel` | |
| `<name>` | same, camelCase | `sentinel` | |
| `<NAME>` | same, UPPER_SNAKE — prefix for colour/box constants | `SENTINEL` | |
| `<Proj>` | projectile name, PascalCase | `PrismLance` | |
| `<array>` | projectile array, plural camelCase | `prismLances` | |

Whenever a later file shows `<Name>` or `N`, substitute your value from this
table. Watch the capitalisation — `<NAME>_BODY`, `get<Name>Parts`, `<name>Parts`
and `<array>` are four different strings.

**Done when:** the filled table is in your reply and `N` came from the grep, not
from this file.

---

## Step 1 — Design gate (before any code)

Current roster:

| # | Name | Silhouette | Weapon flight |
|---|------|-----------|--------|
| 0 | Octopus | domed mantle + 6 curling tentacles | straight |
| 1 | Crab | wide tiered carapace + pincers | straight |
| 2 | Squid | tall tapered mantle + arm crown | straight |
| 3 | UFO | flat saucer discs | straight |
| 4 | Tank | boxy hull + treads + turret | homing |
| 5 | Beetle | rounded shell + elytra | slow bomb + lingering zone |
| 6 | Invader | flat 1-bit plates (hard-edged) | fast straight |
| 7 | Scorpion | low body + raised segmented tail | mortar arc |
| 8 | Wasp | thorax/abdomen + 4 wings | fast straight |
| 9 | Sentinel | limbless floating shard cluster + gimbal rings | diverging 3-shot fan |

This table may be out of date. Confirm it against `const BESTIARY_ENTRIES` in
`js/bestiary.js`, which is the live list.

Write a 4–6 line design note in your reply covering:

- name and index `N`
- silhouette — must differ from every row above in **outline**, not just colour
- colour ramp: 4–6 hex steps, dark → hot
- the one signature animation event
- the weapon's flight behaviour — must differ from every entry in the last
  column above

**Done when:** the note is in your reply, and no roster row has the same
silhouette or the same weapon flight as yours.

---

## Step 2 — Build the model

Read `references/voxel-modeling.md` and follow its skeleton. All code goes in
`js/aliens.js`, appended after the last model section (search for the last
`// ---` banner comment).

You add three things, in this order:

1. box-list constants (`<NAME>_BODY`, etc.)
2. `let <name>Parts = null;` and `function get<Name>Parts()`
3. `function create<Name>Alien(group)`

**Done when:** `npm run build` exits 0, **and** the half-width script at the
bottom of `references/voxel-modeling.md` prints a number under 0.95. If it
prints `0.000`, your banner comment did not match — fix the search string, do
not treat it as a pass.

---

## Step 3 — Wire the type so it spawns

Open `references/wiring-checklist.md`. Do **only** the rows in its first table
("Model + spawn"). Work top to bottom and tick each row.

**Done when:** `npm run build` exits 0, and in the browser the Bestiary lists
your entry and draws the model. Start the server and open the Bestiary:

```bash
npm run dev -- --host 0.0.0.0 --strictPort
```

Open `http://127.0.0.1:5173/`, then press `B` (or click **BESTIARY**), then
press `→` until you reach your entry. The counter at the bottom should read
`COUNT / COUNT`.

If you cannot open a browser, say so now and continue — but you must say so
again in Step 7 rather than implying the visual checks passed.

---

## Step 4 — Animate it

Read `references/animation-rules.md` and follow its skeleton. Add one
`case N: { ... }` branch to the `switch (row)` inside
`export function animateAlien(alien)` in `js/aliens.js`.

**Done when:** all four hold in the Bestiary:

- every part you animated visibly moves
- the signature event is a brief burst, not a steady glow
- after ~30 seconds the model has not drifted, grown, shrunk or sunk
- the six failure-mode checks at the bottom of `references/animation-rules.md`
  all pass against your own diff

---

## Step 5 — Build the weapon

Read `references/weapon-projectile.md`. Six edits in `js/missiles.js`, two in
`js/game.js`.

**Done when:** `npm run build` exits 0 and this prints 6 or more:

```bash
grep -c "<array>" js/missiles.js
```

Substitute your real array name. Below 6 means one of the six edits is missing.

---

## Step 6 — Finish the wiring and the docs

Return to `references/wiring-checklist.md` and complete every remaining row in
the second and third tables (weapon wiring, scoring, docs).

**Done when:** every row in all three tables is ticked.

---

## Step 7 — Verify

Read `references/verification.md` and run all of it — both section A
(automated) and section B (in-browser). Then report, per its section C, exactly
which checks you ran and what you saw.

**Done when:** you have reported each check as passed, failed, or not performed.
Never write "verified" on the strength of `npm run build` alone.

---

## Step 8 — Stop and report

Do not commit unless the user asked you to.

If a step's **Done when** never passed, say which step, what you saw, and what
you tried. A half-finished invader that is reported accurately is useful. One
reported as working when it is not will be found in seconds by opening the
Bestiary, so there is nothing to gain by overstating it.

---

## Hard rules (these cause silent failures)

- One geometry per part via `buildVoxelGeometry`, not many meshes.
- `Object.assign(group.userData, {...})` — **never** `group.userData = {...}`.
- Set `vertexColors: true` on every material that renders a
  `buildVoxelGeometry` result, or the model renders flat white.
- Clone any material whose `emissiveIntensity`, `opacity` or `color` you animate
  per instance: `new THREE.Mesh(geom, parts.xMaterial.clone())`.
- Never write `alien.position.x` or `alien.position.z` in `animateAlien()`.
- Wrap every `alien.position.y` write in `if (!alien.userData.isSwooping)`.
- Never write `alien.scale` in `animateAlien()`. Scale a child mesh instead.
- Put a part's offset on `mesh.position`, not baked into geometry you then
  rotate or scale.
- **Do not trust the browser to be showing your latest code.** Vite's file
  watcher in this project goes stale intermittently, and when it does the server
  keeps serving the previous version of a module forever with no error and no
  log line. It has been observed after `sed -i` / `perl -i` edits (which replace
  the file by rename) *and* after ordinary in-place edits, so avoiding those
  tools is not sufficient. Before concluding anything from what you see on
  screen, confirm the server is serving your change — see "If the browser shows
  your old code" in `references/verification.md`. The fix is always to restart
  the dev server.

## Also required: check the colour at gameplay distance

The Bestiary deliberately runs reduced bloom, so a colour ramp that reads there
can still collapse in a real wave. After Step 6, look at the model in gameplay
at formation distance, not only in the Bestiary.

Two opposite mistakes both end as one featureless blob:

- **Too bright and too tight** — the Invader's original
  `0xffffff → 0xeaeaea → 0xcccccc` under emissive 1.15 made every bevel
  invisible.
- **Too dark** — the Sentinel's original near-black obsidian plates had nothing
  to read against space, so only the bright accents survived and it became a
  white sparkle.

Aim for a wide ramp whose **midpoint is clearly lighter than the background**,
with bright colour reserved for small accent parts.

## Optional extras (skip these if you are short on capacity)

- Give the type a bespoke audio cue in `js/audio.js` and call it from the
  projectile factory. Existing types reuse `playMissileFire`.
- Add a paragraph to the README "Alien Counter-Fire System" section describing
  the projectile's dodge pattern from the player's point of view.
- Write a design spec to `docs/superpowers/specs/YYYY-MM-DD-<name>-design.md`,
  matching the existing files there.
