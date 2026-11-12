/* Game part 4 of 4: mouse and keyboard controls, the clock, and starting up. Load this file last. */
'use strict';

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
