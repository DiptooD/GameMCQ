// Chat.js
// Attaches Chat functions directly to MenuScene so it shares the Scene context
Object.assign(MenuScene.prototype, {

    // --- NEW: Robust Real Network Check ---
    // navigator.onLine just checks if connected to a router/network, not the actual internet. 
    // This performs a tiny, cache-busting fetch to Google's 204 endpoint to verify real connectivity.
    checkRealConnection() {
        return new Promise((resolve) => {
            if (!navigator.onLine) {
                resolve(false);
                return;
            }
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast fail
            
            fetch('https://www.gstatic.com/generate_204?rand=' + Date.now(), { 
                method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal 
            }).then(() => {
                clearTimeout(id);
                resolve(true);
            }).catch(() => {
                clearTimeout(id);
                resolve(false);
            });
        });
    },

    createGlobalChat() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        
        this.isChatOpen = false;
        this.lastSeenTime = Date.now();
        this.dividerRendered = false;
        
        // Track local message statuses (sending, sent, error)
        this.trackedMessages = this.trackedMessages || {};
        
        if (window.FirebaseAuth && window.FirebaseAuth.currentUser) {
            const uid = window.FirebaseAuth.currentUser.uid;
            const userRef = window.FirebaseTools.doc(window.FirebaseDB, "players", uid);
            
            window.FirebaseTools.getDoc(userRef).then(docSnap => {
                if (docSnap.exists() && docSnap.data().chatLastSeenTime) {
                    this.lastSeenTime = docSnap.data().chatLastSeenTime;
                    if (this.refreshChatUI) {
                        this.refreshChatUI();
                    }
                }
            }).catch(e => console.log("Chat DB Load Error:", e));
        }
        
        this.replyData = null;
        this.chatKeyboardOffset = 0; 
        this.currentPinnedHeight = 0; 
        
        this.chatW = w - 30; 
        this.chatH = h * 0.88; 
        
        this.chatX = (w - this.chatW) / 2; 
        this.chatYVisible = (h - this.chatH) / 2; 
        this.chatYHidden = h + 300; 

        this.chatBlocker = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.65)
            .setDepth(8999).setVisible(false).setInteractive();
            
        this.chatBlocker.on('pointerdown', () => {
            if (this.isChatOpen) this.toggleChatWindow();
        });

        this.chatContainer = this.add.container(this.chatX, this.chatYHidden).setDepth(9000).setVisible(false);
        
        const panelBg = this.add.rectangle(this.chatW / 2, this.chatH / 2, this.chatW, this.chatH, 0x000c22, 0.85).setInteractive();
        
        const panelBorders = this.add.graphics();
        panelBorders.lineStyle(4, 0x0066aa, 1);
        panelBorders.strokeRoundedRect(0, 0, this.chatW, this.chatH, 24);
        
        const title = this.add.text(this.chatW / 2, 55, "গ্লোবাল CHAT", {
            fontSize: "46px", fontFamily: "'Anek Bangla'", color: "#00e1ff", padding: { y: 4 }, fontStyle: "bold"
        }).setOrigin(0.5);
        
        const headerDiv = this.add.rectangle(this.chatW / 2, 115, this.chatW - 40, 4, 0x0066aa, 0.5);

        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0xff3333, 1);
        closeBtnBg.fillRoundedRect(this.chatW - 85, 20, 65, 65, 16);
        const closeIcon = this.add.text(this.chatW - 52.5, 52.5, "✖", { fontSize: "36px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        
        const closeHit = this.add.rectangle(this.chatW - 52.5, 52.5, 100, 100, 0, 0).setInteractive({useHandCursor:true});
        closeHit.on('pointerdown', () => this.toggleChatWindow());

        this.chatContainer.add([panelBg, panelBorders, title, headerDiv, closeBtnBg, closeIcon, closeHit]);

        const inputY = this.chatH - 55; 
        this.chatScrollZoneHeight = inputY - 45 - 125;

        // Message List Container
        this.msgListContainer = this.add.container(0, 125);
        this.chatContainer.add(this.msgListContainer);

        this.chatMaskShape = this.make.graphics();
        this.chatMaskShape.fillStyle(0xffffff);
        this.chatMaskShape.fillRect(this.chatX + 10, this.chatYVisible + 125, this.chatW - 20, this.chatScrollZoneHeight); 
        this.chatMaskShape.y = this.chatYHidden - this.chatYVisible; 
        this.msgListContainer.setMask(this.chatMaskShape.createGeometryMask());

        this.chatMaxScroll = 0;
        
        this.chatScrollbarBg = this.add.rectangle(this.chatW - 12, 125 + this.chatScrollZoneHeight / 2, 8, this.chatScrollZoneHeight, 0x000000, 0.2);
        this.chatScrollbarThumb = this.add.rectangle(this.chatW - 12, 125, 8, 50, 0x666666, 0.6).setOrigin(0.5, 0);
        this.chatContainer.add([this.chatScrollbarBg, this.chatScrollbarThumb]);

        this.updateChatScrollbar = () => {
            if (this.chatMaxScroll <= 0) {
                this.chatScrollbarThumb.setVisible(false);
                this.chatScrollbarBg.setVisible(false);
                return;
            }
            this.chatScrollbarThumb.setVisible(true);
            this.chatScrollbarBg.setVisible(true);

            const dynamicTopOffset = 125 + this.currentPinnedHeight;
            const topY = dynamicTopOffset - this.chatKeyboardOffset;
            const scrollRatio = Phaser.Math.Clamp((topY - this.msgListContainer.y) / this.chatMaxScroll, 0, 1);
            
            const dynamicScrollZoneHeight = Math.max(50, this.chatScrollZoneHeight - this.currentPinnedHeight);
            const thumbHeight = Math.max(40, (dynamicScrollZoneHeight / (this.chatMaxScroll + dynamicScrollZoneHeight)) * dynamicScrollZoneHeight);
            
            this.chatScrollbarThumb.height = thumbHeight;
            this.chatScrollbarBg.height = dynamicScrollZoneHeight;
            this.chatScrollbarBg.y = dynamicTopOffset + dynamicScrollZoneHeight / 2;
            
            const thumbMinY = dynamicTopOffset; 
            const thumbMaxY = dynamicTopOffset + dynamicScrollZoneHeight - thumbHeight;
            this.chatScrollbarThumb.y = thumbMinY + scrollRatio * (thumbMaxY - thumbMinY);
        };

        const scrollZone = this.add.zone(this.chatW / 2, 125 + this.chatScrollZoneHeight / 2, this.chatW, this.chatScrollZoneHeight).setInteractive();
        this.chatContainer.add(scrollZone);

        this.pinnedContainer = this.add.container(0, 125);
        this.chatContainer.add(this.pinnedContainer);

        let dragStartY = 0;
        let containerStartY = 0;
        let isDraggingChat = false;
        let scrollYTracker = [];
        let pressTimer = null;
        let hitStartX = 0, hitStartY = 0;

        scrollZone.on('pointerdown', (pointer) => {
            dragStartY = pointer.y;
            containerStartY = this.msgListContainer.y;
            isDraggingChat = true;
            scrollYTracker = [{y: pointer.y, time: this.time.now}];
            this.tweens.killTweensOf(this.msgListContainer);

            hitStartX = pointer.x;
            hitStartY = pointer.y;
            if (pressTimer) { pressTimer.remove(); }
            
            pressTimer = this.time.delayedCall(400, () => {
                if (!isDraggingChat) return;
                
                const checkInteract = (container) => {
                    let localX = pointer.x - this.chatContainer.x;
                    let localY = pointer.y - this.chatContainer.y - container.y;
                    for (let i = 0; i < container.list.length; i++) {
                        let child = container.list[i];
                        if (child.isInteractHit) {
                            let left = child.x - child.width/2, right = child.x + child.width/2;
                            let top = child.y - child.height/2, bottom = child.y + child.height/2;
                            if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
                                this.showChatActionMenu(child.msgData, pointer.x, pointer.y);
                                isDraggingChat = false;
                                return true;
                            }
                        }
                    }
                    return false;
                };

                checkInteract(this.msgListContainer);
            });
        });

        scrollZone.on('pointermove', (pointer) => {
            if (pressTimer && Phaser.Math.Distance.Between(hitStartX, hitStartY, pointer.x, pointer.y) > 10) {
                pressTimer.remove(); pressTimer = null;
            }

            if (pointer.isDown && isDraggingChat) {
                let dynamicTopOffset = 125 + this.currentPinnedHeight;
                let topY = dynamicTopOffset - this.chatKeyboardOffset;
                let bottomY = topY - this.chatMaxScroll;
                let newY = containerStartY + (pointer.y - dragStartY);

                if (newY > topY) {
                    newY = topY + (newY - topY) * 0.35;
                } else if (newY < bottomY) {
                    newY = bottomY + (newY - bottomY) * 0.35;
                }

                this.msgListContainer.y = newY;
                scrollYTracker.push({y: pointer.y, time: this.time.now});
                if (scrollYTracker.length > 5) scrollYTracker.shift();
                
                this.updateChatScrollbar();
            }
        });

        const stopChatDrag = () => {
            if (pressTimer) { pressTimer.remove(); pressTimer = null; }
            if (isDraggingChat) {
                isDraggingChat = false;
                let velocity = 0;
                
                if (scrollYTracker.length > 1) {
                    let first = scrollYTracker[0], last = scrollYTracker[scrollYTracker.length - 1];
                    let dt = last.time - first.time, dy = last.y - first.y;
                    if (dt > 0 && dt < 150) { velocity = dy / dt; }
                }

                let targetY = this.msgListContainer.y;
                let duration = 300;
                let easeType = 'Quart.easeOut';

                if (Math.abs(velocity) > 0.2) {
                    let amplitude = velocity * 600; 
                    targetY += amplitude;
                    duration = Math.min(Math.abs(amplitude) * 1.5, 1200);
                }

                let dynamicTopOffset = 125 + this.currentPinnedHeight;
                let topY = dynamicTopOffset - this.chatKeyboardOffset;
                let bottomY = topY - this.chatMaxScroll;

                if (targetY > topY) targetY = topY;
                if (targetY < bottomY) targetY = bottomY;

                if (targetY !== this.msgListContainer.y) {
                    this.tweens.add({
                        targets: this.msgListContainer, y: targetY, duration: duration, ease: easeType,
                        onUpdate: () => this.updateChatScrollbar()
                    });
                } else {
                    if (this.msgListContainer.y > topY) targetY = topY;
                    if (this.msgListContainer.y < bottomY) targetY = bottomY;
                    
                    if (targetY !== this.msgListContainer.y) {
                        this.tweens.add({
                            targets: this.msgListContainer, y: targetY, duration: 350, ease: 'Back.easeOut',
                            onUpdate: () => this.updateChatScrollbar()
                        });
                    }
                }
            }
        };

        scrollZone.on('pointerup', stopChatDrag);
        scrollZone.on('pointerout', stopChatDrag);
        scrollZone.on('wheel', (pointer, deltaX, deltaY, deltaZ) => {
            this.tweens.killTweensOf(this.msgListContainer);
            let dynamicTopOffset = 125 + this.currentPinnedHeight;
            let topY = dynamicTopOffset - this.chatKeyboardOffset;
            let bottomY = topY - this.chatMaxScroll;
            let newY = this.msgListContainer.y - (deltaY * 1.5);
            newY = Phaser.Math.Clamp(newY, bottomY, topY);
            this.msgListContainer.y = newY;
            this.updateChatScrollbar();
        });

        this.bottomUIContainer = this.add.container(0, 0);
        this.chatContainer.add(this.bottomUIContainer);

        const bottomBg = this.add.rectangle(this.chatW / 2, this.chatH - 53, this.chatW - 8, 85, 0x000c22, 0.85);
        this.bottomUIContainer.add(bottomBg);

        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;

        this.replyUI = this.add.container(this.chatW / 2, inputY - 65).setVisible(false);
        const replyBg = this.add.graphics();
        replyBg.fillStyle(0x003366, 0.95);
        replyBg.fillRoundedRect(- (this.chatW - 60)/2, -20, this.chatW - 60, 40, 12);
        this.replyTxt = this.add.text(- (this.chatW - 60)/2 + 20, 0, "", { fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#00ffff" }).setOrigin(0, 0.5);
        const replyCancel = this.add.text((this.chatW - 60)/2 - 25, 0, "✖", { fontSize: "24px", color: "#ff4444", fontStyle: "bold" }).setOrigin(0.5).setInteractive({useHandCursor:true});
        
        this.cancelReply = () => {
            this.replyData = null;
            this.replyUI.setVisible(false);
        };
        replyCancel.on('pointerdown', () => this.cancelReply());
        this.replyUI.add([replyBg, this.replyTxt, replyCancel]);
        this.bottomUIContainer.add(this.replyUI);

        this.chatSendElements = [];
        this.chatLoginElements = [];

        if (isConnected) {
            const inputHTML = `<input type="text" id="chatInput" autocomplete="off" maxlength="200" placeholder="এখানে লিখুন..." style="box-sizing: border-box; width: ${this.chatW - 130}px; height: 65px; padding: 0 20px; font-family: 'Anek Bangla', sans-serif; font-size: 26px; border-radius: 20px; border: 2px solid #0066aa; outline: none; background: #051025; color: #fff;">`;
                
            this.chatInput = this.add.dom(20 + (this.chatW - 130)/2, inputY).createFromHTML(inputHTML);
            this.bottomUIContainer.add(this.chatInput);
            
            if (this.chatInput.node) {
                this.chatInput.node.style.display = 'none';
            }

            const sendBtnBg = this.add.graphics();
            sendBtnBg.fillStyle(0x0088ff, 1);
            sendBtnBg.fillRoundedRect(this.chatW - 100, inputY - 32.5, 80, 65, 20);
            const sendBtnTxt = this.add.text(this.chatW - 60, inputY, "➤", { fontSize: "36px", color: "#ffffff" }).setOrigin(0.5);
            const sendHit = this.add.rectangle(this.chatW - 60, inputY, 80, 65, 0, 0).setInteractive({useHandCursor: true});
            
            sendHit.on('pointerdown', () => this.sendChatMessage());
            
            this.chatSendElements = [sendBtnBg, sendBtnTxt, sendHit];
            this.bottomUIContainer.add(this.chatSendElements);
            
            const htmlElement = this.chatInput.getChildByID('chatInput');
            if (htmlElement) {
                htmlElement.addEventListener('keydown', (e) => e.stopPropagation());
                htmlElement.addEventListener('keypress', (event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') {
                        this.sendChatMessage();
                        htmlElement.blur(); 
                    }
                });

                let maxBaseHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                let lastShiftDist = 0;

                const handleViewportChange = () => {
                    let currentHeight = window.innerHeight;
                    let offsetTop = 0;

                    if (window.visualViewport) {
                        currentHeight = window.visualViewport.height;
                        offsetTop = window.visualViewport.offsetTop; 
                    }

                    if (currentHeight > maxBaseHeight && offsetTop === 0) {
                        maxBaseHeight = currentHeight;
                    }

                    let keyboardPx = Math.max(0, maxBaseHeight - currentHeight);
                    let neededShiftPx = Math.max(0, keyboardPx - offsetTop);

                    const domCanvasHeight = this.sys.game.canvas.clientHeight || maxBaseHeight;
                    const gameResHeight = this.cameras.main.height;
                    const scaleRatio = gameResHeight / domCanvasHeight;

                    let shiftDist = neededShiftPx * scaleRatio;
                    shiftDist = Phaser.Math.Clamp(shiftDist, 0, gameResHeight * 0.6);

                    const shiftDelta = shiftDist - lastShiftDist;
                    lastShiftDist = shiftDist;
                    this.chatKeyboardOffset = shiftDist;

                    this.tweens.killTweensOf(this.bottomUIContainer);
                    this.tweens.add({ targets: this.bottomUIContainer, y: -shiftDist, duration: 100, ease: 'Sine.easeOut' });

                    this.tweens.killTweensOf(this.msgListContainer);
                    this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y - shiftDelta, duration: 100, ease: 'Sine.easeOut', onUpdate: () => this.updateChatScrollbar() });
                };

                htmlElement.addEventListener('focus', () => {
                    let currentVH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                    if (currentVH > maxBaseHeight) maxBaseHeight = currentVH;

                    if (window.visualViewport) {
                        window.visualViewport.addEventListener('resize', handleViewportChange);
                        window.visualViewport.addEventListener('scroll', handleViewportChange);
                        setTimeout(handleViewportChange, 50);
                    } else {
                        const shiftDist = this.cameras.main.height * 0.45;
                        this.chatKeyboardOffset = shiftDist;
                        lastShiftDist = shiftDist;
                        
                        this.tweens.killTweensOf(this.bottomUIContainer);
                        this.tweens.add({ targets: this.bottomUIContainer, y: -shiftDist, duration: 250, ease: 'Cubic.easeOut' });
                        
                        this.tweens.killTweensOf(this.msgListContainer);
                        this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y - shiftDist, duration: 250, ease: 'Cubic.easeOut', onUpdate: () => this.updateChatScrollbar() });
                    }
                });

                htmlElement.addEventListener('blur', () => {
                    if (window.visualViewport) {
                        window.visualViewport.removeEventListener('resize', handleViewportChange);
                        window.visualViewport.removeEventListener('scroll', handleViewportChange);
                    }
                    if (this.isChatOpen) {
                        this.tweens.killTweensOf(this.bottomUIContainer);
                        this.tweens.add({ targets: this.bottomUIContainer, y: 0, duration: 250, ease: 'Cubic.easeOut' });

                        this.tweens.killTweensOf(this.msgListContainer);
                        this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y + this.chatKeyboardOffset, duration: 250, ease: 'Cubic.easeOut', onUpdate: () => this.updateChatScrollbar() });
                        
                        this.chatKeyboardOffset = 0;
                        lastShiftDist = 0;
                    }
                });
            }
        } else {
            const promptTxt = this.add.text(this.chatW / 2, inputY - 60, "চ্যাট করতে Google লগইন করুন", { fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#aaaaaa" }).setOrigin(0.5);
            const loginBg = this.add.graphics();
            loginBg.fillStyle(0x0066aa, 1);
            loginBg.fillRoundedRect(this.chatW / 2 - 175, inputY - 35, 350, 70, 25);
            const loginTxt = this.add.text(this.chatW / 2, inputY, "Connect (Google)", { fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
            const loginHit = this.add.rectangle(this.chatW / 2, inputY, 350, 70, 0x000000, 0).setInteractive({useHandCursor: true});

            loginHit.on('pointerdown', () => {
                if (!navigator.onLine) {
                    if (this.showNotification) this.showNotification("Connection lost. Cannot connect.", "error");
                    return;
                }
                if (this.playSound) this.playSound('sfx_click');
                if (window.signInWithGoogle) window.signInWithGoogle().then(() => this.scene.restart());
            });

            this.chatLoginElements = [promptTxt, loginBg, loginTxt, loginHit];
            this.bottomUIContainer.add(this.chatLoginElements);
        }

        this.offlinePromptGroup = this.add.container(0, 0).setVisible(false);
        const offlineTxt = this.add.text(this.chatW / 2, inputY, "Connection Lost. Chat unavailable.", { 
            fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ff4444", fontStyle: "bold" 
        }).setOrigin(0.5);
        this.offlinePromptGroup.add(offlineTxt);
        this.bottomUIContainer.add(this.offlinePromptGroup);

        // Splitting into async checker and synchronous applier to prevent UI blocking
        this.updateChatNetworkState = async () => {
            let isOnline = navigator.onLine;
            // Quick fail if navigator knows we are offline
            if (!isOnline) {
                this._applyNetworkState(false);
                return;
            }
            // Verify real internet connectivity
            isOnline = await this.checkRealConnection();
            this._applyNetworkState(isOnline);
        };
        
        this._applyNetworkState = (isOnline) => {
            if (this.offlinePromptGroup) this.offlinePromptGroup.setVisible(!isOnline);
            
            if (!isOnline) {
                if (this.chatInput && this.chatInput.node) this.chatInput.node.style.display = 'none';
                if (this.chatSendElements) this.chatSendElements.forEach(e => e.setVisible(false));
                if (this.chatLoginElements) this.chatLoginElements.forEach(e => e.setVisible(false));
                if (this.replyData) this.cancelReply();
            } else {
                if (this.isChatOpen && this.chatInput && this.chatInput.node) this.chatInput.node.style.display = 'block';
                if (this.chatSendElements) this.chatSendElements.forEach(e => e.setVisible(true));
                if (this.chatLoginElements) this.chatLoginElements.forEach(e => e.setVisible(true));
            }
            
            if (this.chatToggleContainer && !this.isChatOpen) {
                this.chatToggleContainer.setVisible(true);
                this.chatToggleContainer.setScale(1);
            }
        };

        if (this.chatOnlineListener) window.removeEventListener('online', this.chatOnlineListener);
        if (this.chatOfflineListener) window.removeEventListener('offline', this.chatOfflineListener);
        this.chatOnlineListener = () => this.updateChatNetworkState();
        this.chatOfflineListener = () => this.updateChatNetworkState();
        
        window.addEventListener('online', this.chatOnlineListener);
        window.addEventListener('offline', this.chatOfflineListener);
        
        this.updateChatNetworkState();
        this.createChatToggleButton(w - 60, h / 6 + 250);
        this.listenToGlobalChat();
    },

    showChatError(msg) {
        if (this.chatErrBanner) {
            this.tweens.killTweensOf(this.chatErrBanner);
            this.chatErrBanner.destroy();
        }

        const yPos = this.chatH - 110;
        this.chatErrBanner = this.add.container(this.chatW / 2, yPos).setDepth(9999);

        const bg = this.add.graphics();
        bg.fillStyle(0xff3333, 0.95);
        bg.fillRoundedRect(-180, -22.5, 360, 45, 12);
        bg.lineStyle(2, 0xffaaaa, 1);
        bg.strokeRoundedRect(-180, -22.5, 360, 45, 12);

        const txt = this.add.text(0, 0, msg, {
            fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0.5);

        this.chatErrBanner.add([bg, txt]);
        if (this.chatContainer) this.chatContainer.add(this.chatErrBanner);

        this.tweens.add({
            targets: this.chatErrBanner,
            y: yPos - 20,
            alpha: 0,
            delay: 2500,
            duration: 500,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (this.chatErrBanner) {
                    this.chatErrBanner.destroy();
                    this.chatErrBanner = null;
                }
            }
        });
    },

    createChatToggleButton(x, y) {
        this.chatToggleContainer = this.add.container(x, y).setDepth(9000);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.7);
        shadow.fillRoundedRect(-36, -36, 180, 80, 20); 

        const bg = this.add.graphics();
        const drawBase = (isHovered) => {
            bg.clear();
            if (isHovered) {
                bg.fillGradientStyle(0x1e293b, 0x1e293b, 0x334155, 0x334155, 1); 
                bg.lineStyle(2, 0x475569, 1);
            } else {
                bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1); 
                bg.lineStyle(2, 0x334155, 1);
            }
            bg.fillRoundedRect(-40, -40, 180, 80, 20);
            bg.strokeRoundedRect(-40, -40, 180, 80, 20);
        };
        drawBase(false);

        const icon = this.add.text(2, 3, "💬", { 
            fontSize: "54px", 
            fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif' 
        }).setOrigin(0.5) .setAlpha(0.80);
        icon.clearTint();

        const hitArea = this.add.rectangle(0, 0, 80, 80, 0, 0).setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
            drawBase(true);
            this.tweens.add({ targets: this.chatToggleContainer, scale: 1.1, duration: 200, ease: 'Back.out' });
        });

        hitArea.on('pointerout', () => {
            drawBase(false);
            this.tweens.add({ targets: this.chatToggleContainer, scale: 1, duration: 200, ease: 'Power2' });
        });

        hitArea.on('pointerdown', () => {
            if (this.playSound) this.playSound('sfx_tick', 0.5); 
            this.tweens.add({
                targets: this.chatToggleContainer,
                scale: 0.85,
                yoyo: true,
                duration: 100,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.toggleChatWindow(); 
                }
            });
        });

        this.unreadBadgeBg = this.add.graphics();
        this.unreadBadgeBg.fillStyle(0xef4444, 1); 
        this.unreadBadgeBg.fillCircle(34, -34, 18); 
        this.unreadBadgeBg.lineStyle(2.5, 0x0f172a, 1); 
        this.unreadBadgeBg.strokeCircle(34, -34, 18);
        
        this.unreadBadgeTxt = this.add.text(34, -34, "0", {
            fontSize: "26px", 
            fontFamily: "Arial", 
            color: "#ffffff", 
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.unreadBadgeBg.setVisible(false);
        this.unreadBadgeTxt.setVisible(false);

        this.chatToggleContainer.add([
            shadow, bg, icon, hitArea, this.unreadBadgeBg, this.unreadBadgeTxt
        ]);
        
        this.chatToggleContainer.setScale(1);
    },

    toggleChatWindow() {
        if (this.playSound) this.playSound('sfx_click');
        this.isChatOpen = !this.isChatOpen;
        
        const targetY = this.isChatOpen ? this.chatYVisible : this.chatYHidden;
        this.chatBlocker.setVisible(this.isChatOpen);

        if (this.isChatOpen) {
            this.updateChatNetworkState(); // Validate real connection dynamically on open

            this.chatToggleContainer.setVisible(false); 
            
            this.chatKeyboardOffset = 0;
            if (this.bottomUIContainer) this.bottomUIContainer.y = 0;
            
            this.chatContainer.setVisible(true);
            
            if (this.chatInput && this.chatInput.node && navigator.onLine) {
                this.chatInput.node.style.display = 'block'; 
            }
            
            this.unreadBadgeBg.setVisible(false);
            this.unreadBadgeTxt.setVisible(false);
            
            let dynamicTopOffset = 125 + this.currentPinnedHeight;
            this.msgListContainer.y = dynamicTopOffset - this.chatMaxScroll;
            this.updateChatScrollbar();
            
            this.lastUnreadCount = 0; 
        } else {
            this.lastSeenTime = Date.now();
            this.dividerRendered = false;
            
            if (window.FirebaseAuth && window.FirebaseAuth.currentUser && navigator.onLine) {
                const uid = window.FirebaseAuth.currentUser.uid;
                const userRef = window.FirebaseTools.doc(window.FirebaseDB, "players", uid);
                window.FirebaseTools.setDoc(userRef, { 
                    chatLastSeenTime: this.lastSeenTime 
                }, { merge: true }).catch(e => console.log("Chat DB Save Error:", e));
            }
            
            this.chatToggleContainer.setVisible(true);
            this.chatToggleContainer.setScale(1); 
            
            if (this.refreshChatUI) this.refreshChatUI();
        }

        this.tweens.add({
            targets: this.chatContainer,
            y: targetY,
            duration: 350,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!this.isChatOpen) {
                    this.chatContainer.setVisible(false);
                    if (this.chatInput && this.chatInput.node) {
                        this.chatInput.node.style.display = 'none';
                    }
                }
            }
        });

        this.tweens.add({
            targets: this.chatMaskShape,
            y: this.isChatOpen ? 0 : (this.chatYHidden - this.chatYVisible),
            duration: 350,
            ease: 'Cubic.easeOut'
        });

        if (!this.isChatOpen && this.chatInput) {
            const htmlElement = this.chatInput.getChildByID('chatInput');
            if (htmlElement) htmlElement.blur();
        }
    },

    getDeterministicColor(uid) {
        if (!uid) return "#ffffff";
        let hash = 0;
        for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
        const r = Math.floor((Math.abs((hash & 0xFF0000) >> 16) + 255) / 2);
        const g = Math.floor((Math.abs((hash & 0x00FF00) >> 8) + 255) / 2);
        const b = Math.floor((Math.abs(hash & 0x0000FF) + 255) / 2);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    filterBadWords(text) {
        if (!text) return text;
        const badWords = [
            'fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt', 'slut', 'bastard', 'whore', 'fag', 'faggot', 'nigger', 'nigga', 'pussy', 'cock', 'twat',
            'বাল', 'মাগি', 'খানকি', 'চুদ', 'চুদি', 'শুয়োর', 'শূকর', 'বাইনচোদ', 'মাদারচোদ', 'bokachoda', 'gandu', 'kutta', 'khanki'
        ];
        
        let filtered = text;
        badWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, match => '*'.repeat(match.length));
        });
        return filtered;
    },

    initiateReply(msg) {
        this.replyData = { id: msg.id, n: msg.n, text: msg.text };
        let formattedText = msg.text.length > 20 ? msg.text.substring(0, 20) + "..." : msg.text;
        this.replyTxt.setText(`Replying to ${msg.n}: ${formattedText}`);
        this.replyUI.setVisible(true);
        if (this.chatInput) {
            const htmlElement = this.chatInput.getChildByID('chatInput');
            if (htmlElement) htmlElement.focus();
        }
    },

    async reactToMessage(msg, emoji) {
        const isReallyOnline = await this.checkRealConnection();
        if (!isReallyOnline) {
            if (this.showNotification) this.showNotification("Connection lost.", "error");
            this.showChatError("Offline: Cannot react right now!");
            return; 
        }
        if (!window.FirebaseAuth || !window.FirebaseAuth.currentUser) return;
        
        const uid = window.FirebaseAuth.currentUser.uid;
        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
        
        let updates = {};
        if (msg.reactions && msg.reactions[uid] === emoji) {
            updates[`reactions.${uid}`] = null; 
        } else {
            updates[`reactions.${uid}`] = emoji; 
        }

        window.FirebaseTools.updateDoc(docRef, updates).catch(err => {
            console.error("Reaction failed:", err);
            this.showChatError("Error: Failed to add reaction!");
        });
    },

    showChatActionMenu(msg, x, y) {
        if (this.chatActionPopup) this.chatActionPopup.destroy();
        if (this.playSound) this.playSound('sfx_tick', 0.5);

        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        const isAdmin = GameState.profile && GameState.profile.role === 'admin';
        
        const menuW = 360; 
        let menuH = isConnected ? 150 : 90;
        if (isConnected && isAdmin) menuH = 210; 
        
        const halfW = menuW / 2;
        const halfH = menuH / 2;
        
        let localX = Phaser.Math.Clamp(x - this.chatX, halfW + 10, this.chatW - halfW - 10);
        let localY = y - (this.isChatOpen ? this.chatYVisible : this.chatYHidden) - halfH - 20;
        
        if (localY < halfH) localY = halfH + 20;

        this.chatActionPopup = this.add.container(localX, localY).setDepth(9999);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillRoundedRect(-halfW + 4, -halfH + 8, menuW, menuH, 16);

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 0.98); 
        bg.fillRoundedRect(-halfW, -halfH, menuW, menuH, 16);
        bg.lineStyle(1.5, 0x334155, 1);
        bg.strokeRoundedRect(-halfW, -halfH, menuW, menuH, 16);

        this.chatActionPopup.add([shadow, bg]);
        
        if (!isConnected) {
            const warnTxt = this.add.text(0, 0, "লগইন করে চ্যাট করুন", { 
                fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#ffaaaa" 
            }).setOrigin(0.5);
            this.chatActionPopup.add(warnTxt);

        } else {
            const emojiY = -halfH + 40;
            const divider1Y = -halfH + 85;
            const row1BtnY = -halfH + 120;
            const divider2Y = -halfH + 155;
            const row2BtnY = -halfH + 180;

            const emojis = ['👍', '❤️', '😂', '😮', '😢'];
            const startX = -130;
            const spacing = 65;

            emojis.forEach((emoji, i) => {
                const emTxt = this.add.text(startX + (i * spacing), emojiY, emoji, { 
                    fontSize: "38px", 
                    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
                }).setOrigin(0.5).setInteractive({useHandCursor: true});
                
                emTxt.clearTint(); 
                
                emTxt.on('pointerover', () => this.tweens.add({ targets: emTxt, scale: 1.25, y: emojiY - 10, duration: 250, ease: 'Back.out' }));
                emTxt.on('pointerout', () => this.tweens.add({ targets: emTxt, scale: 1, y: emojiY, duration: 200, ease: 'Power2' }));
                
                emTxt.on('pointerdown', () => {
                    this.reactToMessage(msg, emoji);
                    this.closeActionMenu();
                });
                
                this.chatActionPopup.add(emTxt);
            });

            const divider = this.add.rectangle(0, divider1Y, menuW - 40, 1, 0xffffff, 0.08);
            this.chatActionPopup.add(divider);

            const repBg = this.add.graphics();
            const drawRepBg = (hover) => {
                repBg.clear();
                if (hover) {
                    repBg.fillStyle(0x334155, 0.8);
                    repBg.fillRoundedRect(-170, row1BtnY - 24, 160, 48, 12); 
                }
            };
            drawRepBg(false);

            const repIcon = this.add.text(-125, row1BtnY, "↩️", { fontSize: "24px", fontFamily: '"Segoe UI Emoji", sans-serif' }).setOrigin(0.5);
            repIcon.clearTint();
            const repTxt = this.add.text(-100, row1BtnY, "Reply", { fontSize: "20px", fontFamily: 'sans-serif', color: '#cbd5e1' }).setOrigin(0, 0.5);
            const repHit = this.add.rectangle(-90, row1BtnY, 160, 48, 0, 0).setInteractive({useHandCursor: true});

            repHit.on('pointerover', () => { drawRepBg(true); repTxt.setColor('#ffffff'); });
            repHit.on('pointerout', () => { drawRepBg(false); repTxt.setColor('#cbd5e1'); });
            repHit.on('pointerdown', () => {
                this.initiateReply(msg);
                this.closeActionMenu();
            });

            const copyBg = this.add.graphics();
            const drawCopyBg = (hover) => {
                copyBg.clear();
                if (hover) {
                    copyBg.fillStyle(0x334155, 0.8);
                    copyBg.fillRoundedRect(10, row1BtnY - 24, 160, 48, 12); 
                }
            };
            drawCopyBg(false);

            const copyIcon = this.add.text(45, row1BtnY, "📋", { fontSize: "24px", fontFamily: '"Segoe UI Emoji", sans-serif' }).setOrigin(0.5);
            copyIcon.clearTint();
            const copyTxt = this.add.text(70, row1BtnY, "Copy", { fontSize: "20px", fontFamily: 'sans-serif', color: '#cbd5e1' }).setOrigin(0, 0.5);
            const copyHit = this.add.rectangle(90, row1BtnY, 160, 48, 0, 0).setInteractive({useHandCursor: true});

            copyHit.on('pointerover', () => { drawCopyBg(true); copyTxt.setColor('#ffffff'); });
            copyHit.on('pointerout', () => { drawCopyBg(false); copyTxt.setColor('#cbd5e1'); });
            copyHit.on('pointerdown', () => {
                if (this.playSound) this.playSound('sfx_tick', 0.5);
                
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(msg.text).catch(() => {});
                } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = msg.text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try { document.execCommand("copy"); } catch (e) {}
                    document.body.removeChild(textArea);
                }

                copyIcon.setText("✅");
                copyTxt.setText("Copied");
                copyTxt.setColor('#4ade80');
                this.time.delayedCall(800, () => this.closeActionMenu());
            });

            this.chatActionPopup.add([repBg, repIcon, repTxt, repHit, copyBg, copyIcon, copyTxt, copyHit]);

            if (isAdmin) {
                const divider2 = this.add.rectangle(0, divider2Y, menuW - 40, 1, 0xffffff, 0.08);
                this.chatActionPopup.add(divider2);

                const pinBg = this.add.graphics();
                const drawPinBg = (hover) => {
                    pinBg.clear();
                    if (hover) {
                        pinBg.fillStyle(0x334155, 0.8);
                        pinBg.fillRoundedRect(-170, row2BtnY - 24, 160, 48, 12);
                    }
                };
                drawPinBg(false);

                const isPinned = msg.pinned;
                const pinIcon = this.add.text(-125, row2BtnY, isPinned ? "❌" : "📌", { fontSize: "24px", fontFamily: '"Segoe UI Emoji", sans-serif' }).setOrigin(0.5);
                pinIcon.clearTint();
                const pinTxt = this.add.text(-100, row2BtnY, isPinned ? "Unpin" : "Pin", { fontSize: "20px", fontFamily: 'sans-serif', color: '#cbd5e1' }).setOrigin(0, 0.5);
                const pinHit = this.add.rectangle(-90, row2BtnY, 160, 48, 0, 0).setInteractive({useHandCursor: true});

                pinHit.on('pointerover', () => { drawPinBg(true); pinTxt.setColor('#ffffff'); });
                pinHit.on('pointerout', () => { drawPinBg(false); pinTxt.setColor('#cbd5e1'); });
                pinHit.on('pointerdown', async () => {
                    const isReallyOnline = await this.checkRealConnection();
                    if (!isReallyOnline) { 
                        if (this.showNotification) this.showNotification("Cannot pin offline.", "error"); 
                        this.showChatError("Offline: Cannot pin message.");
                        return; 
                    }
                    const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                    window.FirebaseTools.updateDoc(docRef, { pinned: !isPinned }).catch(err => this.showChatError("Failed to pin message."));
                    this.closeActionMenu();
                });

                const delBg = this.add.graphics();
                const drawDelBg = (hover) => {
                    delBg.clear();
                    if (hover) {
                        delBg.fillStyle(0xef4444, 0.2);
                        delBg.fillRoundedRect(10, row2BtnY - 24, 160, 48, 12);
                    }
                };
                drawDelBg(false);

                const delIcon = this.add.text(45, row2BtnY, "🗑️", { fontSize: "24px", fontFamily: '"Segoe UI Emoji", sans-serif' }).setOrigin(0.5);
                delIcon.clearTint();
                const delTxt = this.add.text(70, row2BtnY, "Delete", { fontSize: "20px", fontFamily: 'sans-serif', color: '#f87171' }).setOrigin(0, 0.5);
                const delHit = this.add.rectangle(90, row2BtnY, 160, 48, 0, 0).setInteractive({useHandCursor: true});

                delHit.on('pointerover', () => { drawDelBg(true); delTxt.setColor('#ef4444'); });
                delHit.on('pointerout', () => { drawDelBg(false); delTxt.setColor('#f87171'); });
                delHit.on('pointerdown', async () => {
                    const isReallyOnline = await this.checkRealConnection();
                    if (!isReallyOnline) { 
                        if (this.showNotification) this.showNotification("Cannot delete offline.", "error"); 
                        this.showChatError("Offline: Cannot delete message.");
                        return; 
                    }
                    const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                    window.FirebaseTools.updateDoc(docRef, { isDeleted: true, pinned: false }).catch(err => this.showChatError("Failed to delete message."));
                    this.closeActionMenu();
                });

                this.chatActionPopup.add([pinBg, pinIcon, pinTxt, pinHit, delBg, delIcon, delTxt, delHit]);
            }
        }

        this.chatActionPopup.setScale(0.8);
        this.chatActionPopup.setAlpha(0);
        this.tweens.add({ targets: this.chatActionPopup, scale: 1, alpha: 1, duration: 250, ease: 'Back.out' });

        this.closeActionMenu = () => {
            if (this.chatActionPopup) {
                this.tweens.add({
                    targets: this.chatActionPopup, scale: 0.9, alpha: 0, duration: 150, ease: 'Power2',
                    onComplete: () => {
                        if (this.chatActionPopup) this.chatActionPopup.destroy();
                    }
                });
            }
        };

        this.time.delayedCall(100, () => {
            this.input.once('pointerdown', () => this.closeActionMenu());
        });
    },

    listenToGlobalChat() {
        if (!window.FirebaseDB || !window.FirebaseTools) return;
        
        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        const q = window.FirebaseTools.query(chatRef, window.FirebaseTools.orderBy("timestamp", "desc"), window.FirebaseTools.limit(105));
        
        let isFirstLoad = true;
        this.chatDataCache = []; 

        this.scrollToChat = (msgId) => {
            if (!this.msgYMap || !this.msgYMap[msgId]) return;
            if (this.playSound) this.playSound('sfx_click');
            
            let dynamicTopOffset = 125 + this.currentPinnedHeight;
            let topY = dynamicTopOffset - this.chatKeyboardOffset;
            let bottomY = topY - this.chatMaxScroll;
            
            let targetMsgY = this.msgYMap[msgId].y;
            let targetContainerY = topY - targetMsgY + 20; 
            
            targetContainerY = Phaser.Math.Clamp(targetContainerY, bottomY, topY);
            
            this.tweens.killTweensOf(this.msgListContainer);
            this.tweens.add({
                targets: this.msgListContainer,
                y: targetContainerY,
                duration: 450,
                ease: 'Cubic.easeOut',
                onUpdate: () => this.updateChatScrollbar()
            });

            let highlight = this.add.rectangle(
                this.chatW / 2, 
                targetMsgY + this.msgYMap[msgId].h / 2, 
                this.chatW - 20, 
                this.msgYMap[msgId].h + 16, 
                0xffffff, 0.35 
            );
            this.msgListContainer.add(highlight);
            
            this.tweens.add({
                targets: highlight,
                alpha: 0,
                duration: 1500,
                delay: 400,
                onComplete: () => highlight.destroy()
            });
        };

        this.refreshChatUI = () => {
            const dynamicPrevTopOffset = 125 + this.currentPinnedHeight;
            const prevTopY = dynamicPrevTopOffset - this.chatKeyboardOffset;
            const prevBottomY = prevTopY - (this.chatMaxScroll || 0);
            const isAtBottom = this.msgListContainer.y <= prevBottomY + 50;

            this.msgListContainer.removeAll(true);
            this.pinnedContainer.removeAll(true);
            
            let currentY = 20;
            let pinnedY = 0;
            let unreadCalc = 0;
            this.dividerRendered = false; 
            
            this.msgYMap = {}; 

            const currentUserUid = (window.FirebaseAuth && window.FirebaseAuth.currentUser) ? window.FirebaseAuth.currentUser.uid : null;

            const pinnedMessages = this.chatDataCache.filter(m => m.pinned);
            
            // --- Merge tracked local messages that are sending or have failed ---
            let allMessages = [...this.chatDataCache];
            if (this.trackedMessages) {
                Object.keys(this.trackedMessages).forEach(msgId => {
                    const tm = this.trackedMessages[msgId];
                    const exists = allMessages.find(m => m.id === msgId);
                    if (!exists && (tm.status === 'error' || tm.status === 'sending')) {
                        allMessages.push({
                            id: msgId,
                            ...tm.payload,
                            isLocalOnly: true,
                            timestamp: { toMillis: () => tm.time } // Mocking timestamp for safe sorting
                        });
                    }
                });
            }

            // Secure chronological sorting to protect against Firebase field value tokens
            const getTime = (msg) => {
                if (msg.isLocalOnly) return this.trackedMessages[msg.id].time;
                if (msg.timestamp && typeof msg.timestamp.toMillis === 'function') return msg.timestamp.toMillis();
                return Date.now(); 
            };
            allMessages.sort((a, b) => getTime(a) - getTime(b));

            let lastSenderUid = null;
            let lastMessageWasPinned = false;

            pinnedMessages.forEach(msg => {
                const bannerHeight = 60;
                const yCenter = pinnedY + bannerHeight / 2;
                
                const pBg = this.add.graphics();
                pBg.fillStyle(0x0f172a, 0.95); 
                pBg.fillRoundedRect(10, pinnedY, this.chatW - 20, bannerHeight, 10);
                pBg.lineStyle(2, 0xffd700, 0.8); 
                pBg.strokeRoundedRect(10, pinnedY, this.chatW - 20, bannerHeight, 10);
                
                const shortText = msg.text.length > 35 ? msg.text.substring(0, 35) + "..." : msg.text;
                const pTxt = this.add.text(20, yCenter, `📌 ${msg.n}: ${shortText}`, {
                    fontSize: "22px", fontFamily: "'Anek Bangla', sans-serif", color: "#ffd700", fontStyle: "bold"
                }).setOrigin(0, 0.5);
                
                const pHit = this.add.rectangle(this.chatW/2, yCenter, this.chatW - 20, bannerHeight, 0, 0)
                    .setInteractive({useHandCursor: true});
                
                pHit.on('pointerover', () => {
                    pBg.clear();
                    pBg.fillStyle(0x1e293b, 1);
                    pBg.fillRoundedRect(10, pinnedY, this.chatW - 20, bannerHeight, 10);
                    pBg.lineStyle(2, 0xffea00, 1); 
                    pBg.strokeRoundedRect(10, pinnedY, this.chatW - 20, bannerHeight, 10);
                });
                
                pHit.on('pointerout', () => {
                    pBg.clear();
                    pBg.fillStyle(0x0f172a, 0.95);
                    pBg.fillRoundedRect(10, pinnedY, this.chatW - 20, bannerHeight, 10);
                    pBg.lineStyle(2, 0xffd700, 0.8);
                    pBg.strokeRoundedRect(10, pinnedY, this.chatW - 20, bannerHeight, 10);
                });

                pHit.on('pointerdown', (pointer) => {
                    pointer.event.stopPropagation();
                    this.scrollToChat(msg.id);
                });
                
                this.pinnedContainer.add([pBg, pTxt, pHit]);
                pinnedY += bannerHeight + 8; 
            });
            
            this.currentPinnedHeight = pinnedY > 0 ? pinnedY + 10 : 0;
            let dynamicTopOffset = 125 + this.currentPinnedHeight;
            let dynamicScrollZoneHeight = Math.max(50, this.chatScrollZoneHeight - this.currentPinnedHeight);

            this.chatMaskShape.clear();
            this.chatMaskShape.fillStyle(0xffffff);
            this.chatMaskShape.fillRect(this.chatX + 10, this.chatYVisible + dynamicTopOffset, this.chatW - 20, dynamicScrollZoneHeight);

            const renderMessage = (msg, targetContainer, startY) => {
                const isMe = currentUserUid && (msg.uid === currentUserUid);
                const isPinned = msg.pinned; 
                let msgTime = msg.timestamp ? (typeof msg.timestamp.toMillis === 'function' ? msg.timestamp.toMillis() : Date.now()) : Date.now();
                
                if (msgTime > this.lastSeenTime && !msg.isLocalOnly) unreadCalc++;

                if (msgTime > this.lastSeenTime && !this.dividerRendered && !msg.isLocalOnly) {
                    this.dividerRendered = true;
                    lastSenderUid = null; 
                    
                    const divCont = this.add.container(this.chatW / 2, startY + 15);
                    const divLine = this.add.rectangle(0, 0, this.chatW - 100, 2, 0xff3333, 0.7);
                    const divTxt = this.add.text(0, 0, "---- নতুন মেসেজ ----", { 
                        fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#ff3333", backgroundColor: "#000c22", padding: {x: 12} 
                    }).setOrigin(0.5);
                    divCont.add([divLine, divTxt]);
                    targetContainer.add(divCont);
                    startY += 50;
                }

                const isConsecutive = (lastSenderUid === msg.uid) && (lastMessageWasPinned === isPinned);
                lastSenderUid = msg.uid;
                lastMessageWasPinned = isPinned;

                let displayMsgText = msg.text;
                let displayMsgColor = "#ffffff";
                let bubBgHex;

                const nameColorHexStr = isPinned ? "#ffd700" : (isMe ? "#00ffff" : this.getDeterministicColor(msg.uid));
                const baseCol = Phaser.Display.Color.HexStringToColor(nameColorHexStr);
                const darkenFac = isMe ? 0.35 : 0.15; 
                
                if (msg.isDeleted) {
                    displayMsgText = "🚫 This message was deleted.";
                    displayMsgColor = "#888888";
                    bubBgHex = Phaser.Display.Color.GetColor(baseCol.r * 0.1, baseCol.g * 0.1, baseCol.b * 0.1); 
                } else {
                    bubBgHex = Phaser.Display.Color.GetColor(baseCol.r * darkenFac, baseCol.g * darkenFac, baseCol.b * darkenFac);
                }

                const levelText = msg.lvl ? `  [Lvl ${msg.lvl}]` : "";
                const nameStr = (isPinned ? "📌 " : "") + (msg.n || "Guest") + levelText;
                
                const bubbleMaxWidth = this.chatW * 0.82;
                let extraHeight = (msg.replyTo && !msg.isDeleted) ? 42 : 0;
                let replyTxtObj = null;
                
                if (msg.replyTo && !msg.isDeleted) {
                    let replySnippet = msg.replyTo.text.length > 25 ? msg.replyTo.text.substring(0, 25) + "..." : msg.replyTo.text;
                    replyTxtObj = this.add.text(0, 0, `➥ ${msg.replyTo.n}: ${replySnippet}`, { 
                        fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#aaddff", fontStyle: "italic", 
                        backgroundColor: "#00000088", padding: {x: 10, y: 6}
                    });
                }

                const msgTxt = this.add.text(0, 0, displayMsgText, { 
                    fontSize: "30px", fontFamily: "'Anek Bangla', sans-serif", color: displayMsgColor, wordWrap: { width: bubbleMaxWidth - 40, useAdvancedWrap: true }, fontStyle: msg.isDeleted ? "italic" : "normal", lineSpacing: 10
                });

                const timeStr = this.timeAgo(msg.timestamp);
                const timeTxt = this.add.text(0, 0, timeStr, { 
                    fontSize: "16px", fontFamily: "Arial", color: "#aaaaaa" 
                });

                let topPadding = isConsecutive ? 5 : 45;
                const bubY = startY + topPadding; 

                if (!isConsecutive) {
                    const nameTxt = this.add.text(35, bubY - 30, nameStr, { 
                        fontSize: "26px", 
                        fontFamily: "'Anek Bangla'", 
                        color: nameColorHexStr, 
                        fontStyle: "bold",
                        padding: { y: 4 },
                        stroke: "#000000",
                        strokeThickness: 4,
                        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
                    });
                    if (isMe) nameTxt.x = this.chatW - nameTxt.width - 35;
                    targetContainer.add(nameTxt);
                }

                const timeWidth = timeTxt.width;
                const bubbleW = Math.max(msgTxt.width + 40, (replyTxtObj ? replyTxtObj.width + 40 : 120), timeWidth + 40);
                
                let hasReactions = false;
                let extraReactionPadding = 0;
                let reactionCounts = {};
                
                if (msg.reactions && !msg.isDeleted) {
                    Object.values(msg.reactions).forEach(e => {
                        if (e && e !== "") { reactionCounts[e] = (reactionCounts[e] || 0) + 1; }
                    });
                    if (Object.keys(reactionCounts).length > 0) {
                        hasReactions = true;
                        extraReactionPadding = 25;
                    }
                }

                let bubbleH = msgTxt.height + 50 + extraHeight + extraReactionPadding;
                let startX = isMe ? (this.chatW - bubbleW - 25) : 25;

                const bubbleBg = this.add.graphics();
                bubbleBg.fillStyle(bubBgHex, 0.95);

                if (isMe) {
                    bubbleBg.fillRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 22, br: 0 });
                } else {
                    bubbleBg.fillRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 0, br: 22 });
                }

                if (replyTxtObj) replyTxtObj.setPosition(startX + 20, bubY + 10);
                msgTxt.setPosition(startX + 20, bubY + 15 + extraHeight);

                timeTxt.setPosition(startX + bubbleW - timeWidth - 15, bubY + bubbleH - 22 - extraReactionPadding);

                targetContainer.add([bubbleBg, msgTxt, timeTxt]);
                if (replyTxtObj) targetContainer.add(replyTxtObj);

                // --- NEW: Error & Pending UI indicators ---
                let isError = false;
                let isSending = false;
                if (this.trackedMessages && this.trackedMessages[msg.id]) {
                    if (this.trackedMessages[msg.id].status === 'error') isError = true;
                    if (this.trackedMessages[msg.id].status === 'sending') isSending = true;
                }
                
                let finalBubbleH = bubbleH;

                if (isError) {
                    const errTxt = this.add.text(startX + bubbleW - 10, bubY + finalBubbleH + 5, "⚠️ Failed to send. Tap to retry.", {
                        fontSize: "20px", fontFamily: "'Anek Bangla', Arial", color: "#ff4444", fontStyle: "bold",
                        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
                    }).setOrigin(1, 0).setInteractive({useHandCursor: true});
                    
                    errTxt.on('pointerdown', () => {
                        if (this.playSound) this.playSound('sfx_click');
                        this.retrySendMessage(msg.id);
                    });
                    
                    targetContainer.add(errTxt);
                    finalBubbleH += 30; // Reserve vertical space for the text
                } else if (isSending) {
                    const sendTxt = this.add.text(startX + bubbleW - 10, bubY + finalBubbleH + 5, "Sending...", {
                        fontSize: "18px", fontFamily: "'Anek Bangla', Arial", color: "#aaaaaa", fontStyle: "italic"
                    }).setOrigin(1, 0);
                    
                    targetContainer.add(sendTxt);
                    finalBubbleH += 30;
                }

                // Prevent interaction on unsent/failed messages
                if (!msg.isDeleted && !isError && !isSending) {
                    const interactHit = this.add.rectangle(startX + bubbleW/2, bubY + bubbleH/2, bubbleW, bubbleH, 0, 0);
                    interactHit.isInteractHit = true;
                    interactHit.msgData = msg;
                    targetContainer.add(interactHit);
                }

                let reactionSpace = 0;
                if (hasReactions) {
                    let rxX = startX + 15; 
                    let rxY = bubY + bubbleH - 12; 
                    
                    const sortedReactions = Object.keys(reactionCounts);
                    sortedReactions.forEach((e) => {
                        const badgeBg = this.add.graphics();
                        badgeBg.fillStyle(0x001122, 1);
                        
                        badgeBg.fillRoundedRect(rxX, rxY, 90, 42, 21);
                        badgeBg.lineStyle(1.5, 0x00aaff, 1);
                        badgeBg.strokeRoundedRect(rxX, rxY, 90, 42, 21);
                        
                        const badgeTxt = this.add.text(rxX + 45, rxY + 21, `${e} ${reactionCounts[e]}`, { 
                            fontSize: "28px", 
                            fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                            color: "#ffffff" 
                        }).setOrigin(0.5);

                        targetContainer.add([badgeBg, badgeTxt]);
                        rxX += 95; 
                    });
                    
                    reactionSpace = 55; 
                }

                this.msgYMap[msg.id] = { y: bubY, h: finalBubbleH };

                return bubY + finalBubbleH + reactionSpace + 15; 
            };

            lastSenderUid = null;
            allMessages.forEach(msg => {
                currentY = renderMessage(msg, this.msgListContainer, currentY);
            });

            const visibleHeight = dynamicScrollZoneHeight;
            this.chatMaxScroll = Math.max(0, currentY - visibleHeight);

            if (!this.isChatOpen && unreadCalc > 0) {
                let badgeText = unreadCalc > 9 ? "9+" : unreadCalc.toString();
                this.unreadBadgeTxt.setText(badgeText);
                this.unreadBadgeBg.setVisible(true);
                this.unreadBadgeTxt.setVisible(true);

                if (this.lastUnreadCount === undefined) this.lastUnreadCount = 0;
                if (unreadCalc > this.lastUnreadCount) {
                    this.tweens.add({ targets: this.chatToggleContainer, scale: 1.15, yoyo: true, duration: 250, ease: 'Sine.easeInOut' });
                }
                this.lastUnreadCount = unreadCalc;
            }

            const topY = dynamicTopOffset - this.chatKeyboardOffset;
            const newBottomY = topY - this.chatMaxScroll;

            if (isFirstLoad || isAtBottom) {
                this.tweens.add({
                    targets: this.msgListContainer,
                    y: newBottomY,
                    duration: 250,
                    ease: 'Cubic.easeOut',
                    onUpdate: () => this.updateChatScrollbar()
                });
            } else {
                this.msgListContainer.y = Phaser.Math.Clamp(this.msgListContainer.y, newBottomY, topY);
                this.updateChatScrollbar();
            }
            isFirstLoad = false;
        };

        this.chatUnsubscribe = window.FirebaseTools.onSnapshot(q, (snapshot) => {
            let messages = [];
            snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
            messages.reverse();

            if (messages.length > 100) {
                const isAdmin = GameState.profile && GameState.profile.role === 'admin';
                if (isAdmin && navigator.onLine) {
                    const toDelete = messages.slice(0, messages.length - 100);
                    this.cleanUpOldChats(toDelete);
                }
                messages = messages.slice(messages.length - 100);
            }

            this.chatDataCache = messages;
            this.refreshChatUI();
        }, (error) => {
            console.error("Global Chat Sync Error:", error);
        });
    },

    // --- NEW: Safe Network send + Timeout tracking ---
    async sendChatMessage() {
        const htmlElement = this.chatInput.getChildByID('chatInput');
        if (!htmlElement) return;

        let text = htmlElement.value.trim();
        if (!text || !window.FirebaseAuth || !window.FirebaseAuth.currentUser) return;
        
        text = this.filterBadWords(text);

        const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "Guest";
        const playerLvl = window.getLevelData ? window.getLevelData().level : ((GameState.profile && GameState.profile.level) ? GameState.profile.level : 1);

        // Pre-generate ID for targeted local tracking
        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        const newDocRef = window.FirebaseTools.doc(chatRef);
        const msgId = newDocRef.id;

        let payload = {
            uid: window.FirebaseAuth.currentUser.uid,
            n: playerName,
            lvl: playerLvl, 
            text: text,
            timestamp: window.FirebaseTools.serverTimestamp(),
            pinned: false
        };

        if (this.replyData) {
            payload.replyTo = this.replyData;
        }

        // 1. Instantly show it locally as "Sending..."
        this.trackedMessages = this.trackedMessages || {};
        this.trackedMessages[msgId] = { status: 'sending', payload: payload, time: Date.now() };

        htmlElement.value = ""; 
        htmlElement.blur();
        if (this.replyData) this.cancelReply();

        this.refreshChatUI();
        this.scrollToChat(msgId);

        // 2. Perform Real Connection Ping
        const isReallyOnline = await this.checkRealConnection();
        if (!isReallyOnline) {
            this.trackedMessages[msgId].status = 'error';
            this.refreshChatUI();
            this.showChatError("Offline: Message failed to send.");
            return;
        }

        // 3. Dispatch to Firebase with Timeout Fallback
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000));
        
        try {
            await Promise.race([
                window.FirebaseTools.setDoc(newDocRef, payload),
                timeoutPromise
            ]);
            // On Success, mark it delivered. Firebase onSnapshot overrides this anyway, making it smooth.
            this.trackedMessages[msgId].status = 'sent';
            this.refreshChatUI();
        } catch (err) {
            console.error("Chat send failed or timed out:", err);
            this.trackedMessages[msgId].status = 'error';
            this.refreshChatUI();
        }
    },

    // --- NEW: Retry failed messages functionality ---
    async retrySendMessage(msgId) {
        if (!this.trackedMessages || !this.trackedMessages[msgId]) return;
        
        // Reset state to Sending and bring to bottom
        this.trackedMessages[msgId].status = 'sending';
        this.trackedMessages[msgId].time = Date.now(); 
        this.refreshChatUI();
        this.scrollToChat(msgId);
        
        // Ensure connectivity
        const isReallyOnline = await this.checkRealConnection();
        if (!isReallyOnline) {
            this.trackedMessages[msgId].status = 'error';
            this.refreshChatUI();
            this.showChatError("Still offline! Please check your connection.");
            return;
        }

        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        const docRef = window.FirebaseTools.doc(chatRef, msgId);
        const payload = this.trackedMessages[msgId].payload;
        payload.timestamp = window.FirebaseTools.serverTimestamp(); // Fresh server stamp

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000));

        try {
            await Promise.race([
                window.FirebaseTools.setDoc(docRef, payload),
                timeoutPromise
            ]);
            this.trackedMessages[msgId].status = 'sent';
            this.refreshChatUI();
        } catch (err) {
            console.error("Chat retry failed:", err);
            this.trackedMessages[msgId].status = 'error';
            this.refreshChatUI();
            this.showChatError("Retry failed. Server issue or poor connection.");
        }
    },

    cleanUpOldChats(oldDocs) {
        if (!navigator.onLine) return; 
        
        oldDocs.forEach(doc => {
            const oldDocRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", doc.id);
            window.FirebaseTools.deleteDoc(oldDocRef).catch(e => console.log("Chat auto-cleanup issue:", e));
        });
    },

    timeAgo(firebaseTimestamp) {
        if (!firebaseTimestamp) return "just now";
        const date = typeof firebaseTimestamp.toMillis === 'function' ? firebaseTimestamp.toMillis() : new Date(firebaseTimestamp);
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr ago`;
        const days = Math.floor(hours / 24);
        return `${days} day ago`;
    }

});