import { Title } from '@solidjs/meta'
import { useForm, usePage, Link } from '../../lib/inertia'
import SettingsLayout from '../../Layouts/SettingsLayout'
import Loader from '../../Components/Loader'

const displayFromFormatOptions = [
  { value: 0, label: "John Doe 'johndoe at example.com'" },
  { value: 7, label: "John Doe 'johndoe@example.com'" },
  { value: 1, label: 'John Doe - johndoe(a)example.com' },
  { value: 2, label: 'John Doe - example.com' },
  { value: 3, label: 'John Doe' },
  { value: 4, label: 'johndoe at example.com' },
  { value: 6, label: 'example.com' },
  { value: 5, label: 'No name - just the alias' },
]

const loginRedirectOptions = [
  { value: 0, label: 'Dashboard' },
  { value: 1, label: 'Aliases' },
  { value: 2, label: 'Recipients' },
  { value: 3, label: 'Usernames' },
  { value: 4, label: 'Domains' },
]

const listUnsubscribeBehaviourOptions = [
  {
    value: 0,
    label: 'Use original List-Unsubscribe, fallback to one-click deactivate if none is present',
  },
  { value: 1, label: 'Always use one-click deactivate' },
  { value: 2, label: 'Always use one-click delete' },
  { value: 3, label: 'Always use one-click block sender email' },
  { value: 4, label: 'Always use one-click block sender domain' },
]

interface GeneralProps {
  defaultAliasDomain: string
  defaultAliasFormat: string
  aliasSeparator: string
  loginRedirect: number
  displayFromFormat: number
  domainOptions: string[]
  useReplyTo: boolean
  storeFailedDeliveries: boolean
  darkMode: boolean
  saveAliasLastUsed: boolean
  fromName: string
  bannerLocation: string
  spamWarningBehaviour: string
  listUnsubscribeBehaviour: number
  emailSubject: string
}

