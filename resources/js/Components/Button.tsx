import { Show, type JSX } from 'solid-js'
import Loader from './Loader'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  class?: string
  href?: string
  onClick?: (e: MouseEvent) => void
  children: JSX.Element
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-black hover:bg-primary/90 active:bg-primary/80 border-transparent',
  secondary:
    'bg-white/10 text-white hover:bg-white/15 active:bg-white/20 border-transparent',
  ghost:
    'bg-transparent text-grey-300 hover:text-white hover:bg-white/5 active:bg-white/10 border-transparent',
  destructive:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 border-transparent',
  outline:
    'bg-transparent text-white border-border-subtle hover:border-white/20 hover:bg-white/5 active:bg-white/10',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export default function Button(props: ButtonProps) {
  const variant = () => props.variant ?? 'primary'
  const size = () => props.size ?? 'md'
  const isDisabled = () => props.disabled || props.loading

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

  const classes = () =>
    `${baseClasses} ${variantClasses[variant()]} ${sizeClasses[size()]} ${props.class ?? ''}`

  return (
    <Show
      when={props.href}
      fallback={
        <button
          type={props.type ?? 'button'}
          class={classes()}
          disabled={isDisabled()}
          onClick={props.onClick}
        >
          <Show when={props.loading}>
            <Loader />
          </Show>
          {props.children}
        </button>
      }
    >
      <a href={props.href} class={classes()} onClick={props.onClick}>
        {props.children}
      </a>
    </Show>
  )
}
