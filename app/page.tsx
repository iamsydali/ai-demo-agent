'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ControlPanel from '@/components/ControlPanel'
import VoiceInterface from '@/components/VoiceInterface'
import SessionRecorder from '@/components/SessionRecorder'
import DemoStatus from '@/components/DemoStatus'
import { DemoSession, DemoStatus as DemoStatusType } from '@/types'
import { useSocket } from '@/lib/socket'

export default function Home() {
  const [session, setSession] = useState<DemoSession | null>(null)
  const [demoStatus, setDemoStatus] = useState<DemoStatusType>('idle')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>('')
  
  const { socket, connected } = useSocket()

  useEffect(() => {
    if (!socket) return

    socket.on('demo-started', (data) => {
      setDemoStatus('running')
      setSession(prev => prev ? { ...prev, status: 'running' } : null)
    })

    socket.on('ai-response', (response) => {
      setAiResponse(response.message)
      setIsProcessing(false)
      
      // Update session with new response
      setSession(prev => {
        if (!prev) return null
        return {
          ...prev,
          transcript: [...prev.transcript, {
            id: uuidv4(),
            timestamp: new Date(),
            speaker: 'ai',
            content: response.message,
            type: 'voice'
          }],
          actions: [...prev.actions, ...response.actions]
        }
      })
    })

    socket.on('demo-status', (data) => {
      setDemoStatus(data.status)
      setSession(prev => prev ? { ...prev, status: data.status } : null)
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
      setDemoStatus('error')
      setIsProcessing(false)
    })

    return () => {
      socket.off('demo-started')
      socket.off('ai-response')
      socket.off('demo-status')
      socket.off('error')
    }
  }, [socket])

  const handleStartDemo = (website: string) => {
    if (!socket) return
    
    const sessionId = uuidv4()
    const newSession: DemoSession = {
      id: sessionId,
      website,
      status: 'starting',
      startTime: new Date(),
      transcript: [],
      actions: []
    }
    
    setSession(newSession)
    setDemoStatus('starting')
    
    socket.emit('start-demo', { website, sessionId })
  }

  const handleEndDemo = () => {
    if (!socket || !session) return
    
    socket.emit('end-demo', { sessionId: session.id })
    setDemoStatus('ended')
    setSession(prev => prev ? { ...prev, status: 'ended', endTime: new Date() } : null)
  }

  const handlePauseDemo = () => {
    if (!socket || !session) return
    
    socket.emit('pause-demo', { sessionId: session.id })
    setDemoStatus('paused')
  }

  const handleVoiceCommand = (command: string) => {
    if (!socket || !session) return
    
    setIsProcessing(true)
    setAiResponse('')
    
    // Add user command to transcript
    setSession(prev => {
      if (!prev) return null
      return {
        ...prev,
        transcript: [...prev.transcript, {
          id: uuidv4(),
          timestamp: new Date(),
          speaker: 'user',
          content: command,
          type: 'voice'
        }]
      }
    })
    
    socket.emit('voice-command', { command, sessionId: session.id })
  }

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-900 mb-2">
            AI Demo Agent
          </h1>
          <p className="text-secondary-600 text-lg">
            Voice-powered product demonstrations that work 24/7
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-secondary-500">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <ControlPanel
              session={session}
              onStartDemo={handleStartDemo}
              onEndDemo={handleEndDemo}
              onPauseDemo={handlePauseDemo}
            />
            
            <VoiceInterface
              onCommand={handleVoiceCommand}
              isListening={isListening}
              isProcessing={isProcessing}
              aiResponse={aiResponse}
            />
          </div>

          {/* Middle Column - Status and Recording */}
          <div className="lg:col-span-1 space-y-6">
            <DemoStatus
              status={demoStatus}
              session={session}
            />
            
            {session && (
              <SessionRecorder
                session={session}
              />
            )}
          </div>

          {/* Right Column - Instructions */}
          <div className="lg:col-span-1">
            <div className="demo-control-panel">
              <h3 className="text-xl font-semibold text-primary-900 mb-4">
                How to Use
              </h3>
              <div className="space-y-3 text-secondary-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <p>Choose a website to demonstrate (e.g., x.com, github.com)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <p>Click "Start Demo" to open the controlled browser</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <p>Use voice commands like "Show me the dashboard" or "Click the login button"</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <p>Watch the AI navigate and explain features in real-time</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                <h4 className="font-medium text-primary-900 mb-2">Example Commands:</h4>
                <ul className="text-sm text-primary-700 space-y-1">
                  <li>• "Show me how to create a post"</li>
                  <li>• "Navigate to the settings page"</li>
                  <li>• "Click the sign up button"</li>
                  <li>• "Scroll down to see more content"</li>
                  <li>• "What features are available here?"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 