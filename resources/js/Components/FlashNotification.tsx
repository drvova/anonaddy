import { createSignal, Show, onMount, onCleanup } from 'solid-js'

interface FlashNotificationProps {
  title?: string
  text?: string
  type?: 'success' | 'error' | 'warning' | 'info'
}

export default function FlashNotification() {
  const [notifications, setNotifications] = createSignal<FlashNotificationProps[]>([])

  const addNotification = (detail: FlashNotificationProps) => {
    const id = Date.now() + Math.random()
    setNotifications(prev => [...prev, { ...detail }])
    setTimeout(() => {
      setNotifications(prev => prev.slice(1))
    }, 5000)
  }

  onMount(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as FlashNotificationProps
      addNotification(detail)
    }
    window.addEventListener('notify', handler)
    onCleanup(() => window.removeEventListener('notify', handler))
  })

  const iconFor = (type?: string) => {
    switch (type) {
      case 'success':
        return (
          <svg class="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg class="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )
      case 'warning':
        return (
          <svg class="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      default:
        return (
          <svg class="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )
    }
  }

  const borderColorFor = (type?: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500/20'
      case 'error':
        return 'border-red-500/20'
      case 'warning':
        return 'border-yellow-500/20'
      default:
        return 'border-blue-500/20'
    }
  }

  return (
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      <Show when={notifications().length > 0}>
        {notifications().map((note, i) => (
          <div
            class={`flex items-start gap-3 rounded-md border bg-surface px-4 py-3 shadow-lg animate-in slide-in-from-right ${borderColorFor(note.type)}`}
            style={{ 'animation-delay': `${i * 50}ms` }}
          >
            <div class="mt-0.5 shrink-0">{iconFor(note.type)}</div>
            <div class="flex-1 min-w-0">
              <Show when={note.title}>
                <p class="text-sm font-medium text-white">{note.title}</p>
              </Show>
              <Show when={note.text}>
                <p class="text-sm text-grey-400">{note.text}</p>
              </Show>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter((_, idx) => idx !== i))}
              class="shrink-0 text-grey-500 hover:text-white transition-colors"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </Show>
    </div>
  )
}
