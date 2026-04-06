import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type SummaryPayload = {
  total_staff: number
  attendance_rate_percent: number
  by_staff_type: Array<{ staff_type: string; count: number }>
  by_employment_type: Array<{ employment_type: string; count: number }>
  by_status: Array<{ status: string; count: number }>
}

type DepartmentPayload = Array<{ department_id: number; department: string; count: number }>
type AttendancePayload = { month: number; year: number; total_records: number; attendance_rate_percent: number; late_records: number }
type PerformancePayload = { total_appraisals: number; distribution: Array<{ status: string; count: number; avg_rating: number }> }
type CompliancePayload = { total_staff: number; staff_with_verified_documents: number; compliance_rate_percent: number }

export default function StaffAnalyticsPage() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [department, setDepartment] = useState<DepartmentPayload>([])
  const [attendance, setAttendance] = useState<AttendancePayload | null>(null)
  const [performance, setPerformance] = useState<PerformancePayload | null>(null)
  const [compliance, setCompliance] = useState<CompliancePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const [s, d, a, p, c] = await Promise.all([
        apiClient.get<SummaryPayload>('/staff/analytics/summary/'),
        apiClient.get<DepartmentPayload>('/staff/analytics/by-department/'),
        apiClient.get<AttendancePayload>('/staff/analytics/attendance/'),
        apiClient.get<PerformancePayload>('/staff/analytics/performance/'),
        apiClient.get<CompliancePayload>('/staff/analytics/compliance/'),
      ])
      setSummary(s.data)
      setDepartment(d.data)
      setAttendance(a.data)
      setPerformance(p.data)
      setCompliance(c.data)
    } catch {
      setError('Unable to load staff analytics.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const downloadReport = async (path: string, fileName: string) => {
    try {
      const response = await apiClient.get(path, { responseType: 'blob' })
      downloadFromResponse(response as { data: Blob; headers?: Record<string, unknown> }, fileName)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to export analytics report.'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="STAFF"
        badgeColor="blue"
        title="Staff Analytics"
        subtitle="Attendance, performance and workload metrics"
        icon="👤"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Staff Analytics</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Headcount, Attendance, Performance, Compliance</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Total Staff</p><p className="mt-2 text-2xl font-semibold">{summary?.total_staff ?? 0}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Attendance Rate</p><p className="mt-2 text-2xl font-semibold">{summary?.attendance_rate_percent?.toFixed(2) ?? '0.00'}%</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Appraisals</p><p className="mt-2 text-2xl font-semibold">{performance?.total_appraisals ?? 0}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Compliance</p><p className="mt-2 text-2xl font-semibold">{compliance?.compliance_rate_percent?.toFixed(2) ?? '0.00'}%</p></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Department Headcount</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {department.map((row) => (
              <div key={row.department_id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
                <span>{row.department}</span>
                <span>{row.count}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Attendance Snapshot</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <p>Period: {attendance ? `${attendance.month}/${attendance.year}` : 'N/A'}</p>
            <p>Total records: {attendance?.total_records ?? 0}</p>
            <p>Attendance rate: {attendance?.attendance_rate_percent?.toFixed(2) ?? '0.00'}%</p>
            <p>Late records: {attendance?.late_records ?? 0}</p>
          </div>
        </article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold">Performance Distribution</h2>
        <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          {(performance?.distribution ?? []).map((row) => (
            <div key={row.status} className="rounded-lg bg-slate-950/60 px-3 py-2">
              <p>{row.status}</p>
              <p className="text-slate-400">Count: {row.count}</p>
              <p className="text-slate-400">Avg: {row.avg_rating}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold">Reports</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => downloadReport('/staff/reports/directory/', 'staff_directory_report.csv')} className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-200">Directory Report</button>
          <button onClick={() => downloadReport('/staff/reports/attendance/', 'staff_attendance_report.csv')} className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-200">Attendance Report</button>
        </div>
      </section>
    </div>
  )
}
