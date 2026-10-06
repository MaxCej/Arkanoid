# SPEC 02 — Multiple levels

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-10-06
> **Objective:** Replace the single hardcoded brick layout with 5 hand-designed levels, defined as ASCII grids and played in sequence with score and lives carried over.

## Scope

**In:**

- New file `src/levels.js` with a character legend (`BRICK_CHARS`) and 5 level layouts (`LEVELS`) written as ASCII grids.
- Bricks are built from the current level's grid instead of `LEVEL_ROWS`. `LEVEL_ROWS` is removed from `src/config.js`.
- Level 1 is the SPEC 01 layout, reproduced exactly.
- Grids are validated when the bricks are built. A malformed grid throws an `Error` naming the level and row.
- New game state `levelclear`. Clearing levels 1–4 shows an overlay and waits for Space or click before loading the next level.
- Clearing level 5 shows the existing Win screen.
- Score and lives carry over between levels.
- Ball start speed rises per level: `BALL_SPEED_START + LEVEL_SPEED_STEP × (level − 1)`. The `BALL_SPEED_MAX` cap is unchanged.
- Starting a level centers the paddle, puts the ball on it waiting for launch, and clears pending explosions.
- The HUD shows `LEVEL n/5` in the center.
- Game Over and Win restart from level 1 with score 0 and 3 lives.

**Out of scope (for future specs):**

- New brick types (indestructible bricks, 3+ hit bricks, hit counts that scale by level).
- Level editor.
- Persistence of any kind: level select, saved progress, highest level reached.
- Debug or cheat keys to skip levels.
- Bonus lives or bonus points for clearing a level.
- Per-level backgrounds, music or themes.
- Fixing the swapped color labels in `assets/spritesheet.js`.
- Power-ups, capsules and enemies.

## Data model

All files stay plain browser scripts that share globals. No ES modules.

```js
// src/config.js — added
const LEVEL_SPEED_STEP = 20;     // px/s added to the ball's start speed per level

// src/config.js — removed
// const LEVEL_ROWS = [...];
```

```js
// src/levels.js — new
// One char per brick, named by the color seen on screen. Some sprite keys in
// assets/spritesheet.js do not match the color they draw (see SPEC 01).
const BRICK_CHARS = {
  S: 'gray',      // silver/gray, 2 hits
  R: 'red',
  Y: 'yellow',
  B: 'green',     // draws light blue
  V: 'magenta',   // draws violet
  G: 'cyan',      // draws green
  O: 'hotpink',   // draws orange
};
const EMPTY_CHAR = '.';
const MAX_LEVEL_ROWS = 12;       // 80 + 12*24 = 368 px: keeps room above the paddle

const LEVELS = [ /* { name, rows: [ 14-char strings ] } — see below */ ];
```

```js
// Runtime state (src/game.js) — changed
const game = {
  state: 'start',   // 'start' | 'playing' | 'paused' | 'levelclear' | 'win' | 'gameover'
  level: 1,         // 1-based index into LEVELS
  // score, lives, paddle, ball, bricks, explosions: unchanged
};
```

Grid rules:

- Every row has exactly `BRICK_COLS` (14) characters.
- Every character is `EMPTY_CHAR` or a key of `BRICK_CHARS`.
- A level has between 1 and `MAX_LEVEL_ROWS` rows.
- Row 0 is drawn at `BRICK_OFFSET_Y`, column 0 at `BRICK_OFFSET_X`, as in SPEC 01.

### The 5 levels

**1 — Classic** (84 bricks, 14 gray, max 980 points)

```
SSSSSSSSSSSSSS
RRRRRRRRRRRRRR
YYYYYYYYYYYYYY
BBBBBBBBBBBBBB
VVVVVVVVVVVVVV
GGGGGGGGGGGGGG
```

**2 — Pyramid** (56 bricks, 2 gray, max 580 points)

```
......SS......
.....RRRR.....
....YYYYYY....
...BBBBBBBB...
..VVVVVVVVVV..
.GGGGGGGGGGGG.
OOOOOOOOOOOOOO
```

**3 — Checkerboard** (56 bricks, 7 gray, max 630 points)

