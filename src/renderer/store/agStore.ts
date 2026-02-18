import { create } from 'zustand'
import type { AgDeviceState, AntennaInfo, PortState } from '../../shared/device-types'

interface AgStore {
  device: AgDeviceState | null
  discovered: boolean
  // Actions
  setDiscovered: (ip: string) => void
  updateState: (state: AgDeviceState) => void
  setConnected: (connected: boolean) => void
  updateAntennas: (antennas: AntennaInfo[]) => void
  setPortState: (port: PortState) => void
  // Derived
  isConnected: () => boolean
  getAntenna: (port: 'A' | 'B') => number
}

export const useAgStore = create<AgStore>((set, get) => ({
  device: null,
  discovered: false,
  setDiscovered: (ip) => set({
    discovered: true,
    device: { ip, port: 9007, name: '', serial: '', version: '', connected: false, antennas: [], ports: [], groups: [], outputs: [] },
  }),
  updateState: (state) => set({ device: state }),
  setConnected: (connected) => set((s) => s.device ? { device: { ...s.device, connected } } : {}),
  updateAntennas: (antennas) => set((s) => s.device ? { device: { ...s.device, antennas } } : {}),
  setPortState: (port) => set((s) => {
    if (!s.device) return {}
    const ports = s.device.ports.filter(p => p.port !== port.port).concat(port)
    return { device: { ...s.device, ports } }
  }),
  isConnected: () => get().device?.connected ?? false,
  getAntenna: (port) => get().device?.ports.find(p => p.port === port)?.antenna ?? 0,
}))
