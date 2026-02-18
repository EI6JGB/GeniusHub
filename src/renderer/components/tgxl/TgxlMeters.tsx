import { MeterGauge } from '../common/MeterGauge'
import { useTgxlStore } from '../../store/tgxlStore'

export function TgxlMeters() {
  const status = useTgxlStore(s => s.device?.status)
  const fwd = status?.fwd ?? 0
  const peak = status?.peak ?? 0
  const swr = status?.swr ?? 1
  const swrDisplay = swr <= -59 ? Infinity : swr

  return (
    <div className="flex gap-2 justify-center flex-wrap">
      <MeterGauge value={fwd} min={0} max={1500} label="FWD" unit="W" size={120}
        colorStops={[{ at: 0, color: '#66bb6a' }, { at: 0.7, color: '#ffa726' }, { at: 0.9, color: '#ef5350' }]} />
      <MeterGauge value={peak} min={0} max={1500} label="PEAK" unit="W" size={120}
        colorStops={[{ at: 0, color: '#66bb6a' }, { at: 0.7, color: '#ffa726' }, { at: 0.9, color: '#ef5350' }]} />
      <MeterGauge value={Math.min(swrDisplay === Infinity ? 10 : swrDisplay, 10)} min={1} max={10} label="SWR" unit=":1" size={120}
        colorStops={[{ at: 0, color: '#66bb6a' }, { at: 0.3, color: '#ffa726' }, { at: 0.6, color: '#ef5350' }]} />
    </div>
  )
}
