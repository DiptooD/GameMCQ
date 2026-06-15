class Leaderboard extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height) {
        super(scene, x, y);
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.players = [];

        this.loadingText = scene.add.text(0, 0, "লোড হচ্ছে...", {
            fontSize: "25px", 
            fontFamily: "'Anek Bangla', sans-serif", 
            color: "#e0f0ff",
            shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
        }).setOrigin(0.5);
        this.add(this.loadingText);

        scene.add.existing(this);
        this.fetchData();
    }

    async fetchData() {
        if (!window.FirebaseDB || !window.FirebaseTools || !window.FirebaseTools.collection) {
            this.loadingText.setText("অফলাইন মোড");
            return;
        }

        const isOnline = await window.checkRealConnection();
        if (!isOnline) {
            this.loadingText.setText("অফলাইন মোড");
            return;
        }

        try {
            const usersRef = window.FirebaseTools.collection(window.FirebaseDB, "players");
            const q = window.FirebaseTools.query(usersRef, window.FirebaseTools.orderBy("profile.xp", "desc"), window.FirebaseTools.limit(20));
            
            const snapshot = await window.FirebaseTools.getDocs(q);
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if(data.profile) {
                    this.players.push({
                        name: data.profile.n || "Guest",
                        xp: data.profile.xp || 0,
                        avatar: window.getAvatars ? (window.getAvatars()[data.profile.a || 0] || "👨‍🚀") : "👨‍🚀",
                        badge: data.profile.badge || ""
                    });
                }
            });

            if (this.players.length > 0) {
                // --- DYNAMIC CHAMPION BADGE ASSIGNMENT ---
                this.players[0].badge = "champion"; 
                
                // If the local player is #1, temporarily inject Champion status so Global Chat uses it
                if (window.GameState && window.GameState.profile && this.players[0].name === window.GameState.profile.n && this.players[0].xp === window.GameState.profile.xp) {
                    window.GameState.profile.tempBadge = "champion";
                } else if (window.GameState && window.GameState.profile) {
                    window.GameState.profile.tempBadge = null;
                }

                this.loadingText.setVisible(false);
                this.buildList();
            } else {
                this.loadingText.setText("ডাটা নেই");
            }
        } catch (e) {
            console.error("Leaderboard fetch error:", e);
            this.loadingText.setText("কানেকশন এরর");
        }
    }

    buildList() {
        const matrix = this.getWorldTransformMatrix();
        const maskShape = this.scene.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(matrix.tx - this.width / 2, matrix.ty - this.height / 2, this.width, this.height);
        const listMask = maskShape.createGeometryMask();

        const contentContainer = this.scene.add.container(0, 0);
        contentContainer.setMask(listMask);
        this.add(contentContainer);

        let itemSpacing = 36;
        let currentY = -this.height / 2 + (itemSpacing / 2);

        this.players.forEach((p, index) => {
            let color = "#ffffff";
            if(index === 0) color = "#ffd700"; 
            else if(index === 1) color = "#e0e0e0"; 
            else if(index === 2) color = "#cd7f32"; 

            // Handle Badge UI 
            const badgeInfo = window.getBadgeData(p.badge);
            const badgeIcon = badgeInfo ? `${badgeInfo.icon} ` : "";
            const displayColor = badgeInfo ? badgeInfo.color : color;

            const rankText = this.scene.add.text(-this.width/2 + 10, currentY, `${index + 1}. ${p.avatar} ${badgeIcon}${p.name.substring(0, 10)}`, {
                fontSize: "24px", 
                fontFamily: "'Anek Bangla', sans-serif", 
                color: displayColor, 
                fontStyle: "bold",
                padding: { y: 2 },
                shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
            }).setOrigin(0, 0.5);

            const xpText = this.scene.add.text(this.width/2 - 10, currentY, `${p.xp} XP`, {
                fontSize: "22px", 
                fontFamily: "Arial", 
                color: "#aaccff", 
                fontStyle: "bold",
                shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
            }).setOrigin(1, 0.5);

            contentContainer.add([rankText, xpText]);
            
            if (index < this.players.length - 1) {
                const div = this.scene.add.rectangle(0, currentY + itemSpacing/2, this.width - 20, 1.5, 0x004488, 0.25);
                contentContainer.add(div);
            }

            currentY += itemSpacing;
        });

        const totalListHeight = this.players.length * itemSpacing;
        const visibleHeight = this.height;

        if (totalListHeight > visibleHeight) {
            const dragZone = this.scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0)
                .setInteractive({ useHandCursor: true, draggable: true });
            this.add(dragZone);

            let startDragY = 0;
            let startContentY = 0;

            dragZone.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                startDragY = pointer.y;
                startContentY = contentContainer.y;
            });

            dragZone.on('drag', (pointer) => {
                let deltaY = pointer.y - startDragY;
                let newY = startContentY + deltaY;

                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;

                if (newY > maxY) newY = maxY + (newY - maxY) * 0.2;
                if (newY < minY) newY = minY + (newY - minY) * 0.2;

                contentContainer.y = newY;
            });

            dragZone.on('dragend', () => {
                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;
                let targetY = contentContainer.y;

                if (targetY > maxY) targetY = maxY;
                if (targetY < minY) targetY = minY;

                if (targetY !== contentContainer.y) {
                    this.scene.tweens.add({
                        targets: contentContainer, y: targetY, duration: 200, ease: 'Back.easeOut'
                    });
                }
            });
            
            dragZone.on('wheel', (pointer, deltaX, deltaY, deltaZ) => {
                let newY = contentContainer.y - deltaY;
                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;
                
                if (newY > maxY) newY = maxY;
                if (newY < minY) newY = minY;
                
                contentContainer.y = newY;
            });
        }
    }
}