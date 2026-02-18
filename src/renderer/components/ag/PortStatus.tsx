import { useAgStore } from '../../store/agStore'

export function PortStatus() {
  const device = useAgStore(s => s.device)
  const ports = device?.ports ?? []
  const antennas = device?.antennas ?? []

  const getAntName = (antNum: number) => antennas.find(a => a.number === antNum)?.name ?? `ANT ${antNum}`

  return (
    <div className="flex gap-4 mb-3">
      {(['A', 'B'] as const).map(port => {
        const ps = ports.find(p => p.port === port)
        return (
          <div key={port} className="flex items-center gap-2 text-sm">
            <span className="font-bold" style={{ color: port === 'A' ? 'var(--color-port-a)' : 'var(--color-port-b)' }}>
              Port {port}:
            </span>
            <span className="text-gray-300">{ps?.band || '\u2014'} {'\u00B7'} {ps?.antenna ? getAntName(ps.antenna) : '\u2014'}</span>
          </div>
        )
      })}
    </div>
  )
}
