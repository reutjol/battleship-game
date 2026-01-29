const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const getToken = () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null

    // Try to parse as JSON (new format)
    try {
      return JSON.parse(token)
    } catch {
      // Return raw token (old format)
      return token
    }
  } catch {
    return null
  }
}

const authFetch = async (endpoint, options = {}) => {
  const token = getToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export const authAPI = {
  register: (username, email, password) =>
    authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    }),

  login: (email, password) =>
    authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getMe: () => authFetch('/auth/me'),

  getLeaderboard: (limit = 10) => authFetch(`/auth/leaderboard?limit=${limit}`)
}

export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

export const clearToken = () => localStorage.removeItem('token')
