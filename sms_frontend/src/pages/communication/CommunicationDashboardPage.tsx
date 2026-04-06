import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Bell, Mail, Phone, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Users, Megaphone, FileText, Activity,
  ArrowRight, RefreshCw,
} from 'lucide-react'
import { apiClient } from '../../api/client'

type Summary = {
  total_messages: number
  total_notifications: number
  total_emails: number
  total_sms: number
}

type RecentActivity = {
  id?: number
  channel?: string
  channel_type?: string
  subject?: string
  message?: string
  description?: string
  content?: string
  sender_name?: string
  time?: string
  created_at?: string
  sent_at?: string
  status?: 'sent' | 'delivered' | 'failed' | 'pending' | string
  delivery_status?: 'Sent' | 'Delivered' | 'Read' | 'Failed' | string
}

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

function activityLabel(act: RecentActivity): string {
  return act.description ?? act.subject ?? act.message ?? act.content ?? '(no subject)'
}

function activityTime(act: RecentActivity): string {
  if (act.time) return act.time
  const timestamp = act.sent_at ?? act.created_at
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function activityChannel(act: RecentActivity): string {
  return act.channel ?? act.channel_type ?? (act.content ? 'In-App' : 'SMS')
}

function activityStatus(act: RecentActivity): keyof typeof STATUS_COLORS {
  const raw = (act.delivery_status ?? act.status ?? 'pending').toString().toLowerCase()
  if (raw === 'read') return 'delivered'
  if (raw in STATUS_COLORS) return raw as keyof typeof STATUS_COLORS
  return 'pending'
}

function activityStatusLabel(act: RecentActivity): string {
  return act.delivery_status ?? act.status ?? 'Pending'
}

const STATUS_COLORS = {
  sent: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  delivered: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  failed: 'text-red-400 bg-red-500/15 border-red-500/30',
  pending: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  SMS: Phone, Email: Mail, WhatsApp: Phone, Push: Bell, 'In-App': MessageSquare,
}

export default function CommunicationDashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [summaryRes, activityRes] = await Promise.allSettled([
        apiClient.get<Summary>('/communication/analytics/summary/'),
        apiClient.get('/communication/messages/', { params: { limit: 6, ordering: '-sent_at' } }),
      ])
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data)
      if (activityRes.status === 'fulfilled') setRecentActivity(asArr<RecentActivity>(activityRes.value.data))
    } catch {
      setError('Unable to load communication summary.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const stats = [
    {
      label: 'Conversation Messages', value: summary?.total_messages ?? 0,
      icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30',
      glow: 'rgba(139,92,246,0.15)', trend: '+12%', up: true, route: '/modules/communication/messaging',
    },
    {
      label: 'Notifications', value: summary?.total_notifications ?? 0,
      icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
      glow: 'rgba(245,158,11,0.15)', trend: '+8%', up: true, route: '/modules/communication/notifications',
    },
    {
      label: 'Email Campaigns', value: summary?.total_emails ?? 0,
      icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
      glow: 'rgba(59,130,246,0.15)', trend: '+5%', up: true, route: '/modules/communication/email',
    },
    {
      label: 'SMS / WhatsApp', value: summary?.total_sms ?? 0,
      icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
      glow: 'rgba(16,185,129,0.15)', trend: '+18%', up: true, route: '/modules/communication/sms',
    },
  ]

  const channels = [
    { name: 'SMS Gateway', status: 'Active', provider: 'Africa\'s Talking', health: 98, color: 'emerald' },
    { name: 'Email SMTP', status: 'Active', provider: 'Gmail / SMTP', health: 100, color: 'emerald' },
    { name: 'WhatsApp API', status: 'Inactive', provider: 'Not configured', health: 0, color: 'slate' },
    { name: 'Push Notifications', status: 'Active', provider: 'Firebase FCM', health: 95, color: 'blue' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-6 py-9 md:px-10"
        style={{ background: 'linear-gradient(135deg, #1a0e2e 0%, #0e1a2e 45%, #1a140e 100%)' }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(ellipse at 78% 45%, rgba(139,92,246,0.5) 0%, transparent 55%), radial-gradient(ellipse at 18% 75%, rgba(16,185,129,0.35) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' }}>
                COMMUNICATION HUB
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                All channels active
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              School Communications &<br />
              <span style={{ color: '#c4b5fd' }}>Channel Overview</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              SMS, email, push notifications, and in-app conversations — all unified in one communication workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-2 lg:min-w-[200px]">
              {[
                { label: 'Conversations', value: String(summary?.total_messages ?? 0), color: '#a78bfa' },
                { label: 'Notifications', value: String(summary?.total_notifications ?? 0), color: '#f59e0b' },
                { label: 'Emails', value: String(summary?.total_emails ?? 0), color: '#3b82f6' },
                { label: 'SMS/WA', value: String(summary?.total_sms ?? 0), color: '#10b981' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl px-3 py-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-lg font-bold text-white">{item.value}</p>
                  <p className="text-[9px] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
            <button onClick={load} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs text-slate-300 hover:text-white transition flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">{error} — showing cached data.</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.route)}
            className="group relative overflow-hidden rounded-2xl p-4 text-left hover:scale-[1.02] transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: `0 0 0 1px ${s.glow}` }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `radial-gradient(ellipse at top left, ${s.glow}, transparent 70%)` }} />
            <div className={`inline-flex items-center justify-center rounded-xl p-2 mb-3 ${s.bg} border ${s.border}`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className="text-[11px] font-medium text-slate-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '—' : s.value.toLocaleString()}
            </p>
            <div className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
              {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {s.trend} this month
            </div>
          </button>
        ))}
      </div>

      {/* Channel Health + Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Channel Health */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Channel Health</h2>
          </div>
          <div className="space-y-3">
            {channels.map((ch) => (
              <div key={ch.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{ch.name}</p>
                    <p className="text-[10px] text-slate-500">{ch.provider}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ch.status === 'Active'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}>{ch.status}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      ch.health >= 90 ? 'bg-emerald-500' : ch.health >= 60 ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                    style={{ width: `${ch.health}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={15} className="text-amber-400" />
            <h2 className="text-sm font-bold text-white">Recent Conversation Activity</h2>
          </div>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {loading ? 'Loading…' : 'No recent conversation activity. Start by posting in a conversation.'}
              </p>
            ) : recentActivity.map((act, i) => {
              const ch = activityChannel(act)
              const Icon = CHANNEL_ICONS[ch] ?? MessageSquare
              const statusKey = activityStatus(act)
              const colorCls = STATUS_COLORS[statusKey]
              return (
                <div key={act.id ?? i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <Icon size={12} className="text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{activityLabel(act)}</p>
                    <p className="text-[10px] text-slate-500">
                      {[act.sender_name, activityTime(act)].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorCls}`}>
                    {activityStatusLabel(act)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Conversations', icon: MessageSquare, route: '/modules/communication/messaging', color: '#a78bfa' },
          { label: 'Announcements', icon: Megaphone, route: '/modules/communication/announcements', color: '#f59e0b' },
          { label: 'Notifications', icon: Bell, route: '/modules/communication/notifications', color: '#f97316' },
          { label: 'Email', icon: Mail, route: '/modules/communication/email', color: '#3b82f6' },
          { label: 'SMS', icon: Phone, route: '/modules/communication/sms', color: '#10b981' },
          { label: 'Templates', icon: FileText, route: '/modules/communication/templates', color: '#64748b' },
        ].map((q) => (
          <button
            key={q.label}
            onClick={() => navigate(q.route)}
            className="group flex flex-col items-center gap-2 rounded-2xl p-4 hover:bg-white/[0.04] transition-all"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="h-9 w-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <q.icon size={16} style={{ color: q.color }} />
            </div>
            <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">{q.label}</span>
            <ArrowRight size={10} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Recipients Reached', value: '2,840', icon: Users, color: '#a78bfa' },
          { label: 'Delivery Rate', value: '96.4%', icon: CheckCircle2, color: '#10b981' },
          { label: 'Unread Notifications', value: '12', icon: Bell, color: '#f59e0b' },
          { label: 'Active Campaigns', value: '3', icon: Mail, color: '#3b82f6' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <s.icon size={14} style={{ color: s.color }} className="mb-2" />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
