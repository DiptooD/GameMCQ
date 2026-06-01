// Chat.js
// Attaches Chat functions directly to MenuScene so it shares the Scene context
Object.assign(MenuScene.prototype, {

    createGlobalChat() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        
        this.isChatOpen = false;
        this.lastSeenTime = Date.now();
        this.dividerRendered = false;
        this.replyData = null;
        this.chatKeyboardOffset = 0; // Tracks if the keyboard is open
        
        // 1. Mobile Friendly Layout Dimensions
        this.chatW = w - 30; 
        this.chatH = h * 0.88; 
        
        // CENTERED HORIZONTALLY & VERTICALLY
        this.chatX = (w - this.chatW) / 2; 
        this.chatYVisible = (h - this.chatH) / 2; 
        this.chatYHidden = h + 300; 

        // 2. Fullscreen Blocker Overlay 
        this.chatBlocker = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.65)
            .setDepth(8999)
            .setVisible(false)
            .setInteractive();
            
        this.chatBlocker.on('pointerdown', () => {
            if (this.isChatOpen) this.toggleChatWindow();
        });

        // 3. Main Chat Panel Container (FIXED IN PLACE)
        this.chatContainer = this.add.container(this.chatX, this.chatYHidden).setDepth(9000).setVisible(false);
        
        const panelBg = this.add.rectangle(this.chatW / 2, this.chatH / 2, this.chatW, this.chatH, 0x000c22, 0.85).setInteractive();
        
        const panelBorders = this.add.graphics();
        panelBorders.lineStyle(4, 0x0066aa, 1);
        panelBorders.strokeRoundedRect(0, 0, this.chatW, this.chatH, 24);
        
        const title = this.add.text(this.chatW / 2, 55, "গ্লোবাল চ্যাট", {
            fontSize: "46px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold"
        }).setOrigin(0.5);
        
        const headerDiv = this.add.rectangle(this.chatW / 2, 115, this.chatW - 40, 4, 0x0066aa, 0.5);

        // Close Button
        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0xff3333, 1);
        closeBtnBg.fillRoundedRect(this.chatW - 85, 20, 65, 65, 16);
        const closeIcon = this.add.text(this.chatW - 52.5, 52.5, "✖", { fontSize: "36px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        
        const closeHit = this.add.rectangle(this.chatW - 52.5, 52.5, 100, 100, 0, 0).setInteractive({useHandCursor:true});
        closeHit.on('pointerdown', () => this.toggleChatWindow());

        this.chatContainer.add([panelBg, panelBorders, title, headerDiv, closeBtnBg, closeIcon, closeHit]);

        const inputY = this.chatH - 55; 
        this.chatScrollZoneHeight = inputY - 45 - 125;

        // 4. Message List Scrollable Container
        this.msgListContainer = this.add.container(0, 125);
        this.chatContainer.add(this.msgListContainer);

        this.chatMaskShape = this.make.graphics();
        this.chatMaskShape.fillStyle(0xffffff);
        this.chatMaskShape.fillRect(this.chatX + 10, this.chatYVisible + 125, this.chatW - 20, this.chatScrollZoneHeight); 
        this.chatMaskShape.y = this.chatYHidden - this.chatYVisible; 
        this.msgListContainer.setMask(this.chatMaskShape.createGeometryMask());

        // 7. Smooth Scroll UI & Gestures 
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

            // Calculate ratio dynamically using keyboard offset
            const topY = 125 - this.chatKeyboardOffset;
            const scrollRatio = Phaser.Math.Clamp((topY - this.msgListContainer.y) / this.chatMaxScroll, 0, 1);
            const thumbHeight = Math.max(40, (this.chatScrollZoneHeight / (this.chatMaxScroll + this.chatScrollZoneHeight)) * this.chatScrollZoneHeight);
            
            this.chatScrollbarThumb.height = thumbHeight;
            const thumbMinY = 125; 
            const thumbMaxY = 125 + this.chatScrollZoneHeight - thumbHeight;
            this.chatScrollbarThumb.y = thumbMinY + scrollRatio * (thumbMaxY - thumbMinY);
        };

        const scrollZone = this.add.zone(this.chatW / 2, 125 + this.chatScrollZoneHeight / 2, this.chatW, this.chatScrollZoneHeight).setInteractive();
        this.chatContainer.add(scrollZone);

        // Scroll + Long Press Logic
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
                let localX = pointer.x - this.chatContainer.x;
                let localY = pointer.y - this.chatContainer.y - this.msgListContainer.y;
                for (let i = 0; i < this.msgListContainer.list.length; i++) {
                    let child = this.msgListContainer.list[i];
                    if (child.isInteractHit) {
                        let left = child.x - child.width/2, right = child.x + child.width/2;
                        let top = child.y - child.height/2, bottom = child.y + child.height/2;
                        if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
                            this.showChatActionMenu(child.msgData, pointer.x, pointer.y);
                            isDraggingChat = false;
                            break;
                        }
                    }
                }
            });
        });

        scrollZone.on('pointermove', (pointer) => {
            if (pressTimer && Phaser.Math.Distance.Between(hitStartX, hitStartY, pointer.x, pointer.y) > 10) {
                pressTimer.remove(); pressTimer = null;
            }

            if (pointer.isDown && isDraggingChat) {
                let topY = 125 - this.chatKeyboardOffset;
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

                let topY = 125 - this.chatKeyboardOffset;
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
            let topY = 125 - this.chatKeyboardOffset;
            let bottomY = topY - this.chatMaxScroll;
            let newY = this.msgListContainer.y - (deltaY * 1.5);
            newY = Phaser.Math.Clamp(newY, bottomY, topY);
            this.msgListContainer.y = newY;
            this.updateChatScrollbar();
        });


        // 5. Dynamic Input Area & Reply UI (Placed in its own container to shift up!)
        this.bottomUIContainer = this.add.container(0, 0);
        this.chatContainer.add(this.bottomUIContainer);

        // A dark backing to hide scrolled messages behind the input field when sliding up
        const bottomBg = this.add.rectangle(this.chatW / 2, this.chatH - 53, this.chatW - 8, 85, 0x000c22, 0.85);
        this.bottomUIContainer.add(bottomBg);

        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;

        // Reply Interface Setup
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

        if (isConnected) {
            const inputHTML = `<input type="text" id="chatInput" autocomplete="off" maxlength="200" placeholder="এখানে লিখুন..." style="box-sizing: border-box; width: ${this.chatW - 130}px; height: 65px; padding: 0 20px; font-family: 'Anek Bangla', sans-serif; font-size: 26px; border-radius: 20px; border: 2px solid #0066aa; outline: none; background: #051025; color: #fff;">`;
                
            this.chatInput = this.add.dom(20 + (this.chatW - 130)/2, inputY).createFromHTML(inputHTML);
            this.bottomUIContainer.add(this.chatInput);

            // Send Button
            const sendBtnBg = this.add.graphics();
            sendBtnBg.fillStyle(0x0088ff, 1);
            sendBtnBg.fillRoundedRect(this.chatW - 100, inputY - 32.5, 80, 65, 20);
            const sendBtnTxt = this.add.text(this.chatW - 60, inputY, "➤", { fontSize: "36px", color: "#ffffff" }).setOrigin(0.5);
            const sendHit = this.add.rectangle(this.chatW - 60, inputY, 80, 65, 0, 0).setInteractive({useHandCursor: true});
            
            sendHit.on('pointerdown', () => this.sendChatMessage());
            this.bottomUIContainer.add([sendBtnBg, sendBtnTxt, sendHit]);
            
            const htmlElement = this.chatInput.getChildByID('chatInput');
            if (htmlElement) {
                htmlElement.addEventListener('keydown', (e) => e.stopPropagation());
                htmlElement.addEventListener('keypress', (event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') this.sendChatMessage();
                });

                // KEYBOARD SHIFT BEHAVIOR (Only shifts the input and messages up, leaves container static)
                htmlElement.addEventListener('focus', () => {
                    const shiftDist = h * 0.35; 
                    this.chatKeyboardOffset = shiftDist;
                    
                    this.tweens.add({ targets: this.bottomUIContainer, y: -shiftDist, duration: 250, ease: 'Cubic.easeOut' });
                    this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y - shiftDist, duration: 250, ease: 'Cubic.easeOut', onUpdate: () => this.updateChatScrollbar() });
                });

                htmlElement.addEventListener('blur', () => {
                    if (this.isChatOpen) {
                        this.tweens.add({ targets: this.bottomUIContainer, y: 0, duration: 250, ease: 'Cubic.easeOut' });
                        this.tweens.add({ targets: this.msgListContainer, y: this.msgListContainer.y + this.chatKeyboardOffset, duration: 250, ease: 'Cubic.easeOut', onUpdate: () => this.updateChatScrollbar() });
                        this.chatKeyboardOffset = 0;
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
                this.playSound('sfx_click');
                if (window.signInWithGoogle) window.signInWithGoogle().then(() => this.scene.restart());
            });

            this.bottomUIContainer.add([promptTxt, loginBg, loginTxt, loginHit]);
        }

        // 6. Global Floating Trigger Button
        this.createChatToggleButton(w - 50, h / 6 + 250);
        this.listenToGlobalChat();
    },

    createChatToggleButton(x, y) {
        // Create a main container for the button and badge
        this.chatToggleContainer = this.add.container(x, y).setDepth(9000);

        // 1. Soft Drop Shadow (Bigger rounded square)
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.7);
        shadow.fillRoundedRect(-36, -36, 80, 80, 20); 

        // 2. Professional Gradient Base (Bigger rounded square)
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
            bg.fillRoundedRect(-40, -40, 80, 80, 20);
            bg.strokeRoundedRect(-40, -40, 80, 80, 20);
        };
        drawBase(false);

        // 3. Crisp Icon (Bigger Font)
        const icon = this.add.text(0, 0, "💬", { 
            fontSize: "50px", 
            fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif' 
        }).setOrigin(0.5) .setAlpha(0.85);
        icon.clearTint();

        // 4. Interactive Hit Area
        const hitArea = this.add.rectangle(0, 0, 80, 80, 0, 0).setInteractive({ useHandCursor: true });

        // 5. Polished Animations
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
            
            // "Squish" bounce effect on click
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

        // 6. The Unread Badge (Repositioned to the top right of the square)
        this.unreadBadgeBg = this.add.graphics();
        this.unreadBadgeBg.fillStyle(0xef4444, 1); 
        this.unreadBadgeBg.fillCircle(32, -32, 16); 
        this.unreadBadgeBg.lineStyle(2, 0x0f172a, 1); 
        this.unreadBadgeBg.strokeCircle(32, -32, 16);
        
        this.unreadBadgeTxt = this.add.text(32, -32, "0", {
            fontSize: "16px", 
            fontFamily: "Arial", 
            color: "#ffffff", 
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.unreadBadgeBg.setVisible(false);
        this.unreadBadgeTxt.setVisible(false);

        this.chatToggleContainer.add([
            shadow, 
            bg, 
            icon, 
            hitArea, 
            this.unreadBadgeBg, 
            this.unreadBadgeTxt
        ]);
        
        // Entrance Animation
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
        this.playSound('sfx_click');
        this.isChatOpen = !this.isChatOpen;
        
        const targetY = this.isChatOpen ? this.chatYVisible : this.chatYHidden;
        this.chatBlocker.setVisible(this.isChatOpen);

        if (this.isChatOpen) {
            this.chatToggleContainer.setVisible(false); // HIDE BUTTON
            
            this.chatKeyboardOffset = 0;
            if (this.bottomUIContainer) this.bottomUIContainer.y = 0;
            
            this.chatContainer.setVisible(true);
            this.unreadBadgeBg.setVisible(false);
            this.unreadBadgeTxt.setVisible(false);
            
            this.msgListContainer.y = 125 - this.chatMaxScroll;
            this.updateChatScrollbar();
            
            this.lastUnreadCount = 0; // Reset unread count state
        } else {
            this.lastSeenTime = Date.now();
            this.dividerRendered = false;
            
            // SHOW BUTTON AND POP IT IN
            this.chatToggleContainer.setVisible(true);
            this.chatToggleContainer.setScale(0);
            this.tweens.add({ targets: this.chatToggleContainer, scale: 1, duration: 300, ease: 'Back.out' });
        }

        this.tweens.add({
            targets: this.chatContainer,
            y: targetY,
            duration: 350,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!this.isChatOpen) this.chatContainer.setVisible(false);
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

    reactToMessage(msgId, emoji) {
        if (!window.FirebaseAuth || !window.FirebaseAuth.currentUser) return;
        
        const uid = window.FirebaseAuth.currentUser.uid;
        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msgId);
        window.FirebaseTools.updateDoc(docRef, {
            [`reactions.${uid}`]: emoji
        });
    },

    showChatActionMenu(msg, x, y) {
        if (this.chatActionPopup) this.chatActionPopup.destroy();
        this.playSound('sfx_tick', 0.5);

        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        
        // Slightly wider to fit the much bigger emojis and buttons
        const menuW = 360; 
        const menuH = isConnected ? 150 : 90;
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
            // ROW 1: MASSIVE EMOJIS
            const emojis = ['👍', '❤️', '😂', '😮', '😢'];
            const startX = -130;
            const spacing = 65;

            emojis.forEach((emoji, i) => {
                const emTxt = this.add.text(startX + (i * spacing), -35, emoji, { 
                    fontSize: "38px", // BUMPED UP FROM 26px
                    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
                }).setOrigin(0.5).setInteractive({useHandCursor: true});
                
                emTxt.clearTint(); 
                
                // Adjusted hover height for the larger text
                emTxt.on('pointerover', () => this.tweens.add({ targets: emTxt, scale: 1.25, y: -45, duration: 250, ease: 'Back.out' }));
                emTxt.on('pointerout', () => this.tweens.add({ targets: emTxt, scale: 1, y: -35, duration: 200, ease: 'Power2' }));
                
                emTxt.on('pointerdown', () => {
                    this.reactToMessage(msg.id, emoji);
                    this.closeActionMenu();
                });
                
                this.chatActionPopup.add(emTxt);
            });

            // Subtle Divider
            const divider = this.add.rectangle(0, 10, menuW - 40, 1, 0xffffff, 0.08);
            this.chatActionPopup.add(divider);

            // ROW 2: LARGE ACTION BUTTONS
            const btnY = 45;

            // --- BIG REPLY BUTTON ---
            const repBg = this.add.graphics();
            const drawRepBg = (hover) => {
                repBg.clear();
                if (hover) {
                    repBg.fillStyle(0x334155, 0.8);
                    repBg.fillRoundedRect(-170, btnY - 24, 160, 48, 12); // Larger Hitbox
                }
            };
            drawRepBg(false);

            // Increased Font Sizes for Icon and Text
            const repIcon = this.add.text(-125, btnY, "↩️", { fontSize: "24px", fontFamily: '"Segoe UI Emoji", sans-serif' }).setOrigin(0.5);
            repIcon.clearTint();
            const repTxt = this.add.text(-100, btnY, "Reply", { fontSize: "20px", fontFamily: 'sans-serif', color: '#cbd5e1' }).setOrigin(0, 0.5);
            const repHit = this.add.rectangle(-90, btnY, 160, 48, 0, 0).setInteractive({useHandCursor: true});

            repHit.on('pointerover', () => { drawRepBg(true); repTxt.setColor('#ffffff'); });
            repHit.on('pointerout', () => { drawRepBg(false); repTxt.setColor('#cbd5e1'); });
            repHit.on('pointerdown', () => {
                this.initiateReply(msg);
                this.closeActionMenu();
            });

            // --- BIG COPY BUTTON ---
            const copyBg = this.add.graphics();
            const drawCopyBg = (hover) => {
                copyBg.clear();
                if (hover) {
                    copyBg.fillStyle(0x334155, 0.8);
                    copyBg.fillRoundedRect(10, btnY - 24, 160, 48, 12); // Larger Hitbox
                }
            };
            drawCopyBg(false);

            // Increased Font Sizes for Icon and Text
            const copyIcon = this.add.text(45, btnY, "📋", { fontSize: "24px", fontFamily: '"Segoe UI Emoji", sans-serif' }).setOrigin(0.5);
            copyIcon.clearTint();
            const copyTxt = this.add.text(70, btnY, "Copy", { fontSize: "20px", fontFamily: 'sans-serif', color: '#cbd5e1' }).setOrigin(0, 0.5);
            const copyHit = this.add.rectangle(90, btnY, 160, 48, 0, 0).setInteractive({useHandCursor: true});

            copyHit.on('pointerover', () => { drawCopyBg(true); copyTxt.setColor('#ffffff'); });
            copyHit.on('pointerout', () => { drawCopyBg(false); copyTxt.setColor('#cbd5e1'); });
            copyHit.on('pointerdown', () => {
                this.playSound('sfx_tick', 0.5);
                
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
        }

        // Smooth pop-in
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
        
        // NEW: Track the very first time the chat loads so it snaps to the bottom initially
        let isFirstLoad = true;

        this.chatUnsubscribe = window.FirebaseTools.onSnapshot(q, (snapshot) => {
            
            // --- SMART SCROLL LOCK: Capture scroll position before wiping messages ---
            const prevTopY = 125 - this.chatKeyboardOffset;
            const prevBottomY = prevTopY - (this.chatMaxScroll || 0);
            
            // Check if the user is currently looking at the newest messages (allowing 50px of wiggle room)
            // Note: msgListContainer.y goes into negatives as you scroll down
            const isAtBottom = this.msgListContainer.y <= prevBottomY + 50;
            // -------------------------------------------------------------------------

            this.msgListContainer.removeAll(true);
            let messages = [];
            snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

            messages.reverse();

            if (messages.length > 100) {
                const toDelete = messages.slice(0, messages.length - 100);
                this.cleanUpOldChats(toDelete);
                messages = messages.slice(messages.length - 100);
            }

            let currentY = 20;
            let unreadCalc = 0;
            const isAdmin = GameState.profile && GameState.profile.role === 'admin';
            const currentUserUid = (window.FirebaseAuth && window.FirebaseAuth.currentUser) ? window.FirebaseAuth.currentUser.uid : null;

            const pinnedMessages = messages.filter(m => m.pinned);
            const regularMessages = messages.filter(m => !m.pinned);

            let lastSenderUid = null;
            let lastMessageWasPinned = false;

            const renderMessage = (msg, isPinned) => {
                const isMe = currentUserUid && (msg.uid === currentUserUid);
                let msgTime = msg.timestamp ? (msg.timestamp.toMillis ? msg.timestamp.toMillis() : Date.now()) : Date.now();
                
                if (!isPinned && msgTime > this.lastSeenTime) unreadCalc++;

                if (this.isChatOpen && msgTime > this.lastSeenTime && !this.dividerRendered && !isPinned) {
                    this.dividerRendered = true;
                    lastSenderUid = null; 
                    
                    const divCont = this.add.container(this.chatW / 2, currentY + 15);
                    const divLine = this.add.rectangle(0, 0, this.chatW - 100, 2, 0xff3333, 0.7);
                    const divTxt = this.add.text(0, 0, "---- নতুন মেসেজ ----", { 
                        fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#c5c5c5", backgroundColor: "#000c22", padding: {x: 12} 
                    }).setOrigin(0.5);
                    divCont.add([divLine, divTxt]);
                    this.msgListContainer.add(divCont);
                    currentY += 50;
                }

                const isConsecutive = !isPinned && (lastSenderUid === msg.uid) && !lastMessageWasPinned;
                lastSenderUid = msg.uid;
                lastMessageWasPinned = isPinned;

                const nameColorHexStr = isPinned ? "#ffd700" : (isMe ? "#00ffff" : this.getDeterministicColor(msg.uid));
                const baseCol = Phaser.Display.Color.HexStringToColor(nameColorHexStr);
                const darkenFac = isMe ? 0.35 : 0.15; 
                const bubBgHex = Phaser.Display.Color.GetColor(baseCol.r * darkenFac, baseCol.g * darkenFac, baseCol.b * darkenFac);

                const levelText = msg.lvl ? ` • Lvl ${msg.lvl}` : "";
                const nameStr = (isPinned ? "📌 " : "") + (msg.n || "Guest") + levelText;
                
                const bubbleMaxWidth = this.chatW * 0.82;
                let extraHeight = msg.replyTo ? 42 : 0;
                let replyTxtObj = null;
                
                if (msg.replyTo) {
                    let replySnippet = msg.replyTo.text.length > 25 ? msg.replyTo.text.substring(0, 25) + "..." : msg.replyTo.text;
                    replyTxtObj = this.add.text(0, 0, `➥ ${msg.replyTo.n}: ${replySnippet}`, { 
                        fontSize: "20px", fontFamily: "'Anek Bangla'", color: "#aaddff", fontStyle: "italic", 
                        backgroundColor: "#00000088", padding: {x: 10, y: 6}
                    });
                }

                const msgTxt = this.add.text(0, 0, msg.text, { 
                    fontSize: "30px", fontFamily: "'Anek Bangla', sans-serif", color: "#ffffff", wordWrap: { width: bubbleMaxWidth - 40, useAdvancedWrap: true } 
                });

                const timeStr = this.timeAgo(msg.timestamp);
                const timeTxt = this.add.text(0, 0, timeStr, { 
                    fontSize: "16px", fontFamily: "Arial", color: "#aaaaaa" 
                });

                let topPadding = isConsecutive ? 5 : 35;
                const bubY = currentY + topPadding; 

                if (!isConsecutive) {
                    const nameTxt = this.add.text(35, currentY, nameStr, { 
                        fontSize: "24px", fontFamily: "'Anek Bangla'", color: nameColorHexStr, fontStyle: "bold" 
                    });
                    if (isMe) nameTxt.x = this.chatW - nameTxt.width - 35;
                    this.msgListContainer.add(nameTxt);
                }

                const timeWidth = timeTxt.width;
                const bubbleW = Math.max(msgTxt.width + 40, (replyTxtObj ? replyTxtObj.width + 40 : 120), timeWidth + 40);
                const bubbleH = msgTxt.height + 50 + extraHeight;
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
                timeTxt.setPosition(startX + bubbleW - timeWidth - 15, bubY + bubbleH - 22);

                this.msgListContainer.add([bubbleBg, msgTxt, timeTxt]);
                if (replyTxtObj) this.msgListContainer.add(replyTxtObj);

                const interactHit = this.add.rectangle(startX + bubbleW/2, bubY + bubbleH/2, bubbleW, bubbleH, 0, 0);
                interactHit.isInteractHit = true;
                interactHit.msgData = msg;
                this.msgListContainer.add(interactHit);

                let reactionSpace = 0;
                if (msg.reactions) {
                    let counts = {};
                    Object.values(msg.reactions).forEach(e => counts[e] = (counts[e] || 0) + 1);
                    
                    let rxX = startX + 15; 
                    let rxY = bubY + bubbleH - 12; 
                    
                    const sortedReactions = Object.keys(counts);
                    sortedReactions.forEach((e) => {
                        const badgeBg = this.add.graphics();
                        badgeBg.fillStyle(0x001122, 1);
                        badgeBg.fillRoundedRect(rxX, rxY, 70, 34, 17);
                        badgeBg.lineStyle(1.5, 0x00aaff, 1);
                        badgeBg.strokeRoundedRect(rxX, rxY, 70, 34, 17);
                        
                        const badgeTxt = this.add.text(rxX + 35, rxY + 17, `${e} ${counts[e]}`, { 
                            fontSize: "22px", 
                            fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                            color: "#ffffff" 
                        }).setOrigin(0.5);

                        this.msgListContainer.add([badgeBg, badgeTxt]);
                        rxX += 75; 
                    });
                    
                    if (sortedReactions.length > 0) reactionSpace = 25; 
                }

                if (isAdmin) {
                    const adminX = isMe ? (startX - 40) : (startX + bubbleW + 40);
                    const delBtn = this.add.text(adminX, bubY + bubbleH/2 + 20, "🗑️", { fontSize: "28px" }).setOrigin(0.5).setInteractive({useHandCursor: true});
                    delBtn.on('pointerdown', () => window.FirebaseTools.deleteDoc(window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id)));
                    
                    const pinBtn = this.add.text(adminX, bubY + bubbleH/2 - 20, isPinned ? "❌" : "📌", { fontSize: "28px" }).setOrigin(0.5).setInteractive({useHandCursor: true});
                    pinBtn.on('pointerdown', () => {
                        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                        window.FirebaseTools.updateDoc(docRef, { pinned: !isPinned });
                    });
                    this.msgListContainer.add([delBtn, pinBtn]);
                }

                currentY = bubY + bubbleH + reactionSpace + 15; 
            };

            pinnedMessages.forEach(msg => renderMessage(msg, true));

            if (pinnedMessages.length > 0 && regularMessages.length > 0) {
                const divider = this.add.rectangle(this.chatW / 2, currentY - 5, this.chatW - 60, 2, 0x0066aa, 0.4);
                this.msgListContainer.add(divider);
                currentY += 15;
            }

            lastSenderUid = null;
            regularMessages.forEach(msg => renderMessage(msg, false));

            const visibleHeight = this.chatScrollZoneHeight;
            this.chatMaxScroll = Math.max(0, currentY - visibleHeight);

            if (!this.isChatOpen && unreadCalc > 0) {
                let badgeText = unreadCalc > 9 ? "9+" : unreadCalc.toString();
                this.unreadBadgeTxt.setText(badgeText);
                this.unreadBadgeBg.setVisible(true);
                this.unreadBadgeTxt.setVisible(true);

                // Pulse the button when the unread count goes up
                if (this.lastUnreadCount === undefined) this.lastUnreadCount = 0;
                if (unreadCalc > this.lastUnreadCount) {
                    this.tweens.add({
                        targets: this.chatToggleContainer,
                        scale: 1.15,
                        yoyo: true,
                        duration: 250,
                        ease: 'Sine.easeInOut'
                    });
                }
                this.lastUnreadCount = unreadCalc;
            }

            // --- SMART SCROLL LOGIC APPLICATION ---
            const topY = 125 - this.chatKeyboardOffset;
            const newBottomY = topY - this.chatMaxScroll;

            if (isFirstLoad || isAtBottom) {
                // If they just opened the chat, OR they were already at the bottom waiting for new messages, snap to bottom
                this.tweens.add({
                    targets: this.msgListContainer,
                    y: newBottomY,
                    duration: 250,
                    ease: 'Cubic.easeOut',
                    onUpdate: () => this.updateChatScrollbar()
                });
            } else {
                // If they were scrolled up reading older messages, DO NOT SNAP. 
                // Keep them exactly where they are, just clamp it so they don't scroll out of bounds.
                this.msgListContainer.y = Phaser.Math.Clamp(this.msgListContainer.y, newBottomY, topY);
                this.updateChatScrollbar();
            }
            
            // Turn off the first load flag after the first run
            isFirstLoad = false;
        });
    },

    sendChatMessage() {
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
        oldDocs.forEach(doc => {
            const oldDocRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", doc.id);
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