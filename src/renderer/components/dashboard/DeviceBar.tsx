import { StatusIndicator } from '../common/StatusIndicator'
import { useTgxlStore } from '../../store/tgxlStore'
import { usePgxlStore } from '../../store/pgxlStore'
import { useAgStore } from '../../store/agStore'

interface Props { onSettingsOpen: () => void }

export function DeviceBar({ onSettingsOpen }: Props) {
  const tgxlConn = useTgxlStore(s => s.isConnected())
  const tgxlDisc = useTgxlStore(s => s.discovered)
  const pgxlConn = usePgxlStore(s => s.isConnected())
  const pgxlDisc = usePgxlStore(s => s.discovered)
  const agConn = useAgStore(s => s.isConnected())
  const agDisc = useAgStore(s => s.discovered)

  const getStatus = (conn: boolean, disc: boolean) =>
    conn ? 'connected' as const : disc ? 'connecting' as const : 'disconnected' as const

  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800"
      style={{ background: 'var(--bg-panel)' }}>
      <div className="flex items-center gap-2">
        <span className="text-base font-bold tracking-tight text-white">GeniusHub</span>
        <span className="text-gray-700 mx-1">|</span>
        <div className="flex items-center gap-4">
          <StatusIndicator status={getStatus(tgxlConn, tgxlDisc)} label="TGXL" />
          <StatusIndicator status={getStatus(pgxlConn, pgxlDisc)} label="PGXL" />
          <StatusIndicator status={getStatus(agConn, agDisc)} label="AG" />
        </div>
      </div>
      <button
        onClick={onSettingsOpen}
        className="text-gray-400 hover:text-gray-200 text-lg p-1 rounded hover:bg-gray-800 transition-colors"
        aria-label="Settings"
      >
        {'\u2699'}
      </button>
    </div>
  )
}
