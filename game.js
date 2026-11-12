(() => {
'use strict';

/* ---------- Solver and generator (pure) ---------- */
/* Solver, rater and generator live in solver.js. */

/* ---------- State ---------- */
const $ = (s) => document.querySelector(s);
const KEY = 'pencilmark.game.v1';
const SCORES = 'pencilmark.scores.v1';
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
});
let S = fresh('medium');


const fmt = (s) => {
  const p = (n) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? h + ':' : '') + p(m) + ':' + p(s % 60);
};

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

/* ---------- DOM ---------- */
const boardEl = $('#board');
const cells = [];
for (let i = 0; i < 81; i++) {
  const el = document.createElement('div');
  el.dataset.i = i;
  el.setAttribute('role', 'gridcell');
  const v = document.createElement('span'); v.className = 'v';
  const n = document.createElement('span'); n.className = 'n';
  const ns = [];
  for (let d = 1; d <= 9; d++) { const s = document.createElement('i'); s.textContent = d; n.appendChild(s); ns.push(s); }
  el.append(v, n);
  boardEl.appendChild(el);
  const base = 'c' + (COL[i] % 3 === 2 && COL[i] < 8 ? ' br' : '') + (ROW[i] % 3 === 2 && ROW[i] < 8 ? ' bb' : '');
  cells.push({ el, v, ns, base, cls: '', vt: '', nk: '' });
}
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

const padEl = $('#pad');
const padBtns = [];
for (let d = 1; d <= 9; d++) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'num'; b.dataset.d = d;
  b.setAttribute('aria-label', 'Enter ' + d);
  b.innerHTML = `<b>${d}</b><small></small>`;
  padEl.appendChild(b);
  padBtns.push(b);
}

const veil = $('#veil'), veilTitle = $('#veilTitle'), veilText = $('#veilText'), veilActions = $('#veilActions');
const banner = $('#banner'), confirmEl = $('#confirm');
const pauseBtn = $('#pauseBtn');
const undoBtn = document.querySelector('[data-tool="undo"]');
const eraseBtn = document.querySelector('[data-tool="erase"]');
const notesBtn = $('#notesBtn'), hintBtn = $('#hintBtn');

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
  snapshot();
  S.hints--;
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
  const g = practice ? await generatePractice(practice, 8000) : await generate(diff, DIFFS[diff].budget);
  if (token !== genToken) return;
  S = Object.assign(fresh(g.diff || diff), {
    puzzle: g.puzzle, solution: g.solution, values: g.puzzle.slice(),
    clues: g.clues, hardest: g.rating.hardest, busy: false,
    practice: practice && g.hit ? practice : '',
  });
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
  $('#confirmYes').focus({ preventScroll: true });
}
function closeAsk() { pending = null; confirmEl.hidden = true; }

const hasProgress = () => S.status === 'playing' && S.history.length > 0;
function startNew(diff) {
  if (hasProgress()) ask(`Start a new ${DIFFS[diff].label} game? Your current progress will be lost.`, 'New game', () => newGame(diff));
  else newGame(diff);
}

/* ---------- Score and high scores ---------- */
let scores = [];
async function loadScores() {
  const raw = await storeGet(SCORES);
  scores = Array.isArray(raw) ? raw.filter((e) => e && DIFFS[e.diff] && Number.isFinite(e.score)) : [];
}

const total = () => Math.round(S.score * DIFFS[S.diff].mult);

function recordScore() {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    score: total(), diff: S.diff, seconds: S.seconds, mistakes: S.mistakes,
    hints: 3 - S.hints, date: new Date().toISOString(),
  };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score || a.seconds - b.seconds);
  scores = scores.slice(0, 50);
  storeSet(SCORES, scores);
  S.entryId = entry.id;
  return scores.findIndex((x) => x.id === entry.id) + 1;
}

let gainTimer = 0;
function showGain(n) {
  const el = $('#gain');
  el.textContent = '+' + n;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout(gainTimer);
  gainTimer = setTimeout(() => { el.textContent = ''; }, 1400);
}

