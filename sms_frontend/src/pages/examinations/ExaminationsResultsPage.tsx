import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PrintButton from '../../components/PrintButton'
import { Plus, Pencil, Trash2, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react'
import PageHero from '../../components/PageHero'

type Session = { id: number; name: string }
type Paper = { id: number; subject_name: string; total_marks: number; pass_mark: number; session: number }
type Student = { id: number; full_name: string; admission_number: string }
type Result = {
  id: number
  paper: number
  paper_name: string
  session?: number
  session_name?: string
  class_name?: string
  student: number
  student_name: string
  admission_number?: string
  marks_obtained: number | null
  grade: string
  remarks: string
  is_absent: boolean
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v?.results) ? v.results! : []
}

const gradeColor = (g: string) => {
  const u = (g || '').toUpperCase()
  if (u === 'A') return '#10b981'
  if (u.startsWith('B')) return '#38bdf8'
  if (u.startsWith('C')) return '#fbbf24'
  if (u.startsWith('D')) return '#f97316'
  return '#f87171'
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40'
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const

export default function ExaminationsResultsPage() {
  const [results, setResults] = useState<Result[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filterSession, setFilterSession] = useState<number | ''>('')
  const [filterPaper, setFilterPaper] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Result | null>(null)
  const [paperId, setPaperId] = useState<number | ''>('')
  const [studentId, setStudentId] = useState<number | ''>('')
  const [marks, setMarks] = useState('0')
  const [grade, setGrade] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isAbsent, setIsAbsent] = useState(false)

  const load = async () => {
    try {
      const params: Record<string, string> = {}
      if (filterSession) params.session = String(filterSession)
      if (filterPaper) params.paper = String(filterPaper)
      const [rr, rs, rp, rst] = await Promise.all([
        apiClient.get('/examinations/results/', { params }),
        apiClient.get('/examinations/sessions/'),
        apiClient.get('/examinations/papers/'),
        apiClient.get('/students/'),
      ])
      setResults(asArray(rr.data)); setSessions(asArray(rs.data)); setPapers(asArray(rp.data)); setStudents(asArray(rst.data))
    } catch { setError('Unable to load results.') }
  }

  useEffect(() => { void load() }, [filterPaper, filterSession])

  const filteredPapers = filterSession ? papers.filter(p => p.session === filterSession) : papers
  const maxFor = (id: number | '') => papers.find(p => p.id === id)?.total_marks ?? 100

  const openCreate = () => {
    setEditing(null); setPaperId(filterPaper || ''); setStudentId(''); setMarks('0'); setGrade(''); setRemarks(''); setIsAbsent(false)
    setModal(true)
  }

  const openEdit = (r: Result) => {
    setEditing(r); setPaperId(r.paper); setStudentId(r.student); setMarks(r.marks_obtained == null ? '' : String(r.marks_obtained)); setGrade(r.grade); setRemarks(r.remarks); setIsAbsent(r.is_absent)
    setModal(true)
  }

  const save = async () => {
    if (!paperId || !studentId) return
    setError(null)
    try {
      const p = {
        paper: paperId,
        student: studentId,
        marks_obtained: isAbsent ? null : Number(marks),
        grade: isAbsent ? '' : grade.trim(),
        remarks: remarks.trim(),
        is_absent: isAbsent,
      }
      if (editing) { await apiClient.put(`/examinations/results/${editing.id}/`, p); setNotice('Result updated.') }
      else { await apiClient.post('/examinations/results/', p); setNotice('Result recorded.') }
      setModal(false); await load()
    } catch { setError('Unable to save result.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this result?')) return
    try { await apiClient.delete(`/examinations/results/${id}/`); await load() }
    catch { setError('Unable to delete result.') }
  }

  const passMarkFor = (id: number | '') => papers.find(p => p.id === id)?.pass_mark ?? maxFor(id) * 0.4
  const passCount = results.filter(r => !r.is_absent && Number(r.marks_obtained ?? 0) >= passMarkFor(r.paper)).length
  const absentCount = results.filter(r => r.is_absent).length

  return (
    <div className="p-6 space-y-5">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Exam Results"
        subtitle="Publish and analyse examination results"
        icon="📝"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Results Entry</h1>
          <p className="text-slate-400 text-sm mt-0.5">Record and manage paper-level examination results</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton printId="results-print-area" label="Print" title="Exam Results" />
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Plus size={14} /> Record Result
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />{error}</div>}
      {notice && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />{notice}</div>}

      {/* Quick stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Results', value: results.length, color: '#94a3b8' },
            { label: 'Passed',        value: passCount,      color: '#10b981' },
            { label: 'Absent',        value: absentCount,    color: '#f87171' },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterSession} onChange={e => { setFilterSession(e.target.value ? Number(e.target.value) : ''); setFilterPaper('') }}
          className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none min-w-[180px]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterPaper} onChange={e => setFilterPaper(e.target.value ? Number(e.target.value) : '')}
          className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none min-w-[180px]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="">All papers</option>
          {filteredPapers.map(p => <option key={p.id} value={p.id}>{p.subject_name}</option>)}
        </select>
      </div>

      {/* Print area (hidden) */}
      <div id="results-print-area" className="hidden">
        <div className="print-header"><h1>Exam Results</h1></div>
        <table>
          <thead><tr><th>Student</th><th>Paper</th><th>Marks</th><th>Grade</th><th>Status</th><th>Remarks</th></tr></thead>
          <tbody>{results.map(r => (
            <tr key={r.id}><td>{r.student_name}</td><td>{r.paper_name}</td>
              <td>{r.is_absent ? 'ABS' : `${r.marks_obtained} / ${maxFor(r.paper)}`}</td>
              <td>{r.grade || '—'}</td><td>{r.is_absent ? 'Absent' : 'Sat'}</td><td>{r.remarks}</td></tr>
          ))}</tbody>
        </table>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <BarChart3 size={13} className="text-sky-400" />
          <p className="text-sm font-bold text-white">Results</p>
          <span className="ml-auto text-[10px] font-bold text-slate-500 tabular-nums">{results.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Student', 'Paper', 'Marks', 'Grade', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-600">No results recorded yet.</td></tr>
              ) : results.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-sm text-slate-200 font-medium">{r.student_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    <div className="text-slate-300">{r.paper_name}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {[r.session_name, r.class_name].filter(Boolean).join(' • ') || 'Exam paper'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">
                    {r.is_absent ? 'ABS' : `${r.marks_obtained} / ${maxFor(r.paper)}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold" style={{ color: r.grade ? gradeColor(r.grade) : '#64748b' }}>
                      {r.grade || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                      style={{ background: r.is_absent ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: r.is_absent ? '#f87171' : '#10b981' }}>
                      {r.is_absent ? 'Absent' : 'Sat'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(r)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition hover:opacity-80"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                        <Pencil size={9} /> Edit
                      </button>
                      <button onClick={() => del(r.id)}
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(7,11,18,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-display font-semibold text-white">{editing ? 'Edit Result' : 'Record Result'}</h2>
            <select value={paperId} onChange={e => setPaperId(e.target.value ? Number(e.target.value) : '')} className={inputCls} style={inputStyle}>
              <option value="">Select paper / subject</option>
              {papers.map(p => <option key={p.id} value={p.id}>{p.subject_name} (/{p.total_marks})</option>)}
            </select>
            <select value={studentId} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : '')} className={inputCls} style={inputStyle}>
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} — {s.full_name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={isAbsent} onChange={e => setIsAbsent(e.target.checked)} className="rounded" />
              Mark as absent
            </label>
            {!isAbsent && (
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={marks} onChange={e => setMarks(e.target.value)} placeholder="Marks obtained" className={inputCls} style={inputStyle} />
                <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade (A, B+, …)" className={inputCls} style={inputStyle} />
              </div>
            )}
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks…" rows={2} className={inputCls + ' resize-none'} style={inputStyle} />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>{editing ? 'Update' : 'Record'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
