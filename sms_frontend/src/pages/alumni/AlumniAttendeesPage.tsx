import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

interface Attendee {
  id: number
  event: number
  event_title?: string
  alumni: number
  alumni_name?: string
  registered_at?: string
  attended?: boolean
}

export default function AlumniAttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [events, setEvents] = useState<{ id: number; title: string }[]>([])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (eventFilter) params.event = eventFilter
      const [res, evRes] = await Promise.all([
        apiClient.get('/alumni/attendees/', { params }),
        apiClient.get('/alumni/events/'),
      ])
      setAttendees(res.data.results || res.data || [])
      setEvents(evRes.data.results || evRes.data || [])
    } catch {
      setError('Unable to load attendees data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventFilter])

  const fmtDate = (d?: string) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="ALUMNI"
        badgeColor="blue"
        title="Event Attendees"
        subtitle="Track alumni registrations and attendance across all events."
        icon="📋"
      />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <select
          value={eventFilter}
          onChange={e => setEventFilter(e.target.value)}
          className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">All events</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{attendees.length} attendee record{attendees.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-2xl glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Alumni</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Registered</th>
                <th className="px-6 py-4">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Loading attendees...</td></tr>
              ) : attendees.length > 0 ? attendees.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.025] transition">
                  <td className="px-6 py-4 font-medium text-white">{a.alumni_name ?? `Alumni #${a.alumni}`}</td>
                  <td className="px-6 py-4">{a.event_title ?? `Event #${a.event}`}</td>
                  <td className="px-6 py-4 text-slate-400">{fmtDate(a.registered_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.attended ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {a.attended ? 'Attended' : 'Registered'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No attendee records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
