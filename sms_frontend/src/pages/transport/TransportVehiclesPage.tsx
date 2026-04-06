import { useEffect, useState } from 'react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

type Vehicle = { id: number; registration: string; make: string; model: string; capacity: number; status: string; notes: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const STATUS = ['Active', 'Maintenance', 'Retired']
const badge: Record<string, string> = {
  Active: 'bg-emerald-500/20 text-emerald-300',
  Maintenance: 'bg-amber-500/20 text-amber-300',
  Retired: 'bg-slate-700 text-slate-400',
}

export default function TransportVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [registration, setRegistration] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [capacity, setCapacity] = useState('40')
  const [status, setStatus] = useState('Active')
  const [notes, setNotes] = useState('')

  const load = async () => {
    try { const r = await apiClient.get<Vehicle[] | { results: Vehicle[] }>('/transport/vehicles/'); setVehicles(asArray(r.data)) }
    catch { setError('Unable to load vehicles.') }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setEditing(null); setRegistration(''); setMake(''); setModel(''); setCapacity('40'); setStatus('Active'); setNotes('')
    setModal(true)
  }

  const openEdit = (v: Vehicle) => {
    setEditing(v); setRegistration(v.registration); setMake(v.make); setModel(v.model)
    setCapacity(String(v.capacity)); setStatus(v.status); setNotes(v.notes)
    setModal(true)
  }

  const save = async () => {
    if (!registration.trim()) return
    setError(null)
    try {
      const p = { registration: registration.trim(), make: make.trim(), model: model.trim(), capacity: Number(capacity) || 40, status, notes: notes.trim() }
      if (editing) { await apiClient.put(`/transport/vehicles/${editing.id}/`, p); setNotice('Vehicle updated.') }
      else { await apiClient.post('/transport/vehicles/', p); setNotice('Vehicle added.') }
      setModal(false); await load()
    } catch { setError('Unable to save vehicle.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this vehicle?')) return
    try { await apiClient.delete(`/transport/vehicles/${id}/`); await load() }
    catch { setError('Unable to delete vehicle.') }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="TRANSPORT"
        badgeColor="amber"
        title="Vehicles"
        subtitle="School vehicle fleet management"
        icon="🚌"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          <span className="text-base leading-none">+</span> Add Vehicle
        </button>
      </div>

      <section className="rounded-2xl glass-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] bg-slate-950/60 text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Make / Model</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {vehicles.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No vehicles registered.</td></tr>
            ) : vehicles.map(v => (
              <tr key={v.id} className="hover:bg-white/[0.02] transition">
                <td className="px-4 py-3 font-mono font-semibold text-white">{v.registration}</td>
                <td className="px-4 py-3 text-slate-300">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{v.capacity} seats</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${badge[v.status] ?? 'bg-slate-700 text-slate-400'}`}>{v.status}</span></td>
                <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{v.notes || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(v)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">Edit</button>
                    <button onClick={() => del(v.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <input value={registration} onChange={e => setRegistration(e.target.value)} placeholder="Registration (e.g. KAA 123B)" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input value={make} onChange={e => setMake(e.target.value)} placeholder="Make (Toyota)" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="Model (Coaster)" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Capacity" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm resize-none" />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Add'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
