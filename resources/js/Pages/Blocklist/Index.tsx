import { Title } from '@solidjs/meta'
import { createSignal, Show, For, onMount, createMemo } from 'solid-js'
import { usePage } from '../../lib/inertia'
import { Link } from '../../lib/inertia'
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

  const indeterminate = createMemo(
    () => selectedRowIds().length > 0 && selectedRowIds().length < rows().length,
  )

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

  return (
    <div>
      <Title>Blocklist</Title>
      <h1 id="primary-heading" class="sr-only">
        Blocklist
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-white">Blocklist</h1>
          <p class="mt-2 text-sm text-grey-700 text-grey-200">
            Blocked senders and domains
            {props.search ? ' found for your search' : ' - these entries cannot reach your aliases'}
          </p>
        </div>
      </div>

      <div class="mb-6 p-4 bg-surface rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-medium text-white">Add to blocklist</h2>
          <button
            type="button"
            class="text-sm font-medium text-secondary hover:text-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
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
            <label
              for="blocklist-type"
              class="block text-sm font-medium text-grey-700 text-grey-200 mb-1"
            >
              Type
            </label>
            <select
              id="blocklist-type"
              value={addFormType()}
              onChange={e => setAddFormType(e.currentTarget.value)}
              class="rounded-md border-border-subtle bg-white/5 text-white-sm focus:border-secondary focus:ring-secondary sm:text-sm"
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
                <p class="text-sm text-red-500">{addFormErrors().type}</p>
              </Show>
            </div>
          </div>
          <div class="min-w-[200px] flex-1">
            <label
              for="blocklist-value"
              class="block text-sm font-medium text-grey-700 text-grey-200 mb-1"
            >
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
              class="block w-full rounded-md border-border-subtle bg-white/5 text-white-sm focus:border-secondary focus:ring-secondary sm:text-sm"
            />
            <div class="mt-1 min-h-[1.25rem]">
              <Show when={addFormErrors().value}>
                <p class="text-sm text-red-500">{addFormErrors().value}</p>
              </Show>
            </div>
          </div>
          <div class="flex flex-col">
            <span class="block text-sm font-medium mb-1 invisible" aria-hidden="true">
              Add
            </span>
            <button
              type="submit"
              class="bg-primary hover:bg-primary/90 text-cyan-900 font-bold py-2 px-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
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
              <div class="text-center py-12">
                <Icon name="no-symbol" class="mx-auto h-16 w-16 text-grey-400 text-grey-200" />
                <h3 class="mt-2 text-lg font-medium text-white">No blocklist entries</h3>
                <p class="mt-1 text-md text-grey-500 text-grey-200">
                  Add an email address or domain above to block it from reaching your aliases.
                </p>
              </div>
            }
          >
            <div class="text-center py-12">
              <Icon name="no-symbol" class="mx-auto h-16 w-16 text-grey-400 text-grey-200" />
              <h3 class="mt-2 text-lg font-medium text-white">
                No blocklist entries found for that search
              </h3>
              <p class="mt-1 text-md text-grey-500 text-grey-200">
                Try entering a different search term.
              </p>
              <div class="mt-6">
                <Link
                  href={(window as any).route('blocklist.index')}
                  class="inline-flex items-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-cyan-900 px-4 py-2 text-sm font-medium-sm focus:outline-none"
                >
                  View all blocklist entries
                </Link>
              </div>
            </div>
          </Show>
        }
      >
        <div class="relative">
          <Show when={selectedRowIds().length > 0}>
            <div
              id="bulk-actions"
              class="absolute px-0.5 top-0 left-12 flex flex-nowrap h-12 items-center space-x-3 bg-gradient-to-r from-white from-surface z-10 overflow-x-auto"
              style={{ width: 'calc(100% - 3rem)' }}
            >
              <button
                type="button"
                class="ml-1 inline-flex items-center rounded border border-grey-300 bg-surface px-2.5 py-1.5 text-xs font-medium text-grey-700-sm hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 border-border-subtle bg-surface text-grey-200 hover:bg-white/5"
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
              <span class="font-semibold text-secondary hidden md:inline-block text-indigo-400">
                {selectedRowIds().length === 1 ? '1 entry' : `${selectedRowIds().length} entries`}
              </span>
            </div>
          </Show>

          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="border-b border-grey-100 text-grey-400 text-grey-200 border-border-subtle">
                <tr>
                  <th scope="col" class="p-3 w-10">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-grey-300 text-secondary focus:ring-primary text-indigo-400 bg-surface"
                      checked={indeterminate() || selectedRowIds().length === rows().length}
                      ref={el => {
                        ;(el as any).indeterminate = indeterminate()
                      }}
                      onChange={e => {
                        setSelectedRowIds(e.currentTarget.checked ? rows().map(r => r.id) : [])
                      }}
                    />
                  </th>
                  <th
                    scope="col"
                    class="p-3 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('value')}
                  >
                    Value {sortField() === 'value' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
                    <span class={selectedRowIds().length > 0 ? 'blur-sm' : ''} />
                  </th>
                  <th
                    scope="col"
                    class="p-3 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('type')}
                  >
                    Type {sortField() === 'type' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
                    <span class={selectedRowIds().length > 0 ? 'blur-sm' : ''} />
                  </th>
                  <th scope="col" class="p-3 text-left">
                    <span class={selectedRowIds().length > 0 ? 'blur-sm' : ''}>
                      Blocked
                      <Icon
                        name="info"
                        class="inline-block w-4 h-4 text-grey-300 fill-current ml-1"
                      />
                    </span>
                  </th>
                  <th
                    scope="col"
                    class="p-3 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('created_at')}
                  >
                    <span class={selectedRowIds().length > 0 ? 'blur-sm' : ''}>
                      Created{' '}
                      {sortField() === 'created_at' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
                    </span>
                  </th>
                  <th scope="col" class="p-3" />
                </tr>
              </thead>
              <tbody>
                <For each={sortedRows()}>
                  {row => (
                    <tr
                      class={`border-b border-grey-100 border-border-subtle ${
                        selectedRowIds().includes(row.id) ? 'bg-white/5 bg-surface' : ''
                      }`}
                    >
                      <td class="p-3 relative">
                        <Show when={selectedRowIds().includes(row.id)}>
                          <div class="absolute inset-y-0 left-0 w-0.5 bg-secondary" />
                        </Show>
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-grey-300 text-secondary focus:ring-primary text-indigo-400 bg-surface"
                          checked={selectedRowIds().includes(row.id)}
                          onChange={e => {
                            if (e.currentTarget.checked) {
                              setSelectedRowIds(prev => [...prev, row.id])
                            } else {
                              setSelectedRowIds(prev => prev.filter(id => id !== row.id))
                            }
                          }}
                        />
                      </td>
                      <td class="p-3">
                        <span
                          class="cursor-pointer text-sm font-medium text-grey-700 text-grey-200"
                          onClick={() => clipboard(row.value)}
                          title="Click to copy"
                        >
                          {row.value}
                        </span>
                      </td>
                      <td class="p-3">
                        <span class="text-sm text-grey-500 text-grey-300">
                          {row.type === 'email' ? 'Email' : 'Domain'}
                        </span>
                      </td>
                      <td class="p-3">
                        <Show
                          when={row.last_blocked}
                          fallback={
                            <span class="text-grey-300">{row.blocked.toLocaleString()} </span>
                          }
                        >
                          <span
                            class="font-semibold text-secondary text-indigo-400"
                            title={`${filters.timeAgo(row.last_blocked!)} (${filters.formatDate(row.last_blocked!)})`}
                          >
                            {row.blocked.toLocaleString()}
                          </span>
                        </Show>
                      </td>
                      <td class="p-3">
                        <span
                          class="cursor-default text-sm text-grey-500 text-grey-300"
                          title={filters.formatDate(row.created_at)}
                        >
                          {filters.timeAgo(row.created_at)}
                        </span>
                      </td>
                      <td class="p-3 text-right">
                        <button
                          type="button"
                          class="text-secondary hover:text-secondary/80 text-indigo-400 hover:text-indigo-300 font-medium"
                          onClick={() => openDeleteModal(row.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Modal
        open={deleteModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteModal()
        }}
        title="Remove from blocklist"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          Are you sure you want to remove this entry from your blocklist? The sender or domain will
          be able to reach your aliases again.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={deleteLoading()}
            onClick={confirmDelete}
          >
            Remove from blocklist
            <Show when={deleteLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
        <p class="mt-4 text-grey-700 text-grey-200">
          Are you sure you want to remove these <b>{selectedRows().length}</b> entries from your
          blocklist? The senders or domains will be able to reach your aliases again.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={bulkDeleteLoading()}
            onClick={bulkDeleteBlocklist}
          >
            Remove from blocklist
            <Show when={bulkDeleteLoading()}>
              <Loader class="inline-block ml-2 h-4 w-4" />
            </Show>
          </button>
          <button
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
        <p class="mt-2 text-sm text-grey-600 text-grey-300">
          Enter one {bulkAddType() === 'email' ? 'email address' : 'domain'} per line. Duplicates
          and entries already on your blocklist will be skipped. Maximum 50 entries.
        </p>
        <div class="mt-4">
          <label
            for="bulk-add-type"
            class="block text-sm font-medium text-grey-700 text-grey-200 mb-1"
          >
            Type
          </label>
          <select
            id="bulk-add-type"
            value={bulkAddType()}
            onChange={e => setBulkAddType(e.currentTarget.value)}
            class="rounded-md border-border-subtle bg-white/5 text-white-sm focus:border-secondary focus:ring-secondary sm:text-sm"
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
          <label
            for="bulk-add-values"
            class="block text-sm font-medium text-grey-700 text-grey-200 mb-1"
          >
            Entries
          </label>
          <textarea
            id="bulk-add-values"
            value={bulkAddText()}
            onInput={e => setBulkAddText(e.currentTarget.value)}
            rows={8}
            class="block w-full rounded-md border-border-subtle bg-white/5 text-white-sm focus:border-secondary focus:ring-secondary sm:text-sm font-mono"
            placeholder={
              bulkAddType() === 'email'
                ? 'spam@example.com\nnewsletter@company.com'
                : 'example.com\nspammer.org'
            }
          />
          <Show when={bulkAddError()}>
            <p class="mt-1 text-sm text-red-500">{bulkAddError()}</p>
          </Show>
        </div>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            class="bg-primary hover:bg-primary/90 text-cyan-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
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
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={closeBulkAddModal}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
