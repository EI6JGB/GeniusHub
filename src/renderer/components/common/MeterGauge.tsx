interface Props {
  value: number
  min: number
  max: number
  label: string
  unit: string
  colorStops?: { at: number; color: string }[]
  size?: number
}

export function MeterGauge({ value, min, max, label, unit, colorStops, size = 140 }: Props) {
  const cx = size / 2, cy = size / 2 * 1.1
  const r = size * 0.38
  const startAngle = 150, sweepAngle = 240

  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const needleAngle = startAngle + pct * sweepAngle

  const polarToXY = (deg: number, radius: number) => {
    const rad = (deg - 90) * Math.PI / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  const arcPath = (fromDeg: number, toDeg: number, rad: number) => {
    const start = polarToXY(fromDeg, rad)
    const end = polarToXY(toDeg, rad)
    const large = toDeg - fromDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${rad} ${rad} 0 ${large} 1 ${end.x} ${end.y}`
  }

  const needleTip = polarToXY(needleAngle, r * 0.85)
  const needleBase1 = polarToXY(needleAngle + 90, 4)
  const needleBase2 = polarToXY(needleAngle - 90, 4)

  const getColor = () => {
    if (colorStops) {
      for (let i = colorStops.length - 1; i >= 0; i--) {
        if (pct >= colorStops[i].at) return colorStops[i].color
      }
      return colorStops[0].color
    }
    if (pct < 0.5) return '#66bb6a'
    if (pct < 0.75) return '#ffa726'
    return '#ef5350'
  }

  const displayValue = value === -60 ? '\u221E' : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(value < 10 ? 2 : 0)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
        {/* Background arc */}
        <path d={arcPath(startAngle, startAngle + sweepAngle, r)} fill="none" stroke="#374151" strokeWidth={8} strokeLinecap="round" />
        {/* Value arc */}
        {pct > 0 && <path d={arcPath(startAngle, startAngle + pct * sweepAngle, r)} fill="none" stroke={getColor()} strokeWidth={8} strokeLinecap="round" />}
        {/* Needle */}
        <polygon points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${cx},${cy} ${needleBase2.x},${needleBase2.y}`} fill={getColor()} />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={5} fill="#9ca3af" />
        {/* Value text */}
        <text x={cx} y={cy + r * 0.45} textAnchor="middle" fontSize={size * 0.13} fontWeight="bold" fill="#e5e7eb">{displayValue}</text>
        <text x={cx} y={cy + r * 0.62} textAnchor="middle" fontSize={size * 0.09} fill="#6b7280">{unit}</text>
        {/* Min/max labels */}
        {(() => { const s = polarToXY(startAngle, r * 1.18); return <text x={s.x} y={s.y} textAnchor="middle" fontSize={size * 0.08} fill="#6b7280">{min}</text> })()}
        {(() => { const e = polarToXY(startAngle + sweepAngle, r * 1.18); return <text x={e.x} y={e.y} textAnchor="middle" fontSize={size * 0.08} fill="#6b7280">{max}</text> })()}
      </svg>
      <span className="text-xs text-gray-500 -mt-2">{label}</span>
    </div>
  )
}
