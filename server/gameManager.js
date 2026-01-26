const { buildBoardWithShips, processAttack, checkWinner } = require('./gameLogic')

const games = new Map()
const playerToGame = new Map()

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

  console.log('Turn logic:', { hit: result.hit, attackerId, opponentId: opponent.id, nextTurn })

  return {
    ...result,
    nextTurn,
    winner
  }
}

const handleDisconnect = (playerId) => {
  const roomCode = playerToGame.get(playerId)

  if (roomCode) {
    playerToGame.delete(playerId)
    games.delete(roomCode)
    return roomCode
  }

  return null
}

module.exports = {
  createGame,
  joinGame,
  processAttack: processGameAttack,
  handleDisconnect,
  games
}
