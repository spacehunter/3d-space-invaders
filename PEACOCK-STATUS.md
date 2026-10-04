# Peacock Invader Status

## Overview
- **Type**: Peacock (Type 19) - Male peacock spider (*Maratus*) transformed into a Space Invader
- **Silhouette**: Large bulbous iridescent "nurse hat" abdomen with enormous front-facing eyes, raised hairy arms in display posture, and banded legs

## Current Status
- **Model**: Complete - appended to `js/aliens.js` (lines ~5950+)
- **Spawn Wiring**: Complete - row 19 added to createAlien() switch
- **Animation**: Complete - iridescent color cycling, waving arms, pulsing eyes
- **Wiring**: In progress - needs bestiary, missile system, and constant updates

## What's Built
### Geometry
- **Abdomen ("nurse hat")**: Large bulbous dome with iridescent color bands (cyan→green→red)
- **Head**: Small cephalothorax with bright red forehead marking
- **Eyes**: Two enormous forward-facing black eyes with warm yellow highlights
- **Arms**: Two raised hairy arms with banded segments and white hair tufts
- **Legs**: Six banded legs with alternating dark/light segments

### Animation
- **Iridescent shimmer**: Abdomen color cycles through cyan, green, and red hues
- **Nurse hat display**: Abdomen fans out and pulses rhythmically
- **Arm dance**: Raised arms wave in display dance with sinusoidal rotation
- **Eye pulse**: Large eyes glow brighter and shift focus dynamically
- **Body sway**: Gentle rotation wobble for organic movement

### Colors
- Deep navy base: `0x0a1628`
- Steel blue: `0x1a3a5c`
- Bright cyan: `0x22d3ee`
- Emerald green: `0x10b981`
- Vivid red: `0xff3366`
- Warm yellow eyes: `0xffee88`
- Cream hair: `0xd4d4d8`

## Remaining Tasks
1. Update `js/constants.js` - ALIEN_ROWS to 20
2. Update `js/levels.js` - maxRows to 20
3. Add to `js/bestiary.js` BESTIARY_ENTRIES
4. Add missile system to `js/missiles.js`
5. Update README.md and other docs
6. Test with capture-invader.mjs

## Design Notes
The Peacock captures the essence of a male peacock spider's courtship display - the iridescent abdomen shown off like a nurse's hat, the raised arms in a display posture, and those enormous forward-facing eyes. The animation emphasizes the iridescent shimmering quality with color-shifting emissive materials.