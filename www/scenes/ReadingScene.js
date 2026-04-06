class ReadingScene extends Phaser.Scene {
    constructor() {
        super("ReadingScene");
    }

    create() {
        this.selectedBankKey = localStorage.getItem('saved_bankKey') || "all";
        this.selectedSubject = localStorage.getItem('saved_subject') || "all_no_math";

        this.dropdowns = [];
        this.backgroundLayers = [];

        // NEW: Pagination State
        this.currentPage = 0;
        this.itemsPerPage = 25; 

        this.createBackground();
        this.createTopBar();

        const cx = this.cameras.main.centerX;
        const w = this.cameras.main.width;
        const UI_WIDTH = w - 60;
        
        const manifest = this.cache.json.get('bank_directory');
        if (!manifest) {
            this.showToast("প্রশ্ন ব্যাংক পাওয়া যায়নি!");
            return;
        }

        // --- FILTERS AREA ---
        const bankOptions = ["All", ...manifest.banks.map(b => b.name).reverse()];
        const subjectOptions = ["All", "All Without Math", ...manifest.subjects];

        let initBankName = "All";
        if (this.selectedBankKey !== "all") {
            const b = manifest.banks.find(x => x.key === this.selectedBankKey);
            if (b) initBankName = b.name;
        }

        let initSubName = "All Without Math"; 
        if (this.selectedSubject === "all") initSubName = "All";
        else if (this.selectedSubject !== "all_no_math") initSubName = this.selectedSubject;

        // Top Filter Dropdowns
        this.createDropdown(cx, 150, UI_WIDTH, 65, "Bank", bankOptions, initBankName, (selectedName) => {
            if (selectedName === "All") {
                this.selectedBankKey = "all";
            } else {
                const bankObj = manifest.banks.find(b => b.name === selectedName);
                this.selectedBankKey = bankObj ? bankObj.key : "all";
            }
            localStorage.setItem('saved_bankKey', this.selectedBankKey);
            this.currentPage = 0; // Reset pagination on filter change
            this.renderQuestionsList();
        });

        this.createDropdown(cx, 230, UI_WIDTH, 65, "Subject", subjectOptions, initSubName, (selectedSub) => {
            if (selectedSub === "All") this.selectedSubject = "all";
            else if (selectedSub === "All Without Math") this.selectedSubject = "all_no_math";
            else this.selectedSubject = selectedSub;
            localStorage.setItem('saved_subject', this.selectedSubject);
            this.currentPage = 0; // Reset pagination on filter change
            this.renderQuestionsList();
        });

        // --- LIST AREA SETTINGS ---
        this.listStartY = 300;
        this.listHeight = this.cameras.main.height - this.listStartY - 20;

        this.contentContainer = this.add.container(0, this.listStartY);
        
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(0, this.listStartY, w, this.listHeight);
        const mask = maskShape.createGeometryMask();
        this.contentContainer.setMask(mask);

        // Click outside closes dropdowns
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                this.closeAllDropdowns();
            }
        });

        this.renderQuestionsList();
    }

    update(time, delta) {
        const safeTimeScale = Phaser.Math.Clamp(delta / 16.66, 0.1, 2.5);

        if (this.scrollingBg) {
            this.scrollingBg.tilePositionY -= 0.6 * safeTimeScale;
        }

        if (this.backgroundLayers) {
            this.backgroundLayers.forEach(layer => {
                layer.group.children.iterate(star => {
                    if (star) {
                        star.y += layer.speed * safeTimeScale;
                        if (star.y > this.cameras.main.height) {
                            star.y = -10;
                            star.x = Phaser.Math.Between(0, 720);
                        }
                    }
                });
            });
        }

        if (this.scrollData && this.scrollState) {
            if (!this.scrollState.isDragging) {
                let { contentContainer, listStartY, minScroll } = this.scrollData;
                let vY = this.scrollState.velocityY;
                let currentY = contentContainer.y;

                if (Math.abs(vY) > 0.01) {
                    currentY += vY * 16 * safeTimeScale;
                    this.scrollState.velocityY *= Math.pow(0.9, safeTimeScale); 
                }

                if (currentY > listStartY) {
                    currentY += (listStartY - currentY) * 0.2 * safeTimeScale;
                    if (Math.abs(listStartY - currentY) < 0.5) currentY = listStartY;
                } else if (currentY < listStartY + minScroll) {
                    currentY += ((listStartY + minScroll) - currentY) * 0.2 * safeTimeScale;
                    if (Math.abs((listStartY + minScroll) - currentY) < 0.5) currentY = listStartY + minScroll;
                }

                contentContainer.y = currentY;
            } else {
                this.scrollState.velocityY *= 0.8; 
            }
        }
    }

    renderQuestionsList() {
        if (this.scrollZone) {
            this.scrollZone.destroy();
            this.scrollZone = null;
        }

        // Extremely important to prevent lag
        this.contentContainer.removeAll(true);
        this.contentContainer.y = this.listStartY;
        this.scrollData = null;
        this.scrollState = null;

        const manifest = this.cache.json.get('bank_directory');
        let finalQuestions = [];

        if (this.selectedBankKey === "all") {
            manifest.banks.forEach(bank => {
                const data = this.cache.json.get(bank.key);
                if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
            });
        } else {
            const data = this.cache.json.get(this.selectedBankKey);
            if (Array.isArray(data)) finalQuestions = finalQuestions.concat(data);
        }

        finalQuestions = finalQuestions.filter(q => q.question && q.question.trim() !== "");

        if (this.selectedSubject === "all_no_math") {
            finalQuestions = finalQuestions.filter(q => q.subject !== "Math");
        } else if (this.selectedSubject !== "all") {
            finalQuestions = finalQuestions.filter(q => q.subject === this.selectedSubject);
        }

        const cx = this.cameras.main.centerX;
        const w = this.cameras.main.width;
        let currentY = 10;

        if (finalQuestions.length === 0) {
            const noData = this.add.text(cx, this.listHeight / 2, "কোন প্রশ্ন পাওয়া যায়নি", { 
                fontSize: "32px", fontFamily: "'Anek Bangla'", color: "#666" 
            }).setOrigin(0.5);
            this.contentContainer.add(noData);
            return;
        }

        const totalPages = Math.max(1, Math.ceil(finalQuestions.length / this.itemsPerPage));
        
        // Ensure we don't end up on an empty page if data changes
        if (this.currentPage >= totalPages) this.currentPage = Math.max(0, totalPages - 1);

        const paginatedQs = finalQuestions.slice(this.currentPage * this.itemsPerPage, (this.currentPage + 1) * this.itemsPerPage);

        const statsText = this.add.text(cx, currentY, `মোট প্রশ্ন: ${finalQuestions.length} টি`, {
            fontSize: "22px", fontFamily: "'Anek Bangla'", color: "#00e1ff", fontStyle: "bold"
        }).setOrigin(0.5);
        this.contentContainer.add(statsText);
        currentY += 40;

        const cardW = w - 40;
        const startX = cx - cardW / 2;

        paginatedQs.forEach((item, index) => {
            const p = 20; 
            const textW = cardW - (p * 2);

            const qNum = (this.currentPage * this.itemsPerPage) + index + 1;

            const qText = this.add.text(startX + p, currentY + p, `${qNum}. ${item.question.replace(/।/g, '')}`, {
                fontSize: "26px", fontFamily: "'Anek Bangla'", color: "#ffffff",
                wordWrap: { width: textW }, lineSpacing: 6 
            }).setOrigin(0, 0);

            let elementsToAdd = [qText];
            let ansY = currentY + p + qText.height + 15;
            
            // MODIFIED: Render all 4 options
            const labels = ["ক)", "খ)", "গ)", "ঘ)"];
            if (item.options && Array.isArray(item.options)) {
                item.options.forEach((opt, idx) => {
                    const isCorrect = (idx === item.answer);
                    const color = isCorrect ? "#00ff00" : "#aaaaaa";
                    const fontStyle = isCorrect ? "bold" : "normal";
                    const prefix = labels[idx] ? `${labels[idx]} ` : "";

                    const optText = this.add.text(startX + p, ansY, `${prefix}${opt}`, {
                        fontSize: "24px", fontFamily: "'Anek Bangla'", color: color, fontStyle: fontStyle,
                        wordWrap: { width: textW }, lineSpacing: 4
                    }).setOrigin(0, 0);

                    elementsToAdd.push(optText);
                    ansY += optText.height + 8;
                });
            }

            const tagY = ansY + 10;
            const subTag = item.subject || item.category || "General";
            const bankTag = item.bank || "General";
            
            const tagText = this.add.text(startX + cardW - p, tagY, `[${subTag} | ${bankTag}]`, {
                fontSize: "18px", fontFamily: "'Anek Bangla'", color: "#888888"
            }).setOrigin(1, 0);
            elementsToAdd.push(tagText);

            const totalHeight = (tagY + tagText.height + p) - currentY;

            const bg = this.add.graphics();
            bg.fillStyle(0x051025, 0.85);
            bg.fillRoundedRect(startX, currentY, cardW, totalHeight, 12); 
            bg.lineStyle(2, 0x004488, 1); 
            bg.strokeRoundedRect(startX, currentY, cardW, totalHeight, 12);

            this.contentContainer.add(bg);
            elementsToAdd.forEach(el => this.contentContainer.add(el));
            
            currentY += totalHeight + 15; 
        });

        // Add Pagination Controls at the bottom
        if (totalPages > 1) {
            currentY += 10;
            const pageControlHeight = 60;
            const paginationBg = this.add.rectangle(cx, currentY + pageControlHeight/2, cardW, pageControlHeight, 0x001133, 0.9).setStrokeStyle(2, 0x0066aa);
            this.contentContainer.add(paginationBg);

            const pageText = this.add.text(cx, currentY + pageControlHeight/2, `পেজ ${this.currentPage + 1} / ${totalPages}`, {
                fontSize: "24px", fontFamily: "'Anek Bangla'", color: "#ffffff", fontStyle: "bold"
            }).setOrigin(0.5);
            this.contentContainer.add(pageText);

            // Previous Button
            if (this.currentPage > 0) {
                const prevBg = this.add.rectangle(cx - 120, currentY + pageControlHeight/2, 60, 40, 0x003366).setStrokeStyle(2, 0x00aaff).setInteractive({ useHandCursor: true });
                const prevTxt = this.add.text(cx - 120, currentY + pageControlHeight/2, "⬅", { fontSize: "28px" }).setOrigin(0.5);
                
                prevBg.on('pointerdown', () => {
                    this.playSound('sfx_click');
                    this.currentPage--;
                    this.renderQuestionsList();
                });
                this.contentContainer.add([prevBg, prevTxt]);
            }

            // Next Button
            if (this.currentPage < totalPages - 1) {
                const nextBg = this.add.rectangle(cx + 120, currentY + pageControlHeight/2, 60, 40, 0x003366).setStrokeStyle(2, 0x00aaff).setInteractive({ useHandCursor: true });
                const nextTxt = this.add.text(cx + 120, currentY + pageControlHeight/2, "➡", { fontSize: "28px" }).setOrigin(0.5);
                
                nextBg.on('pointerdown', () => {
                    this.playSound('sfx_click');
                    this.currentPage++;
                    this.renderQuestionsList();
                });
                this.contentContainer.add([nextBg, nextTxt]);
            }

            currentY += pageControlHeight + 20;
        } else {
            currentY += 20;
        }

        // Apply scrolling rules based on new total height
        if (currentY > this.listHeight) {
            const minScroll = this.listHeight - currentY;
            let startY = 0;
            let containerStartY = 0;
            let lastTime = 0;
            let lastY = 0;

            this.scrollZone = this.add.zone(cx, this.listStartY + this.listHeight/2, w, this.listHeight).setInteractive();
            this.scrollState = { isDragging: false, velocityY: 0 };
            this.scrollData = { contentContainer: this.contentContainer, listStartY: this.listStartY, minScroll };

            this.scrollZone.on('pointerdown', (pointer) => {
                this.scrollState.isDragging = true;
                this.scrollState.velocityY = 0;
                startY = pointer.y;
                lastY = pointer.y;
                containerStartY = this.contentContainer.y;
                lastTime = this.time.now;
            });

            this.input.on('pointermove', (pointer) => {
                if (this.scrollState.isDragging) {
                    const diff = pointer.y - startY;
                    let newY = containerStartY + diff;

                    if (newY > this.listStartY) {
                        newY = this.listStartY + (newY - this.listStartY) * 0.4;
                    } else if (newY < this.listStartY + minScroll) {
                        newY = this.listStartY + minScroll + (newY - (this.listStartY + minScroll)) * 0.4;
                    }
                    
                    this.contentContainer.y = newY;

                    const now = this.time.now;
                    const dt = now - lastTime;
                    if (dt > 0) {
                        const instantVelocity = (pointer.y - lastY) / dt;
                        this.scrollState.velocityY = (this.scrollState.velocityY * 0.4) + (instantVelocity * 0.6);
                    }
                    
                    lastTime = now;
                    lastY = pointer.y;
                }
            });

            const stopDrag = () => { if (this.scrollState) this.scrollState.isDragging = false; };
            this.input.on('pointerup', stopDrag);
            this.input.on('pointerout', stopDrag);
        }
    }

    createTopBar() {
        const w = this.cameras.main.width;
        const cx = w / 2;

        this.add.graphics().fillStyle(0x051025, 0.95).fillRect(0, 0, w, 100);
        this.add.rectangle(cx, 100, w, 3, 0x0066aa, 0.8);

        this.add.text(cx, 50, "স্টাডি মোড (Reading Mode)", {
            fontSize: "40px", fontFamily: "'Anek Bangla'", color: "#00e1ff",
            fontStyle: "bold", stroke: "#000000", strokeThickness: 5
        }).setOrigin(0.5);

        const iconY = 50;
        const exitBg = this.add.circle(50, iconY, 28, 0x001122, 0.8).setStrokeStyle(3, 0xaa0000);
        const exitIcon = this.add.text(50, iconY, "⬅", { fontSize: '32px' }).setOrigin(0.5);
        const exitHitArea = this.add.circle(50, iconY, 35).setInteractive({ useHandCursor: true });

        exitHitArea.on('pointerdown', () => {
            this.playSound('sfx_back');
            this.tweens.add({ targets: [exitBg, exitIcon], scale: 0.9, duration: 50, yoyo: true });
            this.scene.start("MenuScene");
        });
    }

    createDropdown(x, y, width, height, label, options, initialVal, onSelect) {
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x081830, 0.9);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
        bg.lineStyle(2, 0x0088cc, 0.7);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);

        const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });

        const formatText = (lbl, val) => {
            let str = `${lbl}: ${val}`;
            return str.length > 25 ? str.substring(0, 23) + "..." : str;
        };

        const mainText = this.add.text(-width/2 + 25, 0, formatText(label, initialVal), { 
            fontSize: "26px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 600, color: "#ffffff" 
        }).setOrigin(0, 0.5);

        const arrow = this.add.text(width/2 - 30, 0, "▼", { 
            fontSize: "20px", color: "#00ffff" 
        }).setOrigin(0.5);

        container.add([bg, mainText, arrow, hitArea]);
        container.depth = 20; 

        const listContainerWorldY = y + height/2 + 5;
        const listContainer = this.add.container(0, height/2 + 5);
        listContainer.setVisible(false);
        listContainer.setAlpha(0); 
        container.add(listContainer);

        const itemHeight = 70; 
        const maxVisibleItems = 5; 
        const visibleHeight = Math.min(options.length * itemHeight, maxVisibleItems * itemHeight);
        const totalListHeight = options.length * itemHeight;
        const isScrollable = totalListHeight > visibleHeight;

        const listBg = this.add.graphics();
        listBg.fillStyle(0x020815, 0.98);
        listBg.fillRoundedRect(-width/2, 0, width, visibleHeight, 15);
        listBg.lineStyle(2, 0x0066aa, 1);
        listBg.strokeRoundedRect(-width/2, 0, width, visibleHeight, 15);
        listContainer.add(listBg);

        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(x - width/2, listContainerWorldY, width, visibleHeight);
        const listMask = maskGraphics.createGeometryMask();

        const listContentContainer = this.add.container(0, 0);
        listContentContainer.setMask(listMask);
        listContainer.add(listContentContainer);

        const highlightBg = this.add.rectangle(0, 0, width - 4, itemHeight - 2, 0x0088ff, 0.25).setAlpha(0);
        listContentContainer.add(highlightBg);

        let currentY = 0;
        options.forEach((opt, index) => {
            const optText = this.add.text(-width/2 + 25, currentY + itemHeight/2, opt, {
                fontSize: "24px", fontFamily: "'Anek Bangla', sans-serif", fontWeight: 500, color: "#b3d4ff" 
            }).setOrigin(0, 0.5);

            if (index < options.length - 1) {
                const divider = this.add.rectangle(0, currentY + itemHeight, width - 20, 1, 0x003355, 0.6);
                listContentContainer.add(divider);
            }

            listContentContainer.add(optText);
            currentY += itemHeight;
        });

        let scrollBarThumb;
        if (isScrollable) {
            const scrollBarBg = this.add.rectangle(width/2 - 8, visibleHeight/2, 6, visibleHeight - 10, 0x000000, 0.5);
            const thumbHeight = Math.max(30, (visibleHeight / totalListHeight) * visibleHeight);
            scrollBarThumb = this.add.rectangle(width/2 - 8, thumbHeight/2 + 5, 6, thumbHeight, 0x00aaff, 0.8).setOrigin(0.5);
            listContainer.add([scrollBarBg, scrollBarThumb]);
        }

        const dragZone = this.add.rectangle(0, visibleHeight/2, width, visibleHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true, draggable: isScrollable });
        listContainer.add(dragZone);

        let startDragY = 0;
        let isDragging = false;
        let startContentY = 0;

        dragZone.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            startDragY = pointer.y;
            isDragging = false;
            startContentY = listContentContainer.y;
        });

        dragZone.on('pointermove', (pointer) => {
            const localY = pointer.y - listContainerWorldY - listContentContainer.y;
            const index = Math.floor(localY / itemHeight);
            if (index >= 0 && index < options.length) {
                highlightBg.y = index * itemHeight + itemHeight / 2;
                highlightBg.setAlpha(1);
            } else {
                highlightBg.setAlpha(0);
            }
        });

        dragZone.on('pointerout', () => { highlightBg.setAlpha(0); });

        if (isScrollable) {
            dragZone.on('drag', (pointer) => {
                isDragging = true;
                let deltaY = pointer.y - startDragY;
                let newY = startContentY + deltaY;

                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;

                if (newY > maxY) newY = maxY + (newY - maxY) * 0.2;
                if (newY < minY) newY = minY + (newY - minY) * 0.2;

                listContentContainer.y = newY;

                const scrollPercent = Phaser.Math.Clamp(newY / minY, 0, 1);
                const thumbHeight = scrollBarThumb.height;
                const thumbMaxY = visibleHeight - 5 - thumbHeight/2;
                const thumbMinY = 5 + thumbHeight/2;
                scrollBarThumb.y = thumbMinY + scrollPercent * (thumbMaxY - thumbMinY);
            });

            dragZone.on('dragend', () => {
                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;
                let targetY = listContentContainer.y;

                if (targetY > maxY) targetY = maxY;
                if (targetY < minY) targetY = minY;

                if (targetY !== listContentContainer.y) {
                    this.tweens.add({
                        targets: listContentContainer, y: targetY, duration: 200, ease: 'Back.easeOut'
                    });
                }
            });
            
            dragZone.on('wheel', (pointer, deltaX, deltaY, deltaZ) => {
                let newY = listContentContainer.y - deltaY;
                const minY = -(totalListHeight - visibleHeight);
                const maxY = 0;
                if (newY > maxY) newY = maxY;
                if (newY < minY) newY = minY;
                
                listContentContainer.y = newY;

                const scrollPercent = Phaser.Math.Clamp(newY / minY, 0, 1);
                const thumbHeight = scrollBarThumb.height;
                const thumbMaxY = visibleHeight - 5 - thumbHeight/2;
                const thumbMinY = 5 + thumbHeight/2;
                scrollBarThumb.y = thumbMinY + scrollPercent * (thumbMaxY - thumbMinY);
            });
        }

        dragZone.on('pointerup', (pointer) => {
            pointer.event.stopPropagation();
            if (!isDragging || Math.abs(pointer.y - startDragY) < 10) {
                const localY = pointer.y - listContainerWorldY - listContentContainer.y;
                const index = Math.floor(localY / itemHeight);
                
                if (index >= 0 && index < options.length) {
                    const opt = options[index];
                    this.playSound('sfx_coin');
                    mainText.setText(formatText(label, opt));
                    onSelect(opt);
                    toggleMenu();
                }
            }
            isDragging = false;
        });

        let isOpen = false;
        const toggleMenu = () => {
            this.playSound('sfx_click');
            isOpen = !isOpen;
            
            if (isOpen) {
                listContainer.setVisible(true);
                container.depth = 100;
                
                this.tweens.add({ targets: listContainer, alpha: 1, duration: 150, ease: 'Power1' });
                
                this.dropdowns.forEach(d => {
                    if (d !== container && d.isOpen()) d.close();
                });
            } else {
                this.tweens.add({ 
                    targets: listContainer, alpha: 0, duration: 150, ease: 'Power1',
                    onComplete: () => {
                        listContainer.setVisible(false);
                        container.depth = 20;
                        listContentContainer.y = 0;
                        if (scrollBarThumb) scrollBarThumb.y = 5 + scrollBarThumb.height / 2;
                    }
                });
            }
            
            this.tweens.add({ targets: arrow, rotation: isOpen ? Math.PI : 0, duration: 200, ease: 'Cubic.out' });
        };

        container.close = () => {
            if(!isOpen) return;
            isOpen = false;
            this.tweens.add({ 
                targets: listContainer, alpha: 0, duration: 150, ease: 'Power1',
                onComplete: () => {
                    listContainer.setVisible(false);
                    container.depth = 20;
                }
            });
            this.tweens.add({ targets: arrow, rotation: 0, duration: 200 });
        };
        
        container.isOpen = () => isOpen;
        this.dropdowns.push(container);

        hitArea.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            toggleMenu();
        });
    }

    createBackground() {
        this.backgroundLayers = []; 
        if (!this.textures.exists('animated_bg_grad')) {
            const gradBg = this.make.graphics({x: 0, y: 0});
            gradBg.fillGradientStyle(0x020510, 0x020510, 0x0a1535, 0x0a1535, 1);
            gradBg.fillRect(0, 0, 720, 1280);
            gradBg.fillGradientStyle(0x0a1535, 0x0a1535, 0x020510, 0x020510, 1);
            gradBg.fillRect(0, 1280, 720, 1280);
            gradBg.generateTexture('animated_bg_grad', 720, 2560);
            gradBg.destroy();
        }

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        this.scrollingBg = this.add.tileSprite(w/2, h/2, w, h, 'animated_bg_grad').setDepth(-100);

        const neb1 = this.add.circle(w*0.3, h*0.1, 250, 0x0044aa, 0.1).setDepth(-99);
        const neb2 = this.add.circle(w*0.7, h*0.8, 300, 0x4400aa, 0.1).setDepth(-99);

        this.tweens.add({
            targets: [neb1, neb2], x: w*0.8, y: h*0.6, scale: 1.15, alpha: 0.15,
            duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        const createLayer = (count, speed, color, size, alpha = 1) => {
            const group = this.add.group();
            for (let i = 0; i < count; i++) {
                const x = Phaser.Math.Between(0, w);
                const y = Phaser.Math.Between(0, h);
                const star = this.add.circle(x, y, size, color, alpha).setDepth(-98);
                group.add(star);
            }
            this.backgroundLayers.push({ group: group, speed: speed });
        };

        createLayer(50, 0.4, 0x555588, 1.5, 0.5); 
        createLayer(30, 1.0, 0x88aaff, 2, 0.8); 
        createLayer(15, 2.2, 0xffffff, 2.5, 1); 
    }

    playSound(key, baseVolume = 1.0) {
        if (this.cache.audio.exists(key)) {
            const finalVolume = baseVolume * (window.GameState.sfxVolume !== undefined ? window.GameState.sfxVolume : 1.0);
            this.sound.play(key, { volume: finalVolume });
        }
    }

    showToast(msg) {
        const toast = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 450, msg, {
            fontSize: '24px', fontFamily: "'Anek Bangla'", color: '#ffffff', 
            backgroundColor: 'rgba(200, 0, 0, 0.95)', padding: {x: 20, y: 12}
        }).setOrigin(0.5).setDepth(5000).setAlpha(0);
        
        this.tweens.add({ targets: toast, alpha: 1, duration: 250, yoyo: true, hold: 2500, onComplete: () => toast.destroy() });
    }
    
    closeAllDropdowns() {
        this.dropdowns.forEach(d => d.close());
    }
}