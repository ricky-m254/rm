import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { User, CheckCircle2, XCircle, Clock, Plus, Pencil, Trash2, X } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface Leave {
  id: number
  student: number
  student_name: string
  leave_from: string
  leave_to: string
  reason: string
  approved_by: number | null
  approved_by_name: string | null
  status: 'Pending' | 'Approved' | 'Rejected'
}

interface Student { id: number; first_name: string; last_name: string; admission_number: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const emptyForm = () => ({
  student: '',
  leave_from: new Date().toISOString().split('T')[0],
  leave_to: new Date().toISOString().split('T')[0],
  reason: '',
})

export default function HostelLeavePage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Leave | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [rl, rs] = await Promise.all([
        apiClient.get('/hostel/leave/'),
        apiClient.get('/students/'),
      ])
      setLeaves(asArray(rl.data))
      setStudents(asArray(rs.data))
    } catch { setError('Unable to load leave requests.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filtered = filterStatus ? leaves.filter(l => l.status === filterStatus) : leaves

  const openCreate = () => {
    setEditing(null); setForm(emptyForm()); setError(null); setModal(true)
  }

  const openEdit = (l: Leave) => {
    setEditing(l)
    setForm({ student: String(l.student), leave_from: l.leave_from, leave_to: l.leave_to, reason: l.reason })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!form.student || !form.leave_from || !form.leave_to || !form.reason.trim()) {
      setError('All fields are required.')
      return
    }
    setSaving(true); setError(null)
    try {
      const payload = {
        student: Number(form.student),
        leave_from: form.leave_from,
        leave_to: form.leave_to,
        reason: form.reason.trim(),
      }
      if (editing) {
        await apiClient.put(`/hostel/leave/${editing.id}/`, payload)
        setNotice('Leave request updated.')
      } else {
        await apiClient.post('/hostel/leave/', payload)
        setNotice('Leave request submitted.')
      }
      setModal(false)
      await load()
    } catch { setError('Unable to save leave request.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this leave request?')) return
    try { await apiClient.delete(`/hostel/leave/${id}/`); setNotice('Leave request deleted.'); await load() }
    catch { setError('Unable to delete leave request.') }
  }

  const updateStatus = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await apiClient.patch(`/hostel/leave/${id}/`, { status })
      setNotice(`Leave request ${status.toLowerCase()}.`)
      await load()
    } catch { setError(`Unable to ${status.toLowerCase()} leave request.`) }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const pending = leaves.filter(l => l.status === 'Pending').length

  return (
    <div className="space-y-6">
      <PageHero
        badge="HOSTEL"
        badgeColor="sky"
        title="Hostel Leave"
        subtitle="Student exeat and weekend leave management"
        icon="🏠"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Hostel Leave Requests</h1>
          <p className="mt-1 text-sm text-slate-400">Manage student leave of absence from the dormitory.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <Plus className="h-4 w-4" />
          Request Leave
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      {pending > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-300">
          {pending} leave request{pending > 1 ? 's' : ''} pending approval.
        </div>
      )}

      <div className="flex items-center gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300">
          <option value="">All Requests</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel shadow-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.025]">
              <th className="px-6 py-4 font-semibold text-slate-300">Student</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Period</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Reason</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Approver</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading leave requests...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No leave requests found.</td></tr>
            ) : filtered.map(leave => (
              <tr key={leave.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold text-slate-200">{leave.student_name || `Student #${leave.student}`}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">{leave.leave_from}</span>
                    <span className="text-xs text-slate-500">to {leave.leave_to}</span>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate text-slate-400 italic">"{leave.reason}"</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      leave.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                      {leave.status === 'Pending' && <Clock className="h-3 w-3" />}
                      {leave.status === 'Approved' && <CheckCircle2 className="h-3 w-3" />}
                      {leave.status === 'Rejected' && <XCircle className="h-3 w-3" />}
                      {leave.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{leave.approved_by_name || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {leave.status === 'Pending' && (
                      <>
                        <button onClick={() => updateStatus(leave.id, 'Approved')} className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20 transition" title="Approve">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateStatus(leave.id, 'Rejected')} className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20 transition" title="Reject">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => openEdit(leave)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(leave.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Leave Request' : 'Request Leave'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Student *</label>
              <select value={form.student} onChange={e => setF('student', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{`${s.first_name} ${s.last_name}`.trim()} ({s.admission_number})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Leave From *</label>
                <input type="date" value={form.leave_from} onChange={e => setF('leave_from', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Leave To *</label>
                <input type="date" value={form.leave_to} onChange={e => setF('leave_to', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Reason *</label>
              <textarea value={form.reason} onChange={e => setF('reason', e.target.value)} rows={3} placeholder="State the reason for leave..." className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Submit Request'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
