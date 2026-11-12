/* Learn: Sudoku words. Each term has a short definition (used in tooltips), a longer one for
   "The basics" lesson, and what to light up on the board. Needs solver-basics.js and lesson-explain.js. */
'use strict';

// show(ex) returns what to highlight: pat = the main cells, unit = cells around them, hi = 'cell:digit' candidates.
// tooltip: true means the word gets a dotted underline with its definition in the other lessons.
const TERMS = [
  { id: 'cell', word: 'Cell', tip: 'One of the 81 small squares in the grid.',
    more: () => 'The grid has 81 cells. When the puzzle is solved, every cell holds one digit from 1 to 9.',
    show: () => ({ pat: [40] }) },
  { id: 'row', word: 'Row', tip: 'A line of 9 cells across. Rows are numbered 1 to 9 from the top.',
    more: () => 'Row 3 is highlighted. Every row must contain each digit from 1 to 9 exactly once.',
    show: () => ({ unit: UNITS[2] }) },
  { id: 'column', word: 'Column', tip: 'A line of 9 cells down. Columns are numbered 1 to 9 from the left.',
    more: () => 'Column 5 is highlighted. Every column must contain each digit from 1 to 9 exactly once.',
    show: () => ({ unit: UNITS[9 + 4] }) },
  { id: 'box', word: 'Box', tooltip: true, match: 'box(?:es)?',
    tip: 'One of the nine 3×3 blocks outlined in heavy lines. Boxes are numbered 1 to 9, left to right, top to bottom.',
    more: () => 'Box 5, the middle one, is highlighted. Every box must contain each digit from 1 to 9 exactly once.',
    show: () => ({ unit: UNITS[18 + 4] }) },
  { id: 'unit', word: 'Unit', tooltip: true, match: 'units?',
    tip: 'Any row, column or box. Each unit holds every digit from 1 to 9 exactly once.',
    more: () => 'Every cell sits in three units. For r5c5 they are row 5, column 5 and box 5, all highlighted.',
    show: () => ({ pat: [40], unit: [...UNITS[4], ...UNITS[13], ...UNITS[22]] }) },
  { id: 'clue', word: 'Clue', tooltip: true, match: 'clues?|givens?',
    tip: 'A digit printed in the puzzle from the start. Clues never change.',
    more: () => 'The highlighted digits are the clues this puzzle started with. The others were filled in while solving.',
    show: (ex) => ({ pat: ex.puzzle.map((v, i) => (v ? i : -1)).filter((i) => i >= 0) }) },
  { id: 'candidate', word: 'Candidate', tooltip: true, match: 'candidates?|pencil marks?',
    tip: 'A digit that could still go in an empty cell, written small. Also called a pencil mark or note.',
    more: (ex) => {
      const i = sampleCell(ex);
      return `${b(rc(i))} is empty. Its candidates, ${b(list(digs(ex.cand[i])))}, are the digits its row, column and box don't use yet. Solving means crossing candidates out until one is left.`;
    },
    show: (ex) => { const i = sampleCell(ex); return { pat: [i], hi: digs(ex.cand[i]).map((d) => i + ':' + d) }; } },
  { id: 'peer', word: 'Peer', tooltip: true, match: 'peers?',
    tip: 'A cell that shares a row, column or box with another cell. A cell\'s peers can\'t hold its digit.',
    more: () => 'r5c5 has 20 peers, highlighted. Whatever digit r5c5 holds, none of them can hold it too.',
    show: () => ({ pat: [40], unit: PEERS[40] }) },
  { id: 'name', word: 'Cell names', tip: 'Cells are named by row, then column.',
    more: () => '<b>r3c5</b> means row 3, column 5. Lessons use these names to point at cells.',
    show: () => ({ pat: [22], unit: [...UNITS[2], ...UNITS[13]] }) },
];

// An empty cell with several candidates, to show what candidates are.
function sampleCell(ex) {
  const i = ex.g.findIndex((v, k) => !v && POP[ex.cand[k]] >= 3);
  return i >= 0 ? i : ex.g.findIndex((v) => !v);
}

/* ---------- Tooltips ---------- */
// Wrap the first mention of each tooltip term in plain lesson text with a button that shows its definition.
// It opens on click or tap everywhere, and also on hover in browsers that support interestfor.
const TIP_TERMS = TERMS.filter((t) => t.tooltip);
const TIP_RE = new RegExp('\\b(?:' + TIP_TERMS.map((t) => '(' + t.match + ')').join('|') + ')\\b', 'gi');
function addTerms(text) {
  const used = new Set();
  return text.replace(TIP_RE, (word, ...groups) => {
    const t = TIP_TERMS[groups.slice(0, TIP_TERMS.length).findIndex((g) => g !== undefined)];
    if (used.has(t.id)) return word;
    used.add(t.id);
    return `<button type="button" class="term" popovertarget="tip-${t.id}" popovertargetaction="show" interestfor="tip-${t.id}" aria-expanded="false">${word}</button>`;
  });
}

// One definition popover per term, shared by every mention.
for (const t of TIP_TERMS) {
  const tip = document.createElement('div');
  tip.id = 'tip-' + t.id;
  tip.className = 'tip';
  tip.setAttribute('popover', 'hint');
  tip.setAttribute('role', 'tooltip');
  tip.textContent = t.tip;
  document.body.appendChild(tip);
}

// Older Chrome treats popover="hint" as "manual", which would never close after a click. Use "auto" there.
const probe = document.createElement('div');
probe.popover = 'hint';
const hintSupported = probe.popover === 'hint';
document.addEventListener('beforetoggle', (e) => {
  if (!hintSupported && e.newState === 'open' && e.target.classList.contains('tip')) e.target.popover = 'auto';
}, true);

// Keep aria-expanded in step with the popover, and place it above the word that opened it
// (where the browser can't anchor it itself).
let lastTerm = null;
for (const type of ['click', 'focusin', 'pointerover']) {
  document.addEventListener(type, (e) => { const t = e.target.closest && e.target.closest('.term'); if (t) lastTerm = t; });
}
document.addEventListener('toggle', (e) => {
  const tip = e.target;
  if (!tip.classList || !tip.classList.contains('tip')) return;
  const open = e.newState === 'open';
  document.querySelectorAll(`.term[popovertarget="${tip.id}"]`).forEach((t) => t.setAttribute('aria-expanded', String(open)));
  if (!open || CSS.supports('position-area: block-start') || !lastTerm || lastTerm.getAttribute('popovertarget') !== tip.id) return;
  const r = lastTerm.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  tip.style.top = (r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8) + 'px';
}, true);
