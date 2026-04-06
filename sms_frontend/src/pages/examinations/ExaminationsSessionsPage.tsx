import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Plus, Pencil, Trash2, ClipboardList, AlertTriangle, CheckCircle2 } from 'lucide-react'
import PageHero from '../../components/PageHero'

type Term = { id: number; name: string }
type Session = { id: number; name: string; status: string; start_date: string; end_date: string; term: number | null; is_active: boolean; notes: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v?.results) ? v.results! : []
}

const STATUSES = ['Upcoming', 'Ongoing', 'Completed']
const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Upcoming:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  Ongoing:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'  },
  Completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:ring-1 focus:ring-emerald-500/40'
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const

export default function ExaminationsSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('Upcoming')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [termId, setTermId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [rs, rt] = await Promise.all([
        apiClient.get('/examinations/sessions/'),
        apiClient.get('/academics/terms/'),
      ])
      setSessions(asArray(rs.data)); setTerms(asArray(rt.data))
    } catch { setError('Unable to load sessions.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setEditing(null); setName(''); setStatus('Upcoming'); setStartDate(''); setEndDate(''); setTermId(''); setNotes('')
    setModal(true)
  }

  const openEdit = (s: Session) => {
    setEditing(s); setName(s.name); setStatus(s.status); setStartDate(s.start_date); setEndDate(s.end_date); setTermId(s.term ?? ''); setNotes(s.notes)
    setModal(true)
  }

  const save = async () => {
    if (!name.trim() || !startDate || !endDate) return
    setError(null)
    try {
      const p = { name: name.trim(), status, start_date: startDate, end_date: endDate, term: termId || null, notes: notes.trim() }
      if (editing) { await apiClient.put(`/examinations/sessions/${editing.id}/`, p); setNotice('Session updated.') }
      else { await apiClient.post('/examinations/sessions/', p); setNotice('Session created.') }
      setModal(false); await load()
    } catch { setError('Unable to save session.') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this exam session?')) return
    try { await apiClient.delete(`/examinations/sessions/${id}/`); await load() }
    catch { setError('Unable to delete session.') }
  }

  const changeStatus = async (s: Session, newStatus: string) => {
    try { await apiClient.patch(`/examinations/sessions/${s.id}/`, { status: newStatus }); await load() }
    catch { setError('Unable to update status.') }
  }

  return (
    <div className="p-6 space-y-5">
      <PageHero
        badge="EXAMINATIONS"
        badgeColor="amber"
        title="Exam Sessions"
        subtitle="Schedule and manage examination sittings"
        icon="📝"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Exam Sessions</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create and manage examination sessions for each term</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Plus size={14} /> New Session
        </button>
      </div>

      {error && <div className="rounded-2xl p-4 text-sm text-rose-200 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />{error}</div>}
      {notice && <div className="rounded-2xl p-4 text-sm text-emerald-200 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />{notice}</div>}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <ClipboardList size={13} className="text-violet-400" />
          <p className="text-sm font-bold text-white">All Sessions</p>
          <span className="ml-auto text-[10px] font-bold text-slate-500 tabular-nums">{sessions.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Name', 'Term', 'Status', 'Dates', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-600">Loading sessions…</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <ClipboardList size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No exam sessions yet.</p>
                </td></tr>
              ) : sessions.map(s => {
                const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.Upcoming
                return (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 text-sm text-slate-200 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{terms.find(t => t.id === s.term)?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <select value={s.status} onChange={e => changeStatus(s, e.target.value)}
                        className="rounded-full px-3 py-1 text-[10px] font-bold uppercase cursor-pointer outline-none"
                        style={{ background: cfg.bg, color: cfg.color, border: 'none' }}>
                        {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{s.start_date} → {s.end_date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition hover:opacity-80"
                          style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                          <Pencil size={9} /> Edit
                        </button>
                        <button onClick={() => del(s.id)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition hover:opacity-80"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <Trash2 size={9} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(7,11,18,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-display font-semibold text-white">{editing ? 'Edit Session' : 'Create Session'}</h2>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Session name (e.g. End-Term 2025)" className={inputCls} style={inputStyle} />
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls} style={inputStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">Start date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} style={inputStyle} /></div>
              <div><label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-widest">End date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} style={inputStyle} /></div>
            </div>
            <select value={termId} onChange={e => setTermId(e.target.value ? Number(e.target.value) : '')} className={inputCls} style={inputStyle}>
              <option value="">No term linked</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)…" rows={2} className={inputCls + ' resize-none'} style={inputStyle} />
            <div className="flex gap-3 pt-1">
              <button onClick={save} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>{editing ? 'Update' : 'Create'}</button>
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-80" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
