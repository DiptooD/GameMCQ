class DeathScene extends Phaser.Scene {
  constructor() {
    super("DeathScene");
  }

  init(data) {
      this.matchSaved = false; 
      this.backgroundLayers = [];
      this.deathReason = (data && data.reason) ? data.reason : "death_normal";
  }

  playSound(key, baseVolume = 1.0) {
    if (this.cache.audio.exists(key)) {
        const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
        this.sound.play(key, { volume: finalVolume });
    }
  }

  showToast(msg, isError = false) {
      // Bypassing window.showToast so this extra-large Phaser toast is strictly used.
      const bgColor = isError ? 'rgba(220, 38, 38, 0.98)' : 'rgba(13, 148, 136, 0.98)';
      
      const toast = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 380, msg, {
          fontSize: '40px', 
          fontFamily: "'Anek Bangla', sans-serif", 
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: bgColor, 
          padding: { x: 40, y: 25 },
          stroke: '#000000',
          strokeThickness: 6,
          shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 8, fill: true, stroke: true }
      }).setOrigin(0.5).setDepth(10000).setAlpha(0);
      
      // Eye-catching float-up animation
      this.tweens.add({ 
          targets: toast, 
          alpha: 1, 
          y: '-=60', 
          duration: 300, 
          ease: 'Cubic.easeOut',
          yoyo: true, 
          hold: 3500, 
          onComplete: () => toast.destroy() 
      });
  }

  create() {
    if (typeof GameSFX !== 'undefined') {
        GameSFX.init(this);
    }

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = w / 2;

    const isViewingHistory = !!GameState.viewingHistoryMatch;
    
    let history = [];
    let safeCorrect = 0, safeWrong = 0, safeSkipped = 0;
    
    if (isViewingHistory) {
        const matchData = GameState.viewingHistoryMatch;
        history = matchData.sessionHistory || [];
        safeCorrect = matchData.correct;
        safeWrong = matchData.wrong;
        safeSkipped = matchData.skipped;
        this.matchSaved = true; 
    } else {
        history = GameState.sessionHistory || [];
        history.forEach(h => {
            if (h.status === 'skipped') safeSkipped++;
            else if (h.isCorrect) safeCorrect++;
            else safeWrong++;
        });
    }

    const totalQs = history.length;
    const percent = totalQs > 0 ? (safeCorrect / totalQs) : 0; 
    const percentText = Math.round(percent * 100) || 0; 

    if (percentText >= 50) {
        this.playSound('sfx_victory', 0.1);
    } else {
        this.playSound('sfx_shield_break', 0); 
    }

    if (!this.matchSaved && totalQs > 0 && !isViewingHistory) {
        
        if (typeof GameState.gamesPlayed !== 'undefined') {
            GameState.gamesPlayed++;
            window.updateMissionProgress("play_matches", 1); 
        }

        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const dateStr = new Date().toLocaleString('bn-BD', dateOptions); 
        
        const matchSummary = {
            date: dateStr,
            total: totalQs,
            correct: safeCorrect,
            wrong: safeWrong,
            skipped: safeSkipped,
            percent: percentText,
            sessionHistory: JSON.parse(JSON.stringify(history)) 
        };
        
        GameState.matchHistory.unshift(matchSummary);
        if (GameState.matchHistory.length > 20) {
            GameState.matchHistory = GameState.matchHistory.slice(0, 20);
        }
        
        if (window.saveGame) window.saveGame();
        this.matchSaved = true;
    }

    let menuMusic = this.sound.get('menubgm');
    const mVol = window.GameState.musicVolume !== undefined ? window.GameState.musicVolume : 0.5;
    
    if (!menuMusic) {
        menuMusic = this.sound.add('menubgm', { loop: true, volume: mVol });
        menuMusic.play();
    } else {
        menuMusic.setVolume(mVol);
        if (!menuMusic.isPlaying) {
            menuMusic.play();
        }
    }

    this.createBackground();

    this.add.graphics().fillStyle(0x051025, 0.8).fillRect(0, 0, w, 160); 
    this.add.rectangle(cx, 160, w, 3, 0x0066aa, 0.5); 

    const titleY = isViewingHistory ? 70 : 85;
    
    let titleText = "গেইম ওভার";
    let titleFontSize = "72px";

    if (isViewingHistory) {
        titleText = "ম্যাচ ডিটেইলস";
    } else if (this.deathReason === "void_quit") {
        titleText = "গেইম পরিসমাপ্ত";
        titleFontSize = "64px";
    } else if (this.deathReason === "death_endless" || GameState.isEndlessMode) {
        titleText = "গেইম ওভার (Endless)";
        titleFontSize = "54px";
    }

    this.add.text(cx, titleY, titleText, {
      fontSize: titleFontSize, 
      fontFamily: "'Anek Bangla'", color: "#00e1ff", 
      fontStyle: "bold", stroke: "#000000", strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: "#0044aa", blur: 12, stroke: true, fill: true }
    }).setOrigin(0.5);

    if (isViewingHistory) {
        this.add.text(cx, titleY + 60, GameState.viewingHistoryMatch.date, {
            fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#aaaaaa"
        }).setOrigin(0.5);
    } else if (GameState.gamesPlayed <= 5) {
        this.add.text(cx, titleY + 55, "🍀 বিগিনার্স লাক (Beginner's Luck)", {
            fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#00ff00", fontStyle: "bold",
            stroke: "#000000", strokeThickness: 4
        }).setOrigin(0.5);
    }

    // --- SHARE TO CHAT BUTTON (PREMIUM & THICKER UI) ---
    if (totalQs > 0) {
        // Aligned perfectly to the right of your centered title text
        const shareBtnX = cx + 290; 
        const shareBtnY = titleY +13;

        // Container to keep the icon and text grouped for clean scaling
        const shareContainer = this.add.container(shareBtnX, shareBtnY).setDepth(50);

        const shareIcon = this.add.graphics();
        const shareLabel = this.add.text(0, 35, "SHARE CHAT", {
            fontSize: "16px",
            fontFamily: "'Anek Bangla', sans-serif",
            fontWeight: "bold",
            color: "#dfdfdf",
            //shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 3, fill: true }
        }).setOrigin(0.5);

        const drawShareUI = (hover, disabled = false) => {
            shareIcon.clear();
            
            const mainColor = disabled ? 0x475569 : (hover ? 0xffffff : 0x00e1ff);
            const bgColor = disabled ? 0x1e293b : (hover ? 0x0044aa : 0x0f172a);
            const bgAlpha = disabled ? 0.9 : (hover ? 1 : 0.6);

            // Optional subtle ambient glow when hovering
            if (hover && !disabled) {
                shareIcon.fillStyle(0x00ffff, 0.15);
                shareIcon.fillCircle(0, -12, 42);
            }

            // Draw thicker vector Chat Bubble
            shareIcon.fillStyle(bgColor, bgAlpha);
            shareIcon.fillRoundedRect(-28, -32, 56, 36, 10);
            
            // THICKER LINE STYLE (3.5)
            shareIcon.lineStyle(3.5, mainColor, 1);
            shareIcon.strokeRoundedRect(-28, -32, 56, 36, 10);
            
            // Chat Bubble Pointer/Tail (Adjusted for thickness)
            shareIcon.beginPath();
            shareIcon.moveTo(-12, 4);
            shareIcon.lineTo(-16, 16);
            shareIcon.lineTo(6, 4);
            shareIcon.closePath();
            shareIcon.fillPath();
            shareIcon.strokePath();

            // 3 Modern Message Dots (Scaled up slightly to match thickness)
            shareIcon.fillStyle(mainColor, 1);
            shareIcon.fillCircle(-13, -14, 3.2);
            shareIcon.fillCircle(0, -14, 3.2);
            shareIcon.fillCircle(13, -14, 3.2);
        };
        drawShareUI(false);

        // A single hit area covering both the icon and the text
        const shareHit = this.add.rectangle(0, 0, 110, 85, 0x000000, 0).setInteractive({ useHandCursor: true });
        shareContainer.add([shareIcon, shareLabel, shareHit]);

        let isProcessing = false;

        shareHit.on('pointerover', () => { 
            if (!isProcessing) {
                drawShareUI(true);
                shareLabel.setColor("#ffffff");
                this.tweens.add({ targets: shareContainer, scale: 1.08, duration: 150, ease: 'Cubic.out' });
            } 
        });
        
        shareHit.on('pointerout', () => { 
            if (!isProcessing) {
                drawShareUI(false);
                shareLabel.setColor("#00e1ff");
                this.tweens.add({ targets: shareContainer, scale: 1.0, duration: 150, ease: 'Cubic.out' });
            } 
        });

        // Exact original functionality maintained below
        shareHit.on('pointerdown', async () => {
            if (isProcessing) return;

            // --- NEW: Real connection check ---
            const isReallyOnline = await window.checkRealConnection();
            if (!isReallyOnline) {
                this.showToast("ইন্টারনেট সংযোগ নেই! 🌐", true);
                return;
            }

            if (!window.FirebaseAuth || !window.FirebaseAuth.currentUser) {
                this.showToast("রেজাল্ট শেয়ার করতে আগে লগইন করুন!", true);
                return;
            }

            const now = Date.now();
            const cooldownMs = 60000; 
            const lastShareTime = window.GameState.lastChatShareTime || 0;

            if (now - lastShareTime < cooldownMs) {
                const remainingSec = Math.ceil((cooldownMs - (now - lastShareTime)) / 1000);
                this.showToast(`দয়া করে ${remainingSec} সেকেন্ড অপেক্ষা করুন! ⏳`, true);
                return;
            }

            this.playSound('sfx_click', 0.8);
            isProcessing = true;
            drawShareUI(false, true);
            shareLabel.setColor("#475569");

            const blocksCount = 10;
            let cBlocks = Math.floor((safeCorrect / totalQs) * blocksCount);
            let wBlocks = Math.floor((safeWrong / totalQs) * blocksCount);
            let sBlocks = Math.floor((safeSkipped / totalQs) * blocksCount);
            
            let remainder = blocksCount - (cBlocks + wBlocks + sBlocks);
            
            let fractions = [
                { key: 'c', val: (safeCorrect / totalQs) * blocksCount - cBlocks },
                { key: 'w', val: (safeWrong / totalQs) * blocksCount - wBlocks },
                { key: 's', val: (safeSkipped / totalQs) * blocksCount - sBlocks }
            ];
            fractions.sort((a, b) => b.val - a.val);
            
            for (let i = 0; i < remainder; i++) {
                if (fractions[i].key === 'c') cBlocks++;
                else if (fractions[i].key === 'w') wBlocks++;
                else if (fractions[i].key === 's') sBlocks++;
            }

            const visualBar = "🟩".repeat(cBlocks) + "🟥".repeat(wBlocks) + "🟨".repeat(sBlocks);
            
            // --- NEW: Added 'স্কিপ' to the chat share text ---
            const shareText = `📊 গেইম রেজাল্ট: ${percentText}%\n${visualBar}\nমোট: ${totalQs} | সঠিক: ${safeCorrect} | ভুল: ${safeWrong} | স্কিপ: ${safeSkipped}`;

            const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "Guest";
            const playerLvl = window.getLevelData ? window.getLevelData().level : ((GameState.profile && GameState.profile.level) ? GameState.profile.level : 1);

            if (window.FirebaseTools && window.FirebaseDB) {
                const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
                
                let payload = {
                    uid: window.FirebaseAuth.currentUser.uid,
                    n: playerName,
                    lvl: playerLvl,
                    text: shareText,
                    timestamp: window.FirebaseTools.serverTimestamp(),
                    pinned: false
                };

                window.FirebaseTools.addDoc(chatRef, payload).then(() => {
                    window.GameState.lastChatShareTime = Date.now();
                    this.showToast("রেজাল্ট চ্যাটে শেয়ার করা হয়েছে! 💬", false);
                    this.tweens.add({ targets: shareContainer, scale: 0.9, yoyo: true, duration: 100 });
                }).catch(e => {
                    console.error("Share failed", e);
                    this.showToast("শেয়ার ব্যর্থ হয়েছে!", true);
                    isProcessing = false;
                    drawShareUI(false);
                    shareLabel.setColor("#00e1ff");
                });

            } else {
                this.showToast("সার্ভার সমস্যা, পরে চেষ্টা করুন।", true);
                isProcessing = false;
                drawShareUI(false);
                shareLabel.setColor("#00e1ff");
            }
        });
    }

    const panelY = 190; 
    const panelH = 280; 
    const panelW = w - 40; 
    const panelX = (w - panelW) / 2;
    
    const glass = this.add.graphics();
    glass.fillStyle(0x000c22, 0.75); 
    glass.fillRoundedRect(panelX, panelY, panelW, panelH, 20); 
    glass.lineStyle(3, 0x0066aa, 0.6); 
    glass.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

    const chartX = panelX + 115; 
    const chartY = panelY + (panelH / 2); 
    const radius = 85; 
    
    glass.lineStyle(16, 0x051025); 
    glass.strokeCircle(chartX, chartY, radius);

    let pieColor = 0xff4444; 
    if (percentText === 100) pieColor = 0xffffff; 
    else if (percentText >= 80) pieColor = 0x00ff00; 
    else if (percentText >= 26) pieColor = 0xffff00; 

    if (percent > 0) {
        glass.lineStyle(16, pieColor); 
        glass.beginPath();
        glass.arc(chartX, chartY, radius, -Math.PI/2, -Math.PI/2 + (Math.PI*2*percent), false);
        glass.strokePath();
    }
    
    this.add.text(chartX, chartY, `${percentText}%`, { 
        fontSize: "46px", fontFamily: "'Anek Bangla'", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 5 
    }).setOrigin(0.5);

    const rightStart = panelX + 230; 
    const rightWidth = panelW - 240;
    const colWidth = rightWidth / 4; 
    
    const getColX = (idx) => rightStart + (colWidth * idx) + (colWidth / 2);

    const statY = panelY + 80; 
    const statData = [
        { label: "মোট প্রশ্ন", val: totalQs, color: "#ffffff" },
        { label: "সঠিক", val: safeCorrect, color: "#00aaff" }, 
        { label: "ভুল", val: safeWrong, color: "#ff4444" },
        { label: "স্কিপ", val: safeSkipped, color: "#ffff00" }
    ];

    statData.forEach((item, index) => {
        const cx = getColX(index);
        this.add.text(cx, statY - 15, item.val, { 
            fontSize: "36px", color: item.color, fontStyle: "bold", fontFamily: "'Anek Bangla'" 
        }).setOrigin(0.5);
        this.add.text(cx, statY + 28, item.label, { 
            fontSize: "22px", color: "#aaaaaa", fontFamily: "'Anek Bangla'" 
        }).setOrigin(0.5);
    });

    glass.lineStyle(2, 0x003355, 0.6);
    glass.lineBetween(rightStart + 10, panelY + 140, rightStart + rightWidth - 10, panelY + 140);

    const subStats = {};
    history.forEach(h => { 
        const cat = h.category || "General"; 
        if (!subStats[cat]) subStats[cat] = { correct: 0, total: 0 };
        subStats[cat].total++;
        if (h.isCorrect) subStats[cat].correct++;
    });

    const sortedSubs = Object.entries(subStats)
        .sort((a,b) => b[1].total - a[1].total)
        .slice(0, 4); 

    const subY = panelY + 190; 

    if (sortedSubs.length === 0) {
        this.add.text(rightStart + rightWidth/2, subY, "কোন তথ্য নেই", { fontSize: "22px", color: "#666" }).setOrigin(0.5);
    } else {
        for(let i=0; i<4; i++) {
            const cx = getColX(i);
            if (i < sortedSubs.length) {
                const [name, data] = sortedSubs[i];
                const subAcc = Math.round((data.correct / data.total) * 100);
                
                let accColor = "#ff4444"; 
                if (subAcc === 100) accColor = "#ffffff";
                else if (subAcc >= 80) accColor = "#00ff00";
                else if (subAcc >= 50) accColor = "#00aaff";
                else if (subAcc >= 26) accColor = "#ffff00";

                this.add.text(cx, subY - 18, `${subAcc}%`, { 
                    fontSize: "28px", color: accColor, fontStyle: "bold", fontFamily: "'Anek Bangla'" 
                }).setOrigin(0.5);
                this.add.text(cx, subY + 18, name, { 
                    fontSize: "20px", color: "#cccccc", fontFamily: "'Anek Bangla'",
                    wordWrap: { width: colWidth - 5 }, align: 'center'
                }).setOrigin(0.5, 0); 
            } else {
                this.add.text(cx, subY, "•", { fontSize: "28px", color: "#333" }).setOrigin(0.5);
            }
        }
    }

    const footerH = 170; 
    const listStartY = panelY + panelH + 20; 
    const listEndY = h - footerH - 10;
    const listHeight = listEndY - listStartY;

    const contentContainer = this.add.container(0, listStartY);
    
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, listStartY, w, listHeight);
    const mask = maskShape.createGeometryMask();
    contentContainer.setMask(mask);

    let currentY = 0;
    
    if (totalQs === 0) {
        this.add.text(cx, listStartY + 50, "কোন প্রশ্ন খেলা হয়নি", { 
            fontSize: "34px", fontFamily: "'Anek Bangla'", color: "#666" 
        }).setOrigin(0.5);
    } else {
        history.forEach((item, index) => {
            let status = 'wrong';
            if (item.status === 'skipped') status = 'skipped';
            else if (item.isCorrect) status = 'correct';

            const cardHeight = this.createHistoryCard(contentContainer, currentY, item, index + 1, status, w);
            currentY += cardHeight + 20; 
        });
        currentY += 20; 
    }

    if (currentY > listHeight) {
        const minScroll = Math.min(0, listHeight - currentY - 20);
        let startY = 0;
        let containerStartY = 0;
        let lastTime = 0;
        let lastY = 0;

        this.scrollState = { isDragging: false, velocityY: 0 };
        this.scrollData = { contentContainer, listStartY, minScroll };

        const scrollZone = this.add.zone(cx, listStartY + listHeight/2, w, listHeight).setInteractive();
        
        scrollZone.on('pointerdown', (pointer) => {
            this.scrollState.isDragging = true;
            this.scrollState.velocityY = 0;
            startY = pointer.y;
            lastY = pointer.y;
            containerStartY = contentContainer.y;
            lastTime = this.time.now;
        });

        this.input.on('pointermove', (pointer) => {
            if (this.scrollState.isDragging) {
                const diff = pointer.y - startY;
                let newY = containerStartY + diff;

                if (newY > listStartY) {
                    newY = listStartY + (newY - listStartY) * 0.4;
                } else if (newY < listStartY + minScroll) {
                    newY = listStartY + minScroll + (newY - (listStartY + minScroll)) * 0.4;
                }
                
                contentContainer.y = newY;

                const now = this.time.now;
                const dt = now - lastTime;
                
                if (dt > 0) {
                    const instantVelocity = (pointer.y - lastY) / dt;
                    this.scrollState.velocityY = (this.scrollState.velocityY * 0.4) + (instantVelocity * 0.6);
                }
                
                lastTime = now;
                lastY = pointer.y;
            }
        });

        const stopDrag = () => { 
            this.scrollState.isDragging = false; 
        };
        
        this.input.on('pointerup', stopDrag);
        this.input.on('pointerout', stopDrag);
    }

    const btnY = h - 85; 

    this.add.graphics().fillStyle(0x051025, 0.4).fillRect(0, h - 170, w, 170);
    this.add.rectangle(cx, h - 170, w, 3, 0x0066aa, 0.5); 

    if (isViewingHistory) {
        this.createModernButton(cx, btnY, "মেনুতে ফিরে যান", true, () => {
            GameState.viewingHistoryMatch = null;
            GameState.showHistoryPopupOnLoad = true; 
            this.scene.start("MenuScene");
        });
    } else {
        this.createModernButton(cx - 175, btnY, "আবার খেলুন", true, () => {
            this.restartGameWithLogic();
        });

        this.createModernButton(cx + 175, btnY, "মেনু", false, () => {
            this.scene.start("MenuScene");
        });
    }
  }

  restartGameWithLogic() {
      const savedBank = localStorage.getItem('saved_bankKey') || "all";
      const savedSubject = localStorage.getItem('saved_subject') || "all_no_math";
      const savedMode = localStorage.getItem('saved_mode') || "normal";

      const manifest = this.cache.json.get('bank_directory');
      let finalQuestions = [];

      if (savedBank === "all") {
          manifest.banks.forEach(bank => {
              const data = this.cache.json.get(bank.key);
              if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
          });
      } else {
          const data = this.cache.json.get(savedBank);
          if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
      }
      
      finalQuestions = finalQuestions.filter(q => q.question && q.question.trim() !== "");

      if (savedSubject === "all_no_math") {
          finalQuestions = finalQuestions.filter(q => q.subject !== "Math");
      } else if (savedSubject !== "all") {
          finalQuestions = finalQuestions.filter(q => q.subject === savedSubject);
      }

      let seenQuestions = JSON.parse(localStorage.getItem('seenQuestions') || '[]');

      if (savedMode === "revision") {
          finalQuestions = finalQuestions.filter(q => seenQuestions.includes(q.question));
          if (finalQuestions.length === 0) {
              this.showToast("আগের কোনো প্রশ্ন পাওয়া যায়নি! আগে নরমাল মোড খেলুন।");
              return;
          }
      } else if (savedMode === "new") {
          finalQuestions = finalQuestions.filter(q => !seenQuestions.includes(q.question));
          if (finalQuestions.length === 0) {
              this.showToast("আপনি এই বিভাগের সব প্রশ্নের উত্তর দিয়ে দিয়েছেন!");
              return;
          }
      }

      if (finalQuestions.length === 0) {
          this.showToast("এই বিভাগে কোনো প্রশ্ন নেই!");
          return;
      }

      Phaser.Utils.Array.Shuffle(finalQuestions);

      window.resetGameState();
      GameState.currentQuestions = finalQuestions;
      GameState.gameMode = savedMode;

      this.scene.stop("DeathScene");
      this.scene.start("GameScene");
      this.scene.launch("QuestionScene");
  }

  update(time, delta) {
    const safeTimeScale = Phaser.Math.Clamp(delta / 16.66, 0.1, 2.5);

    if (this.scrollingBg) {
        this.scrollingBg.tilePositionY -= 0.6 * safeTimeScale;
    }
    
    if (this.backgroundLayers) {
        this.backgroundLayers.forEach(layer => {
            layer.group.children.iterate(star => {
                if (star) {
                    star.y += layer.speed * safeTimeScale;
                    if (star.y > this.cameras.main.height) {
                        star.y = -10;
                        star.x = Phaser.Math.Between(0, this.cameras.main.width);
                    }
                }
            });
        });
    }

    if (this.scrollData && this.scrollState) {
        if (!this.scrollState.isDragging) {
            let { contentContainer, listStartY, minScroll } = this.scrollData;
            if (!contentContainer || !contentContainer.active) return;

            let vY = this.scrollState.velocityY;
            let currentY = contentContainer.y;

            if (Math.abs(vY) > 0.01) {
                currentY += vY * 16 * safeTimeScale;
                this.scrollState.velocityY *= Math.pow(0.92, safeTimeScale); 
            }

            if (currentY > listStartY) {
                currentY += (listStartY - currentY) * 0.15 * safeTimeScale;
                if (Math.abs(listStartY - currentY) < 0.5) currentY = listStartY;
            } else if (currentY < listStartY + minScroll) {
                currentY += ((listStartY + minScroll) - currentY) * 0.15 * safeTimeScale;
                if (Math.abs((listStartY + minScroll) - currentY) < 0.5) currentY = listStartY + minScroll;
            }

            contentContainer.y = currentY;
        } else {
            this.scrollState.velocityY *= 0.9; 
        }
    }
  }

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
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.scrollingBg = this.add.tileSprite(w/2, h/2, w, h, 'animated_bg_grad').setDepth(-100);
    const neb1 = this.add.circle(w*0.3, h*0.1, 250, 0x0044aa, 0.1).setDepth(-99);
    const neb2 = this.add.circle(w*0.7, h*0.8, 300, 0x4400aa, 0.1).setDepth(-99);
    this.tweens.add({
        targets: [neb1, neb2], x: w*0.8, y: h*0.6, scale: 1.15, alpha: 0.15,
        duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    const createLayer = (count, speed, color, size, alpha = 1) => {
        const group = this.add.group();
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(0, h);
            const star = this.add.circle(x, y, size, color, alpha).setDepth(-98);
            group.add(star);
        }
        this.backgroundLayers.push({ group: group, speed: speed });
    };
    createLayer(50, 0.4, 0x555588, 1.5, 0.5); 
    createLayer(30, 1.0, 0x88aaff, 2, 0.8); 
    createLayer(15, 2.2, 0xffffff, 2.5, 1); 
  }

  createHistoryCard(container, y, item, index, status, screenW) {
    const cardW = screenW - 30; 
    const numColW = 90; 
    const p = 22; 
    
    const startX = -cardW / 2;
    const textX = startX + numColW + p; 
    const textW = cardW - numColW - (p * 2);

    let color = "#ff4444"; 
    let icon = "✘";
    let bgColor = 0x3D0000;
    let strokeColor = 0x940000;

    if (status === 'correct') {
        color = "#00aaff"; icon = "✔"; 
        bgColor = 0x001122; strokeColor = 0x004488; 
    } else if (status === 'skipped') {
        color = "#ffff00"; icon = "➡";
        bgColor = 0x1a1a00; strokeColor = 0x666600;
    }

    const qText = this.add.text(textX, p, item.question, {
        fontSize: "30px", fontFamily: "'Anek Bangla'", color: "#ffffff", padding: { x: 0, y: 5 },
        wordWrap: { width: textW }, lineSpacing: 8 
    }).setOrigin(0, 0);

    const ansY = p + qText.height + 20;
    
    const uPrefix = status === 'skipped' ? "স্কিপ করেছেন" : "আপনার উত্তর: ";
    const uVal = status === 'skipped' ? "" : item.userAnswer;

    const uLabel = this.add.text(textX, ansY, uPrefix, {
        fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#aaaaaa" 
    }).setOrigin(0, 0);

    const uAns = this.add.text(textX + uLabel.width, ansY, `${uVal} ${icon}`, {
        fontSize: "28px", fontFamily: "'Anek Bangla'", color: color, fontStyle: "bold" 
    }).setOrigin(0, 0);

    let totalHeight = ansY + Math.max(uLabel.height, uAns.height);

    let cLabel, cAns;
    if (status !== 'correct') {
        const cY = totalHeight + 12;
        cLabel = this.add.text(textX, cY, "সঠিক উত্তর: ", {
            fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#aaaaaa" 
        }).setOrigin(0, 0);

        cAns = this.add.text(textX + cLabel.width, cY, item.correctAnswer, {
            fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#00aaff", fontStyle: "bold" 
        }).setOrigin(0, 0);
        
        totalHeight = cY + Math.max(cLabel.height, cAns.height);
    }

    totalHeight += p; 
    if (totalHeight < 110) totalHeight = 110; 

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 0.95);
    bg.fillRoundedRect(startX, 0, cardW, totalHeight, 16); 
    bg.lineStyle(2, strokeColor, 1); 
    bg.strokeRoundedRect(startX, 0, cardW, totalHeight, 16);

    bg.lineStyle(2, strokeColor, 0.5);
    bg.lineBetween(startX + numColW, 0, startX + numColW, totalHeight);

    const numX = startX + (numColW / 2);
    const badgeText = this.add.text(numX, totalHeight / 2, `${index}`, {
        fontSize: "44px", color: color, fontFamily: "'Anek Bangla'", fontStyle: "bold" 
    }).setOrigin(0.5, 0.5);

    const itemContainer = this.add.container(screenW / 2, y);
    itemContainer.add([bg, badgeText, qText, uLabel, uAns]);
    if(cLabel) itemContainer.add([cLabel, cAns]);

    container.add(itemContainer);

    return totalHeight;
  }

  createModernButton(x, y, text, isPrimary, callback) {
      const container = this.add.container(x, y).setDepth(20);
      const bg = this.add.graphics();
      
      const btnW = 330; 
      const btnH = 90;  
      const btnRad = btnH / 2;

      const draw = (scale, hover) => {
          bg.clear();
          if (isPrimary) {
              bg.fillGradientStyle(
                  hover ? 0x002266 : 0x001133, hover ? 0x002266 : 0x001133, 
                  hover ? 0x0088ff : 0x004488, hover ? 0x0088ff : 0x004488, 1
              );
              bg.lineStyle(hover ? 4 : 3, hover ? 0xffffff : 0x00ffff, 0.8);
          } else {
              bg.fillStyle(hover ? 0x081830 : 0x051025, 0.9);
              bg.lineStyle(3, hover ? 0x0088cc : 0x0066aa, 0.8); 
          }
          bg.fillRoundedRect((-btnW/2) * scale, (-btnH/2) * scale, btnW * scale, btnH * scale, btnRad);
          bg.strokeRoundedRect((-btnW/2) * scale, (-btnH/2) * scale, btnW * scale, btnH * scale, btnRad);
      };
      draw(1, false);

      const txt = this.add.text(0, 0, text, {
          fontSize: "36px", 
          fontFamily: "'Anek Bangla'", 
          color: isPrimary ? "#ffffff" : "#b3d4ff", 
          fontStyle: "bold",
          stroke: isPrimary ? "#003366" : "#000000",
          strokeThickness: 3
      }).setOrigin(0.5);

      const hit = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
      container.add([bg, txt, hit]);

      hit.on('pointerover', () => { 
          draw(1, true); 
          if (!isPrimary) txt.setColor("#ffffff");
      });
      hit.on('pointerout', () => { 
          draw(1, false); 
          if (!isPrimary) txt.setColor("#b3d4ff");
      });

      hit.on('pointerdown', () => {
          this.playSound(isPrimary ? 'sfx_click' : 'sfx_back', 0.8);
          this.tweens.add({ targets: container, scale: 0.9, duration: 50, yoyo: true, onComplete: callback });
      });
  }
}