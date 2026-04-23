import { Title } from '@solidjs/meta'
import { useForm, usePage } from '../../lib/inertia'
import SettingsLayout from '../../Layouts/SettingsLayout'
import Loader from '../../Components/Loader'

export default function DataSettings() {
  const page = usePage()

  const totalAliasesCount = () => (page.props as any).totalAliasesCount as number
  const domainsCount = () => (page.props as any).domainsCount as number

  const importAliasesForm = useForm({
    aliases_import: '' as any,
  })

  const clearForm = () => {
    importAliasesForm.reset()
    const el = document.getElementById('aliases-import') as HTMLInputElement
    if (el) el.value = ''
  }

  const handleImportSubmit = (e: Event) => {
    e.preventDefault()
    importAliasesForm.post(route('aliases.import')!, {
      preserveScroll: true,
      onSuccess: () => clearForm(),
    })
  }

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    importAliasesForm.setData('aliases_import', target.files?.[0] ?? '')
  }

  return (
    <SettingsLayout>
      <Title>Data Settings</Title>
      <div class="divide-y divide-grey-200">
        <div class="py-10">
          <div>
            <div class="mb-6 text-base text-grey-700 dark:text-grey-200">
              <h3 class="text-lg font-medium leading-6 text-grey-900 dark:text-white">
                Import Aliases
              </h3>

              <div class="mt-4 w-24 border-b-2 border-grey-200"></div>

              <p class="mt-6">
                You can import aliases for <b>your custom domains</b> by uploading a CSV file. Please
                note this is <b>only available for custom domains</b>.
              </p>

              <p class="mt-4">Aliases that <b>already exist</b> will not be imported.</p>
              <p class="mt-4">
                The import is <b>limited to 1,000 rows (aliases)</b>. Please ensure you use multiple
                CSV files if you need to import more than this.
              </p>
              <p class="mt-4">
                Please use the template file provided below. Only CSV files are supported.
              </p>
              <p class="mt-4">
                The import will take a few minutes. You will <b>receive an email</b> once it is
                complete.
              </p>
              <p class="mt-4">
                <a
                  href="/import-aliases-template.csv"
                  rel="nofollow noopener noreferrer"
                  class="text-secondary cursor-pointer dark:text-indigo-400"
                >
                  Click here to download the CSV import template
                </a>
              </p>
            </div>

            <form onSubmit={handleImportSubmit}>
              <div class="row">
                <input
                  type="file"
                  id="aliases-import"
                  onChange={handleFileChange}
                  required
                  disabled={!domainsCount()}
                />

                {importAliasesForm.errors.aliases_import && (
                  <p class="mt-2 text-sm text-red-600">{importAliasesForm.errors.aliases_import}</p>
                )}

                <div class="mt-4">
                  {!domainsCount() ? (
                    <div class="bg-primary block w-full text-center hover:bg-primary/90 text-white font-bold py-3 px-4 rounded cursor-not-allowed">
                      You don't have any custom domains
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={importAliasesForm.processing}
                      class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded w-full"
                    >
                      Import Alias Data
                      {importAliasesForm.processing && <Loader />}
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div class="my-6">
              <h3 class="text-lg font-medium leading-6 text-grey-900 dark:text-white">
                Export Aliases
              </h3>

              <div class="mt-4 w-24 border-b-2 border-grey-200"></div>

              {totalAliasesCount() ? (
                <p class="mt-6 text-base text-grey-700 dark:text-grey-200">
                  You can click the button below to export all the data for your{' '}
                  <b>{totalAliasesCount()}</b> aliases as a .csv file.
                </p>
              ) : (
                <p class="mt-6 text-base text-grey-700 dark:text-grey-200">
                  You don't have any aliases to export.
                </p>
              )}
            </div>

            {(page.props as any).errors?.aliases_export && (
              <p class="mt-2 text-sm text-red-600">{(page.props as any).errors.aliases_export}</p>
            )}
            {totalAliasesCount() ? (
              <a
                href={route('aliases.export')!}
                class="bg-primary block w-full text-center hover:bg-primary/90 text-white font-bold py-3 px-4 rounded"
              >
                Export Alias Data
              </a>
            ) : (
              <div class="bg-primary block w-full text-center hover:bg-primary/90 text-white font-bold py-3 px-4 rounded cursor-not-allowed">
                Export Alias Data
              </div>
            )}
          </div>
        </div>
      </div>
    </SettingsLayout>
  )
}
