// Settings Manager for 3D Space Invaders
// Handles all game settings with localStorage persistence and event system

export class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.isOpen = false;
        this.listeners = {};
        this.panel = null;
        this.overlay = null;
        this.toggleButton = null;
        this.isPaused = false;
    }

    // Default settings
    getDefaults() {
        return {
            // Audio
            masterVolume: 100,
            sfxVolume: 80,
            musicVolume: 100,
            muteAll: false,

            // Visual
            glowIntensity: 1.5,
            particleDensity: 100,
            showFPS: true,

            // Gameplay
            mouseSensitivity: 1.0,
            showHitboxes: false
        };
    }

    // Load settings from localStorage with migration support
    loadSettings() {
        const defaults = this.getDefaults();

        // Migrate old glow intensity setting
        const oldGlow = localStorage.getItem('spaceInvaders3D_glowIntensity');
        if (oldGlow !== null && !localStorage.getItem('spaceInvaders3D_settings')) {
            const migratedSettings = { ...defaults, glowIntensity: parseFloat(oldGlow) };
            localStorage.setItem('spaceInvaders3D_settings', JSON.stringify(migratedSettings));
            localStorage.removeItem('spaceInvaders3D_glowIntensity');
            return migratedSettings;
        }

        // Load from localStorage
        const saved = localStorage.getItem('spaceInvaders3D_settings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem('spaceInvaders3D_settings', JSON.stringify(this.settings));
    }

    // Update a setting and notify listeners
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.notifyListeners(key, value);
    }

    // Get a setting value
    getSetting(key) {
        return this.settings[key];
    }

    // Register a listener for setting changes
    on(setting, callback) {
        if (!this.listeners[setting]) {
            this.listeners[setting] = [];
        }
        this.listeners[setting].push(callback);
    }

    // Notify all listeners for a setting
    notifyListeners(key, value) {
        if (this.listeners[key]) {
            this.listeners[key].forEach(callback => callback(value));
        }
    }

    // Initialize the settings panel UI
    init() {
        this.panel = document.getElementById('settingsPanel');
        this.overlay = document.getElementById('settingsOverlay');
        this.toggleButton = document.getElementById('settingsToggle');

        if (!this.panel || !this.overlay || !this.toggleButton) {
            console.error('Settings panel elements not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Apply initial settings
        this.applyAllSettings();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    // Setup all UI event listeners
    setupEventListeners() {
        // Toggle button
        this.toggleButton.addEventListener('click', () => this.toggle());

        // Close button
        const closeBtn = document.getElementById('closeSettings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Overlay click to close
        this.overlay.addEventListener('click', () => this.close());

        // Reset defaults button
        const resetBtn = document.getElementById('resetDefaults');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }

        // Audio settings
        this.setupSlider('masterVolume', 0, 100, 1, '%');
        this.setupSlider('sfxVolume', 0, 100, 1, '%');
        this.setupSlider('musicVolume', 0, 100, 1, '%');
        this.setupToggle('muteAll');

        // Visual settings
        this.setupSlider('glowIntensity', 0, 3, 0.05, '');
        this.setupSlider('particleDensity', 0, 100, 1, '%');
        this.setupToggle('showFPS');

        // Gameplay settings
        this.setupSlider('mouseSensitivity', 0.5, 2.0, 0.1, 'x');
        this.setupToggle('showHitboxes');
    }

    // Setup a slider control
    setupSlider(settingKey, min, max, step, suffix) {
        const slider = document.getElementById(settingKey);
        const valueDisplay = document.getElementById(settingKey + 'Value');

        if (!slider || !valueDisplay) return;

        // Set initial value
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = this.settings[settingKey];

        // Update display
        const displayValue = suffix === '%' ? Math.round(this.settings[settingKey]) : this.settings[settingKey].toFixed(2);
        valueDisplay.textContent = displayValue + suffix;

        // Handle changes
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const displayValue = suffix === '%' ? Math.round(value) : value.toFixed(2);

            // Animate value change
            this.animateValueChange(valueDisplay, displayValue + suffix);

            this.updateSetting(settingKey, value);
        });
    }

    // Setup a toggle/checkbox control
    setupToggle(settingKey) {
        const toggle = document.getElementById(settingKey);
        const label = document.querySelector(`label[for="${settingKey}"] .toggle-state`);

        if (!toggle) return;

        // Set initial value
        toggle.checked = this.settings[settingKey];
        if (label) {
            label.textContent = toggle.checked ? 'ON' : 'OFF';
            label.classList.toggle('on', toggle.checked);
        }

        // Handle changes
        toggle.addEventListener('change', (e) => {
            const value = e.target.checked;
            if (label) {
                label.textContent = value ? 'ON' : 'OFF';
                label.classList.toggle('on', value);
            }
            this.updateSetting(settingKey, value);
        });
    }

    // Animate value change with smooth counter
    animateValueChange(element, targetText) {
        // Add flash effect
        element.style.transition = 'none';
        element.style.filter = 'brightness(1.5)';

        setTimeout(() => {
            element.style.transition = 'filter 0.3s ease-out';
            element.style.filter = 'brightness(1)';
        }, 50);

        element.textContent = targetText;
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isOpen) {
                    this.close();
                } else {
                    this.open();
                }
            }
        });
    }

    // Open settings panel
    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.panel.classList.add('open');
        this.overlay.classList.add('active');
        document.body.classList.add('settings-open');

        // Trigger staggered animation for settings items
        const items = this.panel.querySelectorAll('.setting-item, .settings-section h3');
        items.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.05}s`;
        });

        // Notify that panel is open (for game pause)
        this.notifyListeners('panelOpen', true);
    }

    // Close settings panel
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.panel.classList.remove('open');
        this.overlay.classList.remove('active');
        document.body.classList.remove('settings-open');

        // Notify that panel is closed (for game resume)
        this.notifyListeners('panelOpen', false);
    }

    // Toggle settings panel
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    // Reset all settings to defaults
    resetToDefaults() {
        if (!confirm('Reset all settings to default values?')) {
            return;
        }

        this.settings = this.getDefaults();
        this.saveSettings();

        // Update all UI controls
        for (const key in this.settings) {
            const slider = document.getElementById(key);
            const toggle = document.getElementById(key);

            if (slider && slider.type === 'range') {
                slider.value = this.settings[key];
                const valueDisplay = document.getElementById(key + 'Value');
                if (valueDisplay) {
                    const suffix = key.includes('Volume') || key.includes('Density') ? '%' :
                                   key === 'mouseSensitivity' ? 'x' : '';
                    const displayValue = suffix === '%' ? Math.round(this.settings[key]) :
                                       suffix === 'x' ? this.settings[key].toFixed(1) :
                                       this.settings[key].toFixed(2);
                    valueDisplay.textContent = displayValue + suffix;
                }
            }

            if (toggle && toggle.type === 'checkbox') {
                toggle.checked = this.settings[key];
                const label = document.querySelector(`label[for="${key}"] .toggle-state`);
                if (label) {
                    label.textContent = toggle.checked ? 'ON' : 'OFF';
                    label.classList.toggle('on', toggle.checked);
                }
            }

            // Notify listeners
            this.notifyListeners(key, this.settings[key]);
        }
    }

    // Apply all settings (called on init)
    applyAllSettings() {
        for (const key in this.settings) {
            this.notifyListeners(key, this.settings[key]);
        }
    }
}

// Export singleton instance
export const settingsManager = new SettingsManager();
