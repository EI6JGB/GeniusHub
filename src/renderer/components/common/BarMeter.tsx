interface Props {
  value: number
  min: number
  max: number
  label: string
  unit: string
  color?: string
  warnAt?: number
}

export function BarMeter({ value, min, max, label, unit, color = '#1e88e5', warnAt }: Props) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const isWarn = warnAt !== undefined && value >= warnAt
  const fillColor = isWarn ? '#ef5350' : color
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-mono font-semibold text-gray-200">{value.toFixed(1)}<span className="text-xs text-gray-500 ml-0.5">{unit}</span></span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: fillColor }} />
      </div>
    </div>
  )
}
