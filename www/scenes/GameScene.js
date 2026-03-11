class GameScene extends GameBase {
    constructor() {
        super("GameScene");
    }

    create() {
        const h = this.cameras.main.height;
        const w = 720;

        this.isResuming = false;
        this.hasRevived = false;

        // --- 1. WAKE LOCK & VISIBILITY HANDLER ---
        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen').then(lock => {
                    this.wakeLock = lock;
                }).catch(err => console.log('Wake Lock error:', err));
            } catch (err) { }
        }

        // Handle tab switching (Pause game & Music)
        this.visibilityHandler = () => {
            if (document.hidden) {
                if (this.scene.isActive("GameScene")) {
                    // Pause Music
                    const bgMusic = this.sound.get('bg_music');
                    if (bgMusic && bgMusic.isPlaying) bgMusic.pause();

                    this.scene.pause("GameScene");
                    this.scene.pause("QuestionScene");
                    this.scene.launch("PauseScene");

                    if (this.wakeLock) {
                        this.wakeLock.release().then(() => { this.wakeLock = null; });
                    }
                }
            } else {
                if (!this.wakeLock && 'wakeLock' in navigator) {
                    navigator.wakeLock.request('screen').then(lock => this.wakeLock = lock);
                }
            }
        };
        document.addEventListener("visibilitychange", this.visibilityHandler);

        // --- 2. STATE INITIALIZATION ---
        if (typeof GameState.keys === 'undefined') GameState.keys = 0;
        if (typeof GameState.debris === 'undefined') GameState.debris = 0;
        if (typeof GameState.boosters === 'undefined') GameState.boosters = {};

        // Initialize Textures & SFX Wrappers
        if (typeof GameTextures !== 'undefined') GameTextures.init(this);
        if (typeof GameSFX !== 'undefined') GameSFX.init(this);

        this.events.on('shutdown', this.shutdown, this);

        // Game Variables
        this.fireRate = 250;
        this.backgroundSpeed = 1;
        this.fireShieldActive = false;
        this.batteryMultiplier = 1.0;

        this.primaryFireCounter = 0;
        this.specialWeaponCounter = 0;
        this.missileFireCounter = 0;
        this.sideWeaponCounter = 0;

        this.hasShield = false;
        this.magnetActive = false;
        this.isInvulnerable = false;
        this.magnetTimer = null;
        this.magnetDuration = 0;

        this.regenDelay = 10000;
        this.lastRegenTime = 0;
        this.isRegenerating = false;

        // --- 3. SCENE SETUP ---
        this.createSpaceBackground();
        this.createParticleSystems();

        // Player Setup
        this.targetX = 360;
        this.targetY = h - 150;

        this.player = this.physics.add.image(this.targetX, this.targetY, "player_lv1")
            .setCollideWorldBounds(true)
            .setScale(0.9);
        this.player.setSize(90, 90);

        // Physics Groups
        this.bullets = this.physics.add.group();
        this.missiles = this.physics.add.group();
        this.sideBullets = this.physics.add.group();
        this.specialWeapons = this.physics.add.group();

        this.enemies = this.physics.add.group();
        this.bossBullets = this.physics.add.group();
        this.batteries = this.physics.add.group();
        this.obstacles = this.physics.add.group();
        this.powerUps = this.physics.add.group();

        // Visual Effects (Shields/Magnets)
        this.shieldArc = this.add.graphics().setDepth(10).setVisible(false);
        this.magnetArc = this.add.graphics().setDepth(9).setVisible(false);
        this.fireShieldArc = this.add.graphics().setDepth(11).setVisible(false);

        // --- 4. INPUT HANDLING ---
        this.input.on("pointermove", p => {
            let minY = 480;
            let maxY = h - 100;
            if (GameState.bossActive) minY = 300; 

            this.targetX = Phaser.Math.Clamp(p.x, 50, 670);
            this.targetY = Phaser.Math.Clamp(p.y, minY, maxY);
        });

        // --- 5. TIMERS ---
        this.weaponTimer = this.time.addEvent({
            delay: this.fireRate,
            loop: true,
            callback: this.fireWeapon,
            callbackScope: this
        });

        this.spawnTimer = this.time.addEvent({
            delay: 1500,
            loop: true,
            callback: this.spawnEnemy,
            callbackScope: this
        });

        this.enemyFireTimer = this.time.addEvent({
            delay: 1800,
            loop: true,
            callback: this.enemiesFireBack,
            callbackScope: this
        });

        this.obstacleTimer = this.time.addEvent({
            delay: 4500,
            loop: true,
            callback: this.spawnObstacle,
            callbackScope: this
        });

        // --- 6. COLLISIONS ---
        // Player Attacks vs Enemies
        this.physics.add.overlap(this.bullets, this.enemies, this.damageEnemy, null, this);
        this.physics.add.overlap(this.missiles, this.enemies, this.damageEnemy, null, this);
        this.physics.add.overlap(this.sideBullets, this.enemies, this.damageEnemy, null, this);
        this.physics.add.overlap(this.specialWeapons, this.enemies, this.damageEnemy, null, this);
        
        // Player Attacks vs Obstacles
        this.physics.add.overlap(this.bullets, this.obstacles, this.damageObstacle, null, this);
        this.physics.add.overlap(this.missiles, this.obstacles, this.damageObstacle, null, this);
        this.physics.add.overlap(this.sideBullets, this.obstacles, this.damageObstacle, null, this);
        this.physics.add.overlap(this.specialWeapons, this.obstacles, this.damageObstacle, null, this);

        // Enemies/Env vs Player
        this.physics.add.overlap(this.player, [this.enemies, this.bossBullets], this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.hitPlayer, null, this);
        
        // Collectibles
        this.physics.add.overlap(this.player, this.batteries, this.collectBattery, null, this);
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);

        // Boss UI
        this.bossBarBg = this.add.rectangle(360, 110, 600, 16, 0x333333).setVisible(false).setAlpha(.3);
        this.bossBarFill = this.add.rectangle(60, 110, 0, 16, 0x6E6E6E).setOrigin(0, 0.5).setVisible(false).setAlpha(.6);
        this.warningText = this.add.text(360, h / 2, "BOSS APPROACHING!", {
            fontSize: '54px', color: '#ff0000', fontStyle: 'bold', fontFamily: "'Anek Bangla'",
            stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setVisible(false);

        // Global Logic Updates
        window.updateLevelTargets();
        this.updateGameSpeed();
        this.createBoosterUI();

        // --- 7. MUSIC MANAGER ---
        const menuBgm = this.sound.get('menubgm');
        if (menuBgm) menuBgm.stop();

        let bgMusic = this.sound.get('bg_music');
        const globalMusicVol = window.GameState.musicVolume !== undefined ? window.GameState.musicVolume : 0.5;

        if (!bgMusic) {
            bgMusic = this.sound.add('bg_music', { loop: true, volume: globalMusicVol });
            bgMusic.play();
        } else {
            bgMusic.setVolume(globalMusicVol); 
            if (!bgMusic.isPlaying) bgMusic.play();
        }
    }

    /**
     * Helper Method to play programmatic sounds with volume control and jitter.
     */
    playSFX(key, baseVolume = 0.5, allowJitter = true) {
        if (!this.sound || !this.cache.audio.exists(key)) return;

        const globalSfxVol = window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0;
        const finalVolume = Phaser.Math.Clamp(baseVolume * globalSfxVol, 0, 1);

        if (finalVolume <= 0) return; 

        let config = { volume: finalVolume };

        if (allowJitter) {
            config.detune = Phaser.Math.Between(-650, 650);
        }

        this.sound.play(key, config);
    }

    // --- CLEANUP ---
    shutdown() {
        if (this.visibilityHandler) {
            document.removeEventListener("visibilitychange", this.visibilityHandler);
        }
        
        const bgMusic = this.sound.get('bg_music');
        if (bgMusic) bgMusic.stop();

        if (this.bossAttackTimer) this.bossAttackTimer.remove();
        if (this.weaponTimer) this.weaponTimer.remove();
        if (this.spawnTimer) this.spawnTimer.remove();
        if (this.enemyFireTimer) this.enemyFireTimer.remove();
        if (this.obstacleTimer) this.obstacleTimer.remove();
        if (this.magnetTimer) this.magnetTimer.remove();
        if (this.bossTeleportTimer) this.bossTeleportTimer.remove();

        // Prevent memory leak if scene shuts down while revive interval is active
        if (this.reviveInterval) {
            clearInterval(this.reviveInterval);
        }

        if (this.physics && this.physics.world) {
            this.physics.world.timeScale = 1.0;
        }
        this.time.timeScale = 1.0;

        this.tweens.killAll();
        this.time.removeAllEvents();
        
        if (this.wakeLock) {
            this.wakeLock.release().then(() => this.wakeLock = null);
        }
    }

    update() {
        if (this.isResuming) return;
        const dt = this.time.timeScale;
        const hView = this.cameras.main.height;
        const bottomEdge = hView + 100;
        const topEdge = -100;

        // Background Animation
        this.updateDynamicBackground();
        const layers = [
            { group: this.nebulae, speed: 1 * this.backgroundSpeed * dt },
            { group: this.bgDebris, speed: 3 * this.backgroundSpeed * dt },
        ];

        layers.forEach(layer => {
            if (layer.group) {
                layer.group.children.each(item => {
                    item.y += layer.speed;
                    if (item.y > bottomEdge) item.y = -100;
                });
            }
        });

        this.checkBossSpawn();

        const lerpSpeed = 0.2 * dt;
        this.player.x = Phaser.Math.Linear(this.player.x, this.targetX, lerpSpeed);
        this.player.y = Phaser.Math.Linear(this.player.y, this.targetY, lerpSpeed);

        // --- Visual Effects Update ---
        if (this.hasShield) {
            this.shieldArc.clear();
            const pulse = Math.sin(this.time.now / 100);
            this.shieldArc.lineStyle(4, 0xffcc00, 0.8 + pulse * 0.2);
            this.shieldArc.fillStyle(0xffcc00, 0.15 + pulse * 0.1);

            this.shieldArc.beginPath();
            this.shieldArc.arc(this.player.x, this.player.y, 75, Phaser.Math.DegToRad(225), Phaser.Math.DegToRad(315));
            this.shieldArc.strokePath();
            this.shieldArc.fillPath();
            
            this.shieldArc.lineStyle(2, 0xffff00, 0.5);
            this.shieldArc.beginPath();
            this.shieldArc.arc(this.player.x, this.player.y, 60 + pulse * 5, Phaser.Math.DegToRad(225), Phaser.Math.DegToRad(315));
            this.shieldArc.strokePath();
        }

        if (this.magnetActive) {
            this.magnetArc.setVisible(true);
            this.magnetArc.clear();
            const pulse = Math.sin(this.time.now / 100);
            
            this.magnetArc.lineStyle(4, 0xcc00ff, 0.8 + pulse * 0.2);
            this.magnetArc.fillStyle(0xcc00ff, 0.15 + pulse * 0.1);

            const arcY = this.player.y + 20;
            this.magnetArc.beginPath();
            this.magnetArc.arc(this.player.x, arcY, 75, Phaser.Math.DegToRad(45), Phaser.Math.DegToRad(135));
            this.magnetArc.strokePath();
            this.magnetArc.fillPath();

            this.magnetArc.lineStyle(2, 0xff00ff, 0.5);
            this.magnetArc.beginPath();
            this.magnetArc.arc(this.player.x, arcY, 60 + pulse * 5, Phaser.Math.DegToRad(45), Phaser.Math.DegToRad(135));
            this.magnetArc.strokePath();

            this.batteries.children.each(battery => {
                if (battery.active) {
                    const angle = Phaser.Math.Angle.Between(battery.x, battery.y, this.player.x, this.player.y);
                    const speed = 1500;
                    battery.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                }
            });
        } else {
            if (this.magnetArc.visible) this.magnetArc.setVisible(false);
        }

        if (this.fireShieldActive) {
            this.fireShieldArc.clear();
            const alpha = 0.5 + Math.sin(this.time.now / 100) * 0.3;
            this.fireShieldArc.lineStyle(6, 0xff4400, alpha);
            this.fireShieldArc.beginPath();
            this.fireShieldArc.arc(this.player.x, this.player.y, 85, 0, Math.PI * 2);
            this.fireShieldArc.strokePath();
        }

        // --- Ship Texture Update ---
        const equipped = GameState.equippedShip || "default";
        const level = GameState.weaponLevel || 1;
        let shipTexture = (equipped === "default") ? `player_lv${level}` : `${equipped}_lv${level}`;
        if (!this.textures.exists(shipTexture)) shipTexture = (equipped === "default") ? "player_lv1" : `${equipped}_lv1`;

        if (this.player.texture.key !== shipTexture) {
            this.player.setTexture(shipTexture);
            this.tweens.add({ targets: this.player, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true });
        }

        // --- Entity Logic Loops ---
        this.distantStars.children.each(s => { s.y += 0.3 * this.backgroundSpeed; if (s.y > hView) s.y = -10; });
        this.stars.children.each(s => { 
            s.y += 2 * this.backgroundSpeed * dt; 
            if (s.y > hView) { s.y = -10; s.x = Phaser.Math.Between(0, 720); }
        });
        this.fastStars.children.each(s => {
            s.y += (.15 + (this.backgroundSpeed * 4));
            if (s.y > hView) { s.y = -10; s.x = Phaser.Math.Between(0, 720); }
        });
        this.nebulae.children.each(n => { n.y += 0.2 * this.backgroundSpeed; if (n.y > hView + 200) n.y = -200; });

        this.engineEmitter.emitParticleAt(this.player.x, this.player.y + 55, 2);

        // Enemy Logic
        this.enemies.children.each(e => {
            if (!e.active) return;

            if (e.enemyType === "centipede" && e.segments) {
                e.segments.forEach((seg, i) => {
                    if (seg.active) {
                        const target = i === 0 ? e : e.segments[i - 1];
                        const angle = Phaser.Math.Angle.Between(seg.x, seg.y, target.x, target.y);
                        const dist = Phaser.Math.Distance.Between(seg.x, seg.y, target.x, target.y);
                        const targetDist = 45;

                        if (dist > targetDist) {
                            seg.x += Math.cos(angle) * (dist - targetDist) * 0.3;
                            seg.y += Math.sin(angle) * (dist - targetDist) * 0.3;
                        }
                        this.engineEmitter.emitParticleAt(seg.x, seg.y - 20, 1);
                    }
                });
            }

            this.engineEmitter.emitParticleAt(e.x, e.y - 35, 1);
            if (e.y > 1500) { e.destroy(); return; }

            if (e.texture.key === "enemy_common") e.angle += (e.rotSpeed || 1);
            if (e.movePattern === "wiggle") {
                e.wiggleTimer = (e.wiggleTimer || 0) + 0.1;
                e.x += Math.sin(e.wiggleTimer) * 2;
                e.rotation = Math.sin(e.wiggleTimer) * 0.2;
            }
            if (e.enemyType === "spinner") e.rotation += 0.08;
            if (e.movePattern === "jet_pulse") {
                e.pulseTimer = (e.pulseTimer || 0) + 1;
                if (e.pulseTimer % 120 < 20) e.setVelocityY(450);
                else e.setVelocityY(Phaser.Math.Linear(e.body.velocity.y, 80, 0.05));
            }

            if (e.enemyType === "dragon") {
                if (!e.fireTimer) e.fireTimer = 0;
                e.fireTimer++;
                if (e.fireTimer >= this.dragonFireThreshold) {
                    e.fireTimer = 0;
                    const flame = this.bossBullets.create(e.x, e.y + 30, "enemyBullet");
                    flame.setVelocityY(500);
                    flame.setTint(0xFF00FF);
                    flame.setScale(1.1);
                    this.playSFX('sfx_enemy_shoot', 0.1);
                }
            }

            if (e.enemyType === "octopus") {
                if (Phaser.Math.Between(0, 1000) > 995) {
                    this.playSFX('sfx_enemy_shoot', 0.15);
                    [-20, 0, 20].forEach(angle => {
                        const b = this.bossBullets.create(e.x, e.y + 40, "bullet_octopus");
                        const rad = Phaser.Math.DegToRad(angle + 90);
                        b.setVelocity(Math.cos(rad) * 220, Math.sin(rad) * 220);
                        b.body.setCircle(6);
                        b.body.setOffset(9, 9);
                        b.body.checkCollision.none = true;
                        this.tweens.add({ targets: b, scale: 1.4, alpha: 0, duration: 800, ease: 'Sine.easeIn', onComplete: () => { if (b.active) b.destroy(); } });
                    });
                }
            }
        });

        // Homing Missile Logic
        this.missiles.children.each(missile => {
            if (!missile.active) return;
            if (missile.y < topEdge || missile.x < -100 || missile.x > 820 || missile.y > bottomEdge) {
                missile.destroy();
                return;
            }

            let closestEnemy = null;
            let closestDist = Infinity;

            this.enemies.children.each(enemy => {
                if (enemy.active) {
                    const dist = Phaser.Math.Distance.Between(missile.x, missile.y, enemy.x, enemy.y);
                    if (dist < closestDist && dist < 400) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                    if (enemy.y > bottomEdge - 100) {
                        if (enemy.tier === "centipede" && enemy.segments) {
                            enemy.segments.forEach(s => { if (s && s.active) s.destroy(); });
                        }
                        if (enemy.tier === "centipede_segment") enemy.destroy();
                        enemy.destroy();
                    }
                }
            });

            if (closestEnemy) {
                const angle = Phaser.Math.Angle.Between(missile.x, missile.y, closestEnemy.x, closestEnemy.y);
                const currentAngle = Math.atan2(missile.body.velocity.y, missile.body.velocity.x);
                const angleDiff = Phaser.Math.Angle.Wrap(angle - currentAngle);
                const turnSpeed = 0.03;
                const newAngle = currentAngle + Phaser.Math.Clamp(angleDiff, -turnSpeed, turnSpeed);
                const speed = 700;
                missile.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
                missile.setRotation(newAngle + Math.PI / 2);
                if (Math.random() > 0.7) this.hitEmitter.emitParticle(1, missile.x, missile.y);
            }
        });

        // Garbage Collection
        this.obstacles.children.each(obs => { if (obs.active && obs.y > bottomEdge) obs.destroy(); });
        this.powerUps.children.each(pu => { if (pu.active && pu.y > bottomEdge) pu.destroy(); });
        [this.bullets, this.sideBullets, this.specialWeapons].forEach(group => {
            group.children.each(p => { if (p.y < topEdge || p.x < -100 || p.x > 820) p.destroy(); });
        });
        
        if (this.bossBullets) {
            this.bossBullets.children.each(bullet => {
                if (bullet.y > bottomEdge || bullet.y < topEdge || bullet.x < -50 || bullet.x > 770) bullet.destroy();
            });
        }

        // Health Regen Logic
        if (GameState.lives < 3 && !GameState.bossActive) {
            if (!this.isRegenerating) {
                this.lastRegenTime = this.time.now;
                this.isRegenerating = true;
            }
            if (this.time.now > this.lastRegenTime + this.regenDelay) {
                this.regenerateLife();
                this.lastRegenTime = this.time.now;
            }
        } else {
            this.isRegenerating = false;
        }
    }

    // --- BOOSTERS ---
    createBoosterUI() {
        if (typeof GameState.boosters === 'undefined') GameState.boosters = {};
        this.fireShieldActive = false;
        this.batteryMultiplier = 1.0;

        const boosters = GameState.boosters;
        const buttonY = 1280;
        const startX = 660;
        let offset = 0;

        this.boosterButtons = [];

        const createBtn = (key, icon, callback) => {
            if (!boosters[key] || boosters[key] <= 0) return;

            const btn = this.add.image(startX - offset, buttonY, icon).setScale(1.5).setInteractive();
            const countBadge = this.add.circle(startX - offset + 20, buttonY - 20, 12, 0xff0000);
            const countText = this.add.text(startX - offset + 20, buttonY - 20, boosters[key], { fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);

            this.tweens.add({ targets: [btn, countBadge, countText], alpha: 0.5, duration: 500, yoyo: true, repeat: -1 });

            btn.on('pointerdown', () => {
                this.playSFX('sfx_click', 0.6);
                boosters[key]--;
                window.saveCurrency();
                callback();
                this.cameras.main.flash(200, 255, 255, 255);
                btn.destroy();
                countBadge.destroy();
                countText.destroy();
            });

            this.boosterButtons.push({ btn, countBadge, countText });
            offset += 75;
        };

        createBtn("fireShield", "icon_booster_fire", () => { this.activateFireShieldBooster(); });
        createBtn("speedBoost", "icon_booster_speed", () => { this.activateSpeedBooster(); });
        createBtn("batteryEff", "icon_booster_battery", () => { this.activateBatteryBooster(); });

        this.time.delayedCall(20000, () => {
            this.boosterButtons.forEach(b => {
                if (b.btn && b.btn.active) {
                    this.tweens.add({ targets: [b.btn, b.countBadge, b.countText], alpha: 0, scale: 0, duration: 500, onComplete: () => {
                        b.btn.destroy();
                        b.countBadge.destroy();
                        b.countText.destroy();
                    } });
                }
            });
        });
    }

    activateFireShieldBooster() {
        this.fireShieldActive = true;
        this.fireShieldArc.setVisible(true);
        this.playSFX('sfx_shield_activate', 0.6, false);

        const txt = this.add.text(360, 500, "FIRE SHIELD ACTIVE", { fontSize: '42px', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: txt, alpha: 0, duration: 3000, onComplete: () => txt.destroy() });

        this.time.delayedCall(20000, () => {
            this.fireShieldActive = false;
            this.fireShieldArc.setVisible(false);
            this.playSFX('sfx_shield_break', 0.5, false);
            const endTxt = this.add.text(360, 500, "SHIELD EXPIRED", { fontSize: '42px', color: '#ff4444' }).setOrigin(0.5);
            this.tweens.add({ targets: endTxt, alpha: 0, duration: 3000, onComplete: () => endTxt.destroy() });
        });
    }

    activateSpeedBooster() {
        this.playSFX('sfx_speed_boost', 0.6, false); 
        if (!this.isSpeedBoosted) {
            this.originalBgSpeed = this.backgroundSpeed;
            this.originalWeaponLevel = GameState.weaponLevel;
            this.isSpeedBoosted = true;
        }

        GameState.weaponLevel = 3;
        this.physics.world.timeScale = 0.5; // Slow Motion physics
        this.time.timeScale = 1; // Normal Time for UI
        this.backgroundSpeed = 4.0; // Fast visual speed

        const txt = this.add.text(360, 540, "SPEED & LEVEL 3 BOOST", {
            fontSize: '34px', color: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(200);
        this.tweens.add({ targets: txt, alpha: 0, scale: 2, duration: 3000, onComplete: () => txt.destroy() });

        this.time.delayedCall(60000, () => {
            if (this.physics && this.physics.world) {
                this.physics.world.timeScale = 1.0;
                this.time.timeScale = 1.0;
                this.backgroundSpeed = this.originalBgSpeed || 1.0;
                GameState.weaponLevel = this.originalWeaponLevel = 3;
                this.isSpeedBoosted = false;

                const endTxt = this.add.text(360, 540, "BOOST EXPIRED", { fontSize: '42px', color: '#ff0000' }).setOrigin(0.5).setDepth(200);
                this.tweens.add({ targets: endTxt, alpha: 0, duration: 3000, onComplete: () => endTxt.destroy() });
            }
        });
    }

    activateBatteryBooster() {
        this.batteryMultiplier = 2.0;
        this.playSFX('sfx_powerup', 0.6);
        const txt = this.add.text(360, 580, "BATTERY BOOST (2x)", { fontSize: '42px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: txt, alpha: 0, duration: 3000, onComplete: () => txt.destroy() });
        this.time.delayedCall(60000, () => { this.batteryMultiplier = 1.0; });
    }

    // --- COMBAT SYSTEM ---
    fireWeapon() {
        const x = this.player.x;
        const y = this.player.y - 60;
        const stage = GameState.bossStage;
        const level = GameState.weaponLevel;

        this.playSFX('sfx_shoot', 0.5);

        if (level === 1) {
            this.bullets.create(x, y, "bullet").setVelocityY(-1100).setScale(1.2);
        } else if (level === 2) {
            this.bullets.create(x - 22, y, "bullet").setVelocityY(-1100).setScale(1.1);
            this.bullets.create(x + 22, y, "bullet").setVelocityY(-1100).setScale(1.1);
        } else if (level === 3) {
            this.bullets.create(x - 18, y, "bullet").setVelocityY(-1100).setScale(1.1);
            this.bullets.create(x + 18, y, "bullet").setVelocityY(-1100).setScale(1.1);

            const speed = 900;
            const leftAngle = Phaser.Math.DegToRad(-94);
            const left = this.sideBullets.create(x - 30, y + 10, "side_bullet").setScale(1.2);
            left.setVelocity(Math.cos(leftAngle) * speed, Math.sin(leftAngle) * speed);
            left.setRotation(leftAngle + Math.PI / 2);

            const rightAngle = Phaser.Math.DegToRad(-86);
            const right = this.sideBullets.create(x + 30, y + 10, "side_bullet").setScale(1.2);
            right.setVelocity(Math.cos(rightAngle) * speed, Math.sin(rightAngle) * speed);
            right.setRotation(rightAngle + Math.PI / 2);

        } else if (level >= 4) {
            this.bullets.create(x - 18, y - 10, "bullet").setVelocityY(-1200).setScale(1.1);
            this.bullets.create(x + 18, y - 10, "bullet").setVelocityY(-1200).setScale(1.1);

            const speed = 1050;
            this.sideWeaponCounter++;

            if (this.sideWeaponCounter >= 2) {
                this.sideWeaponCounter = 0;
                const angles = [-98, -94, -86, -82];
                const xOffsets = [-55, -30, 30, 55];
                const yOffsets = [25, 8, 8, 25];

                angles.forEach((deg, i) => {
                    const rad = Phaser.Math.DegToRad(deg);
                    const b = this.sideBullets.create(x + xOffsets[i], y + yOffsets[i], "side_bullet");
                    b.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
                    b.setRotation(rad + Math.PI / 2);
                    b.setScale((i === 0 || i === 3) ? 1.3 : 1.1);
                });
            }

            this.missileFireCounter++;
            if (this.missileFireCounter >= 12) {
                this.missileFireCounter = 0;
                const missile = this.missiles.create(x, y, "missile").setScale(1.2);
                missile.setVelocityY(-600);
                missile.setRotation(0);
                this.playSFX('sfx_missile', 0.2); 
            }

            this.specialWeaponCounter++;
            const shockwaveThreshold = 35;
            if (this.specialWeaponCounter >= shockwaveThreshold) {
                this.specialWeaponCounter = 0;
                this.playSFX('sfx_shockwave', 0.1, false); 
                if (stage === 0) this.spawnShockwave("aura_lightning", "lightning");
                else if (stage === 1) this.spawnShockwave("aura_ice", "ice");
                else if (stage >= 2) this.spawnShockwave("aura_plasma", "plasma");
            }
        }
    }

    damageObstacle(projectile, obstacle) {
        let damage = 1;
        const weaponType = projectile.texture.key;
        const damageMultiplier = 1 + (this.getGlobalProgress() * 0.1);

        if (weaponType === "missile") damage = 4;
        else if (weaponType === "side_bullet") damage = 2;
        else if (weaponType === "lightning_bolt") {
            damage = 3;
            projectile.pierceCount = (projectile.pierceCount || 0) + 1;
            if (projectile.pierceCount >= 3) projectile.destroy();
        } else if (weaponType === "ice_shard") damage = 2;
        else if (weaponType === "plasma_wave") damage = 3;

        obstacle.hp -= (damage * damageMultiplier);
        this.playSFX('sfx_rock_hit', 0.3); 
        obstacle.x += Phaser.Math.FloatBetween(-2, 2);
        obstacle.y += Phaser.Math.FloatBetween(-2, 2);
        obstacle.setAlpha(0.5);
        this.time.delayedCall(60, () => { if (obstacle && obstacle.active) obstacle.setAlpha(1); });

        this.hitEmitter.emitParticle(5, projectile.x, projectile.y);
        if (weaponType !== "lightning_bolt") projectile.destroy();

        if (obstacle.hp <= 0) {
            this.playSFX('sfx_explode', 0.35);
            this.createExplosion(obstacle.x, obstacle.y, 0x888888, 10);
            GameState.score += 15;

            if (GameState.gameMode !== "revision" && Math.random() < 0.5) {
                GameState.debris = (GameState.debris || 0) + 1;
                window.saveCurrency();
                const txt = this.add.text(obstacle.x, obstacle.y, "+1 Debris", { fontSize: '28px', fontFamily: 'Arial', color: '#aaccff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
                this.tweens.add({ targets: txt, y: txt.y - 60, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });
            }

            const dropChance = obstacle.obstacleType === "obstacle_mine" ? 0.75 : obstacle.obstacleType === "obstacle_debris" ? 0.6 : 0.4;
            if (Math.random() < dropChance) this.dropPowerUp(obstacle.x, obstacle.y, obstacle.obstacleType);
            obstacle.destroy();
        }
    }

    collectPowerUp(player, powerUp) {
        const type = powerUp.powerUpType;
        powerUp.destroy();
        this.playSFX('sfx_powerup', 0.5);

        this.tweens.add({ targets: player, alpha: 0.5, duration: 100, yoyo: true, repeat: 2 });

        switch (type) {
            case "powerup_shield":
                this.playSFX('sfx_shield_activate', 0.5, false);
                this.activateShield();
                break;
            case "powerup_magnet": this.activateMagnet(); break;
            case "powerup_tnt":
                this.playSFX('sfx_TNT', 0.15, false);
                this.activateTNT(); 
                break;
            case "powerup_heart": this.addExtraLife(); break;
        }

        const names = { "powerup_shield": "SHIELD", "powerup_magnet": "MAGNET", "powerup_tnt": "SHOCKWAVE", "powerup_heart": "+1 LIFE" };
        const colors = { "powerup_shield": "#ffcc00", "powerup_magnet": "#cc00ff", "powerup_tnt": "#ff3300", "powerup_heart": "#00ff00" };
        const text = this.add.text(powerUp.x, powerUp.y, names[type], { fontSize: "40px", color: colors[type], fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: powerUp.y - 80, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
    }

    destroyEnemy(enemy) {
        this.playSFX('sfx_explode', 1);
        this.createExplosion(enemy.x, enemy.y, 0xff3300, 15);

        const scoreValue = enemy.tier === "ultra" ? 50 : enemy.tier === "rare" ? 25 : enemy.tier === "dragon" ? 60 : enemy.tier === "spinner" ? 40 : enemy.tier === "centipede" ? 35 : 10;
        GameState.score += scoreValue;

        if (enemy.segments) {
            enemy.segments.forEach(seg => {
                if (seg.active) {
                    this.createExplosion(seg.x, seg.y, 0x228822, 12);
                    seg.destroy();
                }
            });
        }

        const dropChance = enemy.tier === "ultra" ? 0.7 : enemy.tier === "rare" ? 0.6 : enemy.tier === "dragon" ? 0.6 : enemy.tier === "spinner" ? 0.9 : enemy.tier === "centipede" ? 0.2 : 0.8;

        if (!GameState.bossActive && Math.random() < dropChance) {
            let batteryTexture = "battery_green", batteryValue = 35;
            if (enemy.tier === "ultra" || enemy.tier === "centipede") { batteryTexture = "battery_red"; batteryValue = 80; }
            else if (enemy.tier === "rare" || enemy.tier === "spinner" || enemy.tier === "dragon") { batteryTexture = "battery_yellow"; batteryValue = 50; }

            const battery = this.batteries.create(enemy.x, enemy.y, batteryTexture);
            battery.setVelocityY(220);
            battery.setAlpha(.8);
            battery.batteryValue = batteryValue;
            this.tweens.add({ targets: battery, scale: { from: 1.2, to: 1.5 }, yoyo: true, duration: 400, repeat: -1 });
        }
        enemy.destroy();
    }

    damageEnemy(projectile, enemy) {
        const weaponType = projectile.weaponType || projectile.texture.key;
        let damage = 1;
        let destroyProjectile = true;

        this.playSFX('sfx_enemy_hit', 0.2); 
        enemy.x += Phaser.Math.FloatBetween(-3, 3);
        enemy.y += Phaser.Math.FloatBetween(-3, 3);

        if (weaponType === "lightning" || weaponType === "ice" || weaponType === "plasma") {
            destroyProjectile = false;
            if (enemy.lastWaveHit === projectile.waveId) return;
            enemy.lastWaveHit = projectile.waveId;
        }

        if (weaponType === "missile") damage = 8;
        else if (weaponType === "side_bullet") damage = 3;
        else if (weaponType === "bullet") damage = 2;
        else if (weaponType === "lightning") { damage = 15; this.cameras.main.shake(100, 0.005); this.createExplosion(enemy.x, enemy.y, 0xffff00, 4); }
        else if (weaponType === "ice") {
            damage = 5;
            if (enemy.body) {
                enemy.setVelocityY(enemy.body.velocity.y * 0.2);
                enemy.setTint(0x00ffff);
                this.time.delayedCall(2000, () => { if (enemy && enemy.active && enemy.body) enemy.clearTint(); });
            }
        }
        else if (weaponType === "plasma") {
            damage = 8;
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (enemy.body) {
                enemy.body.setVelocity(Math.cos(angle) * 1200, Math.sin(angle) * 1200);
                enemy.isStunned = true;
                this.tweens.add({ targets: enemy.body.velocity, x: 0, y: 150, duration: 500, ease: 'Cubic.easeOut', onComplete: () => { enemy.isStunned = false; } });
                enemy.setTint(0x00ff00);
                this.time.delayedCall(500, () => { if (enemy.active) enemy.clearTint(); });
            }
        }

        const damageMultiplier = 1 + (this.getGlobalProgress() * 0.15);
        enemy.hp -= (damage * damageMultiplier);
        enemy.setAlpha(0.3);
        this.time.delayedCall(60, () => { if (enemy && enemy.active) enemy.setAlpha(1); });

        this.hitEmitter.emitParticle(8, enemy.x, enemy.y);
        if (destroyProjectile) projectile.destroy();
        if (enemy.hp <= 0) this.destroyEnemy(enemy);
    }

    enemiesFireBack() {
        let fireCount = 0;
        const bulletSpeedMultiplier = 1 + (this.getGlobalProgress() * 0.03);

        this.enemies.children.each(e => {
            if (!e.active || fireCount > 8 || e.tier === "common") return;

            if (e.movePattern === "wave") { e.moveTimer = (e.moveTimer || 0) + 1; e.setVelocityX(Math.sin(e.moveTimer * 0.05) * 150); }
            else if (e.movePattern === "zigzag") { if (e.x < 80 || e.x > 640) e.setVelocityX(-e.body.velocity.x); }
            else if (e.movePattern === "spiral") { e.moveTimer = (e.moveTimer || 0) + 1; e.setVelocityX(Math.cos(e.moveTimer * 0.08) * 120); }
            else if (e.movePattern === "dive") {
                if (e.y > 300 && e.y < 350 && Math.random() > 0.95) {
                    const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                    e.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
                }
            }

            let fired = false;
            if (e.tier === "ultra" && e.y < this.player.y) {
                const stage = GameState.bossStage;
                if (stage === 0) {
                    const b = this.bossBullets.create(e.x, e.y + 40, "enemyBullet"); b.setVelocity(0, 450 * bulletSpeedMultiplier); fireCount++; fired = true;
                } else if (stage === 1) {
                    for (let i = -1; i <= 1; i += 2) {
                        const b = this.bossBullets.create(e.x + (i * 20), e.y + 40, "enemyBullet"); b.setVelocity(i * 80, 450 * bulletSpeedMultiplier); fireCount++; fired = true;
                    }
                } else {
                    if (Phaser.Math.Between(0, 4) === 0) {
                        const b = this.bossBullets.create(e.x, e.y + 40, "bossBullet_tracking");
                        const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                        b.setVelocity(Math.cos(angle) * 250 * bulletSpeedMultiplier, Math.sin(angle) * 450 * bulletSpeedMultiplier);
                        b.trackingBullet = true;
                        fireCount++; fired = true;
                    } else {
                        for (let i = -1; i <= 1; i++) {
                            const b = this.bossBullets.create(e.x + (i * 20), e.y + 40, "enemyBullet"); b.setVelocity(i * 80, 450 * bulletSpeedMultiplier); fireCount++; fired = true;
                        }
                    }
                }
            } else if (e.tier === "rare") {
                const b = this.bossBullets.create(e.x, e.y + 40, "enemyBullet"); b.setVelocityY(420 * bulletSpeedMultiplier); b.setTint(0xff6600); fireCount++; fired = true;
            } else if (e.tier === "centipede" || e.tier === "centipede_segment") {
                if (e.y > 0 && e.y < this.cameras.main.height && Phaser.Math.Between(0, 14) === 0) {
                    const b = this.bossBullets.create(e.x, e.y + 20, "poison_drop"); b.setScale(1.2); b.setCircle(10, 6, 6); b.setVelocityY(350 * bulletSpeedMultiplier); b.setData('isPoison', true); fireCount++; fired = true;
                }
            } else if (e.tier === "spinner") {
                const b = this.bossBullets.create(e.x, e.y + 40, "enemyBullet"); b.setVelocity(Phaser.Math.Between(-60, 60), 420 * bulletSpeedMultiplier); fireCount++; fired = true;
            }

            if (fired) this.playSFX('sfx_enemy_shoot', 0.15);
        });

        this.bossBullets.children.each(bullet => {
            if (bullet.trackingBullet && bullet.active) {
                const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, this.player.x, this.player.y);
                const currentAngle = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
                const angleDiff = Phaser.Math.Angle.Wrap(angle - currentAngle);
                const newAngle = currentAngle + Phaser.Math.Clamp(angleDiff, -0.03, 0.03);
                const speed = 450 * bulletSpeedMultiplier;
                bullet.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
                bullet.setScale(1 + Math.sin(this.time.now / 100) * 0.1);
            } else if (bullet.getData('isPoison')) {
                bullet.x += Math.sin(this.time.now / 100) * 2;
            }
        });
    }

    checkBossSpawn() {
        if (GameState.correctCount >= GameState.totalCorrectNeeded && !GameState.bossActive) {
            this.triggerBossFight();
        }
    }

    triggerBossFight() {
        GameState.bossActive = true;
        this.enemies.clear(true, true);
        this.obstacles.clear(true, true);

        this.playSFX('sfx_warning', 0.8, false);

        const qScene = this.scene.get('QuestionScene');
        if (qScene) qScene.toggleBattleMode(true);

        const stage = GameState.bossStage;
        let bossTitle = "", bossHp = 1000, bossKey = "boss_lv1";
        if (stage === 0) { bossTitle = "প্রিলি দানব (১ম বস)"; bossHp = 1500; bossKey = "boss_lv1"; }
        else if (stage === 1) { bossTitle = "লিখিত লড়াকু (২য় বস)"; bossHp = 2500; bossKey = "boss_lv2"; }
        else { bossTitle = "ভাইভা বিভীষিকা (সর্বশেষ বস)"; bossHp = 4000; bossKey = "boss_lv3"; }

        this.warningText.setText(`${bossTitle}\nআসছে...`);
        this.warningText.setVisible(true);
        this.cameras.main.shake(1500, 0.01);

        this.time.delayedCall(4000, () => {
            this.playSFX('sfx_boss_spawn', 0.8, false); 
            this.warningText.setVisible(false);
            this.boss = this.physics.add.image(360, -150, bossKey);
            this.boss.setScale(1.2);
            this.boss.hp = bossHp;
            this.boss.maxHp = this.boss.hp;
            this.boss.phase = 1;
            this.boss.setSize(216, 120);
            this.boss.setImmovable(true);

            this.tweens.add({
                targets: this.boss,
                y: 200,
                duration: 2000,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.bossBarBg.setVisible(true);
                    this.bossBarFill.setVisible(true);

                    if (stage === 0) {
                        this.boss.setVelocityX(150);
                        this.boss.setCollideWorldBounds(true).setBounce(1, 0);
                    } else if (stage === 1) {
                        this.boss.setVelocityX(200);
                        this.boss.setCollideWorldBounds(true).setBounce(1, 0);
                        this.bossDipTween = this.tweens.add({ targets: this.boss, y: 350, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                    } else if (stage >= 2) {
                        this.boss.setVelocityX(0);
                        this.bossTeleportTimer = this.time.addEvent({
                            delay: 3500, loop: true,
                            callback: () => {
                                if (!this.boss || !this.boss.active) return;
                                this.tweens.add({
                                    targets: this.boss, alpha: 0, scale: 0.5, duration: 300,
                                    onComplete: () => {
                                        if (!this.boss || !this.boss.active) return;
                                        this.boss.x = Phaser.Math.Between(120, 600);
                                        this.boss.y = Phaser.Math.Between(100, 300);
                                        this.tweens.add({ targets: this.boss, alpha: 1, scale: 1.2, duration: 300 });
                                    }
                                });
                            }
                        });
                    }
                    this.startBossCombatLoop(stage);
                }
            });
            this.physics.add.overlap(this.boss, [this.bullets, this.missiles, this.sideBullets, this.specialWeapons], (b, shot) => {
                this.handleBossHit(b, shot);
            });
        });
    }

winBossFight() {
        this.playSFX('sfx_victory', 0.8, false);

        if (GameState.gameMode !== "revision") {
            const keysWon = GameState.bossStage + 1;
            GameState.keys = (GameState.keys || 0) + keysWon;
            window.saveCurrency();

            const rewardContainer = this.add.container(360, 700);
            
            // 1. Keys Notification (shifted up to y: -30)
            const keyIcon = this.add.image(0, -30, "ui_key").setScale(1.0);
            const keyTxt = this.add.text(35, -30, `+${keysWon} চাবি পাওয়া গেছে`, { fontSize: '50px', fontFamily: "'Anek Bangla'", color: '#ffd700', stroke: '#000000', strokeThickness: 7 }).setOrigin(0, 0.5);
            const totalWidth = keyIcon.displayWidth + keyTxt.width + 10;
            keyIcon.x = -totalWidth / 2 + (keyIcon.displayWidth / 2);
            keyTxt.x = keyIcon.x + (keyIcon.displayWidth / 2) + 15;
            
            // 2. Skips Notification (placed below the keys at y: 35)
            const skipTxt = this.add.text(0, 35, "+5 Skips পাওয়া গেছে", { 
                fontSize: '40px', 
                fontFamily: "'Anek Bangla'", 
                color: '#00ffcc', 
                stroke: '#000000', 
                strokeThickness: 6 
            }).setOrigin(0.5, 0.5);

            rewardContainer.add([keyIcon, keyTxt, skipTxt]);

            this.tweens.add({ targets: rewardContainer, y: 800, alpha: 0.05, duration: 1500, delay: 2800, onComplete: () => rewardContainer.destroy() });
        }

        GameState.bossActive = false;
        GameState.bossStage++;
        GameState.correctCount = 0;
        GameState.skipsLeft += 5;
        window.updateLevelTargets();
        this.triggerShockwave();
        this.time.delayedCall(2000, () => { this.triggerSmallShockwave(); });

        if (this.bossAttackTimer) this.bossAttackTimer.remove();
        if (this.bossDipTween) this.bossDipTween.stop();
        if (this.bossTeleportTimer) this.bossTeleportTimer.remove();

        this.launchVictoryFireworks();
        this.bossBarBg.setVisible(false);
        this.bossBarFill.setVisible(false);
        this.updateGameSpeed();

        // --- DELAY ADDED HERE ---
        // Waits 4.5 seconds to let the player read rewards and see fireworks
        // before bringing the question UI back.
        const qScene = this.scene.get('QuestionScene');
        if (qScene) {
            this.time.delayedCall(4500, () => {
                qScene.toggleBattleMode(false);
            });
        }
    }

    
    collectBattery(player, battery) {
        this.playSFX('sfx_battery_collect', 0.4);

        const value = battery.batteryValue || 15;
        const finalValue = Math.ceil(value * this.batteryMultiplier);
        let textColor = "#00ff00";
        if (battery.texture.key === "battery_yellow") textColor = "#d9ff00";
        if (battery.texture.key === "battery_red") textColor = "#ffee00";

        battery.destroy();
        GameState.battery = Math.min(100, GameState.battery + finalValue);

        let displayTxt = `+${finalValue}%`;
        if (this.batteryMultiplier > 1.0) displayTxt += " (BST)";
        const text = this.add.text(battery.x, battery.y, displayTxt, { fontSize: "36px", color: textColor, fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: battery.y - 80, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
    }

    regenerateLife() {
        super.regenerateLife();
        this.playSFX('sfx_regen', 0.4, false); 
    }

    handlePlayerDeath() {
        this.playSFX('sfx_explode', 0.8, false);
        this.player.setVisible(false);
        this.player.body.enable = false;
        this.isInvulnerable = true;

        this.createExplosion(this.player.x, this.player.y, 0xff4400, 50);
        this.time.delayedCall(100, () => this.createExplosion(this.player.x + 20, this.player.y - 10, 0xffaa00, 30));
        this.time.delayedCall(200, () => this.createExplosion(this.player.x - 20, this.player.y + 20, 0xffffff, 30));

        this.cameras.main.shake(1000, 0.05);
        this.physics.world.timeScale = 0.1;

        this.time.delayedCall(1200, () => {
            this.physics.world.timeScale = 1;
            if (!this.hasRevived) {
                this.showReviveMenu();
            } else {
                this.finalizeGameOver();
            }
        });
    }

    finalizeGameOver() {
        const bgMusic = this.sound.get('bg_music');
        if (bgMusic) bgMusic.stop();

        this.physics.pause();
        this.time.paused = false;
        this.cameras.main.fade(1000, 0, 0, 0);

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
            this.physics.world.timeScale = 1;
            this.scene.stop("QuestionScene");
            this.scene.start("DeathScene");
        });
    }

    hitPlayer(player, source) {
        if (this.isInvulnerable) return;
        if (this.fireShieldActive) {
            this.createExplosion(source.x, source.y, 0xffaa00, 10);
            source.destroy();
            return;
        }
        if (this.hasShield) {
            this.playSFX('sfx_shield_break', 0.3, false);
            this.hasShield = false;
            this.shieldArc.setVisible(false);
            source.destroy();
            return;
        }

        this.playSFX('sfx_hit', 0.3);
        this.isInvulnerable = true;
        source.destroy();
        GameState.lives--;
        this.lastRegenTime = this.time.now;

        this.createExplosion(player.x, player.y, 0xff0000, 10);
        this.cameras.main.shake(300, 0.03);
        player.x += Phaser.Math.FloatBetween(-5, 5);
        player.y += Phaser.Math.FloatBetween(-5, 5);

        if (GameState.lives <= 0) {
            this.handlePlayerDeath();
        } else {
            player.setTint(0xff0000);
            this.tweens.add({
                targets: player, alpha: 0.3, duration: 150, yoyo: true, repeat: 9,
                onComplete: () => {
                    if (player && player.active) {
                        player.setAlpha(1); player.clearTint(); this.isInvulnerable = false;
                    }
                }
            });
        }
    }

    spawnShockwave(texture, type) {
        const wave = this.specialWeapons.create(this.player.x, this.player.y, texture);
        wave.weaponType = type;
        wave.alpha = 1;
        wave.setScale(0.15);
        wave.waveId = this.time.now;

        if (type === "lightning") {
            this.tweens.add({ targets: wave, scale: 3.5, alpha: 0, duration: 400, onComplete: () => wave.destroy() });
            this.cameras.main.shake(100, 0.005);
        } else if (type === "ice") {
            this.tweens.add({ targets: wave, scale: 4.5, alpha: 0, duration: 1200, onComplete: () => wave.destroy() });
        } else if (type === "plasma") {
            this.tweens.add({ targets: wave, scale: 6.5, alpha: 0, duration: 800, onComplete: () => wave.destroy() });
        }
    }

    triggerSmallShockwave() {
        this.playSFX('sfx_shockwave', 0.5, false); 
        const wave = this.add.image(this.player.x, this.player.y, 'tex_shockwave_heavy').setDepth(20).setScale(0.15).setAlpha(1);

        this.tweens.add({ targets: wave, scale: 8, alpha: 0, duration: 800, ease: 'Quad.out', onComplete: () => wave.destroy() });

        const safeZone = this.add.circle(this.player.x, this.player.y, 600);
        this.physics.add.existing(safeZone);
        this.physics.overlap(safeZone, this.bossBullets, (zone, bullet) => { this.createExplosion(bullet.x, bullet.y, 0xffaa00, 50); bullet.destroy(); });
        this.physics.overlap(safeZone, this.enemies, (zone, enemy) => { this.destroyEnemy(enemy); });
        this.physics.overlap(safeZone, this.obstacles, (zone, obs) => {
            this.createExplosion(obs.x, obs.y, 0x888888, 100);
            if (Math.random() > 0.8) this.dropPowerUp(obs.x, obs.y, obs.obstacleType);
            obs.destroy();
        });
        safeZone.destroy();
    }

    spawnBossMinions(stage, count = 2) {
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(50, 670);
            const type = (stage === 0) ? "enemy_common" : (stage === 1 ? "enemy_octopus" : "enemy_dragon");
            const minion = this.enemies.create(x, 200, type);
            minion.hp = 10;
            minion.setVelocityY(150);
            minion.setAlpha(0.8);
            minion.setScale(1.2);
            this.tweens.add({ targets: minion, scale: { from: 0, to: 1.2 }, duration: 500 });
        }
    }

    handleBossHit(boss, shot) {
        const weaponType = shot.texture.key;
        let damage = 1;
        const damageMultiplier = 1 + (this.getGlobalProgress() * 0.15);

        if (weaponType === "missile") damage = 8;
        else if (weaponType === "side_bullet") damage = 3;
        else if (weaponType === "bullet") damage = 2;
        else if (weaponType === "lightning_bolt") { damage = 6; shot.pierceCount++; if (shot.pierceCount >= 3) shot.destroy(); }
        else if (weaponType === "plasma_wave") damage = 8;

        if (weaponType !== "lightning_bolt" && weaponType !== "plasma_wave" && weaponType !== "ice_shard") {
            shot.destroy();
        }

        this.playSFX('sfx_enemy_hit', 0.25);
        boss.hp -= (damage * damageMultiplier);
        boss.x += Phaser.Math.FloatBetween(-3, 3);
        boss.y += Phaser.Math.FloatBetween(-1, 1);
        this.bossBarFill.width = (boss.hp / boss.maxHp) * 600;
        this.hitEmitter.emitParticle(5, shot.x, shot.y);

        boss.setTint(0xffffff);
        this.time.delayedCall(50, () => {
            if (boss.active) boss.setTint(boss.phase === 2 ? 0xff0000 : 0xffffff);
            if (boss.phase === 1 && boss.active) boss.clearTint();
        });

        if (boss.hp <= 0) {
            this.winBossFight();
            boss.destroy();
        }
    }

    launchVictoryFireworks() {
        const colors = [0xff0000, 0xffaa00, 0xffff00, 0xff6600, 0xffffff];
        for (let i = 0; i < 15; i++) {
            this.time.addEvent({
                delay: i * 150,
                callback: () => {
                    const x = Phaser.Math.Between(100, 620);
                    const y = Phaser.Math.Between(100, 400);
                    const color = Phaser.Math.RND.pick(colors);
                    this.playSFX('sfx_explode', 0.5);
                    this.createExplosion(x, y, color, 40);
                    if (i < 3) this.cameras.main.flash(200, 255, 255, 255, 0.1);
                }
            });
        }
        const victoryText = this.add.text(360, 550, "লেভেল কম্পিল্টেড", {
            fontSize: '60px', fontFamily: "'Anek Bangla'", color: '#16fd01', fontStyle: 'bold', stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5).setScale(0).setDepth(100);

        this.tweens.add({
            targets: victoryText, scale: 1.2, duration: 1000, ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({ targets: victoryText, alpha: 0, delay: 2000, duration: 500, onComplete: () => victoryText.destroy() });
            }
        });
    }

    showReviveMenu() {
        this.physics.pause();
        this.isInvulnerable = true;
        this.time.paused = true;
        this.gamePaused = true;

        const qScene = this.scene.get("QuestionScene");
        if (qScene) {
            this.scene.pause("QuestionScene");
            this.scene.setVisible(false, "QuestionScene");
        }

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const cx = w / 2, cy = h / 2;
        this.reviveTime = 15;

        this.reviveMenu = this.add.container(0, 0).setDepth(10000);
        const bg = this.add.rectangle(cx, cy, w, h, 0x000000, 0.75).setInteractive();

        const panelW = 560, panelH = 480, panelX = cx - panelW / 2, panelY = cy - panelH / 2;
        const panelGraphics = this.add.graphics();
        panelGraphics.fillStyle(0x000c22, 0.85);
        panelGraphics.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
        panelGraphics.lineStyle(3, 0x0066aa, 0.8);
        panelGraphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

        const title = this.add.text(cx, panelY + 80, "পুনরুজ্জীবিত করুন", {
            fontSize: "60px", fontFamily: "'Anek Bangla'", color: "#ff4444", fontStyle: "bold", stroke: "#000000", strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: "#660000", blur: 12, stroke: true, fill: true }, padding: { top: 20, bottom: 20 }
        }).setOrigin(0.5);

        this.timerText = this.add.text(cx, panelY + 160, `AUTO-ABORT: ${this.reviveTime}s`, {
            fontSize: "26px", color: "#00ffff", fontFamily: "Arial", fontStyle: "bold"
        }).setOrigin(0.5);

        const btnW = 440, btnH = 86, radius = btnH / 2;
        const btnContainer = this.add.container(cx, panelY + 260);
        const btnBg = this.add.graphics();

        const drawBtn = (hover) => {
            btnBg.clear();
            btnBg.fillGradientStyle(
                hover ? 0x002266 : 0x001133, hover ? 0x002266 : 0x001133,
                hover ? 0x0088ff : 0x004488, hover ? 0x0088ff : 0x004488, 1
            );
            btnBg.lineStyle(hover ? 5 : 4, hover ? 0xffffff : 0x00ffff, 0.8);
            btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
            btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
        };
        drawBtn(false);

        const btnTxt = this.add.text(0, -12, "জীবন বাঁচান", {
            fontSize: "38px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold", stroke: "#003366", strokeThickness: 3
        }).setOrigin(0.5);
        const keyInfo = this.add.text(0, 22, `১টি চাবি ব্যবহার করুন (${GameState.keys} আছে)`, {
            fontSize: "20px", color: "#b3d4ff", fontFamily: "'Anek Bangla'", fontStyle: "bold"
        }).setOrigin(0.5);

        const btnHitArea = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
        btnContainer.add([btnBg, btnTxt, keyInfo, btnHitArea]);

        const quitContainer = this.add.container(cx, panelY + 380);
        const quitBg = this.add.graphics();
        const drawQuitBtn = (hover) => {
            quitBg.clear();
            quitBg.fillStyle(hover ? 0x081830 : 0x051025, 0.9);
            quitBg.lineStyle(3, hover ? 0x0088cc : 0x0066aa, 0.8);
            quitBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
            quitBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
        };
        drawQuitBtn(false);

        const quitTxt = this.add.text(0, 0, "বাতিল (শেষ)", {
            fontSize: "34px", fontFamily: "'Anek Bangla'", color: "#b3d4ff", fontStyle: "bold", stroke: "#000000", strokeThickness: 3
        }).setOrigin(0.5);
        const quitHitArea = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
        quitContainer.add([quitBg, quitTxt, quitHitArea]);

        this.reviveMenu.add([bg, panelGraphics, title, this.timerText, btnContainer, quitContainer]);

        if (GameState.keys > 0) {
            btnHitArea.on('pointerdown', () => {
                this.playSFX('sfx_click', 0.6);
                this.tweens.add({ targets: btnContainer, scale: 0.9, duration: 50, yoyo: true, onComplete: () => this.useReviveKey() });
            });
            btnHitArea.on('pointerover', () => { this.playSFX('sfx_tick', 0.2); drawBtn(true); btnTxt.setColor("#ffffff"); });
            btnHitArea.on('pointerout', () => { drawBtn(false); btnTxt.setColor("#ffffff"); });
        } else {
            btnContainer.setAlpha(0.5);
            btnTxt.setText("কোনো চাবি নেই!");
            btnTxt.setY(0);
            keyInfo.setVisible(false);
        }

        quitHitArea.on('pointerdown', () => {
            this.playSFX('sfx_back', 0.6);
            this.tweens.add({ targets: quitContainer, scale: 0.9, duration: 50, yoyo: true, onComplete: () => this.handleGiveUp() });
        });
        quitHitArea.on('pointerover', () => { this.playSFX('sfx_tick', 0.2); drawQuitBtn(true); quitTxt.setColor("#ffffff"); });
        quitHitArea.on('pointerout', () => { drawQuitBtn(false); quitTxt.setColor("#b3d4ff"); });

        this.reviveInterval = setInterval(() => {
            this.reviveTime--;
            if (this.timerText && this.timerText.active) this.timerText.setText(`AUTO-ABORT: ${this.reviveTime}s`);
            if (this.reviveTime <= 0) this.handleGiveUp();
        }, 1000);
    }

    useReviveKey() {
        clearInterval(this.reviveInterval);
        GameState.keys--;
        GameState.lives = 3;
        this.gamePaused = false;
        this.hasRevived = true;
        this.reviveMenu.destroy();

        const qScene = this.scene.get("QuestionScene");
        if (qScene) {
            this.scene.resume("QuestionScene");
            this.scene.setVisible(true, "QuestionScene");
        }

        this.time.paused = false;
        this.player.setVisible(true);
        this.player.body.enable = true;
        this.player.setAlpha(1);

        this.isInvulnerable = true;
        this.tweens.add({
            targets: this.player, alpha: 0.2, duration: 100, yoyo: true, repeat: 15,
            onComplete: () => { this.player.setAlpha(1); this.isInvulnerable = false; }
        });
        this.startCountdown();
    }

    handleGiveUp() {
        clearInterval(this.reviveInterval);
        this.time.paused = false;
        this.gamePaused = false;
        this.reviveMenu.destroy();
        this.finalizeGameOver();
    }

    startBossCombatLoop(stage) {
        this.boss.spiralAngle = 0;
        this.bossAttackTimer = this.time.addEvent({
            delay: stage >= 2 ? 600 : 800,
            loop: true,
            callback: () => {
                if (!this.boss || !this.boss.active) return;
                if (this.boss.phase === 1 && this.boss.hp < this.boss.maxHp * 0.5) {
                    this.boss.phase = 2;
                    this.boss.setTint(0xff0000);
                    this.playSFX('sfx_boss_phase2', 0.8, false);
                    this.cameras.main.shake(500, 0.01);
                    this.spawnBossMinions(stage);
                    if (stage === 0 || stage === 1) {
                        const currentVel = this.boss.body.velocity.x;
                        this.boss.setVelocityX(currentVel > 0 ? (250 + stage * 50) : -(250 + stage * 50));
                    } else if (stage >= 2) {
                        this.bossAttackTimer.delay = 350;
                    }
                }

                const isPhase2 = this.boss.phase === 2;
                const rand = Phaser.Math.Between(0, 100);
                let bossFired = false;

                if (stage === 0) {
                    if (rand < 60) {
                        for (let i = -(isPhase2 ? 2 : 1); i <= (isPhase2 ? 2 : 1); i++) {
                            const b = this.bossBullets.create(this.boss.x + (i * 20), this.boss.y + 60, "bossBullet");
                            b.setVelocity(i * 50, 400);
                        }
                        bossFired = true;
                    } else if (rand < 85) {
                        const b = this.bossBullets.create(this.boss.x, this.boss.y + 60, "bossBullet_tracking");
                        b.trackingBullet = true;
                        b.setVelocityY(isPhase2 ? 450 : 300);
                        bossFired = true;
                    } else if (isPhase2 && this.enemies.countActive() < 3) this.spawnBossMinions(stage, 1);
                }
                else if (stage === 1) {
                    if (rand < 40) {
                        for (let i = -(isPhase2 ? 3 : 2); i <= (isPhase2 ? 3 : 2); i++) {
                            const b = this.bossBullets.create(this.boss.x + (i * 15), this.boss.y + 50, "bossBullet");
                            b.setVelocity(i * 60, 450);
                        }
                        bossFired = true;
                    } else if (rand < 75) {
                        const bullets = isPhase2 ? 12 : 8;
                        for (let i = 0; i < bullets; i++) {
                            const angle = (i * (Math.PI * 2)) / bullets;
                            const b = this.bossBullets.create(this.boss.x, this.boss.y + 40, "poison_drop");
                            b.setData('isPoison', true);
                            b.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200 + 150);
                        }
                        bossFired = true;
                    } else {
                        if (isPhase2 && this.enemies.countActive() < 4) this.spawnBossMinions(stage, 1);
                        else {
                            [-30, 30].forEach(offset => {
                                const b = this.bossBullets.create(this.boss.x + offset, this.boss.y + 60, "bossBullet_tracking");
                                b.trackingBullet = true; b.setVelocityY(400);
                            });
                            bossFired = true;
                        }
                    }
                }
                else if (stage >= 2) {
                    if (rand < 40) {
                        const branches = isPhase2 ? 4 : 2;
                        for (let i = 0; i < branches; i++) {
                            const offset = (Math.PI * 2 / branches) * i;
                            const b = this.bossBullets.create(this.boss.x, this.boss.y + 40, "enemyBullet");
                            b.setTint(0xff00ff);
                            b.setVelocity(Math.cos(this.boss.spiralAngle + offset) * 350, Math.sin(this.boss.spiralAngle + offset) * 350 + 100);
                        }
                        this.boss.spiralAngle += 0.4;
                        bossFired = true;
                    } else if (rand < 70) {
                        const startX = this.boss.x - 100;
                        for (let i = 0; i < 5; i++) {
                            const b = this.bossBullets.create(startX + (i * 50), this.boss.y + 40, "bossBullet");
                            b.setVelocity(0, isPhase2 ? 550 : 400);
                        }
                        bossFired = true;
                    } else if (rand < 85) {
                        const count = isPhase2 ? 3 : 1;
                        for (let i = 0; i < count; i++) {
                            const b = this.bossBullets.create(this.boss.x + Phaser.Math.Between(-40, 40), this.boss.y + 40, "bossBullet_tracking");
                            b.trackingBullet = true;
                            b.setVelocity(Phaser.Math.Between(-100, 100), 200);
                        }
                        bossFired = true;
                    } else if (isPhase2 && this.enemies.countActive() < 5) this.spawnBossMinions(stage, 2);
                }

                if (bossFired) this.playSFX('sfx_enemy_shoot', 0.25);
            }
        });
    }

    startCountdown() {
        this.isResuming = true;
        this.physics.pause();
        if (this.weaponTimer) this.weaponTimer.paused = true;
        if (this.spawnTimer) this.spawnTimer.paused = true;
        if (this.enemyFireTimer) this.enemyFireTimer.paused = true;
        if (this.obstacleTimer) this.obstacleTimer.paused = true;
        if (this.bossAttackTimer) this.bossAttackTimer.paused = true;

        let count = 3;
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const countText = this.add.text(cx, cy, "3", {
            fontSize: '100px', fontFamily: "'Anek Bangla'", color: '#04ddcb', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 10, padding: { top: 20, bottom: 20 }
        }).setOrigin(0.5).setDepth(30000);

        this.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                count--;
                this.playSFX('sfx_tick', 0.5, false);

                if (count > 0) {
                    countText.setText(count);
                    countText.setScale(0.5);
                    this.tweens.add({ targets: countText, scale: 1, duration: 400, ease: 'Back.out' });
                } else if (count === 0) {
                    countText.setText("শুরু!");
                    countText.setColor("#04d604");
                    countText.setFontSize('80px');
                    this.isResuming = false;
                    this.physics.resume();
                    if (this.weaponTimer) this.weaponTimer.paused = false;
                    if (this.spawnTimer) this.spawnTimer.paused = false;
                    if (this.enemyFireTimer) this.enemyFireTimer.paused = false;
                    if (this.obstacleTimer) this.obstacleTimer.paused = false;
                    if (this.bossAttackTimer) this.bossAttackTimer.paused = false;
                    this.tweens.add({ targets: countText, alpha: 0, scale: 1.5, duration: 500, onComplete: () => countText.destroy() });
                }
            },
            callbackScope: this
        });
    }
}