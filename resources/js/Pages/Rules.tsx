import { Title } from '@solidjs/meta'
import { createSignal, Show, For } from 'solid-js'
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

function SortableRow(props: {
  rule: Rule
  onEdit: (rule: Rule) => void
  onDelete: (id: string) => void
  onActivate: (id: string) => void
  onDeactivate: (id: string) => void
}) {
  const sortable = createSortable(props.rule.id)

  return (
    <div
      ref={sortable.ref}
      class={`group flex items-center gap-4 px-4 py-3 border-b border-border-subtle hover:bg-white/[0.03] transition-colors ${sortable.isActiveDraggable ? 'opacity-50 bg-surface' : ''}`}
      {...sortable.dragActivators}
    >
      <div class="shrink-0 cursor-grab active:cursor-grabbing">
        <Icon name="menu" class="h-5 w-5 text-grey-600" />
      </div>
      <div class="shrink-0 w-24">
        <span class="text-xs text-grey-500" title={filters.formatDate(props.rule.created_at)}>
          {filters.timeAgo(props.rule.created_at)}
        </span>
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-sm font-medium text-white">{props.rule.name}</span>
      </div>
      <div class="shrink-0">
        <Toggle
          checked={props.rule.active}
          onChange={(checked: boolean) => {
            if (checked) props.onActivate(props.rule.id)
            else props.onDeactivate(props.rule.id)
          }}
        />
      </div>
      <div class="shrink-0 w-20 text-right">
        <Show
          when={props.rule.last_applied}
          fallback={
            <span class="text-sm text-grey-500">{props.rule.applied.toLocaleString()}</span>
          }
        >
          <span
            class="text-sm font-medium text-primary"
            title={`${filters.timeAgo(props.rule.last_applied!)} (${filters.formatDate(props.rule.last_applied!)})`}
          >
            {props.rule.applied.toLocaleString()}
          </span>
        </Show>
      </div>
      <div class="shrink-0 flex items-center gap-3">
        <button
          type="button"
          class="text-sm text-grey-500 hover:text-white transition-colors"
          onClick={() => props.onEdit(props.rule)}
        >
          Edit
        </button>
        <button
          type="button"
          class="text-sm text-grey-500 hover:text-red-400 transition-colors"
          onClick={() => props.onDelete(props.rule.id)}
        >
          Delete
        </button>
      </div>
    </div>
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
    if (!condition.currentConditionValue) return
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
      <label for="rule_name" class="block font-medium text-sm my-2 text-white">
        Name
      </label>
      <Show when={props.errors.ruleName}>
        <p class="mb-3 text-red-400 text-sm">{props.errors.ruleName}</p>
      </Show>
      <input
        value={rule().name}
        onInput={e =>
          props.setRuleObject((prev: any) => ({ ...prev, name: e.currentTarget.value }))
        }
        id="rule_name"
        type="text"
        class={`block w-full rounded-md border-0 py-2 pr-10 border border-border-subtle focus:border-primary/60 focus:outline-none sm:text-base sm:leading-6 text-white bg-white/5 ${props.errors.ruleName ? 'ring-red-500' : 'ring-border-subtle'}`}
        placeholder="Enter name"
      />

      <fieldset class="border border-primary/30 p-4 my-4 rounded-md">
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
                    class="block appearance-none w-full text-white bg-white/5 p-2 pr-8 rounded focus:ring-primary"
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

              <div class="p-3 w-full bg-surface rounded-md">
                <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span class="text-nowrap text-grey-400 text-sm">If the</span>
                  <select
                    value={condition.type}
                    onChange={e => updateCondition(key(), 'type', e.currentTarget.value)}
                    class="block appearance-none w-full sm:w-32 text-white bg-white/5 p-2 pr-8 rounded focus:ring-primary"
                  >
                    <For each={conditionTypeOptions}>
                      {opt => (
                        <option value={opt.value} class="bg-surface">
                          {opt.label}
                        </option>
                      )}
                    </For>
                  </select>

                  <Show when={conditionMatchOptions(rule().conditions, key()).length > 0}>
                    <div class="flex flex-col sm:flex-row gap-2 sm:items-center flex-1">
                      <select
                        value={condition.match}
                        onChange={e => updateCondition(key(), 'match', e.currentTarget.value)}
                        class="block appearance-none w-full sm:w-40 text-white bg-white/5 p-2 pr-8 rounded focus:ring-primary"
                      >
                        <For each={conditionMatchOptions(rule().conditions, key())}>
                          {opt => (
                            <option value={opt} class="bg-surface">
                              {opt}
                            </option>
                          )}
                        </For>
                      </select>

                      <div class="flex flex-1">
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
                          class={`w-full appearance-none bg-surface border border-transparent rounded-l-md text-white focus:outline-none p-2 bg-white/5 ${props.errors.ruleConditions ? 'border-red-500' : ''}`}
                          placeholder="Enter value"
                        />
                        <button
                          type="button"
                          onClick={() => addValueToCondition(key())}
                          class="p-2 bg-surface rounded-r-md text-white hover:bg-white/5 border border-border-subtle"
                        >
                          Insert
                        </button>
                      </div>
                    </div>
                  </Show>

                  <Show when={rule().conditions.length > 1}>
                    <button
                      type="button"
                      onClick={() => deleteCondition(key())}
                      class="text-grey-500 hover:text-red-400 shrink-0"
                    >
                      <Icon name="trash" class="w-5 h-5" />
                    </button>
                  </Show>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <For each={condition.values}>
                    {(value, index) => (
                      <>
                        <span
                          class="inline-flex items-center gap-1 bg-primary/10 text-primary text-sm font-medium rounded-md px-2 py-0.5 cursor-pointer"
                          onClick={() => removeConditionValue(key(), index())}
                        >
                          {value}
                          <Icon name="close" class="w-3 h-3" />
                        </span>
                        <Show when={index() + 1 !== condition.values.length}>
                          <span class="text-grey-500 text-sm">or</span>
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
          class="mt-4 p-2 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md text-sm"
        >
          Add condition
        </button>

        <Show when={props.errors.ruleConditions}>
          <p class="mt-2 text-red-400 text-sm">{props.errors.ruleConditions}</p>
        </Show>
      </fieldset>

      <fieldset class="border border-primary/30 p-4 my-4 rounded-md">
        <legend class="px-2 leading-none text-sm text-white">Actions</legend>

        <For each={rule().actions}>
          {(action, key) => (
            <div>
              <Show when={key() !== 0}>
                <div class="flex justify-center my-2">
                  <div class="text-grey-400 text-sm">AND</div>
                </div>
              </Show>

              <div class="p-3 w-full bg-surface rounded-md">
                <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <span class="text-grey-400 text-sm shrink-0">Then</span>
                  <select
                    value={action.type}
                    onChange={e => {
                      ruleActionChange(key(), e.currentTarget.value)
                      updateAction(key(), 'type', e.currentTarget.value)
                    }}
                    class="w-full sm:w-auto block appearance-none text-white bg-white/5 p-2 pr-8 rounded focus:ring-primary"
                  >
                    <For each={actionTypeOptions}>
                      {opt => (
                        <option value={opt.value} class="bg-surface">
                          {opt.label}
                        </option>
                      )}
                    </For>
                  </select>

                  <Show when={action.type === 'subject' || action.type === 'displayFrom'}>
                    <div class="flex flex-col w-full">
                      <input
                        value={action.value || ''}
                        onInput={e => updateAction(key(), 'value', e.currentTarget.value)}
                        type="text"
                        class={`w-full appearance-none bg-surface border border-transparent rounded-md text-white focus:outline-none p-2 bg-white/5 ${props.errors.ruleActions ? 'border-red-500' : ''}`}
                        placeholder={
                          action.type === 'subject' ? 'e.g. [Fwd] {{subject}}' : 'Enter value'
                        }
                      />
                      <Show when={action.type === 'subject'}>
                        <p class="mt-1.5 text-xs text-grey-500">
                          Use{' '}
                          <code class="px-1 py-0.5 rounded bg-surface font-mono text-grey-300">
                            {'{{subject}}'}
                          </code>{' '}
                          placeholder to include the original subject.
                        </p>
                      </Show>
                    </div>
                  </Show>

                  <Show when={action.type === 'forwardTo'}>
                    <div class="flex relative w-full sm:w-48">
                      <button
                        type="button"
                        class="w-full text-left p-2 bg-white/5 border border-border-subtle rounded-md text-white text-sm"
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
                        <div class="absolute top-full left-0 z-20 mt-1 w-full bg-surface border border-border-subtle rounded-md max-h-48 overflow-y-auto">
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
                                <span class="text-sm text-white">{recipient.email}</span>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </Show>

                  <Show when={action.type === 'banner'}>
                    <select
                      value={action.value || 'top'}
                      onChange={e => updateAction(key(), 'value', e.currentTarget.value)}
                      class="w-full sm:w-40 block appearance-none text-white bg-white/5 p-2 pr-8 rounded focus:ring-primary"
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
                  </Show>

                  <Show when={rule().actions.length > 1}>
                    <button
                      type="button"
                      onClick={() => deleteAction(key())}
                      class="text-grey-500 hover:text-red-400 shrink-0"
                    >
                      <Icon name="trash" class="w-5 h-5" />
                    </button>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
        <button
          type="button"
          onClick={addAction}
          class="mt-4 p-2 text-grey-300 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-md text-sm"
        >
          Add action
        </button>

        <Show when={props.errors.ruleActions}>
          <p class="mt-2 text-red-400 text-sm">{props.errors.ruleActions}</p>
        </Show>
      </fieldset>

      <fieldset class="border border-primary/30 p-4 my-4 rounded-md">
        <legend class="px-2 leading-none text-sm text-white">Apply rule on</legend>
        <div class="flex gap-6">
          <label class="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rule().forwards}
              onChange={e =>
                props.setRuleObject((prev: any) => ({ ...prev, forwards: e.currentTarget.checked }))
              }
              class="focus:ring-primary h-4 w-4 text-primary bg-surface border-border-subtle rounded"
            />
            <span class="ml-2 text-sm text-white">Forwards</span>
          </label>
          <label class="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rule().replies}
              onChange={e =>
                props.setRuleObject((prev: any) => ({ ...prev, replies: e.currentTarget.checked }))
              }
              class="focus:ring-primary h-4 w-4 text-primary bg-surface border-border-subtle rounded"
            />
            <span class="ml-2 text-sm text-white">Replies</span>
          </label>
          <label class="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rule().sends}
              onChange={e =>
                props.setRuleObject((prev: any) => ({ ...prev, sends: e.currentTarget.checked }))
              }
              class="focus:ring-primary h-4 w-4 text-primary bg-surface border-border-subtle rounded"
            />
            <span class="ml-2 text-sm text-white">Sends</span>
          </label>
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
      .then(() => setRows(prev => prev.map(r => (r.id === id ? { ...r, active: true } : r))))
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
      .then(() => setRows(prev => prev.map(r => (r.id === id ? { ...r, active: false } : r))))
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

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-semibold text-white">Rules</h1>
          <p class="mt-1 text-sm text-grey-400 flex items-center gap-2">
            A list of all the rules {props.search ? 'found for your search' : 'in your account'}
            <button type="button" onClick={() => setMoreInfoOpen(!moreInfoOpen())}>
              <Icon name="info" class="h-4 w-4 text-grey-500 hover:text-grey-300" />
            </button>
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          class="inline-flex items-center justify-center rounded-md bg-primary hover:bg-primary/90 text-charcoal px-4 py-2 text-sm font-medium shrink-0"
        >
          <Icon name="plus" class="mr-1.5 h-4 w-4" />
          Create Rule
        </button>
      </div>

      <Show
        when={rows().length > 0}
        fallback={
          <Show
            when={props.search}
            fallback={
              <div class="text-center py-16">
                <Icon name="funnel" class="mx-auto h-12 w-12 text-grey-600" />
                <h3 class="mt-3 text-base font-medium text-white">No Rules</h3>
                <p class="mt-1 text-sm text-grey-500">Get started by creating a new rule.</p>
                <div class="mt-4">
                  <button
                    type="button"
                    onClick={openCreateModal}
                    class="inline-flex items-center rounded-md bg-primary hover:bg-primary/90 text-charcoal px-4 py-2 text-sm font-medium"
                  >
                    <Icon name="plus" class="mr-1.5 h-4 w-4" />
                    Create a Rule
                  </button>
                </div>
              </div>
            }
          >
            <div class="text-center py-16">
              <Icon name="funnel" class="mx-auto h-12 w-12 text-grey-600" />
              <h3 class="mt-3 text-base font-medium text-white">No Rules found for that search</h3>
              <p class="mt-1 text-sm text-grey-500">Try entering a different search term.</p>
              <div class="mt-4">
                <Link
                  href={(window as any).route('rules.index')}
                  class="inline-flex items-center rounded-md bg-primary hover:bg-primary/90 text-charcoal px-4 py-2 text-sm font-medium"
                >
                  View All Rules
                </Link>
              </div>
            </div>
          </Show>
        }
      >
        <div class="border-t border-border-subtle">
          <DragDropProvider onDragEnd={onDragEnd} collisionDetector={closestCenter}>
            <DragDropSensors />
            {/* Column headers */}
            <div class="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-grey-500 uppercase tracking-wider border-b border-border-subtle">
              <div class="col-span-1" />
              <div class="col-span-2">Created</div>
              <div class="col-span-4">Name</div>
              <div class="col-span-1">Active</div>
              <div class="col-span-2 text-right">Applied</div>
              <div class="col-span-2" />
            </div>
            <SortableProvider ids={rows().map(r => r.id)}>
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
            </SortableProvider>
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
        <p class="mt-4 text-grey-300">
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
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={createNewRule}
            class="bg-primary hover:bg-primary/90 text-charcoal font-bold py-2.5 px-4 rounded-md disabled:cursor-not-allowed"
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
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
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
        <p class="mt-4 text-grey-300">
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
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={editRule}
            class="bg-primary hover:bg-primary/90 text-charcoal font-bold py-2.5 px-4 rounded-md disabled:cursor-not-allowed"
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
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
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
        <p class="mt-4 text-grey-300">Are you sure you want to delete this rule?</p>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => deleteRule(ruleIdToDelete())}
            class="px-4 py-2.5 text-white font-semibold bg-red-500 hover:bg-red-600 rounded-md disabled:cursor-not-allowed"
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
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={moreInfoOpen()} onOpenChange={setMoreInfoOpen} title="More information">
        <p class="mt-4 text-grey-300">
          Rules can be used to perform different actions if certain conditions are met.
        </p>
        <p class="mt-4 text-grey-300">
          For example you could create a rule that checks if the alias is for your custom domain and
          if so then to replace the email subject.
        </p>
        <p class="mt-4 text-grey-300">
          You can choose to apply rules on forwards, replies and/or sends.
        </p>
        <p class="mt-4 text-grey-300">
          Rules are applied in the order displayed on this page from top to bottom. You can re-order
          your rules by dragging them using the icon on the left of each row.
        </p>
        <div class="mt-6">
          <button
            type="button"
            onClick={() => setMoreInfoOpen(false)}
            class="px-4 py-2.5 text-grey-300 font-medium bg-white/5 hover:bg-white/10 rounded-md border border-border-subtle"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
