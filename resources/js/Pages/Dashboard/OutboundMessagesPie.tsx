import { onMount, onCleanup } from 'solid-js'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface OutboundMessagesPieProps {
  totals: number[]
}

export default function OutboundMessagesPie(props: OutboundMessagesPieProps) {
  let canvasRef: HTMLCanvasElement | undefined

  onMount(() => {
    if (!canvasRef) return

    const chart = new ChartJS(canvasRef, {
      type: 'doughnut',
      data: {
        labels: ['Forwards', 'Replies', 'Sends'],
        datasets: [
          {
            label: 'Total',
            backgroundColor: [
              'rgba(28, 212, 212, 1)',
              'rgba(25, 33, 108, 1)',
              'rgba(123, 147, 219, 1)',
            ],
            hoverOffset: 4,
            data: props.totals,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
      },
    })

    onCleanup(() => chart.destroy())
  })

  return <canvas ref={canvasRef} style={{ "max-height": '350px' }} />
}
