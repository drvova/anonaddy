import { Title } from '@solidjs/meta'
import { createSignal, Show, For, createMemo } from 'solid-js'
import { usePage, Link } from '../lib/inertia'
import http from '../lib/http'
import Modal from '../Components/Modal'
import Loader from '../Components/Loader'
import Toggle from '../Components/Toggle'
import Icon from '../Components/Icon'
import { filters } from '../app'
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  closestCenter,
} from '@thisbeyond/solid-dnd'

interface RuleCondition {
  type: string
  match: string
  values: string[]
  currentConditionValue?: string
}

interface RuleAction {
  type: string
  value: any
}

interface Rule {
  id: string
  name: string
  operator: string
  conditions: RuleCondition[]
  actions: RuleAction[]
  active: boolean
  applied: number
  last_applied: string | null
  created_at: string
  forwards: boolean
  replies: boolean
  sends: boolean
  order: number
}

interface RecipientOption {
  id: string
  email: string
}

interface RulesProps {
  initialRows: Rule[]
  recipientOptions: RecipientOption[]
  search: string | null
}

const conditionTypeOptions = [
  { value: 'select', label: 'Select' },
  { value: 'sender', label: 'sender email' },
  { value: 'subject', label: 'subject' },
  { value: 'alias', label: 'alias email' },
  { value: 'alias_description', label: 'alias description' },
]

const actionTypeOptions = [
  { value: 'select', label: 'Select' },
  { value: 'subject', label: 'replace the subject with' },
  { value: 'displayFrom', label: 'replace the "from name" with' },
  { value: 'encryption', label: 'turn PGP encryption off' },
  { value: 'banner', label: 'set the banner information location to' },
  { value: 'block', label: 'block the email' },
  { value: 'removeAttachments', label: 'remove attachments' },
  { value: 'forwardTo', label: 'forward to' },
]

const indexToHuman: Record<number, string> = {
  0: 'first',
  1: 'second',
  2: 'third',
  3: 'forth',
  4: 'fifth',
}

const conditionMatchOptions = (conditions: RuleCondition[], key: number): string[] => {
  const type = conditions[key]?.type
  if (['sender', 'subject', 'alias', 'alias_description'].includes(type)) {
    return [
      'contains',
      'does not contain',
      'is exactly',
      'is not',
      'starts with',
      'does not start with',
      'ends with',
      'does not end with',
      'matches regex',
      'does not match regex',
    ]
  }
  return []
}

const emptyRuleObject = (): Omit<
  Rule,
  'id' | 'active' | 'applied' | 'last_applied' | 'created_at' | 'order'
> => ({
  name: '',
  conditions: [{ type: 'select', match: 'contains', values: [] }],
  actions: [{ type: 'select', value: '' }],
  operator: 'AND',
  forwards: false,
  replies: false,
  sends: false,
})

