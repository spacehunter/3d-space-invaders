import puppeteer from 'puppeteer';

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

// Wait for level 14 (VoidWorm row 13 = level ~14) to load
// The game starts at level 1 with basic invaders, climbs to bosses
// Let's wait and check what level we're on
for (let i = 0; i < 10; i++) {
  await new Promise(r => setTimeout(r, 3000));
  try {
    const levelText = await page.evaluate(() => {
      const levelEl = document.querySelector('[class*="level"], [class*="Level"], #level');
      return levelEl ? levelEl.textContent : '';
    });
    console.log(`Attempt ${i+1}: level text = "${levelText}"`);
    // Skip ahead levels by clicking (space bar)
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) { /* skip */ }
}

// Take screenshot
await page.screenshot({
  path: '/home/nova/.hermes/profiles/mimo/cache/images/voidworm_shot.png',
  fullPage: false
});
console.log('Screenshot saved!');

await browser.close();