import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Route = { id: number; name: string }
type Stop = { id: number; route: number; stop_name: string; sequence: number; estimated_time: string; landmark: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function TransportStopsPage() {
  const [stops, setStops] = useState<Stop[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [filterRoute, setFilterRoute] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Stop | null>(null)
  const [routeId, setRouteId] = useState<number | ''>('')
  const [stopName, setStopName] = useState('')
  const [sequence, setSequence] = useState('1')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [landmark, setLandmark] = useState('')

  const load = async () => {
    try {
      const [rs, rr] = await Promise.all([
        apiClient.get<Stop[] | { results: Stop[] }>('/transport/stops/' + (filterRoute ? `?route=${filterRoute}` : '')),
        apiClient.get<Route[] | { results: Route[] }>('/transport/routes/'),
      ])
      setStops(asArray(rs.data)); setRoutes(asArray(rr.data))
    } catch { setError('Unable to load stops.') }
  }

  useEffect(() => { void load() }, [filterRoute])

  const openCreate = () => {
    setEditing(null); setRouteId(filterRoute || ''); setStopName(''); setSequence('1'); setEstimatedTime(''); setLandmark('')
    setModal(true)
  }

  const openEdit = (s: Stop) => {
    setEditing(s); setRouteId(s.route); setStopName(s.stop_name); setSequence(String(s.sequence)); setEstimatedTime(s.estimated_time); setLandmark(s.landmark)
    setModal(true)
  }

  const save = async () => {
    if (!routeId || !stopName.trim()) return
    setError(null)
    try {
      const p = { route: routeId, stop_name: stopName.trim(), sequence: Number(sequence) || 1, estimated_time: estimatedTime.trim(), landmark: landmark.trim() }
      if (editing) { await apiClient.put(`/transport/stops/${editing.id}/`, p); setNotice('Stop updated.') }
      else { await apiClient.post('/transport/stops/', p); setNotice('Stop added.') }
      setModal(false); await load()
    } catch { setError('Unable to save stop.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this stop?')) return
    try { await apiClient.delete(`/transport/stops/${id}/`); await load() }
    catch { setError('Unable to delete stop.') }
  }

  const routeName = (id: number) => routes.find(r => r.id === id)?.name ?? String(id)

  return (
    <div className="space-y-6">
      <PageHero
        badge="TRANSPORT"
        badgeColor="amber"
        title="Bus Stops"
        subtitle="Manage route stops and passenger pickup points"
        icon="🚌"
      />
      <section className="rounded-2xl glass-panel p-5 flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Transport</p><h1 className="mt-1 text-2xl font-display font-semibold">Route Stops</h1></div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 transition">+ Add Stop</button>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <div className="flex gap-3 items-center">
        <select value={filterRoute} onChange={e => setFilterRoute(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm min-w-[200px]">
          <option value="">All routes</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <section className="rounded-2xl glass-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] bg-slate-950/60 text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Stop Name</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Landmark</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {stops.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No stops found.</td></tr>
            ) : stops.map(s => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition">
                <td className="px-4 py-3 text-slate-400 font-mono">{s.sequence}</td>
                <td className="px-4 py-3 font-semibold text-white">{s.stop_name}</td>
                <td className="px-4 py-3 text-slate-300">{routeName(s.route)}</td>
                <td className="px-4 py-3 text-slate-300 font-mono">{s.estimated_time || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{s.landmark || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">Edit</button>
                    <button onClick={() => del(s.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition">Delete</button>
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
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Stop' : 'Add Stop'}</h2>
            <select value={routeId} onChange={e => setRouteId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">Select route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input value={stopName} onChange={e => setStopName(e.target.value)} placeholder="Stop name" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={sequence} onChange={e => setSequence(e.target.value)} placeholder="Sequence" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              <input value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} placeholder="Time (07:15)" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            </div>
            <input value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Landmark (optional)" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
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
