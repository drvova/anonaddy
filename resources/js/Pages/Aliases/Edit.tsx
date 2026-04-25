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

interface AliasProps {
  initialAlias: {
    id: number
    local_part: string
    extension: string | null
    domain: string
    email: string
    active: boolean
    description: string | null
    from_name: string | null
    attached_recipients_only: boolean
    deleted_at: string | null
    updated_at: string
  }
}

export default function EditAlias(props: AliasProps) {
  const [fromName, setFromName] = createSignal(props.initialAlias.from_name ?? '')
  const [fromNameLoading, setFromNameLoading] = createSignal(false)
  const [attachedRecipientsOnly, setAttachedRecipientsOnly] = createSignal(
    props.initialAlias.attached_recipients_only,
  )
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  const getAliasEmail = () => {
    const a = props.initialAlias
    return a.extension ? `${a.local_part}+${a.extension}@${a.domain}` : a.email
  }

  const getAliasLocalPart = () => {
    const a = props.initialAlias
    return a.extension ? `${a.local_part}+${a.extension}` : a.local_part
  }

  const getStatus = () => {
    const a = props.initialAlias
    if (a.deleted_at) return { colour: 'red', status: 'Deleted' }
    return { colour: a.active ? 'green' : 'grey', status: a.active ? 'Active' : 'Inactive' }
  }

  const editFromName = () => {
    setErrors({})
    if (fromName() !== null && fromName().length > 50) {
      const msg = "'From Name' cannot be more than 50 characters"
      setErrors({ from_name: msg })
      errorMessage(msg)
      return
    }
    setFromNameLoading(true)
    http
      .patch(`/api/v1/aliases/${props.initialAlias.id}`, { from_name: fromName() })
      .then(() => {
        setFromNameLoading(false)
        successMessage("Alias 'From Name' updated")
      })
      .catch(() => {
        setFromNameLoading(false)
        errorMessage()
      })
  }

  const enableAttachedRecipientsOnly = () => {
    http
      .post('/api/v1/attached-recipients-only', { id: props.initialAlias.id })
      .then(() => successMessage('Attached recipients only enabled'))
      .catch(() => errorMessage())
  }

  const disableAttachedRecipientsOnly = () => {
    http
      .delete(`/api/v1/attached-recipients-only/${props.initialAlias.id}`)
      .then(() => successMessage('Attached recipients only disabled'))
      .catch(() => errorMessage())
  }

  const status = getStatus()

  return (
    <div>
      <Title>Edit Alias</Title>
      <h1 id="primary-heading" class="sr-only">
        Edit Alias
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-white">Edit Alias</h1>
          <p class="mt-2 text-sm text-grey-200">Make changes to your alias</p>
        </div>
      </div>

      <div class="bg-surface rounded-md p-4">
        <div class="space-y-8 divide-y divide-border-subtle">
          <div>
            <div class="flex items-center">
              <span
                class={`bg-${status.colour}-100 tooltip outline-none h-4 w-4 rounded-full flex items-center justify-center mr-2`}
                tabindex="-1"
              >
                <span class={`bg-${status.colour}-400 h-2 w-2 rounded-full`} />
              </span>
              <h3
                class="text-xl font-medium leading-6 text-grey-100 cursor-pointer"
                onClick={() => clipboard(getAliasEmail())}
                title="Click to copy"
              >
                <span class="font-semibold text-primary">{getAliasLocalPart()}</span>
                <span class="font-semibold text-grey-200">@{props.initialAlias.domain}</span>
              </h3>
            </div>
            <Show when={props.initialAlias.description}>
              <div class="mt-2 text-sm text-grey-300">{props.initialAlias.description}</div>
            </Show>
          </div>

          <div class="pt-8">
            <div class="block text-lg font-medium text-grey-200">Alias 'From Name'</div>
            <p class="mt-1 text-base text-grey-200">
              The 'From Name' is shown when you send an email from an alias or reply anonymously to
              a forwarded email. If left blank, then the email alias itself will be used as the
              'From Name' e.g. "{props.initialAlias.email}".
            </p>
            <div class="mt-2 text-base text-grey-200">
              The 'From Name' that is used for an alias is determined by the following{' '}
              <b>priority</b>:
              <ul class="list-decimal list-inside text-grey-700 text-base mt-2 text-grey-200">
                <li>
                  <b>Alias 'From Name'</b>
                </li>
                <li>Username or Custom Domain 'From Name'</li>
                <li>Global 'From Name' from the settings page</li>
              </ul>
            </div>
            <p class="mt-2 text-base text-grey-200">
              If you set the 'From Name' for this specific alias, it will override the other
              settings.
            </p>

            <div class="mb-6">
              <div class="mt-6 grid grid-cols-1 mb-4">
                <label for="from_name" class="block text-sm font-medium leading-6 text-white">
                  Alias From Name
                </label>
                <div class="relative mt-2">
                  <input
                    type="text"
                    name="from_name"
                    id="from_name"
                    value={fromName()}
                    onInput={e => setFromName(e.currentTarget.value)}
                    class={`block w-full rounded-md border-0 py-2 pr-10 border border-border-subtle focus:border-primary/60 focus:outline-none sm:text-base sm:leading-6 text-white bg-white/5 ${errors().from_name ? 'ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'ring-grey-300 placeholder:text-grey-400 focus:ring-primary'}`}
                    placeholder="John Doe"
                  />
                  <Show when={errors().from_name}>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <Icon name="close-circle" class="h-5 w-5 text-red-500" />
                    </div>
                  </Show>
                </div>
                <Show when={errors().from_name}>
                  <p class="mt-2 text-sm text-red-600">{errors().from_name}</p>
                </Show>
              </div>
            </div>

            <button
              onClick={editFromName}
              disabled={fromNameLoading()}
              class="bg-primary hover:bg-primary/90 text-grey-950 font-bold py-3 px-4 rounded-sm w-full disabled:cursor-not-allowed"
            >
              Update Alias From Name
              <Show when={fromNameLoading()}>
                <Loader />
              </Show>
            </button>
          </div>

          <div class="pt-8">
            <label class="block font-medium text-grey-200 text-lg pointer-events-none cursor-default">
              Limit Replies/Sends to attached recipients only
            </label>
            <p class="mt-1 text-base text-grey-200">
              Toggle this option to only allow verified recipients that are <b>directly</b> attached
              to this alias to reply or send from it. If this option is enabled and no recipients
              are directly attached then it will <b>not be possible to reply/send</b> from this
              alias.
            </p>
            <Toggle
              id="can_reply_send"
              class="mt-4"
              checked={attachedRecipientsOnly()}
              onChange={checked => {
                setAttachedRecipientsOnly(checked)
                if (checked) enableAttachedRecipientsOnly()
                else disableAttachedRecipientsOnly()
              }}
            />
          </div>

          <div class="pt-5">
            <span
              class="mt-2 text-sm text-grey-300"
              title={filters.formatDate(props.initialAlias.updated_at)}
            >
              Last updated {filters.timeAgo(props.initialAlias.updated_at)}.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
