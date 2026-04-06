import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, ChevronDown, CirclePlay, ShieldCheck } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { extractApiErrorMessage } from '../../utils/forms'
import {
  type DepartmentRef,
  type EmployeeRef,
  type PositionRef,
  type StaffCareerAction,
  formatDate,
  formatDateTime,
  formatLabel,
  getEmployeeDisplayName,
  toArray,
} from './hrLifecycleShared'

type CareerActionForm = {
  employee: string
  action_type: 'PROMOTION' | 'DEMOTION' | 'ACTING_APPOINTMENT'
  to_department: string
  to_position_ref: string
  effective_date: string
  status: 'DRAFT' | 'SCHEDULED'
  target_position_grade: string
  target_salary_scale: string
  reason: string
  notes: string
}

type ActingEndDraft = {
  effective_date: string
  notes: string
}

const GLASS = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.07)',
}

const fieldClassName =
  'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400'

const getToday = () => new Date().toISOString().slice(0, 10)

const buildInitialForm = (employee = ''): CareerActionForm => ({
  employee,
  action_type: 'PROMOTION',
  to_department: '',
  to_position_ref: '',
  effective_date: getToday(),
  status: 'DRAFT',
  target_position_grade: '',
  target_salary_scale: '',
  reason: '',
  notes: '',
})

const defaultEndingDraft = (): ActingEndDraft => ({
  effective_date: getToday(),
  notes: '',
})

const statusTone: Record<string, string> = {
  DRAFT: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  SCHEDULED: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  EFFECTIVE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  CANCELLED: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
}

const actionTone: Record<string, string> = {
  PROMOTION: 'bg-emerald-500/12 text-emerald-200',
  DEMOTION: 'bg-amber-500/12 text-amber-200',
  ACTING_APPOINTMENT: 'bg-violet-500/12 text-violet-200',
  ACTING_APPOINTMENT_END: 'bg-slate-500/12 text-slate-200',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[status] ?? statusTone.DRAFT}`}>
      {formatLabel(status)}
    </span>
  )
}

function ActionBadge({ actionType }: { actionType: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionTone[actionType] ?? actionTone.PROMOTION}`}>
      {formatLabel(actionType)}
    </span>
  )
}

