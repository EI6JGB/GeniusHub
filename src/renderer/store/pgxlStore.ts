import { create } from 'zustand'
import type { PgxlState, PgxlMeterData, PgxlOperatingState } from '../../shared/device-types'

interface PgxlStore {
  device: PgxlState | null
  discovered: boolean
  setDiscovered: (ip: string) => void
  updateState: (state: PgxlState) => void
  updateMeter: (meter: PgxlMeterData) => void
  setConnected: (connected: boolean) => void
  setOperatingState: (opState: PgxlOperatingState) => void
  isConnected: () => boolean
}

export const usePgxlStore = create<PgxlStore>((set, get) => ({
  device: null,
  discovered: false,
  setDiscovered: (ip) => set({ discovered: true, device: { ip, connected: false, operatingState: 'UNKNOWN', meter: null } }),
  updateState: (state) => set({ device: state }),
  updateMeter: (meter) => set((s) => s.device ? { device: { ...s.device, meter } } : {}),
  setConnected: (connected) => set((s) => s.device ? { device: { ...s.device, connected } } : {}),
  setOperatingState: (opState) => set((s) => s.device ? { device: { ...s.device, operatingState: opState } } : {}),
  isConnected: () => get().device?.connected ?? false,
}))
