# Play Space Invaders on :99 (watchable via noVNC). v4: robust start + stall watchdog + CDP port.
import asyncio, json, os, time
from playwright.async_api import async_playwright

EXE = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux/chrome")
OUT = "/home/nova/3d-space-invaders/shots"
W, H = 1600, 900
SESSION_SECONDS = 2 * 3600
TARGET = 5730

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
    reset: m.resetGame, start: m.startGame,
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

async def state_of(pg):
    return await pg.evaluate("window.__game.state()")

async def ensure_running(pg):
    """Get the game into active state by any means. Returns True if active."""
    for attempt in range(6):
        s = await state_of(pg)
        if s.get("active") and not s.get("over"):
            return True
        await pg.evaluate("""() => {
            const b = document.getElementById('startNew');
            if (b && getComputedStyle(b).display !== 'none') b.click();
        }""")
        await pg.wait_for_timeout(2000)
        if (await state_of(pg)).get("active"): return True
        await pg.keyboard.press("Enter")
        await pg.wait_for_timeout(2000)
        if (await state_of(pg)).get("active"): return True
        await pg.evaluate("window.__game.start && window.__game.start()")
        await pg.wait_for_timeout(1500)
        if (await state_of(pg)).get("active"): return True
        await pg.evaluate("window.__game.reset && window.__game.reset()")
        await pg.wait_for_timeout(2000)
        if (await state_of(pg)).get("active"): return True
        await pg.reload(wait_until="networkidle")
        await pg.wait_for_timeout(4000)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(500)
    return bool((await state_of(pg)).get("active"))

async def main():
    os.environ["DISPLAY"] = ":99"
    logf = open("/tmp/play-log.jsonl", "a")
    best = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, headless=False,
            args=["--no-sandbox","--window-size=1600,900","--remote-debugging-port=9333",
                  "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = await (await b.new_context(viewport={"width": W, "height": H})).new_page()
        pg.on("pageerror", lambda e: logf.write(json.dumps({"t": time.time(), "err": str(e)}) + "\n"))
        await pg.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        await pg.wait_for_timeout(4000)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(800)
        if not await pg.evaluate("!!(window.__game && window.__game.score)"):
            print("hook failed", flush=True); await b.close(); return
        print("hook installed", flush=True)

        if not await ensure_running(pg):
            print("could not start game", flush=True)
            await pg.screenshot(path=f"{OUT}/bot-fail.png")
            await b.close(); return
        print("game running", flush=True)

        t0 = time.time()
        last_fire = 0.0
        runs = 0
        stall = 0; last_sc = -1; last_px = -999; stall_reloads = 0
        while time.time() - t0 < SESSION_SECONDS:
            try:
                s = await state_of(pg)
            except Exception as e:
                print("state err:", e, flush=True)
                await pg.wait_for_timeout(2000)
                if not await ensure_running(pg):
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
                await pg.evaluate("() => { const b=document.getElementById('restartBtn'); if (b) b.click(); }")
                await pg.wait_for_timeout(3000)
                if not await ensure_running(pg):
                    print("stuck after gameover", flush=True)
                continue
            sc = s.get("score", 0)
            if sc > best: best = sc
            # stall watchdog
            px_now = s.get("px", 0)
            if sc == last_sc and abs(px_now - last_px) < 0.01:
                stall += 1
            else:
                stall = 0
            last_sc, last_px = sc, px_now
            if stall > 300:  # ~15s frozen while active
                stall = 0
                stall_reloads += 1
                print(f"STALL at score={sc} t={round(time.time()-t0)}s, reloading ({stall_reloads})", flush=True)
                logf.write(json.dumps({"t": time.time(), "stall": sc}) + "\n"); logf.flush()
                if stall_reloads > 15:
                    print("too many stalls", flush=True); break
                await pg.reload(wait_until="networkidle")
                await pg.wait_for_timeout(4000)
                await pg.evaluate(HOOK)
                if not await ensure_running(pg):
                    print("unrecoverable after stall", flush=True); break
                continue
            aliens = s.get("aliens", [])
            px = px_now
            threat = None
            for x in s.get("enemy", []):
                if abs(x["x"] - px) < 2.0 and -40 < x["z"] < 8:
                    if threat is None or x["z"] > threat["z"]:
                        threat = x
            if threat is not None:
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
