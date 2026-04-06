import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Users, DollarSign, UserCheck, Activity, AlertTriangle, BookOpen, Wrench, BookMarked } from 'lucide-react'

type AnalyticsData = {
  total_students: number
  students_present_today: number
  students_absent_today: number
  student_attendance_rate_today: number
  total_employees: number
  staff_clocked_in_today: number
  staff_late_today: number
  revenue_this_month: number
  invoices_unpaid: number
  collection_rate_percent: number
  pending_admissions: number
  open_maintenance: number
  library_overdue: number
  uncovered_lessons_today: number
  last_updated: string
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-2xl p-5 font-sans flex items-start gap-4" style={GLASS}>
      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${color}22` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white leading-none">{value}</p>
        {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  )
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<AnalyticsData>('/analytics/executive/')
        setData(res.data)
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('Access denied. You need the Analytics module permission.')
        } else {
          setError(err.response?.data?.detail ?? 'Failed to load analytics data.')
        }
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const kes = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-8">
      <PageHero
        badge="ANALYTICS"
        badgeColor="blue"
        title="Executive Dashboard"
        subtitle="Live operational metrics across the school"
        icon="📊"
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={GLASS} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-300">
          <p className="font-semibold">Unable to load analytics</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <>
          <Section title="Students">
            <KpiCard icon={Users} color="#10b981" label="Total Students" value={data.total_students} />
            <KpiCard
              icon={Activity} color="#10b981"
              label="Present Today" value={data.students_present_today}
              sub={`${data.student_attendance_rate_today}% attendance rate`}
            />
            <KpiCard icon={AlertTriangle} color="#f59e0b" label="Absent Today" value={data.students_absent_today} />
            <KpiCard icon={BookOpen} color="#8b5cf6" label="Pending Admissions" value={data.pending_admissions} />
          </Section>

          <Section title="Staff">
            <KpiCard icon={UserCheck} color="#0ea5e9" label="Total Employees" value={data.total_employees} />
            <KpiCard icon={Activity} color="#0ea5e9" label="Clocked In Today" value={data.staff_clocked_in_today} />
            <KpiCard icon={AlertTriangle} color="#f59e0b" label="Late Arrivals" value={data.staff_late_today} />
            <KpiCard icon={BookMarked} color="#ec4899" label="Uncovered Lessons" value={data.uncovered_lessons_today} sub="Today" />
          </Section>

          <Section title="Finance">
            <KpiCard icon={DollarSign} color="#10b981" label="Revenue This Month" value={kes(data.revenue_this_month)} />
            <KpiCard icon={AlertTriangle} color="#f59e0b" label="Unpaid Invoices" value={data.invoices_unpaid} />
            <KpiCard icon={Activity} color="#10b981" label="Collection Rate" value={`${data.collection_rate_percent}%`} />
            <KpiCard icon={DollarSign} color="#0ea5e9" label="Open Maintenance" value={data.open_maintenance} />
          </Section>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-5" style={GLASS}>
              <h3 className="text-sm font-semibold text-emerald-400">Library</h3>
              <div className="mt-3 flex items-center gap-3">
                <BookMarked size={28} className="text-pink-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{data.library_overdue}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Overdue borrowings</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-5" style={GLASS}>
              <h3 className="text-sm font-semibold text-amber-400">Maintenance</h3>
              <div className="mt-3 flex items-center gap-3">
                <Wrench size={28} className="text-amber-400" />
                <div>
                  <p className="text-3xl font-bold text-white">{data.open_maintenance}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Open requests</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-right text-xs text-slate-600">
            Last updated: {new Date(data.last_updated).toLocaleString()}
          </p>
        </>
      )}
    </div>
  )
}