const scoresModal = $('#scoresModal'), scoreList = $('#scoreList');
let scoreFilter = 'all', modalWasPlaying = false;

function renderScores() {
  document.querySelectorAll('#scoreFilter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === scoreFilter)));
  const rows = scores.filter((e) => scoreFilter === 'all' || e.diff === scoreFilter).slice(0, 10);
  scoreList.textContent = '';
  if (!rows.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No finished rounds here yet. Solve a puzzle without giving up and it will be listed.';
    scoreList.appendChild(li);
    return;
  }
  rows.forEach((e, k) => {
    const li = document.createElement('li');
    if (e.id === S.entryId) li.className = 'mine';
    const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = String(k + 1);
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = Math.round(e.score).toLocaleString();
    const mt = document.createElement('span'); mt.className = 'mt';
    const d = new Date(e.date);
    const when = isNaN(d) ? '' : ' · ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    mt.textContent = `${DIFFS[e.diff].label} ×${DIFFS[e.diff].mult} · ${fmt(e.seconds | 0)} · ${e.mistakes} ${e.mistakes === 1 ? 'mistake' : 'mistakes'} · ${e.hints} ${e.hints === 1 ? 'hint' : 'hints'}${when}`;
    li.append(rk, sc, mt);
    scoreList.appendChild(li);
  });
}
function openScores() {
  closeAsk();
  modalWasPlaying = active();
  if (modalWasPlaying) { S.paused = true; render(); }
  renderScores();
  scoresModal.hidden = false;
  $('#scoresClose').focus({ preventScroll: true });
}
function closeScores() {
  scoresModal.hidden = true;
  if (modalWasPlaying) { modalWasPlaying = false; pause(false); }
}

/* ---------- Render ---------- */
let veilKind = '';

function render() {
  const sel = S.sel, sv = sel >= 0 ? S.values[sel] : 0;
  boardEl.classList.toggle('hide', S.paused || S.busy);

  for (let i = 0; i < 81; i++) {
    const c = cells[i], v = S.values[i], given = S.puzzle[i] !== 0;
    let cls = c.base;
    if (given) cls += ' given';
    if (sel >= 0) {
      if (i === sel) cls += ' sel';
      else if (ROW[i] === ROW[sel] || COL[i] === COL[sel] || BOX[i] === BOX[sel]) cls += ' peer';
    }
    if (sv && v === sv && i !== sel) cls += ' same';
    if (v && !given && v !== S.solution[i]) cls += ' wrong';
    if (v && !given && S.hinted[i]) cls += ' hint';
    if (v && S.revealed[i]) cls += ' rev';
    if (c.cls !== cls) { c.el.className = cls; c.cls = cls; }

    const t = v ? String(v) : '';
    if (c.vt !== t) { c.v.textContent = t; c.vt = t; }

    const nb = v ? 0 : S.notes[i];
    const nk = nb + ':' + (nb ? sv : 0);
    if (c.nk !== nk) {
      for (let d = 1; d <= 9; d++) {
        const on = (nb >> (d - 1)) & 1;
        c.ns[d - 1].className = on ? (d === sv ? 'on hl' : 'on') : '';
      }
      c.nk = nk;
    }
    c.el.setAttribute('aria-selected', i === sel ? 'true' : 'false');
    c.el.setAttribute('aria-label', `Row ${ROW[i] + 1}, column ${COL[i] + 1}, ${v ? v : 'empty'}`);
  }

  // Header and status
  document.querySelectorAll('#seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.d === S.diff)));
  $('#mist').textContent = S.unlimited ? String(S.mistakes) : `${S.mistakes} / ${MAX_MISTAKES}`;
  $('#score').textContent = total().toLocaleString();
  $('#mult').textContent = '×' + DIFFS[S.diff].mult;
  $('#scoreStat').hidden = !!S.practice;
  const tag = $('#practiceTag');
  tag.hidden = !S.practice;
  if (S.practice) tag.innerHTML = `Practice: <b>${PRACTICE_NAMES[S.practice]}</b>. This puzzle needs it. <a href="learn.html#${S.practice}">Back to the lesson</a>`;
  $('#hardest').textContent = S.busy || !S.hardest ? '–' : S.hardest;
  renderTime();
  pauseBtn.innerHTML = icon(S.paused ? 'play' : 'pause');
  pauseBtn.setAttribute('aria-label', S.paused ? 'Resume (P)' : 'Pause (P)');
  pauseBtn.title = S.paused ? 'Resume (P)' : 'Pause (P)';
  pauseBtn.disabled = S.busy || S.status !== 'playing';

  // Tools
  const act = active();
  undoBtn.disabled = !act || !S.history.length;
  eraseBtn.disabled = !act || S.sel < 0 || locked(S.sel) || (!S.values[S.sel] && !S.notes[S.sel]);
  notesBtn.setAttribute('aria-pressed', String(S.notesMode));
  $('#notesBadge').textContent = S.notesMode ? 'On' : 'Off';
  notesBtn.disabled = S.busy;
  hintBtn.disabled = !act || S.hints <= 0;
  $('#hintBadge').textContent = String(S.hints);
  $('#giveBtn').disabled = S.status !== 'playing' || S.busy;

  // Number pad: remaining count per digit
  const placed = new Array(10).fill(0);
  for (let i = 0; i < 81; i++) if (S.values[i] && S.values[i] === S.solution[i]) placed[S.values[i]]++;
  padBtns.forEach((b, k) => {
    const left = 9 - placed[k + 1];
    b.querySelector('small').textContent = left > 0 ? left : '';
    b.disabled = !act || left <= 0;
    b.classList.toggle('done', left <= 0);
  });

  // Result banner
  if (S.status === 'won') {
    const place = S.rank > 0 && S.rank <= 10 ? ` That is #${S.rank} on your high scores.` : '';
    banner.innerHTML = S.practice
      ? `Practice solved in <b>${fmt(S.seconds)}</b> with ${S.mistakes} ${S.mistakes === 1 ? 'mistake' : 'mistakes'}. Practice rounds do not count toward your high scores.`
      : `Solved in <b>${fmt(S.seconds)}</b> with ${S.mistakes} ${S.mistakes === 1 ? 'mistake' : 'mistakes'}. Score: <b>${total().toLocaleString()}</b>.${place}`;
    banner.hidden = false;
  } else if (S.status === 'gaveup') {
    banner.textContent = 'Solution revealed. Cells you did not fill are shown in grey. This round is not added to your high scores.';
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }

  renderVeil();
}

function renderTime() { $('#time').textContent = fmt(S.seconds); }

function renderVeil() {
  const kind = S.busy ? 'busy' : S.paused ? 'pause' : S.status === 'failed' ? 'failed' : '';
  if (kind === veilKind) return;
  veilKind = kind;
  if (!kind) { veil.hidden = true; return; }
  veil.hidden = false;
  const btn = (act, label, primary) => `<button type="button" class="btn${primary ? ' primary' : ''}" data-act="${act}">${label}</button>`;
  if (kind === 'busy') {
    veilTitle.textContent = 'Setting up';
    veilText.textContent = `Finding a ${DIFFS[S.diff].label} puzzle. Harder levels can take a few seconds.`;
    veilActions.innerHTML = '';
  } else if (kind === 'pause') {
    veilTitle.textContent = 'Paused';
    veilText.textContent = 'The board is hidden and the clock is stopped.';
    veilActions.innerHTML = btn('resume', 'Resume', true);
  } else {
    veilTitle.textContent = 'Three mistakes';
    veilText.textContent = 'Keep playing without a limit, or start a new puzzle.';
    veilActions.innerHTML = btn('keep', 'Keep playing', true) + btn('new', 'New game', false);
  }
  const first = veilActions.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}

/* ---------- Events ---------- */
boardEl.addEventListener('click', (e) => {
  const c = e.target.closest('[data-i]');
  if (!c || S.busy) return;
  S.sel = +c.dataset.i;
  render();
});

$('#tools').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (!b || b.disabled) return;
  ({ undo, erase, notes: toggleNotes, hint })[b.dataset.tool]();
});
padEl.addEventListener('click', (e) => {
  const b = e.target.closest('.num');
  if (b && !b.disabled) input(+b.dataset.d, S.notesMode);
});
// Keep keyboard focus on the page when clicking tool buttons with a mouse.
document.querySelector('.panel').addEventListener('mousedown', (e) => {
  if (e.target.closest('.tool, .num')) e.preventDefault();
});