```
R.R.R.R.R.R.R.
.Y.Y.Y.Y.Y.Y.Y
B.B.B.B.B.B.B.
.V.V.V.V.V.V.V
G.G.G.G.G.G.G.
.O.O.O.O.O.O.O
S.S.S.S.S.S.S.
.R.R.R.R.R.R.R
```

**4 — Fortress** (64 bricks, 34 gray, max 980 points)

```
SSSSSSSSSSSSSS
S............S
S.RRRRRRRRRR.S
S.YYYYYYYYYY.S
S.BBBBBBBBBB.S
S............S
SSSSS....SSSSS
```

**5 — Diamond** (50 bricks, 18 gray, max 680 points)

```
......SS......
.....SYYS.....
....SYBBYS....
...SYBVVBYS...
..SYBVGGVBYS..
...SYBVVBYS...
....SYBBYS....
.....SYYS.....
......SS......
```

Maximum total score for a full run without losing bricks to anything else: 980 + 580 + 630 + 980 + 680 = **3850**.

## Implementation plan

1. Create `src/levels.js` with `BRICK_CHARS`, `EMPTY_CHAR`, `MAX_LEVEL_ROWS` and the 5 `LEVELS` exactly as listed above. Add `LEVEL_SPEED_STEP` to `src/config.js`. In `index.html`, load `src/levels.js` right after `src/config.js`. Nothing uses the new globals yet. Manual test: the game plays as before, with no console errors, and `LEVELS.length` in the console returns `5`.
2. In `src/entities.js`, change `createBricks()` to `createBricks(levelNumber)`. It reads `LEVELS[levelNumber - 1].rows`, skips `EMPTY_CHAR` cells, and maps each char through `BRICK_CHARS`. It throws an `Error` such as `Level 3, row 2: expected 14 chars, got 13` for a wrong row length, an unknown char, or a row count outside 1..`MAX_LEVEL_ROWS`. Remove `LEVEL_ROWS` from `src/config.js`. `src/game.js` calls `createBricks(1)`. Manual test: level 1 looks identical to the SPEC 01 layout (84 bricks, same colors).
3. In `src/game.js`, add `game.level` and a `startLevel(n)` function. It sets `game.level`, builds the bricks, clears explosions, centers the paddle, and creates a stuck ball whose speed is `BALL_SPEED_START + LEVEL_SPEED_STEP × (n − 1)`. `newGame()` resets score and lives, then calls `startLevel(1)`. Draw `LEVEL n/5` centered in the HUD, using `LEVELS.length`. Manual test: the HUD shows `LEVEL 1/5`. Running `startLevel(3)` in the console shows the Checkerboard layout and `LEVEL 3/5`.
4. Add the `levelclear` state. When all bricks are dead: if `game.level < LEVELS.length`, go to `levelclear`; otherwise go to `win`. In `levelclear`, Space or click calls `startLevel(game.level + 1)` and goes to `playing`, with the ball waiting on the paddle. P and Esc do nothing in `levelclear`. Add its overlay: `LEVEL n CLEAR`, then `Next: LEVEL n+1 — <NAME>`, then `Press Space or click to continue`. Manual test: running `startLevel(n)` in the console and clearing the level walks through every transition, from 1→2 up to 5→Win.

## Acceptance criteria

- [ ] Opening `index.html` shows the game with no errors in the console.
- [ ] `src/levels.js` exists and is loaded by `index.html` after `src/config.js`.
- [ ] `LEVEL_ROWS` no longer exists anywhere in `src/`.
- [ ] Level 1 shows 84 bricks in rows that look gray, red, yellow, light blue, violet, green from top to bottom, identical to SPEC 01.
- [ ] Levels 2–5 match their grids in this spec, with 56, 56, 64 and 50 bricks respectively.
- [ ] Every `O` cell draws an orange brick.
- [ ] The HUD shows `LEVEL n/5` in the center while playing, next to score and lives.
- [ ] Clearing levels 1–4 shows the `LEVEL n CLEAR` overlay with the next level's number and name.
- [ ] In the `levelclear` overlay, Space or click loads the next level with the paddle centered and the ball resting on it.
- [ ] After loading a new level, the ball only leaves the paddle after another Space or click.
- [ ] Score and lives on the new level equal their values when the previous level was cleared.
- [ ] The ball's speed at launch on level n is `360 + 20·(n−1)` px/s (360, 380, 400, 420, 440).
- [ ] The ball speed after breaking N bricks on level n equals `min(360 + 20·(n−1) + 8·N, 600)` px/s.
- [ ] Clearing level 5 shows the existing `YOU WIN!` screen with the final score.
- [ ] Clearing all 5 levels without losing bricks to anything else gives a final score of exactly 3850.
- [ ] Space or click on the Win or Game Over screen starts a new game on level 1 with score 0 and 3 lives.
- [ ] Changing one row of a level in `src/levels.js` to 13 characters makes the page throw an `Error` in the console that names that level and row.
- [ ] P and Esc still pause and resume during play, and do nothing on the `levelclear` overlay.

