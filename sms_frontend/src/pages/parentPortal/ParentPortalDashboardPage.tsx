import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  GraduationCap, Activity, DollarSign, Calendar, Bell,
  CheckCircle2, AlertCircle, ChevronRight, Heart, BookOpen,
  Bus, Clock,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

export default function ParentPortalDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    apiClient.get('/parent-portal/dashboard/')
      .then(res => mounted && setData(res.data))
      .catch(() => mounted && setError('Unable to load parent dashboard.'))
    return () => { mounted = false }
  }, [])

  const hasNoLinkedChild = Boolean(data) && !data?.selected_child && (data?.children?.length ?? 0) === 0

  const kpis = [
    { label: 'Avg Grade', value: data?.kpis?.current_average_grade ?? '—', icon: GraduationCap, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: 'This term average' },
    { label: 'Attendance', value: data?.kpis?.attendance_rate ? `${data.kpis.attendance_rate}%` : '—', icon: Activity, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: 'Days present' },
    { label: 'Outstanding Fee', value: data?.kpis?.outstanding_fee_balance ? `Ksh ${Number(data.kpis.outstanding_fee_balance).toLocaleString()}` : 'Ksh 0', icon: DollarSign, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: 'Balance due' },
    { label: 'Upcoming Events', value: data?.kpis?.upcoming_events_count ?? 0, icon: Calendar, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: 'Next 7 days' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1a18 0%, #1a0e18 45%, #140e1a 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(16,185,129,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(168,85,247,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}>
                PARENT PORTAL
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Heart size={11} />
                Stay connected
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Parent Dashboard &<br />
              <span style={{ color: '#34d399' }}>Student Welfare</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Real-time updates on your child's academic performance, attendance, fee status, and school activities.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[220px]">
            {[
              { label: 'Grade', value: data?.kpis?.current_average_grade ?? '—', color: '#10b981', icon: GraduationCap },
              { label: 'Attendance', value: data?.kpis?.attendance_rate ? `${data.kpis.attendance_rate}%` : '—', color: '#0ea5e9', icon: Activity },
              { label: 'Fee Balance', value: data?.kpis?.outstanding_fee_balance ? 'Ksh ' + Number(data.kpis.outstanding_fee_balance).toLocaleString() : 'Ksh 0', color: '#f59e0b', icon: DollarSign },
              { label: 'Events', value: String(data?.kpis?.upcoming_events_count ?? 0), color: '#a855f7', icon: Calendar },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-3 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <item.icon size={12} style={{ color: item.color }} className="mx-auto mb-1" />
                <p className="text-sm font-bold text-white leading-tight">{item.value}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      {hasNoLinkedChild && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fde68a' }}
        >
          <AlertCircle size={14} />
          No student is currently linked to this parent account. Please ask the school office to create or confirm the parent-student link.
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden" style={GLASS}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-xl font-bold text-white tabular-nums leading-tight">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Alerts + Activity + Quick Links ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alerts */}
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Bell size={13} className="text-amber-400" /> Alerts
            </p>
          </div>
          <div className="p-4 space-y-2">
            {(data?.alerts ?? []).length > 0
              ? data.alerts.map((alert: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 rounded-xl p-3"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                  <AlertCircle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300">{alert.title}</p>
                </div>
              ))
              : (
                <div className="flex flex-col items-center justify-center py-6">
                  <CheckCircle2 size={28} className="text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-emerald-300">All clear</p>
                  <p className="text-xs text-slate-500 mt-1">No active alerts</p>
                </div>
              )
            }
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Activity size={13} className="text-sky-400" /> Recent Activity
            </p>
          </div>
          <div className="p-4 space-y-2">
            {(data?.recent_activity ?? []).length > 0
              ? data.recent_activity.map((act: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 py-2 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-300"><span className="text-emerald-400 font-medium">{act.type}</span>: {act.message}</p>
                </div>
              ))
              : <p className="text-xs text-slate-500 py-6 text-center">No recent activity</p>
            }
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl p-4" style={GLASS}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Access</p>
          <div className="space-y-2">
            {[
              { label: 'Academic Performance', route: '/modules/parent-portal/academics', icon: GraduationCap, color: '#10b981' },
              { label: 'Attendance Record', route: '/modules/parent-portal/attendance', icon: Activity, color: '#0ea5e9' },
              { label: 'Fee Statements', route: '/modules/parent-portal/finance', icon: DollarSign, color: '#f59e0b' },
              { label: 'School Calendar', route: '/modules/parent-portal/schedule', icon: Calendar, color: '#a855f7' },
              { label: 'Assignments & Homework', route: '/modules/parent-portal/assignments', icon: BookOpen, color: '#6366f1' },
              { label: 'Messages & Notices', route: '/modules/parent-portal/communication', icon: Bell, color: '#22c55e' },
              { label: 'Transport Tracking', route: '/modules/parent-portal/transport', icon: Bus, color: '#38bdf8' },
              { label: 'Health & Medical', route: '/modules/parent-portal/health', icon: Heart, color: '#fb7185' },
              { label: 'Library & Profile', route: '/modules/parent-portal/library-profile', icon: Clock, color: '#f97316' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.route)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="flex items-center gap-2">
                  <item.icon size={11} style={{ color: item.color }} />
                  {item.label}
                </span>
                <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
