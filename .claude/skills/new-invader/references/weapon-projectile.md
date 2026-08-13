# Weapon / projectile

Six edits in `js/missiles.js` and two in `js/game.js`. Worked example: search
`js/missiles.js` for `createWaspNeedle` and `updateWaspNeedles`.

Naming below: `<array>` = plural camelCase array (`prismLances`),
`<Name>` = PascalCase type name (`Sentinel`), `N` = the type index.

**Naming note.** The skeletons below use `create<Name>Projectile` /
`update<Name>Projectiles`. The codebase itself names these after the
**projectile**, not the alien — `createWaspNeedle` / `updateWaspNeedles`,
`createPrismLance` / `updatePrismLances`. Prefer the codebase convention
(`create<Proj>` / `update<Proj>s`) so your code matches the worked examples you
are reading. Either is fine as long as you use one consistently: the same name
must appear in the factory, the `alienFire` branch, the `game.js` import and the
`game.js` call.

## World conventions

- Aliens sit at negative Z and the player at positive Z, so alien projectiles
  travel **+Z**. Off-screen cleanup is `position.z > 20`.
- Everything gameplay-relevant lives on the `y = 0` plane. Projectile factories
  set `group.position.y = 0` after copying the alien's position. A projectile
  that keeps the alien's Y will fly over the player and never hit.
- Player hit radius is `1.2`; barrier collision radius is passed to
  `checkBarrierCollision(position, radius, scene)` (existing projectiles use
  `0.1`–`0.4` — roughly half the projectile's widest dimension).
- `MISSILE_SPEED` is `0.5` (player). Alien projectiles run `0.28`–`0.46`;
  faster than ~0.5 is effectively undodgeable.

## Edit 1 — module array

Next to the other arrays near the top of `js/missiles.js`:

```js
let <array> = [];
```

## Edit 2 — factory

Place after the last existing factory. Emissive intensities on projectiles are
deliberately high (4–9) — these are meant to bloom, unlike model materials.

```js
// Create <Name> projectile - <one-line description>
function create<Name>Projectile(position) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.10, 0.48),
        new THREE.MeshPhongMaterial({
            color: 0xff9d16, emissive: 0xff7a00,
            emissiveIntensity: 5.0, flatShading: true
        })
    );
    group.add(body);

    const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, 0.12),
        new THREE.MeshPhongMaterial({
            color: 0xffffff, emissive: 0xfff2a8,
            emissiveIntensity: 9.0, flatShading: true
        })
    );
    tip.position.z = 0.28;      // offset on the mesh, not baked in the geometry
    group.add(tip);

    group.position.copy(position);
    group.position.y = 0;       // required: play happens on the y=0 plane
    group.position.z += 0.78;   // clear the firing alien's own hitbox
    group.userData.is<Name>Projectile = true;
    group.userData.speed = 0.46;
    group.userData.createdAt = Date.now();
    // Add any per-shot state your flight model needs here, e.g.
    // group.userData.homingX = (Math.random() - 0.5) * 0.3;

    return group;
}
```

## Edit 3 — `alienFire` dispatch

Inside `export function alienFire(scene)`, extend the `else if` chain. Insert
**before** the final `} else {` (the standard-missile fallback):

```js
            } else if (randomAlien.userData.row === N) {
                // <Name> aliens fire <projectile>
                missile = create<Name>Projectile(randomAlien.position);
                <array>.push(missile);
                scene.add(missile);
                continue; // Skip adding to alienMissiles
```

The `continue` is load-bearing. Without it the projectile is also pushed into
`alienMissiles` and gets updated by two loops at once — it will move at double
speed and be removed from the scene while still in your array.

## Edit 4 — update loop

Same five-parameter signature as every other projectile updater. Iterate
**backwards** so `splice` does not skip elements, and `continue` after every
removal so a removed projectile is not touched again in the same iteration.

```js
// Update <Name> projectiles (<Name> weapon)
export function update<Name>Projectiles(player, scene, gameActive, livesCallback, gameOverCallback) {
    const time = Date.now() * 0.001;

    for (let i = <array>.length - 1; i >= 0; i--) {
        const p = <array>[i];

        // --- flight model: the one thing that should differ per weapon ---
        p.position.z += p.userData.speed;
        p.rotation.x = time * 14;

        // --- barriers ---
        if (checkBarrierCollision(p.position, 0.14, scene)) {
            createExplosion(p.position, scene);
            scene.remove(p);
            <array>.splice(i, 1);
            continue;
        }

        // --- off-screen cleanup (never let the array grow unbounded) ---
        if (p.position.z > 20) {
            scene.remove(p);
            <array>.splice(i, 1);
            continue;
        }

        // --- player ---
        if (gameActive) {
            if (p.position.distanceTo(player.position) < 1.2) {
                scene.remove(p);
                <array>.splice(i, 1);

                createExplosion(p.position, scene);
                playExplosion(1.3);

                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }
        }
    }
}
```

`checkBarrierCollision`, `createExplosion` and `playExplosion` are already
imported at the top of `js/missiles.js` — do not add imports for them.

The barrier and off-screen checks must run regardless of `gameActive`; only
the player-damage block is gated, so projectiles still clear after game over.

### Flight model variations already in use

Pick something not on this list, or your weapon is indistinguishable in play:

- **Straight** (rows 0–3 standard missiles, Invader blaster bolt, Wasp needle) —
  constant `+Z`.
- **Homing** (Tank) — steer `position.x` toward the player each frame.
- **Slow-arming zone** (Beetle web bomb) — spawns a lingering `webZones` hazard.
- **Mortar arc** (Scorpion venom dart) — two-phase: climb to
  `userData.maxHeight`, set `userData.hasPeaked`, then dive under gravity.

## Edit 5 — `resetMissiles`

Both halves, or a restart leaves projectiles frozen on screen or leaks stale
objects into the next game:

```js
    <array>.forEach(p => scene.remove(p));   // with the other forEach removals
    ...
    <array> = [];                            // with the other reassignments
```

## Edit 6 — `getMissiles`

Add `<array>` to the returned object.

## Edits 7–8 — `js/game.js`

Add `update<Name>Projectiles` to the existing `from './missiles.js'` import
list, then add the call inside `export function update()`, next to the other
`update*` projectile calls:

```js
    update<Name>Projectiles(player, scene, gameActive, decreaseLives, gameOver);
```

Without the call the projectile spawns and hangs motionless in space forever —
no error, and `npm run build` still passes.
