// Game loop, state and rendering.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  state: 'start',   // 'start' | 'playing' | 'paused' | 'levelclear' | 'win' | 'gameover'
  level: 1,         // 1-based index into LEVELS
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

function newGame() {
  game.score = 0;
  game.lives = START_LIVES;
  startLevel(1);
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
  const launch = input.launch;
  const pause = input.pause;
  input.launch = false;
  input.pause = false;

  if (pause) {
    if (game.state === 'playing') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'playing';
  }

  switch (game.state) {
    case 'start':
      if (launch) game.state = 'playing';
      break;
    case 'levelclear':
      if (launch) {
        startLevel(game.level + 1);
        game.state = 'playing';
      }
      break;
    case 'win':
    case 'gameover':
      if (launch) {
        newGame();
        game.state = 'playing';
      }
      break;
    case 'playing':
      updatePlaying(dt, launch);
      break;
    case 'paused':
      return; // everything frozen, explosions included
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
  start: () => ['ARKANOID', 'Press Space or click to start'],
  paused: () => ['PAUSED', 'Press P or Esc to resume'],
  levelclear: () => [
    `LEVEL ${game.level} CLEAR`,
    `Next: LEVEL ${game.level + 1} — ${LEVELS[game.level].name.toUpperCase()}`,
    'Press Space or click to continue',
  ],
  win: () => ['YOU WIN!', `Final score: ${game.score}`, 'Press Space or click to play again'],
  gameover: () => ['GAME OVER', `Final score: ${game.score}`, 'Press Space or click to play again'],
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
  drawExplosions(ctx, game.explosions);
  drawPaddle(ctx, game.paddle);
  drawBall(ctx, game.ball);
  drawHud();
  drawOverlay();
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
