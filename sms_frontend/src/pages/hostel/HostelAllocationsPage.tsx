import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Calendar, User, UserPlus, Pencil, Trash2, X, AlertTriangle, CheckCircle2, Filter } from 'lucide-react'

interface Allocation {
  id: number
  student: number
  student_name: string
  bed: number | null
  dormitory_name: string
  bed_number: string
  term: number | null
  term_name: string
  check_in_date: string
  check_out_date: string | null
  status: 'Active' | 'Checked Out'
  notes: string
}

interface Student { id: number; first_name: string; last_name: string; admission_number: string }
interface BedSpace { id: number; dormitory_name: string; bed_number: string; is_occupied: boolean; is_active: boolean; dormitory: number }
interface Term { id: number; name: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const emptyForm = () => ({
  student: '', bed: '', term: '',
  check_in_date: new Date().toISOString().split('T')[0],
  check_out_date: '', status: 'Active', notes: ''
})

export default function HostelAllocationsPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [beds, setBeds] = useState<BedSpace[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Allocation | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [ra, rs, rb, rt] = await Promise.all([
        apiClient.get('/hostel/allocations/'),
        apiClient.get('/students/'),
        apiClient.get('/hostel/beds/'),
        apiClient.get('/academics/terms/'),
      ])
      setAllocations(asArray(ra.data))
      setStudents(asArray(rs.data))
      setBeds(asArray(rb.data))
      setTerms(asArray(rt.data))
    } catch { setError('Unable to load allocations.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filtered = filterStatus ? allocations.filter(a => a.status === filterStatus) : allocations

  const openCreate = () => {
    setEditing(null); setForm(emptyForm()); setError(null); setModal(true)
  }

  const openEdit = (a: Allocation) => {
    setEditing(a)
    setForm({
      student: String(a.student),
      bed: a.bed ? String(a.bed) : '',
      term: a.term ? String(a.term) : '',
      check_in_date: a.check_in_date,
      check_out_date: a.check_out_date || '',
      status: a.status,
      notes: a.notes || '',
    })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!form.student || !form.check_in_date) { setError('Student and check-in date are required.'); return }
    setSaving(true); setError(null)
    try {
      const payload: any = {
        student: Number(form.student),
        bed: form.bed ? Number(form.bed) : null,
        term: form.term ? Number(form.term) : null,
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date || null,
        status: form.status,
        notes: form.notes.trim(),
      }
      if (editing) {
        await apiClient.put(`/hostel/allocations/${editing.id}/`, payload)
        setNotice('Allocation updated.')
      } else {
        await apiClient.post('/hostel/allocations/', payload)
        setNotice('Allocation created.')
      }
      setModal(false)
      await load()
    } catch { setError('Unable to save allocation.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this allocation?')) return
    try { await apiClient.delete(`/hostel/allocations/${id}/`); setNotice('Allocation deleted.'); await load() }
    catch { setError('Unable to delete allocation.') }
  }

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const availableBeds = beds.filter(b => b.is_active && (!b.is_occupied || (editing && String(editing.bed) === String(b.id))))

  return (
    <div className="space-y-6 pb-8">
      <PageHero
        badge="HOSTEL"
        badgeColor="sky"
        title="Hostel Allocations"
        subtitle="Track which students are assigned to which beds."
        icon="🏠"
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 transition">
            <UserPlus size={15} /> New Allocation
          </button>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 size={14} />{notice}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={13} className="text-slate-600" />
        {['', 'Active', 'Checked Out'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filterStatus === s ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300 border border-white/[0.06]'}`}>
            {s || 'All'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-600">{filtered.length} allocation{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-600 text-sm">Loading allocations…</div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-white/[0.07]"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">No allocations found.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Student', 'Dormitory · Bed', 'Term', 'Check-In', 'Check-Out', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-white/[0.015] transition"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-slate-600 flex-shrink-0" />
                        <span className="text-sm text-slate-200">{a.student_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {a.dormitory_name} {a.bed_number ? `· ${a.bed_number}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{a.term_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                      <span className="flex items-center gap-1"><Calendar size={10} />{a.check_in_date}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{a.check_out_date || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(a)}
                          className="rounded-lg p-1.5 text-slate-600 hover:text-sky-400 hover:bg-sky-500/10 transition">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => void del(a.id)}
                          className="rounded-lg p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{editing ? 'Edit Allocation' : 'New Allocation'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white transition"><X size={18} /></button>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Student *</label>
                <select value={form.student} onChange={e => setF('student', e.target.value)}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  <option value="">Select student…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Bed Space</label>
                <select value={form.bed} onChange={e => setF('bed', e.target.value)}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  <option value="">None</option>
                  {availableBeds.map(b => (
                    <option key={b.id} value={b.id}>{b.dormitory_name} · {b.bed_number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Term</label>
                <select value={form.term} onChange={e => setF('term', e.target.value)}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  <option value="">None</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Check-In Date *</label>
                <input type="date" value={form.check_in_date} onChange={e => setF('check_in_date', e.target.value)}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Check-Out Date</label>
                <input type="date" value={form.check_out_date} onChange={e => setF('check_out_date', e.target.value)}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  <option value="Active">Active</option>
                  <option value="Checked Out">Checked Out</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => void save()} disabled={saving}
                className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setModal(false)}
                className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.04] transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
