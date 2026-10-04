# Play Space Invaders on :99 (watchable via noVNC). Robust start, dodge, aim, auto-restart.
import asyncio, json, os, time
from playwright.async_api import async_playwright

EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux/chrome")
OUT = "/home/nova/3d-space-invaders/shots"
W, H = 1600, 900
SESSION_SECONDS = 2 * 3600
TARGET = 5730  # beat this

HOOK = """
(async () => {
  const real = (u) => {
    const n = performance.getEntriesByType('resource').map(e=>e.name).find(x=>x.includes(u));
    return import(n || u);
  };
  const m = await real('/js/game.js');
  const a = await real('/js/aliens.js');
  const pl = await real('/js/player.js');
  const mi = await real('/js/missiles.js');
  window.__game = {
    score: m.getScore, active: m.isGameActive, level: m.getCurrentLevel,
    reset: m.resetGame, start: m.startGame, startLevel: m.startFromLevel,
    state: () => {
      const player = pl.getPlayer();
      const aliens = (a.getAliens()||[]).filter(x=>x && x.visible).map(x => ({x: x.position.x, z: x.position.z}));
      const M = mi.getMissiles();
      const es = [...(M.missiles||[]), ...(M.ufoMissiles||[]), ...(M.waspNeedles||[]), ...(M.alienMissiles||[])]
                 .filter(x=>x && x.position).map(x=>({x:x.position.x,z:x.position.z}));
      const go = document.getElementById('gameOver');
      return {score: window.__game.score(), active: window.__game.active(),
              level: window.__game.level ? window.__game.level() : -1,
              px: player ? player.position.x : 0, aliens, enemy: es,
              over: !!go && getComputedStyle(go).display !== 'none'};
    }
  };
})()
"""

async def ensure_running(pg, state_of):
    """Get the game into active state. Returns True if active."""
    for attempt in range(6):
        s = await state_of()
        if s.get("active") and not s.get("over"):
            return True
        # try 1: click startNew button on landing
        await pg.evaluate("""() => {
            const b = document.getElementById('startNew');
            if (b && getComputedStyle(b).display !== 'none') b.click();
        }""")
        await pg.wait_for_timeout(2500)
        s = await state_of()
        if s.get("active") and not s.get("over"):
            return True
        # try 2: keypress Enter (some flows)
        await pg.keyboard.press("Enter")
        await pg.wait_for_timeout(2500)
        s = await state_of()
        if s.get("active") and not s.get("over"):
            return True
        # try 3: direct module call
        await pg.evaluate("window.__game.start && window.__game.start()")
        await pg.wait_for_timeout(2000)
        s = await state_of()
        if s.get("active") and not s.get("over"):
            return True
        # try 4: restart via resetGame
        await pg.evaluate("window.__game.reset && window.__game.reset()")
        await pg.wait_for_timeout(2000)
        s = await state_of()
        if s.get("active") and not s.get("over"):
            return True
        # try 5: reload fresh then click
        await pg.reload(wait_until="networkidle")
        await pg.wait_for_timeout(4000)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(500)
    return bool((await state_of()).get("active"))

async def main():
    os.environ["DISPLAY"] = ":99"
    logf = open("/tmp/play-log.jsonl", "a")
    best = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, headless=False,
            args=["--no-sandbox","--window-size=1600,900","--use-gl=angle",
                  "--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = await (await b.new_context(viewport={"width": W, "height": H})).new_page()
        pg.on("pageerror", lambda e: logf.write(json.dumps({"t": time.time(), "err": str(e)}) + "\n"))
        await pg.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        await pg.wait_for_timeout(4000)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(800)
        if not await pg.evaluate("!!(window.__game && window.__game.score)"):
            print("hook failed", flush=True); await b.close(); return
        print("hook installed", flush=True)

        if not await ensure_running(pg, lambda: pg.evaluate("window.__game.state()")):
            print("could not start game", flush=True)
            await pg.screenshot(path=f"{OUT}/bot-fail.png")
            await b.close(); return
        print("game running", flush=True)

        t0 = time.time()
        last_fire = 0.0
        runs = 0
        while time.time() - t0 < SESSION_SECONDS:
            try:
                s = await pg.evaluate("window.__game.state()")
            except Exception as e:
                print("state err:", e, flush=True)
                await pg.wait_for_timeout(2000)
                if not await ensure_running(pg, lambda: pg.evaluate("window.__game.state()")):
                    print("unrecoverable", flush=True); break
                continue
            if s.get("over"):
                sc = s.get("score", 0)
                best = max(best, sc)
                runs += 1
                print(f"RUN {runs} ended score={sc} best={best} t={round(time.time()-t0)}s", flush=True)
                logf.write(json.dumps({"t": time.time(), "gameover": sc, "run": runs}) + "\n"); logf.flush()
                if best > TARGET:
                    print(f"TARGET BEATEN best={best}", flush=True)
                    await pg.screenshot(path=f"{OUT}/bot-beat.png")
                if runs >= 40:
                    print("run cap", flush=True); break
                # restart: click RESTART button
                clicked = await pg.evaluate("""() => {
                    const btn = document.getElementById('restartBtn');
                    if (btn) { btn.click(); return true; }
                    return false;
                }""")
                await pg.wait_for_timeout(3000)
                if not await ensure_running(pg, lambda: pg.evaluate("window.__game.state()")):
                    print("stuck after gameover", flush=True)
                continue
            sc = s.get("score", 0)
            if sc > best: best = sc
            aliens = s.get("aliens", [])
            px = s.get("px", 0)
            # dodge: nearest incoming missile in our lane
            threat = None
            for x in s.get("enemy", []):
                if abs(x["x"] - px) < 2.0 and -40 < x["z"] < 8:
                    if threat is None or x["z"] > threat["z"]:
                        threat = x
            if threat is not None:
                # sidestep toward the nearer open side
                right = px + 3.5 <= 11.5
                left = px - 3.5 >= -11.5
                side = 1 if (right and px >= 0) or (right and not left) else -1
                target_x = px + side * 3.5
            elif aliens:
                low = max(aliens, key=lambda x: x["z"])
                target_x = low["x"]
            else:
                target_x = px
            target_x = max(-11.5, min(11.5, target_x))
            await pg.mouse.move((target_x + 12) / 24 * W, H * 0.72)
            now = time.time()
            if now - last_fire > 0.16:
                await pg.mouse.down(); await pg.mouse.up()
                last_fire = now
            if int(now) % 10 == 0:
                logf.write(json.dumps({"t": now, "score": sc, "lvl": s.get("level"),
                                       "px": round(px,1), "aliens": len(aliens),
                                       "threat": bool(threat)}) + "\n")
            await pg.wait_for_timeout(25)
        print(f"DONE best={best} runs={runs}", flush=True)
        await pg.screenshot(path=f"{OUT}/bot-final.png")
        await b.close()

asyncio.run(main())
