export const APP_NAME = 'VovaMail'

const pageTitles: Record<string, string> = {
  'Auth/Verify': 'Verify Email',
  'Dashboard/Index': 'Dashboard',
  'Aliases/Index': 'Aliases',
  'Aliases/Edit': 'Edit Alias',
  'Recipients/Index': 'Recipients',
  'Recipients/Edit': 'Edit Recipient',
  'Domains/Index': 'Domains',
  'Domains/Edit': 'Edit Domain',
  'Usernames/Index': 'Usernames',
  'Usernames/Edit': 'Edit Username',
  Rules: 'Rules',
  FailedDeliveries: 'Failed Deliveries',
  'Blocklist/Index': 'Blocklist',
  'Settings/General': 'General Settings',
  'Settings/Security': 'Security Settings',
  'Settings/Api': 'API Settings',
  'Settings/Data': 'Data Settings',
  'Settings/Account': 'Account Settings',
}

const humanize = (value: string): string =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())

export const resolvePageTitle = (component: string): string => {
  const knownTitle = pageTitles[component]

  if (knownTitle) {
    return knownTitle
  }

  const segments = component
    .split('/')
    .filter(segment => segment !== 'Index')
    .map(humanize)

  return segments.join(' — ') || APP_NAME
}

export const formatPageTitle = (title?: string | null): string =>
  title ? `${title} — ${APP_NAME}` : APP_NAME
