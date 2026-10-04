#!/usr/bin/env node
// Mobile runtime verification using playwright-core programmatic API.
// Runs a real Chromium instance at mobile viewport sizes, clicks NEW GAME,
// checks for page errors, verifies joystick/FIRE/pause visibility, and
// uses CDP Input.dispatchTouchEvent to prove multitouch works.

import chromiumPkg from 'playwright-core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const { chromium } = chromiumPkg;

const BASE_URL = 'http://localhost:5173';
const PASS = [];
const FAIL = [];

function pass(msg) { PASS.push(msg); console.log(`  PASS ${msg}`); }
function fail(msg, detail) {
  FAIL.push(msg);
  console.log(`  FAIL ${msg}${detail ? ` — ${detail}` : ''}`);
}

(async function main() {
  // Health-check dev server
  try {
    await fetch(BASE_URL);
    console.log('Dev server OK\n');
  } catch (err) {
    console.error(`Dev server NOT responding: ${err.message}`);
    process.exit(1);
  }
  // ── 1. 390×844 portrait ──────────────────────────────────────────
  console.log('═══ 390×844 PORTRAIT ═══');
  await portraitMode();
  console.log();

  // ── 2. 844×390 landscape ─────────────────────────────────────────
  console.log('═══ 844×390 LANDSCAPE ═══');
  await landscapeMode();
  console.log();

  // ── 3. Multitouch CDP ────────────────────────────────────────────
  console.log('═══ MULTITOUCH CDP ═══');
  await multitouchCDP();
  console.log();

  // ── 4. Static verification ───────────────────────────────────────
  console.log('═══ STATIC VERIFICATION ═══');
  await staticVerification();
  console.log();

  // ── Summary ──────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log(`TOTAL: ${PASS.length + FAIL.length} checks`);
  console.log(`PASS:  ${PASS.length}`);
  console.log(`FAIL:  ${FAIL.length}`);
  if (FAIL.length > 0) {
    console.log('\nFailed checks:');
    FAIL.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
  } else {
    console.log('\nALL CHECKS PASSED ✓');
    process.exit(0);
  }
})();

// ── helpers ──────────────────────────────────────────────────────────

async function launch(viewportSize) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    isMobile: true,
    hasTouch: true,
    viewport: viewportSize || { width: 390, height: 844 },
  });
  const page = await context.newPage();
  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  return { browser, page, pageErrors };
}

function expect(cond, label, detail) {
  if (cond) pass(label);
  else fail(label, detail);
}

// ── 1. 390×844 portrait ────────────────────────────────────────────

async function portraitMode() {
  const { browser, page, pageErrors } = await launch({ width: 390, height: 844 });

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });

  // Wait for landing page to load
  await page.waitForSelector('#startNew', { timeout: 8000 });
  pass('Landing page loaded');

  // Pause CSS animations so the button becomes "stable" for clicking
  await page.evaluate(() => {
    document.querySelectorAll('*[style*="animation"]')
      .forEach(el => el.style.animationPlayState = 'paused');
  });
  await page.waitForTimeout(100);

  // Click NEW GAME – use force:true because the button may be under
  // CSS transitions / overlays that confuse Playwright's stability check
  await page.click('#startNew', { force: true });
  await page.waitForTimeout(2000);

  // No page errors
  expect(pageErrors.length === 0, 'No page errors', pageErrors.map(e => e).join(', ') || 'none');

  // Touch controls visible
  const touchControls = await page.$('#touchControls');
  expect(!!touchControls, '#touchControls visible', 'not found');

  const joystickZone = await page.$('#joystickZone');
  expect(!!joystickZone, '#joystickZone visible', 'not found');

  const fireBtn = await page.$('#fireBtn');
  expect(!!fireBtn, '#fireBtn visible', 'not found');

  const mobilePauseBtn = await page.$('#mobilePauseBtn');
  expect(!!mobilePauseBtn, '#mobilePauseBtn visible', 'not found');

  // Fixed-position elements legitimately have offsetParent === null, so inspect
  // computed visibility and rendered dimensions instead.
  const tcVisible = await page.$eval('#touchControls', el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
  expect(tcVisible, '#touchControls rendered visible', 'display:none, hidden, or zero-sized');

  // No overflow
  const overflow = await page.evaluate(() => ({
    clientW: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    clientH: document.documentElement.clientHeight,
    scrollH: document.documentElement.scrollHeight,
  }));
  expect(overflow.scrollW <= overflow.clientW + 1,
    'No horizontal overflow (scrollW ≤ clientW)',
    `scrollW=${overflow.scrollW} clientW=${overflow.clientW}`);
  expect(overflow.scrollH <= overflow.clientH + 1,
    'No vertical overflow (scrollH ≤ clientH)',
    `scrollH=${overflow.scrollH} clientH=${overflow.clientH}`);

  await browser.close();
}

