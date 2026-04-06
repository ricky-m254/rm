import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Calendar, Clock, MapPin, BookOpen, AlertCircle } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const PERIOD_COLORS = [
  '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899',
  '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#0284c7',
]

type TimetableEntry = {
  id: number
  day: string
  start_time: string
  end_time: string
  subject_name: string
  class_name: string
  room?: string
}

export default function TeacherPortalTimetablePage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly')
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() - 1] ?? DAYS[0])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiClient.get<TimetableEntry[]>('/teacher-portal/timetable/')
        setTimetable(response.data ?? [])
      } catch {
        setTimetable([])
        setError('Unable to load timetable.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const todayEntries = timetable.filter(t => t.day === selectedDay).sort((a, b) => a.start_time.localeCompare(b.start_time))
  const totalPeriods = timetable.length
  const uniqueClasses = [...new Set(timetable.map(t => t.class_name))].length

  return (
    <div className="space-y-6">
      <PageHero badge="TEACHER" badgeColor="purple" title="My Timetable" subtitle="Your weekly teaching schedule across all classes" icon="TT" />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Periods/Week', value: loading ? '...' : totalPeriods, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Classes Taught', value: loading ? '...' : uniqueClasses, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Today\'s Classes', value: loading ? '...' : timetable.filter(t => t.day === selectedDay).length, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Free Periods', value: loading ? '...' : Math.max(0, 5 - timetable.filter(t => t.day === selectedDay).length), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['weekly', 'daily'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className="rounded-lg px-4 py-2 text-xs font-semibold capitalize transition"
              style={{
                background: viewMode === m ? 'rgba(139,92,246,0.2)' : 'transparent',
                color: viewMode === m ? '#c4b5fd' : '#64748b',
              }}>
              {m} view
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map(d => (
            <button key={d} onClick={() => { setSelectedDay(d); setViewMode('daily') }}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
              style={{
                background: selectedDay === d && viewMode === 'daily' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                color: selectedDay === d && viewMode === 'daily' ? '#c4b5fd' : '#64748b',
                border: selectedDay === d && viewMode === 'daily' ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'daily' && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-white">{selectedDay}'s Schedule</p>
          {loading ? (
            <div className="rounded-2xl p-8 text-center" style={GLASS}>
              <p className="text-slate-500">Loading timetable...</p>
            </div>
          ) : todayEntries.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={GLASS}>
              <Calendar size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500">No classes scheduled for {selectedDay}.</p>
            </div>
          ) : todayEntries.map((entry, i) => (
            <div key={entry.id} className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.01]"
              style={{ background: `${PERIOD_COLORS[i % PERIOD_COLORS.length]}0d`, border: `1px solid ${PERIOD_COLORS[i % PERIOD_COLORS.length]}25` }}>
              <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center shrink-0"
                style={{ background: `${PERIOD_COLORS[i % PERIOD_COLORS.length]}18` }}>
                <Clock size={12} style={{ color: PERIOD_COLORS[i % PERIOD_COLORS.length] }} />
                <p className="text-[10px] font-bold mt-0.5" style={{ color: PERIOD_COLORS[i % PERIOD_COLORS.length] }}>P{i + 1}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{entry.subject_name}</p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-1"><BookOpen size={10} />{entry.class_name}</span>
                  {entry.room && <span className="flex items-center gap-1"><MapPin size={10} />{entry.room}</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{entry.start_time}</p>
                <p className="text-xs text-slate-500">{entry.end_time}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'weekly' && (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20">Time</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{d.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map(time => (
                  <tr key={time} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">{time}</td>
                    {DAYS.map(day => {
                      const entry = timetable.find(t => t.day === day && String(t.start_time).startsWith(time))
                      const color = entry ? PERIOD_COLORS[timetable.indexOf(entry) % PERIOD_COLORS.length] : ''
                      return (
                        <td key={day} className="px-3 py-3">
                          {entry ? (
                            <div className="rounded-xl px-2.5 py-2 min-w-[80px]" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                              <p className="text-[11px] font-semibold" style={{ color }}>{entry.subject_name}</p>
                              <p className="text-[10px] text-slate-500">{entry.class_name}</p>
                            </div>
                          ) : (
                            <div className="rounded-xl px-2.5 py-2 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <p className="text-[10px] text-slate-700">-</p>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
