# Animation

One branch, added to the `switch (row)` inside `export function animateAlien(alien)`
in `js/aliens.js`, after the last existing `case`. Worked example: search for
`case 8: { // Wasp`.

`animateAlien()` runs for every alien every frame, including after game over
and in the Bestiary. Its first two lines give you:

```js
const time = Date.now() * 0.001 + alien.userData.animationOffset;
const row = alien.userData.row;
```

`animationOffset` is a per-instance random phase — use `time`, never a raw
`Date.now()`, or every alien in the row animates in lockstep.

## The phase-window pattern

Drive discrete events from an explicit window in a repeating cycle, not from a
steep power curve. `Math.pow(charge, 12)` reads as a permanent glow because it
is never actually zero; a window is crisply on or off.

```js
const period = 8.4;                 // seconds for a full cycle
const phase = (time % period) / period;   // 0 .. 1

// Ramp in over a window, hold, then release.
const windup = phase >= 0.24 && phase < 0.40
    ? Math.sin(((phase - 0.24) / 0.16) * Math.PI / 2)   // 0 -> 1 eased
    : phase >= 0.40 && phase < 0.54 ? 1 : 0;            // hold

// A single-shot burst: rises and falls inside its own window.
const strike = phase >= 0.70 && phase < 0.84
    ? Math.sin(((phase - 0.70) / 0.14) * Math.PI)       // 0 -> 1 -> 0
    : 0;

// Decay after the burst.
const recoil = phase >= 0.84 ? Math.max(0, 1 - (phase - 0.84) / 0.16) : 0;

// Continuous idle motion, independent of the cycle.
const hover = Math.sin(time * 2.2) * 0.035;
```

Every value above is in `0..1`, so scale it by an amplitude at each use site.

## Skeleton

```js
case N: { // <Name> - <idle>, <signature event>, <recovery>
    const self = alien.userData;
    const t = time;
    const phase = (t % 8.4) / 8.4;

    const windup = phase >= 0.24 && phase < 0.40
        ? Math.sin(((phase - 0.24) / 0.16) * Math.PI / 2)
        : phase >= 0.40 && phase < 0.54 ? 1 : 0;
    const strike = phase >= 0.62 && phase < 0.78
        ? Math.sin(((phase - 0.62) / 0.16) * Math.PI)
        : 0;
    const recoil = phase >= 0.78 ? Math.max(0, 1 - (phase - 0.78) / 0.22) : 0;
    const hover  = Math.sin(t * 2.2) * 0.035;

    // The body pivot carries display motion; formation x/z stay untouched so
    // the alien cannot drift out of its column.
    if (self.bodyPivot) {
        self.bodyPivot.rotation.x = -strike * 0.24 + recoil * 0.10;
        self.bodyPivot.rotation.z = Math.sin(t * 1.4) * 0.035;
        self.bodyPivot.position.y = hover + windup * 0.025;
    }

    // Cloned material -> safe to write per instance.
    if (self.eyes) {
        self.eyes.material.emissiveIntensity = 1.8 + windup * 1.5 + strike * 2.4;
        self.eyes.scale.y = 1 + strike * 0.10;
    }

    if (self.arms) {
        self.arms.forEach(arm => {
            arm.mesh.rotation.x = arm.side * (0.06 + strike * 0.24)
                                + Math.sin(t * 9 + arm.side) * 0.035;
        });
    }

    // Offset from baseBend; buildLimbChain stored the rest pose there.
    if (self.legs) {
        self.legs.forEach(leg => {
            const step = Math.sin(t * 8 + leg.phase);
            const lift = Math.max(0, step);
            leg.segments[0].rotation.z = leg.segments[0].userData.baseBend - lift * 0.30;
            leg.segments[0].rotation.x = Math.cos(t * 8 + leg.phase) * 0.22;
            leg.segments[1].rotation.z = leg.segments[1].userData.baseBend + lift * 0.38;
            leg.segments[2].rotation.z = leg.segments[2].userData.baseBend + lift * 0.16;
        });
    }

    // updateSwoop() owns Y during a kamikaze dive.
    if (!alien.userData.isSwooping) {
        alien.position.y = Math.abs(hover) + windup * 0.03;
    }
    break;
}
```

Every part read must be guarded (`if (self.legs)`). The Bestiary and the
formation build the same model, but a guard costs nothing and turns a typo in a
`userData` key into "no motion" rather than a thrown exception that kills the
whole render loop for every alien.

## Failure-mode checks — run all six against your diff

**1. Replaced `userData`.**
Symptom: no part of the model moves; the group still bobs.
Cause: `group.userData = {...}` somewhere in the builder wiped the part
references (or `createAliens`' `Object.assign` overwrote them).
Check: `grep -n "userData = {" js/aliens.js` — should return nothing new.

**2. Shared material animated.**
Symptom: an effect that should chase, pulse out of phase, or differ per alien
fires identically on every instance and every copy of the part.
Cause: the mesh uses the registry material directly.
Check: for each `material.emissiveIntensity =`, `material.opacity =`, or
`material.color.set` in your branch, confirm the corresponding `new THREE.Mesh`
in the builder passes `.clone()`.

**3. Formation drift.**
Symptom: over 30 seconds the alien walks out of its column or sinks backwards.
Cause: `alien.position.x +=` or `alien.position.z +=` in the animation.
Check: `alien.position.x` and `alien.position.z` must not appear in your branch
at all. Put the motion in a rotation, or on a child pivot's local transform.

**4. Swoop Y fight.**
Symptom: during a kamikaze dive the alien stutters vertically or snaps to the
formation plane mid-dive.
Cause: an unguarded `alien.position.y =`.
Check: every `alien.position.y` write in your branch is inside
`if (!alien.userData.isSwooping) { ... }`.

**5. Group scale written.**
Symptom: the swoop telegraph pulse leaves the alien permanently the wrong size.
Cause: writing `alien.scale`; `updateTelegraph()` captures and restores it.
Check: `alien.scale` must not appear in your branch. Scale a child mesh
(`self.eyes.scale`, `self.stinger.scale`) instead.

**6. Rate multiplied into time.**
Symptom: a speed-linked cycle (tread scroll, spin rate) jumps discontinuously
whenever the speed changes.
Cause: `someRate * time` where `someRate` varies.
Check: accumulate from a frame delta into a stored offset instead. Only applies
if your animation is linked to formation speed.

Plus the geometry-origin rule from `voxel-modeling.md`: if you `scale` or
`rotate` a part here, its geometry must be centred on that pivot, with the
offset carried on `mesh.position`.