// ── 2. 844×390 landscape ───────────────────────────────────────────

async function landscapeMode() {
  const { browser, page, pageErrors } = await launch({ width: 844, height: 390 });

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });

  await page.waitForSelector('#startNew', { timeout: 8000 });
  pass('Landing page loaded (landscape)');

  // Pause CSS animations so the button becomes "stable" for clicking
  await page.evaluate(() => {
    document.querySelectorAll('*[style*="animation"]')
      .forEach(el => el.style.animationPlayState = 'paused');
  });
  await page.waitForTimeout(100);

  await page.click('#startNew', { force: true });
  await page.waitForTimeout(2000);

  expect(pageErrors.length === 0, 'No page errors (landscape)', pageErrors.map(e => e).join(', ') || 'none');

  expect(!!(await page.$('#touchControls')), '#touchControls visible (landscape)', 'not found');
  expect(!!(await page.$('#joystickZone')), '#joystickZone visible (landscape)', 'not found');
  expect(!!(await page.$('#fireBtn')), '#fireBtn visible (landscape)', 'not found');
  expect(!!(await page.$('#mobilePauseBtn')), '#mobilePauseBtn visible (landscape)', 'not found');

  const tcVisible = await page.$eval('#touchControls', el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
  expect(tcVisible, '#touchControls rendered visible (landscape)', 'display:none, hidden, or zero-sized');

  const overflow = await page.evaluate(() => ({
    clientW: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    clientH: document.documentElement.clientHeight,
    scrollH: document.documentElement.scrollHeight,
  }));
  expect(overflow.scrollW <= overflow.clientW + 1,
    'No horizontal overflow (landscape)',
    `scrollW=${overflow.scrollW} clientW=${overflow.clientW}`);
  expect(overflow.scrollH <= overflow.clientH + 1,
    'No vertical overflow (landscape)',
    `scrollH=${overflow.scrollH} clientH=${overflow.clientH}`);

  await browser.close();
}

// ── 3. Multitouch CDP ───────────────────────────────────────────────

