import { useState } from 'react'
import { Button } from '../common/Button'
import { IPC_CHANNELS } from '../../../shared/ipc-types'
import { useTgxlStore } from '../../store/tgxlStore'

export function TgxlControls() {
  const status = useTgxlStore(s => s.device?.status)
  const [tuning, setTuning] = useState(false)

  const invoke = (channel: string, args?: unknown) => window.electronAPI.invoke(channel, args)

  const handleAutotune = async () => {
    setTuning(true)
    try { await invoke(IPC_CHANNELS.TGXL_AUTOTUNE) } finally { setTuning(false) }
  }

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Operate / Bypass row */}
      <div className="flex gap-2">
        <Button variant="primary" active={status?.operateMode} onClick={() => invoke(IPC_CHANNELS.TGXL_OPERATE, { on: !status?.operateMode })}>
          OPERATE
        </Button>
        <Button variant="warning" active={status?.bypassMode} onClick={() => invoke(IPC_CHANNELS.TGXL_BYPASS, { on: !status?.bypassMode })}>
          BYPASS
        </Button>
        <Button variant="primary" active={tuning} disabled={tuning} onClick={handleAutotune}>
          {tuning ? 'TUNING\u2026' : 'AUTOTUNE'}
        </Button>
      </div>
      {/* Channel selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-12">CHANNEL</span>
        {([1, 2] as const).map(ch => (
          <Button key={ch} size="sm" active={status?.channelA === ch} onClick={() => invoke(IPC_CHANNELS.TGXL_ACTIVATE_CHANNEL, { channel: ch })}>
            CH {ch}
          </Button>
        ))}
      </div>
      {/* Antenna selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-12">ANT</span>
        {([1, 2, 3] as const).map(a => (
          <Button key={a} size="sm" active={status?.antA === a} onClick={() => invoke(IPC_CHANNELS.TGXL_ACTIVATE_ANT, { ant: a })}>
            {a}
          </Button>
        ))}
      </div>
      {/* Relay tune buttons */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 w-12">RELAY</span>
        {([1, 2, 3] as const).map(relay => (
          <div key={relay} className="flex gap-0.5">
            <Button size="sm" variant="ghost" onClick={() => invoke(IPC_CHANNELS.TGXL_TUNE_RELAY, { relay, move: -1 })}>−</Button>
            <span className="text-xs text-gray-500 self-center">{relay}</span>
            <Button size="sm" variant="ghost" onClick={() => invoke(IPC_CHANNELS.TGXL_TUNE_RELAY, { relay, move: 1 })}>+</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
