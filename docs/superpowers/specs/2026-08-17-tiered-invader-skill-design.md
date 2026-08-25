# Tiered `new-invader` skill — design

Date: 2026-08-17
Status: design only. No file under `.claude/skills/new-invader/` or `js/` is modified by this document.
Scope: restructure the existing `new-invader` skill so it is executable by agents from a small
local model up to a frontier cloud model, without capping the ceiling.
Revision: §6.11 corrected and the runtime lane re-verified against the tree at 13 types
(row 12 Mantis). See §6.11 and §5 for what changed and why.

---

## Recommendation

Keep **one** skill, and split it not by step but by **artifact**. Everything the current 8-step
procedure asks for is derivable from a 14-field spec file plus exactly three creative payloads —
the box lists, the `animateAlien` case body, and the flight-model block inside the projectile
updater. So: a ~900-token `SKILL.md` that is only a router, an invariant list and a five-command
spine; a `scaffold.mjs` that performs all 26 mechanical wiring edits from `invader.json` by the
same literal anchors the checklist already uses (I verified today that all 26 still resolve
uniquely, including after the Mantis landed); and an `audit.mjs` that re-verifies the result
*independently of the scaffold*, both statically and by importing the real modules into Node and
exercising them. Tiers then control only how the three payloads get authored — pick from a catalog
(Tier A), write from skeletons (Tier B), or design freely against a differentiation gate (Tier C) —
and how deep the verification lane goes. This beats separate per-tier skill files (three copies of
the invariants, which in this repo drift within two commits) and beats pure codegen (unidiomatic
output nobody reviews), because the auditor is the thing that actually closes the silent-failure gap
and it is tier-independent: every agent, weak or strong, must reach `0 FAIL` on the same script.

The single most important finding behind this recommendation: **the failures this skill worries
about are all mechanically detectable in plain Node, with no bundler, no stubs and no new
dependency, and I ran it.** `node --input-type=module -e "import('./js/aliens.js')"` works from the
repo root today; `js/missiles.js`, `js/barriers.js`, `js/levels.js`, `js/voxel.js`, `js/particles.js`
and even `js/bestiary.js` all import cleanly too. See §5 for measured output on all 13 existing
types, including a real pre-existing `alien.scale` violation the current skill's own hard rules
forbid.

---

## 1. Where the mechanical/creative line actually falls

The brief asks where the line is between mechanical and creative steps. The answer is that the
line does not run *between* steps — it runs *inside* every step. Step 2 ("build the model") is 80%
mechanical: the registry function, the material objects, the `create<Name>Alien` builder, the
`Object.assign(group.userData, …)` calls are all the same shape for every one of the 13 existing
types. Only the box-list constants are creative. Step 5 ("build the weapon") is ~90% mechanical:
of the six `missiles.js` edits, only the ~8 lines inside the update loop marked
`--- flight model ---` carry any design.

Concretely, here is everything a new invader consists of, partitioned:

**Derivable from a spec (no judgement, and therefore scaffoldable):**

| What | Where |
|---|---|
| `ALIEN_ROWS` bump | `js/constants.js:4` |
| `CAPS.maxRows` bump | `js/levels.js:34` |
| `row % COUNT` modulus + its comment | `js/aliens.js:52-53` |
| `case N:` in `createAlien()`'s switch | `js/aliens.js:100-141` |
| `createAlienPreview` JSDoc range | `js/aliens.js:82` |
| `get<Name>Parts()` skeleton + `let <name>Parts = null` | `js/aliens.js`, after the last banner |
| `create<Name>Alien(group)` skeleton | same |
| `case N: { }` shell in `animateAlien()` | `js/aliens.js:4478` (Mantis) and after |
| Bestiary entry object (incl. the 1-indexed tagline) | `js/bestiary.js:10` |
| `let <array> = [];` | `js/missiles.js:24` |
| `create<Proj>()` factory shell | `js/missiles.js` after `createAmbushSpur` (`:847`) |
| `alienFire` `else if (row === N)` branch incl. `continue;` | `js/missiles.js:966-971` |
| `update<Proj>s()` shell (5-param signature, backwards loop, barrier/offscreen/player blocks) | `js/missiles.js` |
| both `resetMissiles` halves | `js/missiles.js:1771` |
| `getMissiles()` entry | `js/missiles.js:1800` |
| `game.js` import + call site | `js/game.js:6, 526` |
| all 11 doc/count edits (README ×4, CLAUDE ×5, PROJECT_STATUS, index.html) | — |

**Not derivable — the three creative payloads:**

- **P1 — the box lists.** `<NAME>_BODY` etc.: the silhouette, the colour ramp, the proportions.
- **P2 — the `animateAlien` case body.** Which parts move, the phase windows, the signature event.
- **P3 — the flight model.** The ~8 lines that make a vortex bolt corkscrew rather than fly straight.

**Judgement that is neither, and belongs only at the top tier:**

- Silhouette differentiation against the roster (an outline claim, not a checkable one).
- Colour-ramp legibility at gameplay distance under gameplay bloom.
- Whether the weapon is *fun* — dodgeable in a distinguishable way.

That partition is the whole design. The scaffold owns column 1. The tiers differ only in how P1–P3
get filled and how much of column 3 is required.

---

## 2. Structure: chosen approach and why not the others

**Chosen: one skill + spec file + scaffold + auditor + tier-scoped payload guides.**

