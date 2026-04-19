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

        // 1. Machranga (Kingfisher)
        createEvolutionarySet("ship_k1", (g, level) => {
            g.fillStyle(0x00CCFF, 1); // Much brighter cyan
            g.lineStyle(4, 0xffffff, 1); // Bold outline
            
            // WINGS EXPANDED: 15 to 165 width
            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 90); g.lineTo(65, 115); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 90); g.lineTo(115, 115); g.fillPath(); g.strokePath();
            
            // Body & Tail
            g.fillStyle(0xFF6600, 1); // Neon orange
            g.fillEllipse(90, 85, 32, 50); g.strokeEllipse(90, 85, 32, 50);
            
            g.fillStyle(0x0088cc, 1); 
            g.beginPath(); g.moveTo(80, 105); g.lineTo(100, 105); g.lineTo(90, 145); g.fillPath(); g.strokePath();

            // Head & Beak
            g.fillStyle(0x00CCFF, 1);
            g.fillCircle(90, 60, 18); g.strokeCircle(90, 60, 18);
            g.fillStyle(0xff2200, 1); 
            g.fillTriangle(86, 50, 94, 50, 90, 10); g.strokeTriangle(86, 50, 94, 50, 90, 10);

            if (level >= 2) {
                g.fillStyle(0xffffff, 1); 
                g.fillRect(35, 95, 15, 4); g.fillRect(130, 95, 15, 4); 
            }
            if (level >= 3) {
                g.fillStyle(0x00ffff, 1); 
                g.fillCircle(65, 110, 6); g.fillCircle(115, 110, 6);
            }
            if (level >= 4) {
                g.fillStyle(0x00ffff, 0.9);
                g.fillTriangle(85, 135, 95, 135, 90, 170); 
                g.fillStyle(0xffffff, 1);
                g.fillTriangle(88, 135, 92, 135, 90, 160);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0x00FFFF, 1); g.fillTriangle(12, 0, 2, 36, 22, 36); 
            g.fillStyle(0xFFFFFF, 1); g.fillTriangle(12, 4, 6, 32, 18, 32);
            g.generateTexture(`bullet_${id}`, 24, 36);
            
            g.clear();
            g.fillStyle(0x00FFFF, 1); g.fillTriangle(12, 0, 4, 36, 20, 36);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 2. Chil (Kite)
        createEvolutionarySet("ship_k2", (g, level) => {
            g.fillStyle(0xDD6622, 1); // Vivid Orange/Brown
            g.lineStyle(4, 0xffffff, 1);

            g.beginPath(); g.moveTo(90, 60); g.lineTo(15, 90); g.lineTo(65, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 60); g.lineTo(165, 90); g.lineTo(115, 120); g.fillPath(); g.strokePath();

            g.fillStyle(0xCC5511, 1); 
            g.fillEllipse(90, 80, 40, 60); g.strokeEllipse(90, 80, 40, 60);

            // Forked Tail
            g.fillStyle(0xDD6622, 1);
            g.beginPath(); g.moveTo(75, 100); g.lineTo(55, 150); g.lineTo(90, 125); g.lineTo(125, 150); g.lineTo(105, 100); g.fillPath(); g.strokePath();

            g.fillStyle(0xAA4411, 1);
            g.fillCircle(90, 50, 18); g.strokeCircle(90, 50, 18);
            g.fillStyle(0xFFFF00, 1); // Bright yellow beak
            g.fillTriangle(85, 40, 95, 40, 90, 20); g.strokeTriangle(85, 40, 95, 40, 90, 20);

            if (level >= 2) {
                g.fillStyle(0xffaa00, 1); 
                g.fillTriangle(25, 90, 40, 85, 30, 95); g.fillTriangle(155, 90, 140, 85, 150, 95);
            }
            if (level >= 3) {
                g.fillStyle(0xffff00, 1);
                g.fillCircle(90, 80, 10); 
            }
            if (level >= 4) {
                g.fillStyle(0xffff00, 0.9);
                g.fillTriangle(75, 125, 105, 125, 90, 170);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFFFF00, 1); g.fillTriangle(12, 0, 2, 36, 22, 36);
            g.fillStyle(0xFFFFFF, 1); g.fillTriangle(12, 4, 6, 32, 18, 32);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xFFaa00, 1); g.fillTriangle(12, 0, 4, 36, 20, 36);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 3. Kokil (Cuckoo)
        createEvolutionarySet("ship_k3", (g, level) => {
            g.fillStyle(0x220033, 1); // Deep violet-black
            g.lineStyle(4, 0xFF3333, 1); // Crimson red outline!

            g.beginPath(); g.moveTo(90, 65); g.lineTo(15, 110); g.lineTo(65, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 65); g.lineTo(165, 110); g.lineTo(115, 120); g.fillPath(); g.strokePath();

            // Long tail
            g.beginPath(); g.moveTo(85, 100); g.lineTo(80, 160); g.lineTo(100, 160); g.lineTo(95, 100); g.fillPath(); g.strokePath();

            g.fillEllipse(90, 80, 32, 60); g.strokeEllipse(90, 80, 32, 60);
            g.fillCircle(90, 50, 16); g.strokeCircle(90, 50, 16);

            g.fillStyle(0xff0000, 1);
            g.fillCircle(85, 47, 4); g.fillCircle(95, 47, 4);
            g.fillStyle(0x8800AA, 1);
            g.fillTriangle(86, 40, 94, 40, 90, 25); g.strokeTriangle(86, 40, 94, 40, 90, 25);

            if (level >= 2) {
                g.fillStyle(0xFF0000, 1); 
                g.fillRect(40, 110, 20, 5); g.fillRect(120, 110, 20, 5);
            }
            if (level >= 3) {
                g.lineStyle(4, 0xff0000, 1);
                g.strokeEllipse(90, 80, 42, 76); 
            }
            if (level >= 4) {
                g.fillStyle(0xff0000, 1); 
                g.fillTriangle(85, 50, 95, 50, 90, 25);
                g.fillStyle(0xff0000, 0.8);
                g.fillTriangle(80, 160, 100, 160, 90, 185);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFF0000, 1); g.fillRect(8, 0, 8, 36);
            g.fillStyle(0xFFFFFF, 1); g.fillRect(10, 6, 4, 24);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xFF0000, 1); g.fillCircle(12, 18, 10); g.fillStyle(0xFFFFFF, 1); g.fillCircle(12, 18, 5);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 4. Shakun (Vulture)
        createEvolutionarySet("ship_k4", (g, level) => {
            g.fillStyle(0x664433, 1); // Warmer thick brown
            g.lineStyle(4, 0x00FF00, 1); // Neon green outline!

            // Normalized wingspan!
            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 70); g.lineTo(15, 120); g.lineTo(70, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 70); g.lineTo(165, 120); g.lineTo(110, 110); g.fillPath(); g.strokePath();

            g.fillStyle(0x885544, 1); 
            g.fillEllipse(90, 85, 45, 60); g.strokeEllipse(90, 85, 45, 60);

            g.fillStyle(0xFFCCCC, 1);
            g.fillRect(85, 35, 10, 25);
            g.fillCircle(90, 30, 14); g.strokeCircle(90, 30, 14);
            
            g.fillStyle(0x333333, 1); 
            g.fillTriangle(85, 25, 95, 25, 90, 5); g.strokeTriangle(85, 25, 95, 25, 90, 5);

            if (level >= 2) {
                g.fillStyle(0x00FF00, 1); 
                g.fillEllipse(90, 55, 24, 12);
            }
            if (level >= 3) {
                g.fillStyle(0x00FF00, 1); 
                g.fillCircle(40, 115, 8); g.fillCircle(140, 115, 8);
            }
            if (level >= 4) {
                g.fillStyle(0x00FF00, 0.9);
                g.fillTriangle(15, 120, 35, 120, 25, 150); 
                g.fillTriangle(165, 120, 145, 120, 155, 150);
                g.fillTriangle(90, 115, 75, 155, 105, 155);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0x00FF00, 1); g.fillEllipse(12, 18, 12, 18);
            g.fillStyle(0xFFFFFF, 1); g.fillEllipse(12, 14, 6, 12);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0x00FF00, 1); g.fillTriangle(12, 0, 2, 36, 22, 36);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 5. Sada Bok (Egret)
        createEvolutionarySet("ship_k5", (g, level) => {
            g.fillStyle(0xFFFFFF, 1); // Pure white
            g.lineStyle(4, 0x00AAFF, 1); // Vibrant blue outline

            g.beginPath(); g.moveTo(90, 80); g.lineTo(15, 70); g.lineTo(35, 110); g.lineTo(80, 105); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 80); g.lineTo(165, 70); g.lineTo(145, 110); g.lineTo(100, 105); g.fillPath(); g.strokePath();

            g.fillEllipse(90, 95, 30, 55); g.strokeEllipse(90, 95, 30, 55);
            g.fillRect(86, 20, 8, 60); 

            g.fillCircle(90, 18, 12); g.strokeCircle(90, 18, 12);
            g.fillStyle(0xFFFF00, 1); 
            g.fillTriangle(87, 12, 93, 12, 90, -5); g.strokeTriangle(87, 12, 93, 12, 90, -5);

            g.fillStyle(0x222222, 1);
            g.fillRect(86, 120, 3, 40); g.fillRect(91, 120, 3, 40);

            if (level >= 2) {
                g.fillStyle(0x00FFFF, 1); 
                g.fillCircle(25, 80, 5); g.fillCircle(155, 80, 5);
            }
            if (level >= 3) {
                g.lineStyle(4, 0x00FFFF, 1);
                g.beginPath(); g.moveTo(90, 30); g.lineTo(90, 150); g.strokePath(); 
            }
            if (level >= 4) {
                g.fillStyle(0x00FFFF, 0.9);
                g.fillRect(30, 105, 6, 35); 
                g.fillRect(144, 105, 6, 35);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFFFFFF, 1); g.fillRect(8, 0, 8, 36);
            g.fillStyle(0x00FFFF, 1); g.fillRect(10, 6, 4, 24);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xFFFFFF, 1); g.fillCircle(12, 18, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 6. Pyacha (Owl)
        createEvolutionarySet("ship_k6", (g, level) => {
            g.fillStyle(0x774422, 1); // Brighter mystic brown
            g.lineStyle(4, 0xFF00FF, 1); // Neon magenta outline!

            g.beginPath(); g.moveTo(90, 80); g.lineTo(15, 110); g.lineTo(70, 125); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 80); g.lineTo(165, 110); g.lineTo(110, 125); g.fillPath(); g.strokePath();

            g.fillStyle(0x995533, 1); 
            g.fillEllipse(90, 85, 50, 65); g.strokeEllipse(90, 85, 50, 65);

            g.fillStyle(0xAA6644, 1); 
            g.fillCircle(90, 50, 28); g.strokeCircle(90, 50, 28);
            
            g.fillStyle(0xFFFF00, 1); // Huge bright eyes
            g.fillCircle(78, 48, 10); g.fillCircle(102, 48, 10);
            g.fillStyle(0x000000, 1);
            g.fillCircle(78, 48, 4); g.fillCircle(102, 48, 4);

            g.fillStyle(0x222222, 1);
            g.fillTriangle(85, 55, 95, 55, 90, 70); g.strokeTriangle(85, 55, 95, 55, 90, 70);

            if (level >= 2) {
                g.fillStyle(0xFF00FF, 1); 
                g.fillTriangle(15, 110, 35, 120, 15, 130);
                g.fillTriangle(165, 110, 145, 120, 165, 130);
            }
            if (level >= 3) {
                g.fillStyle(0xFF00FF, 1);
                g.fillCircle(90, 85, 12);
                g.fillCircle(78, 48, 4); g.fillCircle(102, 48, 4); 
            }
            if (level >= 4) {
                g.fillStyle(0xFF00FF, 0.9);
                g.fillTriangle(75, 40, 85, 50, 60, 20); 
                g.fillTriangle(105, 40, 95, 50, 120, 20);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFF00FF, 1); 
            g.beginPath(); g.arc(12, 18, 12, Math.PI, 0); g.lineTo(12, 36); g.closePath(); g.fillPath();
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xFF00FF, 1); g.fillCircle(12, 18, 10); g.fillStyle(0xFFFFFF, 1); g.fillCircle(12, 18, 4);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 7. Tia (Parrot)
        createEvolutionarySet("ship_k7", (g, level) => {
            g.fillStyle(0x00FF00, 1); // Neon green
            g.lineStyle(4, 0xFFFFFF, 1);

            g.beginPath(); g.moveTo(90, 65); g.lineTo(15, 100); g.lineTo(65, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 65); g.lineTo(165, 100); g.lineTo(115, 110); g.fillPath(); g.strokePath();

            g.fillStyle(0x22FF22, 1); 
            g.fillEllipse(90, 80, 34, 60); g.strokeEllipse(90, 80, 34, 60);
            g.beginPath(); g.moveTo(85, 105); g.lineTo(90, 175); g.lineTo(95, 105); g.fillPath(); g.strokePath();

            g.fillCircle(90, 50, 18); g.strokeCircle(90, 50, 18);
            g.fillStyle(0xFF0000, 1); // Very bright red beak
            g.beginPath(); g.moveTo(84, 45); g.lineTo(96, 45); g.lineTo(90, 20); g.fillPath(); g.strokePath();

            if (level >= 2) {
                g.fillStyle(0xFF0000, 1); 
                g.fillCircle(65, 80, 8); g.fillCircle(115, 80, 8);
            }
            if (level >= 3) {
                g.lineStyle(4, 0xFFFF00, 1);
                g.beginPath(); g.moveTo(15, 100); g.lineTo(165, 100); g.strokePath(); 
            }
            if (level >= 4) {
                g.fillStyle(0xFFFF00, 0.9);
                g.fillRect(86, 170, 8, 30);
                g.fillRect(78, 145, 6, 35);
                g.fillRect(96, 145, 6, 35);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0x00FF00, 1); g.fillRect(6, 0, 6, 36);
            g.fillStyle(0xFF0000, 1); g.fillRect(12, 0, 6, 36);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xFFFF00, 1); g.fillCircle(12, 18, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 8. Sonali Igal (Golden Eagle)
        createEvolutionarySet("ship_k8", (g, level) => {
            g.fillStyle(0xFFBB00, 1); // Extremely bright gold
            g.lineStyle(4, 0xFFFFFF, 1);

            g.beginPath(); g.moveTo(90, 60); g.lineTo(15, 90); g.lineTo(65, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 60); g.lineTo(165, 90); g.lineTo(115, 120); g.fillPath(); g.strokePath();

            g.fillStyle(0xFFCC33, 1); 
            g.fillRoundedRect(70, 50, 40, 70, 10); g.strokeRoundedRect(70, 50, 40, 70, 10);
            
            g.fillStyle(0xFFDD55, 1); 
            g.fillCircle(90, 45, 18); g.strokeCircle(90, 45, 18);
            g.fillStyle(0x222222, 1); 
            g.fillTriangle(84, 35, 96, 35, 90, 5); g.strokeTriangle(84, 35, 96, 35, 90, 5);

            if (level >= 2) {
                g.fillStyle(0xFFFFFF, 1); 
                g.fillRect(85, 55, 10, 45); 
                g.fillTriangle(75, 115, 105, 115, 90, 145); 
            }
            if (level >= 3) {
                g.fillStyle(0xFFFFFF, 0.9); 
                g.beginPath(); g.moveTo(70, 70); g.lineTo(20, 85); g.lineTo(50, 100); g.fillPath();
                g.beginPath(); g.moveTo(110, 70); g.lineTo(160, 85); g.lineTo(130, 100); g.fillPath();
            }
            if (level >= 4) {
                g.fillStyle(0xFFEE00, 1);
                g.fillTriangle(30, 85, 60, 85, 45, 115);
                g.fillTriangle(150, 85, 120, 85, 135, 115);
                g.lineStyle(4, 0xffffff, 1);
                g.strokeTriangle(30, 85, 60, 85, 45, 115);
                g.strokeTriangle(150, 85, 120, 85, 135, 115);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFFFFFF, 1); g.fillTriangle(12, 0, 2, 18, 22, 18); g.fillTriangle(12, 36, 2, 14, 22, 14);
            g.fillStyle(0xFFD700, 1); g.fillTriangle(12, 3, 6, 18, 18, 18);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xFFD700, 1); g.fillCircle(12, 18, 12); g.fillStyle(0xFFFFFF, 1); g.fillCircle(12, 18, 6);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });


        // ==========================================================
        // --- DEBRIS BIRDS/ANIMALS (Cost: Debris) ---
        // ==========================================================

        // 1. Charui (Sparrow)
        createEvolutionarySet("ship_d1", (g, level) => {
            g.fillStyle(0xFF9933, 1); // Very bright orange-brown
            g.lineStyle(4, 0xFFFFFF, 1);

            // Normalized to fully fill canvas!
            g.beginPath(); g.moveTo(90, 75); g.lineTo(15, 95); g.lineTo(65, 105); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 75); g.lineTo(165, 95); g.lineTo(115, 105); g.fillPath(); g.strokePath();

            g.fillStyle(0xCC6611, 1); 
            g.fillEllipse(90, 85, 32, 50); g.strokeEllipse(90, 85, 32, 50);
            g.fillRect(80, 100, 20, 25); 

            g.fillCircle(90, 65, 15); g.strokeCircle(90, 65, 15);
            g.fillStyle(0x222222, 1); 
            g.fillTriangle(85, 58, 95, 58, 90, 45); g.strokeTriangle(85, 58, 95, 58, 90, 45);

            if (level >= 2) {
                g.fillStyle(0x333333, 1); 
                g.fillRect(75, 62, 30, 6); 
            }
            if (level >= 3) {
                g.fillStyle(0xFF00FF, 1); 
                g.fillCircle(90, 125, 8); 
            }
            if (level >= 4) {
                g.fillStyle(0xFF00FF, 0.9);
                g.fillRect(86, 125, 8, 25);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFF8800, 1); g.fillEllipse(12, 18, 10, 18);
            g.fillStyle(0xFFFFFF, 1); g.fillEllipse(12, 16, 4, 12);
            g.generateTexture(`bullet_${id}`, 24, 36);
            
            g.clear();
            g.fillStyle(0xFF8800, 1); g.fillCircle(12, 18, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 2. Shalik (Myna)
        createEvolutionarySet("ship_d2", (g, level) => {
            g.fillStyle(0x884422, 1); // Richer color
            g.lineStyle(4, 0xFFFF00, 1); // Bright yellow outline

            g.beginPath(); g.moveTo(90, 75); g.lineTo(15, 105); g.lineTo(65, 115); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 75); g.lineTo(165, 105); g.lineTo(115, 115); g.fillPath(); g.strokePath();

            g.fillStyle(0xAA5533, 1);
            g.fillEllipse(90, 85, 36, 50); g.strokeEllipse(90, 85, 36, 50);
            g.fillRect(78, 105, 24, 30);
            
            g.fillStyle(0x222222, 1); 
            g.fillCircle(90, 60, 16); g.strokeCircle(90, 60, 16);
            g.fillStyle(0xFFFF00, 1); 
            g.fillTriangle(85, 50, 95, 50, 90, 25); g.strokeTriangle(85, 50, 95, 50, 90, 25);
            g.fillCircle(81, 58, 4); g.fillCircle(99, 58, 4); 
            
            if (level >= 2) {
                g.fillStyle(0xffffff, 1); 
                g.fillCircle(50, 100, 6); g.fillCircle(130, 100, 6);
            }
            if (level >= 3) {
                g.fillStyle(0xFFFF00, 0.9); 
                g.fillCircle(90, 135, 8);
            }
            if (level >= 4) {
                g.fillStyle(0xFFFF00, 1);
                g.fillTriangle(85, 50, 95, 50, 90, 28);
            }
        }, (g, id) => { 
            g.clear();
            g.lineStyle(6, 0xFFFF00, 1); g.strokeEllipse(12, 18, 10, 16);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.lineStyle(5, 0xFFFF00, 1); g.strokeCircle(12, 18, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 3. Kak (Crow)
        createEvolutionarySet("ship_d3", (g, level) => {
            g.fillStyle(0x220044, 1); // Deep vibrant purple
            g.lineStyle(4, 0x00FFFF, 1); // Neon cyan outline!

            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 105); g.lineTo(45, 120); g.lineTo(75, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 105); g.lineTo(135, 120); g.lineTo(105, 110); g.fillPath(); g.strokePath();

            g.fillStyle(0x331155, 1);
            g.fillEllipse(90, 85, 40, 60); g.strokeEllipse(90, 85, 40, 60);
            g.fillTriangle(75, 110, 105, 110, 90, 150); g.strokeTriangle(75, 110, 105, 110, 90, 150);
            
            g.fillCircle(90, 55, 18); g.strokeCircle(90, 55, 18);
            g.fillStyle(0x111111, 1); 
            g.fillTriangle(84, 45, 96, 45, 90, 10); g.strokeTriangle(84, 45, 96, 45, 90, 10);

            if (level >= 2) {
                g.fillStyle(0x00FFFF, 1); 
                g.fillTriangle(70, 80, 40, 100, 65, 105);
                g.fillTriangle(110, 80, 140, 100, 115, 105);
            }
            if (level >= 3) {
                g.fillStyle(0x00FFFF, 1); 
                g.fillCircle(90, 80, 10);
            }
            if (level >= 4) {
                g.fillStyle(0x00FFFF, 0.9);
                g.fillTriangle(75, 150, 105, 150, 90, 175);
                g.fillTriangle(70, 140, 80, 140, 65, 165);
                g.fillTriangle(110, 140, 100, 140, 115, 165);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xAA00FF, 1); g.fillTriangle(12, 0, 2, 36, 22, 36);
            g.fillStyle(0x00FFFF, 1); g.fillTriangle(12, 6, 6, 32, 18, 32);
            g.generateTexture(`bullet_${id}`, 24, 36);
            
            g.clear();
            g.fillStyle(0x00FFFF, 1); g.fillTriangle(12, 0, 2, 36, 22, 36);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 4. Badur (Fruit Bat)
        createEvolutionarySet("ship_d4", (g, level) => {
            g.fillStyle(0x550011, 1); // Dark crimson
            g.lineStyle(4, 0xFF0000, 1); // Red outline

            g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 50); g.lineTo(15, 80); g.lineTo(35, 115); g.lineTo(55, 100); g.lineTo(75, 110); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 50); g.lineTo(165, 80); g.lineTo(145, 115); g.lineTo(125, 100); g.lineTo(105, 110); g.fillPath(); g.strokePath();

            g.fillStyle(0x772233, 1); 
            g.fillEllipse(90, 80, 34, 50); g.strokeEllipse(90, 80, 34, 50);
            g.fillCircle(90, 55, 16); g.strokeCircle(90, 55, 16);

            g.fillTriangle(80, 55, 72, 30, 88, 45); g.strokeTriangle(80, 55, 72, 30, 88, 45);
            g.fillTriangle(100, 55, 108, 30, 92, 45); g.strokeTriangle(100, 55, 108, 30, 92, 45);

            if (level >= 2) {
                g.lineStyle(3, 0xFF5555, 1); 
                g.beginPath(); g.moveTo(90, 70); g.lineTo(15, 80); g.strokePath();
                g.beginPath(); g.moveTo(90, 70); g.lineTo(165, 80); g.strokePath();
                g.beginPath(); g.moveTo(90, 70); g.lineTo(35, 115); g.strokePath();
                g.beginPath(); g.moveTo(90, 70); g.lineTo(145, 115); g.strokePath();
            }
            if (level >= 3) {
                g.fillStyle(0xFF0000, 1); 
                g.fillCircle(90, 55, 6);
                g.fillCircle(15, 80, 5); g.fillCircle(165, 80, 5);
            }
            if (level >= 4) {
                g.fillStyle(0x550011, 0.9);
                g.fillTriangle(75, 115, 105, 115, 90, 155);
                g.lineStyle(3, 0xFF5555, 1);
                g.beginPath(); g.moveTo(90, 115); g.lineTo(90, 155); g.strokePath();
            }
        }, (g, id) => { 
            g.clear();
            g.lineStyle(6, 0xFF0000, 1); g.beginPath(); g.arc(12, 18, 12, Math.PI, 0); g.strokePath();
            g.generateTexture(`bullet_${id}`, 24, 36);
            
            g.clear();
            g.fillStyle(0xFF0000, 1); g.fillCircle(12, 18, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 5. Gangchil (Seagull)
        createEvolutionarySet("ship_d5", (g, level) => {
            g.fillStyle(0xFFFFFF, 1); // Brilliant white
            g.lineStyle(4, 0x00FFFF, 1);

            g.beginPath(); g.moveTo(90, 75); g.lineTo(15, 95); g.lineTo(75, 105); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 75); g.lineTo(165, 95); g.lineTo(105, 105); g.fillPath(); g.strokePath();

            g.fillStyle(0x444444, 1);
            g.fillTriangle(35, 90, 15, 95, 40, 100); g.strokeTriangle(35, 90, 15, 95, 40, 100);
            g.fillTriangle(145, 90, 165, 95, 140, 100); g.strokeTriangle(145, 90, 165, 95, 140, 100);

            g.fillStyle(0xEEEEEE, 1); 
            g.fillEllipse(90, 85, 38, 55); g.strokeEllipse(90, 85, 38, 55);
            g.fillCircle(90, 55, 16); g.strokeCircle(90, 55, 16); 

            g.fillStyle(0xFF8800, 1); 
            g.fillTriangle(85, 45, 95, 45, 90, 15); g.strokeTriangle(85, 45, 95, 45, 90, 15);

            if (level >= 2) {
                g.fillStyle(0x00FFFF, 1); 
                g.fillEllipse(90, 80, 20, 35);
            }
            if (level >= 3) {
                g.fillStyle(0x00AAFF, 1); 
                g.fillCircle(90, 125, 10); 
            }
            if (level >= 4) {
                g.fillStyle(0x00FFFF, 0.9);
                g.fillTriangle(80, 105, 100, 105, 90, 150);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0x00FFFF, 1); g.fillEllipse(12, 18, 10, 18);
            g.fillStyle(0xFFFFFF, 1); g.fillEllipse(12, 16, 4, 12);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0x00AAFF, 1); g.fillEllipse(12, 18, 8, 14);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 6. Harigila (Adjutant Stork)
        createEvolutionarySet("ship_d6", (g, level) => {
            g.fillStyle(0x555566, 1); // Sleek grey-blue
            g.lineStyle(4, 0xFF8800, 1); // Orange contrast outline

            g.beginPath(); g.moveTo(90, 80); g.lineTo(15, 100); g.lineTo(70, 120); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 80); g.lineTo(165, 100); g.lineTo(110, 120); g.fillPath(); g.strokePath();

            g.fillStyle(0x666677, 1); 
            g.fillEllipse(90, 95, 46, 60); g.strokeEllipse(90, 95, 46, 60);

            g.fillStyle(0xFFBB88, 1); 
            g.fillRect(84, 40, 12, 30); g.strokeRect(84, 40, 12, 30);
            g.fillCircle(90, 35, 14); g.strokeCircle(90, 35, 14);

            g.fillStyle(0xDDDDDD, 1); 
            g.fillTriangle(83, 30, 97, 30, 90, -10); g.strokeTriangle(83, 30, 97, 30, 90, -10);

            if (level >= 2) {
                g.fillStyle(0x222222, 1); 
                g.fillRect(78, 70, 24, 40); 
            }
            if (level >= 3) {
                g.fillStyle(0xFF4400, 1); 
                g.fillCircle(75, 135, 10); g.fillCircle(105, 135, 10);
            }
            if (level >= 4) {
                g.fillStyle(0x222222, 1);
                g.fillRect(78, 120, 24, 35);
                g.fillTriangle(78, 155, 102, 155, 90, 175);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFF4400, 1); g.fillCircle(12, 18, 12); 
            g.fillStyle(0xFFFF00, 1); g.fillCircle(12, 18, 6);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0xFF4400, 1); g.fillCircle(12, 18, 10);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });

        // 7. Rajhash (Swan/Goose)
        createEvolutionarySet("ship_d7", (g, level) => {
            g.fillStyle(0xFFFFFF, 1); 
            g.lineStyle(4, 0x00FFFF, 1);

            g.beginPath(); g.moveTo(90, 85); g.lineTo(15, 130); g.lineTo(70, 135); g.fillPath(); g.strokePath();
            g.beginPath(); g.moveTo(90, 85); g.lineTo(165, 130); g.lineTo(110, 135); g.fillPath(); g.strokePath();

            g.fillStyle(0xEEEEEE, 1); 
            g.fillEllipse(90, 100, 40, 55); g.strokeEllipse(90, 100, 40, 55);
            
            g.fillRect(84, 35, 12, 45); g.strokeRect(84, 35, 12, 45);
            g.fillCircle(90, 30, 16); g.strokeCircle(90, 30, 16);
            
            g.fillStyle(0xFF6600, 1); 
            g.fillTriangle(84, 25, 96, 25, 90, 0); g.strokeTriangle(84, 25, 96, 25, 90, 0);

            if (level >= 2) {
                g.fillStyle(0x00FFFF, 1); 
                g.fillRect(84, 85, 12, 45); 
            }
            if (level >= 3) {
                g.fillStyle(0x00FFFF, 1); 
                g.fillCircle(45, 120, 10); g.fillCircle(135, 120, 10);
            }
            if (level >= 4) {
                g.fillStyle(0xFFFFFF, 0.9);
                g.fillTriangle(70, 135, 110, 135, 90, 170);
                g.fillStyle(0x00FFFF, 0.8);
                g.fillTriangle(80, 135, 100, 135, 90, 160);
            }
        }, (g, id) => { 
            g.clear();
            g.fillStyle(0xFFFFFF, 1); g.fillTriangle(12, 0, 2, 36, 22, 36);
            g.fillStyle(0x00FFFF, 1); g.fillTriangle(12, 6, 6, 32, 18, 32);
            g.generateTexture(`bullet_${id}`, 24, 36);

            g.clear();
            g.fillStyle(0x00FFFF, 1); g.fillTriangle(12, 0, 4, 36, 20, 36);
            g.generateTexture(`side_bullet_${id}`, 24, 36);
        });
        
        g.destroy();
    }
}