pauseBtn.addEventListener('click', () => pause(!S.paused));
$('#seg').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-d]');
  if (b) startNew(b.dataset.d);
});
$('#newBtn').addEventListener('click', () => startNew(S.diff));
$('#giveBtn').addEventListener('click', () => {
  if (S.status === 'playing' && !S.busy) ask('Reveal the solution? This ends the current game.', 'Give up', giveUp);
});
$('#confirmNo').addEventListener('click', closeAsk);
$('#confirmYes').addEventListener('click', () => { const fn = pending; closeAsk(); if (fn) fn(); });

$('#scoresBtn').addEventListener('click', openScores);
$('#scoresClose').addEventListener('click', closeScores);
scoresModal.addEventListener('click', (e) => { if (e.target === scoresModal) closeScores(); });
$('#scoreFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-f]');
  if (b) { scoreFilter = b.dataset.f; renderScores(); }
});

veilActions.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  if (b.dataset.act === 'resume') pause(false);
  else if (b.dataset.act === 'keep') { S.unlimited = true; S.status = 'playing'; render(); save(); }
  else if (b.dataset.act === 'new') newGame(S.diff);
});

function move(key) {
  if (S.busy) return;
  if (S.sel < 0) S.sel = 40;
  else {
    let r = ROW[S.sel], c = COL[S.sel];
    if (key === 'ArrowUp') r = Math.max(0, r - 1);
    if (key === 'ArrowDown') r = Math.min(8, r + 1);
    if (key === 'ArrowLeft') c = Math.max(0, c - 1);
    if (key === 'ArrowRight') c = Math.min(8, c + 1);
    S.sel = r * 9 + c;
  }
  render();
}

