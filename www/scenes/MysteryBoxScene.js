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

        this.createBackground();

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

        this.createCurrencyUI();

        const titleY = 130; 
        const title = this.add.text(cx, titleY, "মিস্টি বক্স (MYSTERY BOX)", {
            fontSize: "48px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold",
            stroke: "#000000", strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 10, fill: true, stroke: true }
        }).setOrigin(0.5).setDepth(20);

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

        const itemHeight = 250; 
        const cardW = 460;      
        const cardH = 220;      
        const totalItemsInSpin = 65; 
        const winningIndex = 55;

        // Optimization: Pre-generate textures to prevent massive lag from drawing vectors inside masks
        this.generateCardTextures(cardW, cardH, rarityConfig);

        this.spinSequence = [];
        for (let i = 0; i < totalItemsInSpin; i++) {
            this.spinSequence.push(getWeightedRandomItem());
        }
        
        const winningItem = this.spinSequence[winningIndex];

        this.stripContainer = this.add.container(cx, cy);

        const maskTop = 200;
        const maskBottom = h - 60;
        const maskHeight = maskBottom - maskTop;

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(0, maskTop, w, maskHeight);
        const mask = maskShape.createGeometryMask();
        this.stripContainer.setMask(mask);

        for (let i = 0; i < totalItemsInSpin; i++) {
            let item = this.spinSequence[i];
            let yPos = (i * itemHeight);
            
            let card = this.createItemCard(0, yPos, cardW, cardH, item);
            this.stripContainer.add(card);
        }

        const shadowOverlay = this.add.graphics().setDepth(5);
        const fadeHeight = 180;
        
        shadowOverlay.fillGradientStyle(0x020510, 0x020510, 0x020510, 0x020510, 1, 1, 0, 0);
        shadowOverlay.fillRect(0, maskTop, w, fadeHeight);
        shadowOverlay.fillGradientStyle(0x020510, 0x020510, 0x020510, 0x020510, 0, 0, 1, 1);
        shadowOverlay.fillRect(0, maskBottom - fadeHeight, w, fadeHeight);

        const selectorW = cardW + 40;
        const selectorH = cardH + 20;

        const selectorBox = this.add.graphics().setDepth(10);
        selectorBox.lineStyle(6, 0x00ffff, 0.9);
        selectorBox.strokeRoundedRect(cx - selectorW/2, cy - selectorH/2, selectorW, selectorH, 24);
        
        this.add.rectangle(cx, cy, selectorW, selectorH, 0x00ffff, 0.05).setDepth(10).setMask(mask);
        
        this.add.triangle(cx - selectorW/2 - 20, cy, 0, -25, 0, 25, 30, 0, 0x00ffff, 1).setDepth(10);
        this.add.triangle(cx + selectorW/2 + 20, cy, 0, 0, -30, -25, -30, 25, 0x00ffff, 1).setDepth(10);

        const randomOffset = Phaser.Math.Between(-itemHeight * 0.15, itemHeight * 0.15);
        const targetY = cy - (winningIndex * itemHeight) - randomOffset;

        this.playSound('sfx_powerup', 0.5);

        let lastPassedIndex = 0;

        this.tweens.add({
            targets: this.stripContainer,
            y: targetY,
            duration: 8000, 
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
                
                this.tweens.add({
                    targets: selectorBox,
                    alpha: 0,
                    duration: 100,
                    yoyo: true,
                    repeat: 5
                });

                this.time.delayedCall(1200, () => this.showRewardPopup(winningItem));
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

    // Optimization: Pre-generate the intensive card vector graphics once to prevent lag
    generateCardTextures(w, h, rarityConfig) {
        for (const [rarityName, config] of Object.entries(rarityConfig)) {
            const key = `card_bg_${rarityName}`;
            if (!this.textures.exists(key)) {
                const bg = this.make.graphics({ x: 0, y: 0 });
                
                bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 0.98);
                bg.fillRoundedRect(0, 0, w, h, 20);
                
                bg.lineStyle(4, config.color, 0.9);
                bg.strokeRoundedRect(0, 0, w, h, 20);
                
                bg.fillStyle(config.color, 0.25);
                bg.fillRoundedRect(0, 0, w, 45, { tl: 20, tr: 20, bl: 0, br: 0 });
                
                bg.lineStyle(2, config.color, 0.5);
                bg.beginPath(); 
                bg.moveTo(0, 45); 
                bg.lineTo(w, 45); 
                bg.strokePath();

                bg.generateTexture(key, w, h);
                bg.destroy();
            }
        }
    }

    createItemCard(x, y, w, h, item) {
        const card = this.add.container(x, y);

        // Optimization: Use pre-generated texture image instead of creating vectors per card
        const bg = this.add.image(0, 0, `card_bg_${item.rarity}`);

        const rarityText = this.add.text(0, -h/2 + 22.5, item.rarity.toUpperCase(), { 
            fontSize: "22px", fontFamily: "Arial", color: item.colorHex, fontStyle: "bold", letterSpacing: 3 
        }).setOrigin(0.5);

        let preview;
        if (item.type === "ship") {
            const previewKey = this.textures.exists(`${item.id}_lv1`) ? `${item.id}_lv1` : "player_lv1";
            preview = this.add.image(0, 10, previewKey).setScale(1.1);
        } else if (item.type === "avatar") {
            preview = this.add.text(0, 10, item.value || "👤", { fontSize: "85px" }).setOrigin(0.5);
        } else {
            const previewKey = this.textures.exists(`${item.id}_img`) ? `${item.id}_img` : "spark";
            preview = this.add.image(0, 10, previewKey);
            if (item.type === "dash") preview.setScale(1.8);
            else if (item.type === "shield" || item.type === "hud" || item.type === "battery") preview.setScale(1.3);
            else preview.setScale(2.2);
        }

        const nameText = this.add.text(0, h/2 - 25, this.sanitizeBanglaText(item.name), { 
            fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: w - 20 } 
        }).setOrigin(0.5);

        card.add([bg, rarityText, preview, nameText]);
        return card;
    }

    sanitizeBanglaText(text) {
        if (!text) return "";
        return text.replace(/\s*\([A-Za-z0-9\s-]+\)/g, '').trim();
    }

    hasItem(item) {
        if (!window.GameState) return false;
        let targetArray;
        if (item.type === "ship") targetArray = GameState.ownedShips;
        else if (item.type === "avatar") targetArray = GameState.ownedAvatars;
        else if (item.type === "shield") targetArray = GameState.ownedShields;
        else if (item.type === "trail") targetArray = GameState.ownedTrails;
        else if (item.type === "dash") targetArray = GameState.ownedDashAuras;
        else if (item.type === "hud") targetArray = GameState.ownedHuds;
        else if (item.type === "battery") targetArray = GameState.ownedBatteries;
        
        return targetArray ? targetArray.includes(item.id) : false;
    }

    showRewardPopup(item) {
        this.cameras.main.flash(400, 255, 255, 255);
        this.playSound('sfx_victory', 0.8);

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;
        const isDuplicate = this.hasItem(item);
        
        const overlay = this.add.rectangle(cx, cy, 720, 1480, 0x000000, 0.85).setInteractive({ useHandCursor: true });
        overlay.setDepth(999);

        const popup = this.add.container(cx, cy).setDepth(1000).setScale(0);

        const boxBarrier = this.add.rectangle(0, 0, 600, 600, 0x000000, 0).setInteractive();
        popup.add(boxBarrier);
        
        const burst = this.add.graphics();
        burst.fillStyle(item.colorNum, 0.3);
        for(let i=0; i<12; i++) {
            burst.slice(0, 0, 700, Phaser.Math.DegToRad(i*30), Phaser.Math.DegToRad(i*30+15));
        }
        burst.fillPath();
        
        this.tweens.add({ targets: burst, rotation: Math.PI * 2, duration: 10000, repeat: -1 });

        const box = this.add.graphics();
        box.fillStyle(0x000c22, 0.95);
        box.fillRoundedRect(-300, -300, 600, 600, 24);
        box.lineStyle(5, item.colorNum, 1);
        box.strokeRoundedRect(-300, -300, 600, 600, 24);
        
        const boxGlow = this.add.graphics();
        boxGlow.fillStyle(item.colorNum, 0.2);
        boxGlow.fillCircle(0, 0, 220); 
        
        const title = this.add.text(0, -180, "Congratulations!", { 
            fontSize: "60px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 900, color: "#ffffff", 
            shadow: { color: "#000000", blur: 6, stroke: true, fill: true }
        }).setOrigin(0.5);

        // Update Subtitle conditionally based on duplicate status
        const subtitleText = isDuplicate ? "DUPLICATE ITEM" : "YOU WON";
        const subtitleColor = isDuplicate ? "#ffaa00" : "#aaccff";
        
        const subtitle = this.add.text(0, -130, subtitleText, {
            fontSize: "28px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: subtitleColor, letterSpacing: 3 
        }).setOrigin(0.5);

        let preview;
        if (item.type === "ship") {
            const previewKey = this.textures.exists(`${item.id}_lv1`) ? `${item.id}_lv1` : "player_lv1";
            preview = this.add.image(0, -10, previewKey).setScale(1.4);
        } else if (item.type === "avatar") {
            preview = this.add.text(0, -10, item.value || "👤", { fontSize: "120px" }).setOrigin(0.5);
        } else {
            const previewKey = this.textures.exists(`${item.id}_img`) ? `${item.id}_img` : "spark";
            preview = this.add.image(0, -10, previewKey);
            if (item.type === "dash") preview.setScale(2.5);
            else if (item.type === "shield" || item.type === "hud" || item.type === "battery") preview.setScale(1.8);
            else preview.setScale(3.5);
        }
        
        const label = this.add.text(0, 110, this.sanitizeBanglaText(item.name), {
            fontSize: "46px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 900, color: "#ffffff",
            shadow: { color: Phaser.Display.Color.IntegerToColor(item.colorNum).rgba, blur: 20, fill: true }
        }).setOrigin(0.5);

        popup.add([burst, boxGlow, box, title, subtitle, preview, label]);

        // Show Debris conversion info if it's a duplicate
        if (isDuplicate) {
            const dupLabel = this.add.text(0, 160, "(Converted to 100 Debris)", {
                fontSize: "22px", fontFamily: "Arial", fontWeight: "bold", color: "#ff5555"
            }).setOrigin(0.5);
            popup.add(dupLabel);
        }

        const btnContainer = this.add.container(0, 220);
        const btnW = 380; 
        const btnH = 90; 
        const btnR = btnH / 2;

        const btnBg = this.add.graphics();
        const drawClaimBtn = (hover) => {
            btnBg.clear();
            btnBg.fillGradientStyle(
                hover ? 0x002266 : 0x001133, hover ? 0x002266 : 0x001133, 
                hover ? 0x0088ff : 0x004488, hover ? 0x0088ff : 0x004488, 1
            );
            btnBg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, btnR);
            btnBg.lineStyle(hover ? 4 : 3, hover ? 0xffffff : 0x00ffff, 0.8);
            btnBg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, btnR);
        };
        drawClaimBtn(false);

        const btnHitArea = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        const btnTxt = this.add.text(0, 0, "সংগ্রহ করুন (CLAIM)", {
            fontSize: "36px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 800, color: "#ffffff" 
        }).setOrigin(0.5);

        btnContainer.add([btnBg, btnTxt, btnHitArea]);
        popup.add(btnContainer);

        this.tweens.add({ targets: popup, scale: 1, duration: 600, ease: 'Back.out' });

        const autoClaimAction = () => {
            this.playSound('sfx_coin');
            this.tweens.add({ targets: popup, scale: 0.9, duration: 100, yoyo: true, onComplete: () => {
                this.awardItemToPlayer(item);
            }});
        };

        btnHitArea.on('pointerdown', autoClaimAction);
        overlay.on('pointerdown', autoClaimAction);
        btnHitArea.on('pointerover', () => drawClaimBtn(true));
        btnHitArea.on('pointerout', () => drawClaimBtn(false));
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

        if (this.hasItem(item)) {
            GameState.debris = (GameState.debris || 0) + 100; // Handled smoothly in the popup UI
        } else {
            if (targetArray) targetArray.push(item.id);
        }
        
        if (window.saveGame) window.saveGame();
        if (window.saveCurrency) window.saveCurrency();
        
        this.scene.start("SpinWheelScene"); 
    }

    playSound(key, baseVolume = 1.0) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        const globalSfxVol = (window.GameState && window.GameState.sfxVolume !== undefined) ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);
        if (finalVolume > 0) this.sound.play(key, { volume: finalVolume });
    }
}