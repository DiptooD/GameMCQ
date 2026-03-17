window.saveCurrency = function() {
    window.saveGame();
    console.log("Currency/Boosters Saved");
};

// Helper to save game state to local storage
window.saveGame = function() {
    try {
        localStorage.setItem('game_keys', GameState.keys || 0);
        localStorage.setItem('game_debris', GameState.debris || 0);
        localStorage.setItem('game_ownedShips', JSON.stringify(GameState.ownedShips));
        localStorage.setItem('game_equippedShip', GameState.equippedShip);
            localStorage.setItem('game_crafting', JSON.stringify(GameState.craftingQueue));
        localStorage.setItem('game_boosters', JSON.stringify(GameState.boosters));
        localStorage.setItem('game_gamesPlayed', GameState.gamesPlayed || 0);

        // Limit match history to last 20 games so LocalStorage doesn't explode
        if (GameState.matchHistory && GameState.matchHistory.length > 20) {
            GameState.matchHistory = GameState.matchHistory.slice(-20);
        }
        localStorage.setItem('game_matchHistory', JSON.stringify(GameState.matchHistory));

    } catch (e) {
        console.warn("Save failed: Storage is full.");
        // If history is the culprit, clear oldest half to make room
        if (e.name === 'QuotaExceededError') {
             GameState.matchHistory = GameState.matchHistory.slice(-5);
             localStorage.setItem('game_matchHistory', JSON.stringify(GameState.matchHistory));
        }
    }
};

// Centralized settings saver
window.saveSettings = function() {
    localStorage.setItem('settings_musicVol', GameState.musicVolume);
    localStorage.setItem('settings_sfxVol', GameState.sfxVolume);
};

// Safely parse local storage floats with fallbacks
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
    
    // --- GLOBAL AUDIO SETTINGS ---
    musicVolume: storedMusicVol !== null ? parseFloat(storedMusicVol) : 0.5,
    sfxVolume: storedSfxVol !== null ? parseFloat(storedSfxVol) : 1.0,

    // --- PERSISTENT DATA ---
    keys: parseInt(localStorage.getItem('game_keys')) || 0,
    debris: parseInt(localStorage.getItem('game_debris')) || 0,
    ownedShips: JSON.parse(localStorage.getItem('game_ownedShips')) || ["default"],
    equippedShip: localStorage.getItem('game_equippedShip') || "default",
    craftingQueue: JSON.parse(localStorage.getItem('game_crafting')) || {},
    boosters: JSON.parse(localStorage.getItem('game_boosters')) || { 
        fireShield: 0, 
        speedBoost: 0, 
        batteryEff: 0 
    },
    matchHistory: JSON.parse(localStorage.getItem('game_matchHistory')) || [],
    gamesPlayed: parseInt(localStorage.getItem('game_gamesPlayed')) || 0 // <-- Load Beginner Tracking
};

window.updateLevelTargets = function() {
    if (GameState.bossStage === 0) {
        GameState.totalCorrectNeeded = 10; 
    } else if (GameState.bossStage === 1) {
        GameState.totalCorrectNeeded = 7;  
    } else if (GameState.bossStage === 2) {
        GameState.totalCorrectNeeded = 5;  
    } else {
        GameState.totalCorrectNeeded = 9999; 
    }
    console.log(`Level Updated: Boss Stage ${GameState.bossStage + 1}, Target: ${GameState.totalCorrectNeeded}`);
};

window.resetGameState = function () {
    GameState.score = 0;
    GameState.battery = 100;
    GameState.lives = 3;
    GameState.weaponLevel = 1;
    GameState.correctCount = 0; 
    GameState.bossStage = 0;
    GameState.bossActive = false;
    GameState.skipsLeft = 10; 
    GameState.sessionHistory = [];
    
    // DO NOT RESET: keys, debris, ownedShips, equippedShip, craftingQueue, boosters, volumes, matchHistory, gamesPlayed
    window.updateLevelTargets(); 
};

// --- SHIP DATABASE CONFIGURATION ---
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

// --- BOOSTER DATABASE ---
window.BoosterData = [
    { id: "fireShield", name: "Fire Shield", cost: 5, desc: "Unbreakable shield for 20s.", icon: "icon_booster_fire" },
    { id: "speedBoost", name: "Speed Booster", cost: 8, desc: "+30% Game Speed for 30s.", icon: "icon_booster_speed" },
    { id: "batteryEff", name: "Battery Eff.", cost: 8, desc: "(2x) Battery Efficiency for 1 mins.", icon: "icon_booster_battery" }
];