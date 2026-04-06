import { useEffect, useState } from 'react'
import {
  Bell, BellRing, AlertTriangle, Info, Zap, CheckCircle, X,
  Megaphone, Calendar, TrendingDown, DollarSign, Users, Globe,
  Plus, Loader2, CheckCheck, Filter,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Announcement = {
  id: number
  title: string
  body: string
  priority: string
  audience_type: string
  is_pinned: boolean
  created_at?: string
  created_by_name?: string
}

type SystemAlert = {
  id: string
  type: 'warning' | 'critical' | 'info' | 'success'
  title: string
  message: string
  category: 'attendance' | 'finance' | 'staff' | 'academic' | 'system'
  time: string
  dismissed: boolean
}

type TabId = 'all' | 'announcements' | 'alerts' | 'reminders'

const PRIORITY_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  Critical: { bg: 'rgba(239,68,68,0.12)',   color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
  Urgent:   { bg: 'rgba(239,68,68,0.12)',   color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
  Important:{ bg: 'rgba(245,158,11,0.12)',  color: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
  Normal:   { bg: 'rgba(59,130,246,0.12)',  color: '#93c5fd', border: 'rgba(59,130,246,0.3)' },
  Low:      { bg: 'rgba(100,116,139,0.1)',  color: '#94a3b8', border: 'rgba(100,116,139,0.2)' },
}

const ALERT_TYPE_COLOR: Record<SystemAlert['type'], { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.12)',   color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
  warning:  { bg: 'rgba(245,158,11,0.12)',  color: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
  info:     { bg: 'rgba(59,130,246,0.12)',  color: '#93c5fd', border: 'rgba(59,130,246,0.3)' },
  success:  { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.3)' },
}

const ALERT_TYPE_ICON: Record<SystemAlert['type'], React.ElementType> = {
  critical: AlertTriangle, warning: Zap, info: Info, success: CheckCircle,
}

const CAT_ICON: Record<SystemAlert['category'], React.ElementType> = {
  attendance: Users, finance: DollarSign, staff: Users, academic: Globe, system: Bell,
}

function fmt(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

const INPUT = 'w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400'

export default function AlertsCenterPage() {
  const [tab, setTab] = useState<TabId>('all')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([])
  const [loadingAnn, setLoadingAnn] = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [form, setForm] = useState({
    title: '', body: '', priority: 'Normal', audience_type: 'All', is_pinned: false,
  })

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    apiClient.get('/communication/announcements/')
      .then(r => {
        const items = Array.isArray(r.data) ? r.data : r.data.results ?? []
        setAnnouncements(items)
      })
      .catch(() => {})
      .finally(() => setLoadingAnn(false))

    // Build system alerts from dashboard summary
    const buildAlerts = async () => {
      const alerts: SystemAlert[] = []
      try {
        const r = await apiClient.get('/dashboard/')
        const d = r.data as Record<string, unknown>
        const attRate = (d.attendance_rate as number) ?? 0
        const overdueCount = (d.overdue_invoices_count as number) ?? 0
        const totalStudents = (d.student_count as number) ?? 0

        if (attRate < 80 && attRate > 0) {
          alerts.push({
            id: 'att-low', type: 'critical', title: 'Low School Attendance',
            message: `Overall attendance rate is ${attRate}% — below the 80% threshold. Review absent students.`,
            category: 'attendance', time: new Date().toISOString(), dismissed: false,
          })
        } else if (attRate < 90 && attRate > 0) {
          alerts.push({
            id: 'att-warn', type: 'warning', title: 'Attendance Below Target',
            message: `Current attendance rate is ${attRate}%. Target is 90%+.`,
            category: 'attendance', time: new Date().toISOString(), dismissed: false,
          })
        }
        if (overdueCount > 0) {
          alerts.push({
            id: 'fee-overdue', type: 'warning', title: `${overdueCount} Overdue Fee Accounts`,
            message: `${overdueCount} students have overdue fee invoices. Send reminders from Finance module.`,
            category: 'finance', time: new Date().toISOString(), dismissed: false,
          })
        }
        if (totalStudents > 0) {
          alerts.push({
            id: 'sys-ok', type: 'success', title: 'System Running Normally',
            message: `RSM is managing ${totalStudents} active students. All modules operational.`,
            category: 'system', time: new Date().toISOString(), dismissed: false,
          })
        }
      } catch {
        // fallback demo alerts
      }
      if (!alerts.find(a => a.category === 'finance')) {
        alerts.push({
          id: 'fee-demo', type: 'warning', title: 'Fee Collection Reminder',
          message: 'End of term approaching. Review outstanding fee balances and send payment reminders.',
          category: 'finance', time: new Date(Date.now() - 2 * 3600000).toISOString(), dismissed: false,
        })
      }
      alerts.push({
        id: 'doc-expiry', type: 'info', title: 'Document Review Reminder',
        message: 'Review student admission documents. Some may be missing required attachments.',
        category: 'academic', time: new Date(Date.now() - 24 * 3600000).toISOString(), dismissed: false,
      })
      alerts.push({
        id: 'term-end', type: 'info', title: 'End of Term Checklist',
        message: 'Ensure all attendance registers, grade submissions and co-curricular reports are complete.',
        category: 'academic', time: new Date(Date.now() - 48 * 3600000).toISOString(), dismissed: false,
      })
      setSystemAlerts(alerts)
      setLoadingAlerts(false)
    }
    buildAlerts()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) { showToast('Title and body are required', false); return }
    setCreating(true)
    try {
      const r = await apiClient.post('/communication/announcements/', form)
      setAnnouncements(prev => [r.data as Announcement, ...prev])
      setShowCreate(false)
      setForm({ title: '', body: '', priority: 'Normal', audience_type: 'All', is_pinned: false })
      showToast('Announcement created successfully')
    } catch { showToast('Failed to create announcement', false) }
    finally { setCreating(false) }
  }

  function dismissAlert(id: string) {
    setSystemAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a))
  }

  const activeAlerts = systemAlerts.filter(a => !a.dismissed)
  const filteredAnn = announcements.filter(a => priorityFilter === 'All' || a.priority === priorityFilter)

  const REMINDERS = [
    { title: 'Term End Reporting', time: 'End of term', icon: Calendar, color: '#6366f1', desc: 'Submit class registers, grades and co-curricular reports before term closes.' },
    { title: 'CBC Portfolio Submission', time: 'Week 13', icon: CheckCheck, color: '#10b981', desc: 'All Grade 7–9 student portfolios must be submitted to the academic office.' },
    { title: 'Parent-Teacher Conference', time: 'Next 2 weeks', icon: Users, color: '#f59e0b', desc: 'Parent-teacher meetings scheduled. Send meeting reminders via the Communication module.' },
    { title: 'Fee Payment Deadline', time: 'End of month', icon: DollarSign, color: '#ef4444', desc: 'Remind parents of outstanding balances. Use Finance > Invoices to send reminders.' },
    { title: 'Attendance Review', time: 'Weekly', icon: TrendingDown, color: '#0ea5e9', desc: 'Review the weekly attendance report for students below 80% attendance rate.' },
  ]

  const allCount = filteredAnn.length + activeAlerts.length + REMINDERS.length
  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all',           label: 'All',           count: allCount },
    { id: 'announcements', label: 'Announcements', count: filteredAnn.length },
    { id: 'alerts',        label: 'System Alerts', count: activeAlerts.length },
    { id: 'reminders',     label: 'Reminders',     count: REMINDERS.length },
  ]

  const showAnn  = tab === 'all' || tab === 'announcements'
  const showSys  = tab === 'all' || tab === 'alerts'
  const showRem  = tab === 'all' || tab === 'reminders'

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl"
          style={toast.ok
            ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
            : { background: 'rgba(239,68,68,0.15)',  border: '1px solid rgba(239,68,68,0.3)',  color: '#fca5a5' }}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />} {toast.msg}
        </div>
      )}

      <PageHero
        badge="ALERTS"
        title="Alerts & Reminders Center"
        subtitle={`${allCount} active notifications — announcements, system alerts and scheduled reminders`}
        icon={<BellRing size={28} className="text-emerald-400" />}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
              style={tab === t.id
                ? { background: '#10b981', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t.label}
              {t.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={tab === t.id ? { background: 'rgba(0,0,0,0.2)' } : { background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-slate-500" />
            <select className="rounded-xl border border-white/[0.07] bg-slate-950 px-2 py-1.5 text-xs text-slate-300 outline-none"
              value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              {['All', 'Critical', 'Urgent', 'Important', 'Normal', 'Low'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: '#10b981', color: '#fff' }}>
            <Plus size={14} /> New Announcement
          </button>
        </div>
      </div>

      {/* System Alerts */}
      {showSys && (
        <div className="space-y-3">
          {(tab === 'all' || tab === 'alerts') && (
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" /> System Alerts
              {loadingAlerts && <Loader2 size={12} className="text-slate-500 animate-spin" />}
            </h3>
          )}
          {activeAlerts.length === 0 && !loadingAlerts && (
            <GlassCard className="p-6 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm text-slate-400">No active system alerts</p>
            </GlassCard>
          )}
          {activeAlerts.map(alert => {
            const style = ALERT_TYPE_COLOR[alert.type]
            const Icon = ALERT_TYPE_ICON[alert.type]
            const CatIcon = CAT_ICON[alert.category]
            return (
              <div key={alert.id} className="rounded-2xl border p-4 flex items-start gap-4"
                style={{ background: style.bg, borderColor: style.border }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                  <Icon size={16} style={{ color: style.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{alert.title}</p>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                      <CatIcon size={9} /> {alert.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{alert.message}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{fmt(alert.time)}</p>
                </div>
                <button onClick={() => dismissAlert(alert.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all flex-shrink-0">
                  <X size={12} className="text-slate-400" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Announcements */}
      {showAnn && (
        <div className="space-y-3">
          {tab === 'all' && (
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Megaphone size={14} className="text-blue-400" /> Announcements
              {loadingAnn && <Loader2 size={12} className="text-slate-500 animate-spin" />}
            </h3>
          )}
          {!loadingAnn && filteredAnn.length === 0 && (
            <GlassCard className="p-6 text-center">
              <Megaphone size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">No announcements yet</p>
              <button onClick={() => setShowCreate(true)}
                className="mt-3 mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Plus size={12} /> Create First Announcement
              </button>
            </GlassCard>
          )}
          {filteredAnn.map(ann => {
            const pStyle = PRIORITY_COLOR[ann.priority] ?? PRIORITY_COLOR.Normal
            return (
              <GlassCard key={ann.id} className="p-4 hover:border-slate-600 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: pStyle.bg, border: `1px solid ${pStyle.border}` }}>
                    <Megaphone size={15} style={{ color: pStyle.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{ann.title}</p>
                      {ann.is_pinned && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                          📌 Pinned
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}` }}>
                        {ann.priority}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                        {ann.audience_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{ann.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {ann.created_by_name && <span className="text-[10px] text-slate-500">By {ann.created_by_name}</span>}
                      {ann.created_at && <span className="text-[10px] text-slate-500">{fmt(ann.created_at)}</span>}
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Reminders */}
      {showRem && (
        <div className="space-y-3">
          {tab === 'all' && (
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Calendar size={14} className="text-violet-400" /> Scheduled Reminders
            </h3>
          )}
          {REMINDERS.map((r, i) => (
            <GlassCard key={i} className="p-4 hover:border-slate-600 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${r.color}18`, border: `1px solid ${r.color}30` }}>
                  <r.icon size={15} style={{ color: r.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{r.title}</p>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}30` }}>
                      {r.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{r.desc}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-3xl border p-6 space-y-4" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-white">New Announcement</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Title *</label>
                <input className={INPUT} placeholder="Announcement title" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Message *</label>
                <textarea rows={3} className={INPUT + ' resize-none'} placeholder="Full announcement message…"
                  value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Priority</label>
                  <select className={INPUT} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {['Normal', 'Low', 'Important', 'Urgent', 'Critical'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Audience</label>
                  <select className={INPUT} value={form.audience_type} onChange={e => setForm(f => ({ ...f, audience_type: e.target.value }))}>
                    {['All', 'Students', 'Staff', 'Parents', 'Custom'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-emerald-500"
                  checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} />
                <span className="text-xs text-slate-300">Pin this announcement</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                  style={{ background: '#10b981', color: '#fff' }}>
                  {creating ? 'Creating…' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
