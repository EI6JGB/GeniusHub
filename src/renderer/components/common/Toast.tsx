import { useEffect } from 'react'

interface Props {
  message: string
  type?: 'warning' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'info', onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])
  const colors = { warning: 'border-amber-500 bg-amber-950/80', error: 'border-red-500 bg-red-950/80', info: 'border-blue-500 bg-blue-950/80' }
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm text-gray-200 ${colors[type]}`}>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-200 ml-2">{'\u2715'}</button>
    </div>
  )
}
