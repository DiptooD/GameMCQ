class GameScene extends GameBase {
    constructor() {
        super("GameScene");
    }

    create() {
        // --- LOAD SETTING FOR BEGINNERS LUCK ---
        if (typeof GameState.allowBeginnersLuck === 'undefined') {
            let saved = localStorage.getItem('allowBeginnersLuck');
            GameState.allowBeginnersLuck = saved !== null ? saved === 'true' : true;
        }

        if (typeof GameState.gamesPlayed === 'undefined') GameState.gamesPlayed = 0;
        this.luckMods = this.getLuckModifiers();

        if (window.SpecialItemsRegistry && window.SpecialItemsRegistry.textureInits) {
            window.SpecialItemsRegistry.textureInits.forEach(initFn => initFn(this));
        }

        const h = this.cameras.main.height;
        const w = 720;

        this.isResuming = false;
        this.isAnimating = true; 
        this.hasRevived = false;
        this.bossRemnantsActive = 0; 
        this.isTransitioningToBoss = false;
        
        this.isJammed = false;
        this.isHijacked = false;
        
        this.isDashActive = false; 

        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen').then(lock => {
                    this.wakeLock = lock;
                }).catch(err => console.log('Wake Lock error:', err));
            } catch (err) { }
        }

        this.visibilityHandler = () => {
            if (document.hidden) {
                if (this.scene.isActive("GameScene") && !this.isAnimating && !this.gamePaused) {
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

        if (typeof GameState.keys === 'undefined') GameState.keys = 0;
        if (typeof GameState.debris === 'undefined') GameState.debris = 0;
        if (typeof GameState.boosters === 'undefined') GameState.boosters = {};

        if (typeof GameTextures !== 'undefined') GameTextures.init(this);
        if (typeof PlayerShipTextures !== 'undefined') PlayerShipTextures.init(this);
        if (typeof GameSFX !== 'undefined') GameSFX.init(this);

        this.events.on('shutdown', this.shutdown, this);

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
        this.dashTimerEvent = null; 

        this.regenDelay = 10000;
        this.lastRegenTime = 0;
        this.isRegenerating = false;

        this.createSpaceBackground();
        this.createParticleSystems();

        this.targetX = 360;
        this.targetY = h - 150;

        this.player = this.physics.add.image(this.targetX, h + 150, "player_lv1")
            .setCollideWorldBounds(true)
            .setScale(0.9);
        this.player.setSize(90, 90);
        this.wingmen = this.physics.add.group();
        
        this.applyShipAnimation(GameState.equippedShip || "default");

        this.bullets = this.physics.add.group();
        this.missiles = this.physics.add.group();
        this.sideBullets = this.physics.add.group();
        this.specialWeapons = this.physics.add.group();

        this.enemies = this.physics.add.group();
        this.bossBullets = this.physics.add.group();
        this.batteries = this.physics.add.group();
        this.obstacles = this.physics.add.group();
        
        this.meteors = this.physics.add.group();
        this.powerUps = this.physics.add.group();

        this.shieldArc = this.add.graphics().setDepth(10).setVisible(false);
        this.magnetArc = this.add.graphics().setDepth(9).setVisible(false);
        this.fireShieldArc = this.add.graphics().setDepth(11).setVisible(false);
        
        this.debuffAura = this.add.graphics().setDepth(11);
        
        this.enemyStatusGraphics = this.add.graphics().setDepth(15); 

        this.input.on("pointermove", p => {
            let minY = 480;
            let maxY = h - 100;
            if (GameState.bossActive) minY = 300; 

            this.targetX = Phaser.Math.Clamp(p.x, 50, 670);
            this.targetY = Phaser.Math.Clamp(p.y, minY, maxY);
        });

        this.weaponTimer = this.time.addEvent({ delay: this.fireRate, loop: true, callback: this.fireWeapon, callbackScope: this });
        this.spawnTimer = this.time.addEvent({ delay: 1500, loop: true, callback: this.spawnEnemy, callbackScope: this });
        this.enemyFireTimer = this.time.addEvent({ delay: 1800, loop: true, callback: this.enemiesFireBack, callbackScope: this });
        this.obstacleTimer = this.time.addEvent({ delay: 4500, loop: true, callback: this.spawnObstacle, callbackScope: this });

        this.physics.add.overlap(this.bullets, this.enemies, this.damageEnemy, null, this);
        this.physics.add.overlap(this.missiles, this.enemies, this.damageEnemy, null, this);
        this.physics.add.overlap(this.sideBullets, this.enemies, this.damageEnemy, null, this);
        this.physics.add.overlap(this.specialWeapons, this.enemies, this.damageEnemy, null, this);
        
        this.physics.add.overlap(this.bullets, this.obstacles, this.damageObstacle, null, this);
        this.physics.add.overlap(this.missiles, this.obstacles, this.damageObstacle, null, this);
        this.physics.add.overlap(this.sideBullets, this.obstacles, this.damageObstacle, null, this);
        this.physics.add.overlap(this.specialWeapons, this.obstacles, this.damageObstacle, null, this);

        this.physics.add.overlap(this.player, [this.enemies, this.bossBullets], this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.meteors, this.hitPlayer, null, this);
        
        this.physics.add.overlap(this.player, this.batteries, this.collectBattery, null, this);
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);

        this.physics.add.collider(this.enemies, this.enemies, null, (e1, e2) => {
            if (e1.enemyType === "centipede" || e2.enemyType === "centipede") return false;
            return true;
        }, this);

        this.physics.add.collider(this.obstacles, this.obstacles);

        this.physics.add.collider(this.enemies, this.obstacles, null, (enemy, obs) => {
            if (enemy.enemyType === "centipede") return false;
            return true;
        }, this);

        this.bossBarBg = this.add.rectangle(360, 110, 600, 16, 0x333333).setVisible(false).setAlpha(.3);
        this.bossBarFill = this.add.rectangle(60, 110, 0, 16, 0x6E6E6E).setOrigin(0, 0.5).setVisible(false).setAlpha(.6);
        this.warningText = this.add.text(360, h / 2, "BOSS APPROACHING!", {
            fontSize: '60px', color: '#ff0000', fontStyle: 'bold', fontFamily: "'Anek Bangla'",
            stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setVisible(false);

        window.updateLevelTargets();
        this.updateGameSpeed();
        this.createBoosterUI();
        
        // Setup Dynamic Beginners Luck UI
        this.createBeginnersLuckUI();
        this.lastDisplayedLuckPercent = -1; // -1 to trigger initial update check properly

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

        this.comboText = this.add.text(30, h - 220, "", { 
            fontSize: '52px', fontFamily: "'Anek Bangla'", color: '#ffaa00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0, 0.5).setDepth(100).setAlpha(0);

        this.tweens.add({
            targets: this.player,
            y: this.targetY,
            duration: 1200,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.isAnimating = false;
            }
        });
    }

    applyShipAnimation(shipId) {
        if (this.shipAnimTween) {
            this.shipAnimTween.stop();
        }

        let baseScale = 0.9;
        let scaleTarget = 0.75;
        let duration = 200;
        
        if (["ship_d1", "ship_d2", "ship_k1"].includes(shipId)) {
            duration = 100;
        } else if (["ship_k3", "ship_k7", "ship_d5"].includes(shipId)) {
            duration = 180;
        } else if (["ship_k4", "ship_k8", "ship_d6", "ship_d7"].includes(shipId)) {
            duration = 450; 
        } else if (shipId === "ship_d4") {
            duration = 150; 
        } else {
            duration = 250;
        }

        this.player.setScale(baseScale);
        this.player.setAngle(0);

        this.shipAnimTween = this.tweens.add({
            targets: this.player,
            scaleX: scaleTarget,
            duration: duration,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeIn',
            yoyoEase: 'Sine.easeOut'
        });
    }

    applyEnemyModifiers(e) {
        let stage = GameState.bossStage || 0;
        let progress = this.getGlobalProgress();

        let dashChance = Math.min(0.5, 0.05 + (progress * 0.01) + (stage * 0.1));
        if (Math.random() < dashChance) {
            e.canDash = true;
            e.dashTimer = Phaser.Math.Between(100, 250);
        }

        let bombChance = Math.min(0.20, 0.05 + (progress * 0.005) + (stage * 0.02));
        let shieldChance = Math.min(0.50, 0.10 + (progress * 0.015) + (stage * 0.10));

        if (Math.random() < bombChance) { 
            e.isBodyBomb = true;
            e.hp *= 4.0; 
            e.maxHp = e.hp;
            e.setTint(0xff5500); 
            this.tweens.add({
                targets: e, scale: e.scale * 1.15, duration: 300, yoyo: true, repeat: -1
            });
        } 
        else if (Math.random() < shieldChance) { 
            e.hasEnemyShield = true;
            e.enemyShieldHp = 10 + (progress * 0.2); 
            e.shieldRadius = Math.max(e.width, e.height) * 0.55 * e.scale;
            if(isNaN(e.shieldRadius) || e.shieldRadius < 15) e.shieldRadius = 45;
        }
    }


    activateMagnet() {
        if (this.magnetActive) {
          this.magnetDuration += 20000;
        } else {
          this.magnetActive = true;
          this.magnetDuration = 20000;
          
          const magnetField = this.add.circle(this.player.x, this.player.y, 80, 0xff0000, 0.3); 
          this.tweens.add({
            targets: magnetField,
            scale: 3,
            alpha: 0,
            duration: 500,
            onComplete: () => magnetField.destroy()
          });
          
          this.magnetTimer = this.time.addEvent({
            delay: 100,
            loop: true,
            callback: () => {
              if (this.isResuming) return;
              this.magnetDuration -= 100;
              if (this.magnetDuration <= 0) {
                this.deactivateMagnet();
              }
            }
          });
        }
    }
      
    deactivateMagnet() {
        this.magnetActive = false;
        this.magnetDuration = 0;
        if (this.magnetTimer) {
          this.magnetTimer.remove();
          this.magnetTimer = null;
        }
        this.batteries.children.each(battery => {
          if (battery.active) {
            battery.setVelocityY(220);
            battery.setVelocityX(0);
          }
        });
    }

    activateTNT() {
        this.triggerShockwave();
        this.cameras.main.shake(600, 0.025);
        this.createExplosion(this.player.x, this.player.y, 0xff3300, 40); 
    }
    
    activateDash() {
        this.isDashActive = true;
        this.playSFX('sfx_speed_boost', 0.7); 
        
        // 1. Safety Check: If the player is destroyed or missing, stop right here!
        if (!this.player || !this.player.scene) return;

        if (!this.originalBgSpeedDash) this.originalBgSpeedDash = this.backgroundSpeed;
        this.backgroundSpeed = this.originalBgSpeedDash * 2.5;
        this.physics.world.timeScale = 0.7; 

        // NEW: Select Dash Aura based on equipped Special
        let dashTex = (GameState.equippedDashAura && GameState.equippedDashAura !== "default" && this.textures.exists(`${GameState.equippedDashAura}_img`)) 
                      ? `${GameState.equippedDashAura}_img` 
                      : "aura_dash";

        // Check if the aura doesn't exist OR if it was destroyed in a previous game
        if (!this.dashAura || !this.dashAura.scene) {
            this.dashAura = this.add.image(this.player.x, this.player.y - 20, dashTex).setDepth(12);
        } else {
            this.dashAura.setTexture(dashTex);
        }
        
        this.dashAura.setVisible(true);
        this.dashAura.setScale(2.5);
        this.dashAura.setTint(0x00ffff);
        if (this.player && this.player.active) this.player.clearTint();

        this.tweens.killTweensOf(this.dashAura);
        this.dashAura.setAlpha(1);

        this.tweens.add({
            targets: this.dashAura,
            alpha: { from: 1, to: 0.4 },
            scale: { from: 2.5, to: 2.8 },
            duration: 150,
            yoyo: true,
            repeat: -1
        });

        if (this.dashTimerEvent) {
            this.dashTimerEvent.remove();
        }

        const durationMs = Phaser.Math.Between(6000, 9000);

        this.time.delayedCall(durationMs - 1500, () => {
            if (this.isDashActive && this.dashAura) {
                this.dashAura.setTint(0xff0000);
                if (this.player && this.player.active) this.player.setTint(0xff5555);
                
                this.tweens.killTweensOf(this.dashAura);
                this.tweens.add({
                    targets: this.dashAura,
                    alpha: { from: 1, to: 0 },
                    scale: { from: 2.5, to: 3.5 }, 
                    duration: 120, 
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        this.dashTimerEvent = this.time.delayedCall(durationMs, () => {
            this.isDashActive = false;
            this.backgroundSpeed = this.originalBgSpeedDash || 1;
            this.physics.world.timeScale = 1.0;
            
            if (this.dashAura) {
                this.dashAura.setVisible(false);
                this.dashAura.clearTint();
                this.tweens.killTweensOf(this.dashAura);
            }
            
            if (this.player && this.player.active) {
                this.player.clearTint();
                this.isInvulnerable = true;
                this.tweens.add({
                    targets: this.player,
                    alpha: 0.3,
                    duration: 150,
                    yoyo: true,
                    repeat: 7, 
                    onComplete: () => {
                        if (this.player && this.player.active) {
                            this.player.setAlpha(1);
                            this.player.clearTint(); 
                            this.isInvulnerable = false;
                        } else {
                            this.isInvulnerable = false;
                        }
                    }
                });
            } else {
                this.isInvulnerable = false;
            }
        });
    }

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
        if (this.hazardTimer) this.hazardTimer.remove();
        if (this.bossTeleportTimer) this.bossTeleportTimer.remove();
        if (this.debuffTimer) this.debuffTimer.remove();
        if (this.dashTimerEvent) this.dashTimerEvent.remove();

        if (this.reviveInterval) {
            clearInterval(this.reviveInterval);
        }

        if (this.physics && this.physics.world) {
            this.physics.world.timeScale = 1.0;
        }
        this.time.timeScale = 1.0;

        if (this.shipAnimTween) this.shipAnimTween.stop();
        this.tweens.killAll();
        this.time.removeAllEvents();
        
        if (this.wakeLock) {
            this.wakeLock.release().then(() => this.wakeLock = null);
        }
    }

    showMissionToast(msg) {
        const qScene = this.scene.get('QuestionScene');
        const targetScene = (qScene && qScene.scene.isActive()) ? qScene : this;

        const cx = targetScene.cameras.main.width / 2;
        
        const container = targetScene.add.container(cx, -100).setDepth(5000);

        const bg = targetScene.add.graphics();
        bg.fillGradientStyle(0x004422, 0x002211, 0x002211, 0x001105, 0.95);
        bg.fillRoundedRect(-220, -45, 440, 90, 20);
        bg.lineStyle(3, 0x00ff88, 1);
        bg.strokeRoundedRect(-220, -45, 440, 90, 20);

        const glow = targetScene.add.graphics();
        glow.fillStyle(0x00ff88, 0.2);
        glow.fillRoundedRect(-225, -50, 450, 100, 25);
        
        const icon = targetScene.add.text(-170, 0, "🏆", { fontSize: '45px' }).setOrigin(0.5);

        const text = targetScene.add.text(0, 0, msg, {
            fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff', 
            align: 'left', fontStyle: 'bold', lineSpacing: 5
        }).setOrigin(0.5, 0.5);
        text.x = 20;

        container.add([glow, bg, icon, text]);

        if (this.cache.audio.exists('sfx_victory')) {
            this.playSFX('sfx_victory', 0.4, false); 
        }
        
        targetScene.tweens.add({ 
            targets: container, 
            y: 120, 
            alpha: 1, 
            duration: 600, 
            ease: 'Back.easeOut',
            onComplete: () => {
                targetScene.tweens.add({ 
                    targets: container, 
                    scale: 0.8,
                    alpha: 0, 
                    delay: 3500, 
                    duration: 400, 
                    ease: 'Cubic.easeIn',
                    onComplete: () => container.destroy() 
                });
            }
        });
    }

    createBeginnersLuckUI() {
        this.luckUIContainer = this.add.container(60, 1280).setDepth(2000);
        
        this.luckIcon = this.add.text(0, 0, "🍀", { fontSize: '42px', padding: { y: 10 } }).setOrigin(0.5);
        this.luckTxt = this.add.text(30, 0, "", { 
            fontSize: '20px', fontFamily: "'Anek Bangla'", padding: { y: 20 }, color: '#00ff00', fontStyle: 'bold', align: 'left',
            stroke: '#000000', strokeThickness: 1
        }).setOrigin(0, 0.5);

        this.luckUIContainer.add([this.luckIcon, this.luckTxt]);
        this.luckUIContainer.setAlpha(0);
    }

    showBeginnersLuckUpdate(percent) {
        if (!this.luckUIContainer) return;
        
        if (percent <= 0) {
            this.luckTxt.setText(`Beginner's Luck (0%)\nNormal Mode Active!`);
            this.luckTxt.setColor('#aaaaaa');
        } else {
            this.luckTxt.setText(`Beginner's Luck (${percent}%)\nEasier start, but fewer debris drops!`);
            this.luckTxt.setColor('#00ff00');
        }

        this.tweens.killTweensOf(this.luckUIContainer);
        this.luckUIContainer.setAlpha(1);

        this.tweens.add({
            targets: this.luckIcon,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            repeat: 3
        });

        this.tweens.add({
            targets: this.luckUIContainer,
            alpha: 0,
            delay: 4500,
            duration: 1000
        });
    }

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

    applyThiefDebuff() {
        const duration = Phaser.Math.Between(4000, 6000);
        
        this.isJammed = true;
        this.isHijacked = true;
        
        this.cameras.main.shake(300, 0.02);
        this.cameras.main.flash(200, 255, 0, 255); 
        
        const jamText = this.add.text(this.player.x, this.player.y - 70, "WEAPONS JAMMED!\nCONTROLS INVERTED!", {
            fontSize: '28px', fontFamily: "'Anek Bangla'", color: '#ff00ff', align: 'center',
            stroke: '#000000', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(200);
        
        this.tweens.add({
            targets: jamText,
            y: this.player.y - 120,
            alpha: 0,
            duration: 2500,
            ease: 'Cubic.easeOut',
            onComplete: () => jamText.destroy()
        });

        if (this.debuffTimer) this.debuffTimer.remove();
        
        this.debuffTimer = this.time.addEvent({
            delay: duration,
            callback: () => {
                this.isJammed = false;
                this.isHijacked = false;
                
                if (this.debuffAura) this.debuffAura.clear();
                if (this.player && this.player.active) this.player.clearTint(); 
                
                this.isInvulnerable = true;
                this.tweens.add({
                    targets: this.player,
                    alpha: 0.3,
                    duration: 150,
                    yoyo: true,
                    repeat: 7, 
                    onComplete: () => {
                        if (this.player && this.player.active) {
                            this.player.setAlpha(1);
                            this.player.clearTint(); 
                            this.isInvulnerable = false;
                        } else {
                            this.isInvulnerable = false; 
                        }
                    }
                });
                
                const restoreText = this.add.text(this.player.x, this.player.y - 50, "SYSTEMS RESTORED", {
                    fontSize: '26px', fontFamily: "'Anek Bangla'", color: '#00ff00', align: 'center',
                    stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
                }).setOrigin(0.5).setDepth(200);
                
                this.tweens.add({
                    targets: restoreText,
                    y: this.player.y - 100,
                    alpha: 0,
                    duration: 1500,
                    onComplete: () => restoreText.destroy()
                });
            }
        });
    }

    update(time, delta) {
        if (this.isResuming) return;
        
        if (this.luckUIContainer && !this.isResuming && !this.isAnimating) {
            let currentPercent = Math.round(this.luckMods.factor * 100);
            if (currentPercent !== this.lastDisplayedLuckPercent) {
                // Ignore displaying 0% if it was always disabled (0%) since the start
                if (this.lastDisplayedLuckPercent !== -1 || currentPercent > 0) {
                    this.showBeginnersLuckUpdate(currentPercent);
                }
                this.lastDisplayedLuckPercent = currentPercent;
            }
        }
        
        const timeScale = this.time.timeScale || 1;
        const dtScale = Phaser.Math.Clamp(delta / 16.666, 0.1, 2.5); 
        const dt = timeScale * dtScale;

        const hView = this.cameras.main.height;
        const wView = this.cameras.main.width;
        const bottomEdge = hView + 150;
        const topEdge = -150;

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

        if (!this.isAnimating) {
            const lerpSpeed = 0.25 * dt;
            
            let actualTargetX = this.targetX;
            if (this.isHijacked) {
                actualTargetX = 720 - this.targetX;
            }

            this.player.x = Phaser.Math.Linear(this.player.x, actualTargetX, lerpSpeed);
            this.player.y = Phaser.Math.Linear(this.player.y, this.targetY, lerpSpeed);

            if (this.isDashActive && this.dashAura) {
                this.dashAura.x = this.player.x;
                this.dashAura.y = this.player.y - 20; 
            }

            if (this.isJammed || this.isHijacked) {
                this.debuffAura.clear();
                for (let i = 0; i < 6; i++) {
                    const offsetX = Phaser.Math.Between(-45, 45);
                    const offsetY = Phaser.Math.Between(-45, 45);
                    const width = Phaser.Math.Between(10, 60);
                    const height = Phaser.Math.Between(2, 8);
                    
                    this.debuffAura.fillStyle(0xff00ff, Phaser.Math.FloatBetween(0.3, 0.8));
                    this.debuffAura.fillRect(this.player.x + offsetX, this.player.y + offsetY, width, height);
                }
                
                this.debuffAura.lineStyle(3, 0x00ffff, 0.9);
                this.debuffAura.beginPath();
                let startX = this.player.x + Phaser.Math.Between(-30, 30);
                let startY = this.player.y + Phaser.Math.Between(-30, 30);
                this.debuffAura.moveTo(startX, startY);
                for(let j=0; j<4; j++){
                    startX += Phaser.Math.Between(-35, 35);
                    startY += Phaser.Math.Between(-35, 35);
                    this.debuffAura.lineTo(startX, startY);
                }
                this.debuffAura.strokePath();

                if (this.time.now % 150 < 75) {
                    this.player.setTintFill(0xff00ff);
                } else {
                    this.player.setTintFill(0x00ffff);
                }
            } else if (this.debuffAura) {
                this.debuffAura.clear();
            }

            this.wingmen.children.each((wingman, index) => {
                if (wingman.active) {
                    const offset = index === 0 ? -70 : 70;
                    const targetX = this.player.x + offset;
                    const targetY = this.player.y + 30;
                    
                    wingman.x = Phaser.Math.Linear(wingman.x, targetX, 0.1 * dt);
                    wingman.y = Phaser.Math.Linear(wingman.y, targetY, 0.1 * dt);

                    const combo = GameState.currentCombo || 0;
                    let delay = 400;
                    if (combo >= 10) delay = 600;
                    else if (combo >= 5) delay = 350;

                    if (this.time.now > (wingman.lastShot || 0) + delay) {
                        wingman.lastShot = this.time.now;
                        
                        const equip = GameState.equippedShip || "default";
                        let mainTex = this.textures.exists(`bullet_${equip}`) ? `bullet_${equip}` : "bullet_default";
                        let sideTex = this.textures.exists(`side_bullet_${equip}`) ? `side_bullet_${equip}` : "side_bullet_default";
                        
                        let projTex = sideTex;
                        let speedY = -800;
                        let scale = 0.8;
                        let damageTag = "side_bullet"; 

                        if (combo >= 10) {
                            projTex = "missile";
                            speedY = -1000;
                            scale = 0.7;
                            damageTag = "missile";
                        } else if (combo >= 5) {
                            projTex = mainTex;
                            speedY = -900;
                            scale = 1.0;
                            damageTag = "bullet";
                        }

                        const b = this.sideBullets.create(wingman.x, wingman.y - 20, projTex);
                        b.weaponType = damageTag;
                        b.setVelocityY(speedY);
                        b.setScale(scale);
                    }
                }
            });
        }

        if (this.hasShield) {
            if (this.specialShieldSprite && this.specialShieldSprite.visible) {
                // Animate Special Shields
                this.specialShieldSprite.x = this.player.x;
                this.specialShieldSprite.y = this.player.y;
                
                let shieldType = GameState.equippedShield;
                if(shieldType === "shield_cosmic") {
                    this.specialShieldSprite.rotation -= 0.05; // Fast rotation for flames
                    this.specialShieldSprite.setScale(0.9 + Math.sin(this.time.now / 100) * 0.05); // Pulsing
                } else {
                    this.specialShieldSprite.rotation += 0.01; // Slow rotation for hex
                    this.specialShieldSprite.setScale(1);
                }
            } else {
                // Original Standard Shield Draw
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
        }

        if (this.magnetActive) {
            this.magnetArc.setVisible(true);
            this.magnetArc.clear();
            const pulse = Math.sin(this.time.now / 100);
            
            this.magnetArc.lineStyle(4, 0xff0000, 0.8 + pulse * 0.2);
            this.magnetArc.fillStyle(0xff0000, 0.15 + pulse * 0.1);

            const arcY = this.player.y + 20;
            this.magnetArc.beginPath();
            this.magnetArc.arc(this.player.x, arcY, 75, Phaser.Math.DegToRad(45), Phaser.Math.DegToRad(135));
            this.magnetArc.strokePath();
            this.magnetArc.fillPath();

            this.magnetArc.lineStyle(2, 0xff3333, 0.5);
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

        const equipped = GameState.equippedShip || "default";
        const level = GameState.weaponLevel || 1;
        let shipTexture = (equipped === "default") ? `player_lv${level}` : `${equipped}_lv${level}`;
        if (!this.textures.exists(shipTexture)) shipTexture = (equipped === "default") ? "player_lv1" : `${equipped}_lv1`;

        if (this.player.texture.key !== shipTexture) {
            this.player.setTexture(shipTexture);
            this.tweens.add({ targets: this.player, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true });
            this.applyShipAnimation(equipped);
        }

        this.distantStars.children.each(s => { s.y += 0.3 * this.backgroundSpeed * dtScale; if (s.y > hView) s.y = -10; });
        this.stars.children.each(s => { 
            s.y += 2 * this.backgroundSpeed * dt; 
            if (s.y > hView) { s.y = -10; s.x = Phaser.Math.Between(0, 720); }
        });
        this.fastStars.children.each(s => {
            s.y += (.15 + (this.backgroundSpeed * 4)) * dtScale;
            if (s.y > hView) { s.y = -10; s.x = Phaser.Math.Between(0, 720); }
        });
        this.nebulae.children.each(n => { n.y += 0.2 * this.backgroundSpeed * dtScale; if (n.y > hView + 200) n.y = -200; });

        this.engineEmitter.emitParticleAt(this.player.x, this.player.y + 55, 2);

        this.enemyStatusGraphics.clear(); 

        this.enemies.children.each(e => {
            if (!e.active) return;

            if (e.enemyType === "thief") {
                const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                const currentAngle = Math.atan2(e.body.velocity.y, e.body.velocity.x) || (Math.PI/2);
                const angleDiff = Phaser.Math.Angle.Wrap(angle - currentAngle);
                
                const turnSpeed = 0.08 * dtScale; 
                const newAngle = currentAngle + Phaser.Math.Clamp(angleDiff, -turnSpeed, turnSpeed);

                const speed = 400 * this.luckMods.speedMult;
                e.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
                e.setRotation(newAngle + Math.PI / 2);

                if (this.time.now % 4 === 0) {
                    this.hitEmitter.emitParticle(1, e.x - Math.cos(newAngle)*20, e.y - Math.sin(newAngle)*20);
                }
            }

            if (e.hasEnemyShield) {
                const pulse = Math.sin(this.time.now / 100);
                this.enemyStatusGraphics.lineStyle(4, 0xffcc00, 0.8 + pulse * 0.2); 
                this.enemyStatusGraphics.fillStyle(0xffcc00, 0.15 + pulse * 0.1);  
                this.enemyStatusGraphics.beginPath();
                this.enemyStatusGraphics.arc(e.x, e.y, e.shieldRadius, Phaser.Math.DegToRad(45), Phaser.Math.DegToRad(135));
                this.enemyStatusGraphics.strokePath();
                this.enemyStatusGraphics.fillPath();
            }

            if (e.isBodyBomb) {
                const pulse = Math.sin(this.time.now / 150);
                const radius = Math.max(e.width, e.height) * 0.6 * e.scale;
                this.enemyStatusGraphics.lineStyle(3, 0xff0000, 0.6 + pulse * 0.4);
                this.enemyStatusGraphics.fillStyle(0xff0000, 0.15 + pulse * 0.15);
                this.enemyStatusGraphics.beginPath();
                this.enemyStatusGraphics.arc(e.x, e.y, radius > 15 ? radius : 45, 0, Math.PI * 2);
                this.enemyStatusGraphics.strokePath();
                this.enemyStatusGraphics.fillPath();
            }

            if (e.canDash && !e.isDashing && e.y > 50 && e.y < hView - 300) {
                e.dashTimer -= dtScale;
                if (e.dashTimer <= 0) {
                    e.isDashing = true;
                    this.playSFX('sfx_enemy_dash', 0.4);
                    let angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                    let dashSpeed = 500 * this.luckMods.speedMult;
                    e.setVelocity(Math.cos(angle) * dashSpeed, Math.sin(angle) * dashSpeed);
                    e.dashTimer = Phaser.Math.Between(150, 300);
                    
                    this.time.delayedCall(300, () => {
                        if (e && e.active) {
                            e.isDashing = false;
                            if (e.movePattern !== "remnant_pattern" && !e.isBossRemnant) {
                                e.setVelocity(0, (160 + (this.getGlobalProgress() * 8)) * this.luckMods.speedMult);
                            }
                        }
                    });
                }
            }

            if (e.enemyType === "centipede" && e.segments) {
                e.segments = e.segments.filter(seg => seg && seg.active);
                
                e.segments.forEach((seg, i) => {
                    if (seg && seg.active) {
                        const target = i === 0 ? e : e.segments[i - 1];
                        if (target && target.active) {
                            const angle = Phaser.Math.Angle.Between(seg.x, seg.y, target.x, target.y);
                            const dist = Phaser.Math.Distance.Between(seg.x, seg.y, target.x, target.y);
                            const targetDist = 45;

                            if (dist > targetDist) {
                                seg.x += Math.cos(angle) * (dist - targetDist) * 0.3 * dtScale;
                                seg.y += Math.sin(angle) * (dist - targetDist) * 0.3 * dtScale;
                            }
                        } else {
                            seg.setVelocityY((120 + (this.getGlobalProgress() * 3)) * this.luckMods.speedMult);
                        }
                    }
                });
            }

            if (e.y > bottomEdge + 500) { 
                if (e.isBossRemnant) {
                    this.bossRemnantsActive--;
                    if (this.bossRemnantsActive <= 0 && GameState.bossActive && !this.boss) {
                        this.winBossFight();
                    }
                }
                e.destroy(); 
                return; 
            }

            if (!e.isDashing && e.enemyType !== "thief") {
                if (e.texture.key === "enemy_common") e.angle += (e.rotSpeed || 1) * dtScale;
                if (e.movePattern === "wiggle") {
                    e.wiggleTimer = (e.wiggleTimer || 0) + 0.1 * dtScale;
                    e.x += Math.sin(e.wiggleTimer) * 2;
                    e.rotation = Math.sin(e.wiggleTimer) * 0.2;
                }
                if (e.enemyType === "spinner") e.rotation += 0.08 * dtScale;
                if (e.movePattern === "jet_pulse") {
                    e.pulseTimer = (e.pulseTimer || 0) + 1 * dtScale;
                    if (e.pulseTimer % 120 < 20) e.setVelocityY(450);
                    else e.setVelocityY(Phaser.Math.Linear(e.body.velocity.y, 80, 0.05));
                }
                if (e.movePattern === "remnant_pattern") {
                    if (e.y < 50) { e.y = 50; e.setVelocityY(Math.abs(e.body.velocity.y)); }
                    if (e.y > hView - 250) { e.y = hView - 250; e.setVelocityY(-Math.abs(e.body.velocity.y)); }
                    if (e.x < 50) { e.x = 50; e.setVelocityX(Math.abs(e.body.velocity.x)); }
                    if (e.x > 670) { e.x = 670; e.setVelocityX(-Math.abs(e.body.velocity.x)); }
                    
                    if (Math.random() < 0.05 * dtScale) {
                        let angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                        e.body.velocity.x += Math.cos(angle) * 10;
                        e.body.velocity.y += Math.sin(angle) * 10;
                    }
                }
            }

            if (e.enemyType === "dragon") {
                if (!e.fireTimer) e.fireTimer = 0;
                e.fireTimer += dtScale;
                if (e.fireTimer >= this.dragonFireThreshold) {
                    e.fireTimer = 0;
                    const flame = this.bossBullets.create(e.x, e.y + 30, "enemyBullet");
                    flame.setVelocityY(500 * this.luckMods.speedMult);
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
                        b.setVelocity(Math.cos(rad) * 220 * this.luckMods.speedMult, Math.sin(rad) * 220 * this.luckMods.speedMult);
                        b.body.setCircle(6);
                        b.body.setOffset(9, 9);
                        b.body.checkCollision.none = true;
                        this.tweens.add({ targets: b, scale: 1.4, alpha: 0, duration: 800, ease: 'Sine.easeIn', onComplete: () => { if (b.active) b.destroy(); } });
                    });
                }
            }
        });

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
                }
            });

            if (closestEnemy) {
                const angle = Phaser.Math.Angle.Between(missile.x, missile.y, closestEnemy.x, closestEnemy.y);
                const currentAngle = Math.atan2(missile.body.velocity.y, missile.body.velocity.x);
                const angleDiff = Phaser.Math.Angle.Wrap(angle - currentAngle);
                const turnSpeed = 0.03 * dtScale;
                const newAngle = currentAngle + Phaser.Math.Clamp(angleDiff, -turnSpeed, turnSpeed);
                const speed = 700;
                missile.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
                missile.setRotation(newAngle + Math.PI / 2);
                if (Math.random() > 0.7) this.hitEmitter.emitParticle(1, missile.x, missile.y);
            }
        });

        this.obstacles.children.each(obs => { 
            if (obs.active && (obs.y > bottomEdge || obs.x < -200 || obs.x > wView + 200)) {
                if (obs.trail) obs.trail.destroy();
                obs.destroy(); 
            }
        });

        this.meteors.children.each(m => {
            if (m.active && (m.y > bottomEdge || m.y < topEdge - 500 || m.x < -200 || m.x > wView + 200)) {
                if (m.trail) m.trail.destroy();
                m.destroy();
            }
        });

        this.powerUps.children.each(pu => { if (pu.active && pu.y > bottomEdge) pu.destroy(); });
        [this.bullets, this.sideBullets, this.specialWeapons].forEach(group => {
            group.children.each(p => { if (p.y < topEdge || p.x < -100 || p.x > wView + 100) p.destroy(); });
        });
        
        if (this.bossBullets) {
            this.bossBullets.children.each(bullet => {
                // Ensure boss laser moves with the boss if present
                if (bullet.isBossLaser && this.boss && this.boss.active) {
                    bullet.x = this.boss.x;
                    bullet.y = this.boss.y + 60;
                }
                
                if (bullet.y > bottomEdge || bullet.y < topEdge || bullet.x < -100 || bullet.x > wView + 100) {
                    if (!bullet.isBossLaser) bullet.destroy(); 
                }
            });
        }

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

        // Keep visual pulse for tracking bullets and wobble for poison drops
        this.bossBullets.children.each(bullet => {
            if (bullet.trackingBullet && bullet.active) {
                bullet.setScale(1 + Math.sin(this.time.now / 100) * 0.1); 
            } else if (bullet.getData('isPoison')) {
                bullet.x += Math.sin(this.time.now / 100) * 2;
            }
        });
    }

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
        window.updateMissionProgress("use_boosters", 1);
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
        window.updateMissionProgress("use_boosters", 1);
        this.playSFX('sfx_speed_boost', 0.6, false); 
        if (!this.isSpeedBoosted) {
            this.originalBgSpeed = this.backgroundSpeed;
            this.originalWeaponLevel = GameState.weaponLevel;
            this.isSpeedBoosted = true;
        }

        GameState.weaponLevel = 3;
        this.physics.world.timeScale = 0.5; 
        this.time.timeScale = 1; 
        this.backgroundSpeed = 4.0; 

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
        window.updateMissionProgress("use_boosters", 1);
        this.batteryMultiplier = 2.0;
        this.playSFX('sfx_powerup', 0.6);
        const txt = this.add.text(360, 580, "BATTERY BOOST (2x)", { fontSize: '42px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: txt, alpha: 0, duration: 3000, onComplete: () => txt.destroy() });
        this.time.delayedCall(60000, () => { this.batteryMultiplier = 1.0; });
    }

    fireWeapon() {
        if (this.isJammed) return;
        if (this.isResuming || this.isAnimating) return;

        const x = this.player.x;
        const y = this.player.y - 60;
        const stage = GameState.bossStage;
        const level = GameState.weaponLevel;
        const equip = GameState.equippedShip || "default";

        let mainTex = this.textures.exists(`bullet_${equip}`) ? `bullet_${equip}` : "bullet_default";
        let sideTex = this.textures.exists(`side_bullet_${equip}`) ? `side_bullet_${equip}` : "side_bullet_default";

        this.playSFX('sfx_shoot', 0.5);

        if (level === 1) {
            this.bullets.create(x, y, mainTex).setVelocityY(-1100).setScale(1.2);
        } else if (level === 2) {
            this.bullets.create(x - 22, y, mainTex).setVelocityY(-1100).setScale(1.1);
            this.bullets.create(x + 22, y, mainTex).setVelocityY(-1100).setScale(1.1);
        } else if (level === 3) {
            this.bullets.create(x - 18, y, mainTex).setVelocityY(-1100).setScale(1.1);
            this.bullets.create(x + 18, y, mainTex).setVelocityY(-1100).setScale(1.1);

            const speed = 900;
            const leftAngle = Phaser.Math.DegToRad(-94);
            const left = this.sideBullets.create(x - 30, y + 10, sideTex).setScale(1.2);
            left.setVelocity(Math.cos(leftAngle) * speed, Math.sin(leftAngle) * speed);
            left.setRotation(leftAngle + Math.PI / 2);

            const rightAngle = Phaser.Math.DegToRad(-86);
            const right = this.sideBullets.create(x + 30, y + 10, sideTex).setScale(1.2);
            right.setVelocity(Math.cos(rightAngle) * speed, Math.sin(rightAngle) * speed);
            right.setRotation(rightAngle + Math.PI / 2);

        } else if (level >= 4) {
            this.bullets.create(x - 18, y - 10, mainTex).setVelocityY(-1200).setScale(1.1);
            this.bullets.create(x + 18, y - 10, mainTex).setVelocityY(-1200).setScale(1.1);

            const speed = 1050;
            this.sideWeaponCounter++;

            if (this.sideWeaponCounter >= 2) {
                this.sideWeaponCounter = 0;
                const angles = [-98, -94, -86, -82];
                const xOffsets = [-55, -30, 30, 55];
                const yOffsets = [25, 8, 8, 25];

                angles.forEach((deg, i) => {
                    const rad = Phaser.Math.DegToRad(deg);
                    const b = this.sideBullets.create(x + xOffsets[i], y + yOffsets[i], sideTex);
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
        const weaponType = projectile.weaponType || projectile.texture.key;
        const damageMultiplier = 1 + (this.getGlobalProgress() * 0.1);

        if (weaponType === "missile") damage = 4;
        else if (weaponType.includes("side_bullet")) damage = 2;
        else if (weaponType === "lightning") {
            damage = 3;
            projectile.pierceCount = (projectile.pierceCount || 0) + 1;
            if (projectile.pierceCount >= 3) projectile.destroy();
        } else if (weaponType === "ice") damage = 2;
        else if (weaponType === "plasma") damage = 3;

        const finalDamage = damage * damageMultiplier * this.luckMods.playerDamageMult;
        if (obstacle.obstacleType === "meteor") return; 

        obstacle.hp -= finalDamage;
        
        this.playSFX('sfx_rock_hit', 0.3); 
        obstacle.x += Phaser.Math.FloatBetween(-2, 2);
        obstacle.y += Phaser.Math.FloatBetween(-2, 2);
        obstacle.setAlpha(0.5);
        this.time.delayedCall(60, () => { if (obstacle && obstacle.active) obstacle.setAlpha(1); });

        this.hitEmitter.emitParticle(5, projectile.x, projectile.y);
        if (weaponType !== "lightning" && weaponType !== "plasma" && weaponType !== "ice") projectile.destroy();

        if (obstacle.hp <= 0) {
            this.playSFX('sfx_explode', 0.35);
            this.createExplosion(obstacle.x, obstacle.y, 0x888888, 10);
            GameState.score += 15;

            const isValidSubject = (GameState.currentSubject === "all" || GameState.currentSubject === "all_no_math");
            const currentDebrisChance = this.luckMods.debrisDropChance !== undefined ? this.luckMods.debrisDropChance : 0.5;

            if (GameState.gameMode !== "revision" && isValidSubject && Math.random() < currentDebrisChance) {
                GameState.debris = (GameState.debris || 0) + 1;
                window.updateMissionProgress("collect_debris", 1); 
                window.saveCurrency();
                
                const txt = this.add.text(obstacle.x, obstacle.y, `+1 Debris`, { fontSize: '28px', fontFamily: 'Arial', color: '#aaccff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
                this.tweens.add({ targets: txt, y: txt.y - 60, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });
            }

            const dropChance = obstacle.obstacleType === "obstacle_mine" ? 0.75 : obstacle.obstacleType === "obstacle_debris" ? 0.6 : 0.4;
            if (Math.random() < dropChance) this.dropPowerUp(obstacle.x, obstacle.y, obstacle.obstacleType);
            
            if (obstacle.trail) obstacle.trail.destroy();
            obstacle.destroy();
        }
    }

    collectPowerUp(player, powerUp) {
        window.updateMissionProgress("collect_powerups", 1);
        if (!player.scene) return;

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
            case "powerup_fiftyfifty": 
                GameState.hasFiftyFifty = true;
                const qScene = this.scene.get('QuestionScene');
                if(qScene) qScene.applyFiftyFifty(); 
                break;
            case "powerup_dash": 
                this.activateDash(); 
                break;
        }

        const names = { 
            "powerup_shield": "SHIELD", 
            "powerup_magnet": "MAGNET", 
            "powerup_tnt": "SHOCKWAVE", 
            "powerup_heart": "+1 LIFE",
            "powerup_fiftyfifty": "50/50 CHIP!",
            "powerup_dash": "DASH STRIKE"
        };
        const colors = { 
            "powerup_shield": "#ffcc00", 
            "powerup_magnet": "#ff0000", 
            "powerup_tnt": "#ff3300", 
            "powerup_heart": "#ff0033",
            "powerup_fiftyfifty": "#00ffcc",
            "powerup_dash": "#00ffff"
        };
        const text = this.add.text(powerUp.x, powerUp.y, names[type], { fontSize: "40px", color: colors[type], fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: powerUp.y - 80, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
    }

    destroyEnemy(enemy) {
        if (enemy.isDestroyed) return;
        enemy.isDestroyed = true;

        if (GameState.profile) {
            GameState.profile.k = (GameState.profile.k || 0) + 1;
            GameState.profile.xp = (GameState.profile.xp || 0) + 1;
        }

        this.playSFX('sfx_explode', 1);
        window.updateMissionProgress("kill_enemies", 1);

        if (enemy.isBodyBomb) {
            this.playSFX('sfx_enemy_bomb', 0.2);
            this.cameras.main.shake(300, 0.015);
            this.createExplosion(enemy.x, enemy.y, 0xff4400, 45);

            const wave = this.add.image(enemy.x, enemy.y, 'tex_shockwave_heavy').setScale(0.5);
            this.tweens.add({ targets: wave, scale: 5, alpha: 0, duration: 800, ease: 'Quad.out', onComplete: () => wave.destroy() });

            if (!this.isInvulnerable && Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < 150) {
                let dummySource = this.add.rectangle(enemy.x, enemy.y, 10, 10).setVisible(false);
                this.hitPlayer(this.player, dummySource);
                dummySource.destroy();
            }
            this.enemies.children.each(other => {
                if (other !== enemy && other.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y) < 150) {
                    other.hp = 0;
                    if (!other.isDying) { 
                        other.isDying = true;
                        this.destroyEnemy(other);
                    }
                }
            });
        } else {
            this.createExplosion(enemy.x, enemy.y, 0xff3300, 15);
        }

        const scoreValue = enemy.tier === "ultra" ? 50 : enemy.tier === "rare" ? 25 : enemy.tier === "dragon" ? 60 : enemy.tier === "spinner" ? 40 : enemy.tier === "centipede" ? 35 : (enemy.tier === "mini_boss" ? 30 : 10);
        GameState.score += scoreValue;

        if (enemy.segments) {
            enemy.segments.forEach(seg => {
                if (seg && seg.active) {
                    this.createExplosion(seg.x, seg.y, 0x228822, 12);
                    seg.destroy();
                }
            });
        }

        let dropChance = enemy.tier === "ultra" ? 0.7 : enemy.tier === "rare" ? 0.6 : enemy.tier === "dragon" ? 0.6 : enemy.tier === "spinner" ? 0.9 : enemy.tier === "centipede" ? 0.2 : 0.8;
        dropChance += this.luckMods.batteryDropChance; 

        if (enemy.isBodyBomb) dropChance = 1.0; 

        if (enemy.tier === "thief") {
            if (!GameState.bossActive) {
                this.dropPowerUp(enemy.x, enemy.y, "thief");
            }
        }

        if (!GameState.bossActive && enemy.tier !== "thief" && Math.random() < dropChance) {
            let batteryTexture = "battery_green", batteryValue = 35;
            
            if (enemy.isBodyBomb) { 
                batteryTexture = "battery_red"; 
                batteryValue = 80; 
            }
            else if (enemy.tier === "ultra" || enemy.tier === "centipede" || enemy.tier === "mini_boss") { batteryTexture = "battery_red"; batteryValue = 80; }
            else if (enemy.tier === "rare" || enemy.tier === "spinner" || enemy.tier === "dragon") { batteryTexture = "battery_yellow"; batteryValue = 50; }

            batteryValue = Math.ceil(batteryValue * this.luckMods.batteryDropMult);

            const battery = this.batteries.create(enemy.x, enemy.y, batteryTexture);
            battery.setVelocityY(220);
            battery.setAlpha(.8);
            battery.batteryValue = batteryValue;
            this.tweens.add({ targets: battery, scale: { from: 1.2, to: 1.5 }, yoyo: true, duration: 400, repeat: -1 });
        }
        
        const isRemnant = enemy.isBossRemnant;
        
        if (isRemnant) {
            this.cameras.main.flash(50, 255, 255, 255, 0.3); 
            this.createExplosion(enemy.x, enemy.y, 0x00ffff, 10); 
            this.playSFX('sfx_explode', 0.5); 
            
            enemy.setVisible(false);
            enemy.body.enable = false;

            this.time.delayedCall(100, () => {
                enemy.destroy();
                this.bossRemnantsActive--;
                if (this.bossRemnantsActive <= 0 && GameState.bossActive && !this.boss) {
                    this.winBossFight();
                }
            });
        } else {
            enemy.destroy();
        }
    }

    damageEnemy(projectile, enemy) {
        const weaponType = projectile.weaponType || projectile.texture.key;
        let damage = 1;

        if (enemy.hasEnemyShield) {
            this.playSFX('sfx_enemy_shield_hit', 0.05);
            this.hitEmitter.emitParticle(4, projectile.x, projectile.y);
            
            if (weaponType !== "lightning" && weaponType !== "plasma") {
                projectile.destroy();
            } else {
                if (enemy.lastWaveHit === projectile.waveId) return;
                enemy.lastWaveHit = projectile.waveId;
            }

            enemy.enemyShieldHp--;
            enemy.setAlpha(0.7);
            this.time.delayedCall(50, () => { if(enemy.active) enemy.setAlpha(1); });

            if (enemy.enemyShieldHp <= 0) {
                enemy.hasEnemyShield = false;
                this.playSFX('sfx_enemy_shield_break', 0.1);
                this.createExplosion(enemy.x, enemy.y, 0xffcc00, 8); 
            }
            return; 
        }

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
        else if (weaponType.includes("side_bullet")) damage = 3;
        else if (weaponType.includes("bullet")) damage = 2;
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
        const finalDamage = damage * damageMultiplier * this.luckMods.playerDamageMult;
        
        enemy.hp -= finalDamage;
        enemy.setAlpha(0.3);
        this.time.delayedCall(60, () => { if (enemy && enemy.active) enemy.setAlpha(1); });

        this.hitEmitter.emitParticle(8, enemy.x, enemy.y);
        if (destroyProjectile) projectile.destroy();
        
        if (enemy.hp <= 0 && !enemy.isDying) {
            enemy.isDying = true;
            this.destroyEnemy(enemy);
        }
    }

    enemiesFireBack() {
        if (this.isResuming) return;
        let fireCount = 0;
        let bulletSpeedMultiplier = (1 + (this.getGlobalProgress() * 0.03)) * this.luckMods.speedMult;

        // Check if there are tracking bullets already active on screen
        let activeTrackingBullets = this.bossBullets.getChildren().filter(b => b.active && b.trackingBullet && b.texture.key === "bossBullet_tracking").length;
        let ultraTrackingFired = activeTrackingBullets >= 1; // Limit to 1 on screen at a time

        this.enemies.children.each(e => {
            if (!e.active || fireCount > 8 || e.tier === "common") return;

            if (!e.isDashing) {
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
                        // Check if a tracking bullet is allowed to be fired
                        if (!ultraTrackingFired && Phaser.Math.Between(0, 4) === 0) {
                            const b = this.bossBullets.create(e.x, e.y + 40, "bossBullet_tracking");
                            const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                            const speed = 350 * bulletSpeedMultiplier;
                            b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                            b.trackingBullet = true; 
                            fireCount++; fired = true;
                            ultraTrackingFired = true; // Prevent others from firing tracking bullets
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
                } else if (e.tier === "mini_boss") {
                // Reduced fire rate: Changed upper bound from 5 to 7
                if (Phaser.Math.Between(0, 9) === 0) { 
                    const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                    const b = this.bossBullets.create(e.x, e.y + 20, "bossBullet"); 
                    b.setScale(1.0);
                    // Reduced bullet speed: Changed 400 to 360
                    b.setVelocity(Math.cos(angle) * 220 * bulletSpeedMultiplier, Math.sin(angle) * 220 * bulletSpeedMultiplier); 
                    fireCount++; fired = true;
                }
            }

                if (e.isBossRemnant && Phaser.Math.Between(0, 4) === 0) { 
                    const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                    const b = this.bossBullets.create(e.x, e.y + 40, "bossBullet");
                    b.setScale(1.2);
                    b.setVelocity(Math.cos(angle) * 350 * bulletSpeedMultiplier, Math.sin(angle) * 350 * bulletSpeedMultiplier);
                    fireCount++; fired = true;
                }

                if (fired) this.playSFX('sfx_enemy_shoot', 0.15);
            }
        });
    }

    checkBossSpawn() {
        if (GameState.correctCount >= GameState.totalCorrectNeeded && !GameState.bossActive && !this.isTransitioningToBoss) {
            this.isTransitioningToBoss = true;
            
            if (this.spawnTimer) this.spawnTimer.paused = true;
            
            const qScene = this.scene.get('QuestionScene');
            if (qScene) {
                qScene.isProcessing = true; 
            }

            this.time.delayedCall(2000, () => {
                this.triggerBossFight();
                this.isTransitioningToBoss = false;
            });
        }
    }

    triggerBossFight() {
        GameState.bossActive = true;
        GameState.battery = 0; 
        
        this.enemies.clear(true, true);
        this.obstacles.clear(true, true);
        this.batteries.clear(true, true);
        this.powerUps.clear(true, true);
        this.meteors.clear(true, true); 

        this.playSFX('sfx_warning', 0.8, false);

        const qScene = this.scene.get('QuestionScene');
        if (qScene) qScene.toggleBattleMode(true);

        const stage = GameState.bossStage;
        let bossTitle = "", bossHp = 1000, bossKey = "boss_lv1";

        // Reset to default font size for the first two bosses
        this.warningText.setFontSize('60px'); 

        if (stage === 0) { bossTitle = "প্রিলি দানব (১ম বস)"; bossHp = 1500; bossKey = "boss_lv1"; }
        else if (stage === 1) { bossTitle = "লিখিত লড়াকু (২য় বস)"; bossHp = 2500; bossKey = "boss_lv2"; }
        else { 
            bossTitle = "ভাইভা বিভীষিকা (সর্বশেষ বস)"; 
            bossHp = 4000; 
            bossKey = "boss_lv3"; 
            
            // Shrink the text so it fits on screen
            this.warningText.setFontSize('54px'); 
        }

        bossHp = Math.ceil(bossHp * this.luckMods.hpMult);

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
            
            this.boss.isEntryInvulnerable = true;

            this.tweens.add({
                targets: this.boss,
                y: 200,
                duration: 2000,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.boss.isEntryInvulnerable = false; 
                    this.bossBarBg.setVisible(true);
                    this.bossBarFill.setVisible(true);

                    if (stage === 0) {
                        this.boss.setVelocityX(150 * this.luckMods.speedMult);
                        this.boss.setCollideWorldBounds(true).setBounce(1, 0);
                    } else if (stage === 1) {
                        this.boss.setVelocityX(200 * this.luckMods.speedMult);
                        this.boss.setCollideWorldBounds(true).setBounce(1, 0);
                        this.bossDipTween = this.tweens.add({ targets: this.boss, y: 350, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                    } else if (stage >= 2) {
                        this.boss.setVelocityX(0);
                        this.bossTeleportTimer = this.time.addEvent({
                            delay: 3500, loop: true,
                            callback: () => {
                                if (this.isResuming) return;
                                if (!this.boss || !this.boss.active || this.boss.isLaserInvulnerable) return; // Prevent teleport during laser
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
            
            this.physics.add.overlap(this.player, this.boss, this.hitPlayer, null, this);
        });
    }

    fireBossLaser(stage) {
        if (!this.boss || !this.boss.active) return;
        
        this.boss.isLaserInvulnerable = true;
        this.boss.setTint(0xaaaaaa); 
        
        if (this.bossAttackTimer) this.bossAttackTimer.paused = true;

        const isBoss3 = (stage >= 2);
        const isBoss2 = (stage === 1); // Track Boss 2
        const laserColor = isBoss3 ? 0x39ff14 : 0xff0000; // Lime Green for Boss 3, Red for Boss 2
        const warningDuration = isBoss3 ? 1000 : 1500; // Boss 3 is faster
        const laserDuration = isBoss3 ? 2000 : 1500;
        const laserWidth = isBoss3 ? 120 : 80; // Boss 3 has thicker laser

        const prevVelocityX = this.boss.body.velocity.x;
        if (!isBoss3) {
            this.boss.setVelocityX(0); 
        }

        // --- MODIFIED: Clear existing boss bullets, but keep some for Boss 2 ---
        this.bossBullets.children.each(b => {
            if (!b.isBossLaser && b.active) {
                // If it's Boss 2, keep ~40% of the active hazards on the screen.
                if (isBoss2 && Math.random() < 0.4) {
                    return; 
                }
                // Add a small visual pop where the bullets used to be
                this.createExplosion(b.x, b.y, laserColor, 5);
                b.destroy();
            }
        });

        const warningRect = this.add.rectangle(this.boss.x, this.boss.y + 60, laserWidth, this.cameras.main.height, laserColor, 0.25).setOrigin(0.5, 0);
        this.tweens.add({ targets: warningRect, alpha: 0.6, duration: 150, yoyo: true, repeat: -1 });

        // --- NEW: Spawn a FULL-SCALE enemy during Boss 2's warning phase ---
        if (isBoss2) {
            let spawnX = Phaser.Math.Between(100, 620);
            // Ensure it doesn't spawn directly inside the incoming laser beam
            if (Math.abs(spawnX - this.boss.x) < 120) {
                spawnX = spawnX < 360 ? spawnX - 150 : spawnX + 150;
            }
            
            // Spawning an "Ultra" tier enemy as the heavy distraction
            const enemy = this.enemies.create(spawnX, -50, "enemy_ultra");
            enemy.enemyType = "ultra";
            enemy.tier = "ultra";
            
            // Apply full-scale HP based on global progress
            let progress = this.getGlobalProgress ? this.getGlobalProgress() : 0;
            let hpMultiplier = (1 + (progress * 0.2)) * (this.luckMods ? this.luckMods.hpMult : 1);
            enemy.hp = 35 * hpMultiplier; 
            enemy.maxHp = enemy.hp;
            
            // Set standard heavy enemy physics
            enemy.setSize(55, 65); 
            enemy.setScale(1.2); 
            enemy.movePattern = "wave"; 
            enemy.moveTimer = 0;
            
            enemy.setVelocityY(160 * (this.luckMods ? this.luckMods.speedMult : 1));
            
            if (this.applyEnemyModifiers) this.applyEnemyModifiers(enemy);
        }
        // ----------------------------------------------------------------------

        let trackEvent = null;
        if (isBoss3) {
            trackEvent = this.time.addEvent({
                delay: 20,
                loop: true,
                callback: () => {
                    if (this.boss && this.boss.active) {
                        this.boss.x = Phaser.Math.Linear(this.boss.x, this.player.x, 0.04);
                        if (warningRect && warningRect.active) warningRect.x = this.boss.x;
                    }
                }
            });
        }

        this.time.delayedCall(warningDuration, () => {
            if (trackEvent) trackEvent.remove();
            if (!this.boss || !this.boss.active) {
                if (warningRect) warningRect.destroy();
                return;
            }

            if (warningRect) warningRect.destroy();
            this.playSFX('sfx_shockwave', 0.8, false); 
            this.cameras.main.shake(laserDuration, 0.015);

            const laser = this.add.rectangle(this.boss.x, this.boss.y + 60, laserWidth, this.cameras.main.height * 1.5, laserColor, 1).setOrigin(0.5, 0);
            this.physics.add.existing(laser);
            laser.body.setAllowGravity(false);
            laser.body.setImmovable(true);
            laser.isBossLaser = true; 
            
            this.bossBullets.add(laser);

            let sweepTween = null;
            if (isBoss3) {
                sweepTween = this.tweens.add({
                    targets: this.boss,
                    x: this.player.x,
                    duration: laserDuration,
                    ease: 'Sine.easeInOut'
                });
            }

            this.time.delayedCall(laserDuration, () => {
                if (laser && laser.active) laser.destroy();
                if (this.boss && this.boss.active) {
                    this.boss.isLaserInvulnerable = false;
                    this.boss.clearTint();
                    this.boss.setTint(0xff0000); 
                    
                    this.boss.setVelocityX(prevVelocityX);
                    if (this.bossAttackTimer) this.bossAttackTimer.paused = false;
                }
            });
        });
    }

    triggerBossDeathSequence(boss) {
        const stage = GameState.bossStage;
        const x = boss.x;
        const y = boss.y;

        window.updateMissionProgress("kill_bosses", 1); 

        if (this.bossAttackTimer) this.bossAttackTimer.remove();
        if (this.bossDipTween) this.bossDipTween.stop();
        if (this.bossTeleportTimer) this.bossTeleportTimer.remove();
        this.bossBarBg.setVisible(false);
        this.bossBarFill.setVisible(false);

        // --- NEW: Satisfying Screen Wipe for Enemy Bullets ---
        this.bossBullets.children.each(b => {
            if (b.active && !b.isBossLaser) {
                // Creates a green pop for every bullet before it dies
                this.createExplosion(b.x, b.y, 0x39ff14, 3); 
            }
        });
        
        // Clear all enemy hazards instantly
        this.bossBullets.clear(true, true);
        this.obstacles.clear(true, true);
        this.meteors.clear(true, true);
        
        // --- NEW: Clear player bullets so you don't instantly hit remnants! ---
        this.bullets.clear(true, true);
        this.sideBullets.clear(true, true);
        this.specialWeapons.clear(true, true);
        this.bossBullets.clear(true, true);
        // ----------------------------------------------------------------------

        this.enemies.children.each(e => {
            if (e !== boss && !e.isBossRemnant) {
                e.destroy();
            }
        });

        this.isInvulnerable = true; 
        this.isAnimating = true;

        this.playSFX('sfx_boss_overload', 1.0, false);
        this.cameras.main.shake(1500, 0.02);

        this.tweens.add({
            targets: boss,
            x: x + Phaser.Math.Between(-15, 15),
            y: y + Phaser.Math.Between(-15, 15),
            duration: 50,
            yoyo: true,
            repeat: 25
        });

        this.time.addEvent({
            delay: 100,
            repeat: 12,
            callback: () => {
                if(boss && boss.active) boss.setTintFill(Math.random() > 0.5 ? 0xffffff : 0xff0000);
            }
        });

        let explosions = 8;
        for(let i=0; i<explosions; i++) {
            this.time.delayedCall(i * 150, () => {
                let ex = x + Phaser.Math.Between(-100, 100);
                let ey = y + Phaser.Math.Between(-80, 80);
                this.createExplosion(ex, ey, 0xffaa00, 25);
            });
        }

        this.time.delayedCall(explosions * 150 + 200, () => {
            this.playSFX('sfx_shockwave', 1.0, false);
            this.playSFX('sfx_explode', 1.0);
            this.cameras.main.flash(800, 255, 255, 255);
            this.createExplosion(x, y, 0xff0000, 50);
            this.cameras.main.shake(500, 0.04); 

            const shockwaveVisual = this.add.image(x, y, 'tex_shockwave_heavy').setScale(0.5);
            this.tweens.add({ targets: shockwaveVisual, scale: 20, alpha: 0, duration: 1500, ease: 'Quad.out', onComplete: () => shockwaveVisual.destroy() });

            boss.destroy();
            this.boss = null;

            let remnantTexture = "boss_lv" + (stage + 1);
            if (stage > 2) remnantTexture = "boss_lv3"; 

            const remnantCount = 3 + stage;
            this.bossRemnantsActive = remnantCount;

            for (let i = 0; i < remnantCount; i++) {
                const remnant = this.enemies.create(x, y, remnantTexture);
                remnant.hp = 120 * (stage + 1); 
                remnant.maxHp = remnant.hp;
                remnant.tier = "mini_boss"; 
                remnant.enemyType = "mini_boss";
                remnant.isBossRemnant = true;

                remnant.setScale(0.8); 
                remnant.body.setSize(216, 120); 

                remnant.setCollideWorldBounds(true);
                remnant.setBounce(1, 1);
                remnant.movePattern = "remnant_pattern"; 

                const angle = (i / remnantCount) * Math.PI * 2;
                const speed = Phaser.Math.Between(250, 350);
                remnant.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

                this.tweens.add({ targets: remnant, scale: { from: 0.1, to: 0.8 }, duration: 500, ease: 'Back.out' });
            }
            
            this.isAnimating = false;
            this.isInvulnerable = false; 
        });
    }

    winBossFight() {
        if (!GameState.bossActive) return; 
        
        if (GameState.bossStage === 2) {
            this.isAnimating = true;
            GameState.gameCompleted = true;
            this.physics.pause();
            this.playSFX('sfx_boss_win', 1.0, false);

            this.bossBullets.clear(true, true);
            this.enemies.clear(true, true);
            this.obstacles.clear(true, true);
            this.meteors.clear(true, true);
            this.isInvulnerable = true;

            this.wingmen.children.each(w => {
                this.createExplosion(w.x, w.y, 0x0088ff, 10);
                w.destroy();
            });
            
            const cx = this.cameras.main.centerX;
            const cy = this.cameras.main.centerY;
            const w = this.cameras.main.width;
            const h = this.cameras.main.height;

            this.darkOverlay = this.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0).setDepth(4000);
            this.tweens.add({ targets: this.darkOverlay, fillAlpha: 0.85, duration: 1500 });
            
            this.cameras.main.shake(3500, 0.015);

            const singularityCore = this.add.circle(cx, cy, 5, 0x000000).setDepth(4001).setStrokeStyle(4, 0xff00ff);
            const singularityGlow = this.add.circle(cx, cy, 10, 0xcc00ff, 0.6).setDepth(4000);
            const aura = this.add.image(cx, cy, "aura_plasma").setTint(0xff00ff).setDepth(4000).setScale(0.1);

            this.tweens.add({ targets: aura, angle: 360, duration: 2000, repeat: -1 });
            this.tweens.add({ targets: [singularityCore, singularityGlow, aura], scale: 15, duration: 3000, ease: 'Sine.easeInOut' });

            this.player.setDepth(4002);
            this.player.setTint(0x00ffff);
            
            this.tweens.add({ 
                targets: this.player, 
                x: cx, 
                y: cy, 
                scaleX: 0.05, 
                scaleY: 2.5,  
                alpha: 0,     
                duration: 3000, 
                ease: 'Expo.easeIn' 
            });

            for(let i=0; i<40; i++) {
                let px = cx + Phaser.Math.Between(-350, 350);
                let py = cy + Phaser.Math.Between(-350, 350);
                let p = this.add.circle(px, py, 4, 0x00ffff).setDepth(4001);
                this.tweens.add({ targets: p, x: cx, y: cy, scale: 0, duration: Phaser.Math.Between(1000, 2500), ease: 'Cubic.easeIn', onComplete:()=>p.destroy() });
            }

            this.time.delayedCall(3500, () => {
                this.playSFX('sfx_shockwave', 1.0, false);
                this.cameras.main.flash(1500, 255, 255, 255);
                singularityCore.destroy();
                singularityGlow.destroy();
                aura.destroy();

                GameState.keys = (GameState.keys || 0) + 3;
                
                const finalXpWon = 300;
                if (GameState.profile) {
                    GameState.profile.bk = (GameState.profile.bk || 0) + 1;
                    GameState.profile.xp = (GameState.profile.xp || 0) + finalXpWon;
                }
                
                GameState.bossActive = false;
                GameState.bossStage++;
                GameState.correctCount = 0;
                
                if (this.spawnTimer) this.spawnTimer.paused = false;

                window.saveCurrency();
                window.updateLevelTargets();
                this.updateGameSpeed();

                this.bossBarBg.setVisible(false);
                this.bossBarFill.setVisible(false);

                this.showVoidChoiceMenu();
                this.isAnimating = false;
            });
            return;
        }

        this.playSFX('sfx_boss_win', 0.8, false);

        if (GameState.gameMode !== "revision") {
            const isValidSubject = (GameState.currentSubject === "all" || GameState.currentSubject === "all_no_math");
            const rewardContainer = this.add.container(360, 700);
            let rewardElements = [];

            if (isValidSubject) {
                const keysWon = GameState.bossStage + 1;
                GameState.keys = (GameState.keys || 0) + keysWon;
                
                const keyIcon = this.add.image(0, -30, "ui_key").setScale(1.0);
                const keyTxt = this.add.text(35, -30, `+${keysWon} চাবি পাওয়া গেছে`, { fontSize: '50px', fontFamily: "'Anek Bangla'", color: '#ffd700', stroke: '#000000', strokeThickness: 7 }).setOrigin(0, 0.5);
                const totalWidth = keyIcon.displayWidth + keyTxt.width + 10;
                keyIcon.x = -totalWidth / 2 + (keyIcon.displayWidth / 2);
                keyTxt.x = keyIcon.x + (keyIcon.displayWidth / 2) + 15;
                rewardElements.push(keyIcon, keyTxt);
            }

            const xpWon = (GameState.bossStage + 1) * 75; 
            if (GameState.profile) {
                GameState.profile.bk = (GameState.profile.bk || 0) + 1;
                GameState.profile.xp = (GameState.profile.xp || 0) + xpWon;
            }

            const xpTxt = this.add.text(0, isValidSubject ? 35 : 0, `+${xpWon} XP পাওয়া গেছে`, { 
                fontSize: '40px', 
                fontFamily: "'Anek Bangla'", 
                color: '#ffbb00', 
                stroke: '#000000', 
                strokeThickness: 6 
            }).setOrigin(0.5, 0.5);

            rewardElements.push(xpTxt);
            rewardContainer.add(rewardElements);
            
            this.time.delayedCall(2800, () => this.playSFX('sfx_xp_gain', 0.8, false));

            this.tweens.add({ targets: rewardContainer, y: 800, alpha: 0.05, duration: 1500, delay: 2800, onComplete: () => rewardContainer.destroy() });
        }

        GameState.bossActive = false;
        GameState.bossStage++;
        GameState.correctCount = 0;
        
        if (this.spawnTimer) this.spawnTimer.paused = false;
        
        window.saveCurrency();

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

        const qScene = this.scene.get('QuestionScene');
        if (qScene) {
            this.time.delayedCall(4500, () => {
                if (GameState.bossStage === 3) {
                    this.showVoidChoiceMenu();
                } else {
                    qScene.toggleBattleMode(false);
                    qScene.qText.setText(""); 
                    qScene.refreshQuestion();
                }
            });
        }
    }

    showVoidChoiceMenu() {
        this.physics.pause();
        this.time.paused = true;
        this.gamePaused = true;

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const cx = w / 2, cy = h / 2;

        this.voidChoiceMenu = this.add.container(0, 0).setDepth(10000);
        const bg = this.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85).setInteractive(); 

        const panelW = 600, panelH = 500, panelX = cx - panelW / 2, panelY = cy - panelH / 2;
        const panelGraphics = this.add.graphics();
        panelGraphics.fillStyle(0x050015, 0.9);
        panelGraphics.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
        panelGraphics.lineStyle(4, 0x9900ff, 0.8);
        panelGraphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

        const title = this.add.text(cx, panelY + 70, "অভিনন্দন!", {
            fontSize: "65px", fontFamily: "'Anek Bangla'", color: "#00ffcc", fontStyle: "bold", stroke: "#000000", strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: "#006644", blur: 12, stroke: true, fill: true }
        }).setOrigin(0.5);

        const subText = this.add.text(cx, panelY + 150, "আপনি সফলভাবে সব বসকে হারিয়েছেন।\nএখন কি করবেন?", {
            fontSize: "28px", color: "#e0e0e0", fontFamily: "'Anek Bangla'", fontStyle: "bold", align: "center", lineSpacing: 10
        }).setOrigin(0.5);

        const btnW = 480, btnH = 86, radius = btnH / 2;

        const voidBtnContainer = this.add.container(cx, panelY + 280);
        const voidBg = this.add.graphics();
        const drawVoidBtn = (hover) => {
            voidBg.clear();
            voidBg.fillGradientStyle(
                hover ? 0x330066 : 0x1a0033, hover ? 0x330066 : 0x1a0033,
                hover ? 0x9900ff : 0x6600cc, hover ? 0x9900ff : 0x6600cc, 1
            );
            voidBg.lineStyle(hover ? 5 : 4, hover ? 0xffffff : 0xcc99ff, 0.8);
            voidBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
            voidBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
        };
        drawVoidBtn(false);
        
        const voidTxt = this.add.text(0, 0, "মহাশূন্যে প্রবেশ করুন (Endless)", {
            fontSize: "36px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold", stroke: "#330066", strokeThickness: 4
        }).setOrigin(0.5);
        const voidHitArea = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
        voidBtnContainer.add([voidBg, voidTxt, voidHitArea]);

        voidHitArea.on('pointerdown', () => {
            this.playSFX('sfx_click', 0.6);
            this.tweens.add({ targets: voidBtnContainer, scale: 0.9, duration: 50, yoyo: true, onComplete: () => {
                this.time.paused = false;
                this.gamePaused = false;
                GameState.isEndlessMode = true; 
                this.voidChoiceMenu.destroy();
                
                if (this.darkOverlay) this.darkOverlay.destroy();

                this.playSFX('sfx_wormhole_exit', 0.3, false);
                const flash = this.add.circle(cx, cy, 10, 0xffffff).setDepth(5000);
                this.tweens.add({
                    targets: flash,
                    scale: 150,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Cubic.easeOut',
                    onComplete: () => flash.destroy()
                });
                
                this.enemies.clear(true, true);
                this.obstacles.clear(true, true);
                this.meteors.clear(true, true);
                this.bossBullets.clear(true, true);
                this.bullets.clear(true, true);
                this.sideBullets.clear(true, true);
                this.specialWeapons.clear(true, true);
                this.batteries.clear(true, true);
                this.powerUps.clear(true, true);

                this.isAnimating = true; 
                this.isResuming = true;
                this.physics.resume(); 

                this.player.setDepth(1);
                this.player.clearTint();
                this.player.setAlpha(1);
                this.player.setScale(0);
                this.player.setAngle(1080);
                this.player.setPosition(cx, cy);

                this.tweens.add({
                    targets: this.player,
                    x: 360,
                    y: this.cameras.main.height - 150,
                    scaleX: 0.9,
                    scaleY: 0.9,
                    angle: 0,
                    duration: 1200,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.applyShipAnimation(GameState.equippedShip || "default");
                        const qScene = this.scene.get('QuestionScene');
                        if (qScene) {
                            qScene.toggleBattleMode(false);
                            qScene.qText.setText("");
                            qScene.refreshQuestion();
                        }
                        
                        this.isResuming = false;
                        this.isAnimating = false;
                        this.isInvulnerable = false;
                    }
                });
            }});
        });
        voidHitArea.on('pointerover', () => { this.playSFX('sfx_tick', 0.2); drawVoidBtn(true); });
        voidHitArea.on('pointerout', () => { drawVoidBtn(false); });

        const endBtnContainer = this.add.container(cx, panelY + 400);
        const endBg = this.add.graphics();
        const drawEndBtn = (hover) => {
            endBg.clear();
            endBg.fillStyle(hover ? 0x660000 : 0x330000, 0.9);
            endBg.lineStyle(3, hover ? 0xff4444 : 0xcc0000, 0.8);
            endBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
            endBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
        };
        drawEndBtn(false);
        const endTxt = this.add.text(0, 0, "খেলা শেষ করুন (End Game)", {
            fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#ffcccc", fontStyle: "bold"
        }).setOrigin(0.5);
        const endHitArea = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
        endBtnContainer.add([endBg, endTxt, endHitArea]);

        endHitArea.on('pointerdown', () => {
            this.playSFX('sfx_back', 0.6);
            this.tweens.add({ targets: endBtnContainer, scale: 0.9, duration: 50, yoyo: true, onComplete: () => {
                this.time.paused = false;
                this.gamePaused = false;
                this.voidChoiceMenu.destroy();
                
                if (this.darkOverlay) this.darkOverlay.destroy();
                
                this.finalizeGameOver("void_quit"); 
            }});
        });
        endHitArea.on('pointerover', () => { this.playSFX('sfx_tick', 0.2); drawEndBtn(true); endTxt.setColor("#ffffff"); });
        endHitArea.on('pointerout', () => { drawEndBtn(false); endTxt.setColor("#ffcccc"); });

        this.voidChoiceMenu.add([bg, panelGraphics, title, subText, voidBtnContainer, endBtnContainer]);
    }

    collectBattery(player, battery) {
        this.playSFX('sfx_battery_collect', 0.4);

        const value = battery.batteryValue || 15;
        const finalValue = Math.ceil(value * this.batteryMultiplier);
        let textColor = "#00ff00";
        if (battery.texture.key === "battery_yellow") textColor = "#d9ff00";
        if (battery.texture.key === "battery_red") textColor = "#ffee00";

        battery.destroy();

        if (!GameState.bossActive) {
            GameState.battery = Math.min(100, GameState.battery + finalValue);

            let displayTxt = `+${finalValue}%`;
            if (this.batteryMultiplier > 1.0) displayTxt += " (BST)";
            const text = this.add.text(battery.x, battery.y, displayTxt, { fontSize: "36px", color: textColor, fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5);
            this.tweens.add({ targets: text, y: battery.y - 80, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
        }
    }

    regenerateLife() {
        super.regenerateLife();
        this.playSFX('sfx_regen', 0.4, false); 
    }

    handlePlayerDeath() {
        if (this.isDead) return;
        this.isDead = true;

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
                this.finalizeGameOver(GameState.isEndlessMode ? "death_endless" : "death_normal");
            }
        });
    }

    finalizeGameOver(reason = "death_normal") {
        const bgMusic = this.sound.get('bg_music');
        if (bgMusic) bgMusic.stop();

        if (GameState.gameMode !== "revision") {
            GameState.gamesPlayed = (GameState.gamesPlayed || 0) + 1;
            if (window.saveGame) window.saveGame();
        }

        this.physics.pause();
        this.time.paused = false;
        this.cameras.main.fade(1000, 0, 0, 0);

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
            this.physics.world.timeScale = 1;
            this.scene.stop("QuestionScene");
            this.scene.start("DeathScene", { reason: reason });
        });
    }

    hitPlayer(player, source) {
        if (this.isDashActive) {
            const isBoss = (source === this.boss);
            if (!isBoss && source.active) {
                if (this.enemies.contains(source)) {
                    this.destroyEnemy(source);
                } else if (this.obstacles.contains(source)) {
                    this.createExplosion(source.x, source.y, 0x00ffff, 15);
                    if (source.trail) source.trail.destroy();
                    source.destroy();
                    GameState.score += 15;
                } else if (this.meteors.contains(source)) {
                    this.createExplosion(source.x, source.y, 0xffaa00, 20);
                    if (source.trail) source.trail.destroy();
                    source.destroy();
                } else if (this.bossBullets.contains(source)) {
                    this.createExplosion(source.x, source.y, 0x00ffff, 5);
                    if (!source.isBossLaser) source.destroy();
                }
            }
            return; 
        }
        
        if (this.isInvulnerable) return;

        const isBoss = (source === this.boss);

        if (!isBoss && source.active && source.enemyType === "thief") {
            this.playSFX('sfx_shield_break', 0.6, false); 
            this.applyThiefDebuff();
            this.createExplosion(source.x, source.y, 0xff00ff, 30);
            
            if (source.trail) source.trail.destroy();
            source.destroy(); 
            return; 
        }

        if (this.fireShieldActive) {
            this.createExplosion(source.x, source.y, 0xffaa00, 10);
            if (!isBoss && source.active) {
                if (this.enemies.contains(source)) this.destroyEnemy(source);
                else {
                    if (source.trail) source.trail.destroy(); 
                    if (source.destroy && !source.isBossLaser) source.destroy();
                }
            }
            return;
        }
        if (this.hasShield) {
            this.playSFX('sfx_shield_break', 0.3, false);
            this.hasShield = false;
            this.shieldArc.setVisible(false);
            
            // ADD THIS NEW LINE RIGHT HERE:
            if (this.specialShieldSprite) this.specialShieldSprite.setVisible(false);

            if (!isBoss && source.active) {
                if (this.enemies.contains(source)) this.destroyEnemy(source);
                else {
                    if (source.trail) source.trail.destroy(); 
                    if (source.destroy && !source.isBossLaser) source.destroy();
                }
            }
            return;
        }

        this.playSFX('sfx_hit', 0.3);
        this.isInvulnerable = true;
        
        if (!isBoss && source.active) {
            if (this.enemies.contains(source)) this.destroyEnemy(source);
            else {
                if (source.trail) source.trail.destroy(); 
                if (source.destroy && !source.isBossLaser) source.destroy();
            }
        }
        
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
                    } else {
                        this.isInvulnerable = false;
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
        this.physics.overlap(safeZone, this.bossBullets, (zone, bullet) => { 
            if (!bullet.isBossLaser) {
                this.createExplosion(bullet.x, bullet.y, 0xffaa00, 50); 
                bullet.destroy(); 
            }
        });
        this.physics.overlap(safeZone, this.enemies, (zone, enemy) => { this.destroyEnemy(enemy); });
        this.physics.overlap(safeZone, this.obstacles, (zone, obs) => {
            this.createExplosion(obs.x, obs.y, 0x888888, 100);
            if (Math.random() > 0.8) this.dropPowerUp(obs.x, obs.y, obs.obstacleType);
            if (obs.trail) obs.trail.destroy(); 
            obs.destroy();
        });
        
        this.physics.overlap(safeZone, this.meteors, (zone, m) => {
            this.createExplosion(m.x, m.y, 0xff2200, 20);
            if (m.trail) m.trail.destroy();
            m.destroy();
        });
        
        safeZone.destroy();
    }

    spawnBossMinions(stage, count = 2) {
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(50, 670);
            const type = (stage === 0) ? "enemy_common" : (stage === 1 ? "enemy_octopus" : "enemy_dragon");
            const minion = this.enemies.create(x, 200, type);
            
            minion.hp = 10;
            minion.maxHp = 10;
            minion.tier = type.replace("enemy_", "");
            minion.enemyType = minion.tier;
            
            minion.setVelocityY(150);
            minion.setAlpha(0.8);
            minion.setScale(1.2);
            
            if (minion.tier === "octopus") {
                minion.movePattern = "jet_pulse"; 
                minion.pulseTimer = 0;
            } else if (minion.tier === "dragon") {
                minion.movePattern = "zigzag"; 
                minion.setVelocityX(Phaser.Math.Between(-100, 100));
            } else {
                minion.movePattern = "straight"; 
                minion.rotSpeed = 2;
            }
            
            this.tweens.add({ targets: minion, scale: { from: 0, to: 1.2 }, duration: 500 });
        }
    }

    handleBossHit(boss, shot) {
        if (boss.isEntryInvulnerable || boss.isLaserInvulnerable) {
            if (shot.weaponType !== "lightning" && shot.weaponType !== "plasma" && shot.weaponType !== "ice") {
                shot.destroy();
            }
            return;
        }

        const weaponType = shot.weaponType || shot.texture.key;
        let damage = 1;
        const damageMultiplier = 1 + (this.getGlobalProgress() * 0.15);

        if (weaponType === "missile") damage = 8;
        else if (weaponType.includes("side_bullet")) damage = 3;
        else if (weaponType.includes("bullet")) damage = 2;
        else if (weaponType === "lightning") { 
            damage = 6; 
            shot.pierceCount = (shot.pierceCount || 0) + 1; 
            if (shot.pierceCount >= 3) shot.destroy(); 
        }
        else if (weaponType === "plasma") damage = 8;

        if (weaponType !== "lightning" && weaponType !== "plasma" && weaponType !== "ice") {
            shot.destroy();
        }

        const finalDamage = damage * damageMultiplier * this.luckMods.playerDamageMult;

        this.playSFX('sfx_enemy_hit', 0.25);
        boss.hp -= finalDamage;
        boss.x += Phaser.Math.FloatBetween(-3, 3);
        boss.y += Phaser.Math.FloatBetween(-1, 1);
        this.bossBarFill.width = (boss.hp / boss.maxHp) * 600;
        this.hitEmitter.emitParticle(5, shot.x, shot.y);

        boss.setTint(0xffffff);
        this.time.delayedCall(50, () => {
            if (boss.active && !boss.isLaserInvulnerable) boss.setTint(boss.phase === 2 ? 0xff0000 : 0xffffff);
            if (boss.phase === 1 && boss.active && !boss.isLaserInvulnerable) boss.clearTint();
        });

        if (boss.hp <= 0 && !boss.isDying) {
            boss.isDying = true;
            this.triggerBossDeathSequence(boss);
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
            fontSize: "28px", color: "#00ffff", fontFamily: "Arial", fontStyle: "bold"
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
            fontSize: "22px", color: "#b3d4ff", fontFamily: "'Anek Bangla'", fontStyle: "bold"
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
                if (btnHitArea.getData('clicked')) return;
                btnHitArea.setData('clicked', true);
                
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
            if (quitHitArea.getData('clicked')) return;
            quitHitArea.setData('clicked', true);

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
        
        // --- ADD THESE RESET FLAGS ---
        this.isDead = false;
        this.isAnimating = false;
        this.isResuming = false;
        // -----------------------------

        this.reviveMenu.destroy();

        const qScene = this.scene.get("QuestionScene");
        if (qScene) {
            this.scene.resume("QuestionScene");
            this.scene.setVisible(true, "QuestionScene");
            
            // --- ADD THIS TO UNLOCK QUESTIONS ---
            qScene.isProcessing = false;
            // ------------------------------------
        }

        this.time.paused = false;
        this.player.setVisible(true);
        this.player.body.enable = true;
        this.player.setAlpha(1);

        this.isInvulnerable = true;
        this.tweens.add({
            targets: this.player, alpha: 0.2, duration: 100, yoyo: true, repeat: 15,
            onComplete: () => { 
                if(this.player && this.player.active) {
                    this.player.setAlpha(1); 
                    this.isInvulnerable = false; 
                }
            }
        });
        
        // This will now successfully execute because isAnimating is false
        this.startCountdown();
    }

    handleGiveUp() {
        clearInterval(this.reviveInterval);
        this.time.paused = false;
        this.gamePaused = false;
        this.reviveMenu.destroy();
        this.finalizeGameOver(GameState.isEndlessMode ? "death_endless" : "death_normal");
    }

    startBossCombatLoop(stage) {
        this.boss.spiralAngle = 0;
        this.boss.attackState = 0; 
        const luckMult = this.luckMods.speedMult; 

        let baseDelay = 1500 - (stage * 200); 
        
        this.bossAttackTimer = this.time.addEvent({
            delay: baseDelay,
            loop: true,
            callback: () => {
                if (this.isResuming || this.isAnimating) return;
                if (!this.boss || !this.boss.active) return;
                
                if (this.boss.phase === 1 && this.boss.hp < this.boss.maxHp * 0.5) {
                    this.boss.phase = 2;
                    this.boss.setTint(0xff0000);
                    this.playSFX('sfx_boss_phase2', 0.8, false);
                    this.cameras.main.shake(500, 0.01);
                    this.spawnBossMinions(stage); 
                    
                    if (stage === 0) {
                        this.boss.setVelocityX((200) * luckMult * (Math.random() > 0.5 ? 1 : -1)); 
                        this.bossAttackTimer.delay = 1400; 
                    } else if (stage === 1) {
                        this.boss.setVelocityX((350) * luckMult * (Math.random() > 0.5 ? 1 : -1));
                        this.bossAttackTimer.delay = 900;
                    } else if (stage >= 2) {
                        this.bossAttackTimer.delay = 600;
                    }
                }

                const isPhase2 = this.boss.phase === 2;
                let bossFired = false;
                this.boss.attackState++;

                // Trigger Laser attack periodically in Phase 2 for Boss 2 (stage 1) and Boss 3 (stage >= 2)
                if (isPhase2 && (stage === 1 || stage >= 2)) {
                    if (this.boss.attackState % 5 === 0) {
                        this.fireBossLaser(stage);
                        return; // Skip normal attack during laser setup
                    }
                }

                if (stage === 0) {
                    const atkType = this.boss.attackState % 4; 
                    if (atkType === 0) {
                        const bullets = isPhase2 ? 5 : 3; 
                        const spread = 60; 
                        for (let i = 0; i < bullets; i++) {
                            const angle = Phaser.Math.DegToRad(90 - (spread/2) + (spread/(bullets-1))*i);
                            const b = this.bossBullets.create(this.boss.x, this.boss.y + 50, "bossBullet");
                            b.setVelocity(Math.cos(angle) * 300 * luckMult, Math.sin(angle) * 300 * luckMult);
                        }
                        bossFired = true;
                    } else if (atkType === 1) {
                        const count = isPhase2 ? 2 : 1; 
                        for(let i=0; i<count; i++) {
                            const b = this.bossBullets.create(this.boss.x + (i*40 - (count-1)*20), this.boss.y + 60, "bossBullet_tracking");
                            const angle = Phaser.Math.Angle.Between(b.x, b.y, this.player.x, this.player.y);
                            const speed = 300 * luckMult;
                            b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                            b.trackingBullet = true;
                        }
                        bossFired = true;
                    } else if (atkType === 2) {
                        for (let i = -1; i <= 1; i++) { 
                            const b = this.bossBullets.create(this.boss.x + (i * 40), this.boss.y + 60, "bossBullet");
                            b.setVelocity(i * 40 * luckMult, 400 * luckMult);
                        }
                        if (isPhase2 && this.enemies.countActive() < 2) this.spawnBossMinions(stage, 1);
                        bossFired = true;
                    } else { 
                        const sweepCount = isPhase2 ? 3 : 2; 
                        for (let i = -sweepCount; i <= sweepCount; i++) {
                            this.time.delayedCall(Math.abs(i) * 200, () => {
                                if(this.boss && this.boss.active) {
                                    const b = this.bossBullets.create(this.boss.x, this.boss.y + 60, "bossBullet");
                                    b.setTint(0xffaa00).setScale(1.3);
                                    b.setVelocity(i * 50 * luckMult, 350 * luckMult);
                                }
                            });
                        }
                        bossFired = true;
                    }
                }
                else if (stage === 1) {
                    const atkType = this.boss.attackState % 5; 
                    
                    if (atkType === 0) {
                        const bullets = isPhase2 ? 14 : 10;
                        for (let i = 0; i < bullets; i++) {
                            const angle = (i * (Math.PI * 2)) / bullets;
                            const b = this.bossBullets.create(this.boss.x, this.boss.y + 40, "poison_drop");
                            b.setData('isPoison', true);
                            b.setVelocity(Math.cos(angle) * 200 * luckMult, (Math.sin(angle) * 200 + 150) * luckMult);
                        }
                        bossFired = true;
                    } else if (atkType === 1) {
                        const mine = this.bossBullets.create(this.boss.x, this.boss.y + 50, "bossBullet_tracking");
                        mine.setTint(0xffaa00).setScale(1.5);
                        mine.setVelocityY(250 * luckMult);
                        mine.setDrag(150); 
                        
                        this.time.delayedCall(1200, () => {
                            if (mine && mine.active) {
                                this.createExplosion(mine.x, mine.y, 0xffaa00, 10);
                                this.playSFX('sfx_explode', 0.3);
                                for(let i=0; i<8; i++){
                                    const ang = (i/8)*Math.PI*2;
                                    const shrapnel = this.bossBullets.create(mine.x, mine.y, "enemyBullet");
                                    shrapnel.setVelocity(Math.cos(ang)*300*luckMult, Math.sin(ang)*300*luckMult);
                                }
                                mine.destroy();
                            }
                        });
                        bossFired = true;
                    } else if (atkType === 2) {
                        const gapIndex = Phaser.Math.Between(1, 5);
                        for(let i=0; i<7; i++) {
                            if(i === gapIndex || (isPhase2 && i === gapIndex+1)) continue;
                            const startX = this.boss.x - 120 + (i * 40);
                            const b = this.bossBullets.create(startX, this.boss.y + 60, "bossBullet");
                            b.setVelocityY(400 * luckMult);
                        }
                        bossFired = true;
                    } else if (atkType === 3) {
                        if (isPhase2 && this.enemies.countActive() < 4) this.spawnBossMinions(stage, 1);
                        bossFired = true;
                    } else { 
                        const ringBullets = isPhase2 ? 16 : 12;
                        for (let i = 0; i < ringBullets; i++) {
                            const angle = (i * (Math.PI * 2)) / ringBullets;
                            const b = this.bossBullets.create(this.boss.x, this.boss.y + 50, "enemyBullet");
                            b.setTint(0xff0000).setScale(1.2);
                            b.setVelocity(Math.cos(angle) * 250 * luckMult, Math.sin(angle) * 250 * luckMult);
                        }
                        bossFired = true;
                    }
                }
                else if (stage >= 2) {
                    const atkType = this.boss.attackState % 5; 
                    
                    if (atkType === 1) {
                        const branches = isPhase2 ? 4 : 3;
                        for (let i = 0; i < branches; i++) {
                            const offset = (Math.PI * 2 / branches) * i;
                            const b1 = this.bossBullets.create(this.boss.x - 40, this.boss.y + 40, "enemyBullet");
                            b1.setTint(0xff00ff);
                            b1.setVelocity(Math.cos(this.boss.spiralAngle + offset) * 300 * luckMult, (Math.sin(this.boss.spiralAngle + offset) * 300 + 100) * luckMult);
                            
                            const b2 = this.bossBullets.create(this.boss.x + 40, this.boss.y + 40, "enemyBullet");
                            b2.setTint(0x00ffff);
                            b2.setVelocity(Math.cos(-this.boss.spiralAngle + offset) * 300 * luckMult, (Math.sin(-this.boss.spiralAngle + offset) * 300 + 100) * luckMult);
                        }
                        this.boss.spiralAngle += 0.8;
                        bossFired = true;
                    } else if (atkType === 2) {
                        const count = isPhase2 ? 6 : 4;
                        for (let i = 0; i < count; i++) {
                            this.time.delayedCall(i * 150, () => {
                                if(this.boss && this.boss.active) {
                                    const b = this.bossBullets.create(this.boss.x + Phaser.Math.Between(-50, 50), this.boss.y + 40, "bossBullet_tracking");
                                    b.trackingBullet = true;
                                    const angle = Phaser.Math.Angle.Between(b.x, b.y, this.player.x, this.player.y);
                                    const speed = 400 * luckMult;
                                    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                                }
                            });
                        }
                        bossFired = true;
                    } else if (atkType === 3) {
                        const streamCount = isPhase2 ? 8 : 5;
                        const angleToPlayer = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
                        
                        for (let i = 0; i < streamCount; i++) {
                            this.time.delayedCall(i * 100, () => {
                                if(this.boss && this.boss.active) {
                                    const b = this.bossBullets.create(this.boss.x, this.boss.y + 60, "bossBullet");
                                    b.setTint(0xffff00);
                                    b.setScale(1.2);
                                    const finalAngle = angleToPlayer + Phaser.Math.FloatBetween(-0.08, 0.08);
                                    b.setVelocity(Math.cos(finalAngle) * 500 * luckMult, Math.sin(finalAngle) * 500 * luckMult);
                                }
                            });
                        }
                        
                        if (isPhase2 && this.enemies.countActive() < 5) this.spawnBossMinions(stage, 2);
                        bossFired = true;
                    } else { 
                        const swarm = isPhase2 ? 8 : 5;
                        for (let i = 0; i < swarm; i++) {
                            this.time.delayedCall(i * 250, () => {
                                if (this.boss && this.boss.active) {
                                    const b = this.bossBullets.create(this.boss.x + Phaser.Math.Between(-60, 60), this.boss.y + 50, "bossBullet_tracking");
                                    b.setTint(0x00ff00).setScale(1.5);
                                    b.trackingBullet = true;
                                    
                                    const angleToPlayer = Phaser.Math.Angle.Between(b.x, b.y, this.player.x, this.player.y);
                                    const finalAngle = angleToPlayer + Phaser.Math.FloatBetween(-0.15, 0.15);
                                    const speed = Phaser.Math.Between(300, 400) * luckMult; 
                                    
                                    b.setVelocity(Math.cos(finalAngle) * speed, Math.sin(finalAngle) * speed);
                                }
                            });
                        }
                        bossFired = true;
                    }
                }

                if (bossFired) this.playSFX('sfx_enemy_shoot', 0.25);
            }
        });
    }

    startCountdown() {
        if (this.isResuming || this.isAnimating) return;
        this.isResuming = true;
        this.physics.pause();

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
                    
                    this.tweens.add({ targets: countText, alpha: 0, scale: 1.5, duration: 500, onComplete: () => countText.destroy() });
                }
            },
            callbackScope: this
        });
    }

    spawnMeteors() {
        this.playSFX('sfx_warning', 0.8, false);

        this.time.delayedCall(600, () => {
            for(let i = 0; i < 20; i++) {
                this.time.delayedCall(i * 300, () => {
                    if(!GameState.bossActive && this.scene.isActive()) {
                        let m = this.meteors.create(Phaser.Math.Between(50, 670), -100, "hazard_meteor"); 
                        m.obstacleType = "meteor";
                        m.hp = 9999; 
                        m.setScale(Phaser.Math.FloatBetween(1.2, 2.0));
                        m.setCircle(22, 8, 8); 
                        
                        m.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(750, 1200));
                        m.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
                        m.setAngularVelocity(Phaser.Math.Between(-300, 300));
                        
                        const trail = this.add.particles(0, 0, 'engine_flame', {
                            speed: 50,
                            scale: { start: m.scale * 0.8, end: 0 },
                            alpha: { start: 0.6, end: 0 },
                            blendMode: 'ADD',
                            lifespan: 300
                        });
                        trail.startFollow(m);
                        m.trail = trail; 
                    }
                });
            }
        });
    }
}