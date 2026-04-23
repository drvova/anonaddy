import { Title } from '@solidjs/meta'
import { createSignal, Show, For, createEffect } from 'solid-js'
import { usePage, router, Link, Deferred } from '../lib/inertia'
import http from '../lib/http'
import Modal from '../Components/Modal'
import Loader from '../Components/Loader'
import Icon from '../Components/Icon'
import { filters } from '../app'
import { omit } from 'es-toolkit'

interface FailedDeliveryAlias {
  email: string
}

interface FailedDeliveryRecipient {
  email: string
}

interface FailedDelivery {
  id: string
  created_at: string
  email_type: string
  destination: string
  alias: FailedDeliveryAlias | null
  sender: string
  remote_mta: string
  code: string
  attempted_at: string
  is_stored: boolean
  quarantined: boolean
  resent: boolean
  recipient: FailedDeliveryRecipient | null
}

interface PaginatedLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginatedData {
  data: FailedDelivery[]
  links: PaginatedLink[]
  from: number
  to: number
  total: number
  prev_page_url: string | null
  next_page_url: string | null
}

interface RecipientOption {
  id: string
  email: string
}

interface FailedDeliveriesProps {
  initialRows: PaginatedData
  recipientOptions: RecipientOption[]
  search: string | null
  initialFilter: string
  initialPageSize: number
}

const pageSizeOptions = [25, 50, 100]

