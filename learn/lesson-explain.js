/* Learn part 2 of 3: how each technique is explained in words and which cells light up. Needs lesson-list.js. */
'use strict';

/* ---------- Helpers ---------- */
const rc = (i) => 'r' + (ROW[i] + 1) + 'c' + (COL[i] + 1);
const unitName = (u) => (u < 9 ? 'row ' + (u + 1) : u < 18 ? 'column ' + (u - 8) : 'box ' + (u - 17));
const digs = (mask) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => (mask >> (d - 1)) & 1);
const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const b = (s) => '<b>' + s + '</b>';
const diffLabel = (lv) => Object.values(DIFFS).find((d) => d.level === lv).label;

function elimsText(ex) {
  const by = {};
  for (const [i, d] of ex.show) (by[d] = by[d] || []).push(rc(i));
  return list(Object.keys(by).map((d) => b(d) + ' from ' + b(list(by[d]))))
    .replace(/^/, 'remove ');
}

/* What each technique looks like on the board, and how to say it */
function describe(ex) {
  const p = ex.pat, t = ex.type;
  if (t === 'naked-single') {
    const c = p.cells[0];
    return {
      pattern: `${b(rc(c))} has only one candidate left: ${b(p.digit)}. Every other digit already appears in its row, column or box.`,
      result: `Place ${b(p.digit)} in ${b(rc(c))}.`,
    };
  }
  if (t === 'hidden-single') {
    const c = p.cells[0];
    return {
      pattern: `In ${b(unitName(p.unit))}, the digit ${b(p.digit)} fits in only one cell: ${b(rc(c))}. Its other candidates do not matter.`,
      result: `Place ${b(p.digit)} in ${b(rc(c))}.`,
    };
  }
  if (t === 'pointing') {
    const line = p.cells.every((i) => ROW[i] === ROW[p.cells[0]]) ? 'row ' + (ROW[p.cells[0]] + 1) : 'column ' + (COL[p.cells[0]] + 1);
    return {
      pattern: `In ${b(unitName(p.unit))}, every candidate for ${b(p.digit)} is in ${b(line)}: ${list(p.cells.map(rc))}.`,
      result: `The ${p.digit} of that box has to be in ${line}, so no other cell of ${line} can be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'claiming') {
    return {
      pattern: `In ${b(unitName(p.unit))}, every candidate for ${b(p.digit)} is inside ${b('box ' + (p.box + 1))}: ${list(p.cells.map(rc))}.`,
      result: `The ${p.digit} of ${unitName(p.unit)} has to be in that box, so the rest of the box cannot be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'naked-pair' || t === 'naked-triple') {
    return {
      pattern: `${b(list(p.cells.map(rc)))} use only ${b(list(digs(p.mask)))} between them, all within ${b(unitName(p.unit))}.`,
      result: `Those digits must fill those cells, so the rest of ${unitName(p.unit)} cannot use them. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'hidden-pair' || t === 'hidden-triple') {
    return {
      pattern: `In ${b(unitName(p.unit))}, the digits ${b(list(digs(p.mask)))} fit only in ${b(list(p.cells.map(rc)))}.`,
      result: `Those cells have to hold those digits, so they cannot hold anything else. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'x-wing' || t === 'swordfish') {
    const lineKind = p.byRow ? 'row' : 'column', crossKind = p.byRow ? 'column' : 'row';
    const lines = p.lines.map((a) => lineKind + ' ' + (a + 1));
    const cross = digs(p.mask).map((n) => crossKind + ' ' + n);
    return {
      pattern: `In ${b(list(lines))}, the digit ${b(p.digit)} appears only in ${b(list(cross))}.`,
      result: `The ${p.digit} in each of those ${lineKind}s must use up one of those ${crossKind}s, so no other cell in them can be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  if (t === 'xy-wing') {
    const [w1, w2] = p.wings, pc = digs(ex.cand[p.pivot]);
    const wc = (w) => list(digs(ex.cand[w]).map((d) => String(d)));
    return {
      pattern: `Pivot ${b(rc(p.pivot))} holds ${b(pc.join(' and '))}. Wing ${b(rc(w1))} holds ${b(wc(w1))} and wing ${b(rc(w2))} holds ${b(wc(w2))}. Both wings see the pivot and share the digit ${b(p.digit)}.`,
      result: `If the pivot is ${pc[0]}, one wing is forced to ${p.digit}. If it is ${pc[1]}, the other wing is. Either way ${p.digit} lands in a wing, so a cell that sees both wings cannot be ${p.digit}. You can ${elimsText(ex)}.`,
    };
  }
  // forcing
  const c = p.cells[0];
  const chain = (p.trace || []).filter((x) => x.digit && !x.none && x.cell !== c).slice(0, 6);
  const end = (p.trace || []).find((x) => x.none);
  const clash = !end ? '' : end.cell !== undefined
    ? ` At that point ${b(rc(end.cell))} has no digit left.`
    : ` At that point ${b(unitName(end.unit))} has no place left for ${b(end.digit)}.`;
  return {
    pattern: `Suppose ${b(rc(c))} is ${b(p.digit)}. The forced placements follow: ${chain.map((x) => b(rc(x.cell) + ' = ' + x.digit)).join(', ')}.${clash}`,
    result: `The assumption breaks, so ${b(rc(c))} cannot be ${b(p.digit)}. Remove that candidate.`,
  };
}

/* Which cells, units and digits to light up for each technique */
function marks(ex) {
  const p = ex.pat, t = ex.type;
  const m = { unit: new Set(), pat: new Set(), wing: new Set(), hi: new Set() };
  const hi = (i, d) => m.hi.add(i + ':' + d);
  const unit = (u) => UNITS[u].forEach((i) => m.unit.add(i));
  if (t === 'naked-single') { p.cells.forEach((i) => { m.pat.add(i); hi(i, p.digit); }); }
  else if (t === 'hidden-single') { unit(p.unit); m.pat.add(p.cells[0]); UNITS[p.unit].forEach((i) => hi(i, p.digit)); }
  else if (t === 'pointing' || t === 'claiming') { unit(p.unit); p.cells.forEach((i) => { m.pat.add(i); hi(i, p.digit); }); }
  else if (t.startsWith('naked') || t.startsWith('hidden')) {
    unit(p.unit);
    p.cells.forEach((i) => { m.pat.add(i); digs(p.mask).forEach((d) => hi(i, d)); });
  } else if (t === 'x-wing' || t === 'swordfish') {
    p.lines.forEach((a) => unit(p.byRow ? a : 9 + a));
    p.cells.forEach((i) => { m.pat.add(i); hi(i, p.digit); });
  } else if (t === 'xy-wing') {
    m.pat.add(p.pivot);
    digs(ex.cand[p.pivot]).forEach((d) => hi(p.pivot, d));
    p.wings.forEach((w) => { m.wing.add(w); digs(ex.cand[w]).forEach((d) => hi(w, d)); });
  } else {
    m.pat.add(p.cells[0]); hi(p.cells[0], p.digit);
    (p.trace || []).forEach((x) => { if (x.digit && x.cell !== undefined && x.cell !== p.cells[0]) { m.wing.add(x.cell); hi(x.cell, x.digit); } });
  }
  return m;
}
