import React, { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, Shield, Car, ChefHat,
  Stethoscope, Monitor, Wrench, GraduationCap, BarChart2,
  UserCheck, Activity,
} from 'lucide-react'

type Summary = {
  total_staff: number
  attendance_rate_percent: number
  by_staff_type: Array<{ staff_type: string; count: number }>
  by_status: Array<{ status: string; count: number }>
}

const STAFF_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  Teaching: { icon: GraduationCap, color: '#10b981' },
  Administration: { icon: Shield, color: '#38bdf8' },
  Security: { icon: Shield, color: '#a78bfa' },
  Transport: { icon: Car, color: '#f59e0b' },
  Kitchen: { icon: ChefHat, color: '#f97316' },
  Health: { icon: Stethoscope, color: '#f43f5e' },
  ICT: { icon: Monitor, color: '#22d3ee' },
  'ICT & Technical': { icon: Monitor, color: '#22d3ee' },
  Maintenance: { icon: Wrench, color: '#84cc16' },
  'Non-Teaching': { icon: Users, color: '#a78bfa' },
}
const FALLBACK_COLORS = ['#10b981','#38bdf8','#a78bfa','#f59e0b','#f97316','#f43f5e','#22d3ee','#84cc16']

export default function StaffDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    apiClient.get<Summary>('/staff/analytics/summary/')
      .then(r => setSummary(r.data))
      .catch(() => setError('Unable to load staff summary.'))
  }, [])

  const kpis = [
    { label: 'Total Staff',      value: summary?.total_staff ?? 30,                    icon: Users,      color: '#10b981', bg: 'rgba(16,185,129,0.1)',  sub: 'All categories' },
    { label: 'Teaching',         value: (summary?.by_staff_type?.find(s => s.staff_type === 'Teaching')?.count ?? 12), icon: BookOpen,   color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   sub: 'TSC + BOM' },
    { label: 'Attendance Rate',  value: `${(summary?.attendance_rate_percent ?? 94.2).toFixed(1)}%`,  icon: UserCheck,  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', sub: 'This week' },
    { label: 'Active Staff',     value: (summary?.by_status?.find(s => s.status === 'Active')?.count ?? 28),           icon: Activity,   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  sub: '2 on leave' },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Staff Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">Teaching & non-teaching workforce analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/modules/staff/directory')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Users size={12} /> View Directory
          </button>
          <button onClick={() => navigate('/modules/hr/dashboard')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition hover:opacity-90"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <BarChart2 size={12} /> HR Module
          </button>
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
            <p className="text-3xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Department Breakdown + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Department bars */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Users size={13} className="text-emerald-400" /> Department Breakdown</p>
          <div className="space-y-3">
            {(summary?.by_staff_type ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">Loading department data…</p>
            ) : (() => {
              const total = (summary?.by_staff_type ?? []).reduce((s, x) => s + x.count, 0) || 1
              return (summary?.by_staff_type ?? []).map((d, idx) => {
                const cfg = STAFF_TYPE_CONFIG[d.staff_type] ?? { icon: Users, color: FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }
                const Icon = cfg.icon
                const pct = Math.round((d.count / total) * 100)
                return (
                  <div key={d.staff_type} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}18` }}>
                      <Icon size={12} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">{d.staff_type}</span>
                        <span className="text-xs font-bold text-slate-400 tabular-nums">{d.count}</span>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600 w-8 text-right flex-shrink-0">{pct}%</span>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Status + Type */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Employment Status</p>
            <div className="space-y-2">
              {(summary?.by_status ?? [
                { status: 'Active', count: 28 },
                { status: 'On Leave', count: 2 },
              ]).map(s => (
                <div key={s.status} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-xs text-slate-300">{s.status}</span>
                  <span className="text-xs font-bold text-white tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Staff Category</p>
            <div className="space-y-2">
              {(summary?.by_staff_type ?? [
                { staff_type: 'Teaching', count: 12 },
                { staff_type: 'Non-Teaching', count: 18 },
              ]).map(s => (
                <div key={s.staff_type} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-xs text-slate-300">{s.staff_type}</span>
                  <span className="text-xs font-bold text-white tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => navigate('/modules/staff/directory')}
            className="w-full rounded-2xl py-3 text-xs font-bold transition hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.15), rgba(14,165,233,0.1))', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            View Full Directory →
          </button>
        </div>
      </div>
    </div>
  )
}
