# SPEC 03 — Level select menu

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-06
> **Objective:** Replace the Start screen with a main menu where the player picks the starting level, and turn the pause screen into a menu that can also pick a level or return to the main menu.

## Scope

**In:**

- New file `src/menu.js` with the menu definitions, layout constants, row hit-testing and menu drawing.
- A main menu in a new `menu` state, which replaces the `start` state. It lists the 5 levels by number and name.
- Behind the main menu, the bricks of the highlighted level are drawn dimmed. They change as the highlight moves. The HUD, paddle and ball are hidden.
- A pause menu in the existing `paused` state, with 3 rows: `RESUME`, `CHOOSE LEVEL`, `MAIN MENU`.
- A pause level list in a new `pauselevels` state, with the 5 levels plus a `BACK` row.
- Keyboard: Up/Down and W/S move the highlight, wrapping at both ends. Enter or Space selects the highlighted row.
- Mouse: moving the pointer over a row highlights it. Clicking a row selects it. Clicking outside every row does nothing.
- P and Esc step back once. In `paused` they resume, as today. In `pauselevels` they return to the pause menu. In `menu` they do nothing.
- Picking a level from either menu starts a new run on that level, with score 0 and 3 lives. The ball rests on the centered paddle until the next Space, Enter or click.
- `MAIN MENU` abandons the run without confirmation.
- Space, Enter or click on the Win and Game Over screens returns to the main menu. The highlight is on the level the run started at.
- The Win and Game Over prompt reads `Press Space, Enter or click for the menu`.
- Enter is added as a launch key everywhere Space works today: launching the ball, continuing from `levelclear`, and leaving the Win and Game Over screens.
- All 5 levels can always be picked.

**Out of scope (for future specs):**

- Unlocking levels, in memory or saved.
- Persistence of any kind (saved progress, last level picked, high scores).
- A confirmation screen before abandoning a run.
- Settings rows (sound, controls, difficulty).
- Number-key shortcuts (1–5) to pick a level.
- Gamepad and touch input.
- Menu sounds and menu animations.
- Changes to the `levelclear` screen beyond accepting Enter.

## Data model

All files stay plain browser scripts that share globals. No ES modules.

```js
// src/input.js — changed
const input = {
  left: false, right: false,   // held
  up: false, down: false,      // one-shot: menu highlight moves
  mouseX: null, mouseY: null,  // pointer position in canvas pixels
  launch: false,               // one-shot: Space, Enter or click
  click: null,                 // one-shot: { x, y } of a click, in canvas pixels
  pause: false,                // one-shot: P or Esc
};
```

- Up is `ArrowUp` or `KeyW`. Down is `ArrowDown` or `KeyS`. Key repeat is ignored, like Space and P.
- Enter (`Enter` or `NumpadEnter`) sets `launch`, exactly like Space.
- A click sets both `launch` and `click`. Menus use `click` to know where it was. The rest of the game keeps using `launch`.

```js
// src/menu.js — new
const MENU_TITLE_Y = 130;       // center y of the title
const MENU_FIRST_ROW_Y = 220;   // center y of the first row
const MENU_ROW_H = 36;          // row spacing and hit-box height
const MENU_ROW_W = 360;         // hit-box width, centered on the canvas
const MENU_HINT_Y = 540;        // center y of the hint line

// Rows are { label, action }. A level row's action is { type: 'level', level: n }.
// The other actions are { type: 'resume' | 'levels' | 'mainmenu' | 'back' }.
const MENUS = {
  menu:        { title: 'ARKANOID',     subtitle: 'Choose a level', rows: [/* 5 level rows */] },
  paused:      { title: 'PAUSED',       rows: [/* RESUME, CHOOSE LEVEL, MAIN MENU */] },
  pauselevels: { title: 'CHOOSE LEVEL', rows: [/* 5 level rows, BACK */] },
};
// Level row label: `${n}  ${LEVELS[n - 1].name.toUpperCase()}`, e.g. '3  CHECKERBOARD'.
// Hint line on every menu: 'Up/Down to choose, Enter to select'.
```

`MENUS` is keyed by the game state that shows it, so `MENUS[game.state]` gives the active menu or `undefined`.

```js
// Runtime state (src/game.js) — changed
const game = {
  state: 'menu',     // 'menu' | 'playing' | 'paused' | 'pauselevels' | 'levelclear' | 'win' | 'gameover'
  menuIndex: 0,      // highlighted row of the active menu
  runStartLevel: 1,  // level the current run started at, used for the highlight on return to the menu
  // level, score, lives, paddle, ball, bricks, explosions: unchanged from SPEC 02
};
```

State transitions:

