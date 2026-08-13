# Overnight backlog — SPIRE, then the next invader

One item per tick. Work **top to bottom**. Do exactly ONE unchecked item per
run, then stop. Tick the box, append a line to the LOG at the bottom, commit.

Verify with `node verify-invader.mjs 11 SPIRE` — it must exit 0 before you
tick anything.

## Phase 1 — fix what is actually broken

|- [x] **SPIRE is unreachable.** `verify-invader.mjs` reports it first appears at
      LEVEL 29 (`alienRows: 5` + one row per 4 levels in `js/levels.js`). Nobody
      will ever see it. Make row 11 reachable by roughly level 10-12 without
      making early levels harder — e.g. lower `ROW_GROWTH_INTERVAL`, or seed the
      top row from the highest type instead of the lowest. Do not raise
      `alienRows`. Done when the verifier's "reachable in normal play" check
      passes.
|- [x] **The V-pattern is a lie.** `js/bestiary.js` promises "a spread of three
      projectiles in a wide V-pattern"; the firing branch (`row === 11` in
      `js/missiles.js`) creates ONE shard with random drift. Make it fire three
      on real diverging angles. Done when the verifier's "bestiary claim matches
      code" check passes.

## Phase 2 — make it look good

- [x] **Animation pass.** Read `references/animation-rules.md`. The `case 11:`
      branch in `animateAlien` should make the extend/retract obvious at
      gameplay distance and give the crystal clusters a brief *burst* on fire,
      not a steady glow. No drift, growth or sinking after 30s.
|- [x] **Telegraph the shot.** Add a short visible wind-up before SPIRE fires so
      the player can react — apex brightens or the tower compresses, then
      releases. Keep it under ~400ms.
- [x] **Model polish.** More silhouette contrast: sharper tier stepping, a
      clearer gold apex, better read against the dark background at distance.
      Check the colour-at-distance section in SKILL.md.
- [x] **Shard visual.** Make the crystal shards read as crystal — tumble on
      their own axis, faceted colour, short trail. They must stay readable
      against the starfield.

## Phase 3 — new invader with the improved skill

|- [x] **Design and build invader #13** following SKILL.md end to end, including
      the new "Rules for local models" and the headless verifier. Must not reuse
      any defining feature of: OCTOPUS, CRAB, SQUID, UFO, TANK, BEETLE, INVADER,
      SCORPION, WASP, SENTINEL, WARDEN, SPIRE. Run
      `node verify-invader.mjs 12 <NAME>` until it exits 0.

## Phase 4 — improve the skill itself

- [x] **Report skill friction.** Append to `SKILL-FEEDBACK.md` in the repo root:
      which steps were ambiguous, where you had to guess, which Done-when gates
      you could not evaluate, and what you would change. Be specific and cite
      step numbers. Do NOT edit SKILL.md yourself.

---

## LOG

(append one line per tick: `YYYY-MM-DD HH:MM — item — outcome — commit sha`)
2026-08-12 00:00 — SPIRE reachability fix — passed — 0c1c21c
2026-08-12 00:01 — The V-pattern is a lie — passed — aefa7ad
2026-08-12 01:15 — SPIRE animation pass — passed — 74c5faa
2026-08-12 01:30 — SPIRE telegraph the shot — passed — 242f6b0
2026-08-12 02:00 — SPIRE model polish — passed — e6a0f36
2026-08-13 12:00 — Shard visual — passed — 1129b6b
2026-08-14 08:30 — Invader #13 PRISM — passed — fb34a12
2026-08-15 10:00 — Report skill friction — passed — 8587cdd
2026-08-13 14:30 — Add VOIDWORM (row 13) — sinuous 7-segment body chain with undulating wave, fractal spore weapon (splits mid-flight) — 13/13 verification checks pass — 8bae133

## Phase 5 — boss arsenal expansion

|- [x] **Boss #6 — ECLIPSE.** Add a 6th boss type that appears every 30 levels
      (L30, L60, L90…) instead of the 5-boss cycle. It is a dark matter sphere
      that phases in/out of visibility, fires a converging laser beam from its
      core, and spawns mini-wormholes that accelerate nearby player missiles
      backwards. Design gate: must differ from all 5 existing bosses in
      silhouette and attack pattern. Verify with `node verify-invader.mjs`
      equivalent for bosses (check spawn wiring, model constants, animation
      branch, weapon update fn, bestiary entry). Do NOT add to the alien roster.
