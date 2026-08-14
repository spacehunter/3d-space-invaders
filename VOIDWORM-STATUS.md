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

## Looked at with human eyes (2026-08-14 17:45) — outranks the grader

Frames 1 and 5 of a clean 11-frame capture were viewed directly. The chain
reads well: a serpentine column with a bright crown, clearly animating
(it straightens and re-coils across the cycle). Two real problems the
grader did not weight properly:

1. **The crown blows out to a featureless white blob.** For most of the
   cycle you cannot see teeth at all — just glare. The bestiary promises
   "crown teeth flare open and snap shut" and that reads only in a couple
   of frames. Teeth emissive runs `1.5 + windup * 3.0` (up to 4.5); that is
   too hot against the bloom. Bring it down until the teeth are *shapes*,
   not a lamp. This is the highest-value fix, ahead of the grader's.
2. **The segments read as thin flat shards, not crystals with volume.**
   The grader's `one_fix` says "add irregular sharp geometry" — they are
   already angular. What is missing is *volume and light response*: they
   look like flat paper triangles. Give them thickness and a lit facet
   that catches the crown glow, rather than more jaggedness.

Performance is fine: 23 fps in the bestiary preview both at HEAD and at
fff19f3 (before the detail pass), so the spines/beads cost nothing
measurable. `capture-invader.mjs` now prints and logs fps — an earlier
reading of 57 was the *crashed* build skipping all animation work, not a
faster one. Do not chase that number.

## Next

1. Tame the crown blowout so the teeth read as teeth (human-eye fix #1).
2. Give the segments volume/lit facets rather than more jaggedness (#2).
3. Recapture `FRAMES=11 GAP_MS=800`, confirm capture exits 0, then grade.
4. The grader is ±2 noisy on identical builds — never revert on one low
   score. Look at the frames first; believe a pass only after `--confirm`.
5. Anything the human sends by Telegram outranks everything above.

## Update template (replace sections above, keep headings)

- Now: current best score, latest grade trail, HEAD sha, lock/cron state.
- Tried already: append one line per change with the commit sha and verdict.
- Next: the single most promising fix, plus anything the human asked for.
