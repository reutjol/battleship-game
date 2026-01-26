import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import '../styles/LobbyPage.css'

const LobbyPage = () => {
  const [joinCode, setJoinCode] = useState('')
  const { roomCode, gamePhase, error, createGame, joinGame, leaveGame } = useGame()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (gamePhase === 'playing') {
      navigate('/game')
    }
  }, [gamePhase, navigate])

  const handleCreate = () => {
    createGame(user?.id)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (joinCode.trim()) {
      joinGame(joinCode.trim(), user?.id)
    }
  }

  return (
    <div className="lobby-page">
      <Header showBackButton={true} backTo="/" />
      <h1>Battleship Online</h1>

      {gamePhase === 'lobby' && (
        <div className="lobby-options">
          <div className="lobby-section">
            <h2>Create New Game</h2>
            <button onClick={handleCreate} className="btn-create">
              Create Room
            </button>
          </div>

          <div className="lobby-section">
            <h2>Join Game</h2>
            <form onSubmit={handleJoin}>
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="input-code"
              />
              <button type="submit" className="btn-join">
                Join
              </button>
            </form>
            {error && <p className="error-message">
              {error === 'room-not-found' ? 'Room not found' : 'Room is full'}
            </p>}
          </div>
        </div>
      )}

      {gamePhase === 'waiting' && (
        <div className="waiting-room">
          <h2>Waiting for opponent...</h2>
          <div className="room-code">
            <p>Room Code:</p>
            <span className="code">{roomCode}</span>
          </div>
          <p className="hint">Share this code with a friend</p>
          <button onClick={leaveGame} className="btn-cancel">
            ← Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default LobbyPage
