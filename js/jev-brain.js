// JEV BRAIN — optional AI autopilot for the interceptor, powered by TypeSafe
// Jev (a System One decision model: structured state in, typed probabilistic
// decisions out — https://docs.typesafe.ai).
//
// FEATURE FLAG (default OFF, human plays normally):
//   - press J in-game to toggle
//   - or localStorage.spaceInvaders3D_jevBrain = '1'
//   - or ?jev=1 / ?jev=0 on the URL
//
// Two engines, same interface (see heuristics.think() vs cloud.think()):
//   cloud      — one POST per tick to /jev-api/v1/systemone (Vite dev proxy
//                adds the Authorization header from .env TYPESAFE_API_KEY;
//                the key never reaches browser code). Returns calibrated
//                probabilities + confidence.
//   heuristic  — deterministic local math. Always available; also used as the
//                confidence-gated fallback when Jev is unsure (< 0.40), and
//                as the automatic fallback when the API is unconfigured.
//
// Hard-won project pitfall honored here: getMissiles().missiles is the
// PLAYER's own bullets — enemy fire is everything else in that object.

import { getAliens } from './aliens.js';
import { getMissiles } from './missiles.js';
import { getCurrentBoss } from './boss.js';

// ---------------------------------------------------------------- constants

const TICK_MS = 250;            // one decision every 250ms (4 req/s ≈ $0.08/h on Jev)
const CLOUD_TIMEOUT_MS = 1200;  // give up fast on a cloud tick, keep last action
const LOW_CONFIDENCE = 0.40;    // below this, cloud defers to the heuristic
const THREAT_RADIUS = 1.6;      // world-x units: "this projectile can hit me"
const DANGER_HORIZON_MS = 1400; // only projectiles arriving within this count
const PLAYER_HALF = 0.9;        // interceptor half-width
const WORLD_HALF = 12;          // updatePlayer() clamps x to ±12
const ENEMY_MISSILE_KEYS = [    // everything in getMissiles() EXCEPT the player's
    'alienMissiles', 'ufoMissiles', 'webBombs', 'blasterBolts', 'venomDarts',
    'waspNeedles', 'prismLances', 'haloWaves', 'crystalShards', 'serpentineBeams',
    'fractalSpores', 'ravenNeedles', 'nexusSpirals', 'prismBeams',
    'basiliskBlades', 'mantaRays',
];

const MOVE_TO_X = {
    far_left: -9, left: -4.5, center: 0, right: 4.5, far_right: 9,
};

// ------------------------------------------------------------------- state

let active = new URLSearchParams(location.search).get('jev') === '1' ||
    (localStorage.getItem('spaceInvaders3D_jevBrain') === '1' &&
     new URLSearchParams(location.search).get('jev') !== '0');

let engine = 'heuristic';          // 'heuristic' | 'cloud'
let cloudProbed = false;
let cloudProbePromise = null;
let lastThinkAt = 0;
let thinkInFlight = false;
let pendingStats = { cloudCalls: 0, cloudOk: 0, fallbacks: 0, cloudMs: 0 };

// The action applied every frame (game.js reads this synchronously).
let action = { moveX: 0, fire: false };
let hud = { engine: 'heuristic', decision: 'standby', danger: 0, conf: 0, ms: 0 };

// ------------------------------------------------------------ state digest

