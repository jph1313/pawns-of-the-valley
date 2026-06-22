import { makeGame } from './gamecore.mjs';
const base = { ROWS: 7, COLS: 4, PAWN_ROWS: 2 };

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function randomFormation(G, player) {
  const cells = G.homeCells(player), out = [];
  for (let i = 0; i < 8; i++) out.push(cells[(Math.random() * cells.length) | 0]);
  return out;
}
const standardFormation = (G, player) => G.homeCells(player).slice();

function greedyPick(G) {
  return (s) => {
    const player = s.current, dir = G.dirOf(player);
    let best = null, bestScore = -Infinity;
    for (const m of shuffle(G.allMoves(s, player))) {
      const after = G.apply(s, m); let score = 0;
      if (after.winner === player) score += 10000;
      score += (G.deliveredPawns(after, player) - G.deliveredPawns(s, player)) * 400;
      if (m.type === 'capture') score += 120;
      score += dir * (m.to[0] - m.from[0]) * 15;
      if (m.type === 'climb') score += 8;
      const replies = after.over ? [] : G.allMoves(after, G.other(player));
      if (replies.some(x => x.type === 'capture' && x.to[0] === m.to[0] && x.to[1] === m.to[1])) score -= 90;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  };
}

function play(G, s0, pick, maxPlies = 500) {
  let s = s0, plies = 0;
  while (!s.over && plies < maxPlies) { s = G.apply(s, pick(s)); plies++; }
  return s;
}

function trial(label, flags, form, n) {
  const G = makeGame(Object.assign({}, base, flags));
  const pick = greedyPick(G);
  let W = 0, B = 0, D = 0;
  for (let i = 0; i < n; i++) {
    const s0 = G.stateFromPlacements(form(G, G.WHITE), form(G, G.BLACK));
    const s = play(G, s0, pick);
    if (s.winner === G.WHITE) W++; else if (s.winner === G.BLACK) B++; else D++;
  }
  const pct = (x) => (100 * x / n).toFixed(1) + '%';
  console.log(`${label.padEnd(44)} ties ${pct(D).padStart(6)}  (W ${pct(W)} / B ${pct(B)})`);
}

const n = 1500;
console.log('COMBINED LEVERS — greedy play, tie rate (n=' + n + ')\n');
trial('standard setup (baseline)', {}, standardFormation, n);
trial('free setup', {}, randomFormation, n);
trial('free setup + extra-move-on-capture', { extraMoveOnCapture: true }, randomFormation, n);
trial('free setup + mandatory + extra-move', { mandatoryCapture: true, extraMoveOnCapture: true }, randomFormation, n);
