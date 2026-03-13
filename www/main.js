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
        fps: 60,                // Force physics to calculate at 60fps
        fixedStep: true,        // Prevents objects passing through each other during lag
        gravity: { y: 0 } 
    }
  },
  // Add this to prevent the "Black Screen" on some Android WebViews
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  audio: {
    disableWebAudio: false // Ensures WebAudio API is prioritized for better performance
  },
  input: {
    activePointers: 2, // Allows for multi-touch (e.g., shooting while tapping an answer)
  },
  scene: [LoadingScene, MenuScene, ShopScene, SpinWheelScene, GameScene, QuestionScene, PauseScene, DeathScene]
};

// Explicitly force the browser to download and load the fonts
Promise.all([
  document.fonts.load('400 10px "Anek Bangla"'),
  document.fonts.load('600 10px "Anek Bangla"'),
  document.fonts.load('700 10px "Anek Bangla"'),
  document.fonts.load('800 10px "Anek Bangla"')
]).then(() => {
  window.game = new Phaser.Game(config);
}).catch((err) => {
  console.log("Font load error, starting anyway:", err);
  window.game = new Phaser.Game(config);
});

// --- Cordova Device Ready Android Logic ---
document.addEventListener("deviceready", () => {
    
    // INSTANTLY HIDE CORDOVA SPLASH SCREEN 
    if (navigator.splashscreen) {
        navigator.splashscreen.hide();
    }    
    // 2. Handle "App Pause" (Screen Locking / Minimization)
    const handleAppPause = () => {
        if (!window.game) return;

        // Stop all audio to prevent background music playing while minimized
        if (window.game.sound) {
            window.game.sound.pauseAll(); 
        }

        // Halt the game loop and push the Pause Scene to save battery
        const sceneManager = window.game.scene;
        if (sceneManager.isActive("GameScene")) {
            const gameScene = sceneManager.getScene("GameScene");
            
            // Prevent pausing during the 3-2-1 countdown phase
            if (gameScene && gameScene.isResuming) return;

            gameScene.scene.pause("GameScene");
            gameScene.scene.pause("QuestionScene");
            
            if (!sceneManager.isActive("PauseScene") && !sceneManager.isActive("DeathScene")) {
                gameScene.scene.launch("PauseScene");
            }
        }
    };

    const handleAppResume = () => {
        if (window.game && window.game.sound) {
            // WebAudio Context Suspension Fix for Mobile
            if (window.game.sound.context && window.game.sound.context.state === 'suspended') {
                window.game.sound.context.resume();
            }
            window.game.sound.resumeAll(); 
        }
    };

    // Listeners for Phone minimization and screen locks
    document.addEventListener("pause", handleAppPause, false);
    document.addEventListener("resume", handleAppResume, false);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) handleAppPause();
        else handleAppResume();
    }, false);


    // 1. The "Double Back" to Exit & Navigation Routing
    let lastBackTime = 0;
  
    document.addEventListener("backbutton", (e) => {
        e.preventDefault(); // Prevent default browser back behavior
        const now = Date.now();
        
        const sceneManager = window.game.scene;
        const isGameRunning = sceneManager.isActive("GameScene");
        const isPauseOpen = sceneManager.isActive("PauseScene");
        const isMenuOpen = sceneManager.isActive("MenuScene");
        const isShopOpen = sceneManager.isActive("ShopScene");
        const isWheelOpen = sceneManager.isActive("SpinWheelScene");
        const isDeathOpen = sceneManager.isActive("DeathScene");

        // Debounce to prevent multiple rapid presses freezing the game graph
        if (!isMenuOpen) {
            if (now - lastBackTime < 300) return; 
            lastBackTime = now;
        }

        // From sub-menus, go back to Main Menu
        if (isWheelOpen || isShopOpen) {
            sceneManager.stop(isWheelOpen ? "SpinWheelScene" : "ShopScene");
            sceneManager.start("MenuScene");
            return;
        }

        // From Game Over/Death Scene, go back to Main Menu
        if (isDeathOpen) {
            sceneManager.stop("DeathScene");
            sceneManager.start("MenuScene");
            return;
        }

        // From Pause Menu, resume the game SAFELY via the PauseScene method
        if (isPauseOpen) {
           const pauseScene = sceneManager.getScene("PauseScene");
           if (pauseScene) pauseScene.resumeGame(); 
           return;
        }

        // From active Game, open Pause Menu safely
        if (isGameRunning) {
            const gameScene = sceneManager.getScene("GameScene");
            if (gameScene && gameScene.isResuming) return; // Block pause during countdown

            // Use the scene plugin to properly pause and launch without crashing
            gameScene.scene.pause("GameScene");
            gameScene.scene.pause("QuestionScene");
            gameScene.scene.launch("PauseScene"); 
            // NOTE: Do NOT call bringToTop() here. Launch adds it to the top automatically.
            return;
        } 
        
        // From Main Menu, Double-Tap to Exit App
        if (isMenuOpen) {
            if (now - lastBackTime < 2000) {
                if (navigator.app && navigator.app.exitApp) {
                    navigator.app.exitApp(); // Native Cordova App Exit
                }
            } else {
                lastBackTime = now;
                showToast("Press Back again to Exit");
            }
        }
    }, false);

}, false);

// Helper function to render native-looking Android toasts
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
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s ease";
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 2000);
}