// Collect the world into plain numbers once per tick; both engines read this.
function digest(player) {
    const t0 = performance.now();
    const threats = [];

    const all = getMissiles();
    for (const key of ENEMY_MISSILE_KEYS) {
        const arr = all[key];
        if (!Array.isArray(arr)) continue;
        for (const m of arr) {
            if (!m || m.visible === false || !m.position) continue;
            // Halo waves kill near the RIM only; a wave centred far off our
            // x with us near its centre is safe, so use its centre x as the
            // threat x and let the radius test do the rest.
            const dz = player.position.z - m.position.z;
            if (dz < 0 || dz > 40) continue;
            // Projectiles travel +z at roughly 0.5 world units per frame.
            const eta = dz / (0.5 * 60) * 1000;
            if (eta > DANGER_HORIZON_MS) continue;
            threats.push({
                x: m.position.x, z: m.position.z, eta: Math.round(eta), kind: key,
            });
        }
    }

    const aliens = getAliens();
    let alive = 0, frontZ = -999, swooping = 0, nearest = null, nearestDx = Infinity;
    for (const a of aliens) {
        if (!a || a.userData?.destroyed || a.visible === false) continue;
        alive++;
        if (a.position.z > frontZ) frontZ = a.position.z;
        if (a.userData?.isSwooping) swooping++;
        const d = Math.abs(a.position.x - player.position.x);
        if (d < nearestDx) { nearestDx = d; nearest = a; }
    }

    const boss = getCurrentBoss?.() || null;
    const d = {
        playerX: player.position.x,
        playerZ: player.position.z,
        threats: threats.slice(0, 12),
        alive, frontZ: Math.round(frontZ), swooping,
        columnClear: !nearest,          // nothing roughly above us to shoot at
        targetX: nearest ? nearest.position.x : null,
        boss: boss ? { name: boss.name || 'boss' } : null,
        score: +(document.getElementById('score')?.textContent || 0),
        lives: +(document.getElementById('lives')?.textContent || 0),
        thinkMs: Math.round(performance.now() - t0),
    };
    d.imminent = d.threats.filter(t =>
        Math.abs(t.x - d.playerX) < THREAT_RADIUS + PLAYER_HALF);
    return d;
}

// -------------------------------------------------------- heuristic engine

// Same decisions as the cloud questions, computed with plain math.
// Threats present -> pick the cheapest dodge lane. Nothing incoming ->
// aim mode: slide under the nearest target and shoot it.
function thinkLocal(d) {
    // danger: count and earliness of threats able to reach our x
    const soon = d.imminent.filter(t => t.eta < 700).length;
    const danger = Math.min(1,
        (soon * 0.45 + d.imminent.length * 0.2 + d.swooping * 0.15));

    let lane, moveX, fire;
    if (d.imminent.length > 0) {
        // dodge: sample candidate lanes, score each by incoming threat mass
        const lanes = [
            ['far_left', -9], ['left', -4.5], ['center', 0], ['right', 4.5], ['far_right', 9],
        ];
        let best = null, bestCost = Infinity;
        for (const [name, x] of lanes) {
            let cost = 0;
            for (const t of d.threats) {
                const reach = PLAYER_HALF + THREAT_RADIUS;
                const miss = Math.abs(t.x - x);
                if (miss < reach) cost += (1 - miss / reach) * (1 - t.eta / DANGER_HORIZON_MS) * 2;
            }
            cost += Math.abs(x - d.playerX) * 0.02;      // prefer cheaper slides
            if (d.swooping > 0 && Math.abs(x) > 7) cost += 0.5;  // keep mid-field vs kamikaze
            if (cost < bestCost) { bestCost = cost; best = name; }
        }
        lane = best;
        moveX = MOVE_TO_X[best] / WORLD_HALF;
        // shoot while dodging only if the lane happens to line up on a target
        fire = danger < 0.75 && d.targetX !== null &&
            Math.abs(MOVE_TO_X[best] - d.targetX) < 1.4;
    } else if (d.targetX !== null) {
        // aim mode: track the nearest alien overhead
        lane = 'aim';
        moveX = Math.max(-1, Math.min(1, d.targetX / WORLD_HALF));
        fire = Math.abs(d.playerX - d.targetX) < 0.7;    // lined up (one column)
    } else {
        lane = 'center';
        moveX = 0;
        fire = false;
    }

    return {
        danger,                       // 0..1 continuous severity
        lane,
        fire,
        confidence: 0.99,             // deterministic, so fully "sure"
        moveX,
    };
}

// ----------------------------------------------------------- cloud engine

