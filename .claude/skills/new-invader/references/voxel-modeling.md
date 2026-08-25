# Voxel modeling

All model code goes in `js/aliens.js`, appended after the last existing model
section. Copy the shape of the Wasp section (search `// Wasp (row 8)`) —
it is the newest and most complete worked example.

## The toolkit

Imported at the top of `js/aliens.js` from `./voxel.js`:

```js
import { buildVoxelGeometry, mirrorBoxes, saucerTier,
         buildLimbSegmentGeometry, buildLimbChain } from './voxel.js';
```

`js/voxel.js` also exports `buildTailSegmentGeometry` and `buildTailChain` —
the same chain idea but running along `+Z` instead of `-Y`, for a tail or a
forward-projecting boom. Neither is currently imported by `js/aliens.js` (the
Scorpion uses its own local `buildScorpionTailChain`), so if you want one, add
it to the existing `./voxel.js` import line rather than writing a second import
statement.

| Helper | Signature | Use |
|--------|-----------|-----|
| `buildVoxelGeometry` | `(boxes) -> BufferGeometry` | Merges `{size, pos, rotX/rotY/rotZ, color}` boxes into **one** geometry with colours baked into vertex colours. |
| `mirrorBoxes` | `(boxes) -> boxes` | Mirrors a box list across X (negates `pos[0]`, `rotY`, `rotZ`). |
| `saucerTier` | `(width, depth, height, y, color) -> boxes` | Three unioned boxes forming a cut-corner disc. |
| `buildLimbSegmentGeometry` | `({length,width,...}, color, trimColor) -> geom` | One limb segment extending **downward** (−Y) from its origin. |
| `buildLimbChain` | `(mount, geometries, segments, material, offsetSign) -> Mesh[]` | Parents each segment to the previous one so bends propagate. Pass `-1` for downward limbs. |

`buildLimbChain` reads `segment.baseBend` (or `baseTilt`, or `bend`) and stores
it on `mesh.userData.baseBend`, also setting `mesh.rotation.z` to it. Your
animation **must** offset from `segment.userData.baseBend` rather than writing
`rotation.z` absolutely, or the rest pose is lost.

## Rules that produce silent damage if broken

**Merge, never replace, `userData`.** Builders stash animated parts there and
`createAliens()` / `createAlienPreview()` merge into it afterwards. Write
`group.userData.thorax = thorax;` or `Object.assign(group.userData, {...})`.
Assigning `group.userData = { ... }` anywhere destroys per-part animation.

**Any material you animate per-instance must be `.clone()`d at build time.**
A registry material is shared by every alien of that type; animating it writes
one value for all of them (and for all copies of the part on one model). Clone
at the `new THREE.Mesh(geom, parts.xMaterial.clone())` call site. Materials you
never animate should stay shared, for performance.

**Set `vertexColors: true`** on every material rendering a `buildVoxelGeometry`
result, or the baked colours are ignored and the model renders flat white.

**Keep emissive low enough that the colour ramp survives.** Emissive adds flat
on top of vertex colours, so a bright emissive floods every tier equally and
the sculpt collapses into one mass under bloom. Existing shell materials run
`emissiveIntensity: 0.18–0.7` (0.65–0.7 for the mid-toned types, 0.18 for the
Sentinel, whose dark plates needed the lowest setting in the roster). Spread the
ramp wide in value and tint it — the Invader's original
`0xffffff → 0xeaeaea → 0xcccccc` (≈8% of value) under emissive 1.15 made every
bevel invisible. Reserve intensities above 1.5 for small accent parts (eyes,
stingers, edge trim).

Whatever you pick, check it at gameplay distance and not only in the Bestiary,
which runs reduced bloom — see the colour section in `SKILL.md`.

**A part's origin must sit at the point you rotate or scale about.** If you
will rotate or scale a mesh, centre its geometry on the pivot and carry the
offset on `mesh.position` (or on a parent `THREE.Group` pivot). Baking
`pos: [0, 1.4, 0]` into a geometry and then calling `scale.setScalar()` scales
the offset too and throws the part across the model. Moving a parent's origin
also moves its children, so compensate child offsets.

**Half-width budget ≈ 0.95.** `ALIEN_SPACING` is 2 and the player-missile
collision radius is 1.2 from the group origin. Measure the **animated peak**
(a limb at full extension), not the rest pose. Row 3 (UFO) already exceeds this
at ~1.68 and is a known outstanding cleanup item — do not use it as licence.

## Skeleton

