import { createSignal, Show, For, type JSX } from 'solid-js'

interface DropdownItem {
  label: string
  href?: string
  onClick?: () => void
  icon?: JSX.Element
  danger?: boolean
  disabled?: boolean
}

interface DropdownProps {
  trigger: JSX.Element
  items: DropdownItem[]
  align?: 'left' | 'right'
  class?: string
}

export default function Dropdown(props: DropdownProps) {
  const [open, setOpen] = createSignal(false)
  const align = () => props.align ?? 'right'

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return
    if (item.onClick) {
      item.onClick()
    }
    setOpen(false)
  }

  return (
    <div class={`relative inline-block ${props.class ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(!open())}
        class="inline-flex items-center"
      >
        {props.trigger}
      </button>

      <Show when={open()}>
        <div
          class="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />

        <div
          class={`absolute z-50 mt-1 min-w-[12rem] rounded-md border border-border-subtle bg-surface py-1 shadow-lg ${
            align() === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <For each={props.items}>
            {(item, index) => (
              <>
                <Show when={index() > 0 && item.danger && !props.items[index() - 1]?.danger}>
                  <div class="my-1 border-t border-border-subtle" />
                </Show>

                <Show
                  when={item.href}
                  fallback={
                    <button
                      type="button"
                      disabled={item.disabled}
                      onClick={() => handleItemClick(item)}
                      class={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        item.danger
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-grey-300 hover:bg-white/5 hover:text-white'
                      } ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <Show when={item.icon}>
                        <span class="shrink-0">{item.icon}</span>
                      </Show>
                      {item.label}
                    </button>
                  }
                >
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    class={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-white text-grey-300`}
                  >
                    <Show when={item.icon}>
                      <span class="shrink-0">{item.icon}</span>
                    </Show>
                    {item.label}
                  </a>
                </Show>
              </>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