export default function FailedDeliveries(props: FailedDeliveriesProps) {
  const page = usePage()

  const [rows, setRows] = createSignal<FailedDelivery[]>(props.initialRows?.data ?? [])
  const [links, setLinks] = createSignal<PaginatedLink[]>(props.initialRows?.links?.slice(1, -1) ?? [])
  const [filterType, setFilterType] = createSignal(props.initialFilter ?? 'all')
  const [pageSize, setPageSize] = createSignal(props.initialPageSize ?? 25)
  const [updatePageSizeLoading, setUpdatePageSizeLoading] = createSignal(false)

  const [resendModalOpen, setResendModalOpen] = createSignal(false)
  const [resendLoading, setResendLoading] = createSignal(false)
  const [failedDeliveryToResend, setFailedDeliveryToResend] = createSignal<FailedDelivery | null>(null)
  const [selectedRecipientIds, setSelectedRecipientIds] = createSignal<string[]>([])

  const [deleteModalOpen, setDeleteModalOpen] = createSignal(false)
  const [deleteLoading, setDeleteLoading] = createSignal(false)
  const [failedDeliveryIdToDelete, setFailedDeliveryIdToDelete] = createSignal<string | null>(null)

  const [blockSenderModalOpen, setBlockSenderModalOpen] = createSignal(false)
  const [blockSenderLoading, setBlockSenderLoading] = createSignal(false)
  const [blockSenderType, setBlockSenderType] = createSignal<string | null>(null)
  const [senderToBlock, setSenderToBlock] = createSignal<FailedDelivery | null>(null)

  const [moreInfoOpen, setMoreInfoOpen] = createSignal(false)

  createEffect(() => {
    const data = props.initialRows
    if (data) {
      setRows(data.data ?? [])
      setLinks(data.links?.slice(1, -1) ?? [])
    }
  })

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

  const visitWithParams = (extraParams: Record<string, any> = {}, omitKeys: string[] = []) => {
    const currentParams = { ...((window as any).route().params as Record<string, any>) }
    let params = Object.assign({}, currentParams, extraParams)

    if (filterType() === 'all') {
      omitKeys.push('filter')
    }
    if (pageSize() === 25) {
      omitKeys.push('page_size')
    }

    router.visit((window as any).route('failed_deliveries.index', omit(params, omitKeys)), {
      only: ['initialRows', 'search', 'initialFilter', 'initialPageSize'],
      preserveState: true,
    })
  }

  const updateFilter = () => {
    visitWithParams({ filter: filterType() }, ['page'])
  }

  const updatePageSize = () => {
    setUpdatePageSizeLoading(true)
    visitWithParams({ page_size: pageSize() }, ['page'])
    setUpdatePageSizeLoading(false)
  }

  const openResendModal = (delivery: FailedDelivery) => {
    setFailedDeliveryToResend(delivery)
    setSelectedRecipientIds([])
    setResendModalOpen(true)
  }

  const closeResendModal = () => {
    setResendModalOpen(false)
    setTimeout(() => {
      setFailedDeliveryToResend(null)
      setSelectedRecipientIds([])
    }, 300)
  }

  const resendFailedDelivery = () => {
    const delivery = failedDeliveryToResend()
    if (!delivery) return

    setResendLoading(true)
    http
      .post(`/api/v1/failed-deliveries/${delivery.id}/resend`, {
        recipient_ids: selectedRecipientIds(),
      })
      .then(() => {
        successMessage('Failed Delivery Resent Successfully')
        delivery.resent = true
        setRows(rows().map((r) => (r.id === delivery.id ? { ...r, resent: true } : r)))
        closeResendModal()
      })
      .catch(() => {
        errorMessage()
        closeResendModal()
      })
      .finally(() => setResendLoading(false))
  }

  const toggleRecipientSelection = (id: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : prev.length < 10 ? [...prev, id] : prev,
    )
  }

  const openDeleteModal = (id: string) => {
    setFailedDeliveryIdToDelete(id)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setTimeout(() => setFailedDeliveryIdToDelete(null), 300)
  }

  const deleteFailedDelivery = () => {
    const id = failedDeliveryIdToDelete()
    if (!id) return

    setDeleteLoading(true)
    http
      .delete(`/api/v1/failed-deliveries/${id}`)
      .then(() => {
        setRows((prev) => prev.filter((d) => d.id !== id))
        setDeleteModalOpen(false)
      })
      .catch(() => {
        errorMessage()
        setDeleteModalOpen(false)
      })
      .finally(() => setDeleteLoading(false))
  }

  const senderDomain = () => {
    const sender = senderToBlock()?.sender
    if (!sender) return null
    const parts = sender.split('@')
    return parts.length === 2 ? parts[1] : null
  }

  const openBlockSenderModal = (delivery: FailedDelivery) => {
    setSenderToBlock(delivery)
    setBlockSenderType(null)
    setBlockSenderModalOpen(true)
  }

  const closeBlockSenderModal = () => {
    setBlockSenderModalOpen(false)
    setTimeout(() => {
      setSenderToBlock(null)
      setBlockSenderType(null)
    }, 300)
  }

  const blockSender = (type: string) => {
    setBlockSenderLoading(true)
    setBlockSenderType(type)

    const sender = senderToBlock()
    const value = type === 'domain' ? senderDomain() : sender?.sender

    http
      .post('/api/v1/blocklist', { type, value }, { withCredentials: true })
      .then(() => {
        successMessage(`Sender ${type === 'domain' ? 'domain' : 'email'} added to blocklist`)
        closeBlockSenderModal()
      })
      .catch((error: any) => {
        if (error.response?.status === 422 && error.response?.data?.errors?.value) {
          errorMessage(error.response?.data?.errors?.value?.[0])
        } else if (error.response?.data?.message) {
          errorMessage(error.response?.data?.message)
        } else {
          errorMessage()
        }
      })
      .finally(() => setBlockSenderLoading(false))
  }

  const paginatedData = () => props.initialRows

  return (
    <div>
      <Title>Failed Deliveries</Title>
      <h1 id="primary-heading" class="sr-only">
        Failed Deliveries
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-grey-900 dark:text-white">Failed Deliveries</h1>
          <p class="mt-2 text-sm text-grey-700 dark:text-grey-200">
            A list of all the failed deliveries{' '}
            {props.search ? 'found for your search' : 'in your account'}
            <button type="button" onClick={() => setMoreInfoOpen(!moreInfoOpen())}>
              <Icon
                name="info"
                class="h-6 w-6 inline-block cursor-pointer text-grey-500 dark:text-grey-200"
              />
            </button>
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <select
            value={filterType()}
            onChange={(e) => {
              setFilterType(e.currentTarget.value)
              updateFilter()
            }}
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-grey-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md dark:border-grey-600 dark:bg-grey-700 dark:text-grey-200"
          >
            <option value="all">All</option>
            <option value="outbound">Outbound Bounces</option>
            <option value="inbound">Inbound Rejections</option>
          </select>
        </div>
      </div>

      <Deferred data={['initialRows', 'recipientOptions']} fallback={<Loader class="h-8 w-8 mx-auto mt-8" />}>
        <Show
          when={rows().length > 0}
          fallback={
            <Show
              when={props.search || filterType() !== 'all'}
              fallback={
                <div class="text-center">
                  <Icon
                    name="exclamation-triangle"
                    class="mx-auto h-16 w-16 text-grey-400 dark:text-grey-200"
                  />
                  <h3 class="mt-2 text-lg font-medium text-grey-900 dark:text-white">
                    No Failed Deliveries
                  </h3>
                  <p class="mt-1 text-md text-grey-500 dark:text-grey-200">
                    You don't have any failed delivery attempts to display.
                  </p>
                </div>
              }
            >
              <div class="text-center">
                <Icon
                  name="exclamation-triangle"
                  class="mx-auto h-16 w-16 text-grey-400 dark:text-grey-200"
                />
                <h3 class="mt-2 text-lg font-medium text-grey-900 dark:text-white">
                  No Failed Deliveries found for that search or filter
                </h3>
                <p class="mt-1 text-md text-grey-500 dark:text-grey-200">
                  Try entering a different search term or changing the filter.
                </p>
                <div class="mt-6">
                  <Link
                    href={(window as any).route('failed_deliveries.index')}
                    class="inline-flex items-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-cyan-900 px-4 py-2 text-sm font-medium shadow-sm focus:outline-none"
                  >
                    View All Failed Deliveries
                  </Link>
                </div>
              </div>
            </Show>
          }
        >
          <div class="bg-white dark:bg-grey-900 rounded-lg shadow overflow-x-auto">
            <table class="table-auto w-full">
              <thead class="border-b border-grey-100 text-grey-400 dark:text-grey-200 dark:border-grey-300">
                <tr>
                  <th scope="col" class="p-3 text-left">Created</th>
                  <th scope="col" class="p-3 text-left">Email Type</th>
                  <th scope="col" class="p-3 text-left">Destination</th>
                  <th scope="col" class="p-3 text-left">Alias</th>
                  <th scope="col" class="p-3 text-left">Sender</th>
                  <th scope="col" class="p-3 text-left">Mail Server</th>
                  <th scope="col" class="p-3 text-left">Code</th>
                  <th scope="col" class="p-3 text-left">First Attempted</th>
                  <th scope="col" class="p-3" />
                </tr>
              </thead>
              <tbody>
                <For each={rows()}>
                  {(row) => (
                    <tr class="border-b border-grey-100 dark:border-grey-300 hover:bg-grey-50 dark:hover:bg-grey-800">
                      <td class="p-3">
                        <span
                          class="cursor-default text-sm text-grey-500 dark:text-grey-300"
                          title={filters.formatDate(row.created_at)}
                        >
                          {filters.timeAgo(row.created_at)}
                        </span>
                      </td>
                      <td class="p-3">
                        <span class="text-sm text-grey-500 dark:text-grey-300">{row.email_type}</span>
                      </td>
                      <td class="p-3">
                        <span
                          class="cursor-pointer text-sm font-medium text-grey-700 dark:text-grey-200"
                          title="Click to copy"
                          onClick={() => clipboard(row.destination)}
                        >
                          {row.destination}
                        </span>
                      </td>
                      <td class="p-3">
                        <span
                          class="cursor-pointer text-sm font-medium text-grey-700 dark:text-grey-200"
                          title="Click to copy"
                          onClick={() => clipboard(row.alias?.email ?? '')}
                        >
                          {row.alias?.email ?? ''}
                        </span>
                      </td>
                      <td class="p-3">
                        <span class="text-sm font-medium text-grey-700 dark:text-grey-200">
                          <span
                            class="cursor-pointer"
                            title="Click to copy"
                            onClick={() => clipboard(row.sender)}
                          >
                            {row.sender}
                          </span>
                          <Show when={row.sender && row.sender !== '<>'}>
                            <span class="block text-grey-400 text-sm py-1 dark:text-grey-300">
                              <button type="button" onClick={() => openBlockSenderModal(row)}>
                                Add to blocklist
                              </button>
                            </span>
                          </Show>
                        </span>
                      </td>
                      <td class="p-3">
                        <span class="text-sm text-grey-500 dark:text-grey-300">{row.remote_mta}</span>
                      </td>
                      <td class="p-3">
                        <span class="text-sm text-grey-500 dark:text-grey-300">{row.code}</span>
                      </td>
                      <td class="p-3">
                        <span
                          class="cursor-default text-sm text-grey-500 dark:text-grey-300"
                          title={filters.formatDateTime(row.attempted_at)}
                        >
                          {filters.timeAgo(row.attempted_at)}
                        </span>
                      </td>
                      <td class="p-3 text-right whitespace-nowrap">
                        <Show when={row.is_stored}>
                          <a
                            href={`api/v1/failed-deliveries/${row.id}/download`}
                            class="mr-4 text-secondary hover:text-secondary/80 font-medium dark:text-indigo-400 dark:hover:text-indigo-500"
                          >
                            Download
                          </a>
                        </Show>
                        <Show
                          when={
                            row.is_stored &&
                            !row.quarantined &&
                            !row.resent &&
                            row.email_type === 'Forward'
                          }
                        >
                          <button
                            type="button"
                            onClick={() => openResendModal(row)}
                            class="mr-4 text-secondary hover:text-secondary/80 font-medium dark:text-indigo-400 dark:hover:text-indigo-500"
                          >
                            Resend
                          </button>
                        </Show>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(row.id)}
                          class="text-secondary hover:text-secondary/80 font-medium dark:text-indigo-400 dark:hover:text-indigo-500"
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

          <Show when={paginatedData()}>
            <div class="mt-4 rounded-lg shadow flex items-center justify-between bg-white px-4 py-3 sm:px-6 overflow-x-auto dark:bg-grey-900">
              <div class="flex flex-1 justify-between items-center md:hidden gap-x-3">
                <Show
                  when={paginatedData().prev_page_url}
                  fallback={
                    <span class="relative inline-flex h-min items-center rounded-md border border-grey-300 px-4 py-2 text-sm font-medium text-grey-700 bg-grey-100 dark:bg-grey-800 dark:text-grey-200">
                      Previous
                    </span>
                  }
                >
                  <Link
                    href={paginatedData().prev_page_url!}
                    class="relative inline-flex items-center rounded-md border border-grey-300 bg-white px-4 py-2 text-sm font-medium text-grey-700 hover:bg-grey-50 dark:bg-grey-950 dark:hover:bg-grey-900 dark:text-grey-200"
                  >
                    Previous
                  </Link>
                </Show>

                <div class="flex flex-col items-center justify-center gap-y-2">
                  <p class="text-sm text-grey-700 text-center dark:text-grey-200">
                    Showing{' '}
                    <span class="font-medium">{paginatedData().from?.toLocaleString()}</span> to{' '}
                    <span class="font-medium">{paginatedData().to?.toLocaleString()}</span> of{' '}
                    <span class="font-medium">{paginatedData().total?.toLocaleString()}</span>{' '}
                    {paginatedData().total === 1 ? 'result' : 'results'}
                  </p>
                  <select
                    value={pageSize()}
                    onChange={(e) => {
                      setPageSize(Number(e.currentTarget.value))
                      updatePageSize()
                    }}
                    disabled={updatePageSizeLoading()}
                    class="relative rounded border-0 bg-transparent py-1 pr-8 text-grey-900 text-sm ring-1 ring-inset focus:z-10 focus:ring-2 focus:ring-inset ring-grey-300 focus:ring-primary disabled:cursor-not-allowed dark:text-grey-200"
                  >
                    <For each={pageSizeOptions}>
                      {(size) => (
                        <option class="dark:bg-grey-900" value={size}>
                          {size}
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <Show
                  when={paginatedData().next_page_url}
                  fallback={
                    <span class="relative inline-flex items-center rounded-md border border-grey-300 px-4 py-2 text-sm font-medium text-grey-700 dark:text-grey-200 bg-grey-100 dark:bg-grey-800">
                      Next
                    </span>
                  }
                >
                  <Link
                    href={paginatedData().next_page_url!}
                    class="relative inline-flex h-min items-center rounded-md border border-grey-300 bg-white px-4 py-2 text-sm font-medium text-grey-700 dark:bg-grey-950 dark:hover:bg-grey-900 dark:text-grey-200 hover:bg-grey-50"
                  >
                    Next
                  </Link>
                </Show>
              </div>

              <div class="hidden md:flex md:flex-1 md:items-center md:justify-between md:gap-x-2">
                <div class="flex items-center gap-x-2">
                  <p class="text-sm text-grey-700 dark:text-grey-200">
                    Showing{' '}
                    <span class="font-medium">{paginatedData().from?.toLocaleString()}</span> to{' '}
                    <span class="font-medium">{paginatedData().to?.toLocaleString()}</span> of{' '}
                    <span class="font-medium">{paginatedData().total?.toLocaleString()}</span>{' '}
                    {paginatedData().total === 1 ? 'result' : 'results'}
                  </p>
                  <select
                    value={pageSize()}
                    onChange={(e) => {
                      setPageSize(Number(e.currentTarget.value))
                      updatePageSize()
                    }}
                    disabled={updatePageSizeLoading()}
                    class="relative rounded border-0 bg-transparent py-1 pr-8 text-grey-900 text-sm ring-1 ring-inset focus:z-10 focus:ring-2 focus:ring-inset ring-grey-300 focus:ring-primary disabled:cursor-not-allowed dark:text-grey-200"
                  >
                    <For each={pageSizeOptions}>
                      {(size) => (
                        <option class="dark:bg-grey-900" value={size}>
                          {size}
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <Show
                    when={paginatedData().prev_page_url}
                    fallback={
                      <span class="disabled cursor-not-allowed relative inline-flex items-center rounded-l-md border border-grey-300 bg-white px-2 py-2 text-sm font-medium text-grey-500 focus:z-20 dark:bg-grey-800 dark:border-grey-500">
                        <span class="sr-only">Previous</span>
                        <Icon name="chevron-up" class="h-5 w-5 rotate-[-90deg]" />
                      </span>
                    }
                  >
                    <Link
                      href={paginatedData().prev_page_url!}
                      class="relative inline-flex items-center rounded-l-md border border-grey-300 bg-white px-2 py-2 text-sm font-medium text-grey-500 hover:bg-grey-50 focus:z-20 dark:bg-grey-900 dark:hover:bg-grey-950 dark:border-grey-500"
                    >
                      <span class="sr-only">Previous</span>
                      <Icon name="chevron-up" class="h-5 w-5 rotate-[-90deg]" />
                    </Link>
                  </Show>

                  <For each={links()}>
                    {(link) => (
                      <Show
                        when={link.url}
                        fallback={
                          <span class="relative inline-flex items-center border border-grey-300 bg-white px-4 py-2 text-sm font-medium text-grey-700 dark:bg-grey-900 dark:text-grey-200 dark:border-grey-500">
                            ...
                          </span>
                        }
                      >
                        <Link
                          href={link.url!}
                          class={`relative inline-flex items-center border z-10 px-4 py-2 text-sm font-medium focus:z-20 ${
                            link.active
                              ? 'border-secondary bg-secondary/10 text-secondary dark:bg-grey-950 dark:text-grey-100 dark:border-grey-500'
                              : 'border-grey-300 bg-white text-grey-500 hover:bg-grey-50 dark:bg-grey-900 dark:hover:bg-grey-950 dark:text-grey-200 dark:border-grey-500'
                          }`}
                        >
                          {link.label}
                        </Link>
                      </Show>
                    )}
                  </For>

                  <Show
                    when={paginatedData().next_page_url}
                    fallback={
                      <span class="disabled cursor-not-allowed relative inline-flex items-center rounded-r-md border border-grey-300 bg-white px-2 py-2 text-sm font-medium text-grey-500 focus:z-20 dark:bg-grey-800 dark:text-grey-200 dark:border-grey-500">
                        <span class="sr-only">Next</span>
                        <Icon name="chevron-up" class="h-5 w-5 rotate-90" />
                      </span>
                    }
                  >
                    <Link
                      href={paginatedData().next_page_url!}
                      class="relative inline-flex items-center rounded-r-md border border-grey-300 bg-white px-2 py-2 text-sm font-medium text-grey-500 hover:bg-grey-50 focus:z-20 dark:bg-grey-900 dark:hover:bg-grey-950 dark:text-grey-200 dark:border-grey-500"
                    >
                      <span class="sr-only">Next</span>
                      <Icon name="chevron-up" class="h-5 w-5 rotate-90" />
                    </Link>
                  </Show>
                </nav>
              </div>
            </div>
          </Show>
        </Show>
      </Deferred>

      <Modal
        open={resendModalOpen()}
        onOpenChange={(open) => {
          if (!open) closeResendModal()
        }}
        title="Resend Failed Delivery"
      >
        <p class="mt-4 text-grey-700 dark:text-grey-200">
          You can choose to resend to the original recipient or select a different one below. You can
          choose multiple recipients.
        </p>
        <p class="my-4 text-grey-700 dark:text-grey-200">
          Leave the select input empty if you would like to resend to the original recipient
          <Show when={failedDeliveryToResend()?.recipient}>
            <b> {failedDeliveryToResend()!.recipient!.email}</b>
          </Show>
          .
        </p>
        <div class="max-h-48 overflow-y-auto border border-grey-200 dark:border-grey-600 rounded">
          <For each={props.recipientOptions}>
            {(recipient) => (
              <label class="flex items-center px-3 py-2 hover:bg-grey-50 dark:hover:bg-grey-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRecipientIds().includes(recipient.id)}
                  onChange={() => toggleRecipientSelection(recipient.id)}
                  class="focus:ring-primary h-4 w-4 text-secondary dark:text-indigo-400 dark:bg-grey-950 border-grey-300 rounded"
                />
                <span class="ml-2 text-sm text-grey-700 dark:text-grey-200">{recipient.email}</span>
              </label>
            )}
          </For>
        </div>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={resendFailedDelivery}
            class="px-4 py-3 text-cyan-900 font-semibold bg-primary hover:bg-primary/90 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={resendLoading()}
          >
            Resend failed delivery
            <Show when={resendLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            type="button"
            onClick={closeResendModal}
            class="px-4 py-3 text-grey-800 font-semibold bg-white hover:bg-grey-50 dark:text-grey-100 dark:hover:bg-grey-700 dark:bg-grey-600 dark:border-grey-700 border border-grey-100 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen()}
        onOpenChange={(open) => {
          if (!open) closeDeleteModal()
        }}
        title="Delete Failed Delivery"
      >
        <p class="mt-4 text-grey-700 dark:text-grey-200">
          Are you sure you want to delete this failed delivery?
        </p>
        <p class="mt-4 text-grey-700 dark:text-grey-200">
          Failed deliveries are <b>automatically removed</b> when they are more than{' '}
          <b>7 days old</b>. Deleting a failed delivery also deletes the email if it has been stored.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={deleteFailedDelivery}
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={deleteLoading()}
          >
            Delete failed delivery
            <Show when={deleteLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            type="button"
            onClick={closeDeleteModal}
            class="px-4 py-3 text-grey-800 font-semibold bg-white hover:bg-grey-50 dark:text-grey-100 dark:hover:bg-grey-700 dark:bg-grey-600 dark:border-grey-700 border border-grey-100 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={moreInfoOpen()}
        onOpenChange={setMoreInfoOpen}
        title="More information"
      >
        <p class="mt-4 text-grey-700 dark:text-grey-200">
          Sometimes when vovamail.xyz attempts to send an email, the delivery is not successful. This is
          often referred to as a "bounced email".
        </p>
        <p class="mt-4 text-grey-700 dark:text-grey-200">
          This page allows you to see any failed deliveries relating to your account and the reason why
          they failed. It also displays any inbound emails that were rejected by the vovamail.xyz servers
          before reaching your alias.
        </p>
        <p class="mt-4 text-grey-700 dark:text-grey-200">
          Only failed delivery attempts from the vovamail.xyz servers to your recipients (or reply/send
          attempts from your aliases) and inbound rejections to your aliases will be shown here.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row">
          <button
            type="button"
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-3 text-grey-800 font-semibold bg-white hover:bg-grey-50 dark:text-grey-100 dark:hover:bg-grey-700 dark:bg-grey-600 dark:border-grey-700 border border-grey-100 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Close
          </button>
        </div>
      </Modal>

      <Modal
        open={blockSenderModalOpen()}
        onOpenChange={(open) => {
          if (!open) closeBlockSenderModal()
        }}
        title="Add sender to blocklist"
      >
        <p class="mt-4 text-grey-700 dark:text-grey-200">
          Choose whether to block just this sender's email address or their entire domain.
        </p>
        <p class="mt-4 text-sm text-grey-500 dark:text-grey-300 break-all">
          Sender email: <b class="text-grey-700 dark:text-grey-200">{senderToBlock()?.sender}</b>
        </p>
        <Show when={senderDomain()}>
          <p class="mt-1 text-sm text-grey-500 dark:text-grey-300 break-all">
            Sender domain: <b class="text-grey-700 dark:text-grey-200">{senderDomain()}</b>
          </p>
        </Show>
        <div class="mt-6 flex flex-col space-y-3">
          <button
            type="button"
            onClick={() => blockSender('email')}
            class="w-full px-4 py-3 text-cyan-900 font-semibold bg-primary hover:bg-primary/90 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={blockSenderLoading()}
          >
            Block email
            <Show when={blockSenderLoading() && blockSenderType() === 'email'}>
              <Loader />
            </Show>
          </button>
          <Show when={senderDomain()}>
            <button
              type="button"
              onClick={() => blockSender('domain')}
              class="w-full px-4 py-3 text-cyan-900 font-semibold bg-primary hover:bg-primary/90 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
              disabled={blockSenderLoading()}
            >
              Block domain
              <Show when={blockSenderLoading() && blockSenderType() === 'domain'}>
                <Loader />
              </Show>
            </button>
          </Show>
          <button
            type="button"
            onClick={closeBlockSenderModal}
            class="w-full px-4 py-3 text-grey-800 font-semibold bg-white hover:bg-grey-50 dark:text-grey-100 dark:hover:bg-grey-700 dark:bg-grey-600 dark:border-grey-700 border border-grey-100 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
