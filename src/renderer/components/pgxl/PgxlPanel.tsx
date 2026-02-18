import { Card } from '../common/Card'
import { PgxlMeters } from './PgxlMeters'
import { PgxlControls } from './PgxlControls'
import { usePgxlStore } from '../../store/pgxlStore'

export function PgxlPanel() {
  const connected = usePgxlStore(s => s.isConnected())
  const discovered = usePgxlStore(s => s.discovered)
  const status = connected ? 'connected' : discovered ? 'connecting' : 'disconnected'

  return (
    <Card title="Power Genius XL" status={status} className="h-full">
      {connected ? (
        <>
          <PgxlMeters />
          <PgxlControls />
        </>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
          {discovered ? 'Connecting\u2026' : 'Configure IP in Settings'}
        </div>
      )}
    </Card>
  )
}