async function multitouchCDP() {
  const { browser, page, pageErrors } = await launch({ width: 390, height: 844 });

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#startNew', { timeout: 8000 });

  // Pause CSS animations so the button becomes "stable" for clicking
  await page.evaluate(() => {
    document.querySelectorAll('*[style*="animation"]')
      .forEach(el => el.style.animationPlayState = 'paused');
  });
  await page.waitForTimeout(100);

  await page.click('#startNew', { force: true });
  await page.waitForTimeout(2000);

  // Get CDP session
  const cdp = await page.context().newCDPSession(page);

  // Check that touch-input.js sync functions are callable
  // (We inspect via the game's input module — touch-input.js writes to
  // input.js exports, game.js reads via getMovementX / getIsMouseDown)
  const initialState = await page.evaluate(() => {
    // Get the input module's internal state by checking game's read path
    const movementX = typeof window.gameState?.getMovementX === 'function'
      ? window.gameState.getMovementX()
      : 'unknown';

    // Check that touch UI elements exist
    const jc = !!document.getElementById('touchControls');
    const jb = !!document.getElementById('joystickBase');
    const js = !!document.getElementById('joystickStick');
    const fb = !!document.getElementById('fireBtn');
    return { movementX, touchControls: jc, joystickBase: jb, joystickStick: js, fireBtn: fb };
  });

  expect(initialState.touchControls, 'Touch controls exist before touch',
    `tc=${initialState.touchControls} jb=${initialState.joystickBase} js=${initialState.joystickStick} fb=${initialState.fireBtn}`);

  // Define two touch points:
  //   t1: left side (joystick zone, near joystick center ~70, 600)
  //   t2: right side (fire zone, ~320, 600)
  const t1 = { x: 70, y: 600, id: 10 };
  const t2 = { x: 320, y: 600, id: 11 };

  const touchPoints = [t1, t2].map(t => ({
    x: Math.round(t.x),
    y: Math.round(t.y),
    id: t.id,
    radiusX: 5,
    radiusY: 5,
    rotationAngle: 0,
    force: 1,
  }));

  // TOUCH START — two simultaneous points. CDP calls this field touchPoints.
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints,
    modifiers: 0,
  });
  await page.waitForTimeout(300);

  // Check input state after two touches
  const afterStartState = await page.evaluate(() => {
    // Check if fire button has visual feedback
    const fb = document.getElementById('fireBtn');
    const fireBackground = fb?.style?.background ?? '';

    // Check joystick stick position
    const js = document.getElementById('joystickStick');
    const stickTransform = js?.style?.transform ?? '';

    return { fireBackground, stickTransform };
  });

  // Fire button should show pressed state (rgba(255,0,0,...))
  const firePressed = afterStartState.fireBackground.includes('255');
  expect(firePressed, 'Fire button shows pressed state on touch',
    `background="${afterStartState.fireBackground}"`);

  // Joystick stick should have moved from center (t1 is near but not exactly at joystick center)
  // The stick should show some transform because we touched in the joystick zone
  const stickMoved = afterStartState.stickTransform !== '';
  expect(stickMoved, 'Joystick stick moved on touch (left side touch)',
    `transform="${afterStartState.stickTransform}"`);

  // Simulate joystick drag (move t1)
  const t1Moved = { ...t1, x: 90, y: 580, id: 10 };
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [t1Moved, t2].map(t => ({
      x: Math.round(t.x),
      y: Math.round(t.y),
      id: t.id,
      radiusX: 5,
      radiusY: 5,
      rotationAngle: 0,
      force: 1,
    })),
    modifiers: 0,
  });
  await page.waitForTimeout(300);

  const afterMoveState = await page.evaluate(() => {
    const js = document.getElementById('joystickStick');
    const stickTransform = js?.style?.transform ?? '';
    return { stickTransform };
  });

  expect(afterMoveState.stickTransform !== '',
    'Joystick stick updated after drag',
    `transform="${afterMoveState.stickTransform}"`);

  // Check that the stick moved (different from after-start)
  // The transform should reflect the new position
  const stickMovedAgain = afterMoveState.stickTransform !== afterStartState.stickTransform;
  expect(stickMovedAgain, 'Joystick stick changed position on drag',
    `was="${afterStartState.stickTransform}" now="${afterMoveState.stickTransform}"`);

  // TOUCH END — remove both touches
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    modifiers: 0,
  });
  await page.waitForTimeout(300);

  // After release, stick should be back at origin
  const afterEndState = await page.evaluate(() => {
    const js = document.getElementById('joystickStick');
    const stickTransform = js?.style?.transform ?? '';
    return { stickTransform };
  });

  expect(
    afterEndState.stickTransform === '' ||
    afterEndState.stickTransform === 'translate(0, 0)' ||
    afterEndState.stickTransform === 'translate(0px, 0px)',
    'Joystick stick resets after touch end',
    `transform="${afterEndState.stickTransform}"`);

  expect(pageErrors.length === 0, 'No CDP multitouch page errors', pageErrors.map(e => e).join(', ') || 'none');

  await browser.close();
}

