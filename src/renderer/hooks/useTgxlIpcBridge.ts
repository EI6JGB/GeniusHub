import { useEffect } from 'react'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { useTgxlStore } from '../store/tgxlStore'
import type { IpcTgxlStatusPayload, IpcTgxlDiscoveredPayload } from '../../shared/ipc-types'

export function useTgxlIpcBridge(): void {
  const updateState = useTgxlStore(s => s.updateState)
  const setDiscovered = useTgxlStore(s => s.setDiscovered)

  useEffect(() => {
    const onStatus = (payload: IpcTgxlStatusPayload) => updateState(payload.state)
    const onDiscovered = (payload: IpcTgxlDiscoveredPayload) => setDiscovered(payload.device.ip)
    window.electronAPI.on(IPC_CHANNELS.TGXL_STATUS, onStatus as (...args: unknown[]) => void)
    window.electronAPI.on(IPC_CHANNELS.TGXL_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    return () => {
      window.electronAPI.off(IPC_CHANNELS.TGXL_STATUS, onStatus as (...args: unknown[]) => void)
      window.electronAPI.off(IPC_CHANNELS.TGXL_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    }
  }, [updateState, setDiscovered])
}
