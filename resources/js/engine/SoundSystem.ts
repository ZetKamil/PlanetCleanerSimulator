/**
 * SoundSystem.ts - Procedural WebAudio Synthesizer for Venus Cleaner 2D
 * No external sound files required; 100% synthesized in real time via WebAudio API.
 */
export class SoundSystem {
    private ctx: AudioContext | null = null;
    public isMuted: boolean = false;
    public masterVolume: number = 0.5;

    // Vacuum continuous oscillator references
    private vacuumOsc1: OscillatorNode | null = null;
    private vacuumOsc2: OscillatorNode | null = null;
    private vacuumGain: GainNode | null = null;
    private isVacuumRunning: boolean = false;

    // Turbo-Glide Thruster references
    private boostNoise: AudioBufferSourceNode | null = null;
    private boostGain: GainNode | null = null;
    private isBoostRunning: boolean = false;

    constructor() {
        // AudioContext will be initialized on first user gesture
    }

    private initContext(): AudioContext | null {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    /**
     * Skaner Spektralny [V] - Radar Sonar Ping
     */
    public playSonarPing(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.6);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.Q.setValueAtTime(4.0, now);

        gain.gain.setValueAtTime(0.35 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.9);
    }

    /**
     * Clean Ding! - Satisfying crystalline chime for sector milestones (25%, 50%, 75%, 100%)
     */
    public playCleanDing(stage: number = 1): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        const baseFreq = notes[Math.min(notes.length - 1, Math.max(0, stage - 1))];

