import { useDeviceMessages } from '../../hooks/useDeviceMessages'

export function NotificationBar() {
  const { messages, clearMessages } = useDeviceMessages()
  if (messages.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-800 bg-amber-950/30 text-xs"
      style={{ maxHeight: '60px', overflowY: 'auto' }}>
      <span className="text-amber-500 font-bold shrink-0">{'\u26A0'}</span>
      <div className="flex-1 text-amber-300">{messages[0].text}</div>
      {messages.length > 1 && <span className="text-gray-500">+{messages.length - 1} more</span>}
      <button onClick={clearMessages} className="text-gray-500 hover:text-gray-300">{'\u2715'}</button>
    </div>
  )
}
