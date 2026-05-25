class SpinWheelScene extends Phaser.Scene {
    constructor() {
        super("SpinWheelScene");
        this.backgroundLayers = []; 
        this.isSpinning = false;
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        const h = this.cameras.main.height;

        // --- 0. AUDIO MANAGEMENT ---
        if (typeof GameSFX !== 'undefined') {
            GameSFX.init(this);
        }

        let menuMusic = this.sound.get('menubgm');
        const targetMusicVol = (window.GameState && window.GameState.musicVolume !== undefined) ? window.GameState.musicVolume : 0.5;

        if (!menuMusic) {
            menuMusic = this.sound.add('menubgm', { loop: true, volume: targetMusicVol });
            menuMusic.play();
        } else {
            menuMusic.setVolume(targetMusicVol);
            if (!menuMusic.isPlaying) {
                menuMusic.play();
            }
        }

        // --- 1. BACK BUTTON HANDLER ---
        this.handleBack = () => {
            if (this.isSpinning) return;
            this.playSound('sfx_back', 0.8);
            this.scene.start("MenuScene");
        };

        if (window.history && window.history.pushState) {
            window.history.pushState(null, null, window.location.href);
            window.onpopstate = () => this.handleBack();
        }
        document.addEventListener("backbutton", this.handleBack, false);

        // --- 2. DYNAMIC BACKGROUND ---
        this.createBackground(); 

        // Title
        this.add.text(cx, 200, "ভাগ্যের চাকা", { 
            fontSize: "76px",
            fontFamily: "'Anek Bangla', sans-serif", 
            fontWeight: 800,
            color: "#00e1ff", 
            stroke: "#000000", 
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: "#0044aa", blur: 15, fill: true, stroke: true }
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, 265, "LUCKY WHEEL", {
            fontSize: "26px",
            fontFamily: "'Anek Bangla', sans-serif",
            fontWeight: 700,
            color: "#aaccff",
            letterSpacing: 4
        }).setOrigin(0.5);

        // --- 3. UI ELEMENTS ---
        this.createTopUI();
        this.createCurrencyUI();

        // --- 4. CONFIGURATION ---
        this.spinCost = 20; 
        
        this.segments = [
            { id: 'jackpot', type: 'keys', amount: 10, color: 0xff0055, icon: 'ui_key', prob: 0.05, label: "10 KEYS" },
            { id: 'debris_stash', type: 'debris', amount: 50, color: 0x00ffff, icon: 'ui_debris_icon', prob: 0.15, label: "50 DEBRIS" },
            { id: 'extra_skips', type: 'skips', amount: 5, color: 0x00ff00, icon: 'ui_bolt', prob: 0.10, label: "5 SKIPS" },
            { id: 'fire', type: 'booster', key: 'fireShield', amount: 2, color: 0x6600ff, icon: 'icon_booster_fire', prob: 0.20, label: "2x SHIELD" },
            { id: 'speed', type: 'booster', key: 'speedBoost', amount: 2, color: 0x0088ff, icon: 'icon_booster_speed', prob: 0.20, label: "2x SPEED" },
            { id: 'battery', type: 'booster', key: 'batteryEff', amount: 2, color: 0x00cc44, icon: 'icon_booster_battery', prob: 0.20, label: "2x BATTERY" }
        ];

        // --- 5. THE WHEEL ---
        this.wheelY = cy + 20; 
        this.drawWheel(cx, this.wheelY);

        // --- 6. CONTROL CONSOLE ---
        this.createControls(cx, h - 190);

        // Cleanup listener
        this.events.on('shutdown', () => {
            document.removeEventListener("backbutton", this.handleBack);
            window.onpopstate = null;
        });
    }

    update() {
        if (this.scrollingBg) {
            this.scrollingBg.tilePositionY -= 0.6;
        }

        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                layer.group.children.iterate(star => {
                    if (star) {
                        star.y += layer.speed;
                        if (star.y > this.cameras.main.height) {
                            star.y = -10;
                            star.x = Phaser.Math.Between(0, 720);
                        }
                    }
                });
            });
        }

        if (this.outerRing1) this.outerRing1.rotation += 0.002;
        if (this.outerRing2) this.outerRing2.rotation -= 0.003;
    }

    // --- AUDIO HELPER ---
    playSound(key, baseVolume = 1.0) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        
        const globalSfxVol = (window.GameState && window.GameState.sfxVolume !== undefined) ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);
        
        if (finalVolume > 0) {
            this.sound.play(key, { volume: finalVolume });
        }
    }

    // --- SCENE COMPONENTS ---
    createBackground() {
        this.backgroundLayers = []; 
        if (!this.textures.exists('animated_bg_grad')) {
            const gradBg = this.make.graphics({x: 0, y: 0});
            gradBg.fillGradientStyle(0x020510, 0x020510, 0x0a1535, 0x0a1535, 1);
            gradBg.fillRect(0, 0, 720, 1280);
            gradBg.fillGradientStyle(0x0a1535, 0x0a1535, 0x020510, 0x020510, 1);
            gradBg.fillRect(0, 1280, 720, 1280);
            gradBg.generateTexture('animated_bg_grad', 720, 2560);
            gradBg.destroy();
        }

        this.scrollingBg = this.add.tileSprite(360, 640, 720, 1280, 'animated_bg_grad').setDepth(-100);

        const neb1 = this.add.circle(250, 100, 250, 0x0044aa, 0.1).setDepth(-99);
        const neb2 = this.add.circle(550, 1100, 300, 0x4400aa, 0.1).setDepth(-99);

        this.tweens.add({
            targets: [neb1, neb2], x: 650, y: 750, scale: 1.15, alpha: 0.15,
            duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        
        const createLayer = (count, speed, color, size, alpha = 1) => {
            const group = this.add.group();
            for (let i = 0; i < count; i++) {
                const x = Phaser.Math.Between(0, 720);
                const y = Phaser.Math.Between(0, 1280);
                const star = this.add.circle(x, y, size, color, alpha).setDepth(-98);
                group.add(star);
            }
            this.backgroundLayers.push({ group: group, speed: speed });
        };

        createLayer(50, 0.4, 0x555588, 1.5, 0.5); 
        createLayer(30, 1.0, 0x88aaff, 2, 0.8); 
        createLayer(15, 2.2, 0xffffff, 2.5, 1); 
    }

    createTopUI() {
        const backContainer = this.add.container(100, 65);
        
        const backBg = this.add.graphics();
        backBg.fillStyle(0x001122, 0.8);
        backBg.fillRoundedRect(-70, -30, 140, 60, 30);
        backBg.lineStyle(3, 0x0066aa, 0.9);
        backBg.strokeRoundedRect(-70, -30, 140, 60, 30);

        const hitArea = this.add.rectangle(0, 0, 140, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        const backArrow = this.add.text(-35, 0, "◄", { fontSize: "28px", color: "#00ffff" }).setOrigin(0.5);
        const backText = this.add.text(15, 0, "BACK", { 
            fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: "#ffffff" 
        }).setOrigin(0.5);

        backContainer.add([backBg, backArrow, backText, hitArea]);

        hitArea.on('pointerdown', () => {
            if (this.isSpinning) return;
            this.tweens.add({
                targets: backContainer, scale: 0.9, duration: 50, yoyo: true,
                onComplete: () => this.handleBack()
            });
        });
    }

    createCurrencyUI() {
        const keys = (window.GameState && window.GameState.keys) || 0;
        const debris = (window.GameState && window.GameState.debris) || 0;

        const bg = this.add.graphics();
        bg.fillStyle(0x001122, 0.8);
        bg.fillRoundedRect(420, 35, 270, 60, 30);
        bg.lineStyle(3, 0x0066aa, 0.9);
        bg.strokeRoundedRect(420, 35, 270, 60, 30);
        
        this.add.image(465, 65, "ui_key").setScale(0.65);
        this.kText = this.add.text(495, 63, keys.toString(), { 
            fontSize: "26px", color: "#ffd700", fontFamily: "Arial", fontStyle: "bold" 
        }).setOrigin(0, 0.5);

        this.add.rectangle(555, 65, 3, 35, 0x0066aa, 0.8);

        this.debrisIcon = this.add.image(600, 67, "ui_debris_icon").setScale(0.70);
        this.dText = this.add.text(630, 63, debris.toString(), { 
            fontSize: "26px", color: "#aaccff", fontFamily: "Arial", fontStyle: "bold" 
        }).setOrigin(0, 0.5);
    }

    drawWheel(x, y) {
        const radius = 290; 

        this.outerRing1 = this.add.graphics({ x: x, y: y });
        this.outerRing1.lineStyle(3, 0x00ffff, 0.3); 
        this.outerRing1.strokeCircle(0, 0, radius + 25);
        for(let i=0; i<12; i++) {
            const angle = Phaser.Math.DegToRad(i * 30);
            this.outerRing1.fillStyle(0x00ffff, 0.5);
            this.outerRing1.fillCircle(Math.cos(angle)*(radius+25), Math.sin(angle)*(radius+25), 6); 
        }

        this.outerRing2 = this.add.graphics({ x: x, y: y });
        this.outerRing2.lineStyle(10, 0x0088ff, 0.15); 
        this.outerRing2.strokeCircle(0, 0, radius + 10);

        this.wheelContainer = this.add.container(x, y);

        const base = this.add.graphics();
        base.fillStyle(0x000c22, 1); 
        base.lineStyle(8, 0x0066aa, 0.9); 
        base.fillCircle(0, 0, radius);
        base.strokeCircle(0, 0, radius);
        this.wheelContainer.add(base);

        const sliceAngle = 360 / this.segments.length;
        
        this.segments.forEach((seg, i) => {
            const startRad = Phaser.Math.DegToRad(i * sliceAngle);
            const endRad = Phaser.Math.DegToRad((i + 1) * sliceAngle);

            const slice = this.add.graphics();
            slice.fillStyle(seg.color, 0.20); 
            slice.lineStyle(4, seg.color, 0.6); 
            slice.slice(0, 0, radius - 5, startRad, endRad);
            slice.strokePath();
            slice.fillPath();

            slice.fillStyle(0x000000, 0.3);
            slice.slice(0, 0, radius - 180, startRad, endRad); 
            slice.fillPath();
            this.wheelContainer.add(slice);

            const midRad = startRad + (Phaser.Math.DegToRad(sliceAngle) / 2);
            const dist = radius - 80; 
            
            const itemContainer = this.add.container(
                Math.cos(midRad) * dist,
                Math.sin(midRad) * dist
            );
            
            const icon = this.add.image(0, -15, seg.icon).setScale(1.6); 
            
            const label = this.add.text(0, 40, seg.label, {
                fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 800, color: "#ffffff", 
                stroke: "#000000", strokeThickness: 5
            }).setOrigin(0.5);

            itemContainer.rotation = midRad + Math.PI / 2;
            itemContainer.add([icon, label]);
            this.wheelContainer.add(itemContainer);

            const peg = this.add.graphics();
            peg.fillStyle(0xffffff, 0.9);
            peg.lineStyle(2, 0x000000, 1);
            peg.fillCircle(Math.cos(startRad)*radius, Math.sin(startRad)*radius, 8); 
            peg.strokeCircle(Math.cos(startRad)*radius, Math.sin(startRad)*radius, 8);
            this.wheelContainer.add(peg);
        });

        const hub = this.add.graphics();
        hub.fillStyle(0x051025, 1);
        hub.lineStyle(5, 0x00ffff, 1);
        hub.fillCircle(0, 0, 50); 
        hub.strokeCircle(0, 0, 50);
        
        const coreGlow = this.add.graphics();
        coreGlow.fillStyle(0x00ffff, 0.5);
        coreGlow.fillCircle(0, 0, 25);
        
        const bolt = this.add.graphics();
        bolt.fillStyle(0xffffff, 1);
        bolt.fillCircle(0, 0, 10);

        this.wheelContainer.add([hub, coreGlow, bolt]);

        const pY = y - radius - 15; 
        
        const pointerGlow = this.add.graphics();
        pointerGlow.fillStyle(0xff0055, 0.4);
        pointerGlow.fillCircle(x, pY, 30); 

        this.pointer = this.add.graphics();
        this.pointer.fillStyle(0xffffff, 1);
        this.pointer.lineStyle(5, 0xff0055, 1);
        
        this.pointer.beginPath();
        this.pointer.moveTo(x, pY + 45);       
        this.pointer.lineTo(x - 25, pY - 20);  
        this.pointer.lineTo(x, pY - 8);        
        this.pointer.lineTo(x + 25, pY - 20);  
        this.pointer.closePath();
        this.pointer.fillPath();
        this.pointer.strokePath();

        this.pointer.originalY = this.pointer.y;
    }

    createControls(cx, y) {
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x000c22, 0.85); 
        panelBg.fillRoundedRect(cx - 280, y - 80, 560, 160, 24); 
        panelBg.lineStyle(3, 0x0066aa, 0.8);
        panelBg.strokeRoundedRect(cx - 280, y - 80, 560, 160, 24);

        this.spinBtn = this.add.container(cx, y);
        
        const w = 420;
        const h = 95;
        const r = h / 2;

        const btnBg = this.add.graphics();
        const drawBtn = (hover) => {
            btnBg.clear();
            btnBg.fillGradientStyle(
                hover ? 0x002266 : 0x001133, hover ? 0x002266 : 0x001133, 
                hover ? 0x0088ff : 0x004488, hover ? 0x0088ff : 0x004488, 1
            );
            btnBg.fillRoundedRect(-w/2, -h/2, w, h, r);
            btnBg.lineStyle(hover ? 5 : 4, hover ? 0xffffff : 0x00ffff, 0.8);
            btnBg.strokeRoundedRect(-w/2, -h/2, w, h, r);
        };
        drawBtn(false);

        const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        const btnText = this.add.text(0, -15, "ঘুরান (SPIN)", {
            fontSize: "40px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 900, color: "#ffffff",
            shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }, padding: { top: 20, bottom: 20 }
        }).setOrigin(0.5);
        
        const costText = this.add.text(0, 28, `Cost: ${this.spinCost} ভাঙ্গারী`, {
            fontSize: "26px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: "#aaccff" 
        }).setOrigin(0.5);

        this.spinBtn.add([btnBg, btnText, costText, hitArea]);

        this.btnPulse = this.tweens.add({
            targets: this.spinBtn,
            scale: 1.04,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        hitArea.on('pointerdown', () => {
            if (!this.isSpinning) this.playSound('sfx_click');
            this.spin();
        });
        hitArea.on('pointerover', () => { if(!this.isSpinning) drawBtn(true); });
        hitArea.on('pointerout', () => { if(!this.isSpinning) drawBtn(false); });

        this.spinBtnBg = btnBg; 
        this.spinBtnTxt = btnText;
        this.drawBtn = drawBtn;
    }

    spin() {
        if (this.isSpinning) return;

        const state = window.GameState || {};
        if ((state.debris || 0) < this.spinCost) {
            this.showError("যথেষ্ট ভাঙ্গারী নেই! (Not enough Debris)");
            return;
        }

        if (window.GameState) window.GameState.debris -= this.spinCost;
        this.updateCurrencyDisplay();
        if (typeof window.saveCurrency === 'function') window.saveCurrency();

        this.isSpinning = true;
        this.btnPulse.pause();
        this.spinBtn.setScale(1);

        this.spinBtnBg.clear();
        this.spinBtnBg.fillStyle(0x051025, 0.9);
        this.spinBtnBg.fillRoundedRect(-210, -47.5, 420, 95, 47.5);
        this.spinBtnBg.lineStyle(4, 0x003355, 0.8);
        this.spinBtnBg.strokeRoundedRect(-210, -47.5, 420, 95, 47.5);

        this.spinBtnTxt.setText("SPINNING...");
        this.spinBtnTxt.setColor("#88aacc");

        const rand = Math.random();
        let cumulative = 0;
        let winner = this.segments[this.segments.length - 1]; 

        for (let i = 0; i < this.segments.length; i++) {
            cumulative += this.segments[i].prob;
            if (rand <= cumulative) {
                winner = this.segments[i];
                break;
            }
        }

        const sliceAngle = 360 / this.segments.length;
        const winIndex = this.segments.indexOf(winner);
        const segmentCenter = (winIndex * sliceAngle) + (sliceAngle / 2);
        
        let targetRotation = 270 - segmentCenter;
        targetRotation += Phaser.Math.Between(-15, 15); 
        const totalRotation = targetRotation + (360 * 6); 

        let lastAngle = this.wheelContainer.angle;
        let accumulatedAngle = 0;

        this.tweens.add({
            targets: this.wheelContainer,
            angle: totalRotation,
            duration: 5000,
            ease: 'Cubic.easeOut', 
            onUpdate: (tween, target) => {
                let currentAngle = target.angle;
                let diff = currentAngle - lastAngle;
                if (diff < 0) diff += 360; 
                
                accumulatedAngle += diff;
                if (accumulatedAngle >= sliceAngle) {
                    this.playSound('sfx_tick', 0.6);
                    accumulatedAngle -= sliceAngle;
                }
                lastAngle = currentAngle;
            },
            onComplete: () => {
                this.wheelContainer.angle %= 360;
                if(this.pointerBounce) this.pointerBounce.stop();
                this.pointer.y = this.pointer.originalY; 
                this.showReward(winner);
            }
        });

        this.pointerBounce = this.tweens.add({
            targets: this.pointer,
            y: this.pointer.originalY - 15,
            duration: 80,
            yoyo: true,
            repeat: -1
        });
    }

    showReward(winner) {
        this.cameras.main.flash(400, 255, 255, 255);

        if (winner.id === 'jackpot') {
            this.playSound('sfx_jackpot');
        } else {
            this.playSound('sfx_victory', 0.8);
        }

        if (!window.GameState) window.GameState = {};

        if (winner.type === 'keys') {
            window.GameState.keys = (window.GameState.keys || 0) + winner.amount;
        } else if (winner.type === 'debris') {
            window.GameState.debris = (window.GameState.debris || 0) + winner.amount;
        } else if (winner.type === 'skips') {
            window.GameState.rewardSkips = (window.GameState.rewardSkips || 0) + winner.amount;
        } else if (winner.type === 'booster') {
            if (!window.GameState.boosters) window.GameState.boosters = {};
            window.GameState.boosters[winner.key] = (window.GameState.boosters[winner.key] || 0) + winner.amount;
        }

        if (typeof window.saveCurrency === 'function') window.saveCurrency();
        this.updateCurrencyDisplay();

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // --- FIXED OVERLAY IMPLEMENTATION ---
        // Properly placed at center (cx, cy) to fully cover the game screen. Depth set to 999.
        const overlay = this.add.rectangle(cx, cy, 720, 1480, 0x000000, 0.85).setInteractive({ useHandCursor: true });
        overlay.setDepth(999);

        const popup = this.add.container(cx, cy).setDepth(1000).setScale(0);

        // Blocking hit area inside the container so internal box clicks don't dismiss the reward early
        const boxBarrier = this.add.rectangle(0, 0, 600, 600, 0x000000, 0).setInteractive();
        popup.add(boxBarrier);
        
        const burst = this.add.graphics();
        burst.fillStyle(winner.color, 0.3);
        for(let i=0; i<12; i++) {
            burst.slice(0, 0, 700, Phaser.Math.DegToRad(i*30), Phaser.Math.DegToRad(i*30+15));
        }
        burst.fillPath();
        
        this.tweens.add({
            targets: burst,
            rotation: Math.PI * 2,
            duration: 10000,
            repeat: -1
        });

        const box = this.add.graphics();
        box.fillStyle(0x000c22, 0.95);
        box.fillRoundedRect(-300, -300, 600, 600, 24);
        box.lineStyle(5, winner.color, 1);
        box.strokeRoundedRect(-300, -300, 600, 600, 24);
        
        const boxGlow = this.add.graphics();
        boxGlow.fillStyle(winner.color, 0.2);
        boxGlow.fillCircle(0, 0, 220); 
        
        const title = this.add.text(0, -180, "Congratulations!", { 
            fontSize: "60px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 900, color: "#ffffff", 
            shadow: { color: "#000000", blur: 6, stroke: true, fill: true }
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, -130, "YOU WON", {
            fontSize: "28px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 700, color: "#aaccff", letterSpacing: 3 
        }).setOrigin(0.5);

        const icon = this.add.image(0, -10, winner.icon).setScale(3.5); 
        
        const label = this.add.text(0, 110, winner.label, {
            fontSize: "46px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 900, color: "#ffffff",
            shadow: { color: Phaser.Display.Color.IntegerToColor(winner.color).rgba, blur: 20, fill: true }
        }).setOrigin(0.5);

        const btnContainer = this.add.container(0, 220);
        const btnW = 340;
        const btnH = 80;
        const btnR = btnH / 2;

        const btnBg = this.add.graphics();
        const drawClaimBtn = (hover) => {
            btnBg.clear();
            btnBg.fillGradientStyle(
                hover ? 0x002266 : 0x001133, hover ? 0x002266 : 0x001133, 
                hover ? 0x0088ff : 0x004488, hover ? 0x0088ff : 0x004488, 1
            );
            btnBg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, btnR);
            btnBg.lineStyle(hover ? 4 : 3, hover ? 0xffffff : 0x00ffff, 0.8);
            btnBg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, btnR);
        };
        drawClaimBtn(false);

        const btnHitArea = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 0, "সংগ্রহ করুন (CLAIM)", {
            fontSize: "32px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 800, color: "#ffffff" 
        }).setOrigin(0.5);

        btnContainer.add([btnBg, btnTxt, btnHitArea]);
        popup.add([burst, boxGlow, box, title, subtitle, icon, label, btnContainer]);

        this.tweens.add({
            targets: popup,
            scale: 1,
            duration: 600,
            ease: 'Back.out'
        });

        // --- SHARED AUTO-CLAIM CLEANUP ROUTINE ---
        const autoClaimAction = () => {
            this.playSound('sfx_coin');
            overlay.destroy();
            popup.destroy();
            
            this.isSpinning = false;
            this.drawBtn(false); 
            this.spinBtnTxt.setText("ঘুরান (SPIN)");
            this.spinBtnTxt.setColor("#ffffff");
            this.btnPulse.resume();
        };

        // Triggers auto-claim on explicit button touch OR clicking anywhere outside on the black overlay
        btnHitArea.on('pointerdown', autoClaimAction);
        overlay.on('pointerdown', autoClaimAction);
        
        btnHitArea.on('pointerover', () => drawClaimBtn(true));
        btnHitArea.on('pointerout', () => drawClaimBtn(false));
    }

    showError(msg) {
        this.playSound('sfx_error');
        
        const errorContainer = this.add.container(360, 1120).setDepth(2000);
        
        const txt = this.add.text(0, 0, msg, {
            fontSize: "32px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 800, 
            color: "#ffffff"
        }).setOrigin(0.5);

        const bg = this.add.graphics();
        bg.fillStyle(0xaa0000, 0.95);
        bg.fillRoundedRect(-txt.width/2 - 20, -txt.height/2 - 12, txt.width + 40, txt.height + 24, 16);
        bg.lineStyle(2, 0xff4444, 1);
        bg.strokeRoundedRect(-txt.width/2 - 20, -txt.height/2 - 12, txt.width + 40, txt.height + 24, 16);

        errorContainer.add([bg, txt]);

        if (this.dText && this.debrisIcon) {
            this.tweens.add({
                targets: [this.dText, this.debrisIcon],
                scale: 1.5,
                tint: 0xff0000,
                duration: 100,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.dText.clearTint();
                    this.debrisIcon.clearTint();
                    this.dText.setScale(1);
                    this.debrisIcon.setScale(0.70);
                }
            });
        }

        this.tweens.add({
            targets: errorContainer,
            y: 1000,
            alpha: 0,
            duration: 6500, 
            ease: "Power2",
            onComplete: () => errorContainer.destroy()
        });
        
        this.cameras.main.shake(200, 0.01); 
    }

    updateCurrencyDisplay() {
        const state = window.GameState || {};
        if(this.kText) this.kText.setText((state.keys || 0).toString());
        if(this.dText) this.dText.setText((state.debris || 0).toString());
    }
}