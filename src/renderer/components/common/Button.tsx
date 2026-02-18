interface Props {
  variant?: 'primary' | 'danger' | 'warning' | 'ghost'
  size?: 'sm' | 'md'
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function Button({ variant = 'primary', size = 'md', active, disabled, onClick, children, className = '' }: Props) {
  const base = 'rounded font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500'
  const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm' }
  const variants = {
    primary: active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600',
    danger: 'bg-red-700 text-white hover:bg-red-600',
    warning: active ? 'bg-orange-600 text-white' : 'bg-gray-700 text-orange-300 hover:bg-gray-600',
    ghost: 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800',
  }
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