        const now = ctx.currentTime;
        [1, 2, 3].forEach((harmonic, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * harmonic, now);

            const initialVol = (0.28 / (idx + 1)) * this.masterVolume;
            gain.gain.setValueAtTime(initialVol, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 1.5);
        });
    }

    /**
     * Sweep Brush Stroke - Filtered noise hiss
     */
    public playSweep(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const bufferSize = Math.floor(ctx.sampleRate * 0.08); // 80ms noise
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(2.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        whiteNoise.start(now);
    }

    /**
     * Dźwięk kruszenia twardego żużlu bazaltowego (Pass 1 - Chrzęst łamanego kamienia)
     */
    public playSlagCrunch(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const bufferSize = Math.floor(ctx.sampleRate * 0.12);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(340, now);
        filter.Q.setValueAtTime(2.2, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.28 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start(now);
    }

    /**
     * Scrap Packager Stomp - Heavy sub-bass thud and steam release
     */
    public playPackagerStomp(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;

        // Sub bass thump
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.25);

        oscGain.gain.setValueAtTime(0.45 * this.masterVolume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);

        // Steam hiss
        const bufferSize = Math.floor(ctx.sampleRate * 0.15);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noise.start(now);
    }

    /**
     * Building Placement Snap
     */
    public playBuildingPlace(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    /**
     * Depot Unload Credit Chime (+$X)
     */
    public playDepotUnload(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const freqs = [659.25, 830.61, 987.77]; // E5, G#5, B5 arpeggio
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.05;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.18 * this.masterVolume, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + 0.28);
        });
    }

    /**
     * Warning Alarm / Emergency Siren (Acid Rain / Hazard)
     */
    public playWarningAlarm(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.linearRampToValueAtTime(750, now + 0.25);
        osc.frequency.linearRampToValueAtTime(450, now + 0.5);

        gain.gain.setValueAtTime(0.22 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
    }

    public playAcidAlarm(): void {
        this.playWarningAlarm();
    }

    /**
     * Dźwięk skwierczenia kwasu na pancerzu łazika (Acid Sizzle)
     */
    public playAcidSizzle(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const bufferSize = Math.floor(ctx.sampleRate * 0.12);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.25;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2800, now);
        filter.Q.setValueAtTime(3.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
    }

    /**
     * Dźwięk syntezy Ogniwa Kwasowego w Rafinerii ($120)
     */
    public playRefineryProduct(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.04;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.25 * this.masterVolume, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + 0.38);
        });
    }

    /**
     * Continuous Vacuum Loop Control
     */
    public setVacuumSound(active: boolean): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        if (active && !this.isVacuumRunning) {
            const now = ctx.currentTime;
            this.vacuumOsc1 = ctx.createOscillator();
            this.vacuumOsc2 = ctx.createOscillator();
            this.vacuumGain = ctx.createGain();

            this.vacuumOsc1.type = 'triangle';
            this.vacuumOsc1.frequency.setValueAtTime(110, now); // low drone

            this.vacuumOsc2.type = 'sine';
            this.vacuumOsc2.frequency.setValueAtTime(220, now); // turbine pitch

            this.vacuumGain.gain.setValueAtTime(0.01, now);
            this.vacuumGain.gain.linearRampToValueAtTime(0.15 * this.masterVolume, now + 0.2);

            this.vacuumOsc1.connect(this.vacuumGain);
            this.vacuumOsc2.connect(this.vacuumGain);
            this.vacuumGain.connect(ctx.destination);

            this.vacuumOsc1.start(now);
            this.vacuumOsc2.start(now);
            this.isVacuumRunning = true;
        } else if (!active && this.isVacuumRunning) {
            if (this.vacuumGain && ctx) {
                const now = ctx.currentTime;
                this.vacuumGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
                setTimeout(() => {
                    this.vacuumOsc1?.stop();
                    this.vacuumOsc2?.stop();
                    this.vacuumOsc1?.disconnect();
                    this.vacuumOsc2?.disconnect();
                    this.vacuumOsc1 = null;
                    this.vacuumOsc2 = null;
                    this.vacuumGain = null;
                    this.isVacuumRunning = false;
                }, 220);
            }
        }
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.isVacuumRunning) {
            this.setVacuumSound(false);
        }
        return this.isMuted;
    }

    /**
     * Dynamic Vacuum Pitch Modulation:
     * Podbija częstotliwość turbiny ssącej w zależności od natężenia zbieranego pyłu (kg/s).
     */
    public updateVacuumPitch(dustRateKgPerSec: number): void {
        if (!this.ctx || !this.isVacuumRunning || !this.vacuumOsc1 || !this.vacuumOsc2) return;
        const now = this.ctx.currentTime;
        const factor = Math.min(1.0, Math.max(0.0, dustRateKgPerSec / 2.5));
        const targetFreq1 = 110 + factor * 55; // 110 Hz -> 165 Hz
        const targetFreq2 = 220 + factor * 130; // 220 Hz -> 350 Hz
        this.vacuumOsc1.frequency.setTargetAtTime(targetFreq1, now, 0.06);
        this.vacuumOsc2.frequency.setTargetAtTime(targetFreq2, now, 0.06);
    }

    /**
     * Thermal Hazard Warning - Fast Geiger-like Heat Chirp
     */
    public playThermalWarning(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);

        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Overheat Meltdown Death - Severe Sub-bass Explosion & Short Circuit
     */
    public playOverheatDeath(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;

        // Sub-bass thump
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.8);

        gain.gain.setValueAtTime(0.6 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);

        // Electrical discharge noise
        const bufferSize = ctx.sampleRate * 0.4;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        whiteNoise.start(now);
        whiteNoise.stop(now + 0.4);
    }

    /**
     * Venera Probe Discovery - Authentic 1982 Soviet Telemetry Arpeggio
     */
    public playVeneraDiscovery(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const freqs = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D5, F#5, A5, D6, F#6

        freqs.forEach((freq, idx) => {
            const time = now + idx * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.3 * this.masterVolume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + 0.26);
        });
    }

    /**
     * Sygnał odsłonięcia gejzera geotermalnego:
     * Dźwięk wzburzonej pary + ciepły akord kwintowy (+80 kW)
     */
    public playGeothermalDiscovery(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;

        // 1. Steam surge burst
        const bufferSize = ctx.sampleRate * 0.4;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
        filter.Q.setValueAtTime(2.5, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.22 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        whiteNoise.start(now);

        // 2. Rising harmonic chime (C4, E4, G4, C5)
        const chimeFreqs = [261.63, 329.63, 392.00, 523.25];
        chimeFreqs.forEach((freq, idx) => {
            const time = now + idx * 0.06;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.25 * this.masterVolume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + 0.42);
        });
    }

    /**
     * Sygnał odblokowania osiągnięcia / kamienia milowego (Steam-style Fanfare)
     */
    public playAchievementUnlocked(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, idx) => {
            const time = now + idx * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            const duration = idx === notes.length - 1 ? 0.6 : 0.25;
            gain.gain.setValueAtTime(0.35 * this.masterVolume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + duration + 0.02);
        });
    }

    /**
     * Klakson łazika [H] - Masywny, głęboki podwójny ton syreny eksploracyjnej
     */
    public playHorn(): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        const now = ctx.currentTime;
        const freqs = [155.56, 196.00]; // Eb3, G3 - potężny interwał sci-fi
        freqs.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);

            gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
            gain.gain.linearRampToValueAtTime(0.3 * this.masterVolume, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.6);
        });
    }

    private boostNoiseNode: AudioBufferSourceNode | null = null;
    private boostGainNode: GainNode | null = null;
    private isBoostActive: boolean = false;

    /**
     * Dźwięk doładowania rakietowego / turbo [Shift]
     */
    public setBoostSound(active: boolean): void {
        const ctx = this.initContext();
        if (!ctx || this.isMuted) return;

        if (active && !this.isBoostActive) {
            this.isBoostActive = true;
            try {
                const bufferSize = ctx.sampleRate * 2;
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(380, ctx.currentTime);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.001, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.28 * this.masterVolume, ctx.currentTime + 0.15);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                noise.start();
                this.boostNoiseNode = noise;
                this.boostGainNode = gain;
            } catch (e) {
                // ignore
            }
        } else if (!active && this.isBoostActive) {
            this.isBoostActive = false;
            if (this.boostGainNode) {
                try {
                    this.boostGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
                    const node = this.boostNoiseNode;
                    setTimeout(() => {
                        try { node?.stop(); node?.disconnect(); } catch (e) {}
                    }, 160);
                } catch (e) {}
            }
            this.boostNoiseNode = null;
            this.boostGainNode = null;
        }
    }

    public setVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
}

