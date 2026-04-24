import { Title } from '@solidjs/meta'
import { createSignal, Show, For, createMemo } from 'solid-js'
import { usePage, Link } from '../../lib/inertia'
import http from '../../lib/http'
import Modal from '../../Components/Modal'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import { filters } from '../../app'

interface BlocklistEntry {
  id: string
  user_id: string
  type: string
  value: string
  blocked: number
  last_blocked: string | null
  created_at: string
}

interface BlocklistProps {
  initialRows: BlocklistEntry[]
  search: string | null
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

export default function BlocklistIndex(props: BlocklistProps) {
  const page = usePage()

  const [rows, setRows] = createSignal<BlocklistEntry[]>([...props.initialRows])
  const [selectedRowIds, setSelectedRowIds] = createSignal<string[]>([])
  const [sortField, setSortField] = createSignal<string>('created_at')
  const [sortDir, setSortDir] = createSignal<'asc' | 'desc'>('desc')

  const [addFormType, setAddFormType] = createSignal('email')
  const [addFormValue, setAddFormValue] = createSignal('')
  const [addFormErrors, setAddFormErrors] = createSignal<Record<string, string>>({})
  const [addFormLoading, setAddFormLoading] = createSignal(false)

  const [deleteModalOpen, setDeleteModalOpen] = createSignal(false)
  const [deleteLoading, setDeleteLoading] = createSignal(false)
  const [idToDelete, setIdToDelete] = createSignal<string | null>(null)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = createSignal(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = createSignal(false)

  const [bulkAddModalOpen, setBulkAddModalOpen] = createSignal(false)
  const [bulkAddLoading, setBulkAddLoading] = createSignal(false)
  const [bulkAddType, setBulkAddType] = createSignal('email')
  const [bulkAddText, setBulkAddText] = createSignal('')
  const [bulkAddError, setBulkAddError] = createSignal<string | null>(null)

  const selectedRows = createMemo(() => rows().filter(row => selectedRowIds().includes(row.id)))

  const parsedBulkAddValues = createMemo(() => {
    const text = bulkAddText()
    if (!text) return []
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 50)
  })

  const sortedRows = createMemo(() => {
    const r = [...rows()]
    const field = sortField()
    const dir = sortDir()
    r.sort((a, b) => {
      let aVal: any = (a as any)[field]
      let bVal: any = (b as any)[field]
      if (field === 'created_at' || field === 'last_blocked') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
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

  const submitAddForm = () => {
    setAddFormErrors({})
    setAddFormLoading(true)
    http
      .post(
        '/api/v1/blocklist',
        { type: addFormType(), value: addFormValue() },
        { withCredentials: true },
      )
      .then((data: any) => {
        setRows(prev => [...prev, data.data])
        setAddFormValue('')
        successMessage('New entry added')
      })
      .catch((err: any) => {
        if (err.response?.status === 422 && err.response?.data?.errors) {
          const errors: Record<string, string> = {}
          for (const [key, messages] of Object.entries(err.response?.data?.errors ?? {})) {
            errors[key] = Array.isArray(messages) ? (messages as string[])[0] : (messages as string)
          }
          setAddFormErrors(errors)
        } else {
          errorMessage()
        }
      })
      .finally(() => setAddFormLoading(false))
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
      .delete(`/api/v1/blocklist/${id}`, { withCredentials: true })
      .then(() => {
        setRows(prev => prev.filter(row => row.id !== id))
        setSelectedRowIds(prev => prev.filter(sid => sid !== id))
        closeDeleteModal()
      })
      .catch(() => {
        errorMessage()
        setDeleteLoading(false)
        setDeleteModalOpen(false)
      })
      .finally(() => setDeleteLoading(false))
  }

  const bulkDeleteBlocklist = () => {
    const ids = selectedRowIds()
    setBulkDeleteLoading(true)
    http
      .post('/api/v1/blocklist/delete/bulk', { ids }, { withCredentials: true })
      .then((data: any) => {
        setRows(prev => prev.filter(row => !ids.includes(row.id)))
        setSelectedRowIds([])
        setBulkDeleteModalOpen(false)
        successMessage(data.message)
      })
      .catch((error: any) => {
        if (error.response?.status === 404) {
          errorMessage(error.response?.data?.message ?? 'No blocklist entries found')
        } else if (error.response?.status === 422) {
          errorMessage(
            error.response?.data?.errors
              ? Object.values(error.response?.data?.errors ?? {})
                  .flat()
                  .join(' ')
              : 'Validation failed',
          )
        } else {
          errorMessage()
        }
      })
      .finally(() => setBulkDeleteLoading(false))
  }

  const closeBulkAddModal = () => {
    setBulkAddModalOpen(false)
    setBulkAddText('')
    setBulkAddError(null)
  }

  const submitBulkAdd = () => {
    if (!parsedBulkAddValues().length) return
    setBulkAddError(null)
    setBulkAddLoading(true)
    http
      .post(
        '/api/v1/blocklist/store/bulk',
        { type: bulkAddType(), values: parsedBulkAddValues() },
        { withCredentials: true },
      )
      .then((data: any) => {
        const created = data.data || []
        setRows(prev => [...created, ...prev])
        closeBulkAddModal()
        successMessage(data.message)
      })
      .catch((error: any) => {
        if (error.response?.status === 403) {
          setBulkAddError(error.response?.data?.message ?? 'An error occurred. Please try again.')
        } else if (error.response?.status === 422 && error.response?.data?.errors) {
          const errors = error.response?.data?.errors ?? {}
          setBulkAddError(
            (Object.values(errors) as string[][]).flat().filter(Boolean)[0] ?? 'Validation failed.',
          )
        } else {
          setBulkAddError('An error occurred. Please try again.')
        }
      })
      .finally(() => setBulkAddLoading(false))
  }

  return (
    <div>
      <Title>Blocklist</Title>
      <h1 id="primary-heading" class="sr-only">
        Blocklist
      </h1>

      <div class="mb-8">
        <h1 class="text-2xl font-semibold text-white">Blocklist</h1>
        <p class="mt-1 text-sm text-grey-400">
          Blocked senders and domains
          {props.search ? ' found for your search' : ' — these entries cannot reach your aliases'}
        </p>
      </div>

      <div class="mb-8 p-5 bg-surface rounded-xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-white">Add to blocklist</h2>
          <button
            type="button"
            class="text-sm font-medium text-primary hover:text-primary/80"
            onClick={() => setBulkAddModalOpen(true)}
          >
            Bulk add
          </button>
        </div>
        <form
          class="flex flex-wrap items-end gap-4"
          onSubmit={e => {
            e.preventDefault()
            submitAddForm()
          }}
        >
          <div class="flex-shrink-0">
            <label for="blocklist-type" class="block text-sm font-medium text-grey-400 mb-1">
              Type
            </label>
            <select
              id="blocklist-type"
              value={addFormType()}
              onChange={e => setAddFormType(e.currentTarget.value)}
              class="rounded-md border-border-subtle bg-white/5 text-white focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="email" class="bg-surface">
                Email
              </option>
              <option value="domain" class="bg-surface">
                Domain
              </option>
            </select>
            <div class="mt-1 min-h-[1.25rem]">
              <Show when={addFormErrors().type}>
                <p class="text-sm text-red-400">{addFormErrors().type}</p>
              </Show>
            </div>
          </div>
          <div class="min-w-[200px] flex-1">
            <label for="blocklist-value" class="block text-sm font-medium text-grey-400 mb-1">
              {addFormType() === 'email' ? 'Email address' : 'Domain'}
            </label>
            <input
              id="blocklist-value"
              value={addFormValue()}
              onInput={e => setAddFormValue(e.currentTarget.value)}
              type="text"
              placeholder={
                addFormType() === 'email' ? 'e.g. sender@example.com' : 'e.g. example.com'
              }
              class="block w-full rounded-md border-border-subtle bg-white/5 text-white focus:border-primary focus:ring-primary sm:text-sm"
            />
            <div class="mt-1 min-h-[1.25rem]">
              <Show when={addFormErrors().value}>
                <p class="text-sm text-red-400">{addFormErrors().value}</p>
              </Show>
            </div>
          </div>
          <div class="flex flex-col">
            <span class="block text-sm font-medium mb-1 invisible" aria-hidden="true">
              Add
            </span>
            <button
              type="submit"
              class="bg-primary hover:bg-primary/90 text-charcoal font-bold py-2 px-4 rounded-md disabled:cursor-not-allowed"
              disabled={addFormLoading()}
            >
              Add to blocklist
              <Show when={addFormLoading()}>
                <Loader />
              </Show>
            </button>
            <div class="mt-1 min-h-[1.25rem]" />
          </div>
        </form>
      </div>

      <Show
        when={rows().length > 0}
        fallback={
          <Show
            when={props.search}
            fallback={
              <div class="text-center py-16">
                <Icon name="no-symbol" class="mx-auto h-12 w-12 text-grey-600" />
                <h3 class="mt-3 text-base font-medium text-white">No blocklist entries</h3>
                <p class="mt-1 text-sm text-grey-500">
                  Add an email address or domain above to block it from reaching your aliases.
                </p>
              </div>
            }
          >
            <div class="text-center py-16">
              <Icon name="no-symbol" class="mx-auto h-12 w-12 text-grey-600" />
              <h3 class="mt-3 text-base font-medium text-white">
                No blocklist entries found for that search
              </h3>
              <p class="mt-1 text-sm text-grey-500">Try entering a different search term.</p>
              <div class="mt-4">
                <Link
                  href={(window as any).route('blocklist.index')}
                  class="inline-flex items-center rounded-md bg-primary hover:bg-primary/90 text-charcoal px-4 py-2 text-sm font-medium"
                >
                  View all blocklist entries
                </Link>
              </div>
            </div>
          </Show>
        }
      >
        {/* Bulk actions bar */}
        <Show when={selectedRowIds().length > 0}>
          <div class="flex items-center gap-3 mb-4 px-1">
            <button
              type="button"
              class="inline-flex items-center rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-sm text-grey-300 hover:text-white hover:bg-white/5 disabled:cursor-not-allowed"
              disabled={bulkDeleteLoading()}
              onClick={() => {
                if (selectedRowIds().length === 1) {
                  openDeleteModal(selectedRowIds()[0])
                } else {
                  setBulkDeleteModalOpen(true)
                }
              }}
            >
              Delete
              <Show when={bulkDeleteLoading()}>
                <Loader />
              </Show>
            </button>
            <span class="text-sm text-grey-500">
              {selectedRowIds().length === 1 ? '1 entry' : `${selectedRowIds().length} entries`}{' '}
              selected
            </span>
          </div>
        </Show>

        {/* Column headers */}
        <div class="hidden sm:grid sm:grid-cols-12 gap-4 px-4 pb-2 text-xs font-medium text-grey-500 uppercase tracking-wider">
          <div class="col-span-1">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary bg-surface"
              checked={selectedRowIds().length === rows().length}
              onChange={e => {
                setSelectedRowIds(e.currentTarget.checked ? rows().map(r => r.id) : [])
              }}
            />
          </div>
          <div class="col-span-4 cursor-pointer select-none" onClick={() => toggleSort('value')}>
            Value {sortField() === 'value' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
          </div>
          <div class="col-span-2 cursor-pointer select-none" onClick={() => toggleSort('type')}>
            Type {sortField() === 'type' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
          </div>
          <div class="col-span-2">Blocked</div>
          <div
            class="col-span-2 cursor-pointer select-none"
            onClick={() => toggleSort('created_at')}
          >
            Created {sortField() === 'created_at' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
          </div>
          <div class="col-span-1" />
        </div>

        {/* List rows */}
        <div class="divide-y divide-border-subtle border-t border-border-subtle">
          <For each={sortedRows()}>
            {row => (
              <div
                class={`group flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors ${selectedRowIds().includes(row.id) ? 'bg-white/[0.03]' : ''}`}
              >
                <div class="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary bg-surface"
                    checked={selectedRowIds().includes(row.id)}
                    onChange={e => {
                      if (e.currentTarget.checked) {
                        setSelectedRowIds(prev => [...prev, row.id])
                      } else {
                        setSelectedRowIds(prev => prev.filter(id => id !== row.id))
                      }
                    }}
                  />
                </div>
                <div class="col-span-4">
                  <span
                    class="cursor-pointer text-sm font-medium text-white hover:text-primary"
                    onClick={() => clipboard(row.value)}
                    title="Click to copy"
                  >
                    {row.value}
                  </span>
                </div>
                <div class="col-span-2">
                  <span class="text-sm text-grey-400">
                    {row.type === 'email' ? 'Email' : 'Domain'}
                  </span>
                </div>
                <div class="col-span-2">
                  <Show
                    when={row.last_blocked}
                    fallback={
                      <span class="text-sm text-grey-400">{row.blocked.toLocaleString()}</span>
                    }
                  >
                    <span
                      class="text-sm font-medium text-primary"
                      title={`${filters.timeAgo(row.last_blocked!)} (${filters.formatDate(row.last_blocked!)})`}
                    >
                      {row.blocked.toLocaleString()}
                    </span>
                  </Show>
                </div>
                <div class="col-span-2">
                  <span class="text-sm text-grey-500" title={filters.formatDate(row.created_at)}>
                    {filters.timeAgo(row.created_at)}
                  </span>
                </div>
                <div class="col-span-1 flex justify-end">
                  <button
                    type="button"
                    class="text-sm text-grey-500 hover:text-red-400 transition-colors"
                    onClick={() => openDeleteModal(row.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Modal
        open={deleteModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteModal()
        }}
        title="Remove from blocklist"
      >
        <p class="mt-4 text-grey-300">
          Are you sure you want to remove this entry from your blocklist? The sender or domain will
          be able to reach your aliases again.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            class="px-4 py-2.5 text-white font-semibold bg-red-500 hover:bg-red-600 rounded-md disabled:cursor-not-allowed"
            disabled={deleteLoading()}
            onClick={confirmDelete}
          >
            Remove from blocklist
            <Show when={deleteLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
            onClick={closeDeleteModal}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={bulkDeleteModalOpen()}
        onOpenChange={setBulkDeleteModalOpen}
        title="Remove from blocklist"
      >
        <p class="mt-4 text-grey-300">
          Are you sure you want to remove these <b>{selectedRows().length}</b> entries from your
          blocklist? The senders or domains will be able to reach your aliases again.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            class="px-4 py-2.5 text-white font-semibold bg-red-500 hover:bg-red-600 rounded-md disabled:cursor-not-allowed"
            disabled={bulkDeleteLoading()}
            onClick={bulkDeleteBlocklist}
          >
            Remove from blocklist
            <Show when={bulkDeleteLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
            onClick={() => setBulkDeleteModalOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={bulkAddModalOpen()}
        onOpenChange={open => {
          if (!open) closeBulkAddModal()
        }}
        title="Bulk add to blocklist"
      >
        <p class="mt-2 text-sm text-grey-400">
          Enter one {bulkAddType() === 'email' ? 'email address' : 'domain'} per line. Duplicates
          and entries already on your blocklist will be skipped. Maximum 50 entries.
        </p>
        <div class="mt-4">
          <label for="bulk-add-type" class="block text-sm font-medium text-grey-400 mb-1">
            Type
          </label>
          <select
            id="bulk-add-type"
            value={bulkAddType()}
            onChange={e => setBulkAddType(e.currentTarget.value)}
            class="rounded-md border-border-subtle bg-white/5 text-white focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="email" class="bg-surface">
              Email
            </option>
            <option value="domain" class="bg-surface">
              Domain
            </option>
          </select>
        </div>
        <div class="mt-4">
          <label for="bulk-add-values" class="block text-sm font-medium text-grey-400 mb-1">
            Entries
          </label>
          <textarea
            id="bulk-add-values"
            value={bulkAddText()}
            onInput={e => setBulkAddText(e.currentTarget.value)}
            rows={8}
            class="block w-full rounded-md border-border-subtle bg-white/5 text-white focus:border-primary focus:ring-primary sm:text-sm font-mono"
            placeholder={
              bulkAddType() === 'email'
                ? 'spam@example.com\nnewsletter@company.com'
                : 'example.com\nspammer.org'
            }
          />
          <Show when={bulkAddError()}>
            <p class="mt-1 text-sm text-red-400">{bulkAddError()}</p>
          </Show>
        </div>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            class="bg-primary hover:bg-primary/90 text-charcoal font-bold py-2.5 px-4 rounded-md disabled:cursor-not-allowed"
            disabled={bulkAddLoading() || !parsedBulkAddValues().length}
            onClick={submitBulkAdd}
          >
            Add to blocklist
            <Show when={bulkAddLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            type="button"
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
            onClick={closeBulkAddModal}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
