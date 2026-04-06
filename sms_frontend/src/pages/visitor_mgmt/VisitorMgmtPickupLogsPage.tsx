import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Plus, Trash2 } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const INP = 'w-full rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50'
const SEL = 'w-full rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50'

type Student = { id: number; full_name: string; admission_number: string }
type AuthPickup = { id: number; guardian_name: string; student: number }
type PickupLog = {
  id: number
  student: number
  student_name?: string
  picked_up_by?: number
  picked_up_by_name?: string
  unauthorized_name?: string
  authorized: boolean
  pickup_time: string
  notes: string
}

type Form = {
  student: string
  picked_up_by: string
  unauthorized_name: string
  authorized: boolean
  notes: string
}

const EMPTY: Form = { student: '', picked_up_by: '', unauthorized_name: '', authorized: true, notes: '' }

export default function VisitorMgmtPickupLogsPage() {
  const [logs, setLogs] = useState<PickupLog[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [authPickups, setAuthPickups] = useState<AuthPickup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [lr, sr, ar] = await Promise.all([
        apiClient.get<{ results?: PickupLog[] } | PickupLog[]>('/visitors/pickup-logs/'),
        apiClient.get<{ results?: Student[] } | Student[]>('/students/'),
        apiClient.get<{ results?: AuthPickup[] } | AuthPickup[]>('/visitors/authorized-pickups/'),
      ])
      const l = lr.data; setLogs(Array.isArray(l) ? l : (l as { results?: PickupLog[] }).results ?? [])
      const s = sr.data; setStudents(Array.isArray(s) ? s : (s as { results?: Student[] }).results ?? [])
      const a = ar.data; setAuthPickups(Array.isArray(a) ? a : (a as { results?: AuthPickup[] }).results ?? [])
    } catch {
      setError('Unable to load pickup logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 4000) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      student: Number(form.student),
      picked_up_by: form.picked_up_by ? Number(form.picked_up_by) : null,
      unauthorized_name: form.unauthorized_name || null,
      authorized: form.authorized,
      notes: form.notes,
    }
    try {
      await apiClient.post('/visitors/pickup-logs/', payload)
      flash('Pickup log recorded.')
      setForm(EMPTY)
      setShowForm(false)
      void load()
    } catch {
      setError('Unable to record pickup log.')
    } finally {
      setSaving(false)
    }
  }

  const deleteLog = async (id: number) => {
    if (!window.confirm('Delete this pickup log?')) return
    setDeletingId(id)
    try {
      await apiClient.delete(`/visitors/pickup-logs/${id}/`)
      flash('Log deleted.')
      setLogs(v => v.filter(x => x.id !== id))
    } catch {
      setError('Unable to delete.')
    } finally {
      setDeletingId(null)
    }
  }

  const studentPickups = form.student
    ? authPickups.filter(a => a.student === Number(form.student))
    : authPickups

  const studentName = (id: number) => students.find(s => s.id === id)?.full_name ?? `Student #${id}`

  const fmt = (dt: string) => {
    try {
      return new Date(dt).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch { return dt }
  }

  return (
    <div className="space-y-6">
      <PageHero badge="VISITORS" badgeColor="sky" title="Pickup Logs" subtitle="Recorded student pickup and release history" icon="🪪" />

      {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

      <div className="flex justify-end">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900"
          onClick={() => { setForm(EMPTY); setShowForm(true) }}
        >
          <Plus size={13} /> Record Pickup
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-5" style={GLASS}>
          <h3 className="text-sm font-semibold text-emerald-400 mb-4">Record Student Pickup</h3>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={e => void handleSubmit(e)}>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Student *</label>
              <select className={SEL} value={form.student} onChange={e => setForm(p => ({ ...p, student: e.target.value, picked_up_by: '' }))} required>
                <option value="">Select student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Authorized Pickup Contact</label>
              <select className={SEL} value={form.picked_up_by} onChange={e => setForm(p => ({ ...p, picked_up_by: e.target.value }))}>
                <option value="">-- Select or enter name below --</option>
                {studentPickups.map(a => <option key={a.id} value={a.id}>{a.guardian_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Unauthorized / Walk-in Name (if not listed)</label>
              <input className={INP} value={form.unauthorized_name} onChange={e => setForm(p => ({ ...p, unauthorized_name: e.target.value }))} placeholder="Leave blank if using list above" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="authorized" checked={form.authorized} onChange={e => setForm(p => ({ ...p, authorized: e.target.checked }))} className="rounded" />
              <label htmlFor="authorized" className="text-sm text-slate-300">Verified & Authorized</label>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Notes</label>
              <input className={INP} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" disabled={saving}>
                {saving ? 'Recording...' : 'Record Pickup'}
              </button>
              <button type="button" className="rounded-lg border border-white/[0.09] px-4 py-2 text-sm text-slate-300" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl p-5" style={GLASS}>
        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading pickup logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No pickup logs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.07] p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm">{log.student_name ?? studentName(log.student)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${log.authorized ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {log.authorized ? '✓ Authorized' : '⚠ Unverified'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Picked up by: {log.picked_up_by_name ?? log.unauthorized_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmt(log.pickup_time)}{log.notes ? ` · ${log.notes}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 shrink-0"
                  disabled={deletingId === log.id}
                  onClick={() => void deleteLog(log.id)}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
