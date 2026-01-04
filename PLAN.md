# Level-Based Weapon Progression System

## Design Philosophy: The Hook Loop

The weapon system creates a **"just one more level"** compulsion through:

1. **Anticipation** - Players see weapon unlocks coming (UI shows next unlock)
2. **Reward** - Satisfying unlock moment with fanfare and immediate power boost
3. **Mastery** - Learning new weapon mechanics keeps gameplay fresh
4. **Synergy** - Power-ups amplify weapons differently, creating discovery moments

---

## Integration with Existing Systems

### Current Power-Up System (powerups.js)
The existing system provides **temporary** boosts:
- `RAPID_FIRE` - 100ms fire rate (vs 400ms default) for 10 seconds
- `SPREAD_SHOT` - 3 missiles in a spread for 10 seconds
- `BARRIER_REPAIR` - Instant barrier restoration

### New Weapon System Philosophy
Permanent weapons that **stack** with power-ups:

| Power-Up | Effect on New Weapons |
|----------|----------------------|
| **Rapid Fire** | Reduces ANY weapon's cooldown by 75% |
| **Spread Shot** | Adds +2 projectiles to ANY weapon pattern |
| **Barrier Repair** | Unchanged (works as before) |

This creates exciting combinations:
- Twin Blasters + Spread Shot = **5 parallel beams**
- Railgun + Rapid Fire = **Continuous beam barrage**
- Scatter Cannon + Spread Shot = **7-way devastation**

---

## Weapon Arsenal (7 Weapons)

### Starting Weapon (Level 1)

#### 🔹 Pulse Cannon (Default)
The familiar single-shot weapon players start with.

| Property | Value |
|----------|-------|
| Fire Rate | 400ms |
| Projectiles | 1 |
| Damage | 1 |
| Special | Smart tracking for Bonus UFO |

**Feeling**: Reliable, predictable, safe. The baseline experience.

---

### Early Unlocks (Wave Completion Rewards)

#### 🔸 Twin Blasters (Level 3)
*"Double your trouble"*

Unlocked after completing Level 2 - the first taste of power.

| Property | Value |
|----------|-------|
| Fire Rate | 350ms |
| Projectiles | 2 (parallel, 0.8 units apart) |
| Damage | 1 per shot |
| Color | Cyan (0x00ffff) |

**Why Level 3?**
- Player has proven basic skill (survived 2 levels)
- Early enough to feel the reward loop quickly
- Simple upgrade that's immediately satisfying

**Feeling**: "I'm getting stronger!" First power spike.

---

#### 🔸 Plasma Lance (Level 6)
*"Pierce through the horde"*

Unlocked after first boss (Level 5 Mothership) - boss kill reward!

| Property | Value |
|----------|-------|
| Fire Rate | 800ms (slower, deliberate) |
| Projectiles | 1 |
| Damage | 2 |
| Special | **Piercing** - passes through enemies |
| Color | Purple (0xff00ff) with energy trail |

**Why Level 6?**
- Reward for defeating first boss
- Introduces new mechanic (piercing) to master
- Slower fire rate teaches timing/precision

**Feeling**: "That boss fight was worth it!" Strategic weapon choice.

---

### Mid-Game Unlocks (Escalating Power)

#### 🔶 Scatter Cannon (Level 10)
*"Nowhere to hide"*

Unlocked after Hive Queen boss - the crowd control weapon.

| Property | Value |
|----------|-------|
| Fire Rate | 500ms |
| Projectiles | 5 (spread pattern: -30°, -15°, 0°, +15°, +30°) |
| Damage | 1 per shot |
| Color | Orange (0xff8800) |

**Why Level 10?**
- Alien waves are now 6 rows × 8+ columns (bigger grids)
- Scatter handles increased enemy density
- With Spread Shot power-up: 7 projectiles = screen coverage

**Feeling**: "The odds are evening out." Power fantasy moment.

---

#### 🔶 Homing Missiles (Level 13)
*"Lock on, let go"*

Strategic weapon for precise situations.

| Property | Value |
|----------|-------|
| Fire Rate | 600ms |
| Projectiles | 1 |
| Damage | 1 |
| Special | **Homing** - tracks nearest alien/boss |
| Color | Green (0x00ff00) with smoke trail |
| Lock Range | 15 units, 45° cone from player |

