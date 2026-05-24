class PlayerProfileScene extends Phaser.Scene {
    constructor() {
        super("PlayerProfileScene");
        this.backgroundLayers = [];
    }

    create() {
        const cx = this.cameras.main.centerX;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Ensure Profile Object & Stats exist safely
        if (!GameState.profile) {
            GameState.profile = { n: "GUEST", a: 0, xp: 0, k: 0, bk: 0, qr: 0, qw: 0, s: {} };
        }
        
        // Ensure account creation date exists
        if (!GameState.profile.joined) {
            const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
            GameState.profile.joined = new Date().toLocaleDateString('bn-BD', dateOptions);
            if (window.saveGame) window.saveGame();
        }

        if (typeof GameState.gamesPlayed === 'undefined') {
            GameState.gamesPlayed = 0;
        }

        // Fetch Global Level/Rank Data
        this.lvlData = window.getLevelData();
        this.rankData = window.getRankData(this.lvlData.level);

        // Auto-assign the correct avatar based on level tag
        GameState.profile.a = window.getAvatars().indexOf(this.rankData.avatar);
        if (GameState.profile.a === -1) GameState.profile.a = 0; // fallback

        // --- BACKGROUND ---
        this.createBackground(w, h);

        // --- TOP NAVIGATION ---
        this.createTopUI(w);

        // --- SCENE TITLE ---
        const title = this.add.text(cx, 140, "প্লেয়ার প্রোফাইল", {
            fontSize: "56px", 
            fontFamily: "'Anek Bangla', sans-serif", 
            color: "#00e1ff", 
            fontStyle: "bold",
            padding: { y: 5 },
            stroke: "#000000", 
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 12, fill: true, stroke: true }
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: title, alpha: 1, y: 150, duration: 600, ease: 'Cubic.easeOut' });

        // --- PANEL LAYOUT CONFIGURATION ---
        const panelW = 680;
        
        // 1. Identity Card (Avatar, Name, Rank, Date, XP Progress)
        this.createIdentitySection(cx, 340, panelW, 260);

        // 2. Combat Records Grid (Detailed Game Metrics)
        this.createStatsSection(cx, 710, panelW, 400);

        // 3. Subject Specialization Panel (Top 3 Most Answered)
        this.createMasterySection(cx, 1125, panelW, 350);
    }

    update() {
        if (this.scrollingBg) {
            this.scrollingBg.tilePositionY -= 0.4;
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

    // ========================================================================
    // --- CONTAINER PANELS ---
    // ========================================================================

    createIdentitySection(x, y, w, h) {
        const container = this.add.container(x, y + 40).setAlpha(0);
        this.drawGlassPanel(container, 0, 0, w, h);

        // 1. Interactive Tech Ring & Profile Avatar
        if (!this.textures.exists("profile_ring_clean")) this.generateTechRingClean();
        
        const avatarX = -w / 2 + 130; 
        const avatarY = 0; // Vertically centered
        const baseRingScale = 0.55; // Slightly scaled up
        
        // Avatar Background Base
        const avatarBg = this.add.graphics();
        avatarBg.fillStyle(0x020815, 0.95);
        avatarBg.fillCircle(avatarX, avatarY, 70);
        avatarBg.lineStyle(3, 0x0055aa, 0.8);
        avatarBg.strokeCircle(avatarX, avatarY, 70);

        // Primary clean ring
        const techRing = this.add.image(avatarX, avatarY, "profile_ring_clean").setAlpha(0.8).setScale(baseRingScale);
        techRing.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: techRing, rotation: Math.PI * 2, duration: 35000, repeat: -1, ease: 'Linear' });

        // Counter-rotating inner ring
        const techRingInner = this.add.image(avatarX, avatarY, "profile_ring_clean").setAlpha(0.5).setScale(baseRingScale * 0.82).setTint(0x00ffcc);
        techRingInner.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: techRingInner, rotation: -Math.PI * 2, duration: 25000, repeat: -1, ease: 'Linear' });

        // Avatar Text with drop shadow
        const avatarTxt = this.add.text(avatarX, avatarY, this.rankData.avatar, { 
            fontSize: '70px',
            shadow: { offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.6)', blur: 8 }
        }).setOrigin(0.5);
        this.tweens.add({ targets: avatarTxt, y: avatarY - 4, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // === VERTICAL DIVIDER ===
        const dividerX = avatarX + 120;
        const vertDivider = this.add.rectangle(dividerX, 0, 2, 180, 0x0066aa, 0.5);

        // 2. Y-Coordinates for perfectly balanced right-side text
        const textStartX = dividerX + 30; 
        const nameY = -72;
        const rankY = -30;
        const dateY = 12;
        const barY = 78;

        const nameTxt = this.add.text(textStartX, nameY, GameState.profile.n, {
            fontSize: '40px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold',
            stroke: "#002266", strokeThickness: 5,
            shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0, 0.5);

        // Styled Edit Button 
        const editBtnContainer = this.add.container(textStartX + nameTxt.width + 25, nameY);
        const editBg = this.add.graphics();
        editBg.fillStyle(0x004488, 0.8);
        editBg.fillRoundedRect(0, -14, 70, 28, 14);
        editBg.lineStyle(2, 0x00ffff, 0.8);
        editBg.strokeRoundedRect(0, -14, 70, 28, 14);
        
        const editTxt = this.add.text(35, 0, "✎ EDIT", { 
            fontSize: '14px', fontFamily: "Arial", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0.5);
        
        const editHitArea = this.add.rectangle(35, 0, 70, 28, 0x000000, 0).setInteractive({ useHandCursor: true });
        editBtnContainer.add([editBg, editTxt, editHitArea]);

        this.updateNameDisplay = () => {
             nameTxt.setText(GameState.profile.n);
             editBtnContainer.setX(textStartX + nameTxt.width + 25);
        }

        editHitArea.on('pointerover', () => { editBg.fillStyle(0x0066cc, 1).fillRoundedRect(0, -14, 70, 28, 14); });
        editHitArea.on('pointerout', () => { editBg.fillStyle(0x004488, 0.8).fillRoundedRect(0, -14, 70, 28, 14); });
        editHitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.tweens.add({ targets: editBtnContainer, scale: 0.9, duration: 50, yoyo: true });
            let input = prompt("Enter Commander Name (Max 8 chars):", nameTxt.text);
            if (input !== null) {
                let cleaned = input.trim().substring(0, 8).toUpperCase();
                if (cleaned.length > 0) {
                    GameState.profile.n = cleaned;
                    this.updateNameDisplay();
                    window.saveGame();
                }
            }
        });

        // 3. Rank Tag
        const rankTxt = this.add.text(textStartX, rankY, this.rankData.tag, {
            fontSize: '22px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ffff', fontStyle: 'bold',
            stroke: "#001133", strokeThickness: 4
        }).setOrigin(0, 0.5);

        // 4. Account Creation Date (Neat background pill styling)
        const joinedDate = GameState.profile.joined || "Unknown Date";
        const joinedTxt = this.add.text(textStartX, dateY, ` 📅 যুক্ত হয়েছেন: ${joinedDate} `, {
            fontSize: '15px', 
            fontFamily: "'Anek Bangla', sans-serif", 
            color: '#aaccff', 
            backgroundColor: 'rgba(0, 40, 80, 0.6)', // Subtle pill background
            padding: { x: 5, y: 3 },
            stroke: "#001122",
            strokeThickness: 2
        }).setOrigin(0, 0.5);

        // 5. Experience Progression System
        const barRightPadding = 30;
        const barW = (w / 2) - textStartX - barRightPadding; 
        
        const lvlHeader = this.add.text(textStartX, barY - 22, `লেভেল ${this.lvlData.level}`, {
            fontSize: '20px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        const nextLevelBase = this.lvlData.required + (this.lvlData.xp - this.lvlData.progress);
        const xpText = this.add.text(textStartX + barW, barY - 22, `XP: ${this.lvlData.xp} / ${nextLevelBase}`, {
            fontSize: '18px', fontFamily: "Arial", color: '#aaccff', fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        // Bar Track
        const barBg = this.add.graphics();
        barBg.fillStyle(0x000a1a, 1);
        barBg.fillRoundedRect(textStartX, barY, barW, 16, 8);
        barBg.lineStyle(2, 0x004488, 1);
        barBg.strokeRoundedRect(textStartX, barY, barW, 16, 8);

        // Bar Progress Fill
        const fillW = Math.max(16, barW * this.lvlData.percent);
        const xpFill = this.add.graphics();
        xpFill.fillGradientStyle(0x0055ff, 0x00ffff, 0x001188, 0x0088cc, 1);
        xpFill.fillRoundedRect(textStartX, barY, fillW, 16, 8);

        container.add([avatarBg, techRingInner, techRing, avatarTxt, vertDivider, nameTxt, editBtnContainer, rankTxt, joinedTxt, lvlHeader, xpText, barBg, xpFill]);
        this.tweens.add({ targets: container, y: y, alpha: 1, duration: 600, ease: 'Cubic.easeOut', delay: 100 });
    }

    createStatsSection(x, y, w, h) {
        const container = this.add.container(x, y + 40).setAlpha(0);
        this.drawGlassPanel(container, 0, 0, w, h);

        const title = this.add.text(0, -h / 2 + 35, "পরিসংখ্যান", {
            fontSize: '29px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff', fontStyle: 'bold',
            stroke: "#000000", strokeThickness: 4
        }).setOrigin(0.5);

        const divider = this.add.rectangle(0, -h / 2 + 70, w - 60, 2, 0x0066aa, 0.6);

        // Process Statistical Logs
        const profile = GameState.profile;
        const totalQs = (profile.qr || 0) + (profile.qw || 0);
        const accuracy = totalQs > 0 ? ((profile.qr / totalQs) * 100).toFixed(1) : "0.0";
        const gamesPlayed = GameState.gamesPlayed || 0;
        const avgKills = gamesPlayed > 0 ? (profile.k / gamesPlayed).toFixed(1) : "0.0";

        // Grid Metric Matrix Configuration
        const cols = 2;
        const padX = 20;
        const padY = 20;
        const cardW = (w - 60 - padX) / 2; // (680 - 60 - 20) / 2 = 300
        const cardH = 80; 
        
        const startX = -w / 2 + 30 + cardW / 2; // -340 + 30 + 150 = -160
        const startY = -h / 2 + 130;

        const statData = [
            { label: "সঠিকতার হার (Accuracy)", val: `${accuracy}%`, color: 0x00ffcc },
            { label: "মোট ম্যাচ (Total Matches)", val: gamesPlayed, color: 0xdd88ff },
            { label: "সঠিক উত্তর (Correct Answers)", val: `${profile.qr || 0} / ${totalQs}`, color: 0x00ff88 },
            { label: "গড় নিধন (Kills / Match)", val: avgKills, color: 0xffaa00 },
            { label: "শত্রু ধ্বংস (Total Kills)", val: profile.k || 0, color: 0xff4444 },
            { label: "বস শিকার (Boss Takedowns)", val: profile.bk || 0, color: 0xff33aa }
        ];

        container.add([title, divider]);

        statData.forEach((stat, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const cx = startX + (col * (cardW + padX));
            const cy = startY + (row * (cardH + padY));

            const card = this.createStatCard(cx, cy, cardW, cardH, stat.label, stat.val, stat.color);
            container.add(card);
        });

        this.tweens.add({ targets: container, y: y, alpha: 1, duration: 600, ease: 'Cubic.easeOut', delay: 200 });
    }

    createMasterySection(x, y, w, h) {
        const container = this.add.container(x, y + 40).setAlpha(0);
        this.drawGlassPanel(container, 0, 0, w, h);

        const title = this.add.text(0, -h / 2 + 35, "বিষয়ভিত্তিক তথ্য (Top 3)", {
            fontSize: '29px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff', fontStyle: 'bold',
            stroke: "#000000", strokeThickness: 4
        }).setOrigin(0.5);

        const divider = this.add.rectangle(0, -h / 2 + 70, w - 60, 2, 0x0066aa, 0.6);
        container.add([title, divider]);

        // Filter and compile subject array sorted by total questions answered (right + wrong)
        const subStats = GameState.profile.s || {};
        const sortedSubs = Object.entries(subStats).map(([name, data]) => {
            const r = data.r || 0;
            const w = data.w || 0;
            const total = r + w;
            const acc = total > 0 ? (r / total) : 0;
            return { name, r, total, acc };
        }).sort((a, b) => b.total - a.total).slice(0, 3);

        if (sortedSubs.length === 0) {
            const noData = this.add.text(0, 20, "পর্যাপ্ত যুদ্ধ তথ্য নেই (No mission logs found)", {
                fontSize: '24px', fontFamily: "'Anek Bangla', sans-serif", color: '#5577aa', fontStyle: 'italic'
            }).setOrigin(0.5);
            container.add(noData);
        } else {
            let currY = -h / 2 + 115;
            const barW = w - 80;

            sortedSubs.forEach((sub, i) => {
                const pct = sub.acc * 100;
                const pctText = pct.toFixed(1) + "%";
                
                // Color Code System
                const color = sub.acc >= 0.8 ? 0x00ff88 : (sub.acc >= 0.5 ? 0xffcc00 : 0xff4444);
                const colorStr = "#" + color.toString(16).padStart(6, '0');

                // Subject Identity Typography
                const nameTxt = this.add.text(-barW / 2, currY - 10, `${i + 1}. ${sub.name}`, {
                    fontSize: '24px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold'
                }).setOrigin(0, 0.5);

                const accTxt = this.add.text(barW / 2, currY - 10, pctText, {
                    fontSize: '26px', fontFamily: "Arial", color: colorStr, fontStyle: 'bold',
                    stroke: "#000000", strokeThickness: 3
                }).setOrigin(1, 0.5);

                // Mini Performance Track
                const barBg = this.add.graphics();
                barBg.fillStyle(0x000a1a, 1);
                barBg.fillRoundedRect(-barW / 2, currY + 12, barW, 10, 5);

                const fillW = Math.max(10, barW * sub.acc);
                const barFill = this.add.graphics();
                barFill.fillStyle(color, 1);
                barFill.fillRoundedRect(-barW / 2, currY + 12, fillW, 10, 5);

                const detailTxt = this.add.text(barW / 2, currY + 36, `${sub.r}/${sub.total} Correct`, {
                    fontSize: '16px', fontFamily: "Arial", color: '#88aacc'
                }).setOrigin(1, 0.5);

                container.add([nameTxt, accTxt, barBg, barFill, detailTxt]);
                currY += 80;
            });
        }

        this.tweens.add({ targets: container, y: y, alpha: 1, duration: 600, ease: 'Cubic.easeOut', delay: 300 });
    }

    // ========================================================================
    // --- COMPONENT RENDER HELPER UTILITIES ---
    // ========================================================================

    createStatCard(x, y, w, h, label, val, hexColor) {
        const card = this.add.container(x, y);

        // Panel Surface
        const bg = this.add.graphics();
        bg.fillStyle(0x000a1f, 0.85);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
        
        // Brand Side-Accent Strip
        bg.fillStyle(hexColor, 0.8);
        bg.fillRoundedRect(-w / 2, -h / 2, 8, h, { tl: 12, bl: 12, tr: 0, br: 0 });
        
        // Structure Contour Border
        bg.lineStyle(2, 0x003377, 0.7);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

        // Subtle gradient backing for depth
        const innerGlow = this.add.graphics();
        innerGlow.fillGradientStyle(hexColor, 0x000000, hexColor, 0x000000, 0.1);
        innerGlow.fillRoundedRect(-w / 2 + 8, -h / 2, w - 8, h, { tl: 0, bl: 0, tr: 12, br: 12 });

        // Centered Labels & Values
        const labelTxt = this.add.text(0, -16, label, {
            fontSize: '18px', fontFamily: "'Anek Bangla', sans-serif, Arial", color: '#aaccff', fontStyle: 'bold'
        }).setOrigin(0.5);

        const colorStr = "#" + hexColor.toString(16).padStart(6, '0');
        const valTxt = this.add.text(0, 16, val, {
            fontSize: '34px', fontFamily: "Arial", color: colorStr, fontStyle: 'bold',
            stroke: "#000000", strokeThickness: 3
        }).setOrigin(0.5);

        card.add([bg, innerGlow, labelTxt, valTxt]);
        return card;
    }

    drawGlassPanel(container, x, y, w, h) {
        const graphics = this.add.graphics();
        
        // Depth Shadow Blur Mask
        graphics.fillStyle(0x000000, 0.6);
        graphics.fillRoundedRect(x - w / 2 + 8, y - h / 2 + 8, w, h, 20);

        // Main Frosted Terminal Core Surface
        graphics.fillStyle(0x020816, 0.92);
        graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
        
        // High-Tech Digital Neon Cyber Border
        graphics.lineStyle(3, 0x0066aa, 0.85);
        graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);

        // Secondary Inside Refraction Rim Line
        graphics.lineStyle(1.5, 0x00ffff, 0.25);
        graphics.strokeRoundedRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, 16);

        container.add(graphics);
    }

    createTopUI(w) {
        // --- BACK BUTTON ---
        const backContainer = this.add.container(100, 65);
        
        const backBg = this.add.graphics();
        backBg.fillStyle(0x001122, 0.9);
        backBg.fillRoundedRect(-70, -30, 140, 60, 30);
        backBg.lineStyle(3, 0x0066aa, 0.9);
        backBg.strokeRoundedRect(-70, -30, 140, 60, 30);

        const hitArea = this.add.rectangle(0, 0, 140, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        const backArrow = this.add.text(-35, 0, "◄", { fontSize: "28px", color: "#00ffff" }).setOrigin(0.5);
        const backText = this.add.text(15, 0, "BACK", { 
            fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: "#ffffff" 
        }).setOrigin(0.5);

        backContainer.add([backBg, backArrow, backText, hitArea]);

        hitArea.on('pointerover', () => backBg.lineStyle(3, 0x00ffff, 1).strokeRoundedRect(-70, -30, 140, 60, 30));
        hitArea.on('pointerout', () => backBg.lineStyle(3, 0x0066aa, 0.9).strokeRoundedRect(-70, -30, 140, 60, 30));
        
        hitArea.on('pointerdown', () => {
            this.playSound('sfx_back', 0.8);
            this.tweens.add({
                targets: backContainer, scale: 0.9, duration: 50, yoyo: true,
                onComplete: () => {
                    this.scene.stop();
                    this.scene.resume("MenuScene");
                    const menu = this.scene.get("MenuScene");
                    if (menu && menu.scene) {
                        menu.scene.restart(); 
                    }
                }
            });
        });
    }

    createBackground(w, h) {
        this.add.rectangle(0, 0, w, h, 0x000000, 1).setOrigin(0).setDepth(-110);
        this.backgroundLayers = []; 

        if (!this.textures.exists('animated_bg_grad')) {
            const themeColors = (window.getThemeColors) ? window.getThemeColors() : { bgTop: 0x1A0545, bgBot: 0x003355 };
            const gradBg = this.make.graphics({ x: 0, y: 0 });
            gradBg.fillGradientStyle(themeColors.bgTop, themeColors.bgTop, themeColors.bgBot, themeColors.bgBot, 1);
            gradBg.fillRect(0, 0, 720, 1280);
            gradBg.fillGradientStyle(themeColors.bgBot, themeColors.bgBot, themeColors.bgTop, themeColors.bgTop, 1);
            gradBg.fillRect(0, 1280, 720, 1280);
            gradBg.generateTexture('animated_bg_grad', 720, 2560);
            gradBg.destroy();
        }

        this.scrollingBg = this.add.tileSprite(360, 640, 720, 1280, 'animated_bg_grad').setDepth(-100);

        const neb1 = this.add.circle(200, 150, 280, 0x0033aa, 0.12).setDepth(-99);
        const neb2 = this.add.circle(520, 1050, 320, 0x3b0099, 0.12).setDepth(-99);

        this.tweens.add({
            targets: [neb1, neb2], x: '+=60', y: '-=80', scale: 1.1, alpha: 0.18, duration: 10000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
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

        createLayer(45, 0.3, 0x555588, 1.2, 0.4); 
        createLayer(25, 0.8, 0x88aaff, 1.8, 0.7); 
        createLayer(12, 1.8, 0xffffff, 2.2, 0.95); 
    }

    generateTechRingClean() {
        const ringGraphics = this.make.graphics();
        const size = 320; 
        const radius = size / 2;
        
        ringGraphics.fillStyle(0xffffff, 0); 
        ringGraphics.fillRect(0, 0, size, size);

        // Segment 1: Inner thin data track
        ringGraphics.lineStyle(1.5, 0x00ffff, 0.2);
        ringGraphics.strokeCircle(radius, radius, radius - 20);

        // Segment 2: Bold Structural Arc Dividers
        ringGraphics.lineStyle(4, 0x0088ff, 0.8);
        for (let i = 0; i < 4; i++) {
            const angle = Phaser.Math.DegToRad(i * 90 + 5); 
            ringGraphics.beginPath().arc(radius, radius, radius - 15, angle, angle + 1.2).strokePath();
        }

        ringGraphics.generateTexture("profile_ring_clean", size, size);
        ringGraphics.destroy();
    }

    playSound(key, baseVolume = 1.0) {
        if (this.cache.audio.exists(key)) {
            const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
            this.sound.play(key, { volume: finalVolume });
        }
    }
}