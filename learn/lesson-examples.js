/* Learn: makes a fresh worked example for a technique. It builds a new puzzle that needs the technique,
   replays the solver step by step, and stops at the moment the technique is used. Needs puzzle-maker.js. */
'use strict';

const SINGLE_TYPES = ['naked-single', 'hidden-single'];
// The hardest techniques need rare puzzles, so they get longer to search.
const EXAMPLE_BUDGET_MS = { 'xy-wing': 15000, 'swordfish': 15000, 'forcing': 15000 };

// Returns a new example (same shape as the ones in lessons-data.js), or null if none was found in time.
async function makeExample(type, previous) {
  // Let the "Finding an example" message paint before the first (blocking) search.
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const budget = EXAMPLE_BUDGET_MS[type] || 6000;
  const t0 = Date.now();
  while (Date.now() - t0 < budget) {
    const made = await generatePractice(type, budget - (Date.now() - t0));
    if (made.hit) {
      const ex = exampleFromPuzzle(type, made);
      if (ex && !(previous && previous.puzzle && previous.puzzle.join('') === ex.puzzle.join(''))) return ex;
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  return null;
}

// Replay the solver on the puzzle and capture the board just before the technique is first used.
function exampleFromPuzzle(type, made) {
  const run = rate(made.puzzle, { record: true });
  const step = run.steps.find((s) => s.pat && s.pat.type === type);
  if (!step) return null;
  const g = Array.from(step.before.g), cand = Array.from(step.before.cand);
  const placed = [], elims = [];
  if (SINGLE_TYPES.includes(type)) {
    placed.push([step.pat.cells[0], step.pat.digit]);
  } else {
    // Candidates the technique crossed out: there before the step, gone after it.
    for (let i = 0; i < 81; i++) {
      if (g[i] || step.after.g[i]) continue;
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << (d - 1);
        if ((cand[i] & bit) && !(step.after.cand[i] & bit)) elims.push([i, d]);
      }
    }
    if (!elims.length) return null;
  }
  return { type, puzzle: made.puzzle, solution: made.solution, g, cand, pat: step.pat, elims, placed };
}
