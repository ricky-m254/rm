import { useEffect, useState } from 'react'
import {
  Megaphone, Plus, Pin, PinOff, Trash2, CheckCheck,
  AlertTriangle, Info, Zap, Users, Globe, GraduationCap,
  Briefcase, ChevronDown, ChevronUp, Loader2, RefreshCw,
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

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray((value as { results?: T[] }).results) ? (value as { results: T[] }).results : []
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const PRIORITY_STYLES: Record<string, { badge: string; icon: React.ElementType }> = {
  Critical: { badge: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertTriangle },
  Urgent: { badge: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertTriangle },
  Important: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Zap },
  Normal: { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Info },
  Low: { badge: 'bg-slate-500/15 text-slate-400 border-slate-600', icon: Info },
}

const AUDIENCE_ICONS: Record<string, React.ElementType> = {
  All: Globe, Students: GraduationCap, Staff: Briefcase, Parents: Users, Custom: Users,
}

export default function CommunicationAnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    body: '',
    priority: 'Important',
    audience_type: 'All',
    notify_email: true,
    notify_sms: false,
    notify_push: true,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<Announcement[] | { results: Announcement[] }>('/communication/announcements/')
      setRows(asArray(res.data))
    } catch {
      setError('Unable to load announcements.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const create = async () => {
    if (!form.title.trim() || !form.body.trim()) { setError('Title and body are required.'); return }
    setCreating(true)
    setError(null)
    try {
      await apiClient.post('/communication/announcements/', form)
      setForm({ title: '', body: '', priority: 'Important', audience_type: 'All', notify_email: true, notify_sms: false, notify_push: true })
      setShowForm(false)
      setSuccess('Announcement published!')
      setTimeout(() => setSuccess(null), 3000)
      await load()
    } catch {
      setError('Unable to publish announcement.')
    } finally {
      setCreating(false)
    }
  }

  const markRead = async (id: number) => {
    try {
      await apiClient.post(`/communication/announcements/${id}/read/`)
    } catch { /* ok */ }
  }

  const pinToggle = async (ann: Announcement) => {
    try {
      await apiClient.patch(`/communication/announcements/${ann.id}/`, { is_pinned: !ann.is_pinned })
      setRows(prev => prev.map(r => r.id === ann.id ? { ...r, is_pinned: !r.is_pinned } : r))
    } catch { /* ok */ }
  }

  const doDelete = async (id: number) => {
    try {
      await apiClient.delete(`/communication/announcements/${id}/`)
      setRows(prev => prev.filter(r => r.id !== id))
      setSuccess('Announcement deleted.')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('Unable to delete announcement.')
    }
  }

  const pinned = rows.filter(r => r.is_pinned)
  const unpinned = rows.filter(r => !r.is_pinned)

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        badge="COMMUNICATION"
        badgeColor="rose"
        title="Announcements"
        subtitle="Broadcast messages to students, staff, and parents across the school."
        icon="📢"
        actions={
          <div className="flex gap-2">
            <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/[0.09] hover:bg-slate-700 transition">
              <RefreshCw size={13} className="text-slate-400" />
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400 transition"
            >
              <Plus size={15} /> New Announcement
            </button>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCheck size={14} className="flex-shrink-0" />{success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
          <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
            <Megaphone size={14} /> Create New Announcement
          </h2>
          <input
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Announcement title…"
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
            rows={4}
            placeholder="Write your announcement…"
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {['Critical', 'Urgent', 'Important', 'Normal', 'Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Audience</label>
              <select
                value={form.audience_type}
                onChange={(e) => setForm(f => ({ ...f, audience_type: e.target.value }))}
                className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {['All', 'Students', 'Staff', 'Parents', 'Custom'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex items-end gap-4 pb-0.5">
              {[
                { key: 'notify_email', label: 'Email' },
                { key: 'notify_sms', label: 'SMS' },
                { key: 'notify_push', label: 'Push' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="rounded border-slate-600 bg-slate-800 accent-emerald-500"
                  />
                  <span className="text-xs text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition">Cancel</button>
            <button onClick={create} disabled={creating} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-400 transition disabled:opacity-50">
              {creating ? <><Loader2 size={13} className="animate-spin" /> Publishing…</> : <><Megaphone size={13} /> Publish</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>
      ) : (
        <>
          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Pin size={10} /> Pinned Announcements
              </p>
              {pinned.map(ann => <AnnouncementCard key={ann.id} ann={ann} expanded={expanded} setExpanded={setExpanded} onPin={pinToggle} onDelete={doDelete} onRead={markRead} />)}
            </div>
          )}

          {/* All others */}
          {unpinned.length > 0 && (
            <div className="space-y-2">
              {pinned.length > 0 && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">All Announcements</p>}
              {unpinned.map(ann => <AnnouncementCard key={ann.id} ann={ann} expanded={expanded} setExpanded={setExpanded} onPin={pinToggle} onDelete={doDelete} onRead={markRead} />)}
            </div>
          )}

          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Megaphone size={40} className="text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No announcements yet</p>
              <p className="text-xs text-slate-600 mt-1">Create your first announcement to notify your school community.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AnnouncementCard({
  ann, expanded, setExpanded, onPin, onDelete, onRead,
}: {
  ann: Announcement
  expanded: number | null
  setExpanded: (id: number | null) => void
  onPin: (a: Announcement) => void
  onDelete: (id: number) => void
  onRead: (id: number) => void
}) {
  const pStyle = PRIORITY_STYLES[ann.priority] ?? PRIORITY_STYLES.Normal
  const PriorityIcon = pStyle.icon
  const AudienceIcon = AUDIENCE_ICONS[ann.audience_type] ?? Globe
  const isOpen = expanded === ann.id

  return (
    <div className={`rounded-2xl border glass-panel overflow-hidden transition-all ${ann.is_pinned ? 'border-amber-500/30' : 'border-white/[0.07]'}`}>
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition"
        onClick={() => setExpanded(isOpen ? null : ann.id)}
      >
        <div className={`flex-shrink-0 mt-0.5 rounded-lg p-1.5 border ${pStyle.badge}`}>
          <PriorityIcon size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{ann.title}</p>
            {ann.is_pinned && <Pin size={10} className="text-amber-400" />}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pStyle.badge}`}>{ann.priority}</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <AudienceIcon size={9} /> {ann.audience_type}
            </span>
            {ann.created_at && <span className="text-[10px] text-slate-600">{fmtDate(ann.created_at)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(ann) }}
            className="h-7 w-7 rounded-lg border border-white/[0.09] flex items-center justify-center hover:bg-slate-700 transition"
            title={ann.is_pinned ? 'Unpin' : 'Pin'}
          >
            {ann.is_pinned ? <PinOff size={11} className="text-amber-400" /> : <Pin size={11} className="text-slate-400" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRead(ann.id) }}
            className="h-7 w-7 rounded-lg border border-white/[0.09] flex items-center justify-center hover:bg-slate-700 transition"
            title="Mark read"
          >
            <CheckCheck size={11} className="text-slate-400" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(ann.id) }}
            className="h-7 w-7 rounded-lg border border-red-500/20 flex items-center justify-center hover:bg-red-500/10 transition"
            title="Delete"
          >
            <Trash2 size={11} className="text-red-400" />
          </button>
          {isOpen ? <ChevronUp size={13} className="text-slate-500 ml-1" /> : <ChevronDown size={13} className="text-slate-500 ml-1" />}
        </div>
      </div>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-white/[0.07] pt-3">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{ann.body}</p>
        </div>
      )}
    </div>
  )
}
