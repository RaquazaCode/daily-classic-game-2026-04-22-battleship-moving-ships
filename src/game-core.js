const GRID_SIZE = 8;
const CELL_SIZE = 56;
const BOARD_GAP = 80;
const STEP_MS = 50;

const LEFT_BOARD_ORIGIN = { x: 56, y: 124 };
const RIGHT_BOARD_ORIGIN = {
  x: LEFT_BOARD_ORIGIN.x + GRID_SIZE * CELL_SIZE + BOARD_GAP,
  y: LEFT_BOARD_ORIGIN.y
};

const PLAYER_SHIPS = [
  { id: "P-Battleship", length: 4, cells: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
  { id: "P-Cruiser", length: 3, cells: [{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }] },
  { id: "P-Destroyer", length: 2, cells: [{ x: 2, y: 6 }, { x: 3, y: 6 }] }
];

const ENEMY_SHIPS = [
  { id: "E-Battleship", length: 4, cells: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }] },
  { id: "E-Cruiser", length: 3, cells: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }] },
  { id: "E-Destroyer", length: 2, cells: [{ x: 5, y: 7 }, { x: 6, y: 7 }] }
];

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function key(x, y) {
  return `${x},${y}`;
}

function cloneShips(base) {
  return base.map((ship) => ({
    id: ship.id,
    length: ship.length,
    cells: ship.cells.map((cell) => ({ ...cell })),
    hits: new Set()
  }));
}

function createBoard(baseShips) {
  return {
    ships: cloneShips(baseShips),
    shots: new Set()
  };
}

function listShipCells(ships) {
  const occupied = new Set();
  for (const ship of ships) {
    for (const cell of ship.cells) occupied.add(key(cell.x, cell.y));
  }
  return occupied;
}

function shipAt(board, x, y) {
  for (const ship of board.ships) {
    if (ship.cells.some((cell) => cell.x === x && cell.y === y)) return ship;
  }
  return null;
}

function isSunk(ship) {
  return ship.hits.size >= ship.length;
}

function allShipsSunk(board) {
  return board.ships.every((ship) => isSunk(ship));
}

function inside(x, y) {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

function boardCoordFromPointer(x, y, origin) {
  const relX = x - origin.x;
  const relY = y - origin.y;
  if (relX < 0 || relY < 0) return null;
  const gx = Math.floor(relX / CELL_SIZE);
  const gy = Math.floor(relY / CELL_SIZE);
  if (!inside(gx, gy)) return null;
  return { x: gx, y: gy };
}

function createEnemyTargetPattern() {
  const pattern = [];
  for (let parity = 0; parity < 2; parity += 1) {
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if ((x + y) % 2 === parity) pattern.push({ x, y });
      }
    }
  }
  return pattern;
}

function directionCandidates(random) {
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ];
  const start = Math.floor(random() * dirs.length);
  return dirs.map((_, idx) => dirs[(start + idx) % dirs.length]);
}

function canMoveShip(ship, dx, dy, occupiedWithoutSelf, blockedShots) {
  for (const cell of ship.cells) {
    const nx = cell.x + dx;
    const ny = cell.y + dy;
    if (!inside(nx, ny)) return false;
    const k = key(nx, ny);
    if (occupiedWithoutSelf.has(k)) return false;
    if (blockedShots.has(k)) return false;
  }
  return true;
}

function moveShips(board, incomingShots, random) {
  const occupied = listShipCells(board.ships);
  let moved = 0;

  for (const ship of board.ships) {
    if (isSunk(ship) || ship.hits.size > 0) continue;

    const selfCells = new Set(ship.cells.map((cell) => key(cell.x, cell.y)));
    const occupiedWithoutSelf = new Set([...occupied].filter((cellKey) => !selfCells.has(cellKey)));

    const candidates = directionCandidates(random);
    let applied = false;
    for (const dir of candidates) {
      if (!canMoveShip(ship, dir.dx, dir.dy, occupiedWithoutSelf, incomingShots)) continue;
      for (const cell of ship.cells) {
        occupied.delete(key(cell.x, cell.y));
      }
      for (const cell of ship.cells) {
        cell.x += dir.dx;
        cell.y += dir.dy;
      }
      for (const cell of ship.cells) {
        occupied.add(key(cell.x, cell.y));
      }
      moved += 1;
      applied = true;
      break;
    }

    if (!applied) {
      continue;
    }
  }

  return moved;
}

