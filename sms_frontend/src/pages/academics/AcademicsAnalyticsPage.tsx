import { useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type StudentProfile = {
  student_id: number
  average_score: string
  attendance_rate_percent: number
  results: Array<{
    term: string
    class_section: string
    subject: string
    total_score: string
    grade_band: string
    class_rank: number | null
    is_pass: boolean
  }>
}
type TeacherProfile = {
  teacher_id: number
  assignment_count: number
  performance: Array<{
    class_section_id: number
    class_name: string
    subject_id: number
    subject_name: string
    average_score: string
    pass_rate_percent: number
    total_results: number
  }>
}

function getErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data) return 'Request failed.'
  if (typeof data === 'string') return data
  if (typeof data === 'object') return JSON.stringify(data)
  return 'Request failed.'
}

export default function AcademicsAnalyticsPage() {
  const [studentId, setStudentId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStudent = async () => {
    if (!studentId) return
    setError(null)
    try {
      const res = await apiClient.get(`/academics/analytics/student/${studentId}/`)
      setStudentProfile(res.data as StudentProfile)
    } catch (err) {
      setError(getErrorMessage(err))
      setStudentProfile(null)
    }
  }

  const loadTeacher = async () => {
    if (!teacherId) return
    setError(null)
    try {
      const res = await apiClient.get(`/academics/analytics/teacher/${teacherId}/`)
      setTeacherProfile(res.data as TeacherProfile)
    } catch (err) {
      setError(getErrorMessage(err))
      setTeacherProfile(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="blue"
        title="Academic Analytics"
        subtitle="Deep-dive profiles for individual students and teachers."
        icon="📖"
      />

      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Student Profile</h2>
          <div className="mt-4 flex gap-2">
            <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" onClick={loadStudent}>Load</button>
          </div>
          {studentProfile ? (
            <div className="mt-4 text-sm text-slate-200">
              <p>Average: {studentProfile.average_score}</p>
              <p>Attendance: {studentProfile.attendance_rate_percent}%</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Score</th><th className="px-3 py-2 text-left">Grade</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">{studentProfile.results.map((row, idx) => <tr key={`${row.subject}-${idx}`} className="bg-slate-950/50"><td className="px-3 py-2">{row.subject}</td><td className="px-3 py-2">{row.total_score}</td><td className="px-3 py-2">{row.grade_band || '--'}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Teacher Profile</h2>
          <div className="mt-4 flex gap-2">
            <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Teacher ID" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} />
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" onClick={loadTeacher}>Load</button>
          </div>
          {teacherProfile ? (
            <div className="mt-4 text-sm text-slate-200">
              <p>Assignments: {teacherProfile.assignment_count}</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Avg</th><th className="px-3 py-2 text-left">Pass %</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">{teacherProfile.performance.map((row, idx) => <tr key={`${row.class_section_id}-${row.subject_id}-${idx}`} className="bg-slate-950/50"><td className="px-3 py-2">{row.class_name}</td><td className="px-3 py-2">{row.subject_name}</td><td className="px-3 py-2">{row.average_score}</td><td className="px-3 py-2">{row.pass_rate_percent}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
