# Verify the creators-order fix: capture bestiary rows 5-8, report JS errors.
import asyncio, os
from playwright.async_api import async_playwright

OUT = "/home/nova/3d-space-invaders/shots-views"
EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux/chrome")

async def main():
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width":1280,"height":800})
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("""() => {
            const btn = [...document.querySelectorAll('button')].find(x => /bestiary/i.test(x.textContent));
            if (btn) btn.click();
        }""")
        await pg.wait_for_timeout(1200)
        for i in range(5):  # advance to row 5
            await pg.evaluate("document.getElementById('bestiaryNext').click()")
            await pg.wait_for_timeout(600)
        for i in range(4):
            if i > 0:
                await pg.evaluate("document.getElementById('bestiaryNext').click()")
                await pg.wait_for_timeout(1200)
            name = await pg.evaluate("document.getElementById('bestiaryName')?.textContent || 'unknown'")
            await pg.screenshot(path=f"{OUT}/fix-{name.strip().replace(' ','-')}.png")
            print("captured", name)
        await b.close()
    print("js errors:", errors)

asyncio.run(main())
