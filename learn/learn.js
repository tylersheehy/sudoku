/* Learn: the lesson page itself: board, buttons, replay, new examples, progress and start-up. Load this file last. */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const DATA = window.LESSON_DATA || {};
const KEY = SAVE_KEYS.lessons;
const isSingle = (t) => t === 'naked-single' || t === 'hidden-single';
const none = new Set();

/* ---------- State ---------- */
// stage (worked example): -1 plain board, 0 row/column/box lit, 1 pattern shown, 2 result shown.
let idx = 0, ex = null, MK = null, exNo = 1, exToken = 0, playTimers = [];
const st = { mode: 'example', stage: 1, hint: false, sel: new Set(), solved: false, pickCell: -1, term: 'cell', seen: new Set() };
const resetSt = () => { st.hint = false; st.sel = new Set(); st.solved = false; st.pickCell = -1; st.stage = 1; };

/* ---------- Progress ---------- */
let done = {};
function markDone() {
  const id = LESSONS[idx].id;
  if (!done[id]) { done[id] = true; storeSet(KEY, done); }
  buildPath();
}

/* ---------- Board ---------- */
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

// Draw the board. o: unit, pat, wing = Sets of cells; hi, removed = Sets of 'cell:digit'; placeCell; pick.
function paint(o) {
  for (let i = 0; i < 81; i++) {
    const c = cellEls[i];
    let cls = c.base;
    if (ex.puzzle && ex.puzzle[i]) cls += ' sol';
    if (o.unit.has(i)) cls += ' unit';
    if (o.pat.has(i)) cls += ' pat';
    if (o.wing.has(i)) cls += ' wing';
    if (i === o.placeCell) cls += ' place';
    if (o.pick && ex.g[i] === 0) cls += ' pick';
    if (st.pickCell === i) cls += ' chosen';
    if (c.el.className !== cls) c.el.className = cls;
    const solvedDigit = ex.g[i] || (i === o.placeCell ? ex.placed[0][1] : 0);
    c.big.textContent = solvedDigit ? String(solvedDigit) : '';
    c.cd.style.display = solvedDigit ? 'none' : '';
    if (solvedDigit) continue;
    for (let d = 1; d <= 9; d++) {
      const on = (ex.cand[i] >> (d - 1)) & 1;
      const key = i + ':' + d;
      let k = on ? 'on' : '';
      if (on && o.hi.has(key)) k += ' hi';
      if (on && o.removed.has(key)) k += ' go';
      if (on && st.sel.has(key)) k += ' sel';
      if (c.ds[d - 1].className !== k) c.ds[d - 1].className = k;
    }
  }
}

/* ---------- Lessons ---------- */
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

function setExample(d) {
  ex = d ? Object.assign({}, d) : null;
  if (!ex) return;
  ex.show = ex.type === 'forcing' ? [[ex.pat.cells[0], ex.pat.digit]] : ex.elims;
  ex.text = describe(ex);
  MK = marks(ex);
}

function setMeta() {
  const l = LESSONS[idx];
  $('#lmeta').textContent = l.id === 'basics'
    ? `Lesson ${idx + 1} of ${LESSONS.length}  ·  Start here`
    : `Lesson ${idx + 1} of ${LESSONS.length}  ·  First needed in ${diffLabel(TYPE_LEVEL[l.id])} puzzles` + (exNo > 1 ? `  ·  Example ${exNo}` : '');
}

