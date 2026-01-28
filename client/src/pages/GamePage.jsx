import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
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
    isAIGame,
    aiThinking,
    attack,
    leaveGame,
    createAIGame,
    resetGame
  } = useGame()

  const { user, incrementWins } = useAuth()
  const navigate = useNavigate()
  const hasIncrementedWins = useRef(false)

  // Increment wins when player wins (only once)
  useEffect(() => {
    if ((winner === 'you' || winner === 'you-by-disconnect') && !hasIncrementedWins.current) {
      hasIncrementedWins.current = true
      incrementWins()
    }
  }, [winner, incrementWins])

  // Reset the ref when starting a new game
  useEffect(() => {
    if (gamePhase === 'playing') {
      hasIncrementedWins.current = false
    }
  }, [gamePhase])

  const handlePlayAgain = () => {
    resetGame()
    createAIGame(user?.id)
  }

  if (!myBoard) {
    return (
      <div className="game-page">
        <h1>Battleship</h1>
        <p>Loading...</p>
      </div>
    )
  }

  const handleBack = () => {
    leaveGame()
    navigate(isAIGame ? '/' : '/lobby')
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <button onClick={handleBack} className="btn-back">
          ← Back
        </button>
      </div>
        <h1>Battleship {isAIGame && <span className="ai-badge">vs AI</span>}</h1>
      {gamePhase === 'playing' && (
        <div className="game-status">
          <div className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opponent-turn'} ${aiThinking ? 'ai-thinking' : ''}`}>
            {isMyTurn ? 'Your Turn!' : (
              isAIGame ? (aiThinking ? 'AI is thinking...' : "AI's Turn...") : "Opponent's Turn..."
            )}
          </div>
          {timeLeft !== null && isMyTurn && (
            <div className={`timer ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
              ⏱️ {timeLeft}s
            </div>
          )}
        </div>
      )}

      {gamePhase === 'finished' && (
        <div className="game-over">
          <h2>
            {winner === 'you' && '🎉 You Win!'}
            {winner === 'you-by-disconnect' && '🎉 You Win! (Opponent fled while losing)'}
            {winner === 'opponent' && 'You Lost'}
            {winner === 'opponent-left' && 'Opponent Left the Game'}
          </h2>
          {isAIGame && (
            <button onClick={handlePlayAgain} className="btn-play-again">
              Play Again
            </button>
          )}
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
