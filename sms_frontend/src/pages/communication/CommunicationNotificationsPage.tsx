import { useEffect, useState } from 'react'
import {
  Bell, BellOff, CheckCheck, Trash2, Filter,
  AlertTriangle, Info, Zap, DollarSign, BookOpen,
  GraduationCap, Calendar, Loader2, Clock,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type NotificationRow = {
  id: number
  title: string
  message: string
  is_read: boolean
  sent_at: string
  notification_type: string
  recipient?: number
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray((value as { results?: T[] }).results) ? (value as { results: T[] }).results : []
}

function fmtTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3_600_000
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 48) return 'Yesterday'
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  System: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  Fee: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  Exam: { icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25' },
  Attendance: { icon: GraduationCap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  Alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  Event: { icon: Calendar, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  Approval: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25' },
}

const DEFAULT_TYPE = TYPE_CONFIG.System

const NOTIFICATION_TYPES = ['System', 'Fee', 'Exam', 'Attendance', 'Alert', 'Event', 'Approval']

export default function CommunicationNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({ title: '', message: '', notification_type: 'System', recipient: 1 })

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<NotificationRow[] | { results: NotificationRow[] }>('/communication/notifications/')
      setRows(asArray(res.data))
    } catch {
      setError('Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const create = async () => {
    if (!form.title.trim() || !form.message.trim()) { setError('Title and message are required.'); return }
    setCreating(true)
    setError(null)
    try {
      await apiClient.post('/communication/notifications/', form)
      setForm({ title: '', message: '', notification_type: 'System', recipient: 1 })
      setShowForm(false)
      setSuccess('Notification sent!')
      setTimeout(() => setSuccess(null), 3000)
      await load()
    } catch {
      setError('Unable to create notification.')
    } finally {
      setCreating(false)
    }
  }

  const markRead = async (id: number) => {
    try {
      await apiClient.patch(`/communication/notifications/${id}/read/`)
      setRows(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r))
    } catch { /* ok */ }
  }

  const doDelete = async (id: number) => {
    try {
      await apiClient.delete(`/communication/notifications/${id}/`)
      setRows(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Unable to delete notification.')
    }
  }

  const displayed = rows
    .filter(r => {
      if (filter === 'unread') return !r.is_read
      if (filter === 'read') return r.is_read
      return true
    })
    .filter(r => typeFilter === 'All' || r.notification_type === typeFilter)

  const unreadCount = rows.filter(r => !r.is_read).length

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="Push Notifications"
        subtitle="App and browser push notification management"
        icon="📣"
      />
      {/* Header */}

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCheck size={14} />{success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2"><Bell size={14} /> Create Notification</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Notification title…"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <select
              value={form.notification_type}
              onChange={(e) => setForm(f => ({ ...f, notification_type: e.target.value }))}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white"
            >
              {NOTIFICATION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
            rows={3}
            placeholder="Notification message…"
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancel</button>
            <button onClick={create} disabled={creating} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-400 transition disabled:opacity-50">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />} Send
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 rounded-xl glass-panel p-1">
          {(['all', 'unread', 'read'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === f ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {f}{f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl glass-panel px-3">
          <Filter size={11} className="text-slate-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-300 py-2 pr-1 focus:outline-none"
          >
            <option value="All">All Types</option>
            {NOTIFICATION_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BellOff size={40} className="text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-400">No notifications</p>
          <p className="text-xs text-slate-600 mt-1">{filter !== 'all' ? `No ${filter} notifications.` : 'Your notification inbox is empty.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => {
            const cfg = TYPE_CONFIG[n.notification_type] ?? DEFAULT_TYPE
            const Icon = cfg.icon
            return (
              <div
                key={n.id}
                className={`group flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-all ${n.is_read ? 'border-white/[0.07] bg-white/[0.02] opacity-75' : `border-white/[0.09] bg-white/[0.03] ${cfg.border}`}`}
              >
                <div className={`flex-shrink-0 mt-0.5 rounded-xl p-2 border ${cfg.bg} ${cfg.border}`}>
                  <Icon size={13} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="h-6 w-6 rounded-lg border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/15 transition opacity-0 group-hover:opacity-100"
                          title="Mark read"
                        >
                          <CheckCheck size={10} className="text-emerald-400" />
                        </button>
                      )}
                      <button
                        onClick={() => doDelete(n.id)}
                        className="h-6 w-6 rounded-lg border border-red-500/20 flex items-center justify-center hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={10} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                      {n.notification_type}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock size={9} /> {fmtTime(n.sent_at)}
                    </span>
                    {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
