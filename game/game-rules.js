/* Game part 1 of 4: settings, the current game's state, saving, and the rules (enter a digit, erase, undo, hint, new game). */
'use strict';

const $ = (s) => document.querySelector(s);
const KEY = SAVE_KEYS.game;
const SCORES = SAVE_KEYS.scores;
const POINTS = [10, 3, 1]; // first, second, third try; nothing after that
const MAX_MISTAKES = 3;
const PRACTICE_NAMES = {
  'naked-single': 'Naked single', 'hidden-single': 'Hidden single', 'pointing': 'Pointing pair or triple',
  'claiming': 'Claiming pair or triple', 'naked-pair': 'Naked pair', 'hidden-pair': 'Hidden pair',
  'naked-triple': 'Naked triple', 'hidden-triple': 'Hidden triple', 'x-wing': 'X-Wing',
  'xy-wing': 'XY-Wing', 'swordfish': 'Swordfish', 'forcing': 'Forcing chain',
};

const ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  erase: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const zeros = () => new Array(81).fill(0);
const fresh = (diff) => ({
  diff, puzzle: zeros(), solution: zeros(), values: zeros(), notes: zeros(),
  hinted: zeros(), revealed: zeros(), history: [], sel: -1, notesMode: false,
  mistakes: 0, hints: 3, seconds: 0, paused: false, busy: true,
  status: 'playing', unlimited: false, clues: 0, hardest: '',
  score: 0, tries: zeros(), awarded: zeros(), entryId: '', rank: 0, practice: '',
  missed: '', // a practice technique that was asked for but no puzzle needing it was found in time
});
let S = fresh('medium');

function save() {
  if (S.busy) return;
  // Round-trip through JSON so the stored copy matches what JSON would keep.
  storeSet(KEY, JSON.parse(JSON.stringify(Object.assign({}, S, { history: S.history.slice(-100), busy: false }))));
}
async function load() {
  try {
    const o = await storeGet(KEY);
    const ok = o && DIFFS[o.diff] && ['puzzle', 'solution', 'values', 'notes'].every((k) => Array.isArray(o[k]) && o[k].length === 81);
    if (!ok) return null;
    return Object.assign(fresh(o.diff), o, { busy: false, paused: o.status === 'playing' && o.seconds > 0 });
  } catch (e) { return null; }
}

/* ---------- Game logic ---------- */
const active = () => S.status === 'playing' && !S.paused && !S.busy;
const locked = (i) => S.puzzle[i] !== 0 || (S.values[i] !== 0 && S.values[i] === S.solution[i]);

function snapshot() {
  S.history.push({ v: S.values.slice(), n: S.notes.slice() });
  if (S.history.length > 300) S.history.shift();
}

function clearPeerNotes(i, d) {
  const bit = 1 << (d - 1);
  for (let k = 0; k < 81; k++) {
    if (k !== i && (ROW[k] === ROW[i] || COL[k] === COL[i] || BOX[k] === BOX[i])) S.notes[k] &= ~bit;
  }
}

function afterChange() {
  if (S.values.every((v, i) => v === S.solution[i])) {
    S.status = 'won';
    S.rank = S.practice ? 0 : recordScore();
  } else if (S.mistakes >= MAX_MISTAKES && !S.unlimited) {
    S.status = 'failed';
  }
  render();
  save();
}

function input(d, asNote) {
  if (!active() || S.sel < 0) return;
  const i = S.sel;
  if (locked(i)) return;
  if (asNote) {
    if (S.values[i]) return;
    snapshot();
    S.notes[i] ^= 1 << (d - 1);
  } else {
    if (S.values[i] === d) return;
    snapshot();
    const attempt = S.tries[i]++;
    S.values[i] = d;
    S.notes[i] = 0;
    if (d === S.solution[i]) {
      if (!S.awarded[i]) {
        S.awarded[i] = 1;
        const before = total();
        S.score += POINTS[attempt] || 0;
        if (total() > before) showGain(total() - before);
      }
      clearPeerNotes(i, d);
    } else S.mistakes++;
  }
  afterChange();
}

