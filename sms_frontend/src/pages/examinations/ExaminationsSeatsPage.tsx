import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Session = { id: number; name: string }
type Paper = { id: number; subject_name: string; session: number }
type Student = { id: number; full_name: string; admission_number: string }
type Seat = { id: number; paper: number; paper_name: string; student: number; student_name: string; seat_number: string; hall: string; registered: boolean }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function ExaminationsSeatsPage() {
  const [seats, setSeats] = useState<Seat[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filterSession, setFilterSession] = useState<number | ''>('')
  const [filterPaper, setFilterPaper] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Seat | null>(null)
  const [paperId, setPaperId] = useState<number | ''>('')
  const [studentId, setStudentId] = useState<number | ''>('')
  const [seatNumber, setSeatNumber] = useState('')
  const [hall, setHall] = useState('')
  const [registered, setRegistered] = useState(true)

  const load = async () => {
    try {
      const params: Record<string, string> = {}
      if (filterPaper) params.paper = String(filterPaper)
      const [rs, rx, rst, rstu] = await Promise.all([
        apiClient.get<Seat[] | { results: Seat[] }>('/examinations/seat-allocations/', { params }),
        apiClient.get<Session[] | { results: Session[] }>('/examinations/sessions/'),
        apiClient.get<Paper[] | { results: Paper[] }>('/examinations/papers/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/'),
      ])
      setSeats(asArray(rs.data)); setSessions(asArray(rx.data)); setPapers(asArray(rst.data)); setStudents(asArray(rstu.data))
    } catch { setError('Unable to load seat allocations.') }
  }

  useEffect(() => { void load() }, [filterPaper])

  const filteredPapers = filterSession ? papers.filter(p => p.session === filterSession) : papers

  const openCreate = () => {
    setEditing(null); setPaperId(filterPaper || ''); setStudentId(''); setSeatNumber(''); setHall(''); setRegistered(true)
    setModal(true)
  }

  const openEdit = (s: Seat) => {
    setEditing(s); setPaperId(s.paper); setStudentId(s.student); setSeatNumber(s.seat_number); setHall(s.hall); setRegistered(s.registered)
    setModal(true)
  }

  const save = async () => {
    if (!paperId || !studentId) return
    setError(null)
    try {
      const p = { paper: paperId, student: studentId, seat_number: seatNumber.trim(), hall: hall.trim(), registered }
      if (editing) { await apiClient.put(`/examinations/seat-allocations/${editing.id}/`, p); setNotice('Seat updated.') }
      else { await apiClient.post('/examinations/seat-allocations/', p); setNotice('Seat allocated.') }
      setModal(false); await load()
    } catch { setError('Unable to save seat allocation.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this seat allocation?')) return
    try { await apiClient.delete(`/examinations/seat-allocations/${id}/`); await load() }
    catch { setError('Unable to delete allocation.') }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Seating Plans"
        subtitle="Assign candidates to examination halls and seats"
        icon="📝"
      />
      <div className="flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Examinations</p><h1 className="mt-1 text-2xl font-display font-bold text-white">Seat Allocation</h1></div>
        <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">+ Allocate Seat</button>
      </div>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
      <div className="flex gap-3 flex-wrap">
        <select value={filterSession} onChange={e => { setFilterSession(e.target.value ? Number(e.target.value) : ''); setFilterPaper('') }} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm min-w-[180px]">
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterPaper} onChange={e => setFilterPaper(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm min-w-[180px]">
          <option value="">All papers</option>
          {filteredPapers.map(p => <option key={p.id} value={p.id}>{p.subject_name}</option>)}
        </select>
      </div>
      <div className="rounded-2xl glass-panel overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs">
            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Paper</th><th className="px-4 py-3">Seat</th><th className="px-4 py-3">Hall</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {seats.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No seat allocations.</td></tr>
            ) : seats.map(s => (
              <tr key={s.id} className="hover:bg-white/[0.025] transition">
                <td className="px-4 py-3 font-medium text-white">{s.student_name}</td>
                <td className="px-4 py-3 text-slate-400">{s.paper_name}</td>
                <td className="px-4 py-3 font-mono">{s.seat_number || '—'}</td>
                <td className="px-4 py-3 text-slate-400">{s.hall || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${s.registered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{s.registered ? 'Registered' : 'Pending'}</span></td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800">Edit</button>
                  <button onClick={() => del(s.id)} className="rounded-lg border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20">Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold">{editing ? 'Edit Seat' : 'Allocate Seat'}</h2>
            <select value={paperId} onChange={e => setPaperId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">Select paper</option>
              {papers.map(p => <option key={p.id} value={p.id}>{p.subject_name}</option>)}
            </select>
            <select value={studentId} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} — {s.full_name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={seatNumber} onChange={e => setSeatNumber(e.target.value)} placeholder="Seat number" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              <input value={hall} onChange={e => setHall(e.target.value)} placeholder="Hall / Room" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={registered} onChange={e => setRegistered(e.target.checked)} />
              Registered
            </label>
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">{editing ? 'Update' : 'Allocate'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
