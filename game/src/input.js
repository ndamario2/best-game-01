// Keyboard and mouse: WASD to move, mouse to aim, hold click to fire, Space to
// dash, P or Escape to pause, Enter or click to confirm, 1/2/3 to pick an upgrade
// card. The game reads the live state every step and takes one-shot actions
// (confirm, pause, dash, card picks) out of a queue, so a key press is never lost
// between frames.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_CARD_1 = 8;
export const ACTION_CARD_2 = 16;
export const ACTION_CARD_3 = 32;

/** Create the input state for `canvas`; call `takeActions()` once a frame. */
export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let firing = false;

  function press(action) {
    actions |= action;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      if (event.code === 'Space') press(ACTION_DASH);
      else press(ACTION_CONFIRM);
    }
    if (event.code === 'KeyP' || event.code === 'Escape') press(ACTION_PAUSE);
    if (event.code === 'Digit1') press(ACTION_CARD_1);
    if (event.code === 'Digit2') press(ACTION_CARD_2);
    if (event.code === 'Digit3') press(ACTION_CARD_3);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      firing = true;
      press(ACTION_CONFIRM);
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  return {
    /** Normalised WASD / arrow-key move direction for this step. */
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** Mouse position in canvas pixels (the renderer maps it to field space). */
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    firing() {
      return firing;
    },
    /** One-shot actions since the last call; the queue is cleared here. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
