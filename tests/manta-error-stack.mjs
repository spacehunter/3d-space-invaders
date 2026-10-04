import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/home/nova/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],
});
const page = await browser.newPage({viewport:{width:1280,height:800}});
let errors = [];
page.on('pageerror', e => errors.push(e.stack || String(e)));
await page.goto('http://127.0.0.1:5173/', {waitUntil:'networkidle'});
await page.waitForTimeout(1000);
await page.keyboard.press('b');
for (let i=0;i<18;i++){ await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100); }
await page.waitForTimeout(500);
errors = [];
await page.waitForTimeout(2500);
console.log(errors.length ? errors[0] : 'NO_MANTA_PAGE_ERROR');
await browser.close();
