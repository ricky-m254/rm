import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  Users, Building2, Briefcase, ChevronRight,
  UserCheck, TrendingUp, Award, Clock, Shield, GraduationCap,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type HrAnalyticsSummary = {
  headcount: number
  attendance_rate_percent: number
  departments: number
  positions: number
  headcount_by_status: Array<{ status: string; count: number }>
  headcount_by_department: Array<{ department: string; count: number }>
  headcount_by_employment_type: Array<{ employment_type: string; count: number }>
}

const emptySummary: HrAnalyticsSummary = {
  headcount: 0, attendance_rate_percent: 0, departments: 0, positions: 0,
  headcount_by_status: [], headcount_by_department: [], headcount_by_employment_type: [],
}

const DEPT_COLORS = ['#10b981', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#f97316', '#6366f1', '#ec4899']
const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Active:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  Probation:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  Suspended:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  Terminated: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

export default function HrDashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<HrAnalyticsSummary>(emptySummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await apiClient.get<HrAnalyticsSummary>('/hr/analytics/summary/')
        if (mounted) setSummary(res.data)
      } catch {
        if (mounted) setError('Unable to load HR summary.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const kpis = [
    { label: 'Total Staff', value: summary.headcount, icon: Users, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: 'Teaching + Support' },
    { label: 'Attendance Rate', value: `${summary.attendance_rate_percent.toFixed(1)}%`, icon: UserCheck, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: 'This month average' },
    { label: 'Departments', value: summary.departments, icon: Building2, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: 'Active dept. units' },
    { label: 'Open Positions', value: summary.positions, icon: Briefcase, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: 'Across all departments' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1a2e 0%, #1a0e2e 45%, #0e1a18 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(14,165,233,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(16,185,129,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(14,165,233,0.2)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.35)' }}>
                HUMAN RESOURCES
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Shield size={11} />
                {summary.headcount} staff members
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Workforce &<br />
              <span style={{ color: '#7dd3fc' }}>HR Management</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Comprehensive employee management, payroll, attendance, leave, and performance tracking for all staff.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[240px]">
            {[
              { label: 'Staff', value: String(summary.headcount || '—'), color: '#10b981' },
              { label: 'Attendance', value: `${summary.attendance_rate_percent.toFixed(0)}%`, color: '#0ea5e9' },
              { label: 'Depts', value: String(summary.departments || '—'), color: '#a855f7' },
              { label: 'Positions', value: String(summary.positions || '—'), color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={GLASS}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Distribution charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* By Status */}
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Shield size={13} className="text-emerald-400" /> By Status
            </p>
          </div>
          <div className="p-4 space-y-2">
            {loading ? (
              <p className="text-sm text-slate-500 py-4 text-center">Loading...</p>
            ) : summary.headcount_by_status.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No data available</p>
            ) : summary.headcount_by_status.map(item => {
              const cfg = STATUS_CFG[item.status] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
              const pct = summary.headcount > 0 ? Math.round((item.count / summary.headcount) * 100) : 0
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      {item.status}
                    </span>
                    <span className="text-xs font-bold text-white">{item.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By Department */}
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 size={13} className="text-sky-400" /> By Department
            </p>
          </div>
          <div className="p-4 space-y-2">
            {loading ? (
              <p className="text-sm text-slate-500 py-4 text-center">Loading...</p>
            ) : summary.headcount_by_department.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No data available</p>
            ) : summary.headcount_by_department.map((item, i) => {
              const color = DEPT_COLORS[i % DEPT_COLORS.length]
              const max = Math.max(...summary.headcount_by_department.map(d => d.count))
              return (
                <div key={item.department}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-300 truncate max-w-[140px]">{item.department}</span>
                    <span className="text-xs font-bold text-white">{item.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By Employment Type + Quick Actions */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase size={13} className="text-amber-400" /> By Employment Type
              </p>
            </div>
            <div className="p-4 space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500 py-4 text-center">Loading...</p>
              ) : summary.headcount_by_employment_type.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No data available</p>
              ) : summary.headcount_by_employment_type.map((item, i) => {
                const color = ['#10b981', '#f59e0b', '#a855f7', '#0ea5e9'][i % 4]
                const max = Math.max(...summary.headcount_by_employment_type.map(d => d.count))
                return (
                  <div key={item.employment_type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-300">{item.employment_type}</span>
                      <span className="text-xs font-bold text-white">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Employee Directory', route: '/modules/hr/employees', icon: Users },
                { label: 'Payroll Management', route: '/modules/hr/payroll', icon: TrendingUp },
                { label: 'Leave Requests', route: '/modules/hr/leave', icon: Clock },
                { label: 'Performance Reviews', route: '/modules/hr/performance', icon: Award },
                { label: 'Staff Training', route: '/modules/hr/training', icon: GraduationCap },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.route)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="flex items-center gap-2">
                    <item.icon size={11} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    {item.label}
                  </span>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