document.addEventListener('keydown', (e) => {
  if (!scoresModal.hidden) { if (e.key === 'Escape') closeScores(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    return;
  }
  const k = e.key;
  if (k === 'Escape') {
    if (!confirmEl.hidden) closeAsk();
    else if (S.paused) pause(false);
    else if (S.sel >= 0) { S.sel = -1; render(); }
    return;
  }
  if (S.busy) return;
  if (S.paused) { if (k === 'p' || k === 'P') pause(false); return; }
  if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); move(k); return; }
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
  if (m) {
    e.preventDefault();
    const d = +m[1];
    if (d === 0) erase();
    else input(d, S.notesMode !== e.shiftKey);
    return;
  }
  switch (k.toLowerCase()) {
    case 'backspace': case 'delete': case 'e': e.preventDefault(); erase(); break;
    case 'n': toggleNotes(); break;
    case 'h': hint(); break;
    case 'z': case 'u': undo(); break;
    case 'p': pause(true); break;
    default: break;
  }
});

// Stop the clock when the tab is hidden.
document.addEventListener('visibilitychange', () => { if (document.hidden && active()) pause(true); });

setInterval(() => {
  if (!active()) return;
  S.seconds++;
  renderTime();
  if (S.seconds % 5 === 0) save();
}, 1000);

/* ---------- Boot ---------- */
// Opened from a lesson: learn.html links here with #practice=<technique>.
(async () => {
  await loadScores();
  const wanted = (/^#practice=([a-z-]+)$/.exec(location.hash) || [])[1];
  if (wanted && TYPE_LEVEL[wanted]) {
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    newGame(Object.keys(DIFFS).find((k) => DIFFS[k].level === TYPE_LEVEL[wanted]), wanted);
  } else {
    const saved = await load();
    if (saved) { S = saved; render(); save(); }
    else newGame('medium');
  }
})();
})();
