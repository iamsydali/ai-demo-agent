'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, Globe, Activity, Users } from 'lucide-react'
import { DemoSession, DemoStatus as DemoStatusType } from '@/types'

interface DemoStatusProps {
  status: DemoStatusType
  session: DemoSession | null
}

export default function DemoStatus({ status, session }: DemoStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Activity className="w-5 h-5 text-secondary-500" />
      case 'starting':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
      case 'running':
        return <Activity className="w-5 h-5 text-green-500" />
      case 'paused':
        return <Activity className="w-5 h-5 text-yellow-500" />
      case 'ended':
        return <Activity className="w-5 h-5 text-red-500" />
      case 'error':
        return <Activity className="w-5 h-5 text-red-600" />
      default:
        return <Activity className="w-5 h-5 text-secondary-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'text-secondary-600'
      case 'starting':
        return 'text-blue-600'
      case 'running':
        return 'text-green-600'
      case 'paused':
        return 'text-yellow-600'
      case 'ended':
        return 'text-red-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-secondary-600'
    }
  }

  const getStatusBadgeColor = () => {
    switch (status) {
      case 'idle':
        return 'bg-secondary-100 text-secondary-800'
      case 'starting':
        return 'bg-blue-100 text-blue-800'
      case 'running':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'ended':
        return 'bg-red-100 text-red-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-secondary-100 text-secondary-800'
    }
  }

  const getDuration = () => {
    if (!session) return '0:00'
    const start = new Date(session.startTime)
    const end = session.endTime ? new Date(session.endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="demo-control-panel">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-primary-900">Session Status</h2>
        {session && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-full hover:bg-secondary-100 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-secondary-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-secondary-500" />
            )}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor()}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        {/* Session Info */}
        {session ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-secondary-500" />
                <span className="text-sm text-secondary-700">
                  {session.website}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary-500" />
                <span className="text-sm text-secondary-700">
                  {getDuration()}
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary-500">Session ID:</span>
                    <div className="font-mono text-xs text-secondary-700">
                      {session.id.slice(0, 8)}...
                    </div>
                  </div>
                  <div>
                    <span className="text-secondary-500">Started:</span>
                    <div className="text-secondary-700">
                      {new Date(session.startTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary-500">Commands:</span>
                    <div className="text-secondary-700">
                      {session.transcript.filter(t => t.speaker === 'user').length}
                    </div>
                  </div>
                  <div>
                    <span className="text-secondary-500">Actions:</span>
                    <div className="text-secondary-700">
                      {session.actions.length}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-2">
                    Recent Activity
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {session.transcript.slice(-3).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          entry.speaker === 'user' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`font-medium ${
                              entry.speaker === 'user' ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {entry.speaker === 'user' ? 'You' : 'AI'}
                            </span>
                            <span className="text-secondary-500">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-secondary-700 truncate">
                            {entry.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
            <p className="text-secondary-600">
              No active session
            </p>
            <p className="text-sm text-secondary-500">
              Start a demo to see session details
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 