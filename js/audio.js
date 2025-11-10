// Audio system using Web Audio API
let audioContext;

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
