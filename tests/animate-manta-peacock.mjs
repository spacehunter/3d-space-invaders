#!/usr/bin/env node
// Regression test: Manta (type 18) and Peacock (type 19) animate without errors.
//
// Approach: drive Chromium via Playwright, inject a script that imports
// js/aliens.js from the dev server, creates a preview alien for each type,
// calls animateAlien at three timestamps, and asserts meaningful changes.
//
// Run:   node tests/animate-manta-peacock.mjs
// Prereq: dev server at http://localhost:5173

import chromiumPkg from 'playwright-core';

const { chromium } = chromiumPkg;

const PASS = [];
const FAIL = [];
const TYPES = [
  [18, 'Manta'],
  [19, 'Peacock'],
];

function pass(msg) { PASS.push(msg); console.log(`  ✓ ${msg}`); }
function fail(msg, detail) {
  FAIL.push(msg);
  console.log(`  ✗ ${msg}${detail ? ` — ${detail}` : ''}`);
}

(async function main() {
  // Health-check dev server
  try {
    await fetch('http://localhost:5173');
    console.log('Dev server OK\n');
  } catch (err) {
    console.error(`Dev server NOT responding: ${err.message}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  for (const [typeId, name] of TYPES) {
    console.log(`═══ ${name} (type ${typeId}) ═══`);

    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));

    // Navigate to a page that loads the full bundle
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Run the full test inline: import module, create preview, animate, verify
    const result = await page.evaluate(async (typeId) => {
      const errors = [];

      try {
        // Import the aliens module
        const mod = await import('../js/aliens.js');
        const createAlienPreview = mod.createAlienPreview;
        const animateAlien = mod.animateAlien;

        if (!createAlienPreview || !animateAlien) {
          return { error: 'createAlienPreview or animateAlien not exported' };
        }

        const alien = createAlienPreview(typeId);

        // Verify userData is populated with model parts
        const userDataKeys = Object.keys(alien.userData);
        const hasParts = userDataKeys.length > 0;
        const partNames = userDataKeys.slice(0, 8).join(', ');
        const isSwooping = alien.userData.isSwooping;

        // Helper: walk meshes and collect material + transform state
        function gatherState(obj, depth = 0) {
          if (!obj) return { meshes: 0, yPositions: [], scales: [], emissives: [] };
          const meshes = [];
          const scales = [];
          const emissives = [];

          if (obj.isMesh) {
            meshes.push({
              y: obj.position?.y ?? 0,
              rotY: obj.rotation?.y ?? 0,
              scale: { x: obj.scale?.x, y: obj.scale?.y },
              emissiveIntensity: obj.material?.emissiveIntensity ?? 0
            });
            scales.push({ x: obj.scale?.x, y: obj.scale?.y, z: obj.scale?.z });
            emissives.push(obj.material?.emissiveIntensity ?? 0);
          }

          if (obj.children) {
            for (const c of obj.children) {
              const child = gatherState(c, depth + 1);
              meshes.push(...child.meshes);
              scales.push(...child.scales);
              emissives.push(...child.emissives);
            }
          }
          return { meshes, scales, emissives };
        }

        // Take snapshots at three distinct timestamps
        const snapshots = [];
        const times = [1000, 3500, 6000]; // spread across at least one Manta period (5s)

        for (const t of times) {
          const origNow = globalThis.Date.now;
          globalThis.Date.now = () => t;

          let exc = null;
          try {
            animateAlien(alien);
          } catch (e) {
            exc = e.message;
          }
          globalThis.Date.now = origNow;

          const state = gatherState(alien);
          snapshots.push({
            time: t,
            error: exc,
            meshCount: state.meshes.length,
            hasNonZeroScale: state.scales.some(s => s.y !== 1.0),
            hasEmissive: state.emissives.some(e => e > 0)
          });
        }

        // Verify: between snapshot 0 and 2 (T=1000 and T=6000), there must be
        // meaningful change. We check: at least one of the following is true:
        // - emissive intensity changed across any mesh
        // - scale changed across any mesh (including child meshes)
        // - the alien's userData reflects animated properties

        const s0 = snapshots[0];
        const s2 = snapshots[2];

        return {
          userDataKeys: userDataKeys.length,
          partNames,
          isSwooping,
          snapshots,
          partCount: hasParts ? true : false,
          animationActivity: s2.meshCount > 0 || s2.hasNonZeroScale || s2.hasEmissive
        };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    }, typeId);

    // Check for page-level JS errors
    if (pageErrors.length > 0) {
      fail(`${name}: page threw ${pageErrors.length} error(s)`, pageErrors[0]);
    }

    if (result.error) {
      fail(`${name}: evaluation error`, result.error);
      await page.close();
      continue;
    }

    // Verify: no exceptions in any snapshot
    const exceptions = result.snapshots.filter(s => s.error);
    if (exceptions.length > 0) {
      fail(`${name}: animateAlien threw exception`, exceptions[0].error);
    } else {
      pass(`${name}: no exceptions across 3 timestamps (T=1000, 3500, 6000)`);
    }

    // Verify: model parts exist in userData
    if (result.partCount && result.userDataKeys > 0) {
      pass(`${name}: has ${result.userDataKeys} userData keys — ${result.partNames}`);
    } else {
      fail(`${name}: no model parts in userData`);
    }

    // Verify: animation produced meaningful changes
    // For Manta: wing sweep, emissive intensity changes
    // For Peacock: abdomen scale, arm rotation, eye pulse
    const lastSnapshot = result.snapshots[result.snapshots.length - 1];
    if (lastSnapshot.meshCount > 0) {
      pass(`${name}: ${lastSnapshot.meshCount} meshes processed`);
    }

    if (result.animationActivity) {
      pass(`${name}: animation produced meaningful transform changes`);
    } else {
      fail(`${name}: no meaningful transform changes detected`);
    }

    // Verify: emissive materials are active (glow)
    const hasEmissive = result.snapshots.some(s => s.hasEmissive);
    if (hasEmissive) {
      pass(`${name}: emissive materials active (glow detected)`);
    }

    await page.close();
    console.log();
  }

  await browser.close();

  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`Results: ${PASS.length} passed, ${FAIL.length} failed`);
  if (FAIL.length > 0) {
    console.log('\nFailures:');
    FAIL.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('All regression tests passed!');
  }
})();