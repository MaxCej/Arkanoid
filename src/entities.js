// Bricks, paddle and ball.

function createBricks() {
  const bricks = [];
  LEVEL_ROWS.forEach((color, row) => {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_OFFSET_X + col * BRICK_W,
        y: BRICK_OFFSET_Y + row * BRICK_H,
        w: BRICK_W,
        h: BRICK_H,
        color,
        hitsLeft: BRICK_HITS[color] ?? BRICK_HITS.default,
        alive: true,
      });
    }
  });
  return bricks;
}

function drawBricks(ctx, bricks) {
  for (const b of bricks) {
    if (!b.alive) continue;
    drawSprite(ctx, `block_${b.color}`, b.x, b.y, b.w, b.h);
  }
}

function createPaddle() {
  return {
    x: (CANVAS_W - PADDLE_W) / 2,
    y: PADDLE_Y,
    w: PADDLE_W,
    h: PADDLE_H,
  };
}

// Last mouse X the paddle followed. The mouse only drives the paddle when it
// moves, so the keyboard keeps working after the mouse has been used.
let lastMouseX = null;

function updatePaddle(paddle, input, dt) {
  if (input.left) paddle.x -= PADDLE_SPEED * dt;
  if (input.right) paddle.x += PADDLE_SPEED * dt;

  if (input.mouseX !== null && input.mouseX !== lastMouseX) {
    paddle.x = input.mouseX - paddle.w / 2;
    lastMouseX = input.mouseX;
  }

  paddle.x = Math.max(0, Math.min(CANVAS_W - paddle.w, paddle.x));
}

function drawPaddle(ctx, paddle) {
  drawSprite(ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h);
}

function createBall(paddle) {
  const ball = { x: 0, y: 0, vx: 0, vy: 0, speed: BALL_SPEED_START, stuck: true };
  placeBallOnPaddle(ball, paddle);
  return ball;
}

function placeBallOnPaddle(ball, paddle) {
  ball.x = paddle.x + paddle.w / 2 - BALL_SIZE / 2;
  ball.y = paddle.y - BALL_SIZE;
}

// Puts the ball back on the paddle after a lost life. Its speed is kept.
function resetBall(ball, paddle) {
  ball.stuck = true;
  ball.vx = 0;
  ball.vy = 0;
  placeBallOnPaddle(ball, paddle);
}

function launchBall(ball) {
  ball.stuck = false;
  ball.vx = 0;
  ball.vy = -ball.speed;
}

// Returns true when the ball bounced off a wall or the paddle this frame.
function updateBall(ball, paddle, dt) {
  if (ball.stuck) {
    placeBallOnPaddle(ball, paddle);
    return false;
  }

  const prevBottom = ball.y + BALL_SIZE;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  let bounced = false;

  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    bounced = true;
  } else if (ball.x + BALL_SIZE > CANVAS_W) {
    ball.x = CANVAS_W - BALL_SIZE;
    ball.vx = -Math.abs(ball.vx);
    bounced = true;
  }

  if (ball.y < HUD_H) {
    ball.y = HUD_H;
    ball.vy = Math.abs(ball.vy);
    bounced = true;
  }

  if (bounceOffPaddle(ball, paddle, prevBottom)) bounced = true;
  return bounced;
}

// Uses the ball's bottom edge from before this frame's move to detect that it
// crossed the paddle's top edge, so it cannot tunnel through.
function bounceOffPaddle(ball, paddle, prevBottom) {
  const bottom = ball.y + BALL_SIZE;
  const crossedTop = ball.vy > 0 && prevBottom <= paddle.y && bottom >= paddle.y;
  const overlapsX = ball.x + BALL_SIZE > paddle.x && ball.x < paddle.x + paddle.w;
  if (!crossedTop || !overlapsX) return false;

  // -1 at the paddle's left edge, 0 at the center, 1 at the right edge.
  const ballCenter = ball.x + BALL_SIZE / 2;
  const paddleCenter = paddle.x + paddle.w / 2;
  const offset = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (paddle.w / 2)));
  const angle = offset * MAX_BOUNCE_ANGLE;

  ball.vx = ball.speed * Math.sin(angle);
  ball.vy = -ball.speed * Math.cos(angle);
  ball.y = paddle.y - BALL_SIZE;
  return true;
}

// Resolves at most one brick collision per frame, so two bricks hit at once
// cannot cancel each other's reflection. Returns the brick hit, or null.
function collideBricks(ball, bricks) {
  const ballRight = ball.x + BALL_SIZE;
  const ballBottom = ball.y + BALL_SIZE;

  for (const b of bricks) {
    if (!b.alive) continue;
    if (ballRight <= b.x || ball.x >= b.x + b.w || ballBottom <= b.y || ball.y >= b.y + b.h) continue;

    // Reflect on the axis with the smaller overlap: that is the side it came through.
    const overlapX = Math.min(ballRight - b.x, b.x + b.w - ball.x);
    const overlapY = Math.min(ballBottom - b.y, b.y + b.h - ball.y);
    const fromLeft = ball.x + BALL_SIZE / 2 < b.x + b.w / 2;
    const fromAbove = ball.y + BALL_SIZE / 2 < b.y + b.h / 2;

    if (overlapX < overlapY) {
      ball.vx = fromLeft ? -Math.abs(ball.vx) : Math.abs(ball.vx);
      ball.x = fromLeft ? b.x - BALL_SIZE : b.x + b.w;
    } else {
      ball.vy = fromAbove ? -Math.abs(ball.vy) : Math.abs(ball.vy);
      ball.y = fromAbove ? b.y - BALL_SIZE : b.y + b.h;
    }

    b.hitsLeft--;
    if (b.hitsLeft <= 0) b.alive = false;
    return b;
  }
  return null;
}

// Changes the ball's speed while keeping its direction.
function setBallSpeed(ball, speed) {
  const scale = speed / ball.speed;
  ball.vx *= scale;
  ball.vy *= scale;
  ball.speed = speed;
}

function drawBall(ctx, ball) {
  drawSprite(ctx, 'ball', ball.x, ball.y, BALL_SIZE, BALL_SIZE);
}

// Advances explosions by dt seconds and drops the finished ones.
function updateExplosions(explosions, dt) {
  for (const e of explosions) e.t += dt * 1000;
  for (let i = explosions.length - 1; i >= 0; i--) {
    if (explosions[i].t >= EXPLOSION_DURATION) explosions.splice(i, 1);
  }
}

function drawExplosions(ctx, explosions) {
  for (const e of explosions) {
    const frames = EXPLOSION_FRAMES[e.color];
    const i = Math.min(frames.length - 1, Math.floor(e.t / EXPLOSION_DURATION * frames.length));
    drawFrame(ctx, frames[i], e.x, e.y, e.w, e.h);
  }
}
