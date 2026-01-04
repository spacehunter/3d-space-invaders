# Settings Panel Design Plan

## Executive Summary

This plan outlines the implementation of a comprehensive settings panel for 3D Space Invaders that maintains the retro arcade aesthetic while providing players with granular control over audio, visual, and gameplay settings.

## Current State Analysis

### Existing Settings Infrastructure
- **Location**: Inline HTML in `index.html` (lines 71-89)
- **Current Settings**:
  - Glow Intensity slider (0-3, default 1.5)
- **Persistence**: localStorage (`spaceInvaders3D_glowIntensity`)
- **UI Style**: Bottom-center, cyan text with glow effect
- **Pattern**: Event listener in `main.js` lines 76-94

### Existing Systems to Integrate
1. **Audio System** (`audio.js`):
   - Procedural Web Audio API
   - No volume control currently
   - Multiple sound types: explosions, missiles, UFOs, bosses, level transitions

2. **Visual System** (`main.js`):
   - UnrealBloomPass for glow effect
   - Already has adjustable bloom strength

3. **Input System** (`input.js`):
   - Mouse-based controls
   - Click and movement tracking

## Design Approach

### Option A: Slide-Out Panel (RECOMMENDED)
**Pros:**
- Non-intrusive during gameplay
- Can be toggled with keyboard shortcut (ESC or 'S')
- Doesn't block the game view completely
- Modern but fits retro aesthetic with proper styling
- Easy to expand with more settings

**Cons:**
- Slightly more complex CSS animations
- Needs toggle button or key binding

### Option B: Modal Overlay
**Pros:**
- Pauses game naturally
- Full attention on settings
- Simple to implement

**Cons:**
- Interrupts gameplay flow
- More obtrusive

### Option C: In-Game Menu (Classic Arcade)
**Pros:**
- Most authentic to arcade games
- Familiar pattern

**Cons:**
- Requires separate menu state/screen
- More complex state management

**DECISION**: Go with **Option A (Slide-Out Panel)** with game pause when open.

## Settings Panel Architecture

### Visual Design

```
┌─────────────────────────────────────┐
│           ⚙ SETTINGS                │
│─────────────────────────────────────│
│                                     │
│  AUDIO                              │
│  ═════                              │
│  Master Volume:  [████░░░░] 70%    │
│  SFX Volume:     [██████░░] 80%    │
│  Music Volume:   [████████] 100%   │
│  Mute All:       [ ] OFF           │
│                                     │
│  VISUAL                             │
│  ═══════                            │
│  Glow Intensity: [█████░░░] 1.50   │
│  Particle Density: [████░░░░] 60%  │
│  FPS Display:    [✓] ON            │
│                                     │
│  GAMEPLAY                           │
│  ═════════                          │
│  Mouse Sensitivity: [████░░░░] 1.0 │
│  Show Hitboxes:  [ ] OFF           │
│                                     │
│  [Reset to Defaults] [Close (ESC)] │
└─────────────────────────────────────┘
```

### UI Positioning
- **Panel**: Fixed right side, slides in from right
- **Width**: 400px
- **Height**: Full viewport
- **Toggle Button**: Bottom-left corner (above FPS counter)
- **Keyboard Shortcut**: ESC key

### Color Scheme (Retro Arcade)
- **Background**: `rgba(0, 0, 0, 0.95)` with cyan border
- **Text**: Cyan `#00ffff` with text-shadow glow
- **Headers**: Green `#00ff00` with stronger glow
- **Sliders**:
  - Track: Dark gray `#222` with cyan border
  - Fill: Gradient cyan-to-green
  - Thumb: Bright cyan with glow effect
- **Buttons**: Cyan border, green on hover

## Implementation Plan

### Phase 1: Core Panel Structure

#### 1.1 HTML Structure (`index.html`)
```html
<!-- Settings Panel -->
<div id="settingsPanel" class="settings-panel">
  <div class="settings-header">
    <h2>⚙ SETTINGS</h2>
    <button id="closeSettings" class="close-btn">×</button>
  </div>

  <div class="settings-content">
    <!-- AUDIO Section -->
    <div class="settings-section">
      <h3>AUDIO</h3>
      <div class="setting-item">
        <label for="masterVolume">Master Volume: <span id="masterVolumeValue">100%</span></label>
        <input type="range" id="masterVolume" min="0" max="100" value="100">
      </div>
      <!-- More audio controls... -->
    </div>

    <!-- VISUAL Section -->
    <div class="settings-section">
      <h3>VISUAL</h3>
      <!-- Visual controls... -->
    </div>

    <!-- GAMEPLAY Section -->
    <div class="settings-section">
      <h3>GAMEPLAY</h3>
      <!-- Gameplay controls... -->
    </div>
  </div>

  <div class="settings-footer">
    <button id="resetDefaults">Reset to Defaults</button>
  </div>
</div>

<!-- Settings Toggle Button -->
<button id="settingsToggle" class="settings-toggle">⚙</button>

<!-- Overlay for when settings are open -->
<div id="settingsOverlay" class="settings-overlay"></div>
```