Rejected alternatives, with the specific reason:

- **Single file with inline tier lanes.** Every agent pays the full token cost, and a weak model
  reads lanes not addressed to it — the current SKILL.md already demonstrates the failure mode by
  telling the agent "do not read ahead" and then putting two prose essays (colour at gameplay
  distance, optional extras) below the last step where a linear reader hits them last or not at all.
- **Separate skill file per tier.** Three copies of the invariant list. This repo's docs drift fast
  — `CLAUDE.md:100` still says the UFO half-width is ~1.68 and the budget is 0.95, both of which are
  wrong today (see §6). Triplicating that is a guarantee of divergence.
- **Fill-in-a-data-structure only, no codegen.** Better than prose, but the agent still performs 26
  hand edits, and the 26-row checklist is exactly where a weak model runs out of working memory.
- **Codegen only.** Risk: generated code that is unidiomatic, that nobody reads, and that rots when
  an anchor moves. Mitigated here by three things: (a) the scaffold edits by the *same* literal
  anchors the checklist has been using successfully, all 26 of which I confirmed resolve to exactly
  one match in the current tree; (b) `scaffold.mjs --dry-run` prints a unified diff for review before
  writing; (c) the auditor verifies the *result*, not the scaffold's intentions, so if an anchor rots
  and the scaffold silently no-ops, the audit still fails and names the missing edit.

The scaffold must also be idempotent-refusing: if `case N:` already exists in `js/aliens.js`, it
exits 2 with `already scaffolded — run audit.mjs instead`. Half-applied scaffolds are the one new
failure mode this design introduces.

---

## 3. File tree

```
.claude/skills/new-invader/
├── SKILL.md                       ~900 tok   Router: tier selection, 8 invariants, 5-command spine, nothing else.
├── invader.example.json           ~250 tok   Worked spec (the newest type) — the only thing the agent copies to start.
├── steps/
│   ├── 1-spec.md                  ~600 tok   Fill invader.json field by field. Includes the `--roster` command.
│   ├── 2-model.md                 ~750 tok   Payload P1 only: box lists. Tier-lane blocks at the top.
│   ├── 3-animate.md               ~750 tok   Payload P2 only: the case body. Phase-window pattern.
│   ├── 4-flight.md                ~500 tok   Payload P3 only: the ~8 lines of flight model.
│   └── 5-verify.md                ~450 tok   Run audit; how to read FAIL/WARN; the browser lane; how to report.
├── catalog/
│   ├── silhouettes.json           ~1200 tok  Tier A menu: 6 ready-to-paste box-list archetypes, each unused by the roster.
│   ├── motions.json               ~900 tok   Tier A menu: 6 ready-to-paste case bodies keyed to the silhouettes.
│   └── flights.json               ~600 tok   Tier A menu: 6 ready-to-paste flight models (see §5 for the unused list).
├── reference/
│   ├── voxel.md                   ~900 tok   Toolkit table, pivot-origin rule, emissive/ramp rule. Tier B+.
│   ├── animation.md               ~800 tok   Invariants with symptoms and causes. Tier B+.
│   ├── weapon.md                  ~700 tok   World conventions (+Z, y=0, speeds, radii). Tier B+.
│   └── design-brief.md            ~700 tok   Tier C only: differentiation gate, colour at gameplay distance, spec-doc format.
└── scripts/
    ├── scaffold.mjs                          invader.json -> all 26 mechanical edits. --dry-run prints a diff.
    └── audit.mjs                             Static + headless-runtime audit. Exit code = failure count.
```

Two scripts, not three. An earlier draft of this design had a `lib/bundle.mjs` esbuild wrapper
because I believed `js/` could not be imported into Node directly. It can (§6.11). Dropping the
bundler removes a build step, a devDependency the auditor would otherwise depend on, and a class of
failure — a bundle error that has nothing to do with the agent's invader — from the tier least able
to diagnose it.

Total instruction surface a **Tier A** agent ever loads: `SKILL.md` (900) + `steps/1-spec.md` (600)
+ the three catalog files it picks from — and it only needs the *chosen* entry, not the whole file,
if the step tells it to `jq` the entry out (~200 tok) + `steps/5-verify.md` (450). Call it **~2,500
tokens plus audit output**. That fits a small local model.

A **Tier C** agent loads everything, ~11,000 tokens, which is less than the current skill's ~9,500
plus the ~4,800-line `js/aliens.js` reading it is currently pushed toward.

### What `SKILL.md` must contain, exactly

1. The tier router (§4) — first, because it decides what else gets read.
2. The five-command spine, verbatim and copy-pasteable:
   ```bash
   cd /Users/moog/Documents/3d-space-invaders
   node .claude/skills/new-invader/scripts/audit.mjs --roster        # what exists now
   cp .claude/skills/new-invader/invader.example.json invader.json    # then edit it
   node .claude/skills/new-invader/scripts/scaffold.mjs invader.json --dry-run
   node .claude/skills/new-invader/scripts/scaffold.mjs invader.json
   node .claude/skills/new-invader/scripts/audit.mjs                  # repeat until 0 FAIL
   ```
3. The eight hard invariants, one line each, phrased as a rule not an explanation. (The *why* moves
   to `reference/`; the rule stays in the entry file because a weak model that reads nothing else
   still needs it.)
4. The stop rule: "If the same audit ID FAILs twice in a row, stop editing and drop to Tier A."
5. The reporting rule: "Paste the final audit output verbatim. Never write 'verified' on the
   strength of `npm run build`."
