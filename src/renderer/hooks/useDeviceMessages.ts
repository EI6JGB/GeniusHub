import { useState, useEffect, useCallback } from 'react'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import type { DeviceMessage } from '../../shared/device-types'

export function useDeviceMessages() {
  const [messages, setMessages] = useState<DeviceMessage[]>([])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const handler = (msg: DeviceMessage) => {
      setMessages(prev => [msg, ...prev].slice(0, 10))
    }
    api.on(IPC_CHANNELS.DEVICE_MESSAGE, handler as (...args: unknown[]) => void)
    return () => api.off(IPC_CHANNELS.DEVICE_MESSAGE, handler as (...args: unknown[]) => void)
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])
  return { messages, clearMessages }
}
