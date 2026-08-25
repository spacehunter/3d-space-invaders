// Level configuration system - DRY design with base values and scaling formulas

// Boss types that rotate every 5 levels
export const BOSS_TYPES = ['mothership', 'hiveQueen', 'dreadnought', 'phantom', 'titan'];

// Base configuration for level 1
const BASE_CONFIG = {
    alienRows: 5,
    alienCols: 7,
    alienSpeed: 0.02,
    alienFireInterval: 1500,    // ms between alien fire volleys
    swoopThreshold: 5,          // aliens remaining before swoops begin
    scoreMultiplier: 1.0,
    powerUpDropRate: 0.1        // 10% base drop rate
};

// Per-level scaling multipliers
const SCALING = {
    alienSpeed: 1.12,           // 12% faster each level
    alienFireInterval: 0.94,    // 6% faster fire rate each level
    swoopThreshold: 1.3,        // swoops start with more aliens remaining
    scoreMultiplier: 1.1,       // 10% more points per level
    powerUpDropRate: 1.02       // slightly more power-ups at higher levels
};

// Hard caps to prevent impossible gameplay
const CAPS = {
    maxAlienSpeed: 0.15,
    minFireInterval: 500,
    // One row per alien type. This was 8, which capped grid rows at 0-7 and so
    // silently kept the Wasp (type 8) out of every wave despite it being fully
    // implemented; it must always equal ALIEN_ROWS, or the highest type index
    // never spawns. 13 admits the Mantis (type 12).
    maxRows: 13,
    maxCols: 11,
    maxSwoopThreshold: 15,
    maxPowerUpDropRate: 0.25
};

// Row growth pattern - when to add rows
const ROW_GROWTH_INTERVAL = 4;  // Add a row every 4 levels

// Column growth pattern - when to add columns
const COL_GROWTH_INTERVAL = 2;  // Add a column every 2 levels

/**
 * Calculate alien grid rows for a given level
 * @param {number} level - Current level (1-indexed)
 * @returns {number} Number of alien rows
 */
function calculateRows(level) {
    const additionalRows = Math.floor((level - 1) / ROW_GROWTH_INTERVAL);
    return Math.min(BASE_CONFIG.alienRows + additionalRows, CAPS.maxRows);
}

/**
 * Calculate alien grid columns for a given level
 * @param {number} level - Current level (1-indexed)
 * @returns {number} Number of alien columns
 */
function calculateCols(level) {
    const additionalCols = Math.floor((level - 1) / COL_GROWTH_INTERVAL);
    return Math.min(BASE_CONFIG.alienCols + additionalCols, CAPS.maxCols);
}

/**
 * Determine boss type for boss levels
 * @param {number} level - Current level
 * @returns {string|null} Boss type key or null if not a boss level
 */
function getBossType(level) {
    if (level % 5 !== 0) return null;
    const bossIndex = (Math.floor(level / 5) - 1) % BOSS_TYPES.length;
    return BOSS_TYPES[bossIndex];
}

/**
 * Get the boss enhancement level (how many times this boss type has appeared)
 * @param {number} level - Current level
 * @returns {number} Enhancement tier (1 for first appearance, 2 for second, etc.)
 */
function getBossEnhancement(level) {
    if (level % 5 !== 0) return 0;
    return Math.ceil(level / (5 * BOSS_TYPES.length));
}

/**
 * Get complete level configuration with all computed values
 * @param {number} level - Current level (1-indexed)
 * @returns {Object} Complete configuration for the level
 */
