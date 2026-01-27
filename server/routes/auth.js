const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'battleship-secret-key-change-in-production'

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email ? 'email-exists' : 'username-exists'
      })
    }

    // Create user
    const user = new User({ username, email, password })
    await user.save()

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' })

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        wins: user.wins
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'server-error' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ error: 'invalid-credentials' })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ error: 'invalid-credentials' })
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        wins: user.wins
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'server-error' })
  }
})

// Get leaderboard (top players by wins)
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10

    const players = await User.find({ wins: { $gt: 0 } })
      .sort({ wins: -1 })
      .limit(limit)
      .select('username wins -_id')

    res.json({ players })
  } catch (error) {
    console.error('Leaderboard error:', error)
    res.status(500).json({ error: 'server-error' })
  }
})

// Get current user (with token)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'no-token' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return res.status(404).json({ error: 'user-not-found' })
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        wins: user.wins
      }
    })
  } catch (error) {
    res.status(401).json({ error: 'invalid-token' })
  }
})

module.exports = router
