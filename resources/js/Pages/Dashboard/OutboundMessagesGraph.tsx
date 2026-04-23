import { onMount, onCleanup } from 'solid-js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface OutboundMessagesGraphProps {
  forwardsData: number[]
  repliesData: number[]
  sendsData: number[]
  labels: string[]
}

export default function OutboundMessagesGraph(props: OutboundMessagesGraphProps) {
  let canvasRef: HTMLCanvasElement | undefined

  onMount(() => {
    if (!canvasRef) return

    const chart = new ChartJS(canvasRef, {
      type: 'line',
      data: {
        labels: props.labels,
        datasets: [
          {
            label: 'Forwards',
            backgroundColor: 'rgba(28, 212, 212, 1)',
            borderColor: 'rgba(28, 212, 212, 1)',
            borderWidth: 4,
            pointBackgroundColor: 'rgba(28, 212, 212, 1)',
            pointBorderColor: '#fff',
            tension: 0.4,
            pointRadius: 5,
            pointBorderWidth: 2,
            pointHitRadius: 100,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(28, 212, 212, 1)',
            data: props.forwardsData,
          },
          {
            label: 'Replies',
            backgroundColor: 'rgba(25, 33, 108, 1)',
            borderColor: 'rgba(25, 33, 108, 1)',
            borderWidth: 4,
            pointBackgroundColor: 'rgba(25, 33, 108, 1)',
            pointBorderColor: '#fff',
            tension: 0.4,
            pointRadius: 5,
            pointBorderWidth: 2,
            pointHitRadius: 100,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(25, 33, 108, 1)',
            data: props.repliesData,
          },
          {
            label: 'Sends',
            backgroundColor: 'rgba(123, 147, 219, 1)',
            borderColor: 'rgba(123, 147, 219, 1)',
            borderWidth: 4,
            pointBackgroundColor: 'rgba(123, 147, 219, 1)',
            pointBorderColor: '#fff',
            tension: 0.4,
            pointRadius: 5,
            pointBorderWidth: 2,
            pointHitRadius: 100,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(123, 147, 219, 1)',
            data: props.sendsData,
          },
        ],
      },
      options: {
        responsive: true,
        elements: {
          point: {
            radius: 6,
            hitRadius: 6,
            hoverRadius: 6,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.7)',
            titleSpacing: 4,
            titleMarginBottom: 8,
            titleFont: { size: 15 },
            bodySpacing: 4,
            bodyFont: { size: 14 },
            padding: 10,
            displayColors: true,
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        hover: {
          mode: 'nearest',
          intersect: true,
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { display: false },
            ticks: { stepSize: 1 },
          },
        },
      },
    })

    onCleanup(() => chart.destroy())
  })

  return <canvas ref={canvasRef} />
}
