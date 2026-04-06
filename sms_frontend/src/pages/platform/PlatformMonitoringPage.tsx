import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type MonitoringSnapshot = {
  id: number
  metric_key: string
  tenant: number | null
  value: string | null
  payload: Record<string, unknown>
  captured_at: string
}

type MonitoringAlert = {
  id: number
  title: string
  metric_key: string
  tenant: number | null
  tenant_name?: string
  severity: string
  status: string
  details: string
  created_at: string
}

type Tenant = { id: number; name: string }
type AlertSummary = {
  open: number
  acknowledged: number
  resolved: number
  critical_open: number
  mttr_hours_30d: string
}

export default function PlatformMonitoringPage() {
  const [snapshots, setSnapshots] = useState<MonitoringSnapshot[]>([])
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [overview, setOverview] = useState<{ snapshot_metric_keys: string[]; open_alerts: number; critical_alerts: number } | null>(null)
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [snapshotForm, setSnapshotForm] = useState({ metric_key: '', tenant: '', value: '', payload: '{}' })
  const [alertForm, setAlertForm] = useState({ title: '', metric_key: '', tenant: '', severity: 'WARNING', details: '' })

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    const [snapshotResult, alertResult, tenantResult, overviewResult, summaryResult] = await Promise.allSettled([
      publicApiClient.get<MonitoringSnapshot[] | { results: MonitoringSnapshot[]; count: number }>('/platform/monitoring/snapshots/'),
      publicApiClient.get<MonitoringAlert[] | { results: MonitoringAlert[]; count: number }>('/platform/monitoring/alerts/'),
      publicApiClient.get<Tenant[] | { results: Tenant[]; count: number }>('/platform/tenants/'),
      publicApiClient.get('/platform/monitoring/snapshots/overview/'),
      publicApiClient.get<AlertSummary>('/platform/monitoring/alerts/summary/'),
    ])
    if (snapshotResult.status === 'fulfilled') setSnapshots(normalizePaginatedResponse(snapshotResult.value.data).items)
    if (alertResult.status === 'fulfilled') setAlerts(normalizePaginatedResponse(alertResult.value.data).items)
    if (tenantResult.status === 'fulfilled') setTenants(normalizePaginatedResponse(tenantResult.value.data).items)
    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value.data as { snapshot_metric_keys: string[]; open_alerts: number; critical_alerts: number })
    if (summaryResult.status === 'fulfilled') setAlertSummary(summaryResult.value.data)
    const firstError = [snapshotResult, alertResult, tenantResult, overviewResult, summaryResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load monitoring data.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const createSnapshot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/monitoring/snapshots/', {
        metric_key: snapshotForm.metric_key.trim(),
        tenant: snapshotForm.tenant ? Number(snapshotForm.tenant) : null,
        value: snapshotForm.value ? Number(snapshotForm.value) : null,
        payload: snapshotForm.payload ? JSON.parse(snapshotForm.payload) : {},
      })
      setSnapshotForm({ metric_key: '', tenant: '', value: '', payload: '{}' })
      setMessage('Snapshot created.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create monitoring snapshot.'))
    }
  }

  const createAlert = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/monitoring/alerts/', {
        title: alertForm.title.trim(),
        metric_key: alertForm.metric_key.trim(),
        tenant: alertForm.tenant ? Number(alertForm.tenant) : null,
        severity: alertForm.severity,
        details: alertForm.details.trim(),
      })
      setAlertForm({ title: '', metric_key: '', tenant: '', severity: 'WARNING', details: '' })
      setMessage('Alert created.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create monitoring alert.'))
    }
  }

  const alertAction = async (id: number, action: 'acknowledge' | 'resolve') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/monitoring/alerts/${id}/${action}/`, {})
      setMessage(`Alert ${action}d.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} alert.`))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Monitoring"
        subtitle="Monitoring management and overview."
        icon="📋"
      />
      {overview ? (
        <section className="col-span-12 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl glass-panel p-4 text-sm">Open alerts: {overview.open_alerts}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Critical open alerts: {overview.critical_alerts}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Metric keys tracked: {overview.snapshot_metric_keys.length}</div>
        </section>
      ) : null}
      {alertSummary ? (
        <section className="col-span-12 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl glass-panel p-4 text-sm">Open: {alertSummary.open}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Acknowledged: {alertSummary.acknowledged}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Resolved: {alertSummary.resolved}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">Critical open: {alertSummary.critical_open}</div>
          <div className="rounded-2xl glass-panel p-4 text-sm">MTTR 30d (hrs): {alertSummary.mttr_hours_30d}</div>
        </section>
      ) : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Create Snapshot</h2>
        <form className="mt-4 grid gap-3" onSubmit={createSnapshot}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Metric key" value={snapshotForm.metric_key} onChange={(e) => setSnapshotForm((p) => ({ ...p, metric_key: e.target.value }))} required />
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={snapshotForm.tenant} onChange={(e) => setSnapshotForm((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">Platform-wide</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Value (optional)" value={snapshotForm.value} onChange={(e) => setSnapshotForm((p) => ({ ...p, value: e.target.value }))} />
          <textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" rows={3} placeholder='Payload JSON e.g. {"p95": 120}' value={snapshotForm.payload} onChange={(e) => setSnapshotForm((p) => ({ ...p, payload: e.target.value }))} />
          <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Create Snapshot</button>
        </form>
      </section>
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Create Alert</h2>
        <form className="mt-4 grid gap-3" onSubmit={createAlert}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Alert title" value={alertForm.title} onChange={(e) => setAlertForm((p) => ({ ...p, title: e.target.value }))} required />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Metric key" value={alertForm.metric_key} onChange={(e) => setAlertForm((p) => ({ ...p, metric_key: e.target.value }))} />
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={alertForm.tenant} onChange={(e) => setAlertForm((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">Platform-wide</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={alertForm.severity} onChange={(e) => setAlertForm((p) => ({ ...p, severity: e.target.value }))}>
            {['INFO', 'WARNING', 'CRITICAL'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" rows={3} placeholder="Details" value={alertForm.details} onChange={(e) => setAlertForm((p) => ({ ...p, details: e.target.value }))} />
          <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Create Alert</button>
        </form>
      </section>
      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Recent Alerts</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={6}>Loading...</td></tr> : null}
              {alerts.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{row.title}</td><td className="px-3 py-2">{row.metric_key || '--'}</td><td className="px-3 py-2">{row.severity}</td><td className="px-3 py-2">{row.status}</td><td className="px-3 py-2">{row.tenant_name ?? 'Platform'}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void alertAction(row.id, 'acknowledge')}>Acknowledge</button>
                    <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void alertAction(row.id, 'resolve')}>Resolve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Recent Snapshots</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">Captured</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {snapshots.slice(0, 20).map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{row.metric_key}</td><td className="px-3 py-2">{row.value ?? '--'}</td><td className="px-3 py-2">{row.tenant ?? 'Platform'}</td><td className="px-3 py-2">{row.captured_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
