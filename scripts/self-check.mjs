import { createGame, playerFire, advanceTime, renderGameToText } from '../src/game-core.js';

const state = createGame();

playerFire(state, 1, 0);
advanceTime(state, 1000);
playerFire(state, 1, 1);
advanceTime(state, 1000);

const snapshot = renderGameToText(state);

if (!snapshot.includes('score=')) {
  throw new Error('self-check failed: score line missing');
}
if (!snapshot.includes('combo=')) {
  throw new Error('self-check failed: combo line missing');
}
if (!snapshot.includes('enemy_board_public:')) {
  throw new Error('self-check failed: board dump missing');
}

console.log('self-check complete');
