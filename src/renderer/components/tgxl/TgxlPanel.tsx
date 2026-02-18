import { Card } from '../common/Card'
import { TgxlMeters } from './TgxlMeters'
import { TgxlControls } from './TgxlControls'
import { useTgxlStore } from '../../store/tgxlStore'

export function TgxlPanel() {
  const connected = useTgxlStore(s => s.isConnected())
  const discovered = useTgxlStore(s => s.discovered)
  const status = connected ? 'connected' : discovered ? 'connecting' : 'disconnected'

  return (
    <Card title="Tuner Genius XL" status={status} className="h-full">
      {connected ? (
        <>
          <TgxlMeters />
          <TgxlControls />
        </>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
          {discovered ? 'Connecting\u2026' : 'Not discovered'}
        </div>
      )}
    </Card>
  )
}
