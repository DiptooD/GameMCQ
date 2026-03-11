class GameSFX {
    /**
     * Generates programmatic 8-bit/retro sound effects using the Web Audio API.
     * Upgraded Synthesis Engine: Includes phase integration, ADSR enhancements, and LPF.
     * @param {Phaser.Scene} scene - The scene context to generate audio in
     */
    static init(scene) {
        if (scene.cache.audio.exists('sfx_shoot')) return;
        
        const ctx = scene.sound.context;
        if (!ctx) {
            console.warn("Web Audio API not supported or context blocked. SFX skipped.");
            return;
        }

        const registerSound = (key, buffer) => {
            if (buffer) {
                scene.cache.audio.add(key, buffer);
            }
        };

        // =================================================================
        // 1. COMBAT SOUNDS
        // =================================================================
        
        // Standard Laser (Upgraded to be snappier and faster decay)
        registerSound('sfx_shoot', 
            this.createSweep(ctx, 'sine', 0.08, 800, 400, 0.03, 'exp'));


        // Enemy Hit (Smoothed: soft sine blip, lower volume, unobtrusive)
        registerSound('sfx_enemy_hit', 
            this.createPulse(ctx, 'sine', 0.05, 400, 200, 0.03));


        // Explosion (Smoothed: shorter duration, much lower volume for a muffled distant poof)
        registerSound('sfx_explode', 
            this.createNoise(ctx, 0.25, 0.1, true));

        // Heavy/Missile Shot
        registerSound('sfx_shoot_heavy', 
            this.createSweep(ctx, 'sawtooth', 0.18, 600, 100, 0.1, 'exp'));

        // Enemy Laser 
        registerSound('sfx_enemy_shoot', 
            this.createSweep(ctx, 'sine', 0.15, 1800, 600, 0.08, 'linear', 30));



        // Player Hit/Damage (Upgraded: dedicated metallic crunch + sweep)
        registerSound('sfx_hit', 
            this.createHit(ctx));



        // Rock/Obstacle Hit 
        registerSound('sfx_rock_hit', 
            this.createNoise(ctx, 0.15, 0.35, true));

        // Misc Abilities
        registerSound('sfx_missile', 
            this.createSweep(ctx, 'sine', 0.35, 100, 900, 0.12, 'exp'));

        // Change this line (approx line 63):
        registerSound('sfx_shockwave', 
            this.createShockwave(ctx));

        registerSound('sfx_speed_boost', 
            this.createSweep(ctx, 'sine', 0.8, 300, 1800, 0.15, 'exp'));

        // Boss Effects
        registerSound('sfx_boss_spawn', 
            this.createTremolo(ctx, 3.5, 60, 20, 0.5));
        registerSound('sfx_boss_phase2', 
            this.createArpeggio(ctx, 'sawtooth', [150, 200, 300, 450, 600], 0.15, 0.3));

        // =================================================================
        // 2. STATUS & ITEMS
        // =================================================================
// Change this line (approx line 73):
        registerSound('sfx_regen', 
            this.createRegen(ctx));
        // Change this line (approx line 75):
        registerSound('sfx_coin', 
            this.createCoin(ctx));


        // ADD THIS NEW LINE:
        registerSound('sfx_battery_collect', 
            this.createBatteryCollect(ctx));


        // ADD THIS NEW LINE:
        registerSound('sfx_TNT', 
            this.createTNT(ctx));


        registerSound('sfx_powerup', 
            this.createSweep(ctx, 'sine', 0.4, 400, 1200, 0.15, 'linear'));
        registerSound('sfx_shield_activate', 
            this.createTremolo(ctx, 0.8, 500, 800, 0.2));
        // Change this line:
        registerSound('sfx_shield_break', 
            this.createShieldBreak(ctx));
        // =================================================================
        // 3. UI & SYSTEM
        // =================================================================
        registerSound('sfx_click', 
            this.createPulse(ctx, 'sine', 0.05, 900, 900, 0.1));
        registerSound('sfx_back', 
            this.createPulse(ctx, 'triangle', 0.08, 500, 300, 0.1));
        registerSound('sfx_error', 
            this.createBuzzer(ctx));
        registerSound('sfx_tick', 
            this.createNoise(ctx, 0.02, 0.1));

        // =================================================================
        // 4. MUSIC CUES / EVENTS
        // =================================================================
        registerSound('sfx_victory', 
            this.createArpeggio(ctx, 'square', [523.25, 659.25, 783.99, 1046.50], 0.15, 0.15));
        registerSound('sfx_jackpot', 
            this.createArpeggio(ctx, 'sine', [880, 1108, 1318, 1760, 1318, 1760], 0.08, 0.2));
        registerSound('sfx_warning', 
            this.createSiren(ctx, 1.5, 300, 600, 4, 0.15));
            
        // =================================================================
        // 5. QUESTION SCENE SPECIFIC
        // =================================================================
        registerSound('sfx_q_ready', 
            this.createArpeggio(ctx, 'sine', [659.25, 880.00, 1318.51], 0.1, 0.2));
            
// Upgraded: "The Tactical Override" (Techy, powerful, and gritty)
        registerSound('sfx_q_correct', 
            this.createTechCorrect(ctx));
            
        // Upgraded harsh wrong answer buzzer
        registerSound('sfx_q_wrong', 
            this.createBuzzer(ctx));
            
        registerSound('sfx_q_skip', 
            this.createSweep(ctx, 'sine', 0.2, 800, 300, 0.15, 'linear'));
        registerSound('sfx_q_low_battery', 
            this.createSweep(ctx, 'square', 0.15, 150, 70, 0.15, 'exp'));
    }

    // ==========================================
    // AUDIO SYNTHESIS ENGINES
    // ==========================================

    /**
     * Upgraded Player Damage Hit: Rapid frequency drop combined with lowpass-filtered noise.
     */
/**
     * Upgraded Player Damage Hit: Long duration for life loss and recovery.
     * Features an initial heavy explosion followed by a trailing electronic malfunction/siren.
     */
    static createHit(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.35; // Matches the ~1.35s invulnerability flicker in GameScene
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        let lastOut = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            
            // --- 1. Initial Heavy Impact (Deep Crunch) ---
            let noise = Math.random() * 2 - 1;
            // Aggressive low-pass filter to give the explosion heavy bass/weight
            noise = lastOut + 0.15 * (noise - lastOut);
            lastOut = noise;
            const noiseEnv = Math.exp(-t * 8); // Quickly fades out over ~0.4 seconds

            // --- 2. Trailing System Malfunction (Electric Glitch / Siren) ---
            // Rapid LFO creates a "warning" wobble effect as systems fail
            const lfo = Math.sin(2 * Math.PI * 12 * t); 
            
            // Pitch sweeps down slowly from 300Hz to 50Hz, modulated by the LFO
            const freq = 300 * Math.pow(50 / 300, t / duration) + (lfo * 20); 
            phase += (2 * Math.PI * freq) / sr;
            
            // Sawtooth wave for a harsh, failing machinery texture
            const tone = 2 * ((phase / (2 * Math.PI)) % 1) - 1; 
            
            // Envelope for the trailing tone (holds steady then curves out gracefully)
            const toneEnv = Math.pow(1 - (t / duration), 1.5); 

            // --- 3. Electric Sparks ---
            // Random high-frequency crackles mostly active in the first half second
            const sparkEnv = Math.max(0, 0.5 - t) * Math.random();

            // Mix layers: Heavy noise blast + trailing glitch siren + sparks
            let sample = (noise * 2.0 * noiseEnv) + (tone * 0.4 * toneEnv) + (sparkEnv * 0.2);
            
            // Hard limiter to prevent audio clipping distortion
            sample = Math.max(-1, Math.min(1, sample));

            data[i] = sample * 0.7; // Master volume
        }
        return buffer;
    }
    /**
     * Creates a harsh, unpleasant buzzing tone (Wrong answers, error bounds)
     */
    static createBuzzer(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.35;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sr;
            // Modulating the frequency wildly makes it sound "broken" and buzzy
            const mod = Math.sin(2 * Math.PI * 40 * t);
            const freq = 100 + mod * 30;
            phase += (2 * Math.PI * freq) / sr;
            let sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1; // Sawtooth

            // Immediate attack, long fade
            const envelope = t < 0.05 ? t / 0.05 : Math.pow(1 - ((t - 0.05) / 0.3), 2);
            data[i] = sample * envelope * 0.4;
        }
        return buffer;
    }

    static createSweep(ctx, type, duration, fStart, fEnd, vol, ramp = 'linear', wobbleFreq = 0) {
        const sr = ctx.sampleRate;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0; 

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const progress = t / duration;
            
            let currentFreq;
            if (ramp === 'exp') {
                currentFreq = fStart * Math.pow(fEnd / fStart, progress);
            } else {
                currentFreq = fStart + (fEnd - fStart) * progress;
            }

            if (wobbleFreq > 0) {
                currentFreq += Math.sin(2 * Math.PI * wobbleFreq * t) * (currentFreq * 0.15); 
            }

            phase += (2 * Math.PI * currentFreq) / sr; 
            let sample = this.getWaveSample(type, phase);

            const attackTime = 0.02;
            let envelope = 1;
            if (t < attackTime) {
                envelope = t / attackTime;
            } else {
                envelope = Math.max(0, 1 - ((t - attackTime) / (duration - attackTime)));
            }

            data[i] = sample * vol * envelope;
        }
        return buffer;
    }

    static createPulse(ctx, type, duration, fStart, fEnd, vol) {
        return this.createSweep(ctx, type, duration, fStart, fEnd, vol, 'linear');
    }

    static createNoise(ctx, duration, vol, isBoom = false) {
        const sr = ctx.sampleRate;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let lastOut = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            let sample = Math.random() * 2 - 1;
            
            if (isBoom) {
                // Lower cut-off LPF for deeper, heavier explosions
                sample = lastOut + 0.05 * (sample - lastOut);
                lastOut = sample;
                sample *= 2.0; 
            }

            const envelope = Math.pow(1 - (t / duration), 3);
            data[i] = sample * vol * envelope;
        }
        return buffer;
    }

    static createArpeggio(ctx, type, freqs, noteTime, vol) {
        const totalDuration = freqs.length * noteTime;
        const sr = ctx.sampleRate;
        const length = Math.floor(sr * totalDuration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const noteIndex = Math.floor(t / noteTime);
            const freq = freqs[Math.min(noteIndex, freqs.length - 1)];
            
            const localT = t % noteTime;
            
            phase += (2 * Math.PI * freq) / sr;
            const sample = this.getWaveSample(type, phase);

            let envelope = 1;
            if (localT < 0.01) envelope = localT / 0.01;
            else if (localT > noteTime - 0.01) envelope = (noteTime - localT) / 0.01;

            data[i] = sample * vol * envelope;
        }
        return buffer;
    }

    static createSiren(ctx, duration, fMin, fMax, lfoSpeed, vol) {
        const sr = ctx.sampleRate;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const lfo = (Math.sin(2 * Math.PI * lfoSpeed * t) + 1) / 2;
            const freq = fMin + lfo * (fMax - fMin);

            phase += (2 * Math.PI * freq) / sr;
            const sample = Math.sin(phase);
            data[i] = sample * vol;
        }
        return buffer;
    }

    static createTremolo(ctx, duration, freq, modFreq, vol) {
        const sr = ctx.sampleRate;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            phase += (2 * Math.PI * freq) / sr;
            const carrier = Math.sin(phase);
            const modulator = (Math.sin(2 * Math.PI * modFreq * t) + 1) / 2;
            const envelope = Math.sin(Math.PI * (t / duration)); 

            data[i] = carrier * modulator * vol * envelope;
        }
        return buffer;
    }


    /**
     * Shield Break: A destructive counterpart to the shield activation.
     * Starts with a glass-like shatter and ends with a glitched power-down of the shield's frequency.
     */
