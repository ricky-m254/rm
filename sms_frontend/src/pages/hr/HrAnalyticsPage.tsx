import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Summary = {
  headcount: number
  attendance_rate_percent: number
  departments: number
  positions: number
}

type Headcount = {
  total: number
  by_department: Array<{ department: string; count: number }>
  by_position: Array<{ position: string; count: number }>
  by_employment_type: Array<{ employment_type: string; count: number }>
}

type Turnover = {
  year: number
  headcount_base: number
  exits: number
  turnover_rate_percent: number
  by_reason: Array<{ reason: string; count: number }>
}

type Attendance = {
  month: number
  year: number
  total_records: number
  present_records: number
  absent_records: number
  late_records: number
  attendance_rate_percent: number
  overtime_hours_total: string
}

type Leave = {
  year: number
  opening_balance_total: string
  accrued_total: string
  used_total: string
  pending_total: string
  available_total: string
}

type Diversity = {
  total: number
  by_gender: Array<{ gender: string; count: number; percent: number }>
}

type PayrollCosts = {
  year: number
  total_gross: string
  total_deductions: string
  total_net: string
  by_month: Array<{ month: number; gross: string; deductions: string; net: string }>
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvRows = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function HrAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [headcount, setHeadcount] = useState<Headcount | null>(null)
  const [turnover, setTurnover] = useState<Turnover | null>(null)
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [leave, setLeave] = useState<Leave | null>(null)
  const [diversity, setDiversity] = useState<Diversity | null>(null)
  const [payrollCosts, setPayrollCosts] = useState<PayrollCosts | null>(null)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async (yearValue = year, monthValue = month) => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, headcountRes, turnoverRes, attendanceRes, leaveRes, diversityRes, payrollRes] = await Promise.all([
        apiClient.get<Summary>('/hr/analytics/summary/'),
        apiClient.get<Headcount>('/hr/analytics/headcount/'),
        apiClient.get<Turnover>(`/hr/analytics/turnover/?year=${yearValue}`),
        apiClient.get<Attendance>(`/hr/analytics/attendance/?year=${yearValue}&month=${monthValue}`),
        apiClient.get<Leave>(`/hr/analytics/leave/?year=${yearValue}`),
        apiClient.get<Diversity>('/hr/analytics/diversity/'),
        apiClient.get<PayrollCosts>(`/hr/analytics/payroll-costs/?year=${yearValue}`),
      ])
      setSummary(summaryRes.data)
      setHeadcount(headcountRes.data)
      setTurnover(turnoverRes.data)
      setAttendance(attendanceRes.data)
      setLeave(leaveRes.data)
      setDiversity(diversityRes.data)
      setPayrollCosts(payrollRes.data)
    } catch {
      setError('Unable to load HR analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const exportHeadcount = () =>
    downloadCsv(
      'hr_analytics_headcount.csv',
      ['Group', 'Type', 'Count'],
      [
        ...(headcount?.by_department ?? []).map((row) => ['Department', row.department, String(row.count)]),
        ...(headcount?.by_position ?? []).map((row) => ['Position', row.position, String(row.count)]),
        ...(headcount?.by_employment_type ?? []).map((row) => ['Employment Type', row.employment_type, String(row.count)]),
      ],
    )

  const exportPayrollCosts = () =>
    downloadCsv(
      'hr_analytics_payroll_costs.csv',
      ['Month', 'Gross', 'Deductions', 'Net'],
      (payrollCosts?.by_month ?? []).map((row) => [String(row.month), row.gross, row.deductions, row.net]),
    )

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="HR Analytics"
        subtitle="Workforce insights, trends and dashboards"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">HR Analytics</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Headcount, Turnover, Leave, Payroll Costs</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <section className="rounded-xl glass-panel p-4">
        <div className="grid gap-3 sm:grid-cols-5">
          <label className="text-xs text-slate-300">
            Year
            <input value={year} onChange={(e) => setYear(e.target.value)} type="number" min="2000" max="2099" className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-300">
            Month
            <input value={month} onChange={(e) => setMonth(e.target.value)} type="number" min="1" max="12" className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <button onClick={() => void load(year, month)} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 sm:self-end">Refresh</button>
          <button onClick={exportHeadcount} className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-200 sm:self-end">Export Headcount</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Headcount</p><p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.headcount ?? 0}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Attendance Rate</p><p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.attendance_rate_percent?.toFixed(2) ?? '0.00'}%</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Departments</p><p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.departments ?? 0}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Positions</p><p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.positions ?? 0}</p></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Turnover</h2>
          <p className="mt-2 text-xs text-slate-300">Year: {turnover?.year ?? '-'} | Rate: {turnover?.turnover_rate_percent ?? 0}%</p>
          <p className="mt-1 text-xs text-slate-300">Exits: {turnover?.exits ?? 0} / Base: {turnover?.headcount_base ?? 0}</p>
          <div className="mt-2 space-y-1 text-xs text-slate-300">{(turnover?.by_reason ?? []).map((row) => <p key={row.reason}>{row.reason}: {row.count}</p>)}</div>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Attendance</h2>
          <p className="mt-2 text-xs text-slate-300">{attendance?.month ?? '-'} / {attendance?.year ?? '-'}</p>
          <p className="mt-1 text-xs text-slate-300">Present: {attendance?.present_records ?? 0} | Absent: {attendance?.absent_records ?? 0}</p>
          <p className="mt-1 text-xs text-slate-300">Late: {attendance?.late_records ?? 0} | Overtime hrs: {attendance?.overtime_hours_total ?? '0.00'}</p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Leave Utilization</h2>
          <p className="mt-2 text-xs text-slate-300">Used: {leave?.used_total ?? '0.00'} | Pending: {leave?.pending_total ?? '0.00'}</p>
          <p className="mt-1 text-xs text-slate-300">Available: {leave?.available_total ?? '0.00'}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Diversity (Gender)</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {(diversity?.by_gender ?? []).map((row) => (
              <div key={row.gender} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
                <span>{row.gender}</span><span>{row.count} ({row.percent}%)</span>
              </div>
            ))}
            {!loading && (diversity?.by_gender?.length ?? 0) === 0 ? <p className="text-slate-400">No diversity data.</p> : null}
          </div>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">Payroll Costs</h2>
            <button onClick={exportPayrollCosts} className="rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200">Export</button>
          </div>
          <p className="mt-2 text-xs text-slate-300">Gross: {payrollCosts?.total_gross ?? '0.00'}</p>
          <p className="mt-1 text-xs text-slate-300">Deductions: {payrollCosts?.total_deductions ?? '0.00'}</p>
          <p className="mt-1 text-xs text-slate-300">Net: {payrollCosts?.total_net ?? '0.00'}</p>
          <div className="mt-3 space-y-1 text-xs text-slate-300">
            {(payrollCosts?.by_month ?? []).map((row) => (
              <p key={row.month}>Month {row.month}: Net {row.net}</p>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-100">Headcount Breakdown</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">By Department</p>
            <div className="mt-2 space-y-1 text-xs text-slate-300">{(headcount?.by_department ?? []).map((row) => <p key={row.department}>{row.department}: {row.count}</p>)}</div>
          </div>
          <div>
            <p className="text-xs text-slate-400">By Position</p>
            <div className="mt-2 space-y-1 text-xs text-slate-300">{(headcount?.by_position ?? []).map((row) => <p key={row.position}>{row.position}: {row.count}</p>)}</div>
          </div>
          <div>
            <p className="text-xs text-slate-400">By Employment Type</p>
            <div className="mt-2 space-y-1 text-xs text-slate-300">{(headcount?.by_employment_type ?? []).map((row) => <p key={row.employment_type}>{row.employment_type}: {row.count}</p>)}</div>
          </div>
        </div>
      </section>
    </div>
  )
}
