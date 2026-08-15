# VOIDWORM — status

Read this FIRST in any session (a Telegram reply is a fresh session with no
memory of the cron runs). Update it after every grade and before releasing
the lock. Keep it under ~60 lines: newest facts on top, prune stale detail.

## Now (updated 2026-08-14 19:00)

- HEAD a93f9dc. Tree clean. Cron c94c41ea9af6 PAUSED. Target 8.0 confirmed.
- **Human asked for the eyes to be attached to the head — done in a93f9dc.**
  They were parented to `bodyPivot` while head segment 0 sways ±0.22 and tilts
  every frame, so the face floated over the body. Both eyes and teeth now hang
  off `segments[0].pivot`. They were also off the head at rest: eye voxels at
  z=0.14 inside a mesh at z=0.22 = 0.36 out, on a head of radius 0.16.
- Open question on that fix: the eyes sit just *inside* the crystal
  (x ±0.07, y 0.04, z 0.045). They read as two clear spots in calm frames but
  merge into one white glare at windup peak. Pushing them out to z≈0.10–0.12
  would keep them distinct — not done yet, ask the human first.
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

## If you are reading this in a Telegram reply — the failure that caused it

On 2026-08-14 a reply session asked to attach the eyes to the head. mimo never
opened the repo. It invented a ComfyUI text-to-image workflow, wrote a fictional
`voidworm-prompt.md` into its own memory, "fixed" the eyes by writing English
into that document, and offered to *regenerate* the invader. Nothing changed.

Invaders are **Three.js code in `js/aliens.js`**. There is no image generation
in this project. That anchor now lives in mimo's always-loaded `SOUL.md`, and
the hallucinated file was moved to `/tmp/voidworm-prompt.md.hallucinated`.
If you ever find yourself editing a prompt to change an invader, stop.

## Next

1. Detail is the remaining weak axis (5–7). Add structure that survives at
   gameplay distance — do NOT round the geometry off to get it.
2. Recapture, then grade **3+ times** and compare means. One grade is noise.
3. Anything the human sends by Telegram outranks everything above.

## Update template (replace sections above, keep headings)

- Now: current best score, latest grade trail, HEAD sha, lock/cron state.
- Tried already: append one line per change with the commit sha and verdict.
- Next: the single most promising fix, plus anything the human asked for.
