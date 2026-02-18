import { useEffect, useState } from 'react'
import { Dashboard } from './components/dashboard/Dashboard'
import { DeviceBar } from './components/dashboard/DeviceBar'
import { NotificationBar } from './components/dashboard/NotificationBar'
import { SettingsModal } from './components/settings/SettingsModal'
import { useAgIpcBridge } from './hooks/useAgIpcBridge'
import { useTgxlIpcBridge } from './hooks/useTgxlIpcBridge'
import { usePgxlIpcBridge } from './hooks/usePgxlIpcBridge'
import { useSettingsStore } from './store/settingsStore'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const loadSettings = useSettingsStore(s => s.load)

  // Register IPC bridges once
  useAgIpcBridge()
  useTgxlIpcBridge()
  usePgxlIpcBridge()

  useEffect(() => { loadSettings() }, [loadSettings])

  // Close settings on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <DeviceBar onSettingsOpen={() => setSettingsOpen(true)} />
      <Dashboard />
      <NotificationBar />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
