import { Title } from '@solidjs/meta'
import { createSignal, Show, For, createMemo } from 'solid-js'
import { usePage, router, Link } from '../../lib/inertia'
import http from '../../lib/http'
import Modal from '../../Components/Modal'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import Toggle from '../../Components/Toggle'
import { filters } from '../../app'

interface DefaultRecipient {
  id: string
  email: string
}

interface Domain {
  id: string
  domain: string
  description: string | null
  active: boolean
  catch_all: boolean
  domain_mx_validated_at: string | null
  domain_sending_verified_at: string | null
  aliases_count: number
  default_recipient: DefaultRecipient | null
  default_recipient_id: string | null
  created_at: string
}

interface RecipientOption {
  id: string
  email: string
}

interface DomainsProps {
  initialRows: Domain[]
  domainName: string
  hostname: string
  dkimSelector: string
  mailProvider: 'zeabur' | 'self-hosted'
  recipientOptions: RecipientOption[]
  initialAaVerify: string
  search: string | null
}

export default function DomainsIndex(props: DomainsProps) {
  const page = usePage()

  const [rows, setRows] = createSignal<Domain[]>([...props.initialRows])
  const [aaVerify, setAaVerify] = createSignal(props.initialAaVerify)

  const [sortField, setSortField] = createSignal<string>('created_at')
  const [sortDir, setSortDir] = createSignal<'asc' | 'desc'>('desc')

  const [newDomain, setNewDomain] = createSignal('')
  const [addDomainLoading, setAddDomainLoading] = createSignal(false)
  const [addDomainModalOpen, setAddDomainModalOpen] = createSignal(false)
  const [domainIdToDelete, setDomainIdToDelete] = createSignal<string | null>(null)
  const [domainIdToEdit, setDomainIdToEdit] = createSignal<string | null>(null)
  const [domainDescriptionToEdit, setDomainDescriptionToEdit] = createSignal('')
  const [domainToCheck, setDomainToCheck] = createSignal<Domain | null>(null)
  const [deleteDomainLoading, setDeleteDomainLoading] = createSignal(false)
  const [deleteDomainModalOpen, setDeleteDomainModalOpen] = createSignal(false)
  const [checkRecordsLoading, setCheckRecordsLoading] = createSignal(false)
  const [domainDefaultRecipientModalOpen, setDomainDefaultRecipientModalOpen] = createSignal(false)
  const [moreInfoOpen, setMoreInfoOpen] = createSignal(false)
  const [defaultRecipientDomainToEdit, setDefaultRecipientDomainToEdit] =
    createSignal<Domain | null>(null)
  const [defaultRecipientId, setDefaultRecipientId] = createSignal<string | null>(null)
  const [editDefaultRecipientLoading, setEditDefaultRecipientLoading] = createSignal(false)
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
      if (field === 'domain' || field === 'description') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }
      if (field === 'aliases_count') {
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

  const validDomain = (domain: string) => {
    const re = /(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z0-9-]{2,63}$)/
    return re.test(domain)
  }

  const validateNewDomain = (e: Event) => {
    e.preventDefault()
    setErrors({})
    const val = newDomain()
    if (!val) {
      setErrors({ newDomain: 'Domain name required' })
    } else if (val.length > 100) {
      setErrors({ newDomain: 'That domain name is too long' })
    } else if (!validDomain(val)) {
      setErrors({ newDomain: 'Please enter a valid domain name' })
    }
    if (!errors().newDomain) {
      addNewDomain()
    }
  }

  const addNewDomain = () => {
    setAddDomainLoading(true)
    http
      .post('/api/v1/domains', { domain: newDomain() })
      .then(() => {
        router.visit((window as any).route('domains.index'), {
          only: ['initialRows', 'search', 'initialAaVerify'],
          onSuccess: () => {
            successMessage('Domain added successfully')
          },
        })
      })
      .catch((error: any) => {
        setAddDomainLoading(false)
        if (error.response?.status === 403) {
          errorMessage(error.response?.data ?? error.message)
        } else if (error.response?.status === 422) {
          errorMessage(error.response?.data?.errors?.domain?.[0] ?? error.message)
        } else if (error.response?.status === 429) {
          errorMessage('You are making too many requests, please try again in a couple of minutes')
        } else if (error.response?.status === 404) {
          warnMessage(
            'Verification TXT record not found, this could be due to DNS caching, please try again shortly.',
          )
        } else {
          errorMessage()
        }
      })
  }

  const editDomain = (domain: Domain) => {
    if (domainDescriptionToEdit().length > 200) {
      errorMessage('Description cannot be more than 200 characters')
      return
    }
    http
      .patch(`/api/v1/domains/${domain.id}`, { description: domainDescriptionToEdit() })
      .then(() => {
        setRows(prev =>
          prev.map(r =>
            r.id === domain.id ? { ...r, description: domainDescriptionToEdit() } : r,
          ),
        )
        setDomainIdToEdit(null)
        setDomainDescriptionToEdit('')
        successMessage('Domain description updated')
      })
      .catch(() => {
        setDomainIdToEdit(null)
        setDomainDescriptionToEdit('')
        errorMessage()
      })
  }

  const editDefaultRecipient = () => {
    setEditDefaultRecipientLoading(true)
    const domain = defaultRecipientDomainToEdit()
    if (!domain) return

    http
      .patch(`/api/v1/domains/${domain.id}/default-recipient`, {
        default_recipient: defaultRecipientId(),
      })
      .then(() => {
        const recipient = props.recipientOptions.find(r => r.id === defaultRecipientId()) || null
        setRows(prev =>
          prev.map(r =>
            r.id === domain.id
              ? { ...r, default_recipient: recipient, default_recipient_id: defaultRecipientId() }
              : r,
          ),
        )
        setDomainDefaultRecipientModalOpen(false)
        setEditDefaultRecipientLoading(false)
        setDefaultRecipientId(null)
        successMessage("Domain's default recipient updated")
      })
      .catch(() => {
        setDomainDefaultRecipientModalOpen(false)
        setEditDefaultRecipientLoading(false)
        setDefaultRecipientId(null)
        errorMessage()
      })
  }

  const checkRecords = (domain: Domain) => {
    setCheckRecordsLoading(true)
    http
      .get(`/domains/${domain.id}/check-sending`)
      .then((data: any) => {
        setCheckRecordsLoading(false)
        if (data.success === true) {
          closeCheckRecordsModal()
          successMessage(data.message)
          setRows(prev =>
            prev.map(r =>
              r.id === domain.id
                ? {
                    ...r,
                    domain_sending_verified_at: data.data.domain_sending_verified_at,
                    domain_mx_validated_at: data.data.domain_mx_validated_at,
                  }
                : r,
            ),
          )
        } else {
          warnMessage(data.message)
        }
      })
      .catch((error: any) => {
        setCheckRecordsLoading(false)
        if (error.response?.status === 429) {
          errorMessage('Please wait a little while before checking the records again')
        } else {
          errorMessage()
        }
      })
  }

  const activateDomain = (id: string) => {
    http.post('/api/v1/active-domains', { id }).catch(() => errorMessage())
  }

  const deactivateDomain = (id: string) => {
    http.delete(`/api/v1/active-domains/${id}`).catch(() => errorMessage())
  }

  const enableCatchAll = (id: string) => {
    http.post('/api/v1/catch-all-domains', { id }).catch((error: any) => {
      if (error.response?.data !== undefined) {
        errorMessage(error.response?.data ?? error.message)
      } else {
        errorMessage()
      }
    })
  }

  const disableCatchAll = (id: string) => {
    http.delete(`/api/v1/catch-all-domains/${id}`).catch((error: any) => {
      if (error.response?.data !== undefined) {
        errorMessage(error.response?.data ?? error.message)
      } else {
        errorMessage()
      }
    })
  }

  const deleteDomain = (id: string) => {
    setDeleteDomainLoading(true)
    http
      .delete(`/api/v1/domains/${id}`)
      .then(() => {
        router.reload({
          only: ['initialRows', 'search', 'initialAaVerify'],
          onSuccess: (page: any) => {
            setDeleteDomainModalOpen(false)
            setDeleteDomainLoading(false)
            setRows(page.props.initialRows ?? props.initialRows)
            setAaVerify(page.props.initialAaVerify ?? props.initialAaVerify)
            successMessage('Domain deleted successfully')
          },
        })
      })
      .catch(() => {
        errorMessage()
        setDeleteDomainLoading(false)
        setDeleteDomainModalOpen(false)
      })
  }

  const openAddDomainModal = () => {
    setErrors({})
    setNewDomain('')
    setAddDomainModalOpen(true)
  }

  const openDeleteModal = (id: string) => {
    setDeleteDomainModalOpen(true)
    setDomainIdToDelete(id)
  }

  const closeDeleteModal = () => {
    setDeleteDomainModalOpen(false)
    setDomainIdToDelete(null)
  }

  const openDomainDefaultRecipientModal = (domain: Domain) => {
    setDomainDefaultRecipientModalOpen(true)
    setDefaultRecipientDomainToEdit(domain)
    setDefaultRecipientId(domain.default_recipient_id)
  }

  const closeDomainDefaultRecipientModal = () => {
    setDomainDefaultRecipientModalOpen(false)
    setDefaultRecipientDomainToEdit(null)
    setDefaultRecipientId(null)
  }

  const openCheckRecordsModal = (domain: Domain) => {
    setDomainToCheck(domain)
    setAddDomainModalOpen(true)
  }

  const closeCheckRecordsModal = () => {
    setAddDomainModalOpen(false)
    setTimeout(() => setDomainToCheck(null), 300)
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

  const warnMessage = (text = '') => {
    if ((window as any).__notify) {
      ;(window as any).__notify({ title: 'Information', text, type: 'warn' })
    }
  }

  const VerifiedBadge = (props: { domain: Domain }) => (
    <Show
      when={props.domain.domain_sending_verified_at && props.domain.domain_mx_validated_at}
      fallback={
        <Show
          when={!props.domain.domain_mx_validated_at}
          fallback={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              class="h-5 w-5 inline-block"
            >
              <title>DNS records for sending invalid</title>
              <g fill="none" fill-rule="evenodd">
                <circle cx="10" cy="10" r="10" fill="#FF9B9B" />
                <polyline
                  stroke="#AB091E"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  points="14 6 6 14"
                />
                <polyline
                  stroke="#AB091E"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  points="6 6 14 14"
                />
              </g>
            </svg>
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-5 w-5 inline-block">
            <title>MX records invalid</title>
            <g fill="none" fill-rule="evenodd">
              <circle cx="10" cy="10" r="10" fill="#FF9B9B" />
              <polyline
                stroke="#AB091E"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                points="14 6 6 14"
              />
              <polyline
                stroke="#AB091E"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                points="6 6 14 14"
              />
            </g>
          </svg>
        </Show>
      }
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-5 w-5 inline-block">
        <title>Domain fully verified</title>
        <g fill="none" fill-rule="evenodd">
          <circle class="text-green-100 fill-current" cx="10" cy="10" r="10" />
          <polyline
            class="text-green-800 stroke-current"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            points="6 10 8.667 12.667 14 7.333"
          />
        </g>
      </svg>
    </Show>
  )

  return (
    <div>
      <Title>Domains</Title>
      <h1 id="primary-heading" class="sr-only">
        Domains
      </h1>

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-white">Domains</h1>
          <p class="mt-1 text-sm text-grey-400">
            A list of all the domains {props.search ? 'found for your search' : 'in your account'}
            <button onClick={() => setMoreInfoOpen(!moreInfoOpen())} class="ml-1">
              <Icon name="info" class="inline-block w-5 h-5 text-grey-500 hover:text-white" />
            </button>
          </p>
        </div>
        <button
          type="button"
          onClick={openAddDomainModal}
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-grey-900 hover:bg-primary/90 transition-colors"
        >
          <Icon name="plus" class="w-4 h-4" />
          Add Domain
        </button>
      </div>

      <Show
        when={rows().length > 0}
        fallback={
          <Show
            when={props.search}
            fallback={
              <div class="text-center py-12">
                <Icon name="globe" class="mx-auto h-16 w-16 text-grey-600" />
                <h3 class="mt-4 text-lg font-medium text-white">No Domains</h3>
                <p class="mt-2 text-grey-400">Get started by creating a new domain.</p>
                <div class="mt-6">
                  <button
                    onClick={openAddDomainModal}
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-grey-900 hover:bg-primary/90 transition-colors"
                  >
                    <Icon name="plus" class="w-4 h-4" />
                    Add a Domain
                  </button>
                </div>
              </div>
            }
          >
            <div class="text-center py-12">
              <Icon name="globe" class="mx-auto h-16 w-16 text-grey-600" />
              <h3 class="mt-4 text-lg font-medium text-white">No Domains found for that search</h3>
              <p class="mt-2 text-grey-400">Try entering a different search term.</p>
              <div class="mt-6">
                <Link
                  href={(window as any).route('domains.index')}
                  class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-grey-900 hover:bg-primary/90 transition-colors"
                >
                  View All Domains
                </Link>
              </div>
            </div>
          </Show>
        }
      >
        <div class="mb-3 flex items-center gap-4 text-xs text-grey-500">
          <button
            class="hover:text-white transition-colors"
            onClick={() => toggleSort('created_at')}
          >
            Created {sortField() === 'created_at' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button class="hover:text-white transition-colors" onClick={() => toggleSort('domain')}>
            Domain {sortField() === 'domain' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            class="hover:text-white transition-colors"
            onClick={() => toggleSort('aliases_count')}
          >
            Aliases {sortField() === 'aliases_count' ? (sortDir() === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>

        <div class="space-y-3">
          <For each={sortedRows()}>
            {row => (
              <div class="bg-surface rounded-lg p-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      class="font-medium text-white hover:text-primary transition-colors"
                      onClick={() => clipboard(row.domain)}
                      title="Click to copy"
                    >
                      {filters.truncate(row.domain, 30)}
                    </button>
                    <VerifiedBadge domain={row} />
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
                      when={domainIdToEdit() === row.id}
                      fallback={
                        <div class="mt-1 flex items-center gap-2">
                          <Show
                            when={row.description}
                            fallback={
                              <button
                                type="button"
                                onClick={() => {
                                  setDomainIdToEdit(row.id)
                                  setDomainDescriptionToEdit('')
                                }}
                                aria-label="Add description"
                              >
                                <Icon name="plus" class="w-5 h-5 text-grey-500 hover:text-white" />
                              </button>
                            }
                          >
                            <span class="text-sm text-grey-300">
                              {filters.truncate(row.description!, 60)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setDomainIdToEdit(row.id)
                                setDomainDescriptionToEdit(row.description || '')
                              }}
                              aria-label="Edit"
                            >
                              <Icon name="edit" class="w-4 h-4 text-grey-500 hover:text-white" />
                            </button>
                          </Show>
                        </div>
                      }
                    >
                      <div class="mt-1 flex items-center gap-1">
                        <input
                          onKeyDown={e => {
                            if (e.key === 'Enter') editDomain(row)
                            if (e.key === 'Escape') {
                              setDomainIdToEdit(null)
                              setDomainDescriptionToEdit('')
                            }
                          }}
                          value={domainDescriptionToEdit()}
                          onInput={e => setDomainDescriptionToEdit(e.currentTarget.value)}
                          type="text"
                          classList={{
                            'grow appearance-none bg-white/5 border rounded px-2 py-1 text-sm text-white focus:outline-none': true,
                            'border-red-500': domainDescriptionToEdit().length > 200,
                            'border-transparent': domainDescriptionToEdit().length <= 200,
                          }}
                          placeholder="Add description"
                        />
                        <button
                          onClick={() => {
                            setDomainIdToEdit(null)
                            setDomainDescriptionToEdit('')
                          }}
                          aria-label="Cancel"
                        >
                          <Icon name="close" class="w-5 h-5 text-red-400 hover:text-red-300" />
                        </button>
                        <button onClick={() => editDomain(row)} aria-label="Save">
                          <Icon name="save" class="w-5 h-5 text-primary hover:text-primary/80" />
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
                            onClick={() => openDomainDefaultRecipientModal(row)}
                            aria-label="Add Default Recipient"
                          >
                            <Icon name="plus" class="w-5 h-5 text-grey-500 hover:text-white" />
                          </button>
                        </div>
                      }
                    >
                      <div class="mt-1 flex items-center gap-2">
                        <span
                          class="cursor-pointer text-sm text-grey-300 hover:text-white"
                          onClick={() => clipboard(row.default_recipient!.email)}
                          title="Click to copy"
                        >
                          {filters.truncate(row.default_recipient!.email, 30)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openDomainDefaultRecipientModal(row)}
                          aria-label="Edit Default Recipient"
                        >
                          <Icon name="edit" class="w-4 h-4 text-grey-500 hover:text-white" />
                        </button>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                      Alias Count
                    </span>
                    <div class="mt-1">
                      <Show
                        when={row.aliases_count}
                        fallback={<span class="text-sm text-grey-300">{row.aliases_count}</span>}
                      >
                        <Link
                          href={(window as any).route('aliases.index', { domain: row.id })}
                          class="text-sm font-medium text-primary hover:text-primary/80"
                          title="Click to view the aliases using this domain"
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
                        onChange={(checked: boolean) => {
                          setRows(prev =>
                            prev.map(r => (r.id === row.id ? { ...r, active: checked } : r)),
                          )
                          if (checked) activateDomain(row.id)
                          else deactivateDomain(row.id)
                        }}
                      />
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                        Catch-All
                      </span>
                      <Toggle
                        checked={row.catch_all}
                        onChange={(checked: boolean) => {
                          setRows(prev =>
                            prev.map(r => (r.id === row.id ? { ...r, catch_all: checked } : r)),
                          )
                          if (checked) enableCatchAll(row.id)
                          else disableCatchAll(row.id)
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <span class="text-xs font-medium text-grey-500 uppercase tracking-wide">
                      Verified Records
                    </span>
                    <div class="mt-1 flex items-center gap-2">
                      <VerifiedBadge domain={row} />
                      <Show
                        when={row.domain_sending_verified_at || row.domain_mx_validated_at}
                        fallback={
                          <button
                            onClick={() => openCheckRecordsModal(row)}
                            class="text-sm text-grey-500 hover:text-white transition-colors"
                          >
                            Check Records
                          </button>
                        }
                      >
                        <button
                          onClick={() => openCheckRecordsModal(row)}
                          class="text-sm text-grey-500 hover:text-white transition-colors"
                        >
                          Recheck
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>

                <div class="mt-3 pt-3 border-t border-border-subtle flex items-center gap-4">
                  <Link
                    href={(window as any).route('domains.edit', row.id)}
                    class="text-sm font-medium text-grey-400 hover:text-white transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    class="text-sm font-medium text-grey-400 hover:text-red-400 transition-colors"
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
        open={addDomainModalOpen()}
        onOpenChange={open => {
          if (!open) closeCheckRecordsModal()
        }}
        maxWidth="md:max-w-2xl"
        title={domainToCheck() ? 'Check DNS records' : 'Add new domain'}
      >
        <Show
          when={!domainToCheck()}
          fallback={
            <>
              <p class="mt-4 mb-2 text-grey-300">
                Please set the following DNS records for your custom domain. <b>Note</b>: if you are
                already using your custom domain for emails elsewhere e.g. with ProtonMail,
                NameCheap etc. please{' '}
                <a
                  href="https://vovamail.xyz/faq/#can-i-add-a-domain-if-im-already-using-it-for-email-somewhere-else"
                  class="text-primary font-semibold hover:text-primary/80"
                  target="_blank"
                  rel="nofollow noreferrer noopener"
                >
                  read this
                </a>
                .
              </p>
              <div class="table w-full">
                <div class="table-row">
                  <div class="table-cell py-2 font-semibold text-grey-100">Type</div>
                  <div class="table-cell py-2 px-4 font-semibold text-grey-100">Host</div>
                  <div class="table-cell py-2 font-semibold text-grey-100">Value/Points to</div>
                </div>
                <div class="table-row">
                  <div class="table-cell py-2 text-grey-100">MX 10</div>
                  <div class="table-cell py-2 px-4 text-grey-100">
                    <button
                      title="Copy"
                      onClick={() => clipboard('@')}
                      class="focus-visible:outline-primary"
                    >
                      @
                    </button>
                  </div>
                  <div class="table-cell py-2 break-words text-grey-100">
                    <button
                      title="Copy"
                      onClick={() => clipboard(props.hostname)}
                      class="focus-visible:outline-primary"
                    >
                      {props.hostname}.
                    </button>
                  </div>
                </div>
                <div class="table-row">
                  <div class="table-cell py-2 text-grey-100">TXT</div>
                  <div class="table-cell py-2 px-4 text-grey-100">
                    <button
                      title="Copy"
                      onClick={() => clipboard('@')}
                      class="focus-visible:outline-primary"
                    >
                      @
                    </button>
                  </div>
                  <div class="table-cell py-2 break-words text-grey-100">
                    <button
                      title="Copy"
                      onClick={() => clipboard('v=spf1 mx -all')}
                      class="focus-visible:outline-primary"
                    >
                      v=spf1 mx -all
                    </button>
                  </div>
                </div>
                <div class="table-row">
                  <div class="table-cell py-2 text-grey-100">CNAME</div>
                  <div class="table-cell py-2 px-4 text-grey-100">
                    <button
                      title="Copy"
                      onClick={() => clipboard(`${props.dkimSelector}._domainkey`)}
                      class="focus-visible:outline-primary"
                    >
                      {props.dkimSelector}._domainkey
                    </button>
                  </div>
                  <div class="table-cell py-2 break-words text-grey-100">
                    <button
                      title="Copy"
                      onClick={() =>
                        clipboard(`${props.dkimSelector}._domainkey.${props.domainName}.`)
                      }
                      class="focus-visible:outline-primary"
                    >
                      {props.dkimSelector}._domainkey.{props.domainName}.
                    </button>
                  </div>
                </div>
                <div class="table-row">
                  <div class="table-cell py-2 text-grey-100">TXT</div>
                  <div class="table-cell py-2 px-4 text-grey-100">
                    <button
                      title="Copy"
                      onClick={() => clipboard('_dmarc')}
                      class="focus-visible:outline-primary"
                    >
                      _dmarc
                    </button>
                  </div>
                  <div class="table-cell py-2 break-words text-grey-100">
                    <button
                      title="Copy"
                      onClick={() => clipboard('v=DMARC1; p=quarantine; adkim=s')}
                      class="focus-visible:outline-primary"
                    >
                      v=DMARC1; p=quarantine; adkim=s
                    </button>
                  </div>
                </div>
              </div>
              <div class="mt-6">
                <button
                  onClick={() => checkRecords(domainToCheck()!)}
                  class="bg-primary hover:bg-primary/90 text-grey-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
                  disabled={checkRecordsLoading()}
                >
                  Check Records
                  <Show when={checkRecordsLoading()}>
                    <Loader />
                  </Show>
                </button>
                <button
                  onClick={closeCheckRecordsModal}
                  class="ml-4 px-4 py-3 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Cancel
                </button>
              </div>
              <div class="mt-2 text-sm text-grey-300">
                For more information or if you are adding a <b>subdomain</b> please read{' '}
                <a
                  href="https://vovamail.xyz/help/adding-a-custom-domain/"
                  class="text-primary font-semibold hover:text-primary/80"
                  target="_blank"
                  rel="nofollow noreferrer noopener"
                >
                  this article
                </a>
              </div>
            </>
          }
        >
          <p class="mt-4 mb-2 text-grey-300">
            To verify ownership of the domain, please add the following TXT record and then click
            Add Domain below. Once you've added the domain you can safely remove this TXT record.
          </p>
          <div class="table w-full">
            <div class="table-row">
              <div class="table-cell py-2 font-semibold text-grey-100">Type</div>
              <div class="table-cell p-2 font-semibold text-grey-100">Host</div>
              <div class="table-cell py-2 font-semibold text-grey-100">Value/Points to</div>
            </div>
            <div class="table-row">
              <div class="table-cell py-2 text-grey-100">TXT</div>
              <div class="table-cell p-2 text-grey-100">@</div>
              <div class="table-cell py-2 text-grey-100">
                <button
                  onClick={() => clipboard(`aa-verify=${aaVerify()}`)}
                  class="break-all focus-visible:outline-primary"
                  title="Copy"
                >
                  aa-verify={aaVerify()}
                </button>
              </div>
            </div>
          </div>
          <div class="mt-6">
            <Show when={errors().newDomain}>
              <p class="mb-3 text-red-400 text-sm">{errors().newDomain}</p>
            </Show>
            <input
              value={newDomain()}
              onInput={e => setNewDomain(e.currentTarget.value)}
              type="text"
              class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 mb-6 bg-white/5 text-white ${errors().newDomain ? 'ring-red-500' : 'ring-grey-700'}`}
              placeholder="example.com"
            />
            <button
              onClick={validateNewDomain}
              class="bg-primary hover:bg-primary/90 text-grey-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
              disabled={addDomainLoading()}
            >
              Add Domain
              <Show when={addDomainLoading()}>
                <Loader />
              </Show>
            </button>
            <button
              onClick={() => setAddDomainModalOpen(false)}
              class="ml-4 px-4 py-3 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancel
            </button>
          </div>
          <div class="mt-2 text-sm text-grey-300">
            For <b>subdomains</b> you will need to change the host value, please read{' '}
            <a
              href="https://vovamail.xyz/help/adding-a-custom-domain/"
              class="text-primary font-semibold hover:text-primary/80"
              target="_blank"
              rel="nofollow noreferrer noopener"
            >
              this article
            </a>
          </div>
        </Show>
      </Modal>

      <Modal
        open={domainDefaultRecipientModalOpen()}
        onOpenChange={open => {
          if (!open) closeDomainDefaultRecipientModal()
        }}
        title="Update Default Recipient"
      >
        <p class="my-4 text-grey-300">
          Select the default recipient for this domain. This overrides the default recipient in your
          account settings. Leave it empty if you would like to use the default recipient in your
          account settings.
        </p>
        <select
          value={defaultRecipientId() ?? ''}
          onChange={e => setDefaultRecipientId(e.currentTarget.value || null)}
          class="block w-full rounded-md border-border-subtle bg-white/5 text-white text-sm focus:border-primary focus:ring-primary sm:text-sm"
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
        <div class="mt-6 flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={editDefaultRecipient}
            class="px-4 py-3 text-grey-900 font-semibold bg-primary hover:bg-primary/90 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={editDefaultRecipientLoading()}
          >
            Update Default Recipient
            <Show when={editDefaultRecipientLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeDomainDefaultRecipientModal}
            class="px-4 py-3 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteDomainModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteModal()
        }}
        title="Delete domain"
      >
        <p class="mt-4 text-grey-300">
          Are you sure you want to delete this domain? This will also{' '}
          <b>remove all aliases associated with this domain</b>. You will no longer be able to
          receive any emails at this domain.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => deleteDomain(domainIdToDelete()!)}
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={deleteDomainLoading()}
          >
            Delete domain
            <Show when={deleteDomainLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            onClick={closeDeleteModal}
            class="px-4 py-3 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={moreInfoOpen()} onOpenChange={setMoreInfoOpen} title="More information">
        <p class="mt-4 text-grey-300">
          Adding a custom domain such as <b>example.com</b> will allow you to create unlimited
          aliases e.g. xyz@example.com. You can also add a subdomain such as <b>mail.example.com</b>
          .
        </p>
        <p class="mt-4 text-grey-300">
          To get started all you have to do is add a TXT record to your domain to verify ownership
          and then add the domain here by clicking the button above.
        </p>
        <p class="mt-4 text-grey-300">The TXT record needs to have the following values:</p>
        <p class="mt-4 text-grey-300">
          Type: <b>TXT</b>
          <br />
          Host: <b>@</b>
          <br />
          Value:{' '}
          <b
            class="break-words cursor-pointer hover:text-primary"
            title="Copy"
            onClick={() => clipboard(`aa-verify=${aaVerify()}`)}
          >
            aa-verify={aaVerify()}
          </b>
          <br />
        </p>
        <p class="mt-4 text-grey-300">
          Once the DNS changes propagate and you have verified ownership of the domain you will need
          to add a few more records to be able to receive emails at your own domain.
        </p>
        <div class="mt-6">
          <button
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-3 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
