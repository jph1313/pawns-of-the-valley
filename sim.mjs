import { makeGame } from './gamecore.mjs';

const G = makeGame({ ROWS: 7, COLS: 4, PAWN_ROWS: 2 }); // the real board

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---- policies ----
function randomPick(s) {
  const ms = G.allMoves(s, s.current);
  return ms[(Math.random() * ms.length) | 0];
}

// greedy: 1-ply heuristic (mirrors the in-game AI)
function greedyPick(s) {
  const player = s.current, dir = G.dirOf(player);
  let best = null, bestScore = -Infinity;
  for (const m of shuffle(G.allMoves(s, player))) {
    const after = G.apply(s, m);
    let score = 0;
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
}

// positional eval from White's perspective
function evalState(s) {
  let sc = 0;
  for (let r = 0; r < G.ROWS; r++) for (let c = 0; c < G.COLS; c++) {
    for (const p of s.board[r][c]) {
      const prog = p === G.WHITE ? r : (G.ROWS - 1 - r);
      sc += (p === G.WHITE ? 1 : -1) * prog;
    }
  }
  sc += (G.deliveredPawns(s, G.WHITE) - G.deliveredPawns(s, G.BLACK)) * 100;
  sc += (s.capW - s.capB) * 2; // value the capture tiebreaker a little
  return sc;
}

function makeMinimax(depth) {
  function mm(s, d, alpha, beta) {
    if (s.over || d === 0) return evalState(s);
    const moves = shuffle(G.allMoves(s, s.current));
    if (s.current === G.WHITE) {
      let v = -Infinity;
      for (const m of moves) { v = Math.max(v, mm(G.apply(s, m), d - 1, alpha, beta)); alpha = Math.max(alpha, v); if (beta <= alpha) break; }
      return v;
    } else {
      let v = Infinity;
      for (const m of moves) { v = Math.min(v, mm(G.apply(s, m), d - 1, alpha, beta)); beta = Math.min(beta, v); if (beta <= alpha) break; }
      return v;
    }
  }
  return function (s) {
    const player = s.current;
    let best = null, bestScore = player === G.WHITE ? -Infinity : Infinity;
    for (const m of shuffle(G.allMoves(s, player))) {
      const v = mm(G.apply(s, m), depth - 1, -Infinity, Infinity);
      if (player === G.WHITE ? v > bestScore : v < bestScore) { bestScore = v; best = m; }
    }
    return best;
  };
}

// ---- run one game ----
function playGame(wp, bp, maxPlies = 400) {
  let s = G.initial(), plies = 0;
  while (!s.over && plies < maxPlies) {
    const pick = s.current === G.WHITE ? wp : bp;
    s = G.apply(s, pick(s));
    plies++;
  }
  return { winner: s.winner, dW: G.deliveredPawns(s, G.WHITE), dB: G.deliveredPawns(s, G.BLACK), plies };
}

function runMatch(label, wp, bp, n) {
  let W = 0, B = 0, D = 0, sumW = 0, sumB = 0, sumPlies = 0, zeroZero = 0;
  const margin = {};
  for (let i = 0; i < n; i++) {
    const r = playGame(wp, bp);
    if (r.winner === G.WHITE) W++; else if (r.winner === G.BLACK) B++; else D++;
    sumW += r.dW; sumB += r.dB; sumPlies += r.plies;
    if (r.dW === 0 && r.dB === 0) zeroZero++;
    const mk = r.dW - r.dB; margin[mk] = (margin[mk] || 0) + 1;
  }
  const pct = (x) => (100 * x / n).toFixed(1) + '%';
  console.log(`\n${label}  (n=${n})`);
  console.log(`  White wins ${pct(W)} | Black wins ${pct(B)} | TIES ${pct(D)}`);
  console.log(`  of which 0-0 ties: ${pct(zeroZero)}   | avg delivered  W ${(sumW / n).toFixed(2)}  B ${(sumB / n).toFixed(2)}  | avg length ${(sumPlies / n).toFixed(0)} plies`);
  const keys = Object.keys(margin).map(Number).sort((a, b) => a - b);
  console.log('  margin (W−B) distribution: ' + keys.map(k => `${k >= 0 ? '+' + k : k}:${pct(margin[k])}`).join('  '));
}

const greedy = greedyPick;
const mm3 = makeMinimax(3);
const mm4 = makeMinimax(4);

console.log('TIE / WIN RATES ON THE REAL 4x7 BOARD');
runMatch('random   vs random', randomPick, randomPick, 3000);
runMatch('greedy   vs greedy', greedy, greedy, 2000);
runMatch('minimax3 vs minimax3', mm3, mm3, 600);
runMatch('minimax4 vs minimax4 (best play)', mm4, mm4, 200);
runMatch('greedy(W) vs random(B)', greedy, randomPick, 1000);
runMatch('random(W) vs greedy(B)', randomPick, greedy, 1000);
