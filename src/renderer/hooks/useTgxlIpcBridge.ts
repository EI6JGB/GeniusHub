import { useEffect } from 'react'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { useTgxlStore } from '../store/tgxlStore'
import type { IpcTgxlStatusPayload, IpcTgxlDiscoveredPayload } from '../../shared/ipc-types'

export function useTgxlIpcBridge(): void {
  const updateState = useTgxlStore(s => s.updateState)
  const setDiscovered = useTgxlStore(s => s.setDiscovered)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const onStatus = (payload: IpcTgxlStatusPayload) => updateState(payload.state)
    const onDiscovered = (payload: IpcTgxlDiscoveredPayload) => setDiscovered(payload.device.ip)
    api.on(IPC_CHANNELS.TGXL_STATUS, onStatus as (...args: unknown[]) => void)
    api.on(IPC_CHANNELS.TGXL_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    return () => {
      api.off(IPC_CHANNELS.TGXL_STATUS, onStatus as (...args: unknown[]) => void)
      api.off(IPC_CHANNELS.TGXL_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    }
  }, [updateState, setDiscovered])
}
