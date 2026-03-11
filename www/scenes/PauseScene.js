class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
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
    this.createModernButton(cx, panelY + 360, "মেনুতে যান", false, () => {
        this.scene.stop("GameScene");
        this.scene.stop("QuestionScene");
        this.scene.start("DeathScene"); 
    });
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