import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { BrowserService } from './services/BrowserService'
import { AIOrchestrator } from './services/AIOrchestrator'
import { SessionManager } from './services/SessionManager'
import { VoiceService } from './services/VoiceService'
import { ClientToServerEvents, ServerToClientEvents } from '../types'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

// Services
const browserService = new BrowserService()
const aiOrchestrator = new AIOrchestrator()
const sessionManager = new SessionManager()
const voiceService = new VoiceService()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}))
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      browser: browserService.isHealthy(),
      ai: aiOrchestrator.isHealthy(),
      sessions: sessionManager.getActiveSessionCount()
    }
  })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('start-demo', async (data) => {
    try {
      console.log('Starting demo for:', data.website)
      
      // Create session
      const session = await sessionManager.createSession(data.sessionId, data.website)
      
      // Start browser
      await browserService.startDemo(data.sessionId, data.website)
      
      // Update session status
      await sessionManager.updateSessionStatus(data.sessionId, 'running')
      
      socket.emit('demo-started', { 
        sessionId: data.sessionId, 
        website: data.website 
      })
      
    } catch (error) {
      console.error('Error starting demo:', error)
      socket.emit('error', { 
        message: 'Failed to start demo',
        sessionId: data.sessionId 
      })
    }
  })

  socket.on('voice-command', async (data) => {
    try {
      console.log('Processing voice command:', data.command)
      
      // Process command with AI
      const response = await aiOrchestrator.processCommand(
        data.command, 
        data.sessionId,
        browserService
      )
      
      // Update session with command and response
      await sessionManager.addTranscriptEntry(data.sessionId, {
        speaker: 'user',
        content: data.command,
        type: 'voice'
      })
      
      await sessionManager.addTranscriptEntry(data.sessionId, {
        speaker: 'ai',
        content: response.explanation,
        type: 'voice'
      })
      
      // Add actions to session
      for (const action of response.actions) {
        await sessionManager.addAction(data.sessionId, action)
      }
      
      socket.emit('ai-response', {
        id: response.id,
        sessionId: data.sessionId,
        message: response.explanation,
        actions: response.actions,
        timestamp: new Date()
      })
      
    } catch (error) {
      console.error('Error processing voice command:', error)
      socket.emit('error', { 
        message: 'Failed to process command',
        sessionId: data.sessionId 
      })
    }
  })

  socket.on('pause-demo', async (data) => {
    try {
      await sessionManager.updateSessionStatus(data.sessionId, 'paused')
      socket.emit('demo-status', { 
        sessionId: data.sessionId, 
        status: 'paused' 
      })
    } catch (error) {
      console.error('Error pausing demo:', error)
      socket.emit('error', { 
        message: 'Failed to pause demo',
        sessionId: data.sessionId 
      })
    }
  })

  socket.on('end-demo', async (data) => {
    try {
      // End browser session
      await browserService.endDemo(data.sessionId)
      
      // Update session status
      await sessionManager.updateSessionStatus(data.sessionId, 'ended')
      
      socket.emit('demo-status', { 
        sessionId: data.sessionId, 
        status: 'ended' 
      })
      
    } catch (error) {
      console.error('Error ending demo:', error)
      socket.emit('error', { 
        message: 'Failed to end demo',
        sessionId: data.sessionId 
      })
    }
  })

  socket.on('get-session', async (data) => {
    try {
      const session = await sessionManager.getSession(data.sessionId)
      if (session) {
        socket.emit('session-data', session)
      } else {
        socket.emit('error', { 
          message: 'Session not found',
          sessionId: data.sessionId 
        })
      }
    } catch (error) {
      console.error('Error getting session:', error)
      socket.emit('error', { 
        message: 'Failed to get session',
        sessionId: data.sessionId 
      })
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Start server
const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 AI Demo Agent Server running on port ${PORT}`)
  console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
  console.log(`🔗 Server URL: http://localhost:${PORT}`)
  console.log(`🎯 Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...')
  await browserService.cleanup()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app 