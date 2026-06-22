import { makeGame } from './gamecore.mjs';

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function policies(G) {
  const randomPick = (s) => { const ms = G.allMoves(s, s.current); return ms[(Math.random() * ms.length) | 0]; };
  const greedyPick = (s) => {
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
  return { randomPick, greedyPick };
}

function playGame(G, wp, bp, maxPlies = 600) {
  let s = G.initial(), plies = 0;
  while (!s.over && plies < maxPlies) { s = G.apply(s, (s.current === G.WHITE ? wp : bp)(s)); plies++; }
  return s;
}

function tieRate(G, pick, n) {
  let W = 0, B = 0, D = 0;
  for (let i = 0; i < n; i++) { const s = playGame(G, pick, pick); if (s.winner === G.WHITE) W++; else if (s.winner === G.BLACK) B++; else D++; }
  return { W, B, D, n };
}

const base = { ROWS: 7, COLS: 4, PAWN_ROWS: 2 };
const variants = [
  ['baseline (current rules)', {}],
  ['valley sideways shuffle', { valleySideways: true }],
  ['mandatory capture', { mandatoryCapture: true }],
  ['extra move on capture', { extraMoveOnCapture: true }],
  ['mandatory + extra move', { mandatoryCapture: true, extraMoveOnCapture: true }],
];

const pct = (x, n) => (100 * x / n).toFixed(1) + '%';
console.log('MECHANIC EXPERIMENTS — tie rate (lower = better). greedy n=1500, random n=2000\n');
for (const [name, flags] of variants) {
  const G = makeGame(Object.assign({}, base, flags));
  const { randomPick, greedyPick } = policies(G);
  const g = tieRate(G, greedyPick, 1500);
  const r = tieRate(G, randomPick, 2000);
  console.log(name.padEnd(26) +
    ` | greedy ties ${pct(g.D, g.n).padStart(6)} (W${pct(g.W, g.n)}/B${pct(g.B, g.n)})` +
    ` | random ties ${pct(r.D, r.n).padStart(6)}`);
}
