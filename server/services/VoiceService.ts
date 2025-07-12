import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

export class VoiceService {
  private openai: OpenAI
  private isInitialized = false
  private recordingsDir: string

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.recordingsDir = path.join(process.cwd(), 'recordings')
  }

  async initialize() {
    if (this.isInitialized) return
    console.log('🎤 Initializing Voice Service...')
    
    // Ensure recordings directory exists
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true })
    }
    
    this.isInitialized = true
    console.log('✅ Voice Service initialized')
  }

  async speechToText(audioBuffer: Buffer, format: 'mp3' | 'wav' | 'webm' = 'webm'): Promise<string> {
    try {
      await this.initialize()
      
      // Save audio buffer to temporary file
      const tempFilePath = path.join(this.recordingsDir, `temp_${Date.now()}.${format}`)
      fs.writeFileSync(tempFilePath, audioBuffer)
      
      // Use OpenAI Whisper for transcription
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: 'en'
      })
      
      // Clean up temporary file
      fs.unlinkSync(tempFilePath)
      
      console.log(`🎤 Transcribed: "${transcription.text}"`)
      return transcription.text
      
    } catch (error) {
      console.error('Error in speech-to-text:', error)
      throw new Error(`Failed to transcribe audio: ${error}`)
    }
  }

  async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<Buffer> {
    try {
      await this.initialize()
      
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        speed: 1.0
      })
      
      const buffer = Buffer.from(await mp3.arrayBuffer())
      
      console.log(`🔊 Generated speech for: "${text.slice(0, 50)}..."`)
      return buffer
      
    } catch (error) {
      console.error('Error in text-to-speech:', error)
      throw new Error(`Failed to generate speech: ${error}`)
    }
  }

  async saveRecording(sessionId: string, audioBuffer: Buffer, type: 'user' | 'ai'): Promise<string> {
    try {
      await this.initialize()
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${sessionId}_${type}_${timestamp}.mp3`
      const filePath = path.join(this.recordingsDir, filename)
      
      fs.writeFileSync(filePath, audioBuffer)
      
      console.log(`💾 Saved ${type} recording: ${filename}`)
      return filePath
      
    } catch (error) {
      console.error('Error saving recording:', error)
      throw new Error(`Failed to save recording: ${error}`)
    }
  }

  async getRecording(filePath: string): Promise<Buffer | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null
      }
      
      return fs.readFileSync(filePath)
      
    } catch (error) {
      console.error('Error reading recording:', error)
      return null
    }
  }

  async getSessionRecordings(sessionId: string): Promise<{
    userRecordings: string[];
    aiRecordings: string[];
  }> {
    try {
      await this.initialize()
      
      const files = fs.readdirSync(this.recordingsDir)
      const sessionFiles = files.filter(file => file.startsWith(sessionId))
      
      const userRecordings = sessionFiles
        .filter(file => file.includes('_user_'))
        .map(file => path.join(this.recordingsDir, file))
      
      const aiRecordings = sessionFiles
        .filter(file => file.includes('_ai_'))
        .map(file => path.join(this.recordingsDir, file))
      
      return { userRecordings, aiRecordings }
      
    } catch (error) {
      console.error('Error getting session recordings:', error)
      return { userRecordings: [], aiRecordings: [] }
    }
  }

  async deleteSessionRecordings(sessionId: string): Promise<void> {
    try {
      await this.initialize()
      
      const files = fs.readdirSync(this.recordingsDir)
      const sessionFiles = files.filter(file => file.startsWith(sessionId))
      
      for (const file of sessionFiles) {
        const filePath = path.join(this.recordingsDir, file)
        fs.unlinkSync(filePath)
      }
      
      console.log(`🗑️ Deleted ${sessionFiles.length} recordings for session ${sessionId}`)
      
    } catch (error) {
      console.error('Error deleting session recordings:', error)
    }
  }

  async generateSessionAudioSummary(sessionId: string): Promise<{
    totalRecordings: number;
    userRecordings: number;
    aiRecordings: number;
    totalDuration: number; // estimated in seconds
  }> {
    try {
      const recordings = await this.getSessionRecordings(sessionId)
      const totalRecordings = recordings.userRecordings.length + recordings.aiRecordings.length
      
      // Rough estimation: 1 recording = ~3 seconds average
      const estimatedDuration = totalRecordings * 3
      
      return {
        totalRecordings,
        userRecordings: recordings.userRecordings.length,
        aiRecordings: recordings.aiRecordings.length,
        totalDuration: estimatedDuration
      }
      
    } catch (error) {
      console.error('Error generating audio summary:', error)
      return {
        totalRecordings: 0,
        userRecordings: 0,
        aiRecordings: 0,
        totalDuration: 0
      }
    }
  }

  isHealthy(): boolean {
    return this.isInitialized && !!process.env.OPENAI_API_KEY
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up voice service...')
    
    // Clean up temporary files
    try {
      const files = fs.readdirSync(this.recordingsDir)
      const tempFiles = files.filter(file => file.startsWith('temp_'))
      
      for (const file of tempFiles) {
        const filePath = path.join(this.recordingsDir, file)
        fs.unlinkSync(filePath)
      }
      
      console.log(`🗑️ Cleaned up ${tempFiles.length} temporary files`)
    } catch (error) {
      console.error('Error cleaning up voice service:', error)
    }
    
    console.log('✅ Voice service cleanup complete')
  }
} 