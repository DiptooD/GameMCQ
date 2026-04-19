class GameTextures {
  static init(scene) {
    if (scene.textures.exists('player_lv1')) return; 
    
    let g = scene.make.graphics({ add: false });
    
    // ==========================================================
    // --- DEFAULT PLAYER BIRD: DOEL (Magpie Robin) ---
    // ==========================================================
    const drawDoel = (level) => {
        g.clear();
        
        // Wing layers (White stripes on black) 
        // WINGS EXPANDED: 15 to 165 for unified sizing!
        g.fillStyle(0x1a1a1a, 1);
        g.lineStyle(4, 0xffffff, 1); // Thick white outline
        
        g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 95); g.lineTo(65, 115); g.fillPath(); g.strokePath();
        g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 95); g.lineTo(115, 115); g.fillPath(); g.strokePath();
        
        g.fillStyle(0xffffff, 1);
        g.fillRect(35, 90, 25, 6);
        g.fillRect(120, 90, 25, 6);

        // Tail (Raised and stiff)
        g.fillStyle(0x1a1a1a, 1);
        g.beginPath(); g.moveTo(85, 100); g.lineTo(70, 145); g.lineTo(110, 145); g.lineTo(95, 100); g.fillPath(); g.strokePath();
        g.fillStyle(0xffffff, 1);
        g.fillRect(72, 115, 5, 30); g.fillRect(103, 115, 5, 30);

        // Body & Belly
        g.fillStyle(0x111111, 1); 
        g.fillEllipse(90, 80, 40, 60); g.strokeEllipse(90, 80, 40, 60);
        g.fillStyle(0xffffff, 1); 
        g.fillEllipse(90, 88, 24, 40);

        // Head & Beak
        g.fillStyle(0x111111, 1);
        g.fillCircle(90, 55, 16); g.strokeCircle(90, 55, 16);
        g.fillStyle(0x00ffff, 1); // Bright cyan beak 
        g.fillTriangle(86, 45, 94, 45, 90, 25); g.strokeTriangle(86, 45, 94, 45, 90, 25);

        // Enhancements based on Level
        if (level >= 2) {
            g.fillStyle(0x00ffff, 1); 
            g.fillCircle(35, 100, 4); g.fillCircle(145, 100, 4);
        }
        if (level >= 3) {
            g.lineStyle(4, 0x00ffff, 1);
            g.strokeEllipse(90, 80, 44, 64);
        }
        if (level >= 4) {
            g.fillStyle(0x00ffff, 0.9);
            g.fillTriangle(75, 140, 105, 140, 90, 175); 
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(82, 140, 98, 140, 90, 165);
        }
    };

    drawDoel(1); g.generateTexture("player_lv1", 180, 180);
    drawDoel(2); g.generateTexture("player_lv2", 180, 180);
    drawDoel(3); g.generateTexture("player_lv3", 180, 180);
    drawDoel(4); g.generateTexture("player_lv4", 180, 180);
    g.clear();

    // FIXED: Massive, super bright Default Bullets
    g.fillStyle(0x00FFFF, 1); 
    g.fillTriangle(12, 0, 2, 36, 22, 36); 
    g.fillStyle(0xFFFFFF, 1); 
    g.fillTriangle(12, 4, 6, 32, 18, 32);
    g.generateTexture("bullet_default", 24, 36);
    g.clear();

    g.fillStyle(0x00FFaa, 1); 
    g.beginPath(); g.moveTo(12, 0); g.lineTo(2, 28); g.lineTo(12, 40); g.lineTo(22, 28); g.closePath(); g.fillPath();
    g.fillStyle(0xffffff, 1);
    g.beginPath(); g.moveTo(12, 8); g.lineTo(6, 28); g.lineTo(12, 32); g.lineTo(18, 28); g.closePath(); g.fillPath();
    g.generateTexture("side_bullet_default", 24, 40);
    g.clear();

    // Fallback bullets (Orange/Yellow classic) made large
    g.fillStyle(0xFF8800, 1); 
    g.fillTriangle(12, 0, 2, 36, 22, 36); 
    g.fillStyle(0xFFFF00, 1); 
    g.fillTriangle(12, 4, 6, 32, 18, 32);
    g.generateTexture("bullet", 24, 36);
    g.clear();

    g.fillStyle(0xFF00FF, 1); 
    g.beginPath(); g.moveTo(12, 0); g.lineTo(2, 28); g.lineTo(12, 40); g.lineTo(22, 28); g.closePath(); g.fillPath();
    g.generateTexture("side_bullet", 24, 40);
    g.clear();


    // --- VOID BARNACLE (Common) ---
    g.fillStyle(0x1a0033, 1);
    g.fillCircle(25, 25, 22);
    g.fillStyle(0x2d0055, 1);
    for(let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      g.fillTriangle(
        25, 25,
        25 + Math.cos(angle) * 20, 25 + Math.sin(angle) * 20,
        25 + Math.cos(angle + 0.8) * 22, 25 + Math.sin(angle + 0.8) * 22
      );
    }
    g.fillStyle(0x6600ff, 0.8);
    g.fillCircle(25, 25, 12);
    g.fillStyle(0x9933ff, 0.6);
    g.fillCircle(25, 25, 8);
    g.fillStyle(0xcc66ff, 0.4);
    g.fillCircle(25, 25, 5);
    g.fillStyle(0x00ffff, 0.7);
    g.fillCircle(18, 15, 2);
    g.fillCircle(32, 18, 2);
    g.fillCircle(20, 30, 2);
    g.fillCircle(30, 28, 2);
    g.lineStyle(3, 0x9966ff, 0.8);
    g.strokeCircle(25, 25, 21);
    g.generateTexture("enemy_common", 50, 50);
    g.clear();

    // --- HARDENED MAGMA LARVA ---
    const segments = [
        { y: 70, r: 14, color: 0xaa0000 },
        { y: 55, r: 18, color: 0xcc2200 }, 
        { y: 38, r: 22, color: 0xee4400 }, 
        { y: 18, r: 24, color: 0xff6600 }  
    ];
    segments.forEach(seg => {
        g.fillStyle(0x222222, 1); 
        g.fillCircle(40, seg.y, seg.r + 2);
        g.fillStyle(seg.color, 1);
        g.fillCircle(40, seg.y, seg.r);
        g.fillStyle(0xff9900, 1);
        g.fillCircle(40, seg.y, seg.r * 0.6);
        g.fillStyle(0x730013, 1);
        g.fillEllipse(40, seg.y - 4, seg.r * 1.2, 4);
    });
    g.fillStyle(0x111111, 1);
    g.beginPath();
    g.moveTo(25, 20); g.lineTo(10, 5); g.lineTo(32, 12);
    g.fillPath();
    g.beginPath();
    g.moveTo(55, 20); g.lineTo(70, 5); g.lineTo(48, 12);
    g.fillPath();
    g.fillStyle(0xff0000, 1);
    g.fillEllipse(32, 16, 6, 2);
    g.fillEllipse(48, 16, 6, 2);
    g.fillStyle(0xcc4400, 0.8);
    g.fillCircle(18, 45, 3);
    g.fillCircle(62, 45, 3);
    g.generateTexture("enemy_rare", 80, 90);
    g.clear();

    // --- Corrupted Starlight Guardian (Ultra) ---
    g.lineStyle(4, 0xFF0000, 1);
    g.fillStyle(0x440000, 1);    
    g.beginPath();
    g.moveTo(40, 0);   
    g.lineTo(48, 25);  
    g.lineTo(75, 20);  
    g.lineTo(55, 45);  
    g.lineTo(85, 75);  
    g.lineTo(40, 65);  
    g.lineTo(-5, 75);  
    g.lineTo(25, 45);  
    g.lineTo(5, 20);   
    g.lineTo(32, 25);  
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.lineStyle(0);
    g.fillStyle(0x000000, 1); 
    g.fillCircle(40, 48, 19);
    g.fillStyle(0x1A001A, 1); 
    g.fillCircle(40, 45, 20);

    g.lineStyle(3, 0xFF2200, 0.8);
    g.beginPath();
    g.arc(40, 45, 19, 0.1 * Math.PI, 0.9 * Math.PI); 
    g.strokePath();

    g.lineStyle(3, 0xFF0000, 1);
    g.fillStyle(0x880000, 1); 
    g.beginPath();
    g.moveTo(40, 10);
    g.lineTo(45, 20);
    g.lineTo(40, 30);
    g.lineTo(35, 20);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.lineStyle(0);
    g.fillStyle(0xFF0000, 0.3); 
    g.fillCircle(30, 44, 7);
    g.fillCircle(50, 44, 7);
    g.fillStyle(0xFF3300, 1); 
    g.fillCircle(30, 44, 4);
    g.fillCircle(50, 44, 4);
    g.fillStyle(0xFFFFCC, 0.8); 
    g.fillCircle(30, 44, 1.5);
    g.fillCircle(50, 44, 1.5);
    g.generateTexture("enemy_ultra", 80, 90);
    g.clear();

    // --- Centipede Segment ---
    g.fillStyle(0x228822, 1);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x33aa33, 1);
    g.fillCircle(20, 20, 14);
    g.fillStyle(0x44cc44, 0.8);
    g.fillCircle(20, 20, 10);
    g.fillStyle(0x116611, 1);
    g.fillRect(4, 18, 6, 4);
    g.fillRect(30, 18, 6, 4);
    g.fillStyle(0xff0000, 0.9);
    g.fillCircle(14, 14, 3);
    g.fillCircle(26, 14, 3);
    g.lineStyle(3, 0x55dd55, 1);
    g.strokeCircle(20, 20, 16);
    g.generateTexture("enemy_centipede", 40, 40);
    g.clear();

    // --- Dragon ---
    const primaryColor = 0xFF1764;
    const darkColor = 0xA3003B;    
    const highlightColor = 0xFF6094; 
    const accentColor = 0xFFD1E1;    
    g.fillStyle(primaryColor, 1);
    g.fillRoundedRect(25, 10, 30, 25, 6);
    g.fillStyle(highlightColor, 1);
    g.fillEllipse(40, 20, 18, 15);
    g.fillStyle(darkColor, 1);
    g.beginPath();
    g.moveTo(40, 0);
    g.lineTo(30, 10);
    g.lineTo(50, 10);
    g.closePath();
    g.fillPath();
    g.fillStyle(accentColor, 1);
    g.fillTriangle(25, 10, 20, 0, 28, 8);
    g.fillTriangle(55, 10, 60, 0, 52, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 16, 4);
    g.fillCircle(48, 16, 4);
    g.fillStyle(0x000000, 1);
    g.fillCircle(32, 16, 2);
    g.fillCircle(48, 16, 2);
    g.fillStyle(primaryColor, 1);
    g.fillRoundedRect(15, 30, 50, 20, 8);
    g.fillStyle(darkColor, 0.8);
    g.beginPath();
    g.moveTo(15, 35); g.lineTo(0, 30); g.lineTo(5, 50); g.lineTo(15, 45);
    g.closePath(); g.fillPath();
    g.beginPath();
    g.moveTo(65, 35); g.lineTo(80, 30); g.lineTo(75, 50); g.lineTo(65, 45);
    g.closePath(); g.fillPath();
    g.fillStyle(darkColor, 0.6);
    g.fillTriangle(10, 35, 2, 38, 10, 42);
    g.fillTriangle(70, 35, 78, 38, 70, 42);
    g.fillStyle(accentColor, 0.5);
    for(let i = 0; i < 3; i++) {
      g.fillCircle(25 + (i * 12), 38, 4);
    }
    g.fillStyle(primaryColor, 1);
    g.fillRect(32, 48, 4, 6);
    g.fillRect(44, 48, 4, 6);
    g.fillStyle(accentColor, 0.8);
    g.fillRect(33, 50, 2, 4);
    g.fillRect(45, 50, 2, 4);
    g.lineStyle(3, highlightColor, 1);
    g.strokeRoundedRect(26, 11, 28, 23, 5);
    g.generateTexture("enemy_dragon", 80, 60);
    g.clear();

    // --- Spinner ---
    g.fillStyle(0x00aacc, 1);
    g.fillCircle(25, 25, 22);
    g.fillStyle(0x00ddff, 1);
    g.fillCircle(25, 25, 16);
    g.fillStyle(0x00ffff, 0.8);
    g.fillCircle(25, 25, 10);
    for(let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = 25 + Math.cos(angle) * 18;
      const y = 25 + Math.sin(angle) * 18;
      g.fillStyle(0x0088aa, 1);
      g.fillTriangle(
        25, 25,
        x + Math.cos(angle + 0.5) * 8, y + Math.sin(angle + 0.5) * 8,
        x + Math.cos(angle - 0.5) * 8, y + Math.sin(angle - 0.5) * 8
      );
    }
    g.lineStyle(3, 0x00ffff, 1);
    g.strokeCircle(25, 25, 20);
    g.generateTexture("enemy_spinner", 50, 50);
    g.clear();

    // --- Octopus ---
    g.fillStyle(0x6600cc, 1);
    g.fillEllipse(40, 35, 45, 50);
    g.fillStyle(0x440088, 1);
    g.fillTriangle(15, 35, 5, 55, 20, 50);
    g.fillTriangle(65, 35, 75, 55, 60, 50);
    g.fillStyle(0x00ffff, 1);
    g.fillCircle(28, 45, 7);
    g.fillCircle(52, 45, 7);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(28, 43, 3);
    g.fillCircle(52, 43, 3);
    g.fillStyle(0x8800ff, 1);
    for(let i = 0; i < 4; i++) {
        g.fillRoundedRect(15 + (i * 6), 65, 4, 25, 2);
        g.fillRoundedRect(45 + (i * 6), 65, 4, 25, 2);
    }
    g.fillStyle(0x00ffff, 0.5);
    for(let i = 0; i < 6; i++) {
        g.fillCircle(Phaser.Math.Between(25, 55), Phaser.Math.Between(15, 35), 2);
    }
    g.lineStyle(3, 0xff00ff, 0.8);
    g.strokeEllipse(40, 35, 45, 50);
    g.generateTexture("enemy_octopus", 80, 100);
    g.clear();

    // --- LIQUID INK / THERMAL VAPOR PULSE (Octopus Bullet) ---
    g.fillStyle(0xff8800, 0.8);
    g.fillCircle(15, 15, 8); 
    g.fillStyle(0xff4400, 0.4);
    g.fillCircle(15, 15, 12); 
    g.fillStyle(0xaa0000, 0.2);
    g.fillCircle(15, 15, 16); 
    g.fillStyle(0xffcc00, 0.6);
    for(let i = 0; i < 5; i++) {
        let rx = Phaser.Math.Between(5, 25);
        let ry = Phaser.Math.Between(5, 25);
        g.fillCircle(rx, ry, 2.5); 
    }
    g.generateTexture("bullet_octopus", 30, 30);
    g.clear();

    // 2. MISSILE
    g.fillStyle(0xcc3300, 1);
    g.fillRoundedRect(8, 20, 20, 50, 6);
    g.fillStyle(0xff4400, 1);
    g.beginPath();
    g.moveTo(18, 4); g.lineTo(10, 20); g.lineTo(26, 20);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xff6600, 1);
    g.fillTriangle(8, 50, 2, 60, 8, 64);
    g.fillTriangle(28, 50, 34, 60, 28, 64);
    g.fillStyle(0xffcc00, 1);
    g.fillRect(11, 28, 14, 3);
    g.fillRect(11, 40, 14, 3);
    g.fillRect(11, 52, 14, 3);
    g.fillStyle(0x661100, 1);
    g.fillRect(12, 70, 12, 8);
    g.fillStyle(0xff8800, 0.8);
    g.fillRect(13, 72, 10, 5);
    g.lineStyle(3, 0xff5500, 1);
    g.strokeRoundedRect(8, 20, 20, 50, 6);
    g.generateTexture("missile", 36, 78);
    g.clear();

    // --- BOOSTER ICONS ---
    g.lineStyle(3, 0xff4444, 1);
    g.fillStyle(0x440000, 1);
    g.beginPath();
    g.moveTo(20, 35); g.lineTo(5, 20); g.lineTo(5, 5); g.lineTo(35, 5); g.lineTo(35, 20);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(20, 20, 8);
    g.generateTexture("icon_booster_fire", 40, 40);
    g.clear();

    g.fillStyle(0x000044, 1);
    g.fillCircle(20, 20, 18);
    g.lineStyle(3, 0x00ffff, 1);
    g.strokeCircle(20, 20, 18);
    g.fillStyle(0x00ffff, 1);
    g.beginPath(); g.moveTo(10, 20); g.lineTo(20, 10); g.lineTo(20, 30); g.fillPath();
    g.beginPath(); g.moveTo(22, 20); g.lineTo(32, 10); g.lineTo(32, 30); g.fillPath();
    g.generateTexture("icon_booster_speed", 40, 40);
    g.clear();

    g.fillStyle(0x004400, 1);
    g.fillRoundedRect(5, 5, 30, 30, 8);
    g.lineStyle(3, 0x00ff00, 1);
    g.strokeRoundedRect(5, 5, 30, 30, 8);
    g.fillStyle(0x00ff00, 1);
    g.fillRect(18, 10, 4, 20); 
    g.fillRect(10, 18, 20, 4); 
    g.generateTexture("icon_booster_battery", 40, 40);
    g.clear();

    // --- SHOCKWAVE AURA TEXTURES ---
    g.fillStyle(0xffffcc, 0.05); 
    g.fillCircle(40, 40, 38);
    g.lineStyle(3, 0xffaa00, 1);
    g.beginPath();
    for (let i = 0; i <= 360; i += 5) { 
        const rad = Phaser.Math.DegToRad(i);
        const jitter = (i % 15 === 0) ? 6 : (i % 5 === 0 ? -2 : 0);
        const r = 32 + jitter;
        const x = 40 + Math.cos(rad) * r;
        const y = 40 + Math.sin(rad) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
    g.lineStyle(1.5, 0xffffff, 1);
    g.beginPath();
    for (let i = 0; i <= 360; i += 5) {
        const rad = Phaser.Math.DegToRad(i);
        const jitter = (i % 15 === 0) ? 6 : (i % 5 === 0 ? -2 : 0);
        const r = 32 + jitter;
        const x = 40 + Math.cos(rad) * r;
        const y = 40 + Math.sin(rad) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
    g.fillStyle(0xffff00, 1);
    for(let i=0; i<8; i++) {
        const angle = Phaser.Math.DegToRad(i * 45 + 10);
        const dist = 42; 
        g.fillCircle(40 + Math.cos(angle) * dist, 40 + Math.sin(angle) * dist, 2);
    }
    g.generateTexture("aura_lightning", 80, 80);
    g.clear();

    g.fillStyle(0x00ffff, 0.05); 
    g.fillCircle(50, 50, 48);
    g.lineStyle(3, 0xaaddff, 0.8);
    g.strokeCircle(50, 50, 48);
    g.fillStyle(0xffffff, 0.6); 
    for(let i=0; i<6; i++) {
        const angle = (i/6) * Math.PI * 2;
        g.beginPath();
        g.moveTo(50 + Math.cos(angle) * 35, 50 + Math.sin(angle) * 35);
        g.lineTo(50 + Math.cos(angle) * 46, 50 + Math.sin(angle) * 46); 
        g.lineTo(50 + Math.cos(angle + 0.08) * 40, 50 + Math.sin(angle + 0.08) * 40);
        g.lineTo(50 + Math.cos(angle - 0.08) * 40, 50 + Math.sin(angle - 0.08) * 40);
        g.closePath();
        g.fillPath();
    }
    g.lineStyle(2, 0x00ffff, 0.4);
    g.strokeCircle(50, 50, 35);
    g.generateTexture("aura_ice", 100, 100);
    g.clear();

    g.lineStyle(3, 0x00ff00, 0.8);
    g.strokeCircle(60, 60, 58);
    g.lineStyle(2, 0xccffcc, 0.3);
    g.strokeCircle(60, 60, 48);
    g.strokeCircle(60, 60, 35);
    g.strokeCircle(60, 60, 20);
    g.fillStyle(0x00ff00, 0.03); 
    g.fillCircle(60, 60, 58);
    g.generateTexture("aura_plasma", 120, 120);
    g.clear();

    g.lineStyle(8, 0xffcc00, 1);
    g.strokeCircle(64, 64, 60);
    g.lineStyle(2, 0xffffff, 0.3);
    for(let i = 10; i < 120; i += 8) {
        g.lineBetween(20, i, 108, i); 
    }
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokeCircle(64, 64, 45);
    g.generateTexture("tex_shockwave_heavy", 128, 128);
    g.clear();

    // --- BATTERIES ---
    g.fillStyle(0x006e00, 1); 
    g.fillRoundedRect(4, 10, 28, 20, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(32, 15, 4, 10);
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(20, 12); 
    g.lineTo(14, 20); 
    g.lineTo(18, 20); 
    g.lineTo(16, 28); 
    g.lineTo(24, 18); 
    g.lineTo(20, 18); 
    g.closePath();
    g.fillPath();
    g.lineStyle(4, 0x00ff00, .9);
    g.strokeRoundedRect(4, 10, 28, 20, 4);
    g.generateTexture("battery_green", 40, 40);
    g.clear();

    g.fillStyle(0x677000, 1); 
    g.fillRoundedRect(4, 10, 28, 20, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(32, 15, 4, 10);
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(20, 12);
    g.lineTo(14, 20);
    g.lineTo(18, 20);
    g.lineTo(16, 28);
    g.lineTo(24, 18);
    g.lineTo(20, 18);
    g.closePath();
    g.fillPath();
    g.lineStyle(4, 0xffff00, .9);
    g.strokeRoundedRect(4, 10, 28, 20, 4);
    g.generateTexture("battery_yellow", 40, 40);
    g.clear();

    g.fillStyle(0xa20000, 1); 
    g.fillRoundedRect(4, 10, 28, 20, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(32, 15, 4, 10);
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(20, 12);
    g.lineTo(14, 20);
    g.lineTo(18, 20);
    g.lineTo(16, 28);
    g.lineTo(24, 18);
    g.lineTo(20, 18);
    g.closePath();
    g.fillPath();
    g.lineStyle(4, 0xffbf00, .9);
    g.strokeRoundedRect(4, 10, 28, 20, 4);
    g.generateTexture("battery_red", 40, 40);
    g.clear();

    // --- OBSTACLES ---
    g.fillStyle(0x1a1a2e, .05);
    g.beginPath();
    g.moveTo(25, 5);   
    g.lineTo(35, 12);  
    g.lineTo(48, 8);   
    g.lineTo(42, 25); 
    g.lineTo(47, 40);  
    g.lineTo(30, 38);
    g.lineTo(25, 48);  
    g.lineTo(15, 40);
    g.lineTo(2, 35);   
    g.lineTo(10, 20);
    g.lineTo(5, 10);   
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xaa00ff, 1);
    g.strokePath();
    const craters = [
        {x: 18, y: 18, r: 5},
        {x: 32, y: 28, r: 4},
        {x: 22, y: 34, r: 3}
    ];
    craters.forEach(c => {
        g.fillStyle(0x0a0a1a, 1); 
        g.fillCircle(c.x, c.y, c.r);
        g.lineStyle(2, 0x00ffff, 0.5);
        g.strokeCircle(c.x, c.y, c.r);
    });
    g.generateTexture("obstacle_asteroid", 50, 50);
    g.clear();

    g.fillStyle(0x222233, .05);
    g.beginPath();
    g.moveTo(10, 5);
    g.lineTo(40, 8);
    g.lineTo(48, 25); 
    g.lineTo(35, 45);
    g.lineTo(10, 42);
    g.lineTo(2, 25);  
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0x00ffff, .9);
    g.strokePath();
    const debrisHoles = [
        {x: 15, y: 15, r: 4},
        {x: 35, y: 35, r: 3},
        {x: 25, y: 30, r: 5}
    ];
    debrisHoles.forEach(h => {
        g.fillStyle(0x000000, 1); 
        g.fillCircle(h.x, h.y, h.r);
        g.lineStyle(2, 0x00ffff, 0.4);
        g.strokeCircle(h.x, h.y, h.r);
    });
    g.generateTexture("obstacle_debris", 50, 50);
    g.clear();

    g.fillStyle(0x1a1a1a, .05); 
    g.beginPath();
    g.moveTo(25, 4);    
    g.lineTo(38, 15);
    g.lineTo(48, 12);   
    g.lineTo(42, 30);
    g.lineTo(46, 46);   
    g.lineTo(25, 36);
    g.lineTo(4, 48);    
    g.lineTo(12, 22);
    g.lineTo(3, 10);    
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xffaa00, .9);
    g.strokePath();
    const mineFeatures = [
        {x: 25, y: 25, r: 7, glow: true},  
        {x: 18, y: 14, r: 3, glow: false}, 
        {x: 32, y: 36, r: 2, glow: false}  
    ];
    mineFeatures.forEach(f => {
        g.fillStyle(0x000000, .5);
        g.fillCircle(f.x, f.y, f.r);
        g.lineStyle(2, 0xffcc00, 0.7);
        g.strokeCircle(f.x, f.y, f.r);
    });
    g.generateTexture("obstacle_mine", 50, 50);
    g.clear();

    // --- POWER-UPS ---
    g.lineStyle(5, 0xffcc00, 1);
    g.beginPath();
    g.moveTo(20, 38);   
    g.lineTo(4, 22);    
    g.lineTo(4, 4);     
    g.lineTo(36, 4);    
    g.lineTo(36, 22);   
    g.closePath();
    g.strokePath();
    g.fillStyle(0xffaa00, 0.4);
    g.fillPath();
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(10, 12);
    g.lineTo(20, 22);
    g.lineTo(30, 12);
    g.strokePath();
    g.generateTexture("powerup_shield", 40, 40);
    g.clear();

    g.lineStyle(10, 0xff0000, 1);
    g.beginPath();
    g.arc(20, 18, 10, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0), false);
    g.strokePath();
    g.beginPath();
    g.moveTo(10, 18); g.lineTo(10, 30);
    g.moveTo(30, 18); g.lineTo(30, 30);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillRect(5, 26, 10, 10);
    g.fillRect(25, 26, 10, 10);
    g.generateTexture("powerup_magnet", 40, 40);
    g.clear();

    g.fillStyle(0xff4400, 1);
    g.fillCircle(20, 25, 12);
    g.fillStyle(0x992200, 0.5);
    g.beginPath();
    g.arc(20, 25, 12, 0, Math.PI, false);
    g.fillPath();
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(16, 20, 4);
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(20, 13);
    g.lineTo(20, 6);
    g.lineTo(28, 4);
    g.strokePath();
    g.fillStyle(0xffff00, 1);
    g.fillCircle(28, 4, 4.5);
    g.lineStyle(2, 0xffffff, 1);
    for(let i=0; i<4; i++){
        let a = i * (Math.PI/2);
        g.lineBetween(28,4, 28+Math.cos(a)*8, 4+Math.sin(a)*8);
    }
    g.generateTexture("powerup_tnt", 40, 40);
    g.clear();

    g.fillStyle(0x00ff88, 1);
    g.fillCircle(14, 16, 8);
    g.fillCircle(26, 16, 8);
    g.beginPath();
    g.moveTo(6, 18); g.lineTo(34, 18); g.lineTo(20, 36);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 1);
    g.fillRect(18, 12, 4, 14);
    g.fillRect(13, 17, 14, 4);
    g.generateTexture("powerup_heart", 40, 40);
    g.clear();

    // --- BOSSES ---
    g.fillStyle(0x8B0000, 1); 
    g.fillRoundedRect(85, 40, 80, 80, 4);
    g.fillStyle(0xff3300, 1); 
    g.fillRect(95, 50, 60, 20);
    g.fillRect(95, 80, 60, 30);
    g.fillStyle(0x550000, 1);
    g.fillRect(45, 60, 40, 60); 
    g.fillRect(165, 60, 40, 60); 
    g.fillStyle(0xffaa00, 1); 
    g.fillCircle(65, 120, 10);
    g.fillCircle(185, 120, 10);
    g.fillStyle(0xcccccc, 1);
    g.fillTriangle(85, 40, 95, 40, 65, 10); 
    g.fillTriangle(165, 40, 155, 40, 185, 10); 
    g.fillStyle(0x000000, 1);
    g.fillCircle(125, 95, 15);
    g.fillStyle(0xff0000, 1);
    g.fillCircle(125, 95, 10);
    g.fillStyle(0xffff00, 0.8);
    g.fillCircle(125, 95, 4);
    g.lineStyle(5, 0xffaa00, 1);
    g.strokeRect(85, 40, 80, 80);
    g.generateTexture("boss_lv1", 250, 150);
    g.clear();

    g.fillStyle(0xAB0000, 1); 
    g.beginPath();
    g.moveTo(70, 40); g.lineTo(20, 60); g.lineTo(20, 110); g.lineTo(70, 130);
    g.closePath(); g.fillPath();
    g.beginPath();
    g.moveTo(180, 40); g.lineTo(230, 60); g.lineTo(230, 110); g.lineTo(180, 130);
    g.closePath(); g.fillPath();
    g.fillStyle(0xFF8C00, 1); 
    g.beginPath();
    g.moveTo(125, 20);   
    g.lineTo(180, 45);   
    g.lineTo(180, 115);  
    g.lineTo(125, 140);  
    g.lineTo(70, 115);   
    g.lineTo(70, 45);    
    g.closePath();
    g.fillPath();
    g.lineStyle(8, 0x690000, 1);
    g.strokePath();
    g.fillStyle(0x9C0000, 1); 
    g.beginPath();
    g.moveTo(90, 60); g.lineTo(125, 80); g.lineTo(160, 60); 
    g.lineTo(160, 70); g.lineTo(125, 90); g.lineTo(90, 70);
    g.closePath(); g.fillPath();
    g.fillStyle(0x9E0000, 1);
    g.fillTriangle(80, 45, 100, 45, 75, 15);  
    g.fillTriangle(150, 45, 170, 45, 175, 15); 
    g.generateTexture("boss_lv2", 250, 150);
    g.clear();

    g.fillStyle(0x1D3B00, 1); 
    g.fillTriangle(125, 10, 15, 140, 235, 140); 
    g.fillStyle(0x003300, 1);
    g.fillTriangle(125, 30, 45, 130, 205, 130);
    g.fillStyle(0x96D900, 1); 
    g.fillTriangle(100, 60, 70, 50, 80, 80);
    g.fillTriangle(150, 60, 180, 50, 170, 80);
    g.fillStyle(0x7DB54A, 1);
    g.fillTriangle(95, 62, 78, 55, 85, 75);
    g.fillTriangle(155, 62, 172, 55, 165, 75);
    g.fillStyle(0xff0000, 1); 
    g.lineStyle(6, 0x39ff14, 1);
    g.beginPath();
    g.moveTo(80, 100); 
    g.lineTo(100, 120); 
    g.lineTo(125, 90);  
    g.lineTo(150, 120); 
    g.lineTo(170, 100); 
    g.lineTo(150, 110); g.lineTo(125, 80); g.lineTo(100, 110); 
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(0x649400, 1);
    g.fillTriangle(20, 40, 30, 30, 40, 50); 
    g.fillTriangle(230, 40, 220, 30, 210, 50); 
    g.generateTexture("boss_lv3", 250, 150); 
    g.clear();   
    
    // --- BOSS BULLETS ---
    g.fillStyle(0xff0000, 1);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xff6666, 0.8);
    g.fillCircle(12, 12, 8);
    g.fillStyle(0xff9999, 0.5);
    g.fillCircle(12, 12, 5);
    g.lineStyle(3, 0xff3333, 0.9);
    g.strokeCircle(12, 12, 10);
    g.generateTexture("bossBullet", 24, 24);
    g.clear();

    g.fillStyle(0xff00aa, 1);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xff66cc, 0.9);
    g.fillCircle(12, 12, 9);
    g.fillStyle(0xffaaee, 0.7);
    g.fillCircle(12, 12, 6);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(12, 12, 3);
    g.lineStyle(3, 0xffff00, 1);
    g.strokeCircle(12, 12, 10);
    g.strokeRect(11, 4, 2, 4);
    g.strokeRect(11, 16, 2, 4);
    g.strokeRect(4, 11, 4, 2);
    g.strokeRect(16, 11, 4, 2);
    g.generateTexture("bossBullet_tracking", 24, 24);
    g.clear();

    g.fillStyle(0xff3300, 1);
    g.fillRoundedRect(4, 0, 12, 26, 5); 
    g.fillStyle(0xff6633, 0.8);
    g.fillEllipse(10, 9, 8, 16); 
    g.fillStyle(0xff9966, 0.6);
    g.fillEllipse(10, 6, 5, 8); 
    g.lineStyle(2.5, 0xff5522, 1); 
    g.strokeRoundedRect(4, 0, 12, 26, 5);
    g.generateTexture("enemyBullet", 20, 26);
    g.clear();

    g.fillStyle(0xff6600, 0.8);
    g.beginPath();
    g.moveTo(16, 0);   
    g.lineTo(28, 20);  
    g.lineTo(16, 32);  
    g.lineTo(4, 20);   
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffcc00, 1);
    g.fillCircle(16, 20, 6);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(13, 17, 2);
    g.generateTexture("poison_drop", 32, 32);
    g.clear();

    // --- PARTICLES ---
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(7, 7, 7);
    g.fillStyle(0xffdd00, 0.7);
    g.fillCircle(7, 7, 4);
    g.generateTexture("engine_flame", 14, 14);
    g.clear();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture("spark", 12, 12);
    g.clear();

    g.fillStyle(0xffffff, 0.3);
    g.beginPath();
    g.moveTo(12, 0); 
    g.lineTo(24, 12); 
    g.lineTo(12, 24); 
    g.lineTo(0, 12);  
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(12, 4.5);  
    g.lineTo(19.5, 12); 
    g.lineTo(12, 19.5); 
    g.lineTo(4.5, 12);  
    g.closePath();
    g.fillPath();
    g.generateTexture("explosion_particle", 24, 24);
    g.clear();

    // --- UI ELEMENTS ---
    const heartX = 25;
    const heartY = 25;
    const size = 15;
    g.lineStyle(4, 0xff0033, 1);
    g.strokeCircle(heartX - size/2, heartY - size/2, size/2);
    g.strokeCircle(heartX + size/2, heartY - size/2, size/2);
    g.beginPath();
    g.moveTo(heartX - size, heartY - size/3);
    g.lineTo(heartX, heartY + size);
    g.lineTo(heartX + size, heartY - size/3);
    g.strokePath();
    g.lineStyle(2, 0x00ff88, 0.4);
    g.strokeCircle(heartX - size/2, heartY - size/2, size/2 - 2);
    g.strokeCircle(heartX + size/2, heartY - size/2, size/2 - 2);
    g.generateTexture("ui_heart", 50, 50);
    g.clear();

    g.lineStyle(5, 0xffffff, .5);
    g.strokeCircle(25, 25, 22);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(16, 15, 6, 20, 2);
    g.fillRoundedRect(28, 15, 6, 20, 2);
    g.generateTexture("ui_pause", 50, 50);
    g.clear();

    g.fillStyle(0x00ffcc, 1);
    g.beginPath();
    g.moveTo(20, 0);
    g.lineTo(5, 22);
    g.lineTo(18, 22);
    g.lineTo(12, 45); 
    g.lineTo(35, 18);
    g.lineTo(22, 18);
    g.closePath();
    g.fillPath();
    g.generateTexture("ui_bolt", 40, 50);
    g.clear();
    
    g.lineStyle(6, 0xffaa00, 1);
    g.strokeCircle(20, 12, 9); 
    g.fillStyle(0xffaa00, 1);
    g.fillCircle(20, 12, 4);
    g.fillStyle(0xffaa00, 1);
    g.fillRect(17, 21, 6, 25); 
    g.fillRect(23, 28, 8, 5); 
    g.fillRect(23, 38, 8, 5); 
    g.generateTexture("ui_key", 40, 50);
    g.clear();

    g.fillStyle(0x888899, 1); 
    g.beginPath();
    g.moveTo(10, 5);
    g.lineTo(25, 0);
    g.lineTo(35, 10);
    g.lineTo(30, 30);
    g.lineTo(5, 25);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xaaccff, 1);
    g.strokePath();
    g.lineStyle(2, 0x000000, 0.5);
    g.moveTo(15, 10); g.lineTo(25, 15);
    g.strokePath();
    g.generateTexture("ui_debris_icon", 40, 40);
    g.clear();

    g.destroy();
  }
}