## Decisions

- **Yes:** 5 levels. Enough for a real progression while staying hand-designable and manually verifiable.
- **No:** 3 levels (too few to feel like progression) or 10 (too much design and playtesting for this spec).
- **Yes:** ASCII grids of 14-char strings in `src/levels.js`. Readable, easy to edit, and the shape is visible in the source.
- **No:** arrays of color keys. Too verbose at 14 entries per row. **No:** procedural generators. Harder to design specific shapes and to verify.
- **Yes:** the legend uses letters for the color seen on screen (`B` = light blue = sprite key `green`). The mismatch with the sprite keys lives only in `BRICK_CHARS`.
- **Yes:** the 5 grids are fixed in this spec. Acceptance criteria can then count bricks and points exactly.
- **Yes:** `hotpink` (orange, `O`) is used now. SPEC 01 left it unused.
- **Yes:** reuse the existing brick types only (colored 1 hit, gray 2 hits). Levels differ by layout and ball speed. **No:** indestructible bricks. They would change the win condition and have no sprite of their own.
- **Yes:** validation that throws at brick-building time. A typo in a grid fails loudly instead of silently shifting bricks.
- **Yes:** a `levelclear` state that waits for Space or click. Reuses the overlay system and the launch input. **No:** auto-advance on a timer, or an instant switch with no feedback.
- **Yes:** lives carry over. **No:** resetting lives per level, or a bonus life per clear. Losing a life keeps its weight across the run.
- **Yes:** the ball's start speed rises by 20 px/s per level, with the 600 px/s cap unchanged. **No:** resetting to 360 each level (no difficulty curve). **No:** carrying speed over (later levels would start at the cap).
- **Yes:** within a level, a lost life keeps the ball's current speed, as in SPEC 01.
- **Yes:** starting a level centers the paddle, sticks the ball and clears explosions. Every level starts from the same known position.
- **Yes:** Game Over and Win restart from level 1. **No:** continuing at the current level.
- **Yes:** HUD shows `LEVEL n/5`. **No:** the level name in the HUD. It is shown in the `levelclear` overlay instead.
- **No:** persistence and level select. They go in their own spec, as SPEC 01 decided.
- **No:** a debug key to skip levels. `startLevel(n)` is a global, so manual testing can call it from the browser console.

## Risks

| Risk | Mitigation |
| --- | --- |
| A typo in a grid shifts or drops bricks silently | `createBricks` validates row count, row length and every char, and throws an `Error` naming the level and row. |
| A tall layout leaves too little room between the bricks and the paddle | `MAX_LEVEL_ROWS` = 12 keeps the lowest brick row at y ≤ 368, about 190 px above the paddle. The tallest level (Diamond) has 9 rows. |
| The Space or click that leaves `levelclear` also launches the ball | `launch` is a one-shot flag consumed once per frame. The state change uses it, so the ball stays stuck until the next press. |
| Explosions from the last brick of a level draw over the next level | `startLevel` clears `game.explosions`. |
| Level 5 at 440 px/s start speed is too hard | Difficulty depends on one constant, `LEVEL_SPEED_STEP`, which can be tuned without touching the levels. |

## What is **not** in this spec

- New brick types (indestructible, multi-hit, scaling by level).
- Level editor.
- Level select, saved progress or any persistence.
- Debug or cheat keys.
- Bonus lives or points for clearing a level.
- Per-level backgrounds, music or themes.
- Fixing the sprite color labels in `assets/spritesheet.js`.
- Power-ups, capsules and enemies.

Each one of those, if it lands, goes in its own spec.
