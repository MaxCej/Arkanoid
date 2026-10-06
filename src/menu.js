// Menu definitions, layout, hit-testing and drawing.
// MENUS is keyed by the game state that shows it, so MENUS[game.state] is the
// active menu or undefined.

const MENU_TITLE_Y = 130;       // center y of the title
const MENU_FIRST_ROW_Y = 220;   // center y of the first row
const MENU_ROW_H = 36;          // row spacing and hit-box height
const MENU_ROW_W = 360;         // hit-box width, centered on the canvas
const MENU_HINT_Y = 540;        // center y of the hint line

const MENU_HINT = 'Up/Down to choose, Enter to select';

// Rows are { label, action }. A level row's action is { type: 'level', level: n }.
// The other actions are { type: 'resume' | 'levels' | 'mainmenu' | 'back' }.
function levelRows() {
  return LEVELS.map((lvl, i) => ({
    label: `${i + 1}  ${lvl.name.toUpperCase()}`,
    action: { type: 'level', level: i + 1 },
  }));
}

const MENUS = {
  menu: { title: 'ARKANOID', subtitle: 'Choose a level', rows: levelRows() },
  paused: {
    title: 'PAUSED',
    rows: [
      { label: 'RESUME', action: { type: 'resume' } },
      { label: 'CHOOSE LEVEL', action: { type: 'levels' } },
      { label: 'MAIN MENU', action: { type: 'mainmenu' } },
    ],
  },
  pauselevels: {
    title: 'CHOOSE LEVEL',
    rows: [...levelRows(), { label: 'BACK', action: { type: 'back' } }],
  },
};

function menuRowY(i) {
  return MENU_FIRST_ROW_Y + i * MENU_ROW_H;
}

// Returns the index of the row under canvas point (x, y), or -1.
function menuRowAt(menu, x, y) {
  if (Math.abs(x - CANVAS_W / 2) > MENU_ROW_W / 2) return -1;
  for (let i = 0; i < menu.rows.length; i++) {
    if (Math.abs(y - menuRowY(i)) <= MENU_ROW_H / 2) return i;
  }
  return -1;
}

// Moves index by delta (+1 down, -1 up), wrapping at both ends.
function menuMove(menu, index, delta) {
  const n = menu.rows.length;
  return (index + delta + n) % n;
}

// Dims the play field below the HUD and draws the title, optional subtitle,
// rows and hint line. The highlighted row is yellow with a '> ' prefix.
function drawMenu(ctx, menu, index) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = CANVAS_W / 2;

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px monospace';
  ctx.fillText(menu.title, cx, MENU_TITLE_Y);

  if (menu.subtitle) {
    ctx.font = '20px monospace';
    ctx.fillText(menu.subtitle, cx, (MENU_TITLE_Y + MENU_FIRST_ROW_Y) / 2);
  }

  ctx.font = 'bold 24px monospace';
  menu.rows.forEach((row, i) => {
    const selected = i === index;
    ctx.fillStyle = selected ? '#ff0' : '#fff';
    ctx.fillText(selected ? `> ${row.label}` : row.label, cx, menuRowY(i));
  });

  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText(MENU_HINT, cx, MENU_HINT_Y);
}
