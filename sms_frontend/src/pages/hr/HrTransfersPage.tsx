import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { ArrowRightLeft, Plus, X, CheckCircle2, AlertCircle, ChevronDown, Building2 } from 'lucide-react'

type Department = { id: number; name: string }
type EmployeeRef = { id: number; first_name: string; last_name: string; employee_id: string; designation?: string }

type StaffTransfer = {
  id: number
  employee: number
  employee_name: string
  transfer_type: 'Internal' | 'External'
  from_department: number | null
  from_department_name: string
  from_position: string
  to_department: number | null
  to_department_name: string
  to_position: string
  destination_school: string
  reason: string
  effective_date: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled'
  handover_completed: boolean
  clearance_completed: boolean
  notes: string
  created_at: string
}

type TransferFormState = {
  employee: string
  transfer_type: 'Internal' | 'External'
  from_department: string
  from_position: string
  to_department: string
  to_position: string
  destination_school: string
  reason: string
  effective_date: string
  notes: string
}

const BLANK: TransferFormState = {
  employee: '',
  transfer_type: 'Internal',
  from_department: '',
  from_position: '',
  to_department: '',
  to_position: '',
  destination_school: '',
  reason: '',
  effective_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400 placeholder:text-slate-600 transition'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    Approved: 'text-sky-400 bg-sky-400/10 border-sky-400/25',
    Rejected: 'text-rose-400 bg-rose-400/10 border-rose-400/25',
    Completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
    Cancelled: 'text-slate-400 bg-slate-400/10 border-slate-400/25',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'text-slate-400'}`}>
      {status}
    </span>
  )
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function HrTransfersPage() {
  const [transfers, setTransfers] = useState<StaffTransfer[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<EmployeeRef[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TransferFormState>(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, dRes, eRes] = await Promise.all([
        apiClient.get('/hr/transfers/'),
        apiClient.get('/hr/departments/'),
        apiClient.get('/hr/employees/', { params: { page_size: 500 } }),
      ])
      setTransfers(asArray(tRes.data))
      setDepartments(asArray(dRes.data))
      setEmployees(asArray(eRes.data))
    } catch { setError('Unable to load staff transfers.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filtered = transfers.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (typeFilter && t.transfer_type !== typeFilter) return false
    return true
  })

  const setF = (k: keyof typeof BLANK, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.employee || !form.effective_date) {
      setError('Employee and effective date are required.'); return
    }
    setSaving(true); setError(null)
    try {
      const payload: Record<string, unknown> = {
        employee: Number(form.employee),
        transfer_type: form.transfer_type,
        from_position: form.from_position,
        to_position: form.to_position,
        destination_school: form.destination_school,
        reason: form.reason,
        effective_date: form.effective_date,
        notes: form.notes,
      }
      if (form.from_department) payload.from_department = Number(form.from_department)
      if (form.to_department) payload.to_department = Number(form.to_department)
      await apiClient.post('/hr/transfers/', payload)
      setNotice('Staff transfer request created.'); setShowForm(false); setForm(BLANK)
      await load()
    } catch { setError('Failed to create transfer request.') }
    finally { setSaving(false) }
  }

  const updateChecklist = async (id: number, field: string, value: boolean) => {
    try {
      await apiClient.patch(`/hr/transfers/${id}/`, { [field]: value })
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
    } catch { setError('Failed to update checklist item.') }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient.patch(`/hr/transfers/${id}/`, { status })
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: status as StaffTransfer['status'] } : t))
      setNotice(`Transfer status updated to ${status}.`)
    } catch { setError('Failed to update status.') }
  }

  const STATUSES = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'] as const

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Staff Transfers"
        subtitle="Manage internal and external staff transfer requests, approvals, and clearance tracking."
        icon="🔄"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <option value="">All Types</option>
          <option value="Internal">Internal</option>
          <option value="External">External</option>
        </select>
        <div className="ml-auto">
          <button onClick={() => { setShowForm(true); setError(null) }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 hover:bg-violet-400 px-4 py-2 text-sm font-bold text-white transition">
            <Plus size={16} /> New Transfer Request
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={16} />{error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={16} />{notice}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-4" style={GLASS}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-100 text-lg flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-violet-400" /> New Staff Transfer Request
            </h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400 hover:text-white" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Employee *</label>
              <select value={form.employee} onChange={e => setF('employee', e.target.value)} className={cls}>
                <option value="">Select employee…</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Transfer Type *</label>
              <select value={form.transfer_type} onChange={e => setF('transfer_type', e.target.value)} className={cls}>
                <option value="Internal">Internal — Same school, change of department/role</option>
                <option value="External">External — Different school or county</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">From Department</label>
              <select value={form.from_department} onChange={e => setF('from_department', e.target.value)} className={cls}>
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">From Position / Role</label>
              <input value={form.from_position} onChange={e => setF('from_position', e.target.value)} className={cls} placeholder="e.g. Class Teacher" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">To Department</label>
              <select value={form.to_department} onChange={e => setF('to_department', e.target.value)} className={cls}>
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">To Position / Role</label>
              <input value={form.to_position} onChange={e => setF('to_position', e.target.value)} className={cls} placeholder="e.g. Head of Department" />
            </div>
            {form.transfer_type === 'External' && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Destination School</label>
                <input value={form.destination_school} onChange={e => setF('destination_school', e.target.value)} className={cls} placeholder="Name of destination school" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Effective Date *</label>
              <input type="date" value={form.effective_date} onChange={e => setF('effective_date', e.target.value)} className={cls} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Reason</label>
              <textarea value={form.reason} onChange={e => setF('reason', e.target.value)} rows={2} className={cls} placeholder="Reason for transfer…" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className={cls} placeholder="Additional notes…" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-xl border border-white/[0.09] text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={() => void handleCreate()} disabled={saving}
              className="px-6 py-2 text-sm font-bold rounded-xl bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-50 transition">
              {saving ? 'Submitting…' : 'Submit Transfer Request'}
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATUSES.map(s => {
          const count = transfers.filter(t => t.status === s).length
          const colors: Record<string, string> = {
            Pending: 'text-amber-400', Approved: 'text-sky-400',
            Rejected: 'text-rose-400', Completed: 'text-emerald-400', Cancelled: 'text-slate-400'
          }
          return (
            <div key={s} className="rounded-2xl p-4" style={GLASS}>
              <p className="text-xs text-slate-400">{s}</p>
              <p className={`text-2xl font-bold mt-1 ${colors[s]}`}>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Transfer List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading staff transfer records…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={GLASS}>
          <ArrowRightLeft size={40} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">No staff transfer requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="rounded-2xl overflow-hidden" style={GLASS}>
              <div
                className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100">{t.employee_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.from_department_name || '—'} → {t.to_department_name || t.destination_school || '—'}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${t.transfer_type === 'Internal' ? 'text-sky-400 bg-sky-400/10' : 'text-violet-400 bg-violet-400/10'}`}>
                  {t.transfer_type}
                </span>
                <StatusBadge status={t.status} />
                <span className="text-xs text-slate-500">{t.effective_date}</span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${expanded === t.id ? 'rotate-180' : ''}`} />
              </div>

              {expanded === t.id && (
                <div className="border-t border-white/[0.05] px-5 py-4 space-y-4">
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">From Position</p>
                      <p className="text-slate-200 mt-0.5">{t.from_position || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">To Position</p>
                      <p className="text-slate-200 mt-0.5">{t.to_position || '—'}</p>
                    </div>
                    {t.transfer_type === 'External' && (
                      <div>
                        <p className="text-xs text-slate-500">Destination School</p>
                        <p className="text-slate-200 mt-0.5">{t.destination_school || '—'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Reason</p>
                      <p className="text-slate-200 mt-0.5">{t.reason || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Notes</p>
                      <p className="text-slate-200 mt-0.5">{t.notes || '—'}</p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Handover Checklist</p>
                    <div className="flex flex-wrap gap-4">
                      {([
                        { key: 'handover_completed', label: 'Handover completed' },
                        { key: 'clearance_completed', label: 'Clearance form signed' },
                      ] as const).map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t[item.key]}
                            onChange={e => void updateChecklist(t.id, item.key, e.target.checked)}
                            className="h-4 w-4 accent-violet-500 rounded"
                          />
                          <span className={`text-sm ${t[item.key] ? 'text-emerald-300 line-through opacity-75' : 'text-slate-300'}`}>
                            {item.label}
                          </span>
                          {t[item.key] && <CheckCircle2 size={13} className="text-emerald-400" />}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status Control */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-slate-500">Update status:</span>
                    {STATUSES.map(s => (
                      <button key={s} disabled={t.status === s} onClick={() => void updateStatus(t.id, s)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                          t.status === s
                            ? 'opacity-40 cursor-default border-white/[0.09] text-slate-400'
                            : 'border-white/[0.09] text-slate-300 hover:border-violet-400 hover:text-violet-300'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
