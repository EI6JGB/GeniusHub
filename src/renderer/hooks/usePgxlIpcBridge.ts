import { useEffect } from 'react'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { usePgxlStore } from '../store/pgxlStore'
import type { IpcPgxlStatePayload, IpcPgxlDiscoveredPayload } from '../../shared/ipc-types'

export function usePgxlIpcBridge(): void {
  const updateState = usePgxlStore(s => s.updateState)
  const setDiscovered = usePgxlStore(s => s.setDiscovered)

  useEffect(() => {
    const onState = (payload: IpcPgxlStatePayload) => updateState(payload.state)
    const onDiscovered = (payload: IpcPgxlDiscoveredPayload) => setDiscovered(payload.device.ip)
    window.electronAPI.on(IPC_CHANNELS.PGXL_STATE, onState as (...args: unknown[]) => void)
    window.electronAPI.on(IPC_CHANNELS.PGXL_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    return () => {
      window.electronAPI.off(IPC_CHANNELS.PGXL_STATE, onState as (...args: unknown[]) => void)
      window.electronAPI.off(IPC_CHANNELS.PGXL_DISCOVERED, onDiscovered as (...args: unknown[]) => void)
    }
  }, [updateState, setDiscovered])
}