function fireAt(attacker, defenderBoard, x, y, state) {
  if (!inside(x, y)) return { ok: false, reason: "out_of_bounds" };
  const shotKey = key(x, y);
  if (defenderBoard.shots.has(shotKey)) return { ok: false, reason: "already_targeted" };

  defenderBoard.shots.add(shotKey);
  const ship = shipAt(defenderBoard, x, y);
  if (!ship) {
    if (attacker === "player") {
      state.combo = 0;
      state.score = Math.max(0, state.score - 20);
      state.playerShots += 1;
    } else {
      state.enemyShots += 1;
    }
    state.lastEvents.unshift(`${attacker} missed at ${x},${y}`);
    state.lastEvents = state.lastEvents.slice(0, 8);
    return { ok: true, outcome: "miss" };
  }

  ship.hits.add(shotKey);
  const sunk = isSunk(ship);

  if (attacker === "player") {
    state.playerShots += 1;
    state.playerHits += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += 100;
    if (sunk) state.score += 250;
  } else {
    state.enemyShots += 1;
    state.enemyHits += 1;
  }

  state.lastEvents.unshift(`${attacker} ${sunk ? "sunk" : "hit"} ${ship.id} at ${x},${y}`);
  state.lastEvents = state.lastEvents.slice(0, 8);

  if (allShipsSunk(defenderBoard)) {
    state.phase = attacker === "player" ? "won" : "lost";
    state.paused = true;
  }

  return { ok: true, outcome: sunk ? "sunk" : "hit", shipId: ship.id };
}

function enqueueEnemyNeighbors(state, x, y) {
  const points = [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];

  for (const point of points) {
    if (!inside(point.x, point.y)) continue;
    const targetKey = key(point.x, point.y);
    if (state.playerBoard.shots.has(targetKey)) continue;
    if (state.enemyTargetQueue.some((p) => p.x === point.x && p.y === point.y)) continue;
    state.enemyTargetQueue.push(point);
  }
}

function pickEnemyTarget(state) {
  while (state.enemyTargetQueue.length > 0) {
    const next = state.enemyTargetQueue.shift();
    if (!state.playerBoard.shots.has(key(next.x, next.y))) {
      return next;
    }
  }

  for (const point of state.enemySearchPattern) {
    if (!state.playerBoard.shots.has(key(point.x, point.y))) {
      return point;
    }
  }

  return null;
}

function runEnemyTurn(state) {
  const target = pickEnemyTarget(state);
  if (!target) {
    state.phase = "won";
    state.paused = true;
    return;
  }

  const result = fireAt("enemy", state.playerBoard, target.x, target.y, state);
  if (result.ok && (result.outcome === "hit" || result.outcome === "sunk")) {
    enqueueEnemyNeighbors(state, target.x, target.y);
  }

  const playerMoved = moveShips(state.playerBoard, state.enemyBoard.shots, state.random);
  const enemyMoved = moveShips(state.enemyBoard, state.playerBoard.shots, state.random);
  if (playerMoved + enemyMoved > 0) {
    state.lastEvents.unshift(`twist moved ships: player=${playerMoved} enemy=${enemyMoved}`);
    state.lastEvents = state.lastEvents.slice(0, 8);
  }

  if (state.phase === "running") {
    state.turn = "player";
    state.pendingEnemyTurnMs = null;
  }
}

export function createGame() {
  const random = lcg(0x4254544c);
  return {
    tick: 0,
    phase: "running",
    paused: false,
    turn: "player",
    score: 0,
    combo: 0,
    bestCombo: 0,
    playerShots: 0,
    enemyShots: 0,
    playerHits: 0,
    enemyHits: 0,
    pendingEnemyTurnMs: null,
    lastEvents: ["Battle started"],
    random,
    playerBoard: createBoard(PLAYER_SHIPS),
    enemyBoard: createBoard(ENEMY_SHIPS),
    enemySearchPattern: createEnemyTargetPattern(),
    enemyTargetQueue: []
  };
}

export function resetGame(state) {
  const fresh = createGame();
  Object.assign(state, fresh);
}

export function togglePause(state) {
  if (state.phase !== "running") return state.paused;
  state.paused = !state.paused;
  return state.paused;
}

