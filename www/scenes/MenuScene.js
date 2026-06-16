class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    init() {
        this.selectedBankKey = localStorage.getItem('saved_bankKey') || "all";
        this.selectedSubject = localStorage.getItem('saved_subject') || "all_no_math";
        this.selectedMode = localStorage.getItem('saved_mode') || "normal"; 
        
        this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';

        this.dropdowns = []; 
        this.backgroundLayers = [];
        this.isStartingGame = false;
        
        this.historyScrollData = null;
        this.historyScrollState = null;
        this.isHistoryPopupOpen = false;
        
        this.activeNotification = null;
        this.isChatOpen = false; // Initialize chat state early for the update loop
    }

    create() {
        this.isStartingGame = false;

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
        
        // Dynamic Skin Pack Loader
        if (window.SpecialItemsRegistry && window.SpecialItemsRegistry.textureInits) {
            window.SpecialItemsRegistry.textureInits.forEach(initFn => initFn(this));
        }

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
        this.createProfileAndSettings(); 

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

        // --- NEW: Version Text added under the title ---
        const versionText = this.add.text(180, 65, "v1.0.0", {
            fontSize: "24px", 
            fontFamily: "'Anek Bangla'", 
            color: "#00c4c4", 
            fontWeight: 600,
            letterSpacing: 2
        }).setOrigin(0.5);

        titleContainer.add([titleText, versionText]);

        this.tweens.add({
            targets: titleContainer, y: titleContainer.y - 15, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        this.time.addEvent({
            delay: 400, 
            loop: true,
            callback: () => {
                if (!this.scene.isActive()) return;
                if (Math.random() > 0.85) { 
                    titleText.x = Phaser.Math.FloatBetween(-0.5, 0.5);
                    titleText.y = Phaser.Math.FloatBetween(-0.5, 0.5);
                    titleText.angle = Phaser.Math.FloatBetween(-0.2, 0.2);
                } else {
                    titleText.x = 0; titleText.y = 0; titleText.angle = 0;
                }
            }
        });
        
        this.createTitleBird(cx, cy - 420);
        this.createHangarButton(cx, cy - 220);

        const panelY = cy + 40;
        this.createSettingsPanel(cx, panelY, UI_WIDTH, manifest);

        const startY = panelY + 260;
        this.createStartButton(cx, startY, UI_WIDTH + 60, 100); 

        const tipsY = startY + 160; 
        this.createInfoBox(cx, tipsY, UI_WIDTH + 60);

        this.createBottomMenu(cx, this.cameras.main.height - 110, UI_WIDTH + 100, 90);
        
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                this.closeAllDropdowns();
            }
        });

        if (!localStorage.getItem('google_prompt_seen') && (!window.FirebaseAuth || !window.FirebaseAuth.currentUser)) {
            this.showGoogleAuthPrompt(cx, cy);
        }

        if (GameState.showHistoryPopupOnLoad) {
            GameState.showHistoryPopupOnLoad = false;
            this.showMatchHistoryPopup(); 
        }

        // --- NEW: Call the background update check ---
        this.checkForUpdates(cx, cy);
        this.createGlobalChat();
    }

    // --- NEW: Check for Updates Logic ---
    checkForUpdates(cx, cy) {
        const CURRENT_VERSION = "1.0.0";
        const lastCheck = localStorage.getItem('last_update_check');
        const today = new Date().toDateString();

        // Only check once a day to save bandwidth and prevent spamming
        if (lastCheck === today) return; 

        // Add a timestamp query parameter to bypass cache
        const versionUrl = `https://raw.githubusercontent.com/DiptooD/GameMCQ/main/version.json?t=${new Date().getTime()}`;

        fetch(versionUrl)
            .then(response => response.json())
            .then(data => {
                localStorage.setItem('last_update_check', today);
                
                // Compare versions. If server version is different, prompt the user
                if (data.latest_version && data.latest_version !== CURRENT_VERSION) {
                    this.showUpdatePopup(cx, cy, data.latest_version, data.release_notes);
                }
            })
            .catch(err => {
                console.log("Update check failed (Offline or invalid URL) - running normally.", err);
            });
    }

    // --- NEW: Show Update UI Popup ---
    showUpdatePopup(cx, cy, newVersion, notes) {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const overlay = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.8).setInteractive().setDepth(10001);
        const container = this.add.container(cx, cy).setDepth(10002);

        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 1);
        bg.fillRoundedRect(-250, -170, 500, 340, 20);
        bg.lineStyle(4, 0x00ff88, 1);
        bg.strokeRoundedRect(-250, -170, 500, 340, 20);

        const title = this.add.text(0, -120, "নতুন আপডেট এসেছে!", {
            fontSize: "36px", fontFamily: "'Anek Bangla'", color: "#00ff88", fontStyle: "bold"
        }).setOrigin(0.5);

        const desc = this.add.text(0, -30, `ভার্সন: ${newVersion}\n\n${notes || "নতুন ফিচার উপভোগ করুন।"}\nগেমটি আপডেট করতে নিচে ক্লিক করুন।`, {
            fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#ffffff", align: "center", lineSpacing: 8
        }).setOrigin(0.5);

        // Close button (Not mandatory to update) with rounded square styling
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0xff3333, 1);
        closeBg.fillRoundedRect(210 - 25, -130 - 25, 50, 50, 15);
        
        const closeIcon = this.add.text(210, -130, "✖", { fontSize: "30px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(210, -130, 50, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            overlay.destroy();
            container.destroy();
        });

        // Download Button
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x00aa44, 1);
        btnBg.fillRoundedRect(-140, 80, 280, 60, 30);
        const downloadBtnTxt = this.add.text(0, 110, "ডাউনলোড করুন", { fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        const downloadHit = this.add.rectangle(0, 110, 280, 60, 0x000000, 0).setInteractive({ useHandCursor: true });

        downloadHit.on('pointerdown', () => {
            this.playSound('sfx_click');
            // _system tells Cordova to use the native device browser (Safari/Chrome), _blank as fallback for pure web
            window.open("https://sites.google.com/view/gamemcq", "_system");
        });

        container.add([bg, title, desc, closeBg, closeIcon, closeHit, btnBg, downloadBtnTxt, downloadHit]);
        
        // Pop-in animation
        container.setScale(0.8);
        container.setAlpha(0);
        this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 250, ease: 'Back.out' });
    }

    showNotification(msg, type = 'info') {
        if (this.activeNotification) {
            this.activeNotification.destroy();
        }

        const cx = this.cameras.main.width / 2;
        const container = this.add.container(cx, -120).setDepth(10000);
        this.activeNotification = container;

        let colors = {
            success: { bg: 0x004422, border: 0x00ff88, glow: 0x00ff88, icon: "✅" },
            error: { bg: 0x440000, border: 0xff4444, glow: 0xff4444, icon: "❌" },
            info: { bg: 0x002244, border: 0x00aaff, glow: 0x00aaff, icon: "ℹ️" }
        };
        let style = colors[type] || colors.info;

        const bg = this.add.graphics();
        bg.fillGradientStyle(style.bg, 0x000000, 0x000000, 0x000000, 0.95);
        bg.fillRoundedRect(-240, -45, 480, 90, 20);
        bg.lineStyle(3, style.border, 1);
        bg.strokeRoundedRect(-240, -45, 480, 90, 20);

        const glow = this.add.graphics();
        glow.fillStyle(style.glow, 0.15);
        glow.fillRoundedRect(-245, -50, 490, 100, 25);
        
        const icon = this.add.text(-190, 0, style.icon, { fontSize: '40px' }).setOrigin(0.5);
        const text = this.add.text(-150, 0, msg, {
            fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff', 
            align: 'left', fontStyle: 'bold', lineSpacing: 5
        }).setOrigin(0, 0.5);

        container.add([glow, bg, icon, text]);

        if (type === 'success' && this.cache.audio.exists('sfx_powerup')) {
            this.playSound('sfx_powerup', 0.4); 
        } else if (type === 'error' && this.cache.audio.exists('sfx_error')) {
            this.playSound('sfx_error', 0.5);
        } else {
            this.playSound('sfx_tick', 0.5);
        }
        
        this.tweens.add({ 
            targets: container, 
            y: 90, 
            alpha: 1, 
            duration: 500, 
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ 
                    targets: container, 
                    y: -120,
                    alpha: 0, 
                    delay: 3500, 
                    duration: 400, 
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                        if (this.activeNotification === container) {
                            this.activeNotification = null;
                        }
                        container.destroy();
                    }
                });
            }
        });
    }

    showGoogleAuthPrompt(cx, cy) {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const overlay = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.8).setInteractive().setDepth(9999);
        const container = this.add.container(cx, cy).setDepth(10000);

        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 1);
        // Increased box size: 560x380 (was 500x320)
        bg.fillRoundedRect(-280, -190, 560, 380, 24);
        bg.lineStyle(4, 0x00ffff, 1);
        bg.strokeRoundedRect(-280, -190, 560, 380, 24);

        // Larger Title Text (48px)
        const title = this.add.text(0, -130, "Cloud Save", {
            fontSize: "48px", fontFamily: "'Anek Bangla'", color: "#00ffff", fontStyle: "bold"
        }).setOrigin(0.5);

        // Larger Description Text (26px) with slightly more line spacing
        const desc = this.add.text(0, -10, "আপনার Google অ্যাকাউন্টের সাহায্যে গেমের\nপ্রোফাইল কানেক্ট করুন। এতে আপনার গেমের\nসব প্রগ্রেস ক্লাউডে নিরাপদে সেভ থাকবে!", {
            fontSize: "27px", fontFamily: "'Anek Bangla'", color: "#ffffff", align: "center", lineSpacing: 12
        }).setOrigin(0.5);

        // Much larger and easier to tap Close Button (65x65)
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0xff3333, 1);
        closeBg.fillRoundedRect(235 - 32.5, -145 - 32.5, 65, 65, 18);

        const closeIcon = this.add.text(235, -142, "✖", { fontSize: "38px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(235, -130, 65, 65, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            localStorage.setItem('google_prompt_seen', 'true');
            overlay.destroy();
            container.destroy();
        });

        // Larger Connect Button (280x70)
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x0066aa, 1);
        btnBg.fillRoundedRect(-140, 85, 280, 70, 35);
        const connectBtnTxt = this.add.text(0, 120, "Connect Google", { fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        const connectHit = this.add.rectangle(0, 120, 280, 70, 0x000000, 0).setInteractive({ useHandCursor: true });

        connectHit.on('pointerdown', () => {
            // --- SPAM PROOF CHECK ---
            if (window.isAuthenticating) return;
            window.isAuthenticating = true;

            this.playSound('sfx_click');

            // --- 3-DOTS LOADER ANIMATION ---
            let dotCount = 0;
            connectBtnTxt.setText("Connecting.");
            let dotTimer = this.time.addEvent({
                delay: 400, loop: true,
                callback: () => {
                    dotCount = (dotCount + 1) % 4;
                    connectBtnTxt.setText("Connecting" + ".".repeat(dotCount));
                }
            });

            if (window.signInWithGoogle) {
                let res = window.signInWithGoogle();
                if (res && res.then) {
                    res.then(() => {
                        window.isAuthenticating = false;
                        if (dotTimer) dotTimer.remove();

                        localStorage.setItem('google_prompt_seen', 'true');
                        overlay.destroy();
                        container.destroy();
                        
                        this.showNotification("Google Account Connected!\nCloud sync active.", "success");
                        if (this.profileRedDot) this.profileRedDot.setVisible(false);
                    }).catch((error) => {
                        window.isAuthenticating = false;
                        if (dotTimer) dotTimer.remove();
                        connectBtnTxt.setText("Connect Google");
                        
                        console.error("Sign in failed:", error);
                        this.showNotification("Sign-in Failed!\nPlease check your connection.", "error");
                    });
                } else {
                    window.isAuthenticating = false;
                    if (dotTimer) dotTimer.remove();
                    connectBtnTxt.setText("Connect Google");
                }
            } else {
                 window.isAuthenticating = false;
                 if (dotTimer) dotTimer.remove();
                 connectBtnTxt.setText("Connect Google");
            }
        });

        container.add([bg, title, desc, closeBg, closeIcon, closeHit, btnBg, connectBtnTxt, connectHit]);
    }

    update(time, delta) {
        const safeTimeScale = Phaser.Math.Clamp(delta / 16.66, 0.1, 2.5);

        // 🚀 THE CPU FIX: Only calculate background movement if chat is CLOSED
        if (!this.isChatOpen) {
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
        }

        // Leave history scroll and other essential logic outside the check so it always works!
        if (this.historyScrollData && this.historyScrollState) {
            let { contentContainer, listStartY, minScroll } = this.historyScrollData;
            
            if (!contentContainer || !contentContainer.active) {
                this.historyScrollData = null;
                return;
            }
            
            if (!this.historyScrollState.isDragging) {
                let vY = this.historyScrollState.velocityY;
                let currentY = contentContainer.y;

                if (Math.abs(vY) > 0.05) {
                    currentY += vY * 16 * safeTimeScale;
                    this.historyScrollState.velocityY *= Math.pow(0.9, safeTimeScale); 
                } else {
                    this.historyScrollState.velocityY = 0;
                }

                if (currentY > listStartY) {
                    currentY += (listStartY - currentY) * 0.2 * safeTimeScale;
                } else if (currentY < listStartY + minScroll) {
                    currentY += ((listStartY + minScroll) - currentY) * 0.2 * safeTimeScale;
                }

                contentContainer.y = currentY;
            } else {
                this.historyScrollState.velocityY *= Math.pow(0.8, safeTimeScale); 
            }
        }
    }

    createTitleBird(titleX, titleY) {
        this.titleBird = this.add.image(-100, -100, "player_lv1").setScale(0.65).setDepth(50);
        
        const animateBird = () => {
            if (!this.scene.isActive() || !this.titleBird || !this.titleBird.active) return;
            const w = this.cameras.main.width;
            
            const fromLeft = Math.random() > 0.5;
            const startX = fromLeft ? -100 : w + 100;
            const startY = titleY - Phaser.Math.Between(100, 300);
            
            const landX = titleX + Phaser.Math.Between(-100, 100);
            const landY = titleY - 65; 
            
            const endX = fromLeft ? w + 100 : -100;
            const endY = titleY - Phaser.Math.Between(200, 400);

            this.titleBird.setPosition(startX, startY);
            
            const angleToLand = Phaser.Math.Angle.Between(startX, startY, landX, landY);
            this.titleBird.setRotation(angleToLand + Math.PI / 2);

            this.tweens.add({
                targets: this.titleBird,
                x: landX,
                y: landY,
                duration: 1500,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    if (!this.titleBird || !this.titleBird.active) return;
                    this.tweens.add({
                        targets: this.titleBird,
                        rotation: (fromLeft ? 0.2 : -0.2), 
                        duration: 200,
                        onComplete: () => {
                            if (!this.titleBird || !this.titleBird.active) return;
                            this.tweens.add({
                                targets: this.titleBird,
                                y: landY - 20,
                                duration: 250,
                                yoyo: true,
                                repeat: 3,
                                ease: 'Quad.easeOut',
                                onComplete: () => {
                                    if (!this.titleBird || !this.titleBird.active) return;
                                    const angleToExit = Phaser.Math.Angle.Between(landX, landY, endX, endY);
                                    this.tweens.add({
                                        targets: this.titleBird,
                                        rotation: angleToExit + Math.PI / 2,
                                        duration: 200,
                                        onComplete: () => {
                                            if (!this.titleBird || !this.titleBird.active) return;
                                            this.tweens.add({
                                                targets: this.titleBird,
                                                x: endX,
                                                y: endY,
                                                duration: 1500,
                                                ease: 'Sine.easeIn',
                                                onComplete: () => {
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
        this.time.delayedCall(2000, animateBird);
    }

    playSound(key, baseVolume = 1.0) {
        if (this.cache.audio.exists(key)) {
            const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
            this.sound.play(key, { volume: finalVolume });
        }
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

    createProfileAndSettings() {
        const boxX = 30;
        const boxY = 35;
        const boxW = 370;
        const boxH = 60; 

        const profBg = this.add.graphics();
        profBg.fillStyle(0x001122, 0.8);
        profBg.fillRoundedRect(boxX, boxY, boxW, boxH, 30);
        profBg.lineStyle(3, 0x0066aa, 0.9);
        profBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 30);

        const lvlData = window.getLevelData();
        const rankData = window.getRankData(lvlData.level);

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(boxX, boxY, boxW, boxH, 30);
        const fluidMask = maskShape.createGeometryMask();

        const fillW = Math.max(15, boxW * lvlData.percent);
        const fluidFill = this.add.graphics();
        fluidFill.fillGradientStyle(0x0066ff, 0x00ccff, 0x0044cc, 0x0099ff, 0.5); 
        fluidFill.fillRect(boxX, boxY, fillW, boxH);
        fluidFill.setMask(fluidMask);

        this.tweens.add({
            targets: fluidFill,
            alpha: 0.85,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const hitArea = this.add.rectangle(boxX + boxW/2, boxY + boxH/2, boxW, boxH, 0x000000, 0).setInteractive({useHandCursor: true});

        // --- FIXED: Avatar Sync matching PlayerProfileScene ---
        let currentAvatarToDisplay = rankData.avatar; 
        if (GameState.equippedAvatar && GameState.equippedAvatar !== "default") {
            const specialDef = window.SpecialItemsData && window.SpecialItemsData.find(i => i.id === GameState.equippedAvatar);
            if (specialDef && specialDef.value) currentAvatarToDisplay = specialDef.value;
        }

        const avatarTxt = this.add.text(boxX + 40, boxY + boxH/2, currentAvatarToDisplay, {fontSize: '50px'}).setOrigin(0.5);

        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "GUEST";
        const nameTxt = this.add.text(boxX + 85, boxY + boxH/2 - 11, playerName, {
            fontSize: '26px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold', padding: { y: 10 },
            shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0, 0.5);

        this.profileRedDot = this.add.circle(boxX + 85 + nameTxt.width + 15, boxY + boxH/2 - 11, 6, 0xff3333);
        this.profileRedDot.setStrokeStyle(2, 0xff0000);
        this.profileRedDot.setVisible(!isConnected);
        this.tweens.add({ targets: this.profileRedDot, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });

        const tagShort = rankData.tag.split(" (")[0];
        const lvlTxt = this.add.text(boxX + 85, boxY + boxH/2 + 16.5, `লেভেল ${lvlData.level} • ${tagShort}`, {
            fontSize: '20px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ffff', fontStyle: 'bold', padding: { y: 10 },
            shadow: { offsetX: 1, offsetY: 1, color: "#000000", blur: 2, fill: true }
        }).setOrigin(0, 0.5);

        // --- FIXED: Text-Based Big Badge Render & Opposite Side Alignment ---
        let baseBadges = (GameState.profile && GameState.profile.badges) || [];
        if (GameState.profile && GameState.profile.badge && baseBadges.length === 0) baseBadges = [GameState.profile.badge];
        let tempBadges = (GameState.profile && GameState.profile.tempBadges) || [];
        
        let currentBadges = [...new Set([...tempBadges, ...baseBadges])].filter(Boolean);

        if (currentBadges.length > 0) {
            const primaryBadgeKey = currentBadges[0];
            const badgeData = window.getBadgeData ? window.getBadgeData(primaryBadgeKey) : null;
            
            if (badgeData && badgeData.icon) {
                // Aligns badge completely opposite to the information panel texts on the far right
                const badgeX = boxX + boxW - 35; 
                const badgeY = boxY + boxH / 2 +5;
                
                const badgeTxt = this.add.text(badgeX, badgeY, badgeData.icon, {
                    fontSize: '40px',
                    shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.6)', blur: 4 }
                }).setOrigin(0.5);

                // Elegant floating visual movement animation matching the sleek aesthetic
                this.tweens.add({
                    targets: badgeTxt,
                    y: badgeY - 3,
                    duration: 1600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }

        hitArea.on('pointerover', () => { 
            profBg.lineStyle(3, 0xffffff, 1); 
            profBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 30); 
        });
        hitArea.on('pointerout', () => { 
            profBg.lineStyle(3, 0x0066aa, 0.9); 
            profBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 30); 
        });

        hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.scene.pause("MenuScene");
            this.scene.launch("PlayerProfileScene");
        });

        const setY = 115;
        const setW = 200;
        const setH = 65; 
        const setRadius = 25; 

        const setBg = this.add.graphics();
        const drawSettings = (hover) => {
            setBg.clear();
            setBg.fillStyle(0x0a101a, hover ? 1 : 0.9); 
            setBg.fillRoundedRect(boxX, setY, setW, setH, setRadius);
            setBg.lineStyle(1, 0x334455, hover ? 0.8 : 0.4); 
            setBg.strokeRoundedRect(boxX, setY, setW, setH, setRadius);
        };
        drawSettings(false);

        const setText = this.add.text(boxX + setW/2, setY + setH/2, "⚙️ সেটিংস", {
            fontSize: '28px', fontFamily: "'Anek Bangla', sans-serif", padding: { y: 5 }, color: '#b3d4ff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const setHitArea = this.add.rectangle(boxX + setW/2, setY + setH/2, setW, setH, 0x000000, 0).setInteractive({useHandCursor: true});
        setHitArea.on('pointerover', () => { drawSettings(true); setText.setColor('#ffffff'); });
        setHitArea.on('pointerout', () => { drawSettings(false); setText.setColor('#b3d4ff'); });
        setHitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.tweens.add({ targets: [setText], scale: 0.95, duration: 50, yoyo: true });
            this.scene.pause("MenuScene");
            this.scene.launch("SettingsScene");
        });
    }

    createCurrencyUI() {
        const keys = (window.GameState && window.GameState.keys) || 0;
        const debris = (window.GameState && window.GameState.debris) || 0;

        const startX = 420; 
        const startY = 35;  
        const boxW = 270;
        const boxH = 60; 

        // --- CURRENCY BOX ---
        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 0.8);
        bg.fillRoundedRect(startX, startY, boxW, boxH, 30); 
        bg.lineStyle(3, 0x0066aa, 0.9);
        bg.strokeRoundedRect(startX, startY, boxW, boxH, 30);
        
        this.add.image(startX + 45, startY + boxH/2, "ui_key").setScale(0.65);
        this.kText = this.add.text(startX + 75, startY + boxH/2 - 2, keys.toString(), { 
            fontSize: "26px", color: "#ffd700", fontFamily: "Arial", fontStyle: "bold" 
        }).setOrigin(0, 0.5);

        this.add.rectangle(startX + 135, startY + boxH/2, 3, 35, 0x0066aa, 0.8);

        this.add.image(startX + 180, startY + boxH/2 + 2, "ui_debris_icon").setScale(0.70);
        this.dText = this.add.text(startX + 210, startY + boxH/2 - 2, debris.toString(), { 
            fontSize: "26px", color: "#aaccff", fontFamily: "Arial", fontStyle: "bold" 
        }).setOrigin(0, 0.5);

        // --- COMBINED SHARE & EXIT CONTAINER ---
        const combW = 260; 
        const combH = 65; 
        const combX = startX + boxW - combW; 
        const combY = 115;
        const combRadius = 25;
        const pillBgColor = 0x0a101a; 

        const combBg = this.add.graphics();
        const drawCombBg = (hoverColor = null) => {
            combBg.clear();
            combBg.fillStyle(pillBgColor, 0.9); 
            combBg.fillRoundedRect(combX, combY, combW, combH, combRadius);
            combBg.lineStyle(1, hoverColor || 0x334455, hoverColor ? 0.8 : 0.4); 
            combBg.strokeRoundedRect(combX, combY, combW, combH, combRadius);
        };
        drawCombBg(); 

        this.add.rectangle(combX + 80, combY + combH/2, 2, 40, 0x334455, 0.6);

        // --- 1. PREMIUM SHARE SECTION (Left 80px) ---
        const shareIcon = this.add.graphics();
        shareIcon.setPosition(combX + 40, combY + combH/2);

        const drawShareIcon = (hover) => {
            shareIcon.clear();
            const mainColor = hover ? 0xffffff : 0x00e1ff;

            shareIcon.lineStyle(3.2, mainColor, 1);
            shareIcon.beginPath();
            shareIcon.moveTo(-11, 0);
            shareIcon.lineTo(11, -12.5);
            shareIcon.moveTo(-11, 0);
            shareIcon.lineTo(11, 12.5);
            shareIcon.strokePath();

            shareIcon.fillStyle(mainColor, 1);
            shareIcon.fillCircle(-11, 0, 6.2);
            shareIcon.fillCircle(11, -12.5, 6.2);
            shareIcon.fillCircle(11, 12.5, 6.2);

            shareIcon.fillStyle(pillBgColor, 1); 
            shareIcon.fillCircle(-11, 0, 2.8);
            shareIcon.fillCircle(11, -12.5, 2.8);
            shareIcon.fillCircle(11, 12.5, 2.8);
        };
        drawShareIcon(false);

        const shareHit = this.add.rectangle(combX + 40, combY + combH/2, 80, combH, 0x000000, 0).setInteractive({useHandCursor: true});
        
        let canShare = true;

        shareHit.on('pointerover', () => { 
            drawShareIcon(true);
            drawCombBg(0x00e1ff); 
            this.tweens.add({ targets: shareIcon, scale: 1.15, duration: 100, overwrite: true });
        });
        
        shareHit.on('pointerout', () => { 
            drawShareIcon(false);
            drawCombBg(); 
            this.tweens.add({ targets: shareIcon, scale: 1, duration: 100, overwrite: true });
        });
        
        // FIX: Must use 'pointerup' instead of 'pointerdown' for native browser APIs
        shareHit.on('pointerup', async () => {
    if (!canShare) return;
    canShare = false;

    const shareData = {
        title: 'গেইম MCQ',
        text: 'খেলতে খেলতে সাধারণ জ্ঞান যাচাই করুন গেইম MCQ-তে!',
        url: 'https://sites.google.com/view/gamemcq'
    };

    // 1. FIRE SHARE API IMMEDIATELY to preserve the User Gesture token
    try {
        if (window.plugins && window.plugins.socialsharing) {
            // Cordova Native Share
            window.plugins.socialsharing.shareWithOptions(
                { message: shareData.text, subject: shareData.title, url: shareData.url },
                (result) => { console.log("Share success", result); },
                (err) => { console.log("Share failed", err); }
            );
        } 
        else if (navigator.share) {
            // Modern Web Share API (Must happen before Audio context changes)
            await navigator.share(shareData);
        } 
        else {
            // Desktop / Unsupported Fallback
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareData.url).then(() => {
                    this.showNotification("লিংক কপি করা হয়েছে!", "success");
                }).catch(() => {
                    window.open(shareData.url, '_blank');
                });
            } else {
                window.prompt("কপি করতে নিচের লিংকটি সিলেক্ট করুন:", shareData.url);
            }
        }
    } catch (err) {
        console.log("Share cancelled or failed", err);
    }

    // 2. PLAY SOUND & TWEEN AFTER the share menu is requested
    this.playSound('sfx_click');
    this.tweens.add({ targets: shareIcon, scale: 0.85, duration: 50, yoyo: true });

    this.time.delayedCall(2500, () => { canShare = true; });
});

        // --- 2. EXIT SECTION (Right 180px) ---
        const exitText = this.add.text(combX + 80 + 90, combY + combH/2, "✖ বাহির", {
            fontSize: '28px', fontFamily: "'Anek Bangla', sans-serif", padding: { y: 5 }, color: '#fd3a3a', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const exitHit = this.add.rectangle(combX + 80 + 90, combY + combH/2, 180, combH, 0x000000, 0).setInteractive({useHandCursor: true});
        
        exitHit.on('pointerover', () => { 
            exitText.setColor('#ffaaaa'); 
            drawCombBg(0xff4444); 
        });
        
        exitHit.on('pointerout', () => { 
            exitText.setColor('#ff2e2e'); 
            drawCombBg(); 
        });
        
        exitHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            this.tweens.add({ targets: [exitText], scale: 0.95, duration: 50, yoyo: true });
            
            // Call the confirmation popup instead of exiting directly
            this.showExitConfirmation();
        });
    }
    // --- NEW: Exit Confirmation Popup ---
    showExitConfirmation() {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Dark overlay blocking background clicks
        const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.85).setInteractive().setDepth(10001);
        const container = this.add.container(cx, cy).setDepth(10002);

        // Popup Background
        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 1);
        bg.fillRoundedRect(-220, -140, 440, 280, 20);
        bg.lineStyle(4, 0x00ffff, 1);
        bg.strokeRoundedRect(-220, -140, 440, 280, 20);

        // Title & Description
        const title = this.add.text(0, -80, "গেম থেকে বাহির?", {
            fontSize: "36px", fontFamily: "'Anek Bangla'", color: "#00ffff", fontStyle: "bold"
        }).setOrigin(0.5);

        const desc = this.add.text(0, -20, "আপনি কি গেম থেকে বের হতে চান?", {
            fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#ffffff", align: "center"
        }).setOrigin(0.5);

        // --- 'NO' Button (Cancel) ---
        const noBg = this.add.graphics();
        noBg.fillStyle(0x0066aa, 1);
        noBg.fillRoundedRect(-180, 50, 160, 60, 25);
        const noTxt = this.add.text(-100, 80, "না", { 
            fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" 
        }).setOrigin(0.5);
        const noHit = this.add.rectangle(-100, 80, 160, 60, 0x000000, 0).setInteractive({ useHandCursor: true });

        noHit.on('pointerdown', () => {
            this.playSound('sfx_click');
            overlay.destroy();
            container.destroy();
        });

        // --- 'YES' Button (Confirm Exit) ---
        const yesBg = this.add.graphics();
        yesBg.fillStyle(0xff3333, 1);
        yesBg.fillRoundedRect(20, 50, 160, 60, 25);
        const yesTxt = this.add.text(100, 80, "হ্যাঁ", { 
            fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" 
        }).setOrigin(0.5);
        const yesHit = this.add.rectangle(100, 80, 160, 60, 0x000000, 0).setInteractive({ useHandCursor: true });

        yesHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
            } else {
                // Fallback behavior if testing in a desktop browser
                console.log("App exit triggered (Native exit only works on Cordova/Mobile)");
                overlay.destroy();
                container.destroy();
            }
        });

        // Add everything to container
        container.add([bg, title, desc, noBg, noTxt, noHit, yesBg, yesTxt, yesHit]);

        // Pop-in animation
        container.setScale(0.8);
        container.setAlpha(0);
        this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 250, ease: 'Back.out' });
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
            if (this.isStartingGame) return;
            this.playSound('sfx_click');
            this.tweens.add({
                targets: container, scale: 0.95, duration: 80, yoyo: true, onComplete: () => this.scene.start("ShopScene") 
            });
        });

        container.add([pedestal, bgGlow, this.reactorRing, shipIcon, labelBg, label, hitArea]);

        this.hangarContainer = container;
        this.hangarShipIcon = shipIcon;
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
            fontSize: "28px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 600, color: "#ffffff" 
        }).setOrigin(0, 0.5);

        const arrow = this.add.text(width/2 - 30, 0, "▼", { 
            fontSize: "24px", color: "#00ffff" 
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
                fontSize: "26px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 500, color: "#b3d4ff" 
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
                    this.showNotification("Play a game to earn revision questions.", "error");
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
            if (this.isStartingGame) return;

            if (this.selectedMode === "revision" && this.getAvailableQuestionCount("revision") === 0) {
                this.showNotification("আগের কোনো প্রশ্ন পাওয়া যায়নি! আগে নরমাল মোড খেলুন।", "error");
                return;
            } else if (this.selectedMode === "new" && this.getAvailableQuestionCount("new") === 0) {
                this.showNotification("আপনি এই বিভাগের সব প্রশ্নের উত্তর দিয়ে দিয়েছেন!", "error");
                return;
            } else if (this.getAvailableQuestionCount(this.selectedMode) === 0) {
                this.showNotification("এই বিভাগে কোনো প্রশ্ন নেই!", "error");
                return;
            }

            this.isStartingGame = true;
            this.playSound('sfx_powerup');
            
            this.tweens.add({ targets: container, scale: 0.92, duration: 100, yoyo: true, onComplete: () => {
                const equipped = window.GameState.equippedShip || "default";
                const level = window.GameState.weaponLevel || 1;
                let shipTexture = (equipped === "default") ? `player_lv${level}` : `${equipped}_lv${level}`;
                if (!this.textures.exists(shipTexture)) shipTexture = "player_lv1";

                let wx = this.hangarContainer.x + this.hangarShipIcon.x;
                let wy = this.hangarContainer.y + this.hangarShipIcon.y;
                
                let dummy = this.add.image(wx, wy, shipTexture).setScale(0.85).setDepth(9999);
                if(this.hangarShipIcon) this.hangarShipIcon.setVisible(false);

                const themeColors = (window.getThemeColors) ? window.getThemeColors() : { bgTop: 0x1A0545, bgBot: 0x003355 };
                
                const transitionBg = this.add.graphics();
                transitionBg.fillGradientStyle(themeColors.bgTop, themeColors.bgTop, themeColors.bgBot, themeColors.bgBot, 1);
                transitionBg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
                transitionBg.setDepth(9998); 
                transitionBg.setAlpha(0);

                this.tweens.add({
                    targets: transitionBg,
                    alpha: 1,
                    duration: 800,
                    ease: 'Sine.easeInOut'
                });

                this.tweens.add({
                    targets: dummy,
                    y: -150,
                    scale: 1.5,
                    duration: 800,
                    ease: 'Back.easeIn',
                    onComplete: () => this.startGame()
                });
                
                this.children.list.forEach(c => {
                    if (c !== dummy && c !== transitionBg && c.depth > -90) {
                        this.tweens.killTweensOf(c);
                        this.tweens.add({ targets: c, alpha: 0, duration: 400 });
                    }
                });
            }});
        });
    }

    createInfoBox(x, y, width) {
        const height = 160; 
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000815, 0.45); 
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.lineStyle(1.5, 0x003355, 0.3); 
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

        const tabW = width / 3;
        const tabY = -height/2 + 25;
        
        const highlightBg = this.add.graphics();
        highlightBg.fillStyle(0xffffff, 0.05);
        const highlightHeight = 44; 
        highlightBg.fillRoundedRect(
            -tabW/2 + 5, 
            tabY - (highlightHeight / 2), 
            tabW - 10, 
            highlightHeight, 
            12
        );
        
        container.add([bg, highlightBg]);

        const tabs = [
            { id: "top", label: "🏆 টপ", xOffset: -tabW },
            { id: "tips", label: "💡 টিপস", xOffset: 0 },
            { id: "mission", label: "🎯 মিশন", xOffset: tabW }
        ];

        this.infoContainers = {
            top: this.add.container(0, 25),
            tips: this.add.container(0, 25),
            mission: this.add.container(0, 25)
        };
        
        const div = this.add.rectangle(0, -height/2 + 50, width - 40, 1.5, 0x004488, 0.3);
        container.add(div);

        // --- UPDATED: Cycle tabs on load ---
        let currentTab = localStorage.getItem('cycle_info_tab') || "tips";
        
        // Determine the next tab to save for the NEXT time the game loads
        let nextTab = "mission"; 
        if (currentTab === "mission") nextTab = "top";
        else if (currentTab === "top") nextTab = "tips";
        
        localStorage.setItem('cycle_info_tab', nextTab);

        // Set the initial highlight position based on the dynamic currentTab
        let activeTabObj = tabs.find(t => t.id === currentTab);
        highlightBg.x = activeTabObj ? activeTabObj.xOffset : 0;
        // -----------------------------------

        tabs.forEach(tab => {
            const btnHit = this.add.rectangle(tab.xOffset, tabY, tabW, 45, 0x000000, 0).setInteractive({ useHandCursor: true });
            
            const txt = this.add.text(tab.xOffset, tabY, tab.label, {
                fontSize: "25px", 
                fontFamily: "'Anek Bangla'", 
                color: tab.id === currentTab ? "#dddddd" : "#6c89a7", 
                fontStyle: "bold",
                shadow: { offsetX: 1, offsetY: 1, color: "#000000", blur: 3, fill: true }
            }).setOrigin(0.5);
            
            tab.textObj = txt;
            
            btnHit.on('pointerdown', () => {
                this.playSound('sfx_tick', 0.5);
                currentTab = tab.id;
                
                this.tweens.add({ targets: highlightBg, x: tab.xOffset, duration: 250, ease: 'Cubic.out' });
                tabs.forEach(t => t.textObj.setColor(t.id === currentTab ? "#dddddd" : "#6c89a7"));
                
                Object.keys(this.infoContainers).forEach(k => {
                    this.infoContainers[k].setVisible(k === currentTab);
                });

                if (this.tipTimerEvent) this.tipTimerEvent.reset({ delay: 5000, loop: true, callback: this.cycleTip });
            });
            
            container.add([txt, btnHit]);
            container.add(this.infoContainers[tab.id]);
        });
        
        Object.keys(this.infoContainers).forEach(k => {
            this.infoContainers[k].setVisible(k === currentTab);
        });

        // --- CONTENT 1: TIPS ---
        this.normalTips = [
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
        this.revisionTips = [
            "রিভিশন মোড: এখানে শুধুমাত্র আপনার আগে খেলা প্রশ্নগুলোই আসবে।",
            "রিভিশন মোড: এই মোডে নতুন কোনো প্রশ্ন আসবে না, তাই আত্মবিশ্বাসের সাথে উত্তর দিন।"
        ];
        
        let currentTipIndex = Phaser.Math.Between(0, this.normalTips.length - 1);
        
        this.tipTextObj = this.add.text(0, 0, "", {
            fontSize: "25px", 
            fontFamily: "'Anek Bangla'", 
            color: "#e0f0ff", 
            align: "center", 
            wordWrap: { width: width - 40 }, 
            lineSpacing: 6,
            shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);
        this.infoContainers.tips.add(this.tipTextObj);

        // --- CONTENT 2: MISSION ---
        let currentMissionIndex = 0;
        this.missionTextObj = this.add.text(0, 0, "", {
            fontSize: "25px", 
            fontFamily: "'Anek Bangla'", 
            color: "#ffea88", 
            align: "center", 
            wordWrap: { width: width - 40 }, 
            lineSpacing: 6,
            shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);
        this.infoContainers.mission.add(this.missionTextObj);

        // --- CONTENT 3: TOP (Leaderboard) ---
        if (typeof Leaderboard !== 'undefined') {
            const lb = new Leaderboard(this, 0, 0, width - 20, 110);
            this.infoContainers.top.add(lb);
        }

        // --- TIMER & CYCLE LOGIC ---
        this.cycleTip = () => {
            if (currentTab === "tips") {
                const activeTips = this.selectedMode === "revision" ? this.revisionTips : this.normalTips;
                currentTipIndex = (currentTipIndex + 1) % activeTips.length;
                this.tweens.add({
                    targets: this.tipTextObj, alpha: 0, y: 10, duration: 250, ease: 'Cubic.easeIn',
                    onComplete: () => {
                        this.tipTextObj.setText(activeTips[currentTipIndex]);
                        this.tipTextObj.y = -10; 
                        this.tweens.add({ targets: this.tipTextObj, alpha: 1, y: 0, duration: 350, ease: 'Cubic.easeOut' });
                    }
                });
            } else if (currentTab === "mission") {
                let missions = GameState.dailyMissions || [];
                if (missions.length > 0) {
                    currentMissionIndex = (currentMissionIndex + 1) % missions.length;
                    let m = missions[currentMissionIndex];
                    let status = m.completed ? "✅ সম্পন্ন" : `⏳ (${m.progress}/${m.target})`;
                    this.tweens.add({
                        targets: this.missionTextObj, alpha: 0, y: 10, duration: 250, ease: 'Cubic.easeIn',
                        onComplete: () => {
                            this.missionTextObj.setText(`🎯 ${m.desc}\n${status}`);
                            this.missionTextObj.y = -10;
                            this.tweens.add({ targets: this.missionTextObj, alpha: 1, y: 0, duration: 350, ease: 'Cubic.easeOut' });
                        }
                    });
                }
            }
        };

        const initTips = this.selectedMode === "revision" ? this.revisionTips : this.normalTips;
        this.tipTextObj.setText(initTips[currentTipIndex]);
        
        let missionsInit = GameState.dailyMissions || [];
        if(missionsInit.length > 0) {
            let m = missionsInit[0];
            let status = m.completed ? "✅ সম্পন্ন" : `⏳ (${m.progress}/${m.target})`;
            this.missionTextObj.setText(`🎯 ${m.desc}\n${status}`);
        } else {
            this.missionTextObj.setText("🎯 কোনো দৈনিক মিশন নেই");
        }

        if (this.tipTimerEvent) this.tipTimerEvent.remove();
        this.tipTimerEvent = this.time.addEvent({ delay: 6000, loop: true, callback: this.cycleTip });
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
                fontSize: "25px", fontFamily: "'Anek Bangla', sans-serif",padding: { y: 10 }, fontWeight: 700, color: "#b3d4ff" 
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

        const shop = createNavBtn(-totalWidth/2 + btnWidth/2, "🛒", "শপ", "30px");
        shop.hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.scene.start("ShopScene");
        });
        shop.hitArea.on('pointerover', () => shop.tText.setColor("#ffffff"));
        shop.hitArea.on('pointerout', () => shop.tText.setColor("#b3d4ff"));

        const div1 = this.add.rectangle(-totalWidth/2 + btnWidth, 0, 3, height - 20, 0x0066aa, 0.7);

        const study = createNavBtn(-totalWidth/2 + btnWidth*1.5, "📖", "স্টাডি", "30px");
        study.hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.scene.start("ReadingScene");
        });
        study.hitArea.on('pointerover', () => study.tText.setColor("#ffffff"));
        study.hitArea.on('pointerout', () => study.tText.setColor("#b3d4ff"));

        const div2 = this.add.rectangle(0, 0, 3, height - 20, 0x0066aa, 0.7);

        const hist = createNavBtn(totalWidth/2 - btnWidth*1.5, "📜", "হিস্ট্রি", "30px");
        hist.hitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.showMatchHistoryPopup();
        });
        hist.hitArea.on('pointerover', () => hist.tText.setColor("#ffffff"));
        hist.hitArea.on('pointerout', () => hist.tText.setColor("#b3d4ff"));

        const div3 = this.add.rectangle(totalWidth/2 - btnWidth, 0, 3, height - 20, 0x0066aa, 0.7);

        const wheel = createNavBtn(totalWidth/2 - btnWidth/2, "🌀", "স্পিন", "30px");
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
        if (this.isHistoryPopupOpen) return;
        this.isHistoryPopupOpen = true;

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

        const title = this.add.text(0, -panelH/2 + 50, "ম্যাচ হিস্ট্রি", { 
            fontSize: '40px', fontFamily: "'Anek Bangla'",padding: { y: 5 }, color: '#00e1ff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const closeX = panelW/2 - 40;
        const closeY = -panelH/2 + 50;
        
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0xff3333, 1);
        closeBg.fillRoundedRect(closeX - 25, closeY - 25, 50, 50, 15);
        
        const closeIcon = this.add.text(closeX, closeY, "✖", { fontSize: '32px', color: '#ffffff', fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(closeX, closeY, 50, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        let cleanup = () => {
            this.isHistoryPopupOpen = false;
            if (popup) popup.destroy();
            this.historyScrollData = null; 
            this.historyScrollState = null;
        };

        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            cleanup();
        });

        popup.add([overlay, bg, title, closeBg, closeIcon, closeHit]);

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
                
                const cardY = currentY; 
                
                const drawCard = (hover) => {
                    cardBg.clear();
                    cardBg.fillStyle(hover ? 0x0a1a3a : 0x051025, 0.9);
                    cardBg.fillRoundedRect(-listWidth/2 + 10, cardY, listWidth - 20, cardH, 15);
                    cardBg.lineStyle(2, hover ? 0x0088ff : 0x004488, 1);
                    cardBg.strokeRoundedRect(-listWidth/2 + 10, cardY, listWidth - 20, cardH, 15);
                };
                drawCard(false);

                const dateTxt = this.add.text(-listWidth/2 + 30, cardY + 20, match.date, { fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#aaaaaa" });
                
                let pColor = "#ff4444";
                if(match.percent === 100) pColor = "#ffffff";
                else if(match.percent >= 80) pColor = "#00ff00";
                else if(match.percent >= 26) pColor = "#ffff00";

                const pctTxt = this.add.text(listWidth/2 - 30, cardY + 30, `${match.percent}%`, { fontSize: "42px", fontFamily: "'Anek Bangla'", fontStyle: 'bold', color: pColor }).setOrigin(1, 0);

                const stats = `মোট: ${match.total} | সঠিক: ${match.correct} | ভুল: ${match.wrong} | স্কিপ: ${match.skipped}`;
                const statTxt = this.add.text(-listWidth/2 + 30, cardY + 65, stats, { fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#ffffff" });

                const hitArea = this.add.rectangle(0, cardY + cardH/2, listWidth - 20, cardH, 0x000000, 0).setInteractive({ useHandCursor: true });
                
                let downY = 0;
                hitArea.on('pointerdown', (pointer) => {
                    downY = pointer.y;
                    drawCard(true);
                });
                
                hitArea.on('pointerup', (pointer) => {
                    if (Math.abs(pointer.y - downY) < 15) {
                        this.playSound('sfx_click');
                        GameState.viewingHistoryMatch = match;
                        cleanup();
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
            const minScroll = Math.min(0, listHeight - currentY - 20);
            let startY = 0;
            let containerStartY = 0;
            let lastTime = 0;
            let lastY = 0;

            const scrollZone = this.add.rectangle(0, listStartY + listHeight/2, listWidth, listHeight, 0x000000, 0).setInteractive();
            popup.add(scrollZone);

            this.historyScrollState = { isDragging: false, velocityY: 0 };
            this.historyScrollData = { contentContainer, listStartY, minScroll };

            scrollZone.on('pointerdown', (pointer) => {
                if(!this.historyScrollState) return;
                this.historyScrollState.isDragging = true;
                this.historyScrollState.velocityY = 0;
                startY = pointer.y;
                lastY = pointer.y;
                containerStartY = contentContainer.y;
                lastTime = this.time.now;
            });

            scrollZone.on('wheel', (pointer, deltaX, deltaY, deltaZ) => {
                if (!this.historyScrollData) return;
                let newY = contentContainer.y - deltaY;
                if (newY > listStartY) newY = listStartY;
                if (newY < listStartY + minScroll) newY = listStartY + minScroll;
                contentContainer.y = newY;
                if(this.historyScrollState) this.historyScrollState.velocityY = 0;
            });

            const onPointerMove = (pointer) => {
                if (this.historyScrollState && this.historyScrollState.isDragging) {
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
            };

            const stopDrag = () => { 
                if(this.historyScrollState) this.historyScrollState.isDragging = false; 
            };

            this.input.on('pointermove', onPointerMove);
            this.input.on('pointerup', stopDrag);
            this.input.on('gameout', stopDrag); 

            const standardCleanup = cleanup;
            cleanup = () => {
                this.input.off('pointermove', onPointerMove);
                this.input.off('pointerup', stopDrag);
                this.input.off('gameout', stopDrag);
                standardCleanup();
            };
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
                this.showNotification("আগের কোনো প্রশ্ন পাওয়া যায়নি! আগে নরমাল মোড খেলুন।", "error");
                this.isStartingGame = false;
                return;
            }
        } else if (this.selectedMode === "new") {
            finalQuestions = finalQuestions.filter(q => !seenQuestions.includes(q.question));
            if (finalQuestions.length === 0) {
                this.showNotification("আপনি এই বিভাগের সব প্রশ্নের উত্তর দিয়ে দিয়েছেন!", "error");
                this.isStartingGame = false;
                return;
            }
        }

        if (finalQuestions.length === 0) {
            this.showNotification("এই বিভাগে কোনো প্রশ্ন নেই!", "error");
            this.isStartingGame = false;
            return;
        }

        Phaser.Utils.Array.Shuffle(finalQuestions);

        window.resetGameState();
        
        GameState.currentSubject = this.selectedSubject;
        localStorage.setItem('game_currentSubject', GameState.currentSubject);

        GameState.currentQuestions = finalQuestions;
        GameState.gameMode = this.selectedMode;

        if (localStorage.getItem('tutorial_completed') === 'true') {
            this.scene.start("GameScene");
            this.scene.launch("QuestionScene");
        } else {
            this.scene.start("InstructionScene");
        }
    }

    closeAllDropdowns() {
        this.dropdowns.forEach(d => {
            if (d && d.close) d.close();
        });
    }
}