```js
// ---------------------------------------------------------------------------
// <Name> (row N) - <one-line concept>
// ---------------------------------------------------------------------------

// Ramp: dark -> mid -> bright. Spread the value widely; emissive flattens it.
const <NAME>_DARK   = 0x1c100d;
const <NAME>_SHADE  = 0x65300f;
const <NAME>_MID    = 0xc8620d;
const <NAME>_BRIGHT = 0xffad28;
const <NAME>_HOT    = 0xffdf70;

// Body: stacked tiers read as a rounded form while staying blocky.
const <NAME>_BODY = [
    { size: [0.72, 0.28, 0.50], pos: [0, 0.10, 0.08], color: <NAME>_SHADE },
    { size: [0.88, 0.20, 0.42], pos: [0, -0.04, 0.02], color: <NAME>_MID },
    // ... keep every |pos[0]| + size[0]/2 under 0.95
];

const <NAME>_EYES = [
    { size: [0.20, 0.18, 0.08], pos: [-0.23, 0.13, 0.48], color: <NAME>_HOT },
    { size: [0.20, 0.18, 0.08], pos: [ 0.23, 0.13, 0.48], color: <NAME>_HOT }
];

// One side only — mirrorBoxes() builds the other. scale.x = -1 would invert
// normals and break lighting on that half.
const <NAME>_ARM = [
    { size: [0.30, 0.08, 0.42], pos: [-0.18, 0.20, 0.00], rotZ: -0.18, color: <NAME>_MID }
];

const <NAME>_LEG_SEGMENTS = [
    { length: 0.24, width: 0.10, baseBend:  0.88 },
    { length: 0.20, width: 0.08, baseBend: -1.25 },
    { length: 0.12, width: 0.06, baseBend: -0.28 }
];

const <NAME>_LEG_MOUNTS = [
    { side: -1, z:  0.22, phase: 0 },
    { side: -1, z: -0.22, phase: Math.PI },
    { side:  1, z:  0.22, phase: Math.PI },
    { side:  1, z: -0.22, phase: 0 }
];

// Lazily built once, shared by every instance of this type.
let <name>Parts = null;

function get<Name>Parts() {
    if (<name>Parts) return <name>Parts;

    <name>Parts = {
        bodyGeometry: buildVoxelGeometry(<NAME>_BODY),
        eyeGeometry:  buildVoxelGeometry(<NAME>_EYES),
        armGeometries: {
            '-1': buildVoxelGeometry(<NAME>_ARM),
            '1':  buildVoxelGeometry(mirrorBoxes(<NAME>_ARM))
        },
        legGeometries: <NAME>_LEG_SEGMENTS.map(segment =>
            buildLimbSegmentGeometry(segment, <NAME>_MID, <NAME>_SHADE)
        ),
        shellMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true,           // required, or the ramp is discarded
            emissive: <NAME>_SHADE,
            emissiveIntensity: 0.65,      // keep low: emissive flattens the ramp
            shininess: 45,
            flatShading: true
        }),
        limbMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: <NAME>_SHADE,
            emissiveIntensity: 0.7, flatShading: true
        }),
        eyeMaterial: new THREE.MeshPhongMaterial({
            vertexColors: true, emissive: <NAME>_HOT,
            emissiveIntensity: 2.0, flatShading: true
        })
    };

    return <name>Parts;
}

function create<Name>Alien(group) {
    const parts = get<Name>Parts();

    // A child pivot carries all display motion so the formation keeps ownership
    // of group.position.x / .z. Animate this, never the group's x/z.
    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);
    group.userData.bodyPivot = bodyPivot;

    const body = new THREE.Mesh(parts.bodyGeometry, parts.shellMaterial);
    body.castShadow = true;
    bodyPivot.add(body);
    group.userData.body = body;

    // Cloned: this material's emissiveIntensity is animated per instance.
    const eyes = new THREE.Mesh(parts.eyeGeometry, parts.eyeMaterial.clone());
    bodyPivot.add(eyes);
    group.userData.eyes = eyes;

    group.userData.arms = [-1, 1].map(side => {
        const mesh = new THREE.Mesh(parts.armGeometries[side], parts.limbMaterial);
        mesh.position.x = side * 0.16;   // offset on the mesh, not in the geometry
        bodyPivot.add(mesh);
        return { mesh, side };
    });

    group.userData.legs = <NAME>_LEG_MOUNTS.map(config => {
        const mount = new THREE.Group();
        mount.position.set(config.side * 0.46, -0.10, config.z);
        mount.rotation.y = config.side > 0 ? 0 : Math.PI;  // +X points outward both sides
        bodyPivot.add(mount);

        const segments = buildLimbChain(
            mount, parts.legGeometries, <NAME>_LEG_SEGMENTS, parts.limbMaterial, -1
        );

        return { mount, segments, phase: config.phase, side: config.side };
    });
}
```

## Half-width check

The model's half-width is the largest `Math.abs(pos[0]) + size[0] / 2` across all
your boxes. It must stay under 0.95. Check it without a browser:

```bash
node -e '
const banner = "// Sentinel (row 9)";          // <-- your banner comment, exactly
const src = require("fs").readFileSync("js/aliens.js","utf8");
const at = src.indexOf(banner);
if (at < 0) { console.error("BANNER NOT FOUND: " + banner); process.exit(1); }
let worst = 0, count = 0;
for (const m of src.slice(at).matchAll(/size:\s*\[([\d.]+),[^\]]*\],\s*pos:\s*\[(-?[\d.]+)/g)) {
  worst = Math.max(worst, Math.abs(+m[2]) + (+m[1]) / 2);
  count++;
}
if (count === 0) { console.error("NO BOXES MATCHED after the banner"); process.exit(1); }
console.log("boxes:", count, "rest-pose half-width:", worst.toFixed(3),
            worst < 0.95 ? "OK" : "TOO WIDE");'
```

Replace the `banner` string with your own section banner. **If it prints
`BANNER NOT FOUND` or `NO BOXES MATCHED`, that is a failure, not a pass** — the
earlier version of this script silently printed `0.000` in that case, which
looks like a perfect score.

### What this script does not catch

It only sees offsets baked into `pos[0]` in the box lists. It is blind to
placement done at build time or at run time, so it **under-reports** for two
common designs:

- a part positioned with `mesh.position.x = ...` in the builder;
- a part whose radial distance is produced by a parent pivot's rotation (the
  Sentinel's shards sit at `mesh.position.z` on a pivot rotated about Y, so
  their local `pos[0]` is 0 and the script reports `0.190` for a model whose
  real animated peak is about `0.85`).

For those, compute the peak by hand: take the largest distance from the group
origin your animation can produce, and add the part's own half-diagonal. Then
confirm visually in gameplay that neighbouring columns do not overlap at the
animation's widest moment.

Limbs that swing outward at their animated peak must also be judged visually in
the Bestiary.
