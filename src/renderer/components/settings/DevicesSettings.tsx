import { useState } from 'react'
import { Button } from '../common/Button'
import { useSettingsStore } from '../../store/settingsStore'
import { IPC_CHANNELS } from '../../../shared/ipc-types'

export function DevicesSettings() {
  const settings = useSettingsStore()
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await window.electronAPI?.invoke(IPC_CHANNELS.SETTINGS_DISCOVER)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field = (label: string, key: keyof typeof settings, placeholder?: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type="text"
        value={settings[key] as string}
        placeholder={placeholder}
        onChange={e => settings.setSetting(key as 'tgxlIp', e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tuner Genius XL</div>
        {field('IP Address (blank = auto-discover)', 'tgxlIp', '192.168.1.xxx')}
        {field('Auth Code (WAN only)', 'tgxlAuth', 'optional')}
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Power Genius XL</div>
        {field('IP Address (required)', 'pgxlIp', '192.168.1.xxx')}
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Antenna Genius</div>
        {field('IP Address (blank = auto-discover)', 'agIp', '192.168.1.xxx')}
        {field('Auth Code (WAN only)', 'agAuth', 'optional')}
      </div>
      <Button onClick={handleSave} variant="primary">{saved ? 'Saved \u2713' : 'Save & Connect'}</Button>
    </div>
  )
}