export function getLevelConfig(level) {
    const isBossLevel = level % 5 === 0;

    const config = {
        level: level,

        // Alien grid configuration
        alienRows: calculateRows(level),
        alienCols: calculateCols(level),

        // Speed and difficulty scaling
        alienSpeed: Math.min(
            BASE_CONFIG.alienSpeed * Math.pow(SCALING.alienSpeed, level - 1),
            CAPS.maxAlienSpeed
        ),

        alienFireInterval: Math.max(
            BASE_CONFIG.alienFireInterval * Math.pow(SCALING.alienFireInterval, level - 1),
            CAPS.minFireInterval
        ),

        swoopThreshold: Math.min(
            Math.floor(BASE_CONFIG.swoopThreshold * Math.pow(SCALING.swoopThreshold, level - 1)),
            CAPS.maxSwoopThreshold
        ),

        // Scoring
        scoreMultiplier: BASE_CONFIG.scoreMultiplier * Math.pow(SCALING.scoreMultiplier, level - 1),

        // Power-ups
        powerUpDropRate: Math.min(
            BASE_CONFIG.powerUpDropRate * Math.pow(SCALING.powerUpDropRate, level - 1),
            CAPS.maxPowerUpDropRate
        ),

        // Boss configuration
        isBossLevel: isBossLevel,
        bossType: getBossType(level),
        bossEnhancement: getBossEnhancement(level),

        // Computed values
        totalAliens: calculateRows(level) * calculateCols(level)
    };

    return config;
}

/**
 * Calculate level completion bonus points
 * @param {number} level - Completed level
 * @param {boolean} noDamageTaken - True if player took no damage during level
 * @param {number} remainingLives - Lives remaining at level completion
 * @returns {Object} Bonus breakdown and total
 */
export function getLevelBonus(level, noDamageTaken, remainingLives = 3) {
    // Base bonus increases with level
    const baseBonus = 500 * level;

    // Perfect round bonus (no damage taken)
    const perfectBonus = noDamageTaken ? baseBonus : 0;

    // Life bonus
    const lifeBonus = remainingLives * 100;

    // Speed bonus for higher levels (cleared quickly)
    const speedBonus = level >= 5 ? 200 * Math.floor(level / 5) : 0;

    return {
        baseBonus,
        perfectBonus,
        lifeBonus,
        speedBonus,
        total: baseBonus + perfectBonus + lifeBonus + speedBonus
    };
}

/**
 * Get display name for a level
 * @param {number} level - Level number
 * @returns {string} Display name
 */
export function getLevelDisplayName(level) {
    const config = getLevelConfig(level);
    if (config.isBossLevel) {
        const bossNames = {
            'mothership': 'THE MOTHERSHIP',
            'hiveQueen': 'THE HIVE QUEEN',
            'dreadnought': 'THE DREADNOUGHT',
            'phantom': 'THE PHANTOM',
            'titan': 'THE TITAN'
        };
        return bossNames[config.bossType] || 'BOSS BATTLE';
    }
    return `LEVEL ${level}`;
}

/**
 * Get difficulty description for UI
 * @param {number} level - Level number
 * @returns {string} Difficulty tier name
 */
export function getDifficultyTier(level) {
    if (level <= 3) return 'RECRUIT';
    if (level <= 6) return 'SOLDIER';
    if (level <= 10) return 'VETERAN';
    if (level <= 15) return 'ELITE';
    if (level <= 20) return 'COMMANDER';
    if (level <= 30) return 'LEGENDARY';
    return 'IMPOSSIBLE';
}

/**
 * Check if this is the first level (for tutorial hints)
 * @param {number} level - Level number
 * @returns {boolean}
 */
export function isFirstLevel(level) {
    return level === 1;
}

/**
 * Get wave announcement text
 * @param {number} level - Level number
 * @returns {Object} Title and subtitle for wave announcement
 */
export function getWaveAnnouncement(level) {
    const config = getLevelConfig(level);

    if (config.isBossLevel) {
        return {
            title: 'WARNING',
            subtitle: getLevelDisplayName(level),
            color: 0xff0000,  // Red for boss
            isBoss: true
        };
    }

    return {
        title: `LEVEL ${level}`,
        subtitle: getDifficultyTier(level),
        color: 0x00ffff,  // Cyan for normal
        isBoss: false
    };
}

// Export base config for reference
export { BASE_CONFIG, SCALING, CAPS };
