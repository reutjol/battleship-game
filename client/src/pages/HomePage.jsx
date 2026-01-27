import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { authAPI } from '../services/api'
import Header from '../components/Header'
import '../styles/HomePage.css';

const HomePage = () => {
  const { user } = useAuth()
  const { createAIGame } = useGame()
  const navigate = useNavigate()

  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  const handlePlayAI = () => {
    createAIGame(user?.id)
    navigate('/game')
  }

  const openLeaderboard = async () => {
    setShowLeaderboard(true)
    setLoadingLeaderboard(true)
    try {
      const data = await authAPI.getLeaderboard(10)
      setLeaderboard(data.players)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    }
    setLoadingLeaderboard(false)
  }

  return (
    <div className="home-page">
        {user && <Header />}
        <h1>Battleship Online</h1>
        <h2>Challenge your friends or the AI to an exciting game of Battleship!</h2>

        {user && (
          <div className="user-stats">
            <span className="wins-badge" onClick={openLeaderboard}>
              🏆 {user.wins || 0} Wins
            </span>
          </div>
        )}

        <div className="game-buttons">
          <button className="btn-play-ai" onClick={handlePlayAI}>
            Play vs AI
          </button>
          <Link to="/lobby">
            <button className="btn-play-friends">Play with Friends</button>
          </Link>
        </div>

        {showLeaderboard && (
          <div className="leaderboard-overlay" onClick={() => setShowLeaderboard(false)}>
            <div className="leaderboard-modal" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowLeaderboard(false)}>✕</button>
              <h2>🏆 Leaderboard</h2>

              {loadingLeaderboard ? (
                <p className="loading-text">Loading...</p>
              ) : leaderboard.length === 0 ? (
                <p className="no-data-text">No wins recorded yet</p>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, index) => (
                      <tr key={player.username} className={player.username === user?.username ? 'current-user' : ''}>
                        <td className="rank">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </td>
                        <td className="player-name">{player.username}</td>
                        <td className="player-wins">{player.wins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
    </div>
    )
}

export default HomePage