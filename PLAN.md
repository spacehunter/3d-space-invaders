# Level-Based Weapon Progression System

## Overview

Introduce permanent weapon unlocks tied to level progression. Unlike temporary power-ups, these weapons persist once unlocked and can be switched between during gameplay.

---

## Proposed Weapon Arsenal

### Tier 1: Starting Weapons
| Weapon | Unlocked | Fire Rate | Description |
|--------|----------|-----------|-------------|
| **Pulse Cannon** | Level 1 (default) | 400ms | Standard yellow missile, single shot |

### Tier 2: Early Game Unlocks (Levels 3-8)
| Weapon | Unlocked | Fire Rate | Description |
|--------|----------|-----------|-------------|
| **Twin Blasters** | Level 3 | 350ms | Two parallel missiles fired simultaneously |
| **Plasma Lance** | Level 6 | 800ms | High-damage piercing shot (passes through enemies) |

### Tier 3: Mid Game Unlocks (Levels 10-15)
| Weapon | Unlocked | Fire Rate | Description |
|--------|----------|-----------|-------------|
| **Scatter Cannon** | Level 10 | 500ms | 5-way spread (wider than power-up spread shot) |
| **Homing Missiles** | Level 13 | 600ms | Lock-on missiles that track nearest alien |

### Tier 4: Late Game Unlocks (Levels 18-25)
| Weapon | Unlocked | Fire Rate | Description |
|--------|----------|-----------|-------------|
| **Railgun** | Level 18 | 1200ms | Instant-hit beam weapon, hits all enemies in line |
| **Nova Burst** | Level 22 | 2000ms | Charged AOE explosion around player position |

---

## Implementation Plan

### Step 1: Create Weapons Module (`js/weapons.js`)

Create a new module to manage weapon definitions, unlocks, and selection.

```javascript
// Key exports:
export const WEAPONS = { ... }           // Weapon definitions
export function getUnlockedWeapons(level) // Returns array of available weapons
export function getCurrentWeapon()        // Active weapon getter
export function setCurrentWeapon(type)    // Active weapon setter
export function isWeaponUnlocked(type, level) // Check unlock status
export function getWeaponConfig(type)     // Get weapon stats
export function resetWeapons()            // Reset to default weapon
```

**Weapon Definition Structure:**
```javascript
{
  type: 'TWIN_BLASTERS',
  name: 'Twin Blasters',
  unlockLevel: 3,
  fireRate: 350,
  damage: 1,
  projectileCount: 2,
  projectileSpacing: 0.8,
  color: 0x00ffff,
  description: 'Fires two parallel shots'
}
```

### Step 2: Modify Missile System (`js/missiles.js`)

Update `fireMissile()` to support different weapon types:

1. Import weapon configuration from `weapons.js`
2. Create weapon-specific missile factories:
   - `createPulseMissile()` - existing standard missile
   - `createTwinMissile()` - parallel dual shots
   - `createPlasmaMissile()` - piercing projectile (new pierce flag)
   - `createScatterMissiles()` - 5-way spread pattern
   - `createHomingMissile()` - player-side homing logic
   - `createRailgunBeam()` - instant raycast damage
   - `createNovaBurst()` - AOE damage zone

3. Add missile properties:
   - `piercing: boolean` - continues through enemies
   - `homing: boolean` - tracks nearest target
   - `damage: number` - damage per hit (default 1)
   - `isBeam: boolean` - instant raycast vs projectile

4. Update `updateMissiles()` collision detection:
   - Check `piercing` flag to not destroy on hit
   - Add homing update logic for player missiles
   - Handle beam weapons with raycast

### Step 3: Add Weapon Selection UI

Create weapon selector in `index.html` and `js/ui.js`:

1. **Weapon HUD** (bottom-left corner):
   - Current weapon icon/name
   - Weapon hotkey indicators (1-7)
   - Cooldown indicator bar

2. **Weapon Unlock Notification**:
   - "NEW WEAPON UNLOCKED!" banner on level complete
   - Weapon name and description
   - Auto-dismiss after 3 seconds

3. **Controls**:
   - Number keys 1-7 to switch weapons
   - Mouse wheel to cycle through unlocked weapons

### Step 4: Integrate with Level System (`js/levels.js`, `js/game.js`)

1. **On Level Complete**:
   - Check if new weapons unlocked at new level
   - Trigger unlock notification UI
   - Play unlock sound effect

