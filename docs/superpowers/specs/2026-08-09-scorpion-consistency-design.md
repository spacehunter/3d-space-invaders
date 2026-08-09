# Scorpion Invader Consistency Design

## Goal

Revise the Row 7 Scorpion so it reaches at least a 7/10 visual consistency score against the existing invader roster, using the Beetle as the primary reference while preserving the current venom-dart gameplay.

## Design

The Scorpion will use the roster's shared visual language: one compact hero body mass, a small number of chunky secondary parts, a saturated row color with darker recesses, and one memorable animated signature. The rebuilt silhouette will be dominated by a raised segmented tail, with a compact carapace, clear pincers, and eight readable legs. Fine compound-eye and spur details will be removed or consolidated because they do not survive the formation camera.

The palette will move from muted brown to a saturated burnt-orange/rust ramp with dark umber recesses. Amber/yellow will be reserved for the stinger and venom read, matching the Beetle's use of a single high-contrast accent while keeping Row 7 distinct from the Beetle's brighter orange shell.

The existing venom-dart firing and collision behavior stays unchanged. Animation will be simplified into the same readable rhythm as the Beetle: a low stalking idle, a clear alternating tripod gait, a compact charge pose, and a short tail strike. Tail and leg motion will remain child-local so formation position and swoop handling are not disturbed.

## Verification

- `npm run build` must pass.
- `alien-preview.html` must show the Scorpion from rest, idle, walk, charge, and strike views without console/runtime errors.
- The model must remain within the roster's approximate half-width budget in its animated rest/attack poses.
- Review will compare the Scorpion against Beetle, Tank, and Invader for silhouette clarity, palette hierarchy, part chunkiness, and animation readability; the target is 7/10 or better.
