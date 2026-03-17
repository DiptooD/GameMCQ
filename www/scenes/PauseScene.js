class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  init() {
      // Fetch current panel state so the settings menu has the right default
      this.quickPanelState = localStorage.getItem('settings_quickPanel') || 'right';
  }

  // --- AUDIO HELPER ---
  // Syncs to global volume setting
  playSound(key, baseVolume = 1.0) {
    if (this.cache.audio.exists(key)) {
        const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
        this.sound.play(key, { volume: finalVolume });
    }
  }

  create() {
    // --- 0. INITIALIZE SFX ---
    if (typeof GameSFX !== 'undefined') {
        GameSFX.init(this);
    }

    // 1. Explicitly Pause the Game Music
    if (this.sound.get('bg_music') && this.sound.get('bg_music').isPlaying) {
        this.sound.get('bg_music').pause();
    }

    // 1. Force Camera Reset
    this.cameras.main.setScroll(0, 0);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    // 2. Dark Overlay (Dims the active game background slightly)
    this.add.rectangle(0, 0, w, h, 0x000000, 0.75).setOrigin(0, 0).setInteractive();

    // --- MAIN MENU CONTAINER (Scaled up for Mobile) ---
    const panelW = 560; // Increased from 420
    const panelH = 480; // Increased from 360
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    const glass = this.add.graphics();
    
    // Panel Background (Deep blue tint)
    glass.fillStyle(0x000c22, 0.85); 
    glass.fillRoundedRect(panelX, panelY, panelW, panelH, 24); // Slightly rounder corners
    
    // Panel Border (Neon Blue Glow)
    glass.lineStyle(3, 0x0066aa, 0.8); // Thicker border
    glass.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    // --- TITLE TEXT (Scaled Up) ---
    this.add.text(cx, panelY + 90, "বিরতি", {
      fontSize: "72px", // Increased from 52px
      fontFamily: "'Anek Bangla'", 
      color: "#00e1ff", 
      fontStyle: "bold", 
      stroke: "#000000", 
      strokeThickness: 8, // Thicker stroke
      shadow: { offsetX: 4, offsetY: 4, color: "#0044aa", blur: 12, stroke: true, fill: true }
    }).setOrigin(0.5);

    // --- BUTTONS ---
    // 1. Resume Button (Primary Gradient Theme)
    this.createModernButton(cx, panelY + 230, "খেলায় ফিরুন", true, () => {
        this.resumeGame();
    });

    // 2. Menu Button (Secondary Glass Theme)
    this.createModernButton(cx, panelY + 360, "খেলা শেষ করুন", false, () => {
        this.scene.stop("GameScene");
        this.scene.stop("QuestionScene");
        this.scene.start("DeathScene"); 
    });

    // --- SETTINGS ICON (Top Left) ---
    const settingsBg = this.add.circle(60, 60, 28, 0x001122, 0.8).setStrokeStyle(3, 0x0066aa).setDepth(25);
    const settingsIcon = this.add.text(60, 60, "⚙️", { fontSize: '30px' }).setOrigin(0.5).setDepth(25);
    const settingsHitArea = this.add.circle(60, 60, 35).setInteractive({ useHandCursor: true }).setDepth(25);

    settingsHitArea.on('pointerdown', () => {
        this.playSound('sfx_click', 0.8);
        this.tweens.add({ targets: [settingsBg, settingsIcon], scale: 0.9, duration: 50, yoyo: true });
        this.showAppConfigPopup(cx, cy);
    });

    // --- CLOSE / QUIT ICON (Top Right) ---
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

  // --- HELPER: SHOW SETTINGS POPUP ---
  showAppConfigPopup(cx, cy) {
      const popup = this.add.container(cx, cy).setDepth(2000);
      const overlay = this.add.rectangle(0, 0, 720, 1280, 0x000000, 0.85).setInteractive();
      
      const bg = this.add.graphics();
      bg.fillStyle(0x000c22, 0.95);
      // Panel height is 460 (slightly smaller than MenuScene since we omitted clear history here)
      bg.fillRoundedRect(-280, -260, 560, 460, 20);
      bg.lineStyle(4, 0x0066aa, 1);
      bg.strokeRoundedRect(-280, -260, 560, 460, 20);

      const title = this.add.text(0, -200, "সেটিংস (Settings)", { 
          fontSize: '40px', fontFamily: "'Anek Bangla'", color: '#00e1ff', fontStyle: 'bold' 
      }).setOrigin(0.5);

      const closeHit = this.add.circle(230, -200, 30).setInteractive({ useHandCursor: true });
      const closeIcon = this.add.text(230, -200, "✖", { fontSize: '35px', color: '#ff4444' }).setOrigin(0.5);
      
      closeHit.on('pointerdown', () => {
          this.playSound('sfx_back', 0.8);
          popup.destroy();
      });

      const createVolumeBar = (yOffset, labelText, initialVolume, callback) => {
          const label = this.add.text(-230, yOffset, labelText, { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0, 0.5);
          
          const trackX = -30;
          const trackWidth = 240;
          
          const trackBg = this.add.graphics();
          trackBg.fillStyle(0x002244, 1);
          trackBg.fillRoundedRect(trackX, yOffset - 8, trackWidth, 16, 8);
          trackBg.lineStyle(2, 0x0066aa);
          trackBg.strokeRoundedRect(trackX, yOffset - 8, trackWidth, 16, 8);

          const fillBg = this.add.graphics();
          
          const knob = this.add.circle(trackX + (trackWidth * initialVolume), yOffset, 14, 0xffffff)
              .setStrokeStyle(2, 0x00aaff)
              .setInteractive({ useHandCursor: true, draggable: true });
              
          const updateVisuals = (vol) => {
              fillBg.clear();
              fillBg.fillStyle(0x00ffff, 1);
              if (vol > 0) fillBg.fillRoundedRect(trackX, yOffset - 8, trackWidth * vol, 16, 8);
              knob.x = trackX + (trackWidth * vol);
          };
          updateVisuals(initialVolume);

          const trackHit = this.add.rectangle(trackX + trackWidth/2, yOffset, trackWidth + 40, 50, 0x000000, 0)
              .setInteractive({ useHandCursor: true, draggable: true });
          
          const calculateVolumeFromPointer = (pointer) => {
              const startX = cx + trackX;
              let vol = (pointer.x - startX) / trackWidth;
              return Phaser.Math.Clamp(vol, 0, 1);
          };

          const applyVolumeChange = (vol) => {
              updateVisuals(vol);
              callback(vol);
          };

          trackHit.on('pointerdown', (pointer) => {
              this.playSound('sfx_click', 0.8);
              applyVolumeChange(calculateVolumeFromPointer(pointer));
          });
          trackHit.on('drag', (pointer) => applyVolumeChange(calculateVolumeFromPointer(pointer)));
          knob.on('pointerdown', (pointer) => applyVolumeChange(calculateVolumeFromPointer(pointer)));
          knob.on('drag', (pointer) => applyVolumeChange(calculateVolumeFromPointer(pointer)));

          return { elems: [label, trackBg, fillBg, trackHit, knob], updateFn: applyVolumeChange };
      };

      const musicBar = createVolumeBar(-110, "মিউজিক (Music):", window.GameState.musicVolume, (vol) => {
          window.GameState.musicVolume = vol;
          localStorage.setItem('settings_musicVol', vol);
          let bgMusic = this.sound.get('bg_music');
          if (bgMusic) bgMusic.setVolume(vol);
      });

      const sfxBar = createVolumeBar(-40, "সাউন্ড (SFX):", window.GameState.sfxVolume, (vol) => {
          window.GameState.sfxVolume = vol;
          localStorage.setItem('settings_sfxVol', vol);
      });

      const qpLabel = this.add.text(-230, 35, "কুইক প্যানেল\n(Quick Panel):", { fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff' }).setOrigin(0, 0.5);
      const qpOptions = ['right', 'left', 'hidden'];
      const qpLabels = { 'right': 'Right (ডান)', 'left': 'Left (বাম)', 'hidden': 'Disable (বন্ধ)' };
      
      const qpBtnBg = this.add.graphics();
      qpBtnBg.fillStyle(0x002255, 1);
      qpBtnBg.fillRoundedRect(10, 10, 220, 50, 10);
      qpBtnBg.lineStyle(2, 0x00aaff);
      qpBtnBg.strokeRoundedRect(10, 10, 220, 50, 10);

      const qpBtnTxt = this.add.text(120, 35, qpLabels[this.quickPanelState], { 
          fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#00ffff', fontStyle: 'bold' 
      }).setOrigin(0.5);

      const qpHit = this.add.rectangle(120, 35, 220, 50).setInteractive({ useHandCursor: true });
      qpHit.on('pointerdown', () => {
          this.playSound('sfx_click', 0.8);
          let idx = qpOptions.indexOf(this.quickPanelState);
          idx = (idx + 1) % qpOptions.length;
          this.quickPanelState = qpOptions[idx];
          localStorage.setItem('settings_quickPanel', this.quickPanelState);
          qpBtnTxt.setText(qpLabels[this.quickPanelState]);
      });

      const resetBtnBg = this.add.graphics();
      resetBtnBg.fillStyle(0x004422, 1);
      resetBtnBg.fillRoundedRect(-180, 100, 360, 50, 15);
      resetBtnBg.lineStyle(3, 0x00ff88);
      resetBtnBg.strokeRoundedRect(-180, 100, 360, 50, 15);

      const resetBtnTxt = this.add.text(0, 125, "ডিফল্ট সেট করুন (Reset Defaults)", { 
          fontSize: '22px', fontFamily: "'Anek Bangla'", color: '#aaffaa', fontStyle: 'bold' 
      }).setOrigin(0.5);

      const resetHit = this.add.rectangle(0, 125, 360, 50).setInteractive({ useHandCursor: true });
      resetHit.on('pointerdown', () => {
          this.playSound('sfx_powerup', 0.8);
          musicBar.updateFn(0.5);
          sfxBar.updateFn(1.0);
          
          this.quickPanelState = 'right';
          localStorage.setItem('settings_quickPanel', 'right');
          qpBtnTxt.setText(qpLabels[this.quickPanelState]);
      });

      popup.add([
          overlay, bg, title, closeIcon, closeHit, 
          ...musicBar.elems, ...sfxBar.elems, 
          qpLabel, qpBtnBg, qpBtnTxt, qpHit, 
          resetBtnBg, resetBtnTxt, resetHit
      ]);
      
      popup.setScale(0.8);
      popup.setAlpha(0);
      this.tweens.add({ targets: popup, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
  }

  // --- HELPER: CREATE MODERN BUTTON (Scaled up) ---
  createModernButton(x, y, text, isPrimary, callback) {
      const container = this.add.container(x, y).setDepth(20);
      const bg = this.add.graphics();
      
      const btnW = 440; // Increased from 320
      const btnH = 86;  // Increased from 64
      const radius = btnH / 2;
      
      const draw = (scale, hover) => {
          bg.clear();
          if (isPrimary) {
              // Neon Gradient for primary actions
              bg.fillGradientStyle(
                  hover ? 0x002266 : 0x001133, hover ? 0x002266 : 0x001133, 
                  hover ? 0x0088ff : 0x004488, hover ? 0x0088ff : 0x004488, 1
              );
              bg.lineStyle(hover ? 5 : 4, hover ? 0xffffff : 0x00ffff, 0.8); // Thicker stroke
          } else {
              // Dark Glass for secondary actions
              bg.fillStyle(hover ? 0x081830 : 0x051025, 0.9);
              bg.lineStyle(3, hover ? 0x0088cc : 0x0066aa, 0.8); // Thicker stroke
          }
          bg.fillRoundedRect((-btnW / 2) * scale, (-btnH / 2) * scale, btnW * scale, btnH * scale, radius);
          bg.strokeRoundedRect((-btnW / 2) * scale, (-btnH / 2) * scale, btnW * scale, btnH * scale, radius);
      };
      
      // Initial Draw
      draw(1, false);

      const txt = this.add.text(0, 0, text, {
          fontSize: "38px", // Increased from 26px
          fontFamily: "'Anek Bangla'", 
          color: isPrimary ? "#ffffff" : "#b3d4ff", 
          fontStyle: "bold",
          stroke: isPrimary ? "#003366" : "#000000",
          strokeThickness: 3
      }).setOrigin(0.5);

      const hit = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
      container.add([bg, txt, hit]);

      // Hover Effects
      hit.on('pointerover', () => { 
          draw(1, true); 
          if (!isPrimary) txt.setColor("#ffffff");
      });
      hit.on('pointerout', () => { 
          draw(1, false); 
          if (!isPrimary) txt.setColor("#b3d4ff");
      });

      // Click Effect
      hit.on('pointerdown', () => {
          // Play click sound using global synced helper
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
    // 1. Resume Game Music
    // While resume() inherently keeps its assigned volume, setting it again guarantees it stays mapped to settings
    let bgMusic = this.sound.get('bg_music');
    if (bgMusic) {
        bgMusic.resume();
        bgMusic.setVolume(window.GameState.musicVolume !== undefined ? window.GameState.musicVolume : 0.5);
    }

      // 1. Stop the Pause Menu
      this.scene.stop(); 
      
      // 2. Wake up the Game Scenes
      this.scene.resume("GameScene"); 
      this.scene.resume("QuestionScene"); 

      // 3. Trigger the 3-Second Countdown in GameScene
      const gameScene = this.scene.get("GameScene");
      if (gameScene) {
          gameScene.startCountdown();
      }
  }
}