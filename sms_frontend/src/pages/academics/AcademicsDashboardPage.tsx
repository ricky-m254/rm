import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import {
  BookOpen, TrendingUp, Users, AlertTriangle,
  CheckCircle2, BarChart2, ClipboardList, CalendarDays,
} from 'lucide-react'

type SummaryResponse = {
  average_score: string
  pass_rate_percent: number
  total_results: number
  at_risk_students: number
  grade_distribution: Array<{ grade_band: string; count: number }>
}
type ClassPerformance = {
  class_section_id: number; class_name: string
  average_score: string; pass_rate_percent: number; total_results: number
}
type SubjectPerformance = {
  subject_id: number; subject_name: string; subject_code: string
  average_score: string; pass_rate_percent: number; total_results: number
}
type AtRisk = {
  student_id: number; admission_number: string
  student_name: string; failing_subjects: number; average_score: string
}
type Trend = {
  term_id: number; term_name: string
  average_score: string; pass_rate_percent: number; total_results: number
}

function getErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data) return 'Request failed.'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const msgs: string[] = []
    Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
      if (Array.isArray(v)) msgs.push(`${k}: ${v.join(' ')}`)
      else if (typeof v === 'string') msgs.push(`${k}: ${v}`)
    })
    if (msgs.length) return msgs.join(' | ')
  }
  return 'Request failed.'
}

// Kenyan CBC Grade Distribution (KNEC-aligned)
const KENYAN_GRADES = [
  { label: 'A (80–100)', color: '#10b981' },
  { label: 'B+ (75–79)', color: '#34d399' },
  { label: 'B (70–74)',  color: '#60a5fa' },
  { label: 'B- (65–69)', color: '#818cf8' },
  { label: 'C+ (60–64)', color: '#a78bfa' },
  { label: 'C (55–59)',  color: '#fbbf24' },
  { label: 'C- (50–54)', color: '#f97316' },
  { label: 'D+ (45–49)', color: '#f87171' },
  { label: 'D (40–44)',  color: '#f43f5e' },
  { label: 'E (<40)',    color: '#6b7280' },
]

