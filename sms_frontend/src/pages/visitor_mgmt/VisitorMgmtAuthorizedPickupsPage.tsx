import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const INP = 'w-full rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50'
const SEL = 'w-full rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50'

type Student = { id: number; full_name: string; admission_number: string }
type Pickup = {
  id: number
  student: number
  student_name?: string
  guardian_name: string
  relationship: string
  id_number: string
  phone: string
  is_active: boolean
  photo?: string
}

type Form = {
  student: string; guardian_name: string; relationship: string
  id_number: string; phone: string; is_active: boolean
}

const EMPTY: Form = { student: '', guardian_name: '', relationship: 'Parent', id_number: '', phone: '', is_active: true }
const RELATIONSHIPS = ['Parent', 'Guardian', 'Sibling', 'Uncle', 'Aunt', 'Grandparent', 'Family Friend', 'Other']

export default function VisitorMgmtAuthorizedPickupsPage() {
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [pr, sr] = await Promise.all([
        apiClient.get<{ results?: Pickup[] } | Pickup[]>('/visitors/authorized-pickups/'),
        apiClient.get<{ results?: Student[] } | Student[]>('/students/'),
      ])
      const pData = pr.data
      setPickups(Array.isArray(pData) ? pData : (pData as { results?: Pickup[] }).results ?? [])
      const sData = sr.data
      setStudents(Array.isArray(sData) ? sData : (sData as { results?: Student[] }).results ?? [])
    } catch {
      setError('Unable to load authorized pickups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 4000) }

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (p: Pickup) => {
    setForm({
      student: String(p.student), guardian_name: p.guardian_name, relationship: p.relationship,
      id_number: p.id_number, phone: p.phone, is_active: p.is_active,
    })
    setEditId(p.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form, student: Number(form.student) }
    try {
      if (editId) {
        await apiClient.patch(`/visitors/authorized-pickups/${editId}/`, payload)
        flash('Authorized pickup updated.')
      } else {
        await apiClient.post('/visitors/authorized-pickups/', payload)
        flash('Authorized pickup added.')
      }
      setShowForm(false)
      void load()
    } catch {
      setError('Unable to save authorized pickup.')
    } finally {
      setSaving(false)
    }
  }

  const deletePickup = async (id: number) => {
    if (!window.confirm('Remove this authorized pickup contact?')) return
    setDeletingId(id)
    try {
      await apiClient.delete(`/visitors/authorized-pickups/${id}/`)
      flash('Removed.')
      setPickups(v => v.filter(x => x.id !== id))
    } catch {
      setError('Unable to delete.')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = pickups.filter(p => {
    const q = search.toLowerCase()
    return !q || p.guardian_name.toLowerCase().includes(q) || (p.student_name ?? '').toLowerCase().includes(q)
  })

  const studentName = (id: number) => students.find(s => s.id === id)?.full_name ?? `Student #${id}`

  return (
    <div className="space-y-6">
      <PageHero badge="VISITORS" badgeColor="sky" title="Authorised Pickups" subtitle="Pre-approved pickup contacts per student" icon="🪪" />

      {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 pl-8 pr-3 py-1.5 text-sm text-white w-56 placeholder:text-slate-600" placeholder="Search guardian or student..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="button" className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900" onClick={openCreate}>
          <Plus size={13} /> Add Authorized Pickup
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-5" style={GLASS}>
          <h3 className="text-sm font-semibold text-emerald-400 mb-4">{editId ? 'Edit Authorized Pickup' : 'New Authorized Pickup'}</h3>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={e => void handleSubmit(e)}>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Student *</label>
              <select className={SEL} value={form.student} onChange={e => setForm(p => ({ ...p, student: e.target.value }))} required>
                <option value="">Select student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Guardian Name *</label>
              <input className={INP} value={form.guardian_name} onChange={e => setForm(p => ({ ...p, guardian_name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Relationship</label>
              <select className={SEL} value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}>
                {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">National ID</label>
              <input className={INP} value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Phone *</label>
              <input className={INP} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
              <label htmlFor="is_active" className="text-sm text-slate-300">Active (allowed to pick up)</label>
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Save Changes' : 'Add Pickup Contact'}
              </button>
              <button type="button" className="rounded-lg border border-white/[0.09] px-4 py-2 text-sm text-slate-300" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl p-5" style={GLASS}>
        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No authorized pickups found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.07] p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm">{p.guardian_name}</span>
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">{p.relationship}</span>
                    {!p.is_active && <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">Inactive</span>}
                    {p.is_active && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">Active</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">For: {p.student_name ?? studentName(p.student)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.phone}{p.id_number ? ` · ID: ${p.id_number}` : ''}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" className="rounded-lg border border-white/[0.09] p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.05]" onClick={() => openEdit(p)} title="Edit">
                    <Pencil size={12} />
                  </button>
                  <button type="button" className="rounded-lg border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50" disabled={deletingId === p.id} onClick={() => void deletePickup(p.id)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
