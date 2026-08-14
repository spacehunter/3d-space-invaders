const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Navigating to game...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });

  // Click "New Game" or similar button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    try {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      if (text.includes('New') || text.includes('Play')) {
        await btn.click();
        console.log('Clicked:', text);
        break;
      }
    } catch (e) { /* skip */ }
  }

  // Wait for game canvas and level to start
  await new Promise(r => setTimeout(r, 5000));
  try { await page.click(); } catch (e) { /* skip */ }

  // Skip through levels quickly
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const levelText = await page.evaluate(() => {
        const levelEl = document.querySelector('[class*="level"], [class*="Level"], #level');
        return levelEl ? levelEl.textContent : '';
      });
      console.log(`Attempt ${i+1}: level text = "${levelText}"`);
      await page.keyboard.press('Space');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { /* skip */ }
  }

  // Take screenshot
  await page.screenshot({
    path: '/home/nova/.hermes/profiles/mimo/cache/images/voidworm_shot.png',
    fullPage: false
  });
  console.log('Screenshot saved!');

  await browser.close();
})();