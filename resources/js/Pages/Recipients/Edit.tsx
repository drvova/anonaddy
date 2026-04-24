import { Title } from '@solidjs/meta'
import { createSignal, Show } from 'solid-js'
import { usePage } from '../../lib/inertia'
import Toggle from '../../Components/Toggle'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import http from '../../lib/http'
import { filters } from '../../app'

const successMessage = (text = '') => {
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Success', text, type: 'success' } }),
  )
}
const errorMessage = (text = 'An error has occurred, please try again later') => {
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Error', text, type: 'error' } }),
  )
}

const clipboard = (str: string) => {
  navigator.clipboard.writeText(str).then(
    () => successMessage('Copied to clipboard'),
    () => errorMessage('Could not copy to clipboard'),
  )
}

interface RecipientProps {
  initialRecipient: {
    id: number
    email: string
    can_reply_send: boolean
    fingerprint: string | null
    protected_headers: boolean
    inline_encryption: boolean
    remove_pgp_keys: boolean
    remove_pgp_signatures: boolean
    email_verified_at: string | null
    updated_at: string
  }
}

export default function EditRecipient(props: RecipientProps) {
  const page = usePage()
  const defaultRecipientId = () => (page.props as any).user?.default_recipient_id

  const [canReplySend, setCanReplySend] = createSignal(props.initialRecipient.can_reply_send)
  const [protectedHeaders, setProtectedHeaders] = createSignal(
    props.initialRecipient.protected_headers,
  )
  const [inlineEncryption, setInlineEncryption] = createSignal(
    props.initialRecipient.inline_encryption,
  )
  const [removePgpKeys, setRemovePgpKeys] = createSignal(props.initialRecipient.remove_pgp_keys)
  const [removePgpSignatures, setRemovePgpSignatures] = createSignal(
    props.initialRecipient.remove_pgp_signatures,
  )

  const r = () => props.initialRecipient

  const allowRepliesSends = () => {
    http
      .post('/api/v1/allowed-recipients', { id: r().id })
      .then(() => successMessage('Can reply/send enabled'))
      .catch(() => errorMessage())
  }

  const disallowRepliesSends = () => {
    http
      .delete(`/api/v1/allowed-recipients/${r().id}`)
      .then(() => successMessage('Can reply/send disabled'))
      .catch(() => errorMessage())
  }

  const turnOnProtectedHeaders = () => {
    http
      .post('/api/v1/protected-headers-recipients', { id: r().id })
      .then(() => successMessage('Hide email subject enabled'))
      .catch((error: any) => {
        if (error.status === 422) {
          errorMessage(error.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const turnOffProtectedHeaders = () => {
    http
      .delete(`/api/v1/protected-headers-recipients/${r().id}`)
      .then(() => successMessage('Hide email subject disabled'))
      .catch(() => errorMessage())
  }

  const turnOnInlineEncryption = () => {
    http
      .post('/api/v1/inline-encrypted-recipients', { id: r().id })
      .then(() => successMessage('Use PGP/Inline enabled'))
      .catch((error: any) => {
        if (error.status === 422) {
          errorMessage(error.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const turnOffInlineEncryption = () => {
    http
      .delete(`/api/v1/inline-encrypted-recipients/${r().id}`)
      .then(() => successMessage('Use PGP/Inline disabled'))
      .catch(() => errorMessage())
  }

  const turnOnRemovePgpKeys = () => {
    http
      .post('/api/v1/remove-pgp-keys-recipients', { id: r().id })
      .then(() => {
        setRemovePgpKeys(true)
        successMessage('Remove PGP keys enabled')
      })
      .catch((error: any) => {
        if (error.status === 422) {
          errorMessage(error.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const turnOffRemovePgpKeys = () => {
    http
      .delete(`/api/v1/remove-pgp-keys-recipients/${r().id}`)
      .then(() => {
        setRemovePgpKeys(false)
        successMessage('Remove PGP keys disabled')
      })
      .catch(() => errorMessage())
  }

  const turnOnRemovePgpSignatures = () => {
    http
      .post('/api/v1/remove-pgp-signatures-recipients', { id: r().id })
      .then(() => {
        setRemovePgpSignatures(true)
        successMessage('Remove PGP signatures enabled')
      })
      .catch((error: any) => {
        if (error.status === 422) {
          errorMessage(error.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const turnOffRemovePgpSignatures = () => {
    http
      .delete(`/api/v1/remove-pgp-signatures-recipients/${r().id}`)
      .then(() => {
        setRemovePgpSignatures(false)
        successMessage('Remove PGP signatures disabled')
      })
      .catch(() => errorMessage())
  }

  const canToggleProtectedHeaders = () => !!r().fingerprint && !inlineEncryption()
  const canToggleInlineEncryption = () => !!r().fingerprint && !protectedHeaders()

  return (
    <div>
      <Title>Edit Recipient</Title>
      <h1 id="primary-heading" class="sr-only">
        Edit Recipient
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-white">Edit Recipient</h1>
          <p class="mt-2 text-sm text-grey-200">Make changes to your recipient email address</p>
        </div>
      </div>

      <div class="bg-surface rounded-lg p-4">
        <div class="space-y-8 divide-y divide-border-subtle">
          <div>
            <div class="flex items-center">
              <h3
                class="text-xl font-medium leading-6 text-grey-100 cursor-pointer"
                onClick={() => clipboard(r().email)}
                title="Click to copy"
              >
                {r().email}
              </h3>
              <Show when={r().email_verified_at}>
                <span
                  class="ml-2 py-1 px-2 bg-green-900/30 text-green-300 rounded-full text-xs font-semibold leading-5"
                  title={filters.formatDate(r().email_verified_at!)}
                >
                  verified
                </span>
              </Show>
              <Show when={defaultRecipientId() === r().id}>
                <span
                  class="ml-2 py-1 px-2 text-xs bg-yellow-900/30 text-yellow-300 rounded-full"
                  title="This is your account's default email address"
                >
                  default
                </span>
              </Show>
            </div>
          </div>

          <div class="pt-8">
            <label class="block font-medium text-grey-200 text-lg pointer-events-none cursor-default">
              Can Reply/Send from Aliases
            </label>
            <p class="mt-1 text-base text-grey-200">
              Toggle this option to determine whether this recipient is allowed to reply and send
              from your aliases. When set to off this recipient will not be able to reply or send
              from your aliases and you will be notified when an attempt is made.
            </p>
            <Toggle
              id="can_reply_send"
              class="mt-4"
              checked={canReplySend()}
              onChange={checked => {
                setCanReplySend(checked)
                if (checked) allowRepliesSends()
                else disallowRepliesSends()
              }}
            />
          </div>

          <div class="pt-8">
            <label class="block font-medium text-grey-200 text-lg pointer-events-none cursor-default">
              Hide Email Subject
            </label>
            <p class="mt-1 text-base text-grey-200">
              <Show when={!r().fingerprint}>
                <span>
                  You <b>must add a PGP key before you can use this setting</b>.
                </span>{' '}
              </Show>
              Enabling this option will hide and encrypt the email subject using protected headers.
              Many mail clients are able to automatically decrypt and display the subject once the
              email arrives.
            </p>
            <Show
              when={canToggleProtectedHeaders()}
              fallback={
                <Toggle
                  id="hide_email_subject"
                  class="mt-4"
                  checked={protectedHeaders()}
                  onChange={() => {}}
                  disabled
                  title={
                    inlineEncryption()
                      ? 'You need to disable inline encryption before you can enable protected headers (hide subject)'
                      : 'You must enable encryption first by adding a PGP key'
                  }
                />
              }
            >
              <Toggle
                id="hide_email_subject"
                class="mt-4"
                checked={protectedHeaders()}
                onChange={checked => {
                  setProtectedHeaders(checked)
                  if (checked) turnOnProtectedHeaders()
                  else turnOffProtectedHeaders()
                }}
              />
            </Show>
          </div>

          <div class="pt-8">
            <label class="block font-medium text-grey-200 text-lg pointer-events-none cursor-default">
              Use PGP/Inline Encryption
            </label>
            <p class="mt-1 text-base text-grey-200">
              <Show when={!r().fingerprint}>
                <span>
                  You <b>must add a PGP key before you can use this setting</b>.
                </span>{' '}
              </Show>
              Enabling this option will use (PGP/Inline) instead of the default PGP/MIME encryption
              for forwarded messages. Please Note: This will <b>ONLY</b> encrypt and forward the
              plain text content. Do not enable this if you wish to receive attachments or message
              with HTML content.
            </p>
            <Show
              when={canToggleInlineEncryption()}
              fallback={
                <Toggle
                  id="use_inline_encryption"
                  class="mt-4"
                  checked={inlineEncryption()}
                  onChange={() => {}}
                  disabled
                  title={
                    protectedHeaders()
                      ? 'You need to disable protected headers (hide subject) before you can enable inline encryption'
                      : 'You must enable encryption first by adding a PGP key'
                  }
                />
              }
            >
              <Toggle
                id="use_inline_encryption"
                class="mt-4"
                checked={inlineEncryption()}
                onChange={checked => {
                  setInlineEncryption(checked)
                  if (checked) turnOnInlineEncryption()
                  else turnOffInlineEncryption()
                }}
              />
            </Show>
          </div>

          <div class="pt-8">
            <label class="block font-medium text-grey-200 text-lg pointer-events-none cursor-default">
              Remove PGP Keys from Replies/Sends
            </label>
            <p class="mt-1 text-base text-grey-200">
              When enabled any attached PGP keys for replies/sends from this recipient will be
              automatically removed. This is to prevent you from accidentally sending the PGP key of
              your recipient which could inadvertently reveal your real email address. For example
              Proton mail has an option to always attach your public PGP key to every email that you
              send, this could expose your real email if sent through your aliases.
            </p>
            <p class="mt-4 text-base text-grey-200">
              <b>Only disable this option if you are certain</b> that you can not accidentally send
              the PGP key of your recipient when replying/sending from your aliases.
            </p>
            <Toggle
              id="remove_pgp_keys"
              class="mt-4"
              checked={removePgpKeys()}
              onChange={checked => {
                setRemovePgpKeys(checked)
                if (checked) turnOnRemovePgpKeys()
                else turnOffRemovePgpKeys()
              }}
            />
          </div>

          <div class="pt-8">
            <label class="block font-medium text-grey-200 text-lg pointer-events-none cursor-default">
              Remove PGP Signatures from Replies/Sends
            </label>
            <p class="mt-1 text-base text-grey-200">
              When enabled any attached PGP signatures for replies/sends from this recipient will be
              automatically removed. This is to prevent you from accidentally signing an outbound
              email with your recipient's PGP key which could inadvertently reveal your real email
              address.
            </p>
            <p class="mt-4 text-base text-grey-200">
              <b>Only disable this option if you are certain</b> that you can not accidentally sign
              outbound emails using the PGP key of your recipient when replying/sending from your
              aliases.
            </p>
            <Toggle
              id="remove_pgp_signatures"
              class="mt-4"
              checked={removePgpSignatures()}
              onChange={checked => {
                setRemovePgpSignatures(checked)
                if (checked) turnOnRemovePgpSignatures()
                else turnOffRemovePgpSignatures()
              }}
            />
          </div>

          <div class="pt-5">
            <span class="mt-2 text-sm text-grey-300" title={filters.formatDate(r().updated_at)}>
              Last updated {filters.timeAgo(r().updated_at)}.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
