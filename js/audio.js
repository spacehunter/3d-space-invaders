// Audio system using Web Audio API
let audioContext;
let ufoTravelOscillator = null;
let ufoTravelGain = null;
let ufoTravelPanner = null;

// Initialize audio on first user interaction
export function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play MASSIVE asteroid-impact BOOOOOM explosion sound
export function playExplosion(intensity = 1.0) {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // LAYER 1: SUB-BASS IMPACT - The earth-shaking BOOM you feel in your chest
    const subBass = audioContext.createOscillator();
    const subBassGain = audioContext.createGain();
    subBass.type = 'sine';
    subBass.frequency.setValueAtTime(25, now);  // Ultra-low frequency
    subBass.frequency.exponentialRampToValueAtTime(10, now + 1.2);
    subBassGain.gain.setValueAtTime(2.5 * intensity, now);  // MASSIVE gain
    subBassGain.gain.exponentialRampToValueAtTime(0.8 * intensity, now + 0.3);
    subBassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    subBass.connect(subBassGain);
    subBassGain.connect(audioContext.destination);
    subBass.start(now);
    subBass.stop(now + 1.5);

    // LAYER 2: DEEP BASS RUMBLE - The prolonged BOOOOOM
    const bass = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(60, now);
    bass.frequency.exponentialRampToValueAtTime(20, now + 1.0);
    bassGain.gain.setValueAtTime(2.0 * intensity, now);  // Much louder
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    bass.connect(bassGain);
    bassGain.connect(audioContext.destination);
    bass.start(now);
    bass.stop(now + 1.2);

    // LAYER 3: MASSIVE WHITE NOISE EXPLOSION - The initial CRACK
    const bufferSize = audioContext.sampleRate * 3;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.8);
    noiseFilter.Q.value = 0.5;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(1.8 * intensity, now);  // VERY LOUD
    noiseGain.gain.exponentialRampToValueAtTime(0.3 * intensity, now + 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + 1.0);

    // LAYER 4: MID-RANGE EXPLOSION BODY - The meaty impact
    const mid = audioContext.createOscillator();
    const midGain = audioContext.createGain();
    mid.type = 'sawtooth';
    mid.frequency.setValueAtTime(150, now);
    mid.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    midGain.gain.setValueAtTime(1.5 * intensity, now);  // Much louder
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    mid.connect(midGain);
    midGain.connect(audioContext.destination);
    mid.start(now);
    mid.stop(now + 0.8);

    // LAYER 5: THUNDER CRACK - High impact transient
    const crack = audioContext.createOscillator();
    const crackGain = audioContext.createGain();
    crack.type = 'square';
    crack.frequency.setValueAtTime(1200, now);
    crack.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    crackGain.gain.setValueAtTime(1.2 * intensity, now);
    crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    crack.connect(crackGain);
    crackGain.connect(audioContext.destination);
    crack.start(now);
    crack.stop(now + 0.15);

    // LAYER 6: DISTORTED LOW END - Extra punch
    const distortion = audioContext.createOscillator();
    const distortionGain = audioContext.createGain();
    distortion.type = 'sawtooth';
    distortion.frequency.setValueAtTime(45, now);
    distortion.frequency.exponentialRampToValueAtTime(15, now + 0.7);
    distortionGain.gain.setValueAtTime(1.8 * intensity, now);
    distortionGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    distortion.connect(distortionGain);
    distortionGain.connect(audioContext.destination);
    distortion.start(now);
    distortion.stop(now + 0.9);

    // LAYER 7: ADDITIONAL NOISE LAYER for texture
    const noise2Buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const noise2Data = noise2Buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        noise2Data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise2 = audioContext.createBufferSource();
    noise2.buffer = noise2Buffer;

    const noise2Gain = audioContext.createGain();
    noise2Gain.gain.setValueAtTime(1.5 * intensity, now);
    noise2Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    noise2.connect(noise2Gain);
    noise2Gain.connect(audioContext.destination);
    noise2.start(now);
    noise2.stop(now + 0.6);
}

