import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type LessonCoverage = {
  id: number
  slot: number
  date: string
  status: 'Uncovered' | 'Covered' | 'Cancelled'
  original_teacher_name: string
  covering_teacher_name?: string
  subject_name: string
  class_name: string
  start_time: string
  end_time: string
  notes: string
}

export default function TimetableCoveragePage() {
  const [coverageRecords, setCoverageRecords] = useState<LessonCoverage[]>([])
  const [uncoveredLessons, setUncoveredLessons] = useState<LessonCoverage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const [teachers, setTeachers] = useState<{ id: number; full_name: string }[]>([])
  const [showCoverModal, setShowCoverModal] = useState<LessonCoverage | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [allRes, todayUncoveredRes, teacherRes] = await Promise.all([
        apiClient.get('/timetable/coverage/', { params: { date } }),
        apiClient.get('/timetable/today-coverage/'),
        apiClient.get('/hr/employees/?position=Teacher')
      ])
      
      setCoverageRecords(allRes.data.results || allRes.data || [])
      setUncoveredLessons(todayUncoveredRes.data.uncovered || [])
      
      const teacherData = teacherRes.data.results || teacherRes.data
      setTeachers(teacherData.map((t: any) => ({ 
        id: t.user, 
        full_name: `${t.first_name} ${t.last_name}` 
      })).filter((t: any) => t.id))
      
      setError(null)
    } catch (err) {
      setError('Failed to load coverage data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [date])

  const handleAssignCover = async () => {
    if (!showCoverModal || !selectedTeacher) return
    setIsProcessing(true)
    try {
      await apiClient.patch(`/timetable/coverage/${showCoverModal.id}/`, {
        covering_teacher: selectedTeacher,
        status: 'Covered'
      })
      setShowCoverModal(null)
      setSelectedTeacher('')
      fetchData()
    } catch (err) {
      setError('Failed to assign covering teacher.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="TIMETABLE"
        badgeColor="violet"
        title="Timetable Coverage"
        subtitle="Track lessons taught vs scheduled periods"
        icon="📅"
      />
      <header className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-semibold">Lesson Coverage</h1>
          <p className="mt-1 text-sm text-slate-400">Manage teacher absences and class coverage.</p>
        </div>
        <div className="flex items-center gap-3">
           <label className="text-xs text-slate-400 font-medium">View Date</label>
           <input 
             type="date"
             value={date}
             onChange={(e) => setDate(e.target.value)}
             className="bg-slate-950 border border-white/[0.07] rounded-xl px-4 py-2 text-sm text-slate-200"
           />
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/20 p-4 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center">
          <p className="text-slate-400 animate-pulse">Loading coverage data...</p>
        </div>
      ) : (
        <>
          {/* Today's Uncovered Lessons */}
          <section className="space-y-4">
        <h2 className="text-sm font-bold text-rose-400 uppercase tracking-widest pl-2">Uncovered Lessons</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uncoveredLessons.length === 0 ? (
            <div className="col-span-full py-12 rounded-2xl border-2 border-dashed border-white/[0.07] bg-[#0d1421]/20 text-center">
              <p className="text-slate-500">No uncovered lessons reported for today. All good!</p>
            </div>
          ) : (
            uncoveredLessons.map(lesson => (
              <div key={lesson.id} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/30">
                        {lesson.start_time.substring(0,5)} - {lesson.end_time.substring(0,5)}
                      </span>
                      <span className="text-[10px] font-bold text-rose-500 uppercase">Uncovered</span>
                   </div>
                   <h3 className="text-base font-bold text-slate-100">{lesson.subject_name}</h3>
                   <p className="text-xs text-slate-300 mt-1">Class: {lesson.class_name}</p>
                   <p className="text-xs text-slate-400 mt-2 italic">Absence: {lesson.original_teacher_name}</p>
                </div>
                <button 
                  onClick={() => setShowCoverModal(lesson)}
                  className="mt-6 w-full py-2.5 rounded-xl bg-emerald-500 text-sm font-bold text-slate-900 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                >
                  Assign Cover
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Coverage History Table */}
      <section className="rounded-2xl glass-panel p-6 overflow-hidden">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Coverage History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-950/50">
                <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Date</th>
                <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Lesson</th>
                <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Original Teacher</th>
                <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Covering Teacher</th>
                <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Status</th>
                <th className="p-4 border-b border-white/[0.07] font-semibold text-slate-400">Notes</th>
              </tr>
            </thead>
            <tbody>
              {coverageRecords.length === 0 ? (
                <tr>
                   <td colSpan={6} className="p-8 text-center text-slate-500 italic">No records for this date.</td>
                </tr>
              ) : (
                coverageRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 border-b border-white/[0.07] text-slate-300">{record.date}</td>
                    <td className="p-4 border-b border-white/[0.07]">
                      <p className="font-semibold text-slate-200">{record.subject_name}</p>
                      <p className="text-xs text-slate-500">{record.class_name}</p>
                    </td>
                    <td className="p-4 border-b border-white/[0.07] text-slate-300">{record.original_teacher_name}</td>
                    <td className="p-4 border-b border-white/[0.07] text-slate-300">
                      {record.covering_teacher_name || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-4 border-b border-white/[0.07]">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        record.status === 'Covered' ? 'bg-emerald-500/10 text-emerald-400' : 
                        record.status === 'Uncovered' ? 'bg-rose-500/10 text-rose-400' : 
                        'bg-slate-800 text-slate-500'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 border-b border-white/[0.07] text-xs text-slate-500 max-w-[200px] truncate">
                      {record.notes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}

      {/* Modal for Assigning Cover */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-xl font-display font-semibold mb-2 text-slate-100">Assign Coverage</h3>
            <p className="text-sm text-slate-400 mb-6">
              Select a teacher to cover {showCoverModal.subject_name} ({showCoverModal.class_name}) 
              on {showCoverModal.date} from {showCoverModal.start_time.substring(0,5)} to {showCoverModal.end_time.substring(0,5)}.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Covering Teacher</label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full bg-[#0d1421] border border-white/[0.07] rounded-xl px-4 py-2 text-sm text-slate-200"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-emerald-400 transition disabled:opacity-50"
                onClick={handleAssignCover}
                disabled={!selectedTeacher || isProcessing}
              >
                {isProcessing ? 'Saving...' : 'Confirm Assignment'}
              </button>
              <button
                className="flex-1 rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-[#0d1421] transition"
                onClick={() => { setShowCoverModal(null); setSelectedTeacher(''); }}
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
