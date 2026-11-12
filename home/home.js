/* Home page: start a new game or continue the saved one, open the lessons or statistics, and see your top scores.
   Needs save-data.js, puzzle-maker.js (level names), scores.js, dialogs.js and lesson-list.js. Load this file last. */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const menu = $('#newMenu');
let saved = null; // the game in progress, if any

$('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/* ---------- New game menu ---------- */
// One button per level. Choosing one opens the game page, which starts a fresh puzzle when it sees #new=<level>.
$('#menuLevels').innerHTML = Object.keys(DIFFS).map((k) =>
  `<button value="${k}">${DIFFS[k].label} <small>×${DIFFS[k].mult}</small></button>`).join('');

$('#newBtn').addEventListener('click', () => {
  $('#newMenuWarn').hidden = !saved;
  const current = saved ? saved.diff : 'medium';
  menu.querySelectorAll('.menu-levels button').forEach((b) => {
    b.autofocus = b.value === current;
    if (b.value === current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  menu.returnValue = '';
  menu.showModal();
});
menu.addEventListener('close', () => {
  const choice = menu.returnValue;
  menu.returnValue = '';
  if (DIFFS[choice]) location.href = '../game/game.html#new=' + choice;
});
enableLightDismiss(menu);

/* ---------- Continue ---------- */
function showContinue(g) {
  // A game stopped at three mistakes can still be carried on, so it is offered too.
  const ok = g && DIFFS[g.diff] && (g.status === 'playing' || g.status === 'failed') && Array.isArray(g.values) && g.values.length === 81;
  saved = ok ? g : null;
  $('#continue').hidden = !ok;
  if (!ok) return;
  const lesson = g.practice && LESSONS.find((l) => l.id === g.practice);
  $('#continueInfo').textContent = `· ${lesson ? 'Practice: ' + lesson.title : DIFFS[g.diff].label} · ${fmt(g.seconds | 0)}`;
}

/* ---------- Lessons ---------- */
function showLessons(done) {
  const n = LESSONS.filter((l) => done[l.id]).length;
  $('#lessonInfo').textContent = n === 0
    ? `${LESSONS.length} lessons, from the basics to forcing chains.`
    : `${n} of ${LESSONS.length} done. ${n === LESSONS.length ? 'All finished.' : 'Next: ' + LESSONS.find((l) => !done[l.id]).title + '.'}`;
  $('#lessonBar').style.width = Math.round((n / LESSONS.length) * 100) + '%';
}

/* ---------- Statistics card: a one-line teaser; the full numbers are on the Statistics page ---------- */
function showStatsTeaser(stats) {
  const t = summarize(stats, Object.keys(DIFFS));
  $('#statsInfo').textContent = t.started
    ? `${t.solved.toLocaleString()} won of ${t.started.toLocaleString()} started · ${Math.round(t.winRate * 100)}% win rate`
    : 'Games, wins and times for every difficulty.';
}

/* ---------- Top 5 scores ---------- */
function showScores(scores) {
  const top = scores.slice().sort((a, b) => b.score - a.score || a.seconds - b.seconds).slice(0, 5);
  const list = $('#scoreList');
  list.textContent = '';
  if (!top.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No solved puzzles yet. Finish a game without giving up and it will be listed here.';
    list.appendChild(li);
    return;
  }
  top.forEach((e, k) => {
    const li = document.createElement('li');
    const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = String(k + 1);
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = Math.round(e.score).toLocaleString() + ' points';
    const mt = document.createElement('span'); mt.className = 'mt'; mt.textContent = `${DIFFS[e.diff].label} · solved in ${fmt(e.seconds | 0)}`;
    li.append(rk, sc, mt);
    list.appendChild(li);
  });
}

/* ---------- Start-up ---------- */
async function refresh() {
  const [game, rawScores, rawStats, done] = await Promise.all(
    [SAVE_KEYS.game, SAVE_KEYS.scores, SAVE_KEYS.stats, SAVE_KEYS.lessons].map(storeGet));
  const scores = cleanScores(rawScores);
  showContinue(game);
  showLessons(done && typeof done === 'object' ? done : {});
  showStatsTeaser(cleanStats(rawStats, scores));
  showScores(scores);
}
refresh();
// Coming back to this tab after playing: show the latest scores and saved game.
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