**Why Level 13?**
- Alien speed has increased significantly
- Gives players a "reliable" option when overwhelmed
- Creates tactical choice: accuracy vs raw damage

**Feeling**: "I can breathe again." Stress relief weapon.

---

### Late-Game Unlocks (Mastery Weapons)

#### 🔷 Railgun (Level 18)
*"Instant devastation"*

Unlocked after Phantom boss - the skill weapon.

| Property | Value |
|----------|-------|
| Fire Rate | 1200ms (slow, punishing if missed) |
| Projectiles | 1 (instant beam) |
| Damage | 3 |
| Special | **Instant hit** - raycast, hits ALL enemies in line |
| Color | Electric blue (0x00aaff) with lightning effect |
| Visual | Full-screen beam flash, screen shake |

**Why Level 18?**
- Rewards skilled players who've mastered timing
- High risk/reward (miss = 1.2 seconds vulnerability)
- Devastating against boss weak points

**Feeling**: "I am the weapon." Mastery validation.

---

#### 🔷 Nova Burst (Level 22)
*"Clear the field"*

The ultimate weapon - for players who've proven themselves.

| Property | Value |
|----------|-------|
| Fire Rate | 2000ms (charge time) |
| Projectiles | AOE burst (8 unit radius from player) |
| Damage | 2 to all enemies in range |
| Special | **Charge mechanic** - hold to charge, release to fire |
| Color | White core, rainbow shockwave |
| Visual | Expanding ring, screen flash, massive particle burst |

**Why Level 22?**
- Titan boss (Level 20) is the ultimate test
- Nova Burst is the congratulations prize
- Changes gameplay entirely - defensive play enabled

**Feeling**: "I've beaten the game's challenge." Ultimate reward.

---

## Player Journey Map

```
Level 1-2:   [Pulse Cannon only]
             Learning basics, building confidence
                    ↓
Level 3:     ★ TWIN BLASTERS UNLOCKED ★
             "I'm getting stronger!"
                    ↓
Level 4:     [Mastering twin shots]
             Anticipating boss fight
                    ↓
Level 5:     ⚔️ MOTHERSHIP BOSS ⚔️
             Major challenge, tension peak
                    ↓
Level 6:     ★ PLASMA LANCE UNLOCKED ★
             Boss reward! "Worth the struggle!"
                    ↓
Level 7-9:   [Choosing between 3 weapons]
             Discovery: "Which fits my style?"
                    ↓
Level 10:    ⚔️ HIVE QUEEN → ★ SCATTER CANNON ★
             Power spike! Crowd control unlocked
                    ↓
Level 11-12: [4 weapons available]
             Experimenting with loadouts
                    ↓
Level 13:    ★ HOMING MISSILES UNLOCKED ★
             Relief weapon when overwhelmed
                    ↓
Level 14:    [Finding favorite weapon]
             Preparing for Dreadnought
                    ↓
Level 15:    ⚔️ DREADNOUGHT BOSS ⚔️
             Mid-game peak difficulty
                    ↓
Level 16-17: [Mastering 5 weapons]
             Feeling powerful, confident
                    ↓
Level 18:    ★ RAILGUN UNLOCKED ★
             Skill weapon! High risk, high reward
                    ↓
Level 19:    [Railgun practice]
             Learning timing, precision
                    ↓
Level 20:    ⚔️ TITAN BOSS ⚔️
             Ultimate challenge
                    ↓
Level 21:    [Victory lap feeling]
             "I beat the Titan!"
                    ↓
Level 22:    ★ NOVA BURST UNLOCKED ★
             Ultimate weapon! "I've mastered this!"
                    ↓
Level 23+:   [Full arsenal available]
             Endless challenge, all tools unlocked
```

---

## Engagement Mechanics

### 1. Unlock Preview System
Show players what's coming to build anticipation:

```
┌─────────────────────────────────┐
│ CURRENT: Twin Blasters          │
│                                 │
│ NEXT UNLOCK: Plasma Lance       │
│ ████████░░░░ Level 6 (2 to go)  │
└─────────────────────────────────┘
```

### 2. Weapon Unlock Celebration
When unlocking a new weapon:

