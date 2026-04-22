import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTime,
  createGame,
  handlePointer,
  playerFire,
  renderGameToText,
  resetGame,
  togglePause
} from '../src/game-core.js';

const RIGHT_ORIGIN_X = 584;
const RIGHT_ORIGIN_Y = 124;
const CELL_SIZE = 56;

function clickEnemyCell(state, x, y) {
  return handlePointer(
    state,
    RIGHT_ORIGIN_X + x * CELL_SIZE + CELL_SIZE / 2,
    RIGHT_ORIGIN_Y + y * CELL_SIZE + CELL_SIZE / 2
  );
}

test('deterministic timeline yields identical text dump', () => {
  const a = createGame();
  const b = createGame();

  clickEnemyCell(a, 1, 0);
  advanceTime(a, 1400);
  clickEnemyCell(a, 1, 1);
  advanceTime(a, 1400);

  clickEnemyCell(b, 1, 0);
  advanceTime(b, 700);
  advanceTime(b, 700);
  clickEnemyCell(b, 1, 1);
  advanceTime(b, 1400);

  assert.equal(renderGameToText(a), renderGameToText(b));
});

test('player hit increases score and combo', () => {
  const state = createGame();
  const result = playerFire(state, 1, 0);

  assert.equal(result.outcome, 'hit');
  assert.equal(state.score, 100);
  assert.equal(state.combo, 1);
  assert.equal(state.turn, 'enemy');
});

test('pause blocks turn timer progression', () => {
  const state = createGame();
  playerFire(state, 0, 0);
  togglePause(state);
  const beforeTick = state.tick;
  advanceTime(state, 2000);
  assert.equal(state.tick, beforeTick);
  assert.equal(state.turn, 'enemy');
});

test('enemy turn resolves after timer and moves turn back to player', () => {
  const state = createGame();
  playerFire(state, 0, 0);
  assert.equal(state.turn, 'enemy');
  advanceTime(state, 1000);
  assert.equal(state.turn, 'player');
  assert.equal(state.enemyShots > 0, true);
});

test('reset restores clean state', () => {
  const state = createGame();
  playerFire(state, 1, 0);
  advanceTime(state, 1000);
  resetGame(state);

  assert.equal(state.score, 0);
  assert.equal(state.playerShots, 0);
  assert.equal(state.enemyShots, 0);
  assert.equal(state.phase, 'running');
  assert.equal(state.turn, 'player');
});
