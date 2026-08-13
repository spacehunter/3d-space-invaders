# SKILL-FEEDBACK.md — new-invader friction report

Feedback from working through this skill across six overnight runs
(SPIRE: reachability, V-pattern fix, animation, telegraph, model polish,
shard visual) plus one full invader addition (PRISM, row 12).

---

## Step 0 — Fill in your names

**Good.** Clear, mechanical, one-time lookup. The table format removes
ambiguity about capitalisation conventions.

**Friction:** The table has a sentinel example column that is useful when
learning but becomes copy-paste noise after the first type. After step 0
is done once, the sentinel column should be dropped for subsequent runs
to reduce visual noise.

---

## Step 1 — Design gate

**Friction: no concrete constraint on "unique silhouette."** The rule says
silhouette "must differ from every row above in outline, not just colour."
What counts as the same outline? A "domed shape" could be Octopus or Squid
or even Spire (tapering tower). The skill should give a concrete test, e.g.
"if you could trace the bounding box of one onto the other and get a
recognisable match, they share silhouette."

**Friction: weapon flight column already has 12 entries by the time a 13th
is designed.** The table in the skill text is stale before you even start —
it doesn't include SPIRE's "crystal shard spread" or Sentinel's "diverging
fan" or Wasp's "fast amber needles." The skill tells you to "confirm against
`const BESTIARY_ENTRIES`" but then provides an already-outdated roster in
Step 1. The user has to read two tables. Suggestion: remove the table
entirely and point only at `BESTIARY_ENTRIES` as the source of truth.

**Good:** The colour ramp guidance (4–6 hex steps, dark → hot) and the
requirement to specify a "signature animation event" are concrete enough
to self-evaluate.

---

## Step 2 — Build the model

**Friction: the skeleton in `references/voxel-modeling.md` is a good start
but is too prescriptive for new designs.** The skeleton walks through
`bodyGeometry`, `eyeGeometry`, `armGeometries`, `legGeometries`,
`LEG_MOUNTS`, and `buildLimbChain`. A type that doesn't have legs (Spire
is a tower, Sentinel is a floating construct) has to adapt the skeleton
by omitting those sections, but the skeleton doesn't acknowledge that
omission is valid. The user has to infer that the skeleton is "copy the
Wasp, but remove what doesn't apply."

**Friction: no guidance on how to decide what goes in `_BODY` vs a named
part.** The examples show `_BODY` for the main form and `_EYES`, `_ARM`
for appendages. A new type needs to know when to create a new constant
array (like `_TURRET` or `_RING`) versus just adding boxes to `_BODY`.
The rule "one geometry per part" is clear, but the boundary between
"same geometry" and "different geometry" is subjective.

**Friction: half-width check script.** The regex `size:\s*\[([.\d]+),[^]]*\],\s*pos:\s*\[(-?[\d.]+)` is fragile. It only catches boxes whose `size` comes before `pos` in the source — but the skeleton shows `pos` before `size` in the comment example, and the actual box lists in existing code use `{ size, pos }` order. The script works *because* the existing code happens to use the same order the regex expects, but a new type that uses a different box property order will produce `0.000` without the script warning. **The script should be robust to property order, or at least report the count of matched boxes so the user can verify the script matched something.**

**Ambiguity: `references/voxel-modeling.md` says "search `// Wasp (row 8)`"
to find the append position. But the Wasp row number changes when a new type
is inserted below it.** The search anchor moves. Better anchor: "search for
the last `// ---` banner comment" (which the SKILL.md main text says, but
the reference file does not).

---

## Step 3 — Wire the type so it spawns

**Friction: the wiring-checklist table is the most useful part of the
entire skill, but it assumes the user can locate each search anchor by
memory alone.** Row 6 says search `const BESTIARY_ENTRIES = [` — that's
fine. But row 19 says search `As of 20` in `README.md` — if the README
format changes (e.g. the year is `2025` one day and `2026` the next),
the anchor is blind. The checklist anchors should be more specific,
e.g. "search for `As of 20XX` in PROJECT_STATUS.md" — using a wildcard
or at least noting that the year portion may vary.

**Good:** The explicit `continue;` warning in edit 9 is critical — it
prevented the double-push bug that killed the PRISM projectile in its
first attempt.

**Friction: row 26 (`index.html` feature count)** — the skill notes in
the "Not a wiring point" section that `index.html` is the one place
outside `js/` that needs updating, but then burying that update as row 26
in a table of 25 rows makes it easy to miss. This should be called out
in the main SKILL.md text as a "remember this" callout, not hidden in
a long checklist.

---

## Step 4 — Animate it

