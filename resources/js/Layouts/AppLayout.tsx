import { createSignal, createEffect, For, Show, onMount } from 'solid-js'
import { usePage, Link, router } from '../lib/inertia'
import http from '../lib/http'
import FlashNotification from '../Components/FlashNotification'

interface AppLayoutProps {
  search?: string
  children: any
}

const sidebarNavigation = [
  { name: 'Dashboard', route: 'dashboard.index', icon: 'home' as const },
  { name: 'Aliases', route: 'aliases.index', icon: 'at-symbol' as const },
  { name: 'Recipients', route: 'recipients.index', icon: 'inbox' as const },
  { name: 'Usernames', route: 'usernames.index', icon: 'users' as const },
  { name: 'Domains', route: 'domains.index', icon: 'globe' as const },
  { name: 'Rules', route: 'rules.index', icon: 'funnel' as const },
  {
    name: 'Failed Deliveries',
    route: 'failed_deliveries.index',
    icon: 'exclamation-triangle' as const,
  },
  { name: 'Blocklist', route: 'blocklist.index', icon: 'no-symbol' as const },
  { name: 'Settings', route: 'settings.show', icon: 'cog' as const },
]

export default function AppLayout(props: AppLayoutProps) {
  const page = usePage()
  const [collapsed, setCollapsed] = createSignal(false)
  const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal(props.search ?? '')
  const [userMenuOpen, setUserMenuOpen] = createSignal(false)

  onMount(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  })

  const toggleSidebar = () => {
    const next = !collapsed()
    setCollapsed(next)
    localStorage.setItem('sidebarCollapsed', String(next))
  }

  const isCurrentNav = (routeName: string) => {
    const current = page.component ?? ''
    const prefix = routeName.split('.')[0]
    return current.toLowerCase().startsWith(prefix)
  }

  createEffect(() => {
    if (!props.search) setSearchQuery('')
  })

  const submitSearch = () => {
    const query = searchQuery()
    if (!query) return
    if (query.length >= 2) {
      router.visit(route('aliases.index'), { data: { search: query } })
    }
  }

  const handleSearchKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchQuery('')
    } else if (e.key === 'Enter') {
      submitSearch()
    }
  }

  const userInitial = () => {
    const username = page.props.user?.username as string | undefined
    return username ? username.charAt(0).toUpperCase() : '?'
  }

  const handleLogout = (e: Event) => {
    e.preventDefault()
    http.post(route('logout')).then(() => router.visit('/'))
  }

  return (
    <div class="min-h-screen bg-charcoal text-grey-100">
      {/* Sidebar - desktop */}
      <aside
        class={`hidden md:flex md:flex-col md:fixed md:inset-y-0 ${collapsed() ? 'md:w-14' : 'md:w-52'} bg-charcoal border-r border-border-subtle/30 transition-all duration-200 ease-out`}
      >
        <div class="flex items-center h-14 px-3 shrink-0">
          <Link href="/" class="flex items-center justify-center w-full">
            <Show when={collapsed()}>
              <img src="/svg/icon-logo.svg" alt="VovaMail" class="block h-6 w-6" />
            </Show>
            <Show when={!collapsed()}>
              <img src="/svg/logo.svg" alt="VovaMail" class="block h-6 w-auto" />
            </Show>
          </Link>
        </div>

        <nav class="flex-1 px-1.5 py-2 space-y-px overflow-y-auto">
          <For each={sidebarNavigation}>
            {item => (
              <Link
                href={route(item.route)}
                title={collapsed() ? item.name : undefined}
                class={`flex items-center gap-2.5 px-2.5 py-2 text-sm transition-colors ${
                  isCurrentNav(item.route)
                    ? 'text-primary bg-white/[0.04]'
                    : 'text-grey-400 hover:text-white hover:bg-white/[0.04]'
                } ${collapsed() ? 'justify-center' : ''}`}
              >
                <svg
                  class="h-[18px] w-[18px] flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <Show when={item.icon === 'home'}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </Show>
                  <Show when={item.icon === 'at-symbol'}>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                  </Show>
                  <Show when={item.icon === 'inbox'}>
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </Show>
                  <Show when={item.icon === 'users'}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </Show>
                  <Show when={item.icon === 'globe'}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </Show>
                  <Show when={item.icon === 'funnel'}>
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </Show>
                  <Show when={item.icon === 'exclamation-triangle'}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </Show>
                  <Show when={item.icon === 'no-symbol'}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </Show>
                  <Show when={item.icon === 'cog'}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </Show>
                </svg>
                <Show when={!collapsed()}>
                  <span class="whitespace-nowrap overflow-hidden text-[13px]">
                    {item.name}
                  </span>
                </Show>
              </Link>
            )}
          </For>
        </nav>

        <div class="px-1.5 py-2 shrink-0 border-t border-border-subtle/30">
          <button
            onClick={toggleSidebar}
            class="flex items-center justify-center w-full h-8 text-grey-500 hover:text-grey-300 hover:bg-white/[0.04] transition-colors"
            title={collapsed() ? 'Expand' : 'Collapse'}
          >
            <svg
              class={`h-4 w-4 transition-transform duration-200 ${collapsed() ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      <Show when={mobileMenuOpen()}>
        <div class="fixed inset-0 z-40 md:hidden">
          <div class="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div class="fixed inset-y-0 left-0 w-60 bg-charcoal border-r border-border-subtle/30 z-50">
            <div class="flex items-center justify-between h-14 px-4">
              <span class="text-primary font-semibold text-base">vovamail.xyz</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                class="text-grey-400 hover:text-white"
              >
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav class="px-1.5 py-2 space-y-px">
              <For each={sidebarNavigation}>
                {item => (
                  <Link
                    href={route(item.route)}
                    onClick={() => setMobileMenuOpen(false)}
                    class={`flex items-center gap-2.5 px-2.5 py-2 text-sm transition-colors ${
                      isCurrentNav(item.route)
                        ? 'text-primary bg-white/[0.04]'
                        : 'text-grey-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <svg
                      class="h-[18px] w-[18px] flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <Show when={item.icon === 'home'}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </Show>
                      <Show when={item.icon === 'at-symbol'}>
                        <circle cx="12" cy="12" r="4" />
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                      </Show>
                      <Show when={item.icon === 'inbox'}>
                        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                      </Show>
                      <Show when={item.icon === 'users'}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </Show>
                      <Show when={item.icon === 'globe'}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </Show>
                      <Show when={item.icon === 'funnel'}>
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </Show>
                      <Show when={item.icon === 'exclamation-triangle'}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </Show>
                      <Show when={item.icon === 'no-symbol'}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </Show>
                      <Show when={item.icon === 'cog'}>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </Show>
                    </svg>
                    <span class="text-[13px]">{item.name}</span>
                  </Link>
                )}
              </For>
            </nav>
          </div>
        </div>
      </Show>

      {/* Main content area */}
      <div class={`${collapsed() ? 'md:pl-14' : 'md:pl-52'} flex flex-col min-h-screen transition-all duration-200 ease-out`}>
        {/* Header */}
        <header class="sticky top-0 z-30 flex h-14 items-center gap-4 bg-charcoal border-b border-border-subtle/30 px-4">
          <button
            class="md:hidden text-grey-400 hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Search */}
          <div class="flex-1 max-w-sm">
            <div class="relative">
              <input
                type="text"
                value={searchQuery()}
                onInput={e => setSearchQuery(e.currentTarget.value)}
                onKeyDown={handleSearchKeydown}
                placeholder="Search aliases..."
                class="w-full bg-surface border border-border-subtle rounded-sm pl-8 pr-7 py-1.5 text-sm text-white placeholder:text-grey-500 focus:border-primary/60 focus:outline-none transition-colors"
              />
              <svg
                class="absolute left-2 top-1.5 h-4 w-4 text-grey-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <Show when={searchQuery()}>
                <button
                  class="absolute right-2 top-1.5 text-grey-500 hover:text-white"
                  onClick={() => {
                    setSearchQuery('')
                    submitSearch()
                  }}
                >
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </Show>
            </div>
          </div>

          {/* User menu */}
          <div class="relative">
            <button
              class="flex items-center justify-center h-7 w-7 rounded-full bg-grey-800 text-xs font-medium text-white hover:bg-grey-700 transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen())}
            >
              {userInitial()}
            </button>
            <Show when={userMenuOpen()}>
              <div class="absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border-subtle rounded-sm py-1 z-50">
                <div class="px-3 py-1.5 border-b border-border-subtle">
                  <p class="text-sm font-medium text-white truncate">
                    {page.props.user?.username as string}
                  </p>
                </div>
                <Show when={!page.props.usesExternalAuthentication}>
                  <button
                    class="w-full text-left px-3 py-1.5 text-sm text-grey-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </Show>
              </div>
            </Show>
          </div>
        </header>

        {/* Page content */}
        <main class="flex-1 p-4 md:p-6">{props.children}</main>
      </div>

      <FlashNotification />
    </div>
  )
}
