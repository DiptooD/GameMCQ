class SettingsScene extends Phaser.Scene {
    constructor() {
        super("SettingsScene");
    }

    init(data) {
        this.returnScene = (data && data.returnScene) ? data.returnScene : "MenuScene";
    }

    create() {
        this.scene.bringToTop();

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        this.container = this.add.container(0, 0);

        this.overlay = this.add.rectangle(0, 0, 720, 1280, 0x000000, 0.85).setOrigin(0).setInteractive();
        
        this.bg = this.add.graphics();
        this.bg.fillStyle(0x000c22, 0.95);
        this.bg.fillRoundedRect(cx - 290, cy - 400, 580, 820, 20);
        this.bg.lineStyle(4, 0x0066aa, 1);
        this.bg.strokeRoundedRect(cx - 290, cy - 400, 580, 820, 20);

        this.title = this.add.text(cx, cy - 350, "সেটিংস", { 
            fontSize: '44px', fontFamily: "'Anek Bangla'", color: '#00e1ff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        // UI SCALING
        const closeHit = this.add.circle(cx + 230, cy - 350, 45).setInteractive({ useHandCursor: true });
        const closeIcon = this.add.text(cx + 230, cy - 350, "✖", { fontSize: '40px', color: '#ff4444' }).setOrigin(0.5);
        
        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            this.scene.stop();
            if (this.scene.isPaused(this.returnScene)) {
                this.scene.resume(this.returnScene);
            }
        });

        this.container.add([this.overlay, this.bg, this.title, closeIcon, closeHit]);
        
        let musicVol = Math.round((GameState.musicVolume !== undefined ? GameState.musicVolume : 0.5) * 10);
        if (musicVol < 0) musicVol = 0; 
        this.musicAdj = this.createSlider(-210, "মিউজিক ভলিউম:", 0, 10, 1, musicVol, (v) => v, (val) => {
            GameState.musicVolume = val / 10;
            localStorage.setItem('settings_musicVol', GameState.musicVolume);
            this.updateLiveGameUI();
        });

        let sfxVol = Math.round((GameState.sfxVolume !== undefined ? GameState.sfxVolume : 1.0) * 5);
        if (sfxVol < 0) sfxVol = 0;
        if (sfxVol > 10) sfxVol = 10;
        this.sfxAdj = this.createSlider(-120, "সাউন্ড ইফেক্ট:", 0, 10, 1, sfxVol, (v) => v, (val) => {
            GameState.sfxVolume = val / 5;
            localStorage.setItem('settings_sfxVol', GameState.sfxVolume);
        });
        
        let qDelayLevel = GameState.qDelayLevel !== undefined ? GameState.qDelayLevel : 15;
        this.qDelayAdj = this.createSlider(-30, "মধ্যবর্তী বিলম্ব: (Inter-Question Delay):", 5, 40, 5, qDelayLevel, (v) => (v / 10).toFixed(1) + "s", (val) => {
            GameState.qDelayLevel = val;
            localStorage.setItem('settings_qDelay', GameState.qDelayLevel);
        });

        let uiSize = parseInt(localStorage.getItem('settings_uiScaleLevel'));
        if (isNaN(uiSize)) uiSize = 0;
        this.uiAdj = this.createStepper(50, "ডিসপ্লে জুম: (UI Zoom)", -5, 5, uiSize, (val) => {
            localStorage.setItem('settings_uiScaleLevel', val);
            this.updateLiveGameUI();
        });

        // Segmented Tab for Quick Panel
        this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';
        const qpOptions = ['right', 'hidden', 'left'];
        const qpLabels = ['ডান', 'বন্ধ', 'বাম'];
        
        const qpLabel = this.add.text(cx, cy + 120, "কুইক প্যানেল পজিশন:", { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0.5);
        
        const segW = 480;
        const segH = 50;
        const segX = cx;
        const segY = cy + 180;

        const segBg = this.add.graphics();
        segBg.fillStyle(0x001022, 1);
        segBg.fillRoundedRect(segX - segW/2, segY - segH/2, segW, segH, segH/2);
        segBg.lineStyle(2, 0x004488, 1);
        segBg.strokeRoundedRect(segX - segW/2, segY - segH/2, segW, segH, segH/2);

        const highlight = this.add.graphics();
        const tabW = segW / 3;
        
        const drawHighlight = (idx) => {
            highlight.clear();
            highlight.fillStyle(0x0066aa, 1);
            highlight.fillRoundedRect(segX - segW/2 + (idx * tabW) + 4, segY - segH/2 + 4, tabW - 8, segH - 8, (segH-8)/2);
        };
        
        let currentIdx = qpOptions.indexOf(this.quickPanelState);
        if (currentIdx === -1) currentIdx = 0;
        drawHighlight(currentIdx);
        
        this.container.add([qpLabel, segBg, highlight]);

        qpOptions.forEach((opt, idx) => {
            const txt = this.add.text(segX - segW/2 + (idx * tabW) + tabW/2, segY, qpLabels[idx], {
                fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
            
            const hitArea = this.add.rectangle(segX - segW/2 + (idx * tabW) + tabW/2, segY, tabW, segH, 0, 0).setInteractive({useHandCursor: true});
            
            hitArea.on('pointerdown', () => {
                this.playSound('sfx_tick');
                this.quickPanelState = opt;
                localStorage.setItem('settings_quickPanel', this.quickPanelState);
                drawHighlight(idx);
                this.updateLiveGameUI();
            });
            this.container.add([txt, hitArea]);
        });

        // Reset Settings Button
        const resetBtnBg = this.add.graphics();
        resetBtnBg.fillStyle(0x004422, 1);
        resetBtnBg.fillRoundedRect(cx - 240, cy + 240, 480, 55, 15);
        resetBtnBg.lineStyle(2, 0x00ff88, 1);
        resetBtnBg.strokeRoundedRect(cx - 240, cy + 240, 480, 55, 15);

        const resetBtnTxt = this.add.text(cx, cy + 267, "ডিফল্ট সেটিংসে ফিরুন", { 
            fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#aaffaa', fontStyle: 'bold' ,padding: { y: 3 }
        }).setOrigin(0.5);

        const resetHit = this.add.rectangle(cx, cy + 267, 480, 55).setInteractive({ useHandCursor: true });
        resetHit.on('pointerdown', () => {
            this.playSound('sfx_powerup');
            this.musicAdj.setValue(5);
            this.sfxAdj.setValue(5);
            this.qDelayAdj.setValue(15); 
            this.uiAdj.setValue(0); 
            
            this.quickPanelState = 'right';
            localStorage.setItem('settings_quickPanel', 'right');
            drawHighlight(0);

            this.updateLiveGameUI();
        });

        // Clear History Button
        const clearBtnBg = this.add.graphics();
        clearBtnBg.fillStyle(0x550000, 1);
        clearBtnBg.fillRoundedRect(cx - 240, cy + 310, 480, 55, 15);
        clearBtnBg.lineStyle(2, 0xff4444, 1);
        clearBtnBg.strokeRoundedRect(cx - 240, cy + 310, 480, 55, 15);

        const clearBtnTxt = this.add.text(cx, cy + 337, "হিস্ট্রি মুছুন", { 
            fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffaaaa', fontStyle: 'bold',padding: { y: 3} 
        }).setOrigin(0.5);

        const clearHit = this.add.rectangle(cx, cy + 337, 480, 55).setInteractive({ useHandCursor: true });
        clearHit.on('pointerdown', () => {
            this.playSound('sfx_warning');
            this.showClearHistoryWarning();
        });
        
        this.container.add([resetBtnBg, resetBtnTxt, resetHit, clearBtnBg, clearBtnTxt, clearHit]);
        this.container.setAlpha(0);
        this.tweens.add({ targets: this.container, alpha: 1, duration: 200 });
    }

    createSlider(yOffset, labelText, min, max, stepSize, currentVal, formatFn, callback) {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        
        const label = this.add.text(cx - 240, cy + yOffset - 25, labelText, { fontSize: '20px', fontFamily: "'Anek Bangla'", color: '#aaccff' }).setOrigin(0, 0.5);
        const valText = this.add.text(cx + 240, cy + yOffset - 25, formatFn(currentVal), { fontSize: '26px', fontFamily: "'Anek Bangla'", color: '#00ffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
        
        const sliderW = 480;
        const sliderH = 14;
        const sliderX = cx - sliderW/2;
        const sliderY = cy + yOffset + 5;

        const trackBg = this.add.graphics();
        trackBg.fillStyle(0x001022, 1);
        trackBg.fillRoundedRect(sliderX, sliderY - sliderH/2, sliderW, sliderH, sliderH/2);
        trackBg.lineStyle(2, 0x003366, 1);
        trackBg.strokeRoundedRect(sliderX, sliderY - sliderH/2, sliderW, sliderH, sliderH/2);

        const steps = (max - min) / stepSize;
        const stepW = sliderW / steps;
        
        trackBg.lineStyle(2, 0x004488, 0.8);
        for(let i = 0; i <= steps; i++) {
            trackBg.beginPath();
            trackBg.moveTo(sliderX + i*stepW, sliderY - sliderH/2 - 4);
            trackBg.lineTo(sliderX + i*stepW, sliderY + sliderH/2 + 4);
            trackBg.strokePath();
        }

        const fill = this.add.graphics();
        let val = currentVal;

        // UI SCALING: Increased touch zones for sliders
        const thumb = this.add.circle(0, sliderY, 20, 0xffffff);
        thumb.setStrokeStyle(4, 0x0066cc);
        const glow = this.add.circle(0, sliderY, 30, 0x00e1ff, 0.3);

        const hitArea = this.add.rectangle(sliderX + sliderW/2, sliderY, sliderW + 80, 70, 0, 0).setInteractive({useHandCursor: true});
        
        this.container.add([label, valText, hitArea, trackBg, fill, glow, thumb]);

        const updateVisuals = (xPos, isFinalSnap) => {
            let clampedX = Phaser.Math.Clamp(xPos, sliderX, sliderX + sliderW);
            let pct = (clampedX - sliderX) / sliderW;
            let exactVal = min + pct * (max - min);
            
            let nearestStep = min + Math.round((exactVal - min) / stepSize) * stepSize;
            
            let renderX = isFinalSnap ? (sliderX + ((nearestStep - min)/(max - min))*sliderW) : clampedX;
            
            thumb.x = renderX;
            glow.x = renderX;
            
            fill.clear();
            fill.fillStyle(0x00e1ff, 1);
            let fW = Math.max(sliderH, renderX - sliderX);
            fill.fillRoundedRect(sliderX, sliderY - sliderH/2, fW, sliderH, sliderH/2);

            valText.setText(formatFn(nearestStep));

            if (val !== nearestStep) {
                val = nearestStep;
                callback(val);
                if (!isFinalSnap) this.playSound('sfx_tick', 0.1); 
            }
        };

        updateVisuals(sliderX + ((val - min)/(max - min))*sliderW, true);

        let isDragging = false;

        hitArea.on('pointerdown', (pointer) => {
            isDragging = true;
            glow.setScale(1.3);
            updateVisuals(pointer.x, false);
        });

        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                updateVisuals(pointer.x, false);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (isDragging) {
                isDragging = false;
                glow.setScale(1);
                updateVisuals(pointer.x, true);
                this.playSound('sfx_tick', 0.2);
            }
        });

        return {
            setValue: (newVal) => { 
                val = newVal; 
                updateVisuals(sliderX + ((val - min)/(max - min))*sliderW, true);
            }
        };
    }

    createStepper(yOffset, labelText, min, max, currentVal, callback) {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        
        const label = this.add.text(cx - 240, cy + yOffset, labelText, { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0, 0.5);
        
        let val = currentVal;
        
        // UI SCALING
        const btnW = 70;
        const btnH = 50;

        const valText = this.add.text(cx + 120, cy + yOffset, val === 0 ? "ডিফল্ট" : (val > 0 ? "+" + val : val), { 
            fontSize: '26px', fontFamily: "'Anek Bangla'", color: '#00ffff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const minusBg = this.add.rectangle(cx + 40, cy + yOffset, btnW, btnH, 0x002244, 1).setStrokeStyle(2, 0x0066aa).setInteractive({useHandCursor: true});
        const minusTxt = this.add.text(cx + 40, cy + yOffset, "-", { fontSize: '36px', color: '#ffffff', fontStyle: 'bold'}).setOrigin(0.5, 0.55);
        
        const plusBg = this.add.rectangle(cx + 200, cy + yOffset, btnW, btnH, 0x002244, 1).setStrokeStyle(2, 0x0066aa).setInteractive({useHandCursor: true});
        const plusTxt = this.add.text(cx + 200, cy + yOffset, "+", { fontSize: '32px', color: '#ffffff', fontStyle: 'bold'}).setOrigin(0.5, 0.55);

        const updateDisplay = () => {
            valText.setText(val === 0 ? "ডিফল্ট" : (val > 0 ? "+" + val : val));
            callback(val);
        };

        minusBg.on('pointerdown', () => {
            if (val > min) { val--; this.playSound('sfx_tick'); updateDisplay(); }
            this.tweens.add({targets: minusBg, scale: 0.9, duration: 50, yoyo: true});
        });

        plusBg.on('pointerdown', () => {
            if (val < max) { val++; this.playSound('sfx_tick'); updateDisplay(); }
            this.tweens.add({targets: plusBg, scale: 0.9, duration: 50, yoyo: true});
        });

        this.container.add([label, minusBg, minusTxt, valText, plusBg, plusTxt]);

        return {
            setValue: (newVal) => { val = newVal; updateDisplay(); }
        };
    }

    updateLiveGameUI() {
        let menuMusic = this.sound.get('menubgm');
        if (menuMusic) menuMusic.setVolume(GameState.musicVolume);
        
        let bgMusic = this.sound.get('bg_music');
        if (bgMusic) bgMusic.setVolume(GameState.musicVolume);

        const qScene = this.scene.get('QuestionScene');
        if (qScene && (qScene.scene.isActive() || qScene.scene.isPaused())) {
            let uiScaleLevel = parseInt(localStorage.getItem('settings_uiScaleLevel'));
            if (isNaN(uiScaleLevel)) uiScaleLevel = 0;
            let uiScale = 1.0 + (uiScaleLevel * 0.05); 
            
            if (qScene.qContainer) {
                qScene.qContainer.setScale(uiScale);
                qScene.qContainer.setX(360 * (1 - uiScale));
                qScene.qContainer.setY(10 * (1 - uiScale));
            }

            let qpState = localStorage.getItem('settings_quickPanel') || 'right';
            qScene.quickPanelState = qpState;
            qScene.quickPanelEnabled = (qpState !== 'hidden');

            if (qScene.quickAnsContainer) {
                if (!qScene.quickPanelEnabled) {
                    qScene.quickAnsContainer.setVisible(false);
                } else {
                    qScene.quickAnsContainer.setVisible(true);
                    qScene.quickAnsContainer.setScale(uiScale);
                    if (qpState === 'left') {
                        qScene.quickAnsContainer.setX(15 * uiScale);
                    } else {
                        qScene.quickAnsContainer.setX(720 - (102 * uiScale));
                    }
                    qScene.quickAnsContainer.setY(760 - (460 * (uiScale - 1) / 2));
                }
            }
        }
    }

    playSound(key, baseVolume = 1.0) {
        if (this.cache.audio.exists(key)) {
            const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
            this.sound.play(key, { volume: finalVolume });
        }
    }

    showClearHistoryWarning() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const warningBox = this.add.container(0, 0).setDepth(2001);
        const overlay = this.add.rectangle(0, 0, 720, 1280, 0x000000, 0.9).setOrigin(0).setInteractive();
        
        const bg = this.add.graphics();
        bg.fillStyle(0x220000, 1);
        bg.fillRoundedRect(cx - 240, cy - 150, 480, 300, 15);
        bg.lineStyle(4, 0xff0000, 1);
        bg.strokeRoundedRect(cx - 240, cy - 150, 480, 300, 15);

        const alertTxt = this.add.text(cx, cy - 60, "সতর্কতা!\nআপনি কি নিশ্চিত যে সমস্ত\nপ্রশ্নের হিস্ট্রি মুছে ফেলতে চান?", { 
            fontSize: '28px', fontFamily: "'Anek Bangla'", color: '#ffffff', align: 'center', lineSpacing: 10 
        }).setOrigin(0.5);

        const yesBg = this.add.rectangle(cx - 100, cy + 80, 160, 55, 0x880000).setStrokeStyle(2, 0xff4444);
        const yesTxt = this.add.text(cx - 100, cy + 80, "হ্যাঁ", { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const yesHit = this.add.rectangle(cx - 100, cy + 80, 160, 55).setInteractive({ useHandCursor: true });

        yesHit.on('pointerdown', () => {
            this.playSound('sfx_explode');
            localStorage.removeItem('seenQuestions');
            GameState.matchHistory = []; 
            if (window.saveGame) window.saveGame();

            warningBox.destroy();
            const toast = this.add.text(cx, cy + 200, "হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে!", { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#00ff00', backgroundColor: '#003300', padding: {x: 15, y: 10} }).setOrigin(0.5);
            this.tweens.add({ targets: toast, alpha: 0, delay: 1500, duration: 500, onComplete: () => toast.destroy() });
        });

        const noBg = this.add.rectangle(cx + 100, cy + 80, 160, 55, 0x004400).setStrokeStyle(2, 0x00ff00);
        const noTxt = this.add.text(cx + 100, cy + 80, "না", { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const noHit = this.add.rectangle(cx + 100, cy + 80, 160, 55).setInteractive({ useHandCursor: true });

        noHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            warningBox.destroy();
        });

        warningBox.add([overlay, bg, alertTxt, yesBg, yesTxt, yesHit, noBg, noTxt, noHit]);
    }
}