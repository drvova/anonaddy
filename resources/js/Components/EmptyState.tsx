import { Show, type JSX } from 'solid-js'

interface EmptyStateProps {
  icon?: JSX.Element
  title: string
  description?: string
  action?: JSX.Element
  class?: string
}

export default function EmptyState(props: EmptyStateProps) {
  return (
    <div
      class={`flex flex-col items-center justify-center py-12 text-center ${props.class ?? ''}`}
    >
      <Show when={props.icon}>
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-grey-500">
          {props.icon}
        </div>
      </Show>

      <h3 class="text-sm font-medium text-white">{props.title}</h3>

      <Show when={props.description}>
        <p class="mt-1 max-w-sm text-sm text-grey-500">{props.description}</p>
      </Show>

      <Show when={props.action}>
        <div class="mt-4">{props.action}</div>
      </Show>
    </div>
  )
}