// Play missile firing sound
export function playMissileFire() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Quick laser/missile launch sound
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.15);
}

// Play UFO spawn sound (warp in effect)
export function playUFOSpawn() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Frequency sweep from 800Hz to 200Hz with tremolo
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const tremolo = audioContext.createOscillator();
    const tremoloGain = audioContext.createGain();

    // Main oscillator - frequency sweep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    // Tremolo modulation (vibrato effect)
    tremolo.type = 'sine';
    tremolo.frequency.setValueAtTime(12, now); // 12Hz tremolo
    tremoloGain.gain.setValueAtTime(0.3, now); // Modulation depth

    // Connect tremolo to main gain
    tremolo.connect(tremoloGain);
    tremoloGain.connect(gain.gain);

    // Main gain envelope
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    tremolo.start(now);
    osc.stop(now + 0.5);
    tremolo.stop(now + 0.5);
}

// Play UFO continuous travel sound (wooo-wooo-wooo)
export function playUFOTravel(ufo) {
    if (!audioContext) return;

    // Stop existing travel sound if any
    stopUFOTravel();

    const now = audioContext.currentTime;

    // Create oscillator for "wooo-wooo" sound
    ufoTravelOscillator = audioContext.createOscillator();
    ufoTravelGain = audioContext.createGain();
    ufoTravelPanner = audioContext.createStereoPanner();

    ufoTravelOscillator.type = 'sine';

    // Oscillate between 150Hz and 250Hz
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(2, now); // 2Hz oscillation (wooo-wooo)
    lfoGain.gain.setValueAtTime(50, now); // Oscillation range (±50Hz)

    // Connect LFO to main oscillator frequency
    lfo.connect(lfoGain);
    lfoGain.connect(ufoTravelOscillator.frequency);

    // Set base frequency
    ufoTravelOscillator.frequency.setValueAtTime(200, now);

    // Volume
    ufoTravelGain.gain.setValueAtTime(0.01, now);
    ufoTravelGain.gain.exponentialRampToValueAtTime(0.4, now + 0.2);

    // Connect everything
    ufoTravelOscillator.connect(ufoTravelGain);
    ufoTravelGain.connect(ufoTravelPanner);
    ufoTravelPanner.connect(audioContext.destination);

    ufoTravelOscillator.start(now);
    lfo.start(now);

    // Store LFO for cleanup
    ufoTravelOscillator.userData = { lfo: lfo };

    // Update panning based on UFO position (called from game loop)
    if (ufo) {
        updateUFOTravelPanning(ufo);
    }
}

// Update UFO travel sound panning based on position
export function updateUFOTravelPanning(ufo) {
    if (!ufoTravelPanner || !ufo) return;

    // Pan from -1 (left) to 1 (right) based on UFO X position (-18 to 18)
    const panValue = Math.max(-1, Math.min(1, ufo.position.x / 18));
    ufoTravelPanner.pan.setValueAtTime(panValue, audioContext.currentTime);
}

// Stop UFO travel sound
export function stopUFOTravel() {
    if (ufoTravelOscillator) {
        const now = audioContext.currentTime;
        ufoTravelGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        ufoTravelOscillator.stop(now + 0.3);

        // Stop LFO if exists
        if (ufoTravelOscillator.userData && ufoTravelOscillator.userData.lfo) {
            ufoTravelOscillator.userData.lfo.stop(now + 0.3);
        }

        ufoTravelOscillator = null;
        ufoTravelGain = null;
        ufoTravelPanner = null;
    }
}

