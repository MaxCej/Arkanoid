# SPEC 01 — Playable Arkanoid MVP

> **Status:** Draft
> **Depends on:** none
> **Date:** 2026-10-06
> **Objective:** Build a playable single-level Arkanoid in plain HTML/JS, with lives, score and win/lose screens, using the existing spritesheet and sounds.

## Scope

**In:**

- `index.html` at the repo root with one fixed 800x600 canvas, centered with CSS.
- One fixed brick layout: 6 rows x 14 columns, one color per row.
- Paddle controlled by keyboard (Arrow keys / A-D) and mouse X position.
- Ball launch with Space or mouse click. The ball rests on the paddle until launched, at game start and after each lost life.
- Ball bounce angle depends on where it hits the paddle.
- Movement in px/s using delta time. The ball speeds up slightly per broken brick, up to a cap.
- Colored bricks break on 1 hit. Gray bricks break on 2 hits.
- Score: 10 points per colored brick, 20 points per gray brick (awarded on the breaking hit).
- 3 lives.
- Game states: Start, Playing, Paused, Win, Game Over, shown as text overlays on the canvas.
- P or Esc toggles pause.
- HUD with score and lives.
- Brick explosion animation using `EXPLOSION_FRAMES` and `EXPLOSION_DURATION`.
- Sounds: `ball-bounce.mp3` on wall and paddle hits, `break-sound.mp3` when a brick breaks.
- `git init` with an initial commit of the existing files, so `/spec-impl` can branch.

**Out of scope (for future specs):**

- Multiple levels or a level editor.
- Power-ups and capsules (laser, catch, expand, multiball, etc.).
- Enemies.
- High scores or any persistence (localStorage or otherwise).
- Responsive scaling or fullscreen.
- Touch and mobile controls.
- Mute toggle or volume settings.
- Build tooling, bundler, linter, automated tests.

## Data model

All files are plain browser scripts that share globals, like `assets/spritesheet.js`. No ES modules.

```js
// src/config.js
const CANVAS_W = 800;
const CANVAS_H = 600;
const HUD_H = 40;                // top strip for score and lives

const PADDLE_W = 120;            // drawn from the 162x14 'paddle' sprite
const PADDLE_H = 16;
const PADDLE_Y = 560;            // top edge of the paddle
const PADDLE_SPEED = 600;        // px/s with the keyboard

const BALL_SIZE = 16;
const BALL_SPEED_START = 360;    // px/s
const BALL_SPEED_STEP = 8;       // added per broken brick
const BALL_SPEED_MAX = 600;
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° from vertical at the paddle edges

const BRICK_W = 48;              // drawn from 32x16 block sprites (1.5x)
const BRICK_H = 24;
const BRICK_COLS = 14;
const BRICK_OFFSET_X = 64;       // (800 - 14*48) / 2
const BRICK_OFFSET_Y = 80;

const START_LIVES = 3;
const MAX_DT = 1 / 30;           // clamp for delta time, in seconds

// One color per row, top to bottom.
const LEVEL_ROWS = ['gray', 'red', 'yellow', 'cyan', 'magenta', 'green'];
const BRICK_POINTS = { default: 10, gray: 20 };
const BRICK_HITS = { default: 1, gray: 2 };
```

```js
// Runtime state (src/game.js)
const game = {
  state: 'start',   // 'start' | 'playing' | 'paused' | 'win' | 'gameover'
  score: 0,
  lives: START_LIVES,
  paddle: { x, y, w, h },
  ball: { x, y, vx, vy, speed, stuck: true }, // stuck = resting on the paddle
  bricks: [ /* { x, y, w, h, color, hitsLeft, alive } */ ],
  explosions: [ /* { x, y, w, h, color, t } */ ],  // t = elapsed ms
};

// src/input.js
const input = { left: false, right: false, mouseX: null, launch: false, pause: false };
```

Conventions:

