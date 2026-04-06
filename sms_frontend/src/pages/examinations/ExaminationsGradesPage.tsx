import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Plus, Pencil, Trash2, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react'
import PageHero from '../../components/PageHero'

type GradeBoundary = { id: number; session: number; session_name?: string; grade: string; min_marks: number; max_marks: number; remarks: string }
type Session = { id: number; name: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v?.results) ? v.results! : []
}

const gradeColor = (g: string) => {
  const u = g.toUpperCase()
  if (u === 'A') return '#10b981'
  if (u.startsWith('B')) return '#38bdf8'
  if (u.startsWith('C')) return '#fbbf24'
  if (u.startsWith('D')) return '#f97316'
  return '#f87171'
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40'
const inputStyle = { background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', colorScheme: 'dark' } as const

export default function ExaminationsGradesPage() {
  const [grades, setGrades] = useState<GradeBoundary[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [filterSession, setFilterSession] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<GradeBoundary | null>(null)
  const [sessionId, setSessionId] = useState<number | ''>('')
  const [grade, setGrade] = useState('')
  const [minMarks, setMinMarks] = useState('0')
  const [maxMarks, setMaxMarks] = useState('100')
  const [gradeRemarks, setGradeRemarks] = useState('')

  const load = async () => {
    try {
      const params: Record<string, string> = {}
      if (filterSession) params.session = String(filterSession)
      const [rg, rs] = await Promise.all([
        apiClient.get('/examinations/grade-boundaries/', { params }),
        apiClient.get('/examinations/sessions/'),
      ])
      setGrades(asArray(rg.data)); setSessions(asArray(rs.data))
    } catch { setError('Unable to load grade boundaries.') }
  }

  useEffect(() => { void load() }, [filterSession])

  const openCreate = () => {
    setEditing(null); setSessionId(filterSession || ''); setGrade(''); setMinMarks('0'); setMaxMarks('100'); setGradeRemarks('')
    setModal(true)
  }

  const openEdit = (g: GradeBoundary) => {
    setEditing(g); setSessionId(g.session); setGrade(g.grade); setMinMarks(String(g.min_marks)); setMaxMarks(String(g.max_marks)); setGradeRemarks(g.remarks)
    setModal(true)
  }

  const save = async () => {
    if (!sessionId || !grade.trim()) return
    setError(null)
    try {
      const p = { session: sessionId, grade: grade.trim(), min_marks: Number(minMarks), max_marks: Number(maxMarks), remarks: gradeRemarks.trim() }
      if (editing) { await apiClient.put(`/examinations/grade-boundaries/${editing.id}/`, p); setNotice('Grade boundary updated.') }
      else { await apiClient.post('/examinations/grade-boundaries/', p); setNotice('Grade boundary added.') }
      setModal(false); await load()
    } catch { setError('Unable to save grade boundary.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this grade boundary?')) return
    try { await apiClient.delete(`/examinations/grade-boundaries/${id}/`); await load() }
    catch { setError('Unable to delete grade boundary.') }
  }

  return (
    <div className="p-6 space-y-5">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Grade Processing"
        subtitle="Mark entry, grading and result processing"
        icon="📝"
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Grade Boundaries</h1>
          <p className="text-slate-400 text-sm mt-0.5">Define score ranges and grade labels for each exam session</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Plus size={14} /> Add Grade
        </button>
      </div>

      {error && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />{error}</div>}
      {notice && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />{notice}</div>}

      <select value={filterSession} onChange={e => setFilterSession(e.target.value ? Number(e.target.value) : '')}
        className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none min-w-[200px]"
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', colorScheme: 'dark' }}>
        <option value="">All sessions</option>
        {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <Layers size={13} className="text-amber-400" />
          <p className="text-sm font-bold text-white">Grade Boundaries</p>
          <span className="ml-auto text-[10px] font-bold text-slate-500 tabular-nums">{grades.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Grade', 'Session', 'Mark Range', 'Remarks', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {grades.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-600">No grade boundaries defined.</td></tr>
              ) : grades.map(g => (
                <tr key={g.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3">
                    <span className="text-2xl font-bold tabular-nums" style={{ color: gradeColor(g.grade) }}>{g.grade}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{g.session_name || sessions.find(s => s.id === g.session)?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">{g.min_marks} – {g.max_marks} marks</td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[160px]">{g.remarks || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(g)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition hover:opacity-80"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                        <Pencil size={9} /> Edit
                      </button>
                      <button onClick={() => del(g.id)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition hover:opacity-80"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <Trash2 size={9} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(7,11,18,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-display font-semibold text-white">{editing ? 'Edit Grade Boundary' : 'Add Grade Boundary'}</h2>
            <select value={sessionId} onChange={e => setSessionId(e.target.value ? Number(e.target.value) : '')} className={inputCls} style={inputStyle}>
              <option value="">Select session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade label (A, B+, C−, …)" className={inputCls} style={inputStyle} />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={minMarks} onChange={e => setMinMarks(e.target.value)} placeholder="Min marks" className={inputCls} style={inputStyle} />
              <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} placeholder="Max marks" className={inputCls} style={inputStyle} />
            </div>
            <input value={gradeRemarks} onChange={e => setGradeRemarks(e.target.value)} placeholder="Remarks (e.g. Excellent, Pass, Fail)" className={inputCls} style={inputStyle} />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>{editing ? 'Update' : 'Add'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
