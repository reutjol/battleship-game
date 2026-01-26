import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import '../styles/HomePage.css';

const HomePage = () => {
  const { user } = useAuth()

  return (
    <div className="home-page">
        {user && <Header />}
        <h1>Battleship Online</h1>
        <h2>Challenge your friends to an exciting game of Battleship!</h2>

        {user && (
          <div className="user-stats">
            <span className="wins-badge">🏆 {user.wins || 0} Wins</span>
          </div>
        )}

        <Link to="/lobby">
          <button className="btn-start-game">Start Game</button>
        </Link>
    </div>
    )
}

export default HomePage