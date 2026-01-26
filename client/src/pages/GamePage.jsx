import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import PlayerBoard from '../components/PlayerBoard'
import OpponentBoard from '../components/OpponentBoard'
import '../styles/GamePage.css'

const GamePage = () => {
  const {
    myBoard,
    opponentBoard,
    isMyTurn,
    gamePhase,
    winner,
    banter,
    timeLeft,
    attack,
    leaveGame
  } = useGame()

  const navigate = useNavigate()

  if (!myBoard) {
    return (
      <div className="game-page">
        <h1>Battleship</h1>
        <p>Loading...</p>
      </div>
    )
  }

  const handleBackToLobby = () => {
    leaveGame()
    navigate('/lobby')
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>Battleship</h1>
        <button onClick={handleBackToLobby} className="btn-back">
          ← Back to Lobby
        </button>
      </div>

      {gamePhase === 'playing' && (
        <div className="game-status">
          <div className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
            {isMyTurn ? 'Your Turn!' : "Opponent's Turn..."}
          </div>
          {timeLeft !== null && (
            <div className={`timer ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
              ⏱️ {timeLeft}s
            </div>
          )}
        </div>
      )}

      {gamePhase === 'finished' && (
        <div className="game-over">
          <h2>
            {winner === 'you' && 'You Win!'}
            {winner === 'opponent' && 'You Lost'}
            {winner === 'opponent-left' && 'Opponent Left the Game'}
          </h2>
        </div>
      )}

      <div className="boards">
        <PlayerBoard board={myBoard} />
        <OpponentBoard
          board={opponentBoard}
          onAttack={attack}
          disabled={!isMyTurn || gamePhase !== 'playing'}
        />
      </div>

      {banter && (
        <div className="banter-bubble">
          {banter}
        </div>
      )}
    </div>
  )
}

export default GamePage
