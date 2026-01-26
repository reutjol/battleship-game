import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import socket from '../services/socket'

const GameContext = createContext()

export const useGame = () => useContext(GameContext)

export const GameProvider = ({ children }) => {
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
  const timerRef = useRef(null)

  useEffect(() => {
    // Game created
    socket.on('game-created', (data) => {
      setRoomCode(data.roomCode)
      setPlayerId(data.playerId)
      setPlayerNumber(data.playerNumber)
      setMyBoard(data.board)
      setGamePhase('waiting')
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
      console.log('Attack result:', {
        hit: data.hit,
        nextTurn: data.nextTurn,
        mySocketId: socket.id,
        isMyTurnNext: data.nextTurn === socket.id
      })
      const isMyAttack = data.attacker === socket.id

      if (isMyAttack) {
        // Update opponent board
        setOpponentBoard(prev => {
          const next = prev.map(row => row.map(cell => ({ ...cell })))

          if (data.sunk && data.sunkCells) {
            // Ship sunk - mark all cells as sunk
            data.sunkCells.forEach(({ row, col }) => {
              next[row][col].status = 'sunk'
              next[row][col].shipIndex = data.shipIndex
            })
          } else if (data.hit) {
            // Hit but not sunk
            next[data.row][data.col].status = 'hit'
            next[data.row][data.col].shipIndex = data.shipIndex
          } else {
            // Miss
            next[data.row][data.col].status = 'miss'
          }

          return next
        })
      } else {
        // Update my board
        setMyBoard(prev => {
          const next = prev.map(row => row.map(cell => ({ ...cell })))

          if (data.sunk && data.sunkCells) {
            // Ship sunk - mark all cells as sunk
            data.sunkCells.forEach(({ row, col }) => {
              next[row][col].status = 'sunk'
            })
          } else if (data.hit) {
            // Hit but not sunk
            next[data.row][data.col].status = 'hit'
          } else {
            // Miss
            next[data.row][data.col].status = 'miss'
          }

          return next
        })
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
    socket.on('opponent-disconnected', () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setTimeLeft(null)
      setWinner('opponent-left')
      setGamePhase('finished')
    })

    // AI Banter
    socket.on('banter', (data) => {
      setBanter(data.line)
      setTimeout(() => setBanter(null), 3000)
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
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
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
    socket.emit('create-game', { userId })
  }

  const joinGame = (code, userId) => {
    setError(null)
    socket.emit('join-game', { roomCode: code, userId })
  }

  const attack = (row, col) => {
    if (!isMyTurn || gamePhase !== 'playing') return
    socket.emit('attack', { roomCode, row, col })
  }

  const leaveGame = () => {
    if (roomCode) {
      socket.emit('leave-game', { roomCode })
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
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
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
      createGame,
      joinGame,
      attack,
      leaveGame,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  )
}
