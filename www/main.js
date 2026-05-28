const screenRatio = window.innerHeight / window.innerWidth;
const gameWidth = 720;
const gameHeight = gameWidth * screenRatio;

const config = {
  type: Phaser.AUTO,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: gameWidth,
    height: gameHeight
  },
  physics: {
    default: "arcade",
    arcade: { 
        debug: false,
        fps: 60,                
        fixedStep: false, 
        gravity: { y: 0 } 
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false, 
    clearBeforeRender: false
  },
  audio: {
    disableWebAudio: false 
  },
  input: {
    activePointers: 2, 
  },
  scene: [LoadingScene, MenuScene, ShopScene, SpinWheelScene, ReadingScene, SettingsScene, GameScene, QuestionScene, PauseScene, DeathScene, PlayerProfileScene]
};

Promise.all([
  document.fonts.load('400 10px "Anek Bangla"'),
  document.fonts.load('600 10px "Anek Bangla"'),
  document.fonts.load('700 10px "Anek Bangla"'),
  document.fonts.load('800 10px "Anek Bangla"')
]).then(async () => {
  // NEW: Wait for Firebase to download data before making the game
  if (window.connectToCloud) {
      await window.connectToCloud();
  }
  window.game = new Phaser.Game(config);
}).catch(async (err) => {
  console.log("Font load error, starting anyway:", err);
  if (window.connectToCloud) {
      await window.connectToCloud();
  }
  window.game = new Phaser.Game(config);
});

document.addEventListener("deviceready", () => {
    if (navigator.splashscreen) {
        navigator.splashscreen.hide();
    }    
    
    const handleAppPause = () => {
        if (!window.game) return;
        if (window.game.sound) window.game.sound.pauseAll(); 
    };

    const handleAppResume = () => {
        if (window.game && window.game.sound) {
            if (window.game.sound.context && window.game.sound.context.state === 'suspended') {
                window.game.sound.context.resume();
            }
            window.game.sound.resumeAll(); 
        }
    };

    document.addEventListener("pause", handleAppPause, false);
    document.addEventListener("resume", handleAppResume, false);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) handleAppPause();
        else handleAppResume();
    }, false);

    let lastBackTime = 0;
  
    document.addEventListener("backbutton", (e) => {
        e.preventDefault(); 
        const now = Date.now();
        
        const sceneManager = window.game.scene;
        const isGameRunning = sceneManager.isActive("GameScene");
        const isPauseOpen = sceneManager.isActive("PauseScene");
        const isMenuOpen = sceneManager.isActive("MenuScene");
        const isShopOpen = sceneManager.isActive("ShopScene");
        const isWheelOpen = sceneManager.isActive("SpinWheelScene");
        const isDeathOpen = sceneManager.isActive("DeathScene");
        const isReadingOpen = sceneManager.isActive("ReadingScene"); 
        const isSettingsOpen = sceneManager.isActive("SettingsScene"); 
        const isProfileOpen = sceneManager.isActive("PlayerProfileScene");

        if (!isMenuOpen) {
            if (now - lastBackTime < 300) return; 
            lastBackTime = now;
        }

        if (isSettingsOpen || isProfileOpen) {
            if(isSettingsOpen) sceneManager.stop("SettingsScene");
            if(isProfileOpen) sceneManager.stop("PlayerProfileScene");
            sceneManager.resume("MenuScene");
            return;
        }

        if (isWheelOpen || isShopOpen || isReadingOpen) {
            if(isWheelOpen) sceneManager.stop("SpinWheelScene");
            if(isShopOpen) sceneManager.stop("ShopScene");
            if(isReadingOpen) sceneManager.stop("ReadingScene");
            
            sceneManager.start("MenuScene");
            return;
        }

        if (isDeathOpen) {
            sceneManager.stop("DeathScene");
            sceneManager.start("MenuScene");
            return;
        }

        if (isPauseOpen) {
           const pauseScene = sceneManager.getScene("PauseScene");
           if (pauseScene) pauseScene.resumeGame(); 
           return;
        }

        if (isGameRunning) {
            const gameScene = sceneManager.getScene("GameScene");
            // FIX: Prevent routing conflicts when game state is locked in animation or death sequences
            if (gameScene && (gameScene.isResuming || gameScene.isAnimating || gameScene.gamePaused)) return; 

            gameScene.scene.pause("GameScene");
            gameScene.scene.pause("QuestionScene");
            gameScene.scene.launch("PauseScene"); 
            return;
        } 
        
        if (isMenuOpen) {
            if (now - lastBackTime < 2000) {
                if (navigator.app && navigator.app.exitApp) {
                    navigator.app.exitApp(); 
                }
            } else {
                lastBackTime = now;
                showToast("Press Back again to Exit");
            }
        }
    }, false);

}, false);

function showToast(message) {
  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style.position = "fixed";
  toast.style.bottom = "50px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.backgroundColor = "rgba(40,40,40,0.9)";
  toast.style.color = "#ffffff";
  toast.style.padding = "12px 24px";
  toast.style.borderRadius = "24px";
  toast.style.zIndex = "10000"; 
  toast.style.fontFamily = "sans-serif";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.3)";
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s ease";
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 2000);
}
// --- NEW: Auto-Detect Online/Offline state changes mid-game ---
window.addEventListener('online', () => {
    window.isAppOnline = true;
    showToast("Internet Connection Restored! Syncing Data...");
    
    // Trigger Sync immediately on reconnect
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(swRegistration => {
            swRegistration.sync.register('sync-game-data');
        });
    }
});

window.addEventListener('offline', () => {
    window.isAppOnline = false;
    showToast("You are offline. Playing in Offline Mode.");
});