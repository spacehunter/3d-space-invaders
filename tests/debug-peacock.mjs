import chromiumPkg from 'playwright-core';
const { chromium } = chromiumPkg;
(async function() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const result = await page.evaluate(async () => {
    try {
      const mod = await import('../js/aliens.js');
      const createAlienPreview = mod.createAlienPreview;
      const animateAlien = mod.animateAlien;
      console.log('createAlienPreview:', typeof createAlienPreview);
      console.log('animateAlien:', typeof animateAlien);
      console.log('export keys:', Object.keys(mod));
      
      const alien = createAlienPreview(19);
      const keys = Object.keys(alien.userData);
      console.log('userData keys:', keys);
      console.log('legs:', alien.userData.legs ? 'present' : 'missing');
      console.log('arms:', alien.userData.arms ? 'present' : 'missing');
      
      const t = 3500;
      const origNow = globalThis.Date.now;
      globalThis.Date.now = () => t;
      
      animateAlien(alien);
      globalThis.Date.now = origNow;
      return { ok: true };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });
  
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();