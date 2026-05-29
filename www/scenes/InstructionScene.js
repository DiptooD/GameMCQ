class InstructionScene extends Phaser.Scene {
    constructor() {
        super("InstructionScene");
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Ensure textures and sounds are loaded
        if (typeof GameTextures !== 'undefined') GameTextures.init(this);
        if (typeof PlayerShipTextures !== 'undefined') PlayerShipTextures.init(this);
        if (typeof GameSFX !== 'undefined') GameSFX.init(this);

        // --- 1. DYNAMIC BACKGROUND (Matches Main Game) ---
        this.createBackground(w, h);

        // --- 2. MOCK MAIN UI (Bottom HUD) ---
        this.uiContainer = this.add.container(0, 0).setDepth(50);
        
        const uiY = h - 80; 
        
        // Expose Battery UI components to 'this' to toggle visibility strictly
        this.botBar = this.add.graphics();
        this.botBar.fillGradientStyle(0x000000, 0x000000, 0x000510, 0x000510, 0, 0, 0.9, 0.9);
        this.botBar.fillRect(0, h - 120, w, 120);

        this.boltIcon = this.add.image(60, uiY, "ui_bolt").setScale(1.1).setTint(0x00ffcc);
        this.batteryBg = this.add.rectangle(230, uiY, 260, 30, 0x000000, 0.4).setStrokeStyle(3, 0x555555, 0.6);
        this.batteryFill = this.add.graphics();
        this.updateBatteryVisuals(0);
        
        // Group them for convenient toggling later
        this.batteryUI = [this.botBar, this.boltIcon, this.batteryBg, this.batteryFill];

        // Mock Hearts UI (Top Left Area)
        this.mockHearts = [];
        for (let i = 0; i < 3; i++) {
            let heart = this.add.image(cx - 50 + (i * 50), 280, "ui_heart").setScale(0.9).setAlpha(0);
            this.uiContainer.add(heart);
            this.mockHearts.push(heart);
        }

        this.uiContainer.add([...this.batteryUI]);

        // --- 3. ACTION ELEMENTS (Ship, Enemy, Mock Bullets) ---
        this.actionContainer = this.add.container(0, 0);

        this.mockPlayer = this.add.image(cx, h - 260, "player_lv1").setScale(0.9);
        this.mockEnemy = this.add.image(cx, 300, "enemy_common").setScale(1.5).setAlpha(0);
        this.mockBatteryDrop = this.add.image(cx, 300, "battery_green").setScale(1.2).setAlpha(0);
        this.mockBullet = this.add.image(cx, this.mockPlayer.y - 50, "bullet_default").setAlpha(0);
        
        this.mockShieldAura = this.add.graphics().setDepth(10).setVisible(false);
        this.actionContainer.add(this.mockShieldAura);

        this.mockBulletsGroup = this.add.group(); 
        this.mockShipLevel = 1;

        // Hand Pointer
        this.handPointer = this.add.text(cx, this.mockPlayer.y + 60, "👆", { 
            fontSize: '70px', shadow: { offsetX: 3, offsetY: 3, color: "#000000", blur: 5, fill: true } 
        }).setOrigin(0.2, 0).setAlpha(0).setDepth(200);

        // --- 4. MOCK MCQ PANEL (Matches QuestionScene precisely) ---
        this.mockMcqContainer = this.add.container(0, 0).setAlpha(0).setDepth(150);
        const boxX = 10;
        const boxY = 15;
        const boxW = 700;
        const boxH = 445; 

        this.qPanel = this.add.graphics();
        this.drawGlassPanel(this.qPanel, boxX, boxY, boxW, boxH);
        
        const questionAreaY = boxY + 150; 
        this.mockQText = this.add.text(boxX + (boxW / 2), questionAreaY, "মহাশূন্যে কিভাবে শত্রুকে ধ্বংস করবেন?", {
            fontSize: "36px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 800, color: "#ffffff",
            align: "center", wordWrap: { width: boxW - 40 }, lineSpacing: 5, stroke: "#000000", strokeThickness: 2
        }).setOrigin(0.5);

        // Mock Skip Button on the Panel
        this.mockSkipBtn = this.add.text(boxX + boxW - 60, boxY + 50, "Skip (2)", {
            fontSize: "24px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#ffffff", fontStyle: 'bold',
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            padding: { x: 12, y: 8 }, stroke: '#000000', strokeThickness: 3
        }).setOrigin(1, 0.5);

        // Position Ready text immediately under the question box exactly like the main game
        this.readyText = this.add.text(boxX + (boxW / 2), boxY + boxH + 27, "Ready! উত্তর দিন!", {
            fontSize: "31px", fontFamily: "'Anek Bangla'", fontWeight: 'bold', color: "#00ff00", stroke: "#000000", strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0);

        this.mockMcqContainer.add([this.qPanel, this.mockQText, this.mockSkipBtn, this.readyText]);

        this.mockOptions = [];
        const btnW = 330; 
        const btnH = 95;  
        const gap = 20;   
        const startYBtn = boxY + 270; 
        
        const optLabels = ["ক) এড়িয়ে যাব", "খ) গুলি করব", "গ) বন্ধুত্ব করব", "ঘ) পালাবো"];
        for (let i = 0; i < 4; i++) {
            let col = i % 2;
            let row = Math.floor(i / 2);
            let x = (col === 0) ? 185 : 535;
            let y = startYBtn + (row * (btnH + gap));

            let container = this.add.container(x, y);
            let bg = this.add.rectangle(0, 0, btnW, btnH, 0x000510, 0.4).setStrokeStyle(3, 0xffffff, 0.15);
            let txt = this.add.text(0, 0, optLabels[i], {
                fontSize: "32px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#aaddff", align: "center", wordWrap: { width: btnW - 20 }
            }).setOrigin(0.5);

            container.add([bg, txt]);
            this.mockMcqContainer.add(container);
            this.mockOptions.push({ container, bg, txt, originalY: y }); 
        }

        this.actionContainer.add([this.mockPlayer, this.mockEnemy, this.mockBatteryDrop, this.mockBullet, this.handPointer]);

        // --- 5. DIALOGUE UI (Transparent Sleek HUD) ---
        const dialogH = 200;
        const dialogY = cy + 60; 

        this.dialogContainer = this.add.container(0, 0).setDepth(100);
        
        this.dialogBg = this.add.graphics();
        this.dialogBg.fillStyle(0x000c22, 0.75); 
        this.dialogBg.fillRoundedRect(30, dialogY, w - 60, dialogH, 20);
        this.dialogBg.lineStyle(4, 0x00e1ff, 1);
        this.dialogBg.strokeRoundedRect(30, dialogY, w - 60, dialogH, 20);

        this.dialogBg.lineStyle(6, 0xffffff, 1);
        this.dialogBg.beginPath(); this.dialogBg.moveTo(50, dialogY); this.dialogBg.lineTo(30, dialogY); this.dialogBg.lineTo(30, dialogY + 20); this.dialogBg.strokePath();
        this.dialogBg.beginPath(); this.dialogBg.moveTo(w - 50, dialogY + dialogH); this.dialogBg.lineTo(w - 30, dialogY + dialogH); this.dialogBg.lineTo(w - 30, dialogY + dialogH - 20); this.dialogBg.strokePath();

        this.instructionText = this.add.text(cx, dialogY + 70, "", {
            fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#ffffff", 
            align: "center", wordWrap: { width: w - 100 }, lineSpacing: 10, fontStyle: "bold",
            stroke: "#000000", strokeThickness: 3
        }).setOrigin(0.5);

        // Next Button
        this.nextBtn = this.add.rectangle(cx + 180, dialogY + dialogH - 45, 170, 60, 0x0066aa).setInteractive({ useHandCursor: true }).setStrokeStyle(3, 0xffffff);
        this.nextTxt = this.add.text(cx + 180, dialogY + dialogH - 45, "পরবর্তী ▶", { fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        this.nextBtn.on('pointerdown', () => {
            this.tweens.add({ targets: [this.nextBtn, this.nextTxt], scale: 0.9, duration: 50, yoyo: true, onComplete: () => this.goToNextStep() });
        });

        // Skip Button
        this.skipBtn = this.add.rectangle(cx - 180, dialogY + dialogH - 45, 150, 60, 0xff3333, 0.8).setInteractive({ useHandCursor: true }).setStrokeStyle(3, 0xffffff);
        this.skipTxt = this.add.text(cx - 180, dialogY + dialogH - 45, "Skip ✖", { fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        this.skipBtn.on('pointerdown', () => {
            this.playSound('sfx_back', 0.6);
            this.tweens.add({ targets: [this.skipBtn, this.skipTxt], scale: 0.9, duration: 50, yoyo: true, onComplete: () => this.endTutorial() });
        });

        this.dialogContainer.add([this.dialogBg, this.instructionText, this.nextBtn, this.nextTxt, this.skipBtn, this.skipTxt]);

        // --- 6. CONTINUOUS WEAPON FIRING SYSTEM ---
        this.fireTimer = this.time.addEvent({
            delay: 250, 
            loop: true,
            callback: () => {
                if (this.currentStep < 5 || this.currentStep > 7) return; 
                if (!this.stepLoopActive) return;

                const x = this.mockPlayer.x;
                const y = this.mockPlayer.y - 60;
                
                if (this.mockShipLevel === 2) {
                    let b1 = this.add.image(x - 22, y, "bullet_default").setScale(1.1);
                    let b2 = this.add.image(x + 22, y, "bullet_default").setScale(1.1);
                    this.mockBulletsGroup.addMultiple([b1, b2]);
                } else if (this.mockShipLevel === 3) {
                    let b1 = this.add.image(x - 18, y, "bullet_default").setScale(1.1);
                    let b2 = this.add.image(x + 18, y, "bullet_default").setScale(1.1);
                    
                    let left = this.add.image(x - 30, y + 10, "side_bullet_default").setScale(1.2);
                    left.rotation = Phaser.Math.DegToRad(-94) + Math.PI/2;
                    left.vx = Math.cos(Phaser.Math.DegToRad(-94)) * 900;
                    left.vy = Math.sin(Phaser.Math.DegToRad(-94)) * 900;
                    
                    let right = this.add.image(x + 30, y + 10, "side_bullet_default").setScale(1.2);
                    right.rotation = Phaser.Math.DegToRad(-86) + Math.PI/2;
                    right.vx = Math.cos(Phaser.Math.DegToRad(-86)) * 900;
                    right.vy = Math.sin(Phaser.Math.DegToRad(-86)) * 900;

                    this.mockBulletsGroup.addMultiple([b1, b2, left, right]);
                }
            }
        });

        // --- 7. STEPS LOGIC ---
        this.steps = [
            { text: "স্বাগতম! গেইম MCQ-তে আপনাকে স্বাগতম।\nকীভাবে খেলতে হয় চলুন শিখে নিই।", anim: this.animWelcome.bind(this) },
            { text: "স্ক্রিনে আঙুল দিয়ে ড্র্যাগ করে স্পেসশিপটি\nডানে বা বামে সরাতে পারবেন।", anim: this.animMove.bind(this) },
            { text: "শত্রু ধ্বংস হলে এরা ব্যাটারি ড্রপ করবে।\nব্যাটারি সংগ্রহ করলে চার্জ ১০০% হয়ে প্রশ্ন আসবে।", anim: this.animCombatAndBattery.bind(this) },
            { text: "শত্রুর গুলিতে আপনার লাইফ কমে যাবে।\nতাই সাবধানে এড়িয়ে চলুন।", anim: this.animHit.bind(this) },
            { text: "শিল্ড (Shield) সংগ্রহ করলে আপনি\nএকটি আঘাত থেকে রক্ষা পাবেন।", anim: this.animShield.bind(this) },
            { text: "সঠিক উত্তর দিলে স্পেসশিপ আপগ্রেড হবে\nএবং শক্তিশালী অস্ত্র পাবেন!", anim: this.animCorrect.bind(this) },
            { text: "ভুল উত্তর দিলে স্পেসশিপ ডাউনগ্রেড হবে।\nতাই সাবধানে সঠিক উত্তর দিন।", anim: this.animWrong.bind(this) },
            { text: "কঠিন প্রশ্নের ক্ষেত্রে 'Skip' ব্যবহার করে\nপ্রশ্নটি এড়িয়ে যেতে পারবেন।", anim: this.animSkip.bind(this) },
            { text: "সবকিছু প্রস্তুত!\nএখন মহাশূন্যে পাড়ি দেওয়ার সময়। শুভকামনা!", anim: this.animEnd.bind(this) }
        ];

        this.currentStep = 0;
        this.combatLoopActive = false; 
        this.stepLoopActive = false;
        this.loadStep();
    }

    update(time, delta) {
        const dtScale = Phaser.Math.Clamp(delta / 16.66, 0.1, 2.5);
        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                layer.group.children.iterate(star => {
                    if (star) {
                        star.y += layer.speed * dtScale;
                        if (star.y > this.cameras.main.height) {
                            star.y = -10;
                            star.x = Phaser.Math.Between(0, 720);
                        }
                    }
                });
            });
        }

        this.mockBulletsGroup.getChildren().forEach(b => {
            if (b.vx !== undefined) {
                b.x += b.vx * (delta / 1000);
                b.y += b.vy * (delta / 1000);
            } else {
                b.y -= 1100 * (delta / 1000);
            }
            if (b.y < -50 || b.x < -50 || b.x > this.cameras.main.width + 50) b.destroy();
        });
    }

    playSound(key, baseVolume = 1.0) {
        if (this.cache.audio.exists(key)) {
            const finalVolume = baseVolume * (window.GameState && window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
            this.sound.play(key, { volume: finalVolume });
        }
    }

    drawGlassPanel(graphics, x, y, w, h) {
        graphics.clear();
        graphics.fillStyle(0x000000, 0.4);
        graphics.fillRoundedRect(x, y, w, h, 16);
        graphics.lineStyle(3, 0xffffff, 0.15); 
        graphics.strokeRoundedRect(x, y, w, h, 16);
    }

    createExplosion(x, y, color) {
        for(let i=0; i<8; i++) {
            let p = this.add.image(x, y, "explosion_particle").setTint(color).setDepth(20);
            let angle = (i/8) * Math.PI * 2;
            let speed = Phaser.Math.Between(80, 150);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0, scale: 0.5, duration: 400, ease: 'Cubic.easeOut', onComplete: ()=>p.destroy()
            });
        }
        const flash = this.add.circle(x, y, 30, 0xffffff).setDepth(19);
        this.tweens.add({ targets: flash, scale: 2.5, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
    }

    updateBatteryVisuals(pct) {
        this.batteryFill.clear();
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

    createBackground(w, h) {
        const themeColors = (window.getThemeColors) ? window.getThemeColors() : { bgTop: 0x1A0545, bgBot: 0x003355, starBase: 0xffffff, starFast: 0x00ffff, starDistant: 0xaaaaaa };
        
        this.bgGradient = this.add.graphics();
        this.bgGradient.fillGradientStyle(themeColors.bgTop, themeColors.bgTop, themeColors.bgBot, themeColors.bgBot, 1);
        this.bgGradient.fillRect(0, 0, w, h);

        this.backgroundLayers = []; 
        const createLayer = (count, speed, color, size, alpha = 1) => {
            const group = this.add.group();
            for (let i = 0; i < count; i++) {
                const x = Phaser.Math.Between(0, w);
                const y = Phaser.Math.Between(0, h);
                const star = this.add.circle(x, y, size, color, alpha);
                group.add(star);
            }
            this.backgroundLayers.push({ group: group, speed: speed });
        };

        createLayer(40, 0.4, themeColors.starDistant, 1.5, 0.5); 
        createLayer(25, 1.0, themeColors.starBase, 2, 0.8); 
    }

    goToNextStep() {
        this.playSound('sfx_click', 0.5);
        
        // Explicitly kill tweens to prevent answer buttons from drifting across steps
        this.tweens.killTweensOf([
            this.mockPlayer, this.handPointer, this.mockEnemy, 
            this.mockBatteryDrop, this.mockBullet, this.readyText, 
            this.mockMcqContainer, this.mockShieldAura, this.mockSkipBtn, 
            ...this.mockHearts
        ]); 
        
        this.mockOptions.forEach(opt => {
            this.tweens.killTweensOf([opt.container, opt.bg, opt.txt]);
        });

        if (this.moveTween) this.moveTween.stop();

        this.combatLoopActive = false; 
        this.stepLoopActive = false; 
        this.mockBulletsGroup.clear(true, true);
        
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.loadStep();
        } else {
            this.endTutorial();
        }
    }

    loadStep() {
        const stepData = this.steps[this.currentStep];
        this.instructionText.setText(stepData.text);
        
        const cx = this.cameras.main.centerX;
        const h = this.cameras.main.height;

        this.mockPlayer.setPosition(cx, h - 260).setTexture("player_lv1").setScale(0.9).clearTint();
        this.handPointer.setAlpha(0);
        this.mockEnemy.setAlpha(0).clearTint();
        this.mockBatteryDrop.setAlpha(0);
        
        this.mockBullet.setAlpha(0).setAngle(0).clearTint();
        
        this.mockHearts.forEach(h => h.setAlpha(0).setScale(0.9).clearTint());
        this.mockShieldAura.setVisible(false);
        this.mockQText.setText("মহাশূন্যে কিভাবে শত্রুকে ধ্বংস করবেন?");

        // Strictly Show Battery UI *ONLY* on Step 3 (index 2)
        const showBattery = (this.currentStep === 2);
        if (this.batteryUI) {
            this.batteryUI.forEach(el => el.setVisible(showBattery));
        }

        this.updateBatteryVisuals(0);
        this.readyText.setAlpha(0).setScale(1);
        
        this.mockMcqContainer.setAlpha(0);
        this.mockMcqContainer.setScale(1);
        this.mockMcqContainer.y = 0;
        
        // Hide Skip Button on the Panel unless demonstrating skip (Step 8 / index 7)
        this.mockSkipBtn.setVisible(this.currentStep === 7);
        
        this.mockOptions.forEach(opt => {
            opt.bg.setFillStyle(0x000510, 0.4).setStrokeStyle(3, 0xffffff, 0.15);
            opt.container.setScale(1);
            opt.container.y = opt.originalY;
            opt.container.x = opt.originalX || opt.container.x;
        });

        if (this.currentStep === this.steps.length - 1) {
            this.nextTxt.setText("শুরু করুন!");
            this.nextBtn.setFillStyle(0x00cc44);
        } else {
            this.nextTxt.setText("পরবর্তী ▶");
            this.nextBtn.setFillStyle(0x0066aa);
        }

        this.dialogContainer.setScale(0.95);
        this.tweens.add({ targets: this.dialogContainer, scale: 1, duration: 200, ease: 'Back.out' });

        stepData.anim();
    }

    animWelcome() {
        this.tweens.add({
            targets: this.mockPlayer, y: this.mockPlayer.y - 20, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    animMove() {
        const cx = this.cameras.main.centerX;
        this.handPointer.setPosition(cx, this.mockPlayer.y + 80).setAlpha(1);
        
        let proxy = { val: 0 };
        this.moveTween = this.tweens.add({
            targets: proxy,
            val: Math.PI * 2,
            duration: 4000,
            repeat: -1,
            onUpdate: () => {
                let offset = Math.sin(proxy.val) * 160;
                this.mockPlayer.x = cx + offset;
                this.handPointer.x = cx + offset;
            }
        });
    }

    animCombatAndBattery() {
        const cx = this.cameras.main.centerX;
        this.combatLoopActive = true;
        this.mockPlayer.x = cx;
        this.updateBatteryVisuals(0);
        this.mockMcqContainer.setAlpha(0);

        const spawnEnemy = (texture, fillToPct, onCompletePhase) => {
            if (!this.combatLoopActive || !this.scene.isActive()) return;

            this.mockEnemy.setTexture(texture).setPosition(cx, 200).setAlpha(1).setScale(1.5).clearTint();
            this.mockBullet.setTexture("bullet_default").setPosition(cx, this.mockPlayer.y - 60).setAlpha(1);
            this.mockBatteryDrop.setPosition(cx, 200).setAlpha(0);

            this.playSound('sfx_shoot', 0.3);
            this.tweens.add({
                targets: this.mockBullet,
                y: this.mockEnemy.y,
                duration: 350,
                onComplete: () => {
                    if (!this.combatLoopActive) return;
                    this.mockBullet.setAlpha(0);
                    this.playSound('sfx_explode', 0.5);
                    this.mockEnemy.setTint(0xff0000);
                    this.createExplosion(this.mockEnemy.x, this.mockEnemy.y, 0xff3300);

                    this.tweens.add({
                        targets: this.mockEnemy, scaleX: 0, scaleY: 0, alpha: 0, duration: 300,
                        onComplete: () => {
                            if (!this.combatLoopActive) return;
                            
                            let batTex = fillToPct === 50 ? "battery_green" : "battery_yellow";
                            this.mockBatteryDrop.setTexture(batTex).setAlpha(1).setScale(1.2);
                            
                            this.tweens.add({
                                targets: this.mockBatteryDrop, 
                                y: this.mockPlayer.y, 
                                duration: 800, 
                                ease: 'Cubic.easeIn',
                                onComplete: () => {
                                    if (!this.combatLoopActive) return;
                                    this.mockBatteryDrop.setAlpha(0);
                                    this.playSound('sfx_battery_collect', 0.5);
                                    
                                    this.mockPlayer.setTint(0x00ff00);
                                    this.time.delayedCall(150, () => this.mockPlayer.clearTint());

                                    let startPct = fillToPct === 50 ? 0 : 50;
                                    let progressProxy = { val: startPct };
                                    this.tweens.add({
                                        targets: progressProxy, val: fillToPct, duration: 600, ease: 'Linear',
                                        onUpdate: () => this.updateBatteryVisuals(progressProxy.val / 100),
                                        onComplete: () => onCompletePhase()
                                    });
                                }
                            });
                        }
                    });
                }
            });
        };

        const runKillLoop = () => {
            if (!this.combatLoopActive) return;
            this.updateBatteryVisuals(0);
            this.mockMcqContainer.setAlpha(0);
            this.readyText.setAlpha(0);

            // Kill Enemy 1 (Common)
            spawnEnemy("enemy_common", 50, () => {
                if (!this.combatLoopActive) return;
                
                // Small delay before Enemy 2
                this.time.delayedCall(600, () => {
                    // Kill Enemy 2 (Rare)
                    spawnEnemy("enemy_rare", 100, () => {
                        if (!this.combatLoopActive) return;
                        
                        this.playSound('sfx_q_ready', 0.6);
                        
                        // Show MCQ Popup Immediately
                        this.mockMcqContainer.y = -500;
                        this.readyText.setAlpha(1);
                        this.readyText.setScale(1);

                        this.tweens.add({
                            targets: this.mockMcqContainer, alpha: 1, y: 0, duration: 600, ease: 'Back.out',
                            onComplete: () => {
                                if (!this.combatLoopActive) return;
                                
                                // Pulse the ready text
                                this.tweens.add({
                                    targets: this.readyText, alpha: 0.4, scale: 1.05, duration: 500, yoyo: true, repeat: 3,
                                    onComplete: () => {
                                        if (!this.combatLoopActive) return;
                                        
                                        this.tweens.add({
                                            targets: this.mockMcqContainer, y: -500, alpha: 0, duration: 400, ease: 'Back.in',
                                            onComplete: () => {
                                                this.time.delayedCall(800, runKillLoop);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                });
            });
        };

        runKillLoop();
    }

    animHit() {
        const cx = this.cameras.main.centerX;
        this.stepLoopActive = true;
        this.mockPlayer.x = cx;
        
        const runLoop = () => {
            if (!this.stepLoopActive || this.currentStep !== 3) return;
            
            this.mockHearts.forEach((h) => h.setAlpha(1).setScale(0.9).clearTint());
            
            // Enemy spawns and shoots an authentic enemy bullet
            this.mockEnemy.setTexture("enemy_common").setPosition(cx, 120).setAlpha(1).setScale(1.5).clearTint();
            this.mockBullet.setTexture("enemyBullet").clearTint().setAngle(0).setPosition(cx, 160).setAlpha(1).setScale(1.2);
            
            this.tweens.add({
                targets: this.mockBullet,
                y: this.mockPlayer.y,
                duration: 1000,
                ease: 'Linear',
                onComplete: () => {
                    if (!this.stepLoopActive) return;
                    this.playSound('sfx_hit', 0.5);
                    this.createExplosion(this.mockPlayer.x, this.mockPlayer.y, 0xff0000);
                    this.mockBullet.setAlpha(0);
                    this.mockEnemy.setAlpha(0);
                    
                    this.mockPlayer.setTint(0xff0000);
                    this.tweens.add({
                        targets: this.mockPlayer, alpha: 0.3, duration: 150, yoyo: true, repeat: 3,
                        onComplete: () => { if(this.mockPlayer) this.mockPlayer.clearTint().setAlpha(1); }
                    });
                    
                    this.cameras.main.shake(200, 0.02);
                    
                    let lastHeart = this.mockHearts[2];
                    lastHeart.setTint(0xff0000);
                    this.tweens.add({ targets: lastHeart, scale: 0, alpha: 0, duration: 300, onComplete: () => lastHeart.clearTint() });
                    
                    this.time.delayedCall(2000, runLoop);
                }
            });
        }
        runLoop();
    }

    animShield() {
        const cx = this.cameras.main.centerX;
        this.stepLoopActive = true;
        this.mockPlayer.x = cx;
        
        const runLoop = () => {
            if (!this.stepLoopActive || this.currentStep !== 4) return;
            
            this.mockShieldAura.setVisible(false);
            this.mockHearts.forEach((h) => h.setAlpha(1).setScale(0.9).clearTint());
            this.mockBatteryDrop.setTexture("powerup_shield").setPosition(cx, 80).setAlpha(1).setScale(1.2);
            
            this.tweens.add({
                targets: this.mockBatteryDrop,
                y: this.mockPlayer.y,
                duration: 1200,
                ease: 'Linear',
                onComplete: () => {
                    if (!this.stepLoopActive) return;
                    this.mockBatteryDrop.setAlpha(0);
                    this.playSound('sfx_shield_activate', 0.5);
                    
                    this.mockShieldAura.setVisible(true);
                    this.mockShieldAura.clear();
                    this.mockShieldAura.lineStyle(4, 0xffcc00, 1);
                    this.mockShieldAura.fillStyle(0xffcc00, 0.3);
                    this.mockShieldAura.beginPath();
                    this.mockShieldAura.arc(this.mockPlayer.x, this.mockPlayer.y, 75, Phaser.Math.DegToRad(225), Phaser.Math.DegToRad(315));
                    this.mockShieldAura.strokePath();
                    this.mockShieldAura.fillPath();
                    
                    // Enemy spawns and shoots an authentic enemy bullet hitting the shield
                    this.mockEnemy.setTexture("enemy_common").setPosition(cx, 120).setAlpha(1).setScale(1.5).clearTint();
                    this.mockBullet.setTexture("enemyBullet").clearTint().setAngle(0).setPosition(cx, 160).setAlpha(1).setScale(1.2);
                    
                    this.tweens.add({
                        targets: this.mockBullet,
                        y: this.mockPlayer.y - 50,
                        duration: 800,
                        ease: 'Linear',
                        onComplete: () => {
                            if (!this.stepLoopActive) return;
                            this.playSound('sfx_shield_break', 0.5);
                            this.mockBullet.setAlpha(0);
                            this.mockEnemy.setAlpha(0);
                            this.mockShieldAura.setVisible(false);
                            this.createExplosion(this.mockPlayer.x, this.mockPlayer.y - 50, 0xffcc00);
                            
                            this.time.delayedCall(2000, runLoop);
                        }
                    });
                }
            });
        }
        runLoop();
    }

    animCorrect() {
        this.stepLoopActive = true;
        
        const runLoop = () => {
            if (!this.stepLoopActive || this.currentStep !== 5) return;
            
            this.mockShipLevel = 2;
            this.mockPlayer.setTexture("player_lv2").setScale(0.9);
            this.mockMcqContainer.setAlpha(1);
            
            this.readyText.setAlpha(1).setScale(1);
            this.tweens.add({ targets: this.readyText, alpha: 0.4, scale: 1.05, duration: 500, yoyo: true, repeat: -1 });

            this.handPointer.setPosition(this.mockOptions[1].container.x, this.mockOptions[1].container.y + 40).setAlpha(0);
            this.mockOptions.forEach(opt => {
                opt.bg.setFillStyle(0x000510, 0.4).setStrokeStyle(3, 0xffffff, 0.15);
                opt.container.y = opt.originalY;
            });

            this.time.delayedCall(1500, () => {
                if (!this.stepLoopActive) return;
                this.tweens.add({
                    targets: this.handPointer, alpha: 1, y: this.mockOptions[1].container.y + 10, duration: 400,
                    onComplete: () => {
                        if (!this.stepLoopActive) return;
                        
                        this.playSound('sfx_q_correct', 0.6);
                        this.mockOptions[1].container.y += 5;
                        this.mockOptions[1].bg.setFillStyle(0x00ff00, 0.4);

                        this.time.delayedCall(1200, () => {
                            if (!this.stepLoopActive) return;
                            this.tweens.add({ targets: this.mockMcqContainer, alpha: 0, duration: 300 });
                            this.handPointer.setAlpha(0);
                            
                            this.playSound('sfx_powerup', 0.5);
                            this.mockShipLevel = 3;
                            this.mockPlayer.setTexture("player_lv3");
                            
                            this.createExplosion(this.mockPlayer.x, this.mockPlayer.y, 0x00ffff);
                            this.tweens.add({
                                targets: this.mockPlayer, scale: 1.5, duration: 300, yoyo: true, 
                                onComplete: () => {
                                    if(this.mockPlayer) this.mockPlayer.setScale(1.1);
                                }
                            });

                            this.time.delayedCall(2500, runLoop);
                        });
                    }
                });
            });
        };
        
        runLoop();
    }

    animWrong() {
        this.stepLoopActive = true;
        
        const runLoop = () => {
            if (!this.stepLoopActive || this.currentStep !== 6) return;
            
            this.mockShipLevel = 3;
            this.mockPlayer.setTexture("player_lv3").setScale(1.1).clearTint();
            this.mockMcqContainer.setAlpha(1);
            
            this.readyText.setAlpha(1).setScale(1);
            this.tweens.add({ targets: this.readyText, alpha: 0.4, scale: 1.05, duration: 500, yoyo: true, repeat: -1 });

            this.handPointer.setPosition(this.mockOptions[3].container.x, this.mockOptions[3].container.y + 40).setAlpha(0);
            this.mockOptions.forEach(opt => {
                opt.bg.setFillStyle(0x000510, 0.4).setStrokeStyle(3, 0xffffff, 0.15);
                opt.container.y = opt.originalY;
            });

            this.time.delayedCall(1500, () => {
                if (!this.stepLoopActive) return;
                this.tweens.add({
                    targets: this.handPointer, alpha: 1, y: this.mockOptions[3].container.y + 10, duration: 400,
                    onComplete: () => {
                        if (!this.stepLoopActive) return;
                        
                        this.playSound('sfx_q_wrong', 0.6);
                        this.mockOptions[3].container.y += 5;
                        this.mockOptions[3].bg.setFillStyle(0xff0000, 0.4);
                        
                        this.mockOptions[1].bg.setFillStyle(0x00ff00, 0.4);

                        this.time.delayedCall(1200, () => {
                            if (!this.stepLoopActive) return;
                            this.tweens.add({ targets: this.mockMcqContainer, alpha: 0, duration: 300 });
                            this.handPointer.setAlpha(0);
                            
                            this.playSound('sfx_hit', 0.5);
                            this.mockShipLevel = 2;
                            this.mockPlayer.setTexture("player_lv2");
                            this.mockPlayer.setTint(0xff0000);
                            this.createExplosion(this.mockPlayer.x, this.mockPlayer.y, 0xff0000);

                            this.tweens.add({
                                targets: this.mockPlayer, scale: 0.8, duration: 200, yoyo: true, 
                                onComplete: () => {
                                    if(this.mockPlayer) {
                                        this.mockPlayer.setScale(0.9);
                                        this.mockPlayer.clearTint();
                                    }
                                }
                            });

                            this.time.delayedCall(2500, runLoop);
                        });
                    }
                });
            });
        };

        runLoop();
    }

    animSkip() {
        this.stepLoopActive = true;
        
        const runLoop = () => {
            if (!this.stepLoopActive || this.currentStep !== 7) return;
            
            this.mockShipLevel = 2;
            this.mockPlayer.setTexture("player_lv2").setScale(0.9);
            this.mockMcqContainer.setAlpha(1);
            this.mockMcqContainer.y = 0;
            
            this.mockSkipBtn.setAlpha(1);
            this.handPointer.setPosition(this.mockSkipBtn.x - 40, this.mockSkipBtn.y + 40).setAlpha(0);
            
            this.mockQText.setText("মহাশূন্যে কিভাবে শত্রুকে ধ্বংস করবেন?");
            
            this.readyText.setAlpha(1).setScale(1);
            this.tweens.add({ targets: this.readyText, alpha: 0.4, scale: 1.05, duration: 500, yoyo: true, repeat: -1 });
            
            this.time.delayedCall(1200, () => {
                if (!this.stepLoopActive) return;
                this.tweens.add({
                    targets: this.handPointer, alpha: 1, y: this.mockSkipBtn.y + 10, duration: 400,
                    onComplete: () => {
                        if (!this.stepLoopActive) return;
                        
                        this.playSound('sfx_q_skip', 0.6);
                        this.tweens.add({ targets: this.mockSkipBtn, scale: 1.1, duration: 100, yoyo: true });
                        
                        this.time.delayedCall(500, () => {
                            if (!this.stepLoopActive) return;
                            
                            // Swipe out old question
                            this.tweens.add({
                                targets: this.mockMcqContainer, y: -20, alpha: 0, duration: 250, ease: 'Power2.easeIn',
                                onComplete: () => {
                                    if (!this.stepLoopActive) return;
                                    
                                    // Change text to simulate new question
                                    this.mockQText.setText("নতুন প্রশ্ন: উল্কা থেকে বাঁচতে কি করবেন?");
                                    this.mockMcqContainer.y = 20; 
                                    
                                    // Swipe in new question
                                    this.tweens.add({
                                        targets: this.mockMcqContainer, y: 0, alpha: 1, duration: 350, ease: 'Cubic.easeOut',
                                        onComplete: () => {
                                            this.handPointer.setAlpha(0);
                                            this.time.delayedCall(2000, () => {
                                                if (!this.stepLoopActive) return;
                                                this.tweens.add({ targets: this.mockMcqContainer, y: -500, alpha: 0, duration: 400, ease: 'Back.in' });
                                                this.time.delayedCall(1000, runLoop);
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            });
        };
        runLoop();
    }

    animEnd() {
        this.mockPlayer.setTexture("player_lv4");
        this.tweens.add({
            targets: this.mockPlayer, y: this.mockPlayer.y - 30, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    endTutorial() {
        this.combatLoopActive = false;
        this.stepLoopActive = false;
        if (this.cache.audio.exists('sfx_powerup')) this.sound.play('sfx_powerup', { volume: 0.6 });
        
        localStorage.setItem('tutorial_completed', 'true');
        
        this.cameras.main.fade(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start("GameScene");
            this.scene.launch("QuestionScene");
        });
    }
}