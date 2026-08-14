#!/usr/bin/env node
// Record an invader's animation to video, headlessly.
//
//   node record-invader.mjs <TYPE_ID> <NAME> [SECONDS]
//   node record-invader.mjs 13 VOIDWORM 9
//
// Writes clips/<NAME>.webm and clips/<NAME>.mp4. Record at least one full
// animation period (find `period` in the case N branch of animateAlien) or the
// clip misrepresents the motion — the same trap that makes a short screenshot
// burst report "no animation".
//
// Uses Playwright's built-in recorder, so it captures real frame timing rather
// than stitched stills.

import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, renameSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [, , idArg, nameArg, secArg] = process.argv;
if (idArg === undefined) {
  console.error('usage: node record-invader.mjs <TYPE_ID> <NAME> [SECONDS]');
  process.exit(2);
}
const ID = Number(idArg);
const NAME = (nameArg || `type${ID}`).toUpperCase();
const SECONDS = Number(secArg || process.env.SECONDS || 9);
const URL = process.env.GAME_URL || 'http://127.0.0.1:5173/';
const EXE = process.env.CHROME_PATH ||
  '/home/nova/.cache/ms-playwright/chromium-1234/chrome-linux/chrome';
const OUT = 'clips';
const TMP = 'clips/.raw';

for (const d of [OUT, TMP]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});

// Record only the model area — the info panel and starfield waste bitrate.
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: TMP, size: { width: 1280, height: 800 } },
});
const page = await ctx.newPage();

let ok = false;
try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.keyboard.press('b');
  await page.waitForTimeout(1500);
  for (let i = 0; i < ID; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1000);

  const shown = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  ok = shown.toUpperCase().includes(NAME);

  await page.waitForTimeout(SECONDS * 1000); // this stretch is the recording
} finally {
  await ctx.close();   // finalises the webm
  await browser.close();
}

const raw = readdirSync(TMP).filter((f) => f.endsWith('.webm')).sort();
if (!raw.length) {
  console.error('  no video produced');
  process.exit(1);
}
const webm = `${OUT}/${NAME}.webm`;
renameSync(`${TMP}/${raw[raw.length - 1]}`, webm);

let mp4 = '';
try {
  mp4 = `${OUT}/${NAME}.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm,
    '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', mp4]);
} catch (e) {
  mp4 = '';
  console.error(`  mp4 convert failed: ${String(e).slice(0, 120)}`);
}

console.log(`  recorded ${SECONDS}s -> ${webm}${mp4 ? ` and ${mp4}` : ''}`);
console.log(`  bestiary shows "${NAME}": ${ok ? 'YES' : 'NO — check the ID'}`);
process.exit(ok ? 0 : 1);
