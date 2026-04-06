import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Plus, Building, Users, Pencil, Trash2, X } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface Dormitory {
  id: number
  name: string
  gender: 'Male' | 'Female' | 'Mixed'
  capacity: number
  warden: number | null
  warden_name: string | null
  notes: string
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  employee_id: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const GENDERS = ['Male', 'Female', 'Mixed']

const emptyForm = () => ({ name: '', gender: 'Male', capacity: '50', warden: '', notes: '' })

export default function DormitoriesPage() {
  const [dorms, setDorms] = useState<Dormitory[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Dormitory | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [rd, re] = await Promise.all([
        apiClient.get('/hostel/dormitories/'),
        apiClient.get('/hr/employees/'),
      ])
      setDorms(asArray(rd.data))
      setEmployees(asArray(re.data))
    } catch { setError('Unable to load dormitories.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setModal(true)
  }

  const openEdit = (d: Dormitory) => {
    setEditing(d)
    setForm({ name: d.name, gender: d.gender, capacity: String(d.capacity), warden: d.warden ? String(d.warden) : '', notes: d.notes || '' })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        gender: form.gender,
        capacity: Number(form.capacity) || 50,
        warden: form.warden ? Number(form.warden) : null,
        notes: form.notes.trim(),
      }
      if (editing) {
        await apiClient.put(`/hostel/dormitories/${editing.id}/`, payload)
        setNotice('Dormitory updated.')
      } else {
        await apiClient.post('/hostel/dormitories/', payload)
        setNotice('Dormitory created.')
      }
      setModal(false)
      await load()
    } catch { setError('Unable to save dormitory.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this dormitory? This will also affect associated bed spaces.')) return
    try { await apiClient.delete(`/hostel/dormitories/${id}/`); setNotice('Dormitory deleted.'); await load() }
    catch { setError('Unable to delete dormitory.') }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <PageHero
        badge="HOSTEL"
        badgeColor="sky"
        title="Dormitories"
        subtitle="Manage school boarding dormitories and rooms"
        icon="🏠"
      />

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{dorms.length} dormitor{dorms.length === 1 ? 'y' : 'ies'} configured</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          <Plus className="h-4 w-4" />
          Add Dormitory
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading dormitories...</div>
        ) : dorms.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.02]">
            <Building className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p>No dormitories found. Add your first dormitory to get started.</p>
          </div>
        ) : dorms.map((dorm) => (
          <div key={dorm.id} className="group relative rounded-2xl glass-panel p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Building className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(dorm)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => del(dorm.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{dorm.name}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  dorm.gender === 'Male' ? 'bg-blue-500/10 text-blue-400' :
                  dorm.gender === 'Female' ? 'bg-pink-500/10 text-pink-400' : 'bg-purple-500/10 text-purple-400'
                }`}>
                  {dorm.gender}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400 font-medium">{dorm.capacity} Capacity</span>
              </div>
              {dorm.notes && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{dorm.notes}</p>}
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-white/[0.07] pt-4 text-sm text-slate-400">
              <Users className="h-4 w-4 text-slate-500" />
              <span>Warden: <span className="text-slate-200">{dorm.warden_name || 'Not assigned'}</span></span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Dormitory' : 'Add Dormitory'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Maple House" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Capacity</label>
                <input type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Warden</label>
              <select value={form.warden} onChange={e => set('warden', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="">Not assigned</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{`${e.first_name} ${e.last_name}`.trim() || e.employee_id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Optional notes..." className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200 resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
