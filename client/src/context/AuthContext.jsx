import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, setToken, clearToken } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const data = await authAPI.getMe()
          setUser(data.user)
        } catch (error) {
          clearToken()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

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
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      register,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}
