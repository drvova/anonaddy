import { createSignal, createEffect } from 'solid-js'
import { usePage } from '../lib/inertia'
import Icon from './Icon'

export default function FlashNotification() {
  const page = usePage()
  const [show, setShow] = createSignal(true)

  createEffect(() => {
    const flash = page.props.flash
    if (flash) {
      setShow(true)
    }
  })

  return (
    <Show when={show() && page.props.flash}>
      <div class="fixed bottom-4 right-4 z-50 bg-green-900/90 border border-green-600 rounded-md-lg px-4 py-3 max-w-sm">
        <div class="flex items-start gap-3">
          <Icon name="check-circle" class="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div class="flex-1">
            <p class="text-sm text-white">{page.props.flash as string}</p>
          </div>
          <button
            onClick={() => setShow(false)}
            class="text-white/70 hover:text-white transition-colors flex-shrink-0"
          >
            <Icon name="close" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Show>
  )
}
