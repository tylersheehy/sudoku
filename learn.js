(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const DATA = window.LESSON_DATA || {};
const KEY = 'sudoku.learn.v1';

/* ---------- Lessons, in the order to learn them ---------- */
const LESSONS = [
  { id: 'naked-single', group: 'Singles', title: 'Naked single',
    what: 'A cell where every digit but one is already ruled out by its row, column and box. The one left has to go there.',
    look: 'Pick an empty cell and list the digits its row, column and box already contain. If only one digit is missing, that is the answer.' },
  { id: 'hidden-single', group: 'Singles', title: 'Hidden single',
    what: 'A digit that has only one possible cell inside a row, column or box. The cell may still show other candidates, but this digit has nowhere else to go.',
    look: 'Take one digit and one box. Cross out every cell that sees that digit elsewhere. If one cell is left, the digit goes there. Repeat for rows and columns.' },
  { id: 'pointing', group: 'Locked candidates and pairs', title: 'Pointing pair or triple',
    what: 'When a digit can only go in one row (or column) inside a box, that row must take its digit from this box. Every other cell in the row loses that candidate.',
    look: 'Look at the pencil marks for one digit inside a box. If they all line up in a single row or column, the pattern points along that line.' },
  { id: 'claiming', group: 'Locked candidates and pairs', title: 'Claiming pair or triple',
    what: 'The reverse of pointing. When a digit in a row (or column) can only go inside one box, that box claims it. The rest of the box loses that candidate.',
    look: 'Look at one digit along a row. If all its candidates fall inside the same box, check the rest of that box.' },
  { id: 'naked-pair', group: 'Locked candidates and pairs', title: 'Naked pair',
    what: 'Two cells in the same row, column or box that hold exactly the same two candidates. Those two digits must fill those two cells, so no other cell in the unit can use them.',
    look: 'Scan a unit for two cells that each show the same two digits and nothing else.' },
  { id: 'hidden-pair', group: 'Locked candidates and pairs', title: 'Hidden pair',
    what: 'Two digits that appear in only the same two cells of a unit. Those cells must hold those digits, so every other candidate in them can go.',
    look: 'Pick two digits and see whether they share exactly two cells in a unit, even if those cells show other candidates too.' },
  { id: 'naked-triple', group: 'Triples and X-Wing', title: 'Naked triple',
    what: 'Three cells in a unit whose candidates together are only three digits. Not every cell needs all three. Those digits belong to those cells, so the rest of the unit loses them.',
    look: 'Find three cells in a unit that use no more than three different digits between them.' },
  { id: 'hidden-triple', group: 'Triples and X-Wing', title: 'Hidden triple',
    what: 'Three digits that fit only in the same three cells of a unit. Those cells are used up by those digits, so all their other candidates can go.',
    look: 'Pick three digits and check whether they are confined to the same three cells of one unit.' },
  { id: 'x-wing', group: 'Triples and X-Wing', title: 'X-Wing',
    what: 'A digit appears exactly twice in each of two rows, and those four cells sit in the same two columns. The digit must take opposite corners, so it cannot appear anywhere else in those two columns. It works the same with rows and columns swapped.',
    look: 'Choose one digit and look for rectangles where the digit has just two candidates along both of two parallel lines.' },
  { id: 'xy-wing', group: 'Wings and fish', title: 'XY-Wing',
    what: 'Three cells with two candidates each. The pivot holds A and B, one wing holds A and C, the other holds B and C. Whichever digit the pivot takes, one of the wings becomes C. Any cell that sees both wings cannot be C.',
    look: 'Start from a cell with two candidates, then look at the two-candidate cells it sees for a pair that completes the chain.' },
  { id: 'swordfish', group: 'Wings and fish', title: 'Swordfish',
    what: 'The three-line version of X-Wing. A digit is confined to the same three columns across three rows, with two or three candidates in each row. The digit is used up in those columns, so it can go from the rest of them.',
    look: 'Check a digit with only two or three candidates in each of three rows, all falling in the same three columns.' },
  { id: 'forcing', group: 'Trial and error', title: 'Forcing chain',
    what: 'Assume one candidate is true and follow only the placements that are forced. If that leads to a cell with no digit left, the assumption is false and the candidate comes out. It is guessing with a safety net, because a failed guess is a real deduction.',
    look: 'Start from cells with two candidates. Try one, follow the singles, and look for a clash in a row, column or box.' },
];

/* ---------- Helpers ---------- */
const rc = (i) => 'r' + (ROW[i] + 1) + 'c' + (COL[i] + 1);
const unitName = (u) => (u < 9 ? 'row ' + (u + 1) : u < 18 ? 'column ' + (u - 8) : 'box ' + (u - 17));
const digs = (mask) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => (mask >> (d - 1)) & 1);
const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const b = (s) => '<b>' + s + '</b>';
const diffLabel = (lv) => Object.values(DIFFS).find((d) => d.level === lv).label;