/**
     * Upgraded Shield Break: A 1.2s catastrophic failure sound.
     * Mirrors the 'Activate' frequencies but adds a shatter impact and a collapsing pitch.
     */
    static createShieldBreak(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.2; 
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        let lastNoise = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const progress = t / duration;

            // --- 1. THE SHATTER (Initial 0.2s High-Frequency Snap) ---
            let noise = Math.random() * 2 - 1;
            // High-pass filter for a "glassy" crack
            const hpNoise = noise - lastNoise;
            lastNoise = noise;
            const shatterEnv = Math.exp(-t * 15); 

            // --- 2. THE COLLAPSE (The "Activate" Tone falling apart) ---
            // Start at 500Hz (matching Activate) and drop to 60Hz
            const freq = 500 * Math.exp(-t * 3); 
            
            // Modulation (the "tremolo") starts at 8Hz but speeds up to 40Hz 
            // to sound like a glitching circuit before dying.
            const modSpeed = 8 + (progress * 32);
            const modulator = (Math.sin(2 * Math.PI * modSpeed * t) + 1) / 2;
            
            phase += (2 * Math.PI * freq) / sr;
            const carrier = Math.sin(phase);

            // --- 3. THE "POWER DRAIN" ENVELOPE ---
            // A stuttering fade out
            const stutter = Math.random() > 0.9 ? 0.2 : 1.0; 
            const toneEnv = Math.pow(1 - progress, 2) * stutter;

            // --- 4. MIXING ---
            let sample = (hpNoise * 0.9 * shatterEnv) + (carrier * modulator * 0.5 * toneEnv);
            
            // Add a low-end "thump" at the very start for weight
            if (t < 0.1) sample += Math.sin(2 * Math.PI * 60 * t) * 0.3;

            data[i] = sample * 0.6;
        }
        return buffer;
    }


    static getWaveSample(type, phase) {
        switch (type) {
            case 'square': return Math.sin(phase) > 0 ? 1 : -1;
            case 'sawtooth': return 2 * ((phase / (2 * Math.PI)) % 1) - 1; 
            case 'triangle': return Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) * 2 - 1; 
            case 'sine': 
            default: return Math.sin(phase);
        }
    }



    /**
     * Upgraded Regen: A snappy, bright "magic chime" (0.15s).
     * Replaces the old 0.6s version to feel more immediate during life loss recovery.
     */
    static createRegen(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.15; // Extremely short and snappy
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const progress = t / duration;
            
            // Fast 3-note chime (A5 -> E6 -> A6)
            let freq = 880;
            if (progress > 0.33) freq = 1318.51;
            if (progress > 0.66) freq = 1760;

            phase += (2 * Math.PI * freq) / sr;
            
            // Clean sine wave for a "healing" feel
            const sample = Math.sin(phase);

            // A "pinging" envelope that resets slightly at each note change
            const noteT = (t % 0.05) / 0.05;
            const envelope = Math.exp(-noteT * 8) * (1 - progress * 0.3);

            data[i] = sample * envelope * 0.35;
        }
        return buffer;
    }
