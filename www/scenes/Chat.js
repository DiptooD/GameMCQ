// Chat.js
// Attaches Chat functions directly to MenuScene so it shares the Scene context
Object.assign(MenuScene.prototype, {

    checkRealConnection() {
        return new Promise((resolve) => {
            if (!navigator.onLine) {
                resolve(false);
                return;
            }
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3500); 
            
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

    cullChatMessages() {
        if (!this.msgListContainer || !this.isChatOpen) return;

        const dynamicTopOffset = 125 + this.currentPinnedHeight;
        const visibleTop = dynamicTopOffset - this.msgListContainer.y; 
        const visibleBottom = visibleTop + this.chatScrollZoneHeight;
        
        const buffer = 400; 

        this.msgListContainer.each(child => {
            const checkY = child.trueY !== undefined ? child.trueY : child.y;
            if (checkY < visibleTop - buffer || checkY > visibleBottom + buffer) {
                child.setVisible(false);
            } else {
                child.setVisible(true);
            }
        });

        // Toggle "Scroll to Bottom" button
        if (this.scrollToBottomBtn) {
            let topY = dynamicTopOffset - this.chatKeyboardOffset;
            let bottomY = topY - this.chatMaxScroll;
            // If scrolled up more than 150px from the bottom
            if (this.msgListContainer.y > bottomY + 150) {
                this.scrollToBottomBtn.setVisible(true);
            } else {
                this.scrollToBottomBtn.setVisible(false);
            }
        }
    },

    createGlobalChat() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        
        this.isChatOpen = false;
        this.lastSeenTime = Date.now();
        this.dividerRendered = false;
        this.trackedMessages = this.trackedMessages || {};
        this.msgTimestamps = []; 
        
        if (window.FirebaseAuth && window.FirebaseAuth.currentUser) {
            const uid = window.FirebaseAuth.currentUser.uid;
            const userRef = window.FirebaseTools.doc(window.FirebaseDB, "players", uid);
            
            window.FirebaseTools.getDoc(userRef).then(docSnap => {
                if (docSnap.exists() && docSnap.data().chatLastSeenTime) {
                    this.lastSeenTime = docSnap.data().chatLastSeenTime;
                    if (this.refreshChatUI) this.refreshChatUI();
                }
            }).catch(e => console.log("Chat DB Load Error:", e));
        }
        
        this.replyData = null;
        this.chatKeyboardOffset = 0; 
        this.currentPinnedHeight = 0; 
        
        this.chatW = w - 20; 
        this.chatH = h * 0.90; 
        
        this.chatX = (w - this.chatW) / 2; 
        this.chatYVisible = (h - this.chatH) / 2; 
        this.chatYHidden = h + 300; 

        this.chatBlocker = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.8)
            .setDepth(8999).setVisible(false).setInteractive();
            
        this.chatBlocker.on('pointerdown', () => {
            if (this.isChatOpen) this.toggleChatWindow();
        });

        this.chatContainer = this.add.container(this.chatX, this.chatYHidden).setDepth(9000).setVisible(false);
        
        // Premium Panel Background
        const panelBg = this.add.graphics();
        panelBg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 0.98);
        panelBg.fillRoundedRect(0, 0, this.chatW, this.chatH, 24);
        panelBg.lineStyle(2, 0x334155, 1);
        panelBg.strokeRoundedRect(0, 0, this.chatW, this.chatH, 24);
        panelBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.chatW, this.chatH), Phaser.Geom.Rectangle.Contains);

        const title = this.add.text(this.chatW / 2, 55, "গ্লোবাল CHAT", {
            fontSize: "42px", fontFamily: "'Anek Bangla'", color: "#38bdf8", padding: { y: 4 }, fontStyle: "bold",
            shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);
        
        const headerDiv = this.add.rectangle(this.chatW / 2, 115, this.chatW - 40, 2, 0x334155, 1);

        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0xef4444, 0.15);
        closeBtnBg.fillRoundedRect(this.chatW - 75, 25, 55, 55, 16);
        closeBtnBg.lineStyle(2, 0xef4444, 0.8);
        closeBtnBg.strokeRoundedRect(this.chatW - 75, 25, 55, 55, 16);
        
        const closeIcon = this.add.text(this.chatW - 47.5, 52.5, "✖", { fontSize: "28px", color: "#f87171", fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(this.chatW - 47.5, 52.5, 80, 80, 0, 0).setInteractive({useHandCursor:true});
        
        closeHit.on('pointerdown', () => this.toggleChatWindow());
        closeHit.on('pointerover', () => closeIcon.setScale(1.1));
        closeHit.on('pointerout', () => closeIcon.setScale(1));

        this.chatContainer.add([panelBg, title, headerDiv, closeBtnBg, closeIcon, closeHit]);

        const inputY = this.chatH - 60; 
        this.chatScrollZoneHeight = inputY - 55 - 125;

        this.msgListContainer = this.add.container(0, 125);
        this.chatContainer.add(this.msgListContainer);

        this.chatMaskShape = this.make.graphics();
        this.chatMaskShape.fillStyle(0xffffff);
        this.chatMaskShape.fillRect(this.chatX + 5, this.chatYVisible + 125, this.chatW - 10, this.chatScrollZoneHeight); 
        this.chatMaskShape.y = this.chatYHidden - this.chatYVisible; 
        this.msgListContainer.setMask(this.chatMaskShape.createGeometryMask());

        this.chatMaxScroll = 0;
        
        this.chatScrollbarBg = this.add.rectangle(this.chatW - 8, 125 + this.chatScrollZoneHeight / 2, 6, this.chatScrollZoneHeight, 0x000000, 0.3);
        this.chatScrollbarThumb = this.add.rectangle(this.chatW - 8, 125, 6, 50, 0x94a3b8, 0.8).setOrigin(0.5, 0);
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
            this.cullChatMessages();
        };

        const scrollZone = this.add.zone(this.chatW / 2, 125 + this.chatScrollZoneHeight / 2, this.chatW, this.chatScrollZoneHeight).setInteractive();
        this.chatContainer.add(scrollZone);

        this.pinnedContainer = this.add.container(0, 125);
        this.chatContainer.add(this.pinnedContainer);

        // --- NEW: Scroll to Bottom Button ---
        this.scrollToBottomBtn = this.add.container(this.chatW - 45, inputY - 70).setVisible(false).setDepth(999);
        const fabBg = this.add.circle(0, 0, 25, 0x38bdf8, 0.9);
        fabBg.setStrokeStyle(2, 0xffffff, 1);
        const fabIcon = this.add.text(0, 0, "⬇️", { fontSize: "24px" }).setOrigin(0.5);
        const fabHit = this.add.circle(0, 0, 35).setInteractive({useHandCursor: true});
        
        fabHit.on('pointerdown', () => {
            if (this.playSound) this.playSound('sfx_click', 0.5);
            let dynamicTopOffset = 125 + this.currentPinnedHeight;
            let topY = dynamicTopOffset - this.chatKeyboardOffset;
            let bottomY = topY - this.chatMaxScroll;
            
            this.tweens.add({
                targets: this.msgListContainer,
                y: bottomY,
                duration: 400,
                ease: 'Cubic.easeOut',
                onUpdate: () => this.updateChatScrollbar()
            });
        });
        this.scrollToBottomBtn.add([fabBg, fabIcon, fabHit]);
        this.chatContainer.add(this.scrollToBottomBtn);

        // --- INTERACTION TRACKING ---
        let dragStartY = 0, containerStartY = 0, isDraggingChat = false;
        let scrollYTracker = [], hitStartX = 0, hitStartY = 0, hitStartTime = 0;
        let longPressTimer = null, hasLongPressed = false;
        
        this.lastChatTapTime = 0;
        this.swipeMode = false;
        this.scrollMode = false;
        this.activeSwipeHit = null;

        scrollZone.on('pointerdown', (pointer) => {
            dragStartY = pointer.y;
            containerStartY = this.msgListContainer.y;
            isDraggingChat = true;
            hasLongPressed = false; 
            scrollYTracker = [{y: pointer.y, time: this.time.now}];
            
            this.tweens.killTweensOf(this.msgListContainer);

            hitStartX = pointer.x; hitStartY = pointer.y; hitStartTime = this.time.now;
            this.swipeMode = false; this.scrollMode = false; this.activeSwipeHit = null;

            // Double Tap To React
            if (this.lastChatTapTime && (hitStartTime - this.lastChatTapTime) < 300) {
                let localX = pointer.x - this.chatContainer.x;
                let localY = pointer.y - this.chatContainer.y - this.msgListContainer.y;
                
                for (let i = this.msgListContainer.list.length - 1; i >= 0; i--) {
                    let child = this.msgListContainer.list[i];
                    if (child.isInteractHit && !child.isError) {
                        let left = child.x - child.width/2, right = child.x + child.width/2;
                        let top = child.y - child.height/2, bottom = child.y + child.height/2;
                        
                        if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
                            this.reactToMessage(child.msgData, '❤️');
                            if (longPressTimer) { longPressTimer.remove(); longPressTimer = null; }
                            isDraggingChat = false; this.lastChatTapTime = 0;
                            return; 
                        }
                    }
                }
            }
            this.lastChatTapTime = hitStartTime;

            if (longPressTimer) { longPressTimer.remove(); longPressTimer = null; }

            // Long Press Timer for Menu
            longPressTimer = this.time.delayedCall(400, () => {
                let dist = Phaser.Math.Distance.Between(hitStartX, hitStartY, pointer.x, pointer.y);
                if (dist < 15 && isDraggingChat && !this.swipeMode) {
                    hasLongPressed = true;
                    isDraggingChat = false; 
                    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(40); 

                    let localX = pointer.x - this.chatContainer.x;
                    let localY = pointer.y - this.chatContainer.y - this.msgListContainer.y;
                    
                    for (let i = this.msgListContainer.list.length - 1; i >= 0; i--) {
                        let child = this.msgListContainer.list[i];
                        if (child.isInteractHit) {
                            let left = child.x - child.width/2, right = child.x + child.width/2;
                            let top = child.y - child.height/2, bottom = child.y + child.height/2;
                            
                            if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
                                if (child.isError) this.retrySendMessage(child.msgData.id);
                                else this.showChatActionMenu(child.msgData, pointer.x, pointer.y);
                                return; 
                            }
                        }
                    }
                }
            });
        });

        scrollZone.on('pointermove', (pointer) => {
            if (pointer.isDown && isDraggingChat) {
                let dist = Phaser.Math.Distance.Between(hitStartX, hitStartY, pointer.x, pointer.y);
                if (dist > 15 && longPressTimer) { longPressTimer.remove(); longPressTimer = null; }

                let deltaX = pointer.x - hitStartX;
                let deltaY = pointer.y - hitStartY;

                if (!this.swipeMode && !this.scrollMode) {
                    if (Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY)) {
                        this.swipeMode = true;
                        let localX = hitStartX - this.chatContainer.x;
                        let localY = hitStartY - this.chatContainer.y - this.msgListContainer.y;
                        
                        for (let i = this.msgListContainer.list.length - 1; i >= 0; i--) {
                            let child = this.msgListContainer.list[i];
                            if (child.isInteractHit && !child.isError) {
                                let left = child.x - child.width/2; let right = child.x + child.width/2;
                                let top = child.y - child.height/2; let bottom = child.y + child.height/2;
                                if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
                                    this.activeSwipeHit = child; break;
                                }
                            }
                        }
                    } else if (Math.abs(deltaY) > 15) {
                        this.scrollMode = true;
                    }
                }

                if (this.scrollMode) {
                    let dynamicTopOffset = 125 + this.currentPinnedHeight;
                    let topY = dynamicTopOffset - this.chatKeyboardOffset;
                    let bottomY = topY - this.chatMaxScroll;
                    let newY = containerStartY + deltaY;

                    if (newY > topY) {
                        newY = topY + (newY - topY) * 0.35;
                        // Infinite Scroll loader trigger
                        if (newY > topY + 60 && this.loadOlderMessages && !this.isLoadingHistory && this.chatDataCache.length >= 30) {
                            this.loadOlderMessages();
                        }
                    } else if (newY < bottomY) {
                        newY = bottomY + (newY - bottomY) * 0.35;
                    }

                    this.msgListContainer.y = newY;
                    scrollYTracker.push({y: pointer.y, time: this.time.now});
                    if (scrollYTracker.length > 5) scrollYTracker.shift();
                    
                    this.updateChatScrollbar();

                } else if (this.swipeMode && this.activeSwipeHit) {
                    let isMe = this.activeSwipeHit.isMe;
                    let clampX = isMe ? Phaser.Math.Clamp(deltaX, -80, 0) : Phaser.Math.Clamp(deltaX, 0, 80);
                    
                    this.activeSwipeHit.visuals.forEach(v => {
                        if (v.baseX === undefined) v.baseX = v.x;
                        v.x = v.baseX + clampX;
                    });
                    this.activeSwipeHit.currentDelta = clampX;
                }
            }
        });

        const stopChatDrag = (pointer) => {
            if (longPressTimer) { longPressTimer.remove(); longPressTimer = null; }
            if (hasLongPressed) { hasLongPressed = false; return; }

            if (this.swipeMode && this.activeSwipeHit) {
                let hit = this.activeSwipeHit;
                let swiped = Math.abs(hit.currentDelta) >= 50;

                hit.visuals.forEach(v => {
                    if (v.baseX !== undefined) this.tweens.add({ targets: v, x: v.baseX, duration: 250, ease: 'Back.out' });
                });

                if (swiped) this.initiateReply(hit.msgData);
            }

            if (isDraggingChat && this.scrollMode) {
                let velocity = 0;
                if (scrollYTracker.length > 1) {
                    let last = scrollYTracker[scrollYTracker.length - 1];
                    let timeSinceLastMove = this.time.now - last.time;
                    if (timeSinceLastMove < 100) {
                        let first = scrollYTracker[0];
                        let dt = last.time - first.time, dy = last.y - first.y;
                        if (dt > 0 && dt < 150) velocity = dy / dt; 
                    }
                }

                let targetY = this.msgListContainer.y;
                let duration = 300;
                let easeType = 'Quart.easeOut';

                if (Math.abs(velocity) > 0.2) {
                    let amplitude = velocity * 750; 
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

            isDraggingChat = false; this.swipeMode = false; this.scrollMode = false; this.activeSwipeHit = null;
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

        const bottomBg = this.add.rectangle(this.chatW / 2, this.chatH - 53, this.chatW, 106, 0x020617, 0.98);
        this.bottomUIContainer.add(bottomBg);

        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;

        this.replyUI = this.add.container(this.chatW / 2, inputY - 65).setVisible(false);
        const replyBg = this.add.graphics();
        replyBg.fillStyle(0x1e293b, 0.95);
        replyBg.fillRoundedRect(- (this.chatW - 60)/2, -20, this.chatW - 60, 40, 12);
        replyBg.lineStyle(1.5, 0x334155, 1);
        replyBg.strokeRoundedRect(- (this.chatW - 60)/2, -20, this.chatW - 60, 40, 12);
        this.replyTxt = this.add.text(- (this.chatW - 60)/2 + 20, 0, "", { fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#38bdf8" }).setOrigin(0, 0.5);
        const replyCancel = this.add.text((this.chatW - 60)/2 - 25, 0, "✖", { fontSize: "24px", color: "#f87171", fontStyle: "bold" }).setOrigin(0.5).setInteractive({useHandCursor:true});
        
        this.cancelReply = () => {
            this.replyData = null;
            this.replyUI.setVisible(false);
        };
        replyCancel.on('pointerdown', () => this.cancelReply());
        this.replyUI.add([replyBg, this.replyTxt, replyCancel]);
        this.bottomUIContainer.add(this.replyUI);

        this.chatSendElements = [];
        this.chatLoginElements = [];

        this.updateTypingStatus = (isTyping) => {
            if (!navigator.onLine || !window.FirebaseAuth || !window.FirebaseAuth.currentUser) return;
            const uid = window.FirebaseAuth.currentUser.uid;
            const docRef = window.FirebaseTools.doc(window.FirebaseDB, "chat_meta", "typing");
            let payload = {};
            payload[uid] = isTyping ? { n: GameState.profile.n, t: Date.now() } : { t: 0 };
            window.FirebaseTools.setDoc(docRef, payload, { merge: true }).catch(()=>{});
        };

        if (isConnected) {
            const inputHTML = `<input type="text" id="chatInput" autocomplete="off" maxlength="200" placeholder="Type a message..." style="box-sizing: border-box; width: ${this.chatW - 100}px; height: 60px; padding: 0 25px; font-family: 'Anek Bangla', sans-serif; font-size: 24px; border-radius: 30px; border: 2px solid #334155; outline: none; background: #0f172a; color: #f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">`;
                
            this.chatInput = this.add.dom(10 + (this.chatW - 100)/2, inputY).createFromHTML(inputHTML);
            this.bottomUIContainer.add(this.chatInput);
            
            if (this.chatInput.node) this.chatInput.node.style.display = 'none';

            const sendBtnBg = this.add.circle(this.chatW - 45, inputY, 28, 0x38bdf8);
            const sendBtnTxt = this.add.text(this.chatW - 45, inputY, "➤", { fontSize: "28px", color: "#ffffff" }).setOrigin(0.5);
            const sendHit = this.add.circle(this.chatW - 45, inputY, 35).setInteractive({useHandCursor: true});
            
            sendHit.on('pointerdown', () => {
                this.tweens.add({ targets: sendBtnBg, scale: 0.8, yoyo: true, duration: 100 });
                this.sendChatMessage();
            });
            
            this.chatSendElements = [sendBtnBg, sendBtnTxt, sendHit];
            this.bottomUIContainer.add(this.chatSendElements);
            
            const htmlElement = this.chatInput.getChildByID('chatInput');
            
            if (htmlElement) {
                let typingTimer = null;

                htmlElement.addEventListener('input', () => {
                    this.updateTypingStatus(true);
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => {
                        this.updateTypingStatus(false);
                    }, 2500);
                });

                htmlElement.addEventListener('keydown', (e) => e.stopPropagation());
                htmlElement.addEventListener('keypress', (event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') {
                        this.updateTypingStatus(false);
                        clearTimeout(typingTimer);
                        this.tweens.add({ targets: sendBtnBg, scale: 0.8, yoyo: true, duration: 100 });
                        this.sendChatMessage();
                        htmlElement.blur(); 
                    }
                });

                this.shiftChatUIUp = (shiftDist) => {
                    shiftDist = Phaser.Math.Clamp(shiftDist, 100, this.cameras.main.height * 0.55);
                    this.chatKeyboardOffset = shiftDist;

                    this.tweens.killTweensOf(this.bottomUIContainer);
                    this.tweens.add({ targets: this.bottomUIContainer, y: -shiftDist, duration: 250, ease: 'Cubic.easeOut' });

                    this.tweens.killTweensOf(this.msgListContainer);
                    this.tweens.add({
                        targets: this.msgListContainer,
                        y: this.msgListContainer.y - shiftDist,
                        duration: 250,
                        ease: 'Cubic.easeOut',
                        onUpdate: () => this.updateChatScrollbar()
                    });
                };

                this.resetChatUI = () => {
                    if (!this.isChatOpen) return;
                    
                    this.tweens.killTweensOf(this.bottomUIContainer);
                    this.tweens.add({ targets: this.bottomUIContainer, y: 0, duration: 250, ease: 'Cubic.easeOut' });

                    this.tweens.killTweensOf(this.msgListContainer);
                    this.tweens.add({
                        targets: this.msgListContainer,
                        y: this.msgListContainer.y + this.chatKeyboardOffset,
                        duration: 250,
                        ease: 'Cubic.easeOut',
                        onUpdate: () => this.updateChatScrollbar()
                    });

                    this.chatKeyboardOffset = 0;
                };

                window.addEventListener('keyboardWillShow', (e) => {
                    let scaleRatio = this.cameras.main.height / window.innerHeight;
                    let exactShift = e.keyboardHeight * scaleRatio;
                    this.shiftChatUIUp(exactShift);
                });

                window.addEventListener('keyboardWillHide', () => {
                    this.resetChatUI();
                    if (htmlElement) htmlElement.blur(); 
                });

                htmlElement.addEventListener('focus', () => {
                    htmlElement.style.border = "2px solid #38bdf8";
                    if (!window.cordova || !window.Keyboard) {
                        setTimeout(() => htmlElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
                        this.shiftChatUIUp(this.cameras.main.height * 0.35); 
                    }
                });

                htmlElement.addEventListener('blur', () => {
                    htmlElement.style.border = "2px solid #334155";
                    if (!window.cordova || !window.Keyboard) {
                        this.resetChatUI();
                        setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
                    }
                });
            }
        } else {
            const promptTxt = this.add.text(this.chatW / 2, inputY - 60, "Please login to chat", { fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#94a3b8" }).setOrigin(0.5);
            const loginBg = this.add.graphics();
            loginBg.fillStyle(0x38bdf8, 1);
            loginBg.fillRoundedRect(this.chatW / 2 - 150, inputY - 25, 300, 50, 25);
            const loginTxt = this.add.text(this.chatW / 2, inputY, "Connect Google", { fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
            const loginHit = this.add.rectangle(this.chatW / 2, inputY, 300, 50, 0x000000, 0).setInteractive({useHandCursor: true});

            loginHit.on('pointerdown', () => {
                if (window.isAuthenticating) return; 
                if (!navigator.onLine) {
                    if (this.showNotification) this.showNotification("Connection lost. Cannot connect.", "error");
                    return;
                }
                window.isAuthenticating = true;
                if (this.playSound) this.playSound('sfx_click');

                let dotCount = 0;
                loginTxt.setText("Connecting.");
                let dotTimer = this.time.addEvent({
                    delay: 400, loop: true, callback: () => {
                        dotCount = (dotCount + 1) % 4;
                        loginTxt.setText("Connecting" + ".".repeat(dotCount));
                    }
                });

                if (window.signInWithGoogle) {
                    window.signInWithGoogle().then(() => {
                        window.isAuthenticating = false;
                        if (dotTimer) dotTimer.remove();
                        this.scene.restart();
                    }).catch(() => {
                        window.isAuthenticating = false;
                        if (dotTimer) dotTimer.remove();
                        loginTxt.setText("Connect Google");
                    });
                } else {
                    window.isAuthenticating = false;
                    if (dotTimer) dotTimer.remove();
                    loginTxt.setText("Connect Google");
                }
            });

            this.chatLoginElements = [promptTxt, loginBg, loginTxt, loginHit];
            this.bottomUIContainer.add(this.chatLoginElements);
        }

        this.offlinePromptGroup = this.add.container(0, 0).setVisible(false);
        const offlineTxt = this.add.text(this.chatW / 2, inputY, "Offline Mode", { 
            fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#f87171", fontStyle: "bold" 
        }).setOrigin(0.5);
        this.offlinePromptGroup.add(offlineTxt);
        this.bottomUIContainer.add(this.offlinePromptGroup);

        this.updateChatNetworkState = async () => {
            let isOnline = navigator.onLine;
            if (!isOnline) {
                this._applyNetworkState(false);
                return;
            }
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
        this.listenToTyping();
    },

    listenToTyping() {
        if (!window.FirebaseDB || !window.FirebaseTools) return;
        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "chat_meta", "typing");

        if (!this.typingIndicatorContainer) {
            this.typingIndicatorContainer = this.add.container(40, this.chatH - 120).setDepth(10).setAlpha(0);
            
            const bg = this.add.graphics();
            bg.fillStyle(0x1e293b, 0.9);
            bg.fillRoundedRect(0, 0, 70, 34, 17);
            
            this.dot1 = this.add.circle(18, 17, 4, 0x38bdf8);
            this.dot2 = this.add.circle(35, 17, 4, 0x38bdf8);
            this.dot3 = this.add.circle(52, 17, 4, 0x38bdf8);
            
            this.typingNameTxt = this.add.text(80, 17, "", {
                fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#94a3b8", fontStyle: "italic"
            }).setOrigin(0, 0.5);

            this.typingIndicatorContainer.add([bg, this.dot1, this.dot2, this.dot3, this.typingNameTxt]);
            this.chatContainer.add(this.typingIndicatorContainer);

            this.tweens.add({ targets: this.dot1, y: 12, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 0 });
            this.tweens.add({ targets: this.dot2, y: 12, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 150 });
            this.tweens.add({ targets: this.dot3, y: 12, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
        }

        this.typingUnsubscribe = window.FirebaseTools.onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const now = Date.now();
                let typists = [];
                const myUid = window.FirebaseAuth.currentUser ? window.FirebaseAuth.currentUser.uid : null;
                
                Object.keys(data).forEach(uid => {
                    if (uid !== myUid && data[uid].t > now - 4000) {
                        if (data[uid].n) typists.push(data[uid].n);
                    }
                });

                if (typists.length === 0) {
                    this.tweens.add({ targets: this.typingIndicatorContainer, alpha: 0, duration: 200 });
                } else {
                    let text = typists.length === 1 ? `${typists[0]} is typing...` : `${typists.length} people typing...`;
                    this.typingNameTxt.setText(text);
                    this.tweens.add({ targets: this.typingIndicatorContainer, alpha: 1, duration: 200 });
                }
            }
        });
    },

    showChatError(msg) {
        if (this.chatErrBanner) {
            this.tweens.killTweensOf(this.chatErrBanner);
            this.chatErrBanner.destroy();
        }

        const yPos = this.chatH - 130;
        this.chatErrBanner = this.add.container(this.chatW / 2, yPos).setDepth(9999);

        const bg = this.add.graphics();
        bg.fillStyle(0xef4444, 0.95);
        bg.fillRoundedRect(-180, -22.5, 360, 45, 12);
        bg.lineStyle(2, 0xfca5a5, 1);
        bg.strokeRoundedRect(-180, -22.5, 360, 45, 12);

        const txt = this.add.text(0, 0, msg, {
            fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold"
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
        shadow.fillStyle(0x000000, 0.4);
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
        }).setOrigin(0.5) .setAlpha(0.90);
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

        const showBackground = !this.isChatOpen;
        
        if (this.scrollingBg) this.scrollingBg.setVisible(showBackground);
        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                if (layer.group) {
                    layer.group.children.iterate(child => {
                        if (child) child.setVisible(showBackground);
                    });
                }
            });
        }
        
        if (this.hangarContainer) this.hangarContainer.setVisible(showBackground);
        if (this.titleBird) this.titleBird.setVisible(showBackground);

        if (this.isChatOpen) {
            this.updateChatNetworkState(); 
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
        if (!uid) return "#94a3b8";
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
        if (this.playSound) this.playSound('sfx_tick');
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
            if (this.playSound) this.playSound('sfx_tick', 0.5);
        } else {
            updates[`reactions.${uid}`] = emoji; 
            if (this.playSound) this.playSound('sfx_powerup', 0.5);
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
                fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#fca5a5" 
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
        const q = window.FirebaseTools.query(chatRef, window.FirebaseTools.orderBy("timestamp", "desc"), window.FirebaseTools.limit(30));
        
        let isFirstLoad = true;
        
        this.chatDataCache = []; 
        this.liveMessages = [];
        this.historyMessages = [];
        this.isLoadingHistory = false;

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
                0xffffff, 0.25 
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
            const myName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "Guest";

            const pinnedMessages = this.chatDataCache.filter(m => m.pinned);
            
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
                            timestamp: { toMillis: () => tm.time } 
                        });
                    }
                });
            }

            const getTime = (msg) => {
                if (msg.isLocalOnly) return this.trackedMessages[msg.id].time;
                if (msg.timestamp && typeof msg.timestamp.toMillis === 'function') return msg.timestamp.toMillis();
                return Date.now(); 
            };
            allMessages.sort((a, b) => getTime(a) - getTime(b));

            let lastSenderUid = null;
            let lastMessageWasPinned = false;
            let lastMessageDateString = null; // Track day changes

            // Render Pinned
            pinnedMessages.forEach(msg => {
                const bannerHeight = 60;
                const currentYPos = pinnedY; 
                const yCenter = currentYPos + bannerHeight / 2;
                
                const pBg = this.add.graphics();
                const drawPinnedBg = (isHovered) => {
                    pBg.clear();
                    pBg.fillStyle(isHovered ? 0x1E293B : 0x0F172A, 0.95); 
                    pBg.fillRoundedRect(10, currentYPos, this.chatW - 20, bannerHeight, 8);
                    pBg.lineStyle(1.5, isHovered ? 0x475569 : 0x334155, 1);
                    pBg.strokeRoundedRect(10, currentYPos, this.chatW - 20, bannerHeight, 8);
                    pBg.fillStyle(0x38bdf8, 1);
                    pBg.fillRoundedRect(10, currentYPos, 5, bannerHeight, { tl: 8, bl: 8, tr: 0, br: 0 });
                };
                drawPinnedBg(false);
                
                const shortText = msg.text.length > 35 ? msg.text.substring(0, 35) + "..." : msg.text;
                
                const pTxt = this.add.text(28, yCenter, `📌 ${msg.n}: ${shortText}`, {
                    fontSize: "22px", fontFamily: "'Anek Bangla', sans-serif", color: "#F8FAFC", fontStyle: "bold"
                }).setOrigin(0, 0.5);
                
                const pHit = this.add.rectangle(this.chatW/2, yCenter, this.chatW - 20, bannerHeight, 0, 0)
                    .setInteractive({useHandCursor: true});
                
                pHit.on('pointerover', () => drawPinnedBg(true));
                pHit.on('pointerout', () => drawPinnedBg(false));
                pHit.on('pointerdown', (pointer) => {
                    pointer.event.stopPropagation();
                    this.scrollToChat(msg.id);
                });
                
                this.pinnedContainer.add([pBg, pTxt, pHit]);
                pinnedY += bannerHeight + 8; 
            });            
            
            this.currentPinnedHeight = pinnedY > 0 ? pinnedY + 10 : 0;
            let dynamicTopOffset = 100 + this.currentPinnedHeight;
            let dynamicScrollZoneHeight = Math.max(50, this.chatScrollZoneHeight - this.currentPinnedHeight);

            this.chatMaskShape.clear();
            this.chatMaskShape.fillStyle(0xffffff);
            this.chatMaskShape.fillRect(this.chatX + 5, this.chatYVisible + dynamicTopOffset, this.chatW - 10, dynamicScrollZoneHeight);

            // Format precise time
            const formatTime = (ts) => {
                const d = new Date(ts);
                let hrs = d.getHours();
                const mins = d.getMinutes().toString().padStart(2, '0');
                const ampm = hrs >= 12 ? 'PM' : 'AM';
                hrs = hrs % 12;
                hrs = hrs ? hrs : 12; 
                return `${hrs}:${mins} ${ampm}`;
            };
            
            // Format nice relative day string
            const getRelativeDateString = (ts) => {
                const d = new Date(ts);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                if (d.toDateString() === today.toDateString()) return "Today";
                if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
                
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            };

            const renderMessage = (msg, targetContainer, startY) => {
                const isMe = currentUserUid && (msg.uid === currentUserUid);
                const isPinned = msg.pinned; 
                let msgTime = msg.timestamp ? (typeof msg.timestamp.toMillis === 'function' ? msg.timestamp.toMillis() : Date.now()) : Date.now();
                
                if (msgTime > this.lastSeenTime && !msg.isLocalOnly) unreadCalc++;

                // Date Divider
                const msgDateString = getRelativeDateString(msgTime);
                if (msgDateString !== lastMessageDateString) {
                    lastMessageDateString = msgDateString;
                    lastSenderUid = null;
                    
                    const divCont = this.add.container(this.chatW / 2, startY + 15);
                    const divBg = this.add.graphics();
                    divBg.fillStyle(0x1e293b, 0.8);
                    divBg.fillRoundedRect(-60, -14, 120, 28, 14);
                    
                    const divTxt = this.add.text(0, 0, msgDateString, { 
                        fontSize: "14px", fontFamily: "'Anek Bangla'", color: "#94a3b8", fontStyle: 'bold'
                    }).setOrigin(0.5);
                    
                    divCont.add([divBg, divTxt]);
                    divCont.trueY = startY + 15; 
                    targetContainer.add(divCont);
                    startY += 40;
                }

                // New Message Divider
                if (msgTime > this.lastSeenTime && !this.dividerRendered && !msg.isLocalOnly) {
                    this.dividerRendered = true;
                    lastSenderUid = null; 
                    
                    const divCont = this.add.container(this.chatW / 2, startY + 15);
                    const divLine = this.add.rectangle(0, 0, this.chatW - 80, 2, 0xef4444, 0.5);
                    const divTxt = this.add.text(0, 0, "New Messages", { 
                        fontSize: "16px", fontFamily: "'Anek Bangla'", color: "#ef4444", backgroundColor: "#020617", padding: {x: 12} 
                    }).setOrigin(0.5);
                    divCont.add([divLine, divTxt]);
                    
                    divCont.trueY = startY + 15; 
                    targetContainer.add(divCont);
                    startY += 40;
                }

                const isConsecutive = (lastSenderUid === msg.uid) && (lastMessageWasPinned === isPinned);
                lastSenderUid = msg.uid;
                lastMessageWasPinned = isPinned;

                let topPadding = isConsecutive ? 5 : 30;
                const bubY = startY + topPadding; 

                const addItems = (items) => {
                    let arr = Array.isArray(items) ? items : [items];
                    arr.forEach(item => {
                        item.trueY = bubY; 
                        targetContainer.add(item);
                    });
                };

                let displayMsgText = msg.text;
                let displayMsgColor = "#f8fafc";
                let bubBgHex;
                let bubAlpha = 0.95;

                const nameColorHexStr = isPinned ? "#ef4444" : (isMe ? "#38bdf8" : this.getDeterministicColor(msg.uid));
                const baseCol = Phaser.Display.Color.HexStringToColor(nameColorHexStr);

                let isMentioned = false;
                if (!isMe && myName !== "Guest" && msg.text) {
                    const mentionPattern = new RegExp(`@${myName}\\b`, 'i');
                    if (mentionPattern.test(msg.text)) isMentioned = true;
                }
                
                if (msg.isDeleted) {
                    displayMsgText = "🚫 This message was deleted.";
                    displayMsgColor = "#64748b";
                    bubBgHex = 0x0f172a; 
                    bubAlpha = 0.6;
                } else if (isMentioned) {
                    bubBgHex = 0x451a03; // Amber/Gold Dark Glow
                    if (msgTime > this.lastSeenTime && !msg.isLocalOnly) {
                        if (!this.pingedMessages) this.pingedMessages = new Set();
                        if (!this.pingedMessages.has(msg.id)) {
                            this.pingedMessages.add(msg.id);
                            if (this.playSound) this.playSound('sfx_tick', 0.8);
                        }
                    }
                } else {
                    bubBgHex = isMe ? 0x0c4a6e : 0x1e293b; 
                }

                // AVATAR RENDERING
                const hasAvatar = !isConsecutive;
                const avatarSize = 36;
                let avatarIcon = msg.avatar || "👤"; 
                let avatarX = isMe ? this.chatW - 25 : 25;

                const bubbleMaxWidth = this.chatW * 0.78;
                let extraHeight = (msg.replyTo && !msg.isDeleted) ? 42 : 0;
                let replyTxtObj = null;
                
                if (msg.replyTo && !msg.isDeleted) {
                    let replySnippet = msg.replyTo.text.length > 25 ? msg.replyTo.text.substring(0, 25) + "..." : msg.replyTo.text;
                    replyTxtObj = this.add.text(0, 0, `➥ ${msg.replyTo.n}: ${replySnippet}`, { 
                        fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#7dd3fc", fontStyle: "italic", 
                        backgroundColor: "#00000044", padding: {x: 10, y: 6}
                    });
                }

                const msgTxt = this.add.text(0, 0, displayMsgText, { 
                    fontSize: "26px", fontFamily: "'Anek Bangla', sans-serif", color: displayMsgColor, wordWrap: { width: bubbleMaxWidth - 30, useAdvancedWrap: true }, fontStyle: msg.isDeleted ? "italic" : "normal", lineSpacing: 6
                });

                const timeStr = formatTime(msgTime);
                const timeTxt = this.add.text(0, 0, timeStr, { 
                    fontSize: "14px", fontFamily: "Arial", color: "#94a3b8" 
                });

                if (hasAvatar) {
                    const avatarBg = this.add.circle(avatarX, bubY + avatarSize/2, avatarSize/2, 0x0f172a);
                    avatarBg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(nameColorHexStr).color, 0.8);
                    const avTxt = this.add.text(avatarX, bubY + avatarSize/2, avatarIcon, { fontSize: "22px" }).setOrigin(0.5);
                    addItems([avatarBg, avTxt]);

                    const nameTxt = this.add.text(0, bubY - 20, (isPinned ? "📌 " : "") + (msg.n || "Guest"), { 
                        fontSize: "20px", fontFamily: "'Anek Bangla'", color: nameColorHexStr, fontStyle: "bold"
                    }).setOrigin(0, 0.5);

                    let nameX = isMe ? this.chatW - avatarSize - 25 - nameTxt.width : 25 + avatarSize + 10;
                    nameTxt.x = nameX;
                    addItems(nameTxt); 

                    if (msg.lvl) {
                        const lvlTxt = this.add.text(0, 0, `Lvl ${msg.lvl}`, {
                            fontSize: "12px", fontFamily: "Arial", color: "#e2e8f0", fontStyle: "bold"
                        }).setOrigin(0.5);
                        
                        const lvlW = lvlTxt.width + 10;
                        const lvlH = 18;
                        const badgeX = isMe ? nameX - lvlW/2 - 8 : nameX + nameTxt.width + lvlW/2 + 8;
                        const badgeY = bubY - 20 + 1; 
        
                        const lvlBg = this.add.graphics();
                        lvlBg.fillStyle(0x334155, 0.9);
                        lvlBg.fillRoundedRect(badgeX - lvlW/2, badgeY - lvlH/2, lvlW, lvlH, 6);
                        
                        lvlTxt.setPosition(badgeX, badgeY);
                        addItems([lvlBg, lvlTxt]); 
                    }
                }

                const timeWidth = timeTxt.width;
                const bubbleW = Math.max(msgTxt.width + 30, (replyTxtObj ? replyTxtObj.width + 30 : 100), timeWidth + 25);
                
                let hasReactions = false;
                let extraReactionPadding = 0;
                let reactionCounts = {};
                
                if (msg.reactions && !msg.isDeleted) {
                    Object.values(msg.reactions).forEach(e => {
                        if (e && e !== "") { reactionCounts[e] = (reactionCounts[e] || 0) + 1; }
                    });
                    if (Object.keys(reactionCounts).length > 0) {
                        hasReactions = true;
                        extraReactionPadding = 20;
                    }
                }

                let bubbleH = msgTxt.height + 35 + extraHeight + extraReactionPadding;
                let startX = isMe ? (this.chatW - bubbleW - avatarSize - 25) : (25 + avatarSize + 10);

                const bubbleBg = this.add.graphics();
                bubbleBg.fillStyle(bubBgHex, bubAlpha);
                
                const strokeColor = Phaser.Display.Color.GetColor(baseCol.r * 0.5, baseCol.g * 0.5, baseCol.b * 0.5);
                bubbleBg.lineStyle(isMentioned ? 2 : 1, isMentioned ? 0xf59e0b : strokeColor, 0.8);

                // Modern bubble radius
                const bRad = 16;
                const sRad = 4;
                if (isMe) {
                    bubbleBg.fillRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: bRad, tr: bRad, bl: bRad, br: isConsecutive ? bRad : sRad });
                    bubbleBg.strokeRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: bRad, tr: bRad, bl: bRad, br: isConsecutive ? bRad : sRad });
                } else {
                    bubbleBg.fillRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: bRad, tr: bRad, bl: isConsecutive ? bRad : sRad, br: bRad });
                    bubbleBg.strokeRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: bRad, tr: bRad, bl: isConsecutive ? bRad : sRad, br: bRad });
                }

                if (replyTxtObj) replyTxtObj.setPosition(startX + 15, bubY + 10);
                msgTxt.setPosition(startX + 15, bubY + 10 + extraHeight);

                timeTxt.setPosition(startX + bubbleW - timeWidth - 12, bubY + bubbleH - 18 - extraReactionPadding);

                let msgVisuals = [bubbleBg, msgTxt, timeTxt];
                if (replyTxtObj) msgVisuals.push(replyTxtObj);

                addItems(msgVisuals); 

                let isError = false, isSending = false;
                if (this.trackedMessages && this.trackedMessages[msg.id]) {
                    if (this.trackedMessages[msg.id].status === 'error') isError = true;
                    if (this.trackedMessages[msg.id].status === 'sending') isSending = true;
                }
                
                let finalBubbleH = bubbleH;

                if (isError) {
                    const errTxt = this.add.text(startX + bubbleW - 10, bubY + finalBubbleH + 5, "⚠️ Failed to send. Tap to retry.", {
                        fontSize: "16px", fontFamily: "'Anek Bangla', Arial", color: "#f87171", fontStyle: "bold"
                    }).setOrigin(1, 0);
                    addItems(errTxt); finalBubbleH += 25; 
                } else if (isSending) {
                    const sendTxt = this.add.text(startX + bubbleW - 10, bubY + finalBubbleH + 5, "Sending...", {
                        fontSize: "14px", fontFamily: "'Anek Bangla', Arial", color: "#64748b", fontStyle: "italic"
                    }).setOrigin(1, 0);
                    addItems(sendTxt); finalBubbleH += 25;
                }

                let interactHit = null;
                if (!msg.isDeleted && !isSending) {
                    interactHit = this.add.rectangle(startX + bubbleW/2, bubY + bubbleH/2, bubbleW, bubbleH, 0, 0);
                    interactHit.isInteractHit = true;
                    interactHit.msgData = msg;
                    interactHit.isError = isError;
                    interactHit.isMe = isMe;
                    addItems(interactHit); 
                }

                let reactionSpace = 0;
                if (hasReactions) {
                    let rxX = startX + 15; 
                    let rxY = bubY + bubbleH - 10; 
                    
                    const sortedReactions = Object.keys(reactionCounts);
                    sortedReactions.forEach((e) => {
                        const badgeBg = this.add.graphics();
                        badgeBg.fillStyle(0x1e293b, 1);
                        badgeBg.fillRoundedRect(rxX, rxY, 65, 30, 15);
                        badgeBg.lineStyle(1.5, 0x38bdf8, 1);
                        badgeBg.strokeRoundedRect(rxX, rxY, 65, 30, 15);
                        
                        const badgeTxt = this.add.text(rxX + 32.5, rxY + 15, `${e} ${reactionCounts[e]}`, { 
                            fontSize: "18px", fontFamily: '"Apple Color Emoji", sans-serif', color: "#ffffff" 
                        }).setOrigin(0.5);

                        msgVisuals.push(badgeBg, badgeTxt);
                        addItems([badgeBg, badgeTxt]); 
                        rxX += 70; 
                    });
                    reactionSpace = 35; 
                }

                if (interactHit) interactHit.visuals = msgVisuals; 

                this.msgYMap[msg.id] = { y: bubY, h: finalBubbleH };
                return bubY + finalBubbleH + reactionSpace + 10; 
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

        this.mergeAndRefreshChat = () => {
            let oldMaxScroll = this.chatMaxScroll;
            let wasLoading = this.isLoadingHistory;

            let merged = [...this.historyMessages, ...this.liveMessages];
            let uniqueMap = {};
            this.chatDataCache = [];
            
            merged.forEach(m => {
                if (!uniqueMap[m.id]) {
                    uniqueMap[m.id] = true;
                    this.chatDataCache.push(m);
                }
            });
            
            this.chatDataCache.sort((a, b) => {
                let ta = a.timestamp ? (typeof a.timestamp.toMillis === 'function' ? a.timestamp.toMillis() : a.timestamp) : 0;
                let tb = b.timestamp ? (typeof b.timestamp.toMillis === 'function' ? b.timestamp.toMillis() : b.timestamp) : 0;
                return ta - tb;
            });

            this.refreshChatUI();

            // Seamless pagination offset fix
            if (wasLoading) {
                let scrollDiff = this.chatMaxScroll - oldMaxScroll;
                this.msgListContainer.y -= scrollDiff;
            }
        };

        this.chatUnsubscribe = window.FirebaseTools.onSnapshot(q, (snapshot) => {
            let messages = [];
            snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
            messages.reverse();
            this.liveMessages = messages;
            this.mergeAndRefreshChat();
        }, (error) => {
            console.error("Global Chat Sync Error:", error);
        });

        this.loadOlderMessages = async () => {
            if (this.isLoadingHistory || this.chatDataCache.length === 0) return;
            this.isLoadingHistory = true;

            const loaderText = this.add.text(this.chatW / 2, 140, "Loading...", { fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#38bdf8" }).setOrigin(0.5).setDepth(9999);
            this.chatContainer.add(loaderText);

            let dotCount = 0;
            const loaderTimer = this.time.addEvent({
                delay: 300, loop: true, callback: () => {
                    dotCount = (dotCount + 1) % 4;
                    loaderText.setText("Loading Older" + ".".repeat(dotCount));
                }
            });

            try {
                const oldestMsg = this.chatDataCache[0];
                if (oldestMsg && oldestMsg.timestamp) {
                    const olderQ = window.FirebaseTools.query(
                        chatRef,
                        window.FirebaseTools.orderBy("timestamp", "desc"),
                        window.FirebaseTools.startAfter(oldestMsg.timestamp),
                        window.FirebaseTools.limit(30)
                    );
                    const querySnapshot = await window.FirebaseTools.getDocs(olderQ);
                    let olderMessages = [];
                    querySnapshot.forEach(doc => olderMessages.push({ id: doc.id, ...doc.data() }));

                    if (olderMessages.length > 0) {
                        olderMessages.reverse();
                        this.historyMessages = [...olderMessages, ...this.historyMessages];
                        this.mergeAndRefreshChat();
                    }
                }
            } catch (e) {
                console.error("Failed to load history", e);
            }

            loaderTimer.remove();
            loaderText.destroy();
            this.time.delayedCall(1000, () => this.isLoadingHistory = false);
        };
    },

    async sendChatMessage() {
        const htmlElement = this.chatInput.getChildByID('chatInput');
        if (!htmlElement) return;

        let text = htmlElement.value.trim();
        if (!text || !window.FirebaseAuth || !window.FirebaseAuth.currentUser) return;
        
        if (!this.msgTimestamps) this.msgTimestamps = [];
        const now = Date.now();
        this.msgTimestamps = this.msgTimestamps.filter(t => now - t < 5000);
        if (this.msgTimestamps.length >= 3) {
            this.showChatError("You are typing too fast! Please wait a moment.");
            return; 
        }
        this.msgTimestamps.push(now);

        text = this.filterBadWords(text);

        const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "Guest";
        const playerLvl = window.getLevelData ? window.getLevelData().level : ((GameState.profile && GameState.profile.level) ? GameState.profile.level : 1);

        // Fetch User Avatar Data
        let getAvatarValue = () => {
            if (!GameState.equippedAvatar || GameState.equippedAvatar === "default") return "👨‍🚀";
            let registry = window.SpecialItemsRegistry;
            if (registry && registry.items) {
                let av = registry.items.find(i => i.id === GameState.equippedAvatar);
                if (av && av.value) return av.value;
            }
            return "👨‍🚀";
        };

        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        const newDocRef = window.FirebaseTools.doc(chatRef);
        const msgId = newDocRef.id;

        let payload = {
            uid: window.FirebaseAuth.currentUser.uid,
            n: playerName,
            lvl: playerLvl, 
            avatar: getAvatarValue(),
            text: text,
            timestamp: window.FirebaseTools.serverTimestamp(),
            pinned: false
        };

        if (this.replyData) {
            payload.replyTo = this.replyData;
        }

        this.trackedMessages = this.trackedMessages || {};
        this.trackedMessages[msgId] = { status: 'sending', payload: payload, time: Date.now() };

        htmlElement.value = ""; 
        htmlElement.blur();
        if (this.replyData) this.cancelReply();

        this.refreshChatUI();
        this.scrollToChat(msgId); // Snap to the new message instantly

        const isReallyOnline = await this.checkRealConnection();
        if (!isReallyOnline) {
            this.trackedMessages[msgId].status = 'error';
            this.refreshChatUI();
            this.showChatError("Offline: Message failed to send.");
            return;
        }

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000));
        
        try {
            await Promise.race([
                window.FirebaseTools.setDoc(newDocRef, payload),
                timeoutPromise
            ]);
            this.trackedMessages[msgId].status = 'sent';
            this.refreshChatUI();
        } catch (err) {
            console.error("Chat send failed or timed out:", err);
            this.trackedMessages[msgId].status = 'error';
            this.refreshChatUI();
        }
    },

    async retrySendMessage(msgId) {
        if (!this.trackedMessages || !this.trackedMessages[msgId]) return;
        
        this.trackedMessages[msgId].status = 'sending';
        this.trackedMessages[msgId].time = Date.now(); 
        this.refreshChatUI();
        this.scrollToChat(msgId);
        
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
        payload.timestamp = window.FirebaseTools.serverTimestamp(); 

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
    }
});