import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type StaffRow = { id: number; full_name: string; staff_id: string }
type AttendanceRow = { id: number; staff: number; staff_name: string; date: string; status: string; clock_in: string | null; clock_out: string | null }
type SummaryRow = { staff: number; staff_id: string; staff_name: string; attendance_rate: number; present: number; absent: number; late: number }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function StaffAttendancePage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [summary, setSummary] = useState<SummaryRow[]>([])
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [statusValue, setStatusValue] = useState('Present')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const month = useMemo(() => new Date().getMonth() + 1, [])
  const year = useMemo(() => new Date().getFullYear(), [])

  const load = async () => {
    setError(null)
    try {
      const [staffResponse, attendanceResponse, summaryResponse] = await Promise.all([
        apiClient.get<StaffRow[] | { results: StaffRow[] }>('/staff/'),
        apiClient.get<AttendanceRow[] | { results: AttendanceRow[] }>('/staff/attendance/'),
        apiClient.get<SummaryRow[]>('/staff/attendance/summary/', { params: { month, year } }),
      ])
      setStaff(asArray(staffResponse.data))
      setRows(asArray(attendanceResponse.data))
      setSummary(summaryResponse.data)
    } catch {
      setError('Unable to load staff attendance.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const markAttendance = async () => {
    if (!selectedStaff || !date) return
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/staff/attendance/mark/', {
        staff: selectedStaff,
        date,
        status: statusValue,
      })
      setNotice('Attendance marked.')
      await load()
    } catch {
      setError('Unable to mark attendance.')
    }
  }

  const exportCsv = async () => {
    try {
      const response = await apiClient.get('/staff/attendance/export/', {
        params: { month, year },
        responseType: 'blob',
      })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        `staff_attendance_${year}_${month}.csv`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to export attendance CSV.'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="STAFF"
        badgeColor="blue"
        title="Staff Attendance"
        subtitle="Daily check-in records and leave tracking"
        icon="👤"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Attendance</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Daily Marking and Monthly Summary</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="rounded-xl glass-panel p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option value="">Select staff</option>
            {staff.map((row) => <option key={row.id} value={row.id}>{row.staff_id} - {row.full_name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
            <option>Present</option>
            <option>Absent</option>
            <option>Late</option>
            <option>Half-Day</option>
            <option>On Leave</option>
          </select>
          <button onClick={markAttendance} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Mark</button>
          <button onClick={exportCsv} className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-200">Export CSV</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Recent Attendance Records</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr><th className="px-2 py-2">Date</th><th className="px-2 py-2">Staff</th><th className="px-2 py-2">Status</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row) => (
                  <tr key={row.id} className="border-t border-white/[0.07]">
                    <td className="px-2 py-2">{row.date}</td>
                    <td className="px-2 py-2">{row.staff_name}</td>
                    <td className="px-2 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Monthly Summary ({month}/{year})</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {summary.map((row) => (
              <div key={row.staff} className="rounded-lg bg-slate-950/60 px-3 py-2">
                <p>{row.staff_name} ({row.staff_id})</p>
                <p className="text-slate-400">Rate: {row.attendance_rate}% | Present: {row.present} | Absent: {row.absent} | Late: {row.late}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
