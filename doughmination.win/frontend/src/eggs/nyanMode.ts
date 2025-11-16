(window as any).nyan = (() => {
  let active = false;
  let angle = 0;
  let audio: HTMLAudioElement | null = null;

  return () => {
    active = !active;

    if (active) {
      console.log("🌈 NYAN MODE — ON");

      // Play Nyan audio
      audio = new Audio("/nyan.mp3");
      audio.loop = true;
      audio.volume = 0.2;

      audio.play().catch(() => {
        console.warn("Audio blocked — user interaction required");
      });

      // Add rainbow page animation
      document.body.classList.add("nyan-rainbow");

      // Start rotation
      const rotate = () => {
        if (!active) return;
        angle += 1.2;
        document.body.style.transform = `rotate(${angle}deg)`;
        requestAnimationFrame(rotate);
      };
      rotate();

    } else {
      console.log("❌ NYAN MODE — OFF");

      // Remove rainbow
      document.body.classList.remove("nyan-rainbow");

      // Stop rotate
      document.body.style.transform = "";

      // Stop audio
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
      }
    }
  };
})();
const nyanStyle = document.createElement("style");
nyanStyle.textContent = `
.nyan-rainbow {
  animation: nyanHue 3s linear infinite;
}

@keyframes nyanHue {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

body {
  transition: transform 0.1s linear;
}
`;
document.head.appendChild(nyanStyle);