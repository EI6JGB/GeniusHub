import { useEffect } from 'react'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { useAgStore } from '../store/agStore'
import type { IpcAgStatePayload, IpcAgDiscoveredPayload } from '../../shared/ipc-types'

export function useAgIpcBridge(): void {
  const updateState = useAgStore(s => s.updateState)
  const setDiscovered = useAgStore(s => s.setDiscovered)

  useEffect(() => {
    const onState = (payload: IpcAgStatePayload) => updateState(payload.state)
    const onDiscovered = (payload: IpcAgDiscoveredPayload) => setDiscovered(payload.device.ip)
    window.electronAPI.on(IPC_CHANNELS.AG_STATE, onState as (...args: unknown[]) => void)
    window.electronAPI.on(IPC_CHANNELS.AG_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    return () => {
      window.electronAPI.off(IPC_CHANNELS.AG_STATE, onState as (...args: unknown[]) => void)
      window.electronAPI.off(IPC_CHANNELS.AG_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    }
  }, [updateState, setDiscovered])
}
