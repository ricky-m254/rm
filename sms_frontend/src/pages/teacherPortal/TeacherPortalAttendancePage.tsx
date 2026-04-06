import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { CheckCircle, XCircle, Clock, User, Save, AlertCircle } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type ClassItem = { id: number; name: string; stream?: string }
type Student = { id: number; full_name: string; admission_number: string; status?: string; notes?: string }
type AttendanceStatus = 'P' | 'A' | 'L' | 'E'
type AttendancePayload = {
  classes: ClassItem[]
  selected_class_id: number | null
  date: string
  students: Student[]
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  P: { label: 'Present', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle },
  A: { label: 'Absent', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: XCircle },
  L: { label: 'Late', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: Clock },
  E: { label: 'Excused', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', icon: User },
}

const STATUS_FROM_BACKEND: Record<string, AttendanceStatus> = {
  Present: 'P',
  Absent: 'A',
  Late: 'L',
  Excused: 'E',
}

const STATUS_TO_BACKEND: Record<AttendanceStatus, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Late',
  E: 'Excused',
}

export default function TeacherPortalAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class_id') ?? '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const query = new URLSearchParams()
        if (selectedClass) query.set('class_id', selectedClass)
        if (date) query.set('date', date)
        const suffix = query.toString() ? `?${query.toString()}` : ''
        const response = await apiClient.get<AttendancePayload>(`/teacher-portal/attendance/${suffix}`)
        const payload = response.data
        const resolvedClass = payload.selected_class_id ? String(payload.selected_class_id) : ''
        setClasses(payload.classes ?? [])
        setStudents(payload.students ?? [])
        setDate(payload.date ?? date)
        if (resolvedClass !== selectedClass) {
          setSelectedClass(resolvedClass)
        }
        if (resolvedClass) {
          setSearchParams({ class_id: resolvedClass })
        }
        const nextAttendance: Record<number, AttendanceStatus> = {}
        ;(payload.students ?? []).forEach(student => {
          nextAttendance[student.id] = STATUS_FROM_BACKEND[student.status ?? 'Present'] ?? 'P'
        })
        setAttendance(nextAttendance)
      } catch {
        setClasses([])
        setStudents([])
        setAttendance({})
        setError('Unable to load attendance roster.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [date, selectedClass, setSearchParams])

  const setStatus = (studentId: number, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status: AttendanceStatus) => {
    const all: Record<number, AttendanceStatus> = {}
    students.forEach(s => { all[s.id] = status })
    setAttendance(all)
  }

  const saveAttendance = async () => {
    if (!selectedClass) return
    setSaving(true)
    setError(null)
    setNotice(null)
    const records = students.map(s => ({
      student_id: s.id,
      status: STATUS_TO_BACKEND[attendance[s.id] ?? 'P'],
      notes: s.notes ?? '',
    }))
    try {
      await apiClient.post('/teacher-portal/attendance/', {
        class_id: Number(selectedClass),
        date,
        records,
      })
      setNotice(`Attendance saved for ${students.length} students on ${date}.`)
    } catch {
      setError('Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = Object.values(attendance).filter(s => s === 'P').length
  const absentCount = Object.values(attendance).filter(s => s === 'A').length
  const lateCount = Object.values(attendance).filter(s => s === 'L').length

  return (
    <div className="space-y-6">
      <PageHero badge="TEACHER" badgeColor="purple" title="Attendance Management" subtitle="Record class attendance quickly and accurately" icon="AT" />

      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Select Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-white outline-none">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.stream ? ` - ${c.stream}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2.5 text-sm text-white outline-none" />
          </div>
          <div className="flex items-end">
            <button onClick={saveAttendance} disabled={saving || students.length === 0 || !selectedClass}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 transition">
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Present', value: presentCount, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Absent', value: absentCount, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Late', value: lateCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4 text-center" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <p className="text-2xl font-bold text-white">{loading ? '...' : k.value}</p>
            <p className="text-xs text-slate-400">{k.label}</p>
          </div>
        ))}
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle size={14} />{error}</div>}
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><CheckCircle size={14} />{notice}</div>}

      {students.length > 0 && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500">Mark all:</p>
          {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => markAll(key)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white">
            {selectedClass ? `${classes.find(c => String(c.id) === selectedClass)?.name ?? 'Class'} - ${students.length} students` : 'Select a class'}
          </p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-slate-500">Loading...</p>
        ) : students.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-500">No students found.</p>
        ) : (
          <div>
            {students.map((s, i) => {
              const current = attendance[s.id] ?? 'P'
              return (
                <div key={s.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-xs text-slate-600 w-6 tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.full_name}</p>
                    <p className="text-xs text-slate-500">{s.admission_number}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(([key, cfg]) => (
                      <button key={key} onClick={() => setStatus(s.id, key)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all"
                        style={{
                          background: current === key ? cfg.bg : 'rgba(255,255,255,0.03)',
                          color: current === key ? cfg.color : '#475569',
                          border: current === key ? `1px solid ${cfg.color}40` : '1px solid rgba(255,255,255,0.06)',
                          transform: current === key ? 'scale(1.05)' : 'scale(1)',
                        }}>
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
