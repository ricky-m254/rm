import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { Calendar, ClipboardList, Clock, Tag } from 'lucide-react'
import { getParentPortalErrorMessage } from './errors'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const EVENT_COLOR: Record<string, string> = {
  Holiday: '#10b981',
  Exam: '#f59e0b',
  Meeting: '#38bdf8',
  Sports: '#a855f7',
  Academic: '#6366f1',
}

const categoryColor = (cat: string) => {
  const m: Record<string, string> = {
    Assignment: '#f59e0b',
    Exam: '#ef4444',
    Quiz: '#a855f7',
    Test: '#f97316',
  }
  return m[cat] ?? '#38bdf8'
}

export default function ParentPortalSchedulePage() {
  const [timetable, setTimetable] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'assessments' | 'events'>('events')

  useEffect(() => {
    Promise.all([
      apiClient.get('/parent-portal/timetable/'),
      apiClient.get('/parent-portal/calendar/'),
    ])
      .then(([t, c]) => {
        setTimetable(Array.isArray(t.data) ? t.data : [])
        setCalendar(Array.isArray(c.data) ? c.data : [])
      })
      .catch(err => setError(getParentPortalErrorMessage(err, 'Unable to load schedule data.')))
      .finally(() => setLoading(false))
  }, [])

  const upcomingEvents = calendar.filter((e: any) => {
    if (!e.start_date) return true
    return new Date(e.start_date) >= new Date(new Date().toDateString())
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1">SCHEDULE</p>
        <h1 className="text-2xl font-display font-bold text-white">Timetable & Schedule</h1>
        <p className="text-slate-500 text-sm mt-1">Upcoming assessments and school calendar events</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Upcoming Events', value: upcomingEvents.length, icon: Calendar, color: '#a855f7' },
          { label: 'Assessments', value: timetable.length, icon: ClipboardList, color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={GLASS}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} style={{ color: k.color }} />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k.label}</p>
            </div>
            <p className="text-3xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['events', 'assessments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {t === 'events' ? `Calendar Events (${calendar.length})` : `Assessments (${timetable.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading schedule…</div>
      ) : tab === 'events' ? (
        <div className="space-y-3">
          {calendar.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>No calendar events found.</div>
          ) : calendar.map((ev: any, i: number) => {
            const color = EVENT_COLOR[ev.event_type] ?? '#94a3b8'
            const isPast = ev.start_date && new Date(ev.start_date) < new Date(new Date().toDateString())
            return (
              <div key={ev.id ?? i} className="rounded-2xl p-5 flex items-start gap-4" style={{ ...GLASS, opacity: isPast ? 0.5 : 1 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
                  <Calendar size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-200">{ev.title}</p>
                    {isPast && <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full">Past</span>}
                  </div>
                  {ev.event_type && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${color}18`, color }}>
                      {ev.event_type}
                    </span>
                  )}
                  <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                    {ev.start_date && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(ev.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {ev.end_date && ev.end_date !== ev.start_date && ` → ${new Date(ev.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {timetable.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>No assessments scheduled.</div>
          ) : timetable.map((item: any, i: number) => {
            const color = categoryColor(item.category)
            return (
              <div key={i} className="rounded-2xl p-4 flex items-center justify-between gap-4" style={GLASS}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                    <Tag size={13} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.assessment}</p>
                    <p className="text-xs text-slate-500">{item.subject}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${color}18`, color }}>
                    {item.category || 'Assessment'}
                  </span>
                  {item.date && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
                      <Clock size={9} />
                      {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
