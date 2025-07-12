'use client'

import { useState, useEffect } from 'react'
import { Download, FileText, Copy, Check } from 'lucide-react'
import { DemoSession } from '@/types'

interface SessionRecorderProps {
  session: DemoSession
}

export default function SessionRecorder({ session }: SessionRecorderProps) {
  const [copied, setCopied] = useState(false)
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    // Generate transcript from session data
    const generateTranscript = () => {
      const lines = session.transcript.map(entry => {
        const timestamp = new Date(entry.timestamp).toLocaleTimeString()
        const speaker = entry.speaker === 'user' ? 'User' : 'AI Assistant'
        return `[${timestamp}] ${speaker}: ${entry.content}`
      }).join('\n')
      
      const header = `Demo Session Transcript
Website: ${session.website}
Session ID: ${session.id}
Start Time: ${new Date(session.startTime).toLocaleString()}
${session.endTime ? `End Time: ${new Date(session.endTime).toLocaleString()}` : 'Status: Ongoing'}
Duration: ${getDuration()}
Commands: ${session.transcript.filter(t => t.speaker === 'user').length}
Actions: ${session.actions.length}

--- Transcript ---
`
      
      return header + lines
    }

    setTranscript(generateTranscript())
  }, [session])

  const getDuration = () => {
    const start = new Date(session.startTime)
    const end = session.endTime ? new Date(session.endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy transcript:', err)
    }
  }

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demo-session-${session.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadSessionData = () => {
    const sessionData = {
      ...session,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        format: 'AI Demo Agent Session Data'
      }
    }
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demo-session-data-${session.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="demo-control-panel">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary-900">Session Recording</h2>
        <FileText className="w-5 h-5 text-secondary-500" />
      </div>

      <div className="space-y-4">
        {/* Session Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary-50 p-3 rounded-lg">
            <div className="text-sm text-primary-600">Total Commands</div>
            <div className="text-2xl font-bold text-primary-900">
              {session.transcript.filter(t => t.speaker === 'user').length}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600">Actions Performed</div>
            <div className="text-2xl font-bold text-green-900">
              {session.actions.length}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={copyTranscript}
            className="flex items-center gap-2 px-3 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          
          <button
            onClick={downloadTranscript}
            className="flex items-center gap-2 px-3 py-2 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Transcript
          </button>
          
          <button
            onClick={downloadSessionData}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Data
          </button>
        </div>

        {/* Recent Actions */}
        <div>
          <h4 className="text-sm font-medium text-secondary-700 mb-3">
            Recent Actions
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {session.actions.slice(-5).map((action) => (
              <div key={action.id} className="flex items-start gap-3 p-2 bg-secondary-50 rounded-md">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  action.success ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-secondary-900">
                      {action.type}
                    </span>
                    <span className="text-xs text-secondary-500">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-700 truncate">
                    {action.description}
                  </p>
                  {action.selector && (
                    <p className="text-xs text-secondary-500 font-mono">
                      {action.selector}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Summary */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-secondary-700 mb-2">
            Session Summary
          </h4>
          <div className="text-sm text-secondary-600 space-y-1">
            <div>Duration: {getDuration()}</div>
            <div>Success Rate: {
              session.actions.length > 0 
                ? Math.round((session.actions.filter(a => a.success).length / session.actions.length) * 100)
                : 0
            }%</div>
            <div>Last Activity: {
              session.transcript.length > 0 
                ? new Date(session.transcript[session.transcript.length - 1].timestamp).toLocaleTimeString()
                : 'No activity'
            }</div>
          </div>
        </div>
      </div>
    </div>
  )
} 