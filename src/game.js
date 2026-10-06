// Game loop, state and rendering.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  state: 'menu',     // 'menu' | 'playing' | 'paused' | 'pauselevels' | 'levelclear' | 'win' | 'gameover'
  menuIndex: 0,      // highlighted row of the active menu
  runStartLevel: 1,  // level the current run started at, used for the highlight on return to the menu
  level: 1,          // 1-based index into LEVELS
  score: 0,
  lives: START_LIVES,
  paddle: null,
  ball: null,
  bricks: [],
  explosions: [],   // { x, y, w, h, color, t }, t = elapsed ms
};
startLevel(1);

let lastTime = null;

const sounds = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break: new Audio('assets/sounds/break-sound.mp3'),
};

// Plays a clone so the same sound can overlap itself. Autoplay rejections
// (before the first user interaction) are ignored.
function playSound(name) {
  const s = sounds[name].cloneNode();
  s.play().catch(() => {});
}

function breakBrick(brick) {
  playSound('break');
  game.score += BRICK_POINTS[brick.color] ?? BRICK_POINTS.default;
  setBallSpeed(game.ball, Math.min(game.ball.speed + BALL_SPEED_STEP, BALL_SPEED_MAX));
  game.explosions.push({ x: brick.x, y: brick.y, w: brick.w, h: brick.h, color: brick.color, t: 0 });
}

// Loads level n (1-based): its bricks, a centered paddle and a ball resting on
// it. Score and lives are kept. The ball starts faster on each level.
function startLevel(n) {
  game.level = n;
  game.bricks = createBricks(n);
  game.explosions = [];
  game.paddle = createPaddle();
  game.ball = createBall(game.paddle);
  game.ball.speed = BALL_SPEED_START + LEVEL_SPEED_STEP * (n - 1);
}

// Starts a new run on level n: score 0, full lives, ball resting on the paddle.
function newGame(n) {
  game.score = 0;
  game.lives = START_LIVES;
  game.runStartLevel = n;
  startLevel(n);
  game.state = 'playing';
}

// Pointer position last seen by the menus. Hover only changes the highlight
// when the pointer moves, so the keyboard keeps working after the mouse is used.
let menuMouseX = null;
let menuMouseY = null;

// Shows the menu for state with row index highlighted. Syncs the pointer so a
// mouse move made before the menu opened does not override the highlight.
function openMenu(state, index) {
  game.state = state;
  game.menuIndex = index;
  menuMouseX = input.mouseX;
  menuMouseY = input.mouseY;
}

// Main menu with the highlight and brick preview on the run's start level.
function openMainMenu() {
  openMenu('menu', game.runStartLevel - 1);
  startLevel(game.runStartLevel);
}

// Shared menu input: Up/Down and hover move the highlight. A click selects
// the row under it (or nothing); otherwise Enter/Space selects the highlighted
// row. Returns the selected row's action, or null.
function handleMenuInput(menu, press) {
  if (press.up) game.menuIndex = menuMove(menu, game.menuIndex, -1);
  if (press.down) game.menuIndex = menuMove(menu, game.menuIndex, 1);

  if (input.mouseX !== menuMouseX || input.mouseY !== menuMouseY) {
    menuMouseX = input.mouseX;
    menuMouseY = input.mouseY;
    const i = menuRowAt(menu, menuMouseX, menuMouseY);
    if (i >= 0) game.menuIndex = i;
  }

  if (press.click) {
    const i = menuRowAt(menu, press.click.x, press.click.y);
    if (i < 0) return null;
    game.menuIndex = i;
    return menu.rows[i].action;
  }
  if (press.launch) return menu.rows[game.menuIndex].action;
  return null;
}

function applyMenuAction(action) {
  switch (action.type) {
    case 'level':
      newGame(action.level);
      break;
    case 'resume':
      game.state = 'playing';
      break;
    case 'mainmenu':
      openMainMenu();
      break;
    case 'levels':
      openMenu('pauselevels', game.level - 1); // highlight on the current level
      break;
    case 'back':
      openMenu('paused', 1); // highlight on CHOOSE LEVEL
      break;
  }
}

