import { Title } from '@solidjs/meta'
import { createSignal, Show, For, onMount, createMemo } from 'solid-js'
import { usePage, router, Link } from '../../lib/inertia'
import http from '../../lib/http'
import Modal from '../../Components/Modal'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import Toggle from '../../Components/Toggle'
import Button from '../../Components/Button'
import EmptyState from '../../Components/EmptyState'
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

  const SortLabel = (props: { field: string; label: string }) => (
    <button
      onClick={() => toggleSort(props.field)}
      class={`text-xs font-medium uppercase tracking-wider transition-colors ${
        sortField() === props.field ? 'text-primary' : 'text-grey-400 hover:text-grey-300'
      }`}
    >
      {props.label} {sortField() === props.field ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
    </button>
  )

  return (
    <div>
      <Title>Recipients</Title>
      <h1 id="primary-heading" class="sr-only">
        Recipients
      </h1>

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-white">Recipients</h1>
          <p class="mt-1 text-sm text-grey-400">
            {props.search ? 'Search results' : 'Your account recipients'}
            <button
              onClick={() => setMoreInfoOpen(!moreInfoOpen())}
              class="ml-1 text-grey-500 hover:text-grey-300"
            >
              <Icon name="info" class="inline-block w-4 h-4" />
            </button>
          </p>
        </div>
        <Button onClick={openAddRecipientModal} size="md">
          <Icon name="plus" class="w-4 h-4" />
          Add Recipient
        </Button>
      </div>

      <Show
        when={rows().length > 0}
        fallback={
          <EmptyState
            icon={<Icon name="inbox" class="h-6 w-6" />}
            title="No recipients found"
            description="Try a different search or add a new recipient."
            action={
              <Button href={(window as any).route('recipients.index')} variant="secondary" size="sm">
                View All
              </Button>
            }
          />
        }
      >
        {/* Column headers */}
        <div class="hidden sm:grid grid-cols-12 gap-4 px-4 pb-2 border-b border-border-subtle">
          <div class="col-span-4">
            <SortLabel field="email" label="Email" />
          </div>
          <div class="col-span-2">
            <SortLabel field="created_at" label="Added" />
          </div>
          <div class="col-span-1 text-xs font-medium uppercase tracking-wider text-grey-400">
            Key
          </div>
          <div class="col-span-2 text-xs font-medium uppercase tracking-wider text-grey-400">
            Aliases
          </div>
          <div class="col-span-1 text-xs font-medium uppercase tracking-wider text-grey-400">
            Encrypt
          </div>
          <div class="col-span-1 text-xs font-medium uppercase tracking-wider text-grey-400">
            Verified
          </div>
          <div class="col-span-1" />
        </div>

        {/* List rows */}
        <div class="divide-y divide-border-subtle">
          <For each={sortedRows()}>
            {row => (
              <div class="group flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-4 hover:bg-white/[0.02] transition-colors">
                {/* Email */}
                <div class="sm:col-span-4 min-w-0">
                  <button
                    class="text-sm font-medium text-white hover:text-primary transition-colors truncate block max-w-full"
                    title="Click to copy"
                    onClick={() => clipboard(row.email)}
                  >
                    {filters.truncate(row.email, 35)}
                  </button>
                  <div class="flex items-center gap-2 mt-1">
                    <Show when={isDefault(row.id)}>
                      <span class="text-[10px] font-medium uppercase tracking-wider text-primary border border-primary/30 rounded px-1.5 py-0.5">
                        Default
                      </span>
                    </Show>
                    <Show when={!isDefault(row.id) && row.email_verified_at}>
                      <button
                        onClick={() => openMakeDefaultModal(row)}
                        class="text-[10px] font-medium uppercase tracking-wider text-grey-400 hover:text-white border border-border-subtle rounded px-1.5 py-0.5 transition-colors"
                      >
                        Make Default
                      </button>
                    </Show>
                  </div>
                </div>

                {/* Created */}
                <div class="sm:col-span-2 text-sm text-grey-400">
                  <span title={filters.formatDate(row.created_at)}>
                    {filters.timeAgo(row.created_at)}
                  </span>
                </div>

                {/* Key */}
                <div class="sm:col-span-1 text-sm text-grey-400">{row.key}</div>

                {/* Alias count */}
                <div class="sm:col-span-2 text-sm">
                  <Show when={!aliasCountLoading()} fallback={<Loader />}>
                    <Show when={row.aliases_count} fallback={<span class="text-grey-400">0</span>}>
                      <Link
                        href={(window as any).route('aliases.index', { recipient: row.id })}
                        class="text-primary hover:text-primary/80 font-medium"
                      >
                        {row.aliases_count}
                      </Link>
                    </Show>
                  </Show>
                </div>

                {/* Encryption */}
                <div class="sm:col-span-1">
                  <Show
                    when={row.fingerprint}
                    fallback={
                      <button
                        onClick={() => openRecipientKeyModal(row)}
                        class="text-xs text-grey-400 hover:text-white transition-colors"
                      >
                        Add key
                      </button>
                    }
                  >
                    <div class="flex items-center gap-2">
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
                        <Icon name="fingerprint" class="w-4 h-4 text-grey-400 hover:text-white" />
                      </button>
                      <button
                        onClick={() => openDeleteRecipientKeyModal(row)}
                        title="Remove public key"
                        aria-label="Remove public key"
                      >
                        <Icon name="delete" class="w-4 h-4 text-grey-400 hover:text-red-400" />
                      </button>
                    </div>
                  </Show>
                </div>

                {/* Verified */}
                <div class="sm:col-span-1">
                  <Show
                    when={row.email_verified_at}
                    fallback={
                      <button
                        onClick={() => resendVerification(row.id)}
                        disabled={resendVerificationLoading()}
                        class="text-xs text-grey-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        Resend
                      </button>
                    }
                  >
                    <span
                      title={filters.formatDate(row.email_verified_at!)}
                      class="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-primary border border-primary/30 rounded px-1.5 py-0.5"
                    >
                      <Icon name="check" class="w-3 h-3" />
                      Verified
                    </span>
                  </Show>
                </div>

                {/* Actions */}
                <div class="sm:col-span-1 flex items-center justify-end gap-3">
                  <Link
                    href={(window as any).route('recipients.edit', row.id)}
                    class="text-sm text-grey-400 hover:text-white transition-colors"
                  >
                    Edit
                  </Link>
                  <Show when={!isDefault(row.id)}>
                    <button
                      onClick={() => openDeleteModal(row)}
                      class="text-sm text-grey-400 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Modals - unchanged logic */}
      <Modal
        open={addRecipientModalOpen()}
        onOpenChange={setAddRecipientModalOpen}
        title="Add new recipient"
      >
        <p class="mt-4 text-grey-300 text-sm">
          Enter the individual email of the new recipient. This is where your aliases will forward
          messages to.
        </p>
        <p class="mt-2 text-grey-300 text-sm">
          You will receive a verification link that expires in one hour.
        </p>
        <div class="mt-6">
          <Show when={errors().newRecipient}>
            <p class="mb-3 text-red-400 text-sm">{errors().newRecipient}</p>
          </Show>
          <input
            value={newRecipient()}
            onInput={e => setNewRecipient(e.currentTarget.value)}
            type="email"
            class={`block w-full rounded-md border-0 py-2.5 px-3 border border-border-subtle focus:border-primary/60 focus:outline-none text-sm bg-white/5 text-white placeholder:text-grey-500 outline-none transition-all ${errors().newRecipient ? 'ring-red-500' : 'ring-border-subtle focus:ring-primary'}`}
            placeholder="johndoe@example.com"
          />
          <div class="mt-4 flex gap-3">
            <button
              onClick={validateNewRecipient}
              class="bg-primary hover:bg-primary/90 text-black font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50"
              disabled={addRecipientLoading()}
            >
              Add Recipient
              <Show when={addRecipientLoading()}>
                <Loader />
              </Show>
            </button>
            <button
              onClick={() => setAddRecipientModalOpen(false)}
              class="px-4 py-2.5 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md transition-colors"
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
        <p class="mt-4 text-grey-300 text-sm">Enter your PUBLIC key data below.</p>
        <p class="mt-2 text-grey-300 text-sm">Make sure to remove Comment: and Version: lines.</p>
        <div class="mt-6">
          <Show when={errors().recipientKey}>
            <p class="mb-3 text-red-400 text-sm">{errors().recipientKey}</p>
          </Show>
          <textarea
            value={recipientKey()}
            onInput={e => setRecipientKey(e.currentTarget.value)}
            class={`block w-full rounded-md border-0 py-2.5 px-3 border border-border-subtle focus:border-primary/60 focus:outline-none text-sm bg-white/5 text-white placeholder:text-grey-500 outline-none transition-all ${errors().recipientKey ? 'ring-red-500' : 'ring-border-subtle focus:ring-primary'}`}
            placeholder="Begins with '-----BEGIN PGP PUBLIC KEY BLOCK-----'"
            rows={8}
          />
          <div class="mt-4 flex gap-3">
            <button
              onClick={validateRecipientKey}
              class="bg-primary hover:bg-primary/90 text-black font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50"
              disabled={addRecipientKeyLoading()}
            >
              Add Key
              <Show when={addRecipientKeyLoading()}>
                <Loader />
              </Show>
            </button>
            <button
              onClick={closeRecipientKeyModal}
              class="px-4 py-2.5 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md transition-colors"
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
        <p class="mt-4 text-grey-300 text-sm">
          Are you sure you want to remove the public key for this recipient? It will also be removed
          from any other recipients using the same key.
        </p>
        <div class="mt-6 flex gap-3">
          <button
            onClick={() => {
              const r = recipientKeyToDelete()
              if (r) deleteRecipientKey(r)
            }}
            class="px-4 py-2.5 text-white font-medium bg-red-500 hover:bg-red-600 rounded-md transition-colors disabled:opacity-50"
            disabled={deleteRecipientKeyLoading()}
          >
            Remove key
            <Show when={deleteRecipientKeyLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeDeleteRecipientKeyModal}
            class="px-4 py-2.5 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md transition-colors"
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
        <p class="mt-4 text-grey-300 text-sm">Are you sure you want to delete this recipient?</p>
        <div class="mt-6 flex gap-3">
          <button
            onClick={() => {
              const r = recipientToDelete()
              if (r) deleteRecipient(r)
            }}
            class="px-4 py-2.5 text-white font-medium bg-red-500 hover:bg-red-600 rounded-md transition-colors disabled:opacity-50"
            disabled={deleteRecipientLoading()}
          >
            Delete
            <Show when={deleteRecipientLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeDeleteModal}
            class="px-4 py-2.5 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md transition-colors"
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
        <p class="mt-4 text-grey-300 text-sm">
          The default recipient is used for all general email notifications and any aliases without
          specific recipients.
        </p>
        <div class="mt-6 flex gap-3">
          <button
            onClick={() => {
              const r = recipientToMakeDefault()
              if (r) makeDefaultRecipient(r)
            }}
            class="bg-primary hover:bg-primary/90 text-black font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50"
            disabled={makeDefaultLoading()}
          >
            Make default
            <Show when={makeDefaultLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeMakeDefaultModal}
            class="px-4 py-2.5 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={moreInfoOpen()} onOpenChange={setMoreInfoOpen} title="More information">
        <p class="mt-4 text-grey-300 text-sm">
          This page shows all recipients in your account - your real email addresses where aliases
          forward emails to.
        </p>
        <p class="mt-2 text-grey-300 text-sm">
          Each recipient must be verified before emails can be forwarded to it.
        </p>
        <div class="mt-6">
          <button
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-2.5 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