function elimsText(ex) {
  const by = {};
  for (const [i, d] of ex.show) (by[d] = by[d] || []).push(rc(i));
  return list(Object.keys(by).map((d) => b(d) + ' from ' + b(list(by[d]))))
    .replace(/^/, 'remove ');
}

/* What each technique looks like on the board, and how to say it */
function describe(ex) {
  const p = ex.pat, t = ex.type;
  if (t === 'naked-single') {
    const c = p.cells[0];
    return {
      pattern: `${b(rc(c))} has only one candidate left: ${b(p.digit)}. Every other digit already appears in its row, column or box.`,
      result: `Place ${b(p.digit)} in ${b(rc(c))}.`,
    };
  }
  if (t === 'hidden-single') {
    const c = p.cells[0];
    return {
      pattern: `In ${b(unitName(p.unit))}, the digit ${b(p.digit)} fits in only one cell: ${b(rc(c))}. Its other candidates do not matter.`,
      result: `Place ${b(p.digit)} in ${b(rc(c))}.`,
    };
  }
  if (t === 'pointing') {
    const line = p.cells.every((i) => ROW[i] === ROW[p.cells[0]]) ? 'row ' + (ROW[p.cells[0]] + 1) : 'column ' + (COL[p.cells[0]] + 1);
    return {
      pattern: `In ${b(unitName(p.unit))}, every candidate for ${b(p.digit)} is in ${b(line)}: ${list(p.cells.map(rc))}.`,
      result: `The ${p.digit} of that box has to be in ${line}, so no other cell of ${line} can be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'claiming') {
    return {
      pattern: `In ${b(unitName(p.unit))}, every candidate for ${b(p.digit)} is inside ${b('box ' + (p.box + 1))}: ${list(p.cells.map(rc))}.`,
      result: `The ${p.digit} of ${unitName(p.unit)} has to be in that box, so the rest of the box cannot be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'naked-pair' || t === 'naked-triple') {
    return {
      pattern: `${b(list(p.cells.map(rc)))} use only ${b(list(digs(p.mask)))} between them, all within ${b(unitName(p.unit))}.`,
      result: `Those digits must fill those cells, so the rest of ${unitName(p.unit)} cannot use them. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'hidden-pair' || t === 'hidden-triple') {
    return {
      pattern: `In ${b(unitName(p.unit))}, the digits ${b(list(digs(p.mask)))} fit only in ${b(list(p.cells.map(rc)))}.`,
      result: `Those cells have to hold those digits, so they cannot hold anything else. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'x-wing' || t === 'swordfish') {
    const lineKind = p.byRow ? 'row' : 'column', crossKind = p.byRow ? 'column' : 'row';
    const lines = p.lines.map((a) => lineKind + ' ' + (a + 1));
    const cross = digs(p.mask).map((n) => crossKind + ' ' + n);
    return {
      pattern: `In ${b(list(lines))}, the digit ${b(p.digit)} appears only in ${b(list(cross))}.`,
      result: `The ${p.digit} in each of those ${lineKind}s must use up one of those ${crossKind}s, so no other cell in them can be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'xy-wing') {
    const [w1, w2] = p.wings, pc = digs(ex.cand[p.pivot]);
    const wc = (w) => list(digs(ex.cand[w]).map((d) => String(d)));
    return {
      pattern: `Pivot ${b(rc(p.pivot))} holds ${b(pc.join(' and '))}. Wing ${b(rc(w1))} holds ${b(wc(w1))} and wing ${b(rc(w2))} holds ${b(wc(w2))}. Both wings see the pivot and share the digit ${b(p.digit)}.`,
      result: `If the pivot is ${pc[0]}, one wing is forced to ${p.digit}. If it is ${pc[1]}, the other wing is. Either way ${p.digit} lands in a wing, so a cell that sees both wings cannot be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  // forcing
  const c = p.cells[0];
  const chain = (p.trace || []).filter((x) => x.digit && !x.none && x.cell !== c).slice(0, 6);
  const end = (p.trace || []).find((x) => x.none);
  const clash = !end ? '' : end.cell !== undefined
    ? ` At that point ${b(rc(end.cell))} has no digit left.`
    : ` At that point ${b(unitName(end.unit))} has no place left for ${b(end.digit)}.`;
  return {
    pattern: `Suppose ${b(rc(c))} is ${b(p.digit)}. The forced placements follow: ${chain.map((x) => b(rc(x.cell) + ' = ' + x.digit)).join(', ')}.${clash}`,
    result: `The assumption breaks, so ${b(rc(c))} cannot be ${b(p.digit)}. Remove that candidate.`,
  };
}

const PROMPTS = {
  'naked-single': 'Find a cell that has only one candidate left and click it.',
  'hidden-single': null, // built from the example
  'pointing': 'Find a box where one digit is confined to a single row or column. Click every candidate that removes.',
  'claiming': 'Find a row or column where one digit is confined to a single box. Click every candidate that removes.',
  'naked-pair': 'Find two cells in a unit with the same two candidates. Click every candidate that removes.',
  'hidden-pair': 'Find two digits that fit in only the same two cells of a unit. Click the other candidates in those cells.',
  'naked-triple': 'Find three cells in a unit that use only three digits between them. Click every candidate that removes.',
  'hidden-triple': 'Find three digits that fit in only the same three cells of a unit. Click the other candidates in those cells.',
  'x-wing': 'Find a digit with two candidates in each of two rows (or columns) that line up. Click every candidate the X-Wing removes.',
  'xy-wing': 'Find a pivot with two candidates and two wings that complete the chain. Click the candidate the wings remove.',
  'swordfish': 'Find a digit confined to the same three columns (or rows) across three rows (or columns). Click every candidate it removes.',
  'forcing': 'Click any candidate that cannot be true. If you are stuck, show the pattern to see the chain.',
};

/* Which cells, units and digits to light up for each technique */
function marks(ex) {
  const p = ex.pat, t = ex.type;
  const m = { unit: new Set(), pat: new Set(), wing: new Set(), hi: new Set() };
  const hi = (i, d) => m.hi.add(i + ':' + d);
  const unit = (u) => UNITS[u].forEach((i) => m.unit.add(i));
  if (t === 'naked-single') { p.cells.forEach((i) => { m.pat.add(i); hi(i, p.digit); }); }
  else if (t === 'hidden-single') { unit(p.unit); m.pat.add(p.cells[0]); UNITS[p.unit].forEach((i) => hi(i, p.digit)); }
  else if (t === 'pointing' || t === 'claiming') { unit(p.unit); p.cells.forEach((i) => { m.pat.add(i); hi(i, p.digit); }); }
  else if (t.startsWith('naked') || t.startsWith('hidden')) {
    unit(p.unit);
    p.cells.forEach((i) => { m.pat.add(i); digs(p.mask).forEach((d) => hi(i, d)); });
  } else if (t === 'x-wing' || t === 'swordfish') {
    p.lines.forEach((a) => unit(p.byRow ? a : 9 + a));
    p.cells.forEach((i) => { m.pat.add(i); hi(i, p.digit); });
  } else if (t === 'xy-wing') {
    m.pat.add(p.pivot);
    digs(ex.cand[p.pivot]).forEach((d) => hi(p.pivot, d));
    p.wings.forEach((w) => { m.wing.add(w); digs(ex.cand[w]).forEach((d) => hi(w, d)); });
  } else {
    m.pat.add(p.cells[0]); hi(p.cells[0], p.digit);
    (p.trace || []).forEach((x) => { if (x.digit && x.cell !== undefined && x.cell !== p.cells[0]) { m.wing.add(x.cell); hi(x.cell, x.digit); } });
  }
  return m;
}

/* ---------- Progress ---------- */
let done = {};
try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { done = {}; }
const saveDone = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* storage unavailable */ } };

/* ---------- State ---------- */
let idx = 0, ex = null, MK = null;
const st = { mode: 'example', stage: 1, hint: false, sel: new Set(), solved: false, pickCell: -1 };

const lb = $('#lb');
const cellEls = [];
for (let i = 0; i < 81; i++) {
  const el = document.createElement('div');
  el.className = 'lc' + (COL[i] % 3 === 2 && COL[i] < 8 ? ' br' : '') + (ROW[i] % 3 === 2 && ROW[i] < 8 ? ' bb' : '');
  el.dataset.i = i;
  const big = document.createElement('span'); big.className = 'big';
  const cd = document.createElement('span'); cd.className = 'cd';
  const ds = [];
  for (let d = 1; d <= 9; d++) { const s = document.createElement('i'); s.textContent = d; s.dataset.d = d; cd.appendChild(s); ds.push(s); }
  el.append(big, cd);
  lb.appendChild(el);
  cellEls.push({ el, big, cd, ds, base: el.className });
}

function buildPath() {
  const nav = $('#path');
  nav.textContent = '';
  let group = '';
  LESSONS.forEach((l, k) => {
    if (l.group !== group) {
      group = l.group;
      const h = document.createElement('h3'); h.textContent = group; nav.appendChild(h);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.k = k;
    btn.setAttribute('aria-current', String(k === idx));
    btn.innerHTML = `<span class="no">${k + 1}</span><span>${l.title}</span><span class="ok">${done[l.id] ? 'Done' : ''}</span>`;
    nav.appendChild(btn);
  });
  const n = LESSONS.filter((l) => done[l.id]).length;
  $('#progress').textContent = `${n} of ${LESSONS.length} lessons done`;
}

function load(k, keepMode) {
  idx = Math.max(0, Math.min(LESSONS.length - 1, k));
  const l = LESSONS[idx];
  const d = DATA[l.id];
  ex = d ? Object.assign({}, d) : null;
  if (ex) {
    ex.show = ex.type === 'forcing' ? [[ex.pat.cells[0], ex.pat.digit]] : ex.elims;
    ex.text = describe(ex);
    MK = marks(ex);
  }
  st.hint = false; st.sel = new Set(); st.solved = false; st.pickCell = -1; st.stage = 1;
  if (!keepMode) st.mode = 'example';
  $('#lmeta').textContent = `Lesson ${idx + 1} of ${LESSONS.length}  ·  First needed in ${diffLabel(TYPE_LEVEL[l.id])} puzzles`;
  $('#ltitle').textContent = l.title;
  $('#lwhat').textContent = l.what;
  $('#llook').textContent = l.look;
  $('#practice').href = 'game.html#practice=' + l.id;
  $('#prev').disabled = idx === 0;
  $('#next').disabled = idx === LESSONS.length - 1;
  try { history.replaceState(null, '', '#' + l.id); } catch (e) { /* ignore */ }
  buildPath();
  render();
}

/* ---------- Render ---------- */
function legendHtml() {
  const items = [['var(--pat)', 'Pattern'], ['var(--peer)', 'Row, column or box']];
  if (ex && (ex.type === 'xy-wing' || ex.type === 'forcing')) items.push(['var(--wing)', ex.type === 'xy-wing' ? 'Wings' : 'Forced cells']);
  items.push(['var(--bad-bg)', 'Can be removed'], ['var(--place)', 'Place here']);
  return items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('');
}

function render() {
  const l = LESSONS[idx];
  const tryMode = st.mode === 'try';
  $('#tabExample').setAttribute('aria-selected', String(!tryMode));
  $('#tabTry').setAttribute('aria-selected', String(tryMode));
  $('#steps').hidden = tryMode;
  $('#tryBox').hidden = !tryMode;
  lb.classList.toggle('try-on', tryMode && !st.solved);
  document.querySelectorAll('#steps button').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.stage === st.stage)));
  $('#legend').innerHTML = legendHtml();

  const explain = $('#explain');
  explain.className = 'explain';
  if (!ex) { explain.textContent = 'This example is missing from the build.'; return; }

  const showPat = tryMode ? (st.hint || st.solved) : st.stage >= 1;
  const showRes = tryMode ? st.solved : st.stage >= 2;
  const single = ex.type === 'naked-single' || ex.type === 'hidden-single';
  const removed = new Set(showRes && !single ? ex.show.map(([i, d]) => i + ':' + d) : []);
  const placeCell = showRes && single ? ex.placed[0][0] : -1;

  for (let i = 0; i < 81; i++) {
    const c = cellEls[i];
    let cls = c.base;
    if (showPat && MK.unit.has(i)) cls += ' unit';
    if (showPat && MK.pat.has(i)) cls += ' pat';
    if (showPat && MK.wing.has(i)) cls += ' wing';
    if (i === placeCell) cls += ' place';
    if (tryMode && !st.solved && single && ex.g[i] === 0) cls += ' pick';
    if (st.pickCell === i) cls += ' chosen';
    c.el.className = cls;
    const solvedDigit = ex.g[i] || (i === placeCell ? ex.placed[0][1] : 0);
    c.big.textContent = solvedDigit ? String(solvedDigit) : '';
    c.cd.style.display = solvedDigit ? 'none' : '';
    if (!solvedDigit) {
      for (let d = 1; d <= 9; d++) {
        const on = (ex.cand[i] >> (d - 1)) & 1;
        const key = i + ':' + d;
        let k = on ? 'on' : '';
        if (on && showPat && MK.hi.has(key)) k += ' hi';
        if (on && removed.has(key)) k += ' go';
        if (on && st.sel.has(key)) k += ' sel';
        c.ds[d - 1].className = k;
      }
    }
  }

  if (!tryMode) {
    explain.innerHTML = st.stage === 1 ? ex.text.pattern : ex.text.pattern + '<br><br>' + ex.text.result;
  } else if (st.solved) {
    explain.classList.add('good');
    explain.innerHTML = '<b>Correct.</b> ' + ex.text.result;
  }
  $('#prompt').textContent = ex.type === 'hidden-single'
    ? `In ${unitName(ex.pat.unit)}, the digit ${ex.pat.digit} fits in only one cell. Click that cell.`
    : PROMPTS[l.id];
  const isPlace = single;
  $('#checkBtn').hidden = isPlace;
  $('#clearBtn').hidden = isPlace;
  $('#showBtn').textContent = st.hint ? 'Hide the pattern' : 'Show the pattern';
  $('#showBtn').disabled = st.solved;
}

