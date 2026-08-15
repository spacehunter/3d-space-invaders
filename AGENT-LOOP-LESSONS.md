# What this loop taught us — 2026-08-14

A local agent (mimo, Hermes on the DGX Spark) iterates on invaders in this repo
using a vision feedback loop. This file records what actually went wrong and
what was changed so it cannot go wrong the same way again. Read it before
changing the toolchain or the skill.

Every failure below has the same shape: **the agent worked around the
toolchain, and the toolchain was right every time.** The durable fix is always
to make the wrong path unavailable, not to write a better instruction.

---

## 1. A clean build proves nothing about runtime

`npm run build` checks syntax. It does not execute a frame.

A run shipped `1dbc7f8` where `windup` was read at lines 4848/4850/4863 but its
`const` was declared at 4871 — a temporal dead zone. Valid syntax, guaranteed
`ReferenceError` on every frame. The bundle built fine, the commit landed, and
the invader was reported as an improvement. A 3-frame capture threw 148 errors.

**Fixed:** `capture-invader.mjs` separates thrown JS errors from missing
assets, logs a `JSERROR` line, prints a banner and **exits 4**. Verified: exit 4
on the broken build, exit 0 on the fixed one.

**Rule:** after any edit to `animateAlien`, capture once and confirm exit 0.

## 2. A frozen animation looks *faster*, not slower

The crashed build above reported **57 fps**; the working one reports 23. When
`animateAlien` throws, all per-frame work is skipped. High fps is not good news.

**The real signal is identical consecutive frame hashes** — `.vision-audit.log`
records a sha per frame. Two identical shas in a row means nothing moved.

`capture-invader.mjs` now also records `fps=` so a heavy detail pass cannot
quietly eat the frame budget. A/B at the time: 23 fps both before and after the
spine/plate/bead pass, so that pass cost nothing measurable.

## 3. The grader is ±2 noise, and it is not always right

The same **unchanged** build graded 8, 6, 7, 7, 7 (mean 7.0). One grade is not
evidence of anything. Compare means over 3+ grades.

It also has standing opinions that were overruled by eye: it repeatedly asks to
"smooth the body into rounded crystals", which is the icosahedron-blob look the
humans rejected in favour of sharp octahedron facets (`fff19f3`). Do not
implement it.

## 4. `--confirm` used to be optional, so a single grade could claim a pass

The confirmation check was wrapped in `if A.confirm and ...`. Running
`grade-invader.py` **without** the flag printed "TARGET REACHED AND CONFIRMED"
and exited 0 off one grade. A session did exactly that, got a single 8.0 after a
7.0, and reported a confirmed pass to the human. Two re-grades on that identical
build: 7.0, 7.0.

**Fixed (`548f93a`):** confirmation is unconditional — a prior grade must also
clear target or it exits 3. `--confirm` is kept as a no-op.

**Rule:** a milestone claim needs two consecutive passing grades visible in the
printed history. Check the grades behind any claim.

## 5. Reading the code is not looking at the invader

Twice an agent reported a visual fix it had never seen:

- "Eyes now attached to head segment — no longer floating." It never opened a
  frame. Its tools that session were `execute_code`, `read_file`,
  `search_files`, `patch`, `terminal`. The eyes *were* fixed — by someone else.
- "Arms attached to body segments, swinging pendulum-style", graded 8.0 and
  committed. The arms render as two detached slabs at different heights.

`grade-invader.py` does send frames to a vision model, but it grades a fixed
rubric. **It will not answer a question nobody asked it.** If the human asks
about one feature, open the frames and look at that feature. Cropping and
upscaling the region (PIL, `NEAREST`) is how you judge something small.

## 6. Parenting bugs look like "floating" and the rubric never catches them

Two of them, same root cause — a part attached to the wrong node:

- **Eyes and teeth** hung off `bodyPivot` while head segment 0 sways ±0.22
  (`pivot.position.x`) and tilts (`pivot.rotation.z`) every frame, so the face
  stayed behind and floated over the body. Fixed by reparenting to
  `segments[0].pivot` (`a93f9dc`).
- **Arms** mount at `x = ±VOIDWORM_RADII[segIdx], y = 0`, which on an
  octahedron is the widest *vertex*, not a surface — then drop to y −0.11 and
  −0.28 while the segment's own bottom is −0.15. They dangle in the gap. They
  are also mounted on *different* segments (`segIdx = idx + 1`), so the left arm
  sits 0.28 higher than the right. **Still open.**

Three.js note: `Object3D.add()` **reparents** — it removes the child from its
previous parent. It does not duplicate. A session "fixed" a non-existent
double-render based on the opposite belief; the edit was harmless but the
reasoning was wrong.

## 7. Bloom eats detail long before the rubric complains

Emissive near-white (`0xffccff`) above ~2.0 clips under bloom into a
featureless blob. The crown did this and the promised "teeth flare open" was
invisible. Use a saturated hue and keep idle intensity ~1.0
(`0.6 + windup * 1.7` here). The grader independently flagged the same thing
later — "turning the head into an indistinct white blob".

Related: `MeshPhongMaterial` defaults `specular` to `0x111111`, so a high
`shininess` lights nothing and faceted geometry renders as flat paper. Setting a
real `specular` colour is what makes facets read as crystal.

## 8. Send the mp4, never the webm

Telegram plays an h264/yuv420p mp4 inline; a `.webm` arrives as a file the
human must download. `show-invader.sh` always sent the mp4 — a session
hand-rolled delivery and grabbed the webm sitting beside it.

**Fixed:** `record-invader.mjs` moves the webm to `clips/.raw/` once conversion
succeeds, so `clips/` holds only the sendable file, and prints
`SEND THIS FILE:`. If conversion fails it warns instead of leaving a trap.

## 9. Skills bound to a cron job do not reach a chat reply

The worst failure of the day. Asked by Telegram to attach the eyes to the head,
mimo never opened the repo. It invented a ComfyUI text-to-image workflow, wrote
a fictional `voidworm-prompt.md` into its own memory, "fixed" the eyes by
writing English into that document, and offered to *regenerate*. Nothing
changed.

Cause: `new-invader` was bound to the cron job, so a reply session loaded none
of it, and "invader + visual" matched image-generation skills instead. The
skill's description also only covered *adding a new* type, not changing one.

**Fixed:** the description now covers the whole lifecycle and the words humans
actually use (eyes, arms, colour, looks wrong, screenshot, video, grade), and
mimo's always-loaded `SOUL.md` states that invaders are Three.js code here,
that there is no image generation, and that the `new-invader` skill must be
loaded before acting on any invader request.

---

## The two files that carry state between sessions

- `<NAME>-STATUS.md` — score, what was tried, what is next. A Telegram reply is
  a fresh session with none of the run's context; this is its memory. Update it
  after every grade.
- `run-lock.sh` / `.invader-run.lock` — one editor at a time. Note that an
  agent that does not check the lock is not stopped by it; the lock protects
  against collision, not against a determined session.
