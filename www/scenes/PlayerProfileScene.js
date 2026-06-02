class PlayerProfileScene extends Phaser.Scene {
    constructor() {
        super("PlayerProfileScene");
    }

    init() {
        this.backgroundLayers = [];
        this.activeNotification = null; 
    }

    create() {
        const cx = this.cameras.main.centerX;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        if (!GameState.profile) {
            GameState.profile = { n: "GUEST", a: 0, xp: 0, k: 0, bk: 0, qr: 0, qw: 0, s: {} };
        }
        
        if (!GameState.profile.joined) {
            const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
            try {
                GameState.profile.joined = new Date().toLocaleDateString('bn-BD', dateOptions);
            } catch (e) {
                GameState.profile.joined = new Date().toLocaleDateString();
            }
            if (window.saveGame) window.saveGame();
        }

        if (typeof GameState.gamesPlayed === 'undefined') {
            GameState.gamesPlayed = 0;
        }

        // 👉 NEW: Check if already connected on scene load to sync name & give unclaimed bonus
        const currentlyConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        if (currentlyConnected) {
            let user = window.FirebaseAuth.currentUser;
            if (user && user.displayName) {
                let currentName = GameState.profile.n;
                if (!currentName || currentName === "GUEST" || currentName === "নাম লিখুন") {
                    let googleName = user.displayName.split(" ")[0].substring(0, 8).toUpperCase();
                    if(googleName.length > 0) {
                        GameState.profile.n = googleName;
                        if (window.saveGame) window.saveGame();
                    }
                }
            }
            
            // Show popup if they are connected but haven't claimed the bonus yet
            if (!GameState.profile.googleBonusClaimed) {
                this.time.delayedCall(1000, () => {
                    this.showGoogleBonusPopup();
                });
            }
        }

        this.lvlData = window.getLevelData();
        this.rankData = window.getRankData(this.lvlData.level);

        GameState.profile.a = window.getAvatars().indexOf(this.rankData.avatar);
        if (GameState.profile.a === -1) GameState.profile.a = 0; 

        // --- BACKGROUND ---
        this.createBackground(w, h);

        // --- TOP NAVIGATION ---
        this.createTopUI(w);

        // --- SCENE TITLE (Scaled Up) ---
        const title = this.add.text(cx, 120, "প্লেয়ার প্রোফাইল", {
            fontSize: "64px", 
            fontFamily: "'Anek Bangla', sans-serif", 
            color: "#00e1ff", 
            fontStyle: "bold",
            padding: { y: 5 },
            stroke: "#000000", 
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 12, fill: true, stroke: true }
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: title, alpha: 1, y: 142, duration: 600, ease: 'Cubic.easeOut' });

        // --- PANEL LAYOUT CONFIGURATION (Adjusted for 1280h bounds) ---
        const panelW = 680;
        
        // Panels scaled to fit larger text & buttons
        this.createIdentitySection(cx, 345, panelW, 300);
        this.createStatsSection(cx, 755, panelW, 450);
        this.createMasterySection(cx, 1205, panelW, 380);
    }

    // 👉 NEW: The Bonus Popup UI
    showGoogleBonusPopup() {
        const cxScreen = this.cameras.main.width / 2;
        const cyScreen = this.cameras.main.height / 2;
        
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85).setOrigin(0).setInteractive().setDepth(9999);
        const popup = this.add.container(cxScreen, cyScreen).setDepth(10000);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 1);
        bg.fillRoundedRect(-290, -190, 580, 380, 24); 
        bg.lineStyle(4, 0x00ff88, 1);
        bg.strokeRoundedRect(-290, -190, 580, 380, 24);
        
        const title = this.add.text(0, -130, "Connect Bonus!", { fontSize: "42px", fontFamily: "'Anek Bangla'", color: "#00ff88", fontStyle: "bold" }).setOrigin(0.5);
        const desc = this.add.text(0, -45, "গুগল অ্যাকাউন্ট যুক্ত করার জন্য ধন্যবাদ!\nআপনার প্রথম লগইন পুরস্কার সংগ্রহ করুন:", { fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff", align: "center", lineSpacing: 8 }).setOrigin(0.5);
        
        const rewardTxt = this.add.text(0, 35, "🎁 200 Debris   &   🔑 5 Keys", { fontSize: "32px", fontFamily: "Arial", color: "#ffd700", fontStyle: "bold", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5);

        const claimBtn = this.add.text(0, 120, "Claim Bonus", { fontSize: "34px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: 'bold', backgroundColor: "#00aa44", padding: {x: 50, y: 15} }).setOrigin(0.5).setInteractive({useHandCursor: true});
        
        claimBtn.on('pointerdown', () => {
            this.playSound('sfx_powerup');
            
            // Give Rewards
            GameState.debris = (GameState.debris || 0) + 200;
            GameState.keys = (GameState.keys || 0) + 5;
            GameState.profile.googleBonusClaimed = true; // Mark as claimed forever
            
            if (window.saveCurrency) window.saveCurrency();
            if (window.saveGame) window.saveGame();
            
            this.showNotification("Bonus Claimed Successfully!", "success");
            
            // Animate popup closing
            this.tweens.add({
                targets: popup, scale: 0.8, alpha: 0, duration: 250, ease: 'Power2',
                onComplete: () => {
                    overlay.destroy();
                    popup.destroy();
                }
            });
        });
        
        popup.add([bg, title, desc, rewardTxt, claimBtn]);
        
        popup.setScale(0);
        this.tweens.add({ targets: popup, scale: 1, duration: 400, ease: 'Back.easeOut' });
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

    createIdentitySection(x, y, w, h) {
        const container = this.add.container(x, y + 40).setAlpha(0);
        this.drawGlassPanel(container, 0, 0, w, h);

        if (!this.textures.exists("profile_ring_clean")) this.generateTechRingClean();
        
        const avatarX = -w / 2 + 140; 
        const avatarY = 0; 
        const baseRingScale = 0.65; 
        
        // Avatar Background & Ring (Scaled up)
        const avatarBg = this.add.graphics();
        avatarBg.fillStyle(0x020815, 0.95);
        avatarBg.fillCircle(avatarX, avatarY, 80);
        avatarBg.lineStyle(3, 0x0055aa, 0.8);
        avatarBg.strokeCircle(avatarX, avatarY, 80);

        const techRing = this.add.image(avatarX, avatarY, "profile_ring_clean").setAlpha(0.8).setScale(baseRingScale);
        techRing.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: techRing, rotation: Math.PI * 2, duration: 35000, repeat: -1, ease: 'Linear' });

        const techRingInner = this.add.image(avatarX, avatarY, "profile_ring_clean").setAlpha(0.5).setScale(baseRingScale * 0.82).setTint(0x00ffcc);
        techRingInner.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: techRingInner, rotation: -Math.PI * 2, duration: 25000, repeat: -1, ease: 'Linear' });

        const avatarTxt = this.add.text(avatarX, avatarY, this.rankData.avatar, { 
            fontSize: '80px',
            shadow: { offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.6)', blur: 8 }
        }).setOrigin(0.5);
        this.tweens.add({ targets: avatarTxt, y: avatarY - 4, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        const dividerX = avatarX + 130;
        const vertDivider = this.add.rectangle(dividerX, 0, 2, 230, 0x0066aa, 0.5); // Slightly taller to match new text span

        // FIX: Shifted everything UP to remove the top gap and center perfectly
        const textStartX = dividerX + 30; 
        const nameY = -110; 
        const rankY = -65;
        const btnY = -15;     
        const dateY = 35;
        const barHeaderY = 80;
        const barY = 105;

        // Player Name
        const nameTxt = this.add.text(textStartX, nameY, GameState.profile.n, {
            fontSize: '44px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold', padding: { y: 2 },
            stroke: "#002266", strokeThickness: 5,
            shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0, 0.5);

        // Edit Button (Anchored cleanly)
        const editBtnContainer = this.add.container(textStartX, btnY);
        const editW = 110;
        const editH = 40; 
        const editBg = this.add.graphics();
        editBg.fillStyle(0x004488, 0.8);
        editBg.fillRoundedRect(0, -editH/2, editW, editH, editH/2);
        editBg.lineStyle(2, 0x00ffff, 0.8);
        editBg.strokeRoundedRect(0, -editH/2, editW, editH, editH/2);
        
        const editTxt = this.add.text(editW/2, 0, "✎ EDIT", { 
            fontSize: '18px', fontFamily: "Arial", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0.5);
        
        const editHitArea = this.add.rectangle(editW/2, 0, editW, editH, 0x000000, 0).setInteractive({ useHandCursor: true });
        editBtnContainer.add([editBg, editTxt, editHitArea]);

        // Connection Indicator Button
        this.connBtnContainer = this.add.container(textStartX + editW + 15, btnY);
        this.connBg = this.add.graphics();
        this.connDot = this.add.circle(20, 0, 7); 
        this.connBtnTxt = this.add.text(35, 0, "", {
            fontSize: '18px', fontFamily: "Arial", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.connHitArea = this.add.rectangle(0, 0, 10, 10, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        this.connBtnContainer.add([this.connBg, this.connDot, this.connBtnTxt, this.connHitArea]);

        this.updateConnectionUI = (connected) => {
            const btnTextStr = connected ? "Log Out" : "Connect (Google)";
            this.connBtnTxt.setText(btnTextStr);

            const dotColor = connected ? 0x00ff88 : 0xff4444;
            const strokeColor = connected ? 0x00aa00 : 0xaa0000;
            
            this.connDot.setFillStyle(dotColor);
            this.connDot.setStrokeStyle(1.5, strokeColor);

            if (!connected) {
                if (!this.dotTween) {
                    this.dotTween = this.tweens.add({ targets: this.connDot, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
                } else {
                    this.dotTween.play();
                }
            } else {
                if (this.dotTween) {
                    this.dotTween.stop();
                    this.connDot.setAlpha(1);
                }
            }

            const textW = this.connBtnTxt.width;
            const rightPad = 20;
            const totalW = textW + 35 + rightPad; 
            const h = 40; 

            this.connHitArea.setSize(totalW, h);
            this.connHitArea.setPosition(totalW / 2, 0); 

            const drawBg = (hover = false) => {
                this.connBg.clear();
                const bgColor = connected
                    ? (hover ? 0xaa2222 : 0x661111) 
                    : (hover ? 0x0066cc : 0x004488); 
                const borderColor = connected ? 0xff4444 : 0x00aaff;

                this.connBg.fillStyle(bgColor, hover ? 1 : 0.8);
                this.connBg.fillRoundedRect(0, -h/2, totalW, h, h/2);
                this.connBg.lineStyle(2, borderColor, 0.9);
                this.connBg.strokeRoundedRect(0, -h/2, totalW, h, h/2);
            };

            drawBg(false);

            this.connHitArea.off('pointerover');
            this.connHitArea.off('pointerout');
            this.connHitArea.on('pointerover', () => drawBg(true));
            this.connHitArea.on('pointerout', () => drawBg(false));

            nameTxt.setText(GameState.profile.n);
        };

        // Mobile-friendly Logout Popup
        this.showLogoutConfirmation = () => {
            const cxScreen = this.cameras.main.width / 2;
            const cyScreen = this.cameras.main.height / 2;
            
            const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85).setOrigin(0).setInteractive().setDepth(9999);
            const popup = this.add.container(cxScreen, cyScreen).setDepth(10000);
            
            const bg = this.add.graphics();
            bg.fillStyle(0x001122, 1);
            bg.fillRoundedRect(-280, -160, 560, 320, 20); 
            bg.lineStyle(4, 0xff0000, 1);
            bg.strokeRoundedRect(-280, -160, 560, 320, 20);
            
            const warnTitle = this.add.text(0, -90, "সতর্কতা!", { fontSize: "42px", fontFamily: "'Anek Bangla'", color: "#ff4444", fontStyle: "bold" }).setOrigin(0.5);
            const desc = this.add.text(0, -15, "আপনি কি লগ আউট করতে চান?\nআপনার ক্লাউড সেভ বন্ধ হয়ে যাবে।", { fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#ffffff", align: "center", lineSpacing: 8 }).setOrigin(0.5);
            
            const cancelBtn = this.add.text(-130, 90, "বাতিল", { fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#ffffff", backgroundColor: "#444444", padding: {x: 30, y: 15} }).setOrigin(0.5).setInteractive({useHandCursor: true});
            const confirmBtn = this.add.text(130, 90, "লগ আউট", { fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#ffffff", backgroundColor: "#aa0000", padding: {x: 30, y: 15} }).setOrigin(0.5).setInteractive({useHandCursor: true});
            
            cancelBtn.on('pointerdown', () => {
                this.playSound('sfx_click');
                overlay.destroy();
                popup.destroy();
            });
            
            confirmBtn.on('pointerdown', () => {
                this.playSound('sfx_click');
                if (window.FirebaseAuth && window.FirebaseAuth.signOut) {
                    window.FirebaseAuth.signOut().then(() => {
                        this.updateConnectionUI(false);
                    });
                } else {
                    this.updateConnectionUI(false); 
                }
                overlay.destroy();
                popup.destroy();
            });
            
            popup.add([bg, warnTitle, desc, cancelBtn, confirmBtn]);
        };

        // 👉 NEW: Trigger Google API and give Name & Bonus
        this.connHitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            const currentlyConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
            
            if (currentlyConnected) {
                this.showLogoutConfirmation();
            } else {
                if (window.signInWithGoogle) {
                    let res = window.signInWithGoogle();
                    if (res && res.then) {
                        res.then(() => {
                            this.showNotification("Google Account Connected!\nCloud sync active.", "success");
                            
                            // Check if the current name is default, empty, or "GUEST"
                            let user = window.FirebaseAuth.currentUser;
                            if (user && user.displayName) {
                                let currentName = GameState.profile.n;
                                if (!currentName || currentName === "GUEST" || currentName === "নাম লিখুন") {
                                    let googleName = user.displayName.split(" ")[0].substring(0, 8).toUpperCase();
                                    if(googleName.length > 0) {
                                        GameState.profile.n = googleName;
                                        nameTxt.setText(GameState.profile.n);
                                        if (window.saveGame) window.saveGame();
                                    }
                                }
                            }

                            this.updateConnectionUI(true);

                            // Trigger the Connect Bonus Popup
                            if (!GameState.profile.googleBonusClaimed) {
                                this.time.delayedCall(500, () => {
                                    this.showGoogleBonusPopup();
                                });
                            }
                            
                        }).catch(() => {
                            this.showNotification("Sign-in Failed!\nPlease check your connection.", "error");
                        });
                    }
                }
            }
        });

        this.updateConnectionUI(window.FirebaseAuth && window.FirebaseAuth.currentUser);

        editHitArea.on('pointerover', () => { editBg.fillStyle(0x0066cc, 1).fillRoundedRect(0, -editH/2, editW, editH, editH/2); });
        editHitArea.on('pointerout', () => { editBg.fillStyle(0x004488, 0.8).fillRoundedRect(0, -editH/2, editW, editH, editH/2); });
        editHitArea.on('pointerdown', () => {
            this.playSound('sfx_click');
            this.tweens.add({ targets: editBtnContainer, scale: 0.9, duration: 50, yoyo: true });
            let input = prompt("Enter Commander Name (Max 8 chars):", nameTxt.text);
            if (input !== null) {
                let cleaned = input.trim().substring(0, 8).toUpperCase();
                if (cleaned.length > 0) {
                    GameState.profile.n = cleaned;
                    nameTxt.setText(GameState.profile.n);
                    window.saveGame();
                }
            }
        });

        const rankTxt = this.add.text(textStartX, rankY, this.rankData.tag, {
            fontSize: '24px', fontFamily: "'Anek Bangla', sans-serif", color: '#00ffff', fontStyle: 'bold',
            stroke: "#001133", strokeThickness: 4
        }).setOrigin(0, 0.5);

        const joinedDate = GameState.profile.joined || "Unknown Date";
        const joinedTxt = this.add.text(textStartX, dateY, ` 📅 যুক্ত হয়েছেন: ${joinedDate} `, {
            fontSize: '20px', 
            fontFamily: "'Anek Bangla', sans-serif", 
            color: '#aaccff', 
            backgroundColor: 'rgba(0, 40, 80, 0.6)', 
            padding: { x: 8, y: 2 }, 
            stroke: "#001122",
            strokeThickness: 2
        }).setOrigin(0, 0.5);

        const barRightPadding = 30;
        const barW = (w / 2) - textStartX - barRightPadding; 
        
        const lvlHeader = this.add.text(textStartX, barHeaderY, `লেভেল ${this.lvlData.level}`, {
            fontSize: '22px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        const nextLevelBase = this.lvlData.required + (this.lvlData.xp - this.lvlData.progress);
        const xpText = this.add.text(textStartX + barW, barHeaderY, `XP: ${this.lvlData.xp} / ${nextLevelBase}`, {
            fontSize: '20px', fontFamily: "Arial", color: '#aaccff', fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        const barHeight = 16;
        const barBg = this.add.graphics();
        barBg.fillStyle(0x000a1a, 1);
        barBg.fillRoundedRect(textStartX, barY, barW, barHeight, barHeight/2);
        barBg.lineStyle(2, 0x004488, 1);
        barBg.strokeRoundedRect(textStartX, barY, barW, barHeight, barHeight/2);

        const fillW = Math.max(barHeight, barW * this.lvlData.percent);
        const xpFill = this.add.graphics();
        xpFill.fillGradientStyle(0x0055ff, 0x00ffff, 0x001188, 0x0088cc, 1);
        xpFill.fillRoundedRect(textStartX, barY, fillW, barHeight, barHeight/2);

        container.add([avatarBg, techRingInner, techRing, avatarTxt, vertDivider, nameTxt, editBtnContainer, this.connBtnContainer, rankTxt, joinedTxt, lvlHeader, xpText, barBg, xpFill]);
        
        this.tweens.add({ targets: container, y: y, alpha: 1, duration: 600, ease: 'Cubic.easeOut', delay: 100 });
    }

    createStatsSection(x, y, w, h) {
        const container = this.add.container(x, y + 40).setAlpha(0);
        this.drawGlassPanel(container, 0, 0, w, h);

        const title = this.add.text(0, -h / 2 + 45, "পরিসংখ্যান", {
            fontSize: '34px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff', fontStyle: 'bold',
            stroke: "#000000", strokeThickness: 4
        }).setOrigin(0.5);

        const divider = this.add.rectangle(0, -h / 2 + 85, w - 60, 2, 0x0066aa, 0.6);

        const profile = GameState.profile;
        const totalQs = (profile.qr || 0) + (profile.qw || 0);
        const accuracy = totalQs > 0 ? ((profile.qr / totalQs) * 100).toFixed(1) : "0.0";
        const gamesPlayed = GameState.gamesPlayed || 0;
        const avgKills = gamesPlayed > 0 ? (profile.k / gamesPlayed).toFixed(1) : "0.0";

        const cols = 2;
        const padX = 20;
        const padY = 15;
        const cardW = (w - 60 - padX) / 2;
        const cardH = 95; 
        
        const startX = -w / 2 + 30 + cardW / 2; 
        const startY = -70; // Pre-calculated offset inside the panel

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
        
        // Draw the background panel boundaries
        this.drawGlassPanel(container, 0, 0, w, h);

        // Keep the exact same title as requested
        const title = this.add.text(0, -h / 2 + 40, "বিষয়ভিত্তিক তথ্য (Top 3)", {
            fontSize: '34px', fontFamily: "'Anek Bangla', sans-serif", color: '#00e1ff', fontStyle: 'bold',
            stroke: "#000000", strokeThickness: 4
        }).setOrigin(0.5);

        const divider = this.add.rectangle(0, -h / 2 + 80, w - 60, 2, 0x0066aa, 0.6);
        container.add([title, divider]);

        const subStats = GameState.profile.s || {};
        const sortedSubs = Object.entries(subStats).map(([name, data]) => {
            const r = data.r || 0;
            const w = data.w || 0;
            const total = r + w;
            const acc = total > 0 ? (r / total) : 0;
            return { name, r, total, acc };
        }).sort((a, b) => b.total - a.total).slice(0, 3);

        if (sortedSubs.length === 0) {
            // Centered cleanly in the remaining space
            const noData = this.add.text(0, 20, "পর্যাপ্ত যুদ্ধ তথ্য নেই (No mission logs found)", {
                fontSize: '26px', fontFamily: "'Anek Bangla', sans-serif", color: '#5577aa', fontStyle: 'italic'
            }).setOrigin(0.5);
            container.add(noData);
        } else {
            // FIX: Dynamically calculate starting Y based on height to prevent clipping
            let currY = -h / 2 + 130; 
            const ySpacing = 95; // Reduced from 105 to keep all 3 items inside
            const barW = w - 80;

            sortedSubs.forEach((sub, i) => {
                const pct = sub.acc * 100;
                const pctText = pct.toFixed(1) + "%";
                
                const color = sub.acc >= 0.8 ? 0x00ff88 : (sub.acc >= 0.5 ? 0xffcc00 : 0xff4444);
                const colorStr = "#" + color.toString(16).padStart(6, '0');

                // Slightly adjusted font sizes for a cleaner hierarchy within tighter space
                const nameTxt = this.add.text(-barW / 2, currY - 18, `${i + 1}. ${sub.name}`, {
                    fontSize: '26px', fontFamily: "'Anek Bangla', sans-serif", color: '#ffffff', fontStyle: 'bold'
                }).setOrigin(0, 0.5);

                const accTxt = this.add.text(barW / 2, currY - 18, pctText, {
                    fontSize: '28px', fontFamily: "Arial", color: colorStr, fontStyle: 'bold',
                    stroke: "#000000", strokeThickness: 3
                }).setOrigin(1, 0.5);

                // Progress Bar
                const barBg = this.add.graphics();
                barBg.fillStyle(0x000a1a, 1);
                barBg.fillRoundedRect(-barW / 2, currY + 5, barW, 14, 7);

                const fillW = Math.max(14, barW * sub.acc);
                const barFill = this.add.graphics();
                barFill.fillStyle(color, 1);
                barFill.fillRoundedRect(-barW / 2, currY + 5, fillW, 14, 7);

                // Detail text tucked neatly beneath the bar
                const detailTxt = this.add.text(barW / 2, currY + 34, `${sub.r}/${sub.total} Correct`, {
                    fontSize: '20px', fontFamily: "Arial", color: '#88aacc'
                }).setOrigin(1, 0.5);

                container.add([nameTxt, accTxt, barBg, barFill, detailTxt]);
                
                // Increment Y for the next subject
                currY += ySpacing;
            });
        }

        this.tweens.add({ targets: container, y: y, alpha: 1, duration: 600, ease: 'Cubic.easeOut', delay: 300 });
    }

    createStatCard(x, y, w, h, label, val, hexColor) {
        const card = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000a1f, 0.85);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
        
        bg.fillStyle(hexColor, 0.8);
        bg.fillRoundedRect(-w / 2, -h / 2, 8, h, { tl: 12, bl: 12, tr: 0, br: 0 });
        
        bg.lineStyle(2, 0x003377, 0.7);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

        const innerGlow = this.add.graphics();
        innerGlow.fillGradientStyle(hexColor, 0x000000, hexColor, 0x000000, 0.1);
        innerGlow.fillRoundedRect(-w / 2 + 8, -h / 2, w - 8, h, { tl: 0, bl: 0, tr: 12, br: 12 });

        const labelTxt = this.add.text(0, -20, label, {
            fontSize: '20px', fontFamily: "'Anek Bangla', sans-serif, Arial", color: '#aaccff', fontStyle: 'bold'
        }).setOrigin(0.5);

        const colorStr = "#" + hexColor.toString(16).padStart(6, '0');
        const valTxt = this.add.text(0, 18, val, {
            fontSize: '40px', fontFamily: "Arial", color: colorStr, fontStyle: 'bold',
            stroke: "#000000", strokeThickness: 3
        }).setOrigin(0.5);

        card.add([bg, innerGlow, labelTxt, valTxt]);
        return card;
    }

    drawGlassPanel(container, x, y, w, h) {
        const graphics = this.add.graphics();
        
        graphics.fillStyle(0x000000, 0.6);
        graphics.fillRoundedRect(x - w / 2 + 8, y - h / 2 + 8, w, h, 20);

        graphics.fillStyle(0x020816, 0.92);
        graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
        
        graphics.lineStyle(3, 0x0066aa, 0.85);
        graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);

        graphics.lineStyle(1.5, 0x00ffff, 0.25);
        graphics.strokeRoundedRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, 16);

        container.add(graphics);
    }

    createTopUI(w) {
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

        ringGraphics.lineStyle(1.5, 0x00ffff, 0.2);
        ringGraphics.strokeCircle(radius, radius, radius - 20);

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