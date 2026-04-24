import '../css/app.css'
import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import { createInertiaApp } from './lib/inertia'
import { route as ziggyRoute } from 'ziggy-js'
import { render } from 'solid-js/web'
import AppLayout from './Layouts/AppLayout'

dayjs.extend(advancedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)

window.dayjs = dayjs
window.route = ziggyRoute

const filters = {
  formatDate: (value: string) => (value ? dayjs(value).format('Do MMM YYYY') : ''),
  formatDateTime: (value: string) => (value ? dayjs(value).format('Do MMM YYYY h:mm A') : ''),
  timeAgo: (value: string) => (value ? dayjs(value).fromNow() : ''),
  dateTimeNow: () => dayjs().utc().toISOString(),
  truncate: (value: string, length = 70) => {
    if (!value) return ''
    return value.length > length ? value.substring(0, length) + '...' : value
  },
}

export { filters }

createInertiaApp({
  progress: {
    color: '#66ffb0',
    delay: 50,
  },
  resolve: name => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })
    const page = pages[`./Pages/${name}.tsx`]

    if (!page) {
      throw new Error(`Page not found: ${name}`)
    }

    if (!page.default.layout) {
      page.default.layout = AppLayout
    }

    return page
  },
  setup({ el, App, props }) {
    render(() => <App {...props} />, el)
  },
})
