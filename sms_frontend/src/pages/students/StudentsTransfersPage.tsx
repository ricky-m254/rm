import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { ArrowRightLeft, Plus, X, CheckCircle2, Clock, XCircle, AlertCircle, FileText, ChevronDown } from 'lucide-react'

type StudentRef = { id: number; admission_number: string; first_name: string; last_name: string }

type StudentTransfer = {
  id: number
  student: number
  student_name: string
  direction: 'IN' | 'OUT'
  other_school: string
  reason: string
  effective_date: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled'
  clearance_completed: boolean
  academic_records_issued: boolean
  transfer_letter_issued: boolean
  fee_balance_cleared: boolean
  notes: string
  created_at: string
}

const BLANK = {
  student: '',
  direction: 'OUT' as const,
  other_school: '',
  reason: '',
  effective_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 placeholder:text-slate-600 transition'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    Pending: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/25', icon: <Clock size={12} /> },
    Approved: { color: 'text-sky-400 bg-sky-400/10 border-sky-400/25', icon: <CheckCircle2 size={12} /> },
    Rejected: { color: 'text-rose-400 bg-rose-400/10 border-rose-400/25', icon: <XCircle size={12} /> },
    Completed: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', icon: <CheckCircle2 size={12} /> },
    Cancelled: { color: 'text-slate-400 bg-slate-400/10 border-slate-400/25', icon: <AlertCircle size={12} /> },
  }
  const s = map[status] ?? { color: 'text-slate-400 bg-slate-400/10 border-slate-400/25', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.color}`}>
      {s.icon}{status}
    </span>
  )
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function StudentsTransfersPage() {
  const [transfers, setTransfers] = useState<StudentTransfer[]>([])
  const [students, setStudents] = useState<StudentRef[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [dirFilter, setDirFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, sRes] = await Promise.all([
        apiClient.get('/student-transfers/'),
        apiClient.get('/students/', { params: { page_size: 500 } }),
      ])
      setTransfers(asArray(tRes.data))
      setStudents(asArray(sRes.data))
    } catch { setError('Unable to load transfers.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filtered = transfers.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (dirFilter && t.direction !== dirFilter) return false
    return true
  })

  const setF = (k: keyof typeof BLANK, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.student || !form.other_school || !form.effective_date) {
      setError('Student, school name, and effective date are required.'); return
    }
    setSaving(true); setError(null)
    try {
      await apiClient.post('/student-transfers/', form)
      setNotice('Transfer request created.'); setShowForm(false); setForm(BLANK)
      await load()
    } catch { setError('Failed to create transfer request.') }
    finally { setSaving(false) }
  }

  const updateChecklist = async (id: number, field: string, value: boolean) => {
    try {
      await apiClient.patch(`/student-transfers/${id}/`, { [field]: value })
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
    } catch { setError('Failed to update checklist item.') }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient.patch(`/student-transfers/${id}/`, { status })
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: status as StudentTransfer['status'] } : t))
      setNotice(`Transfer status updated to ${status}.`)
    } catch { setError('Failed to update status.') }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="STUDENTS"
        badgeColor="sky"
        title="Student Transfers"
        subtitle="Manage outgoing and incoming student transfer requests with clearance tracking."
        icon="🔄"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <option value="">All Statuses</option>
          {['Pending','Approved','Rejected','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={dirFilter} onChange={e => setDirFilter(e.target.value)}
          className="rounded-xl border border-white/[0.09] bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <option value="">All Directions</option>
          <option value="OUT">Outgoing</option>
          <option value="IN">Incoming</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setShowForm(true); setError(null) }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition">
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
            <h2 className="font-bold text-slate-100 text-lg">New Transfer Request</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400 hover:text-white" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Student *</label>
              <select value={form.student} onChange={e => setF('student', e.target.value)} className={cls}>
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Direction *</label>
              <select value={form.direction} onChange={e => setF('direction', e.target.value)} className={cls}>
                <option value="OUT">Outgoing — Student leaving this school</option>
                <option value="IN">Incoming — Student joining from another school</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Other School Name *</label>
              <input value={form.other_school} onChange={e => setF('other_school', e.target.value)} className={cls} placeholder="e.g. Nairobi Academy" />
            </div>
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
              className="px-6 py-2 text-sm font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 transition">
              {saving ? 'Creating…' : 'Create Transfer'}
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['Pending','Approved','Completed','Cancelled'] as const).map(s => {
          const count = transfers.filter(t => t.status === s).length
          const colors: Record<string, string> = {
            Pending: 'text-amber-400', Approved: 'text-sky-400',
            Completed: 'text-emerald-400', Cancelled: 'text-slate-400'
          }
          return (
            <div key={s} className="rounded-2xl p-4" style={GLASS}>
              <p className="text-xs text-slate-400">{s}</p>
              <p className={`text-3xl font-bold mt-1 ${colors[s]}`}>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Transfer List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading transfer records…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={GLASS}>
          <ArrowRightLeft size={40} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">No transfer requests found.</p>
          <p className="text-xs text-slate-600 mt-1">Use the button above to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="rounded-2xl overflow-hidden" style={GLASS}>
              <div
                className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100 truncate">{t.student_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.direction === 'OUT' ? '→ Outgoing to' : '← Incoming from'} {t.other_school}
                  </p>
                </div>
                <StatusBadge status={t.status} />
                <span className="text-xs text-slate-500">{t.effective_date}</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform ${expanded === t.id ? 'rotate-180' : ''}`}
                />
              </div>

              {expanded === t.id && (
                <div className="border-t border-white/[0.05] px-5 py-4 space-y-4">
                  {/* Details */}
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Reason</p>
                      <p className="text-slate-300">{t.reason || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Notes</p>
                      <p className="text-slate-300">{t.notes || '—'}</p>
                    </div>
                  </div>

                  {/* Clearance Checklist */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={13} /> Clearance Checklist
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {([
                        { key: 'clearance_completed', label: 'Clearance form signed' },
                        { key: 'academic_records_issued', label: 'Academic records issued' },
                        { key: 'transfer_letter_issued', label: 'Transfer letter issued' },
                        { key: 'fee_balance_cleared', label: 'Fee balance cleared' },
                      ] as const).map(item => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2 hover:bg-white/[0.03]">
                          <input
                            type="checkbox"
                            checked={t[item.key]}
                            onChange={e => void updateChecklist(t.id, item.key, e.target.checked)}
                            className="h-4 w-4 accent-emerald-500 rounded"
                          />
                          <span className={`text-sm ${t[item.key] ? 'text-emerald-300 line-through opacity-75' : 'text-slate-300'}`}>
                            {item.label}
                          </span>
                          {t[item.key] && <CheckCircle2 size={13} className="text-emerald-400 ml-auto" />}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status Control */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-slate-500">Update status:</span>
                    {['Pending','Approved','Rejected','Completed','Cancelled'].map(s => (
                      <button
                        key={s}
                        disabled={t.status === s}
                        onClick={() => void updateStatus(t.id, s)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                          t.status === s
                            ? 'opacity-40 cursor-default border-white/[0.09] text-slate-400'
                            : 'border-white/[0.09] text-slate-300 hover:border-emerald-400 hover:text-emerald-300'
                        }`}
                      >
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
