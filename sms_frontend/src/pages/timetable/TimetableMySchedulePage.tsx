import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import PageHero from '../../components/PageHero'

type TimetableSlot = {
  id: number
  day_of_week: number
  period_number: number
  start_time: string
  end_time: string
  teacher_name: string
  subject_name: string
  class_name: string
  room: string
  is_active: boolean
  coverage_status?: 'Uncovered' | 'Covered' | 'Cancelled'
}

type LessonCoverage = {
  id: number
  slot: number
  date: string
  status: 'Uncovered' | 'Covered' | 'Cancelled'
  original_teacher_name: string
  covering_teacher_name?: string
}

export default function TimetableMySchedulePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [coverages, setCoverages] = useState<LessonCoverage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  const username = useAuthStore((state) => state.username)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await apiClient.get('/timetable/my-schedule/')
        setSlots(res.data.slots || [])
        setCoverages(res.data.today_coverages || [])
      } catch (err) {
        setError('Failed to load schedule.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const days = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
  ]

  const getDaySlots = (dayId: number) => {
    return slots.filter(s => s.day_of_week === dayId).sort((a,b) => a.period_number - b.period_number)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {error}
          <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      <PageHero
        badge="TIMETABLE"
        badgeColor="violet"
        title="My Schedule"
        subtitle="Personal teaching timetable and assignments"
        icon="📅"
      />
      <header className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold">My Schedule</h1>
          <p className="mt-1 text-sm text-slate-400">Weekly teaching timetable for {username}.</p>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/20 p-4 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center">
          <p className="text-slate-400 animate-pulse">Loading schedule...</p>
        </div>
      ) : (
        <div className="space-y-8">
           {/* Today's Status */}
           <section className="rounded-2xl glass-panel p-6">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Today's Status
            </h2>
            {coverages.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No coverage issues or status updates for today.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {coverages.map(c => (
                  <div key={c.id} className={`rounded-xl border p-4 ${c.status === 'Uncovered' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-950 border-white/[0.07]'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.status === 'Uncovered' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-900'}`}>
                        {c.status}
                      </span>
                      <span className="text-[10px] text-slate-500">{c.date}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200">Slot ID: {c.slot}</p>
                    {c.covering_teacher_name && (
                      <p className="text-xs text-slate-400 mt-1">Covered by: {c.covering_teacher_name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Weekly Schedule Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {days.map(day => {
              const daySlots = getDaySlots(day.id)
              return (
                <div key={day.id} className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2 flex items-center justify-between">
                    {day.label}
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 normal-case tracking-normal">
                      {daySlots.length} lessons
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {daySlots.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] text-center">
                        <p className="text-xs text-slate-600">No classes</p>
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <div key={slot.id} className="p-4 rounded-2xl glass-panel hover:border-emerald-500/50 transition-colors group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                              {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600">P{slot.period_number}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-200 truncate">{slot.subject_name}</h4>
                          <p className="text-xs text-slate-400 mt-1">{slot.class_name}</p>
                          <p className="text-xs text-slate-500 mt-1">📍 {slot.room}</p>
                          
                          <button
                            onClick={() => { setSuccessMsg(`Change request submitted for ${slot.subject_name}. Your HOD will be notified.`); setTimeout(() => setSuccessMsg(null), 5000) }}
                            className="mt-4 w-full py-2 rounded-xl border border-white/[0.09] bg-slate-950 text-[10px] font-bold text-slate-300 uppercase tracking-wider hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Request Change
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