function say(msg, kind) {
  const e = $('#explain');
  e.className = 'explain' + (kind ? ' ' + kind : '');
  e.innerHTML = msg;
}

function finish() {
  st.solved = true;
  if (!done[LESSONS[idx].id]) { done[LESSONS[idx].id] = true; saveDone(); }
  buildPath();
  render();
}

/* ---------- Events ---------- */
lb.addEventListener('click', (e) => {
  if (st.mode !== 'try' || st.solved || !ex) return;
  const cell = e.target.closest('.lc');
  if (!cell) return;
  const i = +cell.dataset.i;
  const single = ex.type === 'naked-single' || ex.type === 'hidden-single';
  if (single) {
    if (ex.g[i]) return;
    const ok = ex.type === 'hidden-single' ? i === ex.pat.cells[0] : POP[ex.cand[i]] === 1;
    st.pickCell = i;
    if (ok) {
      if (ex.type === 'naked-single' && i !== ex.pat.cells[0]) {
        const dg = 32 - Math.clz32(ex.cand[i]);
        ex = Object.assign({}, ex, { placed: [[i, dg]], text: Object.assign({}, ex.text, { result: `Place ${b(dg)} in ${b(rc(i))}.` }) });
      }
      finish();
    } else {
      render();
      say(ex.type === 'hidden-single'
        ? `${b(rc(i))} is not the only place for ${ex.pat.digit} in ${unitName(ex.pat.unit)}. Look at which cells in that ${unitName(ex.pat.unit).split(' ')[0]} can still take it.`
        : `${b(rc(i))} still has ${POP[ex.cand[i]]} candidates. You need a cell with exactly one.`, 'bad');
    }
    return;
  }
  const t = e.target.closest('i');
  if (!t || !t.classList.contains('on')) return;
  const key = i + ':' + t.dataset.d;
  if (st.sel.has(key)) st.sel.delete(key); else st.sel.add(key);
  render();
});

