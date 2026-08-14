#!/usr/bin/env node
// Screenshot one invader from the in-game Bestiary, headlessly.
//
// The point: "does it look good" cannot be checked by grepping code. This
// renders the actual model in the actual game and writes PNGs you (or a vision
// model) can judge.
//
//   node capture-invader.mjs <TYPE_ID> [NAME]
//   node capture-invader.mjs 11 SPIRE
//
// Writes to shots/<NAME>-<n>.png. Takes several frames a beat apart so the
// animation can be judged, not just the rest pose.
//
// Requires the dev server on :5173  (npm run dev -- --host 0.0.0.0)

import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [, , idArg, nameArg] = process.argv;
if (idArg === undefined) {
  console.error('usage: node capture-invader.mjs <TYPE_ID> [NAME]');
  process.exit(2);
}
const ID = Number(idArg);
const NAME = (nameArg || `type${ID}`).toUpperCase();
const URL = process.env.GAME_URL || 'http://127.0.0.1:5173/';
const EXE =
  process.env.CHROME_PATH ||
  '/home/nova/.cache/ms-playwright/chromium-1234/chrome-linux/chrome';
const FRAMES = Number(process.env.FRAMES || 10);
const GAP_MS = Number(process.env.GAP_MS || 750);
const OUT = 'shots';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: EXE,
  args: [
    '--no-sandbox',
    // WebGL in headless needs a software rasteriser on this box (no X display).
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500); // let three.js build the scene

  // Open the Bestiary. Keyboard is more robust than hunting for the button.
  await page.keyboard.press('b');
  await page.waitForTimeout(1500);

  // Entries are 1-indexed on screen; type ID 0 is entry 1.
  for (let i = 0; i < ID; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200); // settle on the entry

  // Confirm we landed on the right one before believing the screenshot.
  const shown = await page.evaluate(() => document.body.innerText.slice(0, 4000));
  const onEntry = shown.toUpperCase().includes(NAME);

  for (let f = 1; f <= FRAMES; f++) {
    await page.screenshot({ path: `${OUT}/${NAME}-${f}.png` });
    if (f < FRAMES) await page.waitForTimeout(GAP_MS);
  }

  // Audit trail: written here, at run time, with hashes of the real bytes.
  const hashes = [];
  for (let f = 1; f <= FRAMES; f++) {
    try {
      const b = readFileSync(`${OUT}/${NAME}-${f}.png`);
      hashes.push(createHash('sha256').update(b).digest('hex').slice(0, 12));
    } catch { hashes.push('MISSING'); }
  }
  appendFileSync('.vision-audit.log',
    `${new Date().toISOString()}\tCAPTURE\t${NAME}\tid=${ID}\tframes=${FRAMES}`
    + `\tgap=${GAP_MS}ms\tspan=${((FRAMES - 1) * GAP_MS / 1000).toFixed(1)}s`
    + `\tonEntry=${onEntry}\tsha=${hashes.join(',')}\n`);
  console.log(`  captured ${FRAMES} frames -> ${OUT}/${NAME}-1..${FRAMES}.png`);
  console.log(`  bestiary shows "${NAME}": ${onEntry ? 'YES' : 'NO — check the ID'}`);
  const counter = (shown.match(/(\d+)\s*\/\s*(\d+)/) || [])[0];
  if (counter) console.log(`  entry counter: ${counter}`);
  if (errors.length) {
    console.log(`  page errors (${errors.length}):`);
    errors.slice(0, 5).forEach((e) => console.log(`    ${e.slice(0, 140)}`));
  }
  process.exit(onEntry ? 0 : 1);
} catch (err) {
  console.error(`  capture failed: ${String(err).slice(0, 300)}`);
  process.exit(1);
} finally {
  await browser.close();
}
