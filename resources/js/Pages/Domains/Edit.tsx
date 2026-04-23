import { Title } from '@solidjs/meta'
import { createSignal, Show, createMemo } from 'solid-js'
import { usePage } from '../../lib/inertia'
import Toggle from '../../Components/Toggle'
import Loader from '../../Components/Loader'
import Icon from '../../Components/Icon'
import http from '../../lib/http'
import { filters } from '../../app'

const successMessage = (text = '') => {
  window.dispatchEvent(new CustomEvent('notify', { detail: { title: 'Success', text, type: 'success' } }))
}
const errorMessage = (text = 'An error has occurred, please try again later') => {
  window.dispatchEvent(new CustomEvent('notify', { detail: { title: 'Error', text, type: 'error' } }))
}

const clipboard = (str: string) => {
  navigator.clipboard.writeText(str).then(
    () => successMessage('Copied to clipboard'),
    () => errorMessage('Could not copy to clipboard')
  )
}

const validLocalPart = (part: string) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))$/
  return re.test(part)
}

interface DomainProps {
  initialDomain: {
    id: number
    domain: string
    description: string | null
    from_name: string | null
    domain_sending_verified_at: string | null
    domain_mx_validated_at: string | null
    auto_create_regex: string | null
    updated_at: string
  }
}

