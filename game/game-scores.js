/* Game part 2 of 4: scoring and the high-scores window. Needs game-rules.js. */
'use strict';

/* ---------- Score and high scores ---------- */
let scores = [], stats = null;
async function loadScores() {
  scores = cleanScores(await storeGet(SCORES));
  stats = cleanStats(await storeGet(SAVE_KEYS.stats), scores);
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
  addWin(stats, entry); // stats count every win, not just the top 50
  storeSet(SAVE_KEYS.stats, stats);
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
    const mt = document.createElement('span'); mt.className = 'mt'; mt.textContent = scoreMeta(e);
    li.append(rk, sc, mt);
    scoreList.appendChild(li);
  });
}
// The window is a browser <dialog>, which handles Esc, keeping Tab inside, and returning focus.
function openScores() {
  if (scoresModal.open) return;
  closeAsk();
  modalWasPlaying = active();
  if (modalWasPlaying) { S.paused = true; render(); }
  renderScores();
  scoresModal.showModal();
}
function closeScores() { scoresModal.close(); }
scoresModal.addEventListener('close', () => {
  if (modalWasPlaying) { modalWasPlaying = false; pause(false); }
});
enableLightDismiss(scoresModal); // clicking outside the window closes it
