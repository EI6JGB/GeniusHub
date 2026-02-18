import { create } from 'zustand'
import type { TgxlStatus, TgxlDeviceState } from '../../shared/device-types'

interface TgxlStore {
  device: TgxlDeviceState | null
  discovered: boolean
  setDiscovered: (ip: string) => void
  updateState: (state: TgxlDeviceState) => void
  updateStatus: (status: TgxlStatus) => void
  setConnected: (connected: boolean) => void
  isConnected: () => boolean
}

export const useTgxlStore = create<TgxlStore>((set, get) => ({
  device: null,
  discovered: false,
  setDiscovered: (ip) => set({ discovered: true, device: { ip, connected: false, status: null } }),
  updateState: (state) => set({ device: state }),
  updateStatus: (status) => set((s) => s.device ? { device: { ...s.device, status } } : {}),
  setConnected: (connected) => set((s) => s.device ? { device: { ...s.device, connected } } : {}),
  isConnected: () => get().device?.connected ?? false,
}))
