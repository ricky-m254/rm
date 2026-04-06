import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

type TimetableEntry = {
  day: string
  start_time: string
  end_time: string
  subject: string
  teacher: string | null
  room: string | null
}

export default function StudentPortalTimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    apiClient.get<{ timetable: TimetableEntry[] } | TimetableEntry[]>('/student-portal/timetable/')
      .then(res => {
        if (!mounted) return
        const raw = res.data
        setEntries(Array.isArray(raw) ? raw : (raw.timetable ?? []))
        setIsLoading(false)
      })
      .catch(() => {
        if (mounted) { setError('Unable to load timetable.'); setIsLoading(false) }
      })
    return () => { mounted = false }
  }, [])

  const today = DAYS[new Date().getDay() - 1] ?? 'Monday'

  const byDay = DAYS.reduce<Record<string, TimetableEntry[]>>((acc, d) => {
    acc[d] = entries.filter(e => e.day?.toLowerCase() === d.toLowerCase())
    return acc
  }, {})

  const subjectColor = (sub: string) => {
    const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#06b6d4']
    let hash = 0
    for (const ch of sub) hash = (hash * 31 + ch.charCodeAt(0)) % colors.length
    return colors[hash]
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">My Timetable</h1>
        <p className="text-slate-500 text-sm mt-1">Weekly class schedule</p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading timetable…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={GLASS}>
          <p className="text-slate-400 text-sm">No timetable has been set up yet.</p>
          <p className="text-slate-600 text-xs mt-1">Contact your teacher or school admin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map(day => (
            <div key={day} className="rounded-2xl overflow-hidden" style={GLASS}>
              <div className={`px-5 py-3 flex items-center gap-2 border-b border-white/[0.07] ${day === today ? 'bg-sky-500/10' : ''}`}>
                <h3 className={`text-sm font-semibold ${day === today ? 'text-sky-300' : 'text-slate-400'}`}>
                  {day}
                  {day === today && <span className="ml-2 text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full">Today</span>}
                </h3>
              </div>
              {byDay[day].length === 0 ? (
                <p className="px-5 py-3 text-xs text-slate-600">No classes</p>
              ) : (
                <div className="p-3 flex flex-wrap gap-2">
                  {byDay[day]
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((e, i) => {
                      const color = subjectColor(e.subject)
                      return (
                        <div key={i} className="rounded-xl px-3 py-2.5 min-w-[140px]"
                          style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                          <p className="text-xs font-mono" style={{ color }}>{e.start_time} – {e.end_time}</p>
                          <p className="text-sm font-semibold text-slate-200 mt-0.5">{e.subject}</p>
                          {e.teacher && <p className="text-[10px] text-slate-500 mt-0.5">{e.teacher}</p>}
                          {e.room && <p className="text-[10px] text-slate-600">{e.room}</p>}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
