import { Show, type JSX } from 'solid-js'

interface CardProps {
  class?: string
  children: JSX.Element
}

export function Card(props: CardProps) {
  return (
    <div
      class={`rounded-md border border-border-subtle bg-surface ${props.class ?? ''}`}
    >
      {props.children}
    </div>
  )
}

export function CardHeader(props: CardProps) {
  return (
    <div class={`border-b border-border-subtle px-4 py-3 ${props.class ?? ''}`}>
      {props.children}
    </div>
  )
}

export function CardBody(props: CardProps) {
  return <div class={`px-4 py-4 ${props.class ?? ''}`}>{props.children}</div>
}

export function CardFooter(props: CardProps) {
  return (
    <div
      class={`border-t border-border-subtle px-4 py-3 ${props.class ?? ''}`}
    >
      {props.children}
    </div>
  )
}

export default Card
