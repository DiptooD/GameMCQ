class ShopScene extends Phaser.Scene {
    constructor() {
        super("ShopScene");
    }

    init() {
        this.currentTab = "ships";
        this.scrollVelocity = 0;
        this.backgroundLayers = [];
        this.contentHeight = 0;
        this.listStartY = 310; 
        this.containerY = this.listStartY; 
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        if (typeof GameSFX !== 'undefined') GameSFX.init(this);
        if (typeof GameTextures !== 'undefined') GameTextures.init(this);
        if (typeof PlayerShipTextures !== 'undefined') PlayerShipTextures.init(this);
        if (typeof SpecialItemsTexture !== 'undefined') SpecialItemsTexture.init(this);

        let menuMusic = this.sound.get('menubgm');
        const targetMusicVol = (window.GameState && window.GameState.musicVolume !== undefined) ? window.GameState.musicVolume : 0.5;

        if (!menuMusic) {
            menuMusic = this.sound.add('menubgm', { loop: true, volume: targetMusicVol });
            menuMusic.play();
        } else {
            menuMusic.setVolume(targetMusicVol);
            if (!menuMusic.isPlaying) menuMusic.play();
        }

        this.handleBack = () => {
            this.playSound('sfx_back', 0.8);
            this.scene.start("MenuScene");
        };

        if (window.history && window.history.pushState) {
            window.history.pushState(null, null, window.location.href);
            window.onpopstate = () => this.handleBack();
        }
        document.addEventListener("backbutton", this.handleBack, false);

        this.createBackground();

        const title = this.add.text(cx, 160, "দোকান", {
            fontSize: "76px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#00e1ff",
            stroke: "#000000", strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 15, fill: true, stroke: true }
        }).setOrigin(0.5);

        this.tweens.add({ targets: title, y: title.y - 5, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.createTopUI();
        this.createCurrencyUI();
        this.createTabs(cx);

        const topMargin = 310;
        const bottomMargin = 20;
        this.visibleHeight = h - topMargin - bottomMargin;

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(0, topMargin, w, this.visibleHeight);
        const mask = maskShape.createGeometryMask();

        this.container = this.add.container(0, topMargin);
        this.container.setMask(mask);
        this.containerY = topMargin; 

        this.refreshContent();

        this.scrollState = { isDragging: false, velocityY: 0 };
        let startY = 0, lastY = 0, containerStartY = 0, lastTime = 0;

        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < topMargin || this.contentHeight <= this.visibleHeight) return; 
            this.scrollState.isDragging = true;
            this.scrollState.velocityY = 0;
            startY = pointer.y;
            lastY = pointer.y;
            containerStartY = this.container.y;
            lastTime = this.time.now;
        });

        this.input.on('pointermove', (pointer) => {
            if (this.scrollState.isDragging) {
                const diff = pointer.y - startY;
                let newY = containerStartY + diff;

                const minScroll = Math.min(0, this.visibleHeight - this.contentHeight - 50);

                if (newY > this.listStartY) newY = this.listStartY + (newY - this.listStartY) * 0.4;
                else if (newY < this.listStartY + minScroll) newY = this.listStartY + minScroll + (newY - (this.listStartY + minScroll)) * 0.4;
                
                this.container.y = newY;
                const dt = this.time.now - lastTime;
                
                if (dt > 0) {
                    this.scrollState.velocityY = (this.scrollState.velocityY * 0.4) + (((pointer.y - lastY) / dt) * 0.6);
                }
                lastTime = this.time.now; lastY = pointer.y;
            }
        });

        const stopDrag = (pointer) => { 
            this.scrollState.isDragging = false; 
            if (pointer && typeof pointer.y === 'number') {
                if (Math.abs(pointer.y - startY) < 15) {
                    this.scrollState.velocityY = 0;
                }
            }
        };
        this.input.on('pointerup', stopDrag);
        this.input.on('pointerout', stopDrag);

        this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateTimers() });

        this.events.on('shutdown', () => {
            document.removeEventListener("backbutton", this.handleBack);
            window.onpopstate = null;
        });
    }

    update(time, delta) {
        if (this.scrollingBg) this.scrollingBg.tilePositionY -= 0.6;
        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                layer.group.children.iterate(star => {
                    if (star) {
                        star.y += layer.speed;
                        if (star.y > this.cameras.main.height) { star.y = -10; star.x = Phaser.Math.Between(0, 720); }
                    }
                });
            });
        }

        if (this.contentHeight > this.visibleHeight && this.scrollState) {
            if (!this.scrollState.isDragging) {
                const minScroll = Math.min(0, this.visibleHeight - this.contentHeight - 50);
                let vY = this.scrollState.velocityY;
                let currentY = this.container.y;
                const timeScale = delta / 16.66; 

                if (Math.abs(vY) > 0.01) {
                    currentY += vY * 16 * timeScale;
                    this.scrollState.velocityY *= Math.pow(0.92, timeScale);
                }

                if (currentY > this.listStartY) {
                    currentY += (this.listStartY - currentY) * 0.15 * timeScale;
                    if (Math.abs(this.listStartY - currentY) < 0.5) currentY = this.listStartY;
                } else if (currentY < this.listStartY + minScroll) {
                    currentY += ((this.listStartY + minScroll) - currentY) * 0.15 * timeScale;
                    if (Math.abs((this.listStartY + minScroll) - currentY) < 0.5) currentY = this.listStartY + minScroll;
                }
                this.container.y = currentY;
            } else {
                this.scrollState.velocityY *= 0.9; 
            }
        }
    }

    playSound(key, baseVolume = 1.0) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        const globalSfxVol = (window.GameState && window.GameState.sfxVolume !== undefined) ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);
        if (finalVolume > 0) this.sound.play(key, { volume: finalVolume });
    }

    sanitizeBanglaText(text) {
        if (!text) return "";
        return text.replace(/\s*\([A-Za-z0-9\s-]+\)/g, '').trim();
    }

    createTopUI() {
        const backContainer = this.add.container(100, 65);
        const backBg = this.add.graphics();
        backBg.fillStyle(0x001122, 0.8);
        backBg.fillRoundedRect(-70, -30, 140, 60, 30);
        backBg.lineStyle(3, 0x0066aa, 0.9);
        backBg.strokeRoundedRect(-70, -30, 140, 60, 30);
        const hitArea = this.add.rectangle(0, 0, 140, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        const backArrow = this.add.text(-35, 0, "◄", { fontSize: "28px", color: "#00ffff" }).setOrigin(0.5);
        const backText = this.add.text(15, 0, "BACK", { fontSize: "24px", fontFamily: "'Anek Bangla'", fontWeight: 700, color: "#ffffff" }).setOrigin(0.5);
        backContainer.add([backBg, backArrow, backText, hitArea]);

        hitArea.on('pointerdown', () => {
            this.tweens.add({ targets: backContainer, scale: 0.9, duration: 50, yoyo: true, onComplete: () => this.handleBack() });
        });
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
        this.kText = this.add.text(495, 63, keys.toString(), { fontSize: "26px", color: "#ffd700", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0, 0.5);
        this.add.rectangle(555, 65, 3, 35, 0x0066aa, 0.8);
        this.add.image(600, 67, "ui_debris_icon").setScale(0.70);
        this.dText = this.add.text(630, 63, debris.toString(), { fontSize: "26px", color: "#aaccff", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0, 0.5);
    }

    createBackground() {
        this.backgroundLayers = [];
        const themeColors = window.getThemeColors();
        if (!this.textures.exists('animated_bg_grad')) {
            const gradBg = this.make.graphics({ x: 0, y: 0 });
            gradBg.fillGradientStyle(themeColors.bgTop, themeColors.bgTop, themeColors.bgBot, themeColors.bgBot, 1);
            gradBg.fillRect(0, 0, 720, 1280);
            gradBg.fillGradientStyle(themeColors.bgBot, themeColors.bgBot, themeColors.bgTop, themeColors.bgTop, 1);
            gradBg.fillRect(0, 1280, 720, 2560);
            gradBg.generateTexture('animated_bg_grad', 720, 2560);
            gradBg.destroy();
        }
        this.scrollingBg = this.add.tileSprite(360, 640, 720, 1280, 'animated_bg_grad').setDepth(-100);

        const neb1 = this.add.circle(250, 100, 250, themeColors.nebulae[0], 0.1).setDepth(-99);
        const neb2 = this.add.circle(550, 1100, 300, themeColors.nebulae[1] || themeColors.nebulae[0], 0.1).setDepth(-99);
        this.tweens.add({ targets: [neb1, neb2], x: 650, y: 750, scale: 1.15, alpha: 0.15, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

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
        createLayer(50, 0.4, themeColors.debris, 1.5, 0.5);
        createLayer(30, 1.0, themeColors.starFast, 2, 0.8);
        createLayer(15, 2.2, themeColors.starDistant, 2.5, 1);
    }

    createTabs(cx) {
        const y = 250;
        const totalWidth = 640; 
        const height = 60;
        const btnWidth = totalWidth / 4;
        const container = this.add.container(cx, y);

        const baseBg = this.add.graphics();
        baseBg.fillStyle(0x041022, 0.9);
        baseBg.fillRoundedRect(-totalWidth / 2, -height / 2, totalWidth, height, height / 2);
        baseBg.lineStyle(3, 0x005588, 0.9);
        baseBg.strokeRoundedRect(-totalWidth / 2, -height / 2, totalWidth, height, height / 2);
        container.add(baseBg);

        this.tabHighlight = this.add.graphics();
        this.tabHighlight.fillStyle(0xffffff, 0.15);
        this.tabHighlight.fillRoundedRect(-btnWidth / 2 + 4, -height / 2 + 4, btnWidth - 8, height - 8, (height - 8) / 2);
        this.tabHighlight.x = -btnWidth * 1.5; 
        container.add(this.tabHighlight);

        const tabFont = { fontSize: "22px", fontFamily: "'Anek Bangla'", fontWeight: 700 };
        
        this.shipTabTxt = this.add.text(-btnWidth * 1.5, 0, "🚀 পাখি", { ...tabFont, color: "#ffffff" }).setOrigin(0.5);
        this.boosterTabTxt = this.add.text(-btnWidth * 0.5, 0, "⚡ বুস্টার", { ...tabFont, color: "#88bbdd" }).setOrigin(0.5);
        this.themeTabTxt = this.add.text(btnWidth * 0.5, 0, "🌌 থিম", { ...tabFont, color: "#88bbdd" }).setOrigin(0.5);
        this.specialTabTxt = this.add.text(btnWidth * 1.5, 0, "🎁 স্পেশাল", { ...tabFont, color: "#88bbdd" }).setOrigin(0.5);

        const shipHitArea = this.add.rectangle(-btnWidth * 1.5, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        const boosterHitArea = this.add.rectangle(-btnWidth * 0.5, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        const themeHitArea = this.add.rectangle(btnWidth * 0.5, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        const specialHitArea = this.add.rectangle(btnWidth * 1.5, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });

        shipHitArea.on('pointerdown', () => this.switchTab("ships"));
        boosterHitArea.on('pointerdown', () => this.switchTab("boosters"));
        themeHitArea.on('pointerdown', () => this.switchTab("themes"));
        specialHitArea.on('pointerdown', () => this.switchTab("special"));

        container.add([this.shipTabTxt, this.boosterTabTxt, this.themeTabTxt, this.specialTabTxt, shipHitArea, boosterHitArea, themeHitArea, specialHitArea]);
    }

    switchTab(tab) {
        if (this.currentTab === tab) return;
        this.currentTab = tab;
        this.playSound('sfx_click', 0.7);

        const btnWidth = 640 / 4;
        let targetX = 0;
        if (tab === "ships") targetX = -btnWidth * 1.5;
        else if (tab === "boosters") targetX = -btnWidth * 0.5;
        else if (tab === "themes") targetX = btnWidth * 0.5;
        else if (tab === "special") targetX = btnWidth * 1.5;

        this.tweens.add({ targets: this.tabHighlight, x: targetX, duration: 250, ease: 'Cubic.out' });

        this.shipTabTxt.setColor(tab === "ships" ? "#ffffff" : "#88bbdd");
        this.boosterTabTxt.setColor(tab === "boosters" ? "#ffffff" : "#88bbdd");
        this.themeTabTxt.setColor(tab === "themes" ? "#ffffff" : "#88bbdd");
        this.specialTabTxt.setColor(tab === "special" ? "#ffffff" : "#88bbdd");

        this.containerY = this.listStartY;
        this.container.y = this.listStartY;
        
        this.refreshContent(); 
    }

    refreshContent() {
        this.container.removeAll(true);
        if (this.currentTab === "ships") this.renderShipList();
        else if (this.currentTab === "boosters") this.renderBoosterList();
        else if (this.currentTab === "themes") this.renderThemeList();
        else if (this.currentTab === "special") this.renderSpecialList();
    }

    renderSpecialList() {
        const redeemContainer = this.add.container(360, 40);
        const rBg = this.add.graphics();
        rBg.fillGradientStyle(0x00aa44, 0x00aa44, 0x005522, 0x005522, 1);
        rBg.fillRoundedRect(-160, -30, 320, 60, 16);
        rBg.lineStyle(3, 0x00ff88, 1);
        rBg.strokeRoundedRect(-160, -30, 320, 60, 16);
        const rTxt = this.add.text(0, 0, "Redeem Gift Code", { fontSize: "24px", fontFamily: "'Anek Bangla'", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5);
        const rHit = this.add.rectangle(0, 0, 320, 60, 0x000000, 0).setInteractive({useHandCursor: true});
        redeemContainer.add([rBg, rTxt, rHit]);
        
        rHit.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.tweens.add({ targets: redeemContainer, scale: 0.95, duration: 50, yoyo: true, onComplete: () => {
                if(window.redeemPromoCode) window.redeemPromoCode();
                this.refreshContent();
            }});
        });
        this.container.add(redeemContainer);

        const ownedShips = new Set(GameState.ownedShips || []);
        const ownedAvatars = new Set(GameState.ownedAvatars || []);
        const ownedShields = new Set(GameState.ownedShields || []);
        const ownedTrails = new Set(GameState.ownedTrails || []);
        const ownedDashAuras = new Set(GameState.ownedDashAuras || []);
        
        // NEW
        const ownedHuds = new Set(GameState.ownedHuds || []);
        const ownedBatteries = new Set(GameState.ownedBatteries || []);

        const specials = window.SpecialItemsData || [];
        const categories = { ship: [], avatar: [], shield: [], trail: [], dash: [], hud: [], battery: [] };

        categories.ship.push({ id: "default", type: "ship", rarity: "Common", name: "ডিফল্ট স্কিন", desc: "মূল স্পেসশিপ" });
        categories.avatar.push({ id: "default", type: "avatar", rarity: "Common", name: "ডিফল্ট অ্যাভাটার", desc: "সাধারণ প্রোফাইল", value: "👤" });
        categories.shield.push({ id: "default", type: "shield", rarity: "Common", name: "ডিফল্ট শিল্ড", desc: "সাধারণ শিল্ড এনার্জি" });
        categories.trail.push({ id: "default", type: "trail", rarity: "Common", name: "ডিফল্ট ট্রেইল", desc: "সাধারণ ইঞ্জিনের ধোঁয়া" });
        categories.dash.push({ id: "default", type: "dash", rarity: "Common", name: "ডিফল্ট ড্যাশ", desc: "সাধারণ ড্যাশ অরা" });
        
        // NEW DEFAULTS
        categories.hud.push({ id: "default", type: "hud", rarity: "Common", name: "ডিফল্ট থিম", desc: "সাধারণ গ্লাস থিম" });
        categories.battery.push({ id: "default", type: "battery", rarity: "Common", name: "ডিফল্ট ব্যাটারি", desc: "সাধারণ ব্যাটারি প্যানেল" });

        specials.forEach(item => {
            let isOwned = false;
            if (item.type === "ship") isOwned = ownedShips.has(item.id);
            else if (item.type === "avatar") isOwned = ownedAvatars.has(item.id);
            else if (item.type === "shield") isOwned = ownedShields.has(item.id);
            else if (item.type === "trail") isOwned = ownedTrails.has(item.id);
            else if (item.type === "dash") isOwned = ownedDashAuras.has(item.id);
            else if (item.type === "hud") isOwned = ownedHuds.has(item.id);
            else if (item.type === "battery") isOwned = ownedBatteries.has(item.id);
            
            if (isOwned && categories[item.type]) categories[item.type].push(item);
        });

        let expectedHeight = 120; 
        let hasAnyItems = false;
        [categories.ship, categories.avatar, categories.shield, categories.trail, categories.dash, categories.hud, categories.battery].forEach(items => {
            if (items.length > 1) { 
                hasAnyItems = true;
                expectedHeight += 80; 
                const numRows = Math.ceil(items.length / 2); 
                expectedHeight += numRows * 340 + 40; 
            }
        });
        this.contentHeight = hasAnyItems ? expectedHeight + 50 : 300;

        let currentY = 120; 
        const categoryLabels = {
            ship: "🚀 স্পেসশিপ স্কিন (Ship Skins)",
            avatar: "👤 অ্যাভাটার (Avatars)",
            shield: "🛡️ শিল্ড (Shields)",
            trail: "🔥 ট্রেইল (Trails)",
            dash: "⚡ ড্যাশ অরা (Dash Auras)",
            hud: "🖥️ হুড/বক্স থিম (HUD Themes)",
            battery: "🔋 ব্যাটারি স্কিন (Battery Skins)"
        };

        const renderCategory = (type, items) => {
            if (items.length <= 1) return; 

            // Category Header
            const headerBg = this.add.graphics();
            headerBg.fillStyle(0x002244, 0.8);
            headerBg.fillRoundedRect(160, currentY, 400, 50, 25);
            
            const headerText = this.add.text(360, currentY + 25, categoryLabels[type], {
                fontSize: "24px", fontFamily: "'Anek Bangla'", fontStyle: "bold", color: "#00ffff"
            }).setOrigin(0.5);
            
            this.container.add([headerBg, headerText]);
            currentY += 80; 

            let count = 0;
            items.forEach((item) => {
                let isEquipped = false;
                if (item.type === "ship") isEquipped = (GameState.equippedShip || "default") === item.id;
                else if (item.type === "avatar") isEquipped = (GameState.equippedAvatar || "default") === item.id;
                else if (item.type === "shield") isEquipped = (GameState.equippedShield || "default") === item.id;
                else if (item.type === "trail") isEquipped = (GameState.equippedTrail || "default") === item.id;
                else if (item.type === "dash") isEquipped = (GameState.equippedDashAura || "default") === item.id;
                else if (item.type === "hud") isEquipped = (GameState.equippedHud || "default") === item.id;
                else if (item.type === "battery") isEquipped = (GameState.equippedBattery || "default") === item.id;

                const col = count % 2; 
                const row = Math.floor(count / 2);
                const xCard = col === 0 ? 190 : 530; 
                const yCard = currentY + row * 340 + 160; 
                
                this.createSpecialCard(item, isEquipped, xCard, yCard);
                count++;
            });

            const numRows = Math.ceil(items.length / 2);
            currentY += numRows * 340 + 40; 
        };

        renderCategory("ship", categories.ship);
        renderCategory("avatar", categories.avatar);
        renderCategory("shield", categories.shield);
        renderCategory("trail", categories.trail);
        renderCategory("dash", categories.dash);
        renderCategory("hud", categories.hud);
        renderCategory("battery", categories.battery);

        if (!hasAnyItems) {
            const noTxt = this.add.text(360, 200, "আপনার কাছে কোনো স্পেশাল আইটেম নেই।\n(No Special Items Unlocked)", {
                fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#aaaaaa", align: "center", lineSpacing: 10
            }).setOrigin(0.5);
            this.container.add(noTxt);
        }
    }

    createSpecialCard(item, isEquipped, x, y) {
        if (this.currentTab !== "special") return;

        const cardContainer = this.add.container(x, y);

        let rarityColor = 0xffffff;
        if (item.rarity === "Common") rarityColor = 0xaaccff;
        else if (item.rarity === "Epic") rarityColor = 0xcc00ff;
        else if (item.rarity === "Legendary") rarityColor = 0xffaa00;
        else if (item.rarity === "Mythic") rarityColor = 0xff0044;

        let borderColor = isEquipped ? 0x00ff00 : rarityColor;
        let borderAlpha = isEquipped ? 1 : 0.8;
        let borderThickness = isEquipped ? 4 : 2;
        let bgColor = isEquipped ? 0x002200 : 0x000c22;

        const bg = this.add.graphics();
        bg.fillStyle(bgColor, 0.9);
        
        bg.fillRoundedRect(-140, -160, 280, 320, 20); 
        bg.lineStyle(borderThickness, borderColor, borderAlpha);
        bg.strokeRoundedRect(-140, -160, 280, 320, 20);

        const rarityStr = (item.rarity || "Common").toUpperCase();
        const rarityTag = this.add.text(0, -135, rarityStr, { 
            fontSize: "14px", fontFamily: "Arial", 
            color: "#" + rarityColor.toString(16).padStart(6, '0'), fontStyle: "bold" 
        }).setOrigin(0.5);

        let preview;
        if (item.type === "ship") {
            const previewKey = item.id === "default" ? "player_lv1" : (this.textures.exists(`${item.id}_lv1`) ? `${item.id}_lv1` : "player_lv1");
            preview = this.add.image(0, -50, previewKey).setScale(0.8);
        } else if (item.type === "avatar") {
            preview = this.add.text(0, -50, item.value || "👤", { fontSize: "65px" }).setOrigin(0.5);
        } else {
            const previewKey = item.id === "default" ? "spark" : (this.textures.exists(`${item.id}_img`) ? `${item.id}_img` : "spark");
            preview = this.add.image(0, -50, previewKey);
            
            if (item.type === "dash") preview.setScale(1.5);
            else if (item.type === "shield") preview.setScale(0.9);
            else if (item.type === "hud" || item.type === "battery") preview.setScale(0.9);
            else preview.setScale(2.5); // trails or spark
        }

        const name = this.add.text(0, 30, this.sanitizeBanglaText(item.name), { 
            fontSize: "22px", fontFamily: "'Anek Bangla'", padding: { y: 2 }, 
            fontWeight: 800, color: "#ffffff", align: 'center', wordWrap: { width: 260 } 
        }).setOrigin(0.5);
        
        const desc = this.add.text(0, 70, this.sanitizeBanglaText(item.desc), { 
            fontSize: "16px", fontFamily: "'Anek Bangla'", padding: { y: 2 }, 
            color: "#aaccff", align: 'center', wordWrap: { width: 260 }, lineSpacing: 4 
        }).setOrigin(0.5);

        let statusBadge;
        if (isEquipped) {
            statusBadge = this.add.text(0, 120, "✔ ব্যবহৃত (Equipped)", { 
                fontSize: "18px", fontFamily: "'Anek Bangla'", fontWeight: "bold", 
                color: "#00ff00", backgroundColor: "#004400", padding: { x: 12, y: 6 } 
            }).setOrigin(0.5);
        } else {
            statusBadge = this.add.text(0, 120, "ব্যবহার করুন (Equip)", { 
                fontSize: "18px", fontFamily: "'Anek Bangla'", fontWeight: "bold", 
                color: "#88bbdd", backgroundColor: "#002244", padding: { x: 12, y: 6 } 
            }).setOrigin(0.5);
        }

        const hitArea = this.add.rectangle(0, 0, 280, 320, 0x000000, 0).setInteractive({ useHandCursor: true });

        cardContainer.add([bg, rarityTag, preview, name, desc, statusBadge, hitArea]);
        this.container.add(cardContainer);

        let downY = 0;
        hitArea.on('pointerdown', (pointer) => {
            downY = pointer.y;
            this.tweens.add({ targets: cardContainer, scale: 0.95, duration: 50 });
        });
        
        hitArea.on('pointerup', (pointer) => {
            this.tweens.add({ targets: cardContainer, scale: 1, duration: 50 });
            if (Math.abs(pointer.y - downY) < 15) {
                if (this.scrollState) this.scrollState.velocityY = 0; 
                this.playSound('sfx_powerup');
                
                let valToSet = isEquipped ? "default" : item.id;
                
                if (item.type === "ship") GameState.equippedShip = valToSet;
                else if (item.type === "avatar") GameState.equippedAvatar = valToSet;
                else if (item.type === "shield") GameState.equippedShield = valToSet;
                else if (item.type === "trail") GameState.equippedTrail = valToSet;
                else if (item.type === "dash") GameState.equippedDashAura = valToSet;
                else if (item.type === "hud") GameState.equippedHud = valToSet;
                else if (item.type === "battery") GameState.equippedBattery = valToSet;
                
                window.saveGame();
                this.refreshContent();
            }
        });
        
        hitArea.on('pointerout', () => { 
            this.tweens.add({ targets: cardContainer, scale: 1, duration: 50 }); 
        });
    }

    renderShipList() {
        const shipData = window.ShipData || [];
        const allShips = [{ id: "default", name: "মাছরাঙা", costType: "free", desc: "নদীর দ্রুতগামী শিকারী।" }, ...shipData];

        allShips.forEach((ship, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const xPos = col === 0 ? 190 : 530; 
            const yPos = row * 430 + 220; 

            this.createShipCard(ship, xPos, yPos);
            this.contentHeight = yPos + 220; 
        });
    }

    renderBoosterList() {
        const boosterData = window.BoosterData || [];
        boosterData.forEach((item, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const xPos = col === 0 ? 190 : 530;
            const yPos = row * 430 + 220; 
            this.createBoosterCard(item, xPos, yPos);
            this.contentHeight = yPos + 220;
        });
    }

    renderThemeList() {
        const themeData = window.ThemeData || [];
        themeData.forEach((theme, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const xPos = col === 0 ? 190 : 530;
            const yPos = row * 430 + 220; 
            this.createThemeCard(theme, xPos, yPos);
            this.contentHeight = yPos + 220;
        });
    }

    createShipCard(ship, x, y) {
        const cardContainer = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.75);
        bg.fillRoundedRect(-155, -205, 310, 410, 20); 
        bg.lineStyle(3, 0x0066aa, 0.6);
        bg.strokeRoundedRect(-155, -205, 310, 410, 20);

        const previewKey = ship.id !== "default" ? `${ship.id}_lv1` : "player_lv1";
        const finalKey = this.textures.exists(previewKey) ? previewKey : "player_lv1";
        const preview = this.add.image(0, -95, finalKey).setScale(0.75);

        const name = this.add.text(0, 10, this.sanitizeBanglaText(ship.name), { fontSize: "26px", fontFamily: "'Anek Bangla'",padding: { y: 5 }, fontWeight: 800, color: "#ffffff", align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5);
        const desc = this.add.text(0, 65, this.sanitizeBanglaText(ship.desc), { fontSize: "20px", fontFamily: "'Anek Bangla'", padding: { y: 5 }, color: "#aaccff", align: 'center', wordWrap: { width: 280 }, lineSpacing: 4 }).setOrigin(0.5);

        cardContainer.add([bg, preview, name, desc]);

        const isOwned = GameState.ownedShips.includes(ship.id);
        const isEquipped = GameState.equippedShip === ship.id;
        const craftingEnd = GameState.craftingQueue[ship.id];

        let btnColor1 = 0x000000, btnColor2 = 0x000000, btnStroke = 0x000000, btnTextStr = "", onClick = null;

        if (isEquipped) {
            btnColor1 = 0x004400; btnColor2 = 0x002200; btnStroke = 0x00ff00; btnTextStr = "ব্যবহৃত";
        } else if (isOwned) {
            btnColor1 = 0x004488; btnColor2 = 0x002244; btnStroke = 0x00ffff; btnTextStr = "ব্যবহার করুন";
            onClick = () => { this.playSound('sfx_powerup'); GameState.equippedShip = ship.id; this.updateCurrencyDisplay(); this.refreshContent(); };
        } else if (craftingEnd) {
            const now = Date.now();
            if (now >= craftingEnd) {
                btnColor1 = 0x008800; btnColor2 = 0x004400; btnStroke = 0x00ff00; btnTextStr = "সংগ্রহ করুন";
                onClick = () => { this.playSound('sfx_jackpot'); GameState.ownedShips.push(ship.id); delete GameState.craftingQueue[ship.id]; this.updateCurrencyDisplay(); this.refreshContent(); };
            } else {
                btnColor1 = 0x222222; btnColor2 = 0x111111; btnStroke = 0x555555;
                const msLeft = craftingEnd - now;
                const hrs = Math.floor(msLeft / 3600000);
                const mins = Math.floor((msLeft % 3600000) / 60000);
                btnTextStr = `${hrs}h ${mins}m`;
                onClick = () => { this.playSound('sfx_error', 0.4); };
            }
        } else {
            if (ship.costType === "keys") {
                const canAfford = GameState.keys >= ship.cost;
                btnColor1 = canAfford ? 0xaa6600 : 0x442200; btnColor2 = canAfford ? 0x663300 : 0x221100;
                btnStroke = canAfford ? 0xffaa00 : 0x664400;
                btnTextStr = `${ship.cost} চাবি`;
                onClick = () => {
                    if (canAfford) { this.playSound('sfx_coin'); GameState.keys -= ship.cost; GameState.ownedShips.push(ship.id); this.updateCurrencyDisplay(); this.refreshContent(); }
                    else { this.playSound('sfx_error', 0.4); this.cameras.main.shake(100, 0.005); }
                };
            } else if (ship.costType === "debris") {
                const canAfford = GameState.debris >= ship.cost;
                btnColor1 = canAfford ? 0x006688 : 0x002233; btnColor2 = canAfford ? 0x003344 : 0x001122;
                btnStroke = canAfford ? 0x00ffff : 0x004466;
                btnTextStr = `তৈরি (${ship.cost})`;
                onClick = () => {
                    if (canAfford) { this.playSound('sfx_coin'); GameState.debris -= ship.cost; GameState.craftingQueue[ship.id] = Date.now() + ship.time; this.updateCurrencyDisplay(); this.refreshContent(); }
                    else { this.playSound('sfx_error', 0.4); this.cameras.main.shake(100, 0.005); }
                };
            } else { btnTextStr = "ফ্রি"; }
        }

        const btnContainer = this.add.container(0, 145);
        const btnBg = this.add.graphics();
        btnBg.fillGradientStyle(btnColor1, btnColor1, btnColor2, btnColor2, 1);
        btnBg.fillRoundedRect(-110, -30, 220, 60, 30);
        btnBg.lineStyle(3, btnStroke, 1);
        btnBg.strokeRoundedRect(-110, -30, 220, 60, 30);

        const hitArea = this.add.rectangle(0, 0, 220, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        const btnLabel = this.add.text(0, 0, btnTextStr, { fontSize: "24px", fontFamily: "'Anek Bangla'", fontWeight: "bold", color: "#ffffff" }).setOrigin(0.5);

        btnLabel.shipId = ship.id; btnLabel.isTimer = (craftingEnd && Date.now() < craftingEnd);

        btnContainer.add([btnBg, btnLabel, hitArea]);
        cardContainer.add(btnContainer);
        this.container.add(cardContainer);

        if (onClick) {
            let downY = 0;
            hitArea.on('pointerdown', (pointer) => { downY = pointer.y; this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 50 }); });
            hitArea.on('pointerup', (pointer) => { 
                this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 }); 
                if (Math.abs(pointer.y - downY) < 15) {
                    if (this.scrollState) this.scrollState.velocityY = 0; 
                    onClick(); 
                } 
            });
            hitArea.on('pointerout', () => { this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 }); });
        }
    }

    createBoosterCard(item, x, y) {
        const cardContainer = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.75);
        bg.fillRoundedRect(-155, -205, 310, 410, 20);
        bg.lineStyle(3, 0x5500aa, 0.6);
        bg.strokeRoundedRect(-155, -205, 310, 410, 20);

        const iconKey = this.textures.exists(item.icon) ? item.icon : "ui_debris_icon";
        const icon = this.add.image(0, -90, iconKey).setScale(1.5);
        const name = this.add.text(0, 5, this.sanitizeBanglaText(item.name), { fontSize: "26px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#ffffff", align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5);
        const desc = this.add.text(0, 60, this.sanitizeBanglaText(item.desc), { fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#ddaaff", align: 'center', wordWrap: { width: 280 }, lineSpacing: 3 }).setOrigin(0.5);
        const count = GameState.boosters[item.id] || 0;
        const countText = this.add.text(0, 110, `মজুদ: ${count}`, { fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#00ff00" }).setOrigin(0.5);
        cardContainer.add([bg, icon, name, desc, countText]);

        const canAfford = GameState.debris >= item.cost;
        const btnColor1 = canAfford ? 0x8800ff : 0x330055; const btnColor2 = canAfford ? 0x4400aa : 0x110022; const btnStroke = canAfford ? 0xff00ff : 0x440088;

        const btnContainer = this.add.container(0, 155);
        const btnBg = this.add.graphics();
        btnBg.fillGradientStyle(btnColor1, btnColor1, btnColor2, btnColor2, 1);
        btnBg.fillRoundedRect(-110, -25, 220, 50, 25);
        btnBg.lineStyle(3, btnStroke, 1);
        btnBg.strokeRoundedRect(-110, -25, 220, 50, 25);

        const hitArea = this.add.rectangle(0, 0, 220, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 0, `${item.cost} ডেব্রি`, { fontSize: "24px", fontFamily: "'Anek Bangla'", fontWeight: "bold", color: "#ffffff" }).setOrigin(0.5);
        btnContainer.add([btnBg, btnTxt, hitArea]);
        cardContainer.add(btnContainer);
        this.container.add(cardContainer);

        if (!canAfford) btnContainer.setAlpha(0.5);

        let downY = 0;
        hitArea.on('pointerdown', (pointer) => { downY = pointer.y; this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 50 }); });
        hitArea.on('pointerup', (pointer) => {
            this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 });
            if (Math.abs(pointer.y - downY) < 15) { 
                if (this.scrollState) this.scrollState.velocityY = 0; 
                if (canAfford) { this.playSound('sfx_coin'); GameState.debris -= item.cost; GameState.boosters[item.id] = (GameState.boosters[item.id] || 0) + 1; this.updateCurrencyDisplay(); this.refreshContent(); }
                else { this.playSound('sfx_error', 0.4); this.cameras.main.shake(100, 0.005); }
            }
        });
        hitArea.on('pointerout', () => { this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 }); });
    }

    createThemeCard(theme, x, y) {
        const cardContainer = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.75);
        bg.fillRoundedRect(-155, -205, 310, 410, 20);
        bg.lineStyle(3, 0x0066aa, 0.6);
        bg.strokeRoundedRect(-155, -205, 310, 410, 20);

        const previewBg = this.add.graphics();
        previewBg.fillGradientStyle(theme.colors.bgTop, theme.colors.bgTop, theme.colors.bgBot, theme.colors.bgBot, 1);
        previewBg.fillRoundedRect(-130, -180, 260, 150, 10);
        previewBg.lineStyle(2, 0xffffff, 0.3);
        previewBg.strokeRoundedRect(-130, -180, 260, 150, 10);
        
        previewBg.fillStyle(theme.colors.starBase, 0.8);
        previewBg.fillCircle(-80, -130, 2); previewBg.fillCircle(-20, -150, 3); previewBg.fillCircle(50, -110, 2); previewBg.fillCircle(90, -140, 1);
        previewBg.fillStyle(theme.colors.starFast, 0.6);
        previewBg.fillCircle(-50, -80, 2); previewBg.fillCircle(70, -60, 2);

        const name = this.add.text(0, -10, this.sanitizeBanglaText(theme.name), { fontSize: "26px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#ffffff", align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5);
        const desc = this.add.text(0, 50, this.sanitizeBanglaText(theme.desc), { fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#aaccff", align: 'center', wordWrap: { width: 280 }, lineSpacing: 4 }).setOrigin(0.5);
        cardContainer.add([bg, previewBg, name, desc]);

        const isOwned = GameState.ownedThemes.includes(theme.id);
        const isEquipped = GameState.equippedTheme === theme.id;
        let btnColor1 = 0x000000, btnColor2 = 0x000000, btnStroke = 0x000000, btnTextStr = "", onClick = null;

        if (isEquipped) { btnColor1 = 0x004400; btnColor2 = 0x002200; btnStroke = 0x00ff00; btnTextStr = "ব্যবহৃত"; }
        else if (isOwned) { btnColor1 = 0x004488; btnColor2 = 0x002244; btnStroke = 0x00ffff; btnTextStr = "ব্যবহার করুন"; onClick = () => { this.playSound('sfx_powerup'); GameState.equippedTheme = theme.id; this.updateCurrencyDisplay(); this.textures.remove('animated_bg_grad'); this.createBackground(); this.refreshContent(); }; }
        else {
            if (theme.costType === "keys") {
                const canAfford = GameState.keys >= theme.cost;
                btnColor1 = canAfford ? 0xaa6600 : 0x442200; btnColor2 = canAfford ? 0x663300 : 0x221100; btnStroke = canAfford ? 0xffaa00 : 0x664400;
                btnTextStr = `${theme.cost} চাবি`;
                onClick = () => { if (canAfford) { this.playSound('sfx_coin'); GameState.keys -= theme.cost; GameState.ownedThemes.push(theme.id); this.updateCurrencyDisplay(); this.refreshContent(); } else { this.playSound('sfx_error', 0.4); this.cameras.main.shake(100, 0.005); } };
            } else { btnTextStr = "ফ্রি"; }
        }

        const btnContainer = this.add.container(0, 145);
        const btnBg2 = this.add.graphics();
        btnBg2.fillGradientStyle(btnColor1, btnColor1, btnColor2, btnColor2, 1);
        btnBg2.fillRoundedRect(-110, -30, 220, 60, 30);
        btnBg2.lineStyle(3, btnStroke, 1);
        btnBg2.strokeRoundedRect(-110, -30, 220, 60, 30);

        const hitArea = this.add.rectangle(0, 0, 220, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        const btnLabel = this.add.text(0, 0, btnTextStr, { fontSize: "24px", fontFamily: "'Anek Bangla'", fontWeight: "bold", color: "#ffffff" }).setOrigin(0.5);
        btnContainer.add([btnBg2, btnLabel, hitArea]);
        cardContainer.add(btnContainer);
        this.container.add(cardContainer);

        if (onClick) {
            let downY = 0;
            hitArea.on('pointerdown', (pointer) => { downY = pointer.y; this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 50 }); });
            hitArea.on('pointerup', (pointer) => { 
                this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 }); 
                if (Math.abs(pointer.y - downY) < 15) { 
                    if (this.scrollState) this.scrollState.velocityY = 0; 
                    onClick(); 
                } 
            });
            hitArea.on('pointerout', () => { this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 }); });
        }
    }

    updateCurrencyDisplay() {
        if (this.kText) this.kText.setText((GameState.keys || 0).toString());
        if (this.dText) this.dText.setText((GameState.debris || 0).toString());
        window.saveCurrency();
    }

    updateTimers() {
        if (this.currentTab !== "ships") return;
        if (!this.container || !this.container.list) return;

        this.container.list.forEach(cardContainer => {
            if (cardContainer.type === 'Container' && cardContainer.list) {
                cardContainer.list.forEach(item => {
                    if (item.type === 'Container' && item.list) {
                        item.list.forEach(grandChild => {
                            if (grandChild.isTimer && grandChild.shipId) {
                                const end = GameState.craftingQueue[grandChild.shipId];
                                if (end) {
                                    const now = Date.now();
                                    if (now >= end) this.refreshContent();
                                    else {
                                        const msLeft = end - now;
                                        const hrs = Math.floor(msLeft / 3600000);
                                        const mins = Math.floor((msLeft % 3600000) / 60000);
                                        const secs = Math.floor((msLeft % 60000) / 1000);
                                        grandChild.setText(`${hrs}h ${mins}m ${secs}s`);
                                    }
                                }
                            }
                        });
                    }
                });
            }
        });
    }
}