function SortableRow(props: {
  rule: Rule
  onEdit: (rule: Rule) => void
  onDelete: (id: string) => void
  onActivate: (id: string) => void
  onDeactivate: (id: string) => void
}) {
  const sortable = createSortable(props.rule.id)

  return (
    <tr
      ref={sortable.ref}
      class={`border-b border-grey-100 h-20 border-border-subtle ${sortable.isActiveDraggable ? 'opacity-50 bg-cyan-50 bg-surface' : ''}`}
      {...sortable.dragActivators}
    >
      <td class="p-3">
        <Icon name="menu" class="handle block w-6 h-6 text-grey-300 fill-current cursor-pointer" />
      </td>
      <td class="p-3">
        <span
          class="cursor-default text-sm text-grey-500 text-grey-300"
          title={filters.formatDate(props.rule.created_at)}
        >
          {filters.timeAgo(props.rule.created_at)}
        </span>
      </td>
      <td class="p-3">
        <span class="font-medium text-grey-700 text-grey-200">{props.rule.name}</span>
      </td>
      <td class="p-3">
        <Toggle
          checked={props.rule.active}
          onChange={(checked: boolean) => {
            if (checked) {
              props.onActivate(props.rule.id)
            } else {
              props.onDeactivate(props.rule.id)
            }
          }}
        />
      </td>
      <td class="p-3">
        <Show
          when={props.rule.last_applied}
          fallback={<span class="text-grey-300">{props.rule.applied.toLocaleString()} </span>}
        >
          <span
            class="cursor-default font-semibold text-secondary text-indigo-400"
            title={`${filters.timeAgo(props.rule.last_applied!)} (${filters.formatDate(props.rule.last_applied!)})`}
          >
            {props.rule.applied.toLocaleString()}
          </span>
        </Show>
      </td>
      <td class="p-3 text-right w-0 min-w-fit whitespace-nowrap">
        <button
          type="button"
          class="text-secondary hover:text-secondary/80 text-indigo-400 hover:text-indigo-300 font-medium"
          onClick={() => props.onEdit(props.rule)}
        >
          Edit
        </button>
        <button
          type="button"
          class="text-secondary hover:text-secondary/80 text-indigo-400 hover:text-indigo-300 font-medium ml-4"
          onClick={() => props.onDelete(props.rule.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

function RuleForm(props: {
  ruleObject: any
  setRuleObject: (updater: (prev: any) => any) => void
  errors: Record<string, string>
  recipientOptions: RecipientOption[]
  recipientDropdownOpen: () => Record<number, boolean>
  setRecipientDropdownOpen: (
    updater: (prev: Record<number, boolean>) => Record<number, boolean>,
  ) => void
  toggleRecipient: (actionKey: number, recipientId: string) => void
}) {
  const rule = () => props.ruleObject

  const updateCondition = (key: number, field: string, value: any) => {
    props.setRuleObject((prev: any) => {
      const conditions = [...prev.conditions]
      conditions[key] = { ...conditions[key], [field]: value }
      return { ...prev, conditions }
    })
  }

  const updateAction = (key: number, field: string, value: any) => {
    props.setRuleObject((prev: any) => {
      const actions = [...prev.actions]
      actions[key] = { ...actions[key], [field]: value }
      return { ...prev, actions }
    })
  }

  const addCondition = () => {
    if (rule().conditions.length >= 5) return
    props.setRuleObject((prev: any) => ({
      ...prev,
      conditions: [...prev.conditions, { type: 'select', match: 'contains', values: [] }],
    }))
  }

  const deleteCondition = (key: number) => {
    props.setRuleObject((prev: any) => ({
      ...prev,
      conditions: prev.conditions.filter((_: any, i: number) => i !== key),
    }))
  }

  const addAction = () => {
    if (rule().actions.length >= 5) return
    props.setRuleObject((prev: any) => ({
      ...prev,
      actions: [...prev.actions, { type: 'select', value: '' }],
    }))
  }

  const deleteAction = (key: number) => {
    props.setRuleObject((prev: any) => ({
      ...prev,
      actions: prev.actions.filter((_: any, i: number) => i !== key),
    }))
  }

  const addValueToCondition = (key: number) => {
    const condition = rule().conditions[key]
    if (!condition.currentConditionValue) {
      return
    }
    if (condition.values.length >= 50) return
    if (['matches regex', 'does not match regex'].includes(condition.match)) {
      try {
        new RegExp(condition.currentConditionValue).test('')
      } catch {
        return
      }
    }
    props.setRuleObject((prev: any) => {
      const conditions = [...prev.conditions]
      conditions[key] = {
        ...conditions[key],
        values: [...conditions[key].values, conditions[key].currentConditionValue],
        currentConditionValue: '',
      }
      return { ...prev, conditions }
    })
  }

  const removeConditionValue = (condKey: number, valIndex: number) => {
    props.setRuleObject((prev: any) => {
      const conditions = [...prev.conditions]
      const vals = [...conditions[condKey].values]
      vals.splice(valIndex, 1)
      conditions[condKey] = { ...conditions[condKey], values: vals }
      return { ...prev, conditions }
    })
  }

  const ruleActionChange = (key: number, actionType: string) => {
    let value: any = ''
    if (actionType === 'subject' || actionType === 'displayFrom' || actionType === 'select') {
      value = ''
    } else if (actionType === 'encryption') {
      value = false
    } else if (actionType === 'banner') {
      value = 'top'
    } else if (actionType === 'block') {
      value = true
    } else if (actionType === 'removeAttachments') {
      value = true
    } else if (actionType === 'forwardTo') {
      value = ''
    }
    updateAction(key, 'value', value)
  }

  return (
    <>
      <label
        for="rule_name"
        class="block font-medium leading-6 text-grey-600 text-sm my-2 text-white"
      >
        Name
      </label>
      <Show when={props.errors.ruleName}>
        <p class="mb-3 text-red-500 text-sm">{props.errors.ruleName}</p>
      </Show>
      <input
        value={rule().name}
        onInput={e =>
          props.setRuleObject((prev: any) => ({ ...prev, name: e.currentTarget.value }))
        }
        id="rule_name"
        type="text"
        class={`block w-full rounded-md border-0 py-2 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-base sm:leading-6 text-white bg-white/5 ${
          props.errors.ruleName ? 'ring-red-500' : ''
        }`}
        placeholder="Enter name"
      />

      <fieldset class="border border-primary p-4 my-4 rounded-sm">
        <legend class="px-2 leading-none text-sm text-white">Conditions</legend>

        <For each={rule().conditions}>
          {(condition, key) => (
            <div>
              <Show when={key() !== 0}>
                <div class="flex justify-center my-2">
                  <select
                    value={rule().operator}
                    onChange={e =>
                      props.setRuleObject((prev: any) => ({
                        ...prev,
                        operator: e.currentTarget.value,
                      }))
                    }
                    class="block appearance-none w-full text-grey-700 text-white bg-white/5 p-2 pr-8 rounded focus:ring"
                  >
                    <option value="AND" class="bg-surface">
                      AND
                    </option>
                    <option value="OR" class="bg-surface">
                      OR
                    </option>
                  </select>
                </div>
              </Show>

              <div class="p-2 w-full bg-grey-100 bg-surface">
                <div class="flex">
                  <div class="w-full flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
                    <span class="text-nowrap text-grey-200">If the</span>
                    <span class="sm:ml-2">
                      <select
                        value={condition.type}
                        onChange={e => updateCondition(key(), 'type', e.currentTarget.value)}
                        class="block appearance-none w-full sm:w-32 text-grey-700 text-white bg-white/5 p-2 pr-8 rounded focus:ring"
                      >
                        <For each={conditionTypeOptions}>
                          {opt => (
                            <option value={opt.value} class="bg-surface">
                              {opt.label}
                            </option>
                          )}
                        </For>
                      </select>
                    </span>

                    <Show when={conditionMatchOptions(rule().conditions, key()).length > 0}>
                      <span class="sm:ml-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0">
                        <div class="relative sm:mr-4">
                          <select
                            value={condition.match}
                            onChange={e => {
                              updateCondition(key(), 'match', e.currentTarget.value)
                            }}
                            class="block appearance-none w-full sm:w-40 text-grey-700 text-white bg-white/5 p-2 pr-8 rounded focus:ring"
                          >
                            <For each={conditionMatchOptions(rule().conditions, key())}>
                              {opt => (
                                <option value={opt} class="bg-surface">
                                  {opt}
                                </option>
                              )}
                            </For>
                          </select>
                        </div>

                        <div class="flex">
                          <input
                            value={condition.currentConditionValue || ''}
                            onInput={e =>
                              updateCondition(key(), 'currentConditionValue', e.currentTarget.value)
                            }
                            onKeyPress={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addValueToCondition(key())
                              }
                            }}
                            type="text"
                            class={`w-full appearance-none bg-surface border border-transparent rounded-l text-grey-700 focus:outline-none p-2 text-white bg-white/5 ${
                              props.errors.ruleConditions ? 'border-red-500' : ''
                            }`}
                            placeholder="Enter value"
                          />
                          <button
                            type="button"
                            onClick={() => addValueToCondition(key())}
                            class="p-2 bg-surface rounded-r text-grey-100 hover:bg-white/5 border-border-subtle"
                          >
                            Insert
                          </button>
                        </div>
                      </span>
                    </Show>
                  </div>
                  <div class="flex items-center">
                    <Show when={rule().conditions.length > 1}>
                      <span
                        class="block ml-4 w-6 h-6 text-grey-300 fill-current cursor-pointer"
                        onClick={() => deleteCondition(key())}
                      >
                        <Icon name="trash" class="w-6 h-6" />
                      </span>
                    </Show>
                  </div>
                </div>
                <div class="mt-2 text-left">
                  <For each={condition.values}>
                    {(value, index) => (
                      <>
                        <span
                          class="bg-green-200 text-sm font-semibold rounded-sm pl-1 text-nowrap cursor-pointer"
                          onClick={() => removeConditionValue(key(), index())}
                        >
                          {value}
                          <Icon
                            name="close"
                            class="inline-block w-4 h-4 text-grey-900 fill-current"
                          />
                        </span>
                        <Show when={index() + 1 !== condition.values.length}>
                          <span class="mx-1">or</span>
                        </Show>
                      </>
                    )}
                  </For>
                </div>
              </div>
            </div>
          )}
        </For>
        <button
          type="button"
          onClick={addCondition}
          class="mt-4 p-2 text-grey-100 bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Add condition
        </button>

        <Show when={props.errors.ruleConditions}>
          <p class="mt-2 text-red-500 text-sm">{props.errors.ruleConditions}</p>
        </Show>
      </fieldset>

      <fieldset class="border border-primary p-4 my-4 rounded-sm">
        <legend class="px-2 leading-none text-sm text-white">Actions</legend>

        <For each={rule().actions}>
          {(action, key) => (
            <div>
              <Show when={key() !== 0}>
                <div class="flex justify-center my-2">
                  <div class="relative text-grey-200">AND</div>
                </div>
              </Show>

              <div class="p-2 w-full bg-grey-100 bg-surface">
                <div class="flex">
                  <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:items-center w-full">
                    <span class="text-grey-200">Then</span>
                    <span class="sm:ml-2">
                      <select
                        value={action.type}
                        onChange={e => {
                          ruleActionChange(key(), e.currentTarget.value)
                          updateAction(key(), 'type', e.currentTarget.value)
                        }}
                        class="w-full block appearance-none text-grey-700 text-white bg-white/5 p-2 pr-8 rounded focus:ring"
                      >
                        <For each={actionTypeOptions}>
                          {opt => (
                            <option value={opt.value} class="bg-surface">
                              {opt.label}
                            </option>
                          )}
                        </For>
                      </select>
                    </span>

                    <Show when={action.type === 'subject' || action.type === 'displayFrom'}>
                      <span class="sm:ml-4 flex flex-col w-full">
                        <div class="flex w-full">
                          <input
                            value={action.value || ''}
                            onInput={e => updateAction(key(), 'value', e.currentTarget.value)}
                            type="text"
                            class={`w-full appearance-none bg-surface border border-transparent rounded text-grey-700 focus:outline-none p-2 text-white bg-white/5 ${
                              props.errors.ruleActions ? 'border-red-500' : ''
                            }`}
                            placeholder={
                              action.type === 'subject' ? 'e.g. [Fwd] {{subject}}' : 'Enter value'
                            }
                          />
                        </div>
                        <Show when={action.type === 'subject'}>
                          <p class="mt-1.5 text-xs text-grey-500 text-grey-300">
                            Use{' '}
                            <code class="px-1 py-0.5 rounded bg-grey-100 bg-surface font-mono text-grey-700 text-grey-200">
                              {'{{subject}}'}
                            </code>{' '}
                            placeholder to include the original subject (e.g. to prepend or append
                            text).
                          </p>
                        </Show>
                      </span>
                    </Show>

                    <Show when={action.type === 'forwardTo'}>
                      <span class="sm:ml-4 flex relative">
                        <button
                          type="button"
                          class="w-full sm:w-48 text-left p-2 bg-surface border border-grey-300 rounded bg-white/5 text-white border-border-subtle"
                          onClick={() =>
                            props.setRecipientDropdownOpen(prev => ({
                              ...prev,
                              [key()]: !prev[key()],
                            }))
                          }
                        >
                          {action.value
                            ? (props.recipientOptions.find(r => r.id === action.value)?.email ??
                              'Select recipient')
                            : 'Select recipient'}
                        </button>
                        <Show when={props.recipientDropdownOpen()?.[key()]}>
                          <div class="absolute top-full left-0 z-20 mt-1 w-full bg-surface border border-grey-300 rounded max-h-48 overflow-y-auto bg-surface border-border-subtle">
                            <For each={props.recipientOptions}>
                              {recipient => (
                                <div
                                  class="flex items-center px-3 py-2 hover:bg-white/5 cursor-pointer"
                                  onClick={() => {
                                    props.toggleRecipient(key(), recipient.id)
                                    props.setRecipientDropdownOpen(prev => ({
                                      ...prev,
                                      [key()]: false,
                                    }))
                                  }}
                                >
                                  <span class="text-sm text-grey-700 text-grey-200">
                                    {recipient.email}
                                  </span>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>
                      </span>
                    </Show>

                    <Show when={action.type === 'banner'}>
                      <span class="sm:ml-4 flex">
                        <div class="relative sm:mr-4 w-full">
                          <select
                            value={action.value || 'top'}
                            onChange={e => updateAction(key(), 'value', e.currentTarget.value)}
                            class="w-full block appearance-none sm:w-40 text-grey-700 text-white bg-white/5 p-2 pr-8 rounded focus:ring"
                          >
                            <option value="top" class="bg-surface">
                              Top
                            </option>
                            <option value="bottom" class="bg-surface">
                              Bottom
                            </option>
                            <option value="off" class="bg-surface">
                              Off
                            </option>
                          </select>
                        </div>
                      </span>
                    </Show>
                  </div>
                  <div class="flex items-center">
                    <Show when={rule().actions.length > 1}>
                      <span
                        class="block ml-4 w-6 h-6 text-grey-300 fill-current cursor-pointer"
                        onClick={() => deleteAction(key())}
                      >
                        <Icon name="trash" class="w-6 h-6" />
                      </span>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          )}
        </For>
        <button
          type="button"
          onClick={addAction}
          class="mt-4 p-2 text-grey-100 bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Add action
        </button>

        <Show when={props.errors.ruleActions}>
          <p class="mt-2 text-red-500 text-sm">{props.errors.ruleActions}</p>
        </Show>
      </fieldset>

      <fieldset class="border border-primary p-4 my-4 rounded-sm">
        <legend class="px-2 leading-none text-sm text-white">Apply rule on</legend>
        <div class="w-full flex">
          <div class="relative flex items-center">
            <input
              type="checkbox"
              checked={rule().forwards}
              onChange={e =>
                props.setRuleObject((prev: any) => ({ ...prev, forwards: e.currentTarget.checked }))
              }
              id="forwards"
              name="forwards"
              class="focus:ring-primary h-4 w-4 text-secondary text-indigo-400 bg-surface border-grey-300 rounded"
            />
            <label for="forwards" class="ml-2 text-sm text-grey-700 text-grey-200">
              Forwards
            </label>
          </div>
          <div class="relative flex items-center mx-4">
            <input
              type="checkbox"
              checked={rule().replies}
              onChange={e =>
                props.setRuleObject((prev: any) => ({ ...prev, replies: e.currentTarget.checked }))
              }
              id="replies"
              name="replies"
              class="focus:ring-primary h-4 w-4 text-secondary text-indigo-400 bg-surface border-grey-300 rounded"
            />
            <label for="replies" class="ml-2 text-sm text-grey-700 text-grey-200">
              Replies
            </label>
          </div>
          <div class="relative flex items-center">
            <input
              type="checkbox"
              checked={rule().sends}
              onChange={e =>
                props.setRuleObject((prev: any) => ({ ...prev, sends: e.currentTarget.checked }))
              }
              id="sends"
              name="sends"
              class="focus:ring-primary h-4 w-4 text-secondary text-indigo-400 bg-surface border-grey-300 rounded"
            />
            <label for="sends" class="ml-2 text-sm text-grey-700 text-grey-200">
              Sends
            </label>
          </div>
        </div>
      </fieldset>
    </>
  )
}

export default function Rules(props: RulesProps) {
  const page = usePage()

  const [rows, setRows] = createSignal<Rule[]>([...props.initialRows])
  const [deleteRuleModalOpen, setDeleteRuleModalOpen] = createSignal(false)
  const [deleteRuleLoading, setDeleteRuleLoading] = createSignal(false)
  const [ruleIdToDelete, setRuleIdToDelete] = createSignal('')
  const [createRuleModalOpen, setCreateRuleModalOpen] = createSignal(false)
  const [createRuleLoading, setCreateRuleLoading] = createSignal(false)
  const [editRuleModalOpen, setEditRuleModalOpen] = createSignal(false)
  const [editRuleLoading, setEditRuleLoading] = createSignal(false)
  const [moreInfoOpen, setMoreInfoOpen] = createSignal(false)
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  const [createRuleObject, setCreateRuleObject] = createSignal(emptyRuleObject())
  const [editRuleObject, setEditRuleObject] = createSignal<any>({})
  const [createRecipientDropdownOpen, setCreateRecipientDropdownOpen] = createSignal<
    Record<number, boolean>
  >({})
  const [editRecipientDropdownOpen, setEditRecipientDropdownOpen] = createSignal<
    Record<number, boolean>
  >({})

  const successMessage = (text = '') => {
    if ((window as any).__notify) {
      ;(window as any).__notify({ title: 'Success', text, type: 'success' })
    }
  }

  const errorMessage = (text = 'An error has occurred, please try again later') => {
    if ((window as any).__notify) {
      ;(window as any).__notify({ title: 'Error', text, type: 'error' })
    }
  }

  const toggleRecipientCreate = (actionKey: number, recipientId: string) => {
    setCreateRuleObject(prev => {
      const actions = [...prev.actions]
      actions[actionKey] = { ...actions[actionKey], value: recipientId }
      return { ...prev, actions }
    })
  }

  const toggleRecipientEdit = (actionKey: number, recipientId: string) => {
    setEditRuleObject(prev => {
      const actions = [...prev.actions]
      actions[actionKey] = { ...actions[actionKey], value: recipientId }
      return { ...prev, actions }
    })
  }

  const openCreateModal = () => {
    setErrors({})
    setCreateRuleObject(emptyRuleObject())
    setCreateRecipientDropdownOpen({})
    setCreateRuleModalOpen(true)
  }

  const openEditModal = (rule: Rule) => {
    setErrors({})
    setEditRuleObject(structuredClone(rule))
    setEditRecipientDropdownOpen({})
    setEditRuleModalOpen(true)
  }

  const closeEditModal = () => {
    setEditRuleModalOpen(false)
    setTimeout(() => setEditRuleObject({}), 300)
  }

  const openDeleteModal = (id: string) => {
    setDeleteRuleModalOpen(true)
    setRuleIdToDelete(id)
  }

  const closeDeleteModal = () => {
    setDeleteRuleModalOpen(false)
    setTimeout(() => setRuleIdToDelete(''), 300)
  }

  const validateRule = (ruleObj: any): Record<string, string> | null => {
    const errs: Record<string, string> = {}

    if (!ruleObj.name.length) {
      errs.ruleName = 'Please enter a rule name'
      return errs
    }
    if (ruleObj.name.length > 50) {
      errs.ruleName = 'Rule name cannot exceed 50 characters'
      return errs
    }

    ruleObj.conditions.forEach((condition: RuleCondition, key: number) => {
      if (!condition.values.length) {
        errs.ruleConditions = `You must add some values for the ${indexToHuman[key]} condition, make sure to click "Insert"`
      }
    })
    if (errs.ruleConditions) return errs

    ruleObj.actions.forEach((action: RuleAction, key: number) => {
      if (!action.value && action.value !== false) {
        errs.ruleActions = `You must add a value for the ${indexToHuman[key]} action`
      }
    })
    if (errs.ruleActions) return errs

    return null
  }

  const createNewRule = () => {
    const ruleObj = createRuleObject()
    const validationErrors = validateRule(ruleObj)
    if (validationErrors) {
      setErrors(validationErrors)
      return
    }

    setCreateRuleLoading(true)
    http
      .post('/api/v1/rules', {
        name: ruleObj.name,
        conditions: ruleObj.conditions,
        actions: ruleObj.actions,
        operator: ruleObj.operator,
        forwards: ruleObj.forwards,
        replies: ruleObj.replies,
        sends: ruleObj.sends,
      })
      .then((data: any) => {
        setCreateRuleLoading(false)
        setCreateRuleObject(emptyRuleObject())
        setRows(prev => [...prev, data.data])
        setCreateRuleModalOpen(false)
        reorderRules(false)
        successMessage('New rule created successfully')
      })
      .catch((error: any) => {
        setCreateRuleLoading(false)
        if (error.response?.status === 403) {
          errorMessage(error.response?.data ?? error.message)
        } else if (error.response?.data?.errors) {
          errorMessage(
            (
              Object.entries(error.response?.data?.errors ?? {}) as [string, string[]][]
            )[0]?.[1]?.[0] ?? error.message,
          )
        } else {
          errorMessage()
        }
      })
  }

  const editRule = () => {
    const ruleObj = editRuleObject()
    const validationErrors = validateRule(ruleObj)
    if (validationErrors) {
      setErrors(validationErrors)
      return
    }

    setEditRuleLoading(true)
    http
      .patch(`/api/v1/rules/${ruleObj.id}`, {
        name: ruleObj.name,
        conditions: ruleObj.conditions,
        actions: ruleObj.actions,
        operator: ruleObj.operator,
        forwards: ruleObj.forwards,
        replies: ruleObj.replies,
        sends: ruleObj.sends,
      })
      .then(() => {
        setRows(prev =>
          prev.map(r =>
            r.id === ruleObj.id
              ? {
                  ...r,
                  name: ruleObj.name,
                  conditions: ruleObj.conditions,
                  actions: ruleObj.actions,
                  operator: ruleObj.operator,
                  forwards: ruleObj.forwards,
                  replies: ruleObj.replies,
                  sends: ruleObj.sends,
                }
              : r,
          ),
        )
        setEditRuleLoading(false)
        closeEditModal()
        successMessage('Rule successfully updated')
      })
      .catch((error: any) => {
        setEditRuleLoading(false)
        if (error.response?.data?.errors) {
          errorMessage(
            (
              Object.entries(error.response?.data?.errors ?? {}) as [string, string[]][]
            )[0]?.[1]?.[0] ?? error.message,
          )
        } else {
          errorMessage()
        }
      })
  }

  const deleteRule = (id: string) => {
    setDeleteRuleLoading(true)
    http
      .delete(`/api/v1/rules/${id}`)
      .then(() => {
        setRows(prev => prev.filter(rule => rule.id !== id))
        setDeleteRuleModalOpen(false)
        setDeleteRuleLoading(false)
      })
      .catch(() => {
        errorMessage()
        setDeleteRuleModalOpen(false)
        setDeleteRuleLoading(false)
      })
  }

  const activateRule = (id: string) => {
    http
      .post('/api/v1/active-rules', { id })
      .then(() => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, active: true } : r)))
      })
      .catch((error: any) => {
        if (error.response?.data !== undefined) {
          errorMessage(error.response?.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const deactivateRule = (id: string) => {
    http
      .delete(`/api/v1/active-rules/${id}`)
      .then(() => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, active: false } : r)))
      })
      .catch((error: any) => {
        if (error.response?.data !== undefined) {
          errorMessage(error.response?.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const reorderRules = (displaySuccess = true) => {
    const ids = rows().map(r => r.id)
    http
      .post('/api/v1/reorder-rules', { ids })
      .then(() => {
        if (displaySuccess) successMessage('Rule order successfully updated')
      })
      .catch((error: any) => {
        if (error.response?.data !== undefined) {
          errorMessage(error.response?.data ?? error.message)
        } else {
          errorMessage()
        }
      })
  }

  const onDragEnd = (dragEvent: any) => {
    const { draggable: dragged, droppable: dropped } = dragEvent
    if (!dropped) return

    const currentRows = rows()
    const fromIndex = currentRows.findIndex(r => r.id === dragged.id)
    const toIndex = currentRows.findIndex(r => r.id === dropped.id)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

    const reordered = [...currentRows]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setRows(reordered)
    reorderRules()
  }

  return (
    <div>
      <Title>Rules</Title>
      <h1 id="primary-heading" class="sr-only">
        Rules
      </h1>

      <div class="sm:flex sm:items-center mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-white">Rules</h1>
          <p class="mt-2 text-sm text-grey-700 text-grey-200">
            A list of all the rules {props.search ? 'found for your search' : 'in your account'}
            <button type="button" onClick={() => setMoreInfoOpen(!moreInfoOpen())}>
              <Icon
                name="info"
                class="h-6 w-6 inline-block cursor-pointer text-grey-500 text-grey-200"
              />
            </button>
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={openCreateModal}
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-cyan-900 px-4 py-2 font-bold-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
          >
            Create Rule
          </button>
        </div>
      </div>

      <Show
        when={rows().length > 0}
        fallback={
          <Show
            when={props.search}
            fallback={
              <div class="text-center">
                <Icon name="funnel" class="mx-auto h-16 w-16 text-grey-400 text-grey-200" />
                <h3 class="mt-2 text-lg font-medium text-white">No Rules</h3>
                <p class="mt-1 text-md text-grey-500 text-grey-200">
                  Get started by creating a new rule.
                </p>
                <div class="mt-6">
                  <button
                    type="button"
                    onClick={openCreateModal}
                    class="inline-flex items-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-cyan-900 px-4 py-2 text-sm font-medium-sm focus:outline-none"
                  >
                    <Icon name="plus" class="-ml-1 mr-2 h-5 w-5" />
                    Create a Rule
                  </button>
                </div>
              </div>
            }
          >
            <div class="text-center">
              <Icon name="funnel" class="mx-auto h-16 w-16 text-grey-400 text-grey-200" />
              <h3 class="mt-2 text-lg font-medium text-white">No Rules found for that search</h3>
              <p class="mt-1 text-md text-grey-500 text-grey-200">
                Try entering a different search term.
              </p>
              <div class="mt-6">
                <Link
                  href={(window as any).route('rules.index')}
                  type="button"
                  class="inline-flex items-center rounded-md border border-transparent bg-primary hover:bg-primary/90 text-cyan-900 px-4 py-2 text-sm font-medium-sm focus:outline-none"
                >
                  View All Rules
                </Link>
              </div>
            </div>
          </Show>
        }
      >
        <div class="bg-surface">
          <DragDropProvider onDragEnd={onDragEnd} collisionDetector={closestCenter}>
            <DragDropSensors />
            <table class="table-auto w-full">
              <thead class="border-b border-grey-100 text-grey-400 text-grey-200 border-border-subtle">
                <tr>
                  <th scope="col" class="p-3" />
                  <th scope="col" class="p-3 text-left">
                    Created
                  </th>
                  <th scope="col" class="p-3 text-left">
                    Name
                  </th>
                  <th scope="col" class="p-3 text-left">
                    Active
                  </th>
                  <th scope="col" class="p-3 text-left">
                    Applied
                    <Icon
                      name="info"
                      class="inline-block w-4 h-4 text-grey-300 fill-current ml-1"
                    />
                  </th>
                  <th scope="col" class="p-3" />
                </tr>
              </thead>
              <SortableProvider ids={rows().map(r => r.id)}>
                <tbody>
                  <For each={rows()}>
                    {rule => (
                      <SortableRow
                        rule={rule}
                        onEdit={openEditModal}
                        onDelete={openDeleteModal}
                        onActivate={activateRule}
                        onDeactivate={deactivateRule}
                      />
                    )}
                  </For>
                </tbody>
              </SortableProvider>
            </table>
            <DragOverlay>{null}</DragOverlay>
          </DragDropProvider>
        </div>
      </Show>

      <Modal
        open={createRuleModalOpen()}
        onOpenChange={setCreateRuleModalOpen}
        title="Create new rule"
        maxWidth="md:max-w-3xl"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          Rules work on all emails, including replies and also send froms. New conditions and
          actions will be added over time.
        </p>
        <RuleForm
          ruleObject={createRuleObject()}
          setRuleObject={setCreateRuleObject}
          errors={errors()}
          recipientOptions={props.recipientOptions}
          recipientDropdownOpen={createRecipientDropdownOpen}
          setRecipientDropdownOpen={setCreateRecipientDropdownOpen}
          toggleRecipient={toggleRecipientCreate}
        />
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={createNewRule}
            class="bg-primary hover:bg-primary/90 text-cyan-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={createRuleLoading()}
          >
            Create Rule
            <Show when={createRuleLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            type="button"
            onClick={() => setCreateRuleModalOpen(false)}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={editRuleModalOpen()}
        onOpenChange={open => {
          if (!open) closeEditModal()
        }}
        title="Edit rule"
        maxWidth="md:max-w-3xl"
      >
        <p class="mt-4 text-grey-700 text-grey-200">
          Rules work on all emails, including replies and also send froms. New conditions and
          actions will be added over time.
        </p>
        <RuleForm
          ruleObject={editRuleObject()}
          setRuleObject={setEditRuleObject}
          errors={errors()}
          recipientOptions={props.recipientOptions}
          recipientDropdownOpen={editRecipientDropdownOpen}
          setRecipientDropdownOpen={setEditRecipientDropdownOpen}
          toggleRecipient={toggleRecipientEdit}
        />
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={editRule}
            class="bg-primary hover:bg-primary/90 text-cyan-900 font-bold py-3 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={editRuleLoading()}
          >
            Save
            <Show when={editRuleLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            type="button"
            onClick={closeEditModal}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteRuleModalOpen()}
        onOpenChange={open => {
          if (!open) closeDeleteModal()
        }}
        title="Delete rule"
      >
        <p class="mt-4 text-grey-700 text-grey-200">Are you sure you want to delete this rule?</p>
        <div class="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => deleteRule(ruleIdToDelete())}
            class="px-4 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 border border-transparent rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
            disabled={deleteRuleLoading()}
          >
            Delete rule
            <Show when={deleteRuleLoading()}>
              <Loader />
            </Show>
          </button>
          <button
            type="button"
            onClick={closeDeleteModal}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={moreInfoOpen()} onOpenChange={setMoreInfoOpen} title="More information">
        <p class="mt-4 text-grey-700 text-grey-200">
          Rules can be used to perform different actions if certain conditions are met.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          For example you could create a rule that checks if the alias is for your custom domain and
          if so then to replace the email subject.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          You can choose to apply rules on forwards, replies and/or sends.
        </p>
        <p class="mt-4 text-grey-700 text-grey-200">
          Rules are applied in the order displayed on this page from top to bottom. You can re-order
          your rules by dragging them using the icon on the left of each row.
        </p>
        <div class="mt-6 flex flex-col">
          <button
            type="button"
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-3 text-grey-800 font-semibold bg-surface hover:bg-white/10 text-grey-100 border border-border-subtle rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