export function playerFire(state, x, y) {
  if (state.phase !== "running") return { ok: false, reason: "game_over" };
  if (state.turn !== "player") return { ok: false, reason: "wait_for_enemy" };

  const result = fireAt("player", state.enemyBoard, x, y, state);
  if (!result.ok) return result;

  if (state.phase === "running") {
    state.turn = "enemy";
    state.pendingEnemyTurnMs = 650;
  }

  return result;
}

export function handlePointer(state, x, y) {
  const cell = boardCoordFromPointer(x, y, RIGHT_BOARD_ORIGIN);
  if (!cell) return "outside_enemy_board";
  const result = playerFire(state, cell.x, cell.y);
  if (!result.ok) return result.reason;
  return result.outcome;
}

export function advanceTime(state, ms) {
  const total = Math.max(0, Math.floor(ms));
  if (state.paused || state.phase !== "running" || total === 0) return;

  let remaining = total;
  while (remaining > 0 && !state.paused && state.phase === "running") {
    const dt = Math.min(STEP_MS, remaining);
    state.tick += dt;

    if (state.pendingEnemyTurnMs != null) {
      state.pendingEnemyTurnMs -= dt;
      if (state.pendingEnemyTurnMs <= 0) {
        runEnemyTurn(state);
      }
    }

    remaining -= dt;
  }
}

function charForCell(board, x, y, revealShips) {
  const shot = board.shots.has(key(x, y));
  const ship = shipAt(board, x, y);

  if (shot && ship) return "X";
  if (shot && !ship) return "o";
  if (revealShips && ship) return "S";
  return ".";
}

function boardToLines(board, revealShips) {
  const lines = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    let row = "";
    for (let x = 0; x < GRID_SIZE; x += 1) {
      row += charForCell(board, x, y, revealShips);
    }
    lines.push(row);
  }
  return lines;
}

function sunkCount(board) {
  return board.ships.filter((ship) => isSunk(ship)).length;
}

export function renderGameToText(state) {
  return [
    `phase=${state.phase}`,
    `paused=${state.paused}`,
    `tick=${state.tick}`,
    `turn=${state.turn}`,
    `score=${state.score}`,
    `combo=${state.combo}`,
    `bestCombo=${state.bestCombo}`,
    `player_shots=${state.playerShots}`,
    `player_hits=${state.playerHits}`,
    `enemy_shots=${state.enemyShots}`,
    `enemy_hits=${state.enemyHits}`,
    `pending_enemy_turn_ms=${state.pendingEnemyTurnMs ?? 0}`,
    `enemy_ships_sunk=${sunkCount(state.enemyBoard)}/${state.enemyBoard.ships.length}`,
    `player_ships_sunk=${sunkCount(state.playerBoard)}/${state.playerBoard.ships.length}`,
    "enemy_board_public:",
    ...boardToLines(state.enemyBoard, false),
    "player_board_public:",
    ...boardToLines(state.playerBoard, true),
    "recent_events:",
    ...state.lastEvents
  ].join("\n");
}

function shipView(ship) {
  return {
    id: ship.id,
    length: ship.length,
    cells: ship.cells.map((cell) => ({ ...cell })),
    sunk: isSunk(ship),
    hits: ship.hits.size
  };
}

export function getViewModel(state) {
  return {
    width: RIGHT_BOARD_ORIGIN.x + GRID_SIZE * CELL_SIZE + LEFT_BOARD_ORIGIN.x,
    height: LEFT_BOARD_ORIGIN.y + GRID_SIZE * CELL_SIZE + 120,
    cellSize: CELL_SIZE,
    leftOrigin: LEFT_BOARD_ORIGIN,
    rightOrigin: RIGHT_BOARD_ORIGIN,
    phase: state.phase,
    paused: state.paused,
    turn: state.turn,
    score: state.score,
    combo: state.combo,
    bestCombo: state.bestCombo,
    playerShots: state.playerShots,
    enemyShots: state.enemyShots,
    playerHits: state.playerHits,
    enemyHits: state.enemyHits,
    playerShips: state.playerBoard.ships.map(shipView),
    enemyShips: state.enemyBoard.ships.map(shipView),
    playerBoardShots: [...state.playerBoard.shots],
    enemyBoardShots: [...state.enemyBoard.shots],
    recentEvents: [...state.lastEvents]
  };
}
