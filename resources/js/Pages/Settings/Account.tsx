import { createSignal } from 'solid-js'
import { Title } from '@solidjs/meta'
import { useForm } from '../../lib/inertia'
import SettingsLayout from '../../Layouts/SettingsLayout'
import Loader from '../../Components/Loader'
import Modal from '../../Components/Modal'

export default function AccountSettings() {
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = createSignal(false)

  const deleteAccountForm = useForm({
    password: '',
  })

  const confirmDeleteAccount = (e: Event) => {
    e.preventDefault()
    if (!deleteAccountForm.data.password) {
      deleteAccountForm.setError('password', 'The password field is required.')
    } else {
      setDeleteAccountModalOpen(true)
    }
  }

  const submitDeleteAccountForm = () => {
    deleteAccountForm.post(route('account.destroy')!, {
      preserveScroll: true,
      onSuccess: () => deleteAccountForm.reset(),
    })
    setDeleteAccountModalOpen(false)
  }

  return (
    <SettingsLayout>
      <Title>Account Settings</Title>
      <div class="divide-y divide-grey-200">
        <div class="py-10">
          <div class="space-y-1">
            <h3 class="text-lg font-medium leading-6 text-white">Danger Zone</h3>
            <p class="text-base text-grey-200">
              Once you delete your account, there is no going back.
              <b>This username will not be able to be used again</b>. Please make sure you are
              certain. Before deleting your account, please export any alias data or information
              that you wish to retain. For more information on what happens when you delete your
              account please see this{' '}
              <a
                href="https://vovamail.xyz/faq/#what-happens-when-i-delete-my-account"
                rel="nofollow noopener noreferrer"
                target="_blank"
                class="text-secondary cursor-pointer"
              >
                FAQ item
              </a>
              .
            </p>
          </div>
          <div class="mt-4">
            <form onSubmit={confirmDeleteAccount}>
              <div class="grid grid-cols-1 mb-6">
                <div>
                  <label
                    for="current-password-delete"
                    class="block text-sm font-medium leading-6 text-white"
                  >
                    Enter your password to confirm
                  </label>
                  <div class="relative mt-2">
                    <input
                      value={deleteAccountForm.data.password}
                      onInput={e => deleteAccountForm.setData('password', e.currentTarget.value)}
                      type="password"
                      name="password"
                      id="current-password-delete"
                      class="block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 bg-white/5 text-white"
                      classList={{
                        'ring-red-300 placeholder:text-red-300 focus:ring-red-500':
                          !!deleteAccountForm.errors.password,
                        'ring-grey-300 placeholder:text-grey-400 focus:ring-primary':
                          !deleteAccountForm.errors.password,
                      }}
                      placeholder="********"
                      aria-invalid={deleteAccountForm.errors.password ? 'true' : undefined}
                      aria-describedby={
                        deleteAccountForm.errors.password
                          ? 'current-password-delete-error'
                          : undefined
                      }
                    />
                  </div>
                  {deleteAccountForm.errors.password && (
                    <p class="mt-2 text-sm text-red-600" id="current-password-delete-error">
                      {deleteAccountForm.errors.password}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                class="text-white font-bold bg-red-500 hover:bg-red-600 w-full py-3 px-4 rounded"
              >
                Delete Account
              </button>
            </form>
          </div>
        </div>
      </div>

      <Modal
        open={deleteAccountModalOpen()}
        onOpenChange={setDeleteAccountModalOpen}
        title="Delete Account"
      >
        <p class="mt-4 text-grey-200">
          Are you sure you want to <b>permanently</b> delete your account and any aliases you've
          created?
        </p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={submitDeleteAccountForm}
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded disabled:cursor-not-allowed"
            disabled={deleteAccountForm.processing}
          >
            Delete Account
            {deleteAccountForm.processing && <Loader />}
          </button>
          <button
            onClick={() => setDeleteAccountModalOpen(false)}
            class="px-4 py-3 text-white font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </SettingsLayout>
  )
}
