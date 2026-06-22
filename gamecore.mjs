// ============================================================================
// Pawns of the Valley — shared rules core (faithful to index.html).
//   - forward 1 (descend/flat onto empty), 2 from the second row
//   - climb straight-forward onto a stack of ANY height, rising at most 1 level
//   - capture diagonally forward, SAME LEVEL ONLY
//   - win by occupying all COLS squares of the opponent's back row, else most
//     squares when neither side can move (tie = draw); a stuck side is skipped
// apply() returns the NEW state. Every move advances a pawn forward => finite DAG.
// ============================================================================
export function makeGame(cfg) {
  const ROWS = cfg.ROWS, COLS = cfg.COLS, PR = cfg.PAWN_ROWS;
  const WHITE = 'W', BLACK = 'B';
  // experimental variant toggles (default off => base rules)
  const EXTRA = !!cfg.extraMoveOnCapture; // capture -> move again
  const MUST = !!cfg.mandatoryCapture;    // must capture if able
  const SIDE = !!cfg.valleySideways;      // valley-floor pawns may shuffle sideways
  const TWO = !!cfg.twoRowScore;          // score on BOTH opponent home rows, not just the back row
  const isTop = (r) => r < PR || r >= ROWS - PR;
  const ground = (r) => (isTop(r) ? 1 : 0);
  const other = (p) => (p === WHITE ? BLACK : WHITE);
  const dirOf = (p) => (p === WHITE ? 1 : -1);
  const secondRow = (p) => (p === WHITE ? PR - 1 : ROWS - PR);
  const scoreRow = (p) => (p === WHITE ? ROWS - 1 : 0);
  const inB = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

  function initial() {
    const board = [];
    for (let r = 0; r < ROWS; r++) { board[r] = []; for (let c = 0; c < COLS; c++) board[r][c] = []; }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < PR; r++) board[r][c].push(WHITE);
      for (let r = ROWS - PR; r < ROWS; r++) board[r][c].push(BLACK);
    }
    return { board, current: WHITE, over: false, winner: null, capW: 0, capB: 0 };
  }

  // Build a state from explicit pawn placements (each entry [r,c]; repeats = stack).
  function stateFromPlacements(whites, blacks) {
    const board = [];
    for (let r = 0; r < ROWS; r++) { board[r] = []; for (let c = 0; c < COLS; c++) board[r][c] = []; }
    for (const [r, c] of whites) board[r][c].push(WHITE);
    for (const [r, c] of blacks) board[r][c].push(BLACK);
    return { board, current: WHITE, over: false, winner: null, capW: 0, capB: 0 };
  }
  const homeCells = (player) => {
    const rows = player === WHITE ? [0, 1] : [ROWS - 2, ROWS - 1];
    const cells = [];
    for (const r of rows) for (let c = 0; c < COLS; c++) cells.push([r, c]);
    return cells;
  };

  function clone(s) {
    const board = new Array(ROWS);
    for (let r = 0; r < ROWS; r++) { board[r] = new Array(COLS); for (let c = 0; c < COLS; c++) board[r][c] = s.board[r][c].slice(); }
    return { board, current: s.current, over: s.over, winner: s.winner, capW: s.capW, capB: s.capB };
  }

  function genMoves(s, r, c) {
    const stack = s.board[r][c];
    if (!stack.length) return [];
    const player = stack[stack.length - 1];
    if (player !== s.current) return [];
    const dir = dirOf(player);
    const feet = ground(r) + (stack.length - 1);
    const moves = [];
    const fr = r + dir;
    if (inB(fr, c)) {
      const tc = s.board[fr][c].length;
      if (tc === 0) { if (ground(fr) - feet <= 0) moves.push({ from: [r, c], to: [fr, c], type: 'move' }); }
      else { if ((ground(fr) + tc) - feet <= 1) moves.push({ from: [r, c], to: [fr, c], type: 'climb' }); }
    }
    if (r === secondRow(player) && stack.length === 1) {
      const mr = r + dir, dr = r + 2 * dir;
      if (inB(dr, c) && s.board[mr][c].length === 0 && s.board[dr][c].length === 0)
        moves.push({ from: [r, c], to: [dr, c], type: 'double' });
    }
    if (SIDE && !isTop(r) && feet === 0) {            // sideways shuffle on the valley floor
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (inB(r, nc) && s.board[r][nc].length === 0) moves.push({ from: [r, c], to: [r, nc], type: 'side' });
      }
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir, tcc = c + dc;
      if (!inB(tr, tcc)) continue;
      const ts = s.board[tr][tcc];
      if (!ts.length) continue;
      if (ts[ts.length - 1] === player) continue;
      const tFeet = ground(tr) + (ts.length - 1);
      // same level OR downhill (any depth); uphill still forbidden
      if (tFeet <= feet) moves.push({ from: [r, c], to: [tr, tcc], type: 'capture' });
    }
    return moves;
  }

  function allMoves(s, player) {
    const saved = s.current; s.current = player;
    const list = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const st = s.board[r][c];
      if (st.length && st[st.length - 1] === player) { for (const m of genMoves(s, r, c)) list.push(m); }
    }
    s.current = saved;
    if (MUST) { const caps = list.filter(m => m.type === 'capture'); if (caps.length) return caps; }
    return list;
  }
  const hasMoves = (s, p) => allMoves(s, p).length > 0;

  // rows that count for scoring: opponent's back row, or BOTH home rows if TWO
  const targetRows = (p) => TWO ? (p === WHITE ? [ROWS - 2, ROWS - 1] : [0, 1]) : [scoreRow(p)];
  function deliveredSquares(s, player) {
    let n = 0; for (const row of targetRows(player))
      for (let c = 0; c < COLS; c++) if (s.board[row][c].includes(player)) n++;
    return n;
  }
  function deliveredPawns(s, player) {
    let n = 0; for (const row of targetRows(player))
      for (let c = 0; c < COLS; c++) for (const p of s.board[row][c]) if (p === player) n++;
    return n;
  }
  // instant win = occupy every square of the opponent's BACK row (unchanged by TWO)
  function backRowFull(s, player) {
    const row = scoreRow(player);
    for (let c = 0; c < COLS; c++) if (!s.board[row][c].includes(player)) return false;
    return true;
  }

  function apply(s, m) {
    const ns = clone(s);
    const mover = ns.board[m.from[0]][m.from[1]].pop();
    if (m.type === 'capture') { ns.board[m.to[0]][m.to[1]].pop(); if (mover === WHITE) ns.capW++; else ns.capB++; }
    ns.board[m.to[0]][m.to[1]].push(mover);
    // instant win: occupy every back-row square
    if (backRowFull(ns, mover)) { ns.winner = mover; ns.over = true; return ns; }
    // capture grants another move (chains while captures/moves remain)
    if (EXTRA && m.type === 'capture' && hasMoves(ns, mover)) { ns.current = mover; return ns; }
    const opp = other(mover);
    if (hasMoves(ns, opp)) ns.current = opp;
    else if (hasMoves(ns, mover)) ns.current = mover;
    else {
      ns.over = true;
      const w = deliveredPawns(ns, WHITE), b = deliveredPawns(ns, BLACK);  // 1) most PAWNS
      if (w > b) ns.winner = WHITE; else if (b > w) ns.winner = BLACK;
      else if (ns.capW > ns.capB) ns.winner = WHITE;                       // 2) most CAPTURES
      else if (ns.capB > ns.capW) ns.winner = BLACK;
      else ns.winner = 'draw';
    }
    return ns;
  }

  function ser(s) {
    let k = s.current + '|' + s.capW + '.' + s.capB;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) k += '/' + s.board[r][c].join('');
    return k;
  }

  // lexicographic: pawns dominate (×100), captures break ties (max ±8 < 100)
  const value = (s) => (deliveredPawns(s, WHITE) - deliveredPawns(s, BLACK)) * 100 + (s.capW - s.capB);
  const mcell = (r, c) => [ROWS - 1 - r, COLS - 1 - c];
  const mirrorMove = (m) => ({ from: mcell(m.from[0], m.from[1]), to: mcell(m.to[0], m.to[1]), type: m.type });

  return { ROWS, COLS, PR, WHITE, BLACK, initial, clone, genMoves, allMoves, hasMoves,
    deliveredSquares, deliveredPawns, apply, ser, value, other, dirOf, scoreRow, mirrorMove,
    stateFromPlacements, homeCells };
}
