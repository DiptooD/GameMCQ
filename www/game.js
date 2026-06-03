window.saveCurrency = function() {
    window.saveGame();
    console.log("Currency/Boosters Saved");
};

window.saveGame = function() {
    try {
        localStorage.setItem('game_keys', GameState.keys || 0);
        localStorage.setItem('game_debris', GameState.debris || 0);
        localStorage.setItem('game_ownedShips', JSON.stringify(GameState.ownedShips));
        localStorage.setItem('game_equippedShip', GameState.equippedShip);
        
        localStorage.setItem('game_ownedThemes', JSON.stringify(GameState.ownedThemes));
        localStorage.setItem('game_equippedTheme', GameState.equippedTheme);

        localStorage.setItem('game_crafting', JSON.stringify(GameState.craftingQueue));
        localStorage.setItem('game_boosters', JSON.stringify(GameState.boosters));
        localStorage.setItem('game_gamesPlayed', GameState.gamesPlayed || 0);
        
        localStorage.setItem('game_rewardSkips', GameState.rewardSkips || 0);
        
        localStorage.setItem('game_dailyMissions', JSON.stringify(GameState.dailyMissions));
        localStorage.setItem('game_lastMissionDate', GameState.lastMissionDate || "");
        localStorage.setItem('game_dailyMissionsCompleted', GameState.dailyMissionsCompleted ? "true" : "false");
        
        localStorage.setItem('game_currentSubject', GameState.currentSubject || "all");
        localStorage.setItem('game_profile', JSON.stringify(GameState.profile));

        if (GameState.matchHistory && GameState.matchHistory.length > 15) {
            GameState.matchHistory = GameState.matchHistory.slice(-15);
        }
        localStorage.setItem('game_matchHistory', JSON.stringify(GameState.matchHistory));

        // --- FIREBASE CLOUD SYNC ---
        if (window.FirebaseAuth && window.FirebaseAuth.currentUser && window.FirebaseTools) {
            const uid = window.FirebaseAuth.currentUser.uid;
            const playerRef = window.FirebaseTools.doc(window.FirebaseDB, "players", uid);
            
            window.FirebaseTools.setDoc(playerRef, {
                keys: GameState.keys || 0,
                debris: GameState.debris || 0,
                ownedShips: GameState.ownedShips || ["default"],
                equippedShip: GameState.equippedShip || "default",
                ownedThemes: GameState.ownedThemes || ["theme_default"],
                equippedTheme: GameState.equippedTheme || "theme_default",
                boosters: GameState.boosters || {},
                rewardSkips: GameState.rewardSkips || 0,
                gamesPlayed: GameState.gamesPlayed || 0,
                profile: GameState.profile || {},
                lastSaved: new Date().toISOString()
            }, { merge: true }).then(() => {
                console.log("Cloud Sync Successful!");
            }).catch((err) => {
                console.warn("Cloud Sync Failed (Player might be offline). Local save secure.", err);
            });
        }

        // --- Trigger Background PWA Sync if supported ---
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(swRegistration => {
                return swRegistration.sync.register('sync-game-data');
            }).catch(err => {
                console.log('Background Sync could not be registered!', err);
            });
        }

    } catch (e) {
        console.warn("Save failed: Storage is full.");
        if (e.name === 'QuotaExceededError') {
             GameState.matchHistory = GameState.matchHistory.slice(-5);
             localStorage.setItem('game_matchHistory', JSON.stringify(GameState.matchHistory));
        }
    }
};

window.saveSettings = function() {
    localStorage.setItem('settings_musicVol', GameState.musicVolume);
    localStorage.setItem('settings_sfxVol', GameState.sfxVolume);
    localStorage.setItem('settings_qDelay', GameState.qDelayLevel);
};

window.getRankData = function(level) {
    if (level <= 5) return { tag: "শিক্ষানবিশ (Space Cadet)", avatar: "🛸" };
    if (level <= 10) return { tag: "নভোচারী (Astronaut)", avatar: "👨‍🚀" };
    if (level <= 15) return { tag: "তারাশিকারী (Star Hunter)", avatar: "🚀" };
    if (level <= 20) return { tag: "গ্যালাক্সি যোদ্ধা (Warrior)", avatar: "👾" };
    if (level <= 30) return { tag: "নেবুলা লর্ড (Nebula Lord)", avatar: "👽" };
    if (level <= 40) return { tag: "সুপারনোভা (Supernova)", avatar: "☄️" };
    if (level <= 50) return { tag: "কসমিক মাস্টার (Master)", avatar: "🌌" };
    return { tag: "লিজেন্ড (Galactic Legend)", avatar: "👑" };
};

