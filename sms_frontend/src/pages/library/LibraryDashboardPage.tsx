import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, RotateCcw, AlertTriangle, Clock, TrendingUp, Star, ChevronRight, Loader2, Globe, ExternalLink } from 'lucide-react'
import { apiClient } from '../../api/client'

const FREE_DIGITAL_RESOURCES = [
  { name: 'Kenya Education Cloud', url: 'https://kec.ac.ke/', icon: '🇰🇪', color: '#10b981', tag: 'Official CBC · Free', desc: 'KICD platform — CBC e-books, radio lessons, OER for all levels.' },
  { name: 'KICD OER Portal', url: 'https://oer.kec.ac.ke/', icon: '📂', color: '#6366f1', tag: 'Open License', desc: 'Openly licensed CBC materials — free to use and redistribute.' },
  { name: 'OpenStax Free Textbooks', url: 'https://openstax.org/', icon: '🔓', color: '#ef4444', tag: 'Free PDF Download', desc: 'Peer-reviewed Biology, Chemistry, Physics, Math PDFs — completely free.' },
  { name: 'Khan Academy', url: 'https://www.khanacademy.org/', icon: '🌐', color: '#14b8a6', tag: 'Free Forever', desc: 'Math, science, computing — aligned with Form 1-4 KCSE curriculum.' },
  { name: 'CK-12 Foundation', url: 'https://www.ck12.org/', icon: '📗', color: '#f59e0b', tag: 'Free Textbooks', desc: 'Free customisable textbooks and simulations for all secondary subjects.' },
  { name: 'KNEC Past Papers', url: 'https://www.knec.ac.ke/index.php/component/content/article/past-papers', icon: '📝', color: '#f97316', tag: 'Official Papers', desc: 'Official KCSE past papers from Kenya National Examinations Council.' },
]

interface DashboardData {
  total_resources: number
  total_copies: number
  available_copies: number
  borrowed_copies: number
  overdue_count: number
  total_members: number
  recent_activity: { id: number; member: string; book: string; action: string; date: string }[]
  popular_resources: { id: number; title: string; authors: string; borrow_count: number }[]
}

interface OverdueItem {
  id: number
  member_name: string
  member_member_id: string
  resource_title: string
  due_date: string
  overdue_days: number
}

const ICONS = ['📐', '📖', '🧬', '🌾', '⚗️', '💻', '🌍', '📕', '💼', '🏛️']
const GRAD_COLORS = [
  { from: '#1d4ed8', to: '#3b82f6' }, { from: '#166534', to: '#22c55e' },
  { from: '#581c87', to: '#a855f7' }, { from: '#7c2d12', to: '#f97316' },
  { from: '#065f46', to: '#10b981' }, { from: '#1e1b4b', to: '#6366f1' },
  { from: '#0c4a6e', to: '#0ea5e9' }, { from: '#92400e', to: '#f59e0b' },
]

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

