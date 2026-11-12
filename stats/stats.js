/* Statistics page: a summary of every difficulty, and the details for each one.
   Needs save-data.js, puzzle-maker.js (level names) and scores.js. Load this file last. */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const LEVELS = Object.keys(DIFFS);
let stats = { levels: {} };
let view = LEVELS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'all';

const pct = (r) => Math.round(r * 100) + '%';
const num = (n) => n.toLocaleString();
const time = (s) => (s ? fmt(s) : '–');
const score = (n) => (n ? num(Math.round(n)) : '–');

// Level picker: All, then each difficulty.
$('#levelPick').innerHTML = ['all', ...LEVELS].map((k) =>
  `<button type="button" data-v="${k}">${k === 'all' ? 'All levels' : DIFFS[k].label}</button>`).join('');

function tile(label, value, extra) {
  return `<div class="tile"><span class="tile-label">${label}</span><span class="tile-value">${value}</span>${extra || ''}</div>`;
}

function render() {
  document.querySelectorAll('#levelPick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === view)));
  const t = summarize(stats, view === 'all' ? LEVELS : [view]);
  $('#viewTitle').textContent = view === 'all' ? 'All levels' : DIFFS[view].label;
  const meter = `<span class="meter" aria-hidden="true"><span style="width:${pct(t.winRate)}"></span></span>`;
  $('#tiles').innerHTML = [
    tile('Games started', num(t.started)),
    tile('Games won', num(t.solved)),
    tile('Win rate', t.started ? pct(t.winRate) : '–', t.started ? meter : ''),
    tile('Won with no mistakes', num(t.perfect)),
    tile('Best score', score(t.best)),
    tile('Fastest time', time(t.fastest)),
    tile('Average time', time(t.average)),
  ].join('');
  $('#note').hidden = !t.missingStarts;

  // The summary table appears on "All levels"; each level name opens that level.
  $('#summary').hidden = view !== 'all';
  $('#levelRows').innerHTML = LEVELS.map((k) => {
    const l = summarize(stats, [k]);
    return `<tr><th scope="row"><button type="button" class="row-link" data-v="${k}">${DIFFS[k].label}</button></th>` +
      `<td>${num(l.started)}</td><td>${num(l.solved)}</td><td>${l.started ? pct(l.winRate) : '–'}</td><td>${num(l.perfect)}</td>` +
      `<td>${score(l.best)}</td><td>${time(l.fastest)}</td><td>${time(l.average)}</td></tr>`;
  }).join('');
}

function show(v) {
  view = v;
  try { history.replaceState(null, '', v === 'all' ? location.pathname : '#' + v); } catch (e) { /* ignore */ }
  render();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (b) show(b.dataset.v);
});

async function refresh() {
  const [rawScores, rawStats] = await Promise.all([storeGet(SAVE_KEYS.scores), storeGet(SAVE_KEYS.stats)]);
  stats = cleanStats(rawStats, cleanScores(rawScores));
  render();
}
refresh();
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
