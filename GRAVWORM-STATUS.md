## Now (updated 2026-09-14 14:40) — COMPLETE REFACTOR: VOIDWORM is now GRAVWORM

Per Joe's request ("complete refactor, start from scratch, create an invader
unlike what we have"), the crystal-chain design was scrapped entirely — the
vertical chain read as a snake, not a creature, and no amount of patching
fixed the disconnected-segment flaw.

New design: a HORIZONTAL armored larva crawler. Nothing else on the grid
moves along the ground plane — every other invader bobs in place.
- js/invaders/gravworm.js (225 lines): 6 per-segment BoxGeometry shells on a
  Z-chained rig (rig yaw -90 deg), 6 two-joint pedipalp legs, mandible jaw,
  antennae, emissive core. Head cap geometry faces local +X (camera side).
- Gait: body traces a sine arc across 36% of ALIEN_SPACING (never reaches
  neighbors), spine pitch ripples with 0.55 rad phase lag per segment, legs
  pedal in a metachronal wave, whole-body lurch on the fire telegraph.
- Fire: gravity orb (createGravwormSpore) sheds 3 diverging shards after
  0.6 s. Firing branch keys on row === 13, unchanged.
- verify-invader.mjs 13/13 PASS. capture clean, no throws, fps parity with
  existing rows (23 vs 22). Vision-verified: horizontal connected chain,
  no floating parts, head toward camera.
- Old js/invaders/voidworm.js deleted; row 13 anim delegated to
  animateGravworm from aliens.js case 13.

# VOIDWORM — status

Read this FIRST in any session (a Telegram reply is a fresh session with no
memory of the cron runs). Update it after every grade and before releasing
the lock. Keep it under ~60 lines: newest facts on top, prune stale detail.

## Now (updated 2026-09-14 13:50)

- **ARMS ATTACHED — fix landed (this session, js/invaders/voidworm.js).**
  Note the live model code is `js/invaders/voidworm.js`, NOT `js/aliens.js` —
  aliens.js is now a thin dispatcher importing `js/invaders/index.js`.
  All three causes fixed: both arms mount on segment 1 (`segIdx = 1`, not
  `idx + 1`), shoulder inset to x = 0.55r / y +0.03 (inside the octahedron,
  verified analytically + by frame inspection), and the upper-arm mesh double
  offset removed (geometry already bakes y −0.11; mesh-level −0.11 left dead
  air). Arm prisms slimmed 0.14→0.10 so they read as limbs not slabs; forearm
  re-hung at y −0.22 off the joint bead (creation AND animate case — the
  animator overwrote it to −0.28 every frame).
  Verified: capture clean, `bestiary shows "VOIDWORM": YES`, RMS 12–17 vs HEAD
  frames, and the local vLLM vision check (port 8006, model
  qwen3.8-flash-next, `scripts/ask-frames.py` pattern) now answers ATTACHED /
  same height / mirror pair on both checked frames; OLD frame 2 under the same
  question said "staggered diagonally, not a mirror pair" — fix confirmed to
  have taken.
  Grades after fix: 6,6,5,6,7 (mean 6.0) vs HEAD build 6,6,7,7 (mean 6.5) —
  inside the ±2 noise band; the arms are NO LONGER the grader's worst_flaw.
  **The grader's remaining complaint is the BODY: segments read as disconnected
  flat chevrons/cubes — "no joint, tendril, or overlap between segments"**
  (detail 5, cohesion 6). That is the next fix, not the arms.
- **Vision tooling notes**: `vision_analyze` timed out on every frame this
  session. Workaround that works: POST the frame (downscaled ≤768px JPEG
  base64) to `http://127.0.0.1:8006/v1/chat/completions` with model
  **qwen3.8-flash-next** and `max_tokens` ≥ 2000 — the model spends budget on
  hidden reasoning and returns `content: null` if the cap is small.
  `grade-invader.py` defaults to the dead `qwen3.6` model on that endpoint —
  pass `--model qwen3.8-flash-next`.

- Arms were added in `387b966` and graded 8.0 twice (a real confirmation under
  the fixed gate). Cron c94c41ea9af6 PAUSED. Full write-up of everything this
  loop has taught us: **`AGENT-LOOP-LESSONS.md`** — read it.
- **OPEN BUG — the arms are not attached to the body.** Looked at directly in
  frames 2 and 7: two slabs float beside the chain with visible gaps, at
  different heights. Two causes, both in `createVoidwormAlien`:
  1. `[-1, 1].map((side, idx) => { const segIdx = idx + 1; ... })` mounts the
     LEFT arm on segment 1 and the RIGHT arm on segment 2 — y −0.28 vs −0.56,
     so they are not a pair. Mount both on the same segment.
  2. The mount sits at `x = ±VOIDWORM_RADII[segIdx], y = 0`, which on an
     octahedron is the widest *vertex*, not a surface; the arm then drops to
     y −0.11 and the forearm to −0.28 while the segment bottom is only −0.15.
     Inset the shoulder (x ≈ ±0.6r, y slightly above centre) so it is embedded
     in the crystal, and scale the limb down — it is ~0.5 long against a 0.13
     radius, which is why it reads as a slab rather than a limb.
- The 8.0 is a real rubric score and the arms did improve animation 7 → 8. The
  rubric was never asked whether the arms are attached. Both things are true.
- Previous entry, still current: **score 7.0 before the arms.**
- **A "confirmed 8.0" was reported on 2026-08-14 and it was NOT real.** A
  session ran `grade-invader.py VOIDWORM --frames 6` *without* `--confirm`;
  the script then printed "TARGET REACHED AND CONFIRMED" and exited 0 off a
  single grade. Two further grades on that identical build returned 7.0 and
  7.0. The script is fixed (548f93a) — confirmation is now unconditional.
  If you see a pass, check the two grades behind it.
- Top remaining flaw, and the grader now says this independently: **the crown
  blooms out at windup peak** — "turning the head into an indistinct white
  blob", washing out the teeth. Lower the bloom/emissive at the flare, or give
  the teeth a dark rim so their shape survives. This is the next fix.
- mimo's contributions this round, both kept: brightened the bottom 3 segments
  so the tail stops vanishing into the starfield (a real improvement), and
  removed two now-redundant `bodyPivot.add()` calls. Note its stated reason for
  the latter — "they render twice" — is wrong: three.js `add()` reparents.
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

## Looking at the code is not looking at the invader

The session that claimed the eyes were fixed never viewed a single frame. Its
tools this run were execute_code, read_file, search_files, patch, terminal —
no image was ever opened. It inferred "eyes now attached, no longer floating"
from reading a diff, and the grader it quoted never mentioned eyes at all.

`grade-invader.py` sends frames to a vision model, but it grades the *rubric* —
it will not answer a question you did not ask. If the human asks about one
specific feature, **open the frames yourself** and look at that feature. You
have vision; use it. Never report a visual fix you have not seen.

## Next

1. Kill the crown blowout at windup peak (grader + human both flag it).
2. Detail is the remaining weak axis (5–7). Add structure that survives at
   gameplay distance — do NOT round the geometry off to get it.
2. Recapture, then grade **3+ times** and compare means. One grade is noise.
3. Anything the human sends by Telegram outranks everything above.

## Update template (replace sections above, keep headings)

- Now: current best score, latest grade trail, HEAD sha, lock/cron state.
- Tried already: append one line per change with the commit sha and verdict.
- Next: the single most promising fix, plus anything the human asked for.
