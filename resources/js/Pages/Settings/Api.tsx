import { createSignal, Show, For } from 'solid-js'
import { Title } from '@solidjs/meta'
import { usePage } from '../../lib/inertia'
import SettingsLayout from '../../Layouts/SettingsLayout'
import Loader from '../../Components/Loader'
import Modal from '../../Components/Modal'
import http from '../../lib/http'

const successMessage = (text = '') =>
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Success', text, type: 'success' } }),
  )
const errorMessage = (text = 'An error has occurred, please try again later') =>
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Error', text, type: 'error' } }),
  )

interface Token {
  id: number
  name: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
}

export default function ApiSettings(props: { initialTokens: { data: Token[] } }) {
  const page = usePage()

  const [tokens, setTokens] = createSignal<Token[]>(props.initialTokens.data)
  const [accessToken, setAccessToken] = createSignal<string | null>(null)
  const [createTokenModalOpen, setCreateTokenModalOpen] = createSignal(false)
  const [revokeTokenModalOpen, setRevokeTokenModalOpen] = createSignal(false)
  const [tokenToRevoke, setTokenToRevoke] = createSignal<Token | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [revokeTokenLoading, setRevokeTokenLoading] = createSignal(false)
  const [formName, setFormName] = createSignal('')
  const [formExpiration, setFormExpiration] = createSignal<string | null>(null)
  const [formPassword, setFormPassword] = createSignal('')
  const [formErrors, setFormErrors] = createSignal<Record<string, string[]>>({})

  const isObject = (val: any) =>
    val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0

  const store = () => {
    setFormErrors({})

    if (!formName().length) {
      setFormErrors({ name: ['The name field is required.'] })
      return
    }

    if (!['day', 'week', 'month', 'year', null].includes(formExpiration())) {
      setFormErrors({ expiration: ['Invalid expiration given.'] })
      return
    }

    if (!formPassword().length && !(page.props as any).usesExternalAuthentication) {
      setFormErrors({ password: ['The password field is required.'] })
      return
    }

    setLoading(true)
    setAccessToken(null)

    http
      .post('/settings/personal-access-tokens', {
        name: formName(),
        expiration: formExpiration(),
        password: formPassword(),
      })
      .then((data: any) => {
        setLoading(false)
        setFormName('')
        setFormPassword('')
        setFormExpiration(null)
        setFormErrors({})
        setTokens(prev => [...prev, data.token])
        setAccessToken(data.accessToken)
      })
      .catch((error: any) => {
        setLoading(false)
        if (isObject(error.response?.data?.errors)) {
          setFormErrors(error.response.data.errors)
        } else {
          errorMessage()
        }
      })
  }

  const showRevokeModal = (token: Token) => {
    setTokenToRevoke(token)
    setRevokeTokenModalOpen(true)
  }

  const revoke = () => {
    setRevokeTokenLoading(true)

    http
      .delete(`/settings/personal-access-tokens/${tokenToRevoke()!.id}`)
      .then(() => {
        setRevokeTokenLoading(false)
        setRevokeTokenModalOpen(false)
        const id = tokenToRevoke()!.id
        setTokens(prev => prev.filter(t => t.id !== id))
        setTokenToRevoke(null)
      })
      .catch(() => {
        setRevokeTokenLoading(false)
        setRevokeTokenModalOpen(false)
        errorMessage()
      })
  }

  const openCreateTokenModal = () => {
    setAccessToken(null)
    setCreateTokenModalOpen(true)
  }

  const closeCreateTokenModal = () => {
    setCreateTokenModalOpen(false)
  }

  const closeRevokeTokenModal = () => {
    setRevokeTokenModalOpen(false)
  }

  const clipboard = (str: string) => {
    navigator.clipboard.writeText(str).then(
      () => successMessage('Copied to clipboard'),
      () => errorMessage('Could not copy to clipboard'),
    )
  }

  return (
    <SettingsLayout>
      <Title>API Settings</Title>
      <div class="divide-y divide-grey-200">
        <div class="pt-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Manage your API Access Keys</h3>
            <p class="text-base text-grey-700 text-grey-200">
              Your API access keys can be used with the browser extension on{' '}
              <a
                href="https://addons.mozilla.org/en-GB/firefox/addon/addy_io/"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="text-secondary text-indigo-400"
              >
                Firefox
              </a>
              ,{' '}
              <a
                href="https://chrome.google.com/webstore/detail/addyio-anonymous-email-fo/iadbdpnoknmbdeolbapdackdcogdmjpe"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="text-secondary text-indigo-400"
              >
                Chrome
              </a>
              ,{' '}
              <a
                href="https://microsoftedge.microsoft.com/addons/detail/addyio-anonymous-email/ohjlgpcfncgkijjfmabldlgnccmgcehl"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="text-secondary text-indigo-400"
              >
                Edge
              </a>{' '}
              and{' '}
              <a
                href="https://apps.apple.com/app/addy-io-extension/id6670220050"
                target="_blank"
                rel="nofollow noopener noreferrer"
                class="text-secondary text-indigo-400"
              >
                Safari
              </a>{' '}
              to create new aliases. They can also be used with the official mobile apps. Simply
              paste a key you've created into the browser extension or mobile apps to get started.
              Your API access keys <b>are secret and should be treated like your password</b>. For
              more information please see the{' '}
              <a href="/docs" class="text-secondary text-indigo-400">
                API documentation
              </a>
              .
            </p>
          </div>
          <div class="mt-4">
            <button
              onClick={openCreateTokenModal}
              class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded w-full"
            >
              Create New API Key
            </button>

            <div class="mt-6">
              <h3 class="text-lg font-medium leading-6 text-white">Personal Access Keys</h3>

              <div class="my-4 w-24 border-b-2 border-grey-200"></div>

              <p class="my-6 text-base text-grey-700 text-grey-200">
                Keys you have created that can be used to access the API. To revoke an access key
                simply click the delete button next to it.
              </p>

              <div>
                <Show when={tokens().length === 0}>
                  <p class="mb-0 text-base text-grey-700 text-grey-200">
                    You have not created any personal access tokens.
                  </p>
                </Show>

                <Show when={tokens().length > 0}>
                  <div class="table w-full text-sm md:text-base">
                    <div class="table-row">
                      <div class="table-cell p-1 md:p-4 font-semibold">Name</div>
                      <div class="table-cell p-1 md:p-4 font-semibold">Created</div>
                      <div class="table-cell p-1 md:p-4 font-semibold">Last Used</div>
                      <div class="table-cell p-1 md:p-4 font-semibold">Expires At</div>
                      <div class="table-cell p-1 md:p-4"></div>
                    </div>
                    <For each={tokens()}>
                      {token => (
                        <div class="table-row even:bg-white/5 odd:bg-surface even:bg-surface odd:bg-surface">
                          <div class="table-cell p-1 md:p-4">{token.name}</div>
                          <div class="table-cell p-1 md:p-4">
                            {(window as any).filters?.timeAgo?.(token.created_at) ??
                              token.created_at}
                          </div>
                          <div class="table-cell p-1 md:p-4">
                            {token.last_used_at
                              ? ((window as any).filters?.timeAgo?.(token.last_used_at) ??
                                token.last_used_at)
                              : 'Not used yet'}
                          </div>
                          <div class="table-cell p-1 md:p-4">
                            {token.expires_at
                              ? ((window as any).filters?.formatDate?.(token.expires_at) ??
                                token.expires_at)
                              : 'Does not expire'}
                          </div>
                          <div class="table-cell p-1 md:p-4 text-right">
                            <button
                              class="text-red-500 font-bold cursor-pointer rounded-sm"
                              onClick={() => showRevokeModal(token)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={createTokenModalOpen()}
        onOpenChange={setCreateTokenModalOpen}
        title={accessToken() ? 'Personal Access Key' : 'Create New API Key'}
      >
        <Show when={!accessToken()}>
          <div>
            <p class="mt-4 text-grey-700 text-grey-200">
              What's this API key going to be used for? Give it a short name so that you remember
              later. You can also select an expiry date for the key if you wish.
            </p>
            <div class="mt-6">
              <Show when={isObject(formErrors())}>
                <div class="mb-3 text-red-500">
                  <ul>
                    <For each={Object.values(formErrors())}>
                      {(errors: any) => <li>{errors[0]}</li>}
                    </For>
                  </ul>
                </div>
              </Show>
              <label
                for="create-token-name"
                class="block text-sm my-2 font-medium leading-6 text-grey-600 text-white"
              >
                Name
              </label>
              <input
                value={formName()}
                onInput={e => setFormName(e.currentTarget.value)}
                type="text"
                id="create-token-name"
                class="block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 bg-white/5 text-white"
                classList={{ 'ring-red-500': !!formErrors().name }}
                placeholder="e.g. Firefox extension"
                required
              />
              <label
                for="create-token-expiration"
                class="block font-medium leading-6 text-grey-600 text-sm my-2 text-white"
              >
                Expiration
              </label>
              <div class="block relative">
                <select
                  value={formExpiration() ?? ''}
                  onChange={e => setFormExpiration(e.currentTarget.value || null)}
                  id="create-token-expiration"
                  class="relative block w-full rounded border-0 bg-transparent py-2 text-white bg-white/5 ring-1 ring-inset focus:z-10 focus:ring-2 focus:ring-inset sm:text-base sm:leading-6"
                  classList={{ 'ring-red-500': !!formErrors().expiration }}
                >
                  <option class="bg-surface" value="day">
                    1 day
                  </option>
                  <option class="bg-surface" value="week">
                    1 week
                  </option>
                  <option class="bg-surface" value="month">
                    1 month
                  </option>
                  <option class="bg-surface" value="year">
                    1 year
                  </option>
                  <option class="bg-surface" value="">
                    No expiration
                  </option>
                </select>
              </div>
              <Show when={!(page.props as any).usesExternalAuthentication}>
                <label
                  for="create-token-password"
                  class="block text-sm my-2 font-medium leading-6 text-grey-600 text-white"
                >
                  Confirm Password
                </label>
                <input
                  value={formPassword()}
                  onInput={e => setFormPassword(e.currentTarget.value)}
                  type="password"
                  id="create-token-password"
                  class="block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 mb-6 bg-white/5 text-white"
                  classList={{ 'ring-red-500': !!formErrors().password }}
                  placeholder="********"
                  required
                />
              </Show>
              <button
                onClick={store}
                class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded disabled:cursor-not-allowed"
                disabled={loading()}
              >
                Create API Key
                {loading() && <Loader />}
              </button>
              <button
                onClick={closeCreateTokenModal}
                class="ml-4 px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded"
              >
                Close
              </button>
            </div>
          </div>
        </Show>
        <Show when={accessToken()}>
          <div>
            <p class="my-4 text-grey-700 text-grey-200">
              This is your new personal access key.
              <b>This is the only time the key will ever be displayed</b>, so please make a note of
              it in a safe place (e.g. password manager)!
            </p>
            <pre
              onClick={() => clipboard(accessToken()!)}
              class="w-full bg-grey-100 border border-transparent text-grey-700 rounded p-3 text-md break-all bg-white/5 text-white cursor-pointer"
              title="Copy To Clipboard"
            >
              <code class="break-all whitespace-normal">{accessToken()}</code>
            </pre>
            <p class="text-left text-sm mt-2 text-grey-700 text-grey-200">
              You can scan this QR code to automatically login to the vovamail.xyz mobile app.
            </p>
            <div class="mt-6">
              <button
                class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded"
                onClick={() => clipboard(accessToken()!)}
              >
                Copy To Clipboard
              </button>
              <button
                onClick={closeCreateTokenModal}
                class="ml-4 px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded"
              >
                Close
              </button>
            </div>
          </div>
        </Show>
      </Modal>

      <Modal
        open={revokeTokenModalOpen()}
        onOpenChange={setRevokeTokenModalOpen}
        title="Revoke API Access Key"
      >
        <p class="my-4 text-grey-700 text-grey-200">
          Any browser extension, application or script using this API access key will no longer be
          able to access the API. This action cannot be undone.
        </p>
        <div class="mt-6">
          <button
            onClick={revoke}
            class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded disabled:cursor-not-allowed"
            disabled={revokeTokenLoading()}
          >
            Revoke API Key
            {revokeTokenLoading() && <Loader />}
          </button>
          <button
            onClick={closeRevokeTokenModal}
            class="ml-4 px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded"
          >
            Close
          </button>
        </div>
      </Modal>
    </SettingsLayout>
  )
}
