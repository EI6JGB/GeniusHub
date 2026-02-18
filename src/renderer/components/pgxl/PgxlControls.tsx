import { Button } from '../common/Button'
import { IPC_CHANNELS } from '../../../shared/ipc-types'
import { usePgxlStore } from '../../store/pgxlStore'

export function PgxlControls() {
  const opState = usePgxlStore(s => s.device?.operatingState ?? 'UNKNOWN')
  const invoke = (channel: string, args?: unknown) => window.electronAPI?.invoke(channel, args)
  const isOperate = opState === 'IDLE' || opState === 'TRANSMIT_A' || opState === 'TRANSMIT_B'

  return (
    <div className="flex gap-2 mt-3">
      <Button variant="primary" active={isOperate} onClick={() => invoke(IPC_CHANNELS.PGXL_OPERATE, { on: true })}>
        OPERATE
      </Button>
      <Button variant="warning" active={opState === 'STANDBY'} onClick={() => invoke(IPC_CHANNELS.PGXL_OPERATE, { on: false })}>
        STANDBY
      </Button>
    </div>
  )
}
