# Sudoku for Fun

A Chrome extension for playing Sudoku and learning solving techniques.

- How to run it on your computer: [RUNNING_LOCALLY.md](RUNNING_LOCALLY.md)
- Chrome Web Store listing details: [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md)

## What's in each folder

```
sudoku/
├── manifest.json      The extension's ID card. Chrome reads this first. Must stay here.
│
├── game/              The Sudoku game page
│   ├── game.html          the page itself
│   ├── game.css           how the game looks
│   ├── game-rules.js      the rules: entering digits, undo, hints, saving
│   ├── game-scores.js     scoring and the high-scores window
│   ├── game-screen.js     drawing the board and buttons
│   ├── game-menu.js       the "New game" menu for picking a difficulty
│   └── game-controls.js   mouse, keyboard, clock, start-up (loads last)
│
├── learn/             The "Learn techniques" page
│   ├── learn.html         the page itself
│   ├── learn.css          how the lessons look
│   ├── lesson-list.js     the lessons' names, descriptions and prompts
│   ├── lesson-explain.js  how each technique is explained and highlighted
│   ├── lesson-terms.js    Sudoku words: the basics lesson and the word tooltips
│   ├── lesson-examples.js makes a fresh example for the "New example" button
│   ├── lessons-data.js    the first (hand-checked) example puzzle for each lesson
│   └── learn.js           how the lesson page works, including the replay (loads last)
│
├── shared/            Used by both pages
│   ├── theme.css          colours, fonts and buttons (paper and dark themes)
│   ├── theme.js           the paper / dark switch
│   ├── save-data.js       saving games, scores and progress on your computer
│   ├── solver-basics.js       solver part 1: the grid and the search
│   ├── solver-techniques.js   solver part 2: rating puzzles by technique
│   └── puzzle-maker.js        solver part 3: difficulty levels and new puzzles
│
├── background/        Runs behind the scenes
│   └── background.js      opens the game when you click the toolbar icon
│
├── icons/             The extension's icon in 4 sizes
├── tools/
│   └── package.ps1        builds the zip to upload to the Chrome Web Store
│
├── privacy.md         Privacy policy (published at tylersheehy.github.io/sudoku/privacy)
└── .github/workflows/ Automatic publishing to the Chrome Web Store
```

Every code file is kept under 400 lines so each one stays easy to read.
