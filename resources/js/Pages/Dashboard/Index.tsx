import { createSignal, createMemo, onMount, Show } from 'solid-js'
import { Title } from '@solidjs/meta'
import { Link } from '../../lib/inertia'
import http from '../../lib/http'
import Card from '../../Components/Card'
import Badge from '../../Components/Badge'
import Skeleton from '../../Components/Skeleton'
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
      url: route('aliases.index', { deleted: 'with' }),
    },
  ]

  return (
    <>
      <Title>Dashboard</Title>

      <div class="space-y-6">
        {/* Top resource row */}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-border-subtle/30 border border-border-subtle/30 bg-surface">
          <For each={resources}>
            {resource => (
              <Link
                href={resource.url}
                class="flex flex-col items-center justify-center py-5 px-2 hover:bg-white/[0.02] transition-colors"
              >
                <span class="text-2xl font-semibold text-white">{resource.stat}</span>
                <span class="text-xs text-grey-500 mt-0.5">{resource.name}</span>
              </Link>
            )}
          </For>
        </div>

        {/* Bandwidth */}
        <div class="flex items-center gap-3 text-sm">
          <span class="text-grey-400 whitespace-nowrap">
            Bandwidth {props.bandwidthMb.toFixed(2)} / {props.bandwidthLimit} MB
          </span>
          <div class="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              class={`h-full ${bandwidthColor()} transition-all duration-500`}
              style={{ width: `${bandwidthPercentage()}%` }}
            />
          </div>
          <span class="text-grey-500 text-xs">{bandwidthPercentage()}%</span>
        </div>

        {/* Two column layout */}
        <div class="grid lg:grid-cols-3 gap-6">
          {/* Alias breakdown + Activity stats */}
          <div class="lg:col-span-1 space-y-6">
            <Card>
              <Card.Header title="Aliases" subtitle={props.month} />
              <Card.Body class="divide-y divide-border-subtle/30">
                <For each={aliasCounts}>
                  {item => (
                    <Link href={item.url} class="flex items-center justify-between py-3 hover:bg-white/[0.02] transition-colors -mx-4 px-4 first:pt-0 last:pb-0">
                      <span class="text-sm text-grey-400">{item.name}</span>
                      <span class="text-sm font-medium text-white">{item.stat}</span>
                    </Link>
                  )}
                </For>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header title="Activity" subtitle={props.month} />
              <Card.Body class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-grey-400">Forwarded</span>
                  <Badge variant="success" size="sm">{props.totals.forwarded}</Badge>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-grey-400">Blocked</span>
                  <Badge variant="error" size="sm">{props.totals.blocked}</Badge>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-grey-400">Replies</span>
                  <Badge variant="info" size="sm">{props.totals.replies}</Badge>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-grey-400">Sent</span>
                  <Badge variant="primary" size="sm">{props.totals.sent}</Badge>
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Charts */}
          <div class="lg:col-span-2 space-y-6">
            <Card>
              <Card.Header title="Email Activity" subtitle={props.month} />
              <Card.Body>
                <Show when={chartsLoading()}>
                  <Skeleton class="h-64 w-full" />
                </Show>
                <Show when={!chartsLoading()}>
                  <OutboundMessagesGraph
                    forwardsData={forwardsData()}
                    repliesData={repliesData()}
                    sendsData={sendsData()}
                    labels={labels()}
                  />
                </Show>
              </Card.Body>
            </Card>

            <div class="grid sm:grid-cols-2 gap-6">
              <Card>
                <Card.Header title="Outbound Messages" subtitle={props.month} />
                <Card.Body class="flex items-center justify-center min-h-[200px]">
                  <Show when={chartsLoading()}>
                    <Skeleton class="h-40 w-40 rounded-full" />
                  </Show>
                  <Show when={!chartsLoading()}>
                    <OutboundMessagesPie data={outboundMessageTotals()} />
                  </Show>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header title="Quick Tips" />
                <Card.Body class="space-y-3 text-sm text-grey-400">
                  <p>Use aliases to protect your real email address when signing up for services.</p>
                  <p>Custom domains let you create aliases on your own domain names.</p>
                  <p>Add rules to automatically sort or block incoming emails.</p>
                  <p>Enable two-factor authentication in Settings for extra security.</p>
                </Card.Body>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