export default function EditDomain(props: DomainProps) {
  const d = () => props.initialDomain

  const [fromName, setFromName] = createSignal(d().from_name ?? '')
  const [fromNameLoading, setFromNameLoading] = createSignal(false)
  const [autoCreateRegex, setAutoCreateRegex] = createSignal(d().auto_create_regex ?? '')
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
    http.patch(`/api/v1/domains/${d().id}`, { from_name: fromName() })
      .then(() => {
        setFromNameLoading(false)
        successMessage("Domain 'From Name' updated")
      })
      .catch(() => {
        setFromNameLoading(false)
        errorMessage()
      })
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
    http.patch(`/api/v1/domains/${d().id}`, { auto_create_regex: autoCreateRegex() })
      .then(() => {
        setAutoCreateRegexLoading(false)
        successMessage("Domain 'Auto Create Regex' updated")
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
    http.post('/test-auto-create-regex', {
      resource: 'domain',
      local_part: testLocalPart(),
      id: d().id,
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
      <Title>Edit Domain</Title>
      <h1 id="primary-heading" class="sr-only">Edit Domain</h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-grey-900 dark:text-white">Edit Domain</h1>
          <p class="mt-2 text-sm text-grey-700 dark:text-grey-200">Make changes to your Domain</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 dark:bg-grey-900">
        <div class="space-y-8 divide-y divide-grey-200 dark:divide-grey-400">
          <div>
            <div class="flex items-center">
              <h3
                class="text-xl font-medium leading-6 text-grey-900 cursor-pointer dark:text-grey-100"
                onClick={() => clipboard(d().domain)}
                title="Click to copy"
              >
                {d().domain}
              </h3>
              <Show when={d().domain_sending_verified_at || d().domain_mx_validated_at}>
                <div class="ml-2">
                  <Show when={d().domain_sending_verified_at && d().domain_mx_validated_at}>
                    <svg class="h-5 w-5 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-label="Domain fully verified">
                      <g fill="none" fill-rule="evenodd">
                        <circle class="text-green-100 fill-current" cx="10" cy="10" r="10" />
                        <polyline class="text-green-800 stroke-current" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="6 10 8.667 12.667 14 7.333" />
                      </g>
                    </svg>
                  </Show>
                  <Show when={d().domain_sending_verified_at && !d().domain_mx_validated_at}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-5 w-5 inline-block" aria-label="MX records invalid">
                      <g fill="none" fill-rule="evenodd">
                        <circle cx="10" cy="10" r="10" fill="#FF9B9B" />
                        <polyline stroke="#AB091E" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="14 6 6 14" />
                        <polyline stroke="#AB091E" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="6 6 14 14" />
                      </g>
                    </svg>
                  </Show>
                  <Show when={d().domain_mx_validated_at && !d().domain_sending_verified_at}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-5 w-5 inline-block" aria-label="DNS records for sending invalid">
                      <g fill="none" fill-rule="evenodd">
                        <circle cx="10" cy="10" r="10" fill="#FF9B9B" />
                        <polyline stroke="#AB091E" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="14 6 6 14" />
                        <polyline stroke="#AB091E" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" points="6 6 14 14" />
                      </g>
                    </svg>
                  </Show>
                </div>
              </Show>
            </div>
            <Show when={d().description}>
              <div class="mt-2 text-sm text-grey-500 dark:text-grey-300">{d().description}</div>
            </Show>
          </div>

          <div class="pt-8">
            <div class="block text-lg font-medium text-grey-700 dark:text-grey-200">
              Domain 'From Name'
            </div>
            <p class="mt-1 text-base text-grey-700 dark:text-grey-200">
              The 'From Name' is shown when you send an email from an alias or reply anonymously to a
              forwarded email. If left blank, then the email alias itself will be used as the 'From
              Name' e.g. "example@{d().domain}".
            </p>
            <div class="mt-2 text-base text-grey-700 dark:text-grey-200">
              The 'From Name' that is used for an alias is determined by the following <b>priority</b>:
              <ul class="list-decimal list-inside text-grey-700 text-base mt-2 dark:text-grey-200">
                <li>Alias 'From Name'</li>
                <li>Username or <b>Custom Domain 'From Name'</b></li>
                <li>Global 'From Name' from the settings page</li>
              </ul>
            </div>
            <p class="mt-2 text-base text-grey-700 dark:text-grey-200">
              If you set the 'From Name' for this domain, it will override the global 'From Name' setting.
            </p>

            <div class="mb-6">
              <div class="mt-6 grid grid-cols-1 mb-4">
                <label for="from_name" class="block text-sm font-medium leading-6 text-grey-900 dark:text-white">From Name</label>
                <div class="relative mt-2">
                  <input
                    type="text"
                    name="from_name"
                    id="from_name"
                    value={fromName()}
                    onInput={(e) => setFromName(e.currentTarget.value)}
                    class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 dark:bg-white/5 dark:text-white ${errors().from_name ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'text-grey-900 ring-grey-300 placeholder:text-grey-400 focus:ring-primary'}`}
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

          <div class="pt-8">
            <div class="block text-lg font-medium text-grey-700 dark:text-grey-200">
              Alias Auto Create Regex
            </div>
            <p class="mt-1 text-base text-grey-700 dark:text-grey-200">
              If you wish to create aliases on-the-fly but don't want to enable catch-all then you can
              enter a regular expression pattern below. If a new alias' local part matches the pattern
              then it will still be created on-the-fly even though catch-all is disabled.
            </p>
            <p class="mt-2 text-base text-grey-700 dark:text-grey-200">
              Note: <b>Catch-All must be disabled</b> to use alias automatic creation with regex.
            </p>
            <p class="mt-2 text-base text-grey-700 dark:text-grey-200">
              For example, if you only want aliases that start with "prefix" to be automatically
              created, use the regex <span class="bg-primary/30 px-1 rounded-md dark:text-grey-900">^prefix</span>
            </p>
            <p class="mt-2 text-base text-grey-700 dark:text-grey-200">
              If you only want aliases that end with "suffix" to be automatically created, use the
              regex <span class="bg-primary/30 px-1 rounded-md dark:text-grey-900">suffix$</span>
            </p>
            <p class="mt-2 text-base text-grey-700 dark:text-grey-200">
              If you want to make sure the local part is fully matched you can start your regex with
              <span class="bg-primary/30 px-1 rounded-md dark:text-grey-900">^</span> and end it with
              <span class="bg-primary/30 px-1 rounded-md dark:text-grey-900">$</span> e.g.
              <span class="bg-primary/30 px-1 rounded-md dark:text-grey-900">^prefix.*suffix$</span>
              which would match "prefix-anything-here-suffix"
            </p>
            <p class="mt-2 text-base text-grey-700 dark:text-grey-200">
              You can use <a href="https://regex101.com/" class="text-primary" target="_blank" rel="nofollow noreferrer noopener">regex101.com</a> to help you write your regular expressions.
            </p>

            <div class="mb-6">
              <div class="mt-6 grid grid-cols-1 mb-4">
                <label for="auto_create_regex" class="block text-sm font-medium leading-6 text-grey-900 dark:text-white">Auto Create Regex</label>
                <div class="relative mt-2">
                  <input
                    type="text"
                    name="auto_create_regex"
                    id="auto_create_regex"
                    value={autoCreateRegex()}
                    onInput={(e) => setAutoCreateRegex(e.currentTarget.value)}
                    class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 dark:bg-white/5 dark:text-white ${errors().auto_create_regex ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'text-grey-900 ring-grey-300 placeholder:text-grey-400 focus:ring-primary'}`}
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

            <div class="block text-lg font-medium text-grey-700 pt-8 dark:text-grey-200">
              Test Alias Auto Create Regex
            </div>
            <p class="mt-1 text-base text-grey-700 dark:text-grey-200">
              You can test whether an alias local part will match the above regex pattern and be
              automatically created by entering the local part (left of @ symbol) below.
            </p>
            <p class="mt-2 text-base text-grey-700 dark:text-grey-200">
              No aliases will be created when testing.
            </p>
            <div class="mb-6">
              <div class="mt-6 grid grid-cols-1 mb-4">
                <label for="test_auto_create_regex_local_part" class="block text-sm font-medium leading-6 text-grey-900 dark:text-white">Alias Local Part</label>
                <div class="mt-2">
                  <div class="flex">
                    <div class="relative w-full">
                      <input
                        type="text"
                        name="test_auto_create_regex_local_part"
                        id="test_auto_create_regex_local_part"
                        value={testLocalPart()}
                        onInput={(e) => setTestLocalPart(e.currentTarget.value)}
                        class={`block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-2 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 dark:bg-white/5 dark:text-white ${testInputClass()}`}
                        placeholder="local-part"
                      />
                      <Show when={errors().test_auto_create_regex_local_part || testSuccess() === false}>
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
                    <span class="inline-flex items-center rounded-r-md border border-l-0 border-grey-300 px-3 text-grey-500 sm:text-sm dark:text-grey-300">@{d().domain}</span>
                  </div>
                </div>
                <Show when={errors().test_auto_create_regex_local_part}>
                  <p class="mt-2 text-sm text-red-600">{errors().test_auto_create_regex_local_part}</p>
                </Show>
                <Show when={testSuccess() === false}>
                  <p class="mt-2 text-sm text-red-600">The alias local part does not match the regular expression and would not be created</p>
                </Show>
                <Show when={testSuccess() === true}>
                  <p class="mt-2 text-sm text-green-600">The alias local part matches the regular expression and would be created</p>
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
            <span class="mt-2 text-sm text-grey-500 dark:text-grey-300" title={filters.formatDate(d().updated_at)}>
              Last updated {filters.timeAgo(d().updated_at)}.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
