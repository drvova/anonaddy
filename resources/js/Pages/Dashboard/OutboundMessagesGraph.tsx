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
            backgroundColor: 'rgba(102, 255, 176, 1)',
            borderColor: 'rgba(102, 255, 176, 1)',
            borderWidth: 3,
            pointBackgroundColor: 'rgba(102, 255, 176, 1)',
            pointBorderColor: '#1e1e1e',
            tension: 0.4,
            pointRadius: 4,
            pointBorderWidth: 2,
            pointHitRadius: 100,
            pointHoverBackgroundColor: '#1e1e1e',
            pointHoverBorderColor: 'rgba(102, 255, 176, 1)',
            data: props.forwardsData,
          },
          {
            label: 'Replies',
            backgroundColor: 'rgba(161, 161, 170, 1)',
            borderColor: 'rgba(161, 161, 170, 1)',
            borderWidth: 3,
            pointBackgroundColor: 'rgba(161, 161, 170, 1)',
            pointBorderColor: '#1e1e1e',
            tension: 0.4,
            pointRadius: 4,
            pointBorderWidth: 2,
            pointHitRadius: 100,
            pointHoverBackgroundColor: '#1e1e1e',
            pointHoverBorderColor: 'rgba(161, 161, 170, 1)',
            data: props.repliesData,
          },
          {
            label: 'Sends',
            backgroundColor: 'rgba(120, 113, 108, 1)',
            borderColor: 'rgba(120, 113, 108, 1)',
            borderWidth: 3,
            pointBackgroundColor: 'rgba(120, 113, 108, 1)',
            pointBorderColor: '#1e1e1e',
            tension: 0.4,
            pointRadius: 4,
            pointBorderWidth: 2,
            pointHitRadius: 100,
            pointHoverBackgroundColor: '#1e1e1e',
            pointHoverBorderColor: 'rgba(120, 113, 108, 1)',
            data: props.sendsData,
          },
        ],
      },
      options: {
        responsive: true,
        elements: {
          point: {
            radius: 4,
            hitRadius: 6,
            hoverRadius: 6,
          },
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#a1a1aa',
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(30,30,30,0.95)',
            titleColor: '#fff',
            bodyColor: '#d4d4d8',
            titleSpacing: 4,
            titleMarginBottom: 8,
            titleFont: { size: 14 },
            bodySpacing: 4,
            bodyFont: { size: 13 },
            padding: 12,
            displayColors: true,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
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
          x: {
            grid: { display: false },
            ticks: { color: '#71717a' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#71717a', stepSize: 1 },
          },
        },
      },
    })

    onCleanup(() => chart.destroy())
  })

  return <canvas ref={canvasRef} />
}
