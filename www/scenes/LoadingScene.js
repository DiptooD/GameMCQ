class LoadingScene extends Phaser.Scene {
    constructor() {
        super("LoadingScene");
    }

    preload() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Ensure theme pulls globally
        const themeColors = (window.getThemeColors) ? window.getThemeColors() : { bgTop: 0x020510, bgBot: 0x0a1535 };

        // --- 1. DEEP SPACE BACKGROUND ---
        const gradBg = this.make.graphics({x: 0, y: 0});
        gradBg.fillGradientStyle(themeColors.bgTop, themeColors.bgTop, themeColors.bgBot, themeColors.bgBot, 1);
        gradBg.fillRect(0, 0, 720, 1280);
        gradBg.generateTexture('loading_bg_grad', 720, 1280);
        gradBg.destroy();
        this.add.image(cx, cy, 'loading_bg_grad');

        this.stars = [];
        for (let i = 0; i < 40; i++) {
            let star = this.add.circle(
                Phaser.Math.Between(0, w), 
                Phaser.Math.Between(0, h), 
                Phaser.Math.FloatBetween(1, 2.5), 
                0x00e1ff, 
                Phaser.Math.FloatBetween(0.2, 0.8)
            );
            star.speed = Phaser.Math.FloatBetween(1, 3);
            this.stars.push(star);
        }

        // --- 2. MAIN TITLE ---
        this.add.text(cx, cy - 280, "গেইম MCQ", { 
            fontSize: "85px",
            fontFamily: "'Anek Bangla'", 
            fontWeight: 800, 
            color: "#00e1ff", 
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 10,
            shadow: { offsetX: 4, offsetY: 4, color: "#0044aa", blur: 15, stroke: true, fill: true }
        }).setOrigin(0.5);

        // --- 3. HIGH-TECH REACTOR ---
        const ringGraphics = this.make.graphics();
        ringGraphics.lineStyle(3, 0x005588, 0.5);
        ringGraphics.strokeCircle(100, 100, 80); 
        ringGraphics.lineStyle(6, 0x00e1ff, 1);
        for(let i=0; i<4; i++) {
            ringGraphics.beginPath();
            ringGraphics.arc(100, 100, 95, i * (Math.PI/2) + 0.1, (i+1) * (Math.PI/2) - 0.1);
            ringGraphics.strokePath();
        }
        ringGraphics.generateTexture("loading_tech_ring", 200, 200);
        ringGraphics.destroy();

        this.reactorRing = this.add.image(cx, cy - 60, "loading_tech_ring");
        this.tweens.add({
            targets: this.reactorRing,
            rotation: Math.PI * 2,
            duration: 6000,
            repeat: -1,
            ease: 'Linear'
        });

        this.coreBg = this.add.circle(cx, cy - 60, 45, 0x001133, 1).setStrokeStyle(3, 0x0066aa);
        this.coreGlow = this.add.circle(cx, cy - 60, 30, 0x00ffff, 0.8);
        this.tweens.add({
            targets: this.coreGlow,
            scale: 1.4,
            alpha: 0.2,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // --- 4. GLASSMORPHISM LOADING PANEL ---
        const panelW = 560;
        const panelH = 160;
        const panelX = cx - panelW / 2;
        const panelY = cy + 140;

        const glass = this.add.graphics();
        glass.fillStyle(0x000c22, 0.85); 
        glass.fillRoundedRect(panelX, panelY, panelW, panelH, 20); 
        glass.lineStyle(3, 0x0066aa, 0.8);
        glass.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

        this.barWidth = 480;
        this.barHeight = 20;
        this.barX = cx - this.barWidth / 2;
        this.barY = panelY + 80;

        const bgBar = this.add.graphics();
        bgBar.fillStyle(0x020510, 1);
        bgBar.fillRoundedRect(this.barX, this.barY, this.barWidth, this.barHeight, this.barHeight/2);
        bgBar.lineStyle(2, 0x004488, 1);
        bgBar.strokeRoundedRect(this.barX, this.barY, this.barWidth, this.barHeight, this.barHeight/2);

        this.fillBar = this.add.graphics();

        this.loadText = this.add.text(cx, panelY + 45, "সিস্টেম চালু হচ্ছে... (Booting System)", {
            fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontWeight: 700
        }).setOrigin(0.5);

        this.percentText = this.add.text(cx, this.barY + this.barHeight + 25, "0%", {
            fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#b3d4ff", fontWeight: 700, fontStyle: "bold"
        }).setOrigin(0.5);

        // --- 5. CYCLING TIPS BOX ---
        const tipsW = 560;
        const tipsH = 100;
        const tipsY = panelY + panelH + 70; // Placed perfectly below the loading panel

        const tipsBg = this.add.graphics();
        tipsBg.fillStyle(0x000815, 0.6); 
        tipsBg.fillRoundedRect(cx - tipsW/2, tipsY - tipsH/2, tipsW, tipsH, 16);
        tipsBg.lineStyle(1.5, 0x003355, 0.5);
        tipsBg.strokeRoundedRect(cx - tipsW/2, tipsY - tipsH/2, tipsW, tipsH, 16);

        this.add.text(cx, tipsY - 30, "💡 টিপস", {
            fontSize: "20px", fontFamily: "'Anek Bangla', sans-serif", color: "#00e1ff", fontStyle: "bold"
        }).setOrigin(0.5);

        const loadingTips = [
            "বস ফাইটে প্রশ্নের উত্তর দেওয়ার প্রয়োজন নেই, শুধু আক্রমণ করুন!",
            "বেশি ভাঙ্গারী (Debris) সংগ্রহ করে নতুন রকেট আনলক করুন।",
            "কঠিন প্রশ্নের ক্ষেত্রে 'স্কিপ' (Skip) ব্যবহার করতে ভুলবেন না।",
            "স্পিন হুইল ঘুরিয়ে দারুণ সব পুরস্কার জিতে নিন!",
            "গেমের স্পিড বুস্টার ব্যবহার করে দ্রুত লেভেল পার করুন।",
            "গেমের মাঝপথে বিরতি নিতে ওপরের ডানদিকের পজ বাটনে ক্লিক করুন।",
            "'Fire Shield' বুস্টার ব্যবহার করলে আপনি যেকোনো সংঘর্ষ থেকে রক্ষা পাবেন।",
            "সঠিক উত্তর দিলে আপনার জাহাজের অস্ত্রের ক্ষমতা বা লেভেল বেড়ে যায়!",
            "ভুল উত্তর দিলে আপনার অস্ত্রের লেভেল কমে যাবে, তাই সাবধানে উত্তর দিন।"
        ];
        
        let currentTipIndex = 0;
        
        this.loadingTipTextObj = this.add.text(cx, tipsY + 10, loadingTips[currentTipIndex], {
            fontSize: "22px", 
            fontFamily: "'Anek Bangla', sans-serif", 
            color: "#e0f0ff", 
            align: "center", 
            wordWrap: { width: tipsW - 40 },
            shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);

        this.time.addEvent({
            delay: 4000,
            loop: true,
            callback: () => {
                currentTipIndex = (currentTipIndex + 1) % loadingTips.length;
                
                this.tweens.add({
                    targets: this.loadingTipTextObj, alpha: 0, y: tipsY, duration: 250, ease: 'Cubic.easeIn',
                    onComplete: () => {
                        this.loadingTipTextObj.setText(loadingTips[currentTipIndex]);
                        this.loadingTipTextObj.y = tipsY + 20; 
                        
                        this.tweens.add({ 
                            targets: this.loadingTipTextObj, alpha: 1, y: tipsY + 10, duration: 350, ease: 'Cubic.easeOut' 
                        });
                    }
                });
            }
        });

        // --- 6. LOAD PROCESS ---
        this.load.on('progress', (value) => {
            this.updateBar(value * 0.5);
        });

        this.load.json('bank_directory', 'bank_directory.json');
        this.load.audio('bg_music', 'bgm.mp3');
        this.load.audio('menubgm', 'menubgm.mp3');
    }

    updateBar(value) {
        this.fillBar.clear();
        this.fillBar.fillGradientStyle(0x0066aa, 0x00e1ff, 0x0066aa, 0x00e1ff, 1);
        this.fillBar.fillRoundedRect(this.barX, this.barY, this.barWidth * value, this.barHeight, this.barHeight/2);
        this.percentText.setText(parseInt(value * 100) + "%");
    }

    create() {
        const manifest = this.cache.json.get('bank_directory');
        if (manifest && manifest.banks) {
            this.loadText.setText("ডেটাবেস সংযুক্ত হচ্ছে... (Linking DB)");
            
            let needsLoad = false;
            manifest.banks.forEach(bank => {
                if (!this.cache.json.exists(bank.key)) {
                    this.load.json(bank.key, bank.url);
                    needsLoad = true;
                }
            });

            if (needsLoad) {
                this.load.on('progress', (value) => {
                    this.updateBar(0.5 + (value * 0.5));
                });
                
                this.load.once('complete', () => this.finishLoading());
                this.load.start();
            } else {
                this.updateBar(1.0);
                this.finishLoading();
            }
        } else {
            this.updateBar(1.0);
            this.finishLoading();
        }

        this.input.once('pointerdown', () => {
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        });
    }

    update() {
        const h = this.cameras.main.height;
        for (let i = 0; i < this.stars.length; i++) {
            let star = this.stars[i];
            star.y += star.speed;
            if (star.y > h) {
                star.y = -10;
                star.x = Phaser.Math.Between(0, this.cameras.main.width);
            }
        }
    }

    finishLoading() {
        this.loadText.setText("প্রস্তুত (Ready)");
        this.percentText.setText("100%");
        
        this.tweens.add({
            targets: this.coreGlow,
            scale: 2.5,
            alpha: 1,
            duration: 300,
            yoyo: true
        });

        this.tweens.add({
            targets: this.cameras.main,
            alpha: 0,
            duration: 500,
            delay: 400, 
            onComplete: () => {
                if (this.tipTimerEvent) this.tipTimerEvent.remove(); // Cleanup timer
                this.scene.start("MenuScene");
            }
        });
    }
}