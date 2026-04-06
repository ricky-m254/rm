import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PrintButton from '../../components/PrintButton'
import { Plus, Pencil, Trash2, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import PageHero from '../../components/PageHero'

type Session = { id: number; name: string }
type Subject = { id: number; name: string }
type SchoolClass = { id: number; display_name: string; name: string }
type Paper = {
  id: number; session: number; session_name: string; subject: number; subject_name: string
  school_class: number; class_name: string; exam_date: string; start_time: string; end_time: string
  exam_room: string; total_marks: number; pass_mark: number; notes: string
}

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v?.results) ? v.results! : []
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40'
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const

export default function ExaminationsPapersPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [filterSession, setFilterSession] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Paper | null>(null)
  const [sessionId, setSessionId] = useState<number | ''>('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [classId, setClassId] = useState<number | ''>('')
  const [examDate, setExamDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [examRoom, setExamRoom] = useState('')
  const [totalMarks, setTotalMarks] = useState('100')
  const [passMark, setPassMark] = useState('40')
  const [notes, setNotes] = useState('')

  const load = async () => {
    try {
      const [rp, rs, rx, rc] = await Promise.all([
        apiClient.get('/examinations/papers/' + (filterSession ? `?session=${filterSession}` : '')),
        apiClient.get('/examinations/sessions/'),
        apiClient.get('/academics/subjects/'),
        apiClient.get('/academics/classes/'),
      ])
      setPapers(asArray(rp.data)); setSessions(asArray(rs.data)); setSubjects(asArray(rx.data))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClasses(asArray(rc.data).map((c: any) => ({ ...c, display_name: c.display_name || c.name })))
    } catch { setError('Unable to load papers.') }
  }

  useEffect(() => { void load() }, [filterSession])

  const openCreate = () => {
    setEditing(null); setSessionId(filterSession || ''); setSubjectId(''); setClassId('')
    setExamDate(''); setStartTime('09:00'); setEndTime('11:00'); setExamRoom('')
    setTotalMarks('100'); setPassMark('40'); setNotes(''); setError(null); setModal(true)
  }

  const openEdit = (p: Paper) => {
    setEditing(p); setSessionId(p.session); setSubjectId(p.subject); setClassId(p.school_class)
    setExamDate(p.exam_date); setStartTime(p.start_time?.substring(0, 5) || '')
    setEndTime(p.end_time?.substring(0, 5) || ''); setExamRoom(p.exam_room || '')
    setTotalMarks(String(p.total_marks)); setPassMark(String(p.pass_mark)); setNotes(p.notes || '')
    setError(null); setModal(true)
  }

  const save = async () => {
    if (!sessionId || !subjectId || !classId || !examDate || !startTime || !endTime) {
      setError('Session, Subject, Class, Date and times are required.')
      return
    }
    setError(null)
    try {
      const payload = { session: sessionId, subject: subjectId, school_class: classId, exam_date: examDate, start_time: startTime, end_time: endTime, exam_room: examRoom.trim(), total_marks: Number(totalMarks) || 100, pass_mark: Number(passMark) || 40, notes: notes.trim() }
      if (editing) { await apiClient.put(`/examinations/papers/${editing.id}/`, payload); setNotice('Paper updated.') }
      else { await apiClient.post('/examinations/papers/', payload); setNotice('Paper created.') }
      setModal(false); await load()
    } catch { setError('Unable to save paper.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this exam paper?')) return
    try { await apiClient.delete(`/examinations/papers/${id}/`); await load() }
    catch { setError('Unable to delete paper.') }
  }

  return (
    <div className="p-6 space-y-5">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Exam Papers"
        subtitle="Manage and track all examination papers"
        icon="📝"
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Exam Papers</h1>
          <p className="text-slate-400 text-sm mt-0.5">Schedule exam papers with dates, times, rooms and marks</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton printId="papers-print-area" label="Print Schedule" title="Exam Papers Schedule" />
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Plus size={14} /> Add Paper
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />{error}</div>}
      {notice && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />{notice}</div>}

      <select value={filterSession} onChange={e => setFilterSession(e.target.value ? Number(e.target.value) : '')}
        className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none min-w-[200px]"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <option value="">All sessions</option>
        {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {/* Print area */}
      <div id="papers-print-area" className="hidden">
        <div className="print-header"><h1>Exam Papers Schedule</h1></div>
        <table><thead><tr><th>Subject</th><th>Class</th><th>Session</th><th>Date</th><th>Time</th><th>Marks</th><th>Room</th></tr></thead>
          <tbody>{papers.map(p => (<tr key={p.id}><td>{p.subject_name}</td><td>{p.class_name}</td><td>{p.session_name}</td><td>{p.exam_date}</td><td>{p.start_time?.substring(0,5)} – {p.end_time?.substring(0,5)}</td><td>{p.total_marks}/{p.pass_mark}</td><td>{p.exam_room || '—'}</td></tr>))}</tbody>
        </table>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <FileText size={13} className="text-sky-400" />
          <p className="text-sm font-bold text-white">Exam Papers</p>
          <span className="ml-auto text-[10px] font-bold text-slate-500 tabular-nums">{papers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Subject', 'Class', 'Session', 'Date', 'Time', 'Marks', 'Room', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {papers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-600">No exam papers found.</td></tr>
              ) : papers.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-sm text-slate-200 font-medium">{p.subject_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{p.class_name || classes.find(c => c.id === p.school_class)?.display_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{p.session_name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">{p.exam_date}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.start_time?.substring(0,5)} – {p.end_time?.substring(0,5)}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-slate-200">{p.total_marks}</span>
                    <span className="text-slate-600"> / pass {p.pass_mark}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.exam_room || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition hover:opacity-80" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}><Pencil size={9} /> Edit</button>
                      <button onClick={() => del(p.id)} className="rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition hover:opacity-80" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}><Trash2 size={9} /> Delete</button>
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
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-display font-semibold text-white">{editing ? 'Edit Paper' : 'Add Exam Paper'}</h2>
            {error && <div className="rounded-xl p-3 text-xs text-rose-200" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

            <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Session *</label>
              <select value={sessionId} onChange={e => setSessionId(e.target.value ? Number(e.target.value) : '')} className={inputCls} style={inputStyle}>
                <option value="">Select session</option>{sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>

            <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Subject *</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value ? Number(e.target.value) : '')} className={inputCls} style={inputStyle}>
                <option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>

            <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Class *</label>
              <select value={classId} onChange={e => setClassId(e.target.value ? Number(e.target.value) : '')} className={inputCls} style={inputStyle}>
                <option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select></div>

            <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Exam Date *</label>
              <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className={inputCls} style={inputStyle} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Start Time *</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} style={inputStyle} /></div>
              <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">End Time *</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} style={inputStyle} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Total Marks</label><input type="number" min="1" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} className={inputCls} style={inputStyle} /></div>
              <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Pass Mark</label><input type="number" min="0" value={passMark} onChange={e => setPassMark(e.target.value)} className={inputCls} style={inputStyle} /></div>
            </div>

            <input value={examRoom} onChange={e => setExamRoom(e.target.value)} placeholder="Exam room / hall (optional)" className={inputCls} style={inputStyle} />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2} className={inputCls + ' resize-none'} style={inputStyle} />

            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>{editing ? 'Update' : 'Add Paper'}</button>
              <button onClick={() => { setModal(false); setError(null) }} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
