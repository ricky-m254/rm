import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import {
  Wrench, Clock, CheckCircle2, AlertTriangle, ChevronRight,
  Hammer, Zap, Droplets, Wind, Settings, ListChecks, TrendingUp,
} from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

interface Stats {
  total_requests: number
  pending_requests: number
  in_progress: number
  completed_requests: number
}

const CAT_COLORS = ['#f59e0b', '#0ea5e9', '#ef4444', '#f97316', '#a855f7', '#10b981', '#6b7280', '#ec4899']
const CAT_ICONS = [Zap, Droplets, Hammer, Wrench, Wind, Settings, TrendingUp, AlertTriangle]

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'In Progress': { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  Completed:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  Cancelled:   { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const PRIORITY_CFG: Record<string, { color: string }> = {
  High:   { color: '#ef4444' },
  Medium: { color: '#f59e0b' },
  Low:    { color: '#10b981' },
}

type MaintRequest = {
  id: number
  reference_code?: string
  title: string
  category_name?: string
  priority?: string
  status: string
  created_at: string
}

type MaintCategory = { id: number; name: string; request_count?: number }

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function MaintenanceDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ total_requests: 0, pending_requests: 0, in_progress: 0, completed_requests: 0 })
  const [recentRequests, setRecentRequests] = useState<MaintRequest[]>([])
  const [apiCategories, setApiCategories] = useState<MaintCategory[]>([])

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/maintenance/dashboard/'),
      apiClient.get('/maintenance/requests/', { params: { limit: 6, ordering: '-created_at' } }),
      apiClient.get('/maintenance/categories/'),
    ]).then(([statsRes, reqRes, catRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (reqRes.status === 'fulfilled') setRecentRequests(asArr<MaintRequest>(reqRes.value.data))
      if (catRes.status === 'fulfilled') setApiCategories(asArr<MaintCategory>(catRes.value.data))
    })
  }, [])

  const completionRate = stats.total_requests > 0
    ? Math.round((stats.completed_requests / stats.total_requests) * 100)
    : 0

  const kpis = [
    { label: 'Total Requests', value: stats.total_requests, icon: ListChecks, color: '#10b981', bg: 'rgba(16,185,129,0.12)', sub: 'All time' },
    { label: 'Pending', value: stats.pending_requests, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', sub: 'Awaiting assignment' },
    { label: 'In Progress', value: stats.in_progress, icon: Wrench, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', sub: 'Active repairs' },
    { label: 'Completed', value: stats.completed_requests, icon: CheckCircle2, color: '#a855f7', bg: 'rgba(168,85,247,0.12)', sub: `${completionRate}% completion rate` },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #1a0e0e 0%, #1a1a0e 45%, #0e1a14 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(245,158,11,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(239,68,68,0.3) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.35)' }}>
                FACILITIES MAINTENANCE
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                <AlertTriangle size={11} />
                {stats.pending_requests} requests pending
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              School Maintenance &<br />
              <span style={{ color: '#fcd34d' }}>Facilities Control</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              Track repair requests, schedule maintenance, and keep the school infrastructure in top condition.
            </p>
          </div>
          {/* Completion ring */}
          <div className="flex items-center gap-6 justify-center lg:justify-end">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionRate / 100)}`}
                transform="rotate(-90 50 50)" />
              <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">{completionRate}%</text>
              <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fill="#94a3b8">completed</text>
            </svg>
            <div className="space-y-2">
              {[
                { label: 'Pending', value: stats.pending_requests, color: '#f59e0b' },
                { label: 'In Progress', value: stats.in_progress, color: '#0ea5e9' },
                { label: 'Completed', value: stats.completed_requests, color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-xs font-bold text-white ml-auto">{value}</span>
                </div>
              ))}
            </div>
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

      {/* ── Requests Table + Categories ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent requests */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={GLASS}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench size={13} className="text-amber-400" /> Recent Maintenance Requests
            </p>
            <button onClick={() => navigate('/modules/maintenance/requests')}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition">
              All requests →
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentRequests.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No maintenance requests found. <button onClick={() => navigate('/modules/maintenance/requests')} className="text-amber-400 underline">Create one →</button>
              </div>
            ) : recentRequests.map((req, idx) => {
              const stCfg = STATUS_CFG[req.status] ?? STATUS_CFG.Pending
              const prCfg = PRIORITY_CFG[req.priority ?? 'Low'] ?? PRIORITY_CFG.Low
              const CatIcon = CAT_ICONS[idx % CAT_ICONS.length]
              const catColor = CAT_COLORS[idx % CAT_COLORS.length]
              return (
                <div key={req.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${catColor}18` }}>
                      <CatIcon size={14} style={{ color: catColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white leading-snug">{req.title}</p>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0"
                          style={{ background: stCfg.bg, color: stCfg.color }}>
                          {req.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-500 font-mono">{req.reference_code ?? `MNT-${req.id}`}</span>
                        {req.category_name && <span className="text-[10px] text-slate-500">{req.category_name}</span>}
                        {req.priority && <span className="text-[10px] font-bold" style={{ color: prCfg.color }}>{req.priority}</span>}
                        <span className="text-[10px] text-slate-600 ml-auto">{req.created_at.slice(0, 10)}</span>
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

          {/* Categories */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Settings size={13} className="text-violet-400" /> By Category
              </p>
            </div>
            <div className="p-4 space-y-3">
              {apiCategories.length === 0 ? (
                <p className="text-xs text-slate-500">No categories configured.</p>
              ) : apiCategories.slice(0, 8).map((cat, idx) => {
                const color = CAT_COLORS[idx % CAT_COLORS.length]
                const CatIcon = CAT_ICONS[idx % CAT_ICONS.length]
                const maxCount = Math.max(...apiCategories.map(c => c.request_count ?? 0), 1)
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 text-xs text-slate-300">
                        <CatIcon size={11} style={{ color }} />
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{cat.request_count ?? 0}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${((cat.request_count ?? 0) / maxCount) * 100}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Priority summary — computed from dashboard stats */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} className="text-rose-400" />
              <p className="text-xs font-bold text-rose-300">Status Breakdown</p>
            </div>
            {[
              { label: 'Pending', count: stats.pending_requests, color: '#f59e0b' },
              { label: 'In Progress', count: stats.in_progress, color: '#0ea5e9' },
              { label: 'Completed', count: stats.completed_requests, color: '#10b981' },
            ].map(p => (
              <div key={p.label} className="flex items-center justify-between py-1.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span className="text-xs text-slate-400">{p.label}</span>
                </div>
                <span className="text-xs font-bold text-white">{p.count}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4" style={GLASS}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'New Maintenance Request', route: '/modules/maintenance/requests' },
                { label: 'Maintenance Checklists', route: '/modules/maintenance/checklists' },
                { label: 'Maintenance Categories', route: '/modules/maintenance/categories' },
                { label: 'Asset Maintenance', route: '/modules/assets/maintenance' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.route)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{item.label}</span>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Trend indicator */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={13} className="text-emerald-400" />
              <p className="text-xs font-bold text-emerald-300">Resolution Rate</p>
            </div>
            <p className="text-3xl font-bold text-white mt-1">{completionRate}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.completed_requests} of {stats.total_requests} requests resolved this term
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
