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
        
        // NEW: Save Theme Data
        localStorage.setItem('game_ownedThemes', JSON.stringify(GameState.ownedThemes));
        localStorage.setItem('game_equippedTheme', GameState.equippedTheme);

        localStorage.setItem('game_crafting', JSON.stringify(GameState.craftingQueue));
        localStorage.setItem('game_boosters', JSON.stringify(GameState.boosters));
        localStorage.setItem('game_gamesPlayed', GameState.gamesPlayed || 0);

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
    
    musicVolume: storedMusicVol !== null ? parseFloat(storedMusicVol) : 0.5,
    sfxVolume: storedSfxVol !== null ? parseFloat(storedSfxVol) : 1.0,

    keys: parseInt(localStorage.getItem('game_keys')) || 0,
    debris: parseInt(localStorage.getItem('game_debris')) || 0,
    ownedShips: JSON.parse(localStorage.getItem('game_ownedShips')) || ["default"],
    equippedShip: localStorage.getItem('game_equippedShip') || "default",
    
    // NEW: Theme State
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

// FIX: Update level targets now factors in Beginner's Luck to lower the question threshold
window.updateLevelTargets = function() {
    let played = (window.GameState && window.GameState.gamesPlayed !== undefined) ? window.GameState.gamesPlayed : 0;
    let luckFactor = Math.max(0, 5 - played) / 5;
    let discount = Math.floor(3 * luckFactor); // Reduces required questions by up to 3

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
    GameState.bossStage = 0;
    GameState.bossActive = false;
    GameState.skipsLeft = 10; 
    GameState.sessionHistory = [];
    window.updateLevelTargets(); 
};

window.ShipData = [
    { id: "ship_k1", name: "Crimson Arrow", costType: "keys", cost: 2, desc: "Fast and aerodynamic." },
    { id: "ship_k2", name: "Golden Eagle",  costType: "keys", cost: 5, desc: "A symbol of wealth." },
    { id: "ship_k3", name: "Neon Phantom",  costType: "keys", cost: 8, desc: "Glows with void energy." },
    { id: "ship_k4", name: "Heavy Titan",   costType: "keys", cost: 12, desc: "Built like a tank." },
    { id: "ship_k5", name: "Cosmic Lord",   costType: "keys", cost: 20, desc: "Forged in a star." },
    { id: "ship_k6", name: "Void Leviathan", costType: "keys", cost: 150, desc: "Ultimate weapon of the Dark." },
    { id: "ship_k7", name: "Solar Flare", costType: "keys", cost: 250, desc: "Power of a supernova." },
    { id: "ship_k8", name: "Celestial Guardian", costType: "keys", cost: 500, desc: "Blessed by the creators." },

    { id: "ship_d1", name: "Scrap Walker",  costType: "debris", cost: 50,  time: 2 * 60 * 60 * 1000, desc: "Welded together from junk." }, 
    { id: "ship_d2", name: "Rust Bucket",   costType: "debris", cost: 100, time: 3 * 60 * 60 * 1000, desc: "It ain't pretty, but it flies." }, 
    { id: "ship_d3", name: "Void Scavenger",costType: "debris", cost: 200, time: 4 * 60 * 60 * 1000, desc: "Adapted for deep space." }, 
    { id: "ship_d4", name: "Iron Clad",     costType: "debris", cost: 350, time: 6 * 60 * 60 * 1000, desc: "Heavy plating." }, 
    { id: "ship_d5", name: "Xeno-Hybrid",   costType: "debris", cost: 500, time: 7 * 60 * 60 * 1000, desc: "Half ship, half alien." }, 
    { id: "ship_d6", name: "Junk Behemoth", costType: "debris", cost: 3000, time: 24 * 60 * 60 * 1000, desc: "A colossus of ancient scrap." },
    { id: "ship_d7", name: "NIGHTMARE", costType: "debris", cost: 5000, time: 48 * 60 * 60 * 1000, desc: "A bio-cybernetic nightmare." }
];

