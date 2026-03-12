class ShopScene extends Phaser.Scene {
    constructor() {
        super("ShopScene");
        this.currentTab = "ships";
        this.scrollVelocity = 0;
        this.backgroundLayers = [];
        this.contentHeight = 0;
        this.containerY = 0; 
    }

    init() {
        this.currentTab = "ships";
        this.contentHeight = 0;
        this.listStartY = 310; 
        this.containerY = this.listStartY; 
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // --- 0. AUDIO MANAGEMENT ---
        if (typeof GameSFX !== 'undefined') {
            GameSFX.init(this);
        }

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

        // --- 1. BACK BUTTON HANDLER ---
        this.handleBack = () => {
            this.playSound('sfx_back', 0.8);
            this.scene.start("MenuScene");
        };

        if (window.history && window.history.pushState) {
            window.history.pushState(null, null, window.location.href);
            window.onpopstate = () => this.handleBack();
        }
        document.addEventListener("backbutton", this.handleBack, false);

        // --- 2. BACKGROUND VISUALS ---
        this.createBackground();

        // Title
        const title = this.add.text(cx, 160, "দোকান (Shop)", {
            fontSize: "76px",
            fontFamily: "'Anek Bangla'",
            fontWeight: 800,
            color: "#00e1ff",
            stroke: "#000000",
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 15, fill: true, stroke: true }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            y: title.y - 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // --- 3. UI LAYOUT ---
        this.createTopUI();
        this.createCurrencyUI();
        this.createTabs(cx);

        // --- 4. SCROLLABLE CONTAINER ---
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

        // --- 5. CONTENT GENERATION ---
        this.refreshContent();

        // --- 6. SMOOTH SCROLL INPUT LOGIC ---
        this.scrollState = { isDragging: false, velocityY: 0 };
        let startY = 0;
        let lastY = 0;
        let containerStartY = 0;
        let lastTime = 0;

        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < topMargin) return; 
            if (this.contentHeight <= this.visibleHeight) return; 

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

                const minScroll = this.visibleHeight - this.contentHeight - 50; 

                // Rubber banding limits
                if (newY > this.listStartY) {
                    newY = this.listStartY + (newY - this.listStartY) * 0.4;
                } else if (newY < this.listStartY + minScroll) {
                    newY = this.listStartY + minScroll + (newY - (this.listStartY + minScroll)) * 0.4;
                }
                
                this.container.y = newY;

                const now = this.time.now;
                const dt = now - lastTime;
                
                if (dt > 0) {
                    const instantVelocity = (pointer.y - lastY) / dt;
                    this.scrollState.velocityY = (this.scrollState.velocityY * 0.4) + (instantVelocity * 0.6);
                }
                
                lastTime = now;
                lastY = pointer.y;
            }
        });

        const stopDrag = () => { 
            this.scrollState.isDragging = false; 
        };
        
        this.input.on('pointerup', stopDrag);
        this.input.on('pointerout', stopDrag);

        // --- 7. TIMERS ---
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this.updateTimers()
        });

        this.events.on('shutdown', () => {
            document.removeEventListener("backbutton", this.handleBack);
            window.onpopstate = null;
        });
    }

    update(time, delta) {
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

        // Delta-time adjusted scrolling physics (inertia)
        if (this.contentHeight > this.visibleHeight && this.scrollState) {
            if (!this.scrollState.isDragging) {
                const minScroll = this.visibleHeight - this.contentHeight - 50;
                let vY = this.scrollState.velocityY;
                let currentY = this.container.y;

                const timeScale = delta / 16.66; // Normalize to ~60FPS

                if (Math.abs(vY) > 0.01) {
                    currentY += vY * 16 * timeScale;
                    this.scrollState.velocityY *= Math.pow(0.92, timeScale);
                }

                // Elastic Bounds Recovery
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

    // --- AUDIO HELPER ---
    playSound(key, baseVolume = 1.0) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        
        const globalSfxVol = (window.GameState && window.GameState.sfxVolume !== undefined) ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);
        
        if (finalVolume > 0) {
            this.sound.play(key, { volume: finalVolume });
        }
    }

    // --- UI CREATION METHODS ---

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
            this.tweens.add({
                targets: backContainer, scale: 0.9, duration: 50, yoyo: true,
                onComplete: () => this.handleBack()
            });
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
        this.kText = this.add.text(495, 63, keys.toString(), {
            fontSize: "26px", color: "#ffd700", fontFamily: "Arial", fontStyle: "bold"
        }).setOrigin(0, 0.5);

        this.add.rectangle(555, 65, 3, 35, 0x0066aa, 0.8);

        this.add.image(600, 67, "ui_debris_icon").setScale(0.70);
        this.dText = this.add.text(630, 63, debris.toString(), {
            fontSize: "26px", color: "#aaccff", fontFamily: "Arial", fontStyle: "bold"
        }).setOrigin(0, 0.5);
    }

    createBackground() {
        this.backgroundLayers = [];
        if (!this.textures.exists('animated_bg_grad')) {
            const gradBg = this.make.graphics({ x: 0, y: 0 });
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

    createTabs(cx) {
        const y = 250;
        const totalWidth = 480;
        const height = 65;
        const container = this.add.container(cx, y);

        const baseBg = this.add.graphics();
        baseBg.fillStyle(0x041022, 0.9);
        baseBg.fillRoundedRect(-totalWidth / 2, -height / 2, totalWidth, height, height / 2);
        baseBg.lineStyle(3, 0x005588, 0.9);
        baseBg.strokeRoundedRect(-totalWidth / 2, -height / 2, totalWidth, height, height / 2);
        container.add(baseBg);

        const btnWidth = totalWidth / 2;
        this.tabHighlight = this.add.graphics();
        this.tabHighlight.fillStyle(0xffffff, 0.15);
        this.tabHighlight.fillRoundedRect(-btnWidth / 2 + 4, -height / 2 + 4, btnWidth - 8, height - 8, (height - 8) / 2);
        this.tabHighlight.x = -btnWidth / 2;
        container.add(this.tabHighlight);

        this.shipTabTxt = this.add.text(-btnWidth / 2, 0, "🚀 শীপ (Jahaj)", {
            fontSize: "26px", fontFamily: "'Anek Bangla'", fontWeight: 700, color: "#ffffff"
        }).setOrigin(0.5);

        this.boosterTabTxt = this.add.text(btnWidth / 2, 0, "⚡ বুস্টার (Boosters)", {
            fontSize: "26px", fontFamily: "'Anek Bangla'", fontWeight: 700, color: "#88bbdd"
        }).setOrigin(0.5);

        const shipHitArea = this.add.rectangle(-btnWidth / 2, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        const boosterHitArea = this.add.rectangle(btnWidth / 2, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });

        shipHitArea.on('pointerdown', () => this.switchTab("ships"));
        boosterHitArea.on('pointerdown', () => this.switchTab("boosters"));

        container.add([this.shipTabTxt, this.boosterTabTxt, shipHitArea, boosterHitArea]);
    }

    switchTab(tab) {
        if (this.currentTab === tab) return;
        this.currentTab = tab;

        this.playSound('sfx_click', 0.7);

        const btnWidth = 480 / 2;
        this.tweens.add({
            targets: this.tabHighlight,
            x: tab === "ships" ? -btnWidth / 2 : btnWidth / 2,
            duration: 250,
            ease: 'Cubic.out'
        });

        this.shipTabTxt.setColor(tab === "ships" ? "#ffffff" : "#88bbdd");
        this.boosterTabTxt.setColor(tab === "boosters" ? "#ffffff" : "#88bbdd");

        // Reset scroll position
        this.containerY = this.listStartY;
        this.container.y = this.listStartY;
        this.refreshContent();
    }

    refreshContent() {
        this.container.removeAll(true);
        if (this.currentTab === "ships") {
            this.renderShipList();
        } else {
            this.renderBoosterList();
        }
    }

    renderShipList() {
        const shipData = window.ShipData || [];
        const allShips = [{ id: "default", name: "Standard Issue", costType: "free", desc: "নির্ভরযোগ্য এবং শক্তপোক্ত।" }, ...shipData];

        allShips.forEach((ship, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            
            // X: center coordinates for 2 columns within 720 width
            const xPos = col === 0 ? 190 : 530; 
            // Y: Card height ~400, spacing 420. Start at Y=220 to align properly
            const yPos = row * 430 + 220; 

            this.createShipCard(ship, xPos, yPos);
            this.contentHeight = yPos + 220; // Extend height to bottom of the card
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

    createShipCard(ship, x, y) {
        const cardContainer = this.add.container(x, y);

        // --- Card Background ---
        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.75);
        bg.fillRoundedRect(-155, -205, 310, 410, 20); // Compact vertical layout
        bg.lineStyle(3, 0x0066aa, 0.6);
        bg.strokeRoundedRect(-155, -205, 310, 410, 20);

        // --- Ship Preview ---
        const previewKey = ship.id !== "default" ? `${ship.id}_lv1` : "player_lv1";
        const finalKey = this.textures.exists(previewKey) ? previewKey : "player_lv1";
        const preview = this.add.image(0, -95, finalKey).setScale(0.75);

        // --- Text Info ---
        const name = this.add.text(0, 10, ship.name, {
            fontSize: "26px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#ffffff",
            align: 'center', wordWrap: { width: 280 }
        }).setOrigin(0.5);

        const desc = this.add.text(0, 65, ship.desc, {
            fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#aaccff", 
            align: 'center', wordWrap: { width: 280 }, lineSpacing: 4
        }).setOrigin(0.5);

        cardContainer.add([bg, preview, name, desc]);

        // --- Button Logic ---
        const isOwned = GameState.ownedShips.includes(ship.id);
        const isEquipped = GameState.equippedShip === ship.id;
        const craftingEnd = GameState.craftingQueue[ship.id];

        let btnColor1 = 0x000000, btnColor2 = 0x000000, btnStroke = 0x000000;
        let btnTextStr = "";
        let onClick = null;

        if (isEquipped) {
            btnColor1 = 0x004400; btnColor2 = 0x002200; btnStroke = 0x00ff00; btnTextStr = "EQUIPPED";
        } else if (isOwned) {
            btnColor1 = 0x004488; btnColor2 = 0x002244; btnStroke = 0x00ffff; btnTextStr = "EQUIP";
            onClick = () => {
                this.playSound('sfx_powerup');
                GameState.equippedShip = ship.id;
                this.updateCurrencyDisplay();
                this.refreshContent();
            };
        } else if (craftingEnd) {
            const now = Date.now();
            if (now >= craftingEnd) {
                btnColor1 = 0x008800; btnColor2 = 0x004400; btnStroke = 0x00ff00; btnTextStr = "CLAIM";
                onClick = () => {
                    this.playSound('sfx_jackpot');
                    GameState.ownedShips.push(ship.id);
                    delete GameState.craftingQueue[ship.id];
                    this.updateCurrencyDisplay();
                    this.refreshContent();
                };
            } else {
                btnColor1 = 0x222222; btnColor2 = 0x111111; btnStroke = 0x555555;
                const msLeft = craftingEnd - now;
                const hrs = Math.floor(msLeft / 3600000);
                const mins = Math.floor((msLeft % 3600000) / 60000);
                btnTextStr = `${hrs}h ${mins}m`;
                onClick = () => { this.playSound('sfx_error', 0.5); };
            }
        } else {
            if (ship.costType === "keys") {
                const canAfford = GameState.keys >= ship.cost;
                btnColor1 = canAfford ? 0xaa6600 : 0x442200; btnColor2 = canAfford ? 0x663300 : 0x221100;
                btnStroke = canAfford ? 0xffaa00 : 0x664400;
                btnTextStr = `${ship.cost} KEYS`;
                onClick = () => {
                    if (canAfford) {
                        this.playSound('sfx_coin');
                        GameState.keys -= ship.cost;
                        GameState.ownedShips.push(ship.id);
                        this.updateCurrencyDisplay();
                        this.refreshContent();
                    } else {
                        this.playSound('sfx_error');
                        this.cameras.main.shake(100, 0.005);
                    }
                };
            } else if (ship.costType === "debris") {
                const canAfford = GameState.debris >= ship.cost;
                btnColor1 = canAfford ? 0x006688 : 0x002233; btnColor2 = canAfford ? 0x003344 : 0x001122;
                btnStroke = canAfford ? 0x00ffff : 0x004466;
                btnTextStr = `CRAFT (${ship.cost})`;
                onClick = () => {
                    if (canAfford) {
                        this.playSound('sfx_coin');
                        GameState.debris -= ship.cost;
                        GameState.craftingQueue[ship.id] = Date.now() + ship.time;
                        this.updateCurrencyDisplay();
                        this.refreshContent();
                    } else {
                        this.playSound('sfx_error');
                        this.cameras.main.shake(100, 0.005);
                    }
                };
            } else {
                btnTextStr = "FREE";
            }
        }

        // --- Action Button ---
        const btnContainer = this.add.container(0, 145);

        const btnBg = this.add.graphics();
        btnBg.fillGradientStyle(btnColor1, btnColor1, btnColor2, btnColor2, 1);
        btnBg.fillRoundedRect(-110, -30, 220, 60, 30);
        btnBg.lineStyle(3, btnStroke, 1);
        btnBg.strokeRoundedRect(-110, -30, 220, 60, 30);

        const hitArea = this.add.rectangle(0, 0, 220, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        const btnLabel = this.add.text(0, 0, btnTextStr, {
            fontSize: "20px", fontFamily: "Arial", fontWeight: "bold", color: "#ffffff"
        }).setOrigin(0.5);

        btnLabel.shipId = ship.id;
        btnLabel.isTimer = (craftingEnd && Date.now() < craftingEnd);

        btnContainer.add([btnBg, btnLabel, hitArea]);
        cardContainer.add(btnContainer);
        this.container.add(cardContainer);

        if (onClick) {
            let downY = 0;
            hitArea.on('pointerdown', (pointer) => {
                downY = pointer.y;
                this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 50 });
            });
            // Separating pointerup from pointerdown ensures we don't accidentally click while scrolling
            hitArea.on('pointerup', (pointer) => {
                this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 });
                if (Math.abs(pointer.y - downY) < 15) {
                    onClick();
                }
            });
            hitArea.on('pointerout', () => {
                this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 });
            });
        }
    }

    createBoosterCard(item, x, y) {
        const cardContainer = this.add.container(x, y);

        // --- Card Background ---
        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.75);
        bg.fillRoundedRect(-155, -205, 310, 410, 20);
        bg.lineStyle(3, 0x5500aa, 0.6);
        bg.strokeRoundedRect(-155, -205, 310, 410, 20);

        // --- Icon & Text ---
        const iconKey = this.textures.exists(item.icon) ? item.icon : "ui_debris_icon";
        const icon = this.add.image(0, -90, iconKey).setScale(1.5);

        const name = this.add.text(0, 5, item.name, {
            fontSize: "26px", fontFamily: "'Anek Bangla'", fontWeight: 800, color: "#ffffff",
            align: 'center', wordWrap: { width: 280 }
        }).setOrigin(0.5);

        const desc = this.add.text(0, 60, item.desc, {
            fontSize: "17px", fontFamily: "'Anek Bangla'", color: "#ddaaff", 
            align: 'center', wordWrap: { width: 280 }, lineSpacing: 3
        }).setOrigin(0.5);

        const count = GameState.boosters[item.id] || 0;
        const countText = this.add.text(0, 110, `মজুদ (Owned): ${count}`, {
            fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#00ff00"
        }).setOrigin(0.5);

        cardContainer.add([bg, icon, name, desc, countText]);

        // --- Purchase Button ---
        const canAfford = GameState.debris >= item.cost;
        const btnColor1 = canAfford ? 0x8800ff : 0x330055;
        const btnColor2 = canAfford ? 0x4400aa : 0x110022;
        const btnStroke = canAfford ? 0xff00ff : 0x440088;

        const btnContainer = this.add.container(0, 155);
        const btnBg = this.add.graphics();
        btnBg.fillGradientStyle(btnColor1, btnColor1, btnColor2, btnColor2, 1);
        btnBg.fillRoundedRect(-110, -25, 220, 50, 25);
        btnBg.lineStyle(3, btnStroke, 1);
        btnBg.strokeRoundedRect(-110, -25, 220, 50, 25);

        const hitArea = this.add.rectangle(0, 0, 220, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 0, `${item.cost} Debris`, {
            fontSize: "20px", fontFamily: "Arial", fontWeight: "bold", color: "#ffffff"
        }).setOrigin(0.5);

        btnContainer.add([btnBg, btnTxt, hitArea]);
        cardContainer.add(btnContainer);
        this.container.add(cardContainer);

        if (!canAfford) {
            btnContainer.setAlpha(0.5);
        }

        let downY = 0;
        hitArea.on('pointerdown', (pointer) => {
            downY = pointer.y;
            this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 50 });
        });
        
        hitArea.on('pointerup', (pointer) => {
            this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 });
            if (Math.abs(pointer.y - downY) < 15) { // Prevent trigger if scrolling
                if (canAfford) {
                    this.playSound('sfx_coin');
                    GameState.debris -= item.cost;
                    GameState.boosters[item.id] = (GameState.boosters[item.id] || 0) + 1;
                    this.updateCurrencyDisplay();
                    this.refreshContent();
                } else {
                    this.playSound('sfx_error');
                    this.cameras.main.shake(100, 0.005);
                }
            }
        });

        hitArea.on('pointerout', () => {
            this.tweens.add({ targets: btnContainer, scale: 1, duration: 50 });
        });
    }

    updateCurrencyDisplay() {
        if (this.kText) this.kText.setText((GameState.keys || 0).toString());
        if (this.dText) this.dText.setText((GameState.debris || 0).toString());
        window.saveCurrency();
    }

    updateTimers() {
        if (this.currentTab !== "ships") return;

        // Iterate through UI elements to find active timers
        this.container.list.forEach(cardContainer => {
            if (cardContainer.type === 'Container' && cardContainer.list) {
                cardContainer.list.forEach(item => {
                    // Check inside button containers
                    if (item.type === 'Container' && item.list) {
                        item.list.forEach(grandChild => {
                            if (grandChild.isTimer && grandChild.shipId) {
                                const end = GameState.craftingQueue[grandChild.shipId];
                                if (end) {
                                    const now = Date.now();
                                    if (now >= end) {
                                        this.refreshContent();
                                    } else {
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