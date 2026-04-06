import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronDown, Scale, ShieldAlert } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { extractApiErrorMessage } from '../../utils/forms'
import {
  type DisciplinaryCase,
  type EmployeeRef,
  formatDate,
  formatDateTime,
  formatLabel,
  getEmployeeDisplayName,
  toArray,
} from './hrLifecycleShared'

type DisciplineForm = {
  employee: string
  category: string
  opened_on: string
  incident_date: string
  summary: string
  details: string
  notes: string
}

type CloseDraft = {
  outcome: 'ADVISORY' | 'WARNING' | 'SUSPENSION' | 'DISMISSAL' | 'EXONERATED'
  effective_date: string
  notes: string
}

const GLASS = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.07)',
}

const fieldClassName =
  'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-rose-400'

const getToday = () => new Date().toISOString().slice(0, 10)

const buildInitialForm = (employee = ''): DisciplineForm => ({
  employee,
  category: '',
  opened_on: getToday(),
  incident_date: '',
  summary: '',
  details: '',
  notes: '',
})

const buildCloseDraft = (): CloseDraft => ({
  outcome: 'WARNING',
  effective_date: getToday(),
  notes: '',
})

const statusTone: Record<string, string> = {
  OPEN: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  CLOSED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  CANCELLED: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

const outcomeTone: Record<string, string> = {
  ADVISORY: 'bg-slate-500/12 text-slate-200',
  WARNING: 'bg-amber-500/12 text-amber-200',
  SUSPENSION: 'bg-rose-500/12 text-rose-200',
  DISMISSAL: 'bg-rose-500/18 text-rose-100',
  EXONERATED: 'bg-emerald-500/12 text-emerald-200',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[status] ?? statusTone.OPEN}`}>
      {formatLabel(status)}
    </span>
  )
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (!outcome) {
    return <span className="inline-flex rounded-full bg-slate-500/12 px-2.5 py-0.5 text-xs font-semibold text-slate-200">Outcome Pending</span>
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${outcomeTone[outcome] ?? outcomeTone.WARNING}`}>
      {formatLabel(outcome)}
    </span>
  )
}