$('#checkBtn').addEventListener('click', () => {
  if (!ex || st.solved) return;
  const valid = new Set(ex.elims.map(([i, d]) => i + ':' + d));
  const picked = [...st.sel];
  if (!picked.length) { say('Click at least one candidate first.', 'bad'); return; }
  const wrong = picked.filter((k) => !valid.has(k));
  if (wrong.length) {
    const [i, d] = wrong[0].split(':');
    wrong.forEach((k) => st.sel.delete(k));
    render();
    say(`${b(d)} in ${b(rc(+i))} is not ruled out by this pattern, so it stays. Use "Show the pattern" if you want a nudge.`, 'bad');
    return;
  }
  const needed = ex.type === 'forcing' ? 1 : valid.size;
  if (picked.length < needed) { say(`Right so far. There ${needed - picked.length === 1 ? 'is 1 more' : 'are ' + (needed - picked.length) + ' more'} to remove.`); return; }
  finish();
});
$('#clearBtn').addEventListener('click', () => { st.sel = new Set(); render(); });
$('#showBtn').addEventListener('click', () => {
  st.hint = !st.hint;
  render();
  if (st.hint && ex) say(ex.text.pattern);
});

$('#steps').addEventListener('click', (e) => {
  const x = e.target.closest('button[data-stage]');
  if (x) { st.stage = +x.dataset.stage; render(); }
});
document.querySelector('.modes').addEventListener('click', (e) => {
  const x = e.target.closest('button[data-mode]');
  if (!x || x.dataset.mode === st.mode) return;
  st.mode = x.dataset.mode;
  st.hint = false; st.sel = new Set(); st.solved = false; st.pickCell = -1; st.stage = 1;
  render();
  if (st.mode === 'try') say('Look at the board and work out what this technique lets you do.');
});
$('#path').addEventListener('click', (e) => {
  const x = e.target.closest('button[data-k]');
  if (x) load(+x.dataset.k);
});
$('#prev').addEventListener('click', () => load(idx - 1));
$('#next').addEventListener('click', () => load(idx + 1));

function fromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const k = LESSONS.findIndex((l) => l.id === id);
  load(k >= 0 ? k : Math.max(0, LESSONS.findIndex((l) => !done[l.id])));
}
window.addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (LESSONS[idx].id !== id) fromHash();
});
fromHash();
})();