1. **Freeze gameplay** (0.5 seconds)
2. **Fanfare sound** (triumphant jingle)
3. **Full-screen announcement**:
   ```
   ╔═══════════════════════════════╗
   ║    ★ NEW WEAPON UNLOCKED ★    ║
   ║                               ║
   ║       PLASMA LANCE            ║
   ║   "Pierce through the horde"  ║
   ║                               ║
   ║   [Press 3 to equip]          ║
   ╚═══════════════════════════════╝
   ```
4. **Auto-equip option** (player can try immediately)
5. **Particle burst** from player ship

### 3. Weapon Wheel (Quick Switch)
Hold Tab/Shift to show available weapons:

```
        [2] Twin Blasters
              ↑
[1] Pulse ←   ●   → [3] Plasma
              ↓
        [4] Scatter
```

### 4. Combo Indicators
When power-up + weapon creates a combo:

```
┌──────────────────────────┐
│ ⚡ COMBO: RAPID SCATTER  │
│    7 shots @ 125ms!      │
└──────────────────────────┘
```

---

## Technical Implementation

### New Files

#### `js/weapons.js` - Weapon System Core

```javascript
// Weapon definitions with full metadata
export const WEAPONS = {
    PULSE_CANNON: {
        id: 'PULSE_CANNON',
        name: 'Pulse Cannon',
        tagline: 'Reliable and true',
        unlockLevel: 1,
        fireRate: 400,
        damage: 1,
        projectileCount: 1,
        projectileSpacing: 0,
        spread: 0,
        color: 0xffff00,
        emissiveIntensity: 4.0,
        special: null,
        sound: 'pulse'
    },
    TWIN_BLASTERS: {
        id: 'TWIN_BLASTERS',
        name: 'Twin Blasters',
        tagline: 'Double your trouble',
        unlockLevel: 3,
        fireRate: 350,
        damage: 1,
        projectileCount: 2,
        projectileSpacing: 0.8,
        spread: 0,
        color: 0x00ffff,
        emissiveIntensity: 4.5,
        special: null,
        sound: 'twin'
    },
    PLASMA_LANCE: {
        id: 'PLASMA_LANCE',
        name: 'Plasma Lance',
        tagline: 'Pierce through the horde',
        unlockLevel: 6,
        fireRate: 800,
        damage: 2,
        projectileCount: 1,
        projectileSpacing: 0,
        spread: 0,
        color: 0xff00ff,
        emissiveIntensity: 5.0,
        special: 'piercing',
        sound: 'plasma'
    },
    SCATTER_CANNON: {
        id: 'SCATTER_CANNON',
        name: 'Scatter Cannon',
        tagline: 'Nowhere to hide',
        unlockLevel: 10,
        fireRate: 500,
        damage: 1,
        projectileCount: 5,
        projectileSpacing: 0,
        spread: 0.52, // 30 degrees in radians
        color: 0xff8800,
        emissiveIntensity: 4.0,
        special: null,
        sound: 'scatter'
    },
    HOMING_MISSILES: {
        id: 'HOMING_MISSILES',
        name: 'Homing Missiles',
        tagline: 'Lock on, let go',
        unlockLevel: 13,
        fireRate: 600,
        damage: 1,
        projectileCount: 1,
        projectileSpacing: 0,
        spread: 0,
        color: 0x00ff00,
        emissiveIntensity: 3.5,
        special: 'homing',
        sound: 'homing'
    },
    RAILGUN: {
        id: 'RAILGUN',
        name: 'Railgun',
        tagline: 'Instant devastation',
        unlockLevel: 18,
        fireRate: 1200,
        damage: 3,
        projectileCount: 1,
        projectileSpacing: 0,
        spread: 0,
        color: 0x00aaff,
        emissiveIntensity: 8.0,
        special: 'instant',
        sound: 'railgun'
    },
    NOVA_BURST: {
        id: 'NOVA_BURST',
        name: 'Nova Burst',
        tagline: 'Clear the field',
        unlockLevel: 22,
        fireRate: 2000,
        damage: 2,
        projectileCount: 0, // AOE, not projectiles
        projectileSpacing: 0,
        spread: 0,
        color: 0xffffff,
        emissiveIntensity: 10.0,
        special: 'aoe',
        aoeRadius: 8,
        sound: 'nova'
    }
};

// State
let currentWeapon = 'PULSE_CANNON';
let unlockedWeapons = ['PULSE_CANNON'];
let pendingUnlock = null;

// Core functions
export function getCurrentWeapon() { ... }
export function setCurrentWeapon(weaponId) { ... }
export function getUnlockedWeapons() { ... }
export function isWeaponUnlocked(weaponId) { ... }
export function checkForUnlock(level) { ... }
export function getNextUnlock(currentLevel) { ... }
export function getWeaponConfig(weaponId) { ... }
export function resetWeapons() { ... }
```

