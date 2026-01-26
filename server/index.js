require('dotenv').config()

const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const connectDB = require('./config/db')
const authRoutes = require('./routes/auth')
const banterRoutes = require('./routes/banter')
const gameService = require('./services/gameService')
const { registerHandlers } = require('./handlers/socketHandlers')

// Connect to MongoDB
connectDB()

const app = express()
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/ai', banterRoutes)

// Socket.IO setup
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173' }
})

// Initialize game service with io
gameService.init(io)

// Register socket handlers
io.on('connection', (socket) => {
  registerHandlers(io, socket)
})

// Start server
httpServer.listen(3001, () => {
  console.log('Server running on port 3001')
})
