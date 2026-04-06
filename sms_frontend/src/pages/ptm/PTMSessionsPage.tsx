import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { Calendar, MapPin, Clock, Plus, ChevronDown, ChevronUp, Video, X, CheckCircle, AlertCircle, User } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface PTMSession {
  id: number
  title: string
  date: string
  venue: string
  term_name: string
  slot_duration_minutes: number
  start_time: string
  end_time: string
  is_virtual: boolean
  notes: string
}

interface PTMSlot {
  id: number
  slot_time: string
  is_booked: boolean
  booking_student_name?: string
  booking_parent_name?: string
}

const INPUT = 'w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400'

export default function PTMSessionsPage() {
  const [sessions, setSessions] = useState<PTMSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [slots, setSlots] = useState<Record<number, PTMSlot[]>>({})
  const [slotsLoading, setSlotsLoading] = useState<Record<number, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [form, setForm] = useState({
    title: '', date: '', venue: '', start_time: '', end_time: '',
    slot_duration_minutes: '30', is_virtual: false, notes: '',
  })

  const [editSession, setEditSession] = useState<PTMSession | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '', date: '', venue: '', start_time: '', end_time: '',
    slot_duration_minutes: '30', is_virtual: false, notes: '',
  })

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    apiClient.get('/ptm/sessions/')
      .then(res => setSessions(Array.isArray(res.data) ? res.data : res.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleSlots(sessionId: number) {
    if (expandedId === sessionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(sessionId)
    if (slots[sessionId]) return
    setSlotsLoading(p => ({ ...p, [sessionId]: true }))
    try {
      const res = await apiClient.get(`/ptm/slots/?session=${sessionId}`)
      const data = res.data
      setSlots(p => ({ ...p, [sessionId]: Array.isArray(data) ? data : data.results ?? [] }))
    } catch {
      setSlots(p => ({ ...p, [sessionId]: [] }))
    } finally {
      setSlotsLoading(p => ({ ...p, [sessionId]: false }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.date || !form.start_time || !form.end_time) {
      showToast('Please fill in all required fields', false)
      return
    }
    setCreating(true)
    try {
      const res = await apiClient.post('/ptm/sessions/', {
        title: form.title,
        date: form.date,
        venue: form.venue,
        start_time: form.start_time,
        end_time: form.end_time,
        slot_duration_minutes: Number(form.slot_duration_minutes),
        is_virtual: form.is_virtual,
        notes: form.notes,
      })
      setSessions(prev => [res.data, ...prev])
      setShowCreate(false)
      setForm({ title: '', date: '', venue: '', start_time: '', end_time: '', slot_duration_minutes: '30', is_virtual: false, notes: '' })
      showToast('PTM session created successfully')
    } catch {
      showToast('Failed to create session — check all fields', false)
    } finally {
      setCreating(false)
    }
  }

  function openEditSession(session: PTMSession) {
    setEditSession(session)
    setEditForm({
      title: session.title,
      date: session.date,
      venue: session.venue || '',
      start_time: session.start_time,
      end_time: session.end_time,
      slot_duration_minutes: String(session.slot_duration_minutes),
      is_virtual: session.is_virtual,
      notes: session.notes || '',
    })
  }

  async function handleEditSession(e: React.FormEvent) {
    e.preventDefault()
    if (!editSession) return
    setEditSaving(true)
    try {
      const res = await apiClient.patch<PTMSession>(`/ptm/sessions/${editSession.id}/`, {
        title: editForm.title,
        date: editForm.date,
        venue: editForm.venue,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        slot_duration_minutes: Number(editForm.slot_duration_minutes),
        is_virtual: editForm.is_virtual,
        notes: editForm.notes,
      })
      setSessions(prev => prev.map(s => s.id === editSession.id ? res.data : s))
      setEditSession(null)
      showToast('Session updated successfully')
    } catch {
      showToast('Failed to update session', false)
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className="fixed top-5 right-5 z-[9999] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl"
          style={toast.ok
            ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
            : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
        >
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-3xl border p-6 space-y-4" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">Create PTM Session</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Session Title *</label>
                <input className={INPUT} placeholder="e.g. Term 2 2026 PTM" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Date *</label>
                  <input type="date" className={INPUT} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Slot Duration (min)</label>
                  <input type="number" min="5" max="120" className={INPUT} value={form.slot_duration_minutes} onChange={e => setForm(f => ({ ...f, slot_duration_minutes: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Start Time *</label>
                  <input type="time" className={INPUT} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">End Time *</label>
                  <input type="time" className={INPUT} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Venue</label>
                <input className={INPUT} placeholder="Main Hall / Google Meet link" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_virtual" checked={form.is_virtual} onChange={e => setForm(f => ({ ...f, is_virtual: e.target.checked }))} className="w-4 h-4 accent-emerald-500" />
                <label htmlFor="is_virtual" className="text-sm text-slate-300">Virtual session (online)</label>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <textarea className={INPUT + ' resize-none'} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: '#10b981', color: '#fff' }}>
                  {creating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageHero badge="PTM" badgeColor="violet" title="PTM Sessions" subtitle="Schedule and manage parent-teacher meetings" icon="🤝" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">PTM Sessions</h1>
          <p className="mt-1 text-sm text-slate-400">Manage parent-teacher meeting events and schedule slots.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition duration-200"
        >
          <Plus className="h-4 w-4" />
          Create Session
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 italic rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.02]">
            <Calendar className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p>No PTM sessions found. Create a session to start scheduling meetings.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
            >
              <Plus className="h-4 w-4" /> Create First Session
            </button>
          </div>
        ) : sessions.map((session) => (
          <div key={session.id} className="group relative rounded-2xl glass-panel overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{session.title}</h3>
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">{session.term_name}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span>{session.date}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>{session.start_time} - {session.end_time}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  {session.is_virtual ? <Video className="h-4 w-4 text-blue-400" /> : <MapPin className="h-4 w-4 text-slate-500" />}
                  <span className="truncate">{session.venue}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>{session.slot_duration_minutes} min / slot</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4">
                <button
                  onClick={() => toggleSlots(session.id)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition"
                >
                  {expandedId === session.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expandedId === session.id ? 'Hide Slots' : 'View Slots'}
                </button>
                <button
                  onClick={() => openEditSession(session)}
                  className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-400 transition"
                >
                  Edit Session
                </button>
              </div>
            </div>

            {/* Slots Panel */}
            {expandedId === session.id && (
              <div className="border-t border-white/[0.07] px-6 py-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                {slotsLoading[session.id] ? (
                  <p className="text-xs text-slate-400 py-2">Loading slots...</p>
                ) : (slots[session.id] ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No slots generated yet for this session.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(slots[session.id] ?? []).map(slot => (
                      <div
                        key={slot.id}
                        className="rounded-xl px-3 py-2 text-xs"
                        style={slot.is_booked
                          ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }
                          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <p className="font-bold text-white">{slot.slot_time}</p>
                        {slot.is_booked ? (
                          <div className="mt-1 flex items-center gap-1 text-emerald-400">
                            <User size={10} />
                            <span className="truncate">{slot.booking_student_name ?? 'Booked'}</span>
                          </div>
                        ) : (
                          <p className="text-slate-500 mt-0.5">Available</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-3xl border p-6 space-y-4" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">Edit PTM Session</h2>
              <button onClick={() => setEditSession(null)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleEditSession} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Session Title *</label>
                <input required className={INPUT} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Term 1 PTM" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Date *</label>
                  <input required type="date" className={INPUT} value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Slot Duration (min)</label>
                  <input type="number" min="5" max="120" className={INPUT} value={editForm.slot_duration_minutes} onChange={e => setEditForm(f => ({ ...f, slot_duration_minutes: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Start Time *</label>
                  <input required type="time" className={INPUT} value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">End Time *</label>
                  <input required type="time" className={INPUT} value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Venue</label>
                <input className={INPUT} value={editForm.venue} onChange={e => setEditForm(f => ({ ...f, venue: e.target.value }))} placeholder="Library / Hall / Google Meet link" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Notes</label>
                <textarea className={INPUT} rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional information..." />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded accent-emerald-500" checked={editForm.is_virtual} onChange={e => setEditForm(f => ({ ...f, is_virtual: e.target.checked }))} />
                <span className="text-sm text-slate-300">Virtual Meeting (online)</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editSaving}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditSession(null)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