### Modified Files

#### `js/missiles.js` Changes

```javascript
import { getCurrentWeapon, getWeaponConfig } from './weapons.js';

export function fireMissile(player, scene) {
    const now = Date.now();
    const activePowerUp = getActivePowerUp();
    const weapon = getWeaponConfig(getCurrentWeapon());

    // Base fire rate from weapon, modified by power-up
    let fireDelay = weapon.fireRate;
    if (activePowerUp === POWERUP_TYPES.RAPID_FIRE) {
        fireDelay = Math.floor(weapon.fireRate * 0.25); // 75% faster
    }

    if (now - lastPlayerFireTime < fireDelay) return;
    lastPlayerFireTime = now;

    // Calculate projectile count (weapon base + spread shot bonus)
    let projectileCount = weapon.projectileCount;
    if (activePowerUp === POWERUP_TYPES.SPREAD_SHOT) {
        projectileCount += 2;
    }

    // Fire based on weapon type
    switch (weapon.special) {
        case 'piercing':
            firePiercingShot(player, scene, weapon);
            break;
        case 'homing':
            fireHomingMissile(player, scene, weapon);
            break;
        case 'instant':
            fireRailgun(player, scene, weapon);
            break;
        case 'aoe':
            fireNovaBurst(player, scene, weapon);
            break;
        default:
            fireStandardShots(player, scene, weapon, projectileCount);
    }

    playWeaponSound(weapon.sound);
}
```

#### `js/game.js` Changes

```javascript
import { checkForUnlock, getNextUnlock, resetWeapons } from './weapons.js';

export function handleLevelComplete() {
    // ... existing code ...

    // Check for weapon unlock at new level
    const newWeapon = checkForUnlock(nextLevel);
    if (newWeapon) {
        showWeaponUnlock(newWeapon, scene);
    }
}

function resetGame() {
    // ... existing resets ...
    resetWeapons(); // Reset to pulse cannon only
}
```

#### `js/input.js` Changes

```javascript
import { setCurrentWeapon, getUnlockedWeapons } from './weapons.js';

// Number keys 1-7 for weapon selection
document.addEventListener('keydown', (e) => {
    const key = parseInt(e.key);
    if (key >= 1 && key <= 7) {
        const weapons = getUnlockedWeapons();
        if (weapons[key - 1]) {
            setCurrentWeapon(weapons[key - 1]);
        }
    }
});

// Mouse wheel for cycling
document.addEventListener('wheel', (e) => {
    cycleWeapon(e.deltaY > 0 ? 1 : -1);
});
```

#### `js/audio.js` Additions

```javascript
// New weapon sounds
export function playTwinBlasterSound() { ... }
export function playPlasmaSound() { ... }
export function playScatterSound() { ... }
export function playHomingLockSound() { ... }
export function playRailgunSound() { ... }
export function playNovaChargeSound() { ... }
export function playNovaBurstSound() { ... }
export function playWeaponUnlockFanfare() { ... }
```

#### `index.html` UI Additions

```html
<!-- Weapon HUD (bottom-left) -->
<div id="weaponHUD">
    <div id="currentWeapon">
        <span id="weaponName">Pulse Cannon</span>
        <span id="weaponKey">[1]</span>
    </div>
    <div id="nextUnlock">
        <span>Next: Twin Blasters</span>
        <div id="unlockProgress"></div>
    </div>
</div>

<!-- Weapon unlock overlay -->
<div id="weaponUnlock" style="display: none;">
    <div class="unlock-content">
        <div class="unlock-star">★</div>
        <div class="unlock-title">NEW WEAPON UNLOCKED</div>
        <div class="unlock-name"></div>
        <div class="unlock-tagline"></div>
        <div class="unlock-hint">Press [#] to equip</div>
    </div>
</div>
```

---

## Implementation Phases

