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
        registerSound('sfx_shoot', this.createSweep(ctx, 'sine', 0.08, 800, 400, 0.03, 'exp'));
        registerSound('sfx_enemy_hit', this.createPulse(ctx, 'sine', 0.05, 400, 200, 0.03));
        registerSound('sfx_explode', this.createNoise(ctx, 0.25, 0.1, true));
        registerSound('sfx_shoot_heavy', this.createSweep(ctx, 'sawtooth', 0.18, 600, 100, 0.1, 'exp'));
        registerSound('sfx_enemy_shoot', this.createSweep(ctx, 'sine', 0.15, 1800, 600, 0.08, 'linear', 30));
        registerSound('sfx_hit', this.createHit(ctx));
        registerSound('sfx_rock_hit', this.createNoise(ctx, 0.15, 0.35, true));
        registerSound('sfx_missile', this.createSweep(ctx, 'sine', 0.35, 100, 900, 0.12, 'exp'));
        registerSound('sfx_shockwave', this.createShockwave(ctx));
        registerSound('sfx_speed_boost', this.createSweep(ctx, 'sine', 0.8, 300, 1800, 0.15, 'exp'));
        registerSound('sfx_boss_spawn', this.createTremolo(ctx, 3.5, 60, 20, 0.5));
        registerSound('sfx_boss_phase2', this.createArpeggio(ctx, 'sawtooth', [150, 200, 300, 450, 600], 0.15, 0.3));

        // NEW: Enemy Modifier SFX
        registerSound('sfx_enemy_dash', this.createEnemyDash(ctx));
        registerSound('sfx_enemy_shield_hit', this.createEnemyShieldHit(ctx));
        registerSound('sfx_enemy_shield_break', this.createEnemyShieldBreak(ctx));
        registerSound('sfx_enemy_bomb', this.createEnemyBomb(ctx));

        // NEW: Cinematic Transition SFX
        registerSound('sfx_boss_overload', this.createBossOverload(ctx));
        registerSound('sfx_wormhole_exit', this.createWormholeExit(ctx));

        // =================================================================
        // 2. STATUS & ITEMS
        // =================================================================
        registerSound('sfx_regen', this.createRegen(ctx));
        registerSound('sfx_coin', this.createCoin(ctx));
        registerSound('sfx_battery_collect', this.createBatteryCollect(ctx));
        registerSound('sfx_TNT', this.createTNT(ctx));
        registerSound('sfx_powerup', this.createSweep(ctx, 'sine', 0.4, 400, 1200, 0.15, 'linear'));
        registerSound('sfx_shield_activate', this.createTremolo(ctx, 0.8, 500, 800, 0.2));
        registerSound('sfx_shield_break', this.createShieldBreak(ctx));
        registerSound('sfx_xp_gain', this.createXPGain(ctx)); // NEW
            
        // =================================================================
        // 3. UI & SYSTEM
        // =================================================================
        registerSound('sfx_click', this.createPulse(ctx, 'sine', 0.05, 900, 900, 0.1));
        registerSound('sfx_back', this.createPulse(ctx, 'triangle', 0.08, 500, 300, 0.1));
        registerSound('sfx_error', this.createBuzzer(ctx));
        registerSound('sfx_tick', this.createNoise(ctx, 0.02, 0.1));

        // =================================================================
        // 4. MUSIC CUES / EVENTS
        // =================================================================
        registerSound('sfx_victory', this.createArpeggio(ctx, 'square', [523.25, 659.25, 783.99, 1046.50], 0.15, 0.15));
        registerSound('sfx_jackpot', this.createArpeggio(ctx, 'sine', [880, 1108, 1318, 1760, 1318, 1760], 0.08, 0.2));
        registerSound('sfx_warning', this.createSiren(ctx, 1.5, 300, 600, 4, 0.15));
        registerSound('sfx_boss_win', this.createBossWin(ctx));
            
        // =================================================================
        // 5. QUESTION SCENE SPECIFIC
        // =================================================================
        registerSound('sfx_q_ready', this.createArpeggio(ctx, 'sine', [659.25, 880.00, 1318.51], 0.1, 0.2));
        registerSound('sfx_q_correct', this.createTechCorrect(ctx));
        registerSound('sfx_q_wrong', this.createBuzzer(ctx));
        registerSound('sfx_q_skip', this.createSweep(ctx, 'sine', 0.2, 800, 300, 0.15, 'linear'));
        registerSound('sfx_q_low_battery', this.createSweep(ctx, 'square', 0.15, 150, 70, 0.15, 'exp'));
    }

    // ==========================================
    // AUDIO SYNTHESIS ENGINES
    // ==========================================

    static createHit(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.35; 
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        let lastOut = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            let noise = Math.random() * 2 - 1;
            noise = lastOut + 0.15 * (noise - lastOut);
            lastOut = noise;
            const noiseEnv = Math.exp(-t * 8); 

            const lfo = Math.sin(2 * Math.PI * 12 * t); 
            const freq = 300 * Math.pow(50 / 300, t / duration) + (lfo * 20); 
            phase += (2 * Math.PI * freq) / sr;
            
            const tone = 2 * ((phase / (2 * Math.PI)) % 1) - 1; 
            const toneEnv = Math.pow(1 - (t / duration), 1.5); 

            const sparkEnv = Math.max(0, 0.5 - t) * Math.random();

            let sample = (noise * 2.0 * noiseEnv) + (tone * 0.4 * toneEnv) + (sparkEnv * 0.2);
            sample = Math.max(-1, Math.min(1, sample));
            data[i] = sample * 0.7; 
        }
        return buffer;
    }

    static createBuzzer(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.35;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const mod = Math.sin(2 * Math.PI * 40 * t);
            const freq = 100 + mod * 30;
            phase += (2 * Math.PI * freq) / sr;
            let sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1;

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

            let noise = Math.random() * 2 - 1;
            const hpNoise = noise - lastNoise;
            lastNoise = noise;
            const shatterEnv = Math.exp(-t * 15); 

            const freq = 500 * Math.exp(-t * 3); 
            
            const modSpeed = 8 + (progress * 32);
            const modulator = (Math.sin(2 * Math.PI * modSpeed * t) + 1) / 2;
            
            phase += (2 * Math.PI * freq) / sr;
            const carrier = Math.sin(phase);

            const stutter = Math.random() > 0.9 ? 0.2 : 1.0; 
            const toneEnv = Math.pow(1 - progress, 2) * stutter;

            let sample = (hpNoise * 0.9 * shatterEnv) + (carrier * modulator * 0.5 * toneEnv);
            
            if (t < 0.1) sample += Math.sin(2 * Math.PI * 60 * t) * 0.3;

            data[i] = sample * 0.6;
        }
        return buffer;
    }

    static createEnemyDash(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.3;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        let phase = 0;

        for(let i=0; i<length; i++) {
            const t = i/sr;
            const env = Math.exp(-t*15);
            const freq = 200 + 1000 * (t / duration); 
            phase += (2 * Math.PI * freq) / sr;
            const tone = Math.sin(phase);
            const noise = (Math.random() * 2 - 1);
            
            data[i] = (tone * 0.4 + noise * 0.6) * env * 0.3; 
        }
        return buffer;
    }

    static createEnemyBomb(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.2;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        let phase = 0;
        let lastOut = 0;

        for(let i=0; i<length; i++) {
            const t = i/sr;
            const freq = 120 * Math.exp(-t * 12);
            phase += (2 * Math.PI * freq) / sr;
            let punch = Math.sin(phase);
            punch = Math.sign(punch) * (1 - Math.exp(-Math.abs(punch) * 4)); 

            let noise = Math.random() * 2 - 1;
            noise = lastOut + 0.05 * (noise - lastOut); 
            lastOut = noise;
            
            const env = t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 4);
            data[i] = (punch * 0.6 + noise * 1.5) * env * 0.7;
        }
        return buffer;
    }

    static createEnemyShieldHit(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.15;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        let phase = 0;
        
        for(let i=0; i<length; i++) {
            const t = i/sr;
            const freq = 1500 + 300 * Math.sin(t * Math.PI * 30); 
            phase += (2 * Math.PI * freq) / sr;
            const env = Math.exp(-t * 25);
            data[i] = Math.sin(phase) * env * 0.4;
        }
        return buffer;
    }

    static createEnemyShieldBreak(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.6;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        let phase = 0;
        let lastNoise = 0;

        for(let i=0; i<length; i++) {
            const t = i/sr;
            let noise = Math.random() * 2 - 1;
            let hpNoise = noise - lastNoise;
            lastNoise = noise;
            const noiseEnv = Math.exp(-t * 20);
            
            const freq = 1200 * Math.exp(-t * 5);
            phase += (2 * Math.PI * freq) / sr;
            const tone = Math.sin(phase);
            const toneEnv = Math.exp(-t * 8);

            data[i] = (hpNoise * 0.7 * noiseEnv) + (tone * 0.3 * toneEnv);
        }
        return buffer;
    }

    // --- NEW: CINEMATIC EFFECTS ---
    
    static createBossOverload(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.5;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        
        let phase1 = 0, phase2 = 0;
        let lastNoise = 0;

        for(let i=0; i<length; i++) {
            const t = i/sr;
            const progress = t / duration;
            
            const baseFreq = 50 + (250 * Math.pow(progress, 3)); 
            
            // Overlapping distorted saws
            phase1 += (2 * Math.PI * baseFreq) / sr;
            phase2 += (2 * Math.PI * (baseFreq * 1.05)) / sr;
            
            let tone = (this.getWaveSample('sawtooth', phase1) + this.getWaveSample('square', phase2)) * 0.5;
            
            // Grinding Noise
            let noise = Math.random() * 2 - 1;
            lastNoise = noise + 0.5 * (noise - lastNoise); // High pass emphasis
            
            const tremolo = (Math.sin(2 * Math.PI * (10 + 30 * progress) * t) + 1) / 2;
            
            let env = Math.pow(progress, 2); // Swells up
            data[i] = ((tone * 0.6) + (lastNoise * 0.4)) * tremolo * env * 0.6;
        }
        return buffer;
    }

    static createWormholeExit(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.8;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        
        let phase = 0;
        let lastOut = 0;

        for(let i=0; i<length; i++) {
            const t = i/sr;
            
            // Initial impact boom
            const boomFreq = 80 * Math.exp(-t * 15);
            phase += (2 * Math.PI * boomFreq) / sr;
            const punch = Math.sin(phase) * Math.exp(-t * 8);

            // Warp sweep upwards
            const warpFreq = 100 + (1800 * Math.pow(t/duration, 2));
            const warpPhase = (2 * Math.PI * warpFreq * t);
            const warp = Math.sin(warpPhase) * (t / duration);
            
            // Vacuum noise 
            let noise = Math.random() * 2 - 1;
            noise = lastOut + 0.1 * (noise - lastOut); 
            lastOut = noise;
            const noiseEnv = Math.exp(-t * 3);

            let sample = punch + (warp * 0.4) + (noise * noiseEnv * 0.8);
            data[i] = Math.max(-1, Math.min(1, sample)) * 0.8;
        }
        return buffer;
    }

    static createXPGain(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.0;
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        
        const notes = [
            { freq: 880.00, start: 0.0 }, 
            { freq: 1108.73, start: 0.1 }, 
            { freq: 1318.51, start: 0.2 }, 
            { freq: 1760.00, start: 0.35 }
        ];

        let phases = [0, 0, 0, 0];

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            let sample = 0;

            for (let j = 0; j < notes.length; j++) {
                if (t >= notes[j].start) {
                    const localT = t - notes[j].start;
                    phases[j] += (2 * Math.PI * notes[j].freq) / sr;
                    
                    const tone = Math.sin(phases[j]);
                    const env = Math.exp(-localT * 8);
                    
                    sample += tone * env * 0.25;
                }
            }
            data[i] = sample;
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

    static createRegen(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.15; 
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sr;
            const progress = t / duration;
            
            let freq = 880;
            if (progress > 0.33) freq = 1318.51;
            if (progress > 0.66) freq = 1760;

            phase += (2 * Math.PI * freq) / sr;
            const sample = Math.sin(phase);

            const noteT = (t % 0.05) / 0.05;
            const envelope = Math.exp(-noteT * 8) * (1 - progress * 0.3);

            data[i] = sample * envelope * 0.35;
        }
        return buffer;
    }

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
            
            const freq = 20 + 130 * Math.exp(-t * 6);
            phase += (2 * Math.PI * freq) / sr;
            
            let bass = Math.sin(phase);
            bass = Math.sign(bass) * (1 - Math.exp(-Math.abs(bass) * 3));
            
            const bassEnv = t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 3);
            bass *= bassEnv;

            const rawNoise = Math.random() * 2 - 1;
            const lpfFreq = 400 + 2000 * Math.sin((t / duration) * Math.PI); 
            const alpha = lpfFreq / (lpfFreq + sr / (2 * Math.PI));
            lastNoise = lastNoise + alpha * (rawNoise - lastNoise);
            
            const noiseEnv = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 2.5);
            const energy = lastNoise * noiseEnv * 1.5;

            let sample = (bass * 0.8) + (energy * 0.4);
            sample = Math.max(-1, Math.min(1, sample));
            
            const fadeOut = Math.max(0, 1 - Math.pow(t / duration, 4));
            data[i] = sample * fadeOut * 0.75; 
        }
        return buffer;
    }   

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
            
            const freq = progress < 0.3 ? 987.77 : 1318.51;
            phase += (2 * Math.PI * freq) / sr;
            
            const sample = (Math.sin(phase) * 0.7) + (Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) * 2 - 1) * 0.3;

            const noteT = progress < 0.3 ? (t / (duration * 0.3)) : ((t - duration * 0.3) / (duration * 0.7));
            const envelope = Math.exp(-noteT * 5) * (1 - progress * 0.5);

            data[i] = sample * envelope * 0.4;
        }
        return buffer;
    }

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
            
            const freq = 440 + (110 * progress);
            phase += (2 * Math.PI * freq) / sr;
            const sample = Math.sin(phase);

            let envelope = 1;
            if (progress < 0.1) {
                envelope = progress / 0.1; 
            } else {
                envelope = Math.pow(1 - ((progress - 0.1) / 0.9), 2);
            }

            data[i] = sample * envelope * 0.15;
        }
        return buffer;
    }

    static createTNT(ctx) {
        const sr = ctx.sampleRate;
        const duration = 1.6; 
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        let phase = 0;
        let noiseFilter1 = 0;
        let noiseFilter2 = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            
            const crack = (Math.random() * 2 - 1) * Math.exp(-t * 50);

            const punchFreq = 25 + 175 * Math.exp(-t * 15);
            phase += (2 * Math.PI * punchFreq) / sr;
            
            let punch = Math.sin(phase);
            punch = Math.sign(punch) * (1 - Math.exp(-Math.abs(punch) * 4)); 
            punch *= Math.exp(-t * 5); 

            const rawNoise = Math.random() * 2 - 1;
            noiseFilter1 += 0.015 * (rawNoise - noiseFilter1);
            noiseFilter2 += 0.015 * (noiseFilter1 - noiseFilter2);
            
            const rumbleEnv = t < 0.03 ? (t / 0.03) : Math.exp(-(t - 0.03) * 1.8);
            const rumble = noiseFilter2 * 10.0 * rumbleEnv;

            const sizzle = (Math.random() * 2 - 1) * 0.08 * Math.exp(-t * 2);

            let sample = crack + (punch * 1.5) + rumble + sizzle;
            sample = Math.max(-0.95, Math.min(0.95, sample * 1.8));
            const masterFade = Math.min(1, (duration - t) * 5);

            data[i] = sample * 0.7 * masterFade; 
        }
        return buffer;
    }

    static createBossWin(ctx) {
        const sr = ctx.sampleRate;
        const duration = 2.5; 
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        const notes = [
            { freq: 261.63, start: 0.20 }, 
            { freq: 392.00, start: 0.35 }, 
            { freq: 523.25, start: 0.50 }, 
            { freq: 659.25, start: 0.65 }, 
            { freq: 783.99, start: 0.80 }, 
            { freq: 1046.50, start: 1.00 } 
        ];

        let lastNoise = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sr;
            let sample = 0;

            if (t < 1.2) {
                let rawNoise = Math.random() * 2 - 1;
                let lpf = 0.05 + 0.1 * Math.exp(-t * 5);
                lastNoise += lpf * (rawNoise - lastNoise);
                
                let noiseEnv = Math.exp(-t * 3);
                sample += lastNoise * noiseEnv * 1.5;
            }

            for (let j = 0; j < notes.length; j++) {
                if (t >= notes[j].start) {
                    const localT = t - notes[j].start;
                    const f = notes[j].freq;
                    
                    let vibrato = 0;
                    if (j === notes.length - 1) {
                        vibrato = Math.sin(2 * Math.PI * 6 * localT) * (f * 0.015);
                    }

                    const phase = 2 * Math.PI * (f + vibrato) * localT;
                    const tone = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
                    
                    let env;
                    if (j === notes.length - 1) {
                        env = localT < 0.1 ? localT / 0.1 : Math.exp(-(localT - 0.1) * 1.2);
                    } else {
                        env = localT < 0.05 ? localT / 0.05 : Math.exp(-(localT - 0.05) * 12);
                    }

                    sample += tone * env * 0.4;
                }
            }

            sample = Math.tanh(sample * 1.5); 
            const masterFade = Math.max(0, 1 - Math.pow(t / duration, 3));
            data[i] = sample * masterFade * 0.65;
        }
        return buffer;
    }

    static createTechCorrect(ctx) {
        const sr = ctx.sampleRate;
        const duration = 0.6; 
        const length = Math.floor(sr * duration);
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

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
                    phasesDetuned[j] += (2 * Math.PI * (f * 1.005)) / sr; 

                    const tone = (Math.sin(phases[j]) * 0.6) + (Math.sin(phasesDetuned[j]) * 0.4);
                    
                    const env = Math.exp(-localT * 12.0); 
                    sample += tone * env * 0.25;
                }
            }

            data[i] = Math.tanh(sample * 2.0) * 0.5 * Math.min(1.0, (duration - t) * 20);
        }
        return buffer;
    }
}