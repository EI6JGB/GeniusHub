import { MeterGauge } from '../common/MeterGauge'
import { BarMeter } from '../common/BarMeter'
import { usePgxlStore } from '../../store/pgxlStore'

const STATE_COLORS: Record<string, string> = {
  STANDBY: 'text-gray-500',
  IDLE: 'text-green-400',
  TRANSMIT_A: 'text-orange-400',
  TRANSMIT_B: 'text-orange-400',
  UNKNOWN: 'text-gray-600',
}

export function PgxlMeters() {
  const device = usePgxlStore(s => s.device)
  const meter = device?.meter
  const opState = device?.operatingState ?? 'UNKNOWN'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <span className={`text-base font-bold tracking-wider ${STATE_COLORS[opState]}`}>{opState}</span>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        <MeterGauge value={meter?.fwdPower ?? 0} min={0} max={1500} label="OUTPUT" unit="W" size={120}
          colorStops={[{ at: 0, color: '#66bb6a' }, { at: 0.7, color: '#ffa726' }, { at: 0.9, color: '#ef5350' }]} />
        <MeterGauge value={meter?.reflPower ?? 0} min={0} max={200} label="REFL" unit="W" size={120}
          colorStops={[{ at: 0, color: '#66bb6a' }, { at: 0.5, color: '#ffa726' }, { at: 0.8, color: '#ef5350' }]} />
      </div>
      <BarMeter value={meter?.temperature ?? 0} min={0} max={80} label="Temperature" unit={'\u00B0C'} color="#1e88e5" warnAt={60} />
    </div>
  )
}
