/* Solver part 2 of 3: rates a puzzle the way a person would solve it, technique by technique.
   Needs solver-basics.js. */
/* Human-style rating. The solver applies the simplest technique that makes
   progress, and the puzzle's level is the hardest technique it had to use.
   1 naked single   2 hidden single   3 locked candidates, pairs
   4 triples, X-Wing   5 XY-Wing, Swordfish   6 forcing (try a candidate, follow the singles,
   and rule it out if that breaks)   7 needs guesses inside guesses */
function rate(puzzle, opts) {
  const g = puzzle.slice();
  const cand = new Int16Array(81);
  let empties = 0;
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    empties++;
    let m = 511;
    for (const p of PEERS[i]) if (g[p]) m &= ~(1 << (g[p] - 1));
    cand[i] = m;
  }
  // Each technique fills `pat` with a description of the first pattern it applied.
  let pat = null;
  const used = new Set();
  const steps = [];
  const place = (i, d) => {
    g[i] = d; cand[i] = 0;
    const bit = 1 << (d - 1);
    for (const p of PEERS[i]) cand[p] &= ~bit;
    empties--;
  };

  const nakedSingle = () => {
    let ch = false;
    for (let i = 0; i < 81; i++) {
      if (!g[i] && POP[cand[i]] === 1) {
        const d = digitOf(cand[i]);
        if (!pat) pat = { type: 'naked-single', cells: [i], digit: d };
        place(i, d); ch = true;
      }
    }
    return ch;
  };
  const hiddenSingle = () => {
    let ch = false;
    for (const u of UNITS) {
      for (let d = 0; d < 9; d++) {
        const bit = 1 << d;
        let cell = -1, n = 0;
        for (const i of u) if (!g[i] && (cand[i] & bit)) { cell = i; n++; }
        if (n === 1) {
          if (!pat) pat = { type: 'hidden-single', cells: [cell], digit: d + 1, unit: UNITS.indexOf(u) };
          place(cell, d + 1); ch = true;
        }
      }
    }
    return ch;
  };
  const locked = () => {
    let ch = false;
    for (let b = 0; b < 9; b++) {
      const u = UNITS[18 + b];
      for (let d = 0; d < 9; d++) {
        const bit = 1 << d;
        let rows = 0, cols = 0, n = 0;
        for (const i of u) if (cand[i] & bit) { rows |= 1 << ROW[i]; cols |= 1 << COL[i]; n++; }
        if (!n) continue;
        if (POP[rows] === 1) {
          const rr = 31 - Math.clz32(rows);
          for (let c = 0; c < 9; c++) { const i = rr * 9 + c; if (BOX[i] !== b && (cand[i] & bit)) { cand[i] &= ~bit; ch = true; } }
        }
        if (POP[cols] === 1) {
          const cc = 31 - Math.clz32(cols);
          for (let r = 0; r < 9; r++) { const i = r * 9 + cc; if (BOX[i] !== b && (cand[i] & bit)) { cand[i] &= ~bit; ch = true; } }
        }
        if (ch) {
          pat = { type: 'pointing', digit: d + 1, unit: 18 + b, cells: u.filter((i) => !g[i] && (cand[i] & bit)) };
          return true;
        }
      }
    }
    for (let k = 0; k < 18; k++) {
      const u = UNITS[k];
      for (let d = 0; d < 9; d++) {
        const bit = 1 << d;
        let boxes = 0, n = 0;
        for (const i of u) if (cand[i] & bit) { boxes |= 1 << BOX[i]; n++; }
        if (n && POP[boxes] === 1) {
          const bb = 31 - Math.clz32(boxes);
          for (const i of UNITS[18 + bb]) {
            const inLine = k < 9 ? ROW[i] === k : COL[i] === k - 9;
            if (!inLine && (cand[i] & bit)) { cand[i] &= ~bit; ch = true; }
          }
          if (ch) {
            pat = { type: 'claiming', digit: d + 1, unit: k, box: bb, cells: u.filter((i) => !g[i] && (cand[i] & bit)) };
            return true;
          }
        }
      }
    }
    return false;
  };
  const nakedSubset = (n) => {
    for (const u of UNITS) {
      const cs = u.filter((i) => !g[i] && POP[cand[i]] >= 2 && POP[cand[i]] <= n);
      const pick = (start, cnt, mask, chosen) => {
        if (cnt === n) {
          if (POP[mask] !== n) return false;
          let any = false;
          for (const i of u) if (!g[i] && !chosen.includes(i) && (cand[i] & mask)) { cand[i] &= ~mask; any = true; }
          if (any) pat = { type: n === 2 ? 'naked-pair' : 'naked-triple', unit: UNITS.indexOf(u), cells: chosen.slice(), mask };
          return any;
        }
        for (let k = start; k < cs.length; k++) {
          const m = mask | cand[cs[k]];
          if (POP[m] > n) continue;
          chosen.push(cs[k]);
          const res = pick(k + 1, cnt + 1, m, chosen);
          chosen.pop();
          if (res) return true;
        }
        return false;
      };
      if (pick(0, 0, 0, [])) return true;
    }
    return false;
  };
  const hiddenSubset = (n) => {
    for (const u of UNITS) {
      const dc = [];
      for (let d = 0; d < 9; d++) {
        let m = 0, cnt = 0;
        for (let p = 0; p < 9; p++) if (!g[u[p]] && (cand[u[p]] & (1 << d))) { m |= 1 << p; cnt++; }
        if (cnt >= 2 && cnt <= n) dc.push({ d, m });
      }
      const pick = (start, cnt, pmask, dmask) => {
        if (cnt === n) {
          if (POP[pmask] !== n) return false;
          let any = false;
          for (let p = 0; p < 9; p++) {
            if (!(pmask >> p & 1)) continue;
            const i = u[p], nc = cand[i] & dmask;
            if (nc !== cand[i]) { cand[i] = nc; any = true; }
          }
          if (any) pat = { type: n === 2 ? 'hidden-pair' : 'hidden-triple', unit: UNITS.indexOf(u), cells: [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((p) => pmask >> p & 1).map((p) => u[p]), mask: dmask };
          return any;
        }
        for (let k = start; k < dc.length; k++) {
          const pm = pmask | dc[k].m;
          if (POP[pm] > n) continue;
          if (pick(k + 1, cnt + 1, pm, dmask | (1 << dc[k].d))) return true;
        }
        return false;
      };
      if (pick(0, 0, 0, 0)) return true;
    }
    return false;
  };
  const fish = (n) => {
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      for (const byRow of [true, false]) {
        const lines = [];
        for (let a = 0; a < 9; a++) {
          let m = 0, cnt = 0;
          for (let b = 0; b < 9; b++) { const i = byRow ? a * 9 + b : b * 9 + a; if (cand[i] & bit) { m |= 1 << b; cnt++; } }
          if (cnt >= 2 && cnt <= n) lines.push({ a, m });
        }
        const pick = (start, cnt, mask, chosen) => {
          if (cnt === n) {
            if (POP[mask] !== n) return false;
            let any = false;
            for (let b = 0; b < 9; b++) {
              if (!(mask >> b & 1)) continue;
              for (let a = 0; a < 9; a++) {
                if (chosen.includes(a)) continue;
                const i = byRow ? a * 9 + b : b * 9 + a;
                if (cand[i] & bit) { cand[i] &= ~bit; any = true; }
              }
            }
            if (any) {
              const cells = [];
              for (const a of chosen) for (let b = 0; b < 9; b++) { const i = byRow ? a * 9 + b : b * 9 + a; if ((mask >> b & 1) && (cand[i] & bit)) cells.push(i); }
              pat = { type: n === 2 ? 'x-wing' : 'swordfish', digit: d + 1, byRow, lines: chosen.slice(), mask, cells };
            }
            return any;
          }
          for (let k = start; k < lines.length; k++) {
            const m = mask | lines[k].m;
            if (POP[m] > n) continue;
            chosen.push(lines[k].a);
            const res = pick(k + 1, cnt + 1, m, chosen);
            chosen.pop();
            if (res) return true;
          }
          return false;
        };
        if (pick(0, 0, 0, [])) return true;
      }
    }
    return false;
  };
  const xyWing = () => {
    for (let p = 0; p < 81; p++) {
      if (g[p] || POP[cand[p]] !== 2) continue;
      const pm = cand[p];
      const bi = PEERS[p].filter((i) => !g[i] && POP[cand[i]] === 2);
      for (let a = 0; a < bi.length; a++) {
        for (let b = a + 1; b < bi.length; b++) {
          const A = cand[bi[a]], B = cand[bi[b]];
          if (POP[A & pm] !== 1 || POP[B & pm] !== 1 || (A & pm) === (B & pm)) continue;
          const z = A & B;
          if (POP[z] !== 1 || (z & pm)) continue;
          let any = false;
          for (let i = 0; i < 81; i++) {
            if (!g[i] && (cand[i] & z) && sees(i, bi[a]) && sees(i, bi[b])) { cand[i] &= ~z; any = true; }
          }
          if (any) {
            pat = { type: 'xy-wing', pivot: p, wings: [bi[a], bi[b]], digit: digitOf(z) };
            return true;
          }
        }
      }
    }
    return false;
  };

  const forcing = () => {
    const base = new Int16Array(81);
    for (let i = 0; i < 81; i++) base[i] = g[i] ? 1 << (g[i] - 1) : cand[i];
    let any = false;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      for (let d = 0; d < 9; d++) {
        const bit = 1 << d;
        if (!(cand[i] & bit)) continue;
        if (!assign(base.slice(), i, bit)) {
          if (!pat) pat = { type: 'forcing', cells: [i], digit: d + 1, trace: traceAssign(base, i, bit) };
          cand[i] &= ~bit; any = true;
        }
      }
    }
    return any;
  };

  const TECHS = [
    { lv: 1, name: 'Naked single', fn: nakedSingle },
    { lv: 2, name: 'Hidden single', fn: hiddenSingle },
    { lv: 3, name: 'Locked candidates', fn: locked },
    { lv: 3, name: 'Naked pair', fn: () => nakedSubset(2) },
    { lv: 3, name: 'Hidden pair', fn: () => hiddenSubset(2) },
    { lv: 4, name: 'Naked triple', fn: () => nakedSubset(3) },
    { lv: 4, name: 'Hidden triple', fn: () => hiddenSubset(3) },
    { lv: 4, name: 'X-Wing', fn: () => fish(2) },
    { lv: 5, name: 'XY-Wing', fn: xyWing },
    { lv: 5, name: 'Swordfish', fn: () => fish(3) },
    { lv: 6, name: 'Forcing chain', fn: forcing },
  ];
  let top = -1;
  while (empties > 0) {
    let progressed = false;
    for (let t = 0; t < TECHS.length; t++) {
      pat = null;
      const before = opts && opts.record ? { g: g.slice(), cand: cand.slice() } : null;
      if (TECHS[t].fn()) {
        if (t > top) top = t;
        if (pat) used.add(pat.type);
        if (before) steps.push({ tech: TECHS[t].name, lv: TECHS[t].lv, pat, before, after: { g: g.slice(), cand: cand.slice() } });
        progressed = true;
        break;
      }
    }
    if (!progressed) return { solved: false, level: 7, hardest: 'Nested guessing', used: [...used], steps };
  }
  return { solved: true, level: top < 0 ? 1 : TECHS[top].lv, hardest: top < 0 ? TECHS[0].name : TECHS[top].name, used: [...used], steps };
}
