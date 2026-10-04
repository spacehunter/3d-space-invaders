# Capture the player ship: start a game, screenshot the third-person view with ship centered, plus a close crop.
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
        await page.wait_for_timeout(16000)   # wait out hyperspace intro
        # center ship on screen
        await page.mouse.move(640, 400)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{OUT}/30-game-with-player.png")
        # fire so the ship is doing something
        await page.mouse.click(640, 400)
        await page.wait_for_timeout(250)
        await page.screenshot(path=f"{OUT}/31-player-firing.png")
        print("done; js errors:", errors[:3])
        await browser.close()

asyncio.run(main())
