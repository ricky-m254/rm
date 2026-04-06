import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type LogRow = {
  id: number
  actor_username?: string
  tenant_name?: string
  action: string
  model_name: string
  object_id: string
  details: string
  path: string
  created_at: string
}

type Tenant = { id: number; name: string }

export default function PlatformActionLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    tenant_id: '',
    action: '',
    model_name: '',
    date_from: '',
    date_to: '',
  })

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    const [logResult, tenantResult] = await Promise.allSettled([
      publicApiClient.get<LogRow[] | { results: LogRow[]; count: number }>('/platform/action-logs/', {
        params: {
          tenant_id: filters.tenant_id || undefined,
          action: filters.action || undefined,
          model_name: filters.model_name || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        },
      }),
      publicApiClient.get<Tenant[] | { results: Tenant[]; count: number }>('/platform/tenants/'),
    ])
    if (logResult.status === 'fulfilled') setLogs(normalizePaginatedResponse(logResult.value.data).items)
    if (tenantResult.status === 'fulfilled') setTenants(normalizePaginatedResponse(tenantResult.value.data).items)
    const firstError = [logResult, tenantResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load platform action logs.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Action Logs"
        subtitle="Action Logs management and overview."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="grid gap-3 md:grid-cols-6">
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={filters.tenant_id} onChange={(e) => setFilters((p) => ({ ...p, tenant_id: e.target.value }))}>
            <option value="">All tenants</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Action" value={filters.action} onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Model name" value={filters.model_name} onChange={(e) => setFilters((p) => ({ ...p, model_name: e.target.value }))} />
          <input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} />
          <input type="date" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} />
          <button className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void loadData()}>Apply</button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">At</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Model</th><th className="px-3 py-2">Object</th><th className="px-3 py-2">Details</th><th className="px-3 py-2">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={8}>Loading logs...</td></tr> : null}
              {logs.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{row.created_at}</td><td className="px-3 py-2">{row.actor_username ?? '--'}</td><td className="px-3 py-2">{row.tenant_name ?? 'Platform'}</td><td className="px-3 py-2">{row.action}</td><td className="px-3 py-2">{row.model_name}</td><td className="px-3 py-2">{row.object_id}</td><td className="px-3 py-2">{row.details || '--'}</td><td className="px-3 py-2">{row.path || '--'}</td>
                </tr>
              ))}
              {!isLoading && logs.length === 0 ? <tr><td className="px-3 py-4 text-slate-400" colSpan={8}>No logs found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
