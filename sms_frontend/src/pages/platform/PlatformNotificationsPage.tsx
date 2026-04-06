import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type MaintenanceWindow = {
  id: number
  title: string
  description: string
  starts_at: string | null
  ends_at: string | null
  status: string
  notify_tenants: boolean
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/15 text-blue-300',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-300',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300',
  CANCELLED: 'bg-white/10 text-slate-400',
}

const DEFAULT_FORM = {
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  notify_tenants: true,
}

export default function PlatformNotificationsPage() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await publicApiClient.get<MaintenanceWindow[] | { results: MaintenanceWindow[]; count: number }>(
        '/platform/maintenance/windows/',
      )
      setWindows(normalizePaginatedResponse(res.data).items)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load notifications.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setIsSaving(true)
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/maintenance/windows/', {
        title: form.title.trim(),
        description: form.description.trim(),
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        notify_tenants: form.notify_tenants,
      })
      setMessage('Maintenance window created and notifications dispatched to tenants.')
      setForm(DEFAULT_FORM)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create maintenance window.'))
    } finally {
      setIsSaving(false)
    }
  }

  const updateStatus = async (win: MaintenanceWindow, action: 'start' | 'complete' | 'cancel') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/maintenance/windows/${win.id}/${action}/`, {})
      setMessage(`Window "${win.title}" marked as ${action === 'start' ? 'in progress' : action}d.`)
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} window.`))
    }
  }

  const fmt = (dt: string | null) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="PLATFORM"
        badgeColor="amber"
        title="Notifications & Broadcast"
        subtitle="Schedule maintenance windows and broadcast platform-wide alerts to all tenants"
        icon="📢"
      />

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">✓ {message}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Schedule Maintenance / Broadcast'}
        </button>
      </div>

      {showForm && (
        <form className="rounded-2xl glass-panel p-6 space-y-4" onSubmit={create}>
          <h3 className="text-sm font-semibold text-slate-200">New Maintenance Window</h3>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Title (e.g. Scheduled Maintenance — 20 Mar 02:00 UTC)"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Description / message to tenants…"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Starts At (UTC)</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-white/10 bg-[#0d1623] px-3 py-2 text-sm text-slate-200"
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Ends At (UTC)</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-white/10 bg-[#0d1623] px-3 py-2 text-sm text-slate-200"
                value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-emerald-500"
              checked={form.notify_tenants}
              onChange={e => setForm(f => ({ ...f, notify_tenants: e.target.checked }))}
            />
            <span className="text-sm text-slate-300">Notify all active tenants via in-app + email</span>
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 transition-colors"
          >
            {isSaving ? 'Creating…' : 'Create & Notify Tenants'}
          </button>
        </form>
      )}

      <div className="rounded-2xl glass-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Maintenance Windows</h2>
          <button type="button" className="text-xs text-slate-400 hover:text-emerald-300" onClick={() => void load()}>Refresh</button>
        </div>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : windows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No maintenance windows yet. Create one above to notify tenants.</p>
        ) : (
          <div className="space-y-3">
            {windows.map(w => (
              <div key={w.id} className="rounded-xl border border-white/5 bg-white/[0.018] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[w.status] ?? 'bg-white/10 text-slate-400'}`}>
                        {w.status}
                      </span>
                      {w.notify_tenants && (
                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">Tenants Notified</span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-200">{w.title}</p>
                    {w.description && <p className="mt-1 text-xs text-slate-400">{w.description}</p>}
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      {fmt(w.starts_at)} → {fmt(w.ends_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {w.status === 'SCHEDULED' && (
                      <button
                        className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10"
                        onClick={() => void updateStatus(w, 'start')}
                      >Start</button>
                    )}
                    {w.status === 'IN_PROGRESS' && (
                      <button
                        className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => void updateStatus(w, 'complete')}
                      >Complete</button>
                    )}
                    {(w.status === 'SCHEDULED' || w.status === 'IN_PROGRESS') && (
                      <button
                        className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                        onClick={() => void updateStatus(w, 'cancel')}
                      >Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