/**
     * Upgraded Shockwave: A cinematic, powerful pressure wave (1.0s).
     * Layers a deep sub-bass thump with a resonant expanding noise sweep.
     */
/**
     * Upgraded Shockwave: A highly cinematic, powerful pressure wave (1.5s).
     * Layers an initial high-energy crack, a deep sub-bass drop, and a swelling noise whoosh.
     */
/**
     * Light Radar/Elemental Shockwave: A quick, techy, resonant ping (0.5s).
     * Designed to match a light "aura" expansion (lightning/ice/plasma) without heavy bass.
     */
/**
     * Heavy EMP/Seismic Shockwave: A deep, expanding sci-fi blast (1.2s).
     * Features a heavy sub-bass drop combined with a sweeping low-pass energy wave.
     */
    static createShockwave(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.2;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        let lastNoise = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            
            // --- 1. EMP Bass Drop (Sub-frequency dive) ---
            // Starts at a punchy 150Hz and dives quickly to a rumbling 20Hz
            const freq = 20 + 130 * Math.exp(-t * 6);
            phase += (2 * Math.PI * freq) / sr;
            
            // Overdriven sine wave for thick, cinematic bass
            let bass = Math.sin(phase);
            bass = Math.sign(bass) * (1 - Math.exp(-Math.abs(bass) * 3));
            
            // Bass Envelope: Fast attack, slow rumbling fade
            const bassEnv = t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 3);
            bass *= bassEnv;

            // --- 2. Expanding Energy Wave (Filtered Noise Sweep) ---
            const rawNoise = Math.random() * 2 - 1;
            
            // Low-pass filter that dynamically opens and closes to simulate a wave passing
            const lpfFreq = 400 + 2000 * Math.sin((t / duration) * Math.PI); 
            const alpha = lpfFreq / (lpfFreq + sr / (2 * Math.PI));
            lastNoise = lastNoise + alpha * (rawNoise - lastNoise);
            
            // Noise Envelope: Swells up slightly slower than the bass, then dissipates
            const noiseEnv = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 2.5);
            const energy = lastNoise * noiseEnv * 1.5;

            // --- 3. Mixing ---
            let sample = (bass * 0.8) + (energy * 0.4);
            
            // Hard limiter to prevent audio clipping distortion
            sample = Math.max(-1, Math.min(1, sample));
            
            // Smooth fade out at the very end to prevent popping
            const fadeOut = Math.max(0, 1 - Math.pow(t / duration, 4));
            
            data[i] = sample * fadeOut * 0.75; // Master volume
        }
        return buffer;
    }   /**
     * Upgraded Coin: A classic 2-tone "bling" sound (0.15s).
     * Features a rapid jump from 987Hz (B5) to 1318Hz (E6) for a rewarding feel.
     */
    static createCoin(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.15;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const progress = t / duration;
            
            // Classic 2-note jump: B5 (987.77Hz) for 1/3rd, then E6 (1318.51Hz) for the rest
            const freq = progress < 0.3 ? 987.77 : 1318.51;

            phase += (2 * Math.PI * freq) / sr;
            
            // Blend Sine and Triangle for a bright but smooth "metal" sound
            const sample = (Math.sin(phase) * 0.7) + (Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) * 2 - 1) * 0.3;

            // Exponential decay for each note to make it "ping"
            const noteT = progress < 0.3 ? (t / (duration * 0.3)) : ((t - duration * 0.3) / (duration * 0.7));
            const envelope = Math.exp(-noteT * 5) * (1 - progress * 0.5);

            data[i] = sample * envelope * 0.4;
        }
        return buffer;
    }



    /**
     * Battery Collect: A smooth, subtle, and unobtrusive soft chime (0.15s).
     */
    static createBatteryCollect(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.15; 
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const progress = t / duration;
            
            // Very gentle, narrow upward sweep (440Hz to 550Hz) - soft and not piercing
            const freq = 440 + (110 * progress);
            phase += (2 * Math.PI * freq) / sr;
            
            // Pure sine wave for maximum smoothness (no harsh harmonics)
            const sample = Math.sin(phase);

            // Smooth envelope: soft 15ms attack to avoid clicks, then a gentle decay
            let envelope = 1;
            if (progress < 0.1) {
                envelope = progress / 0.1; 
            } else {
                envelope = Math.pow(1 - ((progress - 0.1) / 0.9), 2);
            }

            // Keep master volume very low (0.15) so it blends perfectly into the background
            data[i] = sample * envelope * 0.15;
        }
        return buffer;
    }


    /**
     * TNT/Heavy Explosion (Upgraded): A cinematic, aggressive Hollywood-style explosion.
     * Features a violent crack, a distorted chest-thumping sub-drop, and a rolling debris rumble.
     */
    static createTNT(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.6; // Longer duration for the rolling rumble
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        let noiseFilter1 = 0;
        let noiseFilter2 = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            
            // --- 1. The Detonation Crack ---
            // Pure white noise that dies out almost instantly (the initial blast wave)
            const crack = (Math.random() * 2 - 1) * Math.exp(-t * 50);

            // --- 2. The Punch (Sub-bass Impact) ---
            // Sweeps rapidly from 200Hz down to 25Hz for a chest-thumping feel
            const punchFreq = 25 + 175 * Math.exp(-t * 15);
            phase += (2 * Math.PI * punchFreq) / sr;
            
            // Distorted sine wave (saturation) to give it aggressive, tearing harmonics
            let punch = Math.sin(phase);
            punch = Math.sign(punch) * (1 - Math.exp(-Math.abs(punch) * 4)); 
            punch *= Math.exp(-t * 5); 

            // --- 3. The Rolling Rumble (Debris & Echo) ---
            const rawNoise = Math.random() * 2 - 1;
            // Double low-pass filter to make the noise sound deep, boomy, and distant
            noiseFilter1 += 0.015 * (rawNoise - noiseFilter1);
            noiseFilter2 += 0.015 * (noiseFilter1 - noiseFilter2);
            
            // Rumble swells up slightly after the initial crack, then fades slowly
            const rumbleEnv = t < 0.03 ? (t / 0.03) : Math.exp(-(t - 0.03) * 1.8);
            const rumble = noiseFilter2 * 10.0 * rumbleEnv;

            // --- 4. The Sizzle (Shrapnel & Dirt) ---
            // High-frequency texture that lingers in the air
            const sizzle = (Math.random() * 2 - 1) * 0.08 * Math.exp(-t * 2);

            // --- 5. Mix & Master ---
            let sample = crack + (punch * 1.5) + rumble + sizzle;

            // Hard clipping/Overdrive: Simulates a microphone maxing out for extra "violence"
            sample = Math.max(-0.95, Math.min(0.95, sample * 1.8));

            // Smooth fade out to prevent speaker clicking at the end
            const masterFade = Math.min(1, (duration - t) * 5);

            data[i] = sample * 0.7 * masterFade; // Master volume
        }
        return buffer;
    }


