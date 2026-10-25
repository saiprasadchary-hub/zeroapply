/**
 * ZeroApply Motion Ad Studio - Advanced Procedural Audio Studio 2.0
 * Cinematic sound synthesis: 808 Sub Drops, Laser Scans, Stereo Spatial Panning,
 * Multi-voice Crystalline Chimes, Mechanical ASMR Clicks, and Real-time Spectrum Analyser.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.analyser = null;
    this.isMuted = false;
    this.isPlayingMusic = false;
    this.volume = 0.85;
    this.musicInterval = null;
    this.bpm = 120;
    this.beatStep = 0;
    this.pannerSupport = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    
    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

    // Real-time Spectrum Analyser for Visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // SFX Bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Music Bus
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.pannerSupport = typeof this.ctx.createStereoPanner === 'function';
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  getSpectrumData() {
    if (!this.analyser) return new Uint8Array(16);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  // --- Cinematic Audio Synthesizers ---

  // Deep 808 Sub-Bass Cinematic Drop (for scene climaxes & impacts)
  playCinematicSubDrop() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency drops from 125 Hz punch to deep 32 Hz chest rumble
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.85);

    // Saturation wave shaper for analog warmth
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(15);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 1.3);
  }

  // High-Tech Cyber Laser Scanning Sweep
  playLaserSweep() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.35);

    filter.type = 'bandpass';
    filter.Q.value = 8;
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.35);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  // Aerodynamic Motion Whoosh with Stereo Spatial Panning
  playWhoosh(pitch = 1, pan = 0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    filter.type = 'bandpass';
    filter.Q.value = 3;

    osc.frequency.setValueAtTime(820 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(140 * pitch, t + 0.35);

    filter.frequency.setValueAtTime(2800, t);
    filter.frequency.exponentialRampToValueAtTime(380, t + 0.35);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

    osc.connect(filter);
    filter.connect(gain);

    if (this.pannerSupport) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t);
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Mechanical ASMR Typewriter Keystroke
  playKeyClick(pan = 0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const freq = 1100 + Math.random() * 500;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.028);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

    osc.connect(gain);

    if (this.pannerSupport) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, t);
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    osc.start(t);
    osc.stop(t + 0.036);
  }

  // Crystalline Bell Chime Arpeggio (98% ATS Match & Offer Alerts)
  playSuccessChime() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const delay = idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.linearRampToValueAtTime(0.16 - (idx * 0.02), t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + delay);
      osc.stop(t + delay + 1.5);
    });
  }

  // Soft Organic UI Pop
  playPop(freqMultiplier = 1) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440 * freqMultiplier, t);
    osc.frequency.exponentialRampToValueAtTime(880 * freqMultiplier, t + 0.05);

    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  makeDistortionCurve(amount = 20) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // --- Dynamic Ambient Soundtrack ---

  startMusic() {
    if (this.isPlayingMusic) return;
    this.ensureContext();
    this.isPlayingMusic = true;
    this.beatStep = 0;

    const secondsPerBeat = 60 / this.bpm / 2; // 8th note resolution

    this.musicInterval = setInterval(() => {
      if (!this.isPlayingMusic || this.isMuted) {
        this.beatStep++;
        return;
      }
      this.tickBeat(this.beatStep % 32);
      this.beatStep++;
    }, secondsPerBeat * 1000);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  tickBeat(step) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Soft kick drum on beats 0, 8, 16, 24
    if (step % 8 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(115, t);
      kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.14);
      kickGain.gain.setValueAtTime(0.32, t);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);
      kickOsc.start(t);
      kickOsc.stop(t + 0.26);
    }

    // Hi-hat groove with micro-swing
    if (step % 2 === 1) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      hatOsc.type = 'highpass';
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, t);
      hatGain.gain.setValueAtTime((step % 4 === 1) ? 0.045 : 0.025, t);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      hatOsc.connect(filter);
      filter.connect(hatGain);
      hatGain.connect(this.musicGain);
      hatOsc.start(t);
      hatOsc.stop(t + 0.05);
    }

    // Modern Neo-Soul / Future Tech Chords
    if (step === 0 || step === 8 || step === 16 || step === 24) {
      const chords = {
        0: [311.13, 392.00, 466.16, 587.33], // EbMaj7
        8: [392.00, 466.16, 587.33, 739.99], // Gm7
        16: [349.23, 440.00, 523.25, 659.25], // F7
        24: [415.30, 523.25, 622.25, 783.99], // AbMaj7
      };
      const notes = chords[step];
      notes.forEach((freq) => {
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        chordOsc.type = 'sine';
        chordOsc.frequency.setValueAtTime(freq, t);
        chordGain.gain.setValueAtTime(0.03, t);
        chordGain.gain.exponentialRampToValueAtTime(0.0005, t + 1.3);
        chordOsc.connect(chordGain);
        chordGain.connect(this.musicGain);
        chordOsc.start(t);
        chordOsc.stop(t + 1.35);
      });
    }
  }
}

window.adSound = new SoundEngine();