// One Jev call, several typed questions, sampled in parallel — the exact
// pattern from the TypeSafe docs. Output is type-checked, never a string.
function jevRequest(d) {
    const laneDesc = {};
    for (const k of Object.keys(MOVE_TO_X)) laneDesc[k] = null;
    return {
        model: 'jev-latest',
        state: {
            game: '3D Space Invaders, third-person. I pilot a ship at z=' + d.playerZ +
                ', x clamped to ±12. Enemy fire travels toward me (+z).',
            player: { x: +d.playerX.toFixed(2), lives: d.lives, score: d.score },
            incoming_fire: d.threats.map(t =>
                ({ x: +t.x.toFixed(2), z: +t.z.toFixed(2), kind: t.kind, ms_until_reach_my_row: t.eta })),
            formation: { alive: d.alive, front_z: d.frontZ, kamikaze_diving: d.swooping },
            something_directly_ahead: !d.columnClear,
            boss_fight: !!d.boss,
        },
        questions: {
            danger: {
                type: 'score',
                instructions: 'How dangerous is my current position, given the incoming fire?',
                criteria: [
                    'Safe: nothing can reach my row soon',
                    'Tense: some fire nearby, plenty of time',
                    'Dangerous: something will reach my row within ~0.7s unless I move',
                    'Critical: unavoidable or unavoidable-looking doom closing in',
                ],
            },
            dodge_lane: {
                type: 'choice',
                instructions: 'Which lane should my ship move to right now to maximize survival? Lanes are fixed world-x positions: far_left=-9, left=-4.5, center=0, right=+4.5, far_right=+9.',
                criteria: laneDesc,
            },
            fire: {
                type: 'noul',
                instructions: 'Is it safe and worth it to fire a missile this tick?',
            },
        },
    };
}

async function thinkCloud(d) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLOUD_TIMEOUT_MS);
    const t0 = performance.now();
    try {
        const res = await fetch('/jev-api/v1/systemone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jevRequest(d)),
            signal: ctrl.signal,
        });
        pendingStats.cloudCalls++;
        if (!res.ok) throw new Error('jev http ' + res.status);
        const body = await res.json();
        const ms = Math.round(performance.now() - t0);
        pendingStats.cloudOk++;
        pendingStats.cloudFails = 0;
        pendingStats.cloudMs = ms;

        const local = thinkLocal(d);
        const ans = body.answers || {};
        const sure = (a) => a && typeof a.confidence === 'number'
            ? a.confidence >= LOW_CONFIDENCE : true;

        const lane = ans.dodge_lane;
        const danger = ans.danger;
        const fire = ans.fire;

        if (lane?.choice && MOVE_TO_X[lane.choice] !== undefined && sure(lane)) {
            const nLevels = danger?.probabilities ? Object.keys(danger.probabilities).length : 4;
            const out = {
                // Score answers are probability-weighted level indices; normalise.
                danger: typeof danger?.score === 'number'
                    ? Math.min(1, danger.score / Math.max(1, nLevels - 1))
                    : local.danger,
                lane: lane.choice,
                fire: typeof fire?.noul === 'number'
                    ? fire.noul > 0.5 : local.fire,
                confidence: lane.confidence ?? 1,
                moveX: MOVE_TO_X[lane.choice] / WORLD_HALF,
                fromCloud: true,
            };
            hud = { engine: 'cloud', decision: lane.choice, danger: out.danger, conf: out.confidence, ms };
            return out;
        }
        pendingStats.fallbacks++;
        hud = { engine: 'cloud', decision: 'fallback(low-conf)', danger: local.danger, conf: lane?.confidence ?? 0, ms };
        return { ...local, fromCloud: false };
    } catch (err) {
        pendingStats.cloudCalls++;
        pendingStats.cloudFails = (pendingStats.cloudFails || 0) + 1;
        // dead key / endpoint: demote after repeated failures so we stop
        // paying timeouts every tick
        if (engine === 'cloud' && pendingStats.cloudFails >= 5) {
            engine = 'heuristic';
        }
        const local = thinkLocal(d);
        hud = { engine, decision: 'fallback(' + (err.message || 'err') + ')', danger: local.danger, conf: local.confidence, ms: Math.round(performance.now() - t0) };
        return { ...local, fromCloud: false };
    } finally {
        clearTimeout(timer);
    }
}

