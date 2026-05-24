class QuestionScene extends Phaser.Scene {
    constructor() {
        super("QuestionScene");
    }

    init() {
        this.isProcessing = false;
        this.wasReady = false;
        this.lastBattery = -1;
        
        this.currentGlowAlpha = 0;
        this.showerGlowAlpha = 0;
    }

    create() {
        const h = this.cameras.main.height;
        const w = 720; 

        if (GameState.currentQuestions && GameState.currentQuestions.length > 0) {
            this.questions = GameState.currentQuestions;
        } else {
            this.questions = this.cache.json.get('questions_data') || [];
        }
        this.qIdx = 0;

        // --- METEOR SHOWER VIGNETTE (Visual Warning) ---
        this.meteorVignette = this.add.graphics().setDepth(-10);

        // --- 1. MAIN UI CONTAINER ---
        this.qContainer = this.add.container(0, 0);

        // --- 2. GLASS PANEL SETUP ---
        const boxX = 20;
        const boxY = 20;
        const boxW = 680;
        const boxH = 415; 

        this.qPanel = this.add.graphics();
        this.drawGlassPanel(this.qPanel, boxX, boxY, boxW, boxH);
        this.qContainer.add(this.qPanel);

        // --- 3. THE "POWER ROW" HEADER ---
        const headerY = boxY + 45; 
        const edgePadding = 45;    

        const leftAnchor = boxX + edgePadding;
        
        this.keyIcon = this.add.image(leftAnchor, headerY, "ui_key")
            .setScale(0.70).setOrigin(0.7, 0.5); 
        this.keyText = this.add.text(leftAnchor + 15, headerY, GameState.keys || "0", {
            fontSize: "26px", fontFamily: "Arial", color: "#ffd700", stroke: "#000000", strokeThickness: 4
        }).setOrigin(0, 0.5);

        const debrisX = leftAnchor + 75;
        this.debrisIcon = this.add.image(debrisX, headerY, "ui_debris_icon")
            .setScale(0.95).setOrigin(0.38, 0.41);
        this.debrisText = this.add.text(debrisX + 25, headerY, GameState.debris || "0", {
            fontSize: "26px", fontFamily: "Arial", color: "#aaccff", stroke: "#000000", strokeThickness: 4
        }).setOrigin(0, 0.5);

        const isValidSubject = (GameState.currentSubject === "all" || GameState.currentSubject === "all_no_math");
        const canEarnRewards = (GameState.gameMode !== "revision" && isValidSubject);

        if (!canEarnRewards) {
            this.keyIcon.setAlpha(0.25).setTint(0x888888);
            this.keyText.setAlpha(0.25);
            this.debrisIcon.setAlpha(0.25).setTint(0x888888);
            this.debrisText.setAlpha(0.25);
            
            const kLine = this.add.line(0, 0, this.keyIcon.x - 12, this.keyIcon.y - 12, this.keyIcon.x + 12, this.keyIcon.y + 12, 0xff0000).setOrigin(0).setLineWidth(3);
            const dLine = this.add.line(0, 0, this.debrisIcon.x - 12, this.debrisIcon.y - 12, this.debrisIcon.x + 12, this.debrisIcon.y + 12, 0xff0000).setOrigin(0).setLineWidth(3);
            this.qContainer.add([kLine, dLine]);
        }
        
        this.heartsContainer = this.add.container(0, 0);
        this.qContainer.add([this.keyIcon, this.keyText, this.debrisIcon, this.debrisText, this.heartsContainer]);

        const rightAnchor = (boxX + boxW - edgePadding) - 2;

        const pauseBtn = this.add.image(rightAnchor + 2, headerY, "ui_pause")
            .setInteractive({ useHandCursor: true })
            .setScale(1.3) 
            .setAlpha(0.7)
            .setOrigin(0.5, 0.5);

        pauseBtn.on("pointerdown", () => {
            const gameScene = this.scene.get("GameScene");
            if (gameScene && gameScene.isResuming) return;

            this.playSFX('sfx_click', 0.6, false); 
            this.scene.pause("GameScene");
            this.scene.pause("QuestionScene");
            this.scene.launch("PauseScene");
        });

        this.skipBtn = this.add.text(rightAnchor - 50, headerY, `Skip (${GameState.skipsLeft})`, {
            fontSize: "26px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#ffffff", fontStyle: 'bold',
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            padding: { x: 14, y: 8 }, stroke: '#000000', strokeThickness: 3
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setAlpha(0.8);

        this.skipBtn.on("pointerdown", () => { 
            const gameScene = this.scene.get("GameScene");
            if (gameScene && gameScene.isResuming) return;

            this.trySkipQuestion(); 
        });
        
        this.qContainer.add([pauseBtn, this.skipBtn]);

        // --- 4. QUESTION TEXT SECTION ---
        const questionAreaY = boxY + 140; 
        this.qText = this.add.text(boxX + (boxW / 2), questionAreaY, "", {
            fontSize: "34px", 
            fontFamily: "'Anek Bangla', sans-serif",
            fontWeight: 800,
            color: "#ffffff",
            align: "center",
            wordWrap: { width: boxW - 50 },
            padding: { x: 10, y: 100 },
            lineSpacing: 5,
            stroke: "#000000",
            strokeThickness: 2
        }).setOrigin(0.5);
        this.qText.originalY = questionAreaY;

        const tagY = boxY + 180; 
        const rightEdge = boxX + boxW - 15; 

        this.qBankTag = this.add.text(rightEdge, tagY, "", {
            fontSize: "20px", 
            fontFamily: "'Anek Bangla', sans-serif",
            fontWeight: 700,
            color: "#dbdbdb",
            backgroundColor: "rgba(66, 66, 66, 0.12)",
            padding: { x: 12, y: 6 },
        }).setOrigin(1, 0.5); 
        this.qBankTag.originalY = tagY;

        this.qContainer.add([this.qText, this.qBankTag]);

        // --- 5. OPTION BUTTONS ---
        this.optionBtns = [];
        const btnW = 315; 
        const btnH = 85;  
        const gap = 20;   
        const startY = boxY + 250; 
        
        for (let i = 0; i < 4; i++) {
            let col = i % 2;
            let row = Math.floor(i / 2);
            
            let x = (col === 0) ? 190 : 530;
            let y = startY + (row * (btnH + gap));

            let container = this.add.container(x, y);

            let bg = this.add.rectangle(0, 0, btnW, btnH, 0x000510, 0.4);
            bg.setStrokeStyle(3, 0xffffff, 0.15); 
            bg.setInteractive({ useHandCursor: true });

            let txt = this.add.text(0, 0, "", {
                fontSize: "30px", 
                fontFamily: "'Anek Bangla'",
                fontWeight: 800,
                color: "#aaddff",
                padding: { x: 10, y: 30 },
                lineSpacing: 2,
                align: "center",
                wordWrap: { width: btnW - 20 }
            }).setOrigin(0.5);

            container.add([bg, txt]);
            this.qContainer.add(container);

            bg.on("pointerdown", () => {
                const gameScene = this.scene.get("GameScene");
                if (gameScene && gameScene.isResuming) return;
                if (this.isProcessing) return;

                if (GameState.battery >= 100) {
                    container.y = y + 5; 
                    this.handleAnswer(i);
                } else {
                    this.playSFX('sfx_q_low_battery', 0.5);
                    this.showBatteryWarning();
                    
                    if (!this.tweens.isTweening(container)) {
                        this.tweens.add({
                            targets: container,
                            x: x + 6,
                            duration: 50,
                            yoyo: true,
                            repeat: 2,
                            onComplete: () => { container.x = x; }
                        });
                    }
                }
            });
            bg.on("pointerup", () => { if (container.y !== y) container.y = y; });
            bg.on("pointerout", () => { if (container.y !== y) container.y = y; });

            this.optionBtns.push({ container, bg, txt, originalY: y, pulseTween: null });
        }

        // --- 6. QUICK ANSWER PANEL ---
        this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';
        this.quickPanelEnabled = (this.quickPanelState !== 'hidden');
        
        this.quickAnsContainer = this.add.container(0, 760); 
        this.quickAnsContainer.setAlpha(0); 
        this.quickBtns = [];

        if (this.quickPanelEnabled) {
            const qaBg = this.add.graphics();
            this.drawGlassPanel(qaBg, -12, -10, 120, 460);
            this.quickAnsContainer.add(qaBg);

            const qaLabels = ["ক", "খ", "গ", "ঘ"];

            for (let i = 0; i < 4; i++) {
                let btnY = 55 + (i * 110);
                
                let btnBg = this.add.rectangle(45, btnY, 80, 80, 0x000510, 0.4);
                btnBg.setStrokeStyle(3, 0xffffff, 0.15); 
                btnBg.setInteractive({ useHandCursor: true });

                let btnTxt = this.add.text(45, btnY, qaLabels[i], {
                    fontSize: "42px", 
                    fontFamily: "'Anek Bangla'",
                    fontWeight: 800,
                    color: "#aaddff"
                }).setOrigin(0.5);

                this.quickAnsContainer.add([btnBg, btnTxt]);

                btnBg.on("pointerdown", () => {
                    const gameScene = this.scene.get("GameScene");
                    if (gameScene && gameScene.isResuming) return;
                    if (this.isProcessing) return;
                    
                    if (GameState.battery >= 100) {
                        btnBg.y = btnY + 4;
                        btnTxt.y = btnY + 4;
                        this.handleAnswer(i);
                    } else {
                        this.playSFX('sfx_q_low_battery', 0.5);
                        this.showBatteryWarning();
                    }
                });
                btnBg.on("pointerup", () => { btnBg.y = btnY; btnTxt.y = btnY; });
                btnBg.on("pointerout", () => { btnBg.y = btnY; btnTxt.y = btnY; });

                this.quickBtns.push({ bg: btnBg, txt: btnTxt, originalY: btnY });
            }

            const qSkipY = -50; 
            const qSkipBg = this.add.rectangle(45, qSkipY, 112, 60, 0x000510, 0.3);
            qSkipBg.setStrokeStyle(3, 0xffffff, 0.2);
            qSkipBg.setInteractive({ useHandCursor: true });
            
            this.quickSkipTxt = this.add.text(45, qSkipY, `Skip(${GameState.skipsLeft})`, {
                fontSize: "22px", 
                fontFamily: "'Anek Bangla'",
                fontWeight: 800,
                color: "#d8d8d8",
                lineSpacing: 2,
                align: "center"
            }).setOrigin(0.5);
            
            this.quickAnsContainer.add([qSkipBg, this.quickSkipTxt]);

            qSkipBg.on("pointerdown", () => {
                if (this.quickAnsContainer.alpha < 0.5) return; 
                
                const gameScene = this.scene.get("GameScene");
                if (gameScene && gameScene.isResuming) return;
                if (this.isProcessing) return;
                
                qSkipBg.y = qSkipY + 4;
                this.quickSkipTxt.y = qSkipY + 4;
                
                this.trySkipQuestion();
            });
            
            qSkipBg.on("pointerup", () => { qSkipBg.y = qSkipY; this.quickSkipTxt.y = qSkipY; });
            qSkipBg.on("pointerout", () => { qSkipBg.y = qSkipY; this.quickSkipTxt.y = qSkipY; });
            
            this.quickSkipBtn = { bg: qSkipBg, txt: this.quickSkipTxt, originalY: qSkipY };
        }

        // --- 7. INSTRUCTION TEXT ---
        this.instructionText = this.add.text(boxX + (boxW / 2), boxY + boxH + 27, "উত্তর দিতে হলে আগে শত্রু মেরে ব্যাটারী সংগ্রহ করুন", {
            fontSize: "28px", 
            fontFamily: "'Anek Bangla'",
            color: "#ffff00", 
            stroke: "#000000",
            strokeThickness: 1
        }).setOrigin(0.5).setAlpha(0);

        this.readyText = this.add.text(boxX + (boxW / 2), boxY + boxH + 27, "Ready! উত্তর দিন!", {
            fontSize: "31px", 
            fontFamily: "'Anek Bangla'",
            fontWeight: 'bold',
            color: "#00ff00", 
            stroke: "#000000",
            strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0);

        this.qContainer.add([this.instructionText, this.readyText]);
        
        let uiScaleLevel = parseInt(localStorage.getItem('settings_uiScaleLevel'));
        if (isNaN(uiScaleLevel)) uiScaleLevel = 0;
        
        let uiScale = 1.0 + (uiScaleLevel * 0.05); 
        
        this.qContainer.setScale(uiScale);
        this.qContainer.setX(360 * (1 - uiScale));
        this.qContainer.setY(10 * (1 - uiScale)); 
        
        if (this.quickPanelEnabled) {
            this.quickAnsContainer.setScale(uiScale);
            if (this.quickPanelState === 'left') {
                this.quickAnsContainer.setX(15 * uiScale);
            } else {
                this.quickAnsContainer.setX(720 - (102 * uiScale));
            }
            this.quickAnsContainer.setY(760 - (460 * (uiScale - 1) / 2));
        }

        // --- 8. BOTTOM HUD ---
        const uiY = h - 80;
        
        const botBar = this.add.graphics();
        botBar.fillGradientStyle(0x000000, 0x000000, 0x000510, 0x000510, 0, 0, 0.9, 0.9);
        botBar.fillRect(0, h - 120, w, 120);

        this.boltIcon = this.add.image(60, uiY, "ui_bolt").setScale(1.1).setTint(0x00ffcc);
        
        this.batteryBg = this.add.rectangle(230, uiY, 260, 30, 0x000000, 0.4).setStrokeStyle(3, 0x555555, 0.6);
        this.batteryFill = this.add.graphics();

        this.correctLabel = this.add.text(w - 30, uiY, "", {
            fontSize: "28px",
            fontFamily: "'Anek Bangla', sans-serif",
            fontWeight: 700,
            color: "#ffd700",
            stroke: "#000000",
            strokeThickness: 1
        }).setOrigin(1, 0.5);

        this.refreshQuestion();
        this.updateBatteryVisuals();
        this.setButtonsState(false);

        this.showBatteryWarning = () => {
            if (this.warningTween) this.warningTween.stop();
            if (this.warningTimer) this.warningTimer.remove();

            this.instructionText.setAlpha(1);
            
            this.warningTween = this.tweens.add({
                targets: this.instructionText,
                alpha: 0.7,
                duration: 600,
                yoyo: true,
                repeat: -1
            });

            this.warningTimer = this.time.delayedCall(5000, () => {
                if (this.warningTween) this.warningTween.stop();
                this.tweens.add({ targets: this.instructionText, alpha: 0, duration: 500 });
            });
        };

        this.showBatteryWarning();
    }

    playSFX(key, baseVolume = 0.5, allowJitter = true) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        
        const globalSfxVol = (window.GameState && window.GameState.sfxVolume !== undefined) ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);
        
        if (finalVolume <= 0) return;
        
        let config = { volume: finalVolume };
        
        if (allowJitter) {
            config.detune = Phaser.Math.Between(-650, 650);
        }
        
        this.sound.play(key, config);
    }

    drawGlassPanel(graphics, x, y, w, h) {
        graphics.clear();
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(x, y, w, h, 16);
        graphics.lineStyle(3, 0xffffff, 0.15); 
        graphics.strokeRoundedRect(x, y, w, h, 16);
    }

    refreshHearts() {
        this.heartsContainer.removeAll(true);
        const yPos = 65; 
        const heartSpacing = 40; 
        
        const currentLives = Math.max(0, GameState.lives);
        const totalWidth = Math.max(0, currentLives - 1) * heartSpacing;
        const boxCenter = 360; 
        const startX = boxCenter - (totalWidth / 2);

        for (let i = 0; i < currentLives; i++) {
            const heart = this.add.image(startX + (i * heartSpacing), yPos, "ui_heart").setScale(0.95); 
            this.heartsContainer.add(heart);
            
            this.tweens.add({
                targets: heart,
                scale: 1.05,
                duration: 800 + (i * 100),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    update() {
        if (this.heartsContainer && this.heartsContainer.list.length !== GameState.lives) {
            this.refreshHearts();
        }

        let targetAlpha = 0;
        if (this.meteorTimer && !GameState.bossActive && GameState.battery >= 100) {
            const p = this.meteorTimer.getProgress();
            if (p > 0.05) {
                targetAlpha = 0.7 * p;
            }
        }

        targetAlpha = Math.max(targetAlpha, this.showerGlowAlpha || 0);
        if (this.currentGlowAlpha === undefined) this.currentGlowAlpha = 0;

        if (targetAlpha > this.currentGlowAlpha) {
            this.currentGlowAlpha += 0.01; 
            if (this.currentGlowAlpha > targetAlpha) this.currentGlowAlpha = targetAlpha;
        } else {
            this.currentGlowAlpha -= 0.005; 
            if (this.currentGlowAlpha < targetAlpha) this.currentGlowAlpha = targetAlpha;
        }

        this.meteorVignette.clear();
        if (this.currentGlowAlpha > 0.01) {
            const h = this.cameras.main.height;
            const glowHeight = 700;
            const yPos = h - glowHeight;

            this.meteorVignette.fillGradientStyle(
                0xff0000, 0xff0000, 0x990000, 0x990000, 
                0, 0, this.currentGlowAlpha, this.currentGlowAlpha 
            );
            this.meteorVignette.fillRect(0, yPos, 720, glowHeight);
        }
        
        this.keyText.setText(GameState.keys || 0);
        this.debrisText.setText(GameState.debris || 0);
        
        this.skipBtn.setText(`Skip (${GameState.skipsLeft})`);
        if (this.quickSkipTxt) {
            this.quickSkipTxt.setText(`Skip\n(${GameState.skipsLeft})`);
        }

        if (GameState.battery !== this.lastBattery) {
            this.updateBatteryVisuals();
            this.lastBattery = GameState.battery;
        }

        const safeStage = (GameState.bossStage || 0) + 1;
        const stageText = safeStage >= 4 ? "Void" : safeStage;
        const safeCount = GameState.correctCount || 0;
        const safeTotal = GameState.totalCorrectNeeded || 10;

        this.correctLabel.setText(`লেভেল: ${stageText}  |  সঠিক: ${safeCount}/${safeTotal}`);
        
        const isNowReady = GameState.battery >= 100;
        
        if (isNowReady !== this.wasReady && !this.isProcessing) {
            if (isNowReady && !GameState.bossActive) {
                this.playSFX('sfx_q_ready', 0.6, false); 
            }
            
            this.setButtonsState(isNowReady);
            this.updateReadyState(isNowReady);
            this.manageMeteorTimer(isNowReady);
            this.wasReady = isNowReady;
        }
    }

    triggerMeteorShowerGlow() {
        this.showerGlowAlpha = 1.0;
        this.cameras.main.flash(300, 255, 50, 0, 0.2);
        if (this.showerGlowTween) this.showerGlowTween.stop();
        this.showerGlowTween = this.tweens.add({
            targets: this,
            showerGlowAlpha: 0,
            duration: 6000,
            ease: 'Sine.easeOut'
        });
    }

    manageMeteorTimer(isReady) {
        if (isReady && !GameState.bossActive) {
            if (!this.meteorTimer) {
                this.meteorTimer = this.time.addEvent({
                    delay: 45000,
                    callback: () => {
                        const gameScene = this.scene.get('GameScene');
                        if (gameScene && !GameState.bossActive) gameScene.spawnMeteors();
                        this.triggerMeteorShowerGlow();
                    },
                    loop: true 
                });
            }
        } else {
            if (this.meteorTimer) {
                this.meteorTimer.remove();
                this.meteorTimer = null;
            }
        }
    }

    updateBatteryVisuals() {
        this.batteryFill.clear();
        const pct = Math.min(GameState.battery / 100, 1);
        
        let color = 0xff0000; 
        if (pct >= 1) color = 0x00ffff; 
        else if (pct > 0.7) color = 0x00ff00; 
        else if (pct > 0.3) color = 0xffff00; 

        const barTotalWidth = 252;  
        const startX = 104;         
        const startY = this.cameras.main.height - 90; 
        const totalSegments = 10;
        const gap = 4;             
        const segmentWidth = (barTotalWidth - ((totalSegments - 1) * gap)) / totalSegments;
        const activeSegments = Math.ceil(pct * totalSegments);

        for (let i = 0; i < totalSegments; i++) {
            const segX = startX + (i * (segmentWidth + gap));
            this.batteryFill.fillStyle(i < activeSegments ? color : 0x222222, 0.9);
            this.batteryFill.fillRoundedRect(segX, startY, segmentWidth, 20, 3); 
        }
    }

    updateReadyState(isReady) {
        if (isReady && !GameState.bossActive) {
            this.instructionText.setAlpha(0);
            if (this.warningTween) this.warningTween.stop();

            this.readyText.setAlpha(1);
            
            if (!this.readyTween || !this.readyTween.isPlaying()) {
                this.readyTween = this.tweens.add({
                    targets: this.readyText,
                    alpha: 0.4,
                    scale: 1.05, 
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
            }
        } else {
            this.readyText.setAlpha(0);
            this.tweens.killTweensOf(this.readyText);
            if (this.readyTween) {
                this.readyTween.stop();
                this.readyTween = null;
            }
            this.readyText.setScale(1); 
        }
    }

    setButtonsState(isReady) {
        this.optionBtns.forEach(btn => {
            if (btn.pulseTween) {
                btn.pulseTween.stop();
                btn.pulseTween = null;
            }
            btn.container.setScale(1);

            if (isReady && !GameState.bossActive) {
                btn.bg.setFillStyle(0x626262, 0.2);
                btn.bg.setStrokeStyle(3, 0xffffff, 0.5);
                btn.bg.setInteractive(); 
                btn.txt.setColor("#ffffff");

                btn.pulseTween = this.tweens.add({
                    targets: btn.container,
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                btn.bg.setFillStyle(0x000000, 0.07);
                btn.bg.setStrokeStyle(3, 0xffffff, 0.05);
                btn.txt.setColor("#d3d3d3");
                
                if (GameState.bossActive) {
                    btn.bg.disableInteractive();
                } else {
                    btn.bg.setInteractive();
                }
            }
        });

        if (isReady && !GameState.bossActive) {
            this.tweens.add({ targets: this.quickAnsContainer, alpha: 1, duration: 400 });
            this.quickBtns.forEach(btn => {
                btn.bg.setInteractive();
                btn.bg.setFillStyle(0x626262, 0.2);
                btn.bg.setStrokeStyle(3, 0xffffff, 0.5);
                btn.txt.setColor("#ffffff");
            });
            if (this.quickSkipBtn) this.quickSkipBtn.bg.setInteractive();
        } else {
            this.tweens.add({ targets: this.quickAnsContainer, alpha: 0, duration: 200 });
            this.quickBtns.forEach(btn => {
                if (GameState.bossActive) {
                    btn.bg.disableInteractive();
                } else {
                    btn.bg.setInteractive();
                }
                
                btn.bg.setFillStyle(0x000000, 0.07);
                btn.bg.setStrokeStyle(3, 0xffffff, 0.05);
                btn.txt.setColor("#d3d3d3");
            });
            if (this.quickSkipBtn) {
                if (GameState.bossActive) {
                    this.quickSkipBtn.bg.disableInteractive();
                } else {
                    this.quickSkipBtn.bg.setInteractive();
                }
            }
        }
    }

    refreshQuestion() {
        if (!this.questions || this.questions.length === 0) return;

        const q = this.questions[this.qIdx % this.questions.length];
        const elements = [this.qText, this.qBankTag, ...this.optionBtns.map(b => b.container)];
        const bankName = q.bank || q.category || "Unknown"; 
        
        const cleanStr = (str) => typeof str === 'string' ? str.replace(/।/g, '') : str;
        const cleanQuestion = cleanStr(q.question);

        this.optionBtns.forEach((btn, i) => {
            btn.container.setAlpha(1);
            btn.container.setScale(1);
        });
        if (this.quickBtns) {
            this.quickBtns.forEach(btn => {
                btn.bg.setAlpha(1);
                btn.txt.setAlpha(1);
            });
        }

        if (this.qText.text === "") {
            if (cleanQuestion.length > 80) {
                this.qText.setFontSize("26px");
            } else {
                this.qText.setFontSize("34px");
            }

            this.qText.setText(cleanQuestion);
            this.qBankTag.setText(bankName); 
            
            this.optionBtns.forEach((btn, i) => {
                const cleanOpt = cleanStr(q.options[i]);
                if (cleanOpt.length > 40) {
                    btn.txt.setFontSize("22px");
                } else {
                    btn.txt.setFontSize("30px");
                }
                btn.txt.setText(cleanOpt);
            });

            this.markQuestionAsSeen(q.question);
            this.tweens.add({ targets: elements, alpha: { from: 0, to: 1 }, duration: 400 });

            const isReady = (GameState.battery >= 100);
            this.setButtonsState(isReady);
            this.updateReadyState(isReady);
            this.manageMeteorTimer(isReady);
            this.wasReady = isReady;

            return;
        }

        this.isProcessing = true;

        this.tweens.add({
            targets: elements,
            alpha: 0,
            y: "-=20",
            duration: 180,
            ease: 'Power2.easeIn',
            onComplete: () => {
                if (cleanQuestion.length > 80) {
                    this.qText.setFontSize("26px");
                } else {
                    this.qText.setFontSize("34px");
                }

                this.qText.setText(cleanQuestion);
                this.qText.y = this.qText.originalY + 20; 
                this.markQuestionAsSeen(q.question);
                
                this.qBankTag.setText(bankName);
                this.qBankTag.y = this.qBankTag.originalY + 20;
                
                this.optionBtns.forEach((btn, i) => {
                    const cleanOpt = cleanStr(q.options[i]);
                    if (cleanOpt.length > 40) {
                        btn.txt.setFontSize("22px");
                    } else {
                        btn.txt.setFontSize("30px");
                    }

                    btn.txt.setText(cleanOpt);
                    btn.container.y = btn.originalY + 20; 
                    
                    btn.bg.setFillStyle(0x000000, 0.07); 
                    btn.bg.setStrokeStyle(3, 0xffffff, 0.05);
                    btn.txt.setColor("#d3d3d3");
                });

                this.quickAnsContainer.setAlpha(0);
                this.quickBtns.forEach((btn) => {
                    btn.bg.setFillStyle(0x000000, 0.07); 
                    btn.bg.setStrokeStyle(3, 0xffffff, 0.05);
                    btn.txt.setColor("#d3d3d3");
                });

                const gameScene = this.scene.get('GameScene');
                if (GameState.bossActive || (gameScene && gameScene.isTransitioningToBoss)) {
                    this.isProcessing = false; 
                    elements.forEach(el => el.setAlpha(0)); 
                    this.quickAnsContainer.setAlpha(0);
                    return; 
                }

                this.tweens.add({
                    targets: elements,
                    alpha: 1,
                    y: "-=20",
                    duration: 350,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        this.isProcessing = false;
                        this.playSFX('sfx_tick', 0.2);
                        
                        const isReady = (GameState.battery >= 100);
                        this.setButtonsState(isReady);
                        this.updateReadyState(isReady);
                        this.manageMeteorTimer(isReady);
                        this.wasReady = isReady;

                        if (isReady && !GameState.bossActive) {
                            this.playSFX('sfx_q_ready', 0.6, false);
                        }
                    }
                });
                
                this.time.delayedCall(400, () => {
                    this.isProcessing = false;
                });
            }
        });

        if (GameState.hasFiftyFifty) {
            this.time.delayedCall(500, () => {
                this.applyFiftyFifty();
            });
        }
    }

    // UPDATED: Connected to Player Profile Stats and XP
    handleAnswer(i) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        this.wasReady = false; 
        this.updateReadyState(false);
        this.manageMeteorTimer(false);

        this.optionBtns.forEach(btn => {
            if (btn.pulseTween) {
                btn.pulseTween.stop();
                btn.pulseTween = null;
            }
            btn.container.setScale(1);
        });

        const q = this.questions[this.qIdx % this.questions.length];
        const category = q.subject || q.category || "General";
        
        const record = {
            question: q.question,
            category: category,
            userAnswer: q.options[i],
            correctAnswer: q.options[q.answer],
            isCorrect: (i === q.answer)
        };
        GameState.sessionHistory.push(record);

        const selectedBtn = this.optionBtns[i];
        const correctBtn = this.optionBtns[q.answer];

        const quickSelBtn = this.quickBtns[i];
        const quickCorBtn = this.quickBtns[q.answer];
        
        const gameScene = this.scene.get('GameScene');

        if (i === q.answer) {
            this.playSFX('sfx_q_correct', 0.5, false);
            
            // PROFILE STATS TRACKING
            if (GameState.profile) {
                GameState.profile.qr = (GameState.profile.qr || 0) + 1;
                GameState.profile.xp = (GameState.profile.xp || 0) + 10;
                if (!GameState.profile.s[category]) GameState.profile.s[category] = { r: 0, w: 0 };
                GameState.profile.s[category].r++;
            }

            GameState.correctCount++;
            if (GameState.weaponLevel < 4) GameState.weaponLevel++;
            
            GameState.currentCombo++;
            
            // --- NEW: MISSION HOOKS ---
            window.updateMissionProgress("answer_correct", 1); 

            if (GameState.currentCombo >= 3) {
                window.updateMissionProgress("answer_combo", 1); // Combo hook!
                gameScene.comboText.setText(`COMBO x${GameState.currentCombo}!`);
                gameScene.comboText.setAlpha(1);
                gameScene.comboText.setScale(0.8);
                gameScene.tweens.add({ targets: gameScene.comboText, scale: 1.0, duration: 700, yoyo: true, onComplete:() => {
                    gameScene.tweens.add({ targets: gameScene.comboText, alpha: 0, duration: 500, delay: 1000 });
                }});
                
                let duration = Math.max(4, Math.min(15, 4 + (GameState.currentCombo - 3) * 2)); 

                if (gameScene.wingmen.countActive() === 0) {
                    const w1 = gameScene.wingmen.create(gameScene.player.x - 50, gameScene.player.y + 20, "wingman_bird");
                    const w2 = gameScene.wingmen.create(gameScene.player.x + 50, gameScene.player.y + 20, "wingman_bird");
                    gameScene.tweens.add({ targets: [w1, w2], scale: {from: 0, to: 1}, duration: 500});
                }
                
                if (gameScene.wingmanTimer) {
                    gameScene.wingmanTimer.remove();
                }
                
                gameScene.wingmanTimer = gameScene.time.delayedCall(duration * 1000, () => {
                    gameScene.wingmen.children.each(w => {
                        gameScene.createExplosion(w.x, w.y, 0x0088ff, 10);
                        w.destroy();
                    });
                });
            }

            selectedBtn.bg.setFillStyle(0x00ff00, 0.4); 
            if (quickSelBtn) quickSelBtn.bg.setFillStyle(0x00ff00, 0.4); 
            
            if (gameScene) {
                const originalPlaySFX = gameScene.playSFX;
                try {
                    gameScene.playSFX = function(key, vol, allowJitter) {
                        if (key !== 'sfx_shockwave') {
                            originalPlaySFX.call(gameScene, key, vol, allowJitter);
                        }
                    };
                    gameScene.triggerSmallShockwave();
                } finally {
                    gameScene.playSFX = originalPlaySFX; 
                }
            }
        } else {
            this.playSFX('sfx_q_wrong', 0.6, false);
            
            // PROFILE STATS TRACKING
            if (GameState.profile) {
                GameState.profile.qw = (GameState.profile.qw || 0) + 1;
                if (!GameState.profile.s[category]) GameState.profile.s[category] = { r: 0, w: 0 };
                GameState.profile.s[category].w++;
            }

            if (GameState.weaponLevel > 3) GameState.weaponLevel--; 
            
            GameState.currentCombo = 0;
            if (gameScene && gameScene.wingmen) {
                gameScene.wingmen.children.each(w => {
                    gameScene.createExplosion(w.x, w.y, 0x0088ff, 10);
                    w.destroy();
                });
            }

            selectedBtn.bg.setFillStyle(0xff0000, 0.4); 
            correctBtn.bg.setFillStyle(0x00ff00, 0.4); 

            if (quickSelBtn) quickSelBtn.bg.setFillStyle(0xff0000, 0.4); 
            if (quickCorBtn) quickCorBtn.bg.setFillStyle(0x00ff00, 0.4); 
        }

        window.saveGame(); // Save stats silently here

        GameState.hasFiftyFifty = false;
        GameState.fiftyFiftyOptionsToHide = [];

        GameState.battery = 0;
        this.lastBattery = -1;

        this.time.delayedCall(i === q.answer ? 1500 : 3500, () => {
            this.isProcessing = false;  
            this.qIdx++;

            const gameScene = this.scene.get('GameScene');
            if (GameState.bossActive || (gameScene && gameScene.isTransitioningToBoss)) {
                this.toggleBattleMode(true);
                return;
            }

            this.refreshQuestion();
        });
    }

    applyFiftyFifty() {
        const gameScene = this.scene.get('GameScene');
        if (GameState.bossActive || (gameScene && gameScene.isTransitioningToBoss)) return;
        
        if (!GameState.hasFiftyFifty || this.isProcessing) return;
        if (GameState.fiftyFiftyOptionsToHide && GameState.fiftyFiftyOptionsToHide.length > 0) return;
        
        const q = this.questions[this.qIdx % this.questions.length];
        const correctIdx = q.answer;
        const wrongIndexes = [0, 1, 2, 3].filter(i => i !== correctIdx);
        
        Phaser.Utils.Array.Shuffle(wrongIndexes);
        GameState.fiftyFiftyOptionsToHide = [wrongIndexes[0], wrongIndexes[1]];

        this.playSFX('sfx_powerup', 0.8);

        GameState.fiftyFiftyOptionsToHide.forEach(idx => {
            const btn = this.optionBtns[idx];
            if (btn) {
                this.tweens.add({
                    targets: btn.container,
                    alpha: 0.2,
                    scale: 0.9,
                    duration: 300
                });
                btn.bg.disableInteractive();
            }

            const qBtn = this.quickBtns[idx];
            if (qBtn) {
                this.tweens.add({ targets: [qBtn.bg, qBtn.txt], alpha: 0.2, duration: 300 });
                qBtn.bg.disableInteractive();
            }
        });
    }

    trySkipQuestion() {
        if (this.isProcessing) return;

        if (GameState.skipsLeft > 0) {
            this.playSFX('sfx_q_skip', 0.6, false); 
            
            const q = this.questions[this.qIdx % this.questions.length];
            
            GameState.sessionHistory.push({
                question: q.question,
                category: q.subject || q.category || "Unknown",
                userAnswer: "SKIPPED",
                correctAnswer: q.options[q.answer],
                status: 'skipped'
            });
            
            this.manageMeteorTimer(false); 
            
            GameState.skipsLeft--;
            window.saveCurrency();

            GameState.fiftyFiftyOptionsToHide = []; 
            this.qIdx++;
            this.refreshQuestion();
            
            if (!this.tweens.isTweening(this.skipBtn)) {
                this.tweens.add({
                    targets: this.skipBtn,
                    scale: 1.15,
                    duration: 100,
                    yoyo: true
                });
            }
            
            if (this.quickSkipTxt && !this.tweens.isTweening(this.quickSkipTxt)) {
                this.tweens.add({
                    targets: this.quickSkipTxt,
                    scale: 1.15,
                    duration: 100,
                    yoyo: true
                });
            }
            
        } else {
            this.playSFX('sfx_q_low_battery', 0.6, false); 
            this.cameras.main.shake(200, 0.005);
        }
    }

    markQuestionAsSeen(questionText) {
        let seen = JSON.parse(localStorage.getItem('seenQuestions') || '[]');
        
        if (!seen.includes(questionText)) {
            seen.push(questionText);
            if (seen.length > 500) seen = seen.slice(-500);
            localStorage.setItem('seenQuestions', JSON.stringify(seen));
        }
    }

    toggleBattleMode(isBossFight) {
        const alpha = isBossFight ? 0 : 1;
        
        const elementsToKill = [this.qPanel, this.qText, this.qBankTag, this.skipBtn, this.quickAnsContainer];
        this.optionBtns.forEach(btn => elementsToKill.push(btn.container, btn.bg, btn.txt));
        this.quickBtns.forEach(btn => elementsToKill.push(btn.bg, btn.txt));
        if (this.quickSkipBtn) elementsToKill.push(this.quickSkipBtn.bg, this.quickSkipBtn.txt);

        this.tweens.killTweensOf(elementsToKill);

        if (isBossFight) {
            this.qPanel.setAlpha(0);
            this.qText.setAlpha(0);
            this.qBankTag.setAlpha(0);
            this.skipBtn.setAlpha(0);
            
            this.optionBtns.forEach(btn => {
                btn.container.setAlpha(0);
                btn.bg.disableInteractive();
                if (btn.pulseTween) { btn.pulseTween.stop(); btn.pulseTween = null; }
                btn.container.setScale(1);
            });

            this.quickAnsContainer.setAlpha(0);
            this.quickBtns.forEach(btn => btn.bg.disableInteractive());
            if (this.quickSkipBtn) this.quickSkipBtn.bg.disableInteractive();
            
            this.readyText.setAlpha(0);
            this.instructionText.setAlpha(0);
            if (this.warningTween) this.warningTween.stop();
            if (this.readyTween) this.readyTween.stop();

            if (this.boltIcon) this.boltIcon.setVisible(false);
            if (this.batteryBg) this.batteryBg.setVisible(false);
            if (this.batteryFill) this.batteryFill.setVisible(false);
            
        } else {
            this.wasReady = null; 
            this.qPanel.setAlpha(1);
            this.skipBtn.setAlpha(1);

            if (this.boltIcon) this.boltIcon.setVisible(true);
            if (this.batteryBg) this.batteryBg.setVisible(true);
            if (this.batteryFill) this.batteryFill.setVisible(true);
        }
    }
}