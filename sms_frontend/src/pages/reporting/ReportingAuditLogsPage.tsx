import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type AuditLog = {
  id: number
  timestamp: string
  action: string
  model_name: string
  object_id: string
  user_id: number | null
  details?: string | null
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  return Array.isArray(value) ? value : (value.results ?? [])
}

function formatTimestamp(value: string): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ReportingAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All actions')
  const [modelFilter, setModelFilter] = useState('All models')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<AuditLog[] | { results?: AuditLog[] }>('/reporting/audit-logs/')
      setLogs(asArray(response.data))
    } catch {
      setError('Unable to load audit logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const actionOptions = useMemo(
    () => ['All actions', ...Array.from(new Set(logs.map((log) => log.action))).sort()],
    [logs],
  )
  const modelOptions = useMemo(
    () => ['All models', ...Array.from(new Set(logs.map((log) => log.model_name))).sort()],
    [logs],
  )

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return logs.filter((log) => {
      const matchesSearch =
        !query ||
        log.action.toLowerCase().includes(query) ||
        log.model_name.toLowerCase().includes(query) ||
        log.object_id.toLowerCase().includes(query) ||
        String(log.user_id ?? '').includes(query) ||
        (log.details ?? '').toLowerCase().includes(query)
      const matchesAction = actionFilter === 'All actions' || log.action === actionFilter
      const matchesModel = modelFilter === 'All models' || log.model_name === modelFilter
      return matchesSearch && matchesAction && matchesModel
    })
  }, [actionFilter, logs, modelFilter, search])

  const latestTimestamp = logs[0]?.timestamp ? formatTimestamp(logs[0].timestamp) : '-'

  return (
    <div className="space-y-6">
      <PageHero
        badge="REPORTING"
        badgeColor="blue"
        title="Audit Logs"
        subtitle="Read-only audit-trail reporting for institution activity. Finance statements remain under the Finance module."
        icon={ShieldCheck}
        stats={[
          { label: 'Loaded Entries', value: logs.length },
          { label: 'Visible Entries', value: filteredLogs.length },
          { label: 'Latest Event', value: latestTimestamp, color: '#bfdbfe' },
        ]}
        actions={(
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.12]"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        )}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl glass-panel p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Audit Trail Explorer</h2>
            <p className="mt-1 text-xs text-slate-400">
              This reporting surface is intentionally narrow: it exposes the canonical audit-log contract and avoids pretending to be a full cross-module reporting product.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search action, model, object, user, details"
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950/70 py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none sm:w-72"
              />
            </label>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
            >
              {actionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={modelFilter}
              onChange={(event) => setModelFilter(event.target.value)}
              className="rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
            >
              {modelOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.25em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Object</th>
                <th className="px-4 py-3 text-left">User ID</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Loading audit logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No audit logs matched the current filters.</td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="bg-slate-950/40 hover:bg-white/[0.025]">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-300">{formatTimestamp(log.timestamp)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-sky-300">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-slate-200">{log.model_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{log.object_id}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{log.user_id ?? 'System'}</td>
                  <td className="max-w-xl px-4 py-3 text-xs text-slate-400">
                    <span className="line-clamp-2">{log.details || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