export default function HrCareerEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const preselectedEmployee = searchParams.get('employee') ?? ''
  const [careerActions, setCareerActions] = useState<StaffCareerAction[]>([])
  const [employees, setEmployees] = useState<EmployeeRef[]>([])
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [positions, setPositions] = useState<PositionRef[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(Boolean(preselectedEmployee))
  const [form, setForm] = useState<CareerActionForm>(buildInitialForm(preselectedEmployee))
  const [actionFilter, setActionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState(preselectedEmployee)
  const [expandedActionId, setExpandedActionId] = useState<number | null>(null)
  const [endingDrafts, setEndingDrafts] = useState<Record<number, ActingEndDraft>>({})

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [actionsRes, employeesRes, departmentsRes, positionsRes] = await Promise.all([
        apiClient.get<StaffCareerAction[] | { results: StaffCareerAction[] }>('/hr/career-actions/'),
        apiClient.get<EmployeeRef[] | { results: EmployeeRef[] }>('/hr/employees/', { params: { include_archived: 1 } }),
        apiClient.get<DepartmentRef[] | { results: DepartmentRef[] }>('/hr/departments/'),
        apiClient.get<PositionRef[] | { results: PositionRef[] }>('/hr/positions/'),
      ])
      setCareerActions(toArray(actionsRes.data))
      setEmployees(toArray(employeesRes.data))
      setDepartments(toArray(departmentsRes.data))
      setPositions(toArray(positionsRes.data))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load career events workspace.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredPositions = useMemo(() => {
    if (!form.to_department) return positions
    return positions.filter((position) => String(position.department ?? '') === form.to_department)
  }, [form.to_department, positions])

  const filteredActions = useMemo(() => {
    return careerActions.filter((action) => {
      if (actionFilter && action.action_type !== actionFilter) return false
      if (statusFilter && action.status !== statusFilter) return false
      if (employeeFilter && String(action.employee) !== employeeFilter) return false
      return true
    })
  }, [actionFilter, careerActions, employeeFilter, statusFilter])

  const stats = useMemo(
    () => [
      { label: 'Total', value: careerActions.length, color: '#e2e8f0' },
      { label: 'Draft', value: careerActions.filter((row) => row.status === 'DRAFT').length, color: '#cbd5e1' },
      { label: 'Effective', value: careerActions.filter((row) => row.status === 'EFFECTIVE').length, color: '#6ee7b7' },
      {
        label: 'Acting Active',
        value: careerActions.filter((row) => row.action_type === 'ACTING_APPOINTMENT' && row.status === 'EFFECTIVE').length,
        color: '#c084fc',
      },
    ],
    [careerActions],
  )

  const setField = <K extends keyof CareerActionForm>(key: K, value: CareerActionForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmployeeFilterChange = (value: string) => {
    setEmployeeFilter(value)
    if (value) setSearchParams({ employee: value })
    else setSearchParams({})
  }

  const handleCreate = async () => {
    if (!form.employee || !form.effective_date) {
      setError('Employee and effective date are required.')
      return
    }
    if ((form.action_type === 'PROMOTION' || form.action_type === 'DEMOTION') && !form.to_position_ref) {
      setError('Target position is required for promotion or demotion.')
      return
    }
    if (form.action_type === 'ACTING_APPOINTMENT' && !form.to_department && !form.to_position_ref) {
      setError('Provide a target department or position for the acting appointment.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload: Record<string, unknown> = {
        employee: Number(form.employee),
        action_type: form.action_type,
        effective_date: form.effective_date,
        status: form.status,
        reason: form.reason,
        notes: form.notes,
      }
      if (form.to_department) payload.to_department = Number(form.to_department)
      if (form.to_position_ref) payload.to_position_ref = Number(form.to_position_ref)
      if (form.target_position_grade) payload.target_position_grade = form.target_position_grade
      if (form.target_salary_scale) payload.target_salary_scale = form.target_salary_scale

      await apiClient.post('/hr/career-actions/', payload)
      setNotice('Career action created.')
      setShowForm(false)
      setForm(buildInitialForm(form.employee))
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create career action.'))
    } finally {
      setSaving(false)
    }
  }

  const handleApply = async (actionId: number) => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/career-actions/${actionId}/apply/`, {})
      setNotice('Career action applied.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to apply career action.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEndActing = async (actionId: number) => {
    const draft = endingDrafts[actionId] ?? defaultEndingDraft()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/career-actions/${actionId}/end-acting/`, {
        effective_date: draft.effective_date,
        notes: draft.notes,
      })
      setNotice('Acting appointment ended and prior assignment restored.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to end acting appointment.'))
    } finally {
      setSaving(false)
    }
  }

  const updateEndingDraft = (actionId: number, patch: Partial<ActingEndDraft>) => {
    setEndingDrafts((prev) => ({
      ...prev,
      [actionId]: { ...(prev[actionId] ?? defaultEndingDraft()), ...patch },
    }))
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Career Events"
        subtitle="Promotions, demotions, and acting appointments anchored to the new lifecycle spine."
        icon={BriefcaseBusiness}
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
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All actions</option>
          <option value="PROMOTION">Promotion</option>
          <option value="DEMOTION">Demotion</option>
          <option value="ACTING_APPOINTMENT">Acting Appointment</option>
          <option value="ACTING_APPOINTMENT_END">Acting Appointment End</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="EFFECTIVE">Effective</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={() => {
            setShowForm((prev) => !prev)
            setError(null)
            setNotice(null)
          }}
          className="ml-auto rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          {showForm ? 'Close Form' : 'Create Career Action'}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New Career Action</p>
              <h2 className="mt-2 text-xl font-display font-semibold text-slate-100">Prepare the next assignment move</h2>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-300"
            >
              Hide form
            </button>
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Action Type</label>
              <select value={form.action_type} onChange={(event) => setField('action_type', event.target.value as CareerActionForm['action_type'])} className={fieldClassName}>
                <option value="PROMOTION">Promotion</option>
                <option value="DEMOTION">Demotion</option>
                <option value="ACTING_APPOINTMENT">Acting Appointment</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Status</label>
              <select value={form.status} onChange={(event) => setField('status', event.target.value as CareerActionForm['status'])} className={fieldClassName}>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Effective Date</label>
              <input type="date" value={form.effective_date} onChange={(event) => setField('effective_date', event.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Target Department</label>
              <select value={form.to_department} onChange={(event) => setField('to_department', event.target.value)} className={fieldClassName}>
                <option value="">Keep current / auto-detect</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Target Position</label>
              <select value={form.to_position_ref} onChange={(event) => setField('to_position_ref', event.target.value)} className={fieldClassName}>
                <option value="">Select position</option>
                {filteredPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Target Grade</label>
              <input value={form.target_position_grade} onChange={(event) => setField('target_position_grade', event.target.value)} className={fieldClassName} placeholder="Optional grade change" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Target Salary Scale</label>
              <input value={form.target_salary_scale} onChange={(event) => setField('target_salary_scale', event.target.value)} className={fieldClassName} placeholder="Optional salary scale" />
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Reason</label>
              <textarea value={form.reason} onChange={(event) => setField('reason', event.target.value)} rows={2} className={fieldClassName} placeholder="Why is this career action being raised?" />
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Notes</label>
              <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={2} className={fieldClassName} placeholder="Optional operational notes." />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => void handleCreate()}
              disabled={saving}
              className="rounded-xl bg-violet-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create Career Action'}
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-2xl p-10 text-center text-sm text-slate-400" style={GLASS}>
          Loading career events...
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm text-slate-400" style={GLASS}>
          No career actions match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map((action) => {
            const isExpanded = expandedActionId === action.id
            const endingDraft = endingDrafts[action.id] ?? defaultEndingDraft()
            const canApply = action.status !== 'EFFECTIVE' && action.status !== 'CANCELLED' && action.action_type !== 'ACTING_APPOINTMENT_END'
            const canEndActing = action.action_type === 'ACTING_APPOINTMENT' && action.status === 'EFFECTIVE'

            return (
              <section key={action.id} className="overflow-hidden rounded-2xl" style={GLASS}>
                <button
                  type="button"
                  onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                  className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/12">
                    {action.action_type === 'PROMOTION' ? <ArrowUpRight size={18} className="text-emerald-300" /> : null}
                    {action.action_type === 'DEMOTION' ? <ArrowDownRight size={18} className="text-amber-300" /> : null}
                    {action.action_type === 'ACTING_APPOINTMENT' ? <ShieldCheck size={18} className="text-violet-300" /> : null}
                    {action.action_type === 'ACTING_APPOINTMENT_END' ? <CirclePlay size={18} className="text-slate-300" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-100">{action.employee_name}</p>
                      <ActionBadge actionType={action.action_type} />
                      <StatusBadge status={action.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {action.to_department_name || action.from_department_name || 'Unassigned department'} / {action.to_position_ref_title || action.to_position_title || action.from_position_ref_title || action.from_position_title || 'Current position'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Effective {formatDate(action.effective_date)}</p>
                    <p className="mt-1">Raised {formatDateTime(action.created_at)}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded ? (
                  <div className="space-y-4 border-t border-white/[0.05] px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <Link to={`/modules/hr/employees/${action.employee}`} className="text-violet-300 hover:text-violet-200">
                        Open employee profile
                      </Link>
                      <span>Requested by {action.requested_by_name || 'System'}</span>
                      {action.applied_by_name ? <span>Applied by {action.applied_by_name}</span> : null}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-widest text-slate-500">From</p>
                        <p className="mt-2 text-sm text-slate-200">{action.from_department_name || 'Current department'}</p>
                        <p className="mt-1 text-sm text-slate-400">{action.from_position_ref_title || action.from_position_title || 'Current position'}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-widest text-slate-500">To</p>
                        <p className="mt-2 text-sm text-slate-200">{action.to_department_name || action.from_department_name || 'No department change'}</p>
                        <p className="mt-1 text-sm text-slate-400">{action.to_position_ref_title || action.to_position_title || 'No position change'}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3 text-sm">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Grade</p>
                        <p className="mt-2 text-slate-200">{action.target_position_grade || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3 text-sm">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Salary Scale</p>
                        <p className="mt-2 text-slate-200">{action.target_salary_scale || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3 text-sm sm:col-span-2">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Reason</p>
                        <p className="mt-2 text-slate-200">{action.reason || 'No reason recorded.'}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3 text-sm sm:col-span-2 xl:col-span-4">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Notes</p>
                        <p className="mt-2 whitespace-pre-wrap text-slate-200">{action.notes || 'No notes recorded.'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canApply ? (
                        <button
                          onClick={() => void handleApply(action.id)}
                          disabled={saving}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                        >
                          {saving ? 'Working...' : 'Apply Action'}
                        </button>
                      ) : null}
                    </div>

                    {canEndActing ? (
                      <div className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-500/8 p-4">
                        <div>
                          <p className="text-sm font-semibold text-violet-100">End Acting Appointment</p>
                          <p className="mt-1 text-xs text-violet-200/75">
                            This creates the explicit acting-end lifecycle event and restores the prior assignment snapshot.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            type="date"
                            value={endingDraft.effective_date}
                            onChange={(event) => updateEndingDraft(action.id, { effective_date: event.target.value })}
                            className={fieldClassName}
                          />
                          <input
                            value={endingDraft.notes}
                            onChange={(event) => updateEndingDraft(action.id, { notes: event.target.value })}
                            className={fieldClassName}
                            placeholder="Optional notes for the acting hand-back"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => void handleEndActing(action.id)}
                            disabled={saving}
                            className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {saving ? 'Working...' : 'End Acting Appointment'}
                          </button>
                        </div>
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
