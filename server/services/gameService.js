const User = require('../models/User')
const gameManager = require('../gameManager')

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
    console.log(`Time's up for player ${currentPlayerId} in room ${roomCode}`)

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
      .then(() => console.log('Updated wins for user:', userId))
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
    'miss_streak': `Player missed ${streakCount} times in a row - give funny motivation to keep trying`
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

    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
          max_tokens: 40
        })
      })
      const data = await response.json()
      return data.choices?.[0]?.message?.content?.trim() || null
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
    banterEvent = result.winner === playerId ? 'win' : 'lose'
    shouldTriggerBanter = true
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

    if (currentStreak >= 5) {
      banterEvent = 'miss_streak'
      shouldTriggerBanter = true
      missStreaks.set(playerId, 0)
    }
  }

  if (shouldTriggerBanter) {
    fetchBanter(banterEvent, streakCount).then(line => {
      if (line) {
        console.log(`Banter [${banterEvent}]:`, line)

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

module.exports = {
  init,
  startTurnTimer,
  clearTurnTimer,
  updateWins,
  setUserMapping,
  removeUserMapping,
  fetchBanter,
  handleBanterAfterAttack
}
