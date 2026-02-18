import { Card } from '../common/Card'
import { AntennaMatrix } from './AntennaMatrix'
import { PortStatus } from './PortStatus'
import { useAgStore } from '../../store/agStore'

export function AgPanel() {
  const connected = useAgStore(s => s.isConnected())
  const discovered = useAgStore(s => s.discovered)
  const status = connected ? 'connected' : discovered ? 'connecting' : 'disconnected'

  return (
    <Card title={"Antenna Genius 8\u00D72"} status={status} className="h-full">
      {connected ? (
        <>
          <PortStatus />
          <AntennaMatrix />
        </>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
          {discovered ? 'Connecting\u2026' : 'Not discovered'}
        </div>
      )}
    </Card>
  )
}