6. One warning-suppression note: **Node prints `MODULE_TYPELESS_PACKAGE_JSON` on stderr every time
   it imports anything from `js/`.** It is harmless — `package.json` has no `"type": "module"`, so
   Node reparses as ESM after detecting module syntax. A weak agent will read a stderr block
   containing the word "Warning" as a failure and start "fixing" it. `audit.mjs` must run with
   `--no-warnings` (or filter it) so this never reaches the agent's eyes at all, and `SKILL.md`
   must say in one line that adding `"type": "module"` to `package.json` is **not** part of this
   task.

Nothing else. No roster table (it goes stale — §6), no design essay, no optional extras.

---

## 4. Tiers

### How an agent knows its tier

Self-assessment of capability is unreliable, so the router uses **capability probes and revealed
behaviour**, in this order — first match wins:

1. **Caller passed a tier** (`Skill(new-invader, "tier=A")`) → use it. The team lead or a parent
   agent usually knows more than the child does.
2. **`node scripts/audit.mjs --selfcheck` does not exit 0** (no `node`, or `node_modules/three`
   missing so the bare `three` specifier will not resolve) → **abort**. Print what failed, do not
   write code. An agent that cannot run the auditor
   cannot detect any of this codebase's failure modes, and a silently-broken invader is worse than
   none. This gate is new and I think it is the most valuable single line in the router.
3. **No way to see the screen** (no browser/screenshot tool, or the agent cannot open
   `http://127.0.0.1:5173/`) → ceiling is **Tier B**. Tier C's colour-at-gameplay-distance check is
   not performable, and claiming it is the exact dishonesty the current SKILL.md Step 3 already
   warns about.
4. **Default: Tier B.**
5. **Escalate to C** only after producing the differentiation table from `--roster` and a design
   note that survives it. Escalation is earned by an artifact, not asserted.
6. **Demote to A** on evidence: the same audit ID FAILs twice consecutively, or two consecutive
   edits leave the audit output byte-identical. Both are objectively observable by the agent itself
   from the auditor's own output, which is why the auditor prints stable IDs.

Rule 6 is the load-bearing one. It means a weak model does not have to *know* it is weak; it finds
out from the script and falls back automatically.

### Tier A — Catalog

- **Reads:** `SKILL.md`, `steps/1-spec.md`, one entry each from the three catalog files,
  `steps/5-verify.md`.
- **Produces:** `invader.json` where `model`, `motion` and `flight` are catalog IDs rather than
  inline code; then runs scaffold and audit.
- **Creative decisions made:** name, colour ramp (picked from 5 named ramps in the catalog entry),
  which of the remaining unused archetypes to use.
- **Forbidden:** hand-writing box lists or animation bodies. If the audit fails on a catalog
  archetype, the archetype is wrong and gets fixed once for everyone — not patched per-invasion.
- **Verification required:** `audit.mjs` at 0 FAIL. Browser checks optional and reported as
  "not performed" if not performed.
- **Honest expected result:** a correct, well-wired, visually competent but derivative invader.
  That is a good outcome for a 7B local model and it is strictly better than the current skill's
  expected outcome for one, which is a half-wired invader reported as done.

### Tier B — Skeleton

- **Reads:** everything Tier A reads, plus `reference/voxel.md`, `reference/animation.md`,
  `reference/weapon.md`, and the `steps/2-4` payload guides in full.
- **Produces:** hand-written P1/P2/P3 following the skeletons, using the catalog only as
  inspiration.
- **Verification required:** `audit.mjs` at 0 FAIL **and** every WARN either cleared or explained
  in one sentence in the report; Bestiary opened and the six B1 checks run if a browser is
  available.
- **Not required:** the design spec doc, a bespoke audio cue, gameplay-distance colour verification.

### Tier C — Design

Everything in B, plus, and this is where the ceiling goes *up* rather than down:

- **The differentiation gate, mechanised.** `audit.mjs --roster` prints, for every existing type,
  the measured animated bounding box (half-width / height / depth), the declared silhouette tag and
  the declared flight tag, pulled from `js/bestiary.js` and from a live headless sweep. The design
  note must state, per row, the axis on which the new invader differs. This is a *sharper* gate than
  the current prose ("must differ in outline"), because it hands the agent real numbers: the roster
  currently spans half-widths 0.509–1.282 and heights 1.289–2.815, so "it is taller than everything"
  is now a falsifiable claim rather than a vibe. The R11 duty cycle is a fourth axis: a type whose
  signature fires for 3% of its cycle reads completely differently from one at 35%, and the roster
  is currently bimodal on exactly that split.
- **Colour at gameplay distance**, verified in a real wave, not the Bestiary — with the
  before/after reasoning recorded. Both known failure directions (Invader whiteout, Sentinel
  black-hole) are in `reference/design-brief.md`.
- **A design spec** in `docs/superpowers/specs/YYYY-MM-DD-<name>-design.md`.
- **A bespoke audio cue** in `js/audio.js`.
- **Explicit licence to break the skeletons.** `steps/2-4` say, in a Tier C block: *the skeletons
  are the floor, not the target; the Warden (a hollow hoop with a hole through it) and the Gyre (a
  vortex rather than a body) both required abandoning the body/limbs/eyes skeleton entirely, and
  both are the best models in the roster. The only non-negotiables are the eight invariants and a
  clean audit.* Nothing in the tiering may be read as a cap on P1–P3 ambition.

