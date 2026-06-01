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
        
        // 1. Mobile Friendly Layout Dimensions (Maximizing space)
        this.chatW = w - 30; 
        this.chatH = h * 0.88; 
        this.chatX = 15;
        this.chatYVisible = h - this.chatH - 40; 
        this.chatYHidden = h + 300; 

        // 2. Fullscreen Blocker Overlay 
        this.chatBlocker = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.65)
            .setDepth(8999)
            .setVisible(false)
            .setInteractive();
            
        this.chatBlocker.on('pointerdown', () => {
            if (this.isChatOpen) this.toggleChatWindow();
        });

        // 3. Main Chat Panel Container
        this.chatContainer = this.add.container(this.chatX, this.chatYHidden).setDepth(9000).setVisible(false);
        
        const panelBg = this.add.rectangle(this.chatW / 2, this.chatH / 2, this.chatW, this.chatH, 0x000c22, 0.75).setInteractive();
        
        const panelBorders = this.add.graphics();
        panelBorders.lineStyle(4, 0x0066aa, 1);
        panelBorders.strokeRoundedRect(0, 0, this.chatW, this.chatH, 24);
        
        // Increased Title Text Size
        const title = this.add.text(this.chatW / 2, 55, "গ্লোবাল চ্যাট", {
            fontSize: "52px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold"
        }).setOrigin(0.5);
        
        const headerDiv = this.add.rectangle(this.chatW / 2, 115, this.chatW - 40, 4, 0x0066aa, 0.5);

        // Bigger Close Button Graphic & Massive Hitbox
        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0xff3333, 1);
        closeBtnBg.fillRoundedRect(this.chatW - 95, 20, 75, 75, 20);
        const closeIcon = this.add.text(this.chatW - 57.5, 57.5, "✖", { fontSize: "42px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        
        // Expanded Close Hitbox to 140x140 for mobile accessibility
        const closeHit = this.add.rectangle(this.chatW - 57.5, 57.5, 140, 140, 0, 0).setInteractive({useHandCursor:true});
        closeHit.on('pointerdown', () => this.toggleChatWindow());

        this.chatContainer.add([panelBg, panelBorders, title, headerDiv, closeBtnBg, closeIcon, closeHit]);

        this.chatScrollZoneHeight = this.chatH - 260;

        // 4. Message List Scrollable Container
        this.msgListContainer = this.add.container(0, 125);
        this.chatContainer.add(this.msgListContainer);

        this.chatMaskShape = this.make.graphics();
        this.chatMaskShape.fillStyle(0xffffff);
        this.chatMaskShape.fillRect(this.chatX + 10, this.chatYVisible + 125, this.chatW - 20, this.chatScrollZoneHeight); 
        this.chatMaskShape.y = this.chatYHidden - this.chatYVisible; 
        this.msgListContainer.setMask(this.chatMaskShape.createGeometryMask());

        // 5. Dynamic Input Area & Reply UI
        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        const inputY = this.chatH - 85; 

        // Reply Interface Setup (Scaled Up)
        this.replyUI = this.add.container(this.chatW / 2 - 60, inputY - 80).setVisible(false);
        const replyBg = this.add.graphics();
        replyBg.fillStyle(0x003366, 0.95);
        replyBg.fillRoundedRect(- (this.chatW - 220)/2, -25, this.chatW - 220, 50, 12);
        this.replyTxt = this.add.text(- (this.chatW - 220)/2 + 20, 0, "", { fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#00ffff" }).setOrigin(0, 0.5);
        const replyCancel = this.add.text((this.chatW - 220)/2 - 30, 0, "✖", { fontSize: "26px", color: "#ff4444", fontStyle: "bold" }).setOrigin(0.5).setInteractive({useHandCursor:true});
        
        this.cancelReply = () => {
            this.replyData = null;
            this.replyUI.setVisible(false);
        };
        replyCancel.on('pointerdown', () => this.cancelReply());
        this.replyUI.add([replyBg, this.replyTxt, replyCancel]);
        this.chatContainer.add(this.replyUI);

        if (isConnected) {
            // Larger font size and expanded padding inside the HTML Input field
            const inputHTML = `<input type="text" id="chatInput" autocomplete="off" placeholder="এখানে লিখুন..." style="width: ${this.chatW - 220}px; padding: 24px 26px; font-family: 'Anek Bangla', sans-serif; font-size: 32px; border-radius: 20px; border: 3px solid #0066aa; outline: none; background: #051025; color: #fff;">`;
                
            this.chatInput = this.add.dom(this.chatW / 2 - 60, inputY).createFromHTML(inputHTML);
            this.chatContainer.add(this.chatInput);

            // Scaled up Send Button UI elements
            const sendBtnBg = this.add.graphics();
            sendBtnBg.fillStyle(0x0088ff, 1);
            sendBtnBg.fillRoundedRect(this.chatW - 115, inputY - 45, 95, 90, 24);
            const sendBtnTxt = this.add.text(this.chatW - 67.5, inputY, "➤", { fontSize: "44px", color: "#ffffff" }).setOrigin(0.5);
            const sendHit = this.add.rectangle(this.chatW - 67.5, inputY, 120, 110, 0, 0).setInteractive({useHandCursor: true});
            
            sendHit.on('pointerdown', () => this.sendChatMessage());
            this.chatContainer.add([sendBtnBg, sendBtnTxt, sendHit]);
            
            const htmlElement = this.chatInput.getChildByID('chatInput');
            if (htmlElement) {
                htmlElement.addEventListener('keydown', (e) => e.stopPropagation());
                htmlElement.addEventListener('keypress', (event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') this.sendChatMessage();
                });

                // MOBILE KEYBOARD FIX: Shift the chat layout upward when focused
                htmlElement.addEventListener('focus', () => {
                    const keyboardShiftY = h * 0.35; // Dynamically calculated translation
                    this.tweens.add({
                        targets: this.chatContainer,
                        y: this.chatYVisible - keyboardShiftY,
                        duration: 250,
                        ease: 'Cubic.easeOut'
                    });
                    this.tweens.add({
                        targets: this.chatMaskShape,
                        y: -keyboardShiftY,
                        duration: 250,
                        ease: 'Cubic.easeOut'
                    });
                });

                // Reset position smoothly when keyboard dismisses / field loses focus
                htmlElement.addEventListener('blur', () => {
                    if (this.isChatOpen) {
                        this.tweens.add({
                            targets: this.chatContainer,
                            y: this.chatYVisible,
                            duration: 250,
                            ease: 'Cubic.easeOut'
                        });
                        this.tweens.add({
                            targets: this.chatMaskShape,
                            y: 0,
                            duration: 250,
                            ease: 'Cubic.easeOut'
                        });
                    }
                });
            }
        } else {
            // Expanded Login UI spacing
            const promptTxt = this.add.text(this.chatW / 2, inputY - 80, "চ্যাট করতে Google লগইন করুন", { fontSize: "34px", fontFamily: "'Anek Bangla'", color: "#aaaaaa" }).setOrigin(0.5);
            
            const loginBg = this.add.graphics();
            loginBg.fillStyle(0x0066aa, 1);
            loginBg.fillRoundedRect(this.chatW / 2 - 200, inputY - 20, 400, 85, 30);
            const loginTxt = this.add.text(this.chatW / 2, inputY + 22, "Connect (Google)", { fontSize: "36px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
            const loginHit = this.add.rectangle(this.chatW / 2, inputY + 22, 400, 85, 0x000000, 0).setInteractive({useHandCursor: true});

            loginHit.on('pointerdown', () => {
                this.playSound('sfx_click');
                if (window.signInWithGoogle) window.signInWithGoogle().then(() => this.scene.restart());
            });

            this.chatContainer.add([promptTxt, loginBg, loginTxt, loginHit]);
        }

        // 6. Global Floating Trigger Button
        this.chatToggleBtn = this.add.container(w - 50, h / 6 + 200).setDepth(9001);
        
        const toggleBg = this.add.graphics();
        toggleBg.fillStyle(0x002255, 0.95);
        toggleBg.fillRoundedRect(-35, -35, 70, 70, 18);
        toggleBg.lineStyle(3, 0x00ffff, 1);
        toggleBg.strokeRoundedRect(-35, -35, 70, 70, 18);
        
        const toggleIcon = this.add.text(0, 0, "💬", { fontSize: "36px" }).setOrigin(0.5);
        const toggleHit = this.add.rectangle(0, 0, 80, 80, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        this.unreadBadgeBg = this.add.circle(28, -28, 16, 0xff3333).setVisible(false);
        this.unreadBadgeBg.setStrokeStyle(2, 0xffffff);
        this.unreadBadgeTxt = this.add.text(28, -28, "0", { fontSize: "16px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setVisible(false);
        
        toggleHit.on('pointerdown', () => this.toggleChatWindow());
        this.chatToggleBtn.add([toggleBg, toggleIcon, toggleHit, this.unreadBadgeBg, this.unreadBadgeTxt]);

        // 7. Smooth Scroll UI & Gestures (MOMENTUM SCROLLING)
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

            // Using clamp to safely position scrollbar when rubber-banding out of bounds
            const scrollRatio = Phaser.Math.Clamp((125 - this.msgListContainer.y) / this.chatMaxScroll, 0, 1);
            const thumbHeight = Math.max(40, (this.chatScrollZoneHeight / (this.chatMaxScroll + this.chatScrollZoneHeight)) * this.chatScrollZoneHeight);
            
            this.chatScrollbarThumb.height = thumbHeight;
            const thumbMinY = 125; 
            const thumbMaxY = 125 + this.chatScrollZoneHeight - thumbHeight;
            this.chatScrollbarThumb.y = thumbMinY + scrollRatio * (thumbMaxY - thumbMinY);
        };

        const scrollZone = this.add.zone(this.chatW / 2, 125 + this.chatScrollZoneHeight / 2, this.chatW, this.chatScrollZoneHeight).setInteractive();
        this.chatContainer.add(scrollZone);

        // Momentum Scrolling Logic Variables
        let dragStartY = 0;
        let containerStartY = 0;
        let isDraggingChat = false;
        let scrollYTracker = [];

        scrollZone.on('pointerdown', (pointer) => {
            dragStartY = pointer.y;
            containerStartY = this.msgListContainer.y;
            isDraggingChat = true;
            scrollYTracker = [{y: pointer.y, time: this.time.now}];
            this.tweens.killTweensOf(this.msgListContainer);
        });

        scrollZone.on('pointermove', (pointer) => {
            if (pointer.isDown && isDraggingChat) {
                let newY = containerStartY + (pointer.y - dragStartY);

                // Rubber-banding effect when dragging past limits
                if (newY > 125) {
                    newY = 125 + (newY - 125) * 0.35;
                } else if (newY < 125 - this.chatMaxScroll) {
                    const minScroll = 125 - this.chatMaxScroll;
                    newY = minScroll + (newY - minScroll) * 0.35;
                }

                this.msgListContainer.y = newY;
                scrollYTracker.push({y: pointer.y, time: this.time.now});
                if (scrollYTracker.length > 5) scrollYTracker.shift();
                
                this.updateChatScrollbar();
            }
        });

        const stopChatDrag = () => {
            if (isDraggingChat) {
                isDraggingChat = false;
                let velocity = 0;
                
                // Calculate release velocity for momentum
                if (scrollYTracker.length > 1) {
                    let first = scrollYTracker[0];
                    let last = scrollYTracker[scrollYTracker.length - 1];
                    let dt = last.time - first.time;
                    let dy = last.y - first.y;
                    if (dt > 0 && dt < 150) { 
                        velocity = dy / dt; 
                    }
                }

                let targetY = this.msgListContainer.y;
                let duration = 300;
                let easeType = 'Quart.easeOut';

                // Apply velocity multiplier if swiped
                if (Math.abs(velocity) > 0.2) {
                    let amplitude = velocity * 600; // Throw strength
                    targetY += amplitude;
                    duration = Math.min(Math.abs(amplitude) * 1.5, 1200);
                }

                // Restrict target to bounds
                if (targetY > 125) targetY = 125;
                if (targetY < 125 - this.chatMaxScroll) targetY = 125 - this.chatMaxScroll;

                if (targetY !== this.msgListContainer.y) {
                    this.tweens.add({
                        targets: this.msgListContainer,
                        y: targetY,
                        duration: duration,
                        ease: easeType,
                        onUpdate: () => this.updateChatScrollbar()
                    });
                } else {
                    // If snapped out of bounds and velocity is zero, rubber-band snap back
                    if (this.msgListContainer.y > 125) targetY = 125;
                    if (this.msgListContainer.y < 125 - this.chatMaxScroll) targetY = 125 - this.chatMaxScroll;
                    
                    if (targetY !== this.msgListContainer.y) {
                        this.tweens.add({
                            targets: this.msgListContainer,
                            y: targetY,
                            duration: 350,
                            ease: 'Back.easeOut',
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
            let newY = this.msgListContainer.y - (deltaY * 1.5);
            newY = Phaser.Math.Clamp(newY, 125 - this.chatMaxScroll, 125);
            this.msgListContainer.y = newY;
            this.updateChatScrollbar();
        });

        this.listenToGlobalChat();
    },

    toggleChatWindow() {
        this.playSound('sfx_click');
        this.isChatOpen = !this.isChatOpen;
        
        const targetY = this.isChatOpen ? this.chatYVisible : this.chatYHidden;
        this.chatBlocker.setVisible(this.isChatOpen);

        if (this.isChatOpen) {
            this.chatContainer.setVisible(true);
            this.unreadBadgeBg.setVisible(false);
            this.unreadBadgeTxt.setVisible(false);
            
            this.msgListContainer.y = 125 - this.chatMaxScroll;
            this.updateChatScrollbar();
        } else {
            this.lastSeenTime = Date.now();
            this.dividerRendered = false;
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
        const uid = window.FirebaseAuth.currentUser.uid;
        if (!uid) return;
        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msgId);
        window.FirebaseTools.updateDoc(docRef, {
            [`reactions.${uid}`]: emoji
        });
    },

    showChatActionMenu(msg, x, y) {
        if (this.chatActionPopup) this.chatActionPopup.destroy();
        this.playSound('sfx_tick', 0.5);
        
        let localX = Phaser.Math.Clamp(x - this.chatX, 220, this.chatW - 220);
        let localY = y - (this.isChatOpen ? this.chatYVisible : this.chatYHidden) - 100;
        
        this.chatActionPopup = this.add.container(localX, localY).setDepth(9999);
        
        // Enlarged Action Menu Dimensions for easy finger taps
        const bg = this.add.graphics();
        bg.fillStyle(0x001a33, 0.98);
        bg.fillRoundedRect(-220, -90, 440, 180, 28);
        bg.lineStyle(3, 0x00ffff, 1);
        bg.strokeRoundedRect(-220, -90, 440, 180, 28);
        
        // Scaled Up Emoji Options
        const emojis = ['👍', '❤️', '😂', '😮', '😢'];
        emojis.forEach((emoji, i) => {
            const emTxt = this.add.text(-160 + (i * 80), -40, emoji, { fontSize: "46px" }).setOrigin(0.5).setInteractive({useHandCursor:true});
            emTxt.on('pointerdown', () => {
                this.reactToMessage(msg.id, emoji);
                this.chatActionPopup.destroy();
            });
            this.chatActionPopup.add(emTxt);
        });
        
        // Enlarged Reply Action Button
        const repBg = this.add.graphics();
        repBg.fillStyle(0x0055aa, 1);
        repBg.fillRoundedRect(-180, 20, 360, 55, 16);
        const repHit = this.add.rectangle(0, 47.5, 360, 55, 0, 0).setInteractive({useHandCursor:true});
        const repTxt = this.add.text(0, 47.5, "Reply", { fontSize: "28px", fontFamily: "'Anek Bangla'", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        
        repHit.on('pointerdown', () => {
            this.initiateReply(msg);
            this.chatActionPopup.destroy();
        });
        
        this.chatActionPopup.add([bg, repBg, repTxt, repHit]);
        this.chatContainer.add(this.chatActionPopup);
        
        this.time.delayedCall(100, () => {
            this.input.once('pointerdown', () => {
                if (this.chatActionPopup) this.chatActionPopup.destroy();
            });
        });
    },

    listenToGlobalChat() {
        if (!window.FirebaseDB || !window.FirebaseTools) return;
        
        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        const q = window.FirebaseTools.query(chatRef, window.FirebaseTools.orderBy("timestamp", "desc"), window.FirebaseTools.limit(105));
        
        this.chatUnsubscribe = window.FirebaseTools.onSnapshot(q, (snapshot) => {
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

            const renderMessage = (msg, isPinned) => {
                const isMe = currentUserUid && (msg.uid === currentUserUid);
                let msgTime = msg.timestamp ? (msg.timestamp.toMillis ? msg.timestamp.toMillis() : Date.now()) : Date.now();
                
                if (!isPinned && msgTime > this.lastSeenTime) unreadCalc++;

                if (this.isChatOpen && msgTime > this.lastSeenTime && !this.dividerRendered && !isPinned) {
                    this.dividerRendered = true;
                    const divCont = this.add.container(this.chatW / 2, currentY + 15);
                    const divLine = this.add.rectangle(0, 0, this.chatW - 100, 2, 0xff3333, 0.7);
                    const divTxt = this.add.text(0, 0, "---- নতুন মেসেজ ----", { 
                        fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#ff3333", backgroundColor: "#000c22", padding: {x: 12} 
                    }).setOrigin(0.5);
                    divCont.add([divLine, divTxt]);
                    this.msgListContainer.add(divCont);
                    currentY += 50;
                }

                // Deep dynamic color blending based on Name hash
                const nameColorHexStr = isPinned ? "#ffd700" : (isMe ? "#00ffff" : this.getDeterministicColor(msg.uid));
                const baseCol = Phaser.Display.Color.HexStringToColor(nameColorHexStr);
                const darkenFac = isMe ? 0.35 : 0.15; // Deeper background fill (less noticeable)
                const borderFac = isMe ? 0.6 : 0.4;
                
                const bubBgHex = Phaser.Display.Color.GetColor(baseCol.r * darkenFac, baseCol.g * darkenFac, baseCol.b * darkenFac);
                const bubBorderHex = Phaser.Display.Color.GetColor(baseCol.r * borderFac, baseCol.g * borderFac, baseCol.b * borderFac);

                const levelText = msg.lvl ? ` • Lvl ${msg.lvl}` : "";
                const nameStr = (isPinned ? "📌 " : "") + (msg.n || "Guest") + levelText;
                
                const bubbleMaxWidth = this.chatW * 0.82;
                let extraHeight = msg.replyTo ? 42 : 0;
                let replyTxtObj = null;
                
                // Reply Block
                if (msg.replyTo) {
                    let replySnippet = msg.replyTo.text.length > 25 ? msg.replyTo.text.substring(0, 25) + "..." : msg.replyTo.text;
                    replyTxtObj = this.add.text(0, 0, `➥ ${msg.replyTo.n}: ${replySnippet}`, { 
                        fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#aaddff", fontStyle: "italic", 
                        backgroundColor: "#00000088", padding: {x: 10, y: 6}
                    });
                }

                // Message Text
                const msgTxt = this.add.text(0, 0, msg.text, { 
                    fontSize: "32px", fontFamily: "'Anek Bangla', sans-serif", color: "#ffffff", wordWrap: { width: bubbleMaxWidth - 56 } 
                });

                // Time Text
                const timeStr = this.timeAgo(msg.timestamp);
                const timeTxt = this.add.text(0, 0, timeStr, { 
                    fontSize: "18px", fontFamily: "Arial", color: "#aaaaaa" 
                });

                // Name Text Render (FIXED: Provide a default x coordinate during creation)
                const nameTxt = this.add.text(35, currentY, nameStr, { 
                    fontSize: "26px", fontFamily: "'Anek Bangla'", color: nameColorHexStr, fontStyle: "bold" 
                });
                if (isMe) {
                    nameTxt.x = this.chatW - nameTxt.width - 35;
                }

                // Math Layout logic
                const timeWidth = timeTxt.width;
                const bubbleW = Math.max(msgTxt.width + 40, (replyTxtObj ? replyTxtObj.width + 40 : 120), timeWidth + 40);
                const bubbleH = msgTxt.height + 55 + extraHeight;
                let startX = isMe ? (this.chatW - bubbleW - 25) : 25;
                const bubY = currentY + 35; // Space for name text above

                // Bubble Graphic Render
                const bubbleBg = this.add.graphics();
                bubbleBg.fillStyle(bubBgHex, 0.95);
                bubbleBg.lineStyle(2, bubBorderHex, 1);
                if (isMe) {
                    bubbleBg.fillRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 22, br: 0 });
                    bubbleBg.strokeRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 22, br: 0 });
                } else {
                    bubbleBg.fillRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 0, br: 22 });
                    bubbleBg.strokeRoundedRect(startX, bubY, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 0, br: 22 });
                }

                // Positions alignment inside bubble
                if (replyTxtObj) replyTxtObj.setPosition(startX + 20, bubY + 10);
                msgTxt.setPosition(startX + 20, bubY + 15 + extraHeight);
                timeTxt.setPosition(startX + bubbleW - timeWidth - 15, bubY + bubbleH - 25);

                this.msgListContainer.add([nameTxt, bubbleBg, msgTxt, timeTxt]);
                if (replyTxtObj) this.msgListContainer.add(replyTxtObj);

                // Action Menu Interactive Box (with jitter safety threshold)
                const interactHit = this.add.rectangle(startX + bubbleW/2, bubY + bubbleH/2, bubbleW, bubbleH, 0, 0).setInteractive({useHandCursor:true});
                let pressTimer;
                let hitStartX = 0, hitStartY = 0;
                
                interactHit.on('pointerdown', (pointer) => {
                    hitStartX = pointer.x;
                    hitStartY = pointer.y;
                    pressTimer = this.time.delayedCall(400, () => {
                        this.showChatActionMenu(msg, pointer.x, pointer.y);
                        pressTimer = null;
                    });
                });
                interactHit.on('pointerup', () => { if(pressTimer) { pressTimer.remove(); pressTimer = null; } });
                interactHit.on('pointerout', () => { if(pressTimer) { pressTimer.remove(); pressTimer = null; } });
                interactHit.on('pointermove', (pointer) => {
                    // 10 pixel safe zone ensures slight finger rolls don't cancel action menu on mobile
                    if(pressTimer && Phaser.Math.Distance.Between(hitStartX, hitStartY, pointer.x, pointer.y) > 10) {
                        pressTimer.remove();
                        pressTimer = null;
                    }
                });
                this.msgListContainer.add(interactHit);

                // Realigned Reaction Badges Layout
                let reactionSpace = 0;
                if (msg.reactions) {
                    let counts = {};
                    Object.values(msg.reactions).forEach(e => counts[e] = (counts[e] || 0) + 1);
                    
                    let rxX = isMe ? startX + bubbleW - 75 : startX + 10;
                    let rxY = bubY + bubbleH - 18; // Cleanly overlapping bottom edge
                    
                    const sortedReactions = Object.keys(counts);
                    sortedReactions.forEach((e) => {
                        const badgeBg = this.add.graphics();
                        badgeBg.fillStyle(0x001122, 1);
                        badgeBg.fillRoundedRect(rxX, rxY, 65, 34, 17);
                        badgeBg.lineStyle(1.5, 0x00aaff, 1);
                        badgeBg.strokeRoundedRect(rxX, rxY, 65, 34, 17);
                        
                        const badgeTxt = this.add.text(rxX + 32.5, rxY + 17, `${e} ${counts[e]}`, { fontSize: "20px", color: "#fff" }).setOrigin(0.5);
                        this.msgListContainer.add([badgeBg, badgeTxt]);
                        rxX += isMe ? -72 : 72; 
                    });
                    
                    if (sortedReactions.length > 0) reactionSpace = 25; 
                }

                // Admin Icons
                if (isAdmin) {
                    const adminX = isMe ? (startX - 50) : (startX + bubbleW + 50);
                    const delBtn = this.add.text(adminX, bubY + bubbleH/2 + 20, "🗑️", { fontSize: "32px" }).setOrigin(0.5).setInteractive({useHandCursor: true});
                    delBtn.on('pointerdown', () => window.FirebaseTools.deleteDoc(window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id)));
                    
                    const pinBtn = this.add.text(adminX, bubY + bubbleH/2 - 20, isPinned ? "❌" : "📌", { fontSize: "32px" }).setOrigin(0.5).setInteractive({useHandCursor: true});
                    pinBtn.on('pointerdown', () => {
                        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                        window.FirebaseTools.updateDoc(docRef, { pinned: !isPinned });
                    });
                    this.msgListContainer.add([delBtn, pinBtn]);
                }

                // Append Y coordinate correctly considering new bubble math
                currentY = bubY + bubbleH + reactionSpace + 15; 
            };

            pinnedMessages.forEach(msg => renderMessage(msg, true));

            if (pinnedMessages.length > 0 && regularMessages.length > 0) {
                const divider = this.add.rectangle(this.chatW / 2, currentY - 5, this.chatW - 60, 2, 0x0066aa, 0.4);
                this.msgListContainer.add(divider);
                currentY += 15;
            }

            regularMessages.forEach(msg => renderMessage(msg, false));

            const visibleHeight = this.chatScrollZoneHeight;
            this.chatMaxScroll = Math.max(0, currentY - visibleHeight);

            if (!this.isChatOpen && unreadCalc > 0) {
                let badgeText = unreadCalc > 9 ? "9+" : unreadCalc.toString();
                this.unreadBadgeTxt.setText(badgeText);
                this.unreadBadgeBg.setVisible(true);
                this.unreadBadgeTxt.setVisible(true);
            }

            this.tweens.add({
                targets: this.msgListContainer,
                y: 125 - this.chatMaxScroll,
                duration: 250,
                ease: 'Cubic.easeOut',
                onUpdate: () => this.updateChatScrollbar()
            });
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