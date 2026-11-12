/* Solver part 3 of 3: difficulty levels and the puzzle maker.
   Needs solver-basics.js and solver-techniques.js. */
// level = the lowest rating a puzzle may have, cap = the highest it may have.
const DIFFS = {
  easy:   { label: 'Easy',   level: 1, cap: 1,  mult: 1,   budget: 4000 },
  medium: { label: 'Medium', level: 2, cap: 2,  mult: 1.5, budget: 4000 },
  hard:   { label: 'Hard',   level: 3, cap: 3,  mult: 2,   budget: 4000 },
  expert: { label: 'Expert', level: 4, cap: 4,  mult: 3,   budget: 4000 },
  evil:   { label: 'Evil',   level: 5, cap: 5,  mult: 4,   budget: 8000 },
  insane: { label: 'Insane', level: 6, cap: 99, mult: 5,   budget: 8000 },
};

// One attempt: random full grid, then remove cells one at a time, keeping a removal only
// if the puzzle stays unique and does not need a technique above the level's cap.
// Insane has no cap, so it keeps removing until the puzzle is as sparse as it can be.
function attempt(diff) {
  const solution = search(new Array(81).fill(0), 1, true).sol;
  const cap = DIFFS[diff].cap;
  const puzzle = solution.slice();
  let clues = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (search(puzzle, 2, false).count !== 1) { puzzle[i] = keep; continue; }
    if (cap < 99 && rate(puzzle).level > cap) { puzzle[i] = keep; continue; }
    clues--;
  }
  return { puzzle, solution, clues, rating: rate(puzzle) };
}

// Keep trying until a puzzle matches the level. After the time budget, return the closest one.
async function generate(diff, budgetMs) {
  const want = DIFFS[diff].level;
  const t0 = Date.now();
  let best = null;
  for (;;) {
    const a = attempt(diff);
    const lv = a.rating.level;
    if (lv >= want && lv <= DIFFS[diff].cap) return a;
    if (!best || Math.abs(lv - want) < Math.abs(best.rating.level - want)) best = a;
    if (Date.now() - t0 > budgetMs) return best;
    await new Promise((r) => setTimeout(r, 0));
  }
}

// The level each technique belongs to, and a generator for puzzles that need one in particular.
const TYPE_LEVEL = {
  'naked-single': 1, 'hidden-single': 2,
  'pointing': 3, 'claiming': 3, 'naked-pair': 3, 'hidden-pair': 3,
  'naked-triple': 4, 'hidden-triple': 4, 'x-wing': 4,
  'xy-wing': 5, 'swordfish': 5, 'forcing': 6,
};
async function generatePractice(type, budgetMs) {
  const diff = Object.keys(DIFFS).find((k) => DIFFS[k].level === TYPE_LEVEL[type]);
  const t0 = Date.now();
  let last = null;
  for (;;) {
    const a = attempt(diff);
    last = a;
    if (a.rating.used.includes(type)) return Object.assign(a, { diff, hit: true });
    if (Date.now() - t0 > budgetMs) return Object.assign(last, { diff, hit: false });
    await new Promise((r) => setTimeout(r, 0));
  }
}
