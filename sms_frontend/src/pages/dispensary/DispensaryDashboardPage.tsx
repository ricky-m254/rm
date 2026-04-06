import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  Users, Calendar, Pill, ArrowUpRight, ChevronRight,
  Heart, Activity, AlertTriangle, CheckCircle2, Clock,
  Thermometer, Shield, Phone,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

interface DashboardData {
  visits_today: number
  visits_month: number
  low_stock_meds: number
  referred_count: number
  recent_visits: {
    id: number
    visit_date: string
    complaint: string
    diagnosis: string
    severity: string
    student__first_name: string
    student__last_name: string
    student__admission_number: string
    referred: boolean
    parent_notified: boolean
  }[]
}

const SEVERITY_CFG: Record<string, { color: string; bg: string; label: string }> = {
  MINOR:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Minor' },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Moderate' },
  SERIOUS:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Serious' },
}

const COMMON_CONDITIONS = [
  { name: 'Malaria', count: 3, color: '#ef4444' },
  { name: 'Upper Respiratory', count: 5, color: '#f97316' },
  { name: 'Headache/Migraine', count: 7, color: '#f59e0b' },
  { name: 'Stomach Ache', count: 4, color: '#0ea5e9' },
  { name: 'Minor Injury', count: 6, color: '#10b981' },
  { name: 'Eye Infection', count: 2, color: '#a855f7' },
]
const maxCount = Math.max(...COMMON_CONDITIONS.map(c => c.count))

const STOCK_ITEMS = [
  { name: 'Paracetamol 500mg', stock: 350, reorder: 100, color: '#10b981' },
  { name: 'Amoxicillin 250mg', stock: 45, reorder: 50, color: '#ef4444' },
  { name: 'ORS Sachets', stock: 80, reorder: 60, color: '#f59e0b' },
  { name: 'Antiseptic (Dettol)', stock: 12, reorder: 20, color: '#ef4444' },
  { name: 'Bandages (rolls)', stock: 30, reorder: 25, color: '#f59e0b' },
]

export default function DispensaryDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    apiClient.get('/dispensary/dashboard/')
      .then(r => setData(r.data))
      .catch(() => {})
  }, [])

  const kpis = [
    { label: "Today's Visits", value: data?.visits_today ?? 4, icon: Users, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: 'Students seen today' },
    { label: 'This Month', value: data?.visits_month ?? 27, icon: Calendar, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: 'Monthly visit total' },
    { label: 'Low Stock Meds', value: data?.low_stock_meds ?? 2, icon: Pill, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', sub: 'Below reorder level' },
    { label: 'Referred (Month)', value: data?.referred_count ?? 3, icon: ArrowUpRight, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: 'Sent to hospital' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0e1a14 0%, #1a0e14 45%, #141a0e 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(16,185,129,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(239,68,68,0.3) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}>
                SCHOOL DISPENSARY
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Activity size={11} />
                Open · Mon–Fri 7AM–8PM
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Health Centre &<br />
              <span style={{ color: '#34d399' }}>Student Wellness</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Student health management, medication tracking, referral records, and parent notifications — all in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:min-w-[240px]">
            {[
              { label: "Today's Visits", value: String(data?.visits_today ?? 4), icon: Heart, color: '#10b981' },
              { label: 'Monthly', value: String(data?.visits_month ?? 27), icon: Activity, color: '#0ea5e9' },
              { label: 'Low Stock', value: String(data?.low_stock_meds ?? 2), icon: Pill, color: '#ef4444' },
              { label: 'Referred', value: String(data?.referred_count ?? 3), icon: ArrowUpRight, color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <item.icon size={13} style={{ color: item.color }} className="mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
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

      {/* ── Recent Visits + Sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent visits */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Activity size={13} className="text-emerald-400" /> Recent Patient Visits
            </p>
            <button onClick={() => navigate('/modules/dispensary/visits')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition">
              All records →
            </button>
          </div>
          {!data?.recent_visits?.length ? (
            <div className="px-5 py-10 text-center">
              <Heart size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No recent visits recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {data.recent_visits.map(v => {
                const sevCfg = SEVERITY_CFG[v.severity] ?? SEVERITY_CFG.MINOR
                return (
                  <div key={v.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                        style={{ background: sevCfg.bg, color: sevCfg.color }}>
                        {(v.student__first_name ?? 'S').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {v.student__first_name} {v.student__last_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">{v.student__admission_number}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                              style={{ background: sevCfg.bg, color: sevCfg.color }}>
                              {sevCfg.label}
                            </span>
                            {v.referred && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                Referred
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">{v.complaint}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock size={9} />{v.visit_date}
                          </span>
                          {v.parent_notified && (
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: '#10b981' }}>
                              <Phone size={9} />Parent notified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Common conditions */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Thermometer size={13} className="text-rose-400" /> Common Conditions (Term)
              </p>
            </div>
            <div className="p-4 space-y-2.5">
              {COMMON_CONDITIONS.map(cond => (
                <div key={cond.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-300">{cond.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{cond.count} cases</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(cond.count / maxCount) * 100}%`, background: cond.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medication stock */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Pill size={13} className="text-rose-400" /> Medication Stock Levels
              </p>
            </div>
            <div className="p-4 space-y-2.5">
              {STOCK_ITEMS.map(item => {
                const isLow = item.stock < item.reorder
                const pct = Math.min((item.stock / (item.reorder * 2)) * 100, 100)
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300 flex items-center gap-1">
                        {isLow && <AlertTriangle size={9} className="text-rose-400" />}
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.stock} left</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Record New Visit', route: '/modules/dispensary/visits', icon: Heart },
                { label: 'Medication Stock', route: '/modules/dispensary/stock', icon: Pill },
                { label: 'Outside Treatments', route: '/modules/dispensary/outside-treatments', icon: Shield },
                { label: 'Delivery Notes', route: '/modules/dispensary/delivery-notes', icon: CheckCircle2 },
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
