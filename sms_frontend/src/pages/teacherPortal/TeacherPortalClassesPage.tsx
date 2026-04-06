import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { Users, GraduationCap, ChevronRight, Search, BookOpen } from 'lucide-react'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type ClassItem = { id: number; name: string; stream?: string; grade?: string; student_count?: number }
type Student = { id: number; full_name: string; admission_number: string }
type ClassesPayload = { classes: ClassItem[]; rosters: Record<string, Student[]> }

export default function TeacherPortalClassesPage() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [rosters, setRosters] = useState<Record<string, Student[]>>({})
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get<ClassesPayload>('/teacher-portal/classes/')
        setClasses(response.data.classes ?? [])
        setRosters(response.data.rosters ?? {})
      } catch {
        setClasses([])
        setRosters({})
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const classStudents = selectedClass ? (rosters[String(selectedClass.id)] ?? []) : []
  const filteredStudents = classStudents.filter(s => {
    const q = search.toLowerCase()
    return !q || s.full_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHero badge="TEACHER" badgeColor="purple" title="My Classes" subtitle="View and manage your assigned classes and student rosters" icon="CL" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-slate-500 col-span-3 py-8 text-center">Loading classes...</p>
        ) : classes.length === 0 ? (
          <div className="col-span-3 text-center py-10">
            <Users size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No classes assigned yet. Contact your school administrator.</p>
          </div>
        ) : classes.map(cls => {
          const count = (rosters[String(cls.id)] ?? []).length
          const isSelected = selectedClass?.id === cls.id
          return (
            <button key={cls.id} onClick={() => setSelectedClass(isSelected ? null : cls)}
              className="rounded-2xl p-5 text-left transition-all hover:scale-[1.02]"
              style={{
                background: isSelected ? 'rgba(139,92,246,0.12)' : GLASS.background,
                border: isSelected ? '1px solid rgba(139,92,246,0.35)' : GLASS.border,
              }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: isSelected ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.1)' }}>
                  <GraduationCap size={18} className="text-violet-400" />
                </div>
                <ChevronRight size={14} className={`mt-1 transition-transform ${isSelected ? 'rotate-90 text-violet-400' : 'text-slate-600'}`} />
              </div>
              <p className="font-bold text-white">{cls.name}</p>
              {cls.stream && <p className="text-xs text-slate-400">{cls.stream}</p>}
              <p className="text-xs text-violet-400 font-semibold mt-1">{count} students</p>
            </button>
          )
        })}
      </div>

      {selectedClass && (
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-violet-400" />
              <p className="font-bold text-white text-sm">{selectedClass.name} - Student Roster</p>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-violet-300"
                style={{ background: 'rgba(139,92,246,0.15)' }}>
                {filteredStudents.length} students
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Search size={13} className="text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none w-48" />
            </div>
          </div>
          {filteredStudents.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500 text-sm">No students found.</p>
          ) : (
            <div>
              {filteredStudents.map((s, i) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{s.full_name}</p>
                      <p className="text-xs text-slate-500">{s.admission_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/teacher-portal/attendance?class_id=${selectedClass.id}`)}
                      className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition">
                      Mark
                    </button>
                    <button onClick={() => navigate(`/teacher-portal/gradebook?class_id=${selectedClass.id}`)}
                      className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 transition">
                      Grades
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedClass && !loading && classes.length > 0 && (
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <BookOpen size={18} className="text-violet-400 shrink-0" />
          <p className="text-sm text-slate-400">Click on a class above to view the student roster and take actions.</p>
        </div>
      )}
    </div>
  )
}
