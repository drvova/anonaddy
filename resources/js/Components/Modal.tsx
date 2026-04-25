import { Dialog } from '@kobalte/core/dialog'
import { JSX } from 'solid-js'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maxWidth?: string
  title?: string
  children: JSX.Element
}

export default function Modal(props: ModalProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <div class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <Dialog.Overlay class="fixed inset-0 bg-black/70" />
            <Dialog.Content
              class={`relative w-full transform rounded-sm bg-surface border border-border-subtle p-5 ${props.maxWidth ?? 'max-w-lg'}`}
            >
              {props.title && (
                <Dialog.Title class="text-base font-semibold text-white mb-3">
                  {props.title}
                </Dialog.Title>
              )}
              {props.children}
              <Dialog.CloseButton class="absolute top-3 right-3 text-grey-400 hover:text-white transition-colors">
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.CloseButton>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}
