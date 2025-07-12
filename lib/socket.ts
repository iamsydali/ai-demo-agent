'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { ClientToServerEvents, ServerToClientEvents } from '@/types'

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>

export function useSocket() {
  const [socket, setSocket] = useState<SocketType | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'
    
    const socketInstance: SocketType = io(serverUrl, {
      transports: ['websocket'],
      timeout: 20000,
    })

    socketInstance.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return { socket, connected }
} 