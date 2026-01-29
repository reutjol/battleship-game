const { buildBoardWithShips, processAttack, checkWinner } = require('./gameLogic')

const games = new Map()
const playerToGame = new Map()

// Constant ID for AI player
const AI_PLAYER_ID = 'AI_OPPONENT'

// Generate short room code (4 characters)
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Create new game
const createGame = (playerId) => {
  let roomCode = generateRoomCode()

  // Ensure unique code
  while (games.has(roomCode)) {
    roomCode = generateRoomCode()
  }

  const { board, ships } = buildBoardWithShips()

  games.set(roomCode, {
    players: [{
      id: playerId,
      board,
      ships
    }],
    currentTurn: null
  })

  playerToGame.set(playerId, roomCode)

  return {
    roomCode,
    playerNumber: 1,
    board,
    gameStarted: false
  }
}

// Join existing game
const joinGame = (playerId, roomCode) => {
  const code = roomCode.toUpperCase()
  const game = games.get(code)

  if (!game) {
    return { error: 'room-not-found' }
  }

  if (game.players.length >= 2) {
    return { error: 'room-full' }
  }

  const { board, ships } = buildBoardWithShips()

  game.players.push({
    id: playerId,
    board,
    ships
  })

  game.currentTurn = game.players[0].id
  playerToGame.set(playerId, code)

  return {
    roomCode: code,
    playerNumber: 2,
    board,
    gameStarted: true,
    currentTurn: game.currentTurn
  }
}

// Create game against AI
const createAIGame = (playerId) => {
  let roomCode = generateRoomCode()

  // Ensure unique code
  while (games.has(roomCode)) {
    roomCode = generateRoomCode()
  }

  const playerData = buildBoardWithShips()
  const aiData = buildBoardWithShips()

  games.set(roomCode, {
    players: [
      { id: playerId, board: playerData.board, ships: playerData.ships },
      { id: AI_PLAYER_ID, board: aiData.board, ships: aiData.ships }
    ],
    currentTurn: playerId, // Human always goes first
    isAIGame: true
  })

  playerToGame.set(playerId, roomCode)

  return {
    roomCode,
    playerNumber: 1,
    board: playerData.board,
    gameStarted: true,
    currentTurn: playerId,
    isAIGame: true
  }
}

// Check if game is an AI game
const isAIGame = (roomCode) => {
  const game = games.get(roomCode)
  return game?.isAIGame === true
}

// Get player's board (for AI to attack)
const getPlayerBoard = (roomCode, playerId) => {
  const game = games.get(roomCode)
  if (!game) return null
  const player = game.players.find(p => p.id === playerId)
  return player?.board
}

const processGameAttack = (roomCode, attackerId, row, col) => {
  const game = games.get(roomCode)

  if (!game) {
    return { error: 'game-not-found' }
  }

  if (game.currentTurn !== attackerId) {
    return { error: 'not-your-turn' }
  }

  const opponent = game.players.find(p => p.id !== attackerId)
  if (!opponent) {
    return { error: 'opponent-not-found' }
  }

  const result = processAttack(opponent.board, opponent.ships, row, col)

  if (result.error) {
    return result
  }

  const winner = checkWinner(opponent.ships) ? attackerId : null

  // Hit = extra turn, Miss = switch turn
  const nextTurn = winner ? null : (result.hit ? attackerId : opponent.id)
  game.currentTurn = nextTurn

  return {
    ...result,
    nextTurn,
    winner
  }
}

// Count how many ships a player has sunk (on opponent's board)
const countSunkShips = (ships) => {
  return ships.filter(ship => ship.sunk).length
}

// Get disconnect result - returns winner if remaining player was ahead
const getDisconnectResult = (roomCode, disconnectedPlayerId) => {
  const game = games.get(roomCode)
  if (!game || game.players.length < 2) return null

  const disconnectedPlayer = game.players.find(p => p.id === disconnectedPlayerId)
  const remainingPlayer = game.players.find(p => p.id !== disconnectedPlayerId)

  if (!disconnectedPlayer || !remainingPlayer) return null

  // Calculate scores: how many ships each player successfully sunk
  const remainingPlayerScore = countSunkShips(disconnectedPlayer.ships) // ships the remaining player sunk
  const disconnectedPlayerScore = countSunkShips(remainingPlayer.ships) // ships the disconnected player sunk

  // Remaining player wins only if they sunk MORE ships than opponent
  if (remainingPlayerScore > disconnectedPlayerScore) {
    return {
      winner: remainingPlayer.id,
      remainingPlayerScore,
      disconnectedPlayerScore
    }
  }

  // No winner if tied or remaining player was losing
  return null
}

const handleDisconnect = (playerId) => {
  const roomCode = playerToGame.get(playerId)

  if (roomCode) {
    const result = getDisconnectResult(roomCode, playerId)
    playerToGame.delete(playerId)
    games.delete(roomCode)
    return { roomCode, ...result }
  }

  return { roomCode: null }
}

module.exports = {
  createGame,
  createAIGame,
  joinGame,
  processAttack: processGameAttack,
  handleDisconnect,
  isAIGame,
  getPlayerBoard,
  games,
  AI_PLAYER_ID
}
