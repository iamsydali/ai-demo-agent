'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { VoiceInterfaceProps } from '@/types'

export default function VoiceInterface({ 
  onCommand, 
  isListening, 
  isProcessing, 
  aiResponse 
}: VoiceInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [volume, setVolume] = useState(1)
  
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const speechSynthesis = window.speechSynthesis
      
      if (SpeechRecognition && speechSynthesis) {
        setIsSupported(true)
        synthRef.current = speechSynthesis
        
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'en-US'
        
        recognition.onstart = () => {
          setIsRecording(true)
          setTranscript('')
        }
        
        recognition.onresult = (event: any) => {
          const current = event.resultIndex
          const transcript = event.results[current][0].transcript
          setTranscript(transcript)
          
          if (event.results[current].isFinal) {
            onCommand(transcript)
            setTranscript('')
          }
        }
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
        }
        
        recognition.onend = () => {
          setIsRecording(false)
        }
        
        recognitionRef.current = recognition
      }
    }
  }, [onCommand])

  useEffect(() => {
    if (aiResponse && synthRef.current) {
      speakText(aiResponse)
    }
  }, [aiResponse])

  const speakText = (text: string) => {
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = volume
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      synthRef.current.speak(utterance)
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isRecording) {
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
    }
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const toggleMute = () => {
    setVolume(volume === 0 ? 1 : 0)
  }

  if (!isSupported) {
    return (
      <div className="demo-control-panel">
        <div className="text-center py-8">
          <MicOff className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-700 mb-2">
            Voice Not Supported
          </h3>
          <p className="text-secondary-600">
            Your browser doesn&apos;t support speech recognition. Please use Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-control-panel">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary-900">Voice Control</h2>
        <button
          onClick={toggleMute}
          className="p-2 rounded-full hover:bg-secondary-100 transition-colors"
        >
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-secondary-500" />
          ) : (
            <Volume2 className="w-5 h-5 text-secondary-500" />
          )}
        </button>
      </div>

      {/* Voice Button */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={isRecording ? stopListening : startListening}
          disabled={isProcessing}
          className={`voice-button w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isProcessing 
              ? 'processing cursor-not-allowed' 
              : isRecording 
                ? 'listening' 
                : 'idle'
          }`}
        >
          {isProcessing ? (
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : isRecording ? (
            <Mic className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>

        {/* Status Text */}
        <div className="text-center min-h-[60px]">
          {isProcessing ? (
            <div className="space-y-2">
              <p className="text-sm text-secondary-600">AI is processing...</p>
              <div className="flex justify-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-6 bg-primary-500 rounded-full voice-wave"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          ) : isRecording ? (
            <div className="space-y-2">
              <p className="text-sm text-primary-600 font-medium">Listening...</p>
              {transcript && (
                <p className="text-sm text-secondary-700 italic">
                  {transcript}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-secondary-600">
              Click to start voice command
            </p>
          )}
        </div>

        {/* AI Response */}
        {aiResponse && (
          <div className="w-full p-4 bg-primary-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-primary-900">AI Response</h4>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Stop
                </button>
              )}
            </div>
            <p className="text-sm text-primary-700">{aiResponse}</p>
            {isSpeaking && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-3 bg-primary-500 rounded-full voice-wave"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-primary-600">Speaking...</span>
              </div>
            )}
          </div>
        )}

        {/* Volume Control */}
        <div className="w-full">
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Voice Volume
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
} 