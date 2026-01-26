const gameManager = require('../gameManager')
const gameService = require('../services/gameService')

function registerHandlers(io, socket) {
  console.log('Player connected:', socket.id)

  // Create new game
  socket.on('create-game', ({ userId }) => {
    const result = gameManager.createGame(socket.id)

    gameService.setUserMapping(socket.id, userId)

    socket.join(result.roomCode)
    socket.emit('game-created', {
      roomCode: result.roomCode,
      playerId: socket.id,
      playerNumber: result.playerNumber,
      board: result.board
    })

    console.log(`Room created: ${result.roomCode}`)
  })

  // Join existing game
  socket.on('join-game', ({ roomCode, userId }) => {
    const result = gameManager.joinGame(socket.id, roomCode)

    if (result.error) {
      socket.emit('join-error', { error: result.error })
      return
    }

    gameService.setUserMapping(socket.id, userId)

    socket.join(result.roomCode)
    socket.emit('game-joined', {
      roomCode: result.roomCode,
      playerId: socket.id,
      playerNumber: result.playerNumber,
      board: result.board
    })

    console.log(`Player joined room: ${result.roomCode}`)

    // Game starts
    io.to(result.roomCode).emit('game-start', {
      currentTurn: result.currentTurn
    })
    console.log('Game started!')

    // Start turn timer for the first player
    gameService.startTurnTimer(result.roomCode, result.currentTurn)
  })

  // Player attacks
  socket.on('attack', ({ roomCode, row, col }) => {
    console.log(`Attack in room ${roomCode}: ${row},${col}`)
    const result = gameManager.processAttack(roomCode, socket.id, row, col)

    if (result.error) {
      socket.emit('attack-error', { error: result.error })
      return
    }

    io.to(roomCode).emit('attack-result', {
      attacker: socket.id,
      row,
      col,
      hit: result.hit,
      sunk: result.sunk,
      shipIndex: result.shipIndex,
      sunkCells: result.sunkCells,
      nextTurn: result.nextTurn,
      winner: result.winner
    })

    if (result.winner) {
      console.log('Winner:', result.winner)
      gameService.clearTurnTimer(roomCode)
      gameService.updateWins(result.winner)
    } else if (result.nextTurn) {
      gameService.startTurnTimer(roomCode, result.nextTurn)
    }

    // Handle banter
    gameService.handleBanterAfterAttack(socket, roomCode, result)
  })

  // Player leaves game voluntarily
  socket.on('leave-game', ({ roomCode }) => {
    console.log('Player left game:', socket.id, 'room:', roomCode)
    gameService.clearTurnTimer(roomCode)
    socket.to(roomCode).emit('opponent-disconnected')
    socket.leave(roomCode)
    gameManager.handleDisconnect(socket.id)
    gameService.removeUserMapping(socket.id)
  })

  // Player disconnected
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id)
    const roomCode = gameManager.handleDisconnect(socket.id)

    if (roomCode) {
      gameService.clearTurnTimer(roomCode)
      io.to(roomCode).emit('opponent-disconnected')
    }
    gameService.removeUserMapping(socket.id)
  })
}

module.exports = { registerHandlers }
