class SettingsScene extends Phaser.Scene {
    constructor() {
        super("SettingsScene");
    }

    init(data) {
        // Track which scene opened the settings so we can return to it
        this.returnScene = (data && data.returnScene) ? data.returnScene : "MenuScene";
    }

    create() {
        // FIX: Force Settings to the very front so it is never hidden behind PauseScene
        this.scene.bringToTop();

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // Ensure the container is created first so elements can be parented to it
        this.container = this.add.container(0, 0);

        this.overlay = this.add.rectangle(0, 0, 720, 1280, 0x000000, 0.85).setOrigin(0).setInteractive();
        
        this.bg = this.add.graphics();
        this.bg.fillStyle(0x000c22, 0.95);
        this.bg.fillRoundedRect(cx - 290, cy - 350, 580, 700, 20);
        this.bg.lineStyle(4, 0x0066aa, 1);
        this.bg.strokeRoundedRect(cx - 290, cy - 350, 580, 700, 20);

        this.title = this.add.text(cx, cy - 290, "সেটিংস (Settings)", { 
            fontSize: '44px', fontFamily: "'Anek Bangla'", color: '#00e1ff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const closeHit = this.add.circle(cx + 230, cy - 290, 35).setInteractive({ useHandCursor: true });
        const closeIcon = this.add.text(cx + 230, cy - 290, "✖", { fontSize: '35px', color: '#ff4444' }).setOrigin(0.5);
        
        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            this.scene.stop();
            // Only resume if the underlying scene was actually paused
            if (this.scene.isPaused(this.returnScene)) {
                this.scene.resume(this.returnScene);
            }
        });

        this.container.add([this.overlay, this.bg, this.title, closeIcon, closeHit]);

        // Add visual adjusters
        let musicVol = Math.round((GameState.musicVolume !== undefined ? GameState.musicVolume : 0.5) * 10);
        if (musicVol < 0) musicVol = 0; 
        this.musicAdj = this.createAdjuster(-170, "মিউজিক (Music):", 0, 10, musicVol, (val) => {
            GameState.musicVolume = val / 10;
            localStorage.setItem('settings_musicVol', GameState.musicVolume);
            this.updateLiveGameUI();
        });

        let sfxVol = Math.round((GameState.sfxVolume !== undefined ? GameState.sfxVolume : 1.0) * 10);
        if (sfxVol < 0) sfxVol = 0;
        this.sfxAdj = this.createAdjuster(-90, "সাউন্ড (SFX):", 0, 10, sfxVol, (val) => {
            GameState.sfxVolume = val / 10;
            localStorage.setItem('settings_sfxVol', GameState.sfxVolume);
        });
        
        let uiSize = parseInt(localStorage.getItem('settings_uiScaleLevel'));
        if (isNaN(uiSize)) uiSize = 0;
        this.uiAdj = this.createAdjuster(-10, "ইউআই সাইজ (UI Size):", -5, 5, uiSize, (val) => {
            localStorage.setItem('settings_uiScaleLevel', val);
            this.updateLiveGameUI();
        });

        // Quick Panel Toggle
        this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';
        const qpLabel = this.add.text(cx - 240, cy + 70, "কুইক প্যানেল\n(Quick Panel):", { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0, 0.5);
        const qpOptions = ['right', 'left', 'hidden'];
        const qpLabels = { 'right': 'Right (ডান)', 'left': 'Left (বাম)', 'hidden': 'Disable (বন্ধ)' };
        
        const qpBtnBg = this.add.graphics();
        qpBtnBg.fillStyle(0x002255, 1);
        qpBtnBg.fillRoundedRect(cx + 10, cy + 45, 220, 50, 10);
        qpBtnBg.lineStyle(2, 0x00aaff);
        qpBtnBg.strokeRoundedRect(cx + 10, cy + 45, 220, 50, 10);

        const qpBtnTxt = this.add.text(cx + 120, cy + 70, qpLabels[this.quickPanelState], { 
            fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#00ffff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const qpHit = this.add.rectangle(cx + 120, cy + 70, 220, 50).setInteractive({ useHandCursor: true });
        qpHit.on('pointerdown', () => {
            this.playSound('sfx_click');
            let idx = qpOptions.indexOf(this.quickPanelState);
            idx = (idx + 1) % qpOptions.length;
            this.quickPanelState = qpOptions[idx];
            localStorage.setItem('settings_quickPanel', this.quickPanelState);
            qpBtnTxt.setText(qpLabels[this.quickPanelState]);
            this.updateLiveGameUI();
        });

        // Reset Settings
        const resetBtnBg = this.add.graphics();
        resetBtnBg.fillStyle(0x004422, 1);
        resetBtnBg.fillRoundedRect(cx - 200, cy + 150, 400, 55, 15);
        resetBtnBg.lineStyle(3, 0x00ff88);
        resetBtnBg.strokeRoundedRect(cx - 200, cy + 150, 400, 55, 15);

        const resetBtnTxt = this.add.text(cx, cy + 177, "ডিফল্ট সেট করুন (Reset Defaults)", { 
            fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#aaffaa', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const resetHit = this.add.rectangle(cx, cy + 177, 400, 55).setInteractive({ useHandCursor: true });
        resetHit.on('pointerdown', () => {
            this.playSound('sfx_powerup');
            this.musicAdj.setValue(5);
            this.sfxAdj.setValue(10);
            this.uiAdj.setValue(0);
            
            this.quickPanelState = 'right';
            localStorage.setItem('settings_quickPanel', 'right');
            qpBtnTxt.setText(qpLabels[this.quickPanelState]);

            this.updateLiveGameUI();
        });

        // Clear History
        const clearBtnBg = this.add.graphics();
        clearBtnBg.fillStyle(0x550000, 1);
        clearBtnBg.fillRoundedRect(cx - 200, cy + 230, 400, 55, 15);
        clearBtnBg.lineStyle(3, 0xff4444);
        clearBtnBg.strokeRoundedRect(cx - 200, cy + 230, 400, 55, 15);

        const clearBtnTxt = this.add.text(cx, cy + 257, "হিস্ট্রি মুছুন (Clear History)", { 
            fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffaaaa', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const clearHit = this.add.rectangle(cx, cy + 257, 400, 55).setInteractive({ useHandCursor: true });
        clearHit.on('pointerdown', () => {
            this.playSound('sfx_warning');
            this.showClearHistoryWarning();
        });
        
        this.container.add([
            qpLabel, qpBtnBg, qpBtnTxt, qpHit,
            resetBtnBg, resetBtnTxt, resetHit,
            clearBtnBg, clearBtnTxt, clearHit
        ]);

        this.container.setAlpha(0);
        this.tweens.add({ targets: this.container, alpha: 1, duration: 200 });
    }

    createAdjuster(y, labelText, min, max, currentVal, callback) {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        
        const label = this.add.text(cx - 240, cy + y, labelText, { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0, 0.5);
        
        let val = currentVal;
        const valText = this.add.text(cx + 120, cy + y, val > 0 && min < 0 ? "+" + val : val, { fontSize: '32px', fontFamily: "'Anek Bangla'", color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);
        
        const drawBtn = (xPos, txt) => {
            const bg = this.add.rectangle(xPos, cy + y, 50, 50, 0x002255).setStrokeStyle(3, 0x00aaff).setInteractive({useHandCursor: true});
            const t = this.add.text(xPos, cy + y - 2, txt, {fontSize: '36px', color: '#ffffff', fontStyle: 'bold'}).setOrigin(0.5);
            this.container.add([bg, t]);
            return bg;
        };

        const btnMinusBg = drawBtn(cx + 40, "-");
        const btnPlusBg = drawBtn(cx + 200, "+");
        
        this.container.add([label, valText]);
        
        const updateVisual = () => {
            valText.setText(val > 0 && min < 0 ? "+" + val : val);
            callback(val);
        };
        
        btnMinusBg.on('pointerdown', () => {
            this.playSound('sfx_tick', 0.5);
            this.tweens.add({ targets: btnMinusBg, scale: 0.9, duration: 50, yoyo: true });
            if (val > min) { val--; updateVisual(); }
        });
        btnPlusBg.on('pointerdown', () => {
            this.playSound('sfx_tick', 0.5);
            this.tweens.add({ targets: btnPlusBg, scale: 0.9, duration: 50, yoyo: true });
            if (val < max) { val++; updateVisual(); }
        });
        
        return {
            setValue: (newVal) => { val = newVal; updateVisual(); }
        };
    }

    updateLiveGameUI() {
        // Sync music
        let menuMusic = this.sound.get('menubgm');
        if (menuMusic) menuMusic.setVolume(GameState.musicVolume);
        
        let bgMusic = this.sound.get('bg_music');
        if (bgMusic) bgMusic.setVolume(GameState.musicVolume);

        // Sync visual UI elements natively while the game is paused in the background
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
        const yesTxt = this.add.text(cx - 100, cy + 80, "হ্যাঁ (Yes)", { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
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
        const noTxt = this.add.text(cx + 100, cy + 80, "না (No)", { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const noHit = this.add.rectangle(cx + 100, cy + 80, 160, 55).setInteractive({ useHandCursor: true });

        noHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            warningBox.destroy();
        });

        warningBox.add([overlay, bg, alertTxt, yesBg, yesTxt, yesHit, noBg, noTxt, noHit]);
    }
}