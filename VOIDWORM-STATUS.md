# VOIDWORM — status

Read this FIRST in any session (a Telegram reply is a fresh session with no
memory of the cron runs). Update it after every grade and before releasing
the lock. Keep it under ~60 lines: newest facts on top, prune stale detail.

## Now (updated 2026-08-14 17:30)

- Target: overall 8.0, confirmed twice (`grade-invader.py VOIDWORM --confirm`
  exit 0). **Current: 7.0** — silhouette 8, contrast 7, animation 7,
  detail 6, cohesion 7.
- HEAD: 5c8c593. Working tree clean. Cron c94c41ea9af6 PAUSED.
- **Detail is finally moving**: it sat at 4–5 for every grade on 2026-08-14
  until the spine/plate/bead pass (1dbc7f8) lifted it to 6. That direction
  is working — keep going, do not abandon it.
- Grader's `one_fix`: the purple segments read as *uniform faceted spheres*,
  not crystals. Give them irregular, sharp, non-uniform geometry so they
  reward a close look. That is the single highest-value change right now.

## Tried already — do not redo

- Dorsal spines, accent plates, joint beads (1dbc7f8) — detail 4/5 → 6. KEPT.
- Octahedron facets over icosahedron blobs (fff19f3) — human-chosen. The
  grader preferred the blobs; the humans did not. **Never revert this.**
- Crystal spheres, core glow, brighter ramp, sinuous wave (a22c0c3).
- Short captures (~2.1s) — produce a false "animation is missing" verdict.
  VOIDWORM's period is 7.0s: always `FRAMES=11 GAP_MS=800`.

## Burned once — do not repeat

- 1dbc7f8 was committed with **no grade** and a **runtime crash**: `windup`
  was read at lines 4848/4850/4863 but declared at 4871, a temporal dead
  zone. `npm run build` passed; the browser threw `ReferenceError` on every
  frame (148 in a 3-frame capture). Fixed in 5c8c593.
- The cause: that run wrote its own `capture-voidworm.mjs` instead of using
  `capture-invader.mjs`, so nothing verified the page and nothing was logged.
  Both ad-hoc scripts are deleted. Use the sanctioned toolchain only.
- `capture-invader.mjs` now exits **4** with a banner if the page throws.
  Exit 4 = your frames are not evidence. Fix, recapture, then grade.

## Next

1. Irregular crystalline geometry on the body segments (the `one_fix`).
2. Recapture `FRAMES=11 GAP_MS=800`, confirm capture exits 0, then grade.
3. The grader is ±2 noisy on identical builds — never revert on one low
   score. Look at the frames first; believe a pass only after `--confirm`.
4. Anything the human sends by Telegram outranks the grader's `one_fix`.

## Update template (replace sections above, keep headings)

- Now: current best score, latest grade trail, HEAD sha, lock/cron state.
- Tried already: append one line per change with the commit sha and verdict.
- Next: the single most promising fix, plus anything the human asked for.
