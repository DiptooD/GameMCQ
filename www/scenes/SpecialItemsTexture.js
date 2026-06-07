class SpecialItemsTexture {
    static init(scene) {
        let g = scene.make.graphics({ add: false });

        // ==========================================
        // 1. SPECIAL SHIP: PHANTOM X1
        // ==========================================
        const drawPhantom = (level) => {
            g.clear();
            g.fillStyle(0x0a0a0a, 0.9); // Dark translucent core
            g.lineStyle(3, 0xffffff, 0.8); // Bright silver lines
            
            // Stealth angular wings
            g.beginPath(); g.moveTo(90, 40); g.lineTo(10, 110); g.lineTo(40, 130); g.lineTo(75, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 40); g.lineTo(170, 110); g.lineTo(140, 130); g.lineTo(105, 110); g.fillPath(); g.strokePath();
            
            g.fillStyle(0x000000, 1);
            g.fillTriangle(75, 110, 105, 110, 90, 160); g.strokeTriangle(75, 110, 105, 110, 90, 160);
            
            g.fillStyle(0x222222, 1); 
            g.fillEllipse(90, 80, 24, 60); g.strokeEllipse(90, 80, 24, 60);
            
            // Neon cyan eye
            g.fillStyle(0x00ffff, 1);
            g.fillTriangle(86, 50, 94, 50, 90, 80);

            if (level >= 2) {
                g.fillStyle(0xffffff, 0.8);
                g.fillRect(35, 110, 8, 30); g.fillRect(137, 110, 8, 30);
            }
            if (level >= 3) {
                g.lineStyle(2, 0x00ffff, 1);
                g.strokeEllipse(90, 80, 30, 70);
            }
            if (level >= 4) {
                g.fillStyle(0x00ffff, 0.6);
                g.fillTriangle(75, 160, 105, 160, 90, 185);
            }
        };

        for (let i = 1; i <= 4; i++) {
            if (!scene.textures.exists(`ship_special_phantom_lv${i}`)) {
                drawPhantom(i);
                g.generateTexture(`ship_special_phantom_lv${i}`, 180, 180);
            }
        }
        
        // Phantom Bullets
        if (!scene.textures.exists(`bullet_ship_special_phantom`)) {
            g.clear();
            g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(8, 0, 8, 40, 4);
            g.fillStyle(0x00ffff, 0.5); g.fillRoundedRect(6, 4, 12, 32, 2);
            g.generateTexture(`bullet_ship_special_phantom`, 24, 40);
        }
        if (!scene.textures.exists(`side_bullet_ship_special_phantom`)) {
            g.clear();
            g.fillStyle(0xffffff, 1); g.fillTriangle(12, 0, 6, 20, 18, 20);
            g.generateTexture(`side_bullet_ship_special_phantom`, 24, 24);
        }

        // ==========================================
        // 2. SPECIAL SHIELDS
        // ==========================================
        // Hex Matrix Shield
        if (!scene.textures.exists("shield_hex_img")) {
            g.clear();
            g.lineStyle(3, 0x00ffcc, 0.8);
            g.fillStyle(0x00ffcc, 0.1);
            
            // Draw a big hexagon connecting points
            const size = 80;
            const cx = 85, cy = 85;
            g.beginPath();
            for(let i=0; i<6; i++) {
                const angle = i * (Math.PI / 3);
                const x = cx + size * Math.cos(angle);
                const y = cy + size * Math.sin(angle);
                if(i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.closePath();
            g.fillPath(); g.strokePath();

            // Inner Hex
            g.lineStyle(2, 0xffffff, 0.5);
            g.beginPath();
            for(let i=0; i<6; i++) {
                const angle = i * (Math.PI / 3) + 0.5;
                const x = cx + (size*0.7) * Math.cos(angle);
                const y = cy + (size*0.7) * Math.sin(angle);
                if(i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.closePath(); g.strokePath();

            g.generateTexture("shield_hex_img", 170, 170);
        }

        // Cosmic Blue Fire Shield
        if (!scene.textures.exists("shield_cosmic_img")) {
            g.clear();
            const cx = 85, cy = 85;
            for(let r=75; r>40; r-=5) {
                g.lineStyle(4, 0x0088ff, r/100);
                g.beginPath();
                for(let i=0; i<=360; i+=10) {
                    const jitter = Phaser.Math.Between(-3, 3);
                    const rad = Phaser.Math.DegToRad(i);
                    const x = cx + (r+jitter) * Math.cos(rad);
                    const y = cy + (r+jitter) * Math.sin(rad);
                    if(i===0) g.moveTo(x, y); else g.lineTo(x, y);
                }
                g.closePath(); g.strokePath();
            }
            g.fillStyle(0x0055ff, 0.2);
            g.fillCircle(cx, cy, 75);
            g.generateTexture("shield_cosmic_img", 170, 170);
        }

        // ==========================================
        // 3. SPECIAL DASH AURAS
        // ==========================================
        // Thunder Dash
        if (!scene.textures.exists("dash_lightning_img")) {
            g.clear();
            g.lineStyle(4, 0xffff00, 1);
            g.beginPath(); g.moveTo(10, 45); g.lineTo(25, 20); g.lineTo(15, 25); g.lineTo(30, 5); g.lineTo(45, 25); g.lineTo(35, 20); g.lineTo(50, 45); g.strokePath();
            
            g.lineStyle(2, 0xffffff, 0.8);
            g.beginPath(); g.moveTo(10, 45); g.lineTo(25, 20); g.lineTo(15, 25); g.lineTo(30, 5); g.lineTo(45, 25); g.lineTo(35, 20); g.lineTo(50, 45); g.strokePath();
            
            g.fillStyle(0xffaa00, 0.3);
            g.beginPath(); g.moveTo(10, 45); g.lineTo(30, 5); g.lineTo(50, 45); g.closePath(); g.fillPath();
            
            g.generateTexture("dash_lightning_img", 60, 50);
        }

        g.destroy();
    }
    
}