- Coordinates in canvas pixels, origin top-left. Entity `x`/`y` are the top-left corner.
- Velocities in px/s. `dt` is in seconds, clamped to `MAX_DT`.
- `launch` and `pause` are one-shot flags. The game loop consumes them and resets them to `false`.

## Implementation plan

1. Run `git init` and make an initial commit with the existing files (`assets/`, `CLAUDE.md`, skills, `specs/`).
2. Create `index.html` at the repo root. It contains an 800x600 `<canvas id="game">` centered with CSS on a dark background. It loads, in order, `assets/spritesheet.js`, `src/config.js`, `src/input.js`, `src/entities.js` and `src/game.js`. Create `src/config.js` with the constants from the data model. Create the other three files as empty stubs. Manual test: the page opens with a black canvas and no console errors.
3. In `src/game.js`, add the `requestAnimationFrame` loop with clamped delta time. Call `loadSpritesheet` before the loop starts. Render the background and the HUD (score, lives). Manual test: the HUD is visible.
4. In `src/entities.js`, build the bricks from `LEVEL_ROWS` and draw them with `drawSprite(ctx, 'block_<color>', ...)`. Manual test: 6 rows of 14 bricks appear in the correct colors.
5. In `src/input.js`, register keyboard (Arrow keys, A, D, Space, P, Esc) and mouse (`mousemove` mapped to canvas X, `click`) listeners. In `src/entities.js`, add the paddle: keyboard movement at `PADDLE_SPEED`, mouse follows X centered, clamped to the canvas. Manual test: the paddle moves with both inputs and never leaves the field.
6. Add the ball: it rests on the paddle center while `stuck`. Launch sends it upward at `BALL_SPEED_START`. It bounces off the left, right and top walls (top = `HUD_H`). Manual test: the ball launches and bounces off the walls.
7. Add the paddle collision. The bounce angle comes from the hit offset relative to the paddle center, up to `MAX_BOUNCE_ANGLE`. Speed is preserved. Manual test: hitting with the edges gives steep angles and hitting with the center goes nearly vertical.
8. Add the brick collision. Pick the reflection axis from the side of overlap. Apply at most one brick hit per frame. Decrement `hitsLeft`. When it reaches 0: mark the brick dead, add points, add `BALL_SPEED_STEP` (capped at `BALL_SPEED_MAX`), and push an explosion. Manual test: colored bricks break in 1 hit, gray in 2, and the score goes up 10 / 20.
9. Add explosions: draw `EXPLOSION_FRAMES[color][frame]` for `EXPLOSION_DURATION` ms, then remove the explosion. Manual test: every broken brick shows a short 4-frame animation.
10. Add sounds. Create `Audio` objects for both mp3 files and play a clone on each event, so overlapping sounds work. Catch the rejected `play()` promise silently. Manual test: walls and paddle play the bounce sound, and broken bricks play the break sound.
11. Add the state machine in `src/game.js`: `start` → (Space/click) `playing`. P/Esc toggles `paused`. Ball below the bottom edge → lose a life, reset the ball to `stuck`, and if `lives === 0` go to `gameover`. All bricks dead → `win`. Space/click in `win`/`gameover` resets score, lives, bricks and ball, then goes to `playing`. Draw a text overlay for `start`, `paused`, `win` and `gameover`. Manual test: walk through every transition.

## Acceptance criteria

