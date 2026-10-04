# Capture landing, gameplay, and every bestiary view (nav via #bestiaryNext).
import asyncio, os
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:5173/"
EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux/chrome")
OUT = "/home/nova/3d-space-invaders/shots-views"
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=EXE, args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        page = await browser.new_page(viewport={"width":1280,"height":800})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE)
        await page.wait_for_timeout(4000)
        await page.screenshot(path=f"{OUT}/00-landing.png")
        print("landing ok")

        # start new game
        await page.evaluate("document.getElementById('startNew').click()")
        await page.wait_for_timeout(5000)
        await page.screenshot(path=f"{OUT}/10-gameplay-start.png")
        await page.wait_for_timeout(6000)
        await page.screenshot(path=f"{OUT}/11-gameplay-formations.png")
        print("gameplay ok; js errors:", len(errors))

        # back to landing state? bestiary opens over game fine via button
        names = []
        for i in range(20):
            if i == 0:
                await page.evaluate("document.getElementById('openBestiary').click()")
                await page.wait_for_timeout(2500)
            else:
                await page.evaluate("document.getElementById('bestiaryNext').click()")
                await page.wait_for_timeout(1600)
            name = await page.evaluate("document.getElementById('bestiaryName')?.textContent || '??'")
            names.append(name)
            safe = name.strip().replace(" ", "-").upper()
            await page.screenshot(path=f"{OUT}/20-bestiary-{i:02d}-{safe}.png")
        print("bestiary entries:", names)
        print("JS ERRORS:", errors[:5])
        await browser.close()

asyncio.run(main())
