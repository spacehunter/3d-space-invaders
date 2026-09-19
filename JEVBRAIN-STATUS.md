# JEVBRAIN-STATUS.md

## What it is
Optional AI autopilot for the interceptor, integrated 2026-09-19, powered by
**Jev** (TypeSafe AI's System One decision model — structured state in, typed
probabilistic decisions out). This is a *decision-maker integration*, not an
image-generation thing: Jev never writes text, it answers typed questions
(noul = probability, choice = distribution over options, score = weighted rubric).

- Module: `js/jev-brain.js` (self-contained, ~330 lines)
- Hooked: `js/game.js` (movement + auto-fire seams), `js/main.js` (init)
- Proxy: `vite.config.js` `/jev-api` → `https://api.typesafe.ai` with the key
  added server-side from `TYPESAFE_API_KEY` (never reaches the browser)
- Test: `scripts/test-jev-brain.py` (Playwright, headless, graded numerically)

## Feature flag
Default OFF — human play is byte-identical to before (`jevBrainAct()` returns
null; verified). Turn on with **J** in-game, or `localStorage.spaceInvaders3D_jevBrain='1'`,
or `?jev=1`. Badge HUD top-left shows engine, decision, danger, confidence, ms.

## Two engines
- **heuristic** (always available): lane-cost dodge math + nearest-alien aim/track.
  Proven live: score 550→660 in 18s, ship swept x −8.4 → +12.0, 0 page errors.
- **cloud** (needs TypeSafe early-access key): ONE Jev call per 250ms tick with
  3 parallel questions — `danger` (Score, 4 levels), `dodge_lane` (Choice over
  5 fixed lanes), `fire` (Noul). Confidence-gated: below 0.40 or on any error it
  defers to the heuristic. Heuristic is applied immediately each tick so cloud
  latency (≤1.2s timeout) never stalls the ship.
- Engine pick is automatic: probe `GET /jev-api/v1/models`; 200 ⇒ cloud, else
  heuristic (403 "Must supply an API key!" confirmed reaching the real API
  without a key). ≥5 consecutive failures demotes back to heuristic.

## To go cloud-live
Put `TYPESAFE_API_KEY=*** in `3d-space-invaders/.env` (gitignored pattern
already excludes it? — check; add if not) and restart vite. Nothing else changes.
Cost ≈ $0.08/hour of play at 4 req/s (their own Doom-demo math).

## Status
Verified working in heuristic mode. Cloud mode is code-complete and
feature-detects itself; untested against a live key (no key on this machine
as of 2026-09-19 — the probe confirmed the proxy path end-to-end instead).
