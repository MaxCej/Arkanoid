// Keyboard and mouse input.
// left/right are held states. launch/pause are one-shot flags that the
// game loop consumes and resets to false.

const input = { left: false, right: false, mouseX: null, launch: false, pause: false };

(() => {
  const el = document.getElementById('game');

  const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
  const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
  const PAUSE_KEYS = ['KeyP', 'Escape'];

  window.addEventListener('keydown', (e) => {
    if (LEFT_KEYS.includes(e.code)) {
      input.left = true;
    } else if (RIGHT_KEYS.includes(e.code)) {
      input.right = true;
    } else if (e.code === 'Space') {
      if (!e.repeat) input.launch = true;
    } else if (PAUSE_KEYS.includes(e.code)) {
      if (!e.repeat) input.pause = true;
    } else {
      return;
    }
    e.preventDefault(); // keep arrows and Space from scrolling the page
  });

  window.addEventListener('keyup', (e) => {
    if (LEFT_KEYS.includes(e.code)) input.left = false;
    else if (RIGHT_KEYS.includes(e.code)) input.right = false;
  });

  // Releasing keys while the window is unfocused would leave them stuck.
  window.addEventListener('blur', () => {
    input.left = false;
    input.right = false;
  });

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) * (el.width / rect.width);
  });

  el.addEventListener('click', () => {
    input.launch = true;
  });
})();
