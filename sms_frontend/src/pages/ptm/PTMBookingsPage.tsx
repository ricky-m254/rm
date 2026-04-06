import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { User, Filter, Search, ChevronDown, ChevronUp, Phone, Mail, Clock, Plus, X } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface PTMBooking {
  id: number
  slot_time: string
  student_name: string
  parent_name: string
  parent_phone: string
  parent_email: string
  status: 'Confirmed' | 'Cancelled' | 'Completed'
  teacher_name: string
  session_title: string
}

interface PTMSession { id: number; title: string; date: string }
interface PTMSlot { id: number; slot_time: string; is_booked: boolean }
interface Student { id: number; first_name: string; last_name: string; admission_number?: string }

const INPUT = 'w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400'

export default function PTMBookingsPage() {
  const [bookings, setBookings] = useState<PTMBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [sessions, setSessions] = useState<PTMSession[]>([])
  const [availableSlots, setAvailableSlots] = useState<PTMSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [bookingForm, setBookingForm] = useState({
    session_id: '',
    slot: '',
    student: '',
    student_display: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  })

  const fetchBookings = () => {
    apiClient.get('/ptm/bookings/')
      .then(res => setBookings(Array.isArray(res.data) ? res.data : res.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBookings()
    apiClient.get('/ptm/sessions/').then(res => setSessions(Array.isArray(res.data) ? res.data : res.data.results ?? [])).catch(() => {})
  }, [])

  const loadSlots = (sessionId: string) => {
    if (!sessionId) { setAvailableSlots([]); return }
    setLoadingSlots(true)
    apiClient.get(`/ptm/slots/?session=${sessionId}`)
      .then(res => {
        const all: PTMSlot[] = Array.isArray(res.data) ? res.data : res.data.results ?? []
        setAvailableSlots(all.filter(s => !s.is_booked))
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false))
  }

  const searchStudents = (q: string) => {
    setStudentSearch(q)
    if (q.length < 2) { setStudents([]); return }
    apiClient.get('/students/', { params: { search: q } })
      .then(res => setStudents(Array.isArray(res.data) ? res.data : res.data.results ?? []))
      .catch(() => {})
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    if (!bookingForm.slot || !bookingForm.student || !bookingForm.parent_name) {
      setCreateError('Slot, student, and parent name are required.')
      return
    }
    setIsCreating(true)
    try {
      await apiClient.post('/ptm/bookings/', {
        slot: Number(bookingForm.slot),
        student: Number(bookingForm.student),
        parent_name: bookingForm.parent_name,
        parent_phone: bookingForm.parent_phone,
        parent_email: bookingForm.parent_email,
        status: 'Confirmed',
      })
      setShowCreate(false)
      setBookingForm({ session_id: '', slot: '', student: '', student_display: '', parent_name: '', parent_phone: '', parent_email: '' })
      setStudents([])
      setStudentSearch('')
      fetchBookings()
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create booking.')
    } finally {
      setIsCreating(false)
    }
  }

  const filtered = bookings.filter(b =>
    !search ||
    b.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.teacher_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHero badge="PTM" badgeColor="violet" title="PTM Bookings" subtitle="Parent-teacher meeting appointment bookings" icon="🤝" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">PTM Bookings</h1>
          <p className="mt-1 text-sm text-slate-400">All scheduled meetings between parents and teachers.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:opacity-90"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <Plus size={14} /> New Booking
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student, parent, or teacher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setSearch('')}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <Filter className="h-4 w-4 text-slate-500" />
          Clear
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel shadow-xl backdrop-blur-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.025] uppercase tracking-widest text-[10px] font-bold text-slate-500">
              <th className="px-6 py-4 font-semibold text-slate-300">Time & Session</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Student & Parent</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Teacher</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading bookings...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  {search ? 'No bookings match your search.' : 'No bookings found.'}
                </td>
              </tr>
            ) : filtered.map((booking) => (
              <>
                <tr key={booking.id} className="group hover:bg-emerald-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-semibold">{booking.slot_time}</span>
                      <span className="text-xs text-slate-500 truncate">{booking.session_title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-medium">{booking.student_name}</span>
                      <span className="text-xs text-slate-400">P: {booking.parent_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-600" />
                      <span className="text-slate-200">{booking.teacher_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        booking.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        booking.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400' : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition ml-auto"
                    >
                      {expandedId === booking.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      Details
                    </button>
                  </td>
                </tr>
                {expandedId === booking.id && (
                  <tr key={`detail-${booking.id}`} className="bg-slate-900/40">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} className="text-slate-500" />
                          <span className="text-slate-400">Slot:</span>
                          <span className="text-slate-200 font-medium">{booking.slot_time}</span>
                        </div>
                        {booking.parent_phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone size={14} className="text-slate-500" />
                            <span className="text-slate-400">Phone:</span>
                            <a href={`tel:${booking.parent_phone}`} className="text-emerald-400 hover:text-emerald-300">{booking.parent_phone}</a>
                          </div>
                        )}
                        {booking.parent_email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={14} className="text-slate-500" />
                            <span className="text-slate-400">Email:</span>
                            <a href={`mailto:${booking.parent_email}`} className="text-emerald-400 hover:text-emerald-300 truncate">{booking.parent_email}</a>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-3xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">New PTM Booking</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {createError && (
              <div className="rounded-xl p-3 text-xs text-rose-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Session *</label>
                <select
                  className={INPUT}
                  style={{ colorScheme: 'dark' }}
                  value={bookingForm.session_id}
                  onChange={e => {
                    const sid = e.target.value
                    setBookingForm(f => ({ ...f, session_id: sid, slot: '' }))
                    loadSlots(sid)
                  }}
                >
                  <option value="">Select a session…</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.title} ({s.date})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Available Slot *</label>
                <select
                  className={INPUT}
                  style={{ colorScheme: 'dark' }}
                  value={bookingForm.slot}
                  onChange={e => setBookingForm(f => ({ ...f, slot: e.target.value }))}
                  disabled={!bookingForm.session_id || loadingSlots}
                >
                  <option value="">{loadingSlots ? 'Loading slots…' : availableSlots.length === 0 ? 'No available slots' : 'Select a slot…'}</option>
                  {availableSlots.map(sl => <option key={sl.id} value={sl.id}>{sl.slot_time}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Student *</label>
                {bookingForm.student ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <User size={14} className="text-emerald-400" />
                    <span className="flex-1 text-emerald-300">{bookingForm.student_display}</span>
                    <button type="button" onClick={() => setBookingForm(f => ({ ...f, student: '', student_display: '' }))}
                      className="text-slate-500 hover:text-rose-400 transition">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      className={INPUT}
                      placeholder="Search by name or admission no…"
                      value={studentSearch}
                      onChange={e => searchStudents(e.target.value)}
                    />
                    {students.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-xl border border-white/[0.09] bg-[#0d1421] shadow-2xl p-1">
                        {students.map(st => (
                          <button key={st.id} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-500/20 rounded-lg transition flex justify-between"
                            onClick={() => {
                              setBookingForm(f => ({ ...f, student: String(st.id), student_display: `${st.first_name} ${st.last_name}` }))
                              setStudents([])
                              setStudentSearch('')
                            }}>
                            <span>{st.first_name} {st.last_name}</span>
                            <span className="text-slate-500 font-mono text-xs">{st.admission_number}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Parent Name *</label>
                <input required className={INPUT} value={bookingForm.parent_name}
                  onChange={e => setBookingForm(f => ({ ...f, parent_name: e.target.value }))} placeholder="Full name of parent/guardian" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Parent Phone</label>
                  <input className={INPUT} value={bookingForm.parent_phone}
                    onChange={e => setBookingForm(f => ({ ...f, parent_phone: e.target.value }))} placeholder="+254 700 000 000" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Parent Email</label>
                  <input type="email" className={INPUT} value={bookingForm.parent_email}
                    onChange={e => setBookingForm(f => ({ ...f, parent_email: e.target.value }))} placeholder="parent@email.com" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isCreating}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  {isCreating ? 'Booking…' : 'Confirm Booking'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
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
