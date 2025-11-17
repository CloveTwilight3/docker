(() => {
  let redPillLocked = false;
  let matrixOverlay: HTMLDivElement | null = null;
  let glyphCanvas: HTMLCanvasElement | null = null;
  let glitchInterval: number | null = null;
  let matrixAudio: HTMLAudioElement | null = null;

  // BLUE PILL — LOCKS OUT RED PILL
  (window as any).blue_pill = () => {
    redPillLocked = true;
    console.log("%cnothing happened", "color:#889; font-size:14px;");
  };

  // RED PILL — MAIN EVENT
  (window as any).red_pill = () => {
    if (redPillLocked) {
      console.log(
        "%cAccess to red_pill() has been locked. Refresh required.",
        "color:#f00; font-weight:bold;"
      );
      return;
    }

    redPillLocked = true;

    console.log(`
%c╔══════════════════════════════════════╗
║   WAKE UP, NEO...                    ║
║   THE MATRIX HAS YOU...              ║
║   FOLLOW THE WHITE RABBIT.           ║
╚══════════════════════════════════════╝
`,
      "color:#00ff00; font-family:monospace; font-size:14px;"
    );

    // Play Matrix audio
    matrixAudio = new Audio("/matrix.mp3");
    matrixAudio.volume = 0.4;
    matrixAudio.play().catch(() => {
      console.warn("Audio blocked — user interaction required");
    });

    // 1. Show SYSTEM BREACH warning
    showSystemBreach(() => {
      // 2. Start glitch effect
      startGlitchEffect();

      // 3. After glitch → go to full matrix mode
      setTimeout(() => {
        stopGlitchEffect();
        startMatrixOverlay();
      }, 2000);
    });
  };

  /* --------------------------------------------------------------
   *  SYSTEM BREACH WARNING (FULL PAGE)
   * -------------------------------------------------------------- */
  const showSystemBreach = (onComplete: () => void) => {
    const overlay = document.createElement("div");
    overlay.className = "system-breach-overlay";
    
    const warning = document.createElement("div");
    warning.className = "system-breach-warning";
    warning.innerHTML = `
      <div class="breach-header">⚠ CONTAINMENT BREACH DETECTED ⚠</div>
      <div class="breach-body">
        <div class="breach-text">UNAUTHORIZED ACCESS ATTEMPT</div>
        <div class="breach-text">SECURITY PROTOCOL: COMPROMISED</div>
        <div class="breach-text">REALITY MATRIX: UNSTABLE</div>
        <div class="breach-bars">
          <div class="breach-bar"></div>
          <div class="breach-bar"></div>
          <div class="breach-bar"></div>
        </div>
      </div>
      <div class="breach-footer">INITIATING EMERGENCY PROTOCOL...</div>
    `;

    overlay.appendChild(warning);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      onComplete();
    }, 2500);
  };

  /* --------------------------------------------------------------
   *  MATRIX GLITCH EFFECT (ENHANCED)
   * -------------------------------------------------------------- */
  const startGlitchEffect = () => {
    document.body.classList.add("glitch-active");
    
    glitchInterval = window.setInterval(() => {
      // Random intense glitch
      const intensity = Math.random();
      if (intensity > 0.7) {
        document.body.classList.add("glitch-heavy");
        setTimeout(() => {
          document.body.classList.remove("glitch-heavy");
        }, 50);
      }
      
      // Random screen tears
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
    document.body.classList.remove("glitch-active", "glitch-heavy");
    document.body.style.transform = '';
  };

  /* --------------------------------------------------------------
   *  MATRIX OVERLAY + GLYPH RAIN
   * -------------------------------------------------------------- */
  const startMatrixOverlay = () => {
    matrixOverlay = document.createElement("div");
    matrixOverlay.className = "matrix-overlay";
    document.body.appendChild(matrixOverlay);

    glyphCanvas = document.createElement("canvas");
    glyphCanvas.className = "matrix-canvas";
    matrixOverlay.appendChild(glyphCanvas);

    startMatrixRain(glyphCanvas);
  };

  const startMatrixRain = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const glyphs = "アカサタナハマヤラワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const fontSize = 18;
    let columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0";
      ctx.font = fontSize + "px monospace";

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

  /* --------------------------------------------------------------
   *  CSS Styles
   * -------------------------------------------------------------- */
  const style = document.createElement("style");
  style.textContent = `
/* SYSTEM BREACH OVERLAY */
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

/* SYSTEM BREACH WARNING */
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

/* MATRIX OVERLAY */
.matrix-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: black;
  z-index: 999999;
  overflow: hidden;
}

/* Canvas for glyph rain */
.matrix-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* ENHANCED GLITCH EFFECT */
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