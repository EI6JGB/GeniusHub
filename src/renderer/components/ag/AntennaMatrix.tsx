import { useAgStore } from '../../store/agStore'
import { IPC_CHANNELS } from '../../../shared/ipc-types'

export function AntennaMatrix() {
  const device = useAgStore(s => s.device)
  const antennas = device?.antennas ?? Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `ANT ${i + 1}` }))
  const ports = device?.ports ?? []

  const activeA = ports.find(p => p.port === 'A')?.antenna ?? 0
  const activeB = ports.find(p => p.port === 'B')?.antenna ?? 0

  const handleClick = (port: 'A' | 'B', antenna: number) => {
    window.electronAPI?.invoke(IPC_CHANNELS.AG_SET_ANTENNA, { port, antenna })
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_2.5rem_2.5rem] gap-1 px-1 mb-1">
        <span className="text-xs text-gray-600">ANTENNA</span>
        <span className="text-xs text-center font-bold" style={{ color: 'var(--color-port-a)' }}>A</span>
        <span className="text-xs text-center font-bold" style={{ color: 'var(--color-port-b)' }}>B</span>
      </div>
      {/* Rows */}
      {antennas.slice(0, 8).map(ant => (
        <div key={ant.number} className="grid grid-cols-[1fr_2.5rem_2.5rem] gap-1 items-center px-1 py-0.5 rounded hover:bg-gray-800/50">
          <span className="text-xs text-gray-300 truncate">{ant.name}</span>
          {/* Port A button */}
          <button
            onClick={() => handleClick('A', ant.number)}
            className="w-9 h-6 rounded text-xs font-bold border transition-all"
            style={activeA === ant.number
              ? { background: 'var(--color-port-a)', borderColor: 'var(--color-port-a)', color: '#fff' }
              : { background: 'transparent', borderColor: '#374151', color: '#374151' }}
          >
            {activeA === ant.number ? '\u25CF' : '\u25CB'}
          </button>
          {/* Port B button */}
          <button
            onClick={() => handleClick('B', ant.number)}
            className="w-9 h-6 rounded text-xs font-bold border transition-all"
            style={activeB === ant.number
              ? { background: 'var(--color-port-b)', borderColor: 'var(--color-port-b)', color: '#fff' }
              : { background: 'transparent', borderColor: '#374151', color: '#374151' }}
          >
            {activeB === ant.number ? '\u25CF' : '\u25CB'}
          </button>
        </div>
      ))}
    </div>
  )
}
