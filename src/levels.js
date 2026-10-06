// Level layouts. Plain browser script: everything here is a global.

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

// Each row has exactly BRICK_COLS (14) chars. Row 0 is the top row.
const LEVELS = [
  {
    name: 'Classic',
    rows: [
      'SSSSSSSSSSSSSS',
      'RRRRRRRRRRRRRR',
      'YYYYYYYYYYYYYY',
      'BBBBBBBBBBBBBB',
      'VVVVVVVVVVVVVV',
      'GGGGGGGGGGGGGG',
    ],
  },
  {
    name: 'Pyramid',
    rows: [
      '......SS......',
      '.....RRRR.....',
      '....YYYYYY....',
      '...BBBBBBBB...',
      '..VVVVVVVVVV..',
      '.GGGGGGGGGGGG.',
      'OOOOOOOOOOOOOO',
    ],
  },
  {
    name: 'Checkerboard',
    rows: [
      'R.R.R.R.R.R.R.',
      '.Y.Y.Y.Y.Y.Y.Y',
      'B.B.B.B.B.B.B.',
      '.V.V.V.V.V.V.V',
      'G.G.G.G.G.G.G.',
      '.O.O.O.O.O.O.O',
      'S.S.S.S.S.S.S.',
      '.R.R.R.R.R.R.R',
    ],
  },
  {
    name: 'Fortress',
    rows: [
      'SSSSSSSSSSSSSS',
      'S............S',
      'S.RRRRRRRRRR.S',
      'S.YYYYYYYYYY.S',
      'S.BBBBBBBBBB.S',
      'S............S',
      'SSSSS....SSSSS',
    ],
  },
  {
    name: 'Diamond',
    rows: [
      '......SS......',
      '.....SYYS.....',
      '....SYBBYS....',
      '...SYBVVBYS...',
      '..SYBVGGVBYS..',
      '...SYBVVBYS...',
      '....SYBBYS....',
      '.....SYYS.....',
      '......SS......',
    ],
  },
];
