# VOIDWORM — status

Read this FIRST in any session (a Telegram reply is a fresh session with no
memory of the cron runs). Update it after every grade and before releasing
the lock. Keep it under ~60 lines: newest facts on top, prune stale detail.

## Now (updated 2026-08-14 17:50)

- HEAD 2fa85f0. Tree clean. Cron c94c41ea9af6 PAUSED. Target 8.0 confirmed.
- **Graded five times on the identical build: 8, 6, 7, 7, 7 — mean 7.0.**
  Contrast moved 7 → 8 and held. Detail bounces 5–7. NOT a confirmed 8.0.
- The 8.0 and the 6.0 came from the *same unchanged code*, two captures
  apart. That is the ±2 noise, demonstrated. Do not read a single grade as
  progress or regression — only a mean over 3+ grades means anything here.
- Capture exits 0, no JS errors, 23–24 fps (unchanged by any of this work).

## IGNORE the grader's current one_fix

It now says: *"smooth the body geometry into rounded, faceted crystals."*
That is the icosahedron-blob direction the humans looked at and **rejected**
in favour of sharp octahedron facets (fff19f3). Do not implement it. The
grader has preferred blobs before and was overruled by eye; it is wrong
about this specific axis and will keep asking.

## Last change (2fa85f0) — what and why

Two problems found by looking at the frames, not by the rubric:

1. **Crown was a featureless white blob.** Teeth emissive was near-white
   `VOIDWORM_HOT` at 2.5 base / 4.5 peak, which clipped under bloom, so the
   "teeth flare open and snap shut" the bestiary promises was invisible.
   Now `VOIDWORM_BRIGHT` at 1.0 base, `0.6 + windup * 1.7`. Eyes 2.0 → 1.1,
   core 1.5 → 1.1. **The teeth now read as teeth** in the windup frames.
2. **Segments read as flat paper, not crystal.** `MeshPhongMaterial`
   defaults `specular` to 0x111111, so `shininess: 120` lit nothing. Added
   `specular: 0xbb88ff` and the octahedron faces now catch light. Accent
   plates were a fixed 0.28 wide on 0.07-radius tail segments — 4x their
   diameter, hanging off as fins — now scaled per segment.

## Tried already — do not redo

- Dorsal spines, accent plates, joint beads (1dbc7f8) — detail 4/5 → 6. KEPT.
- Octahedron facets over icosahedron blobs (fff19f3) — human-chosen. KEEP.
- Short captures (~2.1s) — false "animation is missing". Use FRAMES=11 GAP_MS=800.
- 1dbc7f8 shipped a TDZ crash (`windup` read before its `const`) that built
  clean and threw every frame; fixed in 5c8c593. Capture now exits 4 on any
  thrown JS error. A *frozen* animation reads as HIGH fps — 57 was the
  crashed build, not a fast one.

## Next

1. Detail is the remaining weak axis (5–7). Add structure that survives at
   gameplay distance — do NOT round the geometry off to get it.
2. Recapture, then grade **3+ times** and compare means. One grade is noise.
3. Anything the human sends by Telegram outranks everything above.

## Update template (replace sections above, keep headings)

- Now: current best score, latest grade trail, HEAD sha, lock/cron state.
- Tried already: append one line per change with the commit sha and verdict.
- Next: the single most promising fix, plus anything the human asked for.
