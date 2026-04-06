import { useState } from 'react'
import { apiClient } from '../../api/client'
import { Clock, Plus, Trash2, AlertCircle, Check } from 'lucide-react'
import PageHero from '../../components/PageHero'

const cls = 'w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400 transition placeholder:text-slate-600'

interface BreakTime { name: string; start: string; end: string }

export default function SettingsTimetableConfigPage() {
  const [schoolDays, setSchoolDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  const [periodsPerDay, setPeriodsPerDay] = useState(8)
  const [lessonDuration, setLessonDuration] = useState(40)
  const [schoolStartTime, setSchoolStartTime] = useState('07:30')
  const [schoolEndTime, setSchoolEndTime] = useState('17:00')
  const [doublePeriodsEnabled, setDoublePeriodsEnabled] = useState(true)
  const [autoConflictCheck, setAutoConflictCheck] = useState(true)
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([
    { name: 'Morning Break', start: '10:30', end: '10:50' },
    { name: 'Lunch Break', start: '13:00', end: '14:00' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const toggleDay = (day: string) => setSchoolDays(d => d.includes(day) ? d.filter(x => x !== day) : [...d, day])

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.patch('/school/profile/', {
        timetable_config: { school_days: schoolDays, periods_per_day: periodsPerDay, lesson_duration: lessonDuration, school_start_time: schoolStartTime, school_end_time: schoolEndTime, double_periods: doublePeriodsEnabled, auto_conflict_check: autoConflictCheck, break_times: breakTimes }
      })
      setSuccess('Timetable configuration saved.')
    } catch { setError('Failed to save configuration.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="Timetable Config"
        subtitle="Periods, days and timetable structure"
        icon="⚙️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Timetable Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">Configure the school day structure, lesson duration, periods, and break times for the automated timetable generator.</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><Check className="h-4 w-4" />{success}</div>}

      {/* School Week */}
      <section className="rounded-2xl glass-panel p-6 space-y-5">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-sky-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">School Week</h2></div>
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-widest">School Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button key={day} onClick={() => toggleDay(day)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${schoolDays.includes(day) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'border border-white/[0.09] text-slate-500 hover:border-slate-500'}`}>
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">School Start Time</label>
            <input type="time" value={schoolStartTime} onChange={e => setSchoolStartTime(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">School End Time</label>
            <input type="time" value={schoolEndTime} onChange={e => setSchoolEndTime(e.target.value)} className={cls} />
          </div>
        </div>
      </section>

      {/* Periods */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Lesson Periods</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Periods Per Day</label>
            <input type="number" min={1} max={20} value={periodsPerDay} onChange={e => setPeriodsPerDay(+e.target.value)} className={cls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-semibold uppercase tracking-widest">Lesson Duration (min)</label>
            <input type="number" min={10} max={120} value={lessonDuration} onChange={e => setLessonDuration(+e.target.value)} className={cls} />
            <p className="text-[10px] text-slate-600 mt-1">Typical: 40 mins. Double period = 80 mins.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={doublePeriodsEnabled} onChange={e => setDoublePeriodsEnabled(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-300">Allow double periods</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoConflictCheck} onChange={e => setAutoConflictCheck(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-300">Auto-detect scheduling conflicts</span>
          </label>
        </div>
        {/* Preview */}
        <div className="rounded-xl border border-white/[0.09] bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500 mb-2 font-semibold">School Day Preview</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: periodsPerDay }).map((_, i) => {
              const startMins = schoolStartTime.split(':').reduce((h, m, idx) => idx === 0 ? h + +m * 60 : h + +m, 0) + i * lessonDuration
              const h = Math.floor(startMins / 60) % 24
              const m = startMins % 60
              return (
                <div key={i} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-2 py-1 text-center min-w-[56px]">
                  <p className="text-[9px] text-slate-500">P{i + 1}</p>
                  <p className="text-[10px] font-mono text-slate-300">{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Break Times */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Break Times</h2></div>
        <div className="space-y-2">
          {breakTimes.map((b, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={b.name} onChange={e => setBreakTimes(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Break name" className={`${cls} col-span-5`} />
              <input type="time" value={b.start} onChange={e => setBreakTimes(p => p.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} className={`${cls} col-span-3`} />
              <input type="time" value={b.end} onChange={e => setBreakTimes(p => p.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} className={`${cls} col-span-3`} />
              <button onClick={() => setBreakTimes(p => p.filter((_, j) => j !== i))} className="col-span-1 text-slate-600 hover:text-rose-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-600 px-1">
          <div className="col-span-5">Break Name</div><div className="col-span-3">Start</div><div className="col-span-3">End</div>
        </div>
        <button onClick={() => setBreakTimes(p => [...p, { name: '', start: '10:00', end: '10:20' }])}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
          <Plus className="h-3.5 w-3.5" /> Add Break
        </button>
      </section>

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-8 py-2.5 text-sm font-bold text-slate-950 transition">
          {saving ? 'Saving…' : 'Save Timetable Configuration'}
        </button>
      </div>
    </div>
  )
}
