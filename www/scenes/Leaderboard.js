class Leaderboard extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height) {
        super(scene, x, y);
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.players = [];

        // Updated loading text to match the 25px font and shadow of other tabs
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

        try {
            // Target the 'players' collection, order by profile.xp descending, limit to top 3
            const usersRef = window.FirebaseTools.collection(window.FirebaseDB, "players");
            const q = window.FirebaseTools.query(usersRef, window.FirebaseTools.orderBy("profile.xp", "desc"), window.FirebaseTools.limit(3));
            
            const snapshot = await window.FirebaseTools.getDocs(q);
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if(data.profile) {
                    this.players.push({
                        name: data.profile.n || "Guest",
                        xp: data.profile.xp || 0,
                        avatar: window.getAvatars ? (window.getAvatars()[data.profile.a || 0] || "👨‍🚀") : "👨‍🚀"
                    });
                }
            });

            if (this.players.length > 0) {
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
        // Calculate dynamic spacing based on the allocated height (110px)
        let itemSpacing = this.height / 3;
        let currentY = -this.height / 2 + (itemSpacing / 2)+ 8;

        this.players.forEach((p, index) => {
            // Gold, Silver, Bronze coloring for top 3
            let color = "#ffffff";
            if(index === 0) color = "#ffd700"; // Gold
            else if(index === 1) color = "#e0e0e0"; // Silver (brightened)
            else if(index === 2) color = "#cd7f32"; // Bronze

            // Rank & Name (Scaled up to 24px with matching shadows)
            const rankText = this.scene.add.text(-this.width/2 + 10, currentY, `${index + 1}. ${p.avatar} ${p.name.substring(0, 10)}`, {
                fontSize: "24px", 
                fontFamily: "'Anek Bangla', sans-serif", 
                color: color, 
                fontStyle: "bold",
                padding: { y: 2 },
                shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
            }).setOrigin(0, 0.5);

            // XP Score (Scaled up to 22px with matching shadows)
            const xpText = this.scene.add.text(this.width/2 - 10, currentY, `${p.xp} XP`, {
                fontSize: "22px", 
                fontFamily: "Arial", 
                color: "#aaccff", 
                fontStyle: "bold",
                shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 4, fill: true }
            }).setOrigin(1, 0.5);

            this.add([rankText, xpText]);
            
            // Divider line (exclude the last element) - made extremely subtle
            if (index < this.players.length - 1) {
                const div = this.scene.add.rectangle(0, currentY + itemSpacing/2, this.width - 20, 1.5, 0x004488, 0.25);
                this.add(div);
            }

            currentY += itemSpacing+8;
        });
    }
}