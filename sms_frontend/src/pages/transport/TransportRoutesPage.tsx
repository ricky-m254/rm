import { useEffect, useState } from 'react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

type Vehicle = { id: number; registration: string }
type Route = { id: number; name: string; vehicle: number | null; vehicle_registration: string; direction: string; is_active: boolean; notes: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const DIRECTIONS = ['MORNING', 'EVENING', 'BOTH']
const dirLabel: Record<string, string> = { MORNING: 'Morning Pick-Up', EVENING: 'Evening Drop-Off', BOTH: 'Both' }

export default function TransportRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Route | null>(null)
  const [name, setName] = useState('')
  const [vehicle, setVehicle] = useState<number | ''>('')
  const [direction, setDirection] = useState('BOTH')
  const [isActive, setIsActive] = useState(true)
  const [notes, setNotes] = useState('')

  const load = async () => {
    try {
      const [rr, rv] = await Promise.all([
        apiClient.get<Route[] | { results: Route[] }>('/transport/routes/'),
        apiClient.get<Vehicle[] | { results: Vehicle[] }>('/transport/vehicles/'),
      ])
      setRoutes(asArray(rr.data)); setVehicles(asArray(rv.data))
    } catch { setError('Unable to load routes.') }
  }

  useEffect(() => { void load() }, [])

  const openEdit = (r: Route) => {
    setEditing(r); setName(r.name); setVehicle(r.vehicle ?? ''); setDirection(r.direction); setIsActive(r.is_active); setNotes(r.notes)
    setModal(true)
  }

  const save = async () => {
    if (!name.trim()) return
    setError(null)
    try {
      const p = { name: name.trim(), vehicle: vehicle || null, direction, is_active: isActive, notes: notes.trim() }
      if (editing) { await apiClient.put(`/transport/routes/${editing.id}/`, p); setNotice('Route updated.') }
      else { await apiClient.post('/transport/routes/', p); setNotice('Route created.') }
      setModal(false); await load()
    } catch { setError('Unable to save route.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this route?')) return
    try { await apiClient.delete(`/transport/routes/${id}/`); await load() }
    catch { setError('Unable to delete route.') }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="TRANSPORT"
        badgeColor="amber"
        title="Routes"
        subtitle="Manage transport routes and stops"
        icon="🚌"
      />
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="rounded-2xl glass-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] bg-slate-950/60 text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {routes.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No routes configured.</td></tr>
            ) : routes.map(r => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition">
                <td className="px-4 py-3 font-semibold text-white">{r.name}</td>
                <td className="px-4 py-3 text-slate-300 font-mono">{r.vehicle_registration || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{dirLabel[r.direction] || r.direction}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${r.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(r)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">Edit</button>
                    <button onClick={() => del(r.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition">Delete</button>
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
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Route' : 'Add Route'}</h2>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Route name" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            <select value={vehicle} onChange={e => setVehicle(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">No vehicle assigned</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}
            </select>
            <select value={direction} onChange={e => setDirection(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              {DIRECTIONS.map(d => <option key={d} value={d}>{dirLabel[d]}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
              Active route
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm resize-none" />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Create'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
