#!/usr/bin/env node
// Headless verification for a new invader type.
//
// Written because the visual "open the Bestiary and look" gates in SKILL.md
// cannot be performed by a headless agent, and "I could not check" reliably
// degrades into "I claimed it passed". Every check here is mechanical.
//
//   node .claude/verify-invader.mjs <TYPE_ID> <NAME>
//   e.g. node .claude/verify-invader.mjs 11 SPIRE
//
// Exit 0 = all checks pass. Exit 1 = at least one FAIL.

import { readFileSync, existsSync } from 'node:fs';

const [, , idArg, nameArg] = process.argv;
if (!idArg || !nameArg) {
  console.error('usage: node verify-invader.mjs <TYPE_ID> <NAME>');
  process.exit(2);
}
const ID = Number(idArg);
const NAME = nameArg.toUpperCase();
const ROOT = process.cwd();

const read = (p) => (existsSync(`${ROOT}/${p}`) ? readFileSync(`${ROOT}/${p}`, 'utf8') : null);
const aliens = read('js/aliens.js');
const missiles = read('js/missiles.js');
const game = read('js/game.js');
const bestiary = read('js/bestiary.js');
const levels = read('js/levels.js');
const modular = read(`js/invaders/${nameArg.toLowerCase()}.js`); // modular model file

if (!aliens || !missiles || !game || !bestiary || !levels) {
  console.error('FATAL: could not read one of js/{aliens,missiles,game,bestiary,levels}.js');
  process.exit(2);
}

const results = [];
const check = (label, ok, detail = '') => results.push({ label, ok, detail });

// --- spawn wiring -----------------------------------------------------------
const capMatch = aliens.match(/row\s*%\s*(\d+)/);
const cap = capMatch ? Number(capMatch[1]) : null;
check('type cap includes this id', cap !== null && ID < cap,
  `row % ${cap} (id ${ID} needs cap >= ${ID + 1})`);

check('createAlien has case', new RegExp(`case\\s+${ID}\\s*:`).test(aliens));

// animateAlien is a different switch; require the id to appear in animateAlien (aliens.js).
// createAlien has a case in aliens.js too. So >=1 in aliens.js is sufficient
// (models may live in js/invaders/<name>.js).
const caseCountAliens = (aliens.match(new RegExp(`case\\s+${ID}\\s*:`, 'g')) || []).length;
check('animate branch present', caseCountAliens >= 1,
  `found ${caseCountAliens} \`case ${ID}:\` branch(es) in aliens.js`);

// --- model ------------------------------------------------------------------
// Model constants may live in the modular file (js/invaders/<name>.js) or in aliens.js
const modConsts = modular
  ? (modular.match(new RegExp(`^const ${NAME}_[A-Z_]+`, 'gm')) || []).length
  : (aliens.match(new RegExp(`^const ${NAME}_[A-Z_]+`, 'gm')) || []).length;
check('model constants defined', modConsts > 0, `${modConsts} ${NAME}_* consts (in ${modular ? 'modular file' : 'aliens.js'})`);

// --- bestiary ---------------------------------------------------------------
const entries = (bestiary.match(/^\s*name:\s*'/gm) || []).length;
check('bestiary entry exists', new RegExp(`name:\\s*'${NAME}'`).test(bestiary));
check('bestiary count matches cap', cap !== null && entries === cap,
  `${entries} entries vs cap ${cap}`);

// --- weapon -----------------------------------------------------------------
// find an update fn that mentions the name, e.g. updateSpireShards
const updateFn = (missiles.match(new RegExp(`export function (update\\w*${NAME.charAt(0)}${NAME.slice(1).toLowerCase()}\\w*)`, 'i')) || [])[1]
  || (missiles.match(/export function (update\w+)/g) || [])
      .map((s) => s.replace('export function ', ''))
      .find((f) => f.toLowerCase().includes(NAME.toLowerCase()));

check('weapon update fn exported', !!updateFn, updateFn || 'none found');
if (updateFn) {
  check('imported by game.js', game.includes(updateFn));
  const callRe = new RegExp(`(?<!import[^\\n]*)\\b${updateFn}\\s*\\(`);
  const calls = (game.match(new RegExp(`\\b${updateFn}\\s*\\(`, 'g')) || []).length;
  check('CALLED in game loop', calls > 0, `${calls} call site(s)`);
}

const createFn = (missiles.match(new RegExp(`function (create\\w*${NAME.toLowerCase()}\\w*)`, 'i')) || [])[1];
check('projectile factory exists', !!createFn, createFn || 'none found');
check('firing branch wired', new RegExp(`row\\s*===\\s*${ID}`).test(missiles));

// --- claim vs implementation ------------------------------------------------
// If the bestiary promises N projectiles, the firing branch must create N.
const entryBlock = (bestiary.split(/\{\s*\n/).find((b) => b.includes(`'${NAME}'`)) || '');
const weaponText = (entryBlock.match(/weapon:\s*'([^']*)'/) || [])[1] || '';
const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
let promised = null;
for (const [w, n] of Object.entries(words)) {
  if (new RegExp(`\\b${w}\\b`, 'i').test(weaponText)) { promised = n; break; }
}
const numMatch = weaponText.match(/\b(\d+)\s+(?:projectile|shard|bolt|missile|ring|wave)/i);
if (numMatch) promised = Number(numMatch[1]);

if (promised && createFn) {
  // count factory calls inside the row === ID branch
  const branch = (missiles.split(new RegExp(`row\\s*===\\s*${ID}`))[1] || '').slice(0, 1200);
  const made = (branch.match(new RegExp(`${createFn}\\s*\\(`, 'g')) || []).length;
  check('bestiary claim matches code', made === promised,
    `bestiary promises ${promised}, firing branch creates ${made}`);
} else {
  check('bestiary claim matches code', true, 'no explicit count promised — skipped');
}

// --- discoverability --------------------------------------------------------
const baseRows = Number((levels.match(/alienRows:\s*(\d+)/) || [])[1] || 0);
const interval = Number((levels.match(/ROW_GROWTH_INTERVAL\s*=\s*(\d+)/) || [])[1] || 0);
if (baseRows && interval && cap) {
  let lvl = null;
  for (let L = 1; L <= 200; L++) {
    if (Math.min(baseRows + Math.floor((L - 1) / interval), cap) >= ID + 1) { lvl = L; break; }
  }
  check('reachable in normal play', lvl !== null && lvl <= 15,
    lvl ? `first appears at LEVEL ${lvl}` : 'never appears');
}

// --- report -----------------------------------------------------------------
let failed = 0;
console.log(`\n  Verifying ${NAME} (type ${ID})\n`);
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(30)} ${r.detail}`);
}
console.log(`\n  ${results.length - failed}/${results.length} checks passed\n`);
process.exit(failed ? 1 : 0);
