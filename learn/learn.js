/* Learn part 3 of 3: the lesson page itself: board, buttons, progress and start-up. Load this file last. */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const DATA = window.LESSON_DATA || {};
const KEY = 'sudoku.learn.v1';

/* ---------- Progress ---------- */
let done = {};
const saveDone = () => storeSet(KEY, done);

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
  $('#practice').href = '../game/game.html#practice=' + l.id;
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
(async () => {
  const stored = await storeGet(KEY);
  done = stored && typeof stored === 'object' ? stored : {};
  fromHash();
})();
})();
