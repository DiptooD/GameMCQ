class MysteryBoxScene extends Phaser.Scene {
    constructor() {
        super("MysteryBoxScene");
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const cx = w / 2;
        const cy = h / 2;

        if (typeof GameSFX !== 'undefined') GameSFX.init(this);

        // Dim background
        this.add.rectangle(0, 0, w, h, 0x000000, 0.9).setOrigin(0);

        const title = this.add.text(cx, cy - 250, "মিস্টি বক্স (MYSTERY BOX)", {
            fontSize: "48px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold",
            stroke: "#000000", strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({ targets: title, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });

        // --- FETCH DYNAMIC ITEMS & ASSIGN WEIGHTS ---
        const allSkins = window.SpecialItemsRegistry.items || [];
        if (allSkins.length === 0) {
            this.add.text(cx, cy, "No items in registry!", { fontSize: "32px", color: "#ff0000" }).setOrigin(0.5);
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

        // --- ROULETTE CONFIG ---
        const itemWidth = 180;
        const totalItemsInSpin = 65; 
        const winningIndex = 55; // The item it will land on

        this.spinSequence = [];
        for (let i = 0; i < totalItemsInSpin; i++) {
            this.spinSequence.push(getWeightedRandomItem());
        }
        
        const winningItem = this.spinSequence[winningIndex];

        // Container holding all the cards
        this.stripContainer = this.add.container(cx, cy);

        // Mask to hide items outside the box
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(cx - (itemWidth * 1.8), cy - 120, itemWidth * 3.6, 240);
        const mask = maskShape.createGeometryMask();
        this.stripContainer.setMask(mask);

        // Draw the items inside the container
        for (let i = 0; i < totalItemsInSpin; i++) {
            let item = this.spinSequence[i];
            let xPos = (i * itemWidth);
            
            let card = this.createItemCard(0, 0, itemWidth - 16, 200, item);
            card.setPosition(xPos, 0);
            this.stripContainer.add(card);
        }

        // --- CENTER POINTER LINE ---
        this.add.rectangle(cx, cy, 6, 240, 0xffffff, 0.8).setDepth(10); 
        this.add.triangle(cx, cy - 130, 0, 0, 30, 0, 15, 25, 0xff0000, 1).setDepth(10);
        this.add.triangle(cx, cy + 130, 0, 25, 30, 25, 15, 0, 0xff0000, 1).setDepth(10);

        // --- SPIN ANIMATION ---
        const randomOffset = Phaser.Math.Between(-itemWidth * 0.4, itemWidth * 0.4);
        const targetX = cx - (winningIndex * itemWidth) - randomOffset;

        this.playSound('sfx_powerup', 0.5);

        let lastPassedIndex = 0;

        this.tweens.add({
            targets: this.stripContainer,
            x: targetX,
            duration: 7500, // 7.5 seconds of suspense
            ease: 'Cubic.easeOut', 
            onUpdate: () => {
                // Calculate which card is currently crossing the center
                let currentX = Math.abs(this.stripContainer.x - cx);
                let currentIndex = Math.floor(currentX / itemWidth);
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

    createItemCard(x, y, w, h, item) {
        const card = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.95);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
        
        // Rarity border & glow
        bg.lineStyle(4, item.colorNum, 0.9);
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 12);
        
        bg.fillStyle(item.colorNum, 0.2);
        bg.fillRoundedRect(-w/2, h/2 - 35, w, 35, { tl: 0, tr: 0, bl: 12, br: 12 });

        // Item Preview
        let preview;
        if (item.type === "ship") {
            const previewKey = this.textures.exists(`${item.id}_lv1`) ? `${item.id}_lv1` : "player_lv1";
            preview = this.add.image(0, -20, previewKey).setScale(0.65);
        } else if (item.type === "avatar") {
            preview = this.add.text(0, -20, item.value || "👤", { fontSize: "65px" }).setOrigin(0.5);
        } else {
            const previewKey = this.textures.exists(`${item.id}_img`) ? `${item.id}_img` : "spark";
            preview = this.add.image(0, -20, previewKey);
            if (item.type === "dash") preview.setScale(1.2);
            else if (item.type === "shield" || item.type === "hud" || item.type === "battery") preview.setScale(0.7);
            else preview.setScale(1.5);
        }

        const nameText = this.add.text(0, 40, this.sanitizeBanglaText(item.name), { fontSize: "16px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: w - 10 } }).setOrigin(0.5);
        const rarityText = this.add.text(0, 80, item.rarity, { fontSize: "18px", color: item.colorHex, fontStyle: "bold" }).setOrigin(0.5);

        card.add([bg, preview, nameText, rarityText]);
        return card;
    }

    sanitizeBanglaText(text) {
        if (!text) return "";
        return text.replace(/\s*\([A-Za-z0-9\s-]+\)/g, '').trim();
    }

    showRewardPopup(item) {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;
        
        const popup = this.add.container(cx, cy).setDepth(20);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.98);
        bg.fillRoundedRect(-240, -180, 480, 360, 20);
        bg.lineStyle(5, item.colorNum, 1);
        bg.strokeRoundedRect(-240, -180, 480, 360, 20);

        const title = this.add.text(0, -130, "YOU WON!", { fontSize: "40px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        
        // Item Preview
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

        const rewardName = this.add.text(0, 60, this.sanitizeBanglaText(item.name), { fontSize: "28px", fontFamily: "'Anek Bangla'", color: item.colorHex, fontStyle: "bold" }).setOrigin(0.5);
        
        const claimBtn = this.add.text(0, 130, "সংগ্রহ করুন (CLAIM)", { fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#ffffff", backgroundColor: "#00aa44", padding: { x: 30, y: 10 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });

        popup.add([bg, title, preview, rewardName, claimBtn]);
        popup.setScale(0);

        this.tweens.add({ targets: popup, scale: 1, duration: 500, ease: 'Back.easeOut' });

        claimBtn.on('pointerdown', () => {
            this.playSound('sfx_coin');
            this.tweens.add({ targets: popup, scale: 0.9, duration: 100, yoyo: true, onComplete: () => {
                this.awardItemToPlayer(item);
            }});
        });
    }

    awardItemToPlayer(item) {
        if (!window.GameState) window.GameState = {};

        // 1. Identify which array this item belongs to
        let targetArray;
        if (item.type === "ship") targetArray = GameState.ownedShips = GameState.ownedShips || [];
        else if (item.type === "avatar") targetArray = GameState.ownedAvatars = GameState.ownedAvatars || [];
        else if (item.type === "shield") targetArray = GameState.ownedShields = GameState.ownedShields || [];
        else if (item.type === "trail") targetArray = GameState.ownedTrails = GameState.ownedTrails || [];
        else if (item.type === "dash") targetArray = GameState.ownedDashAuras = GameState.ownedDashAuras || [];
        else if (item.type === "hud") targetArray = GameState.ownedHuds = GameState.ownedHuds || [];
        else if (item.type === "battery") targetArray = GameState.ownedBatteries = GameState.ownedBatteries || [];

        // 2. Check for Duplicate
        if (targetArray.includes(item.id)) {
            // Already owned -> Convert to Debris
            const duplicateReward = 500;
            GameState.debris = (GameState.debris || 0) + duplicateReward;
            alert(`Duplicate Item! You already own ${this.sanitizeBanglaText(item.name)}.\nConverted to +${duplicateReward} Debris instead.`);
        } else {
            // New item -> Unlock it
            targetArray.push(item.id);
            alert(`New Item Unlocked: ${this.sanitizeBanglaText(item.name)}!`);
        }
        
        if (window.saveGame) window.saveGame();
        
        this.scene.start("SpinWheelScene"); 
    }

    playSound(key, baseVolume = 1.0) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        const globalSfxVol = (window.GameState && window.GameState.sfxVolume !== undefined) ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);
        if (finalVolume > 0) this.sound.play(key, { volume: finalVolume });
    }
}