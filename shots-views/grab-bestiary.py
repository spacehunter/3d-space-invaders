# Bestiary views from the LANDING page (no game started -> no game-over backdrop).
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
        # sanity: still on landing, not game over
        st = await page.evaluate("({landing: getComputedStyle(document.getElementById('landingPage')).display, over: document.getElementById('gameOver') ? getComputedStyle(document.getElementById('gameOver')).display : 'n/a'})")
        print("state before:", st)
        await page.evaluate("document.getElementById('openBestiary').click()")
        await page.wait_for_timeout(2500)
        names = []
        for i in range(20):
            if i > 0:
                await page.evaluate("document.getElementById('bestiaryNext').click()")
                await page.wait_for_timeout(1600)
            name = (await page.evaluate("document.getElementById('bestiaryName')?.textContent || '??'")).strip()
            names.append(name)
            over = await page.evaluate("getComputedStyle(document.getElementById('gameOver')).display")
            safe = name.replace(" ", "-").upper()
            await page.screenshot(path=f"{OUT}/bestiary-{i:02d}-{safe}.png")
            if i == 0:
                print("gameOver display behind bestiary:", over)
        print("entries:", names)
        print("JS ERRORS:", errors[:3])
        await browser.close()

asyncio.run(main())
