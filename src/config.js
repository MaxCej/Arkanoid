// Game constants. Plain browser script: everything here is a global.

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

// One sprite key per row, top to bottom. Some keys in assets/spritesheet.js
// do not match the color they draw: 'green' draws light blue, 'cyan' draws
// green, 'magenta' draws violet. On screen: gray, red, yellow, light blue,
// violet, green.
const LEVEL_ROWS = ['gray', 'red', 'yellow', 'green', 'magenta', 'cyan'];
const BRICK_POINTS = { default: 10, gray: 20 };
const BRICK_HITS = { default: 1, gray: 2 };
