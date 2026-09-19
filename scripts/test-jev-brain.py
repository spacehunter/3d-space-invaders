#!/usr/bin/env python3
"""JEV BRAIN runtime test: press J, start a game, verify the AI autopilot
moves the ship and the score rises — with zero page errors."""
import json, sys, time
from playwright.sync_api import sync_playwright

GAME = "http://127.0.0.1:5173/index.html"
CHROME = "/home/nova/.cache/ms-playwright/chromium-1234/chrome-linux/chrome"

def hook(page):
    page.evaluate("""() => {
        window.__jevLog = [];
        const real = (u) => {
            const n = performance.getEntriesByType('resource').map(e=>e.name).find(x=>x.includes(u));
            return import(n || u);
        };
        window.__load = async () => {
            window.__game = await real('/js/game.js');
            window.__player = await real('/js/player.js');
        };
    }""")
    page.evaluate("window.__load()")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME, headless=True,
        args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader",
              "--disable-gpu-sandbox", "--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    # brain ON from t=0 (same flag the J key writes)
    ctx.add_init_script(
        "try{localStorage.setItem('spaceInvaders3D_jevBrain','1')}catch(e){}")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.goto(GAME, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(4000)
    hook(page)

    # start game
    page.evaluate("document.getElementById('startNew').click()")
    page.wait_for_timeout(17000)  # hyperspace intro + level announcement

    # brain already ON via localStorage; just confirm the HUD came up
    hud_visible = page.evaluate(
        "document.getElementById('jevBrainHud')?.style.opacity")
    hud_text0 = page.evaluate("document.getElementById('jevBrainHud')?.textContent || ''")

    # let it play; sample ship x + score
    samples = []
    for i in range(12):
        page.wait_for_timeout(1500)
        s = page.evaluate("""() => ({
            t: Date.now(),
            x: window.__player.getPlayer()?.position.x ?? null,
            score: window.__game.getScore(),
            active: window.__game.isGameActive(),
            hud: document.getElementById('jevBrainHud')?.textContent || ''
        })""")
        samples.append(s)

    hud_final = samples[-1]["hud"] if samples else ""
    browser.close()

xs = [s["x"] for s in samples if s["x"] is not None]
print(json.dumps({
    "page_errors": errors,
    "hud_visible_after_J": hud_visible,
    "hud_initial": hud_text0.strip(),
    "hud_final": hud_final.strip(),
    "score_first_to_last": [samples[0]["score"], samples[-1]["score"]] if samples else None,
    "ship_x_min_max": [min(xs), max(xs)] if xs else None,
    "moved": (max(xs) - min(xs)) > 1.0 if xs else False,
    "game_stayed_active": all(s["active"] for s in samples),
}, indent=2))