/**
     * Tech Correct: A gritty, powerful "System Success" sound.
     * Matches the aggressive, distorted vibe of the TNT and Hit effects.
     * Uses a Power Chord (Perfect 5ths) and Saturation instead of sweet major scales.
     */
/**
     * Upgraded Tech Correct: A futuristic, bright "Holographic Success" chime.
     * Uses FM synthesis for a glassy, high-tech timbre and an upward-resolving
     * arpeggio to clearly communicate a "correct/success" state without harsh distortion.
     */
static createTechCorrect(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.6; // Much shorter, snappier duration
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        // Rapid, tight arpeggio: C6, G6, E7 (Very bright and "Premium")
        const notes = [
            { freq: 1046.50, start: 0.00 }, 
            { freq: 1567.98, start: 0.04 }, 
            { freq: 2637.02, start: 0.08 }  
        ];

        let phases = [0, 0, 0];
        let phasesDetuned = [0, 0, 0];

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            let sample = 0;

            for (let j = 0; j < notes.length; j++) {
                if (t >= notes[j].start) {
                    const localT = t - notes[j].start;
                    const f = notes[j].freq;

                    phases[j] += (2 * Math.PI * f) / sr;
                    phasesDetuned[j] += (2 * Math.PI * (f * 1.005)) / sr; // Wide chorus

                    const tone = (Math.sin(phases[j]) * 0.6) + (Math.sin(phasesDetuned[j]) * 0.4);
                    
                    // Sharp attack, fast decay for "High Quality" pluck feel
                    const env = Math.exp(-localT * 12.0); 
                    sample += tone * env * 0.25;
                }
            }

            // Analog Soft-Clip for that "Expensive" mastered finish
            data[i] = Math.tanh(sample * 2.0) * 0.5 * Math.min(1.0, (duration - t) * 20);
        }
        return buffer;
    }
}