| From | Event | To |
| --- | --- | --- |
| page load | — | `menu`, highlight on level 1 |
| `menu` | select level n | `playing` on level n, new run |
| `playing` | P / Esc | `paused`, highlight on `RESUME` |
| `paused` | P / Esc, or `RESUME` | `playing` |
| `paused` | `CHOOSE LEVEL` | `pauselevels`, highlight on the current level |
| `paused` | `MAIN MENU` | `menu`, highlight on `runStartLevel` |
| `pauselevels` | P / Esc, or `BACK` | `paused`, highlight on `CHOOSE LEVEL` |
| `pauselevels` | select level n | `playing` on level n, new run |
| `levelclear` | Space / Enter / click | `playing` on the next level (as in SPEC 02) |
| `win`, `gameover` | Space / Enter / click | `menu`, highlight on `runStartLevel` |

## Implementation plan

1. In `src/input.js`, add the `up`, `down`, `mouseY` and `click` fields. Set `up` and `down` from ArrowUp/W and ArrowDown/S as one-shot flags. Make Enter set `launch`. Track `mouseY` on `mousemove`. On `click`, store the canvas coordinates in `click` as well as setting `launch`. In `src/game.js`, clear `up`, `down` and `click` each frame next to `launch` and `pause`. Nothing reads them yet. Manual test: the game plays as before, and Enter launches the ball.
2. Create `src/menu.js` with the layout constants, `MENUS`, a function that returns the row index under a canvas point (or `-1`), a function that moves an index up or down with wrapping, and `drawMenu(ctx, menu, index)`. `drawMenu` draws a dim layer below the HUD, the title, the optional subtitle, the rows, and the hint line. The highlighted row is yellow and prefixed with `> `. Load `src/menu.js` in `index.html` after `src/entities.js` and before `src/game.js`. Manual test: no console errors, and `MENUS.menu.rows.length` returns `5` in the console.
3. In `src/game.js`, replace the `start` state with `menu`. Add `game.menuIndex` and `game.runStartLevel`. Add a shared menu-input handler: Up/Down move the highlight, pointer movement over a row highlights it, Enter or Space selects the highlighted row, and a click selects the row under it (or does nothing). Change `newGame()` to `newGame(n)`, which resets score and lives, sets `runStartLevel`, calls `startLevel(n)` and goes to `playing`. In `menu`, moving the highlight calls `startLevel(menuIndex + 1)` so the bricks preview that level. In `menu`, render only the bricks, then the menu, with no HUD, paddle or ball. Win and Game Over now go to `menu`, with the highlight on `runStartLevel`. Remove the `start` overlay. Manual test: the page opens on the main menu, every input picks every level, and the Win and Game Over screens return to the menu.
4. Turn `paused` into a menu. P/Esc in `playing` goes to `paused` with the highlight on `RESUME`. P/Esc in `paused` resumes. `RESUME` resumes, and `MAIN MENU` goes to `menu` with the highlight on `runStartLevel`. `CHOOSE LEVEL` is drawn but does nothing until step 5. Remove the `paused` overlay. Everything stays frozen while paused, explosions included, as today. Manual test: pause, move the highlight with the keyboard and the mouse, resume both ways, and quit to the main menu.
5. Add the `pauselevels` state. `CHOOSE LEVEL` opens it with the highlight on the current level. P/Esc or `BACK` returns to `paused` with the highlight on `CHOOSE LEVEL`. Picking a level calls `newGame(n)`. The game stays frozen while this list is open. Manual test: from the pause menu, open the level list, go back with Esc and with `BACK`, and start a new run on level 4.

## Acceptance criteria

- [ ] Opening `index.html` shows the main menu with no errors in the console.
- [ ] `src/menu.js` exists and is loaded by `index.html` after `src/entities.js` and before `src/game.js`.
- [ ] The `start` state no longer exists anywhere in `src/`.
- [ ] The main menu shows the title `ARKANOID`, the subtitle `Choose a level`, 5 rows `1  CLASSIC` to `5  DIAMOND`, and the hint `Up/Down to choose, Enter to select`.
- [ ] The main menu shows no HUD, paddle or ball.
- [ ] On page load, row 1 is highlighted in yellow with a `> ` prefix, and the Classic bricks are drawn dimmed behind the menu.
- [ ] Moving the highlight to row n changes the dimmed bricks to level n's layout.
- [ ] ArrowDown and S move the highlight down. ArrowUp and W move it up.
- [ ] Up on row 1 highlights the last row. Down on the last row highlights row 1.
- [ ] Holding an arrow key moves the highlight by exactly one row.
- [ ] Moving the pointer over a row highlights it. Moving it off every row leaves the highlight where it was.
- [ ] After moving the pointer, the keyboard still moves the highlight.
- [ ] Enter, Space, and a click on a row each start the selected level. A click outside every row does nothing.
- [ ] Starting level n from the main menu shows `LEVEL n/5`, score 0, 3 lives, and the ball resting on the centered paddle.
- [ ] After a level is picked, the ball only leaves the paddle after another Space, Enter or click.
- [ ] Enter launches the ball during play and continues from the `levelclear` screen.
- [ ] P or Esc during play shows the pause menu with `PAUSED`, the rows `RESUME`, `CHOOSE LEVEL`, `MAIN MENU`, and `RESUME` highlighted.
- [ ] While the pause menu or the pause level list is open, the ball, the paddle and explosions do not move.
- [ ] P, Esc, or selecting `RESUME` returns to play with the ball's position and velocity unchanged.
- [ ] Selecting `MAIN MENU` shows the main menu with the highlight on the level the run started at.
- [ ] Selecting `CHOOSE LEVEL` shows `CHOOSE LEVEL` with 5 level rows and a `BACK` row, with the current level highlighted.
- [ ] In the pause level list, P, Esc, or selecting `BACK` returns to the pause menu with `CHOOSE LEVEL` highlighted.
- [ ] Picking level n from the pause level list starts level n with score 0, 3 lives, and the ball resting on the centered paddle.
- [ ] P and Esc do nothing in the main menu.
- [ ] Space, Enter or click on the Win screen shows the main menu with the highlight on the level the run started at.
- [ ] Space, Enter or click on the Game Over screen shows the main menu with the highlight on the level the run started at.
- [ ] The Win and Game Over screens show the prompt `Press Space, Enter or click for the menu`.
- [ ] Clicking a menu row never launches the ball in the same frame.