// Play UFO missile launch sound
export function playUFOMissileLaunch() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // PART 1: Warning beep (800Hz, 0.1s)
    const beep = audioContext.createOscillator();
    const beepGain = audioContext.createGain();

    beep.type = 'square';
    beep.frequency.setValueAtTime(800, now);

    beepGain.gain.setValueAtTime(0.5, now);
    beepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    beep.connect(beepGain);
    beepGain.connect(audioContext.destination);

    beep.start(now);
    beep.stop(now + 0.1);

    // PART 2: Descending whoosh (400Hz → 100Hz, 0.3s)
    const whoosh = audioContext.createOscillator();
    const whooshGain = audioContext.createGain();
    const whooshFilter = audioContext.createBiquadFilter();

    whoosh.type = 'sawtooth';
    whoosh.frequency.setValueAtTime(400, now + 0.1);
    whoosh.frequency.exponentialRampToValueAtTime(100, now + 0.4);

    whooshFilter.type = 'lowpass';
    whooshFilter.frequency.setValueAtTime(1000, now + 0.1);
    whooshFilter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    whooshGain.gain.setValueAtTime(0.4, now + 0.1);
    whooshGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    whoosh.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(audioContext.destination);

    whoosh.start(now + 0.1);
    whoosh.stop(now + 0.4);
}

// Play shrapnel explosion sound (deep boom + crackle)
export function playShrapnelExplosion() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // LAYER 1: Deep sub-bass boom (50-100Hz)
    const subBoom = audioContext.createOscillator();
    const subBoomGain = audioContext.createGain();
    subBoom.type = 'sine';
    subBoom.frequency.setValueAtTime(80, now);
    subBoom.frequency.exponentialRampToValueAtTime(30, now + 1.0);
    subBoomGain.gain.setValueAtTime(3.0, now);
    subBoomGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    subBoom.connect(subBoomGain);
    subBoomGain.connect(audioContext.destination);
    subBoom.start(now);
    subBoom.stop(now + 1.2);

    // LAYER 2: Mid boom
    const midBoom = audioContext.createOscillator();
    const midBoomGain = audioContext.createGain();
    midBoom.type = 'triangle';
    midBoom.frequency.setValueAtTime(100, now);
    midBoom.frequency.exponentialRampToValueAtTime(40, now + 0.8);
    midBoomGain.gain.setValueAtTime(2.5, now);
    midBoomGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    midBoom.connect(midBoomGain);
    midBoomGain.connect(audioContext.destination);
    midBoom.start(now);
    midBoom.stop(now + 1.0);

    // LAYER 3: High-frequency crackle/sizzle
    const bufferSize = audioContext.sampleRate * 1.5;
    const crackleBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        crackleData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const crackle = audioContext.createBufferSource();
    crackle.buffer = crackleBuffer;

    const crackleFilter = audioContext.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.setValueAtTime(2000, now);
    crackleFilter.frequency.exponentialRampToValueAtTime(500, now + 0.8);

    const crackleGain = audioContext.createGain();
    crackleGain.gain.setValueAtTime(2.0, now);
    crackleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(audioContext.destination);

    crackle.start(now);
    crackle.stop(now + 0.8);

    // LAYER 4: Additional noise burst
    const burstBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const burstData = burstBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        burstData[i] = Math.random() * 2 - 1;
    }

    const burst = audioContext.createBufferSource();
    burst.buffer = burstBuffer;

    const burstFilter = audioContext.createBiquadFilter();
    burstFilter.type = 'bandpass';
    burstFilter.frequency.setValueAtTime(800, now);
    burstFilter.Q.value = 2.0;

    const burstGain = audioContext.createGain();
    burstGain.gain.setValueAtTime(1.5, now);
    burstGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    burst.connect(burstFilter);
    burstFilter.connect(burstGain);
    burstGain.connect(audioContext.destination);

    burst.start(now);
    burst.stop(now + 0.5);
}


// Play Kamikaze Swoop warning siren
export function playSwoopWarning() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Modulating siren (high pitched)
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();

    // LFO for pitch modulation (siren effect)
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(8, now); // 8Hz modulation
    lfoGain.gain.setValueAtTime(200, now); // +/- 200Hz

    // Main oscillator
    osc.type = 'square'; // Harsh sound
    osc.frequency.setValueAtTime(1200, now); // High base pitch

    // Connect LFO
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Volume envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.8);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);

    // Connect to output
    osc.connect(gain);
    gain.connect(audioContext.destination);

    // Start/Stop
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 1.0);
    lfo.stop(now + 1.0);
}

// ============== LEVEL SYSTEM AUDIO ==============

