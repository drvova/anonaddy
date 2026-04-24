import { createSignal, createMemo, onMount, Show } from 'solid-js'
import { Title } from '@solidjs/meta'
import { Link } from '../../lib/inertia'
import http from '../../lib/http'
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

  const bandwidthColor = createMemo(() => {
    const pct = Number(bandwidthPercentage())
    if (pct === 100) return 'bg-red-500'
    if (pct > 80) return 'bg-yellow-500'
    return 'bg-primary'
  })

  const resources = [
    { name: 'Aliases', stat: props.aliases, url: route('aliases.index') },
    { name: 'Recipients', stat: props.recipients, url: route('recipients.index') },
    { name: 'Usernames', stat: props.usernames, url: route('usernames.index') },
    { name: 'Domains', stat: props.domains, url: route('domains.index') },
    { name: 'Rules', stat: props.rules, url: route('rules.index') },
  ]

  const aliasCounts = [
    {
      name: 'Active',
      stat: parseInt(String(props.totals.active)),
      url: route('aliases.index', { active: 'true' }),
    },
    {
      name: 'Inactive',
      stat: parseInt(String(props.totals.inactive)),
      url: route('aliases.index', { active: 'false' }),
    },
    {
      name: 'Deleted',
      stat: parseInt(String(props.totals.deleted)),
      url: route('aliases.index', { deleted: 'only' }),
    },
  ]

  const emailCounts = [
    { name: 'Forwarded', stat: parseInt(String(props.totals.forwarded)) },
    { name: 'Blocked', stat: parseInt(String(props.totals.blocked)) },
    { name: 'Replies', stat: parseInt(String(props.totals.replies)) },
    { name: 'Sent', stat: props.totals.sent },
  ]

  return (
    <div>
      <Title>Dashboard</Title>
      <h1 id="primary-heading" class="sr-only">
        Dashboard
      </h1>

      {Number(bandwidthPercentage()) === 100 && (
        <div class="mb-6 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-400">
          Bandwidth limit exceeded for <span class="font-semibold">{props.month}</span>.
        </div>
      )}

      {/* Top resource row */}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border-subtle rounded-lg overflow-hidden">
        {resources.map(item => (
          <Link
            href={item.url}
            class="bg-surface hover:bg-white/[0.03] transition-colors px-4 py-5 text-center group"
          >
            <p class="text-2xl font-semibold text-white group-hover:text-primary transition-colors">
              {item.stat.toLocaleString()}
            </p>
            <p class="text-xs text-grey-400 mt-1">{item.name}</p>
          </Link>
        ))}
      </div>

      {/* Bandwidth */}
      <div class="mt-8">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-medium text-grey-300">Bandwidth ({props.month})</h2>
          <span class="text-xs text-grey-400">
            {props.bandwidthMb} MB / {props.bandwidthLimit} MB
          </span>
        </div>
        <div class="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            class={`h-full rounded-full ${bandwidthColor()} transition-all`}
            style={{ width: `${bandwidthPercentage()}%` }}
          />
        </div>
      </div>

      {/* Alias & email stats */}
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alias breakdown */}
        <div>
          <h2 class="text-sm font-medium text-grey-300 mb-3">Aliases</h2>
          <div class="bg-surface rounded-lg divide-y divide-border-subtle">
            {aliasCounts.map(item => (
              <Link
                href={item.url}
                class="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group"
              >
                <span class="text-sm text-grey-400 group-hover:text-white transition-colors">
                  {item.name}
                </span>
                <span class="text-sm font-medium text-white">{item.stat.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Email stats */}
        <div>
          <h2 class="text-sm font-medium text-grey-300 mb-3">Activity</h2>
          <div class="bg-surface rounded-lg divide-y divide-border-subtle">
            {emailCounts.map(item => (
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-sm text-grey-400">{item.name}</span>
                <span class="text-sm font-medium text-white">{item.stat.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div class="mt-8">
        <h2 class="text-sm font-medium text-grey-300 mb-3 flex items-center gap-2">
          Outbound Messages (Last 7 Days)
          <Show when={chartsLoading()}>
            <Loader />
          </Show>
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-surface rounded-lg p-4">
            <OutboundMessagesGraph
              forwardsData={forwardsData()}
              repliesData={repliesData()}
              sendsData={sendsData()}
              labels={labels()}
            />
          </div>
          <div class="bg-surface rounded-lg p-4 flex items-center justify-center">
            <Show
              when={outboundMessageTotals()}
              fallback={<span class="text-sm text-grey-400">No data</span>}
            >
              {totals => <OutboundMessagesPie totals={totals()} />}
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
