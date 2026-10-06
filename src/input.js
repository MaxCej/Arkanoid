// Keyboard and mouse input.
// left/right are held states. up/down/launch/click/pause are one-shot flags
// that the game loop consumes and resets. A click sets both launch and click,
// so gameplay only needs launch and menus can tell where the click was.

const input = {
  left: false, right: false,   // held
  up: false, down: false,      // one-shot: menu highlight moves
  mouseX: null, mouseY: null,  // pointer position in canvas pixels
  launch: false,               // one-shot: Space, Enter or click
  click: null,                 // one-shot: { x, y } of a click, in canvas pixels
  pause: false,                // one-shot: P or Esc
};

(() => {
  const el = document.getElementById('game');

  const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
  const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
  const UP_KEYS = ['ArrowUp', 'KeyW'];
  const DOWN_KEYS = ['ArrowDown', 'KeyS'];
  const LAUNCH_KEYS = ['Space', 'Enter', 'NumpadEnter'];
  const PAUSE_KEYS = ['KeyP', 'Escape'];

  window.addEventListener('keydown', (e) => {
    if (LEFT_KEYS.includes(e.code)) {
      input.left = true;
    } else if (RIGHT_KEYS.includes(e.code)) {
      input.right = true;
    } else if (UP_KEYS.includes(e.code)) {
      if (!e.repeat) input.up = true;
    } else if (DOWN_KEYS.includes(e.code)) {
      if (!e.repeat) input.down = true;
    } else if (LAUNCH_KEYS.includes(e.code)) {
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

  // Converts a mouse event to canvas pixels, which differ from CSS pixels
  // when the canvas is scaled.
  function toCanvas(e) {
    const rect = el.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (el.width / rect.width),
      y: (e.clientY - rect.top) * (el.height / rect.height),
    };
  }

  el.addEventListener('mousemove', (e) => {
    const p = toCanvas(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });

  el.addEventListener('click', (e) => {
    input.click = toCanvas(e);
    input.launch = true;
  });
})();
