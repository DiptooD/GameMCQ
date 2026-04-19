class PlayerShipTextures {
    static init(scene) {
        let g = scene.make.graphics({ add: false });

        const createEvolutionarySet = (baseId, drawFn, bulletFn) => {
            for (let i = 1; i <= 4; i++) {
                const key = `${baseId}_lv${i}`;
                if (!scene.textures.exists(key)) {
                    g.clear();
                    drawFn(g, i); 
                    g.generateTexture(key, 180, 180); 
                }
            }
            if(bulletFn) bulletFn(g, baseId);
        };

        // ==========================================================
        // --- PREMIUM BIRDS (Cost: Keys) ---
        // ==========================================================

        // 1. Doel (Magpie Robin)
        createEvolutionarySet("ship_k1", (g, level) => {
            g.fillStyle(0x0a0a0a, 1); // True deep black
            g.lineStyle(3, 0x8899aa, 0.8); // Softer grey/blue outline
            
            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 95); g.lineTo(65, 115); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 95); g.lineTo(115, 115); g.fillPath(); g.strokePath();
            
            // Bright white stark contrast highlights
            g.fillStyle(0xffffff, 1);
            g.fillRect(35, 90, 25, 6); g.fillRect(120, 90, 25, 6);

            g.fillStyle(0x111111, 1);
            g.beginPath(); g.moveTo(85, 100); g.lineTo(70, 145); g.lineTo(110, 145); g.lineTo(95, 100); g.fillPath(); g.strokePath();
            g.fillStyle(0xffffff, 1);
            g.fillRect(72, 115, 5, 30); g.fillRect(103, 115, 5, 30);

            g.fillStyle(0x0a0a0a, 1); 
            g.fillEllipse(90, 80, 40, 60); g.strokeEllipse(90, 80, 40, 60);
            g.fillStyle(0xffffff, 1); 
            g.fillEllipse(90, 88, 24, 40);

            g.fillStyle(0x111111, 1);
            g.fillCircle(90, 55, 16); g.strokeCircle(90, 55, 16);
            g.fillStyle(0x00ffff, 1); // Neon cyan beak
            g.fillTriangle(86, 45, 94, 45, 90, 25); g.strokeTriangle(86, 45, 94, 45, 90, 25);

            if (level >= 2) {
                g.fillStyle(0x00ffff, 1); 
                g.fillCircle(35, 100, 4); g.fillCircle(145, 100, 4);
            }
            if (level >= 3) {
                g.lineStyle(3, 0x00ffff, 0.9);
                g.strokeEllipse(90, 80, 44, 64);
            }
            if (level >= 4) {
                g.fillStyle(0x00ffff, 0.8);
                g.fillTriangle(75, 140, 105, 140, 90, 175); 
                g.fillStyle(0xffffff, 1);
                g.fillTriangle(82, 140, 98, 140, 90, 165);
            }
        }, (g, id) => { 
            g.clear(); // White/Cyan Laser
            g.fillStyle(0x00ffff, 0.7); g.fillRoundedRect(6, 0, 12, 36, 6);
            g.fillStyle(0xffffff, 1); g.fillRoundedRect(9, 4, 6, 28, 3);
            g.generateTexture(`bullet_${id}`, 24, 36);
            g.clear();
            g.fillStyle(0x00ffff, 0.6); g.fillRoundedRect(6, 0, 12, 30, 6);
            g.fillStyle(0xffffff, 1); g.fillRoundedRect(9, 4, 6, 22, 3);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 2. Chil (Kite)
        createEvolutionarySet("ship_k2", (g, level) => {
            g.fillStyle(0x331100, 1); // Very deep warm brown
            g.lineStyle(3, 0xff9900, 0.8); // Glowing orange/gold outline

            g.beginPath(); g.moveTo(90, 60); g.lineTo(15, 90); g.lineTo(65, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 60); g.lineTo(165, 90); g.lineTo(115, 120); g.fillPath(); g.strokePath();

            // Bright amber highlight on inner wings
            g.fillStyle(0xbb5500, 1);
            g.fillTriangle(90, 70, 35, 95, 60, 105);
            g.fillTriangle(90, 70, 145, 95, 120, 105);

            g.fillStyle(0x442200, 1); 
            g.fillEllipse(90, 80, 40, 60); g.strokeEllipse(90, 80, 40, 60);

            g.fillStyle(0x331100, 1);
            g.beginPath(); g.moveTo(75, 100); g.lineTo(55, 150); g.lineTo(90, 125); g.lineTo(125, 150); g.lineTo(105, 100); g.fillPath(); g.strokePath();

            g.fillStyle(0x221100, 1);
            g.fillCircle(90, 50, 18); g.strokeCircle(90, 50, 18);
            g.fillStyle(0xffdd00, 1); // Bright yellow beak
            g.fillTriangle(85, 40, 95, 40, 90, 20); g.strokeTriangle(85, 40, 95, 40, 90, 20);

            if (level >= 2) {
                g.fillStyle(0xffaa00, 1); 
                g.fillTriangle(25, 90, 40, 85, 30, 95); g.fillTriangle(155, 90, 140, 85, 150, 95);
            }
            if (level >= 3) {
                g.fillStyle(0xffcc00, 1);
                g.fillCircle(90, 80, 10); 
            }
            if (level >= 4) {
                g.fillStyle(0xffaa00, 0.9);
                g.fillTriangle(75, 125, 105, 125, 90, 170);
            }
        }, (g, id) => { 
            g.clear(); // Giant Golden Wind Blades
            g.fillStyle(0xffaa00, 1); g.beginPath(); g.moveTo(12,0); g.lineTo(2,36); g.lineTo(12,28); g.lineTo(22,36); g.fillPath();
            g.fillStyle(0xffffff, 1); g.beginPath(); g.moveTo(12,8); g.lineTo(8,30); g.lineTo(12,24); g.lineTo(16,30); g.fillPath();
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xffaa00, 1); g.beginPath(); g.moveTo(12,0); g.lineTo(4,30); g.lineTo(20,30); g.fillPath();
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 3. Kokil (Cuckoo)
        createEvolutionarySet("ship_k3", (g, level) => {
            g.fillStyle(0x0a0a0a, 1); // Pitch black
            g.lineStyle(3, 0xff0044, 0.8); // Glowing neon crimson outline

            g.beginPath(); g.moveTo(90, 65); g.lineTo(15, 110); g.lineTo(65, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 65); g.lineTo(165, 110); g.lineTo(115, 120); g.fillPath(); g.strokePath();

            g.beginPath(); g.moveTo(85, 100); g.lineTo(80, 160); g.lineTo(100, 160); g.lineTo(95, 100); g.fillPath(); g.strokePath();

            g.fillStyle(0x111111, 1);
            g.fillEllipse(90, 80, 32, 60); g.strokeEllipse(90, 80, 32, 60);
            g.fillCircle(90, 50, 16); g.strokeCircle(90, 50, 16);

            g.fillStyle(0xff0000, 1); // Neon eye
            g.fillCircle(85, 47, 4); g.fillCircle(95, 47, 4);
            g.fillStyle(0x550011, 1); // Deep red beak
            g.fillTriangle(86, 40, 94, 40, 90, 25); g.strokeTriangle(86, 40, 94, 40, 90, 25);

            if (level >= 2) {
                g.fillStyle(0xff0044, 1); // Bright crimson patches
                g.fillRect(40, 110, 20, 4); g.fillRect(120, 110, 20, 4);
            }
            if (level >= 3) {
                g.lineStyle(3, 0xff0044, 0.9);
                g.strokeEllipse(90, 80, 42, 76); 
            }
            if (level >= 4) {
                g.fillStyle(0xff0044, 1); 
                g.fillTriangle(85, 50, 95, 50, 90, 25);
                g.fillStyle(0xaa0022, 0.8);
                g.fillTriangle(80, 160, 100, 160, 90, 185);
            }
        }, (g, id) => { 
            g.clear(); // Massive Crimson Laser block
            g.fillStyle(0xff0022, 0.8); g.fillRect(6, 0, 12, 36);
            g.fillStyle(0xffffff, 1); g.fillRect(10, 4, 4, 28);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear(); // Side block
            g.fillStyle(0xff0022, 0.8); g.fillCircle(12, 18, 10);
            g.fillStyle(0xffffff, 1); g.fillCircle(12, 18, 4);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 4. Shakun (Vulture)
        createEvolutionarySet("ship_k4", (g, level) => {
            g.fillStyle(0x1a1a1a, 1); // Deep charcoal
            g.lineStyle(3, 0x44ff44, 0.7); // Toxic green outline

            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 70); g.lineTo(15, 120); g.lineTo(70, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 70); g.lineTo(165, 120); g.lineTo(110, 110); g.fillPath(); g.strokePath();

            g.fillStyle(0x2a2a2a, 1); 
            g.fillEllipse(90, 85, 45, 60); g.strokeEllipse(90, 85, 45, 60);

            g.fillStyle(0xaa9988, 1); // Desaturated flesh
            g.fillRect(85, 35, 10, 25);
            g.fillCircle(90, 30, 14); g.strokeCircle(90, 30, 14);
            
            g.fillStyle(0x111111, 1); 
            g.fillTriangle(85, 25, 95, 25, 90, 5); g.strokeTriangle(85, 25, 95, 25, 90, 5);

            if (level >= 2) {
                g.fillStyle(0x44ff44, 1); // Acid green neck collar
                g.fillEllipse(90, 55, 24, 12);
            }
            if (level >= 3) {
                g.fillStyle(0x44ff44, 1); 
                g.fillCircle(40, 115, 8); g.fillCircle(140, 115, 8);
            }
            if (level >= 4) {
                g.fillStyle(0x44ff44, 0.8);
                g.fillTriangle(15, 120, 35, 120, 25, 150); 
                g.fillTriangle(165, 120, 145, 120, 155, 150);
                g.fillTriangle(90, 115, 75, 155, 105, 155);
            }
        }, (g, id) => { 
            g.clear(); // Huge Green Bio-Plasma Orbs
            g.fillStyle(0x00ff00, 0.6); g.fillCircle(12, 18, 12);
            g.fillStyle(0xccffcc, 1); g.fillCircle(12, 16, 6);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0x00cc00, 1); g.fillTriangle(12, 0, 4, 30, 20, 30);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 5. Sada Bok (Egret)
        createEvolutionarySet("ship_k5", (g, level) => {
            g.fillStyle(0x8899aa, 1); // Deep cool grey
            g.lineStyle(3, 0xffffff, 0.9); // Brilliant white outline

            g.beginPath(); g.moveTo(90, 80); g.lineTo(15, 70); g.lineTo(35, 110); g.lineTo(80, 105); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 80); g.lineTo(165, 70); g.lineTo(145, 110); g.lineTo(100, 105); g.fillPath(); g.strokePath();

            // Inner white highlight
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(90, 85, 45, 95, 75, 100);
            g.fillTriangle(90, 85, 135, 95, 105, 100);

            g.fillStyle(0xdddddd, 1);
            g.fillEllipse(90, 95, 30, 55); g.strokeEllipse(90, 95, 30, 55);
            g.fillRect(86, 20, 8, 60); 

            g.fillCircle(90, 18, 12); g.strokeCircle(90, 18, 12);
            g.fillStyle(0xffaa00, 1); // Bright gold beak
            g.fillTriangle(87, 12, 93, 12, 90, -5); g.strokeTriangle(87, 12, 93, 12, 90, -5);

            g.fillStyle(0x223344, 1);
            g.fillRect(86, 120, 3, 40); g.fillRect(91, 120, 3, 40);

            if (level >= 2) {
                g.fillStyle(0x00ffff, 1); 
                g.fillCircle(25, 80, 5); g.fillCircle(155, 80, 5);
            }
            if (level >= 3) {
                g.lineStyle(3, 0x00ffff, 0.9);
                g.beginPath(); g.moveTo(90, 30); g.lineTo(90, 150); g.strokePath(); 
            }
            if (level >= 4) {
                g.fillStyle(0x00ffff, 0.7);
                g.fillRect(30, 105, 6, 35); 
                g.fillRect(144, 105, 6, 35);
            }
        }, (g, id) => { 
            g.clear(); // Holy Light Beams
            g.fillStyle(0xffffff, 1); g.fillRect(8, 0, 8, 36);
            g.fillStyle(0x00ffff, 0.6); g.fillRect(6, 4, 12, 28);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xffffff, 1); g.fillCircle(12, 15, 8);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 6. Pyacha (Owl)
        createEvolutionarySet("ship_k6", (g, level) => {
            g.fillStyle(0x1a0d00, 1); // Deep wood/night color
            g.lineStyle(3, 0xff00ff, 0.8); // Vibrant magenta glow

            g.beginPath(); g.moveTo(90, 80); g.lineTo(15, 110); g.lineTo(70, 125); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 80); g.lineTo(165, 110); g.lineTo(110, 125); g.fillPath(); g.strokePath();

            g.fillStyle(0x331a00, 1); 
            g.fillEllipse(90, 85, 50, 65); g.strokeEllipse(90, 85, 50, 65);

            g.fillStyle(0x221100, 1); 
            g.fillCircle(90, 50, 28); g.strokeCircle(90, 50, 28);
            
            g.fillStyle(0xffcc00, 1); // Bright Gold eyes
            g.fillCircle(78, 48, 10); g.fillCircle(102, 48, 10);
            g.fillStyle(0x000000, 1);
            g.fillCircle(78, 48, 4); g.fillCircle(102, 48, 4);

            g.fillStyle(0x111111, 1);
            g.fillTriangle(85, 55, 95, 55, 90, 70); g.strokeTriangle(85, 55, 95, 55, 90, 70);

            if (level >= 2) {
                g.fillStyle(0xff00ff, 1); // Sharp magenta wingtips
                g.fillTriangle(15, 110, 35, 120, 15, 130);
                g.fillTriangle(165, 110, 145, 120, 165, 130);
            }
            if (level >= 3) {
                g.fillStyle(0xff00ff, 0.9);
                g.fillCircle(90, 85, 12);
                g.fillCircle(78, 48, 4); g.fillCircle(102, 48, 4); 
            }
            if (level >= 4) {
                g.fillStyle(0xff00ff, 0.8);
                g.fillTriangle(75, 40, 85, 50, 60, 20); 
                g.fillTriangle(105, 40, 95, 50, 120, 20);
            }
        }, (g, id) => { 
            g.clear(); // Massive Purple Crescents
            g.fillStyle(0xaa00ff, 1); 
            g.beginPath(); g.arc(12, 18, 12, Math.PI, 0); g.lineTo(12, 36); g.closePath(); g.fillPath();
            g.fillStyle(0xffffff, 0.8);
            g.beginPath(); g.arc(12, 16, 6, Math.PI, 0); g.lineTo(12, 28); g.closePath(); g.fillPath();
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xaa00ff, 1); g.fillCircle(12, 15, 10); 
            g.fillStyle(0x000000, 1); g.fillCircle(12, 17, 5);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 7. Tia (Parrot)
        createEvolutionarySet("ship_k7", (g, level) => {
            g.fillStyle(0x002200, 1); // Deep shadowed forest green
            g.lineStyle(3, 0x00ff00, 0.8); // Vibrant neon outline

            g.beginPath(); g.moveTo(90, 65); g.lineTo(15, 100); g.lineTo(65, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 65); g.lineTo(165, 100); g.lineTo(115, 110); g.fillPath(); g.strokePath();

            // Neon green highlight on wings
            g.fillStyle(0x00ff00, 1);
            g.fillTriangle(90, 75, 35, 95, 60, 105);
            g.fillTriangle(90, 75, 145, 95, 120, 105);

            g.fillStyle(0x004411, 1); 
            g.fillEllipse(90, 80, 34, 60); g.strokeEllipse(90, 80, 34, 60);
            g.beginPath(); g.moveTo(85, 105); g.lineTo(90, 175); g.lineTo(95, 105); g.fillPath(); g.strokePath();

            g.fillCircle(90, 50, 18); g.strokeCircle(90, 50, 18);
            g.fillStyle(0xff0000, 1); // Bright red beak
            g.beginPath(); g.moveTo(84, 45); g.lineTo(96, 45); g.lineTo(90, 20); g.fillPath(); g.strokePath();

            if (level >= 2) {
                g.fillStyle(0xff0000, 1); 
                g.fillCircle(65, 80, 8); g.fillCircle(115, 80, 8);
            }
            if (level >= 3) {
                g.lineStyle(3, 0xffff00, 0.9);
                g.beginPath(); g.moveTo(15, 100); g.lineTo(165, 100); g.strokePath(); 
            }
            if (level >= 4) {
                g.fillStyle(0xffff00, 0.9);
                g.fillRect(86, 170, 8, 30);
                g.fillRect(78, 145, 6, 35);
                g.fillRect(96, 145, 6, 35);
            }
        }, (g, id) => { 
            g.clear(); // Dual Green/Red Plasma Bolts
            g.fillStyle(0x00ff00, 1); g.fillRect(6, 0, 6, 36);
            g.fillStyle(0xff0000, 1); g.fillRect(12, 0, 6, 36);
            g.fillStyle(0xffffff, 0.8); g.fillRect(9, 4, 6, 28);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xffff00, 1); g.fillCircle(12, 15, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 8. Sonali Igal (Golden Eagle)
        createEvolutionarySet("ship_k8", (g, level) => {
            g.fillStyle(0x331a00, 1); // Deep bronze base
            g.lineStyle(3, 0xffcc00, 0.8); // Glowing bright gold outline

            g.beginPath(); g.moveTo(90, 60); g.lineTo(15, 90); g.lineTo(65, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 60); g.lineTo(165, 90); g.lineTo(115, 120); g.fillPath(); g.strokePath();

            g.fillStyle(0x885500, 1); // Mid gold body
            g.fillRoundedRect(70, 50, 40, 70, 10); g.strokeRoundedRect(70, 50, 40, 70, 10);
            
            g.fillStyle(0xffcc00, 1); // Bright head
            g.fillCircle(90, 45, 18); g.strokeCircle(90, 45, 18);
            g.fillStyle(0x111111, 1); 
            g.fillTriangle(84, 35, 96, 35, 90, 5); g.strokeTriangle(84, 35, 96, 35, 90, 5);

            if (level >= 2) {
                g.fillStyle(0xffffff, 1); 
                g.fillRect(85, 55, 10, 45); 
                g.fillTriangle(75, 115, 105, 115, 90, 145); 
            }
            if (level >= 3) {
                g.fillStyle(0xffffff, 0.9); 
                g.beginPath(); g.moveTo(70, 70); g.lineTo(20, 85); g.lineTo(50, 100); g.fillPath();
                g.beginPath(); g.moveTo(110, 70); g.lineTo(160, 85); g.lineTo(130, 100); g.fillPath();
            }
            if (level >= 4) {
                g.fillStyle(0xffdd22, 1); // Intense gold armor
                g.fillTriangle(30, 85, 60, 85, 45, 115);
                g.fillTriangle(150, 85, 120, 85, 135, 115);
                g.lineStyle(3, 0xffffff, 0.9);
                g.strokeTriangle(30, 85, 60, 85, 45, 115);
                g.strokeTriangle(150, 85, 120, 85, 135, 115);
            }
        }, (g, id) => { 
            g.clear(); // Thick Golden Lightning
            g.fillStyle(0xffaa00, 0.8); g.fillTriangle(12,0, 2,20, 22,20); g.fillTriangle(12,36, 2,16, 22,16);
            g.fillStyle(0xffffff, 1); g.fillTriangle(12,4, 6,18, 18,18); g.fillTriangle(12,32, 6,14, 18,14);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xffcc00, 1); g.fillCircle(12, 15, 12); g.fillStyle(0xffffff, 1); g.fillCircle(12, 15, 6);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });


        // ==========================================================
        // --- DEBRIS BIRDS/ANIMALS (Cost: Debris) ---
        // ==========================================================

        // 1. Charui (Sparrow)
        createEvolutionarySet("ship_d1", (g, level) => {
            g.fillStyle(0x331a0a, 1); // Deep earth shadow
            g.lineStyle(3, 0xff8800, 0.8); // Glowing orange highlight

            g.beginPath(); g.moveTo(90, 75); g.lineTo(15, 95); g.lineTo(65, 105); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 75); g.lineTo(165, 95); g.lineTo(115, 105); g.fillPath(); g.strokePath();

            g.fillStyle(0x663311, 1); // Mid brown
            g.fillEllipse(90, 85, 32, 50); g.strokeEllipse(90, 85, 32, 50);
            g.fillRect(80, 100, 20, 25); 

            g.fillCircle(90, 65, 15); g.strokeCircle(90, 65, 15);
            g.fillStyle(0x111111, 1); 
            g.fillTriangle(85, 58, 95, 58, 90, 45); g.strokeTriangle(85, 58, 95, 58, 90, 45);

            if (level >= 2) {
                g.fillStyle(0xff8800, 1); // Orange pop
                g.fillRect(75, 62, 30, 6); 
            }
            if (level >= 3) {
                g.fillStyle(0xff8800, 1); 
                g.fillCircle(90, 125, 8); 
            }
            if (level >= 4) {
                g.fillStyle(0xffaa00, 0.9);
                g.fillRect(86, 125, 8, 25);
            }
        }, (g, id) => { 
            g.clear(); // Big Orange Energy Seeds
            g.fillStyle(0xff6600, 0.8); g.fillEllipse(12, 18, 12, 18);
            g.fillStyle(0xffffff, 1); g.fillEllipse(12, 16, 6, 12);
            g.generateTexture(`bullet_${id}`, 24, 36);
            
            g.clear();
            g.fillStyle(0xff6600, 1); g.fillCircle(12, 15, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 2. Shalik (Myna)
        createEvolutionarySet("ship_d2", (g, level) => {
            g.fillStyle(0x1a1005, 1); // Almost black sepia
            g.lineStyle(3, 0xffff00, 0.8); // Glowing yellow

            g.beginPath(); g.moveTo(90, 75); g.lineTo(15, 105); g.lineTo(65, 115); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 75); g.lineTo(165, 105); g.lineTo(115, 115); g.fillPath(); g.strokePath();

            g.fillStyle(0x3a2010, 1);
            g.fillEllipse(90, 85, 36, 50); g.strokeEllipse(90, 85, 36, 50);
            g.fillRect(78, 105, 24, 30);
            
            g.fillStyle(0x0a0a0a, 1); 
            g.fillCircle(90, 60, 16); g.strokeCircle(90, 60, 16);
            g.fillStyle(0xffff00, 1); // Bright yellow beak
            g.fillTriangle(85, 50, 95, 50, 90, 25); g.strokeTriangle(85, 50, 95, 50, 90, 25);
            g.fillCircle(81, 58, 4); g.fillCircle(99, 58, 4); 
            
            if (level >= 2) {
                g.fillStyle(0xffffff, 1); 
                g.fillCircle(50, 100, 6); g.fillCircle(130, 100, 6);
            }
            if (level >= 3) {
                g.fillStyle(0xffff00, 0.9); 
                g.fillCircle(90, 135, 8);
            }
            if (level >= 4) {
                g.fillStyle(0xffff00, 1);
                g.fillTriangle(85, 50, 95, 50, 90, 28);
            }
        }, (g, id) => { 
            g.clear(); // Yellow Sonic Rings
            g.lineStyle(6, 0xffff00, 1); g.strokeEllipse(12, 18, 10, 16);
            g.fillStyle(0xffffff, 0.5); g.fillEllipse(12, 18, 5, 10);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.lineStyle(5, 0xffff00, 1); g.strokeCircle(12, 15, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 3. Kak (Crow)
        createEvolutionarySet("ship_d3", (g, level) => {
            g.fillStyle(0x110022, 1); // Very deep dark violet
            g.lineStyle(3, 0x00ffff, 0.8); // Neon cyan outline

            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 105); g.lineTo(45, 120); g.lineTo(75, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 105); g.lineTo(135, 120); g.lineTo(105, 110); g.fillPath(); g.strokePath();

            g.fillStyle(0x221133, 1);
            g.fillEllipse(90, 85, 40, 60); g.strokeEllipse(90, 85, 40, 60);
            g.fillTriangle(75, 110, 105, 110, 90, 150); g.strokeTriangle(75, 110, 105, 110, 90, 150);
            
            g.fillCircle(90, 55, 18); g.strokeCircle(90, 55, 18);
            g.fillStyle(0x000000, 1); // Pitch black beak
            g.fillTriangle(84, 45, 96, 45, 90, 10); g.strokeTriangle(84, 45, 96, 45, 90, 10);

            if (level >= 2) {
                g.fillStyle(0xaa00ff, 1); // Bright purple accent
                g.fillTriangle(70, 80, 40, 100, 65, 105);
                g.fillTriangle(110, 80, 140, 100, 115, 105);
            }
            if (level >= 3) {
                g.fillStyle(0x00ffff, 1); 
                g.fillCircle(90, 80, 10);
            }
            if (level >= 4) {
                g.fillStyle(0x00ffff, 0.8);
                g.fillTriangle(75, 150, 105, 150, 90, 175);
                g.fillTriangle(70, 140, 80, 140, 65, 165);
                g.fillTriangle(110, 140, 100, 140, 115, 165);
            }
        }, (g, id) => { 
            g.clear(); // Dark Matter Shards
            g.fillStyle(0xaa00ff, 0.8); g.beginPath(); g.moveTo(12,0); g.lineTo(2,36); g.lineTo(22,36); g.fillPath();
            g.fillStyle(0x00ffff, 1); g.beginPath(); g.moveTo(12,6); g.lineTo(6,30); g.lineTo(18,30); g.fillPath();
            g.generateTexture(`bullet_${id}`, 24, 36);
            
            g.clear();
            g.fillStyle(0x00ffff, 1); g.fillTriangle(12, 0, 4, 30, 20, 30);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 4. Badur (Fruit Bat)
        createEvolutionarySet("ship_d4", (g, level) => {
            g.fillStyle(0x220000, 1); // Deep Blood red/black
            g.lineStyle(3, 0xff2222, 0.8); // Glowing bright red

            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 50); g.lineTo(15, 80); g.lineTo(35, 115); g.lineTo(55, 100); g.lineTo(75, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 50); g.lineTo(165, 80); g.lineTo(145, 115); g.lineTo(125, 100); g.lineTo(105, 110); g.fillPath(); g.strokePath();

            g.fillStyle(0x441111, 1); 
            g.fillEllipse(90, 80, 34, 50); g.strokeEllipse(90, 80, 34, 50);
            g.fillCircle(90, 55, 16); g.strokeCircle(90, 55, 16);

            g.fillTriangle(80, 55, 72, 30, 88, 45); g.strokeTriangle(80, 55, 72, 30, 88, 45);
            g.fillTriangle(100, 55, 108, 30, 92, 45); g.strokeTriangle(100, 55, 108, 30, 92, 45);

            if (level >= 2) {
                g.lineStyle(2, 0xff5555, 0.7); 
                g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 80); g.strokePath();
                g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 80); g.strokePath();
                g.beginPath(); g.moveTo(90, 70); g.lineTo(35, 115); g.strokePath();
                g.beginPath(); g.moveTo(90, 70); g.lineTo(145, 115); g.strokePath();
            }
            if (level >= 3) {
                g.fillStyle(0xff0000, 1); 
                g.fillCircle(90, 55, 6);
                g.fillCircle(15, 80, 5); g.fillCircle(165, 80, 5);
            }
            if (level >= 4) {
                g.fillStyle(0xff0000, 0.8);
                g.fillTriangle(75, 115, 105, 115, 90, 155);
            }
        }, (g, id) => { 
            g.clear(); // Red Sonic Waves
            g.lineStyle(6, 0xff0000, 1); g.beginPath(); g.arc(12, 18, 12, Math.PI, 0); g.strokePath();
            g.fillStyle(0xffffff, 0.6); g.fillCircle(12, 15, 4);
            g.generateTexture(`bullet_${id}`, 24, 36);
            
            g.clear();
            g.fillStyle(0xff0000, 1); g.fillCircle(12, 15, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 5. Gangchil (Seagull)
        createEvolutionarySet("ship_d5", (g, level) => {
            g.fillStyle(0x002233, 1); // Deep ocean shadows
            g.lineStyle(3, 0x00ddff, 0.8); // Glowing cyan outline

            g.beginPath(); g.moveTo(90, 75); g.lineTo(15, 95); g.lineTo(75, 105); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 75); g.lineTo(165, 95); g.lineTo(105, 105); g.fillPath(); g.strokePath();

            // White bright inner wings
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(90, 80, 35, 95, 60, 100);
            g.fillTriangle(90, 80, 145, 95, 120, 100);

            g.fillStyle(0x111111, 1); // Black wingtips
            g.fillTriangle(35, 90, 15, 95, 40, 100); g.strokeTriangle(35, 90, 15, 95, 40, 100);
            g.fillTriangle(145, 90, 165, 95, 140, 100); g.strokeTriangle(145, 90, 165, 95, 140, 100);

            g.fillStyle(0xdddddd, 1); 
            g.fillEllipse(90, 85, 38, 55); g.strokeEllipse(90, 85, 38, 55);
            g.fillCircle(90, 55, 16); g.strokeCircle(90, 55, 16); 

            g.fillStyle(0xff8800, 1); 
            g.fillTriangle(85, 45, 95, 45, 90, 15); g.strokeTriangle(85, 45, 95, 45, 90, 15);

            if (level >= 2) {
                g.fillStyle(0x00ddff, 1); 
                g.fillEllipse(90, 80, 20, 35);
            }
            if (level >= 3) {
                g.fillStyle(0x00ddff, 1); 
                g.fillCircle(90, 125, 10); 
            }
            if (level >= 4) {
                g.fillStyle(0x00ddff, 0.8);
                g.fillTriangle(80, 105, 100, 105, 90, 150);
            }
        }, (g, id) => { 
            g.clear(); // Cyan/Blue Water Blasts
            g.fillStyle(0x00ddff, 0.8); g.fillEllipse(12, 18, 12, 18);
            g.fillStyle(0xffffff, 1); g.fillEllipse(12, 16, 6, 12);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0x0088ff, 1); g.fillEllipse(12, 15, 10, 15);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 6. Harigila (Adjutant Stork)
        createEvolutionarySet("ship_d6", (g, level) => {
            g.fillStyle(0x1a1a22, 1); // Dark slate
            g.lineStyle(3, 0xff6600, 0.8); // Glowing orange edge

            g.beginPath(); g.moveTo(90, 80); g.lineTo(15, 100); g.lineTo(70, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 80); g.lineTo(165, 100); g.lineTo(110, 120); g.fillPath(); g.strokePath();

            g.fillStyle(0x333344, 1); 
            g.fillEllipse(90, 95, 46, 60); g.strokeEllipse(90, 95, 46, 60);

            g.fillStyle(0xdd9977, 1); // Pale neck
            g.fillRect(84, 40, 12, 30); g.strokeRect(84, 40, 12, 30);
            g.fillCircle(90, 35, 14); g.strokeCircle(90, 35, 14);

            g.fillStyle(0x888888, 1); 
            g.fillTriangle(83, 30, 97, 30, 90, -10); g.strokeTriangle(83, 30, 97, 30, 90, -10);

            if (level >= 2) {
                g.fillStyle(0x111111, 1); 
                g.fillRect(78, 70, 24, 40); 
            }
            if (level >= 3) {
                g.fillStyle(0xff4400, 1); 
                g.fillCircle(75, 135, 10); g.fillCircle(105, 135, 10);
            }
            if (level >= 4) {
                g.fillStyle(0x111111, 0.9);
                g.fillRect(78, 120, 24, 35);
                g.fillStyle(0xff6600, 0.8);
                g.fillTriangle(78, 155, 102, 155, 90, 175);
            }
        }, (g, id) => { 
            g.clear(); // Heavy Orange Artillery
            g.fillStyle(0xff4400, 0.8); g.fillCircle(12, 18, 12); 
            g.fillStyle(0xffff00, 1); g.fillCircle(12, 18, 6);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xff4400, 1); g.fillCircle(12, 15, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });

        // 7. Rajhash (Swan/Goose)
        createEvolutionarySet("ship_d7", (g, level) => {
            g.fillStyle(0x001122, 1); // Deep ice water shadow
            g.lineStyle(3, 0x00ffff, 0.8); // Vivid cyan outline

            g.beginPath(); g.moveTo(90, 85); g.lineTo(15, 130); g.lineTo(70, 135); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 85); g.lineTo(165, 130); g.lineTo(110, 135); g.fillPath(); g.strokePath();

            // Brilliant white inner highlight
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(90, 95, 35, 120, 70, 125);
            g.fillTriangle(90, 95, 145, 120, 110, 125);

            g.fillStyle(0xddddff, 1); 
            g.fillEllipse(90, 100, 40, 55); g.strokeEllipse(90, 100, 40, 55);
            
            g.fillRect(84, 35, 12, 45); g.strokeRect(84, 35, 12, 45);
            g.fillCircle(90, 30, 16); g.strokeCircle(90, 30, 16);
            
            g.fillStyle(0xff8800, 1); // Bright orange beak
            g.fillTriangle(84, 25, 96, 25, 90, 0); g.strokeTriangle(84, 25, 96, 25, 90, 0);

            if (level >= 2) {
                g.fillStyle(0x00ffff, 1); 
                g.fillRect(84, 85, 12, 45); 
            }
            if (level >= 3) {
                g.fillStyle(0x00ffff, 1); 
                g.fillCircle(45, 120, 10); g.fillCircle(135, 120, 10);
            }
            if (level >= 4) {
                g.fillStyle(0xffffff, 0.9);
                g.fillTriangle(70, 135, 110, 135, 90, 170);
                g.fillStyle(0x00ffff, 0.8);
                g.fillTriangle(80, 135, 100, 135, 90, 160);
            }
        }, (g, id) => { 
            g.clear(); // Cyan Frost Shards
            g.fillStyle(0x00ffff, 0.8); g.beginPath(); g.moveTo(12,0); g.lineTo(2,36); g.lineTo(22,36); g.fillPath();
            g.fillStyle(0xffffff, 1); g.beginPath(); g.moveTo(12,6); g.lineTo(8,30); g.lineTo(16,30); g.fillPath();
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0x00ffff, 1); g.fillTriangle(12, 0, 4, 30, 20, 30);
            g.generateTexture(`side_bullet_${id}`, 24, 30);
        });
        
        g.destroy();
    }
}