import { TgxlPanel } from '../tgxl/TgxlPanel'
import { PgxlPanel } from '../pgxl/PgxlPanel'
import { AgPanel } from '../ag/AgPanel'

export function Dashboard() {
  return (
    <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden min-h-0" style={{ gridTemplateColumns: '1fr 1fr 1.2fr' }}>
      <TgxlPanel />
      <PgxlPanel />
      <AgPanel />
    </div>
  )
}
