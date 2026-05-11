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
    const panelH = 760; // Extra height to perfectly fit cards
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    const glass = this.add.graphics();
    
    glass.fillStyle(0x000c22, 0.85); 
    glass.fillRoundedRect(panelX, panelY, panelW, panelH, 24); 
    glass.lineStyle(3, 0x0066aa, 0.8); 
    glass.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    this.add.text(cx, panelY + 80, "বিরতি", {
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
    missionBg.fillStyle(0x000c22, 0.9);
    missionBg.fillRoundedRect(cx - 250, panelY + 130, 500, 340, 16);
    missionBg.lineStyle(2, 0x005588, 1);
    missionBg.strokeRoundedRect(cx - 250, panelY + 130, 500, 340, 16);

    this.add.text(cx, panelY + 165, "ডেইলি মিশন (Daily Missions)", {
        fontSize: "26px", color: "#00ffff", fontFamily: "'Anek Bangla'", fontStyle: "bold"
    }).setOrigin(0.5);

    let startY = panelY + 230;
    if (GameState.dailyMissions) {
        GameState.dailyMissions.forEach((m, i) => {
            const isDone = m.progress >= m.target;
            const yPos = startY + (i * 75);

            // Mission card BG
            const cardBg = this.add.graphics();
            cardBg.fillStyle(isDone ? 0x003311 : 0x001122, 0.8);
            cardBg.fillRoundedRect(cx - 230, yPos - 30, 460, 60, 10);
            cardBg.lineStyle(isDone ? 2 : 1, isDone ? 0x00ff00 : 0x004488, 0.8);
            cardBg.strokeRoundedRect(cx - 230, yPos - 30, 460, 60, 10);

            // Checkbox / Status Icon
            const iconStr = isDone ? "✅" : "⏳";
            this.add.text(cx - 200, yPos, iconStr, { fontSize: "20px" }).setOrigin(0.5);

            // Mission Description
            const descText = m.desc || m.type;
            this.add.text(cx - 170, yPos - 12, descText, {
                fontSize: "20px", fontFamily: "'Anek Bangla'", color: isDone ? "#aaffaa" : "#ffffff", fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            // Progress Text
            const progTxt = `${m.progress} / ${m.target}`;
            this.add.text(cx - 170, yPos + 14, progTxt, {
                fontSize: "16px", fontFamily: "Arial", color: isDone ? "#00ff00" : "#ffaa00"
            }).setOrigin(0, 0.5);

            // Reward Info
            if (!isDone) {
                let rewStr = "";
                let rewColor = "#ffffff";
                if (m.rewardType === "debris") { rewStr = `+${m.rewardAmt} ⚙️`; rewColor = "#aaccff"; }
                else if (m.rewardType === "skips") { rewStr = `+${m.rewardAmt} ⚡`; rewColor = "#00ffcc"; }
                else { rewStr = `+${m.rewardAmt} 🚀`; rewColor = "#ff00ff"; }

                this.add.text(cx + 210, yPos, rewStr, {
                    fontSize: "20px", fontFamily: "'Anek Bangla'", color: rewColor, fontStyle: "bold"
                }).setOrigin(1, 0.5);
            } else {
                this.add.text(cx + 210, yPos, "সম্পন্ন", {
                    fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#00ff00", fontStyle: "bold"
                }).setOrigin(1, 0.5);
            }
        });
    }

    // --- MAIN BUTTONS ---
    this.createModernButton(cx, panelY + 540, "খেলায় ফিরুন", true, () => {
        this.resumeGame();
    });

    this.createModernButton(cx, panelY + 650, "খেলা শেষ করুন", false, () => {
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