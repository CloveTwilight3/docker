(window as any).party = (() => {
  let enabled = false;
  let confettiInterval: number | null = null;
  let audio: HTMLAudioElement | null = null;

  // Create a single confetto element
  const makeConfetto = () => {
    const confetto = document.createElement("div");
    confetto.className = "confetto";
    confetto.style.left = Math.random() * 100 + "vw";
    confetto.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
    confetto.style.animationDuration = (3 + Math.random() * 3) + "s"; // between 3–6s
    document.body.appendChild(confetto);

    // Remove it after animation ends
    confetto.addEventListener("animationend", () => {
      confetto.remove();
    });
  };

  // Start spawning confetti at intervals
  const startConfetti = () => {
    if (confettiInterval !== null) return;
    confettiInterval = window.setInterval(makeConfetto, 300); // every 300ms
  };

  // Stop spawning confetti
  const stopConfetti = () => {
    if (confettiInterval !== null) {
      clearInterval(confettiInterval);
      confettiInterval = null;
    }
  };

  // Load audio
  const initAudio = () => {
    if (audio) return;
    audio = new Audio("https://www.yuri-lover.win/cdn/audio/Ta-Da.mp3");
    audio.loop = false;
    audio.volume = 0.5;
  };

  return () => {
    enabled = !enabled;

    if (enabled) {
      console.log(`
%c🎉 PARTY MODE ACTIVATED! 🎉
`, 'color: #FF69B4; font-size: 16px; font-weight: bold;');

      document.body.style.animation = "rainbow 2s linear infinite";
      startConfetti();
      initAudio();
      if (audio) audio.play();
    } else {
      console.log(`
%c🛑 PARTY MODE DEACTIVATED 🛑

Back to normal!

`, 'color: #888; font-size: 14px; font-weight: bold;');

      document.body.style.animation = "";
      stopConfetti();
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  };
})();

// Add rainbow animation + confetti styling
const style = document.createElement("style");
style.textContent = `
@keyframes rainbow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

.confetto {
  position: fixed;
  top: -10px;
  width: 10px;
  height: 10px;
  opacity: 0.9;
  border-radius: 2px;
  animation-name: fall;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

@keyframes fall {
  to {
    transform: translateY(110vh) rotate(720deg);
  }
}
`;
document.head.appendChild(style);