interface SkeletonProps {
  class?: string
  circle?: boolean
}

export default function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={`animate-pulse bg-white/5 ${props.circle ? 'rounded-full' : 'rounded-md'} ${props.class ?? ''}`}
    />
  )
}

export function SkeletonText(props: { lines?: number; class?: string }) {
  const lineCount = () => props.lines ?? 1

  return (
    <div class={`space-y-2 ${props.class ?? ''}`}>
      {Array.from({ length: lineCount() }).map((_, i) => (
        <Skeleton
          class={i === lineCount() - 1 && lineCount() > 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div class="rounded-md border border-border-subtle bg-surface p-4">
      <div class="flex items-start gap-3">
        <Skeleton circle class="h-10 w-10 shrink-0" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-1/3" />
          <Skeleton class="h-3 w-1/2" />
          <Skeleton class="h-3 w-3/4" />
        </div>
      </div>
    </div>
  )
}