window.getAvatars = function() {
    return ["👨‍🚀", "👽", "🤖", "👾", "🦸‍♂️", "🥷", "🧙‍♂️", "🧛‍♂️", "🧟‍♂️", "🧝‍♂️"];
};

window.getLevelData = function() {
    let xp = (window.GameState && window.GameState.profile && window.GameState.profile.xp) ? window.GameState.profile.xp : 0;
    let level = Math.floor(Math.sqrt(xp / 50)) + 1; 
    let currentLevelBaseXP = Math.pow(level - 1, 2) * 50;
    let nextLevelBaseXP = Math.pow(level, 2) * 50;
    let progress = xp - currentLevelBaseXP;
    let required = nextLevelBaseXP - currentLevelBaseXP;
    let percent = progress / required;
    return { level, progress, required, percent, xp };
};

const storedMusicVol = localStorage.getItem('settings_musicVol');
const storedSfxVol = localStorage.getItem('settings_sfxVol');

// FIX: Ensure Delay logic stays strictly within bounds to prevent 0s freezing
const storedQDelay = localStorage.getItem('settings_qDelay');
let parsedQDelay = storedQDelay !== null ? parseInt(storedQDelay) : 15;
if (isNaN(parsedQDelay) || parsedQDelay < 5 || parsedQDelay > 40) {
    parsedQDelay = 15; // Default 1.5 seconds if data is corrupted or old format
}

let storedRewardSkips = parseInt(localStorage.getItem('game_rewardSkips'));
if (isNaN(storedRewardSkips)) {
    let legacySkips = parseInt(localStorage.getItem('game_skips'));
    storedRewardSkips = !isNaN(legacySkips) ? Math.max(0, legacySkips - 10) : 0;
    localStorage.setItem('game_rewardSkips', storedRewardSkips);
}

let defaultProfile = { n: "নাম লিখুন", a: 0, xp: 0, k: 0, bk: 0, qr: 0, qw: 0, s: {} };
let storedProfile = JSON.parse(localStorage.getItem('game_profile')) || defaultProfile;
let mergedProfile = { ...defaultProfile, ...storedProfile };

const generateDailyMissions = () => {
    let xp = mergedProfile.xp || 0;
    let level = Math.floor(Math.sqrt(xp / 50)) + 1;
    let diffMult = 1 + (level * 0.15); 

    const missionPool = [
        { type: "kill_enemies", desc: "শত্রু ধ্বংস করুন", min: 30, max: 60 },
        { type: "collect_debris", desc: "ভাঙ্গারী সংগ্রহ করুন", min: 15, max: 30 },
        { type: "answer_correct", desc: "সঠিক উত্তর দিন", min: 10, max: 25 },
        { type: "play_matches", desc: "ম্যাচ খেলুন", min: 3, max: 6 },
        { type: "kill_bosses", desc: "বস ধ্বংস করুন", min: 1, max: 3 },
        { type: "collect_powerups", desc: "পাওয়ার-আপ সংগ্রহ করুন", min: 5, max: 12 },
        { type: "use_boosters", desc: "বুস্টার ব্যবহার করুন", min: 2, max: 4 },
        { type: "answer_combo", desc: "৩x কম্বো অর্জন করুন", min: 2, max: 5 }
    ];

    const shuffledPool = [...missionPool];
    Phaser.Utils.Array.Shuffle(shuffledPool);
    const selectedMissions = shuffledPool.slice(0, 3); 

    const missions = [];
    selectedMissions.forEach((mp, index) => {
        let target = Math.floor(Phaser.Math.Between(mp.min, mp.max) * diffMult);
        
        let rewardType, rewardAmt;
        const rewardRoll = Math.random();
        
        if (rewardRoll < 0.4) {
            rewardType = "xp";
            rewardAmt = Math.floor(Phaser.Math.Between(50, 100) * diffMult);
        } else if (rewardRoll < 0.8) {
            rewardType = "debris";
            rewardAmt = Math.floor(Phaser.Math.Between(20, 50) * (1 + level * 0.05));
        } else {
            const boosters = ["fireShield", "speedBoost", "batteryEff"];
            rewardType = "booster_" + Phaser.Utils.Array.GetRandom(boosters);
            rewardAmt = Phaser.Math.Between(1, 1 + Math.floor(level / 10));
        }

        missions.push({
            id: "m" + (index + 1),
            type: mp.type,
            target: target,
            progress: 0,
            rewardType: rewardType,
            rewardAmt: rewardAmt,
            desc: mp.desc,
            completed: false
        });
    });

    return missions;
};

