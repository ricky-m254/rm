import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Student = { id: number; full_name: string; admission_number: string }
type Route = { id: number; name: string }
type Stop = { id: number; stop_name: string; route: number }
type Term = { id: number; name: string }
type Assignment = { id: number; student: number; student_name: string; route: number; route_name: string; boarding_stop: number | null; stop_name: string; is_active: boolean; term: number | null }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function TransportStudentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [studentId, setStudentId] = useState<number | ''>('')
  const [routeId, setRouteId] = useState<number | ''>('')
  const [stopId, setStopId] = useState<number | ''>('')
  const [termId, setTermId] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)

  const load = async () => {
    try {
      const [ra, rs, rr, rt] = await Promise.all([
        apiClient.get<Assignment[] | { results: Assignment[] }>('/transport/students/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/'),
        apiClient.get<Route[] | { results: Route[] }>('/transport/routes/'),
        apiClient.get<Term[]>('/academics/ref/terms/', { params: { is_active: true } }),
      ])
      setAssignments(asArray(ra.data)); setStudents(asArray(rs.data)); setRoutes(asArray(rr.data)); setTerms(rt.data ?? [])
    } catch { setError('Unable to load assignments.') }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!routeId) { setStops([]); return }
    apiClient.get<Stop[] | { results: Stop[] }>(`/transport/stops/?route=${routeId}`)
      .then(r => setStops(asArray(r.data)))
      .catch(() => setStops([]))
  }, [routeId])

  const openCreate = () => {
    setEditing(null); setStudentId(''); setRouteId(''); setStopId(''); setTermId(''); setIsActive(true)
    setModal(true)
  }

  const openEdit = (a: Assignment) => {
    setEditing(a); setStudentId(a.student); setRouteId(a.route); setStopId(a.boarding_stop ?? ''); setTermId(a.term ?? ''); setIsActive(a.is_active)
    setModal(true)
  }

  const save = async () => {
    if (!studentId || !routeId) return
    setError(null)
    try {
      const p = { student: studentId, route: routeId, boarding_stop: stopId || null, term: termId || null, is_active: isActive }
      if (editing) { await apiClient.put(`/transport/students/${editing.id}/`, p); setNotice('Assignment updated.') }
      else { await apiClient.post('/transport/students/', p); setNotice('Student assigned.') }
      setModal(false); await load()
    } catch { setError('Unable to save assignment.') }
  }

  const del = async (id: number) => {
    if (!confirm('Remove this transport assignment?')) return
    try { await apiClient.delete(`/transport/students/${id}/`); await load() }
    catch { setError('Unable to delete assignment.') }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="TRANSPORT"
        badgeColor="amber"
        title="Student Transport"
        subtitle="Student transport assignments and bus passes"
        icon="🚌"
      />
      <section className="rounded-2xl glass-panel p-5 flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Transport</p><h1 className="mt-1 text-2xl font-display font-semibold">Student Transport Assignments</h1></div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 transition">+ Assign Student</button>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="rounded-2xl glass-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] bg-slate-950/60 text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Boarding Stop</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {assignments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No transport assignments.</td></tr>
            ) : assignments.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.02] transition">
                <td className="px-4 py-3 font-semibold text-white">{a.student_name}</td>
                <td className="px-4 py-3 text-slate-300">{a.route_name}</td>
                <td className="px-4 py-3 text-slate-400">{a.stop_name || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${a.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(a)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 transition">Edit</button>
                    <button onClick={() => del(a.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition">Remove</button>
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
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Assignment' : 'Assign Student'}</h2>
            <select value={studentId} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} — {s.full_name}</option>)}
            </select>
            <select value={routeId} onChange={e => { setRouteId(e.target.value ? Number(e.target.value) : ''); setStopId('') }} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">Select route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={stopId} onChange={e => setStopId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">No specific stop</option>
              {stops.map(s => <option key={s.id} value={s.id}>{s.stop_name}</option>)}
            </select>
            <select value={termId} onChange={e => setTermId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">No term filter</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Active assignment
            </label>
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Assign'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