---

## 5. The auditor

One script, `node .claude/skills/new-invader/scripts/audit.mjs`, **no bundler and no new
dependency**. It has two halves: a static half (regex over source, ~50ms) and a runtime half
(plain `import` of `js/aliens.js` and `js/missiles.js`, then exercise them, ~2s).

**This is not speculative.** I built and ran the runtime half today against the current working
tree, twice — once through an esbuild bundle and then again with direct `import` after the bundler
turned out to be unnecessary. The direct-import path needs nothing: no `--experimental-*` flag, no
`window` shim (I had added one defensively and it is not required — `typeof window` is `undefined`
throughout the weapon harness and nothing throws), no stubbing of `js/audio.js` (it is lazy about
`AudioContext`), no `package.json` change. Measured output from the direct-import sweep (60 seconds
of phase per type, 30fps-equivalent steps, swept via `animationOffset` — see below):

```
type  name       halfW  height  depthHalf  scaleDrift  partsMoved  wiped  minDuty%
0     Octopus    1.244   2.485      1.187      0.0600       24/31   0/31      32.7   <-- writes alien.scale (§6.6)
1     Crab       1.049   1.893      1.559      0.0000       32/44   0/44      30.1
2     Squid      0.931   2.815      1.493      0.0000       37/45   0/45       4.7
3     UFO        1.282   2.374      1.282      0.0000       14/15   0/15      11.0
4     Tank       0.750   1.289      1.312      0.0000       39/41   0/41      47.2
5     Beetle     0.996   1.741      1.491      0.0000       26/33   0/33      34.9
6     Invader    0.835   1.965      0.980      0.0000       14/19   0/19      49.9
7     Scorpion   1.110   1.733      1.105      0.0000       40/49   0/49       1.7
8     Wasp       1.067   2.189      1.852      0.0000       36/45   0/45      15.2
9     Sentinel   1.173   2.658      2.199      0.0000       30/31   0/31       3.1
10    Warden     1.196   2.392      1.031      0.0000         8/8    0/8       3.1
11    Gyre       1.146   2.262      0.863      0.0000       34/34   0/34       3.2
12    Mantis     0.509   1.523      1.058      0.0000       28/39   0/39       8.0
```

`partsMoved` = descendants whose local matrix or animated material property changed across the
sweep. `wiped` = the same measurement on a control instance whose `userData` was replaced rather
than merged — **every type collapses to `0/N`**, which is what makes that check trustworthy.
`minDuty%` is the burst-vs-glow ratio described below.

### How the sweep drives the animation

`animateAlien()` computes its time as `Date.now() * 0.001 + alien.userData.animationOffset`
(`js/aliens.js`, first two lines of the function). `animationOffset` is therefore the only phase
knob the auditor needs, and it is a plain writable property:

```js
for (let k = 0; k < 60 * 30; k++) {
    alien.userData.animationOffset = k / 30;   // sweeps 60s of phase in 1/30s steps
    animateAlien(alien);
    alien.updateMatrixWorld(true);
    // ...sample here
}
```

**Do not mock `Date.now`.** It works (I tried it first) but it is strictly worse: it is global
state that leaks into `js/missiles.js`'s `userData.createdAt` and into anything else the auditor
touches in the same process, and it has to be restored. Sweeping `animationOffset` is local to the
instance under test, deterministic, and needs no teardown. The two approaches agreed to within
±0.03 on every half-width — the small differences come from the offset sweep covering phase more
densely, which is another point in its favour.

One honest caveat: neither method reproduces **frame-delta accumulation**. `CLAUDE.md` documents
the tank-tread pattern of accumulating speed-linked motion from a per-frame delta into a stored
offset; a payload written that way advances by one delta per `animateAlien()` call regardless of
what the offset says, so the sweep measures it as a monotonic ramp rather than a cycle. The auditor
should special-case this by detecting a part whose local transform never returns to its starting
value across the sweep, and downgrading R6/R11 to WARN for that type rather than reporting a
bogus number.

### The burst-vs-glow check (R11)

The current skill asks the agent to judge whether the signature event "reads as a crisp burst, not
a permanent glow" — pure eyeballing, and exactly the kind of thing a weak model will assert without
checking. It is measurable. For each material whose `emissiveIntensity` varies across the sweep,
compute the fraction of samples above that material's own half-peak, `min + (max - min) / 2`; take
the minimum across materials. The roster separates cleanly on it:

- **Crisp signature events:** Scorpion 1.7%, Sentinel 3.1%, Warden 3.1%, Gyre 3.2%, Squid 4.7%,
  Mantis 8.0%, UFO 11.0%, Wasp 15.2%.
- **Steady glows:** Crab 30.1%, Octopus 32.7%, Beetle 34.9%, Tank 47.2%, Invader 49.9%.

WARN above 25%. The four types built with this skill all land under 9%, so the threshold is
calibrated against what "good" already looks like here rather than invented. The check is vacuous
for a type that animates no material at all (0 varying materials → `n/a`, report it, do not pass
it silently).

### Static checks (S-series)