const todayStr = new Date().toDateString();
let storedMissions = JSON.parse(localStorage.getItem('game_dailyMissions'));
let storedDate = localStorage.getItem('game_lastMissionDate');
let storedMissionsCompleted = localStorage.getItem('game_dailyMissionsCompleted') === "true";

if (storedDate !== todayStr || !storedMissions) {
    storedMissions = generateDailyMissions();
    storedDate = todayStr;
    storedMissionsCompleted = false;
}

window.GameState = {
    score: 0,
    battery: 0,
    lives: 3,
    weaponLevel: 1, 
    correctCount: 0, 
    totalCorrectNeeded: 10, 
    bossStage: 0, 
    bossActive: false,
    isEndlessMode: false,
    
    freeSkips: 10,
    rewardSkips: storedRewardSkips,
    
    sessionHistory: [],
    gameMode: "normal", 
    currentCombo: 0,
    hasFiftyFifty: false,
    fiftyFiftyOptionsToHide: [],
    
    profile: mergedProfile,
    
    dailyMissions: storedMissions,
    lastMissionDate: storedDate,
    dailyMissionsCompleted: storedMissionsCompleted,
    currentSubject: localStorage.getItem('game_currentSubject') || "all",
    
    musicVolume: storedMusicVol !== null ? parseFloat(storedMusicVol) : 0.5,
    sfxVolume: storedSfxVol !== null ? parseFloat(storedSfxVol) : 1.0,
    qDelayLevel: parsedQDelay, // Applied parsed safe delay here

    keys: parseInt(localStorage.getItem('game_keys')) || 0,
    debris: parseInt(localStorage.getItem('game_debris')) || 0,
    ownedShips: JSON.parse(localStorage.getItem('game_ownedShips')) || ["default"],
    equippedShip: localStorage.getItem('game_equippedShip') || "default",
    ownedThemes: JSON.parse(localStorage.getItem('game_ownedThemes')) || ["theme_default"],
    equippedTheme: localStorage.getItem('game_equippedTheme') || "theme_default",

    craftingQueue: JSON.parse(localStorage.getItem('game_crafting')) || {},
    boosters: JSON.parse(localStorage.getItem('game_boosters')) || { 
        fireShield: 0, speedBoost: 0, batteryEff: 0 
    },
    matchHistory: JSON.parse(localStorage.getItem('game_matchHistory')) || [],
    gamesPlayed: parseInt(localStorage.getItem('game_gamesPlayed')) || 0 
};

window.updateMissionProgress = function(type, amount = 1) {
    if (GameState.currentSubject && GameState.currentSubject !== "all" && GameState.currentSubject !== "all_no_math") {
        return;
    }
    let updated = false;
    let newlyCompleted = [];

    GameState.dailyMissions.forEach(m => {
        if (m.type === type && m.progress < m.target && !m.completed) {
            m.progress += amount;
            if (m.progress >= m.target) {
                m.progress = m.target;
                m.completed = true;
                newlyCompleted.push(m);
                
                if (m.rewardType === "debris") GameState.debris += m.rewardAmt;
                else if (m.rewardType === "skips") GameState.rewardSkips += m.rewardAmt;
                else if (m.rewardType === "keys") GameState.keys += m.rewardAmt; 
                else if (m.rewardType === "xp") {
                    if (GameState.profile) GameState.profile.xp = (GameState.profile.xp || 0) + m.rewardAmt;
                }
                else if (m.rewardType.startsWith("booster_")) {
                    const bType = m.rewardType.replace("booster_", "");
                    if (GameState.boosters[bType] !== undefined) GameState.boosters[bType] += m.rewardAmt;
                }
            }
            updated = true;
        }
    });

    if (updated) {
        const allDone = GameState.dailyMissions.every(m => m.completed);
        let allDoneReward = 0;
        if (allDone && !GameState.dailyMissionsCompleted) {
            GameState.dailyMissionsCompleted = true;
            allDoneReward = Phaser.Math.Between(100, 250);
            if (GameState.profile) {
                GameState.profile.xp = (GameState.profile.xp || 0) + allDoneReward;
            }
        }
        window.saveCurrency();

        if (window.game && window.game.scene) {
            const gameScene = window.game.scene.getScene("GameScene");
            if (gameScene && gameScene.scene.isActive()) {
                newlyCompleted.forEach(m => {
                    let rText = "";
                    if (m.rewardType === "debris") rText = `${m.rewardAmt} Debris`;
                    else if (m.rewardType === "skips") rText = `${m.rewardAmt} Skips`;
                    else if (m.rewardType === "keys") rText = `${m.rewardAmt} Keys`; 
                    else if (m.rewardType === "xp") rText = `${m.rewardAmt} XP`; 
                    else rText = "1 Booster";
                    gameScene.showMissionToast(`মিশন কমপ্লিট!\nপুরস্কার: ${rText}`);
                });

                if (allDoneReward > 0) {
                    setTimeout(() => {
                        if (gameScene && gameScene.scene.isActive()) {
                            gameScene.showMissionToast(`সবগুলো মিশন শেষ!\nপুরস্কার: ${allDoneReward} XP!`);
                        }
                    }, 2000);
                }
            }
        }
    }
};

