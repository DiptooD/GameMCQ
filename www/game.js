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
        
        // NEW: Save Daily Missions
        localStorage.setItem('game_dailyMissions', JSON.stringify(GameState.dailyMissions));
        localStorage.setItem('game_lastMissionDate', GameState.lastMissionDate || "");

        if (GameState.matchHistory && GameState.matchHistory.length > 20) {
            GameState.matchHistory = GameState.matchHistory.slice(-20);
        }
        localStorage.setItem('game_matchHistory', JSON.stringify(GameState.matchHistory));

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
};

const storedMusicVol = localStorage.getItem('settings_musicVol');
const storedSfxVol = localStorage.getItem('settings_sfxVol');

// NEW: Mission Generators
const generateDailyMissions = () => {
    const types = ["kill_enemies", "collect_debris", "answer_correct"];
    const missions = [];
    
    // Mission 1: Kills
    missions.push({ 
        id: "m1", type: "kill_enemies", target: Phaser.Math.Between(30, 60), 
        progress: 0, rewardType: "debris", rewardAmt: 20, 
        desc: "Defeat enemies" 
    });
    // Mission 2: Debris
    missions.push({ 
        id: "m2", type: "collect_debris", target: Phaser.Math.Between(15, 30), 
        progress: 0, rewardType: "keys", rewardAmt: 2, 
        desc: "Collect Debris" 
    });
    // Mission 3: Answers
    missions.push({ 
        id: "m3", type: "answer_correct", target: Phaser.Math.Between(10, 20), 
        progress: 0, rewardType: "keys", rewardAmt: 3, 
        desc: "Answer Correctly" 
    });
    
    return missions;
};

const todayStr = new Date().toDateString();
let storedMissions = JSON.parse(localStorage.getItem('game_dailyMissions'));
let storedDate = localStorage.getItem('game_lastMissionDate');

if (storedDate !== todayStr || !storedMissions) {
    storedMissions = generateDailyMissions();
    storedDate = todayStr;
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
    skipsLeft: 10,
    sessionHistory: [],
    gameMode: "normal", 
    
    // NEW: Combo System Data
    currentCombo: 0,
    hasFiftyFifty: false,
    fiftyFiftyOptionsToHide: [],
    
    // NEW: Daily Missions
    dailyMissions: storedMissions,
    lastMissionDate: storedDate,
    
    musicVolume: storedMusicVol !== null ? parseFloat(storedMusicVol) : 0.5,
    sfxVolume: storedSfxVol !== null ? parseFloat(storedSfxVol) : 1.0,

    keys: parseInt(localStorage.getItem('game_keys')) || 0,
    debris: parseInt(localStorage.getItem('game_debris')) || 0,
    ownedShips: JSON.parse(localStorage.getItem('game_ownedShips')) || ["default"],
    equippedShip: localStorage.getItem('game_equippedShip') || "default",
    
    ownedThemes: JSON.parse(localStorage.getItem('game_ownedThemes')) || ["theme_default"],
    equippedTheme: localStorage.getItem('game_equippedTheme') || "theme_default",

    craftingQueue: JSON.parse(localStorage.getItem('game_crafting')) || {},
    boosters: JSON.parse(localStorage.getItem('game_boosters')) || { 
        fireShield: 0, 
        speedBoost: 0, 
        batteryEff: 0 
    },
    matchHistory: JSON.parse(localStorage.getItem('game_matchHistory')) || [],
    gamesPlayed: parseInt(localStorage.getItem('game_gamesPlayed')) || 0 
};

// NEW: Global function to update mission progress
window.updateMissionProgress = function(type, amount = 1) {
    let updated = false;
    GameState.dailyMissions.forEach(m => {
        if (m.type === type && m.progress < m.target) {
            m.progress += amount;
            if (m.progress >= m.target) m.progress = m.target; // Cap it
            updated = true;
        }
    });
    if (updated) window.saveCurrency(); // Save quietly in background
};

window.updateLevelTargets = function() {
    let played = (window.GameState && window.GameState.gamesPlayed !== undefined) ? window.GameState.gamesPlayed : 0;
    let luckFactor = Math.max(0, 5 - played) / 5;
    let discount = Math.floor(3 * luckFactor);

    if (GameState.bossStage === 0) {
        GameState.totalCorrectNeeded = Math.max(3, 10 - discount); 
    } else if (GameState.bossStage === 1) {
        GameState.totalCorrectNeeded = Math.max(3, 7 - discount);  
    } else if (GameState.bossStage === 2) {
        GameState.totalCorrectNeeded = Math.max(2, 5 - discount);  
    } else {
        GameState.totalCorrectNeeded = 9999; 
    }
};

window.resetGameState = function () {
    GameState.score = 0;
    GameState.battery = 0;
    GameState.lives = 3;
    GameState.weaponLevel = 1;
    GameState.correctCount = 0; 
    GameState.currentCombo = 0; // Reset combo
    GameState.hasFiftyFifty = false;
    GameState.fiftyFiftyOptionsToHide = [];
    GameState.bossStage = 0;
    GameState.bossActive = false;
    GameState.skipsLeft = 10; 
    GameState.sessionHistory = [];
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