# VOIDWORM — status

Read this FIRST in any session (a Telegram reply is a fresh session with no
memory of the cron runs). Update it after every grade and before releasing
the lock. Keep it under ~60 lines: newest facts on top, prune stale detail.

## Now (updated 2026-08-14)

- Target: overall 8.0, confirmed twice (`grade-invader.py VOIDWORM --confirm`
  exit 0). Best so far: 7 — single grades only, never confirmed.
- Grade trail today (oldest → newest): 5, 5, 6, 7, 6, 7, 7, 6.
- Weakest dimension: **detail** (4–5 in every grade today). Animation holds
  at ~7 when the capture spans the full 7.0s period (FRAMES=11 GAP_MS=800).
- HEAD: fff19f3 "octahedron facets over icosahedron blobs" — chosen by human
  eye; the grader preferred the blobs, the humans did not. **Do not revert.**
- Working tree clean. The 2026-08-14 16:42 cron run reported failure (did
  not reach 8.0 within budget) and left no uncommitted edits behind.
- Cron job c94c41ea9af6 is PAUSED while the human gives direction directly.

## Tried already — do not redo

- Crystal spheres, core glow, brighter colour ramp, sinuous wave (a22c0c3).
- Octahedron facets replacing icosahedron blobs (fff19f3) — kept, human-approved.
- Icosahedron blobs — grader scored them higher, humans rejected them.
- Short captures (~2.1s) — produce a false "animation is missing" critique;
  always cover the full 7.0s period.

## Next

- Raise **detail** without hurting silhouette: small secondary structures
  (spines, segment plates, joint accents) that read at gameplay distance,
  then recapture and regrade.
- The grader is ±2 noisy on identical builds. Never revert on one low score —
  look at the captures first, and only believe a pass or a regression after
  two consecutive grades agree.
- Any direction the human sends by Telegram outranks the grader's `one_fix`.

## Update template (replace sections above, keep headings)

- Now: current best score, latest grade trail, HEAD sha, lock/cron state.
- Tried already: append one line per change with the commit sha and verdict.
- Next: the single most promising fix, plus anything the human asked for.
