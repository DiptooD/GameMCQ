class GameBase extends Phaser.Scene {
  constructor(key = "GameScene") { 
    super(key); 
  }

  // --- AUDIO HELPER ---
  playSound(key, baseVolume = 1.0) {
    if (this.cache.audio.exists(key)) {
        const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
        this.sound.play(key, { volume: finalVolume });
    }
  }

  // --- PROGRESSION & DIFFICULTY ---
  
  /**
   * Calculates the scaled Beginner's Luck Modifiers based on matches played.
   * Scales gracefully over the first 5 matches: 100% -> 80% -> 60% -> 40% -> 20% -> 0%
   */
  getLuckModifiers() {
    let played = (window.GameState && window.GameState.gamesPlayed !== undefined) ? window.GameState.gamesPlayed : 0;
    let luckFactor = Math.max(0, 5 - played) / 5; // Scales from 1.0 down to 0.0

    return {
        factor: luckFactor,                  // 1.0 = 100%, 0.8 = 80%, 0.6 = 60%, etc.
        speedMult: 1.0 - (0.4 * luckFactor), // 0.6 (slower game at 100% luck) -> 1.0 (normal)
        delayMult: 1.0 + (0.5 * luckFactor), // 1.5 (slower spawns at 100% luck) -> 1.0 (normal)
        batteryDropMult: 1.0 + (1.0 * luckFactor), // Up to 2x more battery charge value per drop
        batteryDropChance: 0.4 * luckFactor, // Up to +40% flat increase to enemy drop chance
        batteryTarget: Math.round(100 - (50 * luckFactor)) // Requires only 50% battery at 100% luck instead of 100%
    };
  }
  
  /**
   * Calculates the absolute difficulty rating of the game (0 to 22+).
   * Level 1: 0-10
   * Level 2: 10-17
   * Level 3: 17-22
   * Void: 22+
   */
  getGlobalProgress() {
    let base = 0;
    
    // Add completed levels to the base score
    if (GameState.bossStage > 0) base += 10; // Level 1 completed
    if (GameState.bossStage > 1) base += 7;  // Level 2 completed
    if (GameState.bossStage > 2) base += 5;  // Level 3 completed
    
    // Add current correct count for the active level
    return base + GameState.correctCount;
  }

  updateGameSpeed() {
    const progress = this.getGlobalProgress(); // Range: 0 to 22 (and beyond for void)
    const luck = this.getLuckModifiers(); // Fetch the current graduated modifiers
    
    // 1. Scale Player Fire Rate (Get faster as you progress)
    // Starts at 250ms delay, drops to 150ms cap
    this.fireRate = Math.max(120, 350 - (progress * 10)); 
    if(this.weaponTimer) this.weaponTimer.delay = this.fireRate;

    // 2. Scale Background Speed
    this.backgroundSpeed = (1 + (progress * 0.2)) * luck.speedMult;
    
    // 3. Adjust Spawn Rates (Enemies appear faster)
    let spawnDelay = Math.max(900, 2200 - (progress * 45)) * luck.delayMult;
    if(this.spawnTimer) this.spawnTimer.delay = spawnDelay;
    
    // --- ENEMY FIRE RATE ---
    let enemyFireDelay = Math.max(500, 3000 - (progress * 150)) * luck.delayMult;
    if(this.enemyFireTimer) this.enemyFireTimer.delay = enemyFireDelay;
     
    // Start at 180 frames (3 seconds) and decrease to 60 frames (1 second)
    this.dragonFireThreshold = Math.max(60, 180 - (progress * 6)) * luck.delayMult; 
  }

  // --- VISUALS & ENVIRONMENT ---
  createSpaceBackground() {
    const h = this.cameras.main.height;
    const w = 720;

    // 1. Initial Gradient (Vibrant Start)
    this.bgGradient = this.add.graphics();
    this.bgGradient.fillGradientStyle(0x1a0033, 0x1a0033, 0x002b36, 0x002b36, 1);
    this.bgGradient.fillRect(0, 0, w, h);
  
    // 2. High Density Nebulae
    this.nebulae = this.add.group();
    // Start with Blue/Purple jewel tones
    const colors = [0x242424, 0x373737, 0x161616]; 
    for(let i = 0; i < 2; i++) { 
      let nebula = this.add.ellipse(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(300, 600),
        Phaser.Math.Between(200, 400),
        Phaser.Utils.Array.GetRandom(colors),
        0.12 // Constant visibility
      );
      this.nebulae.add(nebula);
    }

    // 3. Background Debris (Asteroids)
    this.bgDebris = this.add.group();
    for(let i = 0; i < 5; i++) {
      let d = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(4, 10),
        0x444444,
        0.12
      );
      this.bgDebris.add(d);
    }

    this.distantStars = this.add.group();
    for(let i = 0; i < 30; i++) {
      let s = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 2),
        0xffffff,
        0.2,
        Phaser.Math.FloatBetween(0.2, 0.4)
      );
      this.distantStars.add(s);
    }

    this.stars = this.add.group();
    for (let i = 0; i < 45; i++) {
      let s = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 4),
        0x8888ff,
        Phaser.Math.FloatBetween(0.2, 0.4)
      );
      this.stars.add(s);
    }

    this.fastStars = this.add.group();
    for(let i = 0; i < 10; i++) {
      let s = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 3),
        0xCFCFCF,
        0.8
      );
      this.fastStars.add(s);
    }
  }

  createParticleSystems() {
    this.engineEmitter = this.add.particles(0, 0, 'engine_flame', {
      speedY: { min: 100, max: 200 },
      speedX: { min: -20, max: 20 },
      scale: { start: 1.5, end: 0 }, // Scaled up
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      blendMode: 'ADD',
      frequency: -1,
      tint: [0x00ffff, 0x0099ff]
    });

    this.hitEmitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 100, max: 300 },
      scale: { start: 1.2, end: 0 }, // Scaled up
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      blendMode: 'ADD',
      frequency: -1
    });

    this.explosionEmitter = this.add.particles(0, 0, 'explosion_particle', {
      speed: { min: 50, max: 200 },
      scale: { start: 1.8, end: 0 }, // Scaled up
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      blendMode: 'ADD',
      frequency: -1
    });
  }

  createExplosion(x, y, color, particleCount = 10) { 
    // Increased base particles
    // 1. NEON SHARD BURST
    for(let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random();
      const speed = Phaser.Math.Between(150, 300); 
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      let p = this.add.image(x, y, 'explosion_particle');
      p.setTint(color);
      p.setAlpha(1);
      p.setScale(Phaser.Math.FloatBetween(0.8, 1.8)); // Scaled up
      
      this.physics.add.existing(p);
      p.body.setVelocity(vx, vy);
      p.body.setDrag(250); 
      
      const rotationSpeed = Phaser.Math.Between(-200, 200);

      this.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0,
        angle: rotationSpeed, 
        duration: Phaser.Math.Between(400, 600),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
    
    // 2. THE DIGITAL FLASH
    const flash = this.add.image(x, y, 'explosion_particle');
    flash.setTint(0xffffff);
    flash.setScale(0.8); // Scaled up
    
    this.tweens.add({
      targets: flash,
      scale: 8, // Bigger flash
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
    
    // 3. EMITTER TRIGGER
    if (this.explosionEmitter) {
        this.explosionEmitter.emitParticle(particleCount, x, y);
    }
  }

  regenerateLife() {
    GameState.lives++;
    
    const regenText = this.add.text(this.player.x, this.player.y - 80, "REGENERATING...", { 
      fontSize: '24px', 
      color: '#00ff00', 
      fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: regenText,
      y: this.player.y - 120,
      alpha: 0,
      duration: 1500,
      onComplete: () => regenText.destroy()
    });

    const aura = this.add.circle(this.player.x, this.player.y, 60, 0x00ff00, 0.4);
    this.tweens.add({
      targets: aura,
      scale: 1.8,
      alpha: 0,
      duration: 1000,
      onComplete: () => aura.destroy()
    });
  }

  // --- ENTITY SPAWNING ---
  spawnObstacle() {
    if (GameState.bossActive) return;
    const types = ["obstacle_asteroid", "obstacle_debris", "obstacle_mine"];
    const type = Phaser.Math.RND.pick(types);
    const obs = this.obstacles.create(Phaser.Math.Between(60, 660), -100, type);
    
    const progress = this.getGlobalProgress(); 
    const luck = this.getLuckModifiers();

    let speedY = (200 + (progress * 10)) * luck.speedMult;
    obs.setVelocityY(speedY);

    let baseHp = (type === "obstacle_mine") ? 2 : 3;
    obs.hp = baseHp + (progress * 0.4); 

    obs.maxHp = obs.hp; 
    obs.obstacleType = type; 
    
    // Scaled up obstacle size and hitbox
    obs.setScale(1.3);
    obs.setSize(55, 55);
    
    if (type === "obstacle_mine") {
      this.tweens.add({
        targets: obs,
        scale: { from: 1.3, to: 1.5 }, // Scaled up tween
        alpha: { from: 1, to: 0.8 },
        yoyo: true,
        duration: 400,
        repeat: -1
      });
    }
  }

  spawnEnemy() {
    if (GameState.bossActive) return;
    
    const stage = GameState.bossStage;
    const progress = this.getGlobalProgress();
    const luck = this.getLuckModifiers();
    const roll = Phaser.Math.Between(1, 100);
    let type, hp, tier, enemyType;
    
    if (stage === 0) {
      if (roll > 95) { type = "enemy_dragon"; tier = "dragon"; enemyType = "dragon"; } 
      else if (roll > 90) { type = "enemy_spinner"; tier = "spinner"; enemyType = "spinner"; } 
      else if (roll > 80) { type = "enemy_rare"; tier = "rare"; enemyType = "rare"; } 
      else if (roll > 70) { type = "enemy_octopus"; tier = "octopus"; enemyType = "octopus"; } 
      else { type = "enemy_common"; tier = "common"; enemyType = "common"; }
    } 
    else if (stage === 1) {
       if (roll > 90) { type = "enemy_ultra"; tier = "ultra"; enemyType = "ultra"; } 
       else if (roll > 40) { type = "enemy_dragon"; tier = "dragon"; enemyType = "dragon"; } 
       else if (roll > 20) { type = "enemy_rare"; tier = "rare"; enemyType = "rare"; } 
       else { type = "enemy_octopus"; tier = "octopus"; enemyType = "octopus"; }
    } 
    else {
      if (roll > 96) { this.spawnCentipede(); return; } 
      else if (roll > 60) { type = "enemy_ultra"; tier = "ultra"; enemyType = "ultra"; } 
      else if (roll > 30) { type = "enemy_dragon"; tier = "dragon"; enemyType = "dragon"; } 
      else { type = "enemy_octopus"; tier = "octopus"; enemyType = "octopus"; }
    }
    
    const hpMultiplier = 1 + (progress * 0.2); 

    if (type === "enemy_common") hp = 5 * hpMultiplier;
    else if (type === "enemy_rare" || type === "enemy_octopus") hp = 10 * hpMultiplier; 
    else if (type === "enemy_spinner") hp = 15 * hpMultiplier;
    else if (type === "enemy_dragon") hp = 20 * hpMultiplier;
    else if (type === "enemy_ultra") hp = 35 * hpMultiplier;
    
    const e = this.enemies.create(Phaser.Math.Between(60, 660), -100, type);
    
    let speedY = (160 + (progress * 8)) * luck.speedMult;
    e.setVelocityY(speedY);
    
    e.hp = hp;
    e.maxHp = hp;
    e.tier = tier;
    e.enemyType = enemyType;
    
    // --- MOVEMENT & SIZE (Scaled up versions) ---
    if (tier === "ultra") {
      e.setSize(55, 65); e.setScale(1.2); e.movePattern = "wave"; e.moveTimer = 0;
    } else if (tier === "rare") {
      e.setSize(70, 90); e.setScale(1.15); e.movePattern = "wiggle"; e.wiggleTimer = Phaser.Math.FloatBetween(0, 100); 
    } else if (tier === "octopus") {
      e.setSize(55, 75); e.setScale(1.15); e.movePattern = "jet_pulse"; e.pulseTimer = 0;
    } else if (tier === "dragon") {
      e.setSize(80, 65); e.setScale(1.2); e.movePattern = "zigzag"; 
      let vx = Phaser.Math.Between(-100, 100) * luck.speedMult;
      e.setVelocityX(vx);
    } else if (tier === "spinner") {
      e.setSize(40, 40); e.setScale(1.1); e.movePattern = "spiral"; e.moveTimer = 0;
    } else {
      e.body.setCircle(28); // Increased circle radius
      e.setOffset(3, 3);
      e.setScale(1.5); // Much larger commons
      e.movePattern = "straight";
      const baseSpeed = Phaser.Math.Between(1, 2);
      e.rotSpeed = baseSpeed + (progress * 0.5);
    }
  }

  spawnCentipede() {
    const existing = this.enemies.getChildren().find(e => 
        e.active && (e.tier === "centipede" || e.tier === "centipede_segment")
    );
    if (existing) return;

    const progress = this.getGlobalProgress();
    const luck = this.getLuckModifiers();
    const segmentCount = 6 + Math.floor(progress / 5);
    
    const x = Phaser.Math.Between(100, 620);
    const head = this.enemies.create(x, -100, "enemy_centipede");
    
    let speedY = (120 + (progress * 3)) * luck.speedMult;
    let speedX = 150 * luck.speedMult;
    
    head.setVelocityY(speedY);
    head.setVelocityX(speedX);
    
    head.hp = 100 + (progress * 3);
    head.maxHp = head.hp;
    head.tier = "centipede";
    head.enemyType = "centipede";
    // Scaled up head
    head.setScale(1.3);
    head.setSize(45, 45);
    head.segments = [];
    head.setBounce(1, 0);
    head.setCollideWorldBounds(true);
    
    for (let i = 0; i < segmentCount; i++) {
      // Adjusted spacing for larger segments
      const segment = this.enemies.create(x - ((i + 1) * 45), -100, "enemy_centipede");
      segment.hp = 50 + (progress * 2);
      segment.maxHp = segment.hp;
      segment.tier = "centipede_segment";
      segment.enemyType = "centipede";
      // Scaled up segments
      segment.setScale(1.3);
      segment.setSize(45, 45);
      segment.parentHead = head;
      head.segments.push(segment);
    }
  }

  dropPowerUp(x, y, obstacleType) {
    let powerUpType;
    const roll = Math.random();
    
    if (obstacleType === "obstacle_mine") {
      if (roll < 0.4) powerUpType = "powerup_tnt";
      else if (roll < 0.7) powerUpType = "powerup_shield";
      else if (roll < 0.9) powerUpType = "powerup_magnet";
      else powerUpType = "powerup_heart";
    } else if (obstacleType === "obstacle_debris") {
      if (roll < 0.4) powerUpType = "powerup_magnet";
      else if (roll < 0.7) powerUpType = "powerup_shield";
      else if (roll < 0.85) powerUpType = "powerup_heart";
      else powerUpType = "powerup_tnt";
    } else {
      if (roll < 0.4) powerUpType = "powerup_shield";
      else if (roll < 0.7) powerUpType = "powerup_heart";
      else if (roll < 0.9) powerUpType = "powerup_magnet";
      else powerUpType = "powerup_tnt";
    }
    
    const powerUp = this.powerUps.create(x, y, powerUpType);
    powerUp.setVelocityY(150);
    powerUp.powerUpType = powerUpType;
    // Scaled up powerup
    powerUp.setScale(1.3);
    powerUp.setSize(45, 45);
  }

  // --- POWER UP ABILITIES ---
  activateShield() {
    this.hasShield = true;
    this.shieldArc.setVisible(true);
  }

  activateMagnet() {
    if (this.magnetActive) {
      this.magnetDuration += 20000;
    } else {
      this.magnetActive = true;
      this.magnetDuration = 20000;
      
      const magnetField = this.add.circle(this.player.x, this.player.y, 80, 0x9900cc, 0.3); // Increased radius
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
    this.createExplosion(this.player.x, this.player.y, 0xff3300, 40); // More particles
  }

  addExtraLife() {
    let maxAllowed;
    switch(GameState.bossStage) {
      case 0:  maxAllowed = 6;  break;
      case 1:  maxAllowed = 7;  break;
      case 2:  maxAllowed = 8;  break;
      default: maxAllowed = 10; break;
    }

    if (GameState.lives < maxAllowed) {
      GameState.lives++;
      if (this.livesText) this.livesText.setText(`Lives: ${GameState.lives}`);
      
      for(let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const heart = this.add.circle(
          this.player.x + Math.cos(angle) * 40, // Wider spread
          this.player.y + Math.sin(angle) * 40,
          6, // Larger heart particles
          0x00ff00,
          1
        );
        
        this.tweens.add({
          targets: heart,
          y: heart.y - 60,
          alpha: 0,
          scale: 0,
          duration: 800,
          ease: 'Cubic.easeOut',
          onComplete: () => heart.destroy()
        });
      }
    }
  }

  triggerShockwave() {
    this.cameras.main.shake(500, 0.03); 
    this.cameras.main.flash(400, 255, 200, 50, 0.5); 

    const ringCount = 4; 
    
    for (let i = 0; i < ringCount; i++) {
        const wave = this.add.image(this.player.x, this.player.y, "tex_shockwave_heavy");
        
        const color = (i % 2 === 0) ? 0xffaa00 : 0xffffff;
        wave.setTint(color);
        wave.setAlpha(0.7);
        wave.setScale(0.15); // Slightly larger start
        
        this.physics.add.existing(wave);
        wave.body.setCircle(80); // Bigger physical wave

        this.tweens.add({
            targets: wave,
            scale: 20,       // Much larger expansion for screen covering
            alpha: 0,
            duration: 1000, 
            delay: i * 150, 
            ease: 'Quint.easeOut', 
            onUpdate: () => {
                wave.x += Math.sin(this.time.now * 0.1) * 0.5;

                this.physics.overlap(wave, [this.enemies, this.obstacles, this.bossBullets], (w, target) => {
                    if (!target.hitByWave) {
                        target.hitByWave = true;
                        
                        this.time.delayedCall(Phaser.Math.Between(0, 100), () => {
                            if (this.enemies.contains(target)) {
                                 this.destroyEnemy(target);
                            } else {
                                 this.createExplosion(target.x, target.y, 0xffff00, 20);
                                 target.destroy();
                                 GameState.score += 20;
                            }
                        });
                    }
                });
            },
            onComplete: () => wave.destroy()
        });
    }
  }

  updateDynamicBackground() {
    const progress = this.getGlobalProgress();
    const ratio = Math.min(progress / 25, 1);

    const startTop = Phaser.Display.Color.ValueToColor(0x250049); 
    const endTop = Phaser.Display.Color.ValueToColor(0x04002e);   
    const startBot = Phaser.Display.Color.ValueToColor(0x004248); 
    const endBot = Phaser.Display.Color.ValueToColor(0x001300);   

    const top = Phaser.Display.Color.Interpolate.ColorWithColor(startTop, endTop, 100, ratio * 100);
    const bot = Phaser.Display.Color.Interpolate.ColorWithColor(startBot, endBot, 100, ratio * 100);

    const topHex = Phaser.Display.Color.GetColor(top.r, top.g, top.b);
    const botHex = Phaser.Display.Color.GetColor(bot.r, bot.g, bot.b);

    if (this.bgGradient) {
      this.bgGradient.clear();
      this.bgGradient.fillGradientStyle(topHex, topHex, botHex, botHex, 1);
      this.bgGradient.fillRect(0, 0, 720, this.cameras.main.height);
    }

    const startNebula = Phaser.Display.Color.ValueToColor(0xd5d5d5); 
    const endNebula = Phaser.Display.Color.ValueToColor(0xcccccc);   
    
    const nebColorObj = Phaser.Display.Color.Interpolate.ColorWithColor(startNebula, endNebula, 100, ratio * 100);
    const currentNebColor = Phaser.Display.Color.GetColor(nebColorObj.r, nebColorObj.g, nebColorObj.b);

    if (this.nebulae) {
      this.nebulae.children.each(n => {
        n.fillColor = currentNebColor;
        n.setAlpha(0.15 - (ratio * 0.05)); 
      });
    }

    const starColor = ratio > 0.6 ? 0xff4400 : 0xaaaaaa;
    [this.stars, this.distantStars, this.bgDebris].forEach(g => {
      if(g) g.children.each(s => s.fillColor = starColor);
    });
  }
}