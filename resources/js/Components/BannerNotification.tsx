import { createSignal, JSX } from 'solid-js'
import Icon from './Icon'

interface BannerNotificationProps {
  status?: 'info' | 'error' | 'success'
  message: string
}

const colourMap = {
  info: { bg: 'bg-yellow-900/80 border-yellow-600', icon: 'info' as const, iconColour: 'text-yellow-400' },
  error: { bg: 'bg-red-900/80 border-red-600', icon: 'close-circle' as const, iconColour: 'text-red-400' },
  success: { bg: 'bg-green-900/80 border-green-600', icon: 'check-circle' as const, iconColour: 'text-green-400' },
}

export default function BannerNotification(props: BannerNotificationProps) {
  const [visible, setVisible] = createSignal(true)
  const status = () => props.status ?? 'success'
  const colours = () => colourMap[status()]

  return (
    <Show when={visible()}>
      <div class={`fixed bottom-0 inset-x-0 z-50 ${colours().bg} border-t`}>
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon name={colours().icon} class={`h-5 w-5 ${colours().iconColour}`} />
            <span class="text-sm text-white">{props.message}</span>
          </div>
          <button
            onClick={() => setVisible(false)}
            class="text-white/70 hover:text-white transition-colors"
          >
            <Icon name="close" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Show>
  )
}
