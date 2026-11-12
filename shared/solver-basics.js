/* Solver part 1 of 3: the grid (rows, columns, boxes), a fast backtracking search,
   and constraint propagation. Shared by the game and the Learn page. */
const POP = new Uint8Array(512);
for (let i = 1; i < 512; i++) POP[i] = POP[i >> 1] + (i & 1);
const ROW = [], COL = [], BOX = [];
for (let i = 0; i < 81; i++) {
  ROW[i] = (i / 9) | 0;
  COL[i] = i % 9;
  BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0);
}
// 27 units: rows 0-8, columns 9-17, boxes 18-26
const UNITS = [];
for (let r = 0; r < 9; r++) UNITS.push([...Array(9).keys()].map((c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push([...Array(9).keys()].map((r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
  const br = ((b / 3) | 0) * 3, bc = (b % 3) * 3, u = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) u.push((br + r) * 9 + bc + c);
  UNITS.push(u);
}
const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = [];
  for (let k = 0; k < 81; k++) if (k !== i && (ROW[k] === ROW[i] || COL[k] === COL[i] || BOX[k] === BOX[i])) s.push(k);
  return s;
});
const sees = (i, j) => i !== j && (ROW[i] === ROW[j] || COL[i] === COL[j] || BOX[i] === BOX[j]);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Backtracking search with fewest-candidates-first ordering.
// Stops after `limit` solutions. Returns the count and the first solution found.
function search(grid, limit, randomize) {
  const g = grid.slice();
  const r = new Int16Array(9), c = new Int16Array(9), b = new Int16Array(9);
  for (let i = 0; i < 81; i++) {
    if (g[i]) {
      const bit = 1 << (g[i] - 1);
      r[ROW[i]] |= bit; c[COL[i]] |= bit; b[BOX[i]] |= bit;
    }
  }
  let count = 0, sol = null;
  function rec() {
    let best = -1, bm = 0, bn = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = (~(r[ROW[i]] | c[COL[i]] | b[BOX[i]])) & 511;
      const n = POP[m];
      if (n < bn) { bn = n; best = i; bm = m; if (n < 2) break; }
    }
    if (best < 0) { count++; if (!sol) sol = g.slice(); return count >= limit; }
    if (bn === 0) return false;
    const digits = [];
    for (let d = 0; d < 9; d++) if (bm & (1 << d)) digits.push(d);
    if (randomize) shuffle(digits);
    const ri = ROW[best], ci = COL[best], bi = BOX[best];
    for (const d of digits) {
      const bit = 1 << d;
      g[best] = d + 1; r[ri] |= bit; c[ci] |= bit; b[bi] |= bit;
      if (rec()) return true;
      g[best] = 0; r[ri] &= ~bit; c[ci] &= ~bit; b[bi] &= ~bit;
    }
    return false;
  }
  rec();
  return { count, sol };
}

/* Constraint propagation on candidate masks (m[i] = bitmask of possible digits).
   Used to test "what if this cell were that digit?" without guessing blindly. */
let TRACE = null; // when set, propagation logs what it forces (used to explain forcing chains)
const digitOf = (bit) => 32 - Math.clz32(bit);
function elim(m, i, bit) {
  if (!(m[i] & bit)) return true;
  m[i] &= ~bit;
  if (m[i] === 0) { if (TRACE) TRACE.push({ cell: i, none: true }); return false; }
  if (POP[m[i]] === 1) {
    const b = m[i];
    if (TRACE) TRACE.push({ cell: i, digit: digitOf(b) });
    for (const p of PEERS[i]) if (!elim(m, p, b)) return false;
  }
  for (const u of [UNITS[ROW[i]], UNITS[9 + COL[i]], UNITS[18 + BOX[i]]]) {
    let where = -1, n = 0;
    for (const k of u) if (m[k] & bit) { where = k; n++; }
    if (n === 0) { if (TRACE) TRACE.push({ unit: u === UNITS[ROW[i]] ? ROW[i] : u === UNITS[9 + COL[i]] ? 9 + COL[i] : 18 + BOX[i], digit: digitOf(bit), none: true }); return false; }
    if (n === 1 && m[where] !== bit) {
      if (TRACE) TRACE.push({ cell: where, digit: digitOf(bit) });
      if (!assign(m, where, bit)) return false;
    }
  }
  return true;
}
function assign(m, i, bit) {
  let others = m[i] & ~bit;
  while (others) {
    const low = others & -others;
    others &= others - 1;
    if (!elim(m, i, low)) return false;
  }
  return true;
}

function traceAssign(base, i, bit) {
  TRACE = [];
  assign(base.slice(), i, bit);
  const t = TRACE;
  TRACE = null;
  return t;
}