export default function GeneralSettings(props: GeneralProps) {
  const page = usePage()
  const user = () => (page.props as any).user
  const usesExternalAuth = () => (page.props as any).usesExternalAuthentication

  const emailForm = useForm({ email: '', current: '' })
  const darkModeForm = useForm({ dark_mode: props.darkMode })
  const defaultAliasDomainForm = useForm({ domain: props.defaultAliasDomain })
  const defaultAliasFormatForm = useForm({ format: props.defaultAliasFormat })
  const aliasSeparatorForm = useForm({ separator: props.aliasSeparator })
  const loginRedirectForm = useForm({ redirect: props.loginRedirect })
  const displayFromFormatForm = useForm({ format: props.displayFromFormat })
  const useReplyToForm = useForm({ use_reply_to: props.useReplyTo })
  const storeFailedDeliveriesForm = useForm({
    store_failed_deliveries: props.storeFailedDeliveries,
  })
  const saveAliasLastUsedForm = useForm({ save_alias_last_used: props.saveAliasLastUsed })
  const fromNameForm = useForm({ from_name: props.fromName })
  const bannerLocationForm = useForm({ banner_location: props.bannerLocation })
  const spamWarningBehaviourForm = useForm({ spam_warning_behaviour: props.spamWarningBehaviour })
  const listUnsubscribeBehaviourForm = useForm({
    list_unsubscribe_behaviour: props.listUnsubscribeBehaviour,
  })
  const emailSubjectForm = useForm({ email_subject: props.emailSubject })

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 bg-white/5 text-white ${hasError ? 'ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'ring-grey-300 placeholder:text-grey-400 focus:ring-primary'}`

  const selectClass = (hasError: boolean) =>
    `relative block w-full rounded border-0 bg-transparent py-2 text-white bg-white/5 ring-1 ring-inset focus:z-10 focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 ${hasError ? 'ring-red-300 focus:ring-red-500' : 'ring-grey-300 focus:ring-primary'}`

  const btnClass = (processing: boolean) =>
    `bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed`

  return (
    <SettingsLayout>
      <Title>General Settings</Title>
      <div class="divide-y divide-grey-200">
        {!usesExternalAuth() && (
          <div class="py-10">
            <div class="space-y-1">
              <h3 class="text-lg font-medium leading-6 text-white">Update Email</h3>
              <p class="text-base text-grey-200">
                This is your account's default recipient email address, it is used for all general
                email notifications. You'll need to verify the new email address by clicking the
                link in the email notification before it is updated.
              </p>
            </div>
            <div class="mt-4">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  emailForm.post(route('settings.edit_default_recipient')!, {
                    preserveScroll: true,
                    onSuccess: () => emailForm.reset(),
                  })
                }}
              >
                <div class="grid grid-cols-1 mb-6">
                  <div>
                    <div class="mb-4">
                      <label
                        for="current_email"
                        class="block text-sm font-medium leading-6 text-white"
                      >
                        Current Email
                      </label>
                      <div class="relative mt-2">
                        <input
                          type="email"
                          name="current_email"
                          id="current_email"
                          value={user()?.email ?? ''}
                          disabled
                          class="block w-full rounded-md border-0 py-1.5 text-white ring-1 ring-grey-300 placeholder:text-grey-400 focus:ring-2 focus:ring-inset focus:ring-primary disabled:cursor-not-allowed disabled:bg-surface disabled:text-grey-500 disabled:ring-grey-200 sm:text-sm sm:leading-6"
                        />
                      </div>
                    </div>
                    <div class="mb-4">
                      <label for="email" class="block text-sm font-medium leading-6 text-white">
                        New Email
                      </label>
                      <div class="relative mt-2">
                        <input
                          value={emailForm.data.email}
                          onInput={e => emailForm.setData('email', e.currentTarget.value)}
                          type="email"
                          name="email"
                          id="email"
                          required
                          autocomplete="email"
                          class={inputClass(!!emailForm.errors.email)}
                          placeholder="johndoe@example.com"
                          aria-invalid={emailForm.errors.email ? 'true' : undefined}
                          aria-describedby={emailForm.errors.email ? 'email-error' : undefined}
                        />
                      </div>
                      {emailForm.errors.email && (
                        <p class="mt-2 text-sm text-red-600" id="email-error">
                          {emailForm.errors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        for="email-current"
                        class="block text-sm font-medium leading-6 text-white"
                      >
                        Current Password
                      </label>
                      <div class="relative mt-2">
                        <input
                          value={emailForm.data.current}
                          onInput={e => emailForm.setData('current', e.currentTarget.value)}
                          type="password"
                          name="current"
                          id="email-current"
                          required
                          class={inputClass(!!emailForm.errors.current)}
                          placeholder="********"
                          aria-invalid={emailForm.errors.current ? 'true' : undefined}
                          aria-describedby={
                            emailForm.errors.current ? 'current-password-error' : undefined
                          }
                        />
                      </div>
                      {emailForm.errors.current && (
                        <p class="mt-2 text-sm text-red-600" id="current-password-error">
                          {emailForm.errors.current}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={emailForm.processing}
                  class={btnClass(emailForm.processing)}
                >
                  Update Email {emailForm.processing && <Loader />}
                </button>
              </form>
            </div>
          </div>
        )}

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Dark Mode Theme</h3>
            <p class="text-base text-grey-200">
              Choose your preferred theme for the web application.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                darkModeForm.post(route('settings.dark_mode')!, {
                  preserveScroll: true,
                  onSuccess: () => window.location.reload(),
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label for="dark-mode" class="block text-sm font-medium leading-6 text-white">
                    Dark Mode
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="dark-mode"
                      value={String(darkModeForm.data.dark_mode)}
                      onChange={e =>
                        darkModeForm.setData('dark_mode', e.currentTarget.value === 'true')
                      }
                      name="format"
                      required
                      class={selectClass(!!darkModeForm.errors.dark_mode)}
                      aria-invalid={darkModeForm.errors.dark_mode ? 'true' : undefined}
                      aria-describedby={
                        darkModeForm.errors.dark_mode ? 'dark-mode-error' : undefined
                      }
                    >
                      <option value="false" class="bg-surface">
                        Disabled
                      </option>
                      <option value="true" class="bg-surface">
                        Enabled
                      </option>
                    </select>
                  </div>
                  {darkModeForm.errors.dark_mode && (
                    <p class="mt-2 text-sm text-red-600" id="dark-mode-error">
                      {darkModeForm.errors.dark_mode}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={darkModeForm.processing}
                class={btnClass(darkModeForm.processing)}
              >
                {(page.props as any).darkMode ? 'Disable' : 'Enable'} Dark Mode{' '}
                {darkModeForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Update Default Alias Domain</h3>
            <p class="text-base text-grey-200">
              The default alias domain is the domain you'd like to be selected by default in the
              drop down options when generating a new alias on the site or the browser extension.
              This will save you needing to select your preferred domain from the dropdown each
              time.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                defaultAliasDomainForm.post(route('settings.default_alias_domain')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="default-alias-domain"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Select Default Domain
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="default-alias-domain"
                      value={defaultAliasDomainForm.data.domain}
                      onChange={e =>
                        defaultAliasDomainForm.setData('domain', e.currentTarget.value)
                      }
                      name="domain"
                      required
                      class={selectClass(!!defaultAliasDomainForm.errors.domain)}
                      aria-invalid={defaultAliasDomainForm.errors.domain ? 'true' : undefined}
                      aria-describedby={
                        defaultAliasDomainForm.errors.domain
                          ? 'default-alias-domain-error'
                          : undefined
                      }
                    >
                      {props.domainOptions.map(domain => (
                        <option
                          value={domain}
                          selected={props.defaultAliasDomain === domain}
                          class="bg-surface"
                        >
                          {domain}
                        </option>
                      ))}
                    </select>
                  </div>
                  {defaultAliasDomainForm.errors.domain && (
                    <p class="mt-2 text-sm text-red-600" id="default-alias-domain-error">
                      {defaultAliasDomainForm.errors.domain}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={defaultAliasDomainForm.processing}
                class={btnClass(defaultAliasDomainForm.processing)}
              >
                Update Default Alias Domain {defaultAliasDomainForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Update Default Alias Format</h3>
            <p class="text-base text-grey-200">
              The default alias format is the format you'd like to be selected by default in the
              drop down options when generating a new alias on the site or the browser extension.
              This will save you needing to select your preferred format from the dropdown each
              time.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                defaultAliasFormatForm.post(route('settings.default_alias_format')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="default-alias-format"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Select Default Format
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="default-alias-format"
                      value={defaultAliasFormatForm.data.format}
                      onChange={e =>
                        defaultAliasFormatForm.setData('format', e.currentTarget.value)
                      }
                      name="format"
                      required
                      class={selectClass(!!defaultAliasFormatForm.errors.format)}
                      aria-invalid={defaultAliasFormatForm.errors.format ? 'true' : undefined}
                      aria-describedby={
                        defaultAliasFormatForm.errors.format
                          ? 'default-alias-format-error'
                          : undefined
                      }
                    >
                      <option
                        value="random_characters"
                        selected={props.defaultAliasFormat === 'random_characters'}
                        class="bg-surface"
                      >
                        Random Characters
                      </option>
                      <option
                        value="uuid"
                        selected={props.defaultAliasFormat === 'uuid'}
                        class="bg-surface"
                      >
                        UUID
                      </option>
                      <option
                        value="random_words"
                        selected={props.defaultAliasFormat === 'random_words'}
                        class="bg-surface"
                      >
                        Random Words
                      </option>
                      <option
                        value="random_male_name"
                        selected={props.defaultAliasFormat === 'random_male_name'}
                        class="bg-surface"
                      >
                        Random Male Name
                      </option>
                      <option
                        value="random_female_name"
                        selected={props.defaultAliasFormat === 'random_female_name'}
                        class="bg-surface"
                      >
                        Random Female Name
                      </option>
                      <option
                        value="random_noun"
                        selected={props.defaultAliasFormat === 'random_noun'}
                        class="bg-surface"
                      >
                        Random Noun
                      </option>
                      <option
                        value="custom"
                        selected={props.defaultAliasFormat === 'custom'}
                        class="bg-surface"
                      >
                        Custom
                      </option>
                    </select>
                  </div>
                  {defaultAliasFormatForm.errors.format && (
                    <p class="mt-2 text-sm text-red-600" id="default-alias-format-error">
                      {defaultAliasFormatForm.errors.format}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={defaultAliasFormatForm.processing}
                class={btnClass(defaultAliasFormatForm.processing)}
              >
                Update Default Alias Format {defaultAliasFormatForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Alias Separator</h3>
            <p class="text-base text-grey-200">
              The character used between words in aliases with the following formats: Random Words,
              Random Male/Female Name, Random Noun and Custom Shared Domain. For example, with
              period:{' '}
              <code class="rounded bg-surface px-1">word.word123@{props.defaultAliasDomain}</code>;
              with underscore:{' '}
              <code class="rounded bg-surface px-1">word_word123@{props.defaultAliasDomain}</code>;
              with hyphen:{' '}
              <code class="rounded bg-surface px-1">word-word123@{props.defaultAliasDomain}</code>.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                aliasSeparatorForm.post(route('settings.alias_separator')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="alias-separator"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Select Separator
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="alias-separator"
                      value={aliasSeparatorForm.data.separator}
                      onChange={e => aliasSeparatorForm.setData('separator', e.currentTarget.value)}
                      name="separator"
                      required
                      class={selectClass(!!aliasSeparatorForm.errors.separator)}
                      aria-invalid={aliasSeparatorForm.errors.separator ? 'true' : undefined}
                      aria-describedby={
                        aliasSeparatorForm.errors.separator ? 'alias-separator-error' : undefined
                      }
                    >
                      <option value="." class="bg-surface">
                        Period (.)
                      </option>
                      <option value="_" class="bg-surface">
                        Underscore (_)
                      </option>
                      <option value="-" class="bg-surface">
                        Hyphen (-)
                      </option>
                      <option value="random" class="bg-surface">
                        Random (varies per alias)
                      </option>
                    </select>
                  </div>
                  {aliasSeparatorForm.errors.separator && (
                    <p class="mt-2 text-sm text-red-600" id="alias-separator-error">
                      {aliasSeparatorForm.errors.separator}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={aliasSeparatorForm.processing}
                class={btnClass(aliasSeparatorForm.processing)}
              >
                Update Alias Separator {aliasSeparatorForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">
              Update Page to Display After Login
            </h3>
            <p class="text-base text-grey-200">
              The login redirect determines which page you should be redirected to after logging in
              to your account. If you select "Aliases" then you will be shown the aliases page after
              you login to your account.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                loginRedirectForm.post(route('settings.login_redirect')!, { preserveScroll: true })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="login-redirect"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Select Login Redirect
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="login-redirect"
                      value={String(loginRedirectForm.data.redirect)}
                      onChange={e =>
                        loginRedirectForm.setData('redirect', Number(e.currentTarget.value))
                      }
                      name="redirect"
                      required
                      class={selectClass(!!loginRedirectForm.errors.redirect)}
                      aria-invalid={loginRedirectForm.errors.redirect ? 'true' : undefined}
                      aria-describedby={
                        loginRedirectForm.errors.redirect ? 'login-redirect-error' : undefined
                      }
                    >
                      {loginRedirectOptions.map(opt => (
                        <option value={String(opt.value)} class="bg-surface">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {loginRedirectForm.errors.redirect && (
                    <p class="mt-2 text-sm text-red-600" id="login-redirect-error">
                      {loginRedirectForm.errors.redirect}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={loginRedirectForm.processing}
                class={btnClass(loginRedirectForm.processing)}
              >
                Update Login Redirect {loginRedirectForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Update Display From Format</h3>
            <p class="text-base text-grey-200">
              The display from format is used when forwarding message to you. If one of your aliases
              receives an email from <b>John Doe &lt;johndoe@example.com&gt;</b> then you can choose
              how this will be displayed in your inbox.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                displayFromFormatForm.post(route('settings.display_from_format')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="display-from-format"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Select Display From Format
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="display-from-format"
                      value={String(displayFromFormatForm.data.format)}
                      onChange={e =>
                        displayFromFormatForm.setData('format', Number(e.currentTarget.value))
                      }
                      name="format"
                      required
                      class={selectClass(!!displayFromFormatForm.errors.format)}
                      aria-invalid={displayFromFormatForm.errors.format ? 'true' : undefined}
                      aria-describedby={
                        displayFromFormatForm.errors.format
                          ? 'display-from-format-error'
                          : undefined
                      }
                    >
                      {displayFromFormatOptions.map(opt => (
                        <option value={String(opt.value)} class="bg-surface">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {displayFromFormatForm.errors.format && (
                    <p class="mt-2 text-sm text-red-600" id="display-from-format-error">
                      {displayFromFormatForm.errors.format}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={displayFromFormatForm.processing}
                class={btnClass(displayFromFormatForm.processing)}
              >
                Update Display From Format {displayFromFormatForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">
              Use Reply-To Header For Replying
            </h3>
            <p class="text-base text-grey-200">
              This will determine if forwarded emails use the From header or the Reply-To header for
              sending replies. Some users may find it easier to set up inbox filters having the
              From: header set as just the alias.
            </p>
            <p class="text-base text-grey-200">
              If enabled, then the <b>From:</b> header will be set as the alias email e.g.{' '}
              <b>
                alias@{user()?.username}.{props.defaultAliasDomain}
              </b>{' '}
              instead of the default{' '}
              <b class="break-words">
                alias+sender=example.com@{user()?.username}.{props.defaultAliasDomain}
              </b>{' '}
              (this will be set as the Reply-To header instead)
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                useReplyToForm.post(route('settings.use_reply_to')!, { preserveScroll: true })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label for="use-reply-to" class="block text-sm font-medium leading-6 text-white">
                    Use Reply-To
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="use-reply-to"
                      value={String(useReplyToForm.data.use_reply_to)}
                      onChange={e =>
                        useReplyToForm.setData('use_reply_to', e.currentTarget.value === 'true')
                      }
                      name="format"
                      required
                      class={selectClass(!!useReplyToForm.errors.use_reply_to)}
                      aria-invalid={useReplyToForm.errors.use_reply_to ? 'true' : undefined}
                      aria-describedby={
                        useReplyToForm.errors.use_reply_to ? 'use-reply-to-error' : undefined
                      }
                    >
                      <option value="true" class="bg-surface">
                        Enabled
                      </option>
                      <option value="false" class="bg-surface">
                        Disabled
                      </option>
                    </select>
                  </div>
                  {useReplyToForm.errors.use_reply_to && (
                    <p class="mt-2 text-sm text-red-600" id="use-reply-to-error">
                      {useReplyToForm.errors.use_reply_to}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={useReplyToForm.processing}
                class={btnClass(useReplyToForm.processing)}
              >
                Update Use Reply-To {useReplyToForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Store Failed Deliveries</h3>
            <p class="text-base text-grey-200">
              This setting allows you to choose whether or not this instance should{' '}
              <b>temporarily store</b> failed delivery attempts, this ensures that{' '}
              <b>emails are not lost</b> if they are rejected by your recipients as they can be
              downloaded from the failed deliveries page. Failed deliveries are{' '}
              <b>automatically deleted after 7 days</b>.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                storeFailedDeliveriesForm.post(route('settings.store_failed_deliveries')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="store-failed-deliveries"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Store Failed Deliveries
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="store-failed-deliveries"
                      value={String(storeFailedDeliveriesForm.data.store_failed_deliveries)}
                      onChange={e =>
                        storeFailedDeliveriesForm.setData(
                          'store_failed_deliveries',
                          e.currentTarget.value === 'true',
                        )
                      }
                      name="format"
                      required
                      class={selectClass(
                        !!storeFailedDeliveriesForm.errors.store_failed_deliveries,
                      )}
                      aria-invalid={
                        storeFailedDeliveriesForm.errors.store_failed_deliveries
                          ? 'true'
                          : undefined
                      }
                      aria-describedby={
                        storeFailedDeliveriesForm.errors.store_failed_deliveries
                          ? 'store-failed-deliveries-error'
                          : undefined
                      }
                    >
                      <option value="true" class="bg-surface">
                        Enabled
                      </option>
                      <option value="false" class="bg-surface">
                        Disabled
                      </option>
                    </select>
                  </div>
                  {storeFailedDeliveriesForm.errors.store_failed_deliveries && (
                    <p class="mt-2 text-sm text-red-600" id="store-failed-deliveries-error">
                      {storeFailedDeliveriesForm.errors.store_failed_deliveries}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={storeFailedDeliveriesForm.processing}
                class={btnClass(storeFailedDeliveriesForm.processing)}
              >
                Update Store Failed Deliveries {storeFailedDeliveriesForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Save Alias 'Last Used At'</h3>
            <p class="text-base text-grey-200">
              This setting allows you to choose whether or not this instance should save the dates
              for <b>last forwarded at</b>, <b>last replied at</b> and <b>last sent at</b> for your
              aliases. You can view this information by hovering over the relevant count of each of
              these on the{' '}
              <Link
                href={route('aliases.index')!}
                class="text-secondary hover:text-secondary/80 text-indigo-300 hover:text-indigo-300 font-medium"
              >
                aliases page
              </Link>
              . You can also sort your list of aliases by "Last Forwarded At" etc.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                saveAliasLastUsedForm.post(route('settings.save_alias_last_used')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="save-alias-last-used"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Save Alias Last Used At
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="save-alias-last-used"
                      value={String(saveAliasLastUsedForm.data.save_alias_last_used)}
                      onChange={e =>
                        saveAliasLastUsedForm.setData(
                          'save_alias_last_used',
                          e.currentTarget.value === 'true',
                        )
                      }
                      name="format"
                      required
                      class={selectClass(!!saveAliasLastUsedForm.errors.save_alias_last_used)}
                      aria-invalid={
                        saveAliasLastUsedForm.errors.save_alias_last_used ? 'true' : undefined
                      }
                      aria-describedby={
                        saveAliasLastUsedForm.errors.save_alias_last_used
                          ? 'save-alias-last-used-error'
                          : undefined
                      }
                    >
                      <option value="true" class="bg-surface">
                        Enabled
                      </option>
                      <option value="false" class="bg-surface">
                        Disabled
                      </option>
                    </select>
                  </div>
                  {saveAliasLastUsedForm.errors.save_alias_last_used && (
                    <p class="mt-2 text-sm text-red-600" id="save-alias-last-used-error">
                      {saveAliasLastUsedForm.errors.save_alias_last_used}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={saveAliasLastUsedForm.processing}
                class={btnClass(saveAliasLastUsedForm.processing)}
              >
                Update Save Alias Last Used At {saveAliasLastUsedForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Update Global 'From Name'</h3>
            <div>
              <p class="text-base text-grey-200">
                The 'From Name' is shown when you send an email from an alias or reply anonymously
                to a forwarded email. If left blank, then the email alias itself will be used as the
                'From Name' e.g. "example@{user()?.username}.{props.defaultAliasDomain}".
              </p>
              <div class="text-base text-grey-200 my-3">
                The 'From Name' that is used for an alias is determined by the following{' '}
                <b>priority</b>:
                <ul class="list-decimal list-inside text-grey-200 text-base mt-2">
                  <li>Alias 'From Name'</li>
                  <li>Username or Custom Domain 'From Name'</li>
                  <li>
                    <b>Global 'From Name'</b> from the settings page
                  </li>
                </ul>
              </div>
              <p class="text-base text-grey-200">
                If you set the 'From Name' for a specific alias, it will override the other
                settings.
              </p>
            </div>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                fromNameForm.post(route('settings.from_name')!, { preserveScroll: true })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label for="from-name" class="block text-sm font-medium leading-6 text-white">
                    Global From Name
                  </label>
                  <div class="relative mt-2">
                    <input
                      value={fromNameForm.data.from_name}
                      onInput={e => fromNameForm.setData('from_name', e.currentTarget.value)}
                      type="text"
                      name="from_name"
                      id="from-name"
                      class={inputClass(!!fromNameForm.errors.from_name)}
                      placeholder="John Doe"
                      aria-invalid={fromNameForm.errors.from_name ? 'true' : undefined}
                      aria-describedby={
                        fromNameForm.errors.from_name ? 'from-name-error' : undefined
                      }
                    />
                  </div>
                  {fromNameForm.errors.from_name && (
                    <p class="mt-2 text-sm text-red-600" id="from-name-error">
                      {fromNameForm.errors.from_name}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={fromNameForm.processing}
                class={btnClass(fromNameForm.processing)}
              >
                Update Global From Name {fromNameForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Update Email Banner Location</h3>
            <p class="text-base text-grey-200">
              This is the information displayed in forwarded emails letting you know who the email
              was from and which alias it was sent to. You can choose for it to be displayed at the
              top or bottom of the email or just turn if off altogether.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                bannerLocationForm.post(route('settings.banner_location')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="banner-location"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Update Location
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="banner-location"
                      value={bannerLocationForm.data.banner_location}
                      onChange={e =>
                        bannerLocationForm.setData('banner_location', e.currentTarget.value)
                      }
                      name="banner_location"
                      required
                      class={selectClass(!!bannerLocationForm.errors.banner_location)}
                      aria-invalid={bannerLocationForm.errors.banner_location ? 'true' : undefined}
                      aria-describedby={
                        bannerLocationForm.errors.banner_location
                          ? 'banner-location-error'
                          : undefined
                      }
                    >
                      <option
                        value="top"
                        selected={props.bannerLocation === 'top'}
                        class="bg-surface"
                      >
                        Top
                      </option>
                      <option
                        value="bottom"
                        selected={props.bannerLocation === 'bottom'}
                        class="bg-surface"
                      >
                        Bottom
                      </option>
                      <option
                        value="off"
                        selected={props.bannerLocation === 'off'}
                        class="bg-surface"
                      >
                        Off
                      </option>
                    </select>
                  </div>
                  {bannerLocationForm.errors.banner_location && (
                    <p class="mt-2 text-sm text-red-600" id="banner-location-error">
                      {bannerLocationForm.errors.banner_location}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={bannerLocationForm.processing}
                class={btnClass(bannerLocationForm.processing)}
              >
                Update Banner Location {bannerLocationForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Spam / DMARC Warning</h3>
            <p class="text-base text-grey-200">
              When a forwarded email is flagged as spam or fails DMARC authentication, you can
              choose how you are notified: show a warning banner in the email body (default),
              prepend a warning tag to the subject line (e.g. [DMARC FAIL] or [SPAM]), or turn off
              the warning altogether.
            </p>
            <p class="text-base text-grey-200 !mt-4">
              <b>Please note</b> that turning the warning off completely may increase your risk of
              falling for <b>phishing or spoofed</b> emails. If unsure, always check the "
              <b>X-VovaMail-Authentication-Results</b>" header.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                spamWarningBehaviourForm.post(route('settings.spam_warning_behaviour')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="spam-warning-behaviour"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Warning behaviour
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="spam-warning-behaviour"
                      value={spamWarningBehaviourForm.data.spam_warning_behaviour}
                      onChange={e =>
                        spamWarningBehaviourForm.setData(
                          'spam_warning_behaviour',
                          e.currentTarget.value,
                        )
                      }
                      name="spam_warning_behaviour"
                      required
                      class={selectClass(!!spamWarningBehaviourForm.errors.spam_warning_behaviour)}
                      aria-invalid={
                        spamWarningBehaviourForm.errors.spam_warning_behaviour ? 'true' : undefined
                      }
                      aria-describedby={
                        spamWarningBehaviourForm.errors.spam_warning_behaviour
                          ? 'spam-warning-behaviour-error'
                          : undefined
                      }
                    >
                      <option
                        value="banner"
                        selected={props.spamWarningBehaviour === 'banner'}
                        class="bg-surface"
                      >
                        Show warning banner in email
                      </option>
                      <option
                        value="subject"
                        selected={props.spamWarningBehaviour === 'subject'}
                        class="bg-surface"
                      >
                        Prepend [SPAM] / [DMARC FAIL] to subject
                      </option>
                      <option
                        value="off"
                        selected={props.spamWarningBehaviour === 'off'}
                        class="bg-surface"
                      >
                        No warning
                      </option>
                    </select>
                  </div>
                  {spamWarningBehaviourForm.errors.spam_warning_behaviour && (
                    <p class="mt-2 text-sm text-red-600" id="spam-warning-behaviour-error">
                      {spamWarningBehaviourForm.errors.spam_warning_behaviour}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={spamWarningBehaviourForm.processing}
                class={btnClass(spamWarningBehaviourForm.processing)}
              >
                Update spam / DMARC warning {spamWarningBehaviourForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">List-Unsubscribe Behaviour</h3>
            <p class="text-base text-grey-200">
              Control how List-Unsubscribe and List-Unsubscribe-Post headers are set on forwarded
              emails. On email clients that support it, clicking on it will perform one of these
              actions.
            </p>
            <p class="text-base text-grey-200 !mt-4">
              Where an original List-Unsubscribe header is present and contains a mailto: email
              address, vovamail.xyz will rewrite it so that the email is sent from your alias and
              not your real email address.
            </p>
            <p class="text-base text-grey-200 !mt-4">
              One-click deactivate, delete, block sender email and block sender domain links in
              forwarded emails expire after 30 days for security.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                listUnsubscribeBehaviourForm.post(route('settings.list_unsubscribe_behaviour')!, {
                  preserveScroll: true,
                })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="list-unsubscribe-behaviour"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Behaviour
                  </label>
                  <div class="block relative w-full mt-2">
                    <select
                      id="list-unsubscribe-behaviour"
                      value={String(listUnsubscribeBehaviourForm.data.list_unsubscribe_behaviour)}
                      onChange={e =>
                        listUnsubscribeBehaviourForm.setData(
                          'list_unsubscribe_behaviour',
                          Number(e.currentTarget.value),
                        )
                      }
                      name="list_unsubscribe_behaviour"
                      required
                      class={selectClass(
                        !!listUnsubscribeBehaviourForm.errors.list_unsubscribe_behaviour,
                      )}
                      aria-invalid={
                        listUnsubscribeBehaviourForm.errors.list_unsubscribe_behaviour
                          ? 'true'
                          : undefined
                      }
                      aria-describedby={
                        listUnsubscribeBehaviourForm.errors.list_unsubscribe_behaviour
                          ? 'list-unsubscribe-behaviour-error'
                          : undefined
                      }
                    >
                      {listUnsubscribeBehaviourOptions.map(opt => (
                        <option
                          value={String(opt.value)}
                          selected={props.listUnsubscribeBehaviour === opt.value}
                          class="bg-surface"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {listUnsubscribeBehaviourForm.errors.list_unsubscribe_behaviour && (
                    <p class="mt-2 text-sm text-red-600" id="list-unsubscribe-behaviour-error">
                      {listUnsubscribeBehaviourForm.errors.list_unsubscribe_behaviour}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={listUnsubscribeBehaviourForm.processing}
                class={btnClass(listUnsubscribeBehaviourForm.processing)}
              >
                Update List-Unsubscribe behaviour{' '}
                {listUnsubscribeBehaviourForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>

        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Replace Email Subject</h3>
            <p class="text-base text-grey-200">
              This is useful if you are <b>using encryption</b>. After you add your public
              GPG/OpenPGP key for a recipient the body of forwarded emails will be encrypted (this
              includes email attachments). Unfortunately the email subject cannot be encrypted as it
              is one of the headers. To prevent revealing the contents of emails you can replace the
              subject with something generic below e.g. "The subject" or "Hello".
            </p>
            <p class="text-base text-grey-200 !mt-4">
              If set to empty then the email's original subject will be used.
            </p>
          </div>
          <div class="mt-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                emailSubjectForm.post(route('settings.email_subject')!, { preserveScroll: true })
              }}
            >
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label for="email-subject" class="block text-sm font-medium leading-6 text-white">
                    Email Subject
                  </label>
                  <div class="relative mt-2">
                    <input
                      value={emailSubjectForm.data.email_subject}
                      onInput={e =>
                        emailSubjectForm.setData('email_subject', e.currentTarget.value)
                      }
                      type="text"
                      name="email_subject"
                      id="email-subject"
                      class={inputClass(!!emailSubjectForm.errors.email_subject)}
                      placeholder="The subject"
                      aria-invalid={emailSubjectForm.errors.email_subject ? 'true' : undefined}
                      aria-describedby={
                        emailSubjectForm.errors.email_subject ? 'email-subject-error' : undefined
                      }
                    />
                  </div>
                  {emailSubjectForm.errors.email_subject && (
                    <p class="mt-2 text-sm text-red-600" id="email-subject-error">
                      {emailSubjectForm.errors.email_subject}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={emailSubjectForm.processing}
                class={btnClass(emailSubjectForm.processing)}
              >
                Update Email Subject {emailSubjectForm.processing && <Loader />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </SettingsLayout>
  )
}
