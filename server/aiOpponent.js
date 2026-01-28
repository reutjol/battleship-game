const BOARD_SIZE = 10;

// AI state per game room
const aiStates = new Map();

// Get or create AI state for a room
function getOrCreateState(roomCode) {
  if (!aiStates.has(roomCode)) {
    aiStates.set(roomCode, {
      hitCells: [],       // Current unsunk hits
      direction: null     // 'horizontal' | 'vertical' | null
    });
  }
  return aiStates.get(roomCode);
}

// Check if a cell is a valid target (not already attacked)
function isValidTarget(board, row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return false;
  }
  const cell = board[row][col];
  return cell.status === 'empty' || cell.status === 'ship';
}

// Get the ends of the current hit chain in a direction
function getChainEnds(hitCells, direction) {
  if (hitCells.length === 0) return [];

  // Filter hits that are aligned in the given direction
  const firstHit = hitCells[0];
  let alignedHits;

  if (direction === 'horizontal') {
    alignedHits = hitCells.filter(h => h.row === firstHit.row);
  } else {
    alignedHits = hitCells.filter(h => h.col === firstHit.col);
  }

  if (alignedHits.length === 0) return [];

  // Sort by position
  const sorted = [...alignedHits].sort((a, b) =>
    direction === 'horizontal' ? a.col - b.col : a.row - b.row
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const targets = [];

  if (direction === 'horizontal') {
    targets.push({ row: first.row, col: first.col - 1 });
    targets.push({ row: last.row, col: last.col + 1 });
  } else {
    targets.push({ row: first.row - 1, col: first.col });
    targets.push({ row: last.row + 1, col: last.col });
  }

  return targets;
}

// Get all adjacent cells for a hit
function getAdjacentTargets(row, col) {
  return [
    { row: row - 1, col },  // up
    { row: row + 1, col },  // down
    { row, col: col - 1 },  // left
    { row, col: col + 1 }   // right
  ];
}

// Hunt Mode: Use checkerboard pattern for efficient searching
function getHuntMove(board) {
  const huntCells = [];

  // Checkerboard pattern
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 0 && isValidTarget(board, row, col)) {
        huntCells.push({ row, col });
      }
    }
  }

  if (huntCells.length === 0) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (isValidTarget(board, row, col)) {
          huntCells.push({ row, col });
        }
      }
    }
  }

  if (huntCells.length === 0) return null;

  return huntCells[Math.floor(Math.random() * huntCells.length)];
}

// Target Mode: Follow up on hits to sink the ship
function getTargetMove(roomCode, board) {
  const state = getOrCreateState(roomCode);

  if (state.hitCells.length === 0) return null;

  let targets = [];

  // If we know the direction, try chain ends
  if (state.direction && state.hitCells.length >= 2) {
    targets = getChainEnds(state.hitCells, state.direction);
    const validTargets = targets.filter(t => isValidTarget(board, t.row, t.col));

    if (validTargets.length > 0) {
      console.log(`AI: Following direction ${state.direction}`);
      return validTargets[0];
    }

    // Direction is blocked - reset and try adjacent
    console.log(`AI: Direction ${state.direction} blocked, resetting`);
    state.direction = null;
  }

  // Try all adjacent cells of ALL remaining hits
  for (const hit of state.hitCells) {
    const adjacent = getAdjacentTargets(hit.row, hit.col);
    for (const adj of adjacent) {
      if (isValidTarget(board, adj.row, adj.col)) {
        console.log(`AI: Trying adjacent to hit at (${hit.row},${hit.col})`);
        return adj;
      }
    }
  }

  // No valid adjacent cells - clear state (shouldn't happen normally)
  console.log(`AI: No valid targets for ${state.hitCells.length} hits, clearing`);
  state.hitCells = [];
  state.direction = null;
  return null;
}

// Main AI move function
  function getAIMove(roomCode, opponentBoard) {
  const state = getOrCreateState(roomCode);

  console.log(`AI State: ${state.hitCells.length} unsunk hits, direction: ${state.direction}`);

  // ALWAYS check for unsunk hits first
  if (state.hitCells.length > 0) {
    const targetMove = getTargetMove(roomCode, opponentBoard);
    if (targetMove) {
      console.log(`AI Target: (${targetMove.row},${targetMove.col})`);
      return targetMove;
    }
  }

  // Hunt mode
  const huntMove = getHuntMove(opponentBoard);
  console.log(`AI Hunt: (${huntMove?.row},${huntMove?.col})`);
  return huntMove;
}

// Update AI state after an attack result
function updateAIState(roomCode, row, col, result) {
  const state = getOrCreateState(roomCode);

  console.log(`AI Update: (${row},${col}) hit=${result.hit} sunk=${result.sunk}`);

  if (result.hit) {
    if (result.sunk) {
      // Ship sunk! Remove ALL cells of this ship from hitCells
      console.log(`AI: Ship sunk! sunkCells:`, result.sunkCells);

      if (result.sunkCells && result.sunkCells.length > 0) {
        const sunkSet = new Set(result.sunkCells.map(c => `${c.row},${c.col}`));
        const before = state.hitCells.length;
        state.hitCells = state.hitCells.filter(c => !sunkSet.has(`${c.row},${c.col}`));
        console.log(`AI: Removed ${before - state.hitCells.length} cells, ${state.hitCells.length} remaining`);
      }

      // ALWAYS reset direction after sinking - remaining hits might be different ship
      state.direction = null;

      console.log(`AI: After sink - ${state.hitCells.length} unsunk hits remaining`);
    } else {
      // Hit but not sunk - add to tracking
      state.hitCells.push({ row, col });
      console.log(`AI: Added hit, total: ${state.hitCells.length} hits`);

      // Try to detect direction if we have 2+ adjacent hits
      if (state.hitCells.length >= 2 && !state.direction) {
        // Find any two adjacent hits
        for (let i = 0; i < state.hitCells.length; i++) {
          for (let j = i + 1; j < state.hitCells.length; j++) {
            const h1 = state.hitCells[i];
            const h2 = state.hitCells[j];

            if (h1.row === h2.row && Math.abs(h1.col - h2.col) === 1) {
              state.direction = 'horizontal';
              console.log(`AI: Detected HORIZONTAL direction`);
              return;
            }
            if (h1.col === h2.col && Math.abs(h1.row - h2.row) === 1) {
              state.direction = 'vertical';
              console.log(`AI: Detected VERTICAL direction`);
              return;
            }
          }
        }
      }
    }
  } else {
    console.log(`AI: Miss at (${row},${col})`);
  }
}

// Clear AI state for a room
function clearAIState(roomCode) {
  aiStates.delete(roomCode);
}

module.exports = {
  getAIMove,
  updateAIState,
  clearAIState
};
