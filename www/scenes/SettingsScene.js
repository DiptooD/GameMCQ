class SettingsScene extends Phaser.Scene {
    constructor() {
        super("SettingsScene");
    }

    init(data) {
        this.returnScene = (data && data.returnScene) ? data.returnScene : "MenuScene";
        this.isCheckingUpdate = false;
        this.activeNotification = null;
    }

    create() {
        this.scene.bringToTop();

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        
        // Use dynamic dimensions to completely fix background bleeding on different screens
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.container = this.add.container(0, 0);

        // --- 1. OVERLAY (Click Outside to Close) ---
        // Now dynamically covers the entire screen regardless of aspect ratio
        this.overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.85).setOrigin(0).setInteractive();
        
        const closeUI = () => {
            this.playSound('sfx_back');
            this.scene.stop();
            if (this.scene.isPaused(this.returnScene)) {
                this.scene.resume(this.returnScene);
            }
        };

        this.overlay.on('pointerdown', closeUI);

        // --- 2. MAIN SETTINGS PANEL (Glassmorphism) ---
        const panelW = 580;
        const panelH = 880; // Increased from 820 to fix bottom element bleeding

        this.bg = this.add.graphics();
        this.bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 0.98);
        this.bg.fillRoundedRect(cx - panelW/2, cy - panelH/2, panelW, panelH, 22);
        this.bg.lineStyle(2, 0x334155, 1);
        this.bg.strokeRoundedRect(cx - panelW/2, cy - panelH/2, panelW, panelH, 22);
        
        // Prevent clicks inside the panel from passing through to the overlay
        this.bg.setInteractive(new Phaser.Geom.Rectangle(cx - panelW/2, cy - panelH/2, panelW, panelH), Phaser.Geom.Rectangle.Contains);

        // --- 3. TITLE & DIVIDER ---
        // Shifted upwards to balance the newly increased panel height
        this.title = this.add.text(cx, cy - 382, "সেটিংস", { 
            fontSize: '48px', fontFamily: "'Anek Bangla'", color: '#38bdf8', padding: { y: 8 }, fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);

        const headerDiv = this.add.rectangle(cx, cy - 335, panelW - 40, 2, 0x334155, 1);

        // --- 4. CLOSE BUTTON (Chat Style) ---
        const closeX = cx + panelW/2 - 45;
        const closeY = cy - panelH/2 + 52;
        
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0xef4444, 0.15);
        closeBg.fillRoundedRect(closeX - 30, closeY - 30, 60, 60, 16);
        closeBg.lineStyle(2, 0xef4444, 0.8);
        closeBg.strokeRoundedRect(closeX - 30, closeY - 30, 60, 60, 16);
        
        const closeIcon = this.add.text(closeX, closeY, "✖", { fontSize: '34px', color: '#f87171', fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(closeX, closeY, 80, 80, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        closeHit.on('pointerdown', closeUI);
        closeHit.on('pointerover', () => closeIcon.setScale(1.1));
        closeHit.on('pointerout', () => closeIcon.setScale(1));

        this.container.add([this.overlay, this.bg, this.title, headerDiv, closeBg, closeIcon, closeHit]);
        
        // --- Spaced Out UI Elements ---
        let musicVol = Math.round((GameState.musicVolume !== undefined ? GameState.musicVolume : 0.5) * 10);
        if (musicVol < 0) musicVol = 0; 
        this.musicAdj = this.createSlider(-260, "মিউজিক ভলিউম:", 0, 10, 1, musicVol, (v) => v, (val) => {
            GameState.musicVolume = val / 10;
            localStorage.setItem('settings_musicVol', GameState.musicVolume);
            this.updateLiveGameUI();
        });

        let sfxVol = Math.round((GameState.sfxVolume !== undefined ? GameState.sfxVolume : 1.0) * 5);
        if (sfxVol < 0) sfxVol = 0;
        if (sfxVol > 10) sfxVol = 10;
        this.sfxAdj = this.createSlider(-165, "সাউন্ড ইফেক্ট:", 0, 10, 1, sfxVol, (v) => v, (val) => {
            GameState.sfxVolume = val / 5;
            localStorage.setItem('settings_sfxVol', GameState.sfxVolume);
        });
        
        let qDelayLevel = GameState.qDelayLevel !== undefined ? GameState.qDelayLevel : 15;
        this.qDelayAdj = this.createSlider(-70, "মধ্যবর্তী বিলম্ব: (Inter-Question Delay):", 5, 40, 5, qDelayLevel, (v) => (v / 10).toFixed(1) + "s", (val) => {
            GameState.qDelayLevel = val;
            localStorage.setItem('settings_qDelay', GameState.qDelayLevel);
        });

        let uiSize = parseInt(localStorage.getItem('settings_uiScaleLevel'));
        if (isNaN(uiSize)) uiSize = 0;
        this.uiAdj = this.createStepper(20, "ডিসপ্লে জুম: (UI Zoom)", -5, 5, uiSize, (val) => {
            localStorage.setItem('settings_uiScaleLevel', val);
            this.updateLiveGameUI();
        });

        // Segmented Tab for Quick Panel
        this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';
        const qpOptions = ['right', 'hidden', 'left'];
        const qpLabels = ['ডান', 'বন্ধ', 'বাম'];
        
        const qpLabel = this.add.text(cx, cy + 95, "কুইক প্যানেল পজিশন:", { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#e2e8f0' }).setOrigin(0.5);
        
        const segW = 480;
        const segH = 50;
        const segX = cx;
        const segY = cy + 145;

        const segBg = this.add.graphics();
        segBg.fillStyle(0x0f172a, 1);
        segBg.fillRoundedRect(segX - segW/2, segY - segH/2, segW, segH, segH/2);
        segBg.lineStyle(2, 0x334155, 1);
        segBg.strokeRoundedRect(segX - segW/2, segY - segH/2, segW, segH, segH/2);

        const highlight = this.add.graphics();
        const tabW = segW / 3;
        
        const drawHighlight = (idx) => {
            highlight.clear();
            highlight.fillStyle(0x0ea5e9, 1);
            highlight.fillRoundedRect(segX - segW/2 + (idx * tabW) + 4, segY - segH/2 + 4, tabW - 8, segH - 8, (segH-8)/2);
        };
        
        let currentIdx = qpOptions.indexOf(this.quickPanelState);
        if (currentIdx === -1) currentIdx = 0;
        drawHighlight(currentIdx);
        
        this.container.add([qpLabel, segBg, highlight]);

        qpOptions.forEach((opt, idx) => {
            const txt = this.add.text(segX - segW/2 + (idx * tabW) + tabW/2, segY, qpLabels[idx], {
                fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
            
            const hitArea = this.add.rectangle(segX - segW/2 + (idx * tabW) + tabW/2, segY, tabW, segH, 0, 0).setInteractive({useHandCursor: true});
            
            hitArea.on('pointerdown', () => {
                this.playSound('sfx_tick');
                this.quickPanelState = opt;
                localStorage.setItem('settings_quickPanel', this.quickPanelState);
                drawHighlight(idx);
                this.updateLiveGameUI();
            });
            this.container.add([txt, hitArea]);
        });

        // --- ACTION BUTTONS (Reset, Clear, Update) ---
        const createActionBtn = (yOffset, textStr, bgHex, borderHex, textHex, callback) => {
            const btnContainer = this.add.container(cx, cy + yOffset);
            
            const btnBg = this.add.graphics();
            
            const drawBtn = (isHover) => {
                btnBg.clear();
                btnBg.fillStyle(bgHex, isHover ? 1 : 0.85);
                btnBg.fillRoundedRect(-240, -27.5, 480, 55, 15);
                btnBg.lineStyle(2, isHover ? '#ffffff' : borderHex, 1);
                btnBg.strokeRoundedRect(-240, -27.5, 480, 55, 15);
            };
            drawBtn(false);

            const btnTxt = this.add.text(0, 0, textStr, { 
                fontSize: '24px', fontFamily: "'Anek Bangla'", color: textHex, fontStyle: 'bold', padding: { y: 3 }
            }).setOrigin(0.5);

            const hitArea = this.add.rectangle(0, 0, 480, 55).setInteractive({ useHandCursor: true });
            
            hitArea.on('pointerover', () => drawBtn(true));
            hitArea.on('pointerout', () => drawBtn(false));
            hitArea.on('pointerdown', () => {
                this.tweens.add({ targets: btnContainer, scale: 0.95, duration: 100, yoyo: true });
                callback();
            });

            btnContainer.add([btnBg, btnTxt, hitArea]);
            this.container.add(btnContainer);
            
            return { container: btnContainer, txt: btnTxt };
        };

        const resetBtn = createActionBtn(230, "🔄 ডিফল্ট সেটিংসে ফিরুন", 0x004422, 0x00ff88, '#ececec', () => {
            this.playSound('sfx_powerup');
            this.musicAdj.setValue(5);
            this.sfxAdj.setValue(5);
            this.qDelayAdj.setValue(15); 
            this.uiAdj.setValue(0); 
            
            this.quickPanelState = 'right';
            localStorage.setItem('settings_quickPanel', 'right');
            drawHighlight(0);

            this.updateLiveGameUI();
            this.showNotification("সেটিংস রিসেট করা হয়েছে!", "success");
        });

        const clearBtn = createActionBtn(305, "🗑️ হিস্ট্রি মুছুন", 0x440000, 0xff4444, '#ececec', () => {
            this.playSound('sfx_warning');
            this.showClearHistoryWarning();
        });

        const updateBtn = createActionBtn(380, "☁️ আপডেট চেক করুন", 0x0f172a, 0x38bdf8, '#ececec', () => {
            if (this.isCheckingUpdate) return;
            this.playSound('sfx_click');
            this.checkForUpdates(cx, cy);
        });

        // Save reference to the text object to alter its string dynamically
        this.updateBtnTxt = updateBtn.txt; 
        
        this.container.setAlpha(0);
        this.tweens.add({ targets: this.container, alpha: 1, duration: 200 });
    }

    // --- Update Check Logic ---
    checkForUpdates(cx, cy) {
        this.isCheckingUpdate = true;
        const originalText = "☁️ আপডেট চেক করুন";
        this.updateBtnTxt.setText("☁️ চেক করা হচ্ছে...");
        
        let dotCount = 0;
        const loadTimer = this.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => {
                dotCount = (dotCount + 1) % 4;
                this.updateBtnTxt.setText("☁️ চেক করা হচ্ছে" + ".".repeat(dotCount));
            }
        });

        const CURRENT_VERSION = "1.0.0";
        const versionUrl = `https://raw.githubusercontent.com/DiptooD/GameMCQ/main/version.json?t=${new Date().getTime()}`;

        this.time.delayedCall(1500, () => {
            fetch(versionUrl)
                .then(response => response.json())
                .then(data => {
                    loadTimer.remove();
                    this.updateBtnTxt.setText(originalText);
                    this.isCheckingUpdate = false;
                    
                    if (data.latest_version && data.latest_version !== CURRENT_VERSION) {
                        this.showUpdatePopup(cx, cy, data.latest_version, data.release_notes);
                    } else {
                        this.showNotification("আপনার গেমটি সর্বশেষ ভার্সনে আপডেট করা আছে।", "success");
                    }
                })
                .catch(err => {
                    console.log("Update check failed", err);
                    loadTimer.remove();
                    this.updateBtnTxt.setText(originalText);
                    this.isCheckingUpdate = false;
                    this.showNotification("আপডেট চেক করা সম্ভব হয়নি! ইন্টারনেট কানেকশন চেক করুন।", "error");
                });
        });
    }

    // --- Show Update UI Popup (Upgraded Style) ---
    showUpdatePopup(cx, cy, newVersion, notes) {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const panelW = 540;
        const panelH = 400;

        const overlay = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.8).setInteractive().setDepth(10001);
        const container = this.add.container(cx, cy).setDepth(10002);

        overlay.on('pointerdown', () => {
            this.playSound('sfx_back');
            overlay.destroy();
            container.destroy();
        });

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 0.98);
        bg.fillRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 22);
        bg.lineStyle(2, 0x334155, 1);
        bg.strokeRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 22);
        bg.setInteractive(new Phaser.Geom.Rectangle(-panelW/2, -panelH/2, panelW, panelH), Phaser.Geom.Rectangle.Contains);

        const title = this.add.text(0, -panelH/2 + 45, "নতুন আপডেট এসেছে!", {
            fontSize: "36px", fontFamily: "'Anek Bangla'", color: "#38bdf8", padding: { y: 4 }, fontStyle: "bold",
            shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);
        
        const headerDiv = this.add.rectangle(0, -panelH/2 + 90, panelW - 40, 2, 0x334155, 1);

        const closeX = panelW/2 - 45;
        const closeY = -panelH/2 + 45;
        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0xef4444, 0.15);
        closeBtnBg.fillRoundedRect(closeX - 30, closeY - 30, 60, 60, 16);
        closeBtnBg.lineStyle(2, 0xef4444, 0.8);
        closeBtnBg.strokeRoundedRect(closeX - 30, closeY - 30, 60, 60, 16);
        
        const closeIcon = this.add.text(closeX, closeY, "✖", { fontSize: "34px", color: "#f87171", fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(closeX, closeY, 80, 80, 0, 0).setInteractive({useHandCursor:true});
        
        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            overlay.destroy();
            container.destroy();
        });
        closeHit.on('pointerover', () => closeIcon.setScale(1.1));
        closeHit.on('pointerout', () => closeIcon.setScale(1));

        const desc = this.add.text(0, 0, `ভার্সন: ${newVersion}\n\n${notes || "নতুন ফিচার উপভোগ করুন।"}\nগেমটি আপডেট করতে নিচে ক্লিক করুন।`, {
            fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#e2e8f0", align: "center", lineSpacing: 8
        }).setOrigin(0.5);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x0ea5e9, 1);
        btnBg.fillRoundedRect(-140, 100, 280, 60, 30);
        const downloadBtnTxt = this.add.text(0, 130, "ডাউনলোড করুন", { fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        const downloadHit = this.add.rectangle(0, 130, 280, 60, 0x000000, 0).setInteractive({ useHandCursor: true });

        downloadHit.on('pointerdown', () => {
            this.playSound('sfx_click');
            window.open("https://sites.google.com/view/gamemcq", "_system");
        });

        container.add([bg, title, headerDiv, closeBtnBg, closeIcon, closeHit, desc, btnBg, downloadBtnTxt, downloadHit]);
        
        container.setScale(0.8);
        container.setAlpha(0);
        this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 250, ease: 'Back.out' });
    }

    // --- Show Clear History Warning Popup (Upgraded Style) ---
    showClearHistoryWarning() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const panelW = 520;
        const panelH = 340;
        
        const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.8).setInteractive().setDepth(2000);
        const warningBox = this.add.container(cx, cy).setDepth(2001);
        
        const cleanup = () => {
            overlay.destroy();
            warningBox.destroy();
        };

        overlay.on('pointerdown', () => {
            this.playSound('sfx_back');
            cleanup();
        });
        
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 0.98);
        bg.fillRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 22);
        bg.lineStyle(2, 0x334155, 1);
        bg.strokeRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 22);
        bg.setInteractive(new Phaser.Geom.Rectangle(-panelW/2, -panelH/2, panelW, panelH), Phaser.Geom.Rectangle.Contains);

        const title = this.add.text(0, -panelH/2 + 45, "সতর্কতা!", { 
            fontSize: "42px", fontFamily: "'Anek Bangla'", color: "#f87171", padding: { y: 4 }, fontStyle: "bold",
            shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);
        
        const headerDiv = this.add.rectangle(0, -panelH/2 + 90, panelW - 40, 2, 0x334155, 1);

        const closeX = panelW/2 - 45;
        const closeY = -panelH/2 + 45;
        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0xef4444, 0.15);
        closeBtnBg.fillRoundedRect(closeX - 30, closeY - 30, 60, 60, 16);
        closeBtnBg.lineStyle(2, 0xef4444, 0.8);
        closeBtnBg.strokeRoundedRect(closeX - 30, closeY - 30, 60, 60, 16);
        
        const closeIcon = this.add.text(closeX, closeY, "✖", { fontSize: "34px", color: "#f87171", fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(closeX, closeY, 80, 80, 0, 0).setInteractive({useHandCursor:true});
        
        closeHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            cleanup();
        });
        closeHit.on('pointerover', () => closeIcon.setScale(1.1));
        closeHit.on('pointerout', () => closeIcon.setScale(1));

        const alertTxt = this.add.text(0, -10, "আপনি কি নিশ্চিত যে সমস্ত\nপ্রশ্নের হিস্ট্রি মুছে ফেলতে চান?", { 
            fontSize: '26px', fontFamily: "'Anek Bangla'", color: '#e2e8f0', align: 'center', lineSpacing: 10 
        }).setOrigin(0.5);

        // --- Buttons ---
        const noBg = this.add.graphics();
        noBg.fillStyle(0x334155, 1);
        noBg.fillRoundedRect(-200, 70, 160, 60, 20);
        const noTxt = this.add.text(-120, 100, "না", { fontSize: '28px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const noHit = this.add.rectangle(-120, 100, 160, 60).setInteractive({ useHandCursor: true });

        noHit.on('pointerdown', () => {
            this.playSound('sfx_back');
            cleanup();
        });

        const yesBg = this.add.graphics();
        yesBg.fillStyle(0xef4444, 1);
        yesBg.fillRoundedRect(40, 70, 160, 60, 20);
        const yesTxt = this.add.text(120, 100, "হ্যাঁ", { fontSize: '28px', fontFamily: "'Anek Bangla'", color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const yesHit = this.add.rectangle(120, 100, 160, 60).setInteractive({ useHandCursor: true });

        yesHit.on('pointerdown', () => {
            this.playSound('sfx_explode');
            localStorage.removeItem('seenQuestions');
            GameState.matchHistory = []; 
            if (window.saveGame) window.saveGame();

            cleanup();
            this.showNotification("হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে!", "success");
        });

        warningBox.add([bg, title, headerDiv, closeBtnBg, closeIcon, closeHit, alertTxt, noBg, noTxt, noHit, yesBg, yesTxt, yesHit]);
        
        warningBox.setScale(0.8);
        warningBox.setAlpha(0);
        this.tweens.add({ targets: warningBox, scale: 1, alpha: 1, duration: 250, ease: 'Back.out' });
    }

    // --- Updated Notification UI (Box Resized, Padding Added, Word-wrapped to Prevent Bleeding) ---
    showNotification(msg, type = 'info') {
        if (this.activeNotification) {
            this.activeNotification.destroy();
        }

        const cx = this.cameras.main.width / 2;
        const notificationContainer = this.add.container(cx, -120).setDepth(10000);
        this.activeNotification = notificationContainer;

        let colors = {
            success: { bg: 0x004422, border: 0x00ff88, glow: 0x00ff88, icon: "✅" },
            error: { bg: 0x440000, border: 0xff4444, glow: 0xff4444, icon: "❌" },
            info: { bg: 0x002244, border: 0x00aaff, glow: 0x00aaff, icon: "ℹ️" }
        };
        let style = colors[type] || colors.info;

        // Expanded bounds from 480x90 to 540x100 to stop content overflow
        const bg = this.add.graphics();
        bg.fillGradientStyle(style.bg, 0x000000, 0x000000, 0x000000, 0.95);
        bg.fillRoundedRect(-270, -50, 540, 100, 22);
        bg.lineStyle(3, style.border, 1);
        bg.strokeRoundedRect(-270, -50, 540, 100, 22);

        const glow = this.add.graphics();
        glow.fillStyle(style.glow, 0.15);
        glow.fillRoundedRect(-275, -55, 550, 110, 26);
        
        const icon = this.add.text(-220, 0, style.icon, { fontSize: '40px' }).setOrigin(0.5);
        
        // Added wordWrap width constraint of 410px to fit inside the new box bounds perfectly
        const text = this.add.text(-170, 0, msg, {
            fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#ffffff', 
            align: 'left', fontStyle: 'bold', lineSpacing: 5,
            wordWrap: { width: 410 }
        }).setOrigin(0, 0.5);

        notificationContainer.add([glow, bg, icon, text]);

        if (type === 'success' && this.cache.audio.exists('sfx_powerup')) {
            this.playSound('sfx_powerup', 0.4); 
        } else if (type === 'error' && this.cache.audio.exists('sfx_error')) {
            this.playSound('sfx_error', 0.5);
        } else {
            this.playSound('sfx_tick', 0.5);
        }
        
        this.tweens.add({ 
            targets: notificationContainer, 
            y: 90, 
            alpha: 1, 
            duration: 500, 
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ 
                    targets: notificationContainer, 
                    y: -120,
                    alpha: 0, 
                    delay: 3500, 
                    duration: 400, 
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                        if (this.activeNotification === notificationContainer) {
                            this.activeNotification = null;
                        }
                        notificationContainer.destroy();
                    }
                });
            }
        });
    }

    createSlider(yOffset, labelText, min, max, stepSize, currentVal, formatFn, callback) {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        
        const label = this.add.text(cx - 240, cy + yOffset - 25, labelText, { fontSize: '20px', fontFamily: "'Anek Bangla'", color: '#aaccff' }).setOrigin(0, 0.5);
        const valText = this.add.text(cx + 240, cy + yOffset - 25, formatFn(currentVal), { fontSize: '26px', fontFamily: "'Anek Bangla'", color: '#00ffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
        
        const sliderW = 480;
        const sliderH = 14;
        const sliderX = cx - sliderW/2;
        const sliderY = cy + yOffset + 5;

        const trackBg = this.add.graphics();
        trackBg.fillStyle(0x0f172a, 1);
        trackBg.fillRoundedRect(sliderX, sliderY - sliderH/2, sliderW, sliderH, sliderH/2);
        trackBg.lineStyle(2, 0x334155, 1);
        trackBg.strokeRoundedRect(sliderX, sliderY - sliderH/2, sliderW, sliderH, sliderH/2);

        const steps = (max - min) / stepSize;
        const stepW = sliderW / steps;
        
        trackBg.lineStyle(2, 0x334155, 0.8);
        for(let i = 0; i <= steps; i++) {
            trackBg.beginPath();
            trackBg.moveTo(sliderX + i*stepW, sliderY - sliderH/2 - 4);
            trackBg.lineTo(sliderX + i*stepW, sliderY + sliderH/2 + 4);
            trackBg.strokePath();
        }

        const fill = this.add.graphics();
        let val = currentVal;

        const thumb = this.add.circle(0, sliderY, 20, 0xffffff);
        thumb.setStrokeStyle(4, 0x0ea5e9);
        const glow = this.add.circle(0, sliderY, 30, 0x38bdf8, 0.3);

        const hitArea = this.add.rectangle(sliderX + sliderW/2, sliderY, sliderW + 80, 70, 0, 0).setInteractive({useHandCursor: true});
        
        this.container.add([label, valText, hitArea, trackBg, fill, glow, thumb]);

        const updateVisuals = (xPos, isFinalSnap) => {
            let clampedX = Phaser.Math.Clamp(xPos, sliderX, sliderX + sliderW);
            let pct = (clampedX - sliderX) / sliderW;
            let exactVal = min + pct * (max - min);
            
            let nearestStep = min + Math.round((exactVal - min) / stepSize) * stepSize;
            
            let renderX = isFinalSnap ? (sliderX + ((nearestStep - min)/(max - min))*sliderW) : clampedX;
            
            thumb.x = renderX;
            glow.x = renderX;
            
            fill.clear();
            fill.fillStyle(0x38bdf8, 1);
            let fW = Math.max(sliderH, renderX - sliderX);
            fill.fillRoundedRect(sliderX, sliderY - sliderH/2, fW, sliderH, sliderH/2);

            valText.setText(formatFn(nearestStep));

            if (val !== nearestStep) {
                val = nearestStep;
                callback(val);
                if (!isFinalSnap) this.playSound('sfx_tick', 0.1); 
            }
        };

        updateVisuals(sliderX + ((val - min)/(max - min))*sliderW, true);

        let isDragging = false;

        hitArea.on('pointerdown', (pointer) => {
            isDragging = true;
            glow.setScale(1.3);
            updateVisuals(pointer.x, false);
        });

        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                updateVisuals(pointer.x, false);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (isDragging) {
                isDragging = false;
                glow.setScale(1);
                updateVisuals(pointer.x, true);
                this.playSound('sfx_tick', 0.2);
            }
        });

        return {
            setValue: (newVal) => { 
                val = newVal; 
                updateVisuals(sliderX + ((val - min)/(max - min))*sliderW, true);
            }
        };
    }

    createStepper(yOffset, labelText, min, max, currentVal, callback) {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        
        const label = this.add.text(cx - 240, cy + yOffset, labelText, { fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#e2e8f0' }).setOrigin(0, 0.5);
        
        let val = currentVal;
        
        const btnW = 70;
        const btnH = 50;

        const valText = this.add.text(cx + 120, cy + yOffset, val === 0 ? "ডিফল্ট" : (val > 0 ? "+" + val : val), { 
            fontSize: '26px', fontFamily: "'Anek Bangla'", color: '#38bdf8', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const minusBg = this.add.graphics();
        const drawMinus = (hover) => {
            minusBg.clear();
            minusBg.fillStyle(0x0f172a, hover ? 1 : 0.8);
            minusBg.fillRoundedRect(cx + 40 - btnW/2, cy + yOffset - btnH/2, btnW, btnH, 12);
            minusBg.lineStyle(2, hover ? 0x0ea5e9 : 0x334155, 1);
            minusBg.strokeRoundedRect(cx + 40 - btnW/2, cy + yOffset - btnH/2, btnW, btnH, 12);
        };
        drawMinus(false);
        const minusTxt = this.add.text(cx + 40, cy + yOffset, "-", { fontSize: '36px', color: '#ffffff', fontStyle: 'bold'}).setOrigin(0.5, 0.55);
        const minusHit = this.add.rectangle(cx + 40, cy + yOffset, btnW, btnH, 0, 0).setInteractive({useHandCursor: true});

        const plusBg = this.add.graphics();
        const drawPlus = (hover) => {
            plusBg.clear();
            plusBg.fillStyle(0x0f172a, hover ? 1 : 0.8);
            plusBg.fillRoundedRect(cx + 200 - btnW/2, cy + yOffset - btnH/2, btnW, btnH, 12);
            plusBg.lineStyle(2, hover ? 0x0ea5e9 : 0x334155, 1);
            plusBg.strokeRoundedRect(cx + 200 - btnW/2, cy + yOffset - btnH/2, btnW, btnH, 12);
        };
        drawPlus(false);
        const plusTxt = this.add.text(cx + 200, cy + yOffset, "+", { fontSize: '32px', color: '#ffffff', fontStyle: 'bold'}).setOrigin(0.5, 0.55);
        const plusHit = this.add.rectangle(cx + 200, cy + yOffset, btnW, btnH, 0, 0).setInteractive({useHandCursor: true});

        const updateDisplay = () => {
            valText.setText(val === 0 ? "ডিফল্ট" : (val > 0 ? "+" + val : val));
            callback(val);
        };

        minusHit.on('pointerover', () => drawMinus(true));
        minusHit.on('pointerout', () => drawMinus(false));
        minusHit.on('pointerdown', () => {
            if (val > min) { val--; this.playSound('sfx_tick'); updateDisplay(); }
            this.tweens.add({targets: minusTxt, scale: 0.8, duration: 50, yoyo: true});
        });

        plusHit.on('pointerover', () => drawPlus(true));
        plusHit.on('pointerout', () => drawPlus(false));
        plusHit.on('pointerdown', () => {
            if (val < max) { val++; this.playSound('sfx_tick'); updateDisplay(); }
            this.tweens.add({targets: plusTxt, scale: 0.8, duration: 50, yoyo: true});
        });

        this.container.add([label, minusBg, minusTxt, minusHit, valText, plusBg, plusTxt, plusHit]);

        return {
            setValue: (newVal) => { val = newVal; updateDisplay(); }
        };
    }

    updateLiveGameUI() {
        let menuMusic = this.sound.get('menubgm');
        if (menuMusic) menuMusic.setVolume(GameState.musicVolume);
        
        let bgMusic = this.sound.get('bg_music');
        if (bgMusic) bgMusic.setVolume(GameState.musicVolume);

        const qScene = this.scene.get('QuestionScene');
        if (qScene && (qScene.scene.isActive() || qScene.scene.isPaused())) {
            let uiScaleLevel = parseInt(localStorage.getItem('settings_uiScaleLevel'));
            if (isNaN(uiScaleLevel)) uiScaleLevel = 0;
            let uiScale = 1.0 + (uiScaleLevel * 0.05); 
            
            if (qScene.qContainer) {
                qScene.qContainer.setScale(uiScale);
                qScene.qContainer.setX(360 * (1 - uiScale));
                qScene.qContainer.setY(10 * (1 - uiScale));
            }

            let qpState = localStorage.getItem('settings_quickPanel') || 'right';
            qScene.quickPanelState = qpState;
            qScene.quickPanelEnabled = (qpState !== 'hidden');

            if (qScene.quickAnsContainer) {
                if (!qScene.quickPanelEnabled) {
                    qScene.quickAnsContainer.setVisible(false);
                } else {
                    qScene.quickAnsContainer.setVisible(true);
                    qScene.quickAnsContainer.setScale(uiScale);
                    if (qpState === 'left') {
                        qScene.quickAnsContainer.setX(15 * uiScale);
                    } else {
                        qScene.quickAnsContainer.setX(720 - (102 * uiScale));
                    }
                    qScene.quickAnsContainer.setY(760 - (460 * (uiScale - 1) / 2));
                }
            }
        }
    }

    playSound(key, baseVolume = 1.0) {
        if (this.cache.audio.exists(key)) {
            const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
            this.sound.play(key, { volume: finalVolume });
        }
    }
}