### Phase 1: Foundation (Core Weapon System)
- [ ] Create `js/weapons.js` with all weapon definitions
- [ ] Add weapon state management (current, unlocked list)
- [ ] Implement `checkForUnlock()` tied to level progression
- [ ] Add weapon switching via keyboard (1-7 keys)
- [ ] Integrate with `resetGame()` to clear unlocks

### Phase 2: Basic Weapons (Twin + Plasma)
- [ ] Refactor `fireMissile()` to use weapon config
- [ ] Implement Twin Blasters (parallel shots)
- [ ] Implement Plasma Lance with piercing flag
- [ ] Update `updateMissiles()` collision to handle piercing
- [ ] Add weapon-specific colors and emissive values

### Phase 3: Spread Weapons (Scatter)
- [ ] Implement Scatter Cannon with 5-way spread
- [ ] Create spread pattern calculation function
- [ ] Ensure power-up stacking works (+2 projectiles)

### Phase 4: Homing System
- [ ] Implement player-side homing logic
- [ ] Add target acquisition (nearest alien in cone)
- [ ] Create homing missile visual (smoke trail)
- [ ] Add lock-on indicator particle

### Phase 5: Advanced Weapons (Railgun + Nova)
- [ ] Implement Railgun raycast instant-hit
- [ ] Add screen shake and beam visual effect
- [ ] Implement Nova Burst AOE with charge mechanic
- [ ] Create expanding shockwave visual

### Phase 6: UI & Polish
- [ ] Add weapon HUD (current + next unlock)
- [ ] Create unlock celebration overlay
- [ ] Add combo notification when power-up + weapon synergize
- [ ] Implement weapon wheel (Tab hold)
- [ ] Add all weapon sounds

### Phase 7: Balance & Tuning
- [ ] Playtest each weapon at unlock level
- [ ] Adjust fire rates and damage values
- [ ] Ensure bosses remain challenging with all weapons
- [ ] Test power-up + weapon combinations
- [ ] Fine-tune unlock timing for maximum engagement

---

## Balance Guidelines

### Fire Rate vs Power
| Weapon | Shots/Sec | Damage/Shot | DPS | Notes |
|--------|-----------|-------------|-----|-------|
| Pulse Cannon | 2.5 | 1 | 2.5 | Baseline |
| Twin Blasters | 2.86 | 2 total | 5.7 | Early power spike |
| Plasma Lance | 1.25 | 2 | 2.5 | Same DPS, piercing utility |
| Scatter Cannon | 2.0 | 5 total | 10 | Crowd control king |
| Homing Missiles | 1.67 | 1 | 1.67 | Accuracy > DPS |
| Railgun | 0.83 | 3+ | 2.5+ | Multi-hit potential |
| Nova Burst | 0.5 | Area 2 | Variable | Defensive/clutch |

### Power-Up Multipliers
With Rapid Fire (75% cooldown reduction):
- Pulse: 10 shots/sec
- Scatter: 8 shots/sec (40 projectiles/sec!)
- Railgun: 3.3 shots/sec (constant beam feel)

### Boss Effectiveness
| Weapon | vs Bosses | Notes |
|--------|-----------|-------|
| Pulse | ★★☆☆☆ | Safe but slow |
| Twin | ★★★☆☆ | Good sustained damage |
| Plasma | ★★★★☆ | High damage per hit |
| Scatter | ★★☆☆☆ | Wasted spread on single target |
| Homing | ★★★☆☆ | Never misses weak points |
| Railgun | ★★★★★ | Massive damage if timed right |
| Nova | ★★☆☆☆ | Better for adds/defense |

---

## Success Metrics

The weapon system is successful if players:

1. **Stay longer** - Average session length increases
2. **Return more** - "Just one more level to unlock X"
3. **Experiment** - Players try different weapon/power-up combos
4. **Feel rewarded** - Unlock moments create genuine excitement
5. **Master the game** - Skill ceiling raised by weapon choice

---

## Future Enhancements (Post-MVP)

- **Weapon Skins** - Cosmetic variants earned through challenges
- **Upgrade Paths** - Enhance specific weapons with pickups
- **Challenge Modes** - "Beat Level 15 with Pulse Cannon only"
- **Leaderboards** - Per-weapon high scores
- **Dual Wield** - Late-game ability to use two weapons