function updateMenu(press) {
  const menu = MENUS[game.state];
  const prevIndex = game.menuIndex;
  const action = handleMenuInput(menu, press);
  if (action) {
    applyMenuAction(action);
  } else if (game.state === 'menu' && game.menuIndex !== prevIndex) {
    startLevel(game.menuIndex + 1); // preview the highlighted level's bricks
  }
}

function updatePlaying(dt, launch) {
  if (launch && game.ball.stuck) launchBall(game.ball);

  updatePaddle(game.paddle, input, dt);
  if (updateBall(game.ball, game.paddle, dt)) playSound('bounce');

  if (!game.ball.stuck) {
    const brick = collideBricks(game.ball, game.bricks);
    if (brick && !brick.alive) breakBrick(brick);
  }

  if (game.ball.y > CANVAS_H) {
    game.lives--;
    resetBall(game.ball, game.paddle);
    if (game.lives === 0) game.state = 'gameover';
  } else if (game.bricks.every((b) => !b.alive)) {
    game.state = game.level < LEVELS.length ? 'levelclear' : 'win';
  }
}

function update(dt) {
  // One-shot flags: read them once, then clear them so they never carry over
  // into another state (e.g. a click while paused does not launch on resume).
  const press = { launch: input.launch, pause: input.pause, up: input.up, down: input.down, click: input.click };
  const launch = press.launch;
  input.launch = false;
  input.pause = false;
  input.up = false;
  input.down = false;
  input.click = null;

  switch (game.state) {
    case 'menu':
      updateMenu(press);
      break;
    case 'levelclear':
      if (launch) {
        startLevel(game.level + 1);
        game.state = 'playing';
      }
      break;
    case 'win':
    case 'gameover':
      if (launch) openMainMenu();
      break;
    case 'playing':
      if (press.pause) {
        openMenu('paused', 0); // highlight on RESUME
        return;
      }
      updatePlaying(dt, launch);
      break;
    case 'paused':
      if (press.pause) game.state = 'playing';
      else updateMenu(press);
      return; // everything frozen, explosions included
    case 'pauselevels':
      if (press.pause) applyMenuAction({ type: 'back' });
      else updateMenu(press);
      return; // still frozen
  }

  updateExplosions(game.explosions, dt);
}

function drawBackground() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawHud() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${game.score}`, 16, HUD_H / 2);

  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${game.level}/${LEVELS.length}`, CANVAS_W / 2, HUD_H / 2);

  ctx.textAlign = 'right';
  ctx.fillText(`LIVES ${game.lives}`, CANVAS_W - 16, HUD_H / 2);
}

const OVERLAYS = {
  levelclear: () => [
    `LEVEL ${game.level} CLEAR`,
    `Next: LEVEL ${game.level + 1} — ${LEVELS[game.level].name.toUpperCase()}`,
    'Press Space or click to continue',
  ],
  win: () => ['YOU WIN!', `Final score: ${game.score}`, 'Press Space, Enter or click for the menu'],
  gameover: () => ['GAME OVER', `Final score: ${game.score}`, 'Press Space, Enter or click for the menu'],
};

// Dims the play field below the HUD and draws centered text for non-playing states.
function drawOverlay() {
  const lines = OVERLAYS[game.state];
  if (!lines) return;
  const [title, ...rest] = lines();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cy = (HUD_H + CANVAS_H) / 2;

  ctx.font = 'bold 48px monospace';
  ctx.fillText(title, CANVAS_W / 2, cy - 40);

  ctx.font = '20px monospace';
  rest.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, cy + 20 + i * 32));
}

function render() {
  drawBackground();
  drawBricks(ctx, game.bricks);

  // Main menu: only the previewed bricks behind the menu, no HUD, paddle or ball.
  if (game.state === 'menu') {
    drawMenu(ctx, MENUS.menu, game.menuIndex);
    return;
  }

  drawExplosions(ctx, game.explosions);
  drawPaddle(ctx, game.paddle);
  drawBall(ctx, game.ball);
  drawHud();

  const menu = MENUS[game.state];
  if (menu) drawMenu(ctx, menu, game.menuIndex);
  else drawOverlay();
}

function frame(now) {
  if (lastTime === null) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(frame);
}

loadSpritesheet(() => {
  requestAnimationFrame(frame);
});
