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

        // Ensure Profile Object
        if (!GameState.profile) {
            GameState.profile = { n: "GUEST", a: 0, xp: 0, k: 0, bk: 0, qr: 0, qw: 0, s: {} };
        }

        // Fetch Global Level/Rank Data
        const lvlData = window.getLevelData();
        const rankData = window.getRankData(lvlData.level);

        // Auto-assign the correct avatar based on level tag
        GameState.profile.a = window.getAvatars().indexOf(rankData.avatar);
        if (GameState.profile.a === -1) GameState.profile.a = 0; // fallback

        // --- BACKGROUND (FULLY OPAQUE NOW) ---
        this.createBackground();

        // --- TOP NAVIGATION UI ---
        this.createTopUI();

        // Scene Title
        const title = this.add.text(cx, 160, "কমান্ডার প্রোফাইল", {
            fontSize: "68px", fontFamily: "'Anek Bangla', sans-serif", color: "#00e1ff", fontStyle: "bold",
            stroke: "#000000", strokeThickness: 10,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 15, fill: true, stroke: true }
        }).setOrigin(0.5);

        // Panel dimensions
        const panelW = 660;
        
        // --- PANEL 1: IDENTITY & RANK ---
        const p1Y = 400;
        const p1H = 360;
        this.drawGlassPanel(cx, p1Y, panelW, p1H);

        // Tech Ring Behind Avatar (Enhanced)
        if (!this.textures.exists("profile_ring_new")) {
            this.generateTechRingNew();
        }
        this.techRing = this.add.image(cx, p1Y - 80, "profile_ring_new").setAlpha(0.7);
        this.tweens.add({
            targets: this.techRing, rotation: Math.PI * 2, duration: 12000, repeat: -1, ease: 'Linear'
        });

        // The Auto-assigned Rank Avatar (Floating)
        this.avatarTxt = this.add.text(cx, p1Y - 80, rankData.avatar, {fontSize: '110px'}).setOrigin(0.5);
        this.tweens.add({
            targets: this.avatarTxt,
            y: this.avatarTxt.y - 12,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // The Profile Tag (Rank String) with glow
        this.add.text(cx, p1Y + 15, rankData.tag, {
            fontSize: '26px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ffff', fontStyle: 'bold',
            stroke: "#001133", strokeThickness: 4,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Name and Edit Button
        const playerName = GameState.profile.n;
        this.nameTxt = this.add.text(cx, p1Y + 65, playerName, {
            fontSize: '48px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold',
            stroke: "#0033aa", strokeThickness: 5
        }).setOrigin(0.5);
        
        const editBtn = this.add.text(cx + this.nameTxt.width/2 + 40, p1Y + 65, "✏️", {fontSize: '28px'})
            .setOrigin(0.5).setInteractive({useHandCursor: true});
        
        editBtn.on('pointerdown', () => {
            if (this.sound.get('sfx_click')) this.sound.play('sfx_click');
            let input = prompt("Enter Commander Name (Max 6 chars):", this.nameTxt.text);
            if (input !== null) {
                let cleaned = input.trim().substring(0, 6).toUpperCase();
                if (cleaned.length > 0) {
                    GameState.profile.n = cleaned;
                    this.nameTxt.setText(cleaned);
                    editBtn.setX(cx + this.nameTxt.width/2 + 40); 
                    window.saveGame();
                }
            }
        });

        // Glowing High-Tech XP Bar (Enhanced and polished)
        const barY = p1Y + 135;
        this.add.text(cx - 280, barY - 20, `লেভেল ${lvlData.level}`, {
            fontSize: '22px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        this.add.text(cx + 280, barY - 20, `XP: ${lvlData.xp} / ${lvlData.required + (lvlData.xp - lvlData.progress)}`, {
            fontSize: '20px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff'
        }).setOrigin(1, 0.5);
        
        const barW = 560;
        this.add.rectangle(cx, barY + 10, barW, 20, 0x000c22).setOrigin(0.5).setStrokeStyle(2, 0x0066aa);
        const fillW = Math.max(10, barW * lvlData.percent);
        
        const xpFill = this.add.graphics();
        xpFill.fillGradientStyle(0x0044aa, 0x0088ff, 0x002288, 0x0066cc, 1);
        xpFill.fillRect(cx - barW/2, barY, fillW, 20);
        
        const glowTip = this.add.rectangle(cx - barW/2 + fillW, barY + 10, 6, 28, 0xffffff).setOrigin(0.5); // glowing tip
        this.tweens.add({
            targets: glowTip, alpha: 0.5, duration: 800, yoyo: true, repeat: -1
        });

        // --- PANEL 2: COMBAT STATISTICS (More structured, clearer headers) ---
        const p2Y = 790;
        const p2H = 320;
        this.drawGlassPanel(cx, p2Y, panelW, p2H);
        
        this.add.text(cx, p2Y - 120, "যুদ্ধ পরিসংখ্যান", {
            fontSize: '32px', fontFamily: "'Anek Bangla', sans-serif", color: '#aaccff', fontStyle: 'bold',
             stroke: "#000000", strokeThickness: 5
        }).setOrigin(0.5);

        const kills = GameState.profile.k;
        const bossKills = GameState.profile.bk;
        const qr = GameState.profile.qr;
        const qw = GameState.profile.qw;
        const acc = (qr + qw) > 0 ? ((qr / (qr + qw)) * 100).toFixed(1) : 0;

        // 2x2 Grid of polished stat cards
        this.createStatCardNew(cx - 150, p2Y - 30, 280, 80, "শত্রু নিহত", kills, 0xff3333, 0x330000);
        this.createStatCardNew(cx + 150, p2Y - 30, 280, 80, "বস নিহত", bossKills, 0xffcc00, 0x332200);
        this.createStatCardNew(cx - 150, p2Y + 70, 280, 80, "সঠিক উত্তর", qr, 0x00ff88, 0x003311);
        this.createStatCardNew(cx + 150, p2Y + 70, 280, 80, "সঠিকের হার", `${acc}%`, 0x00ccff, 0x002244);

        // --- PANEL 3: TOP SUBJECTS (Clearer layout, consistent design) ---
        const p3Y = 1130;
        const p3H = 280;
        this.drawGlassPanel(cx, p3Y, panelW, p3H);
        
        this.add.text(cx, p3Y - 100, "দক্ষতা (Proficiency)", {
            fontSize: '32px', fontFamily: "'Anek Bangla', sans-serif", color: '#aaccff', fontStyle: 'bold',
             stroke: "#000000", strokeThickness: 5
        }).setOrigin(0.5);
        
        const subStats = GameState.profile.s || {};
        const sortedSubs = Object.entries(subStats)
            .sort((a,b) => (b[1].r + b[1].w) - (a[1].r + a[1].w))
            .slice(0, 3);

        if (sortedSubs.length === 0) {
            this.add.text(cx, p3Y + 20, "পর্যাপ্ত তথ্য নেই", {
                fontSize: '26px', fontFamily: "'Anek Bangla', sans-serif", color: '#666666'
            }).setOrigin(0.5);
        } else {
            let currY = p3Y - 30;
            sortedSubs.forEach((sub, i) => {
                const name = sub[0];
                const r = sub[1].r;
                const w = sub[1].w;
                const total = r + w;
                const pct = (total > 0) ? ((r / total)*100).toFixed(1) : 0;
                
                this.add.text(cx - 280, currY, `${i+1}. ${name}`, {
                    fontSize: '24px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold'
                }).setOrigin(0, 0.5);
                
                this.add.text(cx + 280, currY, `${pct}%`, {
                    fontSize: '24px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ff00', fontStyle: 'bold'
                }).setOrigin(1, 0.5);
                
                const bW = 560;
                this.add.rectangle(cx, currY + 25, bW, 8, 0x000c22).setOrigin(0.5).setStrokeStyle(1, 0x004488);
                const profFillW = total > 0 ? bW * (r / total) : 0;
                this.add.rectangle(cx - bW/2, currY + 25, profFillW, 8, 0x00ff00).setOrigin(0, 0.5);
                
                currY += 65;
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
        backBg.fillStyle(0x001122, 0.9);
        backBg.fillRoundedRect(-70, -30, 140, 60, 30);
        backBg.lineStyle(3, 0x0066aa, 1);
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
                    if (menu && menu.createProfileAndSettings) menu.createProfileAndSettings(); 
                }
            });
        });
    }

    createBackground() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // OPAQUE BACKGROUND LAYER to block scene below
        this.add.rectangle(0, 0, w, h, 0x000000, 1).setOrigin(0).setDepth(-110);

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

        const neb1 = this.add.circle(250, 100, 250, 0x0044aa, 0.15).setDepth(-99);
        const neb2 = this.add.circle(550, 1100, 300, 0x4400aa, 0.15).setDepth(-99);

        this.tweens.add({
            targets: [neb1, neb2], x: 650, y: 750, scale: 1.15, alpha: 0.2, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
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
        
        // Shadow underneath for lift
        graphics.fillStyle(0x000000, 0.4);
        graphics.fillRoundedRect(x - w/2 + 6, y - h/2 + 6, w, h, 24);

        // Glass background (more opaque for clarity)
        graphics.fillStyle(0x000c22, 0.92);
        graphics.fillRoundedRect(x - w/2, y - h/2, w, h, 24);
        
        // Outer border
        graphics.lineStyle(4, 0x0066aa, 1);
        graphics.strokeRoundedRect(x - w/2, y - h/2, w, h, 24);

        // Inner highlight edge for better glass effect
        graphics.lineStyle(2, 0x00ccff, 0.6);
        graphics.strokeRoundedRect(x - w/2 + 4, y - h/2 + 4, w - 8, h - 8, 20);
    }

    createStatCardNew(x, y, w, h, label, val, colorHex, bgColorHex) {
        const bg = this.add.graphics();
        // Solid background, subtle border
        bg.fillStyle(0x000511, 1);
        bg.fillRoundedRect(x - w/2, y - h/2, w, h, 16);
        bg.fillStyle(bgColorHex, 0.2); // subtle tint
        bg.fillRoundedRect(x - w/2, y - h/2, w, h, 16);
        bg.lineStyle(2, colorHex, 0.6); // slight transparency on border
        bg.strokeRoundedRect(x - w/2, y - h/2, w, h, 16);
        
        const colorStr = "#" + colorHex.toString(16).padStart(6, '0');

        this.add.text(x - w/2 + 25, y, label, {
            fontSize: '24px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        this.add.text(x + w/2 - 25, y, val, {
            fontSize: '38px', fontFamily: "Arial", color: colorStr, fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: colorStr, blur: 10, fill: true }
        }).setOrigin(1, 0.5);
    }

    generateTechRingNew() {
        const ringGraphics = this.make.graphics();
        const size = 240;
        const radius = size / 2;
        
        ringGraphics.lineStyle(4, 0x00ffff, 0.4);
        ringGraphics.strokeCircle(radius, radius, radius - 5); 
        
        ringGraphics.lineStyle(3, 0x0088ff, 1);
        for(let i=0; i<12; i++) {
            const angle = Phaser.Math.DegToRad(i * 30);
            ringGraphics.beginPath();
            ringGraphics.arc(radius, radius, radius - 15, angle, angle + 0.3);
            ringGraphics.strokePath();
        }

        ringGraphics.lineStyle(2, 0xffffff, 0.7);
        for(let i=0; i<4; i++) {
             const angle = Phaser.Math.DegToRad(i * 90 + 45);
             ringGraphics.beginPath();
             ringGraphics.arc(radius, radius, radius - 25, angle, angle + 0.1);
             ringGraphics.strokePath();
        }

        ringGraphics.generateTexture("profile_ring_new", size, size);
        ringGraphics.destroy();
    }
}