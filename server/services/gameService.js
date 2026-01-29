const User = require('../models/User')
const gameManager = require('../gameManager')
const aiOpponent = require('../aiOpponent')

// AI thinking delay in milliseconds (for realistic feel)
const AI_THINK_DELAY = 1000

// Track miss streaks per player
const missStreaks = new Map()

// Track socket.id -> MongoDB userId mapping
const socketToUser = new Map()

// Track turn timers per room
const turnTimers = new Map()
const TURN_TIME_LIMIT = 60 // seconds

let io = null

// Initialize with socket.io instance
function init(socketIO) {
  io = socketIO
}

// Start turn timer - player loses if time runs out
function startTurnTimer(roomCode, currentPlayerId) {
  clearTurnTimer(roomCode)

  const timerId = setTimeout(() => {
    const game = gameManager.games.get(roomCode)
    if (game && game.players) {
      const winner = game.players.find(p => p.id !== currentPlayerId)
      if (winner) {
        updateWins(winner.id)

        io.to(roomCode).emit('game-over-timeout', {
          loser: currentPlayerId,
          winner: winner.id
        })
      }
    }

    turnTimers.delete(roomCode)
  }, TURN_TIME_LIMIT * 1000)

  turnTimers.set(roomCode, timerId)

  io.to(roomCode).emit('turn-timer-start', {
    currentPlayer: currentPlayerId,
    timeLimit: TURN_TIME_LIMIT
  })
}

function clearTurnTimer(roomCode) {
  const timerId = turnTimers.get(roomCode)
  if (timerId) {
    clearTimeout(timerId)
    turnTimers.delete(roomCode)
  }
}

// Update wins in database
function updateWins(socketId) {
  const userId = socketToUser.get(socketId)
  if (userId) {
    User.findByIdAndUpdate(userId, { $inc: { wins: 1 } })
      .catch(err => console.error('Failed to update wins:', err))
  }
}

// Track user mapping
function setUserMapping(socketId, userId) {
  if (userId) {
    socketToUser.set(socketId, userId)
  }
}

function removeUserMapping(socketId) {
  socketToUser.delete(socketId)
}

// Fetch AI banter
async function fetchBanter(event, streakCount = 0) {
  const eventDescriptions = {
    'win': 'Player won the game - celebrate!',
    'lose': 'Player lost the game - be encouraging',
    'sunk': 'Player sunk an enemy ship - excited reaction',
    'miss_streak': `Player missed ${streakCount} times in a row - give funny motivation`
  }

  const prompt = `You write short, friendly game banter for a battleship game.
Return EXACTLY one line, max 10 words. Language: English. Tone: funny and encouraging.
Context: ${eventDescriptions[event] || event}`

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      )
      const data = await response.json()

      if (data.error) {
        console.error('Gemini error:', data.error.message)
        return null
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    }
    
    return null
  } catch (e) {
    console.error('Banter fetch error:', e.message)
    return null
  }
}

// Handle banter logic after attack
function handleBanterAfterAttack(socket, roomCode, result) {
  const playerId = socket.id
  let shouldTriggerBanter = false
  let banterEvent = null
  let streakCount = 0

  if (result.winner) {
    // No banter for win/lose to save API calls
    missStreaks.delete(playerId)
  } else if (result.sunk) {
    banterEvent = 'sunk'
    shouldTriggerBanter = true
    missStreaks.set(playerId, 0)
  } else if (result.hit) {
    missStreaks.set(playerId, 0)
  } else {
    const currentStreak = (missStreaks.get(playerId) || 0) + 1
    missStreaks.set(playerId, currentStreak)
    streakCount = currentStreak

    // Changed from 5 to 10 misses to reduce API calls
    if (currentStreak >= 10) {
      banterEvent = 'miss_streak'
      shouldTriggerBanter = true
      missStreaks.set(playerId, 0)
    }
  }

  if (shouldTriggerBanter) {
    fetchBanter(banterEvent, streakCount).then(line => {
      if (line) {
        if (banterEvent === 'win' || banterEvent === 'sunk' || banterEvent === 'miss_streak') {
          socket.emit('banter', { line })
        } else if (banterEvent === 'lose') {
          const game = gameManager.games.get(roomCode)
          if (game && game.players) {
            const loser = game.players.find(p => p.id !== playerId)
            if (loser) {
              io.to(loser.id).emit('banter', { line })
            }
          }
        }
      }
    })
  }
}

// Schedule AI turn with delay for realistic gameplay
function scheduleAITurn(socketIO, roomCode, humanPlayerId) {
  const game = gameManager.games.get(roomCode)
  if (!game || !game.isAIGame) return

  // Notify client that AI is "thinking"
  socketIO.to(roomCode).emit('ai-thinking', { delay: AI_THINK_DELAY })

  setTimeout(() => {
    executeAITurn(socketIO, roomCode, humanPlayerId)
  }, AI_THINK_DELAY)
}

// Execute AI's turn
function executeAITurn(socketIO, roomCode, humanPlayerId) {
  const game = gameManager.games.get(roomCode)
  if (!game || !game.isAIGame) return
  if (game.currentTurn !== gameManager.AI_PLAYER_ID) return

  const humanPlayer = game.players.find(p => p.id === humanPlayerId)
  if (!humanPlayer) return

  // Get AI move
  const move = aiOpponent.getAIMove(roomCode, humanPlayer.board)
  if (!move) {
    console.error('AI could not find a valid move')
    return
  }

  // Process AI attack
  const result = gameManager.processAttack(roomCode, gameManager.AI_PLAYER_ID, move.row, move.col)

  if (result.error) {
    console.error('AI attack error:', result.error)
    return
  }

  // Update AI targeting state
  aiOpponent.updateAIState(roomCode, move.row, move.col, result)

  // Broadcast result
  socketIO.to(roomCode).emit('attack-result', {
    attacker: gameManager.AI_PLAYER_ID,
    row: move.row,
    col: move.col,
    hit: result.hit,
    sunk: result.sunk,
    shipIndex: result.shipIndex,
    sunkCells: result.sunkCells,
    nextTurn: result.nextTurn,
    winner: result.winner,
    isAIAttack: true
  })

  if (result.winner) {
    clearTurnTimer(roomCode)
    aiOpponent.clearAIState(roomCode)

    // Update human stats if human won
    if (result.winner === humanPlayerId) {
      updateWins(humanPlayerId)
    }
  } else if (result.nextTurn === gameManager.AI_PLAYER_ID) {
    // AI gets another turn (hit)
    scheduleAITurn(socketIO, roomCode, humanPlayerId)
  } else {
    // Human's turn
    startTurnTimer(roomCode, humanPlayerId)
  }
}

module.exports = {
  init,
  startTurnTimer,
  clearTurnTimer,
  updateWins,
  setUserMapping,
  removeUserMapping,
  fetchBanter,
  handleBanterAfterAttack,
  scheduleAITurn,
  executeAITurn
}
