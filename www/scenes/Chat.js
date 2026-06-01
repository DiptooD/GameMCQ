// Chat.js
// Attaches Chat functions directly to MenuScene so it shares the Scene context
Object.assign(MenuScene.prototype, {

    createGlobalChat() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        
        this.isChatOpen = false;
        
        // 1. Mobile Friendly Layout Dimensions
        this.chatW = w - 40; 
        this.chatH = h * 0.78; 
        this.chatX = 20;
        this.chatYVisible = h - this.chatH - 20; 
        this.chatYHidden = h + 200; 

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
        
        const panelBg = this.add.rectangle(this.chatW / 2, this.chatH / 2, this.chatW, this.chatH, 0x000c22, 0.98).setInteractive();
        
        const panelBorders = this.add.graphics();
        panelBorders.lineStyle(4, 0x0066aa, 1);
        panelBorders.strokeRoundedRect(0, 0, this.chatW, this.chatH, 24);
        
        const title = this.add.text(this.chatW / 2, 45, "গ্লোবাল চ্যাট", {
            fontSize: "46px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold"
        }).setOrigin(0.5);
        
        const headerDiv = this.add.rectangle(this.chatW / 2, 95, this.chatW - 40, 3, 0x0066aa, 0.5);

        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0xff3333, 1);
        closeBtnBg.fillRoundedRect(this.chatW - 75, 15, 60, 60, 16);
        const closeIcon = this.add.text(this.chatW - 45, 45, "✖", { fontSize: "32px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        const closeHit = this.add.rectangle(this.chatW - 45, 45, 80, 80, 0, 0).setInteractive({useHandCursor:true});
        closeHit.on('pointerdown', () => this.toggleChatWindow());

        this.chatContainer.add([panelBg, panelBorders, title, headerDiv, closeBtnBg, closeIcon, closeHit]);

        // 4. Message List Scrollable Container
        this.msgListContainer = this.add.container(0, 105);
        this.chatContainer.add(this.msgListContainer);

        this.chatMaskShape = this.make.graphics();
        this.chatMaskShape.fillStyle(0xffffff);
        this.chatMaskShape.fillRect(this.chatX + 10, this.chatYVisible + 105, this.chatW - 20, this.chatH - 240); 
        this.chatMaskShape.y = this.chatYHidden - this.chatYVisible; 
        this.msgListContainer.setMask(this.chatMaskShape.createGeometryMask());

        // 5. Dynamic Input Area
        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        const inputY = this.chatH - 75; 

        if (isConnected) {
            // Emojis are supported out of the box via the HTML input!
            const inputHTML = `<input type="text" id="chatInput" autocomplete="off" placeholder="এখানে লিখুন..." style="width: ${this.chatW - 180}px; padding: 20px 22px; font-family: 'Anek Bangla', sans-serif; font-size: 26px; border-radius: 20px; border: 3px solid #0066aa; outline: none; background: #051025; color: #fff;">`;
                
            this.chatInput = this.add.dom(this.chatW / 2 - 50, inputY).createFromHTML(inputHTML);
            this.chatContainer.add(this.chatInput);

            const sendBtnBg = this.add.graphics();
            sendBtnBg.fillStyle(0x0088ff, 1);
            sendBtnBg.fillRoundedRect(this.chatW - 100, inputY - 35, 75, 70, 20);
            const sendBtnTxt = this.add.text(this.chatW - 62.5, inputY, "➤", { fontSize: "36px", color: "#ffffff" }).setOrigin(0.5);
            const sendHit = this.add.rectangle(this.chatW - 62.5, inputY, 90, 85, 0, 0).setInteractive({useHandCursor: true});
            
            sendHit.on('pointerdown', () => this.sendChatMessage());
            this.chatContainer.add([sendBtnBg, sendBtnTxt, sendHit]);
            
            const htmlElement = this.chatInput.getChildByID('chatInput');
            if (htmlElement) {
                htmlElement.addEventListener('keydown', (e) => e.stopPropagation());
                htmlElement.addEventListener('keypress', (event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') this.sendChatMessage();
                });
            }
        } else {
            const promptTxt = this.add.text(this.chatW / 2, inputY - 45, "চ্যাট করতে Google লগইন করুন", { fontSize: "30px", fontFamily: "'Anek Bangla'", color: "#aaaaaa" }).setOrigin(0.5);
            
            const loginBg = this.add.graphics();
            loginBg.fillStyle(0x0066aa, 1);
            loginBg.fillRoundedRect(this.chatW / 2 - 160, inputY - 10, 320, 75, 30);
            const loginTxt = this.add.text(this.chatW / 2, inputY + 27.5, "Connect (Google)", { fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
            const loginHit = this.add.rectangle(this.chatW / 2, inputY + 27.5, 320, 75, 0x000000, 0).setInteractive({useHandCursor: true});

            loginHit.on('pointerdown', () => {
                this.playSound('sfx_click');
                if (window.signInWithGoogle) window.signInWithGoogle().then(() => this.scene.restart());
            });

            this.chatContainer.add([promptTxt, loginBg, loginTxt, loginHit]);
        }

        // 6. Global Floating Trigger Button
        this.chatToggleBtn = this.add.container(w - 70, h / 2 + 50).setDepth(9001);
        const toggleBg = this.add.circle(0, 0, 55, 0x002255, 0.9).setStrokeStyle(4, 0x00ffff);
        const toggleIcon = this.add.text(0, 0, "💬", { fontSize: "50px" }).setOrigin(0.5);
        const toggleHit = this.add.circle(0, 0, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        toggleHit.on('pointerdown', () => this.toggleChatWindow());
        this.chatToggleBtn.add([toggleBg, toggleIcon, toggleHit]);

        // 7. Smooth Scroll UI & Gestures
        this.chatMaxScroll = 0;
        const scrollZoneHeight = this.chatH - 240;
        
        // Muted Scrollbar
        this.chatScrollbarBg = this.add.rectangle(this.chatW - 12, 105 + scrollZoneHeight / 2, 8, scrollZoneHeight, 0x000000, 0.2);
        this.chatScrollbarThumb = this.add.rectangle(this.chatW - 12, 105, 8, 50, 0x666666, 0.6).setOrigin(0.5, 0.5);
        this.chatContainer.add([this.chatScrollbarBg, this.chatScrollbarThumb]);

        this.updateChatScrollbar = () => {
            if (this.chatMaxScroll <= 0) {
                this.chatScrollbarThumb.setVisible(false);
                this.chatScrollbarBg.setVisible(false);
                return;
            }
            this.chatScrollbarThumb.setVisible(true);
            this.chatScrollbarBg.setVisible(true);

            const scrollRatio = Phaser.Math.Clamp((105 - this.msgListContainer.y) / this.chatMaxScroll, 0, 1);
            const thumbHeight = Math.max(40, (scrollZoneHeight / (this.chatMaxScroll + scrollZoneHeight)) * scrollZoneHeight);
            
            this.chatScrollbarThumb.height = thumbHeight;
            const thumbMinY = 105 + thumbHeight / 2;
            const thumbMaxY = 105 + scrollZoneHeight - thumbHeight / 2;
            this.chatScrollbarThumb.y = thumbMinY + scrollRatio * (thumbMaxY - thumbMinY);
        };

        const scrollZone = this.add.zone(this.chatW / 2, 105 + scrollZoneHeight / 2, this.chatW, scrollZoneHeight).setInteractive();
        this.chatContainer.add(scrollZone);

        let dragStartY = 0, containerStartY = 0, isDraggingChat = false, lastDragY = 0, chatVelocity = 0;

        scrollZone.on('pointerdown', (pointer) => {
            dragStartY = pointer.y;
            lastDragY = pointer.y;
            containerStartY = this.msgListContainer.y;
            isDraggingChat = true;
            chatVelocity = 0;
            this.tweens.killTweensOf(this.msgListContainer);
        });

        scrollZone.on('pointermove', (pointer) => {
            if (pointer.isDown && isDraggingChat) {
                let newY = containerStartY + (pointer.y - dragStartY);
                this.msgListContainer.y = Phaser.Math.Clamp(newY, 105 - this.chatMaxScroll, 105);
                chatVelocity = pointer.y - lastDragY;
                lastDragY = pointer.y;
                this.updateChatScrollbar();
            }
        });

        const stopChatDrag = () => {
            if (isDraggingChat) {
                isDraggingChat = false;
                if (Math.abs(chatVelocity) > 2) {
                    let newY = this.msgListContainer.y + (chatVelocity * 12);
                    newY = Phaser.Math.Clamp(newY, 105 - this.chatMaxScroll, 105);
                    this.tweens.add({
                        targets: this.msgListContainer,
                        y: newY,
                        duration: 500,
                        ease: 'Cubic.easeOut',
                        onUpdate: () => this.updateChatScrollbar()
                    });
                }
            }
        };

        scrollZone.on('pointerup', stopChatDrag);
        scrollZone.on('pointerout', stopChatDrag);

        scrollZone.on('wheel', (pointer, deltaX, deltaY, deltaZ) => {
            this.tweens.killTweensOf(this.msgListContainer);
            let newY = this.msgListContainer.y - (deltaY * 1.5);
            newY = Phaser.Math.Clamp(newY, 105 - this.chatMaxScroll, 105);
            this.msgListContainer.y = newY;
            this.updateChatScrollbar();
        });

        // 8. Connect to Firestore
        this.listenToGlobalChat();
    },

    toggleChatWindow() {
        this.playSound('sfx_click');
        this.isChatOpen = !this.isChatOpen;
        
        const targetY = this.isChatOpen ? this.chatYVisible : this.chatYHidden;
        this.chatBlocker.setVisible(this.isChatOpen);

        if (this.isChatOpen) {
            this.chatContainer.setVisible(true);
            
            // Snap to most recent chat every time it's opened!
            this.msgListContainer.y = 105 - this.chatMaxScroll;
            this.updateChatScrollbar();
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

    // Bad Word Filter Method
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

            let currentY = 15;
            const isAdmin = GameState.profile && GameState.profile.role === 'admin';
            const currentUserUid = (window.FirebaseAuth && window.FirebaseAuth.currentUser) ? window.FirebaseAuth.currentUser.uid : null;

            const pinnedMessages = messages.filter(m => m.pinned);
            const regularMessages = messages.filter(m => !m.pinned);

            const renderMessage = (msg, isPinned) => {
                const isMe = currentUserUid && (msg.uid === currentUserUid);
                
                // Formatted to: Name • Lvl 5
                const levelText = msg.lvl ? ` • Lvl ${msg.lvl}` : "";
                const nameStr = (isPinned ? "📌 " : "") + (msg.n || "Guest") + levelText;
                
                let nameColor;
                if (isPinned) nameColor = "#ffd700";
                else if (isMe) nameColor = "#00ffff"; 
                else nameColor = this.getDeterministicColor(msg.uid);
                
                const bubbleMaxWidth = this.chatW * 0.78;
                
                const msgTxt = this.add.text(0, 0, msg.text, { 
                    fontSize: "28px", fontFamily: "'Anek Bangla', sans-serif", color: "#ffffff", wordWrap: { width: bubbleMaxWidth - 46 } 
                });

                const bubbleW = Math.max(msgTxt.width + 46, 150);
                const bubbleH = msgTxt.height + 36;
                let startX = isMe ? (this.chatW - bubbleW - 25) : 25;

                const nameTxt = this.add.text(0, 0, nameStr, { 
                    fontSize: "24px", fontFamily: "'Anek Bangla'", color: nameColor, fontStyle: "bold" 
                });
                nameTxt.setPosition(isMe ? (this.chatW - nameTxt.width - 30) : 30, currentY);

                const bubbleBg = this.add.graphics();
                if (isMe) {
                    bubbleBg.fillStyle(0x004c99, 1); 
                    bubbleBg.fillRoundedRect(startX, currentY + 36, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 22, br: 0 });
                } else {
                    bubbleBg.fillStyle(0x223344, 1); 
                    bubbleBg.fillRoundedRect(startX, currentY + 36, bubbleW, bubbleH, { tl: 22, tr: 22, bl: 0, br: 22 });
                }

                msgTxt.setPosition(startX + 23, currentY + 54);

                const timeStr = this.timeAgo(msg.timestamp);
                const timeTxt = this.add.text(0, 0, timeStr, { 
                    fontSize: "18px", fontFamily: "Arial", color: "#aaaaaa" 
                });
                timeTxt.setPosition(isMe ? (this.chatW - timeTxt.width - 30) : 30, currentY + 36 + bubbleH + 6);

                this.msgListContainer.add([nameTxt, bubbleBg, msgTxt, timeTxt]);

                if (isAdmin) {
                    const adminX = isMe ? (startX - 90) : (startX + bubbleW + 30);
                    const delBtn = this.add.text(adminX, currentY + 50, "🗑️", { fontSize: "30px" }).setOrigin(0.5).setInteractive({useHandCursor: true});
                    delBtn.on('pointerdown', () => window.FirebaseTools.deleteDoc(window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id)));
                    
                    const pinBtn = this.add.text(adminX + 55, currentY + 50, isPinned ? "❌" : "📌", { fontSize: "30px" }).setOrigin(0.5).setInteractive({useHandCursor: true});
                    pinBtn.on('pointerdown', () => {
                        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                        window.FirebaseTools.updateDoc(docRef, { pinned: !isPinned });
                    });
                    this.msgListContainer.add([delBtn, pinBtn]);
                }

                currentY += bubbleH + 90; 
            };

            pinnedMessages.forEach(msg => renderMessage(msg, true));

            if (pinnedMessages.length > 0 && regularMessages.length > 0) {
                const divider = this.add.rectangle(this.chatW / 2, currentY - 5, this.chatW - 60, 2, 0x0066aa, 0.4);
                this.msgListContainer.add(divider);
                currentY += 15;
            }

            regularMessages.forEach(msg => renderMessage(msg, false));

            const visibleHeight = this.chatH - 240;
            this.chatMaxScroll = Math.max(0, currentY - visibleHeight);

            // Snap smoothly to most recent chat on any new update!
            this.tweens.add({
                targets: this.msgListContainer,
                y: 105 - this.chatMaxScroll,
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
        
        // Pass text through Bad Word filter before saving!
        text = this.filterBadWords(text);

        const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "Guest";
        const playerLvl = window.getLevelData ? window.getLevelData().level : ((GameState.profile && GameState.profile.level) ? GameState.profile.level : 1);

        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        
        window.FirebaseTools.addDoc(chatRef, {
            uid: window.FirebaseAuth.currentUser.uid,
            n: playerName,
            lvl: playerLvl, 
            text: text,
            timestamp: window.FirebaseTools.serverTimestamp(),
            pinned: false
        });

        htmlElement.value = ""; 
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