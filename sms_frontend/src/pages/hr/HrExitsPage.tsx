import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive, ChevronDown, DoorOpen, FileCheck2, UserMinus } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { extractApiErrorMessage } from '../../utils/forms'
import {
  type EmployeeRef,
  type ExitCase,
  type ExitClearanceItem,
  formatDate,
  formatDateTime,
  formatLabel,
  getEmployeeDisplayName,
  toArray,
} from './hrLifecycleShared'

type ExitForm = {
  employee: string
  exit_type: 'RESIGNATION' | 'RETIREMENT' | 'DISMISSAL' | 'CONTRACT_END'
  notice_date: string
  last_working_date: string
  effective_date: string
  reason: string
  notes: string
}

type ClearanceItemForm = {
  label: string
  department_name: string
  status: 'PENDING' | 'CLEARED' | 'WAIVED'
  notes: string
  display_order: string
}

type ClearanceEditDraft = {
  status: 'PENDING' | 'CLEARED' | 'WAIVED'
  notes: string
  display_order: string
}

const GLASS = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.07)',
}

const fieldClassName =
  'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400'

const getToday = () => new Date().toISOString().slice(0, 10)

const buildInitialForm = (employee = ''): ExitForm => ({
  employee,
  exit_type: 'RESIGNATION',
  notice_date: getToday(),
  last_working_date: '',
  effective_date: '',
  reason: '',
  notes: '',
})

const buildItemForm = (): ClearanceItemForm => ({
  label: '',
  department_name: '',
  status: 'PENDING',
  notes: '',
  display_order: '0',
})

const buildItemEditDraft = (item: ExitClearanceItem): ClearanceEditDraft => ({
  status: item.status,
  notes: item.notes ?? '',
  display_order: String(item.display_order ?? 0),
})

const statusTone: Record<string, string> = {
  DRAFT: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  CLEARANCE: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  ARCHIVED: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  CANCELLED: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
}

const itemTone: Record<string, string> = {
  PENDING: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  CLEARED: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  WAIVED: 'border-slate-500/25 bg-slate-500/10 text-slate-200',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[status] ?? statusTone.DRAFT}`}>
      {formatLabel(status)}
    </span>
  )
}

function ClearanceStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${itemTone[status] ?? itemTone.PENDING}`}>
      {formatLabel(status)}
    </span>
  )
}