#### 1.2 CSS Styling (`index.html` or new `styles.css`)
- Slide-in animation from right
- Retro arcade styling
- Responsive to different screen sizes
- Glow effects on interactive elements

#### 1.3 Settings Module (`js/settings.js`)
```javascript
// settings.js - New module
export class SettingsManager {
  constructor() {
    this.settings = this.loadSettings();
    this.isOpen = false;
    this.listeners = {};
  }

  loadSettings() {
    const defaults = {
      masterVolume: 100,
      sfxVolume: 80,
      musicVolume: 100,
      muteAll: false,
      glowIntensity: 1.5,
      particleDensity: 100,
      showFPS: true,
      mouseSensitivity: 1.0,
      showHitboxes: false
    };

    // Load from localStorage
    const saved = localStorage.getItem('spaceInvaders3D_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  saveSettings() {
    localStorage.setItem('spaceInvaders3D_settings', JSON.stringify(this.settings));
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.notifyListeners(key, value);
  }

  // Event system for settings changes
  on(setting, callback) { /* ... */ }
  notifyListeners(key, value) { /* ... */ }

  toggle() { /* Show/hide panel */ }
  resetToDefaults() { /* ... */ }
}
```

### Phase 2: Audio Integration

#### 2.1 Volume Control System (`audio.js`)
- Add global volume variables:
  ```javascript
  let masterVolume = 1.0;
  let sfxVolume = 1.0;
  let musicVolume = 1.0;
  let isMuted = false;
  ```
- Create volume setters:
  ```javascript
  export function setMasterVolume(volume) { /* ... */ }
  export function setSFXVolume(volume) { /* ... */ }
  export function setMusicVolume(volume) { /* ... */ }
  export function setMute(muted) { /* ... */ }
  ```
- Modify all sound functions to apply volume:
  ```javascript
  const finalGain = baseGain * sfxVolume * masterVolume * (isMuted ? 0 : 1);
  ```

#### 2.2 Settings Panel Audio Controls
- Master volume slider (affects all sounds)
- SFX volume slider (explosions, missiles, etc.)
- Music volume slider (for future background music)
- Mute toggle checkbox

### Phase 3: Visual Settings

#### 3.1 Migrate Existing Glow Control
- Move glow intensity slider into settings panel
- Remove old inline settings div
- Maintain localStorage persistence

#### 3.2 Additional Visual Controls
- **Particle Density**: Reduce particle count for performance
  - Modify `particles.js` to accept density multiplier
  - Range: 0-100% (default 100%)

- **FPS Display Toggle**: Show/hide FPS counter
  - Control visibility of `#fps` element

- **Future**: Bloom radius, threshold, star density

### Phase 4: Gameplay Settings

#### 4.1 Mouse Sensitivity
- Multiplier for mouse movement tracking
- Range: 0.5x - 2.0x (default 1.0x)
- Modify `input.js` to apply sensitivity

#### 4.2 Debug Options
- **Show Hitboxes**: Display collision boundaries
  - Requires new debug rendering system
  - Toggle visibility of helper geometry

### Phase 5: Panel Behavior

#### 5.1 Toggle Mechanism
- ESC key to open/close
- Gear icon button (bottom-left)
- Click overlay to close
- Automatically pauses game when open

#### 5.2 Game Pause Integration
- Pause game loop when settings open
- Dim/blur background
- Prevent input to game while panel open
- Resume on close

### Phase 6: Polish & Enhancements

#### 6.1 Animations
- Smooth slide-in/out (CSS transitions)
- Glow pulse on hover
- Value change feedback

#### 6.2 Accessibility
- Keyboard navigation (Tab, Arrow keys)
- ARIA labels
- Screen reader support

#### 6.3 Mobile Considerations
- Touch-friendly slider sizes
- Full-screen panel on small screens
- Gesture support (swipe to close)

## Technical Implementation Details

### File Structure Changes

```
/3d-space-invaders/
├── index.html                 # Add settings panel HTML + CSS
├── js/
│   ├── main.js               # Initialize settings manager
│   ├── settings.js           # NEW: Settings manager module
│   ├── audio.js              # ADD: Volume control functions
│   ├── input.js              # ADD: Sensitivity modifier
│   ├── particles.js          # ADD: Density parameter
│   └── game.js               # ADD: Pause/resume methods
```

### LocalStorage Schema

```javascript
{
  "spaceInvaders3D_settings": {
    // Audio
    "masterVolume": 100,        // 0-100
    "sfxVolume": 80,            // 0-100
    "musicVolume": 100,         // 0-100
    "muteAll": false,           // boolean

    // Visual
    "glowIntensity": 1.5,       // 0-3
    "particleDensity": 100,     // 0-100
    "showFPS": true,            // boolean

    // Gameplay
    "mouseSensitivity": 1.0,    // 0.5-2.0
    "showHitboxes": false       // boolean
  }
}
```