2. **Track Unlocked Weapons**:
   - Store unlocked weapons in game state
   - Persist across level transitions
   - Reset on game restart (back to level 1 = pulse cannon only)

3. **Level Config Extension**:
   ```javascript
   getLevelConfig(level) {
     return {
       ...existingConfig,
       newWeaponUnlock: getWeaponUnlockedAtLevel(level)
     }
   }
   ```

### Step 5: Integrate with Input System (`js/input.js`)

Add keyboard handlers for weapon switching:

```javascript
// Number keys 1-7 for direct weapon selection
// Mouse wheel for cycling
// Q/E for previous/next weapon (alternative)
```

### Step 6: Add Weapon Audio (`js/audio.js`)

Create distinct sounds for each weapon type:

- `playPulseSound()` - existing missile sound
- `playTwinBlasterSound()` - dual shot effect
- `playPlasmaSound()` - charging energy beam
- `playScatterSound()` - shotgun-style blast
- `playHomingSound()` - lock-on beep + launch
- `playRailgunSound()` - electric discharge
- `playNovaSound()` - explosion buildup + burst
- `playWeaponUnlockSound()` - achievement fanfare

### Step 7: Visual Effects (`js/particles.js`)

Add weapon-specific particle effects:

- **Plasma Lance**: Energy trail, glow aura
- **Homing Missiles**: Smoke trail, target indicator
- **Railgun**: Lightning effect, impact sparks
- **Nova Burst**: Expanding shockwave ring

---

## File Changes Summary

| File | Changes |
|------|---------|
| `js/weapons.js` | **NEW** - Weapon definitions and state management |
| `js/missiles.js` | Weapon-specific missile creation and behavior |
| `js/game.js` | Weapon unlock checks, state integration |
| `js/levels.js` | Add weapon unlock info to level config |
| `js/input.js` | Weapon switching keyboard/mouse handlers |
| `js/audio.js` | New weapon sound effects |
| `js/particles.js` | Weapon-specific visual effects |
| `js/ui.js` | **NEW** - Weapon HUD and unlock notifications |
| `index.html` | Weapon UI elements, CSS for HUD |
| `js/main.js` | Initialize weapons system |

---

## Implementation Order

1. **Phase 1: Core Weapon System**
   - [ ] Create `js/weapons.js` with weapon definitions
   - [ ] Add weapon state management (current weapon, unlocks)
   - [ ] Implement basic weapon switching logic

2. **Phase 2: Missile Integration**
   - [ ] Refactor `fireMissile()` to use weapon config
   - [ ] Implement Twin Blasters (simplest new weapon)
   - [ ] Implement Plasma Lance with piercing
   - [ ] Implement Scatter Cannon with spread pattern

3. **Phase 3: Advanced Weapons**
   - [ ] Implement Homing Missiles with tracking
   - [ ] Implement Railgun with raycast
   - [ ] Implement Nova Burst with AOE

4. **Phase 4: UI & Polish**
   - [ ] Add weapon selection UI/HUD
   - [ ] Add unlock notifications
   - [ ] Implement keyboard weapon switching
   - [ ] Add weapon-specific audio
   - [ ] Add weapon-specific particles

5. **Phase 5: Balance & Testing**
   - [ ] Playtest weapon balance
   - [ ] Adjust fire rates and damage
   - [ ] Ensure boss battles work with all weapons
   - [ ] Test power-up interaction with weapons

---

## Power-Up Interaction

Existing power-ups should enhance the current weapon:

| Power-Up | Effect on Weapons |
|----------|-------------------|
| **Rapid Fire** | Reduces current weapon's fire rate by 75% |
| **Spread Shot** | Adds +2 projectiles to current weapon pattern |
| **Barrier Repair** | No change (works as before) |

---

## Balance Considerations

1. **Damage vs Fire Rate**: Higher damage weapons have slower fire rates
2. **Skill Expression**: Railgun/Nova require timing, Homing is easier
3. **Boss Effectiveness**: Some weapons better for bosses vs waves
4. **Progression Pacing**: Major unlocks at boss clear milestones (5, 10, 15, 20)

---

## Optional Enhancements

- **Weapon Upgrades**: Collect upgrades to enhance specific weapons
- **Ammo System**: Limited ammo for powerful weapons, regenerating
- **Weapon Combos**: Quick-switch bonuses for alternating weapons
- **Challenge Modes**: Beat levels with specific weapons for bonuses
