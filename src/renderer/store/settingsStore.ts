import { create } from 'zustand'
import type { AppSettings } from '../../shared/ipc-types'

interface SettingsStore extends AppSettings {
  isLoaded: boolean
  load: () => Promise<void>
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  tgxlIp: '', tgxlAuth: '', pgxlIp: '', agIp: '', agAuth: '', theme: 'dark',
  isLoaded: false,
  load: async () => {
    const settings = await window.electronAPI.invoke<AppSettings>('settings:get')
    set({ ...settings, isLoaded: true })
  },
  setSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>)
    window.electronAPI.invoke('settings:set', { key, value })
  },
}))