window.updateLevelTargets = function() {
    let played = (window.GameState && window.GameState.gamesPlayed !== undefined) ? window.GameState.gamesPlayed : 0;
    let luckFactor = Math.max(0, 5 - played) / 5;
    let discount = Math.floor(3 * luckFactor);

    if (GameState.bossStage === 0) GameState.totalCorrectNeeded = Math.max(3, 10 - discount); 
    else if (GameState.bossStage === 1) GameState.totalCorrectNeeded = Math.max(3, 7 - discount);  
    else if (GameState.bossStage === 2) GameState.totalCorrectNeeded = Math.max(2, 5 - discount);  
    else GameState.totalCorrectNeeded = Infinity; 
};

window.resetGameState = function () {
    GameState.score = 0;
    GameState.battery = 0;
    GameState.lives = 3;
    GameState.weaponLevel = 1;
    GameState.correctCount = 0; 
    GameState.currentCombo = 0; 
    GameState.hasFiftyFifty = false;
    GameState.fiftyFiftyOptionsToHide = [];
    GameState.bossStage = 0;
    GameState.bossActive = false;
    GameState.isEndlessMode = false;
    GameState.sessionHistory = [];
    
    GameState.freeSkips = 10;
    
    window.updateLevelTargets(); 
};

window.ShipData = [
    { id: "ship_k1", name: "দোয়েল (Magpie Robin)", costType: "keys", cost: 2, desc: "নির্ভরযোগ্য এবং পরিচিত। (Reliable and standard.)" },
    { id: "ship_k2", name: "চিল (Kite)",  costType: "keys", cost: 5, desc: "Majestic brown predator of the Bengal sky." },
    { id: "ship_k3", name: "কোকিল (Cuckoo)",  costType: "keys", cost: 8, desc: "Dark feathers, red eyes, and a striking aura." },
    { id: "ship_k4", name: "শকুন (Vulture)",   costType: "keys", cost: 12, desc: "Broad wingspan. Built for incredible endurance." },
    { id: "ship_k5", name: "সাদা বক (Egret)",   costType: "keys", cost: 20, desc: "Elegant, pure white, serene, and deadly." },
    { id: "ship_k6", name: "কুটুম পেঁচা (Owl)", costType: "keys", cost: 150, desc: "Silent night hunter of the mystical dark." },
    { id: "ship_k7", name: "টিয়া (Parrot)", costType: "keys", cost: 250, desc: "Vibrant plumage radiating solar energy." },
    { id: "ship_k8", name: "সোনালী ঈগল (Golden Eagle)", costType: "keys", cost: 500, desc: "The supreme apex predator of the heavens." },
    { id: "ship_d1", name: "চড়ুই (Sparrow)",  costType: "debris", cost: 50,  time: 2 * 60 * 60 * 1000, desc: "Small, scrappy, and extremely agile." }, 
    { id: "ship_d2", name: "শালিক (Myna)",   costType: "debris", cost: 100, time: 3 * 60 * 60 * 1000, desc: "A common but very reliable companion." }, 
    { id: "ship_d3", name: "কাক (Crow)",costType: "debris", cost: 200, time: 4 * 60 * 60 * 1000, desc: "Highly intelligent and adaptable scavenger." }, 
    { id: "ship_d4", name: "বাদুড় (Fruit Bat)",     costType: "debris", cost: 350, time: 6 * 60 * 60 * 1000, desc: "Leathery wings, nocturnal beast." }, 
    { id: "ship_d5", name: "গাংচিল (Seagull)",   costType: "debris", cost: 500, time: 7 * 60 * 60 * 1000, desc: "Master rider of the coastal winds." }, 
    { id: "ship_d6", name: "হাড়গিলা (Stork)", costType: "debris", cost: 3000, time: 24 * 60 * 60 * 1000, desc: "Massive, tough, and highly intimidating." },
    { id: "ship_d7", name: "রাজহাঁস (Swan)", costType: "debris", cost: 5000, time: 48 * 60 * 60 * 1000, desc: "A territorial behemoth of the wetlands." }
];

