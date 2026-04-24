import { Title } from '@solidjs/meta'
import type { ParentProps } from 'solid-js'
import { Show } from 'solid-js'
import { Link, useForm, usePage } from '../../lib/inertia'
import Loader from '../../Components/Loader'

function Verify() {
  const page = usePage()
  const form = useForm({})

  function handleSubmit(e: Event) {
    e.preventDefault()
    form.post(route('verification.resend'), { preserveScroll: true })
  }

  return (
    <div class="auth-shell">
      <Title>Verify Email</Title>
      <div class="auth-grid">
        <div>
          <div class="mb-8 flex items-center justify-center lg:mb-10 lg:justify-start">
            <Link href="/" class="inline-flex items-center justify-center">
              <img class="block h-8 w-auto" alt="VovaMail" src="/svg/logo.svg" />
            </Link>
          </div>

          <div class="auth-aside">
            <p class="auth-display">Protect the inbox you actually use.</p>
            <p class="auth-copy">
              Confirm your real inbox before mail starts flowing through aliases, custom domains,
              and reply-safe forwarding.
            </p>

            <div class="auth-points">
              <div class="auth-point">
                <p class="auth-point-label">Verification keeps delivery clean</p>
                <p class="auth-point-copy">
                  We only route mail once the inbox behind your account is proven.
                </p>
              </div>
              <div class="auth-point">
                <p class="auth-point-label">Fix the wrong inbox fast</p>
                <p class="auth-point-copy">
                  If the address is wrong, update it in settings before turning aliases on.
                </p>
              </div>
              <div class="auth-point">
                <p class="auth-point-label">No loose accounts</p>
                <p class="auth-point-copy">
                  Unverified accounts are removed automatically after 30 days.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="auth-panel">
            <div class="auth-panel-header">
              <h1 class="auth-title">Verify your email</h1>
              <p class="auth-subtitle">
                Check <strong class="font-medium text-white">{page.props.user.email}</strong> for
                your verification link. It expires after one hour.
              </p>
            </div>

            <Show when={form.recentlySuccessful}>
              <div class="auth-alert auth-alert-success" role="status">
                Fresh verification email sent.
              </div>
            </Show>

            <p class="mb-3 text-sm leading-7 text-grey-300">
              If this inbox is wrong, update it on the{' '}
              <Link href={route('settings.show')} class="auth-link">
                settings page
              </Link>
              .
            </p>

            <p class="mb-6 text-sm leading-7 text-grey-400">You can resend once per minute.</p>

            <form onSubmit={handleSubmit}>
              <button type="submit" disabled={form.processing} class="auth-button">
                Resend verification email
                <Show when={form.processing}>
                  <Loader />
                </Show>
              </button>
            </form>

            <p class="auth-footer text-center lg:text-left">
              Need to leave?{' '}
              <Link href={route('logout')} method="post" class="auth-link">
                Sign out
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

Verify.layout = (props: ParentProps) => props.children

export default Verify