### Event Flow

```
User adjusts slider
  ↓
Setting value updates
  ↓
Save to localStorage
  ↓
Notify listeners (event system)
  ↓
Update game system (audio/visual/input)
  ↓
UI reflects new value
```

## Migration Strategy

### Backward Compatibility
- Check for old `spaceInvaders3D_glowIntensity` key
- Migrate to new settings object
- Remove old key after migration

### Code Example:
```javascript
// Migrate old glow setting
const oldGlow = localStorage.getItem('spaceInvaders3D_glowIntensity');
if (oldGlow !== null && !localStorage.getItem('spaceInvaders3D_settings')) {
  const settings = { ...defaults, glowIntensity: parseFloat(oldGlow) };
  localStorage.setItem('spaceInvaders3D_settings', JSON.stringify(settings));
  localStorage.removeItem('spaceInvaders3D_glowIntensity');
}
```

## Future Expansion Opportunities

### Additional Settings (Post-MVP)
1. **Audio**:
   - Individual volume controls per sound type (explosions, UFO, boss, etc.)
   - Audio preset modes (Quiet, Balanced, Epic)

2. **Visual**:
   - Color scheme presets (Classic Green, RGB, Monochrome)
   - Starfield density
   - Camera shake intensity
   - Reduce motion option (accessibility)

3. **Gameplay**:
   - Difficulty presets (Easy, Normal, Hard)
   - Starting lives
   - Enable/disable power-ups
   - Camera control mode (mouse Y for zoom vs. tilt)

4. **Accessibility**:
   - High contrast mode
   - Reduce flashing effects
   - Colorblind modes
   - Control remapping

### Advanced Features
- **Profiles**: Save multiple setting configurations
- **Cloud Sync**: Sync settings across devices
- **Export/Import**: Share settings via JSON file
- **Presets**: Quick-select configurations

## Testing Checklist

### Functionality Tests
- [ ] Panel opens/closes with ESC key
- [ ] Panel opens/closes with toggle button
- [ ] Panel closes when clicking overlay
- [ ] Game pauses when panel opens
- [ ] Game resumes when panel closes
- [ ] All sliders update values in real-time
- [ ] All checkboxes toggle correctly
- [ ] Reset to defaults works
- [ ] Settings persist across page refresh
- [ ] Old glow setting migrates correctly

### Audio Tests
- [ ] Master volume affects all sounds
- [ ] SFX volume affects game sounds
- [ ] Mute silences all audio
- [ ] Volume changes apply immediately
- [ ] No audio distortion at high volumes

### Visual Tests
- [ ] Glow intensity changes bloom effect
- [ ] Particle density reduces particle count
- [ ] FPS toggle shows/hides counter
- [ ] Panel styling matches retro aesthetic
- [ ] Animations are smooth
- [ ] No layout breaks on different screen sizes

### Input Tests
- [ ] Mouse sensitivity adjusts movement
- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] No input leaks to game when panel open

### Performance Tests
- [ ] No FPS drop when opening panel
- [ ] Settings changes don't cause lag
- [ ] LocalStorage operations are fast
- [ ] No memory leaks

## Success Metrics

1. **Usability**: Players can find and adjust settings within 10 seconds
2. **Performance**: Panel open/close < 100ms
3. **Accessibility**: WCAG 2.1 Level AA compliance
4. **Persistence**: 100% setting retention across sessions
5. **Compatibility**: Works on all modern browsers (Chrome, Firefox, Safari, Edge)

## Risk Mitigation

### Potential Issues
1. **Audio API Limitations**: Some browsers may not support volume control on all nodes
   - Mitigation: Test across browsers, provide fallbacks

2. **localStorage Quota**: Settings object could grow large
   - Mitigation: Implement compression or limit setting history

3. **Performance Impact**: Too many settings listeners
   - Mitigation: Debounce updates, batch changes

4. **UI Clutter**: Too many settings overwhelm users
   - Mitigation: Organize in collapsible sections, use tabs for categories

## Timeline Estimate

- **Phase 1** (Core Panel): 2-3 hours
- **Phase 2** (Audio Integration): 2-3 hours
- **Phase 3** (Visual Settings): 1-2 hours
- **Phase 4** (Gameplay Settings): 1-2 hours
- **Phase 5** (Panel Behavior): 1-2 hours
- **Phase 6** (Polish): 2-3 hours
- **Testing & Debugging**: 2-3 hours

**Total Estimated Effort**: 11-18 hours

## Conclusion

This settings panel design provides a solid foundation for player customization while maintaining the game's retro arcade aesthetic. The modular architecture allows for easy expansion, and the localStorage-based persistence ensures players' preferences are retained across sessions. The slide-out panel approach balances accessibility with non-intrusiveness, making it easy for players to adjust settings without disrupting their gameplay experience.

The implementation follows existing code patterns (localStorage persistence, event-driven updates) and integrates cleanly with the current architecture. Future enhancements can be added incrementally without major refactoring.
