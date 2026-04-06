import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { X, Users } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

interface AlumniEvent {
  id: number
  title: string
  description?: string
  event_date: string
  location?: string
  is_virtual?: boolean
  attendee_count?: number
}

interface AlumniProfile {
  id: number
  first_name: string
  last_name: string
  graduation_year: number
}

export default function AlumniEventsPage() {
  const [events, setEvents] = useState<AlumniEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAttendees, setShowAttendees] = useState<AlumniEvent | null>(null)
  const [attendees, setAttendees] = useState<any[]>([])
  const [profiles, setProfiles] = useState<AlumniProfile[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingAttendee, setAddingAttendee] = useState(false)
  const [selectedAlumni, setSelectedAlumni] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    is_virtual: false,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/alumni/events/')
      setEvents(res.data.results || res.data || [])
    } catch {
      setError('Unable to load events.')
    } finally {
      setLoading(false)
    }
  }

  const loadProfiles = async () => {
    try {
      const res = await apiClient.get('/alumni/profiles/?page_size=200')
      setProfiles(res.data.results || res.data || [])
    } catch {
      setProfiles([])
    }
  }

  useEffect(() => {
    load()
    loadProfiles()
  }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.event_date) {
      setMsg('Title and date are required.')
      return
    }
    setSaving(true)
    try {
      const res = await apiClient.post('/alumni/events/', form)
      setEvents(prev => [res.data, ...prev])
      setMsg('Event created!')
      setForm({ title: '', description: '', event_date: '', location: '', is_virtual: false })
      setTimeout(() => { setShowAdd(false); setMsg('') }, 1500)
    } catch {
      setMsg('Failed to create event.')
    } finally {
      setSaving(false)
    }
  }

  const openAttendees = async (event: AlumniEvent) => {
    setShowAttendees(event)
    setLoadingAttendees(true)
    setAttendees([])
    try {
      const res = await apiClient.get(`/alumni/attendees/?event=${event.id}`)
      setAttendees(res.data.results || res.data || [])
    } catch {
      setAttendees([])
    } finally {
      setLoadingAttendees(false)
    }
  }

  const addAttendee = async () => {
    if (!selectedAlumni || !showAttendees) return
    setAddingAttendee(true)
    try {
      await apiClient.post('/alumni/attendees/', { event: showAttendees.id, alumni: Number(selectedAlumni) })
      setSelectedAlumni('')
      await openAttendees(showAttendees)
    } catch {
      setMsg('Failed to add attendee.')
    } finally {
      setAddingAttendee(false)
    }
  }

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50'
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ALUMNI"
        badgeColor="violet"
        title="Alumni Events"
        subtitle="Organize reunions, networking events, and alumni gatherings."
        icon="🎉"
        actions={
          <button onClick={() => setShowAdd(true)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Create Event
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
      )}

      <div className="rounded-2xl glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Attendees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading events...</td></tr>
              ) : events.length > 0 ? events.map((ev) => (
                <tr key={ev.id} className="hover:bg-white/[0.025] transition">
                  <td className="px-6 py-4 font-medium text-white">{ev.title}</td>
                  <td className="px-6 py-4">{fmtDate(ev.event_date)}</td>
                  <td className="px-6 py-4">{ev.location || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ev.is_virtual ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {ev.is_virtual ? 'Virtual' : 'In-person'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => openAttendees(ev)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:border-emerald-400/50 transition">
                      <Users size={12} />
                      View attendees
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No events found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">Create Alumni Event</h2>
              <button onClick={() => { setShowAdd(false); setMsg('') }} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Event Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="e.g. Class of 2020 Reunion" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Event Date *</label>
                <input required type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="e.g. School Hall, Nairobi" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Brief description of the event..." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_virtual" checked={form.is_virtual} onChange={e => setForm(f => ({ ...f, is_virtual: e.target.checked }))}
                  className="rounded" />
                <label htmlFor="is_virtual" className="text-sm text-slate-300">Virtual event</label>
              </div>
              {msg && <p className={`text-xs font-medium ${msg.includes('Failed') ? 'text-rose-400' : 'text-emerald-400'}`}>{msg}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setMsg('') }}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-300 transition"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-slate-950 transition hover:opacity-90" style={{ background: '#10b981' }}>
                  {saving ? 'Creating…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto" style={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-bold text-white">{showAttendees.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Attendees — {fmtDate(showAttendees.event_date)}</p>
              </div>
              <button onClick={() => setShowAttendees(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex gap-2">
              <select value={selectedAlumni} onChange={e => setSelectedAlumni(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">Select alumni to add…</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.graduation_year})</option>
                ))}
              </select>
              <button onClick={addAttendee} disabled={!selectedAlumni || addingAttendee}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                style={{ background: '#10b981' }}>
                {addingAttendee ? '…' : 'Add'}
              </button>
            </div>

            {loadingAttendees ? (
              <p className="text-sm text-slate-400">Loading attendees...</p>
            ) : attendees.length > 0 ? (
              <div className="space-y-1.5">
                {attendees.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="text-white">{a.alumni_name ?? `Alumni #${a.alumni}`}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.attended ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {a.attended ? 'Attended' : 'Registered'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No attendees yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
