import { Show, type JSX } from 'solid-js'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  class?: string
  children: JSX.Element
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-grey-300 border-white/10',
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2 py-0.5 text-xs',
}

export default function Badge(props: BadgeProps) {
  const variant = () => props.variant ?? 'default'
  const size = () => props.size ?? 'sm'

  return (
    <span
      class={`inline-flex items-center gap-1 rounded-md border font-medium ${variantClasses[variant()]} ${sizeClasses[size()]} ${props.class ?? ''}`}
    >
      {props.children}
    </span>
  )
}
