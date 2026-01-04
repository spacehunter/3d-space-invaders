/**
 * Weapon System - Manages player weapons unlocked through level progression
 *
 * Weapons are permanent unlocks that stack with temporary power-ups.
 * Power-up effects:
 * - RAPID_FIRE: Reduces any weapon's cooldown by 75%
 * - SPREAD_SHOT: Adds +2 projectiles to any weapon pattern
 */

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
        hotkey: 1
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
        hotkey: 2
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
        hotkey: 3
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
        spread: 0.52, // ~30 degrees total spread
        color: 0xff8800,
        emissiveIntensity: 4.0,
        special: null,
        hotkey: 4
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
        hotkey: 5
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
        hotkey: 6
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
        hotkey: 7
    }
};

// Ordered list for iteration and hotkey mapping
export const WEAPON_ORDER = [
    'PULSE_CANNON',
    'TWIN_BLASTERS',
    'PLASMA_LANCE',
    'SCATTER_CANNON',
    'HOMING_MISSILES',
    'RAILGUN',
    'NOVA_BURST'
];

// State
let currentWeapon = 'PULSE_CANNON';
let unlockedWeapons = ['PULSE_CANNON'];
let pendingUnlock = null;
let weaponSwitchCallback = null;
let weaponUnlockCallback = null;

/**
 * Get the current equipped weapon ID
 * @returns {string} Current weapon ID
 */
export function getCurrentWeapon() {
    return currentWeapon;
}

/**
 * Get the current weapon's full configuration
 * @returns {Object} Weapon config object
 */
export function getCurrentWeaponConfig() {
    return WEAPONS[currentWeapon];
}

/**
 * Set the current weapon (if unlocked)
 * @param {string} weaponId - Weapon ID to equip
 * @returns {boolean} True if weapon was equipped
 */
export function setCurrentWeapon(weaponId) {
    if (unlockedWeapons.includes(weaponId)) {
        const previousWeapon = currentWeapon;
        currentWeapon = weaponId;

        if (weaponSwitchCallback && previousWeapon !== weaponId) {
            weaponSwitchCallback(WEAPONS[weaponId]);
        }

        return true;
    }
    return false;
}

/**
 * Get list of unlocked weapon IDs
 * @returns {string[]} Array of unlocked weapon IDs
 */
export function getUnlockedWeapons() {
    return [...unlockedWeapons];
}

/**
 * Check if a specific weapon is unlocked
 * @param {string} weaponId - Weapon ID to check
 * @returns {boolean} True if weapon is unlocked
 */
export function isWeaponUnlocked(weaponId) {
    return unlockedWeapons.includes(weaponId);
}

/**
 * Get weapon configuration by ID
 * @param {string} weaponId - Weapon ID
 * @returns {Object|null} Weapon config or null if not found
 */
export function getWeaponConfig(weaponId) {
    return WEAPONS[weaponId] || null;
}

/**
 * Check if a new weapon should be unlocked at this level
 * @param {number} level - Current level number
 * @returns {Object|null} Newly unlocked weapon config, or null if none
 */
export function checkForUnlock(level) {
    for (const weaponId of WEAPON_ORDER) {
        const weapon = WEAPONS[weaponId];
        if (weapon.unlockLevel === level && !unlockedWeapons.includes(weaponId)) {
            unlockedWeapons.push(weaponId);
            pendingUnlock = weapon;

            if (weaponUnlockCallback) {
                weaponUnlockCallback(weapon);
            }

            return weapon;
        }
    }
    return null;
}

/**
 * Get the next weapon unlock info for UI preview
 * @param {number} currentLevel - Current level number
 * @returns {Object|null} Next weapon to unlock with levels remaining
 */
export function getNextUnlock(currentLevel) {
    for (const weaponId of WEAPON_ORDER) {
        const weapon = WEAPONS[weaponId];
        if (weapon.unlockLevel > currentLevel) {
            return {
                weapon: weapon,
                levelsRemaining: weapon.unlockLevel - currentLevel
            };
        }
    }
    return null; // All weapons unlocked
}

/**
 * Get pending unlock (for showing unlock celebration)
 * @returns {Object|null} Pending weapon unlock
 */
export function getPendingUnlock() {
    return pendingUnlock;
}

/**
 * Clear the pending unlock after celebration is shown
 */
export function clearPendingUnlock() {
    pendingUnlock = null;
}

/**
 * Cycle to next/previous weapon
 * @param {number} direction - 1 for next, -1 for previous
 * @returns {boolean} True if weapon changed
 */
export function cycleWeapon(direction) {
    const currentIndex = unlockedWeapons.indexOf(currentWeapon);
    if (currentIndex === -1) return false;

    let newIndex = currentIndex + direction;

    // Wrap around
    if (newIndex < 0) {
        newIndex = unlockedWeapons.length - 1;
    } else if (newIndex >= unlockedWeapons.length) {
        newIndex = 0;
    }

    return setCurrentWeapon(unlockedWeapons[newIndex]);
}

/**
 * Select weapon by hotkey number (1-7)
 * @param {number} hotkeyNum - Hotkey number 1-7
 * @returns {boolean} True if weapon was selected
 */
export function selectWeaponByHotkey(hotkeyNum) {
    for (const weaponId of unlockedWeapons) {
        if (WEAPONS[weaponId].hotkey === hotkeyNum) {
            return setCurrentWeapon(weaponId);
        }
    }
    return false;
}

/**
 * Set callback for weapon switch events
 * @param {Function} callback - Called with weapon config when weapon changes
 */
export function setWeaponSwitchCallback(callback) {
    weaponSwitchCallback = callback;
}

/**
 * Set callback for weapon unlock events
 * @param {Function} callback - Called with weapon config when weapon unlocks
 */
export function setWeaponUnlockCallback(callback) {
    weaponUnlockCallback = callback;
}

/**
 * Reset weapon system to initial state (for new game)
 */
export function resetWeapons() {
    currentWeapon = 'PULSE_CANNON';
    unlockedWeapons = ['PULSE_CANNON'];
    pendingUnlock = null;
}

/**
 * Unlock all weapons (for testing/debug)
 */
export function unlockAllWeapons() {
    unlockedWeapons = [...WEAPON_ORDER];
}

/**
 * Get weapon count info for UI
 * @returns {Object} {unlocked: number, total: number}
 */
export function getWeaponCounts() {
    return {
        unlocked: unlockedWeapons.length,
        total: WEAPON_ORDER.length
    };
}
