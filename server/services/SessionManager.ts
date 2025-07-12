import { v4 as uuidv4 } from 'uuid'
import { DemoSession, DemoAction, TranscriptEntry } from '../../types'
import fs from 'fs'
import path from 'path'

export class SessionManager {
  private sessions: Map<string, DemoSession> = new Map()
  private isInitialized = false
  private sessionsDir: string

  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'sessions')
  }

  async initialize() {
    if (this.isInitialized) return
    console.log('📝 Initializing Session Manager...')
    
    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true })
    }
    
    this.isInitialized = true
    console.log('✅ Session Manager initialized')
  }

  async createSession(sessionId: string, website: string): Promise<DemoSession> {
    await this.initialize()
    
    const session: DemoSession = {
      id: sessionId,
      website,
      status: 'starting',
      startTime: new Date(),
      transcript: [],
      actions: []
    }
    
    this.sessions.set(sessionId, session)
    await this.saveSessionToFile(session)
    
    console.log(`📝 Created session ${sessionId} for ${website}`)
    return session
  }

  async getSession(sessionId: string): Promise<DemoSession | null> {
    let session = this.sessions.get(sessionId)
    
    if (!session) {
      // Try to load from file
      const loadedSession = await this.loadSessionFromFile(sessionId)
      if (loadedSession) {
        this.sessions.set(sessionId, loadedSession)
        session = loadedSession
      }
    }
    
    return session || null
  }

  async updateSessionStatus(sessionId: string, status: DemoSession['status']): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    
    session.status = status
    if (status === 'ended') {
      session.endTime = new Date()
    }
    
    this.sessions.set(sessionId, session)
    await this.saveSessionToFile(session)
    
    console.log(`📝 Updated session ${sessionId} status to ${status}`)
  }

  async addTranscriptEntry(sessionId: string, entry: Omit<TranscriptEntry, 'id' | 'timestamp'>): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    
    const transcriptEntry: TranscriptEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date()
    }
    
    session.transcript.push(transcriptEntry)
    this.sessions.set(sessionId, session)
    await this.saveSessionToFile(session)
    
    console.log(`📝 Added transcript entry to session ${sessionId}`)
  }

  async addAction(sessionId: string, action: DemoAction): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    
    session.actions.push(action)
    this.sessions.set(sessionId, session)
    await this.saveSessionToFile(session)
    
    console.log(`📝 Added action to session ${sessionId}: ${action.type}`)
  }

  async getAllSessions(): Promise<DemoSession[]> {
    await this.initialize()
    
    // Load all sessions from files
    const sessionFiles = fs.readdirSync(this.sessionsDir)
      .filter(file => file.endsWith('.json'))
    
    const sessions: DemoSession[] = []
    
    for (const file of sessionFiles) {
      try {
        const sessionData = fs.readFileSync(path.join(this.sessionsDir, file), 'utf-8')
        const session: DemoSession = JSON.parse(sessionData)
        sessions.push(session)
      } catch (error) {
        console.error(`Error loading session file ${file}:`, error)
      }
    }
    
    return sessions
  }

  async getSessionsByStatus(status: DemoSession['status']): Promise<DemoSession[]> {
    const allSessions = await this.getAllSessions()
    return allSessions.filter(session => session.status === status)
  }

  async getSessionsByWebsite(website: string): Promise<DemoSession[]> {
    const allSessions = await this.getAllSessions()
    return allSessions.filter(session => session.website === website)
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
    
    const filePath = path.join(this.sessionsDir, `${sessionId}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    
    console.log(`📝 Deleted session ${sessionId}`)
  }

  async generateSessionSummary(sessionId: string): Promise<{
    totalDuration: number;
    commandCount: number;
    actionCount: number;
    successRate: number;
    keyMoments: string[];
  }> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    
    const totalDuration = session.endTime 
      ? (session.endTime.getTime() - session.startTime.getTime()) / 1000
      : (new Date().getTime() - session.startTime.getTime()) / 1000
    
    const commandCount = session.transcript.filter(t => t.speaker === 'user').length
    const actionCount = session.actions.length
    const successfulActions = session.actions.filter(a => a.success).length
    const successRate = actionCount > 0 ? (successfulActions / actionCount) * 100 : 0
    
    // Extract key moments (important actions or long conversations)
    const keyMoments = session.transcript
      .filter(t => t.content.length > 50) // Longer interactions
      .slice(-5) // Last 5 important moments
      .map(t => `${t.speaker}: ${t.content.slice(0, 100)}...`)
    
    return {
      totalDuration: Math.round(totalDuration),
      commandCount,
      actionCount,
      successRate: Math.round(successRate),
      keyMoments
    }
  }

  private async saveSessionToFile(session: DemoSession): Promise<void> {
    try {
      const filePath = path.join(this.sessionsDir, `${session.id}.json`)
      const sessionData = JSON.stringify(session, null, 2)
      fs.writeFileSync(filePath, sessionData)
    } catch (error) {
      console.error(`Error saving session ${session.id}:`, error)
    }
  }

  private async loadSessionFromFile(sessionId: string): Promise<DemoSession | null> {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`)
      if (!fs.existsSync(filePath)) {
        return null
      }
      
      const sessionData = fs.readFileSync(filePath, 'utf-8')
      const session: DemoSession = JSON.parse(sessionData)
      
      // Convert date strings back to Date objects
      session.startTime = new Date(session.startTime)
      if (session.endTime) {
        session.endTime = new Date(session.endTime)
      }
      
      session.transcript.forEach(entry => {
        entry.timestamp = new Date(entry.timestamp)
      })
      
      session.actions.forEach(action => {
        action.timestamp = new Date(action.timestamp)
      })
      
      return session
    } catch (error) {
      console.error(`Error loading session ${sessionId}:`, error)
      return null
    }
  }

  getActiveSessionCount(): number {
    const sessions = Array.from(this.sessions.values())
    return sessions.filter(session => session.status === 'running' || session.status === 'paused').length
  }

  isHealthy(): boolean {
    return this.isInitialized
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up session manager...')
    
    // Save all active sessions
    const sessions = Array.from(this.sessions.values())
    for (const session of sessions) {
      await this.saveSessionToFile(session)
    }
    
    this.sessions.clear()
    console.log('✅ Session manager cleanup complete')
  }
} 