# Verification

Both halves are mandatory. The automated checks catch nothing that matters
most here — every high-frequency failure in this codebase is silent and only
visible on screen.

## A. Automated

```bash
cd /Users/moog/Documents/3d-space-invaders
npm run build          # must exit 0
git diff --check       # whitespace errors; must print nothing
```

Grep-based wiring audit. **Substitute your real values before running these** —
`N`, `<array>` and `<Name>` are placeholders, not text to type. With
`N = 9`, `<array> = prismLances`, `<Proj> = PrismLance`, the first command is
`grep -n "case 9:" js/aliens.js`.

```bash
# The type is reachable: modulus, switch case, animation case
grep -n "const alienType = row %" js/aliens.js   # modulus must equal COUNT
grep -n "case N:" js/aliens.js            # expect 2 hits: createAlien + animateAlien
grep -n "ALIEN_ROWS" js/constants.js      # must equal COUNT
grep -n "maxRows" js/levels.js            # must equal COUNT, not COUNT - 1

# The weapon is fully wired: expect >= 6 hits
grep -c "<array>" js/missiles.js
grep -n "update<Proj>s" js/game.js        # expect 2 hits: import + call

# The bestiary entry exists
grep -n "row: N" js/bestiary.js
```

If `grep -c "<array>"` in `js/missiles.js` is below 6, one of declaration /
factory push / `alienFire` branch / update loop / `resetMissiles` remove /
reassign is missing. If the updater has only one hit in `game.js`, you imported
it but never called it — the projectile will hang motionless.

Optional syntax-only check without a build:

```bash
node --input-type=module -e "import('./js/aliens.js').catch(e => { console.error(e.message); process.exit(1); })" 2>&1 | head -5
```

This may fail on the `three` bare specifier depending on setup; `npm run build`
is the authoritative check.

## B. Manual — the Bestiary is the primary visual QA path

```bash
npm run dev -- --host 0.0.0.0 --strictPort
```

Open `http://127.0.0.1:5173/` on this Mac. If access fails, confirm the
listener before touching application code:

```bash
curl -I http://127.0.0.1:5173/                  # expect HTTP/1.1 200 OK
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

Do not use the `172.23.7.133` address Vite sometimes prints (tunnel/VPN
interface), and do not use `https://`.

### If the browser shows your old code

Vite hot-reloads on save, so an edit should appear within a second. If the
browser keeps showing the previous version, check whether the server is actually
serving your edit before you change any code:

```bash
grep -c "get<Name>Parts" js/aliens.js                                  # on disk
curl -s http://127.0.0.1:5173/js/aliens.js | grep -c "get<Name>Parts"  # served
```

If the on-disk count is higher than the served count, the watcher has lost the
file and the browser is showing you stale code. Restart the dev server and
re-check before drawing any conclusion from the screen.

This is not rare and it is not tied to one editing tool. It was first seen after
`sed -i` / `perl -i` edits, which replace the file by rename and leave the
watcher tracking a dead inode — but it has since been reproduced twice using
only ordinary in-place edits. There is no error and no entry in the Vite log
either way.

Run this check **whenever the screen disagrees with what you believe you wrote**,
and especially before deciding a model does not render, does not animate, or
does not spawn. Each of those looks exactly like a stale bundle.

### After reverting a temporary test override

If you forced a single-type formation or shrank the grid to test your new type,
re-run the served-vs-disk check **after** you revert, and restart the dev server
before you hand the game back. A `grep` of the working tree is not enough: the
revert can be correct on disk while the server still serves the override, and
what the user then opens is a game made entirely of your new invader in a
stunted formation. This has actually happened — the disk read `row % 11` and
`alienRows: 5` while the browser was still running `alienType = 10` with a 2x4
grid. Reverting is the moment this failure is most expensive, because you are
about to report the work as finished.

### B1 — Bestiary (model + animation)

Landing page → **Bestiary** button, or press `B`. Page with **←** / **→** to
your entry.

- [ ] The entry appears with the right name, tagline, points and weapon text.
- [ ] The model renders — not an empty frame, not flat white (flat white means
      a material is missing `vertexColors: true`).
- [ ] Colour tiers are distinguishable; the sculpt has not bloomed into one
      mass. Compare against the Invader (row 6), the tightest ramp in the roster.
- [ ] Every animated part actually moves. If nothing moves, `userData` was
      replaced rather than merged.
- [ ] The signature event reads as a crisp burst, not a permanent glow.
- [ ] Watch one full cycle plus ~30 seconds: the model does not drift, grow,
      shrink or sink. Any of those means motion is accumulating into a
      transform instead of being written absolutely each frame.

### B2 — Gameplay

Landing page → **New Game**.

- [ ] The new row spawns in the formation (it is the back-most row; zoom out by
      moving the mouse). If it never appears, the `row % COUNT` modulus or
      `CAPS.maxRows` was not bumped.
- [ ] Instances animate out of phase with each other. Lockstep means a shared
      material or a missing `animationOffset` in the time expression.
- [ ] Neighbouring columns do not visually overlap at the animation's peak —
      the half-width budget holds under motion, not just at rest.
- [ ] The new projectile fires and travels toward the player (it will hang
      motionless if `game.js` is missing the update call).
- [ ] The projectile damages a barrier on contact.
- [ ] The projectile costs a life on contact with the ship.
- [ ] Shooting one of the new aliens awards the points you documented
      (0 by default for any row ≥ 6 — see the scoring row in the checklist).
- [ ] Let the wave thin out until a kamikaze swoop triggers: the new type
      dives cleanly with no vertical stutter (unguarded `position.y`) and
      returns to normal size afterwards (a written `alien.scale`).

### B3 — Restart

- [ ] Fire several of the new projectiles, then die out and restart. No
      projectile from the previous game is left frozen on screen — that means
      `resetMissiles` is missing the `forEach(... scene.remove ...)` or the
      array reassignment.

## C. Report honestly

State which of B1/B2/B3 you actually ran and what you observed. If you could
not open a browser, say so plainly and list the manual checks as not performed.
Do not report the work as verified on the strength of `npm run build` alone —
it passes for every silent failure listed in `animation-rules.md`.

Do not commit unless the user asked you to.