// One decision cycle; heuristic answer is applied immediately so the ship
// never waits on network latency.
async function think(player) {
    if (thinkInFlight) return;
    thinkInFlight = true;
    try {
        const d = digest(player);
        const local = thinkLocal(d);
        action = { moveX: local.moveX, fire: local.fire };
        if (engine === 'cloud') {
            const out = await thinkCloud(d);
            // Cloud answer (when it actually answered) supersedes the
            // provisional heuristic action from ~250ms ago.
            if (out.fromCloud) action = { moveX: out.moveX, fire: out.fire };
        } else {
            hud = { engine: 'heuristic', decision: local.lane, danger: local.danger, conf: 1, ms: d.thinkMs };
        }
    } finally {
        thinkInFlight = false;
        lastThinkAt = performance.now();
    }
}

// ------------------------------------------------------------------- probe

// First activation with no proof of the API: one cheap unauthenticated probe.
// 200/401 (reached the real API) => cloud; anything else => heuristic forever.
function probeCloud() {
    if (cloudProbePromise) return cloudProbePromise;
    cloudProbePromise = fetch('/jev-api/v1/models', { method: 'GET' })
        // Only a 200 means a working key is configured. 401/403 = the API is
        // reachable but unauthenticated -> heuristic now, skip 1.2s timeouts.
        .then(r => { engine = r.status === 200 ? 'cloud' : 'heuristic'; })
        .catch(() => { engine = 'heuristic'; })
        .finally(() => { cloudProbed = true; });
    return cloudProbePromise;
}

// -------------------------------------------------------------------- HUD

let hudEl = null;
function drawHud() {
    if (!hudEl) return;
    const e = pendingStats;
    hudEl.textContent =
        `JEV BRAIN  ${active ? 'ON' : 'off'} [${hud.engine}]  → ${hud.decision}  ` +
        `danger ${(hud.danger ?? 0).toFixed(2)}  conf ${(hud.conf ?? 0).toFixed(2)}  ${hud.ms}ms` +
        (e.cloudCalls ? `  cloud ${e.cloudOk}/${e.cloudCalls}${e.fallbacks ? ' fb' + e.fallbacks : ''}` : '');
}

// ----------------------------------------------------------- public seams

// Called by game.js every frame while gameActive. Returns the action to use
// INSTEAD of mouse input; returns null when the flag is off.
export function jevBrainAct(player) {
    if (!active) return null;
    const now = performance.now();
    if (now - lastThinkAt >= TICK_MS) think(player);   // async; provisional action applied now
    drawHud();
    return action;
}

export function isJevBrainActive() {
    return active;
}

export function setJevBrain(on) {
    active = !!on;
    localStorage.setItem('spaceInvaders3D_jevBrain', active ? '1' : '0');
    if (active && !cloudProbed) probeCloud();
    hud = { ...hud, engine };
    return active;
}

// Install: badge + J hotkey. Safe to call twice; idempotent.
export function initJevBrain() {
    if (hudEl) return;
    hudEl = document.createElement('div');
    hudEl.id = 'jevBrainHud';
    hudEl.style.cssText =
        'position:fixed;top:8px;left:8px;z-index:60;font:11px/1.4 monospace;' +
        'color:#7fffd4;background:rgba(0,10,20,.55);padding:4px 8px;border:1px solid #155;' +
        'border-radius:4px;pointer-events:none;opacity:0;transition:opacity .3s';
    document.body.appendChild(hudEl);

    window.addEventListener('keydown', (ev) => {
        if (ev.code === 'KeyJ' && !ev.repeat) {
            setJevBrain(!active);
            hudEl.style.opacity = '1';
        }
    });
    if (active) { hudEl.style.opacity = '1'; probeCloud(); }
    setInterval(() => { if (!active) drawHud(); }, 500);
}
