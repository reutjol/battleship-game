import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import { useLocalStorage } from '../hooks'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [, setToken, removeToken] = useLocalStorage('token', null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on mount - runs only once
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('token')

      if (savedToken) {
        try {
          const data = await authAPI.getMe()
          setUser(data.user)
        } catch (error) {
          // Only remove token if it's actually invalid (not network error)
          if (error.message === 'invalid-token' || error.message === 'no-token') {
            removeToken()
          }
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const register = async (username, email, password) => {
    const data = await authAPI.register(username, email, password)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const login = async (email, password) => {
    const data = await authAPI.login(email, password)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    removeToken()
    setUser(null)
  }

  // Increment wins count locally (after winning a game)
  const incrementWins = () => {
    setUser(prev => prev ? { ...prev, wins: (prev.wins || 0) + 1 } : prev)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      register,
      login,
      logout,
      incrementWins
    }}>
      {children}
    </AuthContext.Provider>
  )
}
