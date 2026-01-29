import { createContext, useContext, useState, useEffect, useRef } from 'react'
import socket from '../services/socket'
import { useSocket } from '../hooks'

const GameContext = createContext()

export const useGame = () => useContext(GameContext)

export const GameProvider = ({ children }) => {
  const { isConnected, emit } = useSocket()
  const [roomCode, setRoomCode] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [playerNumber, setPlayerNumber] = useState(null)
  const [myBoard, setMyBoard] = useState(null)
  const [opponentBoard, setOpponentBoard] = useState(null)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [gamePhase, setGamePhase] = useState('lobby') // lobby, waiting, playing, finished
  const [winner, setWinner] = useState(null)
  const [error, setError] = useState(null)
  const [banter, setBanter] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [isAIGame, setIsAIGame] = useState(false)
  const [aiThinking, setAIThinking] = useState(false)
  const timerRef = useRef(null)
  const banterTimeoutRef = useRef(null)
  const aiThinkingTimeoutRef = useRef(null)

  useEffect(() => {
    // Game created
    socket.on('game-created', (data) => {
      setRoomCode(data.roomCode)
      setPlayerId(data.playerId)
      setPlayerNumber(data.playerNumber)
      setMyBoard(data.board)
      setIsAIGame(data.isAIGame || false)
      setGamePhase(data.isAIGame ? 'playing' : 'waiting')
      initOpponentBoard()
    })

    // Joined game
    socket.on('game-joined', (data) => {
      setRoomCode(data.roomCode)
      setPlayerId(data.playerId)
      setPlayerNumber(data.playerNumber)
      setMyBoard(data.board)
      initOpponentBoard()
    })

    // Join error
    socket.on('join-error', (data) => {
      setError(data.error)
    })

    // Game starts
    socket.on('game-start', (data) => {
      setGamePhase('playing')
      setIsMyTurn(data.currentTurn === socket.id)
    })

    // Attack result
    socket.on('attack-result', (data) => {
      const isMyAttack = data.attacker === socket.id

      // Helper to update board with attack result
      const applyAttackToBoard = (board, includeShipIndex) => {
        const next = board.map(row => row.map(cell => ({ ...cell })))

        if (data.sunk && data.sunkCells) {
          data.sunkCells.forEach(({ row, col }) => {
            next[row][col].status = 'sunk'
            if (includeShipIndex) next[row][col].shipIndex = data.shipIndex
          })
        } else if (data.hit) {
          next[data.row][data.col].status = 'hit'
          if (includeShipIndex) next[data.row][data.col].shipIndex = data.shipIndex
        } else {
          next[data.row][data.col].status = 'miss'
        }

        return next
      }

      if (isMyAttack) {
        setOpponentBoard(prev => applyAttackToBoard(prev, true))
      } else {
        setMyBoard(prev => applyAttackToBoard(prev, false))
      }

      // Update turn
      setIsMyTurn(data.nextTurn === socket.id)

      // Check winner
      if (data.winner) {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        setTimeLeft(null)
        setWinner(data.winner === socket.id ? 'you' : 'opponent')
        setGamePhase('finished')
      }
    })

    // Opponent disconnected
    socket.on('opponent-disconnected', (data) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setTimeLeft(null)
      // If you were winning when opponent left, you get the win
      if (data?.youWin) {
        setWinner('you-by-disconnect')
      } else {
        setWinner('opponent-left')
      }
      setGamePhase('finished')
    })

    // AI Banter
    socket.on('banter', (data) => {
      setBanter(data.line)
      if (banterTimeoutRef.current) clearTimeout(banterTimeoutRef.current)
      banterTimeoutRef.current = setTimeout(() => setBanter(null), 3000)
    })

    // Turn timer started
    socket.on('turn-timer-start', (data) => {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      setTimeLeft(data.timeLimit)

      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

    // Game over due to timeout
    socket.on('game-over-timeout', (data) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setTimeLeft(null)
      setWinner(data.winner === socket.id ? 'you' : 'opponent')
      setGamePhase('finished')
    })

    // AI is thinking
    socket.on('ai-thinking', (data) => {
      setAIThinking(true)
      if (aiThinkingTimeoutRef.current) clearTimeout(aiThinkingTimeoutRef.current)
      aiThinkingTimeoutRef.current = setTimeout(() => setAIThinking(false), data.delay)
    })

    return () => {
      socket.off('game-created')
      socket.off('game-joined')
      socket.off('join-error')
      socket.off('game-start')
      socket.off('attack-result')
      socket.off('opponent-disconnected')
      socket.off('banter')
      socket.off('turn-timer-start')
      socket.off('game-over-timeout')
      socket.off('ai-thinking')
      if (timerRef.current) clearInterval(timerRef.current)
      if (banterTimeoutRef.current) clearTimeout(banterTimeoutRef.current)
      if (aiThinkingTimeoutRef.current) clearTimeout(aiThinkingTimeoutRef.current)
    }
  }, [])

  const initOpponentBoard = () => {
    const board = Array.from({ length: 10 }, (_, row) =>
      Array.from({ length: 10 }, (_, col) => ({
        row,
        col,
        status: 'empty'
      }))
    )
    setOpponentBoard(board)
  }

  const createGame = (userId) => {
    emit('create-game', { userId })
  }

  const createAIGame = (userId) => {
    emit('create-ai-game', { userId })
  }

  const joinGame = (code, userId) => {
    setError(null)
    emit('join-game', { roomCode: code, userId })
  }

  const attack = (row, col) => {
    if (!isMyTurn || gamePhase !== 'playing') return
    emit('attack', { roomCode, row, col })
  }

  const leaveGame = () => {
    if (roomCode) {
      emit('leave-game', { roomCode })
    }
    resetGame()
  }

  const resetGame = () => {
    setRoomCode(null)
    setPlayerId(null)
    setPlayerNumber(null)
    setMyBoard(null)
    setOpponentBoard(null)
    setIsMyTurn(false)
    setGamePhase('lobby')
    setWinner(null)
    setError(null)
    setTimeLeft(null)
    setIsAIGame(false)
    setAIThinking(false)
    setBanter(null)
    if (timerRef.current) clearInterval(timerRef.current)
    if (banterTimeoutRef.current) clearTimeout(banterTimeoutRef.current)
    if (aiThinkingTimeoutRef.current) clearTimeout(aiThinkingTimeoutRef.current)
  }

  return (
    <GameContext.Provider value={{
      roomCode,
      playerId,
      playerNumber,
      myBoard,
      opponentBoard,
      isMyTurn,
      gamePhase,
      winner,
      error,
      banter,
      timeLeft,
      isConnected,
      isAIGame,
      aiThinking,
      createGame,
      createAIGame,
      joinGame,
      attack,
      leaveGame,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  )
}