| ID | Assertion | Remedy printed on failure |
|---|---|---|
| S1 | `ALIEN_ROWS` in `js/constants.js` === `COUNT` | exact line to write |
| S2 | `CAPS.maxRows` in `js/levels.js` === `ALIEN_ROWS` | exact line; cites the Wasp-at-`maxRows: 8` history in one clause |
| S3 | `const alienType = row % COUNT` in `js/aliens.js` | exact line |
| S4 | `case N:` present in `createAlien`'s switch | anchor + template |
| S5 | `case N: {` present in `animateAlien`'s switch | anchor + template |
| S6 | exactly one `row: N` in `BESTIARY_ENTRIES`; entry count === `COUNT`; tagline starts `ROW <N+1>` | names the wrong field |
| S7 | `let <array> = [];` declared | anchor `let lastAlienFireTime = 0;` |
| S8 | `alienFire` has a `row === N` branch, it contains `continue;`, and it precedes the final `} else {` | quotes the branch template |
| S9 | `export function update<Proj>s(player, scene, gameActive, livesCallback, gameOverCallback)` exists with all five params | signature line |
| S10 | `resetMissiles` contains **both** `<array>.forEach` and `<array> = []` | says which half is missing |
| S11 | `getMissiles()` returns `<array>` | needed by R10, so this is hard-required now |
| S12 | `js/game.js` both imports **and** calls `update<Proj>s` inside `update()` | says which of the two |
| S13 | `index.html` reads `<COUNT> ALIEN TYPES` | exact string |
| S14 | `README.md`, `CLAUDE.md`, `PROJECT_STATUS.md` all mention the new count and the new name | lists which file is stale |
| S15 | no `userData = {` anywhere in `js/aliens.js` (assignment, not `Object.assign`) | quotes the line |
| S16 | inside the new `case N:` block only: no `alien.position.x`, no `alien.position.z`, no `alien.scale`; every `alien.position.y` write is inside an `isSwooping` guard | quotes the offending line and its rewrite |

S16 needs a brace-scan of the case body, not a whole-file grep — the whole-file version is useless
because `js/aliens.js` legitimately contains all of these strings elsewhere (e.g. `updateTelegraph`
at `js/aliens.js:4691-4705` writes `alien.scale` by design).

S6 is static rather than runtime for a specific reason: `BESTIARY_ENTRIES` is module-private
(`js/bestiary.js:10`, never exported). `js/bestiary.js` *does* import cleanly into Node — its DOM
access is inside `initBestiary()`, not at module scope — but the array is not reachable through any
export, so the auditor parses it out of the source text. That is a parse job, not a reason to
bundle.

### Runtime checks (R-series)

All of these run against modules imported directly with `import()`. Nothing here needs a bundler.

| ID | Assertion | How | Verified today |
|---|---|---|---|
| R1 | `createAlienPreview(N)` returns a Group containing ≥1 Mesh | direct call | yes |
| R2 | **Parts actually move.** ≥40% of descendants change their *local* matrix or an animated material property across the sweep | snapshot `child.matrix.elements` + `emissiveIntensity`/`opacity`/`visible` | yes — clean types score 45–100%; with `userData` replaced, **all 13** score `0/N` |
| R3 | **No drift.** `alien.position.x`/`.z` constant across the sweep; `alien.scale` stays exactly 1 | direct read | yes — catches Octopus at 0.0600, all other types 0.0000 |
| R4 | **Swoop guard.** With `userData.isSwooping = true`, `alien.position.y` is unchanged by `animateAlien` | set flag, call, compare | yes |
| R5 | **No shared animated material.** Build two instances, animate only the first, assert none of the second's materials changed | material identity map | yes — 0 hits on every clean type; fires when instance B is forced to reuse A's materials (Octopus 2, Sentinel 17, Gyre 16, Mantis 1) |
| R6 | **Half-width.** `Box3.setFromObject` max\|x\| over the sweep. FAIL > 1.20, WARN > 1.00 | see table above | yes |
| R7 | No `NaN` in any transform at any sample | scan | trivial |
| R8 | **Flat-white bug.** Every mesh whose geometry has a `color` attribute has `material.vertexColors === true` | geometry attribute inspection | direct consequence of `buildVoxelGeometry`; precise |
| R9 | WARN if a mesh with >200 vertices has `emissiveIntensity > 1.5` | the Invader-whiteout heuristic | heuristic, WARN only |
| R10 | **The weapon actually flies.** Build a `COUNT`×1 formation, call `alienFire` until `getMissiles()[<array>]` is non-empty, then tick `update<Proj>s` and assert z increases monotonically, the array drains before 800 frames, and `resetMissiles` empties it | headless, direct import | yes — Mantis: fired on the 8th `alienFire` call, travelled monotonically +Z from z=-38.2, drained in 290 frames, `resetMissiles` cleared all eleven arrays |
| R11 | **Burst, not glow.** Minimum per-material duty cycle above half-peak. WARN > 25% | see above | yes — roster spans 1.7% (Scorpion) to 49.9% (Invader) |

R5's sensitivity scales with how many materials the type animates: the Mantis animates one, so the
sabotaged control fires exactly one hit. A type that animates none gets `0/0` and the check is
vacuous — report it as `n/a`, never as a pass.

R10 alone replaces three of the current manual B2/B3 checks and kills the single most expensive
failure mode in this codebase (`game.js` missing the update call → projectile hangs frozen, build
passes).

### What it prints

