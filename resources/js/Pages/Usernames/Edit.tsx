import { Title } from '@solidjs/meta'
import { createSignal, Show, createMemo } from 'solid-js'
import { usePage } from '../../lib/inertia'
import Toggle from '../../Components/Toggle'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import http from '../../lib/http'
import { filters } from '../../app'

const successMessage = (text = '') => {
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Success', text, type: 'success' } }),
  )
}
const errorMessage = (text = 'An error has occurred, please try again later') => {
  window.dispatchEvent(
    new CustomEvent('notify', { detail: { title: 'Error', text, type: 'error' } }),
  )
}

const clipboard = (str: string) => {
  navigator.clipboard.writeText(str).then(
    () => successMessage('Copied to clipboard'),
    () => errorMessage('Could not copy to clipboard'),
  )
}

const validLocalPart = (part: string) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))$/
  return re.test(part)
}

interface UsernameProps {
  initialUsername: {
    id: number
    username: string
    description: string | null
    from_name: string | null
    can_login: boolean
    auto_create_regex: string | null
    updated_at: string
  }
}

export default function EditUsername(props: UsernameProps) {
  const page = usePage()
  const defaultUsernameId = () => (page.props as any).user?.default_username_id
  const usesExternalAuthentication = () => (page.props as any).usesExternalAuthentication

  const u = () => props.initialUsername

  const [fromName, setFromName] = createSignal(u().from_name ?? '')
  const [fromNameLoading, setFromNameLoading] = createSignal(false)
  const [canLogin, setCanLogin] = createSignal(u().can_login)
  const [autoCreateRegex, setAutoCreateRegex] = createSignal(u().auto_create_regex ?? '')
  const [autoCreateRegexLoading, setAutoCreateRegexLoading] = createSignal(false)
  const [testLocalPart, setTestLocalPart] = createSignal('')
  const [testLoading, setTestLoading] = createSignal(false)
  const [testSuccess, setTestSuccess] = createSignal<boolean | null>(null)
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  const testInputClass = createMemo(() => {
    if (errors().test_auto_create_regex_local_part || testSuccess() === false) {
      return 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500'
    }
    if (testSuccess() === true) {
      return 'text-green-900 ring-green-300 placeholder:text-green-300 focus:ring-green-500'
    }
    return 'text-grey-900 ring-grey-300 placeholder:text-grey-400 focus:ring-primary'
  })

  const editFromName = () => {
    setErrors({})
    if (fromName() !== null && fromName().length > 50) {
      const msg = "'From Name' cannot be more than 50 characters"
      setErrors({ from_name: msg })
      errorMessage(msg)
      return
    }
    setFromNameLoading(true)
    http
      .patch(`/api/v1/usernames/${u().id}`, { from_name: fromName() })
      .then(() => {
        setFromNameLoading(false)
        successMessage("Username 'From Name' updated")
      })
      .catch(() => {
        setFromNameLoading(false)
        errorMessage()
      })
  }

  const allowLogin = () => {
    http
      .post('/api/v1/loginable-usernames', { id: u().id })
      .then(() => successMessage('Username allowed to login'))
      .catch(() => errorMessage())
  }

  const disallowLogin = () => {
    http
      .delete(`/api/v1/loginable-usernames/${u().id}`)
      .then(() => successMessage('Username disallowed to login'))
      .catch(() => errorMessage())
  }

  const editAutoCreateRegex = () => {
    setErrors({})
    if (autoCreateRegex() !== null && autoCreateRegex().length > 100) {
      const msg = "'Auto Create Regex' cannot be more than 100 characters"
      setErrors({ auto_create_regex: msg })
      errorMessage(msg)
      return
    }
    setAutoCreateRegexLoading(true)
    http
      .patch(`/api/v1/usernames/${u().id}`, { auto_create_regex: autoCreateRegex() })
      .then(() => {
        setAutoCreateRegexLoading(false)
        successMessage("Username 'Auto Create Regex' updated")
      })
      .catch((error: any) => {
        setAutoCreateRegexLoading(false)
        if (error.data?.message !== undefined) {
          setErrors({ auto_create_regex: error.data.message })
          errorMessage(error.data.message)
        } else {
          errorMessage()
        }
      })
  }

  const testAutoCreateRegex = () => {
    setTestSuccess(null)
    setErrors({})
    if (autoCreateRegex() === null || autoCreateRegex() === '') {
      setErrors({ test_auto_create_regex_local_part: 'You must first enter a regex pattern above' })
      return
    }
    if (testLocalPart() !== null && testLocalPart() !== '' && !validLocalPart(testLocalPart())) {
      const msg = "Invalid 'Alias Local Part'"
      setErrors({ test_auto_create_regex_local_part: msg })
      errorMessage(msg)
      return
    }
    setTestLoading(true)
    http
      .post('/test-auto-create-regex', {
        resource: 'username',
        local_part: testLocalPart(),
        id: u().id,
      })
      .then((data: any) => {
        setTestLoading(false)
        setTestSuccess(data.success ? true : false)
      })
      .catch((error: any) => {
        setTestLoading(false)
        if (error.data?.message !== undefined) {
          setErrors({ test_auto_create_regex_local_part: error.data.message })
          errorMessage(error.data.message)
        } else {
          errorMessage()
        }
      })
  }

  return (
    <div>
      <Title>Edit Username</Title>
      <h1 id="primary-heading" class="sr-only">
        Edit Username
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-white">Edit Username</h1>
          <p class="mt-2 text-sm text-grey-700 text-grey-200">Make changes to your username</p>
        </div>
      </div>

      <div class="bg-surface rounded-lg p-4">
        <div class="space-y-8 divide-y divide-grey-200 divide-border-subtle">
          <div>
            <div class="flex items-center">
              <h3
                class="text-xl font-medium leading-6 text-grey-900 cursor-pointer text-grey-100"
                onClick={() => clipboard(u().username)}
                title="Click to copy"
              >
                {u().username}
              </h3>
              <Show when={defaultUsernameId() === u().id}>
                <span
                  class="ml-2 py-1 px-2 text-xs bg-yellow-200 text-yellow-900 rounded-full"
                  title="This is your account's default username"
                >
                  default
                </span>
              </Show>
            </div>
            <Show when={u().description}>
              <div class="mt-2 text-sm text-grey-500 text-grey-300">{u().description}</div>
            </Show>
          </div>

          <div class="pt-8">
            <div class="block text-lg font-medium text-grey-700 text-grey-200">
              Username 'From Name'
            </div>
            <p class="mt-1 text-base text-grey-700 text-grey-200">
              The 'From Name' is shown when you send an email from an alias or reply anonymously to
              a forwarded email. If left blank, then the email alias itself will be used as the
              'From Name' e.g. "example@{u().username}.vovamail.xyz".
            </p>
            <div class="mt-2 text-base text-grey-700 text-grey-200">
              The 'From Name' that is used for an alias is determined by the following{' '}
              <b>priority</b>:
              <ul class="list-decimal list-inside text-grey-700 text-base mt-2 text-grey-200">
                <li>Alias 'From Name'</li>
                <li>
                  <b>Username</b> or Custom Domain <b>'From Name'</b>
                </li>
                <li>Global 'From Name' from the settings page</li>
              </ul>
            </div>
            <p class="mt-2 text-base text-grey-700 text-grey-200">
              If you set the 'From Name' for this username, it will override the global 'From Name'
              setting.
            </p>

            <div class="mb-6">
              <div class="mt-6 grid grid-cols-1 mb-4">
                <label for="from_name" class="block text-sm font-medium leading-6 text-white">
                  From Name
                </label>
                <div class="relative mt-2">
                  <input
                    type="text"
                    name="from_name"
                    id="from_name"
                    value={fromName()}
                    onInput={e => setFromName(e.currentTarget.value)}
                    class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 text-white bg-white/5 ${errors().from_name ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'text-grey-900 ring-grey-300 placeholder:text-grey-400 focus:ring-primary'}`}
                    placeholder="John Doe"
                  />
                  <Show when={errors().from_name}>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <Icon name="close-circle" class="h-5 w-5 text-red-500" />
                    </div>
                  </Show>
                </div>
                <Show when={errors().from_name}>
                  <p class="mt-2 text-sm text-red-600">{errors().from_name}</p>
                </Show>
              </div>
            </div>

            <button
              onClick={editFromName}
              disabled={fromNameLoading()}
              class="bg-primary hover:bg-primary/90 text-grey-950 font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
            >
              Update From Name
              <Show when={fromNameLoading()}>
                <Loader />
              </Show>
            </button>
          </div>

          <Show when={!usesExternalAuthentication()}>
            <div class="pt-8">
              <label class="block font-medium text-grey-700 text-grey-200 text-lg pointer-events-none cursor-default">
                Can Be Used To Login
              </label>
              <p class="mt-1 text-base text-grey-700 text-grey-200">
                Toggle this option to determine whether this username can be used to login to your
                account or not. When set to off you will not be able to use this username to login
                to your account.
              </p>
              <Show
                when={defaultUsernameId() !== u().id}
                fallback={
                  <Toggle
                    id="can_login"
                    class="mt-4"
                    checked={canLogin()}
                    onChange={() => {}}
                    disabled
                    title="You cannot disallow login for your default username"
                  />
                }
              >
                <Toggle
                  id="can_login"
                  class="mt-4"
                  checked={canLogin()}
                  onChange={checked => {
                    setCanLogin(checked)
                    if (checked) allowLogin()
                    else disallowLogin()
                  }}
                />
              </Show>
            </div>
          </Show>

          <div class="pt-8">
            <div class="block text-lg font-medium text-grey-700 text-grey-200">
              Alias Auto Create Regex
            </div>
            <p class="mt-1 text-base text-grey-700 text-grey-200">
              If you wish to create aliases on-the-fly but don't want to enable catch-all then you
              can enter a regular expression pattern below. If a new alias' local part matches the
              pattern then it will still be created on-the-fly even though catch-all is disabled.
            </p>
            <p class="mt-2 text-base text-grey-700 text-grey-200">
              Note: <b>Catch-All must be disabled</b> to use alias automatic creation with regex.
            </p>
            <p class="mt-2 text-base text-grey-700 text-grey-200">
              For example, if you only want aliases that start with "prefix" to be automatically
              created, use the regex{' '}
              <span class="bg-primary/30 px-1 rounded-md text-black">^prefix</span>
            </p>
            <p class="mt-2 text-base text-grey-700 text-grey-200">
              If you only want aliases that end with "suffix" to be automatically created, use the
              regex <span class="bg-primary/30 px-1 rounded-md text-black">suffix$</span>
            </p>
            <p class="mt-2 text-base text-grey-700 text-grey-200">
              If you want to make sure the local part is fully matched you can start your regex with
              <span class="bg-primary/30 px-1 rounded-md text-black">^</span> and end it with
              <span class="bg-primary/30 px-1 rounded-md text-black">$</span> e.g.
              <span class="bg-primary/30 px-1 rounded-md text-black">^prefix.*suffix$</span>
              which would match "prefix-anything-here-suffix"
            </p>
            <p class="mt-2 text-base text-grey-700 text-grey-200">
              You can use{' '}
              <a
                href="https://regex101.com/"
                class="text-primary"
                target="_blank"
                rel="nofollow noreferrer noopener"
              >
                regex101.com
              </a>{' '}
              to help you write your regular expressions.
            </p>

            <div class="mb-6">
              <div class="mt-6 grid grid-cols-1 mb-4">
                <label
                  for="auto_create_regex"
                  class="block text-sm font-medium leading-6 text-white"
                >
                  Auto Create Regex
                </label>
                <div class="relative mt-2">
                  <input
                    type="text"
                    name="auto_create_regex"
                    id="auto_create_regex"
                    value={autoCreateRegex()}
                    onInput={e => setAutoCreateRegex(e.currentTarget.value)}
                    class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 text-white bg-white/5 ${errors().auto_create_regex ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'text-grey-900 ring-grey-300 placeholder:text-grey-400 focus:ring-primary'}`}
                    placeholder="^prefix"
                  />
                  <Show when={errors().auto_create_regex}>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <Icon name="close-circle" class="h-5 w-5 text-red-500" />
                    </div>
                  </Show>
                </div>
                <Show when={errors().auto_create_regex}>
                  <p class="mt-2 text-sm text-red-600">{errors().auto_create_regex}</p>
                </Show>
              </div>
            </div>

            <button
              onClick={editAutoCreateRegex}
              disabled={autoCreateRegexLoading()}
              class="bg-primary hover:bg-primary/90 text-grey-950 font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
            >
              Update Auto Create Regex
              <Show when={autoCreateRegexLoading()}>
                <Loader />
              </Show>
            </button>

            <div class="block text-lg font-medium text-grey-700 pt-8 text-grey-200">
              Test Alias Auto Create Regex
            </div>
            <p class="mt-1 text-base text-grey-700 text-grey-200">
              You can test whether an alias local part will match the above regex pattern and be
              automatically created by entering the local part (left of @ symbol) below.
            </p>
            <p class="mt-2 text-base text-grey-700 text-grey-200">
              No aliases will be created when testing.
            </p>
            <div class="mb-6">
              <div class="mt-6 grid grid-cols-1 mb-4">
                <label
                  for="test_auto_create_regex_local_part"
                  class="block text-sm font-medium leading-6 text-white"
                >
                  Alias Local Part
                </label>
                <div class="mt-2">
                  <div class="flex">
                    <div class="relative w-full">
                      <input
                        type="text"
                        name="test_auto_create_regex_local_part"
                        id="test_auto_create_regex_local_part"
                        value={testLocalPart()}
                        onInput={e => setTestLocalPart(e.currentTarget.value)}
                        class={`block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-2 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 text-white bg-white/5 ${testInputClass()}`}
                        placeholder="local-part"
                      />
                      <Show
                        when={errors().test_auto_create_regex_local_part || testSuccess() === false}
                      >
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <Icon name="close-circle" class="h-5 w-5 text-red-500" />
                        </div>
                      </Show>
                      <Show when={testSuccess() === true}>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <Icon name="check-circle" class="h-5 w-5 text-green-500" />
                        </div>
                      </Show>
                    </div>
                    <span class="inline-flex items-center rounded-r-md border border-l-0 border-grey-300 px-3 text-grey-500 sm:text-sm text-grey-300">
                      @{u().username}.vovamail.xyz
                    </span>
                  </div>
                </div>
                <Show when={errors().test_auto_create_regex_local_part}>
                  <p class="mt-2 text-sm text-red-600">
                    {errors().test_auto_create_regex_local_part}
                  </p>
                </Show>
                <Show when={testSuccess() === false}>
                  <p class="mt-2 text-sm text-red-600">
                    The alias local part does not match the regular expression and would not be
                    created
                  </p>
                </Show>
                <Show when={testSuccess() === true}>
                  <p class="mt-2 text-sm text-green-600">
                    The alias local part matches the regular expression and would be created
                  </p>
                </Show>
              </div>
            </div>

            <button
              onClick={testAutoCreateRegex}
              disabled={testLoading()}
              class="bg-primary hover:bg-primary/90 text-grey-950 font-bold py-3 px-4 rounded w-full disabled:cursor-not-allowed"
            >
              Test Auto Create Regex
              <Show when={testLoading()}>
                <Loader />
              </Show>
            </button>
          </div>

          <div class="pt-5">
            <span
              class="mt-2 text-sm text-grey-500 text-grey-300"
              title={filters.formatDate(u().updated_at)}
            >
              Last updated {filters.timeAgo(u().updated_at)}.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
