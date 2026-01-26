const API_URL = 'http://localhost:3001/api'

const getToken = () => localStorage.getItem('token')

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

  getMe: () => authFetch('/auth/me')
}

export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

export const clearToken = () => localStorage.removeItem('token')
