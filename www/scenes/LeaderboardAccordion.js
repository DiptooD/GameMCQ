class LeaderboardAccordion extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width) {
        super(scene, x, y);
        this.scene = scene;
        this.width = width;
        this.headerHeight = 65;
        this.expandedHeight = 400; // Will auto-adjust based on list size
        this.isOpen = false;
        this.players = [];
        
        // Ensure it overlaps the Info Box when expanded
        this.setDepth(150); 

        // Background
        this.bg = scene.add.graphics();
        this.drawBg(this.headerHeight);
        this.add(this.bg);

        // Header Text
        this.headerText = scene.add.text(0, 0, "🏆 টপ প্লেয়ার: লোড হচ্ছে... ▼", {
            fontSize: "26px", fontFamily: "'Anek Bangla', sans-serif", color: "#00ffff", fontStyle: "bold"
        }).setOrigin(0.5);
        this.add(this.headerText);

        // Hit Area for Header Click
        this.hitArea = scene.add.rectangle(0, 0, width, this.headerHeight, 0x000000, 0).setInteractive({ useHandCursor: true });
        this.add(this.hitArea);

        // List Container (Holds the names)
        this.listContainer = scene.add.container(0, this.headerHeight / 2);
        this.add(this.listContainer);

        // Geometry Mask (Hides the list when collapsed)
        this.maskShape = scene.make.graphics();
        this.maskShape.fillStyle(0xffffff);
        this.maskShape.fillRect(this.x - this.width/2, this.y + this.headerHeight/2, this.width, 0); 
        this.listMask = this.maskShape.createGeometryMask();
        this.listContainer.setMask(this.listMask);

        // Interactions
        this.hitArea.on('pointerdown', () => this.toggleAccordion());

        // Add to scene and Fetch Data
        scene.add.existing(this);
        this.fetchData();
    }

    drawBg(height) {
        this.bg.clear();
        this.bg.fillStyle(0x001122, 0.95);
        this.bg.fillRoundedRect(-this.width/2, -this.headerHeight/2, this.width, height, 20);
        this.bg.lineStyle(3, 0x0066aa, 0.8);
        this.bg.strokeRoundedRect(-this.width/2, -this.headerHeight/2, this.width, height, 20);
    }

    async fetchData() {
        if (!window.FirebaseDB || !window.FirebaseTools || !window.FirebaseTools.collection) {
            this.headerText.setText("🏆 টপ প্লেয়ার: অফলাইন ▼");
            return;
        }

        try {
            // Target the 'players' collection, order by profile.xp descending, limit to 10
            const usersRef = window.FirebaseTools.collection(window.FirebaseDB, "players");
            const q = window.FirebaseTools.query(usersRef, window.FirebaseTools.orderBy("profile.xp", "desc"), window.FirebaseTools.limit(10));
            
            const snapshot = await window.FirebaseTools.getDocs(q);
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if(data.profile) {
                    this.players.push({
                        name: data.profile.n || "Guest",
                        xp: data.profile.xp || 0,
                        avatar: window.getAvatars()[data.profile.a || 0] || "👨‍🚀"
                    });
                }
            });

            if (this.players.length > 0) {
                // Update collapsed view with Top 2 names
                let top1 = this.players[0] ? this.players[0].name.substring(0, 8) : "---";
                let top2 = this.players[1] ? this.players[1].name.substring(0, 8) : "---";
                this.headerText.setText(`🏆টপ প্লেয়ার: ১. ${top1}   ২. ${top2} ▼`);
                this.buildList();
            } else {
                this.headerText.setText("🏆 টপ প্লেয়ার: ডাটা নেই ▼");
            }
        } catch (e) {
            console.error("Leaderboard fetch error:", e);
            this.headerText.setText("🏆 টপ প্লেয়ার: কানেকশন এরর ▼");
        }
    }

    buildList() {
        let currentY = 15;
        this.players.forEach((p, index) => {
            // Gold, Silver, Bronze coloring for top 3
            let color = "#ffffff";
            if(index === 0) color = "#ffd700";
            else if(index === 1) color = "#c0c0c0";
            else if(index === 2) color = "#cd7f32";

            const rankText = this.scene.add.text(-this.width/2 + 30, currentY, `${index + 1}. ${p.avatar} ${p.name}`, {
                fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", color: color, fontStyle: "bold"
            }).setOrigin(0, 0);

            const xpText = this.scene.add.text(this.width/2 - 30, currentY, `${p.xp} XP`, {
                fontSize: "22px", fontFamily: "Arial", color: "#aaccff", fontStyle: "bold"
            }).setOrigin(1, 0);

            this.listContainer.add([rankText, xpText]);

            currentY += 40;
            // Divider line
            if (index < this.players.length - 1) {
                const div = this.scene.add.rectangle(0, currentY, this.width - 60, 1, 0x0055aa, 0.4);
                this.listContainer.add(div);
                currentY += 10;
            }
        });
        this.expandedHeight = currentY + 20; // Automatically sets container height
    }

    toggleAccordion() {
        if (!this.players || this.players.length === 0) return; 
        
        this.scene.playSound('sfx_click');
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            this.headerText.setText(this.headerText.text.replace("▼", "▲"));
            this.scene.tweens.addCounter({
                from: this.headerHeight,
                to: this.headerHeight + this.expandedHeight,
                duration: 350,
                ease: 'Cubic.out',
                onUpdate: (tween) => {
                    let val = tween.getValue();
                    this.drawBg(val);
                    this.maskShape.clear();
                    this.maskShape.fillStyle(0xffffff);
                    this.maskShape.fillRect(this.x - this.width/2, this.y + this.headerHeight/2, this.width, val - this.headerHeight);
                }
            });
        } else {
            this.headerText.setText(this.headerText.text.replace("▲", "▼"));
            this.scene.tweens.addCounter({
                from: this.headerHeight + this.expandedHeight,
                to: this.headerHeight,
                duration: 250,
                ease: 'Cubic.in',
                onUpdate: (tween) => {
                    let val = tween.getValue();
                    this.drawBg(val);
                    this.maskShape.clear();
                    this.maskShape.fillStyle(0xffffff);
                    this.maskShape.fillRect(this.x - this.width/2, this.y + this.headerHeight/2, this.width, val - this.headerHeight);
                }
            });
        }
    }
}