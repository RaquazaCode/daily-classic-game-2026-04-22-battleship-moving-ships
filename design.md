# Design - Battleship (Moving Ships)

## Core Loop
- Player fires one shot into the enemy grid.
- Enemy responds after a deterministic delay.
- Surviving untouched ships on both sides move up to one tile.
- Repeat until one fleet is fully sunk.

## Twist
- Twist: `moving ships`
- Only ships with zero hits can move.
- Ships never move into occupied, out-of-bounds, or previously targeted tiles.

## Determinism
- Fixed-step timeline (`50ms`) and seeded RNG for movement direction ordering.
- Enemy targeting uses deterministic checkerboard search with queued neighbors.
- Validation relies on repeatable `render_game_to_text()` snapshots.
