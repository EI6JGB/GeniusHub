import { useState } from 'react'
import { DevicesSettings } from './DevicesSettings'
import { AboutPanel } from './AboutPanel'

interface Props { onClose: () => void }

export function SettingsModal({ onClose }: Props) {
  const [tab, setTab] = useState<'devices' | 'about'>('devices')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-[480px] max-h-[80vh] rounded-xl border border-gray-700 flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-panel)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="font-semibold text-white">Settings</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg">{'\u2715'}</button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(['devices', 'about'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm transition-colors capitalize ${tab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'devices' ? <DevicesSettings /> : <AboutPanel />}
        </div>
      </div>
    </div>
  )
}
