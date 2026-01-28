const gameManager = require('../gameManager')
const gameService = require('../services/gameService')
const aiOpponent = require('../aiOpponent')

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

  // Create AI game
  socket.on('create-ai-game', ({ userId }) => {
    const result = gameManager.createAIGame(socket.id)

    gameService.setUserMapping(socket.id, userId)

    socket.join(result.roomCode)
    socket.emit('game-created', {
      roomCode: result.roomCode,
      playerId: socket.id,
      playerNumber: result.playerNumber,
      board: result.board,
      isAIGame: true
    })

    // Game starts immediately for AI games
    socket.emit('game-start', {
      currentTurn: result.currentTurn,
      isAIGame: true
    })

    // Start turn timer for human player
    gameService.startTurnTimer(result.roomCode, result.currentTurn)

    console.log(`AI game created: ${result.roomCode}`)
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
      aiOpponent.clearAIState(roomCode)
    } else if (result.nextTurn) {
      // Check if it's AI's turn
      if (gameManager.isAIGame(roomCode) && result.nextTurn === gameManager.AI_PLAYER_ID) {
        // Schedule AI turn
        gameService.scheduleAITurn(io, roomCode, socket.id)
      } else {
        gameService.startTurnTimer(roomCode, result.nextTurn)
      }
    }

    // Handle banter
    gameService.handleBanterAfterAttack(socket, roomCode, result)
  })

  // Player leaves game voluntarily
  socket.on('leave-game', ({ roomCode }) => {
    console.log('Player left game:', socket.id, 'room:', roomCode)
    gameService.clearTurnTimer(roomCode)
    aiOpponent.clearAIState(roomCode)

    const result = gameManager.handleDisconnect(socket.id)

    // If remaining player was winning, give them the win
    if (result.winner) {
      console.log(`Player ${result.winner} wins by disconnect (${result.remainingPlayerScore}-${result.disconnectedPlayerScore})`)
      gameService.updateWins(result.winner)
      socket.to(roomCode).emit('opponent-disconnected', {
        youWin: true,
        reason: 'opponent-left-losing'
      })
    } else {
      socket.to(roomCode).emit('opponent-disconnected', {
        youWin: false,
        reason: 'opponent-left'
      })
    }

    socket.leave(roomCode)
    gameService.removeUserMapping(socket.id)
  })

  // Player disconnected
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id)
    const result = gameManager.handleDisconnect(socket.id)

    if (result.roomCode) {
      gameService.clearTurnTimer(result.roomCode)
      aiOpponent.clearAIState(result.roomCode)

      // If remaining player was winning, give them the win
      if (result.winner) {
        console.log(`Player ${result.winner} wins by disconnect (${result.remainingPlayerScore}-${result.disconnectedPlayerScore})`)
        gameService.updateWins(result.winner)
        io.to(result.roomCode).emit('opponent-disconnected', {
          youWin: true,
          reason: 'opponent-left-losing'
        })
      } else {
        io.to(result.roomCode).emit('opponent-disconnected', {
          youWin: false,
          reason: 'opponent-left'
        })
      }
    }
    gameService.removeUserMapping(socket.id)
  })
}

module.exports = { registerHandlers }
