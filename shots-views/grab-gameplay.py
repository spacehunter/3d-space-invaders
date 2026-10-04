import asyncio, os
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:5173/"
EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux/chrome")
OUT = "/home/nova/3d-space-invaders/shots-views"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=EXE, args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        page = await browser.new_page(viewport={"width":1280,"height":800})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE)
        await page.wait_for_timeout(3500)
        await page.evaluate("document.getElementById('startNew').click()")
        # wait out level announcement / hyperspace intro
        await page.wait_for_timeout(18000)
        await page.screenshot(path=f"{OUT}/12-gameplay-live.png")
        # fire a couple of shots and move mouse for camera
        await page.mouse.move(640, 500)
        await page.mouse.click(640, 500)
        await page.wait_for_timeout(700)
        await page.mouse.click(640, 500)
        await page.wait_for_timeout(400)
        await page.screenshot(path=f"{OUT}/13-gameplay-firing.png")
        print("done; js errors:", errors[:3])
        await browser.close()

asyncio.run(main())
