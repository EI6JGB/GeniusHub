interface Props {
  status: 'connected' | 'disconnected' | 'connecting'
  label?: string
}

export function StatusIndicator({ status, label }: Props) {
  const color = status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-600'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  )
}
