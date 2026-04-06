import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Search, Plus, CheckCircle2, XCircle, Pencil, Trash2, X } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface BedSpace {
  id: number
  dormitory: number
  dormitory_name: string
  bed_number: string
  is_occupied: boolean
  is_active: boolean
}

interface Dormitory {
  id: number
  name: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const emptyForm = () => ({ dormitory: '', bed_number: '', is_active: true })

export default function BedSpacesPage() {
  const [beds, setBeds] = useState<BedSpace[]>([])
  const [dormitories, setDormitories] = useState<Dormitory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDorm, setFilterDorm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<BedSpace | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [rb, rd] = await Promise.all([
        apiClient.get('/hostel/beds/'),
        apiClient.get('/hostel/dormitories/'),
      ])
      setBeds(asArray(rb.data))
      setDormitories(asArray(rd.data))
    } catch { setError('Unable to load bed spaces.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const filteredBeds = beds.filter(b => {
    const matchSearch = b.bed_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.dormitory_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchDorm = !filterDorm || String(b.dormitory) === filterDorm
    return matchSearch && matchDorm
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setModal(true)
  }

  const openEdit = (b: BedSpace) => {
    setEditing(b)
    setForm({ dormitory: String(b.dormitory), bed_number: b.bed_number, is_active: b.is_active })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!form.dormitory || !form.bed_number.trim()) { setError('Dormitory and bed number are required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = { dormitory: Number(form.dormitory), bed_number: form.bed_number.trim(), is_active: form.is_active }
      if (editing) {
        await apiClient.put(`/hostel/beds/${editing.id}/`, payload)
        setNotice('Bed updated.')
      } else {
        await apiClient.post('/hostel/beds/', payload)
        setNotice('Bed created.')
      }
      setModal(false)
      await load()
    } catch { setError('Unable to save bed. Make sure the bed number is unique within the dormitory.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this bed space?')) return
    try { await apiClient.delete(`/hostel/beds/${id}/`); setNotice('Bed deleted.'); await load() }
    catch { setError('Unable to delete bed space.') }
  }

  const setF = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <PageHero
        badge="HOSTEL"
        badgeColor="sky"
        title="Bed Spaces"
        subtitle="Manage dormitory rooms and bed allocations"
        icon="🏠"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Bed Spaces</h1>
          <p className="mt-1 text-sm text-slate-400">Inventory of all individual beds across dormitories.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200">
          <Plus className="h-4 w-4" />
          Add Bed
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by bed or dormitory..."
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterDorm} onChange={e => setFilterDorm(e.target.value)} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300">
          <option value="">All Dormitories</option>
          {dormitories.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel shadow-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.025]">
              <th className="px-6 py-4 font-semibold text-slate-300">Dormitory</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Bed Number</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Active</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading bed spaces...</td></tr>
            ) : filteredBeds.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No bed spaces found.</td></tr>
            ) : filteredBeds.map(bed => (
              <tr key={bed.id} className="group hover:bg-emerald-500/5 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200">{bed.dormitory_name || dormitories.find(d => d.id === bed.dormitory)?.name || '—'}</td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs uppercase tracking-wider">{bed.bed_number}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    bed.is_occupied ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {bed.is_occupied ? 'Occupied' : 'Vacant'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {bed.is_active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(bed)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(bed.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"><Trash2 className="h-4 w-4" /></button>
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
              <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Bed Space' : 'Add Bed Space'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Dormitory *</label>
              <select value={form.dormitory} onChange={e => setF('dormitory', e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200">
                <option value="">Select dormitory</option>
                {dormitories.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Bed Number *</label>
              <input value={form.bed_number} onChange={e => setF('bed_number', e.target.value)} placeholder="e.g. A-01, B-12" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-slate-200" />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setF('is_active', e.target.checked)} className="h-4 w-4 rounded accent-emerald-500" />
              <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
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