window.BoosterData = [
    { id: "fireShield", name: "Fire Shield", cost: 5, desc: "Unbreakable shield for 20s.", icon: "icon_booster_fire" },
    { id: "speedBoost", name: "Speed Booster", cost: 8, desc: "+30% Game Speed for 30s.", icon: "icon_booster_speed" },
    { id: "batteryEff", name: "Battery Eff.", cost: 8, desc: "(2x) Battery Efficiency for 1 mins.", icon: "icon_booster_battery" }
];

// --- NEW: THEME DATABASE & COLOR CONFIGURATIONS ---
window.ThemeData = [
    {
        id: "theme_default", name: "Deep Space", costType: "free", cost: 0, desc: "The standard cosmic void.",
        colors: {
            bgTop: 0x1a0033, bgBot: 0x002b36,
            dynTopStart: 0x250049, dynTopEnd: 0x04002e,
            dynBotStart: 0x004248, dynBotEnd: 0x001300,
            nebulae: [0x242424, 0x373737, 0x161616],
            dynNebStart: 0xd5d5d5, dynNebEnd: 0xcccccc,
            starBase: 0x8888ff, starFast: 0xCFCFCF, starDistant: 0xffffff, debris: 0x444444
        }
    },
    {
        id: "theme_crimson", name: "Crimson Void", costType: "keys", cost: 5, desc: "A blood-red galaxy filled with danger.",
        colors: {
            bgTop: 0x2a0000, bgBot: 0x110000,
            dynTopStart: 0x3a0000, dynTopEnd: 0x1a0000,
            dynBotStart: 0x220000, dynBotEnd: 0x0a0000,
            nebulae: [0x331111, 0x441111, 0x220000],
            dynNebStart: 0xff8888, dynNebEnd: 0xcc4444,
            starBase: 0xffddaa, starFast: 0xffaaaa, starDistant: 0xff8888, debris: 0x552222
        }
    },
    {
        id: "theme_emerald", name: "Emerald Matrix", costType: "keys", cost: 10, desc: "Neon green data streams.",
        colors: {
            bgTop: 0x001a00, bgBot: 0x000a0a,
            dynTopStart: 0x002a00, dynTopEnd: 0x001100,
            dynBotStart: 0x001515, dynBotEnd: 0x000505,
            nebulae: [0x113311, 0x114411, 0x002200],
            dynNebStart: 0xaaffaa, dynNebEnd: 0x66cc66,
            starBase: 0xaaffaa, starFast: 0xccffcc, starDistant: 0x88ff88, debris: 0x225522
        }
    },
    {
        id: "theme_cyber", name: "Cyberpunk", costType: "keys", cost: 20, desc: "Vibrant pinks and cyans.",
        colors: {
            bgTop: 0x1a002b, bgBot: 0x000a1a,
            dynTopStart: 0x2b0033, dynTopEnd: 0x11001a,
            dynBotStart: 0x001122, dynBotEnd: 0x000511,
            nebulae: [0x331133, 0x112244, 0x220022],
            dynNebStart: 0xffaaff, dynNebEnd: 0xaa66ff,
            starBase: 0x00ffff, starFast: 0xff00ff, starDistant: 0x00ccff, debris: 0x332244
        }
    },
    {
        id: "theme_gold", name: "Golden Aura", costType: "keys", cost: 50, desc: "A majestic golden universe.",
        colors: {
            bgTop: 0x2b1a00, bgBot: 0x110a00,
            dynTopStart: 0x332200, dynTopEnd: 0x1a1100,
            dynBotStart: 0x221100, dynBotEnd: 0x0a0500,
            nebulae: [0x443311, 0x332211, 0x221100],
            dynNebStart: 0xffffaa, dynNebEnd: 0xccaa66,
            starBase: 0xffff00, starFast: 0xffdd00, starDistant: 0xffaa00, debris: 0x554422
        }
    }
];

window.getThemeColors = function() {
    const themeId = (window.GameState && window.GameState.equippedTheme) ? window.GameState.equippedTheme : "theme_default";
    const theme = window.ThemeData.find(t => t.id === themeId);
    return theme ? theme.colors : window.ThemeData[0].colors;
};