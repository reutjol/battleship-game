import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Header.css'

const Header = ({ showBackButton = false, backTo = '/' }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <div className="app-header">
      {showBackButton && (
        <button onClick={() => navigate(backTo)} className="btn-back-nav">
          ← Back
        </button>
      )}
      <span className="header-user-info">Welcome, {user?.username}</span>
      <button onClick={handleLogout} className="btn-logout-nav">Logout</button>
    </div>
  )
}

export default Header
