import {
  advanceTime,
  createGame,
  getViewModel,
  handlePointer,
  renderGameToText,
  resetGame,
  togglePause
} from './game-core.js';

const state = createGame();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

let last = performance.now();
let accumulator = 0;
const FIXED_STEP = 50;

function drawGrid(origin, cellSize) {
  ctx.strokeStyle = '#294977';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i += 1) {
    const p = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(origin.x + p, origin.y);
    ctx.lineTo(origin.x + p, origin.y + cellSize * 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y + p);
    ctx.lineTo(origin.x + cellSize * 8, origin.y + p);
    ctx.stroke();
  }
}

function drawShots(origin, cellSize, shots, hitSet) {
  for (const shotKey of shots) {
    const [xStr, yStr] = shotKey.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    const px = origin.x + x * cellSize;
    const py = origin.y + y * cellSize;

    if (hitSet.has(shotKey)) {
      ctx.strokeStyle = '#ff6f61';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 8);
      ctx.lineTo(px + cellSize - 8, py + cellSize - 8);
      ctx.moveTo(px + cellSize - 8, py + 8);
      ctx.lineTo(px + 8, py + cellSize - 8);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#67a3da';
      ctx.beginPath();
      ctx.arc(px + cellSize / 2, py + cellSize / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawShips(origin, cellSize, ships, hidden) {
  for (const ship of ships) {
    for (const cell of ship.cells) {
      const x = origin.x + cell.x * cellSize;
      const y = origin.y + cell.y * cellSize;

      if (!hidden) {
        ctx.fillStyle = ship.sunk ? '#734848' : '#335d8d';
        ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
      }

      if (ship.sunk) {
        ctx.strokeStyle = '#ff6f61';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, cellSize - 12, cellSize - 12);
      }
    }
  }
}

function drawLabels(vm) {
  ctx.fillStyle = '#d9e8ff';
  ctx.font = '600 20px "Trebuchet MS", sans-serif';
  ctx.fillText('Your Fleet', vm.leftOrigin.x, vm.leftOrigin.y - 20);
  ctx.fillText('Enemy Waters', vm.rightOrigin.x, vm.rightOrigin.y - 20);

  ctx.font = '500 15px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#9cc3ee';
  ctx.fillText('Click enemy grid to fire', vm.rightOrigin.x, vm.rightOrigin.y + vm.cellSize * 8 + 28);
}

function drawBackground(vm) {
  ctx.fillStyle = '#071426';
  ctx.fillRect(0, 0, vm.width, vm.height);
  ctx.fillStyle = '#0d2038';
  ctx.fillRect(20, 20, vm.width - 40, vm.height - 40);
}

function draw() {
  const vm = getViewModel(state);
  if (canvas.width !== vm.width) canvas.width = vm.width;
  if (canvas.height !== vm.height) canvas.height = vm.height;

  drawBackground(vm);
  drawGrid(vm.leftOrigin, vm.cellSize);
  drawGrid(vm.rightOrigin, vm.cellSize);

  drawShips(vm.leftOrigin, vm.cellSize, vm.playerShips, false);
  drawShips(vm.rightOrigin, vm.cellSize, vm.enemyShips, true);

  const playerHits = new Set();
  for (const ship of vm.playerShips) {
    for (const cell of ship.cells) {
      const k = `${cell.x},${cell.y}`;
      if (vm.playerBoardShots.includes(k)) playerHits.add(k);
    }
  }

  const enemyHits = new Set();
  for (const ship of vm.enemyShips) {
    for (const cell of ship.cells) {
      const k = `${cell.x},${cell.y}`;
      if (vm.enemyBoardShots.includes(k)) enemyHits.add(k);
    }
  }

  drawShots(vm.leftOrigin, vm.cellSize, vm.playerBoardShots, playerHits);
  drawShots(vm.rightOrigin, vm.cellSize, vm.enemyBoardShots, enemyHits);
  drawLabels(vm);

  const phaseLabel = vm.phase === 'running' ? 'Running' : vm.phase === 'won' ? 'Victory' : 'Defeat';
  status.textContent = `Score ${vm.score} | Combo ${vm.combo} (best ${vm.bestCombo}) | Hits ${vm.playerHits}/${vm.playerShots} | Turn: ${vm.turn}${vm.paused ? ' (paused)' : ''} | ${phaseLabel}`;

  const eventList = document.getElementById('events');
  eventList.innerHTML = vm.recentEvents.map((event) => `<li>${event}</li>`).join('');
}

function frame(now) {
  const dt = Math.min(100, now - last);
  last = now;
  accumulator += dt;

  while (accumulator >= FIXED_STEP) {
    advanceTime(state, FIXED_STEP);
    accumulator -= FIXED_STEP;
  }

  draw();
  requestAnimationFrame(frame);
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  handlePointer(state, x, y);
  draw();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyP') {
    togglePause(state);
    draw();
    return;
  }

  if (event.code === 'KeyR') {
    resetGame(state);
    draw();
    return;
  }

  if (event.code === 'KeyN' && state.phase !== 'running') {
    resetGame(state);
    draw();
  }
});

window.advanceTime = (ms) => {
  advanceTime(state, ms);
  draw();
};

window.render_game_to_text = () => renderGameToText(state);

requestAnimationFrame(frame);
