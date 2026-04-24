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
              'rgba(102, 255, 176, 1)',
              'rgba(161, 161, 170, 1)',
              'rgba(120, 113, 108, 1)',
            ],
            borderColor: '#1e1e1e',
            borderWidth: 2,
            hoverOffset: 4,
            data: props.totals,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#a1a1aa',
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(30,30,30,0.95)',
            titleColor: '#fff',
            bodyColor: '#d4d4d8',
            padding: 12,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
          },
        },
      },
    })

    onCleanup(() => chart.destroy())
  })

  return <canvas ref={canvasRef} style={{ 'max-height': '280px' }} />
}