function load(k, keepMode) {
  stopPlay();
  exToken++;
  idx = Math.max(0, Math.min(LESSONS.length - 1, k));
  const l = LESSONS[idx];
  const basics = l.id === 'basics';
  exNo = 1;
  setExample(DATA[basics ? 'naked-single' : l.id]); // the basics lesson borrows a board to point at
  resetSt();
  st.term = 'cell'; st.seen = new Set(['cell']);
  if (!keepMode || basics) st.mode = 'example';
  $('#ltitle').textContent = l.title;
  $('#lwhat').innerHTML = basics ? l.what : addTerms(l.what);
  $('#llook').innerHTML = basics ? l.look : addTerms(l.look);
  $('#modes').hidden = basics;
  $('#practice').hidden = basics;
  $('#practice').href = '../game/game.html#practice=' + l.id;
  const nb = $('#newEx');
  nb.hidden = basics; nb.disabled = false; nb.textContent = 'New example';
  $('#playBtn').textContent = '▶ Play';
  $('#prev').disabled = idx === 0;
  $('#next').disabled = idx === LESSONS.length - 1;
  try { history.replaceState(null, '', '#' + l.id); } catch (e) { /* ignore */ }
  setMeta();
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
  if (LESSONS[idx].id === 'basics') { renderBasics(); return; }
  const l = LESSONS[idx];
  const tryMode = st.mode === 'try';
  $('#terms').hidden = true;
  $('#legend').hidden = false;
  $('#tabExample').setAttribute('aria-selected', String(!tryMode));
  $('#tabTry').setAttribute('aria-selected', String(tryMode));
  $('#steps').hidden = tryMode;
  $('#tryBox').hidden = !tryMode;
  lb.classList.toggle('try-on', tryMode && !st.solved);
  document.querySelectorAll('#steps button[data-stage]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.stage === st.stage)));
  $('#legend').innerHTML = legendHtml();

  const explain = $('#explain');
  explain.className = 'explain';
  if (!ex) { explain.textContent = 'This example is missing from the build.'; return; }

  const shown = tryMode ? st.hint || st.solved : true;
  const showUnit = shown && (tryMode || st.stage >= 0);
  const showPat = shown && (tryMode || st.stage >= 1);
  const showRes = tryMode ? st.solved : st.stage >= 2;
  const single = isSingle(ex.type);
  paint({
    unit: showUnit ? MK.unit : none,
    pat: showPat ? MK.pat : none,
    wing: showPat ? MK.wing : none,
    hi: showPat ? MK.hi : none,
    removed: showRes && !single ? new Set(ex.show.map(([i, d]) => i + ':' + d)) : none,
    placeCell: showRes && single ? ex.placed[0][0] : -1,
    pick: tryMode && !st.solved && single,
  });

  if (!tryMode) {
    explain.innerHTML = st.stage < 0 ? 'Watch the board.' : st.stage < 2 ? ex.text.pattern : ex.text.pattern + '<br><br>' + ex.text.result;
  } else if (st.solved) {
    explain.classList.add('good');
    explain.innerHTML = '<b>Correct.</b> ' + ex.text.result;
  }
  $('#prompt').innerHTML = addTerms(ex.type === 'hidden-single'
    ? `In ${unitName(ex.pat.unit)}, the digit ${ex.pat.digit} fits in only one cell. Click that cell.`
    : PROMPTS[l.id]);
  $('#checkBtn').hidden = single;
  $('#clearBtn').hidden = single;
  $('#showBtn').textContent = st.hint ? 'Hide the pattern' : 'Show the pattern';
  $('#showBtn').disabled = st.solved;
}

// "The basics": a row of words; the chosen one is shown on the board and explained.
function renderBasics() {
  $('#steps').hidden = true;
  $('#tryBox').hidden = true;
  $('#legend').hidden = true;
  lb.classList.remove('try-on');
  const box = $('#terms');
  box.hidden = false;
  if (!box.childElementCount) {
    box.innerHTML = TERMS.map((t) => `<button type="button" data-term="${t.id}">${t.word}</button>`).join('');
  }
  box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.term === st.term)));
  const t = TERMS.find((x) => x.id === st.term);
  const s = t.show(ex);
  paint({ unit: new Set(s.unit || []), pat: new Set(s.pat || []), wing: none, hi: new Set(s.hi || []), removed: none, placeCell: -1, pick: false });
  const explain = $('#explain');
  explain.className = 'explain';
  explain.innerHTML = `<b>${t.word}.</b> ${t.tip} ${t.more(ex)}` +
    (st.seen.size < TERMS.length ? `<br><br><small>${st.seen.size} of ${TERMS.length} words seen.</small>` : '<br><br><small>All words seen. On to the first technique.</small>');
}

function say(msg, kind) {
  const e = $('#explain');
  e.className = 'explain' + (kind ? ' ' + kind : '');
  e.innerHTML = msg;
}

function finish() {
  st.solved = true;
  markDone();
  render();
}

/* ---------- Replay: step through the worked example ---------- */
function stopPlay() {
  playTimers.forEach(clearTimeout);
  playTimers = [];
}
function play() {
  if (!ex || st.mode !== 'example') return;
  stopPlay();
  $('#playBtn').textContent = '↺ Replay';
  const steps = [[-1, 0], [0, 700], [1, 1800], [2, 3400]]; // [stage, start time in ms]
  for (const [stage, at] of steps) playTimers.push(setTimeout(() => { st.stage = stage; render(); }, at));
}

/* ---------- Events ---------- */
lb.addEventListener('click', (e) => {
  if (st.mode !== 'try' || st.solved || !ex || LESSONS[idx].id === 'basics') return;
  const cell = e.target.closest('.lc');
  if (!cell) return;
  const i = +cell.dataset.i;
  if (isSingle(ex.type)) {
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
  if (e.target.closest('#playBtn')) { play(); return; }
  const x = e.target.closest('button[data-stage]');
  if (x) { stopPlay(); st.stage = +x.dataset.stage; render(); }
});
$('#modes').addEventListener('click', (e) => {
  const x = e.target.closest('button[data-mode]');
  if (!x || x.dataset.mode === st.mode) return;
  stopPlay();
  st.mode = x.dataset.mode;
  resetSt();
  render();
  if (st.mode === 'try') say('Look at the board and work out what this technique lets you do.');
});
$('#terms').addEventListener('click', (e) => {
  const x = e.target.closest('button[data-term]');
  if (!x) return;
  st.term = x.dataset.term;
  st.seen.add(st.term);
  if (st.seen.size === TERMS.length) markDone();
  render();
});

$('#newEx').addEventListener('click', async () => {
  const l = LESSONS[idx], btn = $('#newEx'), token = ++exToken;
  stopPlay();
  btn.disabled = true;
  btn.textContent = 'Finding an example…';
  say('Making a new puzzle that needs this technique. The harder techniques can take a few seconds.');
  const made = await makeExample(l.id, ex);
  if (token !== exToken) return; // the lesson changed while searching
  btn.disabled = false;
  btn.textContent = 'New example';
  if (!made) { say('No example turned up in time. Try again.', 'bad'); return; }
  exNo++;
  setExample(made);
  resetSt();
  setMeta();
  render();
  if (st.mode === 'try') say('A new board. Find the pattern again.');
});

$('#path').addEventListener('click', (e) => {
  const x = e.target.closest('button[data-k]');
  if (x) load(+x.dataset.k);
});
$('#prev').addEventListener('click', () => load(idx - 1));
$('#next').addEventListener('click', () => load(idx + 1));

/* ---------- Start-up ---------- */
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
