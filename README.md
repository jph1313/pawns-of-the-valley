# Pawns of the Valley

A 3D browser board game — a single self-contained `index.html` (Three.js via CDN, no build, no server). Open the file directly, or play the hosted version.

## How to play (short)
- **Setup:** each game starts with a secret deployment — arrange your 8 pawns anywhere in your two home rows (stacking allowed). Hot-seat or vs. computer.
- **Goal:** get pawns into either of your opponent's two home rows. Every pawn there scores (stacks count). Most pawns delivered wins; ties broken by most captures.
- **Moves:** pawns move like chess pawns (forward 1, or 2 from the second row), walk down into the valley, climb one level at a time onto stacks, and capture diagonally on their level or below — never uphill.

Pieces stack, the valley must be crossed via stepping-stones, and the in-game **?** button has the full rules.

The `*.mjs` files are the rules engine + game-theory solver/Monte-Carlo tools used to balance the design (run with `node solver.mjs`, `node sim.mjs`).
