'use client'

import { useState } from 'react'
import { Play, Pause, Square, Settings } from 'lucide-react'
import { ControlPanelProps } from '@/types'

const POPULAR_WEBSITES = [
  { name: 'X (Twitter)', url: 'x.com', description: 'Social media platform' },
  { name: 'GitHub', url: 'github.com', description: 'Code repository platform' },
  { name: 'LinkedIn', url: 'linkedin.com', description: 'Professional networking' },
  { name: 'Shopify', url: 'shopify.com', description: 'E-commerce platform' },
  { name: 'Notion', url: 'notion.so', description: 'Productivity workspace' },
]

export default function ControlPanel({ session, onStartDemo, onEndDemo, onPauseDemo }: ControlPanelProps) {
  const [selectedWebsite, setSelectedWebsite] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  const handleStartDemo = () => {
    const website = isCustom ? customUrl : selectedWebsite
    if (website) {
      onStartDemo(website)
    }
  }

  const canStart = (isCustom && customUrl) || (!isCustom && selectedWebsite)
  const isRunning = session?.status === 'running'
  const isPaused = session?.status === 'paused'

  return (
    <div className="demo-control-panel">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary-900">Demo Control</h2>
        <Settings className="w-5 h-5 text-secondary-500" />
      </div>

      {/* Website Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Choose Website to Demo
          </label>
          
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setIsCustom(false)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                !isCustom 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => setIsCustom(true)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isCustom 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              Custom URL
            </button>
          </div>

          {isCustom ? (
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Enter website URL (e.g., example.com)"
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {POPULAR_WEBSITES.map((site) => (
                <button
                  key={site.url}
                  onClick={() => setSelectedWebsite(site.url)}
                  className={`text-left p-3 rounded-md border transition-colors ${
                    selectedWebsite === site.url
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300 hover:bg-secondary-50'
                  }`}
                >
                  <div className="font-medium text-secondary-900">{site.name}</div>
                  <div className="text-sm text-secondary-600">{site.description}</div>
                  <div className="text-xs text-secondary-500 mt-1">{site.url}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Demo Controls */}
        <div className="flex gap-2 pt-4">
          {!session || session.status === 'ended' ? (
            <button
              onClick={handleStartDemo}
              disabled={!canStart}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                canStart
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-secondary-300 text-secondary-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              Start Demo
            </button>
          ) : (
            <div className="flex gap-2">
              {isRunning && (
                <button
                  onClick={onPauseDemo}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
              
              {isPaused && (
                <button
                  onClick={handleStartDemo}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              )}
              
              <button
                onClick={onEndDemo}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                End Demo
              </button>
            </div>
          )}
        </div>

        {/* Current Session Info */}
        {session && (
          <div className="mt-4 p-3 bg-secondary-50 rounded-md">
            <div className="text-sm text-secondary-700">
              <div className="flex justify-between">
                <span>Website:</span>
                <span className="font-medium">{session.website}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium capitalize ${
                  session.status === 'running' ? 'text-green-600' :
                  session.status === 'paused' ? 'text-yellow-600' :
                  session.status === 'ended' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {session.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">
                  {Math.round((new Date().getTime() - session.startTime.getTime()) / 60000)} min
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 