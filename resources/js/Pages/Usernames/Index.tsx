import { Title } from '@solidjs/meta'
import { createSignal, Show, For } from 'solid-js'
import { usePage, Link } from '../../lib/inertia'
import http from '../../lib/http'
import Modal from '../../Components/Modal'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import Toggle from '../../Components/Toggle'
import { filters } from '../../app'

interface RecipientOption {
  id: string
  email: string
}

interface UsernameRow {
  id: string
  username: string
  description: string | null
  active: boolean
  catch_all: boolean
  aliases_count: number
  default_recipient_id: string | null
  default_recipient: { id: string; email: string } | null
  created_at: string
}

interface UsernamesProps {
  initialRows: UsernameRow[]
  recipientOptions: RecipientOption[]
  search: string | null
  usernameCount: number
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

const clipboard = (str: string) => {
  navigator.clipboard.writeText(str).then(
    () => successMessage('Copied to clipboard'),
    () => errorMessage('Could not copy to clipboard'),
  )
}

const validUsername = (username: string) => /^[a-zA-Z0-9]*$/.test(username)

export default function UsernamesIndex(props: UsernamesProps) {
  const page = usePage()

  const [rows, setRows] = createSignal<UsernameRow[]>([...props.initialRows])
  const [newUsername, setNewUsername] = createSignal('')
  const [addUsernameLoading, setAddUsernameLoading] = createSignal(false)
  const [addUsernameModalOpen, setAddUsernameModalOpen] = createSignal(false)
  const [addUsernameError, setAddUsernameError] = createSignal('')

  const [usernameIdToEdit, setUsernameIdToEdit] = createSignal('')
  const [descriptionToEdit, setDescriptionToEdit] = createSignal('')

  const [deleteModalOpen, setDeleteModalOpen] = createSignal(false)
  const [deleteLoading, setDeleteLoading] = createSignal(false)
  const [idToDelete, setIdToDelete] = createSignal<string | null>(null)

  const [defaultRecipientModalOpen, setDefaultRecipientModalOpen] = createSignal(false)
  const [defaultRecipientLoading, setDefaultRecipientLoading] = createSignal(false)
  const [defaultRecipientUsernameToEdit, setDefaultRecipientUsernameToEdit] =
    createSignal<UsernameRow | null>(null)
  const [defaultRecipientId, setDefaultRecipientId] = createSignal<string | null>(null)

  const [makeDefaultModalOpen, setMakeDefaultModalOpen] = createSignal(false)
  const [makeDefaultLoading, setMakeDefaultLoading] = createSignal(false)
  const [usernameToMakeDefault, setUsernameToMakeDefault] = createSignal<UsernameRow | null>(null)

  const [moreInfoOpen, setMoreInfoOpen] = createSignal(false)

  const defaultUsernameId = () => (page.props as any).user?.default_username_id
  const usesExternalAuth = () => (page.props as any).usesExternalAuthentication
  const isDefault = (id: string) => defaultUsernameId() === id
  const canAddUsername = () => rows().length < props.usernameCount

  const openAddUsernameModal = () => {
    setAddUsernameError('')
    setNewUsername('')
    setAddUsernameModalOpen(true)
  }

  const validateAndAddUsername = (e: Event) => {
    e.preventDefault()
    const val = newUsername()
    setAddUsernameError('')

    if (!val) {
      setAddUsernameError('Username is required')
      return
    }
    if (!validUsername(val)) {
      setAddUsernameError('Username must only contain letters and numbers')
      return
    }
    if (val.length > 20) {
      setAddUsernameError('Username cannot be greater than 20 characters')
      return
    }

    setAddUsernameLoading(true)
    http
      .post('/api/v1/usernames', { username: val })
      .then((data: any) => {
        setRows(prev => [...prev, data.data])
        setNewUsername('')
        setAddUsernameModalOpen(false)
        successMessage('Username added')
      })
      .catch((error: any) => {
        if (error.response?.status === 403) {
          errorMessage(error.response?.data ?? error.message)
        } else if (error.response?.status === 422) {
          const msg = error.response?.data?.errors?.username?.[0] ?? error.message
          setAddUsernameError(msg)
        } else {
          errorMessage()
        }
      })
      .finally(() => setAddUsernameLoading(false))
  }

  const startEditDescription = (row: UsernameRow) => {
    setUsernameIdToEdit(row.id)
    setDescriptionToEdit(row.description ?? '')
  }

  const cancelEditDescription = () => {
    setUsernameIdToEdit('')
    setDescriptionToEdit('')
  }

  const saveDescription = (row: UsernameRow) => {
    if (descriptionToEdit().length > 200) {
      errorMessage('Description cannot be more than 200 characters')
      return
    }
    http
      .patch(`/api/v1/usernames/${row.id}`, { description: descriptionToEdit() })
      .then(() => {
        setRows(prev =>
          prev.map(r => (r.id === row.id ? { ...r, description: descriptionToEdit() } : r)),
        )
        setUsernameIdToEdit('')
        setDescriptionToEdit('')
        successMessage('Username description updated')
      })
      .catch(() => {
        setUsernameIdToEdit('')
        setDescriptionToEdit('')
        errorMessage()
      })
  }

  const openDefaultRecipientModal = (row: UsernameRow) => {
    setDefaultRecipientUsernameToEdit(row)
    setDefaultRecipientId(row.default_recipient_id)
    setDefaultRecipientModalOpen(true)
  }

  const closeDefaultRecipientModal = () => {
    setDefaultRecipientModalOpen(false)
    setDefaultRecipientUsernameToEdit(null)
    setDefaultRecipientId(null)
  }

  const saveDefaultRecipient = () => {
    const username = defaultRecipientUsernameToEdit()
    if (!username) return
    setDefaultRecipientLoading(true)
    http
      .patch(`/api/v1/usernames/${username.id}/default-recipient`, {
        default_recipient: defaultRecipientId(),
      })
      .then(() => {
        const recipient = props.recipientOptions.find(r => r.id === defaultRecipientId()) ?? null
        setRows(prev =>
          prev.map(r =>
            r.id === username.id
              ? { ...r, default_recipient: recipient, default_recipient_id: defaultRecipientId() }
              : r,
          ),
        )
        closeDefaultRecipientModal()
        successMessage("Username's default recipient updated")
      })
      .catch(() => {
        closeDefaultRecipientModal()
        errorMessage()
      })
      .finally(() => setDefaultRecipientLoading(false))
  }

  const openMakeDefaultModal = (row: UsernameRow) => {
    setUsernameToMakeDefault(row)
    setMakeDefaultModalOpen(true)
  }

  const closeMakeDefaultModal = () => {
    setMakeDefaultModalOpen(false)
    setUsernameToMakeDefault(null)
  }

  const saveMakeDefault = () => {
    const username = usernameToMakeDefault()
    if (!username) return
    setMakeDefaultLoading(true)
    http
      .post('/settings/default-username', { id: username.id })
      .then(() => {
        ;(page.props as any).user.default_username_id = username.id
        const el = document.getElementById('dropdown-username')
        if (el) el.innerText = username.username
        closeMakeDefaultModal()
        successMessage('Default username updated')
      })
      .catch((error: any) => {
        closeMakeDefaultModal()
        if (error.response?.data?.message) {
          errorMessage(error.response?.data?.message)
        } else {
          errorMessage()
        }
      })
      .finally(() => setMakeDefaultLoading(false))
  }

  const openDeleteModal = (id: string) => {
    setIdToDelete(id)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setIdToDelete(null)
  }

  const confirmDelete = () => {
    const id = idToDelete()
    if (!id) return
    setDeleteLoading(true)
    http
      .delete(`/api/v1/usernames/${id}`)
      .then(() => {
        setRows(prev => prev.filter(r => r.id !== id))
        closeDeleteModal()
      })
      .catch(() => {
        errorMessage()
        closeDeleteModal()
      })
      .finally(() => setDeleteLoading(false))
  }

  const activateUsername = (id: string) => {
    http.post('/api/v1/active-usernames', { id }).catch(() => errorMessage())
  }

  const deactivateUsername = (id: string) => {
    http.delete(`/api/v1/active-usernames/${id}`).catch(() => errorMessage())
  }

  const enableCatchAll = (id: string) => {
    http.post('/api/v1/catch-all-usernames', { id }).catch((error: any) => {
      if (error.response?.data !== undefined) {
        errorMessage(error.response?.data ?? error.message)
      } else {
        errorMessage()
      }
    })
  }

  const disableCatchAll = (id: string) => {
    http.delete(`/api/v1/catch-all-usernames/${id}`).catch((error: any) => {
      if (error.response?.data !== undefined) {
        errorMessage(error.response?.data ?? error.message)
      } else {
        errorMessage()
      }
    })
  }

  return (
    <div>
      <Title>Usernames</Title>
      <h1 id="primary-heading" class="sr-only">
        Usernames
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-white">Usernames</h1>
          <p class="mt-2 text-sm text-grey-400">
            A list of all the usernames {props.search ? 'found for your search' : 'in your account'}
            <button type="button" onClick={() => setMoreInfoOpen(true)}>
              <Icon name="info" class="inline-block w-4 h-4 cursor-pointer text-grey-500 ml-1" />
            </button>
          </p>
        </div>
        <Show when={canAddUsername()}>
          <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={openAddUsernameModal}
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-black px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            >
              Add Username
            </button>
          </div>
        </Show>
      </div>

      <Show
        when={rows().length > 0}
        fallback={
          <Show
            when={props.search}
            fallback={
              <div class="text-center py-12">
                <Icon name="users" class="mx-auto h-12 w-12 text-grey-500" />
                <h3 class="mt-3 text-lg font-medium text-white">No usernames yet</h3>
                <p class="mt-1 text-sm text-grey-400">Add a username to get started.</p>
              </div>
            }
          >
            <div class="text-center py-12">
              <Icon name="users" class="mx-auto h-12 w-12 text-grey-500" />
              <h3 class="mt-3 text-lg font-medium text-white">
                No Usernames found for that search
              </h3>
              <p class="mt-1 text-sm text-grey-400">Try entering a different search term.</p>
              <div class="mt-4">
                <Link
                  href={(window as any).route('usernames.index')}
                  class="inline-flex items-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-black px-4 py-2 text-sm font-medium"
                >
                  View All Usernames
                </Link>
              </div>
            </div>
          </Show>
        }
      >
        <div class="space-y-3">
          <For each={rows()}>
            {row => (
              <div class="bg-surface rounded-md p-4 border border-border-subtle">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      class="font-medium text-primary hover:text-primary/80"
                      onClick={() => clipboard(row.username)}
                      title="Click to copy"
                    >
                      {filters.truncate(row.username, 30)}
                    </button>
                    <Show when={isDefault(row.id)}>
                      <span class="py-0.5 px-2 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full">
                        default
                      </span>
                    </Show>
                    <Show when={!isDefault(row.id) && !usesExternalAuth()}>
                      <button
                        type="button"
                        class="text-xs text-grey-500 hover:text-white"
                        onClick={() => openMakeDefaultModal(row)}
                      >
                        Make Default
                      </button>
                    </Show>
                  </div>
                  <span
                    class="text-xs text-grey-500 cursor-default"
                    title={filters.formatDate(row.created_at)}
                  >
                    {filters.timeAgo(row.created_at)}
                  </span>
                </div>

                <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                      Description
                    </span>
                    <Show
                      when={usernameIdToEdit() === row.id}
                      fallback={
                        <div class="mt-1 flex items-center gap-2">
                          <Show
                            when={row.description}
                            fallback={
                              <button
                                type="button"
                                onClick={() => {
                                  setUsernameIdToEdit(row.id)
                                  setDescriptionToEdit('')
                                }}
                                aria-label="Add description"
                              >
                                <Icon name="plus" class="w-4 h-4 text-grey-400" />
                              </button>
                            }
                          >
                            <span class="text-sm text-grey-300">
                              {filters.truncate(row.description!, 60)}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditDescription(row)}
                              aria-label="Edit description"
                            >
                              <Icon name="edit" class="w-4 h-4 text-grey-400" />
                            </button>
                          </Show>
                        </div>
                      }
                    >
                      <div class="mt-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={descriptionToEdit()}
                          onInput={e => setDescriptionToEdit(e.currentTarget.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveDescription(row)
                            if (e.key === 'Escape') cancelEditDescription()
                          }}
                          class="grow appearance-none bg-white/5 border rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-primary"
                          classList={{
                            'border-red-500': descriptionToEdit().length > 200,
                            'border-border-subtle': descriptionToEdit().length <= 200,
                          }}
                          placeholder="Add description"
                        />
                        <button type="button" onClick={cancelEditDescription} aria-label="Cancel">
                          <Icon name="close" class="w-4 h-4 text-grey-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => saveDescription(row)}
                          aria-label="Save"
                        >
                          <Icon name="save" class="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                      Default Recipient
                    </span>
                    <Show
                      when={row.default_recipient}
                      fallback={
                        <div class="mt-1">
                          <button
                            type="button"
                            onClick={() => openDefaultRecipientModal(row)}
                            aria-label="Add Default Recipient"
                          >
                            <Icon name="plus" class="w-4 h-4 text-grey-400" />
                          </button>
                        </div>
                      }
                    >
                      <div class="mt-1 flex items-center gap-2">
                        <span
                          class="text-sm text-grey-300 cursor-pointer"
                          onClick={() => clipboard(row.default_recipient!.email)}
                          title="Click to copy"
                        >
                          {filters.truncate(row.default_recipient!.email, 30)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openDefaultRecipientModal(row)}
                          aria-label="Edit Default Recipient"
                        >
                          <Icon name="edit" class="w-4 h-4 text-grey-400" />
                        </button>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                      Aliases
                    </span>
                    <div class="mt-1">
                      <Show
                        when={row.aliases_count > 0}
                        fallback={<span class="text-sm text-grey-300">{row.aliases_count}</span>}
                      >
                        <Link
                          href={(window as any).route('aliases.index', { username: row.id })}
                          class="text-sm text-primary hover:text-primary/80 font-medium"
                          title="Click to view the aliases using this username"
                        >
                          {row.aliases_count.toLocaleString()}
                        </Link>
                      </Show>
                    </div>
                  </div>

                  <div class="flex items-center gap-6">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                        Active
                      </span>
                      <Toggle
                        checked={row.active}
                        onChange={checked => {
                          setRows(prev =>
                            prev.map(r => (r.id === row.id ? { ...r, active: checked } : r)),
                          )
                          if (checked) activateUsername(row.id)
                          else deactivateUsername(row.id)
                        }}
                      />
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                        Catch-All
                      </span>
                      <Toggle
                        checked={row.catch_all}
                        onChange={checked => {
                          setRows(prev =>
                            prev.map(r => (r.id === row.id ? { ...r, catch_all: checked } : r)),
                          )
                          if (checked) enableCatchAll(row.id)
                          else disableCatchAll(row.id)
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div class="mt-3 pt-3 border-t border-border-subtle flex items-center gap-4">
                  <Link
                    href={(window as any).route('usernames.edit', row.id)}
                    class="text-sm text-grey-300 hover:text-white font-medium"
                  >
                    Edit
                  </Link>
                  <Show when={!isDefault(row.id)}>
                    <button
                      type="button"
                      class="text-sm text-grey-300 hover:text-red-400 font-medium"
                      onClick={() => openDeleteModal(row.id)}
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

      <Modal
        open={addUsernameModalOpen()}
        onOpenChange={open => {
          if (!open) setAddUsernameModalOpen(false)
        }}
        title="Add new username"
      >
        <p class="mt-4 text-grey-300 text-sm">
          Please choose usernames carefully as you can only add a{' '}
          <b>maximum of {props.usernameCount}</b>. You can login with <b>any of your usernames</b>.
        </p>
        <p class="mt-4 text-grey-300 text-sm">
          You can prevent a username from being used to login by toggling the "can login" option.
        </p>
        <div class="mt-6">
          <Show when={addUsernameError()}>
            <p class="mb-3 text-red-500 text-sm">{addUsernameError()}</p>
          </Show>
          <input
            value={newUsername()}
            onInput={e => setNewUsername(e.currentTarget.value)}
            type="text"
            class="block w-full rounded-md border-0 py-2 pr-10 border border-border-subtle focus:border-primary/60 focus:outline-none sm:text-base sm:leading-6 text-white bg-white/5"
            classList={{
              'ring-red-500': !!addUsernameError(),
              'ring-border-subtle': !addUsernameError(),
            }}
            placeholder="johndoe"
          />
          <div class="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={validateAndAddUsername}
              class="bg-primary hover:bg-primary/90 text-black font-medium py-2 px-4 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
              disabled={addUsernameLoading()}
            >
              Add Username
              <Show when={addUsernameLoading()}>
                <Loader class="inline-block ml-2 h-4 w-4" />
              </Show>
            </button>
            <button
              type="button"
              onClick={() => setAddUsernameModalOpen(false)}
              class="px-4 py-2 font-medium bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={defaultRecipientModalOpen()}
        onOpenChange={open => {
          if (!open) closeDefaultRecipientModal()
        }}
        title="Update Default Recipient"
      >
        <p class="my-4 text-grey-300 text-sm">
          Select the default recipient for this username. This overrides the default recipient in
          your account settings. Leave it empty if you would like to use the default recipient in
          your account settings.
        </p>
        <select
          value={defaultRecipientId() ?? ''}
          onChange={e => setDefaultRecipientId(e.currentTarget.value || null)}
          class="block w-full rounded-md border-border-subtle bg-white/5 text-white sm:text-sm focus:ring-primary focus:border-primary"
        >
          <option value="" class="bg-surface">
            Select recipient
          </option>
          <For each={props.recipientOptions}>
            {opt => (
              <option value={opt.id} class="bg-surface">
                {opt.email}
              </option>
            )}
          </For>
        </select>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={saveDefaultRecipient}
            class="px-4 py-2 text-black font-medium bg-primary hover:bg-primary/90 border border-transparent rounded-md disabled:cursor-not-allowed"
            disabled={defaultRecipientLoading()}
          >
            Update Default Recipient
            <Show when={defaultRecipientLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            type="button"
            onClick={closeDefaultRecipientModal}
            class="px-4 py-2 font-medium bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded-md"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteModal()
        }}
        title="Delete username"
      >
        <p class="mt-4 text-grey-300 text-sm">
          Are you sure you want to permanently delete this username? This will also{' '}
          <b>permanently remove all aliases associated with this username</b>. You will no longer be
          able to receive any emails at this username subdomain.{' '}
          <b>This username will not be able to be used again</b>.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={confirmDelete}
            class="px-4 py-2 text-white font-medium bg-red-500 hover:bg-red-600 border border-transparent rounded-md disabled:cursor-not-allowed"
            disabled={deleteLoading()}
          >
            Delete username
            <Show when={deleteLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            type="button"
            onClick={closeDeleteModal}
            class="px-4 py-2 font-medium bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded-md"
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
        title="Make default username"
      >
        <p class="mt-4 text-grey-300 text-sm">
          The default username for your account is used in the username reminder notification.
        </p>
        <p class="mt-4 text-grey-300 text-sm">
          You will always be able to use your default username to login to your account.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={saveMakeDefault}
            class="bg-primary hover:bg-primary/90 text-black font-medium py-2 px-4 rounded-md disabled:cursor-not-allowed"
            disabled={makeDefaultLoading()}
          >
            Make default username
            <Show when={makeDefaultLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            type="button"
            onClick={closeMakeDefaultModal}
            class="px-4 py-2 font-medium bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded-md"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={moreInfoOpen()} onOpenChange={setMoreInfoOpen} title="More information">
        <p class="mt-4 text-grey-300 text-sm">
          When you add a username here you will be able to use it exactly like the username you
          signed up with!
        </p>
        <p class="mt-4 text-grey-300 text-sm">
          You can then separate aliases under your different usernames to reduce the chance of
          anyone linking ownership of them together. Great for compartmentalisation e.g. for work
          and personal emails.
        </p>
        <p class="mt-4 text-grey-300 text-sm">
          You can add a maximum of <b>{props.usernameCount}</b> usernames.
        </p>
        <div class="mt-6">
          <button
            type="button"
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-2 font-medium bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded-md"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