## Decisions

- **Yes:** a vertical list of the 5 levels. **No:** a single `< 3 >` selector, because Left/Right already move the paddle. **No:** number keys 1–5, which have no visible highlight and leave the mouse out.
- **Yes:** the mouse can hover and click rows, matching the existing mouse controls. **No:** keyboard-only menus, which would block mouse-only players.
- **Yes:** hover changes the highlight only when the pointer moves, like the paddle's mouse control in SPEC 01. The keyboard keeps working after the mouse is used.
- **Yes:** the highlight wraps at both ends.
- **Yes:** all 5 levels can always be picked. **No:** unlocking or persistence, which earlier specs deferred to their own spec.
- **Yes:** the pause menu has `RESUME`, `CHOOSE LEVEL` and `MAIN MENU`, and the level list is a separate screen with `BACK`. **No:** a two-row pause menu without a way back to the main menu. **No:** putting the level list directly on the pause screen.
- **Yes:** picking a level from either menu starts a fresh run with score 0 and 3 lives. **No:** keeping score and lives when picking from pause, which would let players farm score by replaying levels.
- **Yes:** P and Esc step back one screen. **No:** P and Esc always resuming, which would skip the pause menu from the level list.
- **Yes:** `MAIN MENU` needs no confirmation. With no high scores yet, only the current run's score is lost.
- **Yes:** the Win and Game Over screens return to the main menu, which becomes the hub for every run. This replaces SPEC 02's "restart from level 1".
- **Yes:** the main menu replaces the `start` state instead of adding a screen before it. One entry screen, one less state.
- **Yes:** the main menu previews the highlighted level's bricks and hides the HUD, paddle and ball. **No:** a plain black background, or the old level 1 + HUD look.
- **Yes:** the preview reuses `startLevel(n)`. It already builds the bricks, and every real start calls it again through `newGame(n)`.
- **Yes:** after picking a level, the ball rests on the paddle until launched, as at every level start in SPEC 02. **No:** launching on the same press.
- **Yes:** Enter is a launch key everywhere, not only in menus. One rule is easier to remember than a key that works in some screens only.
- **Yes:** a click sets both `launch` and `click`. Gameplay code stays unchanged, and menus can tell a click from a key press.
- **Yes:** menu code lives in a new `src/menu.js`. `src/game.js` keeps the state machine. **No:** putting it all in `src/game.js`, which is already about 190 lines.
- **Yes:** `MENUS` is keyed by game state. The active menu is a single lookup, with no separate "current menu" field.

## Risks

| Risk | Mitigation |
| --- | --- |
| The click or Space that picks a level also launches the ball | `launch` and `click` are one-shot flags, consumed once per frame. The menu consumes them, so the ball waits for the next press. |
| A click outside every row selects the highlighted row anyway, because a click also sets `launch` | Menus check `click` first. When it is set, only the row under the click can be selected. |
| Moving the mouse during pause makes the paddle jump to the pointer on resume | This is the existing SPEC 01 rule that the mouse drives the paddle when it moves. It is accepted. `RESUME` with the keyboard and an unmoved mouse leaves the paddle in place. |
| The main-menu preview leaves state behind (explosions, paddle position) when a run starts | Every real start goes through `newGame(n)` → `startLevel(n)`, which rebuilds bricks, paddle and ball and clears explosions. |
| Menu rows overlap the hint line | 6 rows at most (pause level list): the last row is at y = 220 + 5 × 36 = 400, well above the hint line at y = 540. |

## What is **not** in this spec

- Unlocking levels or saving progress.
- High scores or any other persistence.
- A confirmation screen before leaving a run.
- Settings rows (sound, controls, difficulty).
- Number-key shortcuts for levels.
- Gamepad and touch input.
- Menu sounds and animations.

Each one of those, if it lands, goes in its own spec.
