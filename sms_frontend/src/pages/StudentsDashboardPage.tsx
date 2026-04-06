import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'
import { normalizePaginatedResponse } from '../api/pagination'

type StudentsSummary = {
  students_active: number
  enrollments_active: number
}

type StudentsDashboardPayload = {
  kpis: {
    students_active: number
    enrollments_active: number
    attendance_rate: number
    pending_admissions: number
  }
  alerts: {
    low_attendance_students: number
    critical_behavior_incidents: number
  }
  recent_activity: Array<{
    type: string
    date: string
    label: string
    student_id?: number | null
  }>
}

type Student = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  gender: string
  date_of_birth: string
  is_active: boolean
}

export default function StudentsDashboardPage() {
  const navigate = useNavigate()
  const username = useAuthStore((state) => state.username)
  const tenantId = useAuthStore((state) => state.tenantId)

  const [summary, setSummary] = useState<StudentsSummary | null>(null)
  const [dashboard, setDashboard] = useState<StudentsDashboardPayload | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const [dashboardResponse, studentsResponse] = await Promise.all([
          apiClient.get<StudentsDashboardPayload>('/students/dashboard/'),
          apiClient.get<Student[] | { results: Student[]; count: number }>('/students/', { params: { page_size: 100 } }),
        ])
        if (isMounted) {
          setDashboard(dashboardResponse.data)
          setSummary({
            students_active: dashboardResponse.data.kpis.students_active,
            enrollments_active: dashboardResponse.data.kpis.enrollments_active,
          })
          setStudents(normalizePaginatedResponse(studentsResponse.data).items)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the STUDENTS module and proper role.')
          } else if (status === 404) {
            setError(
              'Students endpoints not found (404). This usually means the tenant routing is wrong. Verify the tenant schema_name (e.g. "school_oxford") or use the correct tenant domain.',
            )
          } else {
            setError('Unable to load students data. Please try again.')
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return students
    return students.filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
      return (
        fullName.includes(term) ||
        student.admission_number.toLowerCase().includes(term)
      )
    })
  }, [query, students])

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Students</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Tenant: {tenantId ?? 'public'}</p>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading students data...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      <section className="col-span-12 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active students</p>
          <p className="mt-3 text-3xl font-display font-semibold">
            {summary?.students_active ?? 0}
          </p>
        </div>
        <div className="rounded-2xl glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active enrollments</p>
          <p className="mt-3 text-3xl font-display font-semibold">
            {summary?.enrollments_active ?? 0}
          </p>
        </div>
        <div className="rounded-2xl glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in</p>
          <p className="mt-3 text-lg font-semibold text-emerald-200">
            {username ?? 'user'}
          </p>
        </div>
        <div className="rounded-2xl glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Attendance rate</p>
          <p className="mt-3 text-3xl font-display font-semibold">
            {dashboard?.kpis.attendance_rate ?? 0}%
          </p>
          <p className="mt-1 text-xs text-slate-400">All recorded attendance</p>
        </div>
      </section>

      <section className="col-span-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Operational alerts</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 px-4 py-3">
              <p className="text-slate-400">Pending admissions</p>
              <p className="text-xl font-semibold text-amber-200">{dashboard?.kpis.pending_admissions ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 px-4 py-3">
              <p className="text-slate-400">Students below 85% attendance</p>
              <p className="text-xl font-semibold text-rose-200">{dashboard?.alerts.low_attendance_students ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 px-4 py-3">
              <p className="text-slate-400">High/Critical behavior incidents (14 days)</p>
              <p className="text-xl font-semibold text-rose-200">
                {dashboard?.alerts.critical_behavior_incidents ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Recent activity</h2>
          <div className="mt-4 space-y-2">
            {(dashboard?.recent_activity ?? []).map((item, idx) => (
              <div key={`${item.type}-${item.date}-${idx}`} className="rounded-xl border border-white/[0.07] bg-slate-950/60 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.type}</p>
                <p className="mt-1 text-sm text-slate-200">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.date}</p>
              </div>
            ))}
            {(dashboard?.recent_activity ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No recent activity available.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Student roster</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pulled from `/api/students/` using real backend data.
            </p>
          </div>
          <input
            className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
            placeholder="Search by name or admission number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Admission #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">DOB</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{student.admission_number}</td>
                  <td className="px-4 py-3">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-4 py-3">{student.gender}</td>
                  <td className="px-4 py-3">{student.date_of_birth}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-emerald-400/40 px-2 py-1 text-xs text-emerald-200">
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                    No students found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
            onClick={() => navigate('/modules/students/admissions')}
          >
            View admissions
          </button>
          <button
            className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
            onClick={() => navigate('/modules/students/attendance')}
          >
            Record attendance
          </button>
          <button
            className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
            onClick={() => navigate('/modules/students/reports')}
          >
            Open reports
          </button>
        </div>
      </section>
    </div>
  )
}
