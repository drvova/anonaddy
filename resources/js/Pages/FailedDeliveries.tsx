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

export default function FailedDeliveries(props: FailedDeliveriesProps) {
  const page = usePage()

  const [rows, setRows] = createSignal<FailedDelivery[]>(props.initialRows?.data ?? [])
  const [links, setLinks] = createSignal<PaginatedLink[]>(
    props.initialRows?.links?.slice(1, -1) ?? [],
  )
  const [filterType, setFilterType] = createSignal(props.initialFilter ?? 'all')
  const [pageSize, setPageSize] = createSignal(props.initialPageSize ?? 25)
  const [updatePageSizeLoading, setUpdatePageSizeLoading] = createSignal(false)

  const [resendModalOpen, setResendModalOpen] = createSignal(false)
  const [resendLoading, setResendLoading] = createSignal(false)
  const [failedDeliveryToResend, setFailedDeliveryToResend] = createSignal<FailedDelivery | null>(
    null,
  )
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

  const visitWithParams = (extraParams: Record<string, any> = {}, omitKeys: string[] = []) => {
    const currentParams = { ...((window as any).route().params as Record<string, any>) }
    let params = Object.assign({}, currentParams, extraParams)

    if (filterType() === 'all') omitKeys.push('filter')
    if (pageSize() === 25) omitKeys.push('page_size')

    router.visit((window as any).route('failed_deliveries.index', omit(params, omitKeys)), {
      only: ['initialRows', 'search', 'initialFilter', 'initialPageSize'],
      preserveState: true,
    })
  }

  const updateFilter = () => visitWithParams({ filter: filterType() }, ['page'])
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
        setRows(rows().map(r => (r.id === delivery.id ? { ...r, resent: true } : r)))
        closeResendModal()
      })
      .catch(() => {
        errorMessage()
        closeResendModal()
      })
      .finally(() => setResendLoading(false))
  }
  const toggleRecipientSelection = (id: string) => {
    setSelectedRecipientIds(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : prev.length < 10 ? [...prev, id] : prev,
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
        setRows(prev => prev.filter(d => d.id !== id))
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

  const typeBadge = (type: string) => {
    const isInbound = type === 'Inbound'
    return (
      <span
        class={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${isInbound ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}
      >
        {type}
      </span>
    )
  }

  return (
    <div>
      <Title>Failed Deliveries</Title>
      <h1 id="primary-heading" class="sr-only">
        Failed Deliveries
      </h1>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-semibold text-white">Failed Deliveries</h1>
          <p class="mt-1 text-sm text-grey-400 flex items-center gap-2">
            A list of all the failed deliveries{' '}
            {props.search ? 'found for your search' : 'in your account'}
            <button type="button" onClick={() => setMoreInfoOpen(!moreInfoOpen())}>
              <Icon name="info" class="h-4 w-4 text-grey-500 hover:text-grey-300" />
            </button>
          </p>
        </div>
        <select
          value={filterType()}
          onChange={e => {
            setFilterType(e.currentTarget.value)
            updateFilter()
          }}
          class="block w-full sm:w-auto pl-3 pr-10 py-2 text-sm rounded-md border-border-subtle bg-surface text-white focus:border-primary focus:ring-primary"
        >
          <option value="all">All</option>
          <option value="outbound">Outbound Bounces</option>
          <option value="inbound">Inbound Rejections</option>
        </select>
      </div>

      <Deferred
        data={['initialRows', 'recipientOptions']}
        fallback={<Loader class="h-8 w-8 mx-auto mt-8" />}
      >
        <Show
          when={rows().length > 0}
          fallback={
            <Show
              when={props.search || filterType() !== 'all'}
              fallback={
                <div class="text-center py-16">
                  <Icon name="exclamation-triangle" class="mx-auto h-12 w-12 text-grey-600" />
                  <h3 class="mt-3 text-base font-medium text-white">No Failed Deliveries</h3>
                  <p class="mt-1 text-sm text-grey-500">
                    You don't have any failed delivery attempts to display.
                  </p>
                </div>
              }
            >
              <div class="text-center py-16">
                <Icon name="exclamation-triangle" class="mx-auto h-12 w-12 text-grey-600" />
                <h3 class="mt-3 text-base font-medium text-white">
                  No Failed Deliveries found for that search or filter
                </h3>
                <p class="mt-1 text-sm text-grey-500">
                  Try entering a different search term or changing the filter.
                </p>
                <div class="mt-4">
                  <Link
                    href={(window as any).route('failed_deliveries.index')}
                    class="inline-flex items-center rounded-md bg-primary hover:bg-primary/90 text-charcoal px-4 py-2 text-sm font-medium"
                  >
                    View All Failed Deliveries
                  </Link>
                </div>
              </div>
            </Show>
          }
        >
          <div class="divide-y divide-border-subtle border-t border-border-subtle">
            <For each={rows()}>
              {row => (
                <div class="group py-4 px-4 hover:bg-white/[0.03] transition-colors">
                  <div class="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                    {/* Left: type + time */}
                    <div class="flex items-center gap-3 lg:w-40 shrink-0">
                      {typeBadge(row.email_type)}
                      <span
                        class="text-xs text-grey-500"
                        title={filters.formatDate(row.created_at)}
                      >
                        {filters.timeAgo(row.created_at)}
                      </span>
                    </div>

                    {/* Middle: details */}
                    <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
                      <div class="min-w-0">
                        <p class="text-xs text-grey-500">Destination</p>
                        <p
                          class="text-sm text-white truncate cursor-pointer hover:text-primary"
                          title="Click to copy"
                          onClick={() => clipboard(row.destination)}
                        >
                          {row.destination}
                        </p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-grey-500">Alias</p>
                        <p
                          class="text-sm text-white truncate cursor-pointer hover:text-primary"
                          title="Click to copy"
                          onClick={() => clipboard(row.alias?.email ?? '')}
                        >
                          {row.alias?.email ?? '—'}
                        </p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-grey-500">Sender</p>
                        <p class="text-sm text-white truncate">
                          <span
                            class="cursor-pointer hover:text-primary"
                            title="Click to copy"
                            onClick={() => clipboard(row.sender)}
                          >
                            {row.sender}
                          </span>
                          <Show when={row.sender && row.sender !== '<>'}>
                            <button
                              type="button"
                              onClick={() => openBlockSenderModal(row)}
                              class="ml-2 text-xs text-grey-500 hover:text-primary"
                            >
                              Block
                            </button>
                          </Show>
                        </p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-grey-500">Code / Server</p>
                        <p class="text-sm text-grey-300 truncate" title={row.remote_mta}>
                          {row.code} <span class="text-grey-500">·</span> {row.remote_mta}
                        </p>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div class="flex items-center gap-3 lg:justify-end shrink-0">
                      <Show when={row.is_stored}>
                        <a
                          href={`api/v1/failed-deliveries/${row.id}/download`}
                          class="text-sm text-grey-400 hover:text-white transition-colors"
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
                          class="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          Resend
                        </button>
                      </Show>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(row.id)}
                        class="text-sm text-grey-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Pagination */}
          <Show when={paginatedData()}>
            <div class="mt-6 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <p class="text-sm text-grey-400">
                  Showing{' '}
                  <span class="text-white font-medium">
                    {paginatedData().from?.toLocaleString()}
                  </span>{' '}
                  to{' '}
                  <span class="text-white font-medium">{paginatedData().to?.toLocaleString()}</span>{' '}
                  of{' '}
                  <span class="text-white font-medium">
                    {paginatedData().total?.toLocaleString()}
                  </span>{' '}
                  {paginatedData().total === 1 ? 'result' : 'results'}
                </p>
                <select
                  value={pageSize()}
                  onChange={e => {
                    setPageSize(Number(e.currentTarget.value))
                    updatePageSize()
                  }}
                  disabled={updatePageSizeLoading()}
                  class="bg-transparent text-sm text-grey-400 border-0 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <For each={pageSizeOptions}>
                    {size => (
                      <option class="bg-surface" value={size}>
                        {size}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <nav class="isolate inline-flex -space-x-px rounded-md" aria-label="Pagination">
                <Show
                  when={paginatedData().prev_page_url}
                  fallback={
                    <span class="relative inline-flex items-center rounded-l-md border border-border-subtle bg-surface px-2 py-2 text-sm text-grey-600 cursor-not-allowed">
                      <span class="sr-only">Previous</span>
                      <Icon name="chevron-up" class="h-5 w-5 rotate-[-90deg]" />
                    </span>
                  }
                >
                  <Link
                    href={paginatedData().prev_page_url!}
                    class="relative inline-flex items-center rounded-l-md border border-border-subtle bg-surface px-2 py-2 text-sm text-grey-400 hover:text-white hover:bg-white/5"
                  >
                    <span class="sr-only">Previous</span>
                    <Icon name="chevron-up" class="h-5 w-5 rotate-[-90deg]" />
                  </Link>
                </Show>

                <For each={links()}>
                  {link => (
                    <Show
                      when={link.url}
                      fallback={
                        <span class="relative inline-flex items-center border border-border-subtle bg-surface px-4 py-2 text-sm text-grey-500">
                          ...
                        </span>
                      }
                    >
                      <Link
                        href={link.url!}
                        class={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                          link.active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border-subtle bg-surface text-grey-400 hover:bg-white/5 hover:text-white'
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
                    <span class="relative inline-flex items-center rounded-r-md border border-border-subtle bg-surface px-2 py-2 text-sm text-grey-600 cursor-not-allowed">
                      <span class="sr-only">Next</span>
                      <Icon name="chevron-up" class="h-5 w-5 rotate-90" />
                    </span>
                  }
                >
                  <Link
                    href={paginatedData().next_page_url!}
                    class="relative inline-flex items-center rounded-r-md border border-border-subtle bg-surface px-2 py-2 text-sm text-grey-400 hover:text-white hover:bg-white/5"
                  >
                    <span class="sr-only">Next</span>
                    <Icon name="chevron-up" class="h-5 w-5 rotate-90" />
                  </Link>
                </Show>
              </nav>
            </div>
          </Show>
        </Show>
      </Deferred>

      {/* Resend Modal */}
      <Modal
        open={resendModalOpen()}
        onOpenChange={open => {
          if (!open) closeResendModal()
        }}
        title="Resend Failed Delivery"
      >
        <p class="mt-4 text-grey-300">
          You can choose to resend to the original recipient or select a different one below. You
          can choose multiple recipients.
        </p>
        <p class="my-4 text-grey-300">
          Leave the select input empty if you would like to resend to the original recipient
          <Show when={failedDeliveryToResend()?.recipient}>
            <b> {failedDeliveryToResend()!.recipient!.email}</b>
          </Show>
          .
        </p>
        <div class="max-h-48 overflow-y-auto border border-border-subtle rounded-md">
          <For each={props.recipientOptions}>
            {recipient => (
              <label class="flex items-center px-3 py-2 hover:bg-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRecipientIds().includes(recipient.id)}
                  onChange={() => toggleRecipientSelection(recipient.id)}
                  class="focus:ring-primary h-4 w-4 text-primary bg-surface border-border-subtle rounded"
                />
                <span class="ml-2 text-sm text-white">{recipient.email}</span>
              </label>
            )}
          </For>
        </div>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={resendFailedDelivery}
            class="px-4 py-2.5 text-charcoal font-semibold bg-primary hover:bg-primary/90 rounded-md disabled:cursor-not-allowed"
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
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteModal()
        }}
        title="Delete Failed Delivery"
      >
        <p class="mt-4 text-grey-300">Are you sure you want to delete this failed delivery?</p>
        <p class="mt-4 text-grey-400 text-sm">
          Failed deliveries are <b>automatically removed</b> when they are more than{' '}
          <b>7 days old</b>. Deleting a failed delivery also deletes the email if it has been
          stored.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={deleteFailedDelivery}
            class="px-4 py-2.5 text-white font-semibold bg-red-500 hover:bg-red-600 rounded-md disabled:cursor-not-allowed"
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
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* More Info Modal */}
      <Modal open={moreInfoOpen()} onOpenChange={setMoreInfoOpen} title="More information">
        <p class="mt-4 text-grey-300">
          Sometimes when vovamail.xyz attempts to send an email, the delivery is not successful.
          This is often referred to as a "bounced email".
        </p>
        <p class="mt-4 text-grey-300">
          This page allows you to see any failed deliveries relating to your account and the reason
          why they failed. It also displays any inbound emails that were rejected by the
          vovamail.xyz servers before reaching your alias.
        </p>
        <p class="mt-4 text-grey-300">
          Only failed delivery attempts from the vovamail.xyz servers to your recipients (or
          reply/send attempts from your aliases) and inbound rejections to your aliases will be
          shown here.
        </p>
        <div class="mt-6">
          <button
            type="button"
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Block Sender Modal */}
      <Modal
        open={blockSenderModalOpen()}
        onOpenChange={open => {
          if (!open) closeBlockSenderModal()
        }}
        title="Add sender to blocklist"
      >
        <p class="mt-4 text-grey-300">
          Choose whether to block just this sender's email address or their entire domain.
        </p>
        <p class="mt-4 text-sm text-grey-400 break-all">
          Sender email: <b class="text-white">{senderToBlock()?.sender}</b>
        </p>
        <Show when={senderDomain()}>
          <p class="mt-1 text-sm text-grey-400 break-all">
            Sender domain: <b class="text-white">{senderDomain()}</b>
          </p>
        </Show>
        <div class="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => blockSender('email')}
            class="w-full px-4 py-2.5 text-charcoal font-semibold bg-primary hover:bg-primary/90 rounded-md disabled:cursor-not-allowed"
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
              class="w-full px-4 py-2.5 text-charcoal font-semibold bg-primary hover:bg-primary/90 rounded-md disabled:cursor-not-allowed"
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
            class="w-full px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