```
new-invader audit — type 12 "Mantis" (ambushSpurs), COUNT=13
[PASS] S1  ALIEN_ROWS = 13
[PASS] S2  CAPS.maxRows = 13
...
[FAIL] S12 js/game.js imports updateAmbushSpurs but never calls it
       FIX  In js/game.js, inside `export function update()`, add this line
            immediately after the line matching `updateVortexBolts(player, scene,`:
              updateAmbushSpurs(player, scene, gameActive, decreaseLives, gameOver);
       WHY  Without it the projectile spawns and hangs motionless. npm run build passes.
[WARN] R6  animated half-width 1.146 (roster range 0.509-1.282; >1.00 touches the
           neighbouring column at ALIEN_SPACING 2). Judge visually; not a failure.

20 pass, 1 fail, 1 warn
```

### How a weak agent acts on it

`steps/5-verify.md` gives four rules and nothing else:

1. Do exactly what the `FIX` line says. It names one file and one anchor. Change nothing else.
2. Re-run the audit. `FAIL` count must go down.
3. A `WARN` is never something you fix blindly. Report the number and move on, or ask.
4. If the same ID `FAIL`s twice in a row, stop hand-editing. Drop to Tier A and re-run
   `scaffold.mjs` with a catalog archetype for that payload.

The design rule for the auditor's authors: **every FAIL must be reducible to one file, one anchor,
one literal edit.** Anything that cannot be — half-width, colour, silhouette, "is this fun" — is a
WARN with a number and a comparison, never a FAIL. That is what keeps a weak model from thrashing
on a judgement call it cannot make.

---

## 6. Stale or incorrect content in the current skill

Each verified against the working tree as of this revision: type count **13**, through row 12
(Mantis); `ALIEN_ROWS` and `CAPS.maxRows` are both 13; the modulus is `row % 13`.

**Provenance.** Every claim below is tagged **[static]** (regex or grep over source) or
**[runtime]** (module imported into Node and exercised). The runtime claims were originally
measured through an esbuild bundle; after §6.11 was corrected, **all of them were re-measured with
plain `import` and no bundler**, and every one held. The numbers below are the re-measured ones.
Half-widths shifted by at most 0.03 between the two methods, in the direction of the offset sweep
finding slightly wider peaks because it samples phase more densely.

**6.1 — `SKILL.md` Step 1, the roster table. [static]**
Lists 10 rows, ending at Sentinel (9). The live roster is 13, through Warden (10), Gyre (11) and
Mantis (12). An agent trusting it would pick `N = 10` and collide with three existing types.
*Correction:* delete the table. Replace with `node scripts/audit.mjs --roster`, which reads
`BESTIARY_ENTRIES` in `js/bestiary.js:10` and prints name, row, weapon line and measured bounding
box per type. A generated roster cannot go stale — and this table went stale three times in the
time it took to write this document.

**6.2 — `SKILL.md` Step 0, the worked example column. [static]**
Says the grep printed `row % 9` when the Sentinel was added. It now prints `row % 13`
(`js/aliens.js:53`). Harmless in itself but it anchors a weak model on 9/10.
*Correction:* have `--roster` print the `N`/`COUNT` line directly, so there is no example to copy.

**6.3 — The half-width script in `references/voxel-modeling.md` slices to end-of-file. [static]**
`src.slice(at)` runs from the banner to the end of the file, so for any section that is not last it
measures every later type's boxes too — and `js/aliens.js` is **not** in row order (the Wasp banner
sits at line 1479, ahead of Invader, Scorpion, Sentinel, Warden, Gyre and Mantis). Bounded to its
own section versus what the documented script actually reports:

```
row  name       own section          doc script (banner -> EOF)
 0   Octopus     29 boxes  0.770       384 boxes  0.930
 1   Crab        29 boxes  0.870       355 boxes  0.930
 2   Squid       59 boxes  0.870       326 boxes  0.930
 4   Tank        41 boxes  0.750       267 boxes  0.930
 5   Beetle      26 boxes  0.930       226 boxes  0.930
 8   Wasp        40 boxes  0.920       200 boxes  0.920
 6   Invader     51 boxes  0.720       160 boxes  0.720
 7   Scorpion    30 boxes  0.650       109 boxes  0.650
 9   Sentinel    27 boxes  0.190        79 boxes  0.520
10   Warden      12 boxes  0.520        52 boxes  0.520
11   Gyre        14 boxes  0.230        40 boxes  0.230
12   Mantis      26 boxes  0.195        26 boxes  0.195   <- correct only because it is last
```

Run on the Octopus banner the script inspects 384 boxes, 355 of which belong to other types. It is
correct for exactly one section — whichever is currently last — which is also the only section an
agent following this skill would ever measure, which is why nobody has noticed.
*Correction:* slice to the next `\n// ---` banner. Better: delete the script; R6 supersedes it.

**6.4 — The same script under-reports for pivot-placed parts, by up to 6×. [static vs runtime]**
Documented as a known limitation, but the magnitude is not. Static (own-section) versus real
animated peak: Sentinel 0.190 vs **1.173**; Gyre 0.230 vs **1.146**; Mantis 0.195 vs **0.509**;
Warden 0.520 vs **1.196**. A weak agent reads "0.190, well under 0.95, OK" and ships a model
six times wider than it measured.
*Correction:* R6. The `Box3` sweep is exact and needs no per-model reasoning.

