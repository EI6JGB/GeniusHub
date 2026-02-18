export function AboutPanel() {
  const version = typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION || '0.1.0'
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-white mb-1">GeniusHub</div>
        <div className="text-gray-500 text-sm">v{version}</div>
      </div>
      <p className="text-gray-400 text-sm text-center">
        Unified control center for 4O3A/Expert Electronics Genius ham radio devices.
      </p>
      <div className="text-xs text-gray-600 text-center">
        Tuner Genius XL {'\u00B7'} Power Genius XL {'\u00B7'} Antenna Genius 8{'\u00D7'}2
      </div>
    </div>
  )
}