- [ ] Opening `index.html` (via `file://` or any static server) shows the game with no errors in the console.
- [ ] The canvas is 800x600 and centered horizontally in the window.
- [ ] 84 bricks are visible: 6 rows x 14 columns, with rows gray, red, yellow, cyan, magenta, green from top to bottom.
- [ ] The Start screen shows a prompt to press Space or click. The ball rests on the paddle.
- [ ] Arrow keys and A/D move the paddle. Moving the mouse over the canvas also moves it. The paddle never goes outside the canvas.
- [ ] Space or click launches the ball from the paddle.
- [ ] The ball bounces off the left, right and top walls, and off the paddle, playing `ball-bounce.mp3`.
- [ ] Hitting the ball with the paddle's left edge sends it up-left. Hitting it with the right edge sends it up-right.
- [ ] A colored brick disappears after 1 hit and adds exactly 10 points.
- [ ] A gray brick survives the first hit and disappears on the second, adding exactly 20 points.
- [ ] Every broken brick plays `break-sound.mp3` and shows its explosion animation.
- [ ] The ball speed after breaking N bricks equals `min(360 + 8·N, 600)` px/s.
- [ ] The HUD shows the current score and lives at all times while playing.
- [ ] Losing the ball below the paddle subtracts 1 life and puts the ball back on the paddle, waiting for launch.
- [ ] Losing the 3rd life shows the Game Over screen with the final score.
- [ ] Breaking all 84 bricks shows the Win screen with the final score.
- [ ] Space or click on the Win or Game Over screen starts a new game with score 0, 3 lives and all bricks restored.
- [ ] P or Esc pauses the game: the ball and paddle freeze and a "Paused" overlay appears. Pressing it again resumes.
- [ ] Switching browser tabs and coming back does not make the ball teleport through bricks or walls.

## Decisions

- **Yes:** plain `<script>` files sharing globals. This matches `assets/spritesheet.js` and works from `file://`.
- **No:** ES modules. They require a local server and would mix styles with the global spritesheet script.
- **No:** bundler, framework, or test tooling. Overkill for an MVP. Verification is manual against the acceptance criteria.
- **Yes:** 4 source files (`config`, `input`, `entities`, `game`). Each file stays small without over-fragmenting the code.
- **Yes:** fixed 800x600 landscape canvas. Chosen over 480x640 portrait and over window scaling, which would complicate mouse mapping.
- **Yes:** bricks drawn at 48x24 (1.5x the 32x16 sprites), 14 columns centered with a 64 px margin. Fills the 800 px width cleanly.
- **Yes:** 6 rows with one color each. `hotpink` is left unused for now.
- **Yes:** gray bricks take 2 hits. **No:** indestructible gray bricks. Those would complicate the win condition.
- **Yes:** flat scoring (10 / 20). **No:** points by row. Simpler to verify.
- **Yes:** delta time in px/s with `dt` clamped to 1/30 s. The game runs at the same speed on any refresh rate and avoids large jumps after tab switches.
- **Yes:** paddle-position bounce angle plus a capped speed increase per brick. This gives the player control and rising difficulty with little code.
- **Yes:** 3 lives and a ball that rests on the paddle until launched.
- **No:** persistence. High scores go in their own spec.
- **Yes:** `git init` as step 1. `/spec-impl` needs a repository to create the branch.

## Risks

| Risk | Mitigation |
| --- | --- |
| Browser autoplay policy blocks audio before user interaction | Sounds only play after the first Space or click. `play()` rejections are caught and ignored. |
| Ball tunnels through a brick or the paddle at high speed | At the 600 px/s cap with `dt` ≤ 1/30 s, the ball moves at most 20 px per frame, which is less than `BRICK_H` (24). The paddle check uses the ball's previous position to detect crossing. |
| Ball hits two bricks in one frame and its reflection cancels out | Resolve only one brick collision per frame. |
| Ball gets stuck in a near-horizontal loop | The bounce angle is limited to ±60° from vertical, so the ball always has vertical speed. |
| Spritesheet not loaded yet when the first frames render | The loop only starts inside the `loadSpritesheet` callback. |

## What is **not** in this spec

- Multiple levels and level editor.
- Power-ups, capsules and enemies.
- High scores and any persistence.
- Responsive scaling, fullscreen, touch and mobile controls.
- Audio settings (mute, volume).
- Build tooling and automated tests.

Each one of those, if it lands, goes in its own spec.
