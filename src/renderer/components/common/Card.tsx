import { StatusIndicator } from './StatusIndicator'

interface Props {
  title: string
  status?: 'connected' | 'disconnected' | 'connecting'
  children: React.ReactNode
  className?: string
}

export function Card({ title, status, children, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-gray-700/50 bg-gray-900 flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/50 bg-gray-800/60">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{title}</span>
        {status && <StatusIndicator status={status} />}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}
