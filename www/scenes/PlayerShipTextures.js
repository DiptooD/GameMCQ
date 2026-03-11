class PlayerShipTextures {
    static init(scene) {
        let g = scene.make.graphics({ add: false });

        // Helper: Generates 4 levels for a specific ship design
        // Canvas is 180x180. Center is (90, 90).
        // STANDARD SIZE TARGET: Approx 100px Wide x 120px Tall.
        // Bounds: x[40-140], y[30-150]
        const createEvolutionarySet = (baseId, drawFn) => {
            for (let i = 1; i <= 4; i++) {
                const key = `${baseId}_lv${i}`;
                if (scene.textures.exists(key)) continue;

                g.clear();
                drawFn(g, i); // Pass level to the drawing function
                g.generateTexture(key, 180, 180); 
            }
        };

        // ==========================================================
        // --- KEY SHIPS (PREMIUM) ---
        // ==========================================================

        // 1. Crimson Arrow (Standard Triangle Shape)
        createEvolutionarySet("ship_k1", (g, level) => {
            // Base Body - Standardized Triangle
            g.fillStyle(0xcc0000, 1);
            g.beginPath();
            g.moveTo(90, 30); // Nose
            // Width expands slightly with level, but stays within hitbox bounds
            const width = 35 + (level * 5); 
            g.lineTo(90 - width, 150); // Bottom Left
            g.lineTo(90, 135);         // Indent
            g.lineTo(90 + width, 150); // Bottom Right
            g.closePath();
            g.fillPath();

            // Cockpit
            g.fillStyle(0xeeeeee, 1);
            g.fillTriangle(90, 50, 80, 90, 100, 90);

            // Level 2+: Rear Spoilers (kept inside bounds)
            if (level >= 2) {
                g.fillStyle(0x990000, 1);
                g.fillTriangle(65, 135, 45, 150, 70, 145);
                g.fillTriangle(115, 135, 135, 150, 110, 145);
            }
            // Level 3+: Side Cannons
            if (level >= 3) {
                g.fillStyle(0xffffff, 1);
                g.fillRect(45, 110, 10, 30);
                g.fillRect(125, 110, 10, 30);
            }
            // Level 4: Neon Energy Wings
            if (level >= 4) {
                g.lineStyle(3, 0x00ffff, 0.8);
                g.beginPath(); g.moveTo(90, 80); g.lineTo(30, 100); g.lineTo(20, 140); g.strokePath();
                g.beginPath(); g.moveTo(90, 80); g.lineTo(150, 100); g.lineTo(160, 140); g.strokePath();
            }
        });

        // 2. Golden Eagle (Wide Spread)
        createEvolutionarySet("ship_k2", (g, level) => {
            g.fillStyle(0xffaa00, 1); // Gold Body
            g.fillTriangle(90, 30, 60, 110, 120, 110);

            // Level 1: Wings (Standardized width)
            g.fillStyle(0xffd700, 1);
            g.beginPath(); g.moveTo(60, 110); g.lineTo(40, 60); g.lineTo(60, 140); g.fillPath();
            g.beginPath(); g.moveTo(120, 110); g.lineTo(140, 60); g.lineTo(120, 140); g.fillPath();

            // Level 2+: Gem
            if (level >= 2) {
                g.fillStyle(0xffffff, 1);
                g.fillCircle(90, 80, 10);
            }
            // Level 3+: Large Wingspan (Visual only, doesn't affect hitbox logic)
            if (level >= 3) {
                g.fillStyle(0xffcc00, 1);
                g.beginPath(); g.moveTo(60, 90); g.lineTo(30, 50); g.lineTo(50, 150); g.fillPath();
                g.beginPath(); g.moveTo(120, 90); g.lineTo(150, 50); g.lineTo(130, 150); g.fillPath();
            }
            // Level 4: Divine Aura
            if (level >= 4) {
                g.lineStyle(3, 0xffffff, 0.6);
                g.strokeCircle(90, 90, 65);
            }
        });

        // 3. Neon Phantom (Rectangular/Stealth)
        createEvolutionarySet("ship_k3", (g, level) => {
            g.fillStyle(0x110022, 1); 
            // Made wider to match other ships
            g.fillRoundedRect(65, 40, 50, 110, 8);
            g.lineStyle(3, 0xcc00ff, 1); 
            g.strokeRoundedRect(65, 40, 50, 110, 8);

            // Level 2: Front Prongs
            if (level >= 2) {
                g.beginPath(); g.moveTo(65, 40); g.lineTo(55, 20); g.lineTo(75, 40); g.strokePath();
                g.beginPath(); g.moveTo(115, 40); g.lineTo(125, 20); g.lineTo(105, 40); g.strokePath();
            }
            // Level 3: Side Stabilizers
            if (level >= 3) {
                g.lineStyle(3, 0x00ffff, 1);
                g.beginPath(); g.moveTo(65, 100); g.lineTo(40, 120); g.lineTo(65, 140); g.strokePath();
                g.beginPath(); g.moveTo(115, 100); g.lineTo(140, 120); g.lineTo(115, 140); g.strokePath();
            }
            // Level 4: Phantom Core
            if (level >= 4) {
                g.fillStyle(0xcc00ff, 0.5);
                g.fillCircle(90, 95, 20);
                g.fillStyle(0xffffff, 0.8);
                g.fillCircle(90, 95, 10);
            }
        });

        // 4. Heavy Titan (Boxy)
        createEvolutionarySet("ship_k4", (g, level) => {
            // Main Block - Standardized to center
            g.fillStyle(0x223344, 1);
            g.fillRect(60, 40, 60, 100); 

            g.fillStyle(0x00aaff, 1); // Cockpit
            g.fillRect(75, 55, 30, 20);

            // Level 2: Armor Plating (Widened)
            if (level >= 2) {
                g.fillStyle(0x445566, 1);
                g.fillRect(45, 70, 15, 70); // Left plate
                g.fillRect(120, 70, 15, 70); // Right plate
            }
            // Level 3: Heavy Cannons
            if (level >= 3) {
                g.fillStyle(0x111111, 1);
                g.fillRect(35, 50, 10, 60);
                g.fillRect(135, 50, 10, 60);
            }
            // Level 4: Reactive Shield Glow
            if (level >= 4) {
                g.lineStyle(4, 0x0088ff, 1);
                g.strokeRect(55, 35, 70, 110);
            }
        });

        // 5. Cosmic Lord (Circular)
        createEvolutionarySet("ship_k5", (g, level) => {
            g.fillStyle(0x000033, 1);
            g.fillCircle(90, 90, 45); // Core - Increased size to match hitbox width
            
            // Level 1: Halo
            g.lineStyle(3, 0x00ffff, 1);
            g.strokeCircle(90, 90, 50);

            // Level 2: Axis Bars
            if (level >= 2) {
                g.beginPath(); g.moveTo(90, 30); g.lineTo(90, 150); g.strokePath();
                g.beginPath(); g.moveTo(30, 90); g.lineTo(150, 90); g.strokePath();
            }
            // Level 3: Orbiting Stars
            if (level >= 3) {
                g.fillStyle(0xffffff, 1);
                g.fillCircle(40, 40, 6);
                g.fillCircle(140, 40, 6);
                g.fillCircle(40, 140, 6);
                g.fillCircle(140, 140, 6);
            }
            // Level 4: Galaxy Cloud
            if (level >= 4) {
                g.fillStyle(0xaa00ff, 0.3);
                g.fillCircle(90, 90, 75);
            }
        });

        // 6. Void Leviathan (Inverted Triangle)
        createEvolutionarySet("ship_k6", (g, level) => {
            g.fillStyle(0x050505, 1); 
            // Standardized Size
            g.fillTriangle(90, 30, 45, 140, 135, 140);
            
            g.lineStyle(2, 0x5500ff, 1); 
            g.strokeTriangle(90, 30, 45, 140, 135, 140);

            if (level >= 2) {
                g.fillStyle(0x220066, 1);
                g.fillTriangle(90, 60, 60, 140, 120, 140);
            }
            if (level >= 3) {
                g.fillStyle(0xaa00ff, 1);
                g.fillCircle(45, 120, 8);
                g.fillCircle(135, 120, 8);
                g.fillCircle(90, 50, 10);
            }
            if (level >= 4) {
                g.lineStyle(4, 0x7700ff, 0.6); 
                g.strokeEllipse(90, 90, 80, 50);
                g.strokeEllipse(90, 90, 50, 80);
            }
        });

        // 7. Solar Flare (Star shape)
        createEvolutionarySet("ship_k7", (g, level) => {
            g.fillStyle(0xff3300, 1); 
            g.fillCircle(90, 90, 40); // Base body
            
            g.fillStyle(0xffaa00, 1); 
            g.fillCircle(90, 90, 20);

            if (level >= 2) {
                g.fillStyle(0xffff00, 1);
                // Sun rays - Extended to fill hitbox
                g.fillTriangle(90, 20, 80, 50, 100, 50); // Top
                g.fillTriangle(90, 160, 80, 130, 100, 130); // Bottom
                g.fillTriangle(20, 90, 50, 80, 50, 100); // Left
                g.fillTriangle(160, 90, 130, 80, 130, 100); // Right
            }
            if (level >= 3) {
                g.lineStyle(3, 0xffffff, 0.8);
                g.beginPath(); g.moveTo(40, 40); g.lineTo(140, 140); g.strokePath();
                g.beginPath(); g.moveTo(140, 40); g.lineTo(40, 140); g.strokePath();
            }
            if (level >= 4) {
                g.fillStyle(0xffffff, 0.4); 
                for(let i=0; i<8; i++){
                    g.fillCircle(90 + Math.cos(i*45)*55, 90 + Math.sin(i*45)*55, 10);
                }
            }
        });

        // 8. Celestial Guardian (Tall)
        createEvolutionarySet("ship_k8", (g, level) => {
            g.fillStyle(0xffffff, 1); 
            // Standardized Body
            g.fillRoundedRect(70, 30, 40, 110, 15);
            
            if (level >= 2) {
                g.fillStyle(0xffdd00, 1); 
                g.fillRect(85, 45, 10, 80);
                g.fillCircle(90, 30, 15); // Head
            }
            if (level >= 3) {
                g.fillStyle(0x00ffff, 0.6); 
                // Wings adjusted to bounds
                g.beginPath(); g.moveTo(75, 60); g.lineTo(20, 40); g.lineTo(50, 140); g.fillPath();
                g.beginPath(); g.moveTo(105, 60); g.lineTo(160, 40); g.lineTo(130, 140); g.fillPath();
            }
            if (level >= 4) {
                g.lineStyle(4, 0xffdd00, 0.8); 
                g.strokeCircle(90, 30, 25);
                g.strokeCircle(90, 85, 65);
            }
        });


        // ==========================================================
        // --- DEBRIS SHIPS (SCRAP / CRAFTING) ---
        // ==========================================================

        // 1. Scrap Walker
        createEvolutionarySet("ship_d1", (g, level) => {
            g.fillStyle(0x8B4513, 1); 
            // Made wider
            g.fillRect(70, 40, 40, 100); 

            const wingSize = 20 + (level * 10);
            g.fillStyle(0x666666, 1); 
            g.fillTriangle(70, 70, 70 - wingSize, 110, 70, 120); 
            g.fillTriangle(110, 70, 110 + wingSize, 110, 110, 120);

            if (level >= 3) {
                g.fillStyle(0x333333, 1); 
                g.fillRect(70, 25, 40, 15);
            }
            if (level >= 4) {
                g.fillStyle(0xffaa00, 1); 
                g.fillCircle(90, 145, 15);
            }
        });

        // 2. Rust Bucket
        createEvolutionarySet("ship_d2", (g, level) => {
            g.fillStyle(0xA0522D, 1);
            // Standardized Body
            g.fillRoundedRect(55, 35, 70, 110, 20);
            
            if (level >= 2) {
                g.fillStyle(0x555555, 1); 
                g.fillRect(60, 70, 60, 20);
            }
            if (level >= 3) {
                g.fillStyle(0xCD853F, 1); 
                g.fillRect(55, 145, 20, 25);
                g.fillRect(105, 145, 20, 25);
            }
            if (level >= 4) {
                g.lineStyle(3, 0xff0000, 1); 
                g.beginPath(); g.moveTo(55, 55); g.lineTo(125, 95); g.strokePath();
            }
        });

        // 3. Void Scavenger
        createEvolutionarySet("ship_d3", (g, level) => {
            g.fillStyle(0x444444, 1);
            // Standard Triangle
            g.beginPath(); g.moveTo(90, 25); g.lineTo(50, 145); g.lineTo(130, 145); g.fillPath();
            
            if (level >= 2) {
                g.fillStyle(0x777777, 1); 
                g.fillTriangle(50, 85, 20, 70, 50, 115);
                g.fillTriangle(130, 85, 160, 70, 130, 115);
            }
            if (level >= 3) {
                g.fillStyle(0x990000, 1); 
                g.fillCircle(90, 75, 10);
            }
            if (level >= 4) {
                g.lineStyle(3, 0x999999, 1); 
                g.beginPath(); g.moveTo(25, 70); g.lineTo(25, 20); g.strokePath();
                g.beginPath(); g.moveTo(155, 70); g.lineTo(155, 20); g.strokePath();
            }
        });

        // 4. Iron Clad
        createEvolutionarySet("ship_d4", (g, level) => {
            g.fillStyle(0x2F4F4F, 1);
            // Wide Box
            g.fillRect(50, 50, 80, 80);
            
            g.fillStyle(0x708090, 1);
            g.fillCircle(90, 90, 30); // Turret

            if (level >= 2) {
                g.fillStyle(0x000000, 1); 
                g.fillRect(35, 70, 15, 40);
                g.fillRect(130, 70, 15, 40);
            }
            if (level >= 3) {
                g.fillStyle(0x00ff00, 1); 
                g.fillCircle(90, 90, 8);
            }
            if (level >= 4) {
                g.fillStyle(0x556B2F, 1); 
                g.fillRect(40, 130, 100, 15);
            }
        });

        // 5. Xeno-Hybrid
        createEvolutionarySet("ship_d5", (g, level) => {
            g.fillStyle(0x228B22, 1); 
            // Scaled up oval
            g.fillEllipse(90, 80, 50, 90);
            
            if (level >= 2) {
                g.fillStyle(0x32CD32, 1); 
                g.beginPath(); g.moveTo(90, 20); g.lineTo(50, 130); g.lineTo(90, 160); g.lineTo(130, 130); g.fillPath();
            }
            if (level >= 3) {
                g.fillStyle(0x800080, 1); 
                g.fillCircle(55, 80, 10); g.fillCircle(125, 80, 10);
            }
            if (level >= 4) {
                g.lineStyle(3, 0x00ff00, 0.8); 
                g.strokeEllipse(90, 80, 65, 100);
            }
        });

        // 6. Junk Behemoth
        createEvolutionarySet("ship_d6", (g, level) => {
            g.fillStyle(0x4a4a4a, 1); 
            // Standard Rect
            g.fillRoundedRect(40, 45, 100, 90, 8);

            if (level >= 2) {
                g.fillStyle(0x8B4513, 1); 
                g.fillRect(40, 60, 40, 40);
                g.fillRect(100, 30, 40, 60);
            }
            if (level >= 3) {
                g.fillStyle(0x000000, 1); 
                g.fillRect(50, 135, 25, 20);
                g.fillRect(105, 135, 25, 20);
                g.fillStyle(0xff4400, 1); 
                g.fillCircle(62, 160, 10);
                g.fillCircle(117, 160, 10);
            }
            if (level >= 4) {
                g.lineStyle(4, 0xffff00, 1); 
                g.beginPath(); g.moveTo(50, 45); g.lineTo(130, 135); g.strokePath();
                g.beginPath(); g.moveTo(80, 45); g.lineTo(130, 105); g.strokePath();
            }
        });

        // 7. Warped Experiment
        createEvolutionarySet("ship_d7", (g, level) => {
            g.fillStyle(0x1a3322, 1); 
            // Standard Kite Shape
            g.beginPath(); g.moveTo(90, 25); g.lineTo(45, 105); g.lineTo(90, 145); g.lineTo(135, 105); g.fillPath();

            if (level >= 2) {
                g.fillStyle(0x00ffcc, 1); 
                g.fillRect(86, 35, 8, 80);
                g.fillRect(55, 75, 70, 8);
            }
            if (level >= 3) {
                g.fillStyle(0x990033, 1); 
                g.fillCircle(60, 60, 12);
                g.fillCircle(120, 60, 12);
                g.fillStyle(0xffffff, 1);
                g.fillCircle(60, 60, 5);
                g.fillCircle(120, 60, 5);
            }
            if (level >= 4) {
                g.lineStyle(2, 0x00ffcc, 0.7); 
                g.beginPath(); g.moveTo(90, 10); g.lineTo(30, 120); g.lineTo(90, 160); g.lineTo(150, 120); g.closePath(); g.strokePath();
            }
        });
        
        g.destroy();
    }
}