**6.5 — The 0.95 half-width budget is not a real constraint and nothing obeys it. [runtime]**
Stated in `SKILL.md` Step 2, `references/voxel-modeling.md` and `CLAUDE.md:101`. Measured animated
peaks: only Mantis (0.509), Tank (0.750), Invader (0.835) and Squid (0.931) are under 0.95. Nine of
thirteen exceed it — *including three of the four types built with this skill* (Sentinel 1.173,
Warden 1.196, Gyre 1.146). A gate that most successful runs violated is not a gate; it is noise
that trains the agent to ignore gates.
*Correction:* state the two real thresholds and their sources. Hard fail above **1.20** — the
player-missile collision sphere is `distance < 1.2` from `alien.position` at `js/missiles.js:270`,
so geometry outside it can be visually struck without registering a hit. Warn above **1.00** — half
of `ALIEN_SPACING` (2), where adjacent columns start to overlap visually. Print the roster table so
the number is judged in context rather than against a fiction.

**6.6 — "Never write `alien.scale` in `animateAlien()`" is violated by the Octopus today.
[static + runtime]**
`js/aliens.js:3250`, inside `case 0:`, does `alien.scale.set(breathScale, breathScale, breathScale)`.
The auditor measures 0.0600 residual scale drift for type 0 and exactly 0.0000 for every other type.
Meanwhile `updateTelegraph` (`js/aliens.js:4691`, `:4703-4705`) captures
`alien.userData.originalScale = alien.scale.clone()` at telegraph start and restores it afterwards —
so a swoop telegraph that starts mid-breath permanently rescales that Octopus.
*Correction:* keep the rule; it is right. Scope R3 to the new type only so the pre-existing
violation does not block a new invader, print it as a known-issue line, and file it separately.
The rule text should say "the Octopus violates this and has the bug the rule exists to prevent" —
a live counterexample teaches better than an abstraction.

**6.7 — "Row 3 (UFO) hull half-width is ~1.68". [runtime]**
In `references/voxel-modeling.md:75` and `CLAUDE.md:101`. Measured animated max\|x\| is **1.282** —
still the widest in the roster, but not by the margin claimed, and 1.68 does not correspond to
anything measurable at runtime. The same `CLAUDE.md` line says rows 0, 1 and 5 "may approach 0.95";
measured 1.244, 1.049 and 0.996 — they exceed it.
*Correction:* replace both sentences with the measured table. (This is a `CLAUDE.md` fix as well as
a skill fix.)

**6.8 — "Copy the shape of the Wasp section — it is the newest and most complete worked example."
[static]**
`references/voxel-modeling.md:4-5`. The Wasp is now four types old (Mantis is newest), and because
file order is not row order the instruction sits awkwardly next to `SKILL.md` Step 2's "append
after the last `// ---` banner comment", which points at the Mantis. Same issue for
`references/animation-rules.md:4` (`case 8: { // Wasp`) — that anchor still exists, but names a
stale example.
*Correction:* never hard-code the worked example. `--roster` prints the last banner and its line
range; the step file says "read the section `--roster` names as `newest`".

**6.9 — `grep -c "<array>" js/missiles.js` ≥ 6 is too loose to diagnose anything. [static]**
`SKILL.md` Step 5 and `references/verification.md`. A *correct* implementation scores 10 today
(`grep -c ambushSpurs` = 10, `vortexBolts` = 10). An implementation missing both the `resetMissiles`
reassignment and the `getMissiles` entry still scores 8 and passes the ≥6 gate. The Scorpion, which
really is missing its `getMissiles` entry, scores 9 — above the gate.
*Correction:* S7–S11 assert the six sites individually.

**6.10 — `references/wiring-checklist.md` row 12 calls `getMissiles()` "low-stakes, the export is
currently unused". [runtime]**
Under this design it becomes the auditor's observation port for R10, so it is load-bearing.
Separately, the row's own observation still holds: `venomDarts` is still missing from the object
returned at `js/missiles.js:1800` — confirmed in the live R10 run, whose output listed eleven
arrays and not that one — so the Scorpion is invisible to R10 until it is added.
*Correction:* promote row 12 to required, and fix `venomDarts` as a one-line drive-by.

**6.11 — CORRECTED. The "optional syntax-only check" in `references/verification.md:42-46` works
fine.** An earlier revision of this document claimed it "cannot work" because `package.json` has no
`"type": "module"`. That was wrong, and the reasoning was wrong in a way worth recording: Node 22
does not simply parse a typeless `.js` as CommonJS and give up. It attempts CommonJS, detects ESM
syntax, and **reparses as an ES module**, emitting `MODULE_TYPELESS_PACKAGE_JSON` on stderr whose
own text says so. Run from the repo root today:

```
$ node --input-type=module -e "import('./js/aliens.js').then(m => console.log('OK', Object.keys(m).length))"
OK 12
(node:17769) [MODULE_TYPELESS_PACKAGE_JSON] Warning: ... Reparsing as ES module because module
syntax was detected. This incurs a performance overhead.
```

The `three` and `three/addons/utils/BufferGeometryUtils.js` specifiers both resolve from
`node_modules` — three's `exports` map has `"./addons/*": "./examples/jsm/*"`. I also verified
`js/missiles.js` (18 exports), `js/barriers.js`, `js/levels.js`, `js/constants.js`, `js/voxel.js`,
`js/particles.js` and `js/bestiary.js` all import cleanly. So the missing `"type": "module"` costs
a stderr warning and some startup time, not correctness.

