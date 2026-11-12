/* Shared: time formatting, the text of a high-score line, and per-level stats.
   Used by the game and the home page. Needs puzzle-maker.js (for the level names) and save-data.js. */
'use strict';

// 75 -> "01:15", 3725 -> "1:02:05"
const fmt = (s) => {
  const p = (n) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? h + ':' : '') + p(m) + ':' + p(s % 60);
};

// Keep only well-formed score entries.
const cleanScores = (raw) => (Array.isArray(raw) ? raw.filter((e) => e && DIFFS[e.diff] && Number.isFinite(e.score)) : []);

// "Hard ×2 · 08:41 · 1 mistake · 0 hints · Nov 11"
function scoreMeta(e) {
  const d = new Date(e.date);
  const when = isNaN(d) ? '' : ' · ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const n = (k, word) => `${k} ${k === 1 ? word : word + 's'}`;
  return `${DIFFS[e.diff].label} ×${DIFFS[e.diff].mult} · ${fmt(e.seconds | 0)} · ${n(e.mistakes, 'mistake')} · ${n(e.hints, 'hint')}${when}`;
}

/* Stats, per level: { v: 2, levels: { hard: { started, solved, perfect, best, fastest, totalTime } } }
   started = new games begun, solved = games won, perfect = wins with no mistakes, times in seconds.
   Practice games from the lessons are not counted. */
const STATS_VERSION = 2;
const levelStats = (s, diff) => s.levels[diff] || (s.levels[diff] = { started: 0, solved: 0, perfect: 0, best: 0, fastest: 0, totalTime: 0 });

// Older saves have no stats (or an earlier kind), so wins are rebuilt from the score list.
// Games started before tracking began can't be known.
function cleanStats(raw, scores) {
  if (raw && raw.v === STATS_VERSION && raw.levels) return raw;
  const s = { v: STATS_VERSION, levels: {} };
  scores.forEach((e) => addWin(s, e));
  return s;
}
function addStart(s, diff) { levelStats(s, diff).started++; }
function addWin(s, e) {
  const l = levelStats(s, e.diff);
  l.solved++;
  if (!e.mistakes) l.perfect++;
  l.best = Math.max(l.best, e.score);
  l.fastest = l.fastest ? Math.min(l.fastest, e.seconds) : e.seconds;
  l.totalTime += e.seconds;
}

// Totals across the given levels, with win rate and average time worked out.
// Started is never shown below won (older wins were never counted as starts).
function summarize(s, diffs) {
  const t = { started: 0, solved: 0, perfect: 0, best: 0, fastest: 0, totalTime: 0, missingStarts: false };
  for (const k of diffs) {
    const l = s.levels[k];
    if (!l) continue;
    if (l.started < l.solved) t.missingStarts = true;
    t.started += Math.max(l.started, l.solved);
    t.solved += l.solved;
    t.perfect += l.perfect;
    t.best = Math.max(t.best, l.best);
    if (l.fastest) t.fastest = t.fastest ? Math.min(t.fastest, l.fastest) : l.fastest;
    t.totalTime += l.totalTime;
  }
  t.winRate = t.started ? t.solved / t.started : 0;
  t.average = t.solved ? Math.round(t.totalTime / t.solved) : 0;
  return t;
}
