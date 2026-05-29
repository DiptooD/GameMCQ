class InstructionScene extends Phaser.Scene {
    constructor() {
        super("InstructionScene");
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Ensure textures are loaded
        if (typeof GameTextures !== 'undefined') GameTextures.init(this);
        if (typeof PlayerShipTextures !== 'undefined') PlayerShipTextures.init(this);

        // 1. Background (Deep Space)
        const themeColors = (window.getThemeColors) ? window.getThemeColors() : { bgTop: 0x1A0545, bgBot: 0x003355 };
        const bg = this.add.graphics();
        bg.fillGradientStyle(themeColors.bgTop, themeColors.bgTop, themeColors.bgBot, themeColors.bgBot, 1);
        bg.fillRect(0, 0, w, h);

        this.stars = [];
        for (let i = 0; i < 50; i++) {
            let star = this.add.circle(
                Phaser.Math.Between(0, w), 
                Phaser.Math.Between(0, h), 
                Phaser.Math.FloatBetween(1, 3), 
                0xffffff, 
                Phaser.Math.FloatBetween(0.3, 0.8)
            );
            this.stars.push(star);
        }

        // 2. Tutorial Elements Container
        this.actionContainer = this.add.container(0, 0);

        this.mockPlayer = this.add.image(cx, cy - 100, "player_lv1").setScale(0.9);
        this.mockEnemy = this.add.image(cx, cy - 350, "enemy_common").setScale(1.5).setAlpha(0);
        this.mockBattery = this.add.image(cx, cy - 350, "battery_green").setScale(1.2).setAlpha(0);
        this.mockBullet = this.add.image(cx, cy - 150, "bullet_default").setAlpha(0);
        
        // --- UPGRADED BATTERY UI (Matches Main Game) ---
        this.mockBatteryBg = this.add.graphics().setAlpha(0);
        this.mockBatteryBg.fillStyle(0x0a1535, 0.75);
        this.mockBatteryBg.fillRoundedRect(cx - 130, cy - 250, 260, 30, 6);
        this.mockBatteryBg.lineStyle(2, 0x00ffcc, 0.9);
        this.mockBatteryBg.strokeRoundedRect(cx - 130, cy - 250, 260, 30, 6);
        // Bolt Icon
        this.mockBatteryBg.fillStyle(0xffffff, 0.9);
        this.mockBatteryBg.fillTriangle(cx - 155, cy - 235, cx - 145, cy - 235, cx - 150, cy - 220); 

        this.mockBatteryFill = this.add.graphics().setAlpha(0);

        // --- UPGRADED 4-CHOICE MCQ UI ---
        this.mockMcqBg = this.add.rectangle(cx, cy - 120, 380, 260, 0x001133, 0.9).setStrokeStyle(4, 0x00ffff, 1).setAlpha(0);
        this.mockMcqText = this.add.text(cx, cy - 210, "১ + ১ = কত?", { fontSize: '32px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0);
        
        // 2x2 Grid setup
        this.mockMcqBtn1 = this.add.rectangle(cx - 90, cy - 130, 160, 50, 0x0e204a, 0.8).setStrokeStyle(2, 0x8899aa, 1).setAlpha(0);
        this.mockMcqTxt1 = this.add.text(cx - 90, cy - 130, "ক. ২", { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0.5).setAlpha(0);
        
        this.mockMcqBtn2 = this.add.rectangle(cx + 90, cy - 130, 160, 50, 0x0e204a, 0.8).setStrokeStyle(2, 0x8899aa, 1).setAlpha(0);
        this.mockMcqTxt2 = this.add.text(cx + 90, cy - 130, "খ. ৩", { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0.5).setAlpha(0);
        
        this.mockMcqBtn3 = this.add.rectangle(cx - 90, cy - 60, 160, 50, 0x0e204a, 0.8).setStrokeStyle(2, 0x8899aa, 1).setAlpha(0);
        this.mockMcqTxt3 = this.add.text(cx - 90, cy - 60, "গ. ৪", { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0.5).setAlpha(0);
        
        this.mockMcqBtn4 = this.add.rectangle(cx + 90, cy - 60, 160, 50, 0x0e204a, 0.8).setStrokeStyle(2, 0x8899aa, 1).setAlpha(0);
        this.mockMcqTxt4 = this.add.text(cx + 90, cy - 60, "ঘ. ৫", { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0.5).setAlpha(0);

        this.actionContainer.add([
            this.mockPlayer, this.mockEnemy, this.mockBattery, this.mockBullet, 
            this.mockBatteryBg, this.mockBatteryFill, 
            this.mockMcqBg, this.mockMcqText, 
            this.mockMcqBtn1, this.mockMcqTxt1, 
            this.mockMcqBtn2, this.mockMcqTxt2, 
            this.mockMcqBtn3, this.mockMcqTxt3, 
            this.mockMcqBtn4, this.mockMcqTxt4
        ]);

        // Hand Pointer for dragging animation
        this.handPointer = this.add.text(cx, cy - 50, "👆", { fontSize: '60px' }).setOrigin(0.2, 0).setAlpha(0);
        this.actionContainer.add(this.handPointer);

        // 3. Dialogue UI
        const dialogH = 260;
        this.dialogBg = this.add.graphics();
        this.dialogBg.fillStyle(0x000c22, 0.95);
        this.dialogBg.fillRoundedRect(20, h - dialogH - 20, w - 40, dialogH, 20);
        this.dialogBg.lineStyle(4, 0x00aaff, 1);
        this.dialogBg.strokeRoundedRect(20, h - dialogH - 20, w - 40, dialogH, 20);

        this.instructionText = this.add.text(cx, h - dialogH + 60, "", {
            fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#ffffff", 
            align: "center", wordWrap: { width: w - 80 }, lineSpacing: 10
        }).setOrigin(0.5);

        // Next Button
        this.nextBtn = this.add.rectangle(w - 120, h - 70, 160, 60, 0x0066aa).setInteractive({ useHandCursor: true });
        this.nextBtn.setStrokeStyle(3, 0xffffff);
        this.nextTxt = this.add.text(w - 120, h - 70, "পরবর্তী ▶", { fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        this.nextBtn.on('pointerdown', () => this.goToNextStep());

        // Skip Button
        this.skipBtn = this.add.rectangle(w - 100, 60, 140, 50, 0xff3333, 0.8).setInteractive({ useHandCursor: true }).setStrokeStyle(3, 0xffffff);
        this.skipTxt = this.add.text(w - 100, 60, "Skip ✖", { fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        this.skipBtn.on('pointerdown', () => this.endTutorial());

        // Steps Data
        this.steps = [
            { text: "স্বাগতম! গেইম MCQ-তে আপনাকে স্বাগতম।\nআসুন কীভাবে খেলতে হয় তা শিখে নিই।", anim: this.animWelcome.bind(this) },
            { text: "স্ক্রিনে আঙুল দিয়ে ড্র্যাগ করে আপনার স্পেসশিপটি\nডানে বা বামে সরাতে পারবেন।", anim: this.animMove.bind(this) },
            { text: "আপনার পথে আসা শত্রু এবং উল্কা স্বয়ংক্রিয়ভাবে ধ্বংস হবে।\nএরা ধ্বংস হলে ব্যাটারি ড্রপ করবে।", anim: this.animCombat.bind(this) },
            { text: "ব্যাটারি সংগ্রহ করলে আপনার চার্জ বাড়বে।\nচার্জ ১০০% হলে স্ক্রিনে একটি প্রশ্নের পপ-আপ আসবে।", anim: this.animBattery.bind(this) },
            { text: "সঠিক উত্তর দিলে আপনার স্পেসশিপ আপগ্রেড হবে\nএবং নতুন ও শক্তিশালী অস্ত্র পাবেন!", anim: this.animCorrect.bind(this) },
            { text: "ভুল উত্তর দিলে স্পেসশিপ ডাউনগ্রেড হবে বা\nলেভেল কমে যাবে। তাই সাবধানে উত্তর দিন।", anim: this.animWrong.bind(this) },
            { text: "সবকিছু প্রস্তুত!\nএখন মহাশূন্যে পাড়ি দেওয়ার সময়। শুভকামনা!", anim: this.animEnd.bind(this) }
        ];

        this.currentStep = 0;
        this.combatLoopTimer = null; // Reference to kill loop
        this.loadStep();
    }

    update() {
        this.stars.forEach(star => {
            star.y += 2;
            if (star.y > this.cameras.main.height) {
                star.y = 0;
                star.x = Phaser.Math.Between(0, this.cameras.main.width);
            }
        });
    }

    goToNextStep() {
        if (this.currentTween) this.currentTween.stop();
        if (this.combatLoopTimer) this.combatLoopTimer.remove(); // Stop loop if moving on
        
        if (this.currentStep < this.steps.length - 1) {
            if (this.cache.audio.exists('sfx_click')) this.sound.play('sfx_click', { volume: 0.5 });
            this.currentStep++;
            this.loadStep();
        } else {
            this.endTutorial();
        }
    }

    loadStep() {
        const stepData = this.steps[this.currentStep];
        this.instructionText.setText(stepData.text);
        
        // Reset Mock Elements (Hide Everything)
        this.mockPlayer.setPosition(this.cameras.main.centerX, this.cameras.main.centerY - 100).setTexture("player_lv1");
        this.handPointer.setAlpha(0);
        this.mockEnemy.setAlpha(0).clearTint();
        this.mockBattery.setAlpha(0);
        this.mockBullet.setAlpha(0);
        this.mockBatteryBg.setAlpha(0);
        this.mockBatteryFill.setAlpha(0).clear();
        
        this.mockMcqBg.setAlpha(0);
        this.mockMcqText.setAlpha(0);
        
        // Reset MCQ Buttons style to inactive
        const defaultFill = 0x0e204a;
        const defaultStroke = 0x8899aa;
        [this.mockMcqBtn1, this.mockMcqBtn2, this.mockMcqBtn3, this.mockMcqBtn4].forEach(btn => {
            btn.setAlpha(0).setFillStyle(defaultFill, 0.8).setStrokeStyle(2, defaultStroke, 1);
        });
        [this.mockMcqTxt1, this.mockMcqTxt2, this.mockMcqTxt3, this.mockMcqTxt4].forEach(txt => txt.setAlpha(0));

        if (this.currentStep === this.steps.length - 1) {
            this.nextTxt.setText("শুরু করুন!");
            this.nextBtn.setFillStyle(0x00cc44);
        }

        // Run Specific Animation for this step
        stepData.anim();
    }

    animWelcome() {
        this.currentTween = this.tweens.add({
            targets: this.mockPlayer, y: this.mockPlayer.y - 15, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    animMove() {
        const cx = this.cameras.main.centerX;
        this.handPointer.setPosition(cx, this.mockPlayer.y + 50).setAlpha(1);

        this.currentTween = this.tweens.add({
            targets: [this.mockPlayer, this.handPointer],
            x: cx + 150,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    animCombat() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        const runKillLoop = () => {
            if (this.currentStep !== 2) return; // Prevent bleed over

            // Reset positions for a new kill cycle
            this.mockEnemy.setPosition(cx, cy - 350).setAlpha(1).setScale(1.5).clearTint();
            this.mockBullet.setPosition(cx, this.mockPlayer.y - 50).setAlpha(1);
            this.mockBattery.setPosition(cx, cy - 350).setAlpha(0);

            // 1. Shoot bullet
            this.tweens.add({
                targets: this.mockBullet,
                y: this.mockEnemy.y,
                duration: 300,
                onComplete: () => {
                    if (this.currentStep !== 2) return;
                    this.mockBullet.setAlpha(0);
                    if (this.cache.audio.exists('sfx_explode')) this.sound.play('sfx_explode', { volume: 0.3 });
                    
                    // 2. Enemy hit & explode
                    this.mockEnemy.setTint(0xff0000);
                    this.cameras.main.shake(150, 0.015);

                    // Dynamic explosion particles
                    const particles = this.add.particles(this.mockEnemy.x, this.mockEnemy.y, 'engine_flame', {
                        speed: { min: 80, max: 250 },
                        scale: { start: 1.5, end: 0 },
                        alpha: { start: 1, end: 0 },
                        lifespan: 500,
                        quantity: 20,
                        emitting: false
                    });
                    particles.explode();
                    this.time.delayedCall(500, () => particles.destroy());

                    // Scale down enemy and drop battery
                    this.tweens.add({
                        targets: this.mockEnemy, scaleX: 0, scaleY: 0, alpha: 0, duration: 250, 
                        onComplete: () => {
                            if (this.currentStep !== 2) return;
                            
                            this.mockBattery.setAlpha(1);
                            this.tweens.add({
                                targets: this.mockBattery, 
                                y: this.mockPlayer.y, 
                                duration: 800, 
                                onComplete: () => {
                                    if (this.currentStep !== 2) return;
                                    this.mockBattery.setAlpha(0);
                                    if (this.cache.audio.exists('sfx_battery_collect')) this.sound.play('sfx_battery_collect', { volume: 0.4 });
                                    
                                    // Loop sequence
                                    this.combatLoopTimer = this.time.delayedCall(1000, runKillLoop);
                                }
                            });
                        }
                    });
                }
            });
        };

        runKillLoop(); // Start sequence
    }

    animBattery() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        
        this.mockBatteryBg.setAlpha(1);
        this.mockBatteryFill.setAlpha(1);
        this.mockBatteryFill.clear();
        
        // Proxy object to smoothly tween dynamic battery bar percentage
        let progressProxy = { val: 0 };
        
        this.currentTween = this.tweens.add({
            targets: progressProxy,
            val: 100,
            duration: 1500,
            ease: 'Linear',
            onUpdate: () => {
                this.mockBatteryFill.clear();
                let pct = Phaser.Math.Clamp(progressProxy.val / 100, 0, 1);
                
                // Color scaling matching main game
                let color = 0xff3333; // Red
                if (pct > 0.6) color = 0x00ffcc; // Cyan
                else if (pct > 0.3) color = 0xffaa00; // Amber

                this.mockBatteryFill.fillStyle(color, 1);
                // Dynamically expand width based on percentage
                this.mockBatteryFill.fillRoundedRect(cx - 127, cy - 247, 254 * pct, 24, 4);
            },
            onComplete: () => {
                // Hide battery, show MCQ
                this.mockBatteryBg.setAlpha(0);
                this.mockBatteryFill.setAlpha(0);
                
                this.mockMcqBg.setAlpha(1);
                this.mockMcqText.setAlpha(1);
                [this.mockMcqBtn1, this.mockMcqBtn2, this.mockMcqBtn3, this.mockMcqBtn4].forEach(btn => btn.setAlpha(1));
                [this.mockMcqTxt1, this.mockMcqTxt2, this.mockMcqTxt3, this.mockMcqTxt4].forEach(txt => txt.setAlpha(1));
            }
        });
    }

    animCorrect() {
        this.mockMcqBg.setAlpha(1);
        this.mockMcqText.setAlpha(1);
        [this.mockMcqBtn1, this.mockMcqBtn2, this.mockMcqBtn3, this.mockMcqBtn4].forEach(btn => btn.setAlpha(1));
        [this.mockMcqTxt1, this.mockMcqTxt2, this.mockMcqTxt3, this.mockMcqTxt4].forEach(txt => txt.setAlpha(1));

        this.time.delayedCall(800, () => {
            // Highlight Correct Answer (Button 1)
            this.mockMcqBtn1.setFillStyle(0x00aa66, 0.95); 
            this.mockMcqBtn1.setStrokeStyle(2, 0x00ff00, 1);

            if (this.cache.audio.exists('sfx_powerup')) this.sound.play('sfx_powerup', { volume: 0.5 });
            
            this.time.delayedCall(800, () => {
                // Clear UI
                this.mockMcqBg.setAlpha(0); this.mockMcqText.setAlpha(0);
                [this.mockMcqBtn1, this.mockMcqBtn2, this.mockMcqBtn3, this.mockMcqBtn4].forEach(btn => btn.setAlpha(0));
                [this.mockMcqTxt1, this.mockMcqTxt2, this.mockMcqTxt3, this.mockMcqTxt4].forEach(txt => txt.setAlpha(0));
                
                // Upgrade Player Animation
                this.mockPlayer.setTexture("player_lv2");
                this.tweens.add({
                    targets: this.mockPlayer, scale: 1.5, duration: 200, yoyo: true, 
                    onComplete: () => this.mockPlayer.setScale(1.1)
                });
            });
        });
    }

    animWrong() {
        this.mockPlayer.setTexture("player_lv2").setScale(1.1);
        this.mockMcqBg.setAlpha(1);
        this.mockMcqText.setAlpha(1);
        [this.mockMcqBtn1, this.mockMcqBtn2, this.mockMcqBtn3, this.mockMcqBtn4].forEach(btn => btn.setAlpha(1));
        [this.mockMcqTxt1, this.mockMcqTxt2, this.mockMcqTxt3, this.mockMcqTxt4].forEach(txt => txt.setAlpha(1));

        this.time.delayedCall(800, () => {
            // Highlight Wrong Answer (Button 2)
            this.mockMcqBtn2.setFillStyle(0xaa2222, 0.95);
            this.mockMcqBtn2.setStrokeStyle(2, 0xff3333, 1);
            
            // Show Correct Answer simultaneously
            this.mockMcqBtn1.setFillStyle(0x00aa66, 0.95);
            this.mockMcqBtn1.setStrokeStyle(2, 0x00ff00, 1);

            if (this.cache.audio.exists('sfx_q_wrong')) this.sound.play('sfx_q_wrong', { volume: 0.5 });
            
            this.time.delayedCall(800, () => {
                // Clear UI
                this.mockMcqBg.setAlpha(0); this.mockMcqText.setAlpha(0);
                [this.mockMcqBtn1, this.mockMcqBtn2, this.mockMcqBtn3, this.mockMcqBtn4].forEach(btn => btn.setAlpha(0));
                [this.mockMcqTxt1, this.mockMcqTxt2, this.mockMcqTxt3, this.mockMcqTxt4].forEach(txt => txt.setAlpha(0));
                
                // Downgrade Player Animation
                this.mockPlayer.setTexture("player_lv1");
                this.mockPlayer.setTint(0xff0000);
                this.tweens.add({
                    targets: this.mockPlayer, scale: 0.8, duration: 200, yoyo: true, 
                    onComplete: () => {
                        this.mockPlayer.setScale(0.9);
                        this.mockPlayer.clearTint();
                    }
                });
            });
        });
    }

    animEnd() {
        this.mockPlayer.setTexture("player_lv4");
        this.currentTween = this.tweens.add({
            targets: this.mockPlayer, y: this.mockPlayer.y - 30, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    endTutorial() {
        if (this.combatLoopTimer) this.combatLoopTimer.remove();
        if (this.cache.audio.exists('sfx_powerup')) this.sound.play('sfx_powerup', { volume: 0.6 });
        
        localStorage.setItem('tutorial_completed', 'true');
        
        // Transition to GameScene securely
        this.cameras.main.fade(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start("GameScene");
            this.scene.launch("QuestionScene");
        });
    }
}