export default function HrExitsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const preselectedEmployee = searchParams.get('employee') ?? ''
  const [exitCases, setExitCases] = useState<ExitCase[]>([])
  const [employees, setEmployees] = useState<EmployeeRef[]>([])
  const [clearanceItemsByCase, setClearanceItemsByCase] = useState<Record<number, ExitClearanceItem[]>>({})
  const [itemDraftsByCase, setItemDraftsByCase] = useState<Record<number, ClearanceItemForm>>({})
  const [itemEdits, setItemEdits] = useState<Record<number, ClearanceEditDraft>>({})
  const [loadingItemsByCase, setLoadingItemsByCase] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(Boolean(preselectedEmployee))
  const [form, setForm] = useState<ExitForm>(buildInitialForm(preselectedEmployee))
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState(preselectedEmployee)
  const [expandedExitId, setExpandedExitId] = useState<number | null>(null)
  const [archiveReasons, setArchiveReasons] = useState<Record<number, string>>({})

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [casesRes, employeesRes] = await Promise.all([
        apiClient.get<ExitCase[] | { results: ExitCase[] }>('/hr/exits/'),
        apiClient.get<EmployeeRef[] | { results: EmployeeRef[] }>('/hr/employees/', { params: { include_archived: 1 } }),
      ])
      setExitCases(toArray(casesRes.data))
      setEmployees(toArray(employeesRes.data))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load exits workspace.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredCases = useMemo(() => {
    return exitCases.filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) return false
      if (typeFilter && entry.exit_type !== typeFilter) return false
      if (employeeFilter && String(entry.employee) !== employeeFilter) return false
      return true
    })
  }, [employeeFilter, exitCases, statusFilter, typeFilter])

  const stats = useMemo(
    () => [
      { label: 'Draft', value: exitCases.filter((entry) => entry.status === 'DRAFT').length, color: '#cbd5e1' },
      { label: 'Clearance', value: exitCases.filter((entry) => entry.status === 'CLEARANCE').length, color: '#7dd3fc' },
      { label: 'Completed', value: exitCases.filter((entry) => entry.status === 'COMPLETED').length, color: '#6ee7b7' },
      { label: 'Archived', value: exitCases.filter((entry) => entry.status === 'ARCHIVED').length, color: '#c084fc' },
    ],
    [exitCases],
  )

  const setField = <K extends keyof ExitForm>(key: K, value: ExitForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmployeeFilterChange = (value: string) => {
    setEmployeeFilter(value)
    if (value) setSearchParams({ employee: value })
    else setSearchParams({})
  }

  const loadCaseItems = async (exitCaseId: number) => {
    setLoadingItemsByCase((prev) => ({ ...prev, [exitCaseId]: true }))
    try {
      const response = await apiClient.get<ExitClearanceItem[] | { results: ExitClearanceItem[] }>('/hr/exit-clearance-items/', {
        params: { exit_case: exitCaseId },
      })
      const items = toArray(response.data)
      setClearanceItemsByCase((prev) => ({ ...prev, [exitCaseId]: items }))
      setItemEdits((prev) => {
        const next = { ...prev }
        items.forEach((item) => {
          next[item.id] = buildItemEditDraft(item)
        })
        return next
      })
      setItemDraftsByCase((prev) => ({
        ...prev,
        [exitCaseId]: prev[exitCaseId] ?? buildItemForm(),
      }))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load exit clearance items.'))
    } finally {
      setLoadingItemsByCase((prev) => ({ ...prev, [exitCaseId]: false }))
    }
  }

  const toggleExpanded = (exitCaseId: number) => {
    const nextId = expandedExitId === exitCaseId ? null : exitCaseId
    setExpandedExitId(nextId)
    if (nextId && !clearanceItemsByCase[exitCaseId] && !loadingItemsByCase[exitCaseId]) {
      void loadCaseItems(exitCaseId)
    }
  }

  const handleCreateExit = async () => {
    if (!form.employee || !form.exit_type) {
      setError('Employee and exit type are required.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload: Record<string, unknown> = {
        employee: Number(form.employee),
        exit_type: form.exit_type,
        reason: form.reason,
        notes: form.notes,
      }
      if (form.notice_date) payload.notice_date = form.notice_date
      if (form.last_working_date) payload.last_working_date = form.last_working_date
      if (form.effective_date) payload.effective_date = form.effective_date

      await apiClient.post('/hr/exits/', payload)
      setNotice('Exit case created.')
      setShowForm(false)
      setForm(buildInitialForm(form.employee))
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create exit case.'))
    } finally {
      setSaving(false)
    }
  }

  const handleStartClearance = async (exitCaseId: number) => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/exits/${exitCaseId}/start-clearance/`, {})
      setNotice('Exit case moved into clearance.')
      await Promise.all([load(), loadCaseItems(exitCaseId)])
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to start exit clearance.'))
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteExit = async (exitCaseId: number) => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/exits/${exitCaseId}/complete/`, {})
      setNotice('Exit case completed.')
      await Promise.all([load(), loadCaseItems(exitCaseId)])
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to complete exit case.'))
    } finally {
      setSaving(false)
    }
  }

  const updateNewItemDraft = (exitCaseId: number, patch: Partial<ClearanceItemForm>) => {
    setItemDraftsByCase((prev) => ({
      ...prev,
      [exitCaseId]: { ...(prev[exitCaseId] ?? buildItemForm()), ...patch },
    }))
  }

  const handleAddClearanceItem = async (exitCaseId: number) => {
    const draft = itemDraftsByCase[exitCaseId] ?? buildItemForm()
    if (!draft.label) {
      setError('Clearance item label is required.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/exit-clearance-items/', {
        exit_case: exitCaseId,
        label: draft.label,
        department_name: draft.department_name,
        status: draft.status,
        notes: draft.notes,
        display_order: Number(draft.display_order || '0'),
      })
      setNotice('Clearance item added.')
      setItemDraftsByCase((prev) => ({ ...prev, [exitCaseId]: buildItemForm() }))
      await loadCaseItems(exitCaseId)
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to add clearance item.'))
    } finally {
      setSaving(false)
    }
  }

  const updateItemEditDraft = (itemId: number, patch: Partial<ClearanceEditDraft>) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { status: 'PENDING', notes: '', display_order: '0' }), ...patch },
    }))
  }

  const handleUpdateClearanceItem = async (item: ExitClearanceItem) => {
    const draft = itemEdits[item.id] ?? buildItemEditDraft(item)
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.patch(`/hr/exit-clearance-items/${item.id}/`, {
        status: draft.status,
        notes: draft.notes,
        display_order: Number(draft.display_order || '0'),
      })
      setNotice('Clearance item updated.')
      await loadCaseItems(item.exit_case)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to update clearance item.'))
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveEmployee = async (exitCase: ExitCase) => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/employees/${exitCase.employee}/archive/`, {
        archive_reason: archiveReasons[exitCase.id] ?? '',
      })
      setNotice('Employee archived and operational access locked.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to archive employee.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="sky"
        title="Exits"
        subtitle="Run structured separations, digital clearance, and final archive without bypassing the lifecycle spine."
        icon={DoorOpen}
        stats={stats}
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={employeeFilter}
          onChange={(event) => handleEmployeeFilterChange(event.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All employees</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {getEmployeeDisplayName(employee)} ({employee.employee_id})
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All exit types</option>
          <option value="RESIGNATION">Resignation</option>
          <option value="RETIREMENT">Retirement</option>
          <option value="DISMISSAL">Dismissal</option>
          <option value="CONTRACT_END">Contract End</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CLEARANCE">Clearance</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={() => {
            setShowForm((prev) => !prev)
            setError(null)
            setNotice(null)
          }}
          className="ml-auto rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          {showForm ? 'Close Form' : 'Create Exit Case'}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      {showForm ? (
        <section className="space-y-4 rounded-2xl p-6" style={GLASS}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New Exit Case</p>
            <h2 className="mt-2 text-xl font-display font-semibold text-slate-100">Prepare a controlled departure workflow</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Employee</label>
              <select value={form.employee} onChange={(event) => setField('employee', event.target.value)} className={fieldClassName}>
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getEmployeeDisplayName(employee)} ({employee.employee_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Exit Type</label>
              <select value={form.exit_type} onChange={(event) => setField('exit_type', event.target.value as ExitForm['exit_type'])} className={fieldClassName}>
                <option value="RESIGNATION">Resignation</option>
                <option value="RETIREMENT">Retirement</option>
                <option value="DISMISSAL">Dismissal</option>
                <option value="CONTRACT_END">Contract End</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Notice Date</label>
              <input type="date" value={form.notice_date} onChange={(event) => setField('notice_date', event.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Last Working Date</label>
              <input type="date" value={form.last_working_date} onChange={(event) => setField('last_working_date', event.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Effective Date</label>
              <input type="date" value={form.effective_date} onChange={(event) => setField('effective_date', event.target.value)} className={fieldClassName} />
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Reason</label>
              <textarea value={form.reason} onChange={(event) => setField('reason', event.target.value)} rows={2} className={fieldClassName} placeholder="Why is the exit being opened?" />
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Notes</label>
              <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={2} className={fieldClassName} placeholder="Operational notes and handover context." />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => void handleCreateExit()} disabled={saving} className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
              {saving ? 'Saving...' : 'Create Exit Case'}
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-2xl p-10 text-center text-sm text-slate-400" style={GLASS}>
          Loading exit cases...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm text-slate-400" style={GLASS}>
          No exit cases match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((entry) => {
            const isExpanded = expandedExitId === entry.id
            const caseItems = clearanceItemsByCase[entry.id] ?? []
            const newItemDraft = itemDraftsByCase[entry.id] ?? buildItemForm()
            const profileQuery = entry.status === 'ARCHIVED' ? '?include_archived=1' : ''

            return (
              <section key={entry.id} className="overflow-hidden rounded-2xl" style={GLASS}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(entry.id)}
                  className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/12">
                    {entry.status === 'ARCHIVED' ? <Archive size={18} className="text-violet-200" /> : <UserMinus size={18} className="text-sky-200" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-100">{entry.employee_name}</p>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{formatLabel(entry.exit_type)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Effective {formatDate(entry.effective_date || entry.last_working_date || entry.notice_date)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Created {formatDateTime(entry.created_at)}</p>
                    <p className="mt-1">Completed by {entry.completed_by_name || '-'}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded ? (
                  <div className="space-y-4 border-t border-white/[0.05] px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <Link to={`/modules/hr/employees/${entry.employee}${profileQuery}`} className="text-sky-300 hover:text-sky-200">
                        Open employee profile
                      </Link>
                      <span>Requested by {entry.requested_by_name || 'System'}</span>
                      {entry.completed_by_name ? <span>Completed by {entry.completed_by_name}</span> : null}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Timeline</p>
                        <p className="mt-2 text-sm text-slate-200">Notice date: {formatDate(entry.notice_date)}</p>
                        <p className="mt-1 text-sm text-slate-200">Last working date: {formatDate(entry.last_working_date)}</p>
                        <p className="mt-1 text-sm text-slate-200">Effective date: {formatDate(entry.effective_date)}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Reason</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{entry.reason || 'No reason recorded.'}</p>
                        <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">Notes</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{entry.notes || 'No notes recorded.'}</p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/[0.07] bg-slate-950/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">Clearance Checklist</p>
                          <p className="mt-1 text-xs text-slate-400">
                            All items must be cleared or waived before exit completion.
                          </p>
                        </div>
                        {loadingItemsByCase[entry.id] ? <p className="text-xs text-slate-500">Loading items...</p> : null}
                      </div>

                      {caseItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-sm text-slate-500">
                          No clearance items recorded yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {caseItems.map((item) => {
                            const itemDraft = itemEdits[item.id] ?? buildItemEditDraft(item)
                            return (
                              <div key={item.id} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-slate-100">{item.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">{item.department_name || 'Unassigned department'}</p>
                                  </div>
                                  <ClearanceStatusBadge status={item.status} />
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                  <select value={itemDraft.status} onChange={(event) => updateItemEditDraft(item.id, { status: event.target.value as ClearanceEditDraft['status'] })} className={fieldClassName}>
                                    <option value="PENDING">Pending</option>
                                    <option value="CLEARED">Cleared</option>
                                    <option value="WAIVED">Waived</option>
                                  </select>
                                  <input value={itemDraft.display_order} onChange={(event) => updateItemEditDraft(item.id, { display_order: event.target.value })} className={fieldClassName} placeholder="Display order" />
                                  <button onClick={() => void handleUpdateClearanceItem(item)} disabled={saving} className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 disabled:opacity-60">
                                    Save Item
                                  </button>
                                  <textarea value={itemDraft.notes} onChange={(event) => updateItemEditDraft(item.id, { notes: event.target.value })} rows={2} className={`${fieldClassName} sm:col-span-3`} placeholder="Clearance notes" />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                  Completed at {formatDateTime(item.completed_at)} by {item.completed_by_name || '-'}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {entry.status !== 'COMPLETED' && entry.status !== 'ARCHIVED' && entry.status !== 'CANCELLED' ? (
                        <div className="grid gap-3 rounded-xl border border-sky-500/20 bg-sky-500/8 p-4 sm:grid-cols-2 xl:grid-cols-5">
                          <input value={newItemDraft.label} onChange={(event) => updateNewItemDraft(entry.id, { label: event.target.value })} className={fieldClassName} placeholder="Checklist label" />
                          <input value={newItemDraft.department_name} onChange={(event) => updateNewItemDraft(entry.id, { department_name: event.target.value })} className={fieldClassName} placeholder="Department name" />
                          <select value={newItemDraft.status} onChange={(event) => updateNewItemDraft(entry.id, { status: event.target.value as ClearanceItemForm['status'] })} className={fieldClassName}>
                            <option value="PENDING">Pending</option>
                            <option value="CLEARED">Cleared</option>
                            <option value="WAIVED">Waived</option>
                          </select>
                          <input value={newItemDraft.display_order} onChange={(event) => updateNewItemDraft(entry.id, { display_order: event.target.value })} className={fieldClassName} placeholder="Display order" />
                          <button onClick={() => void handleAddClearanceItem(entry.id)} disabled={saving} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
                            Add Item
                          </button>
                          <textarea value={newItemDraft.notes} onChange={(event) => updateNewItemDraft(entry.id, { notes: event.target.value })} rows={2} className={`${fieldClassName} sm:col-span-2 xl:col-span-5`} placeholder="Notes for the clearance item" />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {entry.status === 'DRAFT' ? (
                        <button onClick={() => void handleStartClearance(entry.id)} disabled={saving} className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 disabled:opacity-60">
                          Start Clearance
                        </button>
                      ) : null}
                      {entry.status === 'CLEARANCE' ? (
                        <button onClick={() => void handleCompleteExit(entry.id)} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
                          Complete Exit
                        </button>
                      ) : null}
                    </div>

                    {entry.status === 'COMPLETED' ? (
                      <div className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-500/8 p-4">
                        <div className="flex items-center gap-2 text-violet-100">
                          <FileCheck2 size={16} />
                          <p className="text-sm font-semibold">Final Archive</p>
                        </div>
                        <p className="text-xs text-violet-200/75">
                          Archive is terminal in Session 9. It hides the employee from normal HR lists and locks linked operational access immediately.
                        </p>
                        <input
                          value={archiveReasons[entry.id] ?? ''}
                          onChange={(event) => setArchiveReasons((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                          className={fieldClassName}
                          placeholder="Archive reason"
                        />
                        <div className="flex justify-end">
                          <button onClick={() => void handleArchiveEmployee(entry)} disabled={saving} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                            Archive Employee
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {entry.status === 'ARCHIVED' ? (
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 px-4 py-3 text-sm text-violet-100">
                        Archive has been finalized. This case now represents a terminal archived separation record.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
