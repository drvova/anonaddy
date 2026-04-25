import { Show, type JSX } from 'solid-js'

interface InputProps {
  id?: string
  name?: string
  type?: string
  value?: string | number
  placeholder?: string
  label?: string
  helper?: string
  error?: string
  disabled?: boolean
  required?: boolean
  autofocus?: boolean
  autocomplete?: string
  class?: string
  prefix?: JSX.Element
  suffix?: JSX.Element
  onInput?: (e: InputEvent & { currentTarget: HTMLInputElement }) => void
  onChange?: (e: Event & { currentTarget: HTMLInputElement }) => void
  onKeyDown?: (e: KeyboardEvent) => void
}

export default function Input(props: InputProps) {
  const hasError = () => !!props.error

  const inputClasses = () =>
    `block w-full rounded-md border bg-white/5 text-white placeholder:text-grey-500 transition-colors duration-150 focus:outline-none focus:border-primary/60 ${
      props.prefix ? 'pl-10' : 'pl-3'
    } ${props.suffix ? 'pr-10' : 'pr-3'} py-2 text-sm ${
      hasError()
        ? 'border-red-500 focus:border-red-500'
        : 'border-border-subtle'
    } ${props.disabled ? 'cursor-not-allowed opacity-50' : ''} ${
      props.class ?? ''
    }`

  return (
    <div class={props.class ?? ''}>
      <Show when={props.label}>
        <label
          for={props.id}
          class="mb-1.5 block text-sm font-medium text-white"
        >
          {props.label}
          <Show when={props.required}>
            <span class="ml-0.5 text-red-400">*</span>
          </Show>
        </label>
      </Show>

      <div class="relative">
        <Show when={props.prefix}>
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-grey-500">
            {props.prefix}
          </div>
        </Show>

        <input
          id={props.id}
          name={props.name}
          type={props.type ?? 'text'}
          value={props.value}
          placeholder={props.placeholder}
          disabled={props.disabled}
          required={props.required}
          autofocus={props.autofocus}
          autocomplete={props.autocomplete}
          class={inputClasses()}
          onInput={props.onInput}
          onChange={props.onChange}
          onKeyDown={props.onKeyDown}
          aria-invalid={hasError() ? 'true' : undefined}
          aria-describedby={
            hasError() ? `${props.id}-error` : undefined
          }
        />

        <Show when={props.suffix}>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-grey-500">
            {props.suffix}
          </div>
        </Show>
      </div>

      <Show when={props.helper && !hasError()}>
        <p class="mt-1.5 text-xs text-grey-500">{props.helper}</p>
      </Show>

      <Show when={hasError()}>
        <p class="mt-1.5 text-xs text-red-400" id={`${props.id}-error`}>
          {props.error}
        </p>
      </Show>
    </div>
  )
}
