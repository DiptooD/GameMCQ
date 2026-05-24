class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  init() {
      this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';
  }

  playSound(key, baseVolume = 1.0) {
    if (this.cache.audio.exists(key)) {
        const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
        this.sound.play(key, { volume: finalVolume });
    }
  }

  create() {
    if (typeof GameSFX !== 'undefined') {
        GameSFX.init(this);
    }

    if (this.sound.get('bg_music') && this.sound.get('bg_music').isPlaying) {
        this.sound.get('bg_music').pause();
    }

    this.cameras.main.setScroll(0, 0);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    this.add.rectangle(0, 0, w, h, 0x000000, 0.75).setOrigin(0, 0).setInteractive();

    const panelW = 560; 
    const panelH = 760; 
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    const glass = this.add.graphics();
    
    glass.fillStyle(0x000c22, 0.85); 
    glass.fillRoundedRect(panelX, panelY, panelW, panelH, 24); 
    glass.lineStyle(3, 0x0066aa, 0.8); 
    glass.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    this.add.text(cx, panelY + 70, "বিরতি", {
      fontSize: "64px", 
      fontFamily: "'Anek Bangla'", 
      color: "#00e1ff", 
      fontStyle: "bold", 
      stroke: "#000000", 
      strokeThickness: 8, 
      shadow: { offsetX: 4, offsetY: 4, color: "#0044aa", blur: 12, stroke: true, fill: true }
    }).setOrigin(0.5);

    // --- DAILY MISSIONS UI ---
    const missionBg = this.add.graphics();
    missionBg.fillStyle(0x000c22, 0.95);
    missionBg.fillRoundedRect(cx - 260, panelY + 120, 520, 370, 20);
    missionBg.lineStyle(3, 0x0088ff, 0.8);
    missionBg.strokeRoundedRect(cx - 260, panelY + 120, 520, 370, 20);

    this.add.text(cx, panelY + 157, "ডেইলি মিশন (Daily Missions)", {
        fontSize: "28px", color: "#00e1ff", fontFamily: "'Anek Bangla'", fontStyle: "bold", padding: { y: 3 },
        shadow: { offsetX: 2, offsetY: 2, color: "#0044aa", blur: 4, stroke: true, fill: true }
    }).setOrigin(0.5);

    this.add.rectangle(cx, panelY + 183, 400, 2, 0x0088ff, 0.4);

    let startY = panelY + 230;
    if (GameState.dailyMissions) {
        GameState.dailyMissions.forEach((m, i) => {
            const isDone = m.progress >= m.target;
            const yPos = startY + (i * 92.5);

            // Card Background
            const cardBg = this.add.graphics();
            cardBg.fillStyle(isDone ? 0x002211 : 0x001122, 0.9);
            cardBg.fillRoundedRect(cx - 240, yPos - 40, 480, 80, 12);
            cardBg.lineStyle(isDone ? 2 : 1, isDone ? 0x00ff00 : 0x004488, 1);
            cardBg.strokeRoundedRect(cx - 240, yPos - 40, 480, 80, 12);

            if (isDone) {
                const glow = this.add.graphics();
                glow.fillStyle(0x00ff00, 0.1);
                glow.fillRoundedRect(cx - 240, yPos - 40, 480, 80, 12);
            }

            // Checkbox / Status Icon
            const iconBg = this.add.circle(cx - 200, yPos, 20, isDone ? 0x004411 : 0x001133).setStrokeStyle(2, isDone ? 0x00ff00 : 0x0055aa);
            const iconStr = isDone ? "✔" : "⏳";
            this.add.text(cx - 200, yPos, iconStr, { fontSize: isDone ? "22px" : "18px", color: isDone ? "#00ff00" : "#00aaff" }).setOrigin(0.5);

            // Description
            let descText = m.desc || m.type;
            if (m.type === "kill_enemies") descText = "শত্রু ধ্বংস করুন";
            else if (m.type === "collect_debris") descText = "ভাঙ্গারী সংগ্রহ করুন";
            else if (m.type === "answer_correct") descText = "সঠিক উত্তর দিন";

            this.add.text(cx - 165, yPos - 18, descText, {
                fontSize: "22px", fontFamily: "'Anek Bangla'", color: isDone ? "#aaffaa" : "#ffffff", fontStyle: 'bold', padding: { y: 3 }
            }).setOrigin(0, 0.5);

            // Progress Bar
            const barWidth = 200;
            const barHeight = 8;
            const barX = cx - 165;
            const barY = yPos + 12;

            this.add.rectangle(barX + barWidth/2, barY, barWidth, barHeight, 0x000000, 0.5).setStrokeStyle(1, 0x555555);
            const pct = Math.min(m.progress / m.target, 1);
            if (pct > 0) {
                this.add.rectangle(barX + (barWidth * pct)/2, barY, barWidth * pct, barHeight, isDone ? 0x00ff00 : 0x00aaff);
            }

            // Progress Text
            this.add.text(barX + barWidth + 10, barY, `${m.progress}/${m.target}`, {
                fontSize: "16px", fontFamily: "Arial", color: isDone ? "#00ff00" : "#aaaaaa", fontStyle: "bold"
            }).setOrigin(0, 0.5);

            // Reward Info
            let rewStr = `+${m.rewardAmt}`;
            let rewColor = "#ffffff";
            let tex = "";
            let texScale = 1.0;

            if (m.rewardType === "debris") { 
                rewColor = "#aaccff"; 
                tex = "ui_debris_icon";
                texScale = 0.6;
            } else if (m.rewardType === "keys") {
                rewColor = "#ffd700";
                tex = "ui_key";
                texScale = 0.6;
            } else if (m.rewardType === "xp") {
                rewColor = "#ffbb00";
                tex = ""; 
                rewStr = `+${m.rewardAmt} XP`;
            } else if (m.rewardType === "skips") { 
                rewColor = "#00ffcc"; 
                tex = "ui_bolt";
                texScale = 0.6;
            } else { 
                rewColor = "#ff00ff"; 
                if (m.rewardType.includes("fire")) tex = "icon_booster_fire";
                else if (m.rewardType.includes("speed")) tex = "icon_booster_speed";
                else tex = "icon_booster_battery";
                texScale = 0.6;
            }

            const rewText = this.add.text(cx + 220, yPos - 10, rewStr, {
                fontSize: "22px", fontFamily: "'Anek Bangla'", color: rewColor, fontStyle: "bold",
                shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 2, stroke: true, fill: true }
            }).setOrigin(1, 0.5);

            if (tex) {
                this.add.image(cx + 220 - rewText.width - 8, yPos - 10, tex).setScale(texScale).setOrigin(1, 0.5);
            }

            if (isDone) {
                this.add.text(cx + 220, yPos + 16, "সম্পন্ন!", {
                    fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#00ff00", fontStyle: "bold"
                }).setOrigin(1, 0.5);
            } else {
                this.add.text(cx + 220, yPos + 16, "পুরস্কার", {
                    fontSize: "16px", fontFamily: "'Anek Bangla'", color: "#888888"
                }).setOrigin(1, 0.5);
            }
        });
    }

    // --- MAIN BUTTONS ---
    this.createModernButton(cx, panelY + 563, "খেলায় ফিরুন", true, () => {
        this.resumeGame();
    });

    this.createModernButton(cx, panelY + 675, "খেলা শেষ করুন", false, () => {
        this.scene.stop("GameScene");
        this.scene.stop("QuestionScene");
        this.scene.start("DeathScene"); 
    });

    // --- SETTINGS ICON ---
    const settingsBg = this.add.circle(60, 60, 28, 0x001122, 0.8).setStrokeStyle(3, 0x0066aa).setDepth(25);
    const settingsIcon = this.add.text(60, 60, "⚙️", { fontSize: '30px' }).setOrigin(0.5).setDepth(25);
    const settingsHitArea = this.add.circle(60, 60, 35).setInteractive({ useHandCursor: true }).setDepth(25);

    settingsHitArea.on('pointerdown', () => {
        this.playSound('sfx_click', 0.8);
        this.tweens.add({ targets: [settingsBg, settingsIcon], scale: 0.9, duration: 50, yoyo: true });
        
        this.scene.launch("SettingsScene", { returnScene: "PauseScene" });
        this.scene.bringToTop("SettingsScene");
    });

    // --- CLOSE / QUIT ICON ---
    const closeBg = this.add.circle(w - 60, 60, 28, 0x001122, 0.8).setStrokeStyle(3, 0xaa0000).setDepth(25);
    const closeIcon = this.add.text(w - 60, 60, "❌", { fontSize: '24px' }).setOrigin(0.5).setDepth(25);
    const closeHitArea = this.add.circle(w - 60, 60, 35).setInteractive({ useHandCursor: true }).setDepth(25);

    closeHitArea.on('pointerdown', () => {
        this.playSound('sfx_click', 0.8);
        this.tweens.add({ 
            targets: [closeBg, closeIcon], 
            scale: 0.9, 
            duration: 50, 
            yoyo: true,
            onComplete: () => this.resumeGame() 
        });
    });
  }

  createModernButton(x, y, text, isPrimary, callback) {
      const container = this.add.container(x, y).setDepth(20);
      const bg = this.add.graphics();
      
      const btnW = 440; 
      const btnH = 86;  
      const radius = btnH / 2;
      
      const draw = (scale, hover) => {
          bg.clear();
          if (isPrimary) {
              bg.fillGradientStyle(
                  hover ? 0x002266 : 0x001133, hover ? 0x002266 : 0x001133, 
                  hover ? 0x0088ff : 0x004488, hover ? 0x0088ff : 0x004488, 1
              );
              bg.lineStyle(hover ? 5 : 4, hover ? 0xffffff : 0x00ffff, 0.8); 
          } else {
              bg.fillStyle(hover ? 0x081830 : 0x051025, 0.9);
              bg.lineStyle(3, hover ? 0x0088cc : 0x0066aa, 0.8); 
          }
          bg.fillRoundedRect((-btnW / 2) * scale, (-btnH / 2) * scale, btnW * scale, btnH * scale, radius);
          bg.strokeRoundedRect((-btnW / 2) * scale, (-btnH / 2) * scale, btnW * scale, btnH * scale, radius);
      };
      
      draw(1, false);

      const txt = this.add.text(0, 0, text, {
          fontSize: "38px", 
          fontFamily: "'Anek Bangla'", 
          color: isPrimary ? "#ffffff" : "#b3d4ff", 
          fontStyle: "bold",
          stroke: isPrimary ? "#003366" : "#000000",
          strokeThickness: 3
      }).setOrigin(0.5);

      const hit = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
      container.add([bg, txt, hit]);

      hit.on('pointerover', () => { 
          draw(1, true); 
          if (!isPrimary) txt.setColor("#ffffff");
      });
      hit.on('pointerout', () => { 
          draw(1, false); 
          if (!isPrimary) txt.setColor("#b3d4ff");
      });

      hit.on('pointerdown', () => {
          this.playSound(isPrimary ? 'sfx_click' : 'sfx_back', 0.8);

          this.tweens.add({ 
              targets: container, 
              scale: 0.9, 
              duration: 50, 
              yoyo: true, 
              onComplete: callback 
          });
      });
  }

  resumeGame() {
    let bgMusic = this.sound.get('bg_music');
    if (bgMusic) {
        bgMusic.resume();
        bgMusic.setVolume(window.GameState.musicVolume !== undefined ? window.GameState.musicVolume : 0.5);
    }

      this.scene.stop(); 
      this.scene.resume("GameScene"); 
      this.scene.resume("QuestionScene"); 

      const gameScene = this.scene.get("GameScene");
      if (gameScene) {
          gameScene.startCountdown();
      }
  }
}