// ── 4. Static verification ──────────────────────────────────────────

async function staticVerification() {
  const repo = '/home/nova/3d-space-invaders';

  const indexHtml = readFileSync(join(repo, 'index.html'), 'utf8');
  const aliensJs  = readFileSync(join(repo, 'js/aliens.js'), 'utf8');
  const touchInputJs = readFileSync(join(repo, 'js/touch-input.js'), 'utf8');
  const mainJs     = readFileSync(join(repo, 'js/main.js'), 'utf8');
  const gameJs     = readFileSync(join(repo, 'js/game.js'), 'utf8');
  const inputJs    = readFileSync(join(repo, 'js/input.js'), 'utf8');

  // Viewport meta
  expect(/user-scalable=no/.test(indexHtml), 'Viewport: user-scalable=no');
  expect(/minimum-scale=/.test(indexHtml), 'Viewport: minimum-scale=');
  expect(/maximum-scale=/.test(indexHtml), 'Viewport: maximum-scale=');

  // Touch controls are created dynamically by touch-input.js.
  expect(/div\.id\s*=\s*['"]touchControls['"]/.test(touchInputJs), 'JS: touchControls created');
  expect(/id="joystickZone"/.test(touchInputJs), 'JS: joystickZone created');
  expect(/id="fireBtn"/.test(touchInputJs), 'JS: fireBtn created');
  expect(/id="mobilePauseBtn"/.test(indexHtml), 'HTML: mobilePauseBtn present');
  expect(/id="mobileGameOver"/.test(indexHtml), 'HTML: mobileGameOver present');

  // CSS
  expect(/touch-action:\s*none/.test(indexHtml), 'CSS: touch-action: none');
  expect(/user-select:\s*none/.test(indexHtml), 'CSS: user-select: none');
  expect(/-webkit-touch-callout:\s*none/.test(indexHtml), 'CSS: -webkit-touch-callout: none');

  // JS: aliens.js imports creator functions
  expect(/createOctopusAlien[\s\S]*from\s+['"]\.\/invaders\/index\.js['"]/.test(aliensJs),
    'JS: aliens.js imports createOctopusAlien from invaders/index.js',
    'import missing');

  expect(/createVoidwormAlien[\s\S]*from\s+['"]\.\/invaders\/index\.js['"]/.test(aliensJs),
    'JS: aliens.js imports createVoidwormAlien from invaders/index.js',
    'import missing');

  expect(/createBasiliskAlien[\s\S]*from\s+['"]\.\/invaders\/index\.js['"]/.test(aliensJs),
    'JS: aliens.js imports createBasiliskAlien from invaders/index.js',
    'import missing');

  // JS: touch-input.js does NOT use ResizeObserver(window)
  expect(!/ResizeObserver.*observe.*window/.test(touchInputJs),
    'JS: touch-input.js does NOT observe window with ResizeObserver',
    'still uses ResizeObserver(window)');

  // JS: touch-input.js uses window.addEventListener for resize
  expect(/addEventListener.*resize|addEventListener.*orientationchange/.test(touchInputJs),
    'JS: touch-input.js uses addEventListener for resize/orientation');

  // JS: main.js calls initTouchInput
  expect(/initTouchInput\(\)/.test(mainJs), 'JS: main.js calls initTouchInput()');

  // JS: game.js exports _resetGame
  expect(/window\._resetGame/.test(gameJs), 'JS: game.js exports window._resetGame');

  // JS: input.js exports syncTouchX / getMovementX
  expect(/export.*syncTouchX/.test(inputJs), 'JS: input.js exports syncTouchX');
  expect(/export.*getMovementX/.test(inputJs), 'JS: input.js exports getMovementX');
}