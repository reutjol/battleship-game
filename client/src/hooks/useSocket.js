import { useState, useEffect, useCallback, useRef } from 'react'
import socket from '../services/socket'

/**
 * Custom hook for managing Socket.io connections and events
 * @returns {object} - { isConnected, emit, on, off, socket }
 */
const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const listenersRef = useRef([])

  // Handle connection status
  useEffect(() => {
    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)
    const onConnectError = () => setIsConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    // Set initial state
    setIsConnected(socket.connected)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
    }
  }, [])

  // Emit event to server
  const emit = useCallback((event, data) => {
    if (socket.connected) {
      socket.emit(event, data)
      return true
    }
    console.warn(`Socket not connected. Cannot emit "${event}"`)
    return false
  }, [])

  // Subscribe to event
  const on = useCallback((event, callback) => {
    socket.on(event, callback)
    listenersRef.current.push({ event, callback })
  }, [])

  // Unsubscribe from event
  const off = useCallback((event, callback) => {
    socket.off(event, callback)
    listenersRef.current = listenersRef.current.filter(
      (listener) => !(listener.event === event && listener.callback === callback)
    )
  }, [])

  // Cleanup all listeners registered through this hook
  const cleanup = useCallback(() => {
    listenersRef.current.forEach(({ event, callback }) => {
      socket.off(event, callback)
    })
    listenersRef.current = []
  }, [])

  // Auto cleanup on unmount
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    isConnected,
    emit,
    on,
    off,
    cleanup,
    socket // expose raw socket if needed
  }
}

export default useSocket
