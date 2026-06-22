// ============================================================================
// Pawns of the Valley — game-theoretic prober.
// Faithful port of the CURRENT ruleset in index.html:
//   - pawns move forward 1 (descend/flat onto empty), 2 from their second row
//   - climb straight-forward onto a stack of ANY height, rising at most 1 level
//   - capture diagonally forward, SAME LEVEL ONLY (no up/down)
//   - win by occupying all COLS squares of the opponent's back row;
//     otherwise most back-row squares when neither side can move (tie = draw)
//   - a side with no move is skipped
//
// Because every legal move advances a pawn forward, total progress strictly
// increases => the game is a finite DAG (no cycles) => exact minimax with a
// transposition table is valid and terminating.
//
// Rules live in gamecore.mjs (shared with sim.mjs); this file only analyzes.
// ============================================================================
import { makeGame } from './gamecore.mjs';

// ---------------------------------------------------------------------------
// Exact solver: full minimax + transposition table. Returns the value with
// perfect play (White maximizes value = dW - dB). Bails past a node cap.
// ---------------------------------------------------------------------------
function exactSolve(G, cap = 8_000_000) {
  const memo = new Map();
  let nodes = 0, bailed = false;
  function solve(s) {
    if (bailed) return 0;
    if (s.over) return G.value(s);
    const key = G.ser(s);
    const hit = memo.get(key); if (hit !== undefined) return hit;
    if (++nodes > cap) { bailed = true; return 0; }
    const moves = G.allMoves(s, s.current);
    let best = s.current === G.WHITE ? -Infinity : Infinity;
    for (const m of moves) {
      const v = solve(G.apply(s, m));
      if (s.current === G.WHITE) { if (v > best) best = v; }
      else { if (v < best) best = v; }
    }
    memo.set(key, best);
    return best;
  }
  const v = solve(G.initial());
  return { value: v, nodes, bailed, states: memo.size };
}

// ---------------------------------------------------------------------------
// Mirror analysis: Black commits to copying White's move under 180° symmetry.
// Optimal White tries to (a) win outright or (b) force a position where the
// mirror reply is ILLEGAL (mirror strategy collapses). DFS returns the best
// White value; >0 or a forced break means mirroring is NOT a safe draw.
// ---------------------------------------------------------------------------
function whiteVsMirror(G, cap = 8_000_000) {
  const memo = new Map();
  let nodes = 0, bailed = false, breakFound = false, bestVal = -Infinity;
  // state is always White-to-move and (by construction) point-symmetric
  function search(s) {
    if (bailed) return -Infinity;
    if (s.over) return G.value(s);
    const key = G.ser(s);
    const hit = memo.get(key); if (hit !== undefined) return hit;
    if (++nodes > cap) { bailed = true; return -Infinity; }
    let best = -Infinity;
    for (const m of G.allMoves(s, G.WHITE)) {
      const afterW = G.apply(s, m);
      let v;
      if (afterW.over) { v = G.value(afterW); }          // White delivered 4 first (tempo win)
      else if (afterW.current === G.WHITE) {             // Black got skipped -> mirror can't reply
        breakFound = true; v = 999;
      } else {
        const bm = G.mirrorMove(m);
        const legal = G.allMoves(afterW, G.BLACK)
          .some(x => x.from[0] === bm.from[0] && x.from[1] === bm.from[1] && x.to[0] === bm.to[0] && x.to[1] === bm.to[1]);
        if (!legal) { breakFound = true; v = 999; }       // mirror reply illegal -> collapse
        else {
          const afterB = G.apply(afterW, bm);
          v = afterB.over ? G.value(afterB) : search(afterB);
        }
      }
      if (v > best) best = v;
      if (best >= 999) break; // can't do better than collapsing the mirror
    }
    memo.set(key, best);
    return best;
  }
  bestVal = search(G.initial());
  return { bestWhiteValue: bestVal, nodes, bailed, breakFound, states: memo.size };
}

// ---------------------------------------------------------------------------
// Run experiments
// ---------------------------------------------------------------------------
function fmt(o) { return JSON.stringify(o); }

const configs = [
  { name: '2x5 (4 pawns/side)', ROWS: 5, COLS: 2, PAWN_ROWS: 2 },
  { name: '2x7 (4 pawns/side)', ROWS: 7, COLS: 2, PAWN_ROWS: 2 },
  { name: '3x5 (6 pawns/side)', ROWS: 5, COLS: 3, PAWN_ROWS: 2 },
  { name: '4x5 (8 pawns/side)', ROWS: 5, COLS: 4, PAWN_ROWS: 2 },
  { name: '3x7 (6 pawns/side)', ROWS: 7, COLS: 3, PAWN_ROWS: 2 },
  { name: '4x7 REAL (8 pawns/side)', ROWS: 7, COLS: 4, PAWN_ROWS: 2 },
];

console.log('=== EXACT SOLVE (value = White delivered PAWNS minus Black; + means White wins) ===');
for (const cfg of configs) {
  const G = makeGame(cfg);
  const t0 = Date.now();
  const res = exactSolve(G);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const verdict = res.bailed ? 'INCOMPLETE (too big)' :
    (res.value > 0 ? 'WHITE forced win' : res.value < 0 ? 'BLACK forced win' : 'DRAW (neither can force a win)');
  console.log(`  ${cfg.name.padEnd(26)} value=${res.bailed ? '?' : res.value}  states=${res.states}  ${dt}s  -> ${verdict}`);
}

console.log('\n=== MIRROR DEFENSE (can optimal White beat a Black who just copies the mirror move?) ===');
console.log('  bestWhiteValue<=0 & no break  => mirroring guarantees Black at least a draw (no unbeatable White).');
for (const cfg of configs) {
  const G = makeGame(cfg);
  const t0 = Date.now();
  const res = whiteVsMirror(G);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  let verdict;
  if (res.bailed) verdict = 'INCOMPLETE';
  else if (res.breakFound || res.bestWhiteValue > 0) verdict = 'mirror INSUFFICIENT (White can break/win)';
  else verdict = 'mirror HOLDS (Black >= draw)';
  console.log(`  ${cfg.name.padEnd(26)} bestWhite=${res.bailed ? '?' : (res.bestWhiteValue >= 999 ? 'BREAK' : res.bestWhiteValue)}  states=${res.states}  ${dt}s  -> ${verdict}`);
}