**Friction: the animation skeleton in `references/animation-rules.md` is
excellent and nearly copy-paste ready. But it's structured around having
`bodyPivot`, `eyes`, `arms`, and `legs` — all of which a new type may not
have.** The user must understand that:
1. `if (self.bodyPivot)` guards are mandatory for *any* part that might
   not exist (the skeleton shows them, but doesn't explicitly say "delete
   the blocks for parts you didn't create")
2. The `if (!alien.userData.isSwooping)` wrapper is mandatory even if
   the type has no bodyPivot (the formation still needs Y management)
3. The `hover` value and the `windup * 0.025` and `windup * 0.03`
   multipliers are examples, not universal truths

**Good:** The six failure-mode checks at the bottom are mechanical and
actionable. Each one has a symptom, a cause, and a grep/check to run.
This is the single best part of the skill.

**Ambiguity: "every part you animated visibly moves"** — what counts as
"visibly"? The skill doesn't define a threshold. A rotation of 0.001
rad/frame is technically motion but invisible. The user has to self-judge
amplitude. Suggestion: add a rule like "amplitude should be at least
0.02 units or 2 degrees to be perceptible."

---

## Step 5 — Build the weapon

**Friction: the weapon-projectile.md skeleton is good but the "Flight
model variations already in use" section is too short for a roster that
now has 13 alien types with distinct weapons.** There are really 7+
distinct flight behaviors in the codebase (straight, homing, slow-arm,
mortar arc, fast-straight, diverging fan, expanding ring, crystal spread),
but only 4 are listed. A new type designer can't tell if "fast straight"
(Wasp needle) is different enough from "straight" (rows 0-3) to qualify
as a new behavior. The list should be exhaustive.

**Friction: no guidance on projectile visual design.** The skeleton
gives a `BoxGeometry(0.10, 0.10, 0.48)` body and a tip, with hard-coded
color `0xff9d16`. New types have to decide their own colors and shapes,
but the skill doesn't say "match your type's palette" or give examples
of what different projectile looks should communicate (e.g. a slow
projectile should look heavier/bulkier).

**Good:** The `continue;` warning in edit 3 is repeated from the wiring
checklist (redundancy is good here) and the explanation of *why* it's
needed (double-push bug) is essential context.

---

## Step 6 — Finish the wiring and the docs

**Friction: this step defers entirely to the wiring checklist.** There's
no standalone work here beyond ticking rows. The user already did all
the edits in Steps 3 and 5. Step 6's existence is questionable unless
it's meant to catch missed rows. The checklist should just be one table
split logically (the current 3-table structure is fine).

**Friction: row 15 (scoring formula).** The formula `(6 - alien.userData.row) * 10`
means rows 6+ score 0. The checklist says "accept that and update the
comment" or "change it." No recommendation is given. A new type at row
12 would score 0 by default, which may not be the designer's intent.
The skill should acknowledge that new types often want >0 points and
provide a template for adjusting the formula, e.g.
`Math.max(0, (N + 1 - row) * 10)` instead of hard-coding `6`.

---

## Step 7 — Verify

**Friction: section B (Manual — the Bestiary) is explicitly un-runnable
without a browser.** The skill says "Open http://127.0.0.1:5173/" but the
cron context has no browser. The `verify-invader.mjs` script exists as
an替代, but the skill's verification section is structured around
browser checks. This is a structural mismatch: the skill was written
for a browser-equipped human, not for a headless agent.

**Good:** The served-vs-disk stale-code check is critical and well-explained.
The curl-based verification path is the right approach.

**Friction: section C says "State which of B1/B2/B3 you actually ran."**
In a headless context, the user (cron agent) should be expected to skip
these and only report automated results. The report template should
have a different "C" section for headless runs.

---

## Overall structural issues

1. **Reference files are a nice idea but create navigation tax.** The user
   has to load the main skill, then load each reference file separately.
   That's 6 separate tool calls before any work begins. Consider
   inlining the critical paths (wiring checklist + weapon edits) into
   the main SKILL.md and keeping the references for deep-dive only.

2. **No "abort conditions" defined.** The skill says every step has a
   Done-when gate, but doesn't say what to do when a step *repeatedly*
   fails (e.g. the model won't build, animation won't move). The skill
   should define a maximum retry count or a "hand up" condition after
   which the user should be told "I can't complete this step — here's
   what I tried and what I see."

3. **Line-count/exit-count regression check in SKILL.md Step 2 is
   excellent but should be in *every* step, not just once.** Currently
   the skill says "commit each green step" but doesn't re-baseline
   after each commit. If step 4's patch accidentally deletes code,
   the line count *after* the edit will be higher than the step-2
   baseline (because step 3 added code) but lower than what it was
   right before the edit. The comparison should always be against
   the last commit's counts, not the original baseline.

4. **The `verify-invader.mjs` script is the crown jewel of this skill
   — it should be more prominent.** The main SKILL.md buries it in
   Step 0's "Verify without a browser" section, but it's the only
   thing that catches the real failures (spawn wiring, animate branch,
   weapon wiring, bestiary match). It should be the default "is this
   step done" check, not an alternative to browser QA.

5. **No guidance on what to do when `verify-invader.mjs` fails.**
   The script presumably exits non-zero, but the skill doesn't say
   "if it fails on X check, look at file Y line Z." The script
   should output actionable repair instructions, not just pass/fail.

6. **`CLAUDE.md` doc rows (checklist 20–24) cannot be done in the
   automated cron environment.** The write guard treats `CLAUDE.md`
   as a protected agent-instruction file and refuses edits when no
   interactive user is present to approve. All five `CLAUDE.md`
   wiring rows (module table, Alien Types by Row, Missile System
   array, registry enumeration, "rows are now rebuilt" count) fail
   closed. Functional game code is unaffected and still verifies
   13/13, but the checklist cannot be fully ticked unattended. The
   skill should either flag these rows as "interactive-only" or move
   the roster counts into a file the cron agent is allowed to write.