import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type MaintenanceWindow = {
  id: number
  title: string
  starts_at: string
  ends_at: string
  status: string
  notify_tenants: boolean
}

type DeploymentRelease = {
  id: number
  version: string
  environment: string
  status: string
  notes: string
  health_summary?: { status?: string; checked_at?: string; [key: string]: unknown }
  created_at: string
}

type DeploymentHookRun = {
  id: number
  hook_type: string
  status: string
  response_status: number | null
  error: string
  executed_at: string
}

type FeatureFlag = {
  id: number
  key: string
  description: string
  is_enabled: boolean
  rollout_percent: number
}

export default function PlatformDeploymentPage() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([])
  const [releases, setReleases] = useState<DeploymentRelease[]>([])
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [windowForm, setWindowForm] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
    notify_tenants: true,
  })
  const [releaseForm, setReleaseForm] = useState({ version: '', environment: 'production', notes: '' })
  const [flagForm, setFlagForm] = useState({ key: '', description: '', rollout_percent: '100' })
  const [allowStartWithoutMaintenance, setAllowStartWithoutMaintenance] = useState(false)
  const [forceWindowComplete, setForceWindowComplete] = useState(false)
  const [releaseHealthStatus, setReleaseHealthStatus] = useState<'healthy' | 'degraded' | 'failed'>('healthy')
  const [forceReleaseComplete, setForceReleaseComplete] = useState(false)
  const [hookRunsByRelease, setHookRunsByRelease] = useState<Record<number, DeploymentHookRun[]>>({})
  const [flagEval, setFlagEval] = useState({ key: '', tenant_id: '', actor_id: '', result: '' })

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    const [windowResult, releaseResult, flagResult] = await Promise.allSettled([
      publicApiClient.get('/platform/maintenance/windows/'),
      publicApiClient.get('/platform/deployment/releases/'),
      publicApiClient.get('/platform/deployment/feature-flags/'),
    ])
    if (windowResult.status === 'fulfilled') setWindows(normalizePaginatedResponse<MaintenanceWindow>(windowResult.value.data).items)
    if (releaseResult.status === 'fulfilled') setReleases(normalizePaginatedResponse<DeploymentRelease>(releaseResult.value.data).items)
    if (flagResult.status === 'fulfilled') setFlags(normalizePaginatedResponse<FeatureFlag>(flagResult.value.data).items)
    const firstError = [windowResult, releaseResult, flagResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load deployment workspace.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const createWindow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/maintenance/windows/', {
        title: windowForm.title.trim(),
        description: windowForm.description.trim(),
        starts_at: windowForm.starts_at,
        ends_at: windowForm.ends_at,
        notify_tenants: windowForm.notify_tenants,
      })
      setWindowForm({ title: '', description: '', starts_at: '', ends_at: '', notify_tenants: true })
      setMessage('Maintenance window created.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create maintenance window.'))
    }
  }

  const windowAction = async (id: number, action: 'start' | 'complete' | 'cancel') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/maintenance/windows/${id}/${action}/`, {
        force: action === 'complete' ? forceWindowComplete : undefined,
      })
      setMessage(`Maintenance window ${action}ed.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} maintenance window.`))
    }
  }

  const createRelease = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/deployment/releases/', {
        version: releaseForm.version.trim(),
        environment: releaseForm.environment.trim(),
        notes: releaseForm.notes.trim(),
      })
      setReleaseForm({ version: '', environment: 'production', notes: '' })
      setMessage('Release created.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create release.'))
    }
  }

  const releaseAction = async (id: number, action: 'start' | 'complete' | 'fail' | 'rollback') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/deployment/releases/${id}/${action}/`, {
        allow_without_maintenance: action === 'start' ? allowStartWithoutMaintenance : undefined,
        force: action === 'complete' ? forceReleaseComplete : undefined,
        health_summary: action === 'complete' ? { status: releaseHealthStatus } : undefined,
        notes: action === 'fail' ? 'Failed from platform UI.' : undefined,
      })
      setMessage(`Release ${action} action completed.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} release.`))
    }
  }

  const triggerPipeline = async (id: number) => {
    setError(null)
    setMessage(null)
    try {
      const response = await publicApiClient.post(`/platform/deployment/releases/${id}/trigger-pipeline/`, {})
      setMessage(`Pipeline trigger response: ${response.data.status}`)
      await loadHookRuns(id)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to trigger pipeline.'))
    }
  }

  const runHealthChecks = async (id: number) => {
    setError(null)
    setMessage(null)
    try {
      const response = await publicApiClient.post(`/platform/deployment/releases/${id}/run-health-checks/`, {})
      setMessage(`Health checks: ${response.data.status}`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to run release health checks.'))
    }
  }

  const loadHookRuns = async (id: number) => {
    setError(null)
    try {
      const response = await publicApiClient.get<DeploymentHookRun[]>(`/platform/deployment/releases/${id}/hook-runs/`)
      setHookRunsByRelease((prev) => ({ ...prev, [id]: response.data }))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load release hook runs.'))
    }
  }

  const evaluateFlag = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('key', flagEval.key.trim())
      if (flagEval.tenant_id.trim()) params.set('tenant_id', flagEval.tenant_id.trim())
      if (flagEval.actor_id.trim()) params.set('actor_id', flagEval.actor_id.trim())
      const response = await publicApiClient.get(`/platform/deployment/feature-flags/evaluate/?${params.toString()}`)
      setFlagEval((prev) => ({ ...prev, result: JSON.stringify(response.data) }))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to evaluate feature flag.'))
    }
  }

  const createFlag = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/deployment/feature-flags/', {
        key: flagForm.key.trim(),
        description: flagForm.description.trim(),
        rollout_percent: Number(flagForm.rollout_percent || '100'),
      })
      setFlagForm({ key: '', description: '', rollout_percent: '100' })
      setMessage('Feature flag created.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create feature flag.'))
    }
  }

  const toggleFlag = async (id: number) => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/deployment/feature-flags/${id}/toggle/`, {})
      setMessage('Feature flag toggled.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to toggle feature flag.'))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Deployment & Maintenance"
        subtitle="Deployment & Maintenance management and overview."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Maintenance Windows</h2>
        <div className="mt-3 rounded-lg border border-white/[0.07] bg-slate-950/60 p-3 text-xs text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={forceWindowComplete} onChange={(e) => setForceWindowComplete(e.target.checked)} />
            Force early completion when using Complete
          </label>
        </div>
        <form className="mt-4 grid gap-3" onSubmit={createWindow}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Title" value={windowForm.title} onChange={(e) => setWindowForm((p) => ({ ...p, title: e.target.value }))} required />
          <textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" rows={2} placeholder="Description" value={windowForm.description} onChange={(e) => setWindowForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="datetime-local" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={windowForm.starts_at} onChange={(e) => setWindowForm((p) => ({ ...p, starts_at: e.target.value }))} required />
            <input type="datetime-local" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={windowForm.ends_at} onChange={(e) => setWindowForm((p) => ({ ...p, ends_at: e.target.value }))} required />
          </div>
          <label className="text-sm text-slate-300"><input type="checkbox" className="mr-2" checked={windowForm.notify_tenants} onChange={(e) => setWindowForm((p) => ({ ...p, notify_tenants: e.target.checked }))} />Notify tenants</label>
          <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Schedule Window</button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {windows.slice(0, 10).map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="font-semibold">{row.title}</p>
              <p className="text-xs text-slate-400">{row.starts_at} - {row.ends_at}</p>
              <p className="text-xs text-slate-300">Status: {row.status}</p>
              <div className="mt-2 space-x-2">
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void windowAction(row.id, 'start')}>Start</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void windowAction(row.id, 'complete')}>Complete</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void windowAction(row.id, 'cancel')}>Cancel</button>
              </div>
            </div>
          ))}
          {isLoading ? <p className="text-slate-400">Loading windows...</p> : null}
        </div>
      </section>
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Releases & Feature Flags</h2>
        <div className="mt-3 grid gap-3 rounded-lg border border-white/[0.07] bg-slate-950/60 p-3 text-xs text-slate-300 sm:grid-cols-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allowStartWithoutMaintenance} onChange={(e) => setAllowStartWithoutMaintenance(e.target.checked)} />
            Allow start without maintenance window
          </label>
          <label className="inline-flex items-center gap-2">
            Completion health status
            <select className="rounded border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs" value={releaseHealthStatus} onChange={(e) => setReleaseHealthStatus(e.target.value as 'healthy' | 'degraded' | 'failed')}>
              <option value="healthy">healthy</option>
              <option value="degraded">degraded</option>
              <option value="failed">failed</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={forceReleaseComplete} onChange={(e) => setForceReleaseComplete(e.target.checked)} />
            Force complete despite alerts/health guard
          </label>
        </div>
        <form className="mt-4 grid gap-3" onSubmit={createRelease}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Version (e.g. v1.2.0)" value={releaseForm.version} onChange={(e) => setReleaseForm((p) => ({ ...p, version: e.target.value }))} required />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Environment" value={releaseForm.environment} onChange={(e) => setReleaseForm((p) => ({ ...p, environment: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Notes" value={releaseForm.notes} onChange={(e) => setReleaseForm((p) => ({ ...p, notes: e.target.value }))} />
          <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Create Release</button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {releases.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="font-semibold">{row.version} ({row.environment})</p>
              <p className="text-xs text-slate-300">Status: {row.status}</p>
              <div className="mt-2 space-x-2">
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void releaseAction(row.id, 'start')}>Start</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void releaseAction(row.id, 'complete')}>Complete</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void releaseAction(row.id, 'fail')}>Fail</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void releaseAction(row.id, 'rollback')}>Rollback</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void triggerPipeline(row.id)}>Trigger Pipeline</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void runHealthChecks(row.id)}>Run Health Checks</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void loadHookRuns(row.id)}>Hook Runs</button>
              </div>
              {row.health_summary?.status ? (
                <p className="mt-2 text-xs text-slate-400">
                  Health: {row.health_summary.status} {row.health_summary.checked_at ? `@ ${row.health_summary.checked_at}` : ''}
                </p>
              ) : null}
              {(hookRunsByRelease[row.id] ?? []).length > 0 ? (
                <div className="mt-2 rounded border border-white/[0.07] p-2 text-xs text-slate-300">
                  {(hookRunsByRelease[row.id] ?? []).slice(0, 4).map((run) => (
                    <p key={run.id}>
                      {run.hook_type}: {run.status} {run.response_status ? `(${run.response_status})` : ''} {run.error ? `- ${run.error}` : ''}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <form className="mt-6 grid gap-3" onSubmit={createFlag}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Flag key" value={flagForm.key} onChange={(e) => setFlagForm((p) => ({ ...p, key: e.target.value }))} required />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Description" value={flagForm.description} onChange={(e) => setFlagForm((p) => ({ ...p, description: e.target.value }))} />
          <input type="number" min={0} max={100} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Rollout %" value={flagForm.rollout_percent} onChange={(e) => setFlagForm((p) => ({ ...p, rollout_percent: e.target.value }))} />
          <button type="submit" className="rounded-lg border border-white/[0.09] px-4 py-2 text-sm">Create Flag</button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {flags.slice(0, 10).map((flag) => (
            <div key={flag.id} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
              <div><p className="font-semibold">{flag.key}</p><p className="text-xs text-slate-400">{flag.description || '--'} | rollout {flag.rollout_percent}%</p></div>
              <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void toggleFlag(flag.id)}>{flag.is_enabled ? 'Disable' : 'Enable'}</button>
            </div>
          ))}
        </div>
        <form className="mt-4 grid gap-2 rounded-lg border border-white/[0.07] bg-slate-950/60 p-3" onSubmit={evaluateFlag}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Runtime Flag Evaluation</p>
          <input className="rounded border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs" placeholder="flag key" value={flagEval.key} onChange={(e) => setFlagEval((p) => ({ ...p, key: e.target.value }))} required />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs" placeholder="tenant_id (optional)" value={flagEval.tenant_id} onChange={(e) => setFlagEval((p) => ({ ...p, tenant_id: e.target.value }))} />
            <input className="rounded border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs" placeholder="actor_id (optional)" value={flagEval.actor_id} onChange={(e) => setFlagEval((p) => ({ ...p, actor_id: e.target.value }))} />
          </div>
          <button type="submit" className="rounded border border-white/[0.09] px-3 py-1 text-xs">Evaluate Flag</button>
          {flagEval.result ? <pre className="overflow-x-auto rounded border border-white/[0.07] p-2 text-[11px] text-slate-300">{flagEval.result}</pre> : null}
        </form>
      </section>
    </div>
  )
}
