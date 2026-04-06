import { useState, useEffect } from 'react'
import { Video, Clock, Calendar, Link2, Play, ChevronLeft, ChevronRight, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

interface VirtualSession {
  id: number
  title: string
  course_name: string
  session_date: string
  start_time: string
  end_time: string
  meeting_link: string
  platform: string
  notes: string
  created_at: string
  course: number
}

interface Course {
  id: number
  title: string
  subject_name: string
}

type SessionStatus = 'live' | 'upcoming' | 'past'
type TabId = 'upcoming' | 'live' | 'past'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SUBJECT_COLORS: Record<string, { from: string; to: string }> = {
  'Mathematics':    { from: '#1d4ed8', to: '#3b82f6' },
  'Biology':        { from: '#166534', to: '#22c55e' },
  'Chemistry':      { from: '#581c87', to: '#a855f7' },
  'Physics':        { from: '#0c4a6e', to: '#0ea5e9' },
  'English':        { from: '#065f46', to: '#10b981' },
  'Kiswahili':      { from: '#92400e', to: '#f59e0b' },
  'History':        { from: '#7c2d12', to: '#f97316' },
  'Geography':      { from: '#14532d', to: '#84cc16' },
  'Computer Studies': { from: '#1e1b4b', to: '#6366f1' },
  'Business Studies': { from: '#1e3a5f', to: '#64748b' },
  'Agriculture':    { from: '#052e16', to: '#16a34a' },
}
function guessColors(title: string) {
  for (const [subj, colors] of Object.entries(SUBJECT_COLORS)) {
    if (title.toLowerCase().includes(subj.toLowerCase())) return colors
  }
  return { from: '#1e293b', to: '#475569' }
}

function getStatus(session: VirtualSession): SessionStatus {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  if (session.session_date < todayStr) return 'past'
  if (session.session_date > todayStr) return 'upcoming'

  const [h, m] = session.start_time.split(':').map(Number)
  const sessionStart = new Date()
  sessionStart.setHours(h, m, 0, 0)
  const [eh, em] = (session.end_time || '00:00').split(':').map(Number)
  const sessionEnd = new Date()
  sessionEnd.setHours(eh || h + 1, em || 30, 0, 0)

  if (today >= sessionStart && today <= sessionEnd) return 'live'
  if (today < sessionStart) return 'upcoming'
  return 'past'
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

function SessionCard({ s, status }: { s: VirtualSession; status: SessionStatus }) {
  const { from, to } = guessColors(s.title)
  const subjectLabel = s.title.split('—')[0]?.trim() ?? s.course_name
  const [startH, startM] = s.start_time.split(':')
  const timeDisplay = `${startH}:${startM}`

  return (
    <GlassCard className={`p-5 hover:border-slate-600 transition-all ${status === 'live' ? 'border-emerald-500/40' : ''}`}>
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {subjectLabel.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{s.title}</p>
            {status === 'live' && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE NOW
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{s.course_name} · {s.platform}</p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={12} /> {s.session_date}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {timeDisplay} → {s.end_time?.slice(0, 5)}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {status === 'live' ? (
            <a
              href={s.meeting_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: '#10b981', color: '#fff' }}
            >
              <Video size={13} /> Join Now
            </a>
          ) : status === 'upcoming' ? (
            <a
              href={s.meeting_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <Link2 size={13} /> Get Link
            </a>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
            >
              <Play size={13} /> Ended
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

const INPUT = 'w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400'

export default function ELearningVirtualSessionsPage() {
  const [sessions, setSessions] = useState<VirtualSession[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('upcoming')
  const [weekOffset, setWeekOffset] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [form, setForm] = useState({
    course: '',
    title: '',
    session_date: '',
    start_time: '',
    end_time: '',
    platform: 'Zoom',
    meeting_link: '',
    notes: '',
  })

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    Promise.all([
      apiClient.get('/elearning/sessions/'),
      apiClient.get('/elearning/courses/'),
    ]).then(([sRes, cRes]) => {
      const s = sRes.data
      const c = cRes.data
      setSessions(Array.isArray(s) ? s : s.results ?? [])
      setCourses(Array.isArray(c) ? c : c.results ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.course || !form.title || !form.session_date || !form.start_time) {
      showToast('Please fill in all required fields', false)
      return
    }
    setCreating(true)
    try {
      const res = await apiClient.post('/elearning/sessions/', {
        course: Number(form.course),
        title: form.title,
        session_date: form.session_date,
        start_time: form.start_time,
        end_time: form.end_time || form.start_time,
        platform: form.platform,
        meeting_link: form.meeting_link,
        notes: form.notes,
      })
      setSessions(prev => [res.data, ...prev])
      setShowCreate(false)
      setForm({ course: '', title: '', session_date: '', start_time: '', end_time: '', platform: 'Zoom', meeting_link: '', notes: '' })
      showToast('Session scheduled successfully')
    } catch {
      showToast('Failed to schedule session — check all fields and try again', false)
    } finally {
      setCreating(false)
    }
  }

  const categorized = sessions.map(s => ({ s, status: getStatus(s) }))
  const liveSessions = categorized.filter(x => x.status === 'live')
  const upcomingSessions = categorized.filter(x => x.status === 'upcoming')
  const pastSessions = categorized.filter(x => x.status === 'past')
  const shown = tab === 'live' ? liveSessions : tab === 'upcoming' ? upcomingSessions : pastSessions

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7)

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

      {/* Schedule Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-3xl border p-6 space-y-4" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">Schedule a Session</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Course *</label>
                <select className={INPUT} value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} required>
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.subject_name} — {c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Session Title *</label>
                <input className={INPUT} placeholder="e.g. Biology — Cell Division Live Review" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Date *</label>
                  <input type="date" className={INPUT} value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Platform *</label>
                  <select className={INPUT} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                    {['Zoom', 'Google Meet', 'Microsoft Teams', 'Webex', 'Other'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Start Time *</label>
                  <input type="time" className={INPUT} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">End Time</label>
                  <input type="time" className={INPUT} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Meeting Link</label>
                <input className={INPUT} placeholder="https://zoom.us/j/..." value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
                <textarea className={INPUT + ' resize-none'} rows={2} placeholder="Any notes for students..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: '#10b981', color: '#fff' }}>
                  {creating ? 'Scheduling...' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageHero
        badge="E-LEARNING"
        badgeColor="violet"
        title="Virtual Sessions"
        subtitle="Live classes, recordings and upcoming schedules"
        icon="🎓"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Virtual Sessions</h1>
          <p className="text-slate-400 text-sm mt-1">Live and recorded online classes with your teachers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold self-start transition-all hover:opacity-90"
          style={{ background: '#10b981', color: '#fff' }}
        >
          <Video size={15} /> Schedule Session
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Live Now', value: liveSessions.length, color: '#10b981' },
              { label: 'Upcoming', value: upcomingSessions.length, color: '#6366f1' },
              { label: 'Total Sessions', value: sessions.length, color: '#f59e0b' },
            ].map(s => (
              <GlassCard key={s.label} className="p-5 text-center">
                <p className="text-3xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </GlassCard>
            ))}
          </div>

          {/* Week Calendar Strip */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">
                Week of {weekStart.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <ChevronLeft size={16} className="text-slate-400" />
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}
                >
                  Today
                </button>
                <button
                  onClick={() => setWeekOffset(w => w + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, i) => {
                const d = new Date(weekStart)
                d.setDate(weekStart.getDate() + i)
                const isToday = d.toDateString() === today.toDateString()
                const dateStr = d.toISOString().slice(0, 10)
                const hasSessions = sessions.some(s => s.session_date === dateStr)
                return (
                  <div
                    key={day}
                    className={`rounded-xl p-2 text-center transition-all ${isToday ? 'border' : ''}`}
                    style={isToday
                      ? { background: 'rgba(16,185,129,0.15)', borderColor: '#10b981' }
                      : { background: 'rgba(255,255,255,0.03)' }}
                  >
                    <p className="text-xs text-slate-500">{day}</p>
                    <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-emerald-400' : 'text-white'}`}>{d.getDate()}</p>
                    {hasSessions && <div className="w-1.5 h-1.5 rounded-full mx-auto mt-1" style={{ background: isToday ? '#10b981' : '#6366f1' }} />}
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* Tab Bar */}
          <div className="flex gap-2">
            {(['upcoming', 'live', 'past'] as TabId[]).map(t => (
              <button
                key={t} onClick={() => setTab(t)}
                className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                style={tab === t
                  ? { background: '#10b981', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {t}{t === 'live' && liveSessions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-400 text-black font-bold">{liveSessions.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Sessions List */}
          <div className="space-y-3">
            {shown.length === 0 ? (
              <GlassCard className="p-10 text-center">
                <Video size={40} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 mb-4">No {tab} sessions</p>
                {tab === 'upcoming' && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: '#10b981', color: '#fff' }}
                  >
                    <Video size={14} /> Schedule First Session
                  </button>
                )}
              </GlassCard>
            ) : shown.map(({ s, status }) => <SessionCard key={s.id} s={s} status={status} />)}
          </div>
        </>
      )}
    </div>
  )
}