function erase() {
  if (!active() || S.sel < 0) return;
  const i = S.sel;
  if (locked(i) || (!S.values[i] && !S.notes[i])) return;
  snapshot();
  S.values[i] = 0;
  S.notes[i] = 0;
  afterChange();
}

function undo() {
  if (!active() || !S.history.length) return;
  const h = S.history.pop();
  S.values = h.v;
  S.notes = h.n;
  // Hints are spent for good: a hinted cell stays filled in, so undo can't waste the hint.
  for (let i = 0; i < 81; i++) {
    if (!S.hinted[i]) continue;
    S.values[i] = S.solution[i];
    S.notes[i] = 0;
    clearPeerNotes(i, S.solution[i]);
  }
  render();
  save();
}

function hint() {
  if (!active() || S.hints <= 0) return;
  let i = S.sel;
  if (i < 0 || locked(i)) {
    const open = [];
    for (let k = 0; k < 81; k++) if (!locked(k)) open.push(k);
    if (!open.length) return;
    i = open[(Math.random() * open.length) | 0];
  }
  S.hints--; // no undo step is saved: a hint can't be taken back
  S.values[i] = S.solution[i];
  S.notes[i] = 0;
  S.hinted[i] = 1;
  S.awarded[i] = 1; // hinted cells earn nothing
  S.sel = i;
  clearPeerNotes(i, S.values[i]);
  afterChange();
}

function giveUp() {
  if (S.status !== 'playing' || S.busy) return;
  for (let i = 0; i < 81; i++) {
    if (!locked(i)) S.revealed[i] = 1;
    S.values[i] = S.solution[i];
    S.notes[i] = 0;
  }
  S.status = 'gaveup';
  S.paused = false;
  render();
  save();
}

function toggleNotes() {
  if (S.busy) return;
  S.notesMode = !S.notesMode;
  render();
  save();
}

function pause(on) {
  if (S.busy || S.status !== 'playing') return;
  S.paused = on;
  render();
  save();
}

let genToken = 0;
// practice: the id of a technique. The puzzle is generated so that solving it needs that technique.
async function newGame(diff, practice) {
  closeAsk();
  S = fresh(diff);
  render();
  const token = ++genToken;
  const g = practice ? await generatePractice(practice, PRACTICE_BUDGET_MS[practice] || 8000) : await generate(diff, DIFFS[diff].budget);
  if (token !== genToken) return;
  S = Object.assign(fresh(g.diff || diff), {
    puzzle: g.puzzle, solution: g.solution, values: g.puzzle.slice(),
    clues: g.clues, hardest: g.rating.hardest, busy: false,
    practice: practice && g.hit ? practice : '',
    missed: practice && !g.hit ? practice : '',
  });
  // Count the game as started for the statistics (practice games from the lessons don't count, as with scores).
  if (!S.practice) { addStart(stats, S.diff); storeSet(SAVE_KEYS.stats, stats); }
  render();
  save();
}

/* ---------- Confirm bar ---------- */
let pending = null;
function ask(msg, yes, fn) {
  pending = fn;
  $('#confirmMsg').textContent = msg;
  $('#confirmYes').textContent = yes;
  confirmEl.hidden = false;
  confirmEl.scrollIntoView({ block: 'nearest' }); // on narrow windows the bar sits below the board
  $('#confirmYes').focus({ preventScroll: true });
}
function closeAsk() { pending = null; confirmEl.hidden = true; }

// A game stopped at three mistakes can still be carried on, so it counts as progress too.
const hasProgress = () => (S.status === 'playing' || S.status === 'failed') && (S.history.length > 0 || S.hints < 3);
function startNew(diff) {
  if (hasProgress()) ask(`Start a new ${DIFFS[diff].label} game? Your current progress will be lost.`, 'New game', () => newGame(diff));
  else newGame(diff);
}
