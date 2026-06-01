// Chat.js
// Attaches Chat functions directly to MenuScene so it shares the Scene context
Object.assign(MenuScene.prototype, {

    createGlobalChat() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        
        this.isChatOpen = false;
        
        // 1. Chat Container (Starts off-screen to the right)
        this.chatContainer = this.add.container(w, 0).setDepth(9000);
        
        // 2. Chat Background
        const chatBg = this.add.graphics();
        chatBg.fillStyle(0x000c22, 0.95);
        chatBg.fillRoundedRect(0, 50, 400, h - 100, 20); // 400px wide
        chatBg.lineStyle(3, 0x0066aa, 1);
        chatBg.strokeRoundedRect(0, 50, 400, h - 100, 20);
        
        const title = this.add.text(200, 80, "গ্লোবাল চ্যাট", {
            fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.chatContainer.add([chatBg, title]);

        // 3. Message List Container
        this.msgListContainer = this.add.container(0, 130);
        this.chatContainer.add(this.msgListContainer);

        // Masking for chat text (Created using world coordinates)
        this.chatMaskShape = this.make.graphics();
        this.chatMaskShape.fillStyle(0xffffff);
        this.chatMaskShape.fillRect(w, 130, 400, h - 280); 
        this.msgListContainer.setMask(this.chatMaskShape.createGeometryMask());

        // 4. HTML Input Field (DOM Element)
        const isConnected = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        const inputHTML = isConnected 
            ? `<input type="text" id="chatInput" autocomplete="off" placeholder="এখানে লিখুন..." style="width: 320px; padding: 12px; font-family: 'Anek Bangla'; font-size: 18px; border-radius: 10px; border: 2px solid #0066aa; outline: none; background: #051025; color: #fff;">`
            : `<input type="text" disabled placeholder="চ্যাট করতে Google লগইন করুন" style="width: 320px; padding: 12px; font-family: 'Anek Bangla'; font-size: 18px; border-radius: 10px; border: 2px solid #333; outline: none; background: #111; color: #777;">`;
            
        this.chatInput = this.add.dom(200, h - 90).createFromHTML(inputHTML);
        this.chatContainer.add(this.chatInput);
        
        // Listen for Enter key and prevent Phaser from hijacking keyboard events
        const htmlElement = this.chatInput.getChildByID('chatInput');
        if (htmlElement) {
            htmlElement.addEventListener('keydown', (e) => e.stopPropagation());
            htmlElement.addEventListener('keypress', (event) => {
                event.stopPropagation();
                if (event.key === 'Enter') this.sendChatMessage();
            });
        }

        // 5. Toggle Button (Floats on the right side)
        this.chatToggleBtn = this.add.container(w - 50, 100).setDepth(9001);
        const toggleBg = this.add.circle(0, 0, 40, 0x002255, 0.9).setStrokeStyle(3, 0x00ffff);
        const toggleIcon = this.add.text(0, 0, "💬", { fontSize: "36px" }).setOrigin(0.5);
        const toggleHit = this.add.circle(0, 0, 45, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        toggleHit.on('pointerdown', () => this.toggleChatWindow());
        this.chatToggleBtn.add([toggleBg, toggleIcon, toggleHit]);

        // 6. Manual Scrolling Logic
        this.chatMaxScroll = 0;
        const scrollZone = this.add.zone(200, 130 + (h - 280) / 2, 400, h - 280).setInteractive();
        this.chatContainer.add(scrollZone);

        let dragStartY = 0;
        let containerStartY = 0;

        scrollZone.on('pointerdown', (pointer) => {
            dragStartY = pointer.y;
            containerStartY = this.msgListContainer.y;
        });

        scrollZone.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                let newY = containerStartY + (pointer.y - dragStartY);
                this.msgListContainer.y = Phaser.Math.Clamp(newY, 130 - this.chatMaxScroll, 130);
            }
        });

        scrollZone.on('wheel', (pointer, deltaX, deltaY, deltaZ) => {
            let newY = this.msgListContainer.y - deltaY;
            this.msgListContainer.y = Phaser.Math.Clamp(newY, 130 - this.chatMaxScroll, 130);
        });

        // 7. Connect to Firestore
        this.listenToGlobalChat();
    },

    toggleChatWindow() {
        this.playSound('sfx_click');
        this.isChatOpen = !this.isChatOpen;
        
        const targetX = this.isChatOpen ? this.cameras.main.width - 400 : this.cameras.main.width;
        
        this.tweens.add({
            targets: this.chatContainer,
            x: targetX,
            duration: 350,
            ease: 'Cubic.easeOut'
        });

        // Move mask alongside container
        this.tweens.add({
            targets: this.chatMaskShape,
            x: this.isChatOpen ? -400 : 0,
            duration: 350,
            ease: 'Cubic.easeOut'
        });

        if (!this.isChatOpen) {
            const htmlElement = this.chatInput.getChildByID('chatInput');
            if(htmlElement) htmlElement.blur();
        }
    },

    listenToGlobalChat() {
        if (!window.FirebaseDB || !window.FirebaseTools) return;
        
        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        // Limit query to 105 to load 100 correctly, and delete the 5 overflow messages
        const q = window.FirebaseTools.query(chatRef, window.FirebaseTools.orderBy("timestamp", "desc"), window.FirebaseTools.limit(105));
        
        this.chatUnsubscribe = window.FirebaseTools.onSnapshot(q, (snapshot) => {
            this.msgListContainer.removeAll(true);
            
            let messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });

            // Reverse to show oldest at the top, newest at the bottom
            messages.reverse();

            // Clean up old chats securely without overloading queries
            if (messages.length > 100) {
                const toDelete = messages.slice(0, messages.length - 100);
                this.cleanUpOldChats(toDelete);
                messages = messages.slice(messages.length - 100);
            }

            let currentY = 0;
            const isAdmin = GameState.profile && GameState.profile.role === 'admin';

            // Partition messages: Pinned items at the top, then regular
            const pinnedMessages = messages.filter(m => m.pinned);
            const regularMessages = messages.filter(m => !m.pinned);

            const renderMessage = (msg, isPinned) => {
                const nameColor = isPinned ? "#ffd700" : "#00aaff";
                const icon = isPinned ? "📌 " : "";
                
                const nameTxt = this.add.text(20, currentY, `${icon}${msg.n || "Guest"}:`, { 
                    fontSize: "20px", fontFamily: "'Anek Bangla'", color: nameColor, fontStyle: "bold" 
                });
                
                const msgTxt = this.add.text(20, currentY + 26, msg.text, { 
                    fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#ffffff", wordWrap: { width: isAdmin ? 270 : 320 } 
                });

                this.msgListContainer.add([nameTxt, msgTxt]);

                // Admin Controls
                if (isAdmin) {
                    const delBtn = this.add.text(350, currentY, "🗑️", { fontSize: "16px" }).setInteractive({useHandCursor: true});
                    delBtn.on('pointerdown', () => window.FirebaseTools.deleteDoc(window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id)));
                    
                    const pinBtn = this.add.text(320, currentY, isPinned ? "❌" : "📌", { fontSize: "16px" }).setInteractive({useHandCursor: true});
                    pinBtn.on('pointerdown', () => {
                        const docRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", msg.id);
                        window.FirebaseTools.updateDoc(docRef, { pinned: !isPinned });
                    });
                    
                    this.msgListContainer.add([delBtn, pinBtn]);
                }

                currentY += msgTxt.height + 40; 
            };

            pinnedMessages.forEach(msg => renderMessage(msg, true));

            // Optional Divider between pinned and regular messages
            if (pinnedMessages.length > 0 && regularMessages.length > 0) {
                const divider = this.add.rectangle(200, currentY, 360, 2, 0x0066aa, 0.4);
                this.msgListContainer.add(divider);
                currentY += 15;
            }

            regularMessages.forEach(msg => renderMessage(msg, false));

            // Calculate max scrolling constraint 
            const visibleHeight = this.cameras.main.height - 280;
            this.chatMaxScroll = Math.max(0, currentY - visibleHeight);

            // Auto-scroll to the bottom when a new message arrives
            this.tweens.add({
                targets: this.msgListContainer,
                y: 130 - this.chatMaxScroll,
                duration: 200
            });
        });
    },

    sendChatMessage() {
        const htmlElement = this.chatInput.getChildByID('chatInput');
        if (!htmlElement) return;

        const text = htmlElement.value.trim();
        if (!text || !window.FirebaseAuth || !window.FirebaseAuth.currentUser) return;

        const playerName = (GameState.profile && GameState.profile.n) ? GameState.profile.n : "Guest";

        const chatRef = window.FirebaseTools.collection(window.FirebaseDB, "global_chat");
        
        window.FirebaseTools.addDoc(chatRef, {
            uid: window.FirebaseAuth.currentUser.uid,
            n: playerName,
            text: text,
            timestamp: window.FirebaseTools.serverTimestamp(),
            pinned: false
        });

        htmlElement.value = ""; // Clear input box
    },

    cleanUpOldChats(oldDocs) {
        oldDocs.forEach(doc => {
            const oldDocRef = window.FirebaseTools.doc(window.FirebaseDB, "global_chat", doc.id);
            window.FirebaseTools.deleteDoc(oldDocRef).catch(e => console.log("Chat auto-cleanup issue:", e));
        });
    }

});