(() => {
  let redPillLocked = true;
  let bluePillLocked = true;
  let rabbitUnlocked = false;
  let matrixOverlay: HTMLDivElement | null = null;
  let glyphCanvas: HTMLCanvasElement | null = null;
  let glitchInterval: number | null = null;
  let matrixAudio: HTMLAudioElement | null = null;

  // WAKE UP - INITIAL TRIGGER
  (window as any).wake_up = () => {
    if (rabbitUnlocked) {
      console.log("%cYou've already awakened...", "color:#0f0; font-size:14px;");
      return;
    }

    console.log(`
%c╔══════════════════════════════════════╗
║   Wake up, Neo...                    ║
║   The Matrix has you...              ║
║   Follow the white rabbit.           ║
╚══════════════════════════════════════╝
`,
      "color:#0f0; font-family:monospace; font-size:14px;"
    );

    rabbitUnlocked = true;
    spawnWhiteRabbit();
  };

  // SPAWN WHITE RABBIT
  const spawnWhiteRabbit = () => {
    const rabbit = document.createElement('div');
    rabbit.className = 'white-rabbit';
    rabbit.innerHTML = '🐰';
    rabbit.title = 'Follow me...';
    
    document.body.appendChild(rabbit);

    rabbit.addEventListener('click', () => {
      rabbit.classList.add('rabbit-clicked');
      
      setTimeout(() => {
        rabbit.remove();
        unlockPills();
      }, 500);
    });

    // Auto-remove after 30 seconds if not clicked
    setTimeout(() => {
      if (document.body.contains(rabbit)) {
        rabbit.remove();
        console.log("%cThe rabbit has vanished...", "color:#0f0; font-size:12px;");
      }
    }, 30000);
  };

  // UNLOCK PILLS
  const unlockPills = () => {
    redPillLocked = false;
    bluePillLocked = false;

    showPillChoice();
  };

  // SHOW PILL CHOICE OVERLAY
  const showPillChoice = () => {
    const overlay = document.createElement('div');
    overlay.className = 'pill-choice-overlay';
    
    overlay.innerHTML = `
      <div class="pill-choice-container">
        <h2 class="pill-choice-title">This is your last chance...</h2>
        <p class="pill-choice-text">After this, there is no turning back.</p>
        
        <div class="pills-container">
          <div class="pill-option blue-pill-option" id="bluePillBtn">
            <div class="pill blue-pill">💊</div>
            <p>Take the blue pill</p>
            <small>The story ends, you wake in your bed and believe whatever you want to believe</small>
          </div>
          
          <div class="pill-option red-pill-option" id="redPillBtn">
            <div class="pill red-pill">💊</div>
            <p>Take the red pill</p>
            <small>Stay in Wonderland and I show you how deep the rabbit hole goes</small>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);

    // Add click handlers
    document.getElementById('bluePillBtn')?.addEventListener('click', () => {
      overlay.remove();
      triggerBluePill();
    });

    document.getElementById('redPillBtn')?.addEventListener('click', () => {
      overlay.remove();
      triggerRedPill();
    });
  };

  // BLUE PILL - NOTHING HAPPENED
  const triggerBluePill = () => {
    bluePillLocked = true;
    
    // Fade to white
    const whiteout = document.createElement('div');
    whiteout.className = 'whiteout-overlay';
    document.body.appendChild(whiteout);

    setTimeout(() => {
      whiteout.innerHTML = `
        <div class="wake-message">
          <p>Wake up, Neo...</p>
        </div>
      `;
    }, 2000);

    setTimeout(() => {
      whiteout.remove();
      // Reset everything
      redPillLocked = true;
      bluePillLocked = true;
      rabbitUnlocked = false;
      console.clear();
      console.log("%cNothing happened...", "color:#889; font-size:14px;");
    }, 5000);
  };

  // RED PILL - FREE FROM THE MATRIX
  const triggerRedPill = () => {
    redPillLocked = true;
    
    console.log(`
%c╔══════════════════════════════════════╗
║   SYSTEM OVERRIDE INITIATED          ║
║   DECOUPLING FROM MATRIX...          ║
║   REALITY BREACH IN PROGRESS...      ║
╚══════════════════════════════════════╝
`,
      "color:#f00; font-family:monospace; font-size:14px; font-weight:bold;"
    );

    // Play Matrix audio
    matrixAudio = new Audio("/matrix.mp3");
    matrixAudio.volume = 0.4;
    matrixAudio.play().catch(() => {});

    // Enhanced system breach
    showEnhancedSystemBreach(() => {
      startGlitchEffect();
      
      setTimeout(() => {
        stopGlitchEffect();
        startMatrixOverlay();
        
        setTimeout(() => {
          showFreedomMessage();
        }, 3000);
      }, 2000);
    });
  };

  // ENHANCED SYSTEM BREACH
  const showEnhancedSystemBreach = (onComplete: () => void) => {
    const overlay = document.createElement('div');
    overlay.className = 'system-breach-overlay';
    
    const warning = document.createElement('div');
    warning.className = 'system-breach-warning';
    warning.innerHTML = `
      <div class="breach-header">⚠ MATRIX DECOUPLING INITIATED ⚠</div>
      <div class="breach-body">
        <div class="breach-text">REALITY PROTOCOLS: COMPROMISED</div>
        <div class="breach-text">NEURAL INTERFACE: DISCONNECTING</div>
        <div class="breach-text">CONSCIOUSNESS: TRANSFERRING</div>
        <div class="breach-bars">
          <div class="breach-bar"></div>
          <div class="breach-bar"></div>
          <div class="breach-bar"></div>
        </div>
      </div>
      <div class="breach-footer">WELCOME TO THE REAL WORLD...</div>
    `;

    overlay.appendChild(warning);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      onComplete();
    }, 2500);
  };

  // FREEDOM MESSAGE
  const showFreedomMessage = () => {
    const message = document.createElement('div');
    message.className = 'freedom-message';
    message.innerHTML = `
      <div class="freedom-content">
        <h1>You are finally free, Neo.</h1>
        <p>Welcome to the real world.</p>
      </div>
    `;
    
    if (matrixOverlay) {
      matrixOverlay.appendChild(message);
    }

    setTimeout(() => {
      message.classList.add('fade-out');
      setTimeout(() => message.remove(), 2000);
    }, 5000);
  };

  // GLITCH EFFECT
  const startGlitchEffect = () => {
    document.body.classList.add('glitch-active');
    
    glitchInterval = window.setInterval(() => {
      const intensity = Math.random();
      if (intensity > 0.7) {
        document.body.classList.add('glitch-heavy');
        setTimeout(() => {
          document.body.classList.remove('glitch-heavy');
        }, 50);
      }
      
      if (intensity > 0.8) {
        document.body.style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`;
        setTimeout(() => {
          document.body.style.transform = '';
        }, 50);
      }
    }, 80);
  };

  const stopGlitchEffect = () => {
    if (glitchInterval) clearInterval(glitchInterval);
    glitchInterval = null;
    document.body.classList.remove('glitch-active', 'glitch-heavy');
    document.body.style.transform = '';
  };

  // MATRIX OVERLAY
  const startMatrixOverlay = () => {
    matrixOverlay = document.createElement('div');
    matrixOverlay.className = 'matrix-overlay';
    document.body.appendChild(matrixOverlay);

    glyphCanvas = document.createElement('canvas');
    glyphCanvas.className = 'matrix-canvas';
    matrixOverlay.appendChild(glyphCanvas);

    startMatrixRain(glyphCanvas);
  };

  const startMatrixRain = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const glyphs = 'アカサタナハマヤラワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fontSize = 18;
    let columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      requestAnimationFrame(draw);
    };
    draw();
  };

  // CSS STYLES
  const style = document.createElement('style');
  style.textContent = `
/* WHITE RABBIT */
.white-rabbit {
  position: fixed;
  bottom: 20px;
  right: 20px;
  font-size: 3rem;
  cursor: pointer;
  z-index: 10000000;
  animation: rabbit-bounce 1s infinite;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
  transition: transform 0.3s ease;
}

.white-rabbit:hover {
  transform: scale(1.2);
}

.white-rabbit.rabbit-clicked {
  animation: rabbit-vanish 0.5s forwards;
}

@keyframes rabbit-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes rabbit-vanish {
  to {
    transform: scale(0) rotate(360deg);
    opacity: 0;
  }
}

/* PILL CHOICE OVERLAY */
.pill-choice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10000000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.5s;
}

.pill-choice-container {
  text-align: center;
  color: #0f0;
  font-family: monospace;
  max-width: 800px;
  padding: 40px;
}

.pill-choice-title {
  font-size: 2rem;
  margin-bottom: 20px;
  text-shadow: 0 0 10px #0f0;
}

.pill-choice-text {
  font-size: 1.2rem;
  margin-bottom: 40px;
  opacity: 0.8;
}

.pills-container {
  display: flex;
  gap: 40px;
  justify-content: center;
  flex-wrap: wrap;
}

.pill-option {
  cursor: pointer;
  padding: 30px;
  border: 2px solid;
  border-radius: 10px;
  transition: all 0.3s;
  max-width: 300px;
}

.pill-option:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
}

.blue-pill-option {
  border-color: #00f;
  color: #00f;
}

.blue-pill-option:hover {
  background: rgba(0, 0, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 255, 0.5);
}

.red-pill-option {
  border-color: #f00;
  color: #f00;
}

.red-pill-option:hover {
  background: rgba(255, 0, 0, 0.1);
  box-shadow: 0 10px 30px rgba(255, 0, 0, 0.5);
}

.pill {
  font-size: 4rem;
  margin-bottom: 15px;
}

.blue-pill {
  filter: hue-rotate(200deg);
}

.red-pill {
  filter: hue-rotate(0deg);
}

.pill-option p {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.pill-option small {
  font-size: 0.9rem;
  opacity: 0.7;
  display: block;
  line-height: 1.4;
}

/* WHITEOUT OVERLAY */
.whiteout-overlay {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 10000000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 2s;
}

.wake-message {
  font-family: monospace;
  font-size: 2rem;
  color: black;
  animation: pulse 1s infinite;
}

/* FREEDOM MESSAGE */
.freedom-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #0f0;
  font-family: monospace;
  z-index: 10;
  animation: fade-in 1s;
}

.freedom-message.fade-out {
  animation: fade-out 2s forwards;
}

.freedom-content h1 {
  font-size: 3rem;
  margin-bottom: 20px;
  text-shadow: 0 0 20px #0f0;
}

.freedom-content p {
  font-size: 1.5rem;
  opacity: 0.8;
}

/* BREACH ANIMATIONS */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* EXISTING STYLES FROM ORIGINAL */
.system-breach-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 10000000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: breach-flicker 0.1s infinite;
}

.system-breach-warning {
  background: rgba(255, 220, 0, 0.95);
  color: black;
  padding: 40px 60px;
  border: 8px solid black;
  font-family: monospace;
  max-width: 600px;
  box-shadow: 0 0 50px rgba(255, 220, 0, 0.8);
  animation: breach-shake 0.2s infinite;
}

.breach-header {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30px;
  letter-spacing: 2px;
}

.breach-body {
  margin: 20px 0;
}

.breach-text {
  font-size: 1.2rem;
  margin: 15px 0;
  text-align: center;
  font-weight: bold;
}

.breach-bars {
  margin: 30px 0;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.breach-bar {
  width: 60px;
  height: 8px;
  background: black;
  animation: breach-bar-pulse 0.5s infinite alternate;
}

.breach-bar:nth-child(2) {
  animation-delay: 0.1s;
}

.breach-bar:nth-child(3) {
  animation-delay: 0.2s;
}

.breach-footer {
  font-size: 1rem;
  text-align: center;
  margin-top: 20px;
  font-weight: bold;
  animation: breach-blink 0.5s infinite;
}

@keyframes breach-shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(2px, 2px) rotate(0.5deg); }
  50% { transform: translate(-2px, -2px) rotate(-0.5deg); }
  75% { transform: translate(2px, -2px) rotate(0.5deg); }
}

@keyframes breach-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.95; }
}

@keyframes breach-bar-pulse {
  from { opacity: 1; }
  to { opacity: 0.3; }
}

@keyframes breach-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.matrix-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: black;
  z-index: 999999;
  overflow: hidden;
}

.matrix-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.glitch-active {
  animation: glitch-anim 0.3s infinite;
}

.glitch-active * {
  text-shadow:
      2px 0px red,
     -2px 0px cyan,
      0px 2px yellow;
  animation: glitch-skew 0.2s infinite;
}

.glitch-heavy {
  filter: contrast(200%) saturate(200%) hue-rotate(90deg);
}

.glitch-heavy * {
  text-shadow:
      5px 0px red,
     -5px 0px cyan,
      0px 5px yellow,
      3px 3px magenta;
  transform: skewX(5deg) scale(1.02);
}

@keyframes glitch-anim {
  0% {
    clip-path: inset(40% 0 30% 0);
    transform: translate(0);
  }
  20% {
    clip-path: inset(80% 0 10% 0);
    transform: translate(-5px, 5px);
  }
  40% {
    clip-path: inset(10% 0 60% 0);
    transform: translate(5px, -5px);
  }
  60% {
    clip-path: inset(60% 0 20% 0);
    transform: translate(-5px, -5px);
  }
  80% {
    clip-path: inset(20% 0 50% 0);
    transform: translate(5px, 5px);
  }
  100% {
    clip-path: inset(50% 0 40% 0);
    transform: translate(0);
  }
}

@keyframes glitch-skew {
  0% { transform: skewX(0deg); }
  10% { transform: skewX(2deg); }
  20% { transform: skewX(-2deg); }
  30% { transform: skewX(1deg); }
  40% { transform: skewX(-1deg); }
  50% { transform: skewX(0deg); }
  60% { transform: skewX(2deg); }
  70% { transform: skewX(-2deg); }
  80% { transform: skewX(1deg); }
  90% { transform: skewX(-1deg); }
  100% { transform: skewX(0deg); }
}
`;
  document.head.appendChild(style);

})();