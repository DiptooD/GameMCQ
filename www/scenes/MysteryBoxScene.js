class MysteryBoxScene extends Phaser.Scene {
    constructor() {
        super("MysteryBoxScene");
        this.backgroundLayers = [];
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const cx = w / 2;
        const cy = h / 2;

        if (typeof GameSFX !== 'undefined') GameSFX.init(this);

        // --- NEW: Add Dynamic Space Background ---
        this.createBackground();

        // --- NEW: Background Music Management ---
        let menuMusic = this.sound.get('menubgm');
        const targetMusicVol = (window.GameState && window.GameState.musicVolume !== undefined) ? window.GameState.musicVolume : 0.5;

        if (!menuMusic) {
            menuMusic = this.sound.add('menubgm', { loop: true, volume: targetMusicVol });
            menuMusic.play();
        } else {
            menuMusic.setVolume(targetMusicVol);
            if (!menuMusic.isPlaying) {
                menuMusic.play();
            }
        }

        // --- NEW: Top Right Currency Display ---
        this.createCurrencyUI();

        const title = this.add.text(cx, cy - 350, "মিস্টি বক্স (MYSTERY BOX)", {
            fontSize: "48px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold",
            stroke: "#000000", strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 10, fill: true, stroke: true }
        }).setOrigin(0.5);

        this.tweens.add({ targets: title, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });

        const allSkins = window.SpecialItemsRegistry ? (window.SpecialItemsRegistry.items || []) : [];
        if (allSkins.length === 0) {
            this.add.text(cx, cy, "No items available!", { fontSize: "32px", color: "#ff0000" }).setOrigin(0.5);
            this.time.delayedCall(2000, () => this.scene.start("MenuScene"));
            return;
        }

        const rarityConfig = {
            "Common": { weight: 50, color: 0xaaccff, hex: "#aaccff" },
            "Epic": { weight: 20, color: 0xcc00ff, hex: "#cc00ff" },
            "Legendary": { weight: 8, color: 0xffaa00, hex: "#ffaa00" },
            "Mythic": { weight: 2, color: 0xff0044, hex: "#ff0044" }
        };

        const weightedItems = allSkins.map(item => {
            const config = rarityConfig[item.rarity] || rarityConfig["Common"];
            return { ...item, weight: config.weight, colorNum: config.color, colorHex: config.hex };
        });

        const getWeightedRandomItem = () => {
            let totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
            let randomNum = Math.random() * totalWeight;
            for (let item of weightedItems) {
                if (randomNum < item.weight) return item;
                randomNum -= item.weight;
            }
            return weightedItems[0];
        };

        // --- VERTICAL SCROLLING CONSTANTS ---
        const itemHeight = 180;
        const cardW = 260;
        const cardH = 160;
        const totalItemsInSpin = 65; 
        const winningIndex = 55;

        this.spinSequence = [];
        for (let i = 0; i < totalItemsInSpin; i++) {
            this.spinSequence.push(getWeightedRandomItem());
        }
        
        const winningItem = this.spinSequence[winningIndex];

        this.stripContainer = this.add.container(cx, cy);

        // Vertical Clipping Mask
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(cx - (cardW * 0.8), cy - (itemHeight * 1.8), cardW * 1.6, itemHeight * 3.6);
        const mask = maskShape.createGeometryMask();
        this.stripContainer.setMask(mask);

        // Add Vertical Elements
        for (let i = 0; i < totalItemsInSpin; i++) {
            let item = this.spinSequence[i];
            let yPos = (i * itemHeight);
            
            let card = this.createItemCard(0, yPos, cardW, cardH, item);
            this.stripContainer.add(card);
        }

        // Center Selection Guidelines
        this.add.rectangle(cx, cy, cardW + 40, 6, 0xffffff, 0.8).setDepth(10); 
        this.add.triangle(cx - (cardW / 2) - 25, cy, 0, 0, 0, 30, 20, 15, 0xff0000, 1).setOrigin(0.5).setDepth(10);
        this.add.triangle(cx + (cardW / 2) + 25, cy, 20, 0, 20, 30, 0, 15, 0xff0000, 1).setOrigin(0.5).setDepth(10);

        const randomOffset = Phaser.Math.Between(-itemHeight * 0.4, itemHeight * 0.4);
        
        // Target Y to bring winning item up to the center (cy)
        const targetY = cy - (winningIndex * itemHeight) - randomOffset;

        this.playSound('sfx_powerup', 0.5);

        let lastPassedIndex = 0;

        // Vertical Tween
        this.tweens.add({
            targets: this.stripContainer,
            y: targetY,
            duration: 7500,
            ease: 'Cubic.easeOut', 
            onUpdate: () => {
                let currentDistY = Math.abs(this.stripContainer.y - cy);
                let currentIndex = Math.floor(currentDistY / itemHeight);
                if (currentIndex > lastPassedIndex) {
                    this.playSound('sfx_tick', 0.4);
                    lastPassedIndex = currentIndex;
                }
            },
            onComplete: () => {
                this.playSound('sfx_jackpot', 1.0);
                this.time.delayedCall(800, () => this.showRewardPopup(winningItem));
            }
        });
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

    createBackground() {
        this.backgroundLayers = []; 
        if (!this.textures.exists('animated_bg_grad')) {
            const gradBg = this.make.graphics({x: 0, y: 0});
            gradBg.fillGradientStyle(0x020510, 0x020510, 0x0a1535, 0x0a1535, 1);
            gradBg.fillRect(0, 0, 720, 1280);
            gradBg.fillGradientStyle(0x0a1535, 0x0a1535, 0x020510, 0x020510, 1);
            gradBg.fillRect(0, 1280, 720, 1280);
            gradBg.generateTexture('animated_bg_grad', 720, 2560);
            gradBg.destroy();
        }

        this.scrollingBg = this.add.tileSprite(360, 640, 720, 1280, 'animated_bg_grad').setDepth(-100);

        const neb1 = this.add.circle(250, 100, 250, 0x0044aa, 0.1).setDepth(-99);
        const neb2 = this.add.circle(550, 1100, 300, 0x4400aa, 0.1).setDepth(-99);

        this.tweens.add({
            targets: [neb1, neb2], x: 650, y: 750, scale: 1.15, alpha: 0.15,
            duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
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

    createCurrencyUI() {
        const keys = (window.GameState && window.GameState.keys) || 0;
        const debris = (window.GameState && window.GameState.debris) || 0;

        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 0.8);
        bg.fillRoundedRect(420, 35, 270, 60, 30);
        bg.lineStyle(3, 0x0066aa, 0.9);
        bg.strokeRoundedRect(420, 35, 270, 60, 30);
        
        this.add.image(465, 65, "ui_key").setScale(0.65);
        this.add.text(495, 63, keys.toString(), { 
            fontSize: "26px", color: "#ffd700", fontFamily: "Arial", fontStyle: "bold" 
        }).setOrigin(0, 0.5);

        this.add.rectangle(555, 65, 3, 35, 0x0066aa, 0.8);

        this.add.image(600, 67, "ui_debris_icon").setScale(0.70);
        this.add.text(630, 63, debris.toString(), { 
            fontSize: "26px", color: "#aaccff", fontFamily: "Arial", fontStyle: "bold" 
        }).setOrigin(0, 0.5);
    }

    createItemCard(x, y, w, h, item) {
        const card = this.add.container(x, y);

        // --- NEW: Glassmorphism Item Background ---
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 0.95);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 16);
        
        bg.lineStyle(4, item.colorNum, 0.9);
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 16);
        
        bg.fillStyle(item.colorNum, 0.2);
        bg.fillRoundedRect(-w/2, h/2 - 35, w, 35, { tl: 0, tr: 0, bl: 16, br: 16 });

        let preview;
        if (item.type === "ship") {
            const previewKey = this.textures.exists(`${item.id}_lv1`) ? `${item.id}_lv1` : "player_lv1";
            preview = this.add.image(0, -20, previewKey).setScale(0.65);
        } else if (item.type === "avatar") {
            preview = this.add.text(0, -20, item.value || "👤", { fontSize: "60px" }).setOrigin(0.5);
        } else {
            const previewKey = this.textures.exists(`${item.id}_img`) ? `${item.id}_img` : "spark";
            preview = this.add.image(0, -20, previewKey);
            if (item.type === "dash") preview.setScale(1.2);
            else if (item.type === "shield" || item.type === "hud" || item.type === "battery") preview.setScale(0.7);
            else preview.setScale(1.5);
        }

        const nameText = this.add.text(0, 30, this.sanitizeBanglaText(item.name), { fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: w - 10 } }).setOrigin(0.5);
        const rarityText = this.add.text(0, 62.5, item.rarity, { fontSize: "18px", color: item.colorHex, fontStyle: "bold", letterSpacing: 1 }).setOrigin(0.5);

        card.add([bg, preview, nameText, rarityText]);
        return card;
    }

    sanitizeBanglaText(text) {
        if (!text) return "";
        return text.replace(/\s*\([A-Za-z0-9\s-]+\)/g, '').trim();
    }

    // --- NEW: Upgraded UI Style for Reward Popup ---
    showRewardPopup(item) {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;
        
        const overlay = this.add.rectangle(cx, cy, 720, 1480, 0x000000, 0.85).setInteractive({ useHandCursor: true });
        overlay.setDepth(999);

        const popup = this.add.container(cx, cy).setDepth(1000);
        
        // SpinWheelScene style dynamic burst
        const burst = this.add.graphics();
        burst.fillStyle(item.colorNum, 0.3);
        for(let i=0; i<12; i++) {
            burst.slice(0, 0, 700, Phaser.Math.DegToRad(i*30), Phaser.Math.DegToRad(i*30+15));
        }
        burst.fillPath();

        this.tweens.add({
            targets: burst,
            rotation: Math.PI * 2,
            duration: 10000,
            repeat: -1
        });

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 0.98);
        bg.fillRoundedRect(-240, -180, 480, 380, 20);
        bg.lineStyle(5, item.colorNum, 1);
        bg.strokeRoundedRect(-240, -180, 480, 380, 20);

        const boxGlow = this.add.graphics();
        boxGlow.fillStyle(item.colorNum, 0.2);
        boxGlow.fillCircle(0, -30, 140);

        const title = this.add.text(0, -130, "YOU WON!", { fontSize: "40px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold", shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 4, fill: true } }).setOrigin(0.5);
        
        let preview;
        if (item.type === "ship") {
            const previewKey = this.textures.exists(`${item.id}_lv1`) ? `${item.id}_lv1` : "player_lv1";
            preview = this.add.image(0, -30, previewKey).setScale(0.8);
        } else if (item.type === "avatar") {
            preview = this.add.text(0, -30, item.value || "👤", { fontSize: "80px" }).setOrigin(0.5);
        } else {
            const previewKey = this.textures.exists(`${item.id}_img`) ? `${item.id}_img` : "spark";
            preview = this.add.image(0, -30, previewKey);
            if (item.type === "dash") preview.setScale(1.5);
            else if (item.type === "shield" || item.type === "hud" || item.type === "battery") preview.setScale(0.9);
            else preview.setScale(2);
        }

        const rewardName = this.add.text(0, 70, this.sanitizeBanglaText(item.name), { fontSize: "28px", fontFamily: "'Anek Bangla'", color: item.colorHex, fontStyle: "bold", shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 4, fill: true } }).setOrigin(0.5);
        
        // SettingsScene style action button
        const btnContainer = this.add.container(0, 140);
        const btnW = 320;
        const btnH = 65;
        const btnBg = this.add.graphics();

        const drawClaimBtn = (hover) => {
            btnBg.clear();
            btnBg.fillGradientStyle(
                hover ? 0x004422 : 0x008844, hover ? 0x004422 : 0x008844,
                hover ? 0x00aa55 : 0x00cc66, hover ? 0x00aa55 : 0x00cc66, 1
            );
            btnBg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, btnH/2);
            btnBg.lineStyle(hover ? 4 : 3, hover ? 0xffffff : 0x00ffaa, 0.8);
            btnBg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, btnH/2);
        };
        drawClaimBtn(false);

        const claimBtnHit = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
        const claimBtnTxt = this.add.text(0, 0, "সংগ্রহ করুন (CLAIM)", { fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);

        btnContainer.add([btnBg, claimBtnTxt, claimBtnHit]);

        popup.add([burst, boxGlow, bg, title, preview, rewardName, btnContainer]);
        popup.setScale(0);

        this.tweens.add({ targets: popup, scale: 1, duration: 500, ease: 'Back.easeOut' });

        const handleClaim = () => {
            this.playSound('sfx_coin');
            this.tweens.add({ targets: popup, scale: 0.9, duration: 100, yoyo: true, onComplete: () => {
                this.awardItemToPlayer(item);
            }});
        };

        claimBtnHit.on('pointerdown', handleClaim);
        overlay.on('pointerdown', handleClaim);

        claimBtnHit.on('pointerover', () => drawClaimBtn(true));
        claimBtnHit.on('pointerout', () => drawClaimBtn(false));
    }

    awardItemToPlayer(item) {
        if (!window.GameState) window.GameState = {};

        let targetArray;
        if (item.type === "ship") targetArray = GameState.ownedShips = GameState.ownedShips || [];
        else if (item.type === "avatar") targetArray = GameState.ownedAvatars = GameState.ownedAvatars || [];
        else if (item.type === "shield") targetArray = GameState.ownedShields = GameState.ownedShields || [];
        else if (item.type === "trail") targetArray = GameState.ownedTrails = GameState.ownedTrails || [];
        else if (item.type === "dash") targetArray = GameState.ownedDashAuras = GameState.ownedDashAuras || [];
        else if (item.type === "hud") targetArray = GameState.ownedHuds = GameState.ownedHuds || [];
        else if (item.type === "battery") targetArray = GameState.ownedBatteries = GameState.ownedBatteries || [];

        if (targetArray && targetArray.includes(item.id)) {
            const duplicateReward = 500;
            GameState.debris = (GameState.debris || 0) + duplicateReward;
            alert(`Duplicate Item! You already own ${this.sanitizeBanglaText(item.name)}.\nConverted to +${duplicateReward} Debris instead.`);
        } else {
            if (targetArray) targetArray.push(item.id);
            alert(`New Item Unlocked: ${this.sanitizeBanglaText(item.name)}!`);
        }
        
        if (window.saveGame) window.saveGame();
        if (window.saveCurrency) window.saveCurrency();
        
        this.scene.start("SpinWheelScene"); 
    }

    // --- NEW: Global Settings Volume Override ---
    playSound(key, baseVolume = 1.0) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        const globalSfxVol = (window.GameState && window.GameState.sfxVolume !== undefined) ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);
        if (finalVolume > 0) this.sound.play(key, { volume: finalVolume });
    }
}