// Chat.js
// Attaches Chat functions directly to MenuScene so it shares the Scene context
Object.assign(MenuScene.prototype, {

    createGlobalChat() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        
        this.isChatOpen = false;
        this.lastSeenTime = Date.now();
        this.dividerRendered = false;
        
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

        // Scroll Zone explicitly added BEFORE Pinned Container so Pinned Clicks take priority
        const scrollZone = this.add.zone(this.chatW / 2, 125 + this.chatScrollZoneHeight / 2, this.chatW, this.chatScrollZoneHeight).setInteractive();
        this.chatContainer.add(scrollZone);

        // Pinned container explicitly layered ON TOP of the scroll zone
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

        // Bottom UI Container
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
                    if (event.key === 'Enter') this.sendChatMessage();
                });

                let baseHeight = window.innerHeight;
                let lastShiftDist = 0;

                const handleViewportChange = () => {
                    if (!window.visualViewport) return;
                    
                    const currentViewportHeight = window.visualViewport.height;
                    const keyboardHeightPx = Math.max(0, baseHeight - currentViewportHeight);
                    const scaleFactor = this.scale.gameSize.height / baseHeight;
                    const shiftDist = keyboardHeightPx * scaleFactor;
                    const shiftDelta = shiftDist - lastShiftDist;
                    lastShiftDist = shiftDist;
                    this.chatKeyboardOffset = shiftDist;

                    this.tweens.add({ targets: this.bottomUIContainer, y: -shiftDist, duration: 150, ease: 'Cubic.easeOut' });
                    this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y - shiftDelta, duration: 150, ease: 'Cubic.easeOut', onUpdate: () => this.updateChatScrollbar() });
                };

                htmlElement.addEventListener('focus', () => {
                    baseHeight = window.innerHeight;
                    lastShiftDist = 0;
                    
                    if (window.visualViewport) {
                        window.visualViewport.addEventListener('resize', handleViewportChange);
                        window.visualViewport.addEventListener('scroll', handleViewportChange);
                        handleViewportChange();
                    } else {
                        const shiftDist = h * 0.45;
                        this.chatKeyboardOffset = shiftDist;
                        this.tweens.add({ targets: this.bottomUIContainer, y: -shiftDist, duration: 250, ease: 'Cubic.easeOut' });
                        this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y - shiftDist, duration: 250, ease: 'Cubic.easeOut', onUpdate: () => this.updateChatScrollbar() });
                    }
                });

                htmlElement.addEventListener('blur', () => {
                    if (window.visualViewport) {
                        window.visualViewport.removeEventListener('resize', handleViewportChange);
                        window.visualViewport.removeEventListener('scroll', handleViewportChange);
                    }
                    if (this.isChatOpen) {
                        this.tweens.add({ targets: this.bottomUIContainer, y: 0, duration: 200, ease: 'Cubic.easeOut' });
                        this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y + this.chatKeyboardOffset, duration: 200, ease: 'Cubic.easeOut', onUpdate: () => this.updateChatScrollbar() });
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

        this.updateChatNetworkState = () => {
            const isOnline = navigator.onLine;
            this.offlinePromptGroup.setVisible(!isOnline);
            
            if (!isOnline) {
                if (this.chatInput && this.chatInput.node) this.chatInput.node.style.display = 'none';
                this.chatSendElements.forEach(e => e.setVisible(false));
                this.chatLoginElements.forEach(e => e.setVisible(false));
                if (this.replyData) this.cancelReply();
            } else {
                if (this.isChatOpen && this.chatInput && this.chatInput.node) this.chatInput.node.style.display = 'block';
                this.chatSendElements.forEach(e => e.setVisible(true));
                this.chatLoginElements.forEach(e => e.setVisible(true));
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
        
        this.chatToggleContainer.setScale(0);
        this.tweens.add({
            targets: this.chatToggleContainer,
            scale: 1,
            duration: 400,
            delay: 200, 
            ease: 'Back.out'
        });
    },

    toggleChatWindow() {
        if (this.playSound) this.playSound('sfx_click');
        this.isChatOpen = !this.isChatOpen;
        
        const targetY = this.isChatOpen ? this.chatYVisible : this.chatYHidden;
        this.chatBlocker.setVisible(this.isChatOpen);

        if (this.isChatOpen) {
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
            this.chatToggleContainer.setScale(0);
            this.tweens.add({ targets: this.chatToggleContainer, scale: 1, duration: 300, ease: 'Back.out' });
            
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

    reactToMessage(msg, emoji) {
        if (!navigator.onLine) {
            if (this.showNotification) this.showNotification("Connection lost.", "error");
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

        window.FirebaseTools.updateDoc(docRef, updates);
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
                pinHit.on('pointerdown', () => {
                    if (!navigator.onLine) { if (this.showNotification) this.showNotification("Cannot pin offline.", "error"); return; }
                    const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                    window.FirebaseTools.updateDoc(docRef, { pinned: !isPinned });
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
                delHit.on('pointerdown', () => {
                    if (!navigator.onLine) { if (this.showNotification) this.showNotification("Cannot delete offline.", "error"); return; }
                    const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                    window.FirebaseTools.updateDoc(docRef, { isDeleted: true, pinned: false });
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

        // Function triggered when player clicks a pinned chat banner
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

            // Visual flash overlay to highlight the jumped-to chat message
            let highlight = this.add.rectangle(
                this.chatW / 2, 
                targetMsgY + this.msgYMap[msgId].h / 2, 
                this.chatW - 20, 
                this.msgYMap[msgId].h + 16, 
                0xffffff, 0.35 // Increased visibility slightly
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
            const allMessages = this.chatDataCache; 

            let lastSenderUid = null;
            let lastMessageWasPinned = false;

            // 1. Render Thicker Clickable Banners for Pins
            pinnedMessages.forEach(msg => {
                const bannerHeight = 60; // Thicker banner
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
                
                // Add hover visual feedback
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
                    // Prevent this click from leaking into the scroll-zone dragging logic
                    pointer.event.stopPropagation();
                    this.scrollToChat(msg.id);
                });
                
                this.pinnedContainer.add([pBg, pTxt, pHit]);
                pinnedY += bannerHeight + 8; // Spacer
            });
            
            // Adjust current pinned height and container mask offsets
            this.currentPinnedHeight = pinnedY > 0 ? pinnedY + 10 : 0;
            let dynamicTopOffset = 125 + this.currentPinnedHeight;
            let dynamicScrollZoneHeight = Math.max(50, this.chatScrollZoneHeight - this.currentPinnedHeight);

            this.chatMaskShape.clear();
            this.chatMaskShape.fillStyle(0xffffff);
            this.chatMaskShape.fillRect(this.chatX + 10, this.chatYVisible + dynamicTopOffset, this.chatW - 20, dynamicScrollZoneHeight);

            // 2. Base standard chat bubble logic (now applying to ALL messages inside the list)
            const renderMessage = (msg, targetContainer, startY) => {
                const isMe = currentUserUid && (msg.uid === currentUserUid);
                const isPinned = msg.pinned; 
                let msgTime = msg.timestamp ? (msg.timestamp.toMillis ? msg.timestamp.toMillis() : Date.now()) : Date.now();
                
                if (msgTime > this.lastSeenTime) unreadCalc++;

                if (msgTime > this.lastSeenTime && !this.dividerRendered) {
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
                    fontSize: "30px", fontFamily: "'Anek Bangla', sans-serif", color: displayMsgColor, wordWrap: { width: bubbleMaxWidth - 40, useAdvancedWrap: true }, fontStyle: msg.isDeleted ? "italic" : "normal"
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

                const bubbleH = msgTxt.height + 50 + extraHeight + extraReactionPadding;
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

                if (!msg.isDeleted) {
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

                // Store exact rendered position of each bubble for triggers
                this.msgYMap[msg.id] = { y: bubY, h: bubbleH };

                return bubY + bubbleH + reactionSpace + 15; 
            };

            // 3. Render all normal scrollable messages
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
        });
    },

    sendChatMessage() {
        if (!navigator.onLine) {
            if (this.showNotification) this.showNotification("Connection lost. Cannot send message.", "error");
            return;
        }

        const htmlElement = this.chatInput.getChildByID('chatInput');
        if (!htmlElement) return;

        let text = htmlElement.value.trim();
        if (!text || !window.FirebaseAuth || !window.FirebaseAuth.currentUser) return;
        
        text = this.filterBadWords(text);

        const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "Guest";
        const playerLvl = window.getLevelData ? window.getLevelData().level : ((GameState.profile && GameState.profile.level) ? GameState.profile.level : 1);

        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        
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
        
        window.FirebaseTools.addDoc(chatRef, payload);

        htmlElement.value = ""; 
        htmlElement.blur();
        if (this.replyData) this.cancelReply();
    },

    cleanUpOldChats(oldDocs) {
        if (!navigator.onLine) return; 
        
        oldDocs.forEach(doc => {
            const oldDocRef = window.FirebaseTools.doc(window.FirebaseTools.doc(window.FirebaseDB, "global_chat", doc.id));
            window.FirebaseTools.deleteDoc(oldDocRef).catch(e => console.log("Chat auto-cleanup issue:", e));
        });
    },

    timeAgo(firebaseTimestamp) {
        if (!firebaseTimestamp) return "just now";
        const date = firebaseTimestamp.toDate ? firebaseTimestamp.toDate() : new Date(firebaseTimestamp);
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