// Play level completion fanfare
export function playLevelComplete() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Ascending arpeggio - C, E, G, C (octave)
    const notes = [261.63, 329.63, 392.00, 523.25];

    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.4, now + i * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.5);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.5);
    });

    // Add a final triumphant chord
    setTimeout(() => {
        if (!audioContext) return;
        const chordNow = audioContext.currentTime;

        [523.25, 659.25, 783.99].forEach(freq => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, chordNow);

            gain.gain.setValueAtTime(0.3, chordNow);
            gain.gain.exponentialRampToValueAtTime(0.01, chordNow + 0.8);

            osc.connect(gain);
            gain.connect(audioContext.destination);

            osc.start(chordNow);
            osc.stop(chordNow + 0.8);
        });
    }, 500);
}

// Play hyperspace warp sound
export function playWarpSound() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Rising frequency sweep with noise
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 1.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(5000, now + 1.5);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 1.5);

    // Add white noise layer for "whoosh"
    const bufferSize = audioContext.sampleRate * 1.5;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(4000, now + 1.5);
    noiseFilter.Q.value = 1.0;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 1.5);
}

// Play boss warning sound
export function playBossWarning() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Ominous low rumble building up
    const bass = audioContext.createOscillator();
    const bassGain = audioContext.createGain();

    bass.type = 'sine';
    bass.frequency.setValueAtTime(30, now);
    bass.frequency.linearRampToValueAtTime(60, now + 2);

    bassGain.gain.setValueAtTime(0.1, now);
    bassGain.gain.linearRampToValueAtTime(0.8, now + 1.5);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 2);

    bass.connect(bassGain);
    bassGain.connect(audioContext.destination);

    bass.start(now);
    bass.stop(now + 2);

    // Warning beeps
    for (let i = 0; i < 3; i++) {
        const beep = audioContext.createOscillator();
        const beepGain = audioContext.createGain();

        beep.type = 'square';
        beep.frequency.setValueAtTime(800, now + i * 0.5);

        beepGain.gain.setValueAtTime(0.4, now + i * 0.5);
        beepGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.5 + 0.15);

        beep.connect(beepGain);
        beepGain.connect(audioContext.destination);

        beep.start(now + i * 0.5);
        beep.stop(now + i * 0.5 + 0.15);
    }
}

// Play level start sound
export function playLevelStart() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Quick ascending tone
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.4);
}

// Play boss hit sound
export function playBossHit() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.2);
}

// Play boss phase transition sound
export function playBossPhaseTransition() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Dramatic power-up sweep
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
    osc.frequency.exponentialRampToValueAtTime(400, now + 1.0);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 1.0);

    // Add shimmer effect
    const shimmer = audioContext.createOscillator();
    const shimmerGain = audioContext.createGain();

    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2000, now);

    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.frequency.setValueAtTime(20, now);
    lfoGain.gain.setValueAtTime(500, now);
    lfo.connect(lfoGain);
    lfoGain.connect(shimmer.frequency);

    shimmerGain.gain.setValueAtTime(0.2, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(audioContext.destination);

    shimmer.start(now);
    lfo.start(now);
    shimmer.stop(now + 1.0);
    lfo.stop(now + 1.0);
}

// Play boss defeat sound (massive victory)
export function playBossDefeat() {
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Multiple descending booms
    for (let i = 0; i < 3; i++) {
        const boom = audioContext.createOscillator();
        const boomGain = audioContext.createGain();

        boom.type = 'sine';
        boom.frequency.setValueAtTime(100 - i * 20, now + i * 0.3);
        boom.frequency.exponentialRampToValueAtTime(20, now + i * 0.3 + 0.5);

        boomGain.gain.setValueAtTime(0.8, now + i * 0.3);
        boomGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.6);

        boom.connect(boomGain);
        boomGain.connect(audioContext.destination);

        boom.start(now + i * 0.3);
        boom.stop(now + i * 0.3 + 0.6);
    }

    // Victory fanfare after explosions
    setTimeout(() => {
        if (!audioContext) return;
        playLevelComplete();
    }, 1000);
}
