import { For } from 'solid-js'
import { Link, usePage, router } from '../lib/inertia'
import { Title } from '@solidjs/meta'

interface SettingsLayoutProps {
  children: any
}

const allTabs = [
  { name: 'General', route: 'settings.show', enabled: () => true },
  { name: 'Security', route: 'settings.security', enabled: () => !usePage().props.usesExternalAuthentication },
  { name: 'API Keys', route: 'settings.api', enabled: () => true },
  { name: 'Account Data', route: 'settings.data', enabled: () => true },
  { name: 'Delete Account', route: 'settings.account', enabled: () => !usePage().props.usesExternalAuthentication },
]

export default function SettingsLayout(props: SettingsLayoutProps) {
  const page = usePage()

  const tabs = () => allTabs.filter(t => t.enabled())

  const isActive = (routeName: string) => {
    try {
      return route().current() === routeName
    } catch {
      return false
    }
  }

  return (
    <div>
      <Title>{`Settings - ${import.meta.env.VITE_APP_NAME ?? 'vovamail.xyz'}`}</Title>

      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-white">Settings</h1>
        <p class="text-sm text-grey-400 mt-1">Make changes to your account</p>
      </div>

      <div class="bg-grey-950 rounded-xl border border-grey-800">
        {/* Mobile tab selector */}
        <div class="md:hidden border-b border-grey-800 p-3">
          <select
            class="w-full bg-grey-900 border border-grey-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none"
            onChange={(e) => router.visit(route(e.currentTarget.value as string))}
            value={tabs().find(t => isActive(t.route))?.route ?? tabs()[0]?.route}
          >
            <For each={tabs()}>
              {(tab) => (
                <option value={tab.route} selected={isActive(tab.route)}>
                  {tab.name}
                </option>
              )}
            </For>
          </select>
        </div>

        {/* Desktop tabs */}
        <div class="hidden md:block border-b border-grey-800">
          <nav class="flex -mb-px px-2">
            <For each={tabs()}>
              {(tab) => (
                <Link
                  href={route(tab.route)}
                  class={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive(tab.route)
                      ? 'border-primary text-primary'
                      : 'border-transparent text-grey-400 hover:text-white hover:border-grey-600'
                  }`}
                >
                  {tab.name}
                </Link>
              )}
            </For>
          </nav>
        </div>

        {/* Tab content */}
        <div class="p-6">
          {props.children}
        </div>
      </div>
    </div>
  )
}
