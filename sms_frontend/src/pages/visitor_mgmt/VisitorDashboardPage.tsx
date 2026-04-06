import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  UserCheck, UserMinus, ShieldCheck, ClipboardList,
  Clock, ChevronRight, BadgeCheck, Eye,
  Car, Building,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

interface Stats {
  today_visitors_in: number
  today_visitors_out: number
}

const RECENT_VISITORS = [
  { name: 'Mrs. Grace Kamau', purpose: 'Parent meeting — Form 3A', checkin: '9:15 AM', checkout: '10:45 AM', badge: 'VISITOR', status: 'Out', color: '#10b981' },
  { name: 'Mr. James Otieno', purpose: 'Delivery — kitchen supplies', checkin: '10:30 AM', checkout: null, badge: 'VENDOR', status: 'In', color: '#f59e0b' },
  { name: 'Dr. Faith Wanjiku', purpose: 'Board of Governors inspection', checkin: '11:00 AM', checkout: '1:30 PM', badge: 'OFFICIAL', status: 'Out', color: '#0ea5e9' },
  { name: 'Mr. Brian Mwangi', purpose: 'Child pickup — Brian Kamau F2', checkin: '12:45 PM', checkout: '1:05 PM', badge: 'PARENT', status: 'Out', color: '#a855f7' },
  { name: 'Ms. Sarah Njeri', purpose: 'Teacher interview — Principal', checkin: '2:00 PM', checkout: null, badge: 'VISITOR', status: 'In', color: '#ec4899' },
  { name: 'Mr. Peter Ngugi', purpose: 'Maintenance contractor — plumbing', checkin: '8:00 AM', checkout: '4:30 PM', badge: 'CONTRACTOR', status: 'Out', color: '#6b7280' },
]

const BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  VISITOR:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  VENDOR:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  OFFICIAL:   { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  PARENT:     { color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  CONTRACTOR: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const STATS_SUMMARY = [
  { label: 'Mon', visitors: 8 },
  { label: 'Tue', visitors: 12 },
  { label: 'Wed', visitors: 6 },
  { label: 'Thu', visitors: 15 },
  { label: 'Fri', visitors: 9 },
]
const maxV = Math.max(...STATS_SUMMARY.map(d => d.visitors))

export default function VisitorDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ today_visitors_in: 2, today_visitors_out: 10 })

  useEffect(() => {
    apiClient.get('/visitors/dashboard/')
      .then(res => {
        const d = res.data as Record<string, unknown>
        setStats({
          today_visitors_in: (d.visitors_in ?? d.today_visitors_in ?? 0) as number,
          today_visitors_out: (d.visitors_out ?? d.today_visitors_out ?? 0) as number,
        })
      })
      .catch(() => {})
  }, [])

  const totalToday = stats.today_visitors_in + stats.today_visitors_out

  const kpis = [
    { label: 'Currently On Campus', value: stats.today_visitors_in, icon: UserCheck, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: 'Signed in, not yet out' },
    { label: 'Visitors Today', value: totalToday, icon: ClipboardList, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: `${stats.today_visitors_out} signed out` },
    { label: 'Authorized Pickups', value: 3, icon: Car, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: 'Students collected today' },
    { label: 'Access Points Active', value: 3, icon: ShieldCheck, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: 'Main gate · Side · Admin' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1a1a 0%, #0e1420 45%, #1a1420 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(16,185,129,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(14,165,233,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}>
                VISITOR MANAGEMENT
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Security Active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Campus Access &<br />
              <span style={{ color: '#34d399' }}>Visitor Control</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Real-time visitor tracking, authorised student pickups, and digital access logs — keeping the campus secure.
            </p>
          </div>
          {/* Weekly bar chart */}
          <div className="rounded-2xl p-5 lg:min-w-[240px]"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">This Week</p>
            <div className="flex items-end gap-2 h-16">
              {STATS_SUMMARY.map(d => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm" style={{ height: `${(d.visitors / maxV) * 56}px`, background: '#10b981', opacity: 0.7 }} />
                  <p className="text-[9px] text-slate-500">{d.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              {STATS_SUMMARY.reduce((s, d) => s + d.visitors, 0)} total visitors this week
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
            style={{ background: `${k.color}10`, border: `1px solid ${k.color}25` }}>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: k.color }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Visitor Log + Sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Today's visitors */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Eye size={13} className="text-emerald-400" /> Today's Visitor Log — 12 March 2025
            </p>
            <button onClick={() => navigate('/modules/visitors/visitors')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition">
              Full log →
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {RECENT_VISITORS.map(v => {
              const bdgCfg = BADGE_COLORS[v.badge] ?? BADGE_COLORS.VISITOR
              const isIn = v.status === 'In'
              return (
                <div key={v.name} className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                      style={{ background: bdgCfg.bg, color: bdgCfg.color }}>
                      {v.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{v.name}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: bdgCfg.bg, color: bdgCfg.color }}>
                            {v.badge}
                          </span>
                          <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded`}
                            style={isIn
                              ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                              : { background: 'rgba(107,114,128,0.15)', color: '#94a3b8' }}>
                            {isIn ? <BadgeCheck size={8} /> : <UserMinus size={8} />}
                            {v.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{v.purpose}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock size={9} />In: {v.checkin}
                        </span>
                        {v.checkout && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <UserMinus size={9} />Out: {v.checkout}
                          </span>
                        )}
                        {!v.checkout && (
                          <span className="text-[10px] font-bold" style={{ color: '#10b981' }}>Still on campus</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Currently on campus */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={13} className="text-emerald-400" />
              <p className="text-xs font-bold text-emerald-300">Currently On Campus</p>
            </div>
            {RECENT_VISITORS.filter(v => v.status === 'In').map(v => {
              const bdgCfg = BADGE_COLORS[v.badge] ?? BADGE_COLORS.VISITOR
              return (
                <div key={v.name} className="flex items-center gap-2 py-2 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: bdgCfg.bg, color: bdgCfg.color }}>
                    {v.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{v.name}</p>
                    <p className="text-[9px] text-slate-500">Since {v.checkin}</p>
                  </div>
                  <span className="text-[9px] font-bold" style={{ color: bdgCfg.color }}>{v.badge}</span>
                </div>
              )
            })}
            {stats.today_visitors_in === 0 && (
              <p className="text-xs text-slate-500 text-center py-2">No visitors currently on campus</p>
            )}
          </div>

          {/* Access points */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Building size={13} className="text-sky-400" /> Access Points
              </p>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Main Gate', status: 'Monitored', color: '#10b981' },
                { label: 'Side Entrance', status: 'Monitored', color: '#10b981' },
                { label: 'Admin Block', status: 'Monitored', color: '#10b981' },
                { label: 'Sports Field Gate', status: 'CCTV Only', color: '#f59e0b' },
              ].map(ap => (
                <div key={ap.label} className="flex items-center justify-between py-1.5 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-xs text-slate-300">{ap.label}</span>
                  <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: ap.color }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ap.color }} />
                    {ap.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Sign In Visitor', route: '/modules/visitors/visitors', icon: UserCheck },
                { label: 'Pickup Logs', route: '/modules/visitors/pickup-logs', icon: Car },
                { label: 'Authorized Pickups', route: '/modules/visitors/authorized-pickups', icon: BadgeCheck },
                { label: 'All Visitor Logs', route: '/modules/visitors/visitors', icon: ClipboardList },
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
