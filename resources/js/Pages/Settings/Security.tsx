import { createSignal, Show, For, createMemo } from 'solid-js'
import { Title } from '@solidjs/meta'
import { useForm, router } from '../../lib/inertia'
import SettingsLayout from '../../Layouts/SettingsLayout'
import Loader from '../../Components/Loader'
import Modal from '../../Components/Modal'
import http from '../../lib/http'

const successMessage = (text = '') =>
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Success', text, type: 'success' } }),
  )
const errorMessage = (text = 'An error has occurred, please try again later') =>
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Error', text, type: 'error' } }),
  )

interface WebAuthnKey {
  id: number
  name: string
  created_at: string
  enabled: boolean
  enableKeyLoading?: boolean
}

interface SecurityProps {
  initialTwoFactorEnabled: boolean
  initialWebauthnEnabled: boolean
  backupCode?: string
  regeneratedBackupCode?: string
  authSecret?: string
  qrCode?: string
  initialKeys?: WebAuthnKey[]
}

export default function SecuritySettings(props: SecurityProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = createSignal(props.initialTwoFactorEnabled)
  const [webauthnEnabled, setWebauthnEnabled] = createSignal(props.initialWebauthnEnabled)
  const [keys, setKeys] = createSignal<WebAuthnKey[]>(props.initialKeys ?? [])
  const [regeneratedBackupCode, setRegeneratedBackupCode] = createSignal(
    props.regeneratedBackupCode ?? '',
  )

  const enabledKeys = createMemo(() => keys().filter(k => k.enabled))

  const [disableKeyModalOpen, setDisableKeyModalOpen] = createSignal(false)
  const [deleteKeyModalOpen, setDeleteKeyModalOpen] = createSignal(false)
  const [disableKeyCurrentPassword, setDisableKeyCurrentPassword] = createSignal('')
  const [deleteKeyCurrentPassword, setDeleteKeyCurrentPassword] = createSignal('')
  const [keyToDisable, setKeyToDisable] = createSignal<WebAuthnKey | null>(null)
  const [keyToDelete, setKeyToDelete] = createSignal<WebAuthnKey | null>(null)
  const [disableKeyLoading, setDisableKeyLoading] = createSignal(false)
  const [deleteKeyLoading, setDeleteKeyLoading] = createSignal(false)
  const [disableKeyError, setDisableKeyError] = createSignal('')
  const [deleteKeyError, setDeleteKeyError] = createSignal('')

  const updatePasswordForm = useForm({ current: '', password: '', password_confirmation: '' })
  const browserSessionsForm = useForm({ current: '' })
  const newBackupCodeForm = useForm({ current: '' })
  const disableTwoFactorForm = useForm({ current: '' })
  const enableTwoFactorForm = useForm({ two_factor_token: '', current: '' })
  const regenerateTwoFactorForm = useForm({} as Record<string, never>)

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 bg-white/5 text-white ${hasError ? 'ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'ring-grey-300 placeholder:text-grey-400 focus:ring-primary'}`

  const clipboard = (str: string) => {
    navigator.clipboard.writeText(str).then(
      () => successMessage('Copied to clipboard'),
      () => errorMessage('Could not copy to clipboard'),
    )
  }

  return (
    <SettingsLayout>
      <Title>Security Settings</Title>
      <div class="divide-y divide-grey-200">
        {props.backupCode && (
          <div
            class="text-base border-t-8 rounded text-yellow-200 border-yellow-600 bg-yellow-900/20 px-3 py-4 mt-4"
            role="alert"
          >
            <div class="flex items-center mb-2">
              <span class="rounded-full bg-yellow-400 uppercase px-2 py-1 text-xs font-bold mr-2">
                Important
              </span>
              <div>
                2FA successfully enabled! Please <b>make a copy of your backup code below</b>. If
                you have an old backup code saved <b>you must update it with this one.</b> If you
                lose your 2FA device you can use this backup code to disable 2FA on your account.
                <b>This is the only time this code will be displayed, so be sure not to lose it!</b>
              </div>
            </div>
            <pre
              onClick={() => clipboard(props.backupCode!)}
              class="flex p-3 text-white bg-surface border rounded cursor-pointer"
              title="Copy To Clipboard"
            >
              <code class="break-all whitespace-normal">{props.backupCode}</code>
            </pre>
          </div>
        )}

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Update Password</h3>
            <p class="text-base text-grey-200">
              Ensure your account is using a long, random, unique password to stay secure. It is
              recommended to use a password manager such as Bitwarden. Updating your password will
              also logout your active sessions on other browsers and devices.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                updatePasswordForm.post(route('settings.password')!, {
                  preserveScroll: true,
                  onSuccess: () => updatePasswordForm.reset(),
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <div class="mb-4">
                    <label for="current" class="block text-sm font-medium leading-6 text-white">
                      Current Password
                    </label>
                    <div class="relative mt-2">
                      <input
                        value={updatePasswordForm.data.current}
                        onInput={e => updatePasswordForm.setData('current', e.currentTarget.value)}
                        type="password"
                        name="current"
                        id="current"
                        required
                        class={inputClass(!!updatePasswordForm.errors.current)}
                        placeholder="********"
                        aria-invalid={updatePasswordForm.errors.current ? 'true' : undefined}
                        aria-describedby={
                          updatePasswordForm.errors.current ? 'current-password-error' : undefined
                        }
                      />
                    </div>
                    {updatePasswordForm.errors.current && (
                      <p class="mt-2 text-sm text-red-600" id="current-password-error">
                        {updatePasswordForm.errors.current}
                      </p>
                    )}
                  </div>
                  <div class="mb-4">
                    <label for="password" class="block text-sm font-medium leading-6 text-white">
                      New Password
                    </label>
                    <div class="relative mt-2">
                      <input
                        value={updatePasswordForm.data.password}
                        onInput={e => updatePasswordForm.setData('password', e.currentTarget.value)}
                        type="password"
                        name="password"
                        id="password"
                        required
                        class={inputClass(!!updatePasswordForm.errors.password)}
                        placeholder="********"
                        aria-invalid={updatePasswordForm.errors.password ? 'true' : undefined}
                        aria-describedby={
                          updatePasswordForm.errors.password ? 'password-error' : undefined
                        }
                      />
                    </div>
                    {updatePasswordForm.errors.password && (
                      <p class="mt-2 text-sm text-red-600" id="password-error">
                        {updatePasswordForm.errors.password}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      for="password-confirm"
                      class="block text-sm font-medium leading-6 text-white"
                    >
                      Confirm New Password
                    </label>
                    <div class="relative mt-2">
                      <input
                        value={updatePasswordForm.data.password_confirmation}
                        onInput={e =>
                          updatePasswordForm.setData('password_confirmation', e.currentTarget.value)
                        }
                        type="password"
                        name="password_confirmation"
                        id="password-confirm"
                        class="block w-full rounded-md border-0 py-1.5 text-white ring-1 ring-grey-300 placeholder:text-grey-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-base sm:leading-6 bg-white/5"
                        placeholder="********"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={updatePasswordForm.processing}
                class="bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
              >
                Update Password {updatePasswordForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Browser Sessions</h3>
            <p class="text-base text-grey-200">
              If necessary, you may logout of all of your other browser sessions across all of your
              devices. If you feel your account has been compromised, you should also update your
              password.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                browserSessionsForm.delete(route('settings.browser_sessions')!, {
                  preserveScroll: true,
                  onSuccess: () => browserSessionsForm.reset(),
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="browser-sessions"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Current Password
                  </label>
                  <div class="relative mt-2">
                    <input
                      value={browserSessionsForm.data.current}
                      onInput={e => browserSessionsForm.setData('current', e.currentTarget.value)}
                      type="password"
                      name="current"
                      id="browser-sessions"
                      required
                      class={inputClass(!!browserSessionsForm.errors.current)}
                      placeholder="********"
                      aria-invalid={browserSessionsForm.errors.current ? 'true' : undefined}
                      aria-describedby={
                        browserSessionsForm.errors.current ? 'browser-sessions-error' : undefined
                      }
                    />
                  </div>
                  {browserSessionsForm.errors.current && (
                    <p class="mt-2 text-sm text-red-600" id="browser-sessions-error">
                      {browserSessionsForm.errors.current}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={browserSessionsForm.processing}
                class="bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
              >
                Logout Other Browser Sessions {browserSessionsForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h2 class="text-xl font-medium leading-6 text-white">Two-Factor Authentication</h2>
            <p class="text-base text-grey-200">
              Two-factor authentication, also known as 2FA or multi-factor, adds an extra layer of
              security to your account beyond your username and password. There are{' '}
              <b>multiple options for 2FA</b> - 1. Authentication App (e.g. Google Authenticator or
              another, Aegis, Ente Auth) 2. Hardware Security Key (e.g. YubiKey, SoloKey, Nitrokey)
              3. Passkeys (which can be stored in a supported provider such as Bitwarden or
              1Password).
            </p>
            <p class="text-base text-grey-200">
              When you login with 2FA enabled, you will be prompted to use a security key or enter a
              OTP (one time passcode) depending on which method you choose below. You can have both
              methods of 2nd factor authentication enabled at once if you wish.
            </p>
          </div>
        </div>

        <Show when={twoFactorEnabled() || webauthnEnabled()}>
          <div class="py-10">
            <div class="space-y-1">
              <h3 class="text-lg font-medium leading-6 text-white">Generate New Backup Code</h3>
              <p class="text-base text-grey-200">
                The backup code can be used in a situation where you have lost your 2FA device to
                allow you to access your account. If you've forgotten or lost your backup code then
                you can generate a new one by clicking the button below.
                <b>This code will only be displayed once</b> so make sure you store it in a{' '}
                <b>secure place</b>. If you have an old backup code saved{' '}
                <b>you must update it with this one</b>.
              </p>
            </div>
            {regeneratedBackupCode() && (
              <div
                class="text-base border-t-8 rounded text-yellow-200 border-yellow-600 bg-yellow-900/20 px-3 py-4 mt-4"
                role="alert"
              >
                <div class="flex items-center mb-2">
                  <span class="rounded-full bg-yellow-400 uppercase px-2 py-1 text-xs font-bold mr-2">
                    Important
                  </span>
                  <div>
                    Please <b>make a copy of your backup code below</b>. If you have an old backup
                    code saved <b>you must update it with this one.</b> If you lose your 2FA device
                    you can use this backup code to disable 2FA on your account.
                    <b>
                      This is the only time this code will be displayed, so be sure not to lose it!
                    </b>
                  </div>
                </div>
                <pre
                  onClick={() => clipboard(regeneratedBackupCode())}
                  class="flex p-3 text-white bg-surface border rounded cursor-pointer"
                  title="Copy To Clipboard"
                >
                  <code class="break-all whitespace-normal">{regeneratedBackupCode()}</code>
                </pre>
              </div>
            )}
            <div class="mt-4">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  newBackupCodeForm.post(route('settings.new_backup_code')!, {
                    preserveScroll: true,
                    onSuccess: () => newBackupCodeForm.reset(),
                  })
                }}
              >
                <div class="mb-4">
                  <label
                    for="new-backup-code"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Current Password
                  </label>
                  <div class="relative mt-2">
                    <input
                      value={newBackupCodeForm.data.current}
                      onInput={e => newBackupCodeForm.setData('current', e.currentTarget.value)}
                      type="password"
                      name="current"
                      id="new-backup-code"
                      required
                      class={inputClass(!!newBackupCodeForm.errors.current)}
                      placeholder="********"
                      aria-invalid={newBackupCodeForm.errors.current ? 'true' : undefined}
                      aria-describedby={
                        newBackupCodeForm.errors.current ? 'new-backup-code-error' : undefined
                      }
                    />
                  </div>
                  {newBackupCodeForm.errors.current && (
                    <p class="mt-2 text-sm text-red-600" id="new-backup-code-error">
                      {newBackupCodeForm.errors.current}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={newBackupCodeForm.processing}
                  class="bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
                >
                  Generate New Backup Code {newBackupCodeForm.processing && <Loader />}
                </button>
              </form>
            </div>
          </div>
        </Show>

        <Show when={twoFactorEnabled()}>
          <div class="py-10">
            <div class="space-y-1">
              <h3 class="text-lg font-medium leading-6 text-white">
                Disable Authentication App (TOTP)
              </h3>
              <p class="text-base text-grey-200">
                To disable TOTP authentication enter your password below. You can always enable it
                again later if you wish.
              </p>
            </div>
            <div class="mt-4">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  disableTwoFactorForm.post(route('settings.2fa_disable')!, {
                    preserveScroll: true,
                    onSuccess: () => {
                      disableTwoFactorForm.reset()
                      setTwoFactorEnabled(false)
                    },
                  })
                }}
              >
                <div class="grid grid-cols-1 mb-6">
                  <div>
                    <label
                      for="disable-two-factor"
                      class="block text-sm font-medium leading-6 text-white"
                    >
                      Current Password
                    </label>
                    <div class="relative mt-2">
                      <input
                        value={disableTwoFactorForm.data.current}
                        onInput={e =>
                          disableTwoFactorForm.setData('current', e.currentTarget.value)
                        }
                        type="password"
                        name="current"
                        id="disable-two-factor"
                        required
                        class={inputClass(!!disableTwoFactorForm.errors.current)}
                        placeholder="********"
                        aria-invalid={disableTwoFactorForm.errors.current ? 'true' : undefined}
                        aria-describedby={
                          disableTwoFactorForm.errors.current
                            ? 'disable-two-factor-error'
                            : undefined
                        }
                      />
                    </div>
                    {disableTwoFactorForm.errors.current && (
                      <p class="mt-2 text-sm text-red-600" id="disable-two-factor-error">
                        {disableTwoFactorForm.errors.current}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={disableTwoFactorForm.processing}
                  class="bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
                >
                  Disable TOTP Two-Factor Authentication{' '}
                  {disableTwoFactorForm.processing && <Loader />}
                </button>
              </form>
            </div>
          </div>
        </Show>

        <Show when={!twoFactorEnabled()}>
          <div class="divide-y divide-grey-200">
            <div class="py-10">
              <div class="space-y-1">
                <h3 class="text-lg font-medium leading-6 text-white">
                  Enable Authentication App (TOTP)
                </h3>
                <p class="text-base text-grey-200">
                  TOTP two-factor authentication requires the use of Google Authenticator or another
                  compatible app such as Aegis or Ente Auth. Alternatively, you can use the code
                  below. Make sure that you write down your secret code in a safe place.
                </p>
              </div>
              <div class="mt-4">
                {props.qrCode && <div innerHTML={props.qrCode} />}
                {props.authSecret && <p class="mb-2">Secret: {props.authSecret}</p>}
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    regenerateTwoFactorForm.post(route('settings.2fa_regenerate')!, {
                      preserveScroll: true,
                    })
                  }}
                >
                  <input
                    type="submit"
                    disabled={regenerateTwoFactorForm.processing}
                    class="text-secondary bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    value="Click here to regenerate your secret key"
                  />
                </form>
                <form
                  class="mt-6"
                  onSubmit={e => {
                    e.preventDefault()
                    enableTwoFactorForm.post(route('settings.2fa_enable')!, {
                      preserveScroll: (page: any) => Object.keys(page.props.errors).length > 0,
                      onSuccess: () => {
                        enableTwoFactorForm.reset()
                        setTwoFactorEnabled(true)
                      },
                    })
                  }}
                >
                  <div class="grid grid-cols-1 mb-6">
                    <div class="mb-4">
                      <label
                        for="enable-two-factor"
                        class="block text-sm font-medium leading-6 text-white"
                      >
                        Two-Factor Token
                      </label>
                      <div class="relative mt-2">
                        <input
                          value={enableTwoFactorForm.data.two_factor_token}
                          onInput={e =>
                            enableTwoFactorForm.setData('two_factor_token', e.currentTarget.value)
                          }
                          type="text"
                          name="two_factor_token"
                          id="enable-two-factor"
                          required
                          class={inputClass(!!enableTwoFactorForm.errors.two_factor_token)}
                          placeholder="123456"
                          aria-invalid={
                            enableTwoFactorForm.errors.two_factor_token ? 'true' : undefined
                          }
                          aria-describedby={
                            enableTwoFactorForm.errors.two_factor_token
                              ? 'enable-two-factor-error'
                              : undefined
                          }
                        />
                      </div>
                      {enableTwoFactorForm.errors.two_factor_token && (
                        <p class="mt-2 text-sm text-red-600" id="enable-two-factor-error">
                          {enableTwoFactorForm.errors.two_factor_token}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        for="enable-two-factor-current"
                        class="block text-sm font-medium leading-6 text-white"
                      >
                        Current Password
                      </label>
                      <div class="relative mt-2">
                        <input
                          value={enableTwoFactorForm.data.current}
                          onInput={e =>
                            enableTwoFactorForm.setData('current', e.currentTarget.value)
                          }
                          type="password"
                          name="current"
                          id="enable-two-factor-current"
                          required
                          class={inputClass(!!enableTwoFactorForm.errors.current)}
                          placeholder="********"
                          aria-invalid={enableTwoFactorForm.errors.current ? 'true' : undefined}
                          aria-describedby={
                            enableTwoFactorForm.errors.current
                              ? 'enable-two-factor-current-error'
                              : undefined
                          }
                        />
                      </div>
                      {enableTwoFactorForm.errors.current && (
                        <p class="mt-2 text-sm text-red-600" id="enable-two-factor-current-error">
                          {enableTwoFactorForm.errors.current}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={enableTwoFactorForm.processing}
                    class="bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
                  >
                    Verify and Enable {enableTwoFactorForm.processing && <Loader />}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </Show>

        <Show when={!keys().length}>
          <div class="py-10">
            <div class="space-y-1">
              <h3 class="text-lg font-medium leading-6 text-white">
                Enable Device/Passkey Authentication (WebAuthn)
              </h3>
              <p class="text-base text-grey-200">
                WebAuthn is a new W3C global standard for secure authentication. You can use any
                hardware key such as a Yubikey, Solokey, NitroKey etc.
              </p>
            </div>
            <div class="mt-4">
              <a
                href={route('webauthn.create')!}
                class="block bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded text-center w-full"
              >
                Register New Key
              </a>
            </div>
          </div>
        </Show>

        <Show when={keys().length > 0}>
          <div class="py-10">
            <div class="space-y-1">
              <h3 class="text-lg font-medium leading-6 text-white">
                Device/Passkey Authentication (WebAuthn)
              </h3>
              <p class="text-base text-grey-200">
                Hardware security keys and Passkeys that you have registered for 2nd factor
                authentication. To remove a key simply click the delete button next to it. Disabled
                keys cannot be used to login. If you disable all keys{' '}
                <b>Two-Factor Authentication</b> will{' '}
                {twoFactorEnabled() ? 'still be enabled as you have TOTP 2FA' : 'be turned off'} on
                your account.
              </p>
            </div>
            <div class="mt-4">
              <Show when={keys().length === 0}>
                <p class="mb-0">You have not registered any keys.</p>
              </Show>
              <Show when={keys().length > 0}>
                <div class="table w-full text-sm md:text-base">
                  <div class="table-row">
                    <div class="table-cell p-1 md:p-4 font-semibold">Name</div>
                    <div class="table-cell p-1 md:p-4 font-semibold">Created</div>
                    <div class="table-cell p-1 md:p-4 font-semibold">Enabled</div>
                    <div class="table-cell p-1 md:p-4 text-right">
                      <a href="/webauthn/keys/create" class="text-secondary">
                        Add New Key
                      </a>
                    </div>
                  </div>
                  <For each={keys()}>
                    {key => (
                      <div class="table-row even:bg-white/5 odd:bg-surface even:bg-white/5 odd:bg-surface">
                        <div class="table-cell p-1 md:p-4">{key.name}</div>
                        <div class="table-cell p-1 md:p-4">
                          {(window as any).filters?.timeAgo?.(key.created_at) ?? key.created_at}
                        </div>
                        <div class="table-cell p-1 md:p-4">
                          {key.enabled ? (
                            <svg
                              class="h-5 w-5 inline-block mr-2"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <g fill="none" fill-rule="evenodd">
                                <circle cx="10" cy="10" r="10" fill="#91E697" />
                                <polyline
                                  stroke="#0E7817"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  points="6 10 8.667 12.667 14 7.333"
                                />
                              </g>
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              class="h-5 w-5 inline-block mr-2"
                            >
                              <g fill="none" fill-rule="evenodd">
                                <circle cx="10" cy="10" r="10" fill="#FF9B9B" />
                                <polyline
                                  stroke="#AB091E"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  points="14 6 6 14"
                                />
                                <polyline
                                  stroke="#AB091E"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  points="6 6 14 14"
                                />
                              </g>
                            </svg>
                          )}
                        </div>
                        <div class="table-cell p-1 md:p-4 text-right">
                          {key.enabled ? (
                            <button
                              class="text-secondary font-bold cursor-pointer rounded-sm"
                              onClick={() => {
                                setKeyToDisable(key)
                                setDisableKeyModalOpen(true)
                              }}
                            >
                              Disable
                            </button>
                          ) : (
                            <button
                              class="text-secondary font-bold cursor-pointer rounded-sm"
                              onClick={() => {
                                setKeys(prev =>
                                  prev.map(k =>
                                    k.id === key.id ? { ...k, enableKeyLoading: true } : k,
                                  ),
                                )
                                http
                                  .post('/webauthn/enabled-keys', { id: key.id })
                                  .then(() => {
                                    successMessage('Key Successfully Enabled')
                                    setKeys(prev =>
                                      prev.map(k =>
                                        k.id === key.id
                                          ? { ...k, enabled: true, enableKeyLoading: false }
                                          : k,
                                      ),
                                    )
                                  })
                                  .catch(() => {
                                    setKeys(prev =>
                                      prev.map(k =>
                                        k.id === key.id ? { ...k, enableKeyLoading: false } : k,
                                      ),
                                    )
                                    errorMessage()
                                  })
                              }}
                            >
                              Enable {key.enableKeyLoading && <Loader />}
                            </button>
                          )}
                          <button
                            class="text-red-500 font-bold cursor-pointer sm:ml-4 rounded-sm"
                            onClick={() => {
                              setKeyToDelete(key)
                              setDeleteKeyModalOpen(true)
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>

      <Modal open={disableKeyModalOpen()} onOpenChange={setDisableKeyModalOpen} title="Disable Key">
        <Show when={enabledKeys().length <= 1 && !twoFactorEnabled()}>
          <p class="my-4 text-grey-200">
            Once this key is disabled, <b>Two-Factor Authentication</b> will be disabled on your
            account as you do not have any other enabled keys.
          </p>
        </Show>
        <Show when={enabledKeys().length > 1 || twoFactorEnabled()}>
          <p class="my-4 text-grey-200">
            Once this key is disabled, <b>Two-Factor Authentication</b> will still be enabled as you
            have {twoFactorEnabled() ? 'TOTP 2FA' : 'other enabled keys'} on your account.
          </p>
        </Show>
        <div class="mt-6">
          <label
            for="disable-key-current-password"
            class="block font-medium leading-6 text-white text-sm my-2"
          >
            Current Password
          </label>
          {disableKeyError() && <p class="mb-3 text-red-500 text-sm">{disableKeyError()}</p>}
          <input
            value={disableKeyCurrentPassword()}
            onInput={e => setDisableKeyCurrentPassword(e.currentTarget.value)}
            type="password"
            id="disable-key-current-password"
            class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 mb-6 bg-white/5 text-white ${disableKeyError() ? 'ring-red-500' : ''}`}
            placeholder="********"
            autofocus
          />
          <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded disabled:cursor-not-allowed"
              disabled={disableKeyLoading()}
              onClick={() => {
                setDisableKeyError('')
                if (!disableKeyCurrentPassword()) {
                  setDisableKeyError('Current password is required.')
                  return
                }
                setDisableKeyLoading(true)
                http
                  .post(`/webauthn/enabled-keys/${keyToDisable()!.id}`, {
                    current: disableKeyCurrentPassword(),
                  })
                  .then(() => {
                    setKeys(prev =>
                      prev.map(k => (k.id === keyToDisable()!.id ? { ...k, enabled: false } : k)),
                    )
                    successMessage('Key Successfully Disabled')
                    setDisableKeyLoading(false)
                    setDisableKeyModalOpen(false)
                    setDisableKeyCurrentPassword('')
                    setKeyToDisable(null)
                  })
                  .catch((error: any) => {
                    setDisableKeyLoading(false)
                    if (error.status === 422) {
                      setDisableKeyError('The password is incorrect.')
                    } else {
                      errorMessage()
                    }
                  })
              }}
            >
              Disable {disableKeyLoading() && <Loader />}
            </button>
            <button
              onClick={() => setDisableKeyModalOpen(false)}
              class="px-4 py-3 text-white font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteKeyModalOpen()} onOpenChange={setDeleteKeyModalOpen} title="Remove Key">
        <Show when={enabledKeys().length <= 1 && !twoFactorEnabled()}>
          <p class="my-4 text-grey-200">
            Once this key is removed, <b>Two-Factor Authentication</b> will be disabled on your
            account as you do not have any other enabled keys.
          </p>
        </Show>
        <Show when={enabledKeys().length > 1 || twoFactorEnabled()}>
          <p class="my-4 text-grey-200">
            Once this key is removed, <b>Two-Factor Authentication</b> will still be enabled as you
            have {twoFactorEnabled() ? 'TOTP 2FA' : 'other enabled keys'} on your account.
          </p>
        </Show>
        <div class="mt-6">
          <label
            for="delete-key-current-password"
            class="block font-medium leading-6 text-white text-sm my-2"
          >
            Current Password
          </label>
          {deleteKeyError() && <p class="mb-3 text-red-500 text-sm">{deleteKeyError()}</p>}
          <input
            value={deleteKeyCurrentPassword()}
            onInput={e => setDeleteKeyCurrentPassword(e.currentTarget.value)}
            type="password"
            id="delete-key-current-password"
            class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 mb-6 bg-white/5 text-white ${deleteKeyError() ? 'ring-red-500' : ''}`}
            placeholder="********"
            autofocus
          />
          <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded disabled:cursor-not-allowed"
              disabled={deleteKeyLoading()}
              onClick={() => {
                setDeleteKeyError('')
                if (!deleteKeyCurrentPassword()) {
                  setDeleteKeyError('Current password is required.')
                  return
                }
                setDeleteKeyLoading(true)
                http
                  .post(`/webauthn/keys/${keyToDelete()!.id}`, {
                    current: deleteKeyCurrentPassword(),
                  })
                  .then(() => {
                    const id = keyToDelete()!.id
                    setKeys(prev => prev.filter(k => k.id !== id))
                    if (!keys().length) setWebauthnEnabled(false)
                    setDeleteKeyLoading(false)
                    setDeleteKeyModalOpen(false)
                    setDeleteKeyCurrentPassword('')
                    setKeyToDelete(null)
                    successMessage('Key Successfully Removed')
                  })
                  .catch((error: any) => {
                    setDeleteKeyLoading(false)
                    if (error.status === 422) {
                      setDeleteKeyError('The password is incorrect.')
                    } else {
                      errorMessage()
                    }
                  })
              }}
            >
              Remove {deleteKeyLoading() && <Loader />}
            </button>
            <button
              onClick={() => setDeleteKeyModalOpen(false)}
              class="px-4 py-3 text-white font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </SettingsLayout>
  )
}
