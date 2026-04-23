import { Switch } from '@kobalte/core/switch'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  class?: string
  title?: string
  id?: string
}

export default function Toggle(props: ToggleProps) {
  return (
    <Switch
      id={props.id}
      checked={props.checked}
      onChange={props.onChange}
      disabled={props.disabled}
      title={props.title}
      class={`group relative inline-flex h-6 w-11 flex-shrink-0 items-center ${props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${props.class ?? ''}`}
    >
      <Switch.Control class="relative inline-flex h-6 w-11 items-center rounded-full bg-grey-700 transition-colors duration-200 ease-in-out group-data-[checked]:bg-primary">
        <Switch.Thumb class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out group-data-[checked]:translate-x-5 group-data-[not-checked]:translate-x-0.5" />
      </Switch.Control>
      <Switch.HiddenInput />
    </Switch>
  )
}