export default function LibraryDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [overdue, setOverdue] = useState<OverdueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reminderSent, setReminderSent] = useState<Set<number>>(new Set())

  useEffect(() => {
    Promise.all([
      apiClient.get('/library/dashboard/'),
      apiClient.get('/library/circulation/overdue/'),
    ])
      .then(([dashRes, overdueRes]) => {
        setData(dashRes.data)
        const od = overdueRes.data
        setOverdue(Array.isArray(od) ? od : od.results ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = data
    ? [
        { label: 'Total Resources', value: data.total_resources.toLocaleString(), sub: `${data.total_copies.toLocaleString()} copies`, icon: BookOpen, color: '#10b981' },
        { label: 'Active Members', value: data.total_members.toLocaleString(), sub: 'Students & Staff', icon: Users, color: '#6366f1' },
        { label: 'Currently Borrowed', value: data.borrowed_copies.toLocaleString(), sub: `${data.available_copies} available`, icon: RotateCcw, color: '#f59e0b' },
        { label: 'Overdue', value: data.overdue_count.toLocaleString(), sub: 'Need return', icon: AlertTriangle, color: '#ef4444' },
      ]
    : []

  const maxBorrows = data?.popular_resources?.[0]?.borrow_count || 1

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-10 md:px-10"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.4) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                ST. MARY'S LIBRARY
              </span>
              <span className="text-xs text-slate-400">Term 1 2026</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              Knowledge Hub &<br />
              <span style={{ color: '#818cf8' }}>Resource Centre</span>
            </h1>
            <p className="mt-2 text-slate-300 max-w-md text-sm">
              {data ? `${data.total_resources.toLocaleString()} titles · ${data.total_copies.toLocaleString()} copies` : 'Loading…'} · Open 7:00 AM – 6:00 PM
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => navigate('/modules/library/catalog')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#6366f1', color: '#fff' }}>
                <BookOpen size={15} /> Search Catalog
              </button>
              <button onClick={() => navigate('/modules/library/circulation')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}>
                <RotateCcw size={15} /> Return Book
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-56 flex-shrink-0">
            {[
              { v: data ? data.total_resources.toLocaleString() : '…', l: 'Titles', c: '#818cf8' },
              { v: data ? data.total_copies.toLocaleString() : '…', l: 'Copies', c: '#34d399' },
              { v: data ? data.borrowed_copies.toLocaleString() : '…', l: 'Borrowed', c: '#fcd34d' },
              { v: data ? data.overdue_count.toLocaleString() : '…', l: 'Overdue', c: '#f87171' },
            ].map(x => (
              <div key={x.l} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-2xl font-bold" style={{ color: x.c }}>{x.v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={28} className="text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <GlassCard key={s.label} className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                  <Icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-white">{s.value}</p>
                  <p className="text-xs font-medium text-slate-400">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.sub}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Popular Books */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-400" /> Most Popular Books
            </h2>
            <button onClick={() => navigate('/modules/library/catalog')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Full Catalog <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {(data?.popular_resources ?? []).map((b, i) => {
              const grad = GRAD_COLORS[i % GRAD_COLORS.length]
              const icon = ICONS[i % ICONS.length]
              return (
                <GlassCard key={b.id} className="p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{b.title}</p>
                      <p className="text-xs text-slate-400">{b.authors}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                          <div className="h-full rounded-full" style={{ width: `${(b.borrow_count / maxBorrows) * 100}%`, background: grad.to }} />
                        </div>
                        <span className="text-xs font-bold text-slate-300">{b.borrow_count} borrows</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="flex items-center gap-1 text-xs text-amber-400"><Star size={10} fill="#f59e0b" /> #{i + 1}</span>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
            {!loading && (data?.popular_resources ?? []).length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No borrowing data yet</p>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Clock size={18} className="text-slate-400" /> Recent Activity
          </h2>
          <div className="space-y-2">
            {(data?.recent_activity ?? []).map(a => (
              <GlassCard key={a.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: a.action === 'Borrowed' ? '#10b981' : a.action === 'Returned' ? '#6366f1' : '#f59e0b'
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.member}</p>
                    <p className="text-xs text-slate-400 truncate">{a.action}: <span className="text-slate-300">{a.book}</span></p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{a.date}</span>
                </div>
              </GlassCard>
            ))}
            {!loading && (data?.recent_activity ?? []).length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Free Digital Resources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Globe size={18} className="text-indigo-400" /> Free Digital Resources
            <span className="text-xs text-slate-500">— Available to all schools on RSM</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FREE_DIGITAL_RESOURCES.map(r => (
            <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
              className="rounded-2xl border p-4 flex items-start gap-3 hover:border-slate-500 transition-all group"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${r.color}20` }}>{r.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{r.name}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${r.color}20`, color: r.color }}>{r.tag}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
              </div>
              <ExternalLink size={13} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </div>

      {/* Overdue */}
      <div>
        <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-400" /> Overdue Returns
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            {overdue.length}
          </span>
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="text-rose-500 animate-spin" />
          </div>
        ) : overdue.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-sm text-slate-400">No overdue returns — great job!</p>
          </GlassCard>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Member', 'Book', 'Due Date', 'Days Overdue', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdue.map(o => (
                  <tr key={o.id} className="border-t transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 font-semibold text-white">{o.member_name || o.member_member_id}</td>
                    <td className="px-4 py-3 text-slate-300">{o.resource_title}</td>
                    <td className="px-4 py-3 text-rose-400 text-xs">{o.due_date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>{o.overdue_days} days</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          apiClient.post(`/library/circulation/${o.id}/send_reminder/`, {}).catch(() => {})
                          setReminderSent(prev => new Set(prev).add(o.id))
                        }}
                        disabled={reminderSent.has(o.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={reminderSent.has(o.id)
                          ? { background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }
                          : { background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        {reminderSent.has(o.id) ? 'Sent ✓' : 'Send Reminder'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
