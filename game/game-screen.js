/* Game part 3 of 4: builds the board and number pad, and redraws the screen from the game state. Needs game-rules.js. */
'use strict';

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
  if (S.practice) tag.innerHTML = `Practice: <b>${PRACTICE_NAMES[S.practice]}</b>. This puzzle needs it. <a href="../learn/learn.html#${S.practice}">Back to the lesson</a>`;
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