export default function AcademicsDashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [classPerf, setClassPerf] = useState<ClassPerformance[]>([])
  const [subjectPerf, setSubjectPerf] = useState<SubjectPerformance[]>([])
  const [atRisk, setAtRisk] = useState<AtRisk[]>([])
  const [trend, setTrend] = useState<Trend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      setIsLoading(true); setError(null)
      try {
        const [sumRes, clsRes, subRes, riskRes, trendRes] = await Promise.all([
          apiClient.get('/academics/analytics/summary/'),
          apiClient.get('/academics/analytics/class-performance/'),
          apiClient.get('/academics/analytics/subject-performance/'),
          apiClient.get('/academics/analytics/at-risk/'),
          apiClient.get('/academics/analytics/trend/'),
        ])
        setSummary(sumRes.data as SummaryResponse)
        setClassPerf(normalizePaginatedResponse<ClassPerformance>(clsRes.data).items)
        setSubjectPerf(normalizePaginatedResponse<SubjectPerformance>(subRes.data).items)
        setAtRisk(normalizePaginatedResponse<AtRisk>(riskRes.data).items)
        setTrend(normalizePaginatedResponse<Trend>(trendRes.data).items)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally { setIsLoading(false) }
    }
    void load()
  }, [])

  const passRate = summary?.pass_rate_percent ?? 0
  const avgScore = summary?.average_score ?? '—'

  const kpis = [
    { label: 'Average Score',     value: avgScore,              icon: TrendingUp,    color: '#10b981', bg: 'rgba(16,185,129,0.1)',   sub: 'All subjects · Term 1' },
    { label: 'Pass Rate',         value: `${passRate}%`,        icon: CheckCircle2,  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   sub: 'Meets pass mark ≥50' },
    { label: 'Total Results',     value: summary?.total_results ?? 0, icon: ClipboardList, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', sub: 'Assessments recorded' },
    { label: 'At-Risk Students',  value: summary?.at_risk_students ?? 0, icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  sub: 'Failing 2+ subjects' },
  ]

  const QUICK_ACTIONS = [
    { label: 'Gradebook',    icon: BookOpen,      route: '/modules/academics/gradebook',    color: '#a78bfa' },
    { label: 'Timetable',    icon: CalendarDays,  route: '/modules/timetable/grid',         color: '#38bdf8' },
    { label: 'Report Cards', icon: ClipboardList, route: '/modules/academics/report-cards', color: '#10b981' },
    { label: 'Attendance',   icon: Users,         route: '/modules/academics/attendance',   color: '#f59e0b' },
    { label: 'Subjects',     icon: BarChart2,     route: '/modules/academics/subjects',     color: '#f97316' },
    { label: 'Analytics',    icon: TrendingUp,    route: '/modules/analytics/dashboard',    color: '#34d399' },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Academics Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">KPIs, class performance and at-risk tracking · Kenyan CBC & 8-4-4</p>
        </div>
      </div>

      {error && <div className="rounded-2xl p-4 text-sm text-rose-200" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={15} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">
              {isLoading ? <span className="text-slate-700 animate-pulse">—</span> : k.value}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} onClick={() => navigate(a.route)}
            className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 hover:bg-white/[0.04] group"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${a.color}18` }}>
              <a.icon size={16} style={{ color: a.color }} />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-200 transition text-center">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Class + Subject Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white">Class Performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Class', 'Avg Score', 'Pass %', 'Results'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-600">Loading…</td></tr>
                ) : classPerf.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-600">No data available</td></tr>
                ) : classPerf.map(r => {
                  const pass = Number(r.pass_rate_percent)
                  return (
                    <tr key={r.class_section_id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 text-sm text-slate-200 font-medium">{r.class_name}</td>
                      <td className="px-4 py-3 text-sm text-white font-bold tabular-nums">{r.average_score}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold tabular-nums" style={{ color: pass >= 70 ? '#10b981' : pass >= 50 ? '#fbbf24' : '#f87171' }}>{r.pass_rate_percent}%</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">{r.total_results}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white">Subject Performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Subject', 'Avg', 'Pass %', 'Results'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-600">Loading…</td></tr>
                ) : subjectPerf.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-600">No data available</td></tr>
                ) : subjectPerf.map(r => {
                  const pass = Number(r.pass_rate_percent)
                  return (
                    <tr key={r.subject_id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-200">{r.subject_name}</p>
                        <p className="text-[10px] text-slate-600 font-mono">{r.subject_code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-white tabular-nums">{r.average_score}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold tabular-nums" style={{ color: pass >= 70 ? '#10b981' : pass >= 50 ? '#fbbf24' : '#f87171' }}>{r.pass_rate_percent}%</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">{r.total_results}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* At-Risk + Trend + KNEC Grades */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <AlertTriangle size={13} className="text-amber-400" />
            <p className="text-sm font-bold text-white">At-Risk Students</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-slate-600">Loading…</div>
            ) : atRisk.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No at-risk students</p>
              </div>
            ) : atRisk.slice(0, 8).map(r => (
              <div key={r.student_id} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{r.student_name}</p>
                  <p className="text-[10px] text-slate-500">{r.admission_number} · {r.failing_subjects} failing</p>
                </div>
                <span className="text-xs font-bold text-rose-400 tabular-nums">{r.average_score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white">Term Trend</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-slate-600">Loading…</div>
            ) : trend.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-600">No trend data</div>
            ) : trend.map(r => {
              const pass = Number(r.pass_rate_percent)
              return (
                <div key={r.term_id} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{r.term_name}</p>
                    <p className="text-[10px] text-slate-500">{r.total_results} results</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white tabular-nums">{r.average_score}</p>
                    <p className="text-[10px] tabular-nums font-bold" style={{ color: pass >= 70 ? '#10b981' : '#fbbf24' }}>{r.pass_rate_percent}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* KNEC Grade Scale */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white mb-1">KNEC Grade Scale</p>
          <p className="text-[10px] text-slate-500 mb-4">Kenyan 8-4-4 / CBC grading (KCSE-aligned)</p>
          <div className="space-y-1.5">
            {KENYAN_GRADES.map(g => (
              <div key={g.label} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                <span className="text-[11px] text-slate-300 font-medium">{g.label}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/modules/academics/gradebook')}
            className="w-full mt-4 rounded-xl py-2 text-xs font-bold transition hover:opacity-90"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
            Open Gradebook →
          </button>
        </div>
      </div>
    </div>
  )
}
