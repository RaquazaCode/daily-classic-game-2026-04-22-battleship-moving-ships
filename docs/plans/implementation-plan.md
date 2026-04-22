# Implementation Plan - 2026-04-22 Battleship Moving Ships

## Scope
Build a deterministic single-player Battleship variant with a moving-ships twist suitable for unattended automation runs.

## Work Plan
1. Scaffold from proven static-web game template.
2. Implement deterministic game-core module:
   - fixed-step simulation
   - player/enemy turns
   - collision + sink rules
   - moving untouched ships each enemy turn
   - scoring, combo tracking, win/loss
3. Implement UI layer:
   - dual-board rendering
   - click-to-fire input
   - pause/reset/restart key handling
4. Add verification:
   - node tests
   - self-check script
   - Playwright capture script + action payload
5. Complete automation lifecycle:
   - initialize git, micro-commits
   - create GitHub repo + branch/PR/merge
   - verify + deploy wrapper
   - update state/catalog/queue/report/index/memory