*What this changes beyond the paragraph:* §5's runtime lane was designed around esbuild bundling
because of this false belief. It has been rewritten. `scripts/lib/bundle.mjs` is deleted from the
design, esbuild is no longer a dependency of the auditor, and every R-series measurement was
re-run through direct `import` — including the full weapon harness, which needs **no** `window`
shim (I had added one defensively; `typeof window === 'undefined'` throughout and nothing throws).
*Correction to the skill:* keep the check, but as a `--selfcheck` inside `audit.mjs` rather than as
a loose optional command, and suppress the `MODULE_TYPELESS_PACKAGE_JSON` warning so no agent tries
to "fix" `package.json` (see §3, item 6).

**6.12 — Not stale, confirmed still good.** Worth recording so nobody "fixes" them:
- **All 26 wiring anchors in `references/wiring-checklist.md` still resolve to exactly one match**
  in their file — re-checked after the Mantis landed. The anchor discipline has now held across
  four type additions. This is why the scaffold can safely reuse them.
- The 10 files a type addition touches are exactly the 10 the checklist covers — no missing wiring
  point.
- The scoring note (row 15) is accurate: `js/missiles.js:281` is
  `Math.max(0, (6 - alien.userData.row) * 10)`, so every row ≥ 6 still scores 0.
- The Bestiary counter really does read `COUNT / COUNT` (`js/bestiary.js:367`).
- The Vite stale-watcher warning is worth keeping verbatim; it is corroborated by the user's own
  memory file and nothing about this restructure makes it less likely. Note that the headless
  auditor sidesteps it entirely — it reads the files on disk — which is an additional argument for
  making it the primary verification path and the browser the confirmation path.

---

## 7. Risks and what this does not solve

**The auditor cannot see.** R2 proves *something* moved; it cannot tell you the wingbeat looks
like a seizure, that the colour ramp reads as one grey mass, or that the silhouette is a worse
Beetle. Every genuinely aesthetic failure in this project's history — the Invader whiteout, the
Sentinel black-hole — would pass a clean audit. The browser lane stays mandatory at Tier B+ and the
report must state plainly when it was not run. Tiering makes the *mechanical* floor solid; it does
not raise the aesthetic floor at all.

**Tier A will produce boring invaders, by construction.** The catalog has ~6 archetypes; the roster
already has 13 types and the differentiation pressure only increases. Tier A is viable for maybe
four more invaders before every remaining archetype is used and it starts producing near-duplicates.
At that point Tier A should refuse rather than degrade — `scaffold.mjs` can check the chosen
archetype against `--roster` and exit 2. This is a real expiry date, not a hypothetical one.

**A scaffold is a new thing that can rot.** Anchors move; `js/aliens.js` grows ~250 lines per type.
Mitigations: `--dry-run`, anchor-uniqueness assertion before writing (exit 2 on 0 or ≥2 matches),
and an auditor that never trusts the scaffold. But a rotted scaffold that half-applies and then
fails is a worse starting state than a blank file, and recovering from it requires `git checkout`
of ten files — which a weak agent will not think to do. `SKILL.md` must say: **if scaffold exits
non-zero, run `git diff --stat` and revert every file it touched before retrying.**

**Headless Node is not the browser.** R1–R11 run without WebGL, without bloom, without the
`EffectComposer`, and with phase driven by `animationOffset` rather than real frame pacing. A model
that audits clean can still render flat white through a path R8 does not model, or blow out under
`UnrealBloomPass` in a way nothing headless can detect. The auditor is a floor, not a proof.

**The offset sweep is not a frame loop.** Anything written to accumulate per frame — the tank-tread
delta pattern `CLAUDE.md` documents — does not cycle under an offset sweep and will produce
misleading R6/R11 numbers unless the auditor detects it (§5). This is the one place where the
headless harness silently models the wrong thing rather than simply seeing less, so it is the
place to be most careful.

**I got §6.11 wrong in the first revision of this document**, and the failure mode is worth naming
because it applies to any agent using this skill: I reasoned from a general fact about Node module
resolution instead of running the one-line command that would have settled it, then built a whole
subsystem (an esbuild bundling lane) on top of the wrong conclusion. The bundled path did work, so
nothing downstream contradicted me and I got no feedback signal. This is exactly the class of error
the auditor exists to catch in the game code, and there is no equivalent guard on the design work
itself.

**The three creative payloads are still where all the difficulty lives**, and no amount of tiering
makes a small model good at them. This design's honest claim is narrower than "any agent can add an
invader": it is that any agent that can run Node can now either produce a *correctly wired* invader
or *find out that it did not* — and that the second outcome, reported accurately, is the one the
current skill fails to guarantee.

**Concurrency.** Two agents adding types simultaneously both read `COUNT` from the same modulus and
both scaffold `case N:`. The scaffold's idempotence check catches the second one only after the
first has written. There is no locking here and this design does not add one; the mitigation is
procedural (one invader at a time), which is exactly the kind of rule that gets ignored.

**Maintenance cost is real.** Two scripts, three catalog files and four reference files is more
surface than one SKILL.md and five references. (One fewer script than the first revision proposed,
now that the bundler is gone — but still more.) It is justified only if the scripts are run — if the
auditor bit-rots because nobody runs it for six months, the next agent inherits a script that fails
for reasons unrelated to its work and will, correctly, ignore it. Recommend the auditor be run in
CI, or at minimum that `--selfcheck` be part of the router so a rotted script aborts loudly at
step 0 rather than quietly at step 7.
