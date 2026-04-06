import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Vehicle = { id: number; registration: string }
type Incident = { id: number; vehicle: number; vehicle_registration: string; incident_date: string; description: string; severity: string; reported_by: string; resolved: boolean }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

const SEVERITIES = ['Minor', 'Major', 'Critical']
const sevBadge: Record<string, string> = {
  Minor: 'bg-amber-500/20 text-amber-300',
  Major: 'bg-orange-500/20 text-orange-300',
  Critical: 'bg-rose-500/20 text-rose-300',
}

export default function TransportIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filterResolved, setFilterResolved] = useState<'' | 'open' | 'resolved'>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Incident | null>(null)
  const [vehicleId, setVehicleId] = useState<number | ''>('')
  const [incidentDate, setIncidentDate] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('Minor')
  const [reportedBy, setReportedBy] = useState('')
  const [resolved, setResolved] = useState(false)

  const load = async () => {
    try {
      const params: Record<string, string> = {}
      if (filterResolved === 'open') params.resolved = 'false'
      if (filterResolved === 'resolved') params.resolved = 'true'
      const [ri, rv] = await Promise.all([
        apiClient.get<Incident[] | { results: Incident[] }>('/transport/incidents/', { params }),
        apiClient.get<Vehicle[] | { results: Vehicle[] }>('/transport/vehicles/'),
      ])
      setIncidents(asArray(ri.data)); setVehicles(asArray(rv.data))
    } catch { setError('Unable to load incidents.') }
  }

  useEffect(() => { void load() }, [filterResolved])

  const openCreate = () => {
    setEditing(null); setVehicleId(''); setIncidentDate(''); setDescription(''); setSeverity('Minor'); setReportedBy(''); setResolved(false)
    setModal(true)
  }

  const openEdit = (i: Incident) => {
    setEditing(i); setVehicleId(i.vehicle); setIncidentDate(i.incident_date); setDescription(i.description); setSeverity(i.severity); setReportedBy(i.reported_by); setResolved(i.resolved)
    setModal(true)
  }

  const save = async () => {
    if (!vehicleId || !incidentDate || !description.trim()) return
    setError(null)
    try {
      const p = { vehicle: vehicleId, incident_date: incidentDate, description: description.trim(), severity, reported_by: reportedBy.trim(), resolved }
      if (editing) { await apiClient.put(`/transport/incidents/${editing.id}/`, p); setNotice('Incident updated.') }
      else { await apiClient.post('/transport/incidents/', p); setNotice('Incident logged.') }
      setModal(false); await load()
    } catch { setError('Unable to save incident.') }
  }

  const toggleResolve = async (i: Incident) => {
    try {
      await apiClient.patch(`/transport/incidents/${i.id}/`, { resolved: !i.resolved })
      setNotice(i.resolved ? 'Incident re-opened.' : 'Incident marked resolved.')
      await load()
    } catch { setError('Unable to update incident.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this incident?')) return
    try { await apiClient.delete(`/transport/incidents/${id}/`); await load() }
    catch { setError('Unable to delete incident.') }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="TRANSPORT"
        badgeColor="amber"
        title="Transport Incidents"
        subtitle="Log and track vehicle incidents and accidents"
        icon="🚌"
      />
      <section className="rounded-2xl glass-panel p-5 flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Transport</p><h1 className="mt-1 text-2xl font-display font-semibold">Incidents</h1></div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 transition">+ Log Incident</button>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <div className="flex gap-2">
        {(['', 'open', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilterResolved(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filterResolved === f ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'border-white/[0.09] text-slate-400 hover:bg-slate-800'}`}>
            {f === '' ? 'All' : f === 'open' ? 'Open' : 'Resolved'}
          </button>
        ))}
      </div>

      <section className="rounded-2xl glass-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] bg-slate-950/60 text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Reported By</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {incidents.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No incidents logged.</td></tr>
            ) : incidents.map(i => (
              <tr key={i.id} className="hover:bg-white/[0.02] transition">
                <td className="px-4 py-3 text-slate-300 font-mono">{i.incident_date}</td>
                <td className="px-4 py-3 font-mono text-white">{i.vehicle_registration}</td>
                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{i.description}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${sevBadge[i.severity] ?? 'bg-slate-700 text-slate-400'}`}>{i.severity}</span></td>
                <td className="px-4 py-3 text-slate-400">{i.reported_by || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${i.resolved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{i.resolved ? 'Resolved' : 'Open'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => toggleResolve(i)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">{i.resolved ? 'Re-open' : 'Resolve'}</button>
                    <button onClick={() => openEdit(i)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">Edit</button>
                    <button onClick={() => del(i.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition">Delete</button>
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
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Incident' : 'Log Incident'}</h2>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}
            </select>
            <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Incident description…" rows={3} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={reportedBy} onChange={e => setReportedBy(e.target.value)} placeholder="Reported by" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={resolved} onChange={e => setResolved(e.target.checked)} />
              Mark as resolved
            </label>
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Log'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
