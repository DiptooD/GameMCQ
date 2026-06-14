window.registerSkinPack({
    name: "Promo Release Pack",
    
    // 1. THE ITEMS DATA
    items: [
        { id: "ship_special_phantom", name: "Phantom X1 (Ship)", type: "ship", rarity: "Legendary", desc: "A ghostly stealth interceptor." },
        { id: "avatar_alien_king", name: "Alien King (Avatar)", type: "avatar", value: "👽", rarity: "Epic", desc: "Show off your cosmic royalty." },
        { id: "shield_hex", name: "Hex Matrix (Shield)", type: "shield", rarity: "Epic", desc: "High-tech honeycomb barrier." },
        { id: "shield_cosmic", name: "Cosmic Fire (Shield)", type: "shield", rarity: "Mythic", desc: "Burn with stellar blue flames." },
        { id: "trail_rainbow", name: "Bifrost (Trail)", type: "trail", rarity: "Legendary", desc: "Leave a rainbow behind you." },
        { id: "trail_void", name: "Void Particles (Trail)", type: "trail", rarity: "Epic", desc: "Dark matter engine emissions." },
        { id: "trail_bubbles", name: "Bubble Stream (Trail)", type: "trail", rarity: "Common", desc: "A fun and bubbly thruster trail." },
        { id: "dash_lightning", name: "Thunder Dash (Dash)", type: "dash", rarity: "Mythic", desc: "Electrifying golden strike aura." },
        
        // Upgraded HUDs
        { id: "hud_glassmorphism", name: "Clear Glassmorphism", type: "hud", rarity: "Epic", desc: "Ultra-clear glass, subtle hex nodes, and high-tech glare." },
        { id: "hud_military", name: "Tactical Sci-Fi", type: "hud", rarity: "Legendary", desc: "Sleek targeting reticles, chamfered borders, and clean data lines." },
        { id: "hud_retro", name: "Arcade Retro", type: "hud", rarity: "Common", desc: "Vaporwave sun, 3D synthwave grid, and pixel invaders." },
        { id: "hud_jungle", name: "Wild Jungle", type: "hud", rarity: "Mythic", desc: "Bamboo frame, vibrant vines, and glowing predator eyes." },
        
        // Re-imagined Batteries
        { id: "battery_plasma", name: "Plasma Tube", type: "battery", rarity: "Legendary", desc: "Liquid plasma containment unit." },
        { id: "battery_nuke", name: "Nuclear Core", type: "battery", rarity: "Epic", desc: "Highly unstable radioactive isotope cell with hazard stripes." },
        { id: "battery_soul", name: "Arcane Soul", type: "battery", rarity: "Mythic", desc: "Ancient magical energy sealed in a runic flask." }
    ],

    // 2. THE PROMO CODES
    promoCodes: {
        "PHANTOM26": "ship_special_phantom",
        "KINGALIEN": "avatar_alien_king",
        "HEXDEFENSE": "shield_hex",
        "BIFROST": "trail_rainbow",
        "THUNDERDASH": "dash_lightning",
        "VOIDTRAIL": "trail_void",
        "VIPBUBBLES": "trail_bubbles",
        "COSMICFIRE": "shield_cosmic",
        "GLASSHUD": "hud_glassmorphism",
        "TACTICAL" : "hud_military",
        "ARCADE" : "hud_retro",
        "WILD" : "hud_jungle",
        "PLASMACELL" : "battery_plasma",
        "NUKECELL" : "battery_nuke",
        "ARCANE" : "battery_soul"
    },

    // 3. TEXTURE GENERATOR (For the Shop / Previews)
    initTextures: function(scene) {
        let g = scene.make.graphics({ add: false });

        // Phantom Ship
        const drawPhantom = (level) => {
            g.clear();
            g.fillStyle(0x0a0a0a, 0.9); 
            g.lineStyle(3, 0xffffff, 0.8); 
            g.beginPath(); g.moveTo(90, 40); g.lineTo(10, 110); g.lineTo(40, 130); g.lineTo(75, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 40); g.lineTo(170, 110); g.lineTo(140, 130); g.lineTo(105, 110); g.fillPath(); g.strokePath();
            g.fillStyle(0x000000, 1);
            g.fillTriangle(75, 110, 105, 110, 90, 160); g.strokeTriangle(75, 110, 105, 110, 90, 160);
            g.fillStyle(0x222222, 1); 
            g.fillEllipse(90, 80, 24, 60); g.strokeEllipse(90, 80, 24, 60);
            g.fillStyle(0x00ffff, 1);
            g.fillTriangle(86, 50, 94, 50, 90, 80);

            if (level >= 2) { g.fillStyle(0xffffff, 0.8); g.fillRect(35, 110, 8, 30); g.fillRect(137, 110, 8, 30); }
            if (level >= 3) { g.lineStyle(2, 0x00ffff, 1); g.strokeEllipse(90, 80, 30, 70); }
            if (level >= 4) { g.fillStyle(0x00ffff, 0.6); g.fillTriangle(75, 160, 105, 160, 90, 185); }
        };

        for (let i = 1; i <= 4; i++) {
            if (!scene.textures.exists(`ship_special_phantom_lv${i}`)) {
                drawPhantom(i); g.generateTexture(`ship_special_phantom_lv${i}`, 180, 180);
            }
        }
        
        if (!scene.textures.exists(`bullet_ship_special_phantom`)) {
            g.clear(); g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(8, 0, 8, 40, 4);
            g.fillStyle(0x00ffff, 0.5); g.fillRoundedRect(6, 4, 12, 32, 2);
            g.generateTexture(`bullet_ship_special_phantom`, 24, 40);
        }
        if (!scene.textures.exists(`side_bullet_ship_special_phantom`)) {
            g.clear(); g.fillStyle(0xffffff, 1); g.fillTriangle(12, 0, 6, 20, 18, 20);
            g.generateTexture(`side_bullet_ship_special_phantom`, 24, 24);
        }

        // Shields & Dashes
        if (!scene.textures.exists("shield_hex_img")) {
            g.clear(); g.lineStyle(3, 0x00ffcc, 0.8); g.fillStyle(0x00ffcc, 0.1);
            const size = 80; const cx = 85, cy = 85;
            g.beginPath();
            for(let i=0; i<6; i++) {
                const angle = i * (Math.PI / 3);
                const x = cx + size * Math.cos(angle); const y = cy + size * Math.sin(angle);
                if(i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.closePath(); g.fillPath(); g.strokePath();
            g.lineStyle(2, 0xffffff, 0.5); g.beginPath();
            for(let i=0; i<6; i++) {
                const angle = i * (Math.PI / 3) + 0.5;
                const x = cx + (size*0.7) * Math.cos(angle); const y = cy + (size*0.7) * Math.sin(angle);
                if(i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.closePath(); g.strokePath(); g.generateTexture("shield_hex_img", 170, 170);
        }

        if (!scene.textures.exists("shield_cosmic_img")) {
            g.clear(); const cx = 85, cy = 85;
            for(let r=75; r>40; r-=5) {
                g.lineStyle(4, 0x0088ff, r/100); g.beginPath();
                for(let i=0; i<=360; i+=10) {
                    const jitter = Phaser.Math.Between(-3, 3); const rad = Phaser.Math.DegToRad(i);
                    const x = cx + (r+jitter) * Math.cos(rad); const y = cy + (r+jitter) * Math.sin(rad);
                    if(i===0) g.moveTo(x, y); else g.lineTo(x, y);
                }
                g.closePath(); g.strokePath();
            }
            g.fillStyle(0x0055ff, 0.2); g.fillCircle(cx, cy, 75); g.generateTexture("shield_cosmic_img", 170, 170);
        }

        if (!scene.textures.exists("dash_lightning_img")) {
            g.clear(); g.lineStyle(4, 0xffff00, 1);
            g.beginPath(); g.moveTo(10, 45); g.lineTo(25, 20); g.lineTo(15, 25); g.lineTo(30, 5); g.lineTo(45, 25); g.lineTo(35, 20); g.lineTo(50, 45); g.strokePath();
            g.lineStyle(2, 0xffffff, 0.8);
            g.beginPath(); g.moveTo(10, 45); g.lineTo(25, 20); g.lineTo(15, 25); g.lineTo(30, 5); g.lineTo(45, 25); g.lineTo(35, 20); g.lineTo(50, 45); g.strokePath();
            g.fillStyle(0xffaa00, 0.3);
            g.beginPath(); g.moveTo(10, 45); g.lineTo(30, 5); g.lineTo(50, 45); g.closePath(); g.fillPath();
            g.generateTexture("dash_lightning_img", 60, 50);
        }

        // ============================================
        // SHOP PREVIEWS FOR HUDS
        // ============================================
        if (!scene.textures.exists("hud_glassmorphism_img")) {
            g.clear(); 
            g.fillStyle(0x001122, 0.3); g.fillRoundedRect(5, 5, 90, 90, 12);
            g.fillStyle(0xffffff, 0.05); g.fillRoundedRect(7, 7, 86, 86, 10); // Frosted effect
            g.lineStyle(15, 0xffffff, 0.1); g.beginPath(); g.moveTo(20, -10); g.lineTo(-20, 30); g.strokePath(); // Glare
            // Hex node
            g.lineStyle(1, 0x00ffff, 0.6); 
            g.beginPath(); g.moveTo(70, 70); g.lineTo(80, 65); g.lineTo(90, 70); g.strokePath();
            g.fillStyle(0x00ffff, 0.8); g.fillCircle(80, 65, 2);
            g.lineStyle(2, 0x00ffff, 0.8); g.strokeRoundedRect(5, 5, 90, 90, 12);
            g.generateTexture("hud_glassmorphism_img", 100, 100);
        }
        
        if (!scene.textures.exists("hud_military_img")) {
            g.clear(); 
            g.fillStyle(0x001122, 0.8); g.fillRect(5, 5, 90, 90);
            
            // New tactical look for preview
            g.lineStyle(1.5, 0x00aaff, 1);
            g.beginPath();
            g.moveTo(15, 5); g.lineTo(85, 5); g.lineTo(95, 15); g.lineTo(95, 85); 
            g.lineTo(85, 95); g.lineTo(15, 95); g.lineTo(5, 85); g.lineTo(5, 15);
            g.closePath(); g.strokePath();

            g.lineStyle(2, 0xffffff, 1);
            g.beginPath(); g.moveTo(5, 25); g.lineTo(5, 15); g.lineTo(15, 5); g.lineTo(25, 5); g.strokePath();
            g.beginPath(); g.moveTo(95, 75); g.lineTo(95, 85); g.lineTo(85, 95); g.lineTo(75, 95); g.strokePath();

            g.lineStyle(1, 0xffffff, 0.3);
            g.strokeCircle(50, 50, 20);
            g.beginPath(); g.moveTo(45, 50); g.lineTo(55, 50); g.strokePath();
            g.beginPath(); g.moveTo(50, 45); g.lineTo(50, 55); g.strokePath();

            g.fillStyle(0xff0000, 1); g.fillCircle(20, 20, 3);
            g.generateTexture("hud_military_img", 100, 100);
        }

        if (!scene.textures.exists("hud_retro_img")) {
            g.clear(); 
            g.fillStyle(0x02001a, 0.5); g.fillRect(5, 5, 90, 90);
            // Vaporwave sun
            g.fillStyle(0xff0055, 0.5); g.beginPath(); g.arc(50, 95, 30, Math.PI, 0); g.fillPath();
            g.fillStyle(0x02001a, 1); g.fillRect(20, 85, 60, 2); g.fillRect(20, 75, 60, 2);
            // Grid
            g.lineStyle(1, 0x00ffff, 0.6);
            g.beginPath(); g.moveTo(50, 50); g.lineTo(10, 95); g.strokePath();
            g.beginPath(); g.moveTo(50, 50); g.lineTo(90, 95); g.strokePath();
            // Chromatic border
            g.lineStyle(2, 0xff0055, 0.8); g.strokeRect(4, 4, 90, 90);
            g.lineStyle(2, 0x00ffff, 0.8); g.strokeRect(6, 6, 90, 90);
            g.generateTexture("hud_retro_img", 100, 100);
        }

        if (!scene.textures.exists("hud_jungle_img")) {
            g.clear(); 
            // Deeper, darker canopy background
            g.fillStyle(0x031203, 1); 
            g.fillRoundedRect(5, 5, 90, 90, 8);
            
            // Tropical Leaf (Top-Left)
            let leaf = new Phaser.Curves.Path(5, 5);
            leaf.quadraticBezierTo(50, 50, 40, 15);
            leaf.quadraticBezierTo(5, 60, 15, 40);
            leaf.lineTo(5, 5);
            
            // Darker, richer leaf green
            g.fillStyle(0x113811, 1);
            g.fillPoints(leaf.getPoints(24), true);

            // Hanging Vine
            let vine = new Phaser.Curves.Path(70, 5);
            vine.quadraticBezierTo(75, 45, 60, 25);
            g.lineStyle(3, 0x1c591c, 1); // Subdued vine color
            vine.draw(g);

            // Bioluminescent Spores (Muted opacity and darker glow)
            g.fillStyle(0x00997a, 0.8); g.fillCircle(75, 75, 2.5); g.fillCircle(25, 80, 1.5);
            g.fillStyle(0x88aa00, 0.8); g.fillCircle(55, 85, 2);

            // Ancient Carved Stone & Aged Gold Border
            g.lineStyle(3, 0x424235, 1); g.strokeRoundedRect(5, 5, 90, 90, 8);
            g.lineStyle(1, 0xaa8c2c, 0.8); g.strokeRoundedRect(9, 9, 82, 82, 6);

            g.generateTexture("hud_jungle_img", 100, 100);
        }

        // ============================================
        // SHOP PREVIEWS FOR BATTERIES
        // ============================================
        
        // Nuclear Core
        if (!scene.textures.exists("battery_nuke_img")) {
            g.clear(); 
            g.fillStyle(0x111111, 1); g.fillRoundedRect(20, 20, 60, 60, 8);
            g.fillStyle(0x00ff00, 0.9); g.fillRoundedRect(30, 30, 40, 40, 4);
            g.lineStyle(4, 0x000000, 1); 
            g.beginPath(); g.moveTo(25, 35); g.lineTo(75, 75); g.strokePath();
            g.beginPath(); g.moveTo(25, 55); g.lineTo(55, 80); g.strokePath();
            g.beginPath(); g.moveTo(45, 25); g.lineTo(75, 50); g.strokePath();
            g.lineStyle(4, 0xffff00, 1); g.strokeRoundedRect(20, 20, 60, 60, 8);
            g.generateTexture("battery_nuke_img", 100, 100);
        }

        // Arcane Soul
        if (!scene.textures.exists("battery_soul_img")) {
            g.clear(); 
            g.fillStyle(0x0a0522, 1); 
            g.beginPath(); g.moveTo(35, 10); g.lineTo(65, 10); g.lineTo(80, 50); g.lineTo(50, 90); g.lineTo(20, 50); g.closePath(); g.fillPath();
            g.fillStyle(0x00ffff, 0.6); g.fillCircle(50, 55, 15);
            g.fillStyle(0x0088ff, 0.8); g.fillCircle(50, 55, 8);
            g.fillStyle(0xffffff, 1); g.fillCircle(40, 45, 2); g.fillCircle(60, 65, 2); g.fillCircle(65, 40, 2);
            g.lineStyle(3, 0x00ffff, 0.8); 
            g.beginPath(); g.moveTo(35, 10); g.lineTo(65, 10); g.lineTo(80, 50); g.lineTo(50, 90); g.lineTo(20, 50); g.closePath(); g.strokePath();
            g.generateTexture("battery_soul_img", 100, 100);
        }
        
        // Plasma Tube
        if (!scene.textures.exists("battery_plasma_img")) {
            g.clear(); 
            g.fillStyle(0x001122, 1); g.fillRoundedRect(10, 30, 80, 40, 10);
            g.lineStyle(4, 0x00ffff, 1); g.strokeRoundedRect(10, 30, 80, 40, 10);
            g.fillStyle(0x00ffff, 1); g.fillRoundedRect(15, 35, 60, 30, 8);
            g.fillStyle(0xffffff, 0.5); g.fillEllipse(30, 40, 10, 4);
            g.generateTexture("battery_plasma_img", 100, 100);
        }

        g.destroy();
    },

    // 4. DYNAMIC HUD RENDERERS (Fully upgraded with Rich Art and highly transparent backgrounds)
    hudRenderers: {
        "hud_glassmorphism": function(graphics, x, y, w, h) {
            // Highly transparent base for enemy visibility
            graphics.fillStyle(0x001122, 0.15); 
            graphics.fillRoundedRect(x, y, w, h, 20);

            // Frosted blur effect (simulated via overlapping faint rects)
            graphics.fillStyle(0xffffff, 0.02);
            graphics.fillRoundedRect(x+2, y+2, w-4, h-4, 18);

            // Faint floating atmospheric elements
            graphics.fillStyle(0x00ffff, 0.03);
            graphics.fillCircle(x + 100, y + 120, 140);
            graphics.fillStyle(0xff00ff, 0.02);
            graphics.fillCircle(x + w - 100, y + h - 120, 180);

            // High-tech data nodes and connecting lines
            graphics.lineStyle(1, 0x00ffff, 0.3);
            graphics.beginPath();
            graphics.moveTo(x + 20, y + h/2); 
            graphics.lineTo(x + 50, y + h/2 - 30); 
            graphics.lineTo(x + 100, y + h/2 - 30);
            graphics.strokePath();
            
            graphics.fillStyle(0x00ffff, 0.6);
            graphics.fillCircle(x + 20, y + h/2, 3);
            graphics.fillCircle(x + 50, y + h/2 - 30, 3);
            graphics.fillCircle(x + 100, y + h/2 - 30, 4);

            // Diagonal light glares (glass reflection) - thin and sharp
            graphics.lineStyle(20, 0xffffff, 0.05);
            graphics.beginPath();
            graphics.moveTo(x + 80, y - 10);
            graphics.lineTo(x - 20, y + 90);
            graphics.strokePath();

            graphics.lineStyle(60, 0xffffff, 0.03);
            graphics.beginPath();
            graphics.moveTo(x + w, y + h/2 - 50);
            graphics.lineTo(x + w/2, y + h + 50);
            graphics.strokePath();

            // Sci-fi floating hex watermark
            graphics.lineStyle(2, 0x00ffff, 0.1);
            const hexR = 40;
            graphics.beginPath();
            for(let i=0; i<=6; i++) {
                let a = i * (Math.PI/3);
                let hx = x + w - 70 + hexR * Math.cos(a); 
                let hy = y + 80 + hexR * Math.sin(a);
                if(i===0) graphics.moveTo(hx,hy); else graphics.lineTo(hx,hy);
            }
            graphics.strokePath();

            // Inner frosted edge highlight
            graphics.lineStyle(2, 0xffffff, 0.15);
            graphics.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 17);

            // Crisp clean outer outline with neon glow
            graphics.lineStyle(2, 0x00ffff, 0.6);
            graphics.strokeRoundedRect(x, y, w, h, 20);
        },

        "hud_military": function(graphics, x, y, w, h) {
            // Highly transparent tactical screen
            graphics.fillStyle(0x001122, 0.15); 
            graphics.fillRect(x, y, w, h);

            // Thin sharp border with chamfered/angled corners
            graphics.lineStyle(1.5, 0x00aaff, 0.8);
            graphics.beginPath();
            const cut = 15;
            graphics.moveTo(x + cut, y);
            graphics.lineTo(x + w - cut, y);
            graphics.lineTo(x + w, y + cut);
            graphics.lineTo(x + w, y + h - cut);
            graphics.lineTo(x + w - cut, y + h);
            graphics.lineTo(x + cut, y + h);
            graphics.lineTo(x, y + h - cut);
            graphics.lineTo(x, y + cut);
            graphics.closePath();
            graphics.strokePath();

            // Corner accents (thicker, white brackets)
            graphics.lineStyle(3, 0xffffff, 0.9);
            const cl = 20; // corner line length
            
            // Top Left Corner
            graphics.beginPath(); 
            graphics.moveTo(x, y + cl + cut); 
            graphics.lineTo(x, y + cut); 
            graphics.lineTo(x + cut, y); 
            graphics.lineTo(x + cut + cl, y); 
            graphics.strokePath();
            
            // Bottom Right Corner
            graphics.beginPath(); 
            graphics.moveTo(x + w, y + h - cl - cut); 
            graphics.lineTo(x + w, y + h - cut); 
            graphics.lineTo(x + w - cut, y + h); 
            graphics.lineTo(x + w - cut - cl, y + h); 
            graphics.strokePath();

            // Edge Tick Marks (Left and Right Data Scales)
            graphics.lineStyle(1, 0x00aaff, 0.5);
            for(let i = y + 40; i < y + h - 40; i += 20) {
                graphics.beginPath(); graphics.moveTo(x, i); graphics.lineTo(x + 6, i); graphics.strokePath();
                graphics.beginPath(); graphics.moveTo(x + w, i); graphics.lineTo(x + w - 6, i); graphics.strokePath();
            }

            // Minimalist Central Reticle / Crosshair (Very Faint)
            let cx = x + w/2, cy = y + h/2;
            let radius = Math.min(w, h) * 0.3;
            graphics.lineStyle(1, 0xffffff, 0.15);
            graphics.strokeCircle(cx, cy, radius);
            graphics.beginPath(); graphics.moveTo(cx - 15, cy); graphics.lineTo(cx + 15, cy); graphics.strokePath();
            graphics.beginPath(); graphics.moveTo(cx, cy - 15); graphics.lineTo(cx, cy + 15); graphics.strokePath();
            
            // Small status "REC" dot in the corner
            graphics.fillStyle(0xff0000, 0.8);
            graphics.fillCircle(x + 25, y + 25, 3);
        },

        "hud_retro": function(graphics, x, y, w, h) {
            // Highly transparent CRT Space background
            graphics.fillStyle(0x02001a, 0.35); 
            graphics.fillRect(x, y, w, h);

            // Retro Vaporwave Sun (Center bottom, scaled safely inside boundaries)
            let sunX = x + w/2, sunY = y + h - 5;
            let sunR = Math.min(w * 0.4, 80); 
            graphics.fillStyle(0xff0055, 0.35);
            graphics.beginPath(); 
            graphics.arc(sunX, sunY, sunR, Math.PI, 0); 
            graphics.fillPath();
            
            // Fake cutouts in the sun (using semi-transparent black to not paint opaque rects outside)
            graphics.fillStyle(0x000000, 0.3); 
            graphics.fillRect(sunX - sunR, sunY - sunR * 0.2, sunR * 2, 4);
            graphics.fillRect(sunX - sunR, sunY - sunR * 0.4, sunR * 2, 6);
            graphics.fillRect(sunX - sunR, sunY - sunR * 0.65, sunR * 2, 8);

            // Synthwave 3D Grid at the bottom (strictly constrained inside width/height)
            graphics.lineStyle(2, 0x00ffff, 0.4);
            const gridH = h * 0.4;
            const startY = y + h - gridH;
            
            // Horizon / Horizontal Grid Lines
            graphics.beginPath(); graphics.moveTo(x, startY + gridH*0.1); graphics.lineTo(x+w, startY + gridH*0.1); graphics.strokePath();
            graphics.beginPath(); graphics.moveTo(x, startY + gridH*0.3); graphics.lineTo(x+w, startY + gridH*0.3); graphics.strokePath();
            graphics.beginPath(); graphics.moveTo(x, startY + gridH*0.6); graphics.lineTo(x+w, startY + gridH*0.6); graphics.strokePath();

            // Radiating Perspective Lines (terminating exactly at the bottom edge)
            const numLines = 5;
            for(let i = 0; i <= numLines; i++) {
                let endX = x + (w / numLines) * i;
                graphics.beginPath(); 
                graphics.moveTo(sunX, startY); 
                graphics.lineTo(endX, y+h); 
                graphics.strokePath();
            }
            
            // Radiating Side Lines (terminating exactly at the left/right edges)
            graphics.beginPath(); graphics.moveTo(sunX, startY); graphics.lineTo(x, y + h - gridH*0.3); graphics.strokePath();
            graphics.beginPath(); graphics.moveTo(sunX, startY); graphics.lineTo(x, y + h - gridH*0.7); graphics.strokePath();
            graphics.beginPath(); graphics.moveTo(sunX, startY); graphics.lineTo(x+w, y + h - gridH*0.3); graphics.strokePath();
            graphics.beginPath(); graphics.moveTo(sunX, startY); graphics.lineTo(x+w, y + h - gridH*0.7); graphics.strokePath();

            // Pixel Stars (positioned relatively so they stay inside)
            graphics.fillStyle(0xffffff, 0.6);
            graphics.fillRect(x + w*0.15, y + h*0.1, 4, 4); 
            graphics.fillRect(x + w*0.85, y + h*0.25, 4, 4); 
            graphics.fillRect(x + w*0.2, y + h*0.4, 4, 4);
            graphics.fillRect(x + w*0.7, y + h*0.1, 4, 4);

            // Pixel Alien (Top Right, dynamically positioned only if wide enough)
            let ax = x + w - 40, ay = y + 15;
            if (w > 80) {
                graphics.fillStyle(0x00ff00, 0.8);
                graphics.fillRect(ax+10, ay, 10, 5); graphics.fillRect(ax+5, ay+5, 20, 5);
                graphics.fillRect(ax, ay+10, 30, 5); graphics.fillRect(ax+5, ay+15, 5, 5); graphics.fillRect(ax+20, ay+15, 5, 5);
                graphics.fillStyle(0x000000, 0.8); 
                graphics.fillRect(ax+5, ay+5, 5, 5); graphics.fillRect(ax+20, ay+5, 5, 5); // eyes
            }

            // Chromatic Aberration double border
            graphics.lineStyle(3, 0xff0055, 0.5); // Red/Pink offset
            graphics.strokeRect(x-2, y-2, w, h);
            graphics.lineStyle(3, 0x00ffff, 0.5); // Cyan offset
            graphics.strokeRect(x+2, y+2, w, h);
            
            // Clean white inner border
            graphics.lineStyle(2, 0xffffff, 0.7);
            graphics.strokeRect(x, y, w, h);
        },

        "hud_jungle": function(graphics, x, y, w, h) {
            // Highly transparent center so questions/text are completely legible
            graphics.fillStyle(0x051505, 0.20);
            graphics.fillRect(x, y, w, h);

            // Expand the bounding box so the overall frame encompasses more space
            let expand = 6;
            let fx = x - expand;
            let fy = y - expand;
            let fw = w + (expand * 2);
            let fh = h + (expand * 2);
            let thick = 10; // Keep the wood sleek, not thick

            // NEW BORDER: Balanced, slightly dimmed Olive Green Bamboo Frame
            let drawBamboo = (bx, by, bw, bh, isVertical) => {
                graphics.fillStyle(0x475924, 1); // Dimmed Olive Green base
                graphics.fillRect(bx, by, bw, bh);
                graphics.fillStyle(0x2E3A18, 0.8); // Deep olive shadow
                
                if (isVertical) {
                    graphics.fillRect(bx + bw - 3, by, 3, bh); // Right edge shadow
                    // Bamboo joints
                    for(let i = 40; i < bh; i += 60) {
                        graphics.fillRect(bx - 2, by + i, bw + 4, 4);
                        graphics.fillStyle(0x627A34, 0.8); // Muted olive highlight
                        graphics.fillRect(bx - 2, by + i - 2, bw + 4, 2);
                        graphics.fillStyle(0x2E3A18, 0.8); // Reset shadow color
                    }
                } else {
                    graphics.fillRect(bx, by + bh - 3, bw, 3); // Bottom edge shadow
                    // Bamboo joints
                    for(let i = 40; i < bw; i += 60) {
                        graphics.fillRect(bx + i, by - 2, 4, bh + 4);
                        graphics.fillStyle(0x627A34, 0.8); // Muted olive highlight
                        graphics.fillRect(bx + i - 2, by - 2, 2, bh + 4);
                        graphics.fillStyle(0x2E3A18, 0.8); // Reset shadow color
                    }
                }
            };

            // Draw the expanded border (Top, Bottom, Left, Right)
            drawBamboo(fx, fy, fw, thick, false);
            drawBamboo(fx, fy + fh - thick, fw, thick, false);
            drawBamboo(fx, fy, thick, fh, true);
            drawBamboo(fx + fw - thick, fy, thick, fh, true);

            // PALM FROND GENERATOR 
            let drawPalm = (px, py, angle, length, scale) => {
                graphics.lineStyle(4 * scale, 0x0A240A, 0.9); // Dark stem
                let ex = px + Math.cos(angle) * length;
                let ey = py + Math.sin(angle) * length;
                graphics.beginPath(); graphics.moveTo(px, py); graphics.lineTo(ex, ey); graphics.strokePath();
                
                graphics.lineStyle(3 * scale, 0x1F7A1F, 0.9); // Mid-dark jungle green
                for(let i = 0.1; i < 0.95; i += 0.08) {
                    let cx = px + (ex - px) * i;
                    let cy = py + (ey - py) * i;
                    let frondLen = (30 * scale) * Math.sin(i * Math.PI); 
                    
                    graphics.beginPath(); graphics.moveTo(cx, cy); 
                    graphics.lineTo(cx + Math.cos(angle - 0.7) * frondLen, cy + Math.sin(angle - 0.7) * frondLen); 
                    graphics.strokePath();
                    
                    graphics.beginPath(); graphics.moveTo(cx, cy); 
                    graphics.lineTo(cx + Math.cos(angle + 0.7) * frondLen, cy + Math.sin(angle + 0.7) * frondLen); 
                    graphics.strokePath();
                }
            };

            // LEAF CLUSTER FUNCTION
            let drawLeaf = (lx, ly, scale) => {
                graphics.fillStyle(0x154015, 0.95); // Deep base leaf
                graphics.fillCircle(lx, ly, 25 * scale);
                graphics.fillCircle(lx + 15*scale, ly + 10*scale, 20 * scale);
                graphics.fillCircle(lx - 5*scale, ly + 20*scale, 18 * scale);
                graphics.fillStyle(0x216639, 0.9); // Rich mossy accent
                graphics.fillCircle(lx, ly, 15 * scale);
            };

            // DIVERSE FLOWER GENERATORS 
            let drawPlumeria = (fx, fy, scale) => { // Darker Beige/Cream
                graphics.fillStyle(0x948E66, 0.90); 
                for (let i = 0; i < 5; i++) {
                    let a = (i * Math.PI * 2) / 5;
                    graphics.fillCircle(fx + Math.cos(a)*12*scale, fy + Math.sin(a)*12*scale, 14*scale);
                }
                graphics.fillStyle(0x735E00, 1); graphics.fillCircle(fx, fy, 8*scale); 
            };

            let drawHibiscus = (fx, fy, scale) => { // Deeper Burnt Terracotta
                graphics.fillStyle(0x800000, 0.95); 
                for (let i = 0; i < 5; i++) {
                    let a = (i * Math.PI * 2) / 5;
                    graphics.fillCircle(fx + Math.cos(a)*14*scale, fy + Math.sin(a)*14*scale, 16*scale);
                }
                graphics.fillStyle(0x300216, 1); graphics.fillCircle(fx, fy, 8*scale);
                // Stamen
                graphics.lineStyle(3*scale, 0x8F7200, 1); 
                graphics.beginPath(); graphics.moveTo(fx, fy); graphics.lineTo(fx - 20*scale, fy + 25*scale); graphics.strokePath();
                graphics.fillStyle(0xA88600, 1); graphics.fillCircle(fx - 20*scale, fy + 25*scale, 4*scale);
            };

            let drawLotus = (fx, fy, scale) => { // Darker Amethyst
                graphics.fillStyle(0x3D1963, 0.95); 
                for (let i = 0; i < 6; i++) {
                    let a = (i * Math.PI * 2) / 6;
                    graphics.beginPath();
                    graphics.moveTo(fx, fy);
                    graphics.lineTo(fx + Math.cos(a - 0.2)*20*scale, fy + Math.sin(a - 0.2)*20*scale);
                    graphics.lineTo(fx + Math.cos(a)*30*scale, fy + Math.sin(a)*30*scale);
                    graphics.lineTo(fx + Math.cos(a + 0.2)*20*scale, fy + Math.sin(a + 0.2)*20*scale);
                    graphics.fillPath();
                }
                graphics.fillStyle(0x0D4747, 1); graphics.fillCircle(fx, fy, 6*scale); 
            };

            // --- DRAWING THE ASSETS ---
            
            // 1. Base Foliage
            drawPalm(x, y, Math.PI/4, 150, 1.2);                 // Top Left Palm
            drawPalm(x + w, y, Math.PI*3/4, 120, 1.0);           // Top Right Palm
            drawPalm(x, y + h, -Math.PI/4, 180, 1.4);            // Bottom Left Palm
            drawPalm(x + w, y + h, -Math.PI*3/4, 140, 1.1);      // Bottom Right Palm
            
            drawLeaf(x + w/2, y, 1.0);                           // Top Center cluster
            drawLeaf(x + 20, y + h/2, 0.8);                      // Left edge cluster

            // 2. Flowers
            drawPlumeria(x + 60, y + h - 60, 1.3);               // Bottom Left (Beige)
            drawHibiscus(x + w - 70, y + h - 50, 1.2);           // Bottom Right (Terracotta)
            drawLotus(x + w - 50, y + 60, 0.9);                  // Top Right (Amethyst)
            drawPlumeria(x + w/2 + 20, y + 10, 0.7);             // Top Center (Small Beige)
            drawHibiscus(x + 30, y + h/2 + 40, 0.8);             // Left Edge (Small Terracotta)

            // 3. Ambient touches
            graphics.fillStyle(0x9E9B78, 0.4); // Soft falling petals
            graphics.beginPath(); graphics.arc(x + 100, y + h - 120, 5, 0, Math.PI); graphics.fillPath();
            graphics.beginPath(); graphics.arc(x + w - 140, y + h - 90, 4, 0, Math.PI); graphics.fillPath();
            
            graphics.fillStyle(0x8C7300, 0.5); // Warm pollen dots
            graphics.fillCircle(x + 80, y + 80, 2);
            graphics.fillCircle(x + w - 90, y + 130, 2.5);
            graphics.fillCircle(x + w/2 - 40, y + h - 40, 2);
        }
    },

    // 5. DYNAMIC BATTERY RENDERERS (Fully upgraded aesthetics)
    batteryRenderers: {
        "battery_nuke": {
            applySkin: function(boltIcon, batteryBg) {
                // Hazard Yellow/Black theme
                boltIcon.setTint(0xffff00);
                batteryBg.setFillStyle(0x1a1a1a, 0.9).setStrokeStyle(4, 0xffff00, 0.9);
            },
            renderFill: function(graphics, pct, startX, startY, barTotalWidth) {
                let color = (pct >= 1) ? 0x00ff00 : (pct > 0.7 ? 0x33ff00 : (pct > 0.3 ? 0xffff00 : 0xff0000));
                
                const w = barTotalWidth * pct;
                const h = 20;
                
                // Solid glowing base
                graphics.fillStyle(color, 0.9);
                graphics.fillRect(startX, startY, w, h);
                
                // Draw diagonal hazard stripes clipping over the fill
                graphics.lineStyle(4, 0x000000, 0.6);
                for(let i = 0; i < w + h; i += 15) {
                    let lineStartX = startX + i;
                    let lineStartY = startY;
                    let lineEndX = startX + i - h;
                    let lineEndY = startY + h;
                    
                    // Clamp lines so they don't draw outside the current fill width
                    if(lineEndX < startX) {
                        lineEndY = startY + (lineStartX - startX);
                        lineEndX = startX;
                    }
                    if(lineStartX > startX + w) {
                        lineStartY = startY + (lineStartX - (startX + w));
                        lineStartX = startX + w;
                    }
                    
                    if(lineStartX >= startX && lineEndX <= startX + w) {
                        graphics.beginPath();
                        graphics.moveTo(lineStartX, lineStartY);
                        graphics.lineTo(lineEndX, lineEndY);
                        graphics.strokePath();
                    }
                }
            }
        },
        "battery_soul": {
            applySkin: function(boltIcon, batteryBg) {
                // Mystical Ethereal Purple/Cyan theme
                boltIcon.setTint(0x00ffff);
                batteryBg.setFillStyle(0x0a0522, 0.85).setStrokeStyle(3, 0x00ffff, 0.8);
            },
            renderFill: function(graphics, pct, startX, startY, barTotalWidth) {
                let colorBase = (pct >= 1) ? 0x00ffff : (pct > 0.3 ? 0x00aaff : 0xff0055);
                let colorTop = (pct >= 1) ? 0xcc00ff : (pct > 0.3 ? 0x5500ff : 0xaa0000);
                
                const w = barTotalWidth * pct;
                const h = 20;

                // Ethereal gradient effect
                graphics.fillGradientStyle(colorTop, colorBase, colorTop, colorBase, 0.9);
                graphics.fillRect(startX, startY, w, h);

                // Draw magical energy bubbles/runes inside the liquid
                graphics.fillStyle(0xffffff, 0.6);
                const particleCount = Math.floor(w / 15);
                for(let i = 0; i < particleCount; i++) {
                    // pseudo-random based on position to keep it stable per frame
                    let px = startX + 5 + ((i * 17) % (w - 10));
                    let py = startY + 4 + ((i * 11) % 12);
                    let r = 1 + ((i * 3) % 2);
                    graphics.fillCircle(px, py, r);
                }
                
                // Add a bright core line for a "pure energy" look
                graphics.fillStyle(0xffffff, 0.4);
                graphics.fillRect(startX, startY + 8, w, 4);
            }
        },
        "battery_plasma": {
            applySkin: function(boltIcon, batteryBg) {
                boltIcon.setTint(0x00ffff);
                batteryBg.setFillStyle(0x001122, 0.8).setStrokeStyle(3, 0x00ffff, 0.8);
            },
            renderFill: function(graphics, pct, startX, startY, barTotalWidth) {
                let color = (pct >= 1) ? 0x00ffff : (pct > 0.7 ? 0x00ff00 : (pct > 0.3 ? 0xffff00 : 0xff0000));
                graphics.fillStyle(color, 0.9);
                graphics.fillRoundedRect(startX, startY, barTotalWidth * pct, 20, 5);
            }
        }
    }
});