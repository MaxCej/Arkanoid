# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Arkanoid/Breakout browser game, at a very early stage. There is no game code, no `index.html`, no `package.json`, no build, lint, or test tooling yet, and the repo is not yet a git repository. `README.md` is empty. Do not assume a framework or bundler exists; check before adding one.

What exists:

- `assets/spritesheet-breakout.png` — single sprite atlas for all graphics.
- `assets/spritesheet.js` — plain browser script (globals, no ES modules) that defines sprite coordinates and drawing helpers.
- `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3`.

## Spritesheet API (`assets/spritesheet.js`)

- `loadSpritesheet(cb)` must complete before drawing. It loads the PNG, copies it to an offscreen canvas (`ssImg`), and runs queued callbacks. Multiple calls are safe.
- `drawSprite(ctx, name, x, y, w, h)` — `name` is a key of `SPRITES` (`paddle`, `ball`) or `block_<color>` for bricks.
- `drawFrame(ctx, frame, x, y, w, h)` — draws one `{sx, sy, sw, sh}` frame; used with `EXPLOSION_FRAMES[color][i]` (4 frames per color). `EXPLOSION_DURATION` = 150 ms.
- Block colors: `gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`. `gray` explosion reuses the `red` frames.
- Draw helpers silently no-op until the sheet loads.
- The image path `assets/spritesheet-breakout.png` is relative to the HTML page, so the page must live at the repo root.

## Workflow: spec-driven development

Two project skills (installed from `Klerith/fernando-skills`, tracked in `skills-lock.json`, mirrored in `.agents/skills/` and `.claude/skills/`) define the workflow:

- `/spec <feature>` — guided spec design. Writes no code. Asks clarifying questions, then builds the spec section by section from `.agents/skills/spec/template.md` and saves it to `specs/NN-slug.md` (e.g. `specs/01-mvp-arkanoid.md`).
- `/spec-impl <spec>` — implements an approved spec. Accepts full name, number, or slug. Validates spec state, creates and switches to a git branch, then implements step by step.
- Branch creation is controlled by `AutoCreateBranch` in `specs/.spec-config.yml` (default `true`; `false` makes it ask first).

Large features should go through `/spec` first; implementation should follow the approved spec rather than improvise.
