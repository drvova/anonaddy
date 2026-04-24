import { createSignal, createMemo, onMount, Show } from 'solid-js'
import { Title } from '@solidjs/meta'
import { Link } from '../../lib/inertia'
import http from '../../lib/http'
import Icon from '../../Components/Icon'
import Loader from '../../Components/Loader'
import OutboundMessagesGraph from './OutboundMessagesGraph'
import OutboundMessagesPie from './OutboundMessagesPie'

interface DashboardProps {
  totals: {
    total: string | number
    active: string | number
    inactive: string | number
    deleted: string | number
    forwarded: string | number
    blocked: string | number
    replies: string | number
    sent: number
  }
  bandwidthMb: number
  bandwidthLimit: number
  month: string
  aliases: number
  recipients: number
  usernames: number
  domains: number
  rules: number
}

export default function DashboardIndex(props: DashboardProps) {
  const [chartsLoading, setChartsLoading] = createSignal(true)
  const [forwardsData, setForwardsData] = createSignal<number[]>([])
  const [repliesData, setRepliesData] = createSignal<number[]>([])
  const [sendsData, setSendsData] = createSignal<number[]>([])
  const [labels, setLabels] = createSignal<string[]>([])
  const [outboundMessageTotals, setOutboundMessageTotals] = createSignal<number[] | null>(null)

  onMount(() => {
    http.get('/api/v1/chart-data').then((data: any) => {
      setForwardsData(data.forwardsData)
      setRepliesData(data.repliesData)
      setSendsData(data.sendsData)
      setLabels(data.labels)
      setOutboundMessageTotals(
        data.outboundMessageTotals[0] === 0 &&
          data.outboundMessageTotals[1] === 0 &&
          data.outboundMessageTotals[2] === 0
          ? null
          : data.outboundMessageTotals,
      )
      setChartsLoading(false)
    })
  })

  const bandwidthPercentage = createMemo(() => {
    if (!props.bandwidthMb) return 0
    const pct = (props.bandwidthMb / props.bandwidthLimit) * 100
    return Math.min(pct, 100).toFixed(2)
  })

  const bandwidthPercentageClass = createMemo(() => {
    const pct = Number(bandwidthPercentage())
    if (pct === 100) return 'from-red-200 to-red-500'
    if (pct > 80) return 'from-yellow-200 to-yellow-600'
    return 'from-cyan-500 to-indigo-500'
  })

  const stats = [
    {
      name: 'Shared Domain Aliases',
      stat: props.aliases,
      icon: 'at-symbol',
      url: route('aliases.index', { shared_domain: 'true', active: 'true' }),
    },
    { name: 'Recipients', stat: props.recipients, icon: 'inbox', url: route('recipients.index') },
    { name: 'Usernames', stat: props.usernames, icon: 'users', url: route('usernames.index') },
    { name: 'Domains', stat: props.domains, icon: 'globe', url: route('domains.index') },
    { name: 'Rules', stat: props.rules, icon: 'funnel', url: route('rules.index') },
  ]

  const aliasStats = [
    {
      name: 'Total Aliases',
      stat: parseInt(String(props.totals.total)),
      icon: 'at-symbol',
      url: route('aliases.index', { deleted: 'with' }),
    },
    {
      name: 'Active',
      stat: parseInt(String(props.totals.active)),
      icon: 'check-circle',
      url: route('aliases.index', { active: 'true' }),
    },
    {
      name: 'Inactive',
      stat: parseInt(String(props.totals.inactive)),
      icon: 'cross-circle',
      url: route('aliases.index', { active: 'false' }),
    },
    {
      name: 'Deleted',
      stat: parseInt(String(props.totals.deleted)),
      icon: 'trash',
      url: route('aliases.index', { deleted: 'only' }),
    },
  ]

  const emailStats = [
    { name: 'Emails Forwarded', stat: parseInt(String(props.totals.forwarded)), icon: 'send' },
    { name: 'Emails Blocked', stat: parseInt(String(props.totals.blocked)), icon: 'blocked' },
    { name: 'Email Replies', stat: parseInt(String(props.totals.replies)), icon: 'corner-up-left' },
    { name: 'Emails Sent', stat: props.totals.sent, icon: 'arrow-right' },
  ]

  return (
    <div>
      <Title>Dashboard</Title>
      <h1 id="primary-heading" class="sr-only">
        Dashboard
      </h1>

      {Number(bandwidthPercentage()) === 100 && (
        <div
          class="text-base border-t-8 rounded text-yellow-800 border-yellow-600 bg-yellow-100 px-3 py-4 mb-4"
          role="alert"
        >
          <div class="flex items-center mb-2">
            <span class="rounded-full bg-yellow-400 uppercase px-2 py-1 text-xs font-bold mr-2">
              Warning
            </span>
            <div>
              Exceeded bandwidth limit for <b>{props.month}</b>.
            </div>
          </div>
        </div>
      )}

      <h1 class="text-2xl font-semibold text-white">Dashboard</h1>

      <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(item => (
          <div class="relative overflow-hidden rounded-lg bg-surface px-4 pb-12 pt-5 sm:px-6 sm:pt-6">
            <dt>
              <div class="absolute rounded-md bg-primary/10 p-3">
                <Icon name={item.icon} class="h-6 w-6 text-primary" />
              </div>
              <p class="ml-16 truncate text-sm font-medium text-grey-300">{item.name}</p>
            </dt>
            <dd class="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p class="text-2xl font-semibold text-white">{item.stat.toLocaleString()}</p>
              <div class="absolute inset-x-0 bottom-0 bg-surface px-4 py-4 sm:px-6">
                <div class="text-sm">
                  <Link href={item.url} class="font-medium text-primary hover:text-primary/80">
                    View all<span class="sr-only"> {item.name} stats</span>
                  </Link>
                </div>
              </div>
            </dd>
          </div>
        ))}
      </dl>

      <h3 class="mt-6 text-base font-semibold leading-6 text-grey-300">
        Bandwidth ({props.month})
      </h3>

      <div class="mt-6">
        <div class="overflow-hidden rounded-full bg-surface relative">
          <div
            class={`relative h-8 flex items-center justify-end rounded-full bg-gradient-to-r z-10 min-w-[25%] sm:min-w-fit ${bandwidthPercentageClass()}`}
            style={{ width: `${bandwidthPercentage()}%` }}
          >
            <span class="text-white px-4 font-semibold">{props.bandwidthMb}MB</span>
          </div>
          <span class="h-8 absolute top-0 right-0 flex items-center pr-4 text-grey-300 font-semibold">
            {props.bandwidthLimit}MB
          </span>
        </div>
      </div>

      <div class="mt-6">
        <h3 class="text-base font-semibold leading-6 text-grey-300">Aliases</h3>

        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {aliasStats.map((item, idx) => (
            <div class="relative overflow-hidden rounded-lg bg-surface px-4 pb-12 pt-5 sm:px-6 sm:pt-6">
              <dt>
                <div class="absolute rounded-md bg-primary/10 p-3">
                  <Icon name={item.icon} class="h-6 w-6 text-primary" />
                </div>
                <p class="ml-16 truncate text-sm font-medium text-grey-300">{item.name}</p>
              </dt>
              <dd class="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p class="text-2xl font-semibold text-white">{item.stat.toLocaleString()}</p>
                <div class="absolute inset-x-0 bottom-0 bg-surface px-4 py-4 sm:px-6">
                  <div class="text-sm">
                    <Link href={item.url} class="font-medium text-primary hover:text-primary/80">
                      {idx === 0 ? 'View All' : `View ${item.name}`}
                      <span class="sr-only"> {item.name} stats</span>
                    </Link>
                  </div>
                </div>
              </dd>
            </div>
          ))}
        </dl>

        <h3 class="mt-6 text-base font-semibold leading-6 text-grey-300">Stats</h3>

        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {emailStats.map(item => (
            <div class="relative overflow-hidden rounded-lg bg-surface p-4">
              <dt>
                <Icon
                  name={item.icon}
                  class="inline-block w-16 h-16 text-primary/10 absolute top-0 right-0"
                />
                <p class="truncate text-sm font-medium text-grey-300">{item.name}</p>
              </dt>
              <dd class="flex items-baseline">
                <p class="text-3xl font-semibold text-white">{item.stat.toLocaleString()}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <h3 class="mt-6 text-base font-semibold leading-6 text-grey-300">
        Outbound Messages Last 7 Days {chartsLoading() && <Loader />}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="mt-5 bg-surface overflow-hidden sm:rounded-lg p-4 flex justify-center max-h-80">
          <OutboundMessagesGraph
            forwardsData={forwardsData()}
            repliesData={repliesData()}
            sendsData={sendsData()}
            labels={labels()}
          />
        </div>
        <div class="mt-5 bg-surface overflow-hidden sm:rounded-lg p-4 flex justify-center max-h-80">
          <Show
            when={outboundMessageTotals()}
            fallback={
              <div class="flex items-center justify-center text-grey-400">No data to display</div>
            }
          >
            {totals => <OutboundMessagesPie totals={totals()} />}
          </Show>
        </div>
      </div>
    </div>
  )
}
