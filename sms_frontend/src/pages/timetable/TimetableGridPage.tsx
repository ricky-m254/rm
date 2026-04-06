import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type TimetableSlot = {
  id: number
  day_of_week: number
  period_number: number
  start_time: string
  end_time: string
  teacher: number | null
  teacher_name: string
  subject: number | null
  subject_name: string
  school_class: number | null
  class_name: string
  room: string
  is_active: boolean
  term: number | null
  notes: string
  coverage_status?: 'Uncovered' | 'Covered' | 'Cancelled'
}

type GridData = Record<number, TimetableSlot[]>

export default function TimetableGridPage() {
  const [gridData, setGridData] = useState<GridData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewBy, setViewBy] = useState<'class' | 'teacher'>('class')
  const [selectedId, setSelectedId] = useState<string>('')
  const [notice, setNotice] = useState<string | null>(null)

  const [classes, setClasses] = useState<{ id: number; display_name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: number; full_name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([])
  const [terms, setTerms] = useState<{ id: number; name: string }[]>([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [newDay, setNewDay] = useState('1')
  const [newPeriod, setNewPeriod] = useState('1')
  const [newStartTime, setNewStartTime] = useState('08:00')
  const [newEndTime, setNewEndTime] = useState('08:40')
  const [newTeacherId, setNewTeacherId] = useState('')
  const [newSubjectId, setNewSubjectId] = useState('')
  const [newClassId, setNewClassId] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [newTermId, setNewTermId] = useState('')

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [classRes, teacherRes, subjectRes, termRes] = await Promise.all([
          apiClient.get('/academics/classes/'),
          apiClient.get('/hr/employees/'),
          apiClient.get('/academics/subjects/'),
          apiClient.get('/academics/terms/'),
        ])
        setClasses(classRes.data.results || classRes.data)
        const teacherData = teacherRes.data.results || teacherRes.data
        setTeachers(teacherData.map((t: any) => ({
          id: t.user,
          full_name: `${t.first_name} ${t.last_name}`.trim() || t.employee_id,
        })).filter((t: any) => t.id))
        setSubjects(subjectRes.data.results || subjectRes.data)
        setTerms(termRes.data.results || termRes.data)
      } catch (err) {
        console.error('Failed to load metadata', err)
      }
    }
    loadMetadata()
  }, [])

  const fetchGrid = async () => {
    if (!selectedId) return
    setIsLoading(true)
    try {
      const params: any = {}
      if (viewBy === 'class') params.class_id = selectedId
      else params.teacher_id = selectedId
      const res = await apiClient.get<GridData>('/timetable/grid/', { params })
      setGridData(res.data)
      setError(null)
    } catch (err) {
      setError('Failed to load timetable grid.')
    } finally {
      setIsLoading(false)
    }
  }

  const openAddModal = (day?: number, period?: number) => {
    setNewDay(String(day ?? 1))
    setNewPeriod(String(period ?? 1))
    setNewStartTime('08:00'); setNewEndTime('08:40')
    setNewTeacherId(''); setNewSubjectId('')
    setNewClassId(viewBy === 'class' && selectedId ? selectedId : '')
    setNewRoom(''); setNewTermId('')
    setShowAddModal(true)
  }

  const saveSlot = async () => {
    if (!newSubjectId || !newClassId || !newStartTime || !newEndTime) return
    setError(null)
    try {
      await apiClient.post('/timetable/slots/', {
        day_of_week: Number(newDay),
        period_number: Number(newPeriod),
        start_time: newStartTime,
        end_time: newEndTime,
        teacher: newTeacherId ? Number(newTeacherId) : null,
        subject: Number(newSubjectId),
        school_class: Number(newClassId),
        room: newRoom.trim(),
        term: newTermId ? Number(newTermId) : null,
        is_active: true,
      })
      setShowAddModal(false)
      setNotice('Slot added.')
      await fetchGrid()
    } catch { setError('Unable to add slot.') }
  }

  const deleteSlot = async (slotId: number) => {
    if (!confirm('Delete this timetable slot?')) return
    try { await apiClient.delete(`/timetable/slots/${slotId}/`); await fetchGrid() }
    catch { setError('Unable to delete slot.') }
  }

  useEffect(() => {
    fetchGrid()
  }, [viewBy, selectedId])

  const days = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
  ]
  
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

  const getSlot = (day: number, period: number) => {
    return (gridData[day] ?? []).find(s => s.period_number === period)
  }

  const getSubjectColor = (id: number | null) => {
    if (!id) return 'bg-slate-800'
    const colors = [
      'bg-blue-500/20 border-blue-500/50 text-blue-200',
      'bg-purple-500/20 border-purple-500/50 text-purple-200',
      'bg-amber-500/20 border-amber-500/50 text-amber-200',
      'bg-emerald-500/20 border-emerald-500/50 text-emerald-200',
      'bg-rose-500/20 border-rose-500/50 text-rose-200',
      'bg-indigo-500/20 border-indigo-500/50 text-indigo-200',
      'bg-cyan-500/20 border-cyan-500/50 text-cyan-200',
    ]
    return colors[id % colors.length]
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="TIMETABLE"
        badgeColor="violet"
        title="Timetable Grid"
        subtitle="Visual weekly timetable for all classes"
        icon="📅"
      />
      <header className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold">Weekly Timetable</h1>
          <p className="mt-1 text-sm text-slate-400">Manage and view lesson schedules.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm font-medium text-slate-200 hover:border-white/20 transition">
            🖨️ Print
          </button>
          <button onClick={() => openAddModal()} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition">
            + Add Slot
          </button>
        </div>
      </header>

      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <section className="rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex rounded-xl bg-slate-950 p-1">
            <button
              onClick={() => { setViewBy('class'); setSelectedId(''); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${viewBy === 'class' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              By Class
            </button>
            <button
              onClick={() => { setViewBy('teacher'); setSelectedId(''); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${viewBy === 'teacher' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              By Teacher
            </button>
          </div>

          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-slate-950 border border-white/[0.07] rounded-xl px-4 py-2 text-sm text-slate-200 min-w-[200px]"
          >
            <option value="">Select {viewBy === 'class' ? 'Class' : 'Teacher'}...</option>
            {viewBy === 'class' ? (
              classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)
            ) : (
              teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)
            )}
          </select>
        </div>

        {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}

        {!selectedId ? (
          <div className="py-20 text-center border-2 border-dashed border-white/[0.07] rounded-2xl">
            <p className="text-slate-500">Select a {viewBy} to view the timetable.</p>
          </div>
        ) : isLoading ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 animate-pulse">Loading timetable data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-white/[0.07] bg-slate-950/50 text-xs text-slate-500 font-medium uppercase tracking-wider w-20">Period</th>
                  {days.map(day => (
                    <th key={day.id} className="p-3 border border-white/[0.07] bg-slate-950/50 text-sm font-semibold text-slate-200">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period}>
                    <td className="p-2 border border-white/[0.07] text-center bg-slate-950/30">
                      <span className="text-lg font-bold text-slate-700">{period}</span>
                    </td>
                    {days.map(day => {
                      const slot = getSlot(day.id, period)
                      return (
                        <td key={`${day.id}-${period}`} className="p-1 border border-white/[0.07] h-28 w-40 vertical-top">
                          {slot ? (
                            <div className={`h-full w-full rounded-lg p-2 border ${getSubjectColor(slot.subject)} flex flex-col justify-between relative group cursor-pointer hover:brightness-110 transition`}>
                              <div>
                                <div className="text-xs font-bold truncate">{slot.subject_name}</div>
                                <div className="text-[10px] opacity-80 truncate">
                                  {viewBy === 'class' ? slot.teacher_name : slot.class_name}
                                </div>
                                <div className="text-[10px] mt-1 flex items-center gap-1 opacity-70">
                                  <span>📍 {slot.room || 'No Room'}</span>
                                </div>
                              </div>
                              <div className="text-[10px] font-mono mt-auto pt-1 border-t border-white/10">
                                {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                              </div>
                              <button onClick={e => { e.stopPropagation(); void deleteSlot(slot.id) }} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-[9px] text-rose-400 hover:text-rose-200 transition px-1">✕</button>
                              {slot.coverage_status === 'Uncovered' && (
                                <div className="absolute -top-1 -right-1 flex h-4 w-4">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] items-center justify-center font-bold text-white">!</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full w-full rounded-lg bg-[#0d1421]/20 border border-transparent group hover:border-white/[0.07] transition flex items-center justify-center">
                               <button onClick={() => openAddModal(day.id, period)} className="opacity-0 group-hover:opacity-100 text-slate-400 text-lg leading-none transition hover:text-emerald-400">+</button>
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
        )}
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold">Add Timetable Slot</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Day</label>
                <select value={newDay} onChange={e => setNewDay(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                  {days.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Period</label>
                <select value={newPeriod} onChange={e => setNewPeriod(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                  {periods.map(p => <option key={p} value={p}>Period {p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start time</label>
                <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">End time</label>
                <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Class *</label>
              <select value={newClassId} onChange={e => setNewClassId(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
              <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Teacher</label>
              <select value={newTeacherId} onChange={e => setNewTeacherId(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                <option value="">No teacher assigned</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Room</label>
                <input value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="Room / Lab" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Term</label>
                <select value={newTermId} onChange={e => setNewTermId(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                  <option value="">Any term</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={saveSlot} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200">Add Slot</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
