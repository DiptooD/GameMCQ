class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
        
        this.selectedBankKey = localStorage.getItem('saved_bankKey') || "all";
        this.selectedSubject = localStorage.getItem('saved_subject') || "all_no_math";
        this.selectedMode = localStorage.getItem('saved_mode') || "normal"; 
        
        this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';

        this.dropdowns = []; 
        this.backgroundLayers = [];
    }

    create() {
        if (window.GameState && window.GameState.viewingHistoryMatch) {
            window.GameState.viewingHistoryMatch = null;
        }

        if (typeof window.GameState === 'undefined') {
            window.GameState = { 
                equippedShip: "default", 
                weaponLevel: 1, 
                keys: 0, 
                debris: 0,
                boosters: { fireShield: 0, speedBoost: 0, batteryEff: 0 },
                musicVolume: 0.5,
                sfxVolume: 1.0,
                matchHistory: []
            };
        }

        if (typeof GameTextures !== 'undefined') GameTextures.init(this);
        if (typeof PlayerShipTextures !== 'undefined') PlayerShipTextures.init(this);
        if (typeof GameSFX !== 'undefined') GameSFX.init(this);

        if (this.sound.get('bg_music')) {
            this.sound.get('bg_music').stop();
        }

        let menuMusic = this.sound.get('menubgm');
        if (!menuMusic) {
            menuMusic = this.sound.add('menubgm', { loop: true, volume: window.GameState.musicVolume });
            menuMusic.play();
        } else {
            menuMusic.setVolume(window.GameState.musicVolume);
            if (!menuMusic.isPlaying) {
                menuMusic.play();
            }
        }

        const manifest = this.cache.json.get('bank_directory');

        if (this.selectedMode === "revision" && this.getAvailableQuestionCount("revision") === 0) {
            this.selectedMode = "normal";
            localStorage.setItem('saved_mode', "normal");
        }
        this.createBackground();

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const UI_WIDTH = 520;      
        
        this.createCurrencyUI();
        this.createTopLeftIcons();

        const titleContainer = this.add.container(cx, cy - 420);
        const titleText = this.add.text(0, 0, "গেইম MCQ", { 
            fontSize: "100px",
            fontFamily: "'Anek Bangla'", 
            fontWeight: 800, 
            color: "#00e1ff", 
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 10,
            shadow: { offsetX: 4, offsetY: 4, color: "#0044aa", blur: 15, stroke: true, fill: true }
        }).setOrigin(0.5);
        titleContainer.add(titleText);

        this.tweens.add({
            targets: titleContainer, y: titleContainer.y - 15, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        this.time.addEvent({
            delay: 400, 
            loop: true,
            callback: () => {
                if (Math.random() > 0.85) { 
                    titleText.x = Phaser.Math.FloatBetween(-0.5, 0.5);
                    titleText.y = Phaser.Math.FloatBetween(-0.5, 0.5);
                    titleText.angle = Phaser.Math.FloatBetween(-0.2, 0.2);
                } else {
                    titleText.x = 0; titleText.y = 0; titleText.angle = 0;
                }
            }
        });
        
        // --- ADD THE KINGFISHER ANIMATION ---
        this.createTitleBird(cx, cy - 420);
        
        this.createHangarButton(cx, cy - 220);

        const panelY = cy + 40;
        this.createSettingsPanel(cx, panelY, UI_WIDTH, manifest);

        const startY = panelY + 270;
        this.createStartButton(cx, startY, UI_WIDTH + 60, 100); 

        const tipsY = startY + 165;
        this.createTipsBox(cx, tipsY, UI_WIDTH + 60);

        this.createBottomMenu(cx, this.cameras.main.height - 110, UI_WIDTH + 100, 90); 
        
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                this.closeAllDropdowns();
            }
        });

        if (GameState.showHistoryPopupOnLoad) {
            GameState.showHistoryPopupOnLoad = false;
            this.showMatchHistoryPopup(); 
        }
    }

    update(time, delta) {
        const safeTimeScale = Phaser.Math.Clamp(delta / 16.66, 0.1, 2.5);

        if (this.scrollingBg) {
            this.scrollingBg.tilePositionY -= 0.6 * safeTimeScale;
        }

        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                layer.group.children.iterate(star => {
                    if (star) {
                        star.y += layer.speed * safeTimeScale;
                        if (star.y > this.cameras.main.height) {
                            star.y = -10;
                            star.x = Phaser.Math.Between(0, 720);
                        }
                    }
                });
            });
        }

        if (this.reactorRing) {
            this.reactorRing.rotation += 0.015 * safeTimeScale;
        }

        if (this.historyScrollData && this.historyScrollState) {
            if (!this.historyScrollState.isDragging) {
                let { contentContainer, listStartY, minScroll } = this.historyScrollData;
                let vY = this.historyScrollState.velocityY;
                let currentY = contentContainer.y;

                if (Math.abs(vY) > 0.01) {
                    currentY += vY * 16 * safeTimeScale;
                    this.historyScrollState.velocityY *= Math.pow(0.9, safeTimeScale); 
                }

                if (currentY > listStartY) {
                    currentY += (listStartY - currentY) * 0.2 * safeTimeScale;
                } else if (currentY < listStartY + minScroll) {
                    currentY += ((listStartY + minScroll) - currentY) * 0.2 * safeTimeScale;
                }

                contentContainer.y = currentY;
            } else {
                this.historyScrollState.velocityY *= 0.8; 
            }
        }
    }

    createTitleBird(titleX, titleY) {
        // "player_lv1" is the default ship (মাছরাঙা / Kingfisher)
        this.titleBird = this.add.image(-100, -100, "player_lv1").setScale(0.65).setDepth(50);
        
        const animateBird = () => {
            if (!this.scene.isActive()) return; // Stop if scene changed
            const w = this.cameras.main.width;
            
            // Randomize starting side
            const fromLeft = Math.random() > 0.5;
            const startX = fromLeft ? -100 : w + 100;
            const startY = titleY - Phaser.Math.Between(100, 300);
            
            // Target perch position (top edge of the title text)
            const landX = titleX + Phaser.Math.Between(-100, 100);
            const landY = titleY - 65; 
            
            const endX = fromLeft ? w + 100 : -100;
            const endY = titleY - Phaser.Math.Between(200, 400);

            this.titleBird.setPosition(startX, startY);
            
            // Rotate to face movement direction
            const angleToLand = Phaser.Math.Angle.Between(startX, startY, landX, landY);
            this.titleBird.setRotation(angleToLand + Math.PI / 2);

            this.tweens.add({
                targets: this.titleBird,
                x: landX,
                y: landY,
                duration: 1500,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    // Perch angle 
                    this.tweens.add({
                        targets: this.titleBird,
                        rotation: (fromLeft ? 0.2 : -0.2), 
                        duration: 200,
                        onComplete: () => {
                            // Peck/Hop animation
                            this.tweens.add({
                                targets: this.titleBird,
                                y: landY - 20,
                                duration: 250,
                                yoyo: true,
                                repeat: 3,
                                ease: 'Quad.easeOut',
                                onComplete: () => {
                                    // Take off calculation
                                    const angleToExit = Phaser.Math.Angle.Between(landX, landY, endX, endY);
                                    this.tweens.add({
                                        targets: this.titleBird,
                                        rotation: angleToExit + Math.PI / 2,
                                        duration: 200,
                                        onComplete: () => {
                                            this.tweens.add({
                                                targets: this.titleBird,
                                                x: endX,
                                                y: endY,
                                                duration: 1500,
                                                ease: 'Sine.easeIn',
                                                onComplete: () => {
                                                    // Loop after a randomized delay
                                                    this.time.delayedCall(Phaser.Math.Between(4000, 8000), animateBird);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        };

        // Start the first loop after a short delay
        this.time.delayedCall(2000, animateBird);
    }

    playSound(key, baseVolume = 1.0) {
        if (this.cache.audio.exists(key)) {
            const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
            this.sound.play(key, { volume: finalVolume });
        }
    }

    showToast(msg) {
        const toast = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 450, msg, {
            fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff', 
            backgroundColor: 'rgba(200, 0, 0, 0.95)', padding: {x: 20, y: 12}
        }).setOrigin(0.5).setDepth(5000).setAlpha(0);
        
        this.tweens.add({ 
            targets: toast, alpha: 1, duration: 250, yoyo: true, hold: 2500, onComplete: () => toast.destroy() 
        });
    }

    getAvailableQuestionCount(mode) {
        const manifest = this.cache.json.get('bank_directory');
        if (!manifest) return 0;
        let finalQuestions = [];

        if (this.selectedBankKey === "all") {
            manifest.banks.forEach(bank => {
                const data = this.cache.json.get(bank.key);
                if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
            });
        } else {
            const data = this.cache.json.get(this.selectedBankKey);
            if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
        }
        
        finalQuestions = finalQuestions.filter(q => q.question && q.question.trim() !== "");

        if (this.selectedSubject === "all_no_math") {
            finalQuestions = finalQuestions.filter(q => q.subject !== "Math");
        } else if (this.selectedSubject !== "all") {
            finalQuestions = finalQuestions.filter(q => q.subject === this.selectedSubject);
        }

        let seenQuestions = JSON.parse(localStorage.getItem('seenQuestions') || '[]');

        if (mode === "revision") {
            return finalQuestions.filter(q => seenQuestions.includes(q.question)).length;
        } else if (mode === "new") {
            return finalQuestions.filter(q => !seenQuestions.includes(q.question)).length;
        }
        return finalQuestions.length;
    }

    createTopLeftIcons() {
        const iconY = 65;

        const exitBg = this.add.circle(60, iconY, 28, 0x001122, 0.8).setStrokeStyle(3, 0xaa0000);
        const exitIcon = this.add.text(60, iconY, "❌", { fontSize: '24px' }).setOrigin(0.5);
        const exitHitArea = this.add.circle(60, iconY, 35).setInteractive({ useHandCursor: true });

        exitHitArea.on('pointerdown', () => {
            this.playSound('sfx_back');
            this.tweens.add({ targets: [exitBg, exitIcon], scale: 0.9, duration: 50, yoyo: true });
            if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
            }
        });

        const settingsBg = this.add.circle(135, iconY, 28, 0x001122, 0.8).setStrokeStyle(3, 0x0066aa);
        const settingsIcon = this.add.text(135, iconY, "⚙️", { fontSize: '30px' }).setOrigin(0.5);
        const settingsHitArea = this.add.circle(135, iconY, 35).setInteractive({ useHandCursor: true });

        settingsHitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.tweens.add({ targets: [settingsBg, settingsIcon], scale: 0.9, duration: 50, yoyo: true });
            this.scene.pause("MenuScene");
            this.scene.launch("SettingsScene");
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

    createHangarButton(x, y) {
        const container = this.add.container(x, y);

        const pedestal = this.add.ellipse(0, 90, 240, 50, 0x00A6FF, 0.1);
        pedestal.setStrokeStyle(2, 0x00A6FF, 0.2);
        
        const ringGraphics = this.make.graphics();
        ringGraphics.lineStyle(3, 0x00ffff, 0.4);
        ringGraphics.strokeCircle(0, 0, 100); 
        ringGraphics.lineStyle(2, 0x0088ff, 0.8);
        for(let i=0; i<6; i++) {
            const angle = Phaser.Math.DegToRad(i * 60);
            ringGraphics.beginPath();
            ringGraphics.arc(0, 0, 90, angle, angle + 0.5);
            ringGraphics.strokePath();
        }
        ringGraphics.generateTexture("tech_ring_large", 220, 220);
        ringGraphics.destroy();

        this.reactorRing = this.add.image(0, 10, "tech_ring_large").setAlpha(0.2);
        const bgGlow = this.add.circle(0, 10, 80, 0x002255, 0.7);

        const equipped = window.GameState.equippedShip || "default";
        const level = window.GameState.weaponLevel || 1;
        
        let shipTexture = (equipped === "default") ? `player_lv${level}` : `${equipped}_lv${level}`;
        if (!this.textures.exists(shipTexture)) shipTexture = "player_lv1";
        
        const shipIcon = this.add.image(0, -15, shipTexture).setScale(0.85); 
        
        this.tweens.add({
            targets: shipIcon, y: -5, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        const labelBg = this.add.graphics();
        labelBg.fillStyle(0x000000, 0.85);
        labelBg.fillRoundedRect(-90, 120, 180, 40, 20);
        labelBg.lineStyle(2, 0x00aaff, 1);
        labelBg.strokeRoundedRect(-90, 120, 180, 40, 20);
        
        const label = this.add.text(0, 140, "CUSTOMIZE", { 
            fontSize: "18px", fontFamily: "Arial", color: "#00ffff", fontStyle: "bold", letterSpacing: 3
        }).setOrigin(0.5);

        const hitArea = this.add.circle(0, 30, 140, 0xffffff, 0).setInteractive({ useHandCursor: true });
        
        hitArea.on('pointerover', () => {
            this.reactorRing.setTint(0xffffff);
            bgGlow.setFillStyle(0x004488, 0.8);
            pedestal.setStrokeStyle(2, 0xffffff, 0.8);
        });
        
        hitArea.on('pointerout', () => {
            this.reactorRing.clearTint();
            bgGlow.setFillStyle(0x002255, 0.7);
            pedestal.setStrokeStyle(2, 0x00ffff, 0.5);
        });

        hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.tweens.add({
                targets: container, scale: 0.95, duration: 80, yoyo: true, onComplete: () => this.scene.start("ShopScene") 
            });
        });

        container.add([pedestal, bgGlow, this.reactorRing, shipIcon, labelBg, label, hitArea]);
    }

    createSettingsPanel(x, y, width, manifest) {
        const height = 330; 
        
        const panelGraphics = this.add.graphics();
        panelGraphics.fillStyle(0x000c22, 0.75); 
        panelGraphics.fillRoundedRect(x - width/2, y - height/2, width, height, 20);
        panelGraphics.lineStyle(2, 0x0066aa, 0.6);
        panelGraphics.strokeRoundedRect(x - width/2, y - height/2, width, height, 20);

        let currentY = y - height/2 + 55;
        const UI_HEIGHT = 75; 
        const GAP = 25;

        const bankOptions = ["All", ...manifest.banks.map(b => b.name).reverse()];
        const subjectOptions = ["All", "All Without Math", ...manifest.subjects];

        let initBankName = "All";
        if (this.selectedBankKey !== "all") {
            const b = manifest.banks.find(x => x.key === this.selectedBankKey);
            if (b) initBankName = b.name;
        }

        let initSubName = "All Without Math"; 
        if (this.selectedSubject === "all") initSubName = "All";
        else if (this.selectedSubject !== "all_no_math") initSubName = this.selectedSubject;

        this.createDropdown(x, currentY, width - 40, UI_HEIGHT, "Bank", bankOptions, initBankName, (selectedName) => {
            if (selectedName === "All") {
                this.selectedBankKey = "all";
            } else {
                const bankObj = manifest.banks.find(b => b.name === selectedName);
                this.selectedBankKey = bankObj ? bankObj.key : "all";
            }
            localStorage.setItem('saved_bankKey', this.selectedBankKey);
        });

        currentY += UI_HEIGHT + GAP;

        this.createDropdown(x, currentY, width - 40, UI_HEIGHT, "Subject", subjectOptions, initSubName, (selectedSub) => {
            if (selectedSub === "All") this.selectedSubject = "all";
            else if (selectedSub === "All Without Math") this.selectedSubject = "all_no_math";
            else this.selectedSubject = selectedSub;
            localStorage.setItem('saved_subject', this.selectedSubject);
        });

        currentY += UI_HEIGHT + GAP; 

        this.createModeSelector(x, currentY, width - 40, UI_HEIGHT);
    }

    createDropdown(x, y, width, height, label, options, initialVal, onSelect) {
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x081830, 0.9);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
        bg.lineStyle(2, 0x0088cc, 0.7);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);

        const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });

        const formatText = (lbl, val) => {
            let str = `${lbl}: ${val}`;
            return str.length > 25 ? str.substring(0, 23) + "..." : str;
        };

        const mainText = this.add.text(-width/2 + 25, 0, formatText(label, initialVal), { 
            fontSize: "26px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 600, color: "#ffffff" 
        }).setOrigin(0, 0.5);

        const arrow = this.add.text(width/2 - 30, 0, "▼", { 
            fontSize: "20px", color: "#00ffff" 
        }).setOrigin(0.5);

        container.add([bg, mainText, arrow, hitArea]);
        container.depth = 20; 

        const listContainerWorldY = y + height/2 + 5;
        const listContainer = this.add.container(0, height/2 + 5);
        listContainer.setVisible(false);
        listContainer.setAlpha(0); 
        container.add(listContainer);

        const itemHeight = 70; 
        const maxVisibleItems = 5; 
        const visibleHeight = Math.min(options.length * itemHeight, maxVisibleItems * itemHeight);
        const totalListHeight = options.length * itemHeight;
        const isScrollable = totalListHeight > visibleHeight;

        const listBg = this.add.graphics();
        listBg.fillStyle(0x020815, 0.98);
        listBg.fillRoundedRect(-width/2, 0, width, visibleHeight, 15);
        listBg.lineStyle(2, 0x0066aa, 1);
        listBg.strokeRoundedRect(-width/2, 0, width, visibleHeight, 15);
        listContainer.add(listBg);

        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(x - width/2, listContainerWorldY, width, visibleHeight);
        const listMask = maskGraphics.createGeometryMask();

        const contentContainer = this.add.container(0, 0);
        contentContainer.setMask(listMask);
        listContainer.add(contentContainer);

        const highlightBg = this.add.rectangle(0, 0, width - 4, itemHeight - 2, 0x0088ff, 0.25).setAlpha(0);
        contentContainer.add(highlightBg);

        let currentY = 0;
        options.forEach((opt, index) => {
            const optText = this.add.text(-width/2 + 25, currentY + itemHeight/2, opt, {
                fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 500, color: "#b3d4ff" 
            }).setOrigin(0, 0.5);

            if (index < options.length - 1) {
                const divider = this.add.rectangle(0, currentY + itemHeight, width - 20, 1, 0x003355, 0.6);
                contentContainer.add(divider);
            }

            contentContainer.add(optText);
            currentY += itemHeight;
        });

        let scrollBarThumb;
        if (isScrollable) {
            const scrollBarBg = this.add.rectangle(width/2 - 8, visibleHeight/2, 6, visibleHeight - 10, 0x000000, 0.5);
            const thumbHeight = Math.max(30, (visibleHeight / totalListHeight) * visibleHeight);
            scrollBarThumb = this.add.rectangle(width/2 - 8, thumbHeight/2 + 5, 6, thumbHeight, 0x00aaff, 0.8).setOrigin(0.5);
            listContainer.add([scrollBarBg, scrollBarThumb]);
        }

        const dragZone = this.add.rectangle(0, visibleHeight/2, width, visibleHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true, draggable: isScrollable });
        listContainer.add(dragZone);

        let startDragY = 0;
        let isDragging = false;
        let startContentY = 0;

        dragZone.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            startDragY = pointer.y;
            isDragging = false;
            startContentY = contentContainer.y;
        });

        dragZone.on('pointermove', (pointer) => {
            const localY = pointer.y - listContainerWorldY - contentContainer.y;
            const index = Math.floor(localY / itemHeight);
            if (index >= 0 && index < options.length) {
                highlightBg.y = index * itemHeight + itemHeight / 2;
                highlightBg.setAlpha(1);
            } else {
                highlightBg.setAlpha(0);
            }
        });

        dragZone.on('pointerout', () => { highlightBg.setAlpha(0); });

        if (isScrollable) {
            dragZone.on('drag', (pointer) => {
                isDragging = true;
                let deltaY = pointer.y - startDragY;
                let newY = startContentY + deltaY;

                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;

                if (newY > maxY) newY = maxY + (newY - maxY) * 0.2;
                if (newY < minY) newY = minY + (newY - minY) * 0.2;

                contentContainer.y = newY;

                const scrollPercent = Phaser.Math.Clamp(newY / minY, 0, 1);
                const thumbHeight = scrollBarThumb.height;
                const thumbMaxY = visibleHeight - 5 - thumbHeight/2;
                const thumbMinY = 5 + thumbHeight/2;
                scrollBarThumb.y = thumbMinY + scrollPercent * (thumbMaxY - thumbMinY);
            });

            dragZone.on('dragend', () => {
                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;
                let targetY = contentContainer.y;

                if (targetY > maxY) targetY = maxY;
                if (targetY < minY) targetY = minY;

                if (targetY !== contentContainer.y) {
                    this.tweens.add({
                        targets: contentContainer, y: targetY, duration: 200, ease: 'Back.easeOut'
                    });
                }
            });
            
            dragZone.on('wheel', (pointer, deltaX, deltaY, deltaZ) => {
                let newY = contentContainer.y - deltaY;
                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;
                if (newY > maxY) newY = maxY;
                if (newY < minY) newY = minY;
                
                contentContainer.y = newY;

                const scrollPercent = Phaser.Math.Clamp(newY / minY, 0, 1);
                const thumbHeight = scrollBarThumb.height;
                const thumbMaxY = visibleHeight - 5 - thumbHeight/2;
                const thumbMinY = 5 + thumbHeight/2;
                scrollBarThumb.y = thumbMinY + scrollPercent * (thumbMaxY - thumbMinY);
            });
        }

        dragZone.on('pointerup', (pointer) => {
            pointer.event.stopPropagation();
            if (!isDragging || Math.abs(pointer.y - startDragY) < 10) {
                const localY = pointer.y - listContainerWorldY - contentContainer.y;
                const index = Math.floor(localY / itemHeight);
                
                if (index >= 0 && index < options.length) {
                    const opt = options[index];
                    this.playSound('sfx_coin');
                    mainText.setText(formatText(label, opt));
                    onSelect(opt);
                    toggleMenu();
                }
            }
            isDragging = false;
        });

        let isOpen = false;
        const toggleMenu = () => {
            this.playSound('sfx_click');
            isOpen = !isOpen;
            
            if (isOpen) {
                listContainer.setVisible(true);
                container.depth = 100;
                
                this.tweens.add({ targets: listContainer, alpha: 1, duration: 150, ease: 'Power1' });
                
                this.dropdowns.forEach(d => {
                    if (d !== container && d.isOpen()) d.close();
                });
            } else {
                this.tweens.add({ 
                    targets: listContainer, alpha: 0, duration: 150, ease: 'Power1',
                    onComplete: () => {
                        listContainer.setVisible(false);
                        container.depth = 20;
                        contentContainer.y = 0;
                        if (scrollBarThumb) scrollBarThumb.y = 5 + scrollBarThumb.height / 2;
                    }
                });
            }
            
            this.tweens.add({ targets: arrow, rotation: isOpen ? Math.PI : 0, duration: 200, ease: 'Cubic.out' });
        };

        container.close = () => {
            if(!isOpen) return;
            isOpen = false;
            this.tweens.add({ 
                targets: listContainer, alpha: 0, duration: 150, ease: 'Power1',
                onComplete: () => {
                    listContainer.setVisible(false);
                    container.depth = 20;
                }
            });
            this.tweens.add({ targets: arrow, rotation: 0, duration: 200 });
        };
        
        container.isOpen = () => isOpen;
        this.dropdowns.push(container);

        hitArea.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            toggleMenu();
        });
    }

    createModeSelector(x, y, totalWidth, height) {
        const container = this.add.container(x, y);
        
        const baseBg = this.add.graphics();
        baseBg.fillStyle(0x041022, 0.9);
        baseBg.fillRoundedRect(-totalWidth/2, -height/2, totalWidth, height, height/2);
        baseBg.lineStyle(2, 0x005588, 0.9);
        baseBg.strokeRoundedRect(-totalWidth/2, -height/2, totalWidth, height, height/2);
        container.add(baseBg);

        const options = [
            { label: "Revision", value: "revision" },
            { label: "Normal", value: "normal" },
            { label: "New", value: "new" }
        ];
        
        const btnWidth = totalWidth / options.length;
        const startX = -totalWidth / 2 + btnWidth / 2;
        
        this.modeButtons = [];

        this.modeHighlight = this.add.graphics();
        this.modeHighlight.fillStyle(0xffffff, .1);
        this.modeHighlight.fillRoundedRect(-btnWidth/2 + 4, -height/2 + 4, btnWidth - 8, height - 8, (height-8)/2);
        container.add(this.modeHighlight);

        options.forEach((opt, index) => {
            const btnX = startX + (index * btnWidth);
            const hitArea = this.add.rectangle(btnX, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });
            
            const txt = this.add.text(btnX, 0, opt.label, {
                fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: "#88bbdd" 
            }).setOrigin(0.5);

            hitArea.on('pointerdown', () => {
                if (opt.value === "revision" && this.getAvailableQuestionCount("revision") === 0) {
                    this.playSound('sfx_q_wrong', 0.2);
                    this.showToast("Play a game to earn revision questions.");
                    return; 
                }

                this.playSound('sfx_click');
                const previousMode = this.selectedMode;
                this.selectedMode = opt.value;
                localStorage.setItem('saved_mode', this.selectedMode);
                this.updateModeSelector(btnX);

                if (previousMode !== this.selectedMode && this.cycleTip) {
                    if (this.tipTimerEvent) {
                        this.tipTimerEvent.remove();
                        this.tipTimerEvent = this.time.addEvent({ delay: 8000, loop: true, callback: this.cycleTip });
                    }
                    this.cycleTip();
                }
            });

            this.modeButtons.push({ txt: txt, value: opt.value, x: btnX });
            container.add([txt, hitArea]);
        });

        const defaultBtn = this.modeButtons.find(b => b.value === this.selectedMode);
        if (defaultBtn) {
            this.modeHighlight.x = defaultBtn.x;
            defaultBtn.txt.setColor("#ffffff");
        }
    }
    
    updateModeSelector(targetX) {
        this.tweens.add({ targets: this.modeHighlight, x: targetX, duration: 250, ease: 'Cubic.out' });
        this.modeButtons.forEach(btn => btn.txt.setColor(btn.value === this.selectedMode ? "#ffffff" : "#88bbdd"));
    }

    createStartButton(x, y, width, height) {
        const container = this.add.container(x, y);

        const outerGlow = this.add.graphics();
        outerGlow.fillStyle(0x00ffff, 0.2);
        outerGlow.fillRoundedRect(-width/2 - 15, -height/2 - 15, width + 30, height + 30, height/2 + 8);
        
        this.tweens.add({ targets: outerGlow, alpha: 0.05, scale: 1.1, duration: 1500, yoyo: true, repeat: -1 });

        const btnBg = this.add.graphics();
        btnBg.fillGradientStyle(0x001133, 0x001133, 0x004488, 0x004488, 1);
        btnBg.fillRoundedRect(-width/2, -height/2, width, height, height/2);
        btnBg.lineStyle(3, 0x00ffff, 0.8);
        btnBg.strokeRoundedRect(-width/2, -height/2, width, height, height/2);

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff, .51);
        maskShape.fillRoundedRect(x - width/2, y - height/2, width, height, height/2);
        const mask = maskShape.createGeometryMask();

        const scanline = this.add.rectangle(-width/2 - 50, 0, 35, height, 0x00ffff, 0.1)
            .setOrigin(0.5).setMask(mask); 

        this.tweens.add({
            targets: scanline, x: width/2 + 50, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' 
        });

        const accents = this.add.graphics();
        accents.lineStyle(8, 0xffffff, .4);
        accents.beginPath(); accents.arc(-width/2 + 25, -height/2 + 25, 25, Math.PI, Math.PI * 1.5); accents.strokePath();
        accents.beginPath(); accents.arc(width/2 - 25, height/2 - 25, 25, 0, Math.PI * 0.5); accents.strokePath();

        const btnTxt = this.add.text(0, 0, "খেলা শুরু করুন", { 
            fontSize: "52px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 900, color: "#ffffff",
            stroke: "#0033cc", strokeThickness: 5
        }).setOrigin(0.5);

        const grad = btnTxt.context.createLinearGradient(0, 0, 0, btnTxt.height);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#00ffff'); grad.addColorStop(1, '#0088ff');
        btnTxt.setFill(grad);

        const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });

        container.add([outerGlow, btnBg, accents, scanline, btnTxt, hitArea]);

        hitArea.on('pointerover', () => {
            this.tweens.add({ targets: container, scale: 1.05, duration: 200, ease: 'Back.out' });
            btnBg.clear();
            btnBg.fillGradientStyle(0x002266, 0x002266, 0x0088ff, 0x0088ff, 1);
            btnBg.fillRoundedRect(-width/2, -height/2, width, height, height/2);
            btnBg.lineStyle(4, 0xffffff, 1);
            btnBg.strokeRoundedRect(-width/2, -height/2, width, height, height/2);
        });
        
        hitArea.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1, duration: 200 });
            btnBg.clear();
            btnBg.fillGradientStyle(0x001133, 0x001133, 0x004488, 0x004488, 1);
            btnBg.fillRoundedRect(-width/2, -height/2, width, height, height/2);
            btnBg.lineStyle(3, 0x00ffff, 0.8);
            btnBg.strokeRoundedRect(-width/2, -height/2, width, height, height/2);
        });

        hitArea.on("pointerdown", () => {
            this.playSound('sfx_powerup');
            this.tweens.add({ targets: container, scale: 0.92, duration: 100, yoyo: true, onComplete: () => this.startGame() });
        });
    }

    createTipsBox(x, y, width) {
        const height = 75;
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 0.25);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 15);

        this.normalTips = [
            "💡 টিপস: বস ফাইটে প্রশ্নের উত্তর দেওয়ার প্রয়োজন নেই, শুধু আক্রমণ করুন!",
            "💡 টিপস: বেশি ভাঙ্গারী (Debris) সংগ্রহ করে নতুন রকেট আনলক করুন।",
            "💡 টিপস: কঠিন প্রশ্নের ক্ষেত্রে 'স্কিপ' (Skip) ব্যবহার করতে ভুলবেন ঘন না।",
            "💡 টিপস: স্পিন হুইল ঘুরিয়ে দারুণ সব পুরস্কার জিতে নিন!",
            "💡 টিপস: গেমের স্পিড বুস্টার ব্যবহার করে দ্রুত লেভেল পার করুন।",
            "💡 টিপস: গেমের মাঝপথে বিরতি নিতে চাইলে স্ক্রিনের ওপরের ডানদিকের পজ (Pause) বাটনে ক্লিক করুন।",
            "💡 টিপস: 'Fire Shield' বুস্টার ব্যবহার করলে নির্দিষ্ট সময়ের জন্য আপনি যেকোনো সংঘর্ষ থেকে রক্ষা পাবেন।",
            "💡 টিপস: লাল রঙের ব্যাটারি সংগ্রহ করলে অনেক বেশি চার্জ পাওয়া যায়।",
            "💡 টিপস: সঠিক উত্তর দিলে আপনার জাহাজের অস্ত্রের ক্ষমতা বা লেভেল বেড়ে যায়!",
            "💡 টিপস: ভুল উত্তর দিলে আপনার অস্ত্রের লেভেল কমে যাবে, তাই সাবধানে উত্তর দিন।",
            "💡 টিপস: চুম্বক (Magnet) পাওয়ার-আপ নিলে ব্যাটারিগুলো আপনাআপনি আপনার দিকে চলে আসবে।",
            "💡 টিপস: গেম ওভার হয়ে গেলে 'চাবি' (Key) ব্যবহার করে আবার জীবন ফিরে পেতে পারেন।",
            "💡 টিপস: শপ থেকে কেনা নতুন রকেট 'Customize' মেনু থেকে সজ্জিত (Equip) করতে পারবেন।",
            "💡 টিপস: টিএনটি (TNT) বা শকওয়েভ পাওয়ার-আপ ব্যবহার করলে স্ক্রিনের সব শত্রু একসাথে ধ্বংস হয়ে যায়।",
            "💡 টিপস: সেটিংস থেকে আপনার সুবিধামতো 'কুইক প্যানেল' (Quick Panel) ডান বা বাম দিকে সরিয়ে নিতে পারবেন অথবা বন্ধ করে রাখতে পারবেন।",
            "💡 টিপস: প্রতিদিন 'স্টাডি' (Study) মোডে পড়াশোনা করলে আপনার প্রস্তুতি আরও মজবুত হবে।",
            "💡 টিপস: 'New' মোড সিলেক্ট করে খেললে বারবার শুধু নতুন প্রশ্নই আসবে।",
            "💡 টিপস: আপনার লাইফ ৩-এর নিচে নেমে গেলে বস ফাইট ছাড়া তা ধীরে ধীরে নিজে থেকেই বাড়তে থাকবে।",
            "💡 টিপস: চাবি (Key) জমিয়ে রাখুন, এটি কঠিন লেভেলে গেম ওভার হওয়া থেকে বাঁচতে সাহায্য করবে।",
            "💡 টিপস: মেনুর ফিল্টার থেকে 'All Without Math' সিলেক্ট করলে গণিত ছাড়া বাকি বিষয়ের প্রশ্ন আসবে।",
            "💡 টিপস: 'স্টাডি Mode'-এ সাবজেক্ট ফিল্টার ব্যবহার করে নির্দিষ্ট বিষয়ের প্রশ্ন ঝালাই করে নিন।",
            "💡 টিপস: 'হিস্ট্রি' চেক করে দেখুন আপনার স্কোর এবং কতগুলো সঠিক উত্তর দিয়েছেন।",
            "💡 টিপস: 'হিস্ট্রি'দেখে আপনার ভুল করা প্রশ্নগুলো দেখে নিয়ে পরের গেমে আরও ভালো করার প্রস্তুতি নিন।",
            "💡 টিপস: রিভিশন মোড খেলার আগে একবার স্টাডি মোড ঘুরে আসলে, আপনার মেমোরি বাড়াতে সাহায্য করবে।"
        ];

        this.revisionTips = [
            "💡 রিভিশন মোড: এখানে শুধুমাত্র আপনার আগে খেলা প্রশ্নগুলোই আসবে। পুরনো পড়া ঝালাই করার দারুণ সুযোগ!",
            "💡 রিভিশন মোড: এই মোডে নতুন কোনো প্রশ্ন আসবেবিধা, তাই আত্মবিশ্বাসের সাথে উত্তর দিন।"
        ];

        const getActiveTips = () => this.selectedMode === "revision" ? this.revisionTips : this.normalTips;

        let activeTips = getActiveTips();
        let currentTipIndex = Phaser.Math.Between(0, activeTips.length - 1);

        this.tipText = this.add.text(0, 0, activeTips[currentTipIndex], {
            fontSize: "21px",
            fontFamily: "'Anek Bangla'",
            color: "#aaccff",
            align: "center",
            padding: { x: 10, y: 10 },
            wordWrap: { width: width - 30 },
            lineSpacing: 10
        }).setOrigin(0.5);

        container.add([bg, this.tipText]);

        this.cycleTip = () => {
            this.tweens.add({
                targets: this.tipText,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    let tips = getActiveTips();
                    let newIndex = currentTipIndex;
                    
                    if (tips.length > 1) {
                        while(newIndex === currentTipIndex) {
                            newIndex = Phaser.Math.Between(0, tips.length - 1);
                        }
                    } else {
                        newIndex = 0;
                    }
                    
                    currentTipIndex = newIndex;
                    this.tipText.setText(tips[currentTipIndex]);
                    
                    this.tweens.add({ 
                        targets: this.tipText, 
                        alpha: 1, 
                        duration: 300 
                    });
                }
            });
        };

        this.tipTimerEvent = this.time.addEvent({
            delay: 8000,
            loop: true,
            callback: this.cycleTip
        });
    }

    createBottomMenu(cx, y, totalWidth, height) {
        const container = this.add.container(cx, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x051025, 0.9);
        bg.fillRoundedRect(-totalWidth/2, -height/2, totalWidth, height, height/2);
        bg.lineStyle(2, 0x0066aa, 0.8);
        bg.strokeRoundedRect(-totalWidth/2, -height/2, totalWidth, height, height/2);
        container.add(bg);

        const btnWidth = totalWidth / 4;

        const createNavBtn = (cxOffset, emoji, label, emojiSize) => {
            const hitArea = this.add.rectangle(cxOffset, 0, btnWidth, height, 0x000000, 0).setInteractive({ useHandCursor: true });
            
            const tText = this.add.text(0, 0, label, { 
                fontSize: "22px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: "#b3d4ff" 
            }).setOrigin(0.5, 0.5);
            
            const tIcon = this.add.text(0, 0, emoji, { fontSize: emojiSize }).setOrigin(0.5, 0.5);
            
            tText.updateText(); 
            tIcon.updateText();
            const gap = 10;
            const totalW = tIcon.width + gap + tText.width;
            
            tIcon.x = cxOffset - totalW / 2 + tIcon.width / 2;
            tText.x = tIcon.x + tIcon.width / 2 + gap + tText.width / 2;
            
            tIcon.y = 0;
            tText.y = 0;

            return { hitArea, tIcon, tText };
        };

        const shop = createNavBtn(-totalWidth/2 + btnWidth/2, "🛒", "শপ", "26px");
        shop.hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.scene.start("ShopScene");
        });
        shop.hitArea.on('pointerover', () => shop.tText.setColor("#ffffff"));
        shop.hitArea.on('pointerout', () => shop.tText.setColor("#b3d4ff"));

        const div1 = this.add.rectangle(-totalWidth/2 + btnWidth, 0, 3, height - 20, 0x0066aa, 0.7);

        const study = createNavBtn(-totalWidth/2 + btnWidth*1.5, "📖", "স্টাডি", "26px");
        study.hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.scene.start("ReadingScene");
        });
        study.hitArea.on('pointerover', () => study.tText.setColor("#ffffff"));
        study.hitArea.on('pointerout', () => study.tText.setColor("#b3d4ff"));

        const div2 = this.add.rectangle(0, 0, 3, height - 20, 0x0066aa, 0.7);

        const hist = createNavBtn(totalWidth/2 - btnWidth*1.5, "📜", "হিস্ট্রি", "26px");
        hist.hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.showMatchHistoryPopup();
        });
        hist.hitArea.on('pointerover', () => hist.tText.setColor("#ffffff"));
        hist.hitArea.on('pointerout', () => hist.tText.setColor("#b3d4ff"));

        const div3 = this.add.rectangle(totalWidth/2 - btnWidth, 0, 3, height - 20, 0x0066aa, 0.7);

        const wheel = createNavBtn(totalWidth/2 - btnWidth/2, "🌀", "স্পিন", "26px");
        this.tweens.add({ targets: wheel.tIcon, angle: 360, duration: 50000, repeat: -1, ease: "Linear" });
        wheel.hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.scene.start("SpinWheelScene");
        });
        wheel.hitArea.on('pointerover', () => wheel.tText.setColor("#ffffff"));
        wheel.hitArea.on('pointerout', () => wheel.tText.setColor("#b3d4ff"));

        container.add([
            shop.hitArea, shop.tIcon, shop.tText, div1, 
            study.hitArea, study.tIcon, study.tText, div2,
            hist.hitArea, hist.tIcon, hist.tText, div3, 
            wheel.hitArea, wheel.tIcon, wheel.tText
        ]);
    }

    showMatchHistoryPopup() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const popup = this.add.container(cx, cy).setDepth(2000);
        const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.85).setInteractive();
        
        const panelW = 620;
        const panelH = 900;
        
        const bg = this.add.graphics();
        bg.fillStyle(0x000c22, 0.95);
        bg.fillRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 20);
        bg.lineStyle(4, 0x0066aa, 1);
        bg.strokeRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 20);

        const title = this.add.text(0, -panelH/2 + 50, "ম্যাচ হিস্ট্রি (History)", { 
            fontSize: '40px', fontFamily: "'Anek Bangla'", color: '#00e1ff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const closeHit = this.add.circle(panelW/2 - 40, -panelH/2 + 50, 30).setInteractive({ useHandCursor: true });
        const closeIcon = this.add.text(panelW/2 - 40, -panelH/2 + 50, "✖", { fontSize: '35px', color: '#ff4444' }).setOrigin(0.5);
        
        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            popup.destroy();
            this.historyScrollData = null; 
        });

        popup.add([overlay, bg, title, closeIcon, closeHit]);

        const listStartY = -panelH/2 + 100;
        const listHeight = panelH - 120;
        const listWidth = panelW - 40;

        const contentContainer = this.add.container(0, listStartY);
        
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(cx - listWidth/2, cy + listStartY, listWidth, listHeight);
        const mask = maskShape.createGeometryMask();
        contentContainer.setMask(mask);

        let currentY = 20;
        const history = GameState.matchHistory || [];

        if (history.length === 0) {
            const noData = this.add.text(0, listHeight/2, "কোন ম্যাচ খেলা হয়নি", { 
                fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#666" 
            }).setOrigin(0.5);
            contentContainer.add(noData);
        } else {
            history.forEach((match) => {
                const cardH = 120;
                const cardBg = this.add.graphics();
                
                const drawCard = (hover) => {
                    cardBg.clear();
                    cardBg.fillStyle(hover ? 0x0a1a3a : 0x051025, 0.9);
                    cardBg.fillRoundedRect(-listWidth/2 + 10, currentY, listWidth - 20, cardH, 15);
                    cardBg.lineStyle(2, hover ? 0x0088ff : 0x004488, 1);
                    cardBg.strokeRoundedRect(-listWidth/2 + 10, currentY, listWidth - 20, cardH, 15);
                };
                drawCard(false);

                const dateTxt = this.add.text(-listWidth/2 + 30, currentY + 20, match.date, { fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#aaaaaa" });
                
                let pColor = "#ff4444";
                if(match.percent === 100) pColor = "#ffffff";
                else if(match.percent >= 80) pColor = "#00ff00";
                else if(match.percent >= 26) pColor = "#ffff00";

                const pctTxt = this.add.text(listWidth/2 - 30, currentY + 30, `${match.percent}%`, { fontSize: "42px", fontFamily: "'Anek Bangla'", fontStyle: 'bold', color: pColor }).setOrigin(1, 0);

                const stats = `মোট: ${match.total} | সঠিক: ${match.correct} | ভুল: ${match.wrong} | স্কিপ: ${match.skipped}`;
                const statTxt = this.add.text(-listWidth/2 + 30, currentY + 65, stats, { fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#ffffff" });

                const hitArea = this.add.rectangle(0, currentY + cardH/2, listWidth - 20, cardH, 0x000000, 0).setInteractive({ useHandCursor: true });
                
                let downY = 0;
                hitArea.on('pointerdown', (pointer) => {
                    downY = pointer.y;
                    drawCard(true);
                });
                hitArea.on('pointerup', (pointer) => {
                    if (Math.abs(pointer.y - downY) < 15) {
                        this.playSound('sfx_click');
                        GameState.viewingHistoryMatch = match;
                        popup.destroy();
                        this.historyScrollData = null;
                        this.scene.start("DeathScene");
                    }
                    drawCard(false);
                });
                hitArea.on('pointerout', () => drawCard(false));

                contentContainer.add([cardBg, dateTxt, pctTxt, statTxt, hitArea]);
                currentY += cardH + 15;
            });
        }

        popup.add(contentContainer);

        if (currentY > listHeight) {
            const minScroll = listHeight - currentY - 20;
            let startY = 0;
            let containerStartY = 0;
            let lastTime = 0;
            let lastY = 0;

            const scrollZone = this.add.rectangle(0, listStartY + listHeight/2, listWidth, listHeight, 0x000000, 0).setInteractive();
            popup.add(scrollZone);

            this.historyScrollState = { isDragging: false, velocityY: 0 };
            this.historyScrollData = { contentContainer, listStartY, minScroll };

            scrollZone.on('pointerdown', (pointer) => {
                this.historyScrollState.isDragging = true;
                this.historyScrollState.velocityY = 0;
                startY = pointer.y;
                lastY = pointer.y;
                containerStartY = contentContainer.y;
                lastTime = this.time.now;
            });

            this.input.on('pointermove', (pointer) => {
                if (this.historyScrollState.isDragging) {
                    const diff = pointer.y - startY;
                    let newY = containerStartY + diff;

                    if (newY > listStartY) {
                        newY = listStartY + (newY - listStartY) * 0.3;
                    } else if (newY < listStartY + minScroll) {
                        newY = listStartY + minScroll + (newY - (listStartY + minScroll)) * 0.3;
                    }
                    contentContainer.y = newY;

                    const now = this.time.now;
                    const dt = now - lastTime;
                    if (dt > 0) this.historyScrollState.velocityY = (pointer.y - lastY) / dt;
                    lastTime = now;
                    lastY = pointer.y;
                }
            });

            const stopDrag = () => { this.historyScrollState.isDragging = false; };
            this.input.on('pointerup', stopDrag);
            this.input.on('pointerout', stopDrag);
        }
        
        popup.setScale(0.8);
        popup.setAlpha(0);
        this.tweens.add({ targets: popup, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
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

    startGame() {
        const manifest = this.cache.json.get('bank_directory');
        let finalQuestions = [];

        if (this.selectedBankKey === "all") {
            manifest.banks.forEach(bank => {
                const data = this.cache.json.get(bank.key);
                if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
            });
        } else {
            const data = this.cache.json.get(this.selectedBankKey);
            if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
        }
        
        finalQuestions = finalQuestions.filter(q => q.question && q.question.trim() !== "");

        if (this.selectedSubject === "all_no_math") {
            finalQuestions = finalQuestions.filter(q => q.subject !== "Math");
        } else if (this.selectedSubject !== "all") {
            finalQuestions = finalQuestions.filter(q => q.subject === this.selectedSubject);
        }

        let seenQuestions = JSON.parse(localStorage.getItem('seenQuestions') || '[]');

        if (this.selectedMode === "revision") {
            finalQuestions = finalQuestions.filter(q => seenQuestions.includes(q.question));
            if (finalQuestions.length === 0) {
                this.showToast("আগের কোনো প্রশ্ন পাওয়া যায়নি! আগে নরমাল মোড খেলুন।");
                return;
            }
        } else if (this.selectedMode === "new") {
            finalQuestions = finalQuestions.filter(q => !seenQuestions.includes(q.question));
            if (finalQuestions.length === 0) {
                this.showToast("আপনি এই বিভাগের সব প্রশ্নের উত্তর দিয়ে দিয়েছেন!");
                return;
            }
        }

        if (finalQuestions.length === 0) {
            this.showToast("এই বিভাগে কোনো প্রশ্ন নেই!");
            return;
        }

        Phaser.Utils.Array.Shuffle(finalQuestions);

        window.resetGameState();
        
        // Anti-cheat verification lock
        GameState.currentSubject = this.selectedSubject;
        localStorage.setItem('game_currentSubject', GameState.currentSubject);

        GameState.currentQuestions = finalQuestions;
        GameState.gameMode = this.selectedMode;

        this.scene.start("GameScene");
        this.scene.launch("QuestionScene");
    }

    closeAllDropdowns() {
        this.dropdowns.forEach(d => d.close());
    }
}