window.BoosterData = [
    { id: "fireShield", name: "Fire Shield", cost: 5, desc: "Unbreakable shield for 20s.", icon: "icon_booster_fire" },
    { id: "speedBoost", name: "Speed Booster", cost: 8, desc: "+30% Game Speed for 30s.", icon: "icon_booster_speed" },
    { id: "batteryEff", name: "Battery Eff.", cost: 8, desc: "(2x) Battery Efficiency for 1 mins.", icon: "icon_booster_battery" }
];

window.ThemeData = [
    {
        id: "theme_default", name: "Deep Space", costType: "free", cost: 0, desc: "The standard cosmic void.",
        colors: {
            bgTop: 0x1A0545, bgBot: 0x003355,
            dynTopStart: 0x330A7A, dynTopEnd: 0x110230,
            dynBotStart: 0x005588, dynBotEnd: 0x001A33,
            nebulae: [0x5E22A8, 0x006699, 0x441177],
            dynNebStart: 0x77DDFF, dynNebEnd: 0x4488FF,
            starBase: 0xAADDFF, starFast: 0xFFFFFF, starDistant: 0x6688CC, debris: 0x445577
        }
    },
    {
        id: "theme_crimson", name: "Crimson Void", costType: "keys", cost: 5, desc: "A blood-red galaxy filled with danger.",
        colors: {
            bgTop: 0x4A0008, bgBot: 0x220000,
            dynTopStart: 0x660011, dynTopEnd: 0x330005,
            dynBotStart: 0x440000, dynBotEnd: 0x110000,
            nebulae: [0x881122, 0xAA2211, 0x550000],
            dynNebStart: 0xFF7777, dynNebEnd: 0xCC2233,
            starBase: 0xFFDDAA, starFast: 0xFFEEEE, starDistant: 0xAA5555, debris: 0x772222
        }
    },
    {
        id: "theme_emerald", name: "Emerald Matrix", costType: "keys", cost: 10, desc: "Neon green data streams.",
        colors: {
            bgTop: 0x003311, bgBot: 0x001105,
            dynTopStart: 0x005522, dynTopEnd: 0x00220A,
            dynBotStart: 0x003311, dynBotEnd: 0x000A05,
            nebulae: [0x117733, 0x22AA44, 0x004411],
            dynNebStart: 0x88FF88, dynNebEnd: 0x22CC44,
            starBase: 0xAAFFAA, starFast: 0xDDFFDD, starDistant: 0x44AA44, debris: 0x226633
        }
    },
    {
        id: "theme_cyber", name: "Cyberpunk", costType: "keys", cost: 20, desc: "Vibrant pinks and cyans.",
        colors: {
            bgTop: 0x2D004D, bgBot: 0x001A33,
            dynTopStart: 0x550088, dynTopEnd: 0x1A0033,
            dynBotStart: 0x003366, dynBotEnd: 0x000A1A,
            nebulae: [0x881188, 0x114488, 0x550055],
            dynNebStart: 0xFFAAFF, dynNebEnd: 0xAA44FF,
            starBase: 0x00FFFF, starFast: 0xFF00FF, starDistant: 0x0088CC, debris: 0x442266
        }
    },
    {
        id: "theme_gold", name: "Golden Aura", costType: "keys", cost: 50, desc: "A majestic golden universe.",
        colors: {
            bgTop: 0x4D2B00, bgBot: 0x220A00,
            dynTopStart: 0x774400, dynTopEnd: 0x331A00,
            dynBotStart: 0x441100, dynBotEnd: 0x110500,
            nebulae: [0x996611, 0xAA5500, 0x552200],
            dynNebStart: 0xFFFF88, dynNebEnd: 0xFFAA33,
            starBase: 0xFFFF00, starFast: 0xFFFFAA, starDistant: 0xAA7700, debris: 0x775511
        }
    }
];

window.getThemeColors = function() {
    const themeId = (window.GameState && window.GameState.equippedTheme) ? window.GameState.equippedTheme : "theme_default";
    const theme = window.ThemeData.find(t => t.id === themeId);
    return theme ? theme.colors : window.ThemeData[0].colors;
};