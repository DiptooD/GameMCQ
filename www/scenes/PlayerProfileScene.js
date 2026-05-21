class PlayerProfileScene extends Phaser.Scene {
    constructor() {
        super("PlayerProfileScene");
        this.backgroundLayers = [];
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // --- BACKGROUND ---
        this.createBackground();

        // --- TOP NAVIGATION UI ---
        this.createTopUI();

        const title = this.add.text(cx, 160, "প্রোফাইল", {
            fontSize: "64px", fontFamily: "'Anek Bangla', sans-serif", color: "#00e1ff", fontStyle: "bold",
            stroke: "#000000", strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 15, fill: true, stroke: true }
        }).setOrigin(0.5);

        // Define panel boundaries
        const panelW = 660;
        
        // --- PANEL 1: IDENTITY (Avatar, Name, XP) ---
        const p1Y = 400;
        const p1H = 320;
        this.drawGlassPanel(cx, p1Y, panelW, p1H);

        this.avatars = window.getAvatars();
        this.currentAvatarIdx = (GameState.profile && GameState.profile.a) ? GameState.profile.a : 0;
        
        // Tech Ring Behind Avatar
        if (!this.textures.exists("profile_ring")) {
            this.generateTechRing();
        }
        this.techRing = this.add.image(cx, p1Y - 40, "profile_ring").setAlpha(0.6);
        this.tweens.add({
            targets: this.techRing, rotation: Math.PI * 2, duration: 15000, repeat: -1, ease: 'Linear'
        });

        this.avatarTxt = this.add.text(cx, p1Y - 40, this.avatars[this.currentAvatarIdx], {fontSize: '90px'}).setOrigin(0.5);

        // Arrows to change avatar
        const leftArr = this.add.text(cx - 120, p1Y - 40, "◄", {fontSize: '40px', color: '#00ffff'}).setOrigin(0.5).setInteractive({useHandCursor: true});
        const rightArr = this.add.text(cx + 120, p1Y - 40, "►", {fontSize: '40px', color: '#00ffff'}).setOrigin(0.5).setInteractive({useHandCursor: true});
        
        leftArr.on('pointerdown', () => { this.changeAvatar(-1); });
        rightArr.on('pointerdown', () => { this.changeAvatar(1); });
        [leftArr, rightArr].forEach(arr => {
            arr.on('pointerover', () => arr.setColor('#ffffff'));
            arr.on('pointerout', () => arr.setColor('#00ffff'));
        });

        // Name and Edit Button
        const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "GUEST";
        this.nameTxt = this.add.text(cx, p1Y + 50, playerName, {
            fontSize: '40px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold',
            stroke: "#0033aa", strokeThickness: 4
        }).setOrigin(0.5);
        
        const editBtn = this.add.text(cx + this.nameTxt.width/2 + 35, p1Y + 50, "✏️", {fontSize: '26px'})
            .setOrigin(0.5).setInteractive({useHandCursor: true});
        
        editBtn.on('pointerdown', () => {
            this.sound.play('sfx_click');
            let input = prompt("Enter Player Name (Max 5 chars):", this.nameTxt.text);
            if (input !== null) {
                let cleaned = input.trim().substring(0, 5).toUpperCase();
                if (cleaned.length > 0) {
                    GameState.profile.n = cleaned;
                    this.nameTxt.setText(cleaned);
                    editBtn.setX(cx + this.nameTxt.width/2 + 35); // Re-align
                    window.saveGame();
                }
            }
        });

        // XP Bar
        const lvlData = window.getLevelData();
        const barY = p1Y + 115;
        this.add.text(cx - 280, barY - 20, `লেভেল ${lvlData.level}`, {
            fontSize: '20px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ffff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        this.add.text(cx + 280, barY - 20, `XP: ${lvlData.xp} / ${lvlData.required + (lvlData.xp - lvlData.progress)}`, {
            fontSize: '18px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ffff'
        }).setOrigin(1, 0.5);
        
        const barW = 560;
        this.add.rectangle(cx, barY + 10, barW, 14, 0x000c22).setOrigin(0.5).setStrokeStyle(2, 0x0066aa);
        this.add.rectangle(cx - barW/2, barY + 10, barW * lvlData.percent, 14, 0x00ffff).setOrigin(0, 0.5);

        // --- PANEL 2: STATS ---
        const p2Y = 740;
        const p2H = 300;
        this.drawGlassPanel(cx, p2Y, panelW, p2H);
        
        this.add.text(cx, p2Y - 110, "পরিসংখ্যান (Statistics)", {
            fontSize: '28px', fontFamily: "'Anek Bangla', sans-serif", color: '#aaccff', fontStyle: 'bold'
        }).setOrigin(0.5);

        const kills = (GameState.profile && GameState.profile.k) ? GameState.profile.k : 0;
        const bossKills = (GameState.profile && GameState.profile.bk) ? GameState.profile.bk : 0;
        const qr = (GameState.profile && GameState.profile.qr) ? GameState.profile.qr : 0;
        const qw = (GameState.profile && GameState.profile.qw) ? GameState.profile.qw : 0;
        const acc = (qr + qw) > 0 ? ((qr / (qr + qw)) * 100).toFixed(1) : 0;

        // 2x2 Grid of small cards
        this.createStatCard(cx - 150, p2Y - 20, 280, 80, "শত্রু নিহত", kills, 0xff0000, 0x440000);
        this.createStatCard(cx + 150, p2Y - 20, 280, 80, "বস নিহত", bossKills, 0xffaa00, 0x442200);
        this.createStatCard(cx - 150, p2Y + 80, 280, 80, "সঠিক উত্তর", qr, 0x00ff00, 0x004400);
        this.createStatCard(cx + 150, p2Y + 80, 280, 80, "সঠিকের হার", `${acc}%`, 0x00ffff, 0x004444);

        // --- PANEL 3: TOP SUBJECTS ---
        const p3Y = 1080;
        const p3H = 320;
        this.drawGlassPanel(cx, p3Y, panelW, p3H);
        
        this.add.text(cx, p3Y - 120, "শীর্ষ বিষয়সমূহ (Top Subjects)", {
            fontSize: '28px', fontFamily: "'Anek Bangla', sans-serif", color: '#aaccff', fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const subStats = (GameState.profile && GameState.profile.s) ? GameState.profile.s : {};
        const sortedSubs = Object.entries(subStats)
            .sort((a,b) => (b[1].r + b[1].w) - (a[1].r + a[1].w))
            .slice(0, 3);

        if (sortedSubs.length === 0) {
            this.add.text(cx, p3Y + 20, "পর্যাপ্ত তথ্য নেই", {
                fontSize: '24px', fontFamily: "'Anek Bangla', sans-serif", color: '#666666'
            }).setOrigin(0.5);
        } else {
            let currY = p3Y - 40;
            sortedSubs.forEach((sub, i) => {
                const name = sub[0];
                const r = sub[1].r;
                const w = sub[1].w;
                const pct = ((r / (r+w))*100).toFixed(1);
                
                this.add.text(cx - 280, currY, `${i+1}. ${name}`, {
                    fontSize: '22px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff'
                }).setOrigin(0, 0.5);
                
                this.add.text(cx + 280, currY, `${pct}%`, {
                    fontSize: '22px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ff00', fontStyle: 'bold'
                }).setOrigin(1, 0.5);
                
                const bW = 560;
                this.add.rectangle(cx, currY + 25, bW, 6, 0x000c22).setOrigin(0.5).setStrokeStyle(1, 0x004488);
                this.add.rectangle(cx - bW/2, currY + 25, bW * (r / (r+w)), 6, 0x00ff00).setOrigin(0, 0.5);
                
                currY += 75;
            });
        }
    }

    update() {
        if (this.scrollingBg) {
            this.scrollingBg.tilePositionY -= 0.6;
        }

        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                layer.group.children.iterate(star => {
                    if (star) {
                        star.y += layer.speed;
                        if (star.y > this.cameras.main.height) {
                            star.y = -10;
                            star.x = Phaser.Math.Between(0, 720);
                        }
                    }
                });
            });
        }
    }

    // --- HELPER FUNCTIONS ---

    createTopUI() {
        const backContainer = this.add.container(100, 65);
        
        const backBg = this.add.graphics();
        backBg.fillStyle(0x001122, 0.8);
        backBg.fillRoundedRect(-70, -30, 140, 60, 30);
        backBg.lineStyle(3, 0x0066aa, 0.9);
        backBg.strokeRoundedRect(-70, -30, 140, 60, 30);

        const hitArea = this.add.rectangle(0, 0, 140, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        const backArrow = this.add.text(-35, 0, "◄", { fontSize: "28px", color: "#00ffff" }).setOrigin(0.5);
        const backText = this.add.text(15, 0, "BACK", { 
            fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: "#ffffff" 
        }).setOrigin(0.5);

        backContainer.add([backBg, backArrow, backText, hitArea]);

        hitArea.on('pointerdown', () => {
            if (this.sound.get('sfx_back')) this.sound.play('sfx_back');
            this.tweens.add({
                targets: backContainer, scale: 0.9, duration: 50, yoyo: true,
                onComplete: () => {
                    this.scene.stop();
                    this.scene.resume("MenuScene");
                    const menu = this.scene.get("MenuScene");
                    if (menu) menu.scene.restart(); // Refreshes the top icon
                }
            });
        });
    }

    createBackground() {
        this.backgroundLayers = []; 
        if (!this.textures.exists('animated_bg_grad')) {
            const themeColors = (window.getThemeColors) ? window.getThemeColors() : { bgTop: 0x1A0545, bgBot: 0x003355 };
            
            const gradBg = this.make.graphics({x: 0, y: 0});
            gradBg.fillGradientStyle(themeColors.bgTop, themeColors.bgTop, themeColors.bgBot, themeColors.bgBot, 1);
            gradBg.fillRect(0, 0, 720, 1280);
            gradBg.fillGradientStyle(themeColors.bgBot, themeColors.bgBot, themeColors.bgTop, themeColors.bgTop, 1);
            gradBg.fillRect(0, 1280, 720, 1280);
            
            gradBg.generateTexture('animated_bg_grad', 720, 2560);
            gradBg.destroy();
        }

        this.scrollingBg = this.add.tileSprite(360, 640, 720, 1280, 'animated_bg_grad').setDepth(-100);

        const neb1 = this.add.circle(250, 100, 250, 0x0044aa, 0.1).setDepth(-99);
        const neb2 = this.add.circle(550, 1100, 300, 0x4400aa, 0.1).setDepth(-99);

        this.tweens.add({
            targets: [neb1, neb2], x: 650, y: 750, scale: 1.15, alpha: 0.15, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        
        const createLayer = (count, speed, color, size, alpha = 1) => {
            const group = this.add.group();
            for (let i = 0; i < count; i++) {
                const x = Phaser.Math.Between(0, 720);
                const y = Phaser.Math.Between(0, 1280);
                const star = this.add.circle(x, y, size, color, alpha).setDepth(-98);
                group.add(star);
            }
            this.backgroundLayers.push({ group: group, speed: speed });
        };

        createLayer(50, 0.4, 0x555588, 1.5, 0.5); 
        createLayer(30, 1.0, 0x88aaff, 2, 0.8); 
        createLayer(15, 2.2, 0xffffff, 2.5, 1); 
    }

    drawGlassPanel(x, y, w, h) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000c22, 0.8);
        graphics.fillRoundedRect(x - w/2, y - h/2, w, h, 20);
        graphics.lineStyle(3, 0x0066aa, 0.8);
        graphics.strokeRoundedRect(x - w/2, y - h/2, w, h, 20);
    }

    createStatCard(x, y, w, h, label, val, colorHex, bgColorHex) {
        const bg = this.add.graphics();
        bg.fillStyle(bgColorHex, 0.8);
        bg.fillRoundedRect(x - w/2, y - h/2, w, h, 12);
        bg.lineStyle(2, colorHex, 0.7);
        bg.strokeRoundedRect(x - w/2, y - h/2, w, h, 12);
        
        const colorStr = "#" + colorHex.toString(16).padStart(6, '0');

        this.add.text(x - w/2 + 20, y, label, {
            fontSize: '22px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.add.text(x + w/2 - 20, y, val, {
            fontSize: '32px', fontFamily: "Arial", color: colorStr, fontStyle: 'bold'
        }).setOrigin(1, 0.5);
    }

    generateTechRing() {
        const ringGraphics = this.make.graphics();
        ringGraphics.lineStyle(4, 0x00ffff, 0.5);
        ringGraphics.strokeCircle(100, 100, 95); 
        ringGraphics.lineStyle(3, 0x0088ff, 0.8);
        for(let i=0; i<8; i++) {
            const angle = Phaser.Math.DegToRad(i * 45);
            ringGraphics.beginPath();
            ringGraphics.arc(100, 100, 85, angle, angle + 0.4);
            ringGraphics.strokePath();
        }
        ringGraphics.generateTexture("profile_ring", 200, 200);
        ringGraphics.destroy();
    }

    changeAvatar(dir) {
        if (this.sound.get('sfx_click')) this.sound.play('sfx_click');
        this.currentAvatarIdx += dir;
        if (this.currentAvatarIdx < 0) this.currentAvatarIdx = this.avatars.length - 1;
        if (this.currentAvatarIdx >= this.avatars.length) this.currentAvatarIdx = 0;
        
        GameState.profile.a = this.currentAvatarIdx;
        this.avatarTxt.setText(this.avatars[this.currentAvatarIdx]);
        
        this.tweens.add({ targets: this.avatarTxt, scale: 1.2, duration: 80, yoyo: true });
        window.saveGame();
    }
}