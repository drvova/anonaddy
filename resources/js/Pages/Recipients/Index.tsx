import { Title } from '@solidjs/meta'
import { createSignal, Show, For, onMount, createMemo } from 'solid-js'
import { usePage, router, Link } from '../../lib/inertia'
import http from '../../lib/http'
import Modal from '../../Components/Modal'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import Toggle from '../../Components/Toggle'
import { filters } from '../../app'

interface Recipient {
  id: string
  email: string
  email_verified_at: string | null
  key: number
  should_encrypt: boolean
  fingerprint: string | null
  aliases_count: number
  default_recipient_id: string | null
  created_at: string
}

interface RecipientsProps {
  initialRows: Recipient[]
  search: string | null
}

export default function RecipientsIndex(props: RecipientsProps) {
  const page = usePage()
  const pageDefaultRecipientId = () => (page.props as any).user?.default_recipient_id

  const [rows, setRows] = createSignal<Recipient[]>([...props.initialRows])
  const [defaultRecipientId, setDefaultRecipientId] = createSignal<string | null>(
    pageDefaultRecipientId() ?? null,
  )

  const [sortField, setSortField] = createSignal<string>('created_at')
  const [sortDir, setSortDir] = createSignal<'asc' | 'desc'>('desc')

  const [newRecipient, setNewRecipient] = createSignal('')
  const [recipientKey, setRecipientKey] = createSignal('')
  const [aliasCountLoading, setAliasCountLoading] = createSignal(true)
  const [addRecipientLoading, setAddRecipientLoading] = createSignal(false)
  const [addRecipientModalOpen, setAddRecipientModalOpen] = createSignal(false)
  const [recipientToDelete, setRecipientToDelete] = createSignal<Recipient | null>(null)
  const [recipientKeyToDelete, setRecipientKeyToDelete] = createSignal<Recipient | null>(null)
  const [deleteRecipientLoading, setDeleteRecipientLoading] = createSignal(false)
  const [deleteRecipientModalOpen, setDeleteRecipientModalOpen] = createSignal(false)
  const [deleteRecipientKeyLoading, setDeleteRecipientKeyLoading] = createSignal(false)
  const [deleteRecipientKeyModalOpen, setDeleteRecipientKeyModalOpen] = createSignal(false)
  const [addRecipientKeyLoading, setAddRecipientKeyLoading] = createSignal(false)
  const [addRecipientKeyModalOpen, setAddRecipientKeyModalOpen] = createSignal(false)
  const [makeDefaultLoading, setMakeDefaultLoading] = createSignal(false)
  const [makeDefaultModalOpen, setMakeDefaultModalOpen] = createSignal(false)
  const [recipientToMakeDefault, setRecipientToMakeDefault] = createSignal<Recipient | null>(null)
  const [moreInfoOpen, setMoreInfoOpen] = createSignal(false)
  const [recipientToAddKey, setRecipientToAddKey] = createSignal<Recipient | null>(null)
  const [resendVerificationLoading, setResendVerificationLoading] = createSignal(false)
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  const sortedRows = createMemo(() => {
    const r = [...rows()]
    const field = sortField()
    const dir = sortDir()
    r.sort((a, b) => {
      let aVal: any = (a as any)[field]
      let bVal: any = (b as any)[field]
      if (field === 'created_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }
      if (field === 'email') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }
      if (field === 'key') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      }
      if (aVal < bVal) return dir === 'asc' ? -1 : 1
      if (aVal > bVal) return dir === 'asc' ? 1 : -1
      return 0
    })
    return r
  })

  const toggleSort = (field: string) => {
    if (sortField() === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const isDefault = (id: string) => defaultRecipientId() === id

  const validEmail = (email: string) => {
    const re =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email)
  }

  const validKey = (key: string) => {
    const re =
      /-----BEGIN PGP PUBLIC KEY BLOCK-----([A-Za-z0-9+=\/\n]+)-----END PGP PUBLIC KEY BLOCK-----/i
    return re.test(key)
  }

  onMount(() => {
    if (rows().length) {
      http
        .post((window as any).route('recipients.alias_count'), {
          ids: rows().map(row => row.id),
        })
        .then((data: any) => {
          Object.entries(data.count).forEach(([k, v]: [string, any]) => {
            setRows(prev =>
              prev.map((r, idx) =>
                String(idx) === k
                  ? {
                      ...r,
                      aliases_count:
                        v.aliases_count +
                        v.domain_aliases_using_as_default_count +
                        v.username_aliases_using_as_default_count,
                    }
                  : r,
              ),
            )
          })
          setAliasCountLoading(false)
        })
    }
  })

  const validateNewRecipient = (e: Event) => {
    e.preventDefault()
    setErrors({})
    const val = newRecipient()
    if (!val) {
      setErrors({ newRecipient: 'Email required' })
    } else if (!validEmail(val)) {
      setErrors({ newRecipient: 'Valid Email required' })
    }
    if (!errors().newRecipient) {
      addNewRecipient()
    }
  }

  const addNewRecipient = () => {
    setAddRecipientLoading(true)
    http
      .post('/api/v1/recipients', { email: newRecipient() })
      .then((data: any) => {
        setAddRecipientLoading(false)
        data.data.key = rows().length + 1
        setRows(prev => [...prev, data.data])
        setNewRecipient('')
        setAddRecipientModalOpen(false)
        successMessage('Recipient added and verification email sent')
      })
      .catch((error: any) => {
        setAddRecipientLoading(false)
        if (error.response?.status === 403) {
          errorMessage(error.response?.data ?? error.message)
        } else if (error.response?.status === 422) {
          errorMessage(error.response?.data?.errors?.email?.[0] ?? error.message)
        } else if (error.response?.status === 429) {
          errorMessage('You are making too many requests')
        } else {
          errorMessage()
        }
      })
  }

  const makeDefaultRecipient = (recipient: Recipient) => {
    setMakeDefaultLoading(true)
    http
      .post('/settings/default-recipient', { id: recipient.id })
      .then(() => {
        setMakeDefaultLoading(false)
        setDefaultRecipientId(recipient.id)
        closeMakeDefaultModal()
        successMessage('Default recipient updated')
      })
      .catch((error: any) => {
        closeMakeDefaultModal()
        setMakeDefaultLoading(false)
        if (error.response?.data?.message) {
          errorMessage(error.response?.data?.message)
        } else {
          errorMessage()
        }
      })
  }

  const deleteRecipient = (recipient: Recipient) => {
    setDeleteRecipientLoading(true)
    http
      .delete(`/api/v1/recipients/${recipient.id}`)
      .then(() => {
        setRows(prev => prev.filter(r => r.id !== recipient.id))
        setDeleteRecipientModalOpen(false)
        setDeleteRecipientLoading(false)
      })
      .catch(() => {
        errorMessage()
        setDeleteRecipientLoading(false)
        setDeleteRecipientModalOpen(false)
      })
  }

  const validateRecipientKey = (e: Event) => {
    e.preventDefault()
    setErrors({})
    const val = recipientKey()
    if (!val) {
      setErrors({ recipientKey: 'Key required' })
    } else if (!validKey(val)) {
      setErrors({ recipientKey: 'Valid Key required' })
    }
    if (!errors().recipientKey) {
      addRecipientKey()
    }
  }

  const addRecipientKey = () => {
    setAddRecipientKeyLoading(true)
    const recipient = recipientToAddKey()
    if (!recipient) return

    http
      .patch(`/api/v1/recipient-keys/${recipient.id}`, { key_data: recipientKey() })
      .then((data: any) => {
        setAddRecipientKeyLoading(false)
        setRows(prev =>
          prev.map(r =>
            r.id === recipient.id
              ? {
                  ...r,
                  should_encrypt: data.data.should_encrypt,
                  fingerprint: data.data.fingerprint,
                }
              : r,
          ),
        )
        setRecipientKey('')
        setAddRecipientKeyModalOpen(false)
        successMessage(
          `Key Successfully Added for ${recipient.email}. Make sure to check the fingerprint is correct!`,
        )
      })
      .catch((error: any) => {
        setAddRecipientKeyLoading(false)
        if (error.response?.data !== undefined) {
          errorMessage(error.response?.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const deleteRecipientKey = (recipient: Recipient) => {
    setDeleteRecipientKeyLoading(true)
    http
      .delete(`/api/v1/recipient-keys/${recipient.id}`)
      .then(() => {
        setRows(prev =>
          prev.map(r =>
            r.id === recipient.id ? { ...r, should_encrypt: false, fingerprint: null } : r,
          ),
        )
        setDeleteRecipientKeyModalOpen(false)
        setDeleteRecipientKeyLoading(false)
      })
      .catch((error: any) => {
        if (error.response?.data !== undefined) {
          errorMessage(error.response?.data ?? error.message)
        } else {
          errorMessage()
        }
        setDeleteRecipientKeyLoading(false)
        setDeleteRecipientKeyModalOpen(false)
      })
  }

  const turnOnEncryption = (id: string) => {
    http.post('/api/v1/encrypted-recipients', { id }).catch(() => errorMessage())
  }

  const turnOffEncryption = (id: string) => {
    http.delete(`/api/v1/encrypted-recipients/${id}`).catch(() => errorMessage())
  }

  const resendVerification = (id: string) => {
    setResendVerificationLoading(true)
    http
      .post('/api/v1/recipients/email/resend', { recipient_id: id })
      .then(() => {
        setResendVerificationLoading(false)
        successMessage('Verification email resent')
      })
      .catch((error: any) => {
        setResendVerificationLoading(false)
        if (error.response?.status === 429) {
          errorMessage('You can only resend the email once per minute')
        } else {
          errorMessage()
        }
      })
  }

  const openAddRecipientModal = () => {
    setErrors({})
    setNewRecipient('')
    setAddRecipientModalOpen(true)
  }

  const openDeleteModal = (recipient: Recipient) => {
    setDeleteRecipientModalOpen(true)
    setRecipientToDelete(recipient)
  }

  const closeDeleteModal = () => {
    setDeleteRecipientModalOpen(false)
    setRecipientToDelete(null)
  }

  const openMakeDefaultModal = (recipient: Recipient) => {
    setMakeDefaultModalOpen(true)
    setRecipientToMakeDefault(recipient)
  }

  const closeMakeDefaultModal = () => {
    setMakeDefaultModalOpen(false)
    setRecipientToMakeDefault(null)
  }

  const openDeleteRecipientKeyModal = (recipient: Recipient) => {
    setDeleteRecipientKeyModalOpen(true)
    setRecipientKeyToDelete(recipient)
  }

  const closeDeleteRecipientKeyModal = () => {
    setDeleteRecipientKeyModalOpen(false)
    setRecipientKeyToDelete(null)
  }

  const openRecipientKeyModal = (recipient: Recipient) => {
    setErrors({})
    setRecipientKey('')
    setAddRecipientKeyModalOpen(true)
    setRecipientToAddKey(recipient)
  }

  const closeRecipientKeyModal = () => {
    setAddRecipientKeyModalOpen(false)
    setRecipientToAddKey(null)
  }

  const clipboard = (str: string) => {
    navigator.clipboard.writeText(str).then(
      () => successMessage('Copied to clipboard'),
      () => errorMessage('Could not copy to clipboard'),
    )
  }

  const successMessage = (text = '') => {
    if ((window as any).__notify) {
      ;(window as any).__notify({ title: 'Success', text, type: 'success' })
    }
  }

  const errorMessage = (text = 'An error has occurred, please try again later') => {
    if ((window as any).__notify) {
      ;(window as any).__notify({ title: 'Error', text, type: 'error' })
    }
  }

  const username = () => (page.props as any).user?.username ?? ''

  return (
    <div>
      <Title>Recipients</Title>
      <h1 id="primary-heading" class="sr-only">
        Recipients
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-white">Recipients</h1>
          <p class="mt-2 text-sm text-grey-700 text-grey-200">
            A list of all the recipients{' '}
            {props.search ? 'found for your search' : 'in your account'}
            <button onClick={() => setMoreInfoOpen(!moreInfoOpen())}>
              <Icon
                name="info"
                class="inline-block w-6 h-6 cursor-pointer text-grey-500 text-grey-200"
              />
            </button>
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={openAddRecipientModal}
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-cyan-900 px-4 py-2 font-bold-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
          >
            Add Recipient
          </button>
        </div>
      </div>

      <Show
        when={rows().length > 0}
        fallback={
          <div class="text-center">
            <Icon name="inbox" class="mx-auto h-16 w-16 text-grey-400 text-grey-200" />
            <h3 class="mt-2 text-lg font-medium text-white">No Recipients found for that search</h3>
            <p class="mt-1 text-md text-grey-500 text-grey-200">
              Try entering a different search term.
            </p>
            <div class="mt-6">
              <Link
                href={(window as any).route('recipients.index')}
                class="inline-flex items-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-cyan-900 px-4 py-2 text-sm font-medium-sm focus:outline-none"
              >
                View All Recipients
              </Link>
            </div>
          </div>
        }
      >
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="border-b border-grey-100 text-grey-400 text-grey-200 border-border-subtle">
              <tr>
                <th
                  scope="col"
                  class="p-3 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('created_at')}
                >
                  Created {sortField() === 'created_at' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th scope="col" class="p-3 text-left">
                  Key
                  <span
                    title={`Use this to attach recipients to new aliases as they are created e.g. alias+key@${username()}.vovamail.xyz. You can attach multiple recipients by doing alias+2.3.4@${username()}.vovamail.xyz. Separating each key by a full stop.`}
                  >
                    <Icon
                      name="info"
                      class="inline-block w-4 h-4 text-grey-300 fill-current ml-1"
                    />
                  </span>
                </th>
                <th
                  scope="col"
                  class="p-3 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('email')}
                >
                  Email {sortField() === 'email' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th scope="col" class="p-3 text-left">
                  Alias Count
                  <span title="This shows the total number of aliases that either the recipient is directly assigned to, or where the recipient is set as the default for a custom domain or username.">
                    <Icon
                      name="info"
                      class="inline-block w-4 h-4 text-grey-300 fill-current ml-1"
                    />
                  </span>
                </th>
                <th scope="col" class="p-3 text-left">
                  Encryption
                </th>
                <th scope="col" class="p-3 text-left">
                  Verified
                </th>
                <th scope="col" class="p-3" />
              </tr>
            </thead>
            <tbody>
              <For each={sortedRows()}>
                {row => (
                  <tr class="border-b border-grey-100 border-border-subtle">
                    <td class="p-3">
                      <span
                        class="cursor-default text-sm text-grey-500 text-grey-300"
                        title={filters.formatDate(row.created_at)}
                      >
                        {filters.timeAgo(row.created_at)}
                      </span>
                    </td>
                    <td class="p-3 text-grey-500 text-grey-300">{row.key}</td>
                    <td class="p-3">
                      <button
                        class="font-medium text-grey-700 text-grey-200"
                        title="Click to copy"
                        onClick={() => clipboard(row.email)}
                      >
                        {filters.truncate(row.email, 30)}
                      </button>

                      <Show
                        when={isDefault(row.id)}
                        fallback={
                          <Show when={row.email_verified_at}>
                            <span class="block text-grey-400 text-sm py-1 text-grey-300">
                              <button onClick={() => openMakeDefaultModal(row)}>
                                Make Default
                              </button>
                            </span>
                          </Show>
                        }
                      >
                        <span
                          class="ml-3 py-1 px-2 text-sm bg-yellow-200 text-yellow-900 rounded-full"
                          title="This is your account's default recipient"
                        >
                          default
                        </span>
                      </Show>
                    </td>
                    <td class="p-3">
                      <Show when={!aliasCountLoading()} fallback={<Loader />}>
                        <Show
                          when={row.aliases_count}
                          fallback={<span class="text-grey-500 text-grey-300">0</span>}
                        >
                          <Link
                            href={(window as any).route('aliases.index', { recipient: row.id })}
                            class="text-secondary hover:text-secondary/80 text-indigo-400 hover:text-indigo-300 font-medium"
                            title={
                              isDefault(row.id)
                                ? 'Click to view the aliases using your default recipient'
                                : 'Click to view the aliases using this recipient'
                            }
                          >
                            {row.aliases_count}
                          </Link>
                        </Show>
                      </Show>
                    </td>
                    <td class="p-3">
                      <Show
                        when={row.fingerprint}
                        fallback={
                          <button
                            onClick={() => openRecipientKeyModal(row)}
                            class="text-sm text-grey-500 text-grey-300 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            Add PGP key
                          </button>
                        }
                      >
                        <div class="flex items-center">
                          <Toggle
                            checked={row.should_encrypt}
                            onChange={(checked: boolean) => {
                              setRows(prev =>
                                prev.map(r =>
                                  r.id === row.id ? { ...r, should_encrypt: checked } : r,
                                ),
                              )
                              if (checked) turnOnEncryption(row.id)
                              else turnOffEncryption(row.id)
                            }}
                          />
                          <button
                            onClick={() => clipboard(row.fingerprint!)}
                            title={row.fingerprint!}
                            aria-label="Copy fingerprint"
                          >
                            <Icon
                              name="fingerprint"
                              class="block w-6 h-6 text-grey-300 fill-current mx-2"
                            />
                          </button>
                          <button
                            onClick={() => openDeleteRecipientKeyModal(row)}
                            title="Remove public key"
                            aria-label="Remove public key"
                          >
                            <Icon name="delete" class="block w-6 h-6 text-grey-300 fill-current" />
                          </button>
                        </div>
                      </Show>
                    </td>
                    <td class="p-3">
                      <Show
                        when={row.email_verified_at}
                        fallback={
                          <button
                            onClick={() => resendVerification(row.id)}
                            class="text-sm disabled:cursor-not-allowed rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            disabled={resendVerificationLoading()}
                          >
                            Resend email
                          </button>
                        }
                      >
                        <span
                          title={filters.formatDate(row.email_verified_at!)}
                          class="py-1 px-2 bg-green-100 text-green-800 rounded-full text-xs font-semibold leading-5"
                        >
                          verified
                        </span>
                      </Show>
                    </td>
                    <td class="p-3">
                      <div class="whitespace-nowrap">
                        <Link
                          href={(window as any).route('recipients.edit', row.id)}
                          class="text-secondary hover:text-secondary/80 text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Edit<span class="sr-only">, {row.email}</span>
                        </Link>
                        <Show when={!isDefault(row.id)}>
                          <button
                            onClick={() => openDeleteModal(row)}
                            class="text-secondary hover:text-secondary/80 text-indigo-400 hover:text-indigo-300 font-medium ml-4"
                          >
                            Delete<span class="sr-only">, {row.email}</span>
                          </button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <Modal
        open={addRecipientModalOpen()}
        onOpenChange={setAddRecipientModalOpen}
        title="Add new recipient"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          Enter the individual email of the new recipient you'd like to add. This is where your
          aliases will <b>forward messages to</b>.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          You will receive an email with a verification link that will <b>expire in one hour</b>,
          you can click "Resend email" to get a new one.
        </p>
        <div class="mt-6">
          <Show when={errors().newRecipient}>
            <p class="mb-3 text-red-500 text-sm">{errors().newRecipient}</p>
          </Show>
          <input
            value={newRecipient()}
            onInput={e => setNewRecipient(e.currentTarget.value)}
            type="email"
            class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 mb-6 bg-white/5 text-white ${errors().newRecipient ? 'ring-red-500' : ''}`}
            placeholder="johndoe@example.com"
          />
          <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={validateNewRecipient}
              class="bg-primary hover:bg-primary/90 text-cyan-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
              disabled={addRecipientLoading()}
            >
              Add Recipient
              <Show when={addRecipientLoading()}>
                <Loader />
              </Show>
            </button>
            <button
              onClick={() => setAddRecipientModalOpen(false)}
              class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={addRecipientKeyModalOpen()}
        onOpenChange={open => {
          if (!open) closeRecipientKeyModal()
        }}
        title="Add Public GPG Key"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          Enter your <b>PUBLIC</b> key data in the text area below.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          Make sure to remove <b>Comment:</b> and <b>Version:</b>
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          ElGamal keys are{' '}
          <a
            href="https://sequoia-pgp.org/status/#public-key-algorithms"
            class="text-secondary text-indigo-400"
            target="_blank"
            rel="nofollow noreferrer noopener"
          >
            not currently supported
          </a>
          .
        </p>
        <div class="mt-6">
          <Show when={errors().recipientKey}>
            <p class="mb-3 text-red-500 text-sm">{errors().recipientKey}</p>
          </Show>
          <textarea
            value={recipientKey()}
            onInput={e => setRecipientKey(e.currentTarget.value)}
            class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 mb-6 bg-white/5 text-white ${errors().recipientKey ? 'ring-red-500' : ''}`}
            placeholder="Begins with '-----BEGIN PGP PUBLIC KEY BLOCK-----'"
            rows={10}
          />
          <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={validateRecipientKey}
              class="bg-primary hover:bg-primary/90 text-cyan-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
              disabled={addRecipientKeyLoading()}
            >
              Add Key
              <Show when={addRecipientKeyLoading()}>
                <Loader />
              </Show>
            </button>
            <button
              onClick={closeRecipientKeyModal}
              class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteRecipientKeyModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteRecipientKeyModal()
        }}
        title="Remove recipient public key"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          Are you sure you want to remove the public key for this recipient? It will also be removed
          from any other recipients using the same key.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => {
              const r = recipientKeyToDelete()
              if (r) deleteRecipientKey(r)
            }}
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={deleteRecipientKeyLoading()}
          >
            Remove public key
            <Show when={deleteRecipientLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeDeleteRecipientKeyModal}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteRecipientModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteModal()
        }}
        title="Delete recipient"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          Are you sure you want to delete this recipient?
        </p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => {
              const r = recipientToDelete()
              if (r) deleteRecipient(r)
            }}
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={deleteRecipientLoading()}
          >
            Delete recipient
            <Show when={deleteRecipientLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeDeleteModal}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={makeDefaultModalOpen()}
        onOpenChange={open => {
          if (!open) closeMakeDefaultModal()
        }}
        title="Make default recipient"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          The default recipient for your account is used for all general email notifications.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          It is also used for any aliases that do not have any specific recipients set.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => {
              const r = recipientToMakeDefault()
              if (r) makeDefaultRecipient(r)
            }}
            class="bg-primary hover:bg-primary/90 text-cyan-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={makeDefaultLoading()}
          >
            Make default recipient
            <Show when={makeDefaultLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeMakeDefaultModal}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={moreInfoOpen()} onOpenChange={setMoreInfoOpen} title="More information">
        <p class="mt-4 text-grey-700 text-grey-200">
          This page shows all of the recipients in your account, these are your real email addresses
          where emails can be forwarded to.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          You must verify each recipient before you can forwarded emails to it.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          To update your account's default recipient email address click "Make Default" next to that
          recipient.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row">
          <button
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