export default function HrDisciplinePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const preselectedEmployee = searchParams.get('employee') ?? ''
  const [cases, setCases] = useState<DisciplinaryCase[]>([])
  const [employees, setEmployees] = useState<EmployeeRef[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(Boolean(preselectedEmployee))
  const [form, setForm] = useState<DisciplineForm>(buildInitialForm(preselectedEmployee))
  const [statusFilter, setStatusFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState(preselectedEmployee)
  const [expandedCaseId, setExpandedCaseId] = useState<number | null>(null)
  const [closeDrafts, setCloseDrafts] = useState<Record<number, CloseDraft>>({})

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [casesRes, employeesRes] = await Promise.all([
        apiClient.get<DisciplinaryCase[] | { results: DisciplinaryCase[] }>('/hr/disciplinary-cases/'),
        apiClient.get<EmployeeRef[] | { results: EmployeeRef[] }>('/hr/employees/', { params: { include_archived: 1 } }),
      ])
      setCases(toArray(casesRes.data))
      setEmployees(toArray(employeesRes.data))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load discipline workspace.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredCases = useMemo(() => {
    return cases.filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) return false
      if (outcomeFilter && entry.outcome !== outcomeFilter) return false
      if (employeeFilter && String(entry.employee) !== employeeFilter) return false
      return true
    })
  }, [cases, employeeFilter, outcomeFilter, statusFilter])

  const stats = useMemo(
    () => [
      { label: 'Open', value: cases.filter((entry) => entry.status === 'OPEN').length, color: '#fbbf24' },
      { label: 'Closed', value: cases.filter((entry) => entry.status === 'CLOSED').length, color: '#6ee7b7' },
      { label: 'Suspensions', value: cases.filter((entry) => entry.outcome === 'SUSPENSION').length, color: '#fda4af' },
      { label: 'Dismissals', value: cases.filter((entry) => entry.outcome === 'DISMISSAL').length, color: '#fecdd3' },
    ],
    [cases],
  )

  const setField = <K extends keyof DisciplineForm>(key: K, value: DisciplineForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEmployeeFilterChange = (value: string) => {
    setEmployeeFilter(value)
    if (value) setSearchParams({ employee: value })
    else setSearchParams({})
  }

  const handleCreate = async () => {
    if (!form.employee || !form.category || !form.summary) {
      setError('Employee, case category, and summary are required.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload: Record<string, unknown> = {
        employee: Number(form.employee),
        category: form.category,
        opened_on: form.opened_on,
        summary: form.summary,
        details: form.details,
        notes: form.notes,
      }
      if (form.incident_date) payload.incident_date = form.incident_date
      await apiClient.post('/hr/disciplinary-cases/', payload)
      setNotice('Disciplinary case opened.')
      setShowForm(false)
      setForm(buildInitialForm(form.employee))
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to open disciplinary case.'))
    } finally {
      setSaving(false)
    }
  }

  const updateCloseDraft = (caseId: number, patch: Partial<CloseDraft>) => {
    setCloseDrafts((prev) => ({
      ...prev,
      [caseId]: { ...(prev[caseId] ?? buildCloseDraft()), ...patch },
    }))
  }

  const handleCloseCase = async (caseId: number) => {
    const draft = closeDrafts[caseId] ?? buildCloseDraft()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/disciplinary-cases/${caseId}/close/`, draft)
      setNotice(
        draft.outcome === 'DISMISSAL'
          ? 'Case closed. Dismissal has been routed into the structured exit workflow.'
          : 'Disciplinary case closed.',
      )
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to close disciplinary case.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="rose"
        title="Discipline"
        subtitle="Open cases, capture formal outcomes, and route dismissals into the controlled exit path."
        icon={Scale}
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
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={outcomeFilter}
          onChange={(event) => setOutcomeFilter(event.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All outcomes</option>
          <option value="ADVISORY">Advisory</option>
          <option value="WARNING">Warning</option>
          <option value="SUSPENSION">Suspension</option>
          <option value="DISMISSAL">Dismissal</option>
          <option value="EXONERATED">Exonerated</option>
        </select>
        <button
          onClick={() => {
            setShowForm((prev) => !prev)
            setError(null)
            setNotice(null)
          }}
          className="ml-auto rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
        >
          {showForm ? 'Close Form' : 'Open Case'}
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
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New Case</p>
            <h2 className="mt-2 text-xl font-display font-semibold text-slate-100">Record a disciplinary matter</h2>
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Category</label>
              <input value={form.category} onChange={(event) => setField('category', event.target.value)} className={fieldClassName} placeholder="E.g. Gross misconduct" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Opened On</label>
              <input type="date" value={form.opened_on} onChange={(event) => setField('opened_on', event.target.value)} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Incident Date</label>
              <input type="date" value={form.incident_date} onChange={(event) => setField('incident_date', event.target.value)} className={fieldClassName} />
            </div>
            <div className="sm:col-span-2 xl:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Summary</label>
              <input value={form.summary} onChange={(event) => setField('summary', event.target.value)} className={fieldClassName} placeholder="Short case summary" />
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Details</label>
              <textarea value={form.details} onChange={(event) => setField('details', event.target.value)} rows={3} className={fieldClassName} placeholder="Incident details and formal context." />
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Notes</label>
              <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={2} className={fieldClassName} placeholder="Optional internal notes." />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => void handleCreate()} disabled={saving} className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Open Disciplinary Case'}
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-2xl p-10 text-center text-sm text-slate-400" style={GLASS}>
          Loading discipline cases...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm text-slate-400" style={GLASS}>
          No disciplinary cases match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((entry) => {
            const isExpanded = expandedCaseId === entry.id
            const closeDraft = closeDrafts[entry.id] ?? buildCloseDraft()

            return (
              <section key={entry.id} className="overflow-hidden rounded-2xl" style={GLASS}>
                <button
                  type="button"
                  onClick={() => setExpandedCaseId(isExpanded ? null : entry.id)}
                  className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/12">
                    {entry.status === 'OPEN' ? <ShieldAlert size={18} className="text-rose-200" /> : <AlertTriangle size={18} className="text-emerald-200" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-100">{entry.case_number}</p>
                      <StatusBadge status={entry.status} />
                      <OutcomeBadge outcome={entry.outcome} />
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{entry.employee_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{entry.category}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Opened {formatDate(entry.opened_on)}</p>
                    <p className="mt-1">Updated {formatDateTime(entry.updated_at)}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded ? (
                  <div className="space-y-4 border-t border-white/[0.05] px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <Link to={`/modules/hr/employees/${entry.employee}`} className="text-rose-300 hover:text-rose-200">
                        Open employee profile
                      </Link>
                      <span>Opened by {entry.opened_by_name || 'System'}</span>
                      {entry.closed_by_name ? <span>Closed by {entry.closed_by_name}</span> : null}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Summary</p>
                        <p className="mt-2 text-sm text-slate-100">{entry.summary}</p>
                        <p className="mt-3 text-xs text-slate-400">Incident date: {formatDate(entry.incident_date)}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Details</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{entry.details || 'No additional details recorded.'}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-4 lg:col-span-2">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Notes</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{entry.notes || 'No notes recorded.'}</p>
                      </div>
                    </div>

                    {entry.status === 'OPEN' ? (
                      <div className="space-y-3 rounded-xl border border-rose-500/25 bg-rose-500/8 p-4">
                        <div>
                          <p className="text-sm font-semibold text-rose-100">Close Case</p>
                          <p className="mt-1 text-xs text-rose-200/75">
                            Suspension updates the live employee state immediately. Dismissal routes into the exit workflow before final archive.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select value={closeDraft.outcome} onChange={(event) => updateCloseDraft(entry.id, { outcome: event.target.value as CloseDraft['outcome'] })} className={fieldClassName}>
                            <option value="ADVISORY">Advisory</option>
                            <option value="WARNING">Warning</option>
                            <option value="SUSPENSION">Suspension</option>
                            <option value="DISMISSAL">Dismissal</option>
                            <option value="EXONERATED">Exonerated</option>
                          </select>
                          <input type="date" value={closeDraft.effective_date} onChange={(event) => updateCloseDraft(entry.id, { effective_date: event.target.value })} className={fieldClassName} />
                          <textarea value={closeDraft.notes} onChange={(event) => updateCloseDraft(entry.id, { notes: event.target.value })} rows={2} className={`${fieldClassName} sm:col-span-2`} placeholder="Closure notes" />
                        </div>
                        <div className="flex justify-end">
                          <button onClick={() => void handleCloseCase(entry.id)} disabled={saving} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                            {saving ? 'Working...' : 'Close Case'}
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
