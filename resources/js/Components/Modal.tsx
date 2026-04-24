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
            <Dialog.Overlay class="fixed inset-0 bg-black/60 transition-opacity" />
            <Dialog.Content
              class={`relative w-full transform rounded-xl bg-grey-950 border border-grey-800 p-6-2xl transition-all ${props.maxWidth ?? 'max-w-lg'}`}
            >
              {props.title && (
                <Dialog.Title class="text-lg font-semibold text-white mb-4">
                  {props.title}
                </Dialog.Title>
              )}
              {props.children}
              <Dialog.CloseButton class="absolute top-4 right-4 text-grey-400 hover:text-white transition-colors">
                <svg
                  class="h-5 w-5"
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
