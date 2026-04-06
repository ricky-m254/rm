import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type Tenant = { id: number; name: string }
type BackupJob = {
  id: number
  scope: string
  tenant: number | null
  tenant_name?: string
  backup_type: string
  status: string
  storage_path: string
  size_bytes: number
  created_at: string
}

type BackupExecution = {
  id: number
  engine_mode: string
  status: string
  output_path: string
  checksum: string
  size_bytes: number
  started_at: string
}
type RestoreJob = {
  id: number
  backup: number
  tenant: number | null
  tenant_name?: string
  status: string
  notes: string
  created_at: string
}

export default function PlatformBackupRecoveryPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [backups, setBackups] = useState<BackupJob[]>([])
  const [restores, setRestores] = useState<RestoreJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [backupForm, setBackupForm] = useState({ scope: 'PLATFORM', tenant: '', backup_type: 'FULL', retention_days: '30' })
  const [restoreForm, setRestoreForm] = useState({ backup: '', tenant: '', notes: '' })
  const [executionsByBackup, setExecutionsByBackup] = useState<Record<number, BackupExecution[]>>({})

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    const [tenantResult, backupResult, restoreResult] = await Promise.allSettled([
      publicApiClient.get('/platform/tenants/'),
      publicApiClient.get('/platform/backup/jobs/'),
      publicApiClient.get('/platform/backup/restores/'),
    ])
    if (tenantResult.status === 'fulfilled') setTenants(normalizePaginatedResponse<Tenant>(tenantResult.value.data).items)
    if (backupResult.status === 'fulfilled') setBackups(normalizePaginatedResponse<BackupJob>(backupResult.value.data).items)
    if (restoreResult.status === 'fulfilled') setRestores(normalizePaginatedResponse<RestoreJob>(restoreResult.value.data).items)
    const firstError = [tenantResult, backupResult, restoreResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load backup/recovery workspace.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const createBackup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/backup/jobs/', {
        scope: backupForm.scope,
        tenant: backupForm.scope === 'TENANT' && backupForm.tenant ? Number(backupForm.tenant) : null,
        backup_type: backupForm.backup_type,
        retention_days: Number(backupForm.retention_days || '30'),
      })
      setMessage('Backup job queued.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to queue backup job.'))
    }
  }

  const backupAction = async (id: number, action: 'start' | 'complete' | 'fail') => {
    setError(null)
    setMessage(null)
    try {
      const payload =
        action === 'complete'
          ? {
              storage_path: `s3://sms-backups/job-${id}.tar.gz`,
              checksum: `sha256-job-${id}`,
              size_bytes: 12345678,
            }
          : action === 'fail'
            ? { error: 'Backup process failed from UI simulation.' }
            : {}
      await publicApiClient.post(`/platform/backup/jobs/${id}/${action}/`, payload)
      setMessage(`Backup ${action} action completed.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} backup job.`))
    }
  }

  const executeBackupEngine = async (id: number) => {
    setError(null)
    setMessage(null)
    try {
      const response = await publicApiClient.post(`/platform/backup/jobs/${id}/execute-engine/`, {})
      setMessage(`Backup engine execution: ${response.data.execution.status}`)
      await loadBackupExecutions(id)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to execute backup engine.'))
    }
  }

  const loadBackupExecutions = async (id: number) => {
    setError(null)
    try {
      const response = await publicApiClient.get<BackupExecution[]>(`/platform/backup/jobs/${id}/executions/`)
      setExecutionsByBackup((prev) => ({ ...prev, [id]: response.data }))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load backup executions.'))
    }
  }

  const createRestore = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/backup/restores/', {
        backup: Number(restoreForm.backup),
        tenant: restoreForm.tenant ? Number(restoreForm.tenant) : null,
        notes: restoreForm.notes.trim(),
      })
      setMessage('Restore job requested.')
      setRestoreForm({ backup: '', tenant: '', notes: '' })
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to request restore job.'))
    }
  }

  const restoreAction = async (id: number, action: 'approve' | 'start' | 'complete' | 'fail' | 'execute') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/backup/restores/${id}/${action}/`, {
        notes: action === 'fail' ? 'Restore failed in platform UI test.' : undefined,
      })
      setMessage(`Restore ${action} action completed.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} restore job.`))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Backup & Recovery"
        subtitle="Backup & Recovery management and overview."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Backup Jobs</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createBackup}>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={backupForm.scope} onChange={(e) => setBackupForm((p) => ({ ...p, scope: e.target.value }))}>
            <option value="PLATFORM">Platform</option>
            <option value="TENANT">Tenant</option>
          </select>
          <select disabled={backupForm.scope !== 'TENANT'} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={backupForm.tenant} onChange={(e) => setBackupForm((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">Tenant (optional)</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={backupForm.backup_type} onChange={(e) => setBackupForm((p) => ({ ...p, backup_type: e.target.value }))}>
            <option value="FULL">Full</option>
            <option value="INCREMENTAL">Incremental</option>
          </select>
          <input type="number" min={1} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Retention days" value={backupForm.retention_days} onChange={(e) => setBackupForm((p) => ({ ...p, retention_days: e.target.value }))} />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Queue Backup</button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {backups.slice(0, 12).map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="font-semibold">#{row.id} {row.scope} {row.backup_type} ({row.status})</p>
              <p className="text-xs text-slate-400">Tenant: {row.tenant_name ?? 'Platform'} | Size: {row.size_bytes || 0}</p>
              <div className="mt-2 space-x-2">
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void backupAction(row.id, 'start')}>Start</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void backupAction(row.id, 'complete')}>Complete</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void backupAction(row.id, 'fail')}>Fail</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void executeBackupEngine(row.id)}>Execute Engine</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void loadBackupExecutions(row.id)}>Executions</button>
              </div>
              {(executionsByBackup[row.id] ?? []).length > 0 ? (
                <div className="mt-2 rounded border border-white/[0.07] p-2 text-xs text-slate-300">
                  {(executionsByBackup[row.id] ?? []).slice(0, 4).map((run) => (
                    <p key={run.id}>
                      {run.engine_mode}: {run.status} | {run.size_bytes} bytes
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {isLoading ? <p className="text-slate-400">Loading backups...</p> : null}
        </div>
      </section>
      <section className="col-span-12 lg:col-span-6 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Restore Jobs</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createRestore}>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={restoreForm.backup} onChange={(e) => setRestoreForm((p) => ({ ...p, backup: e.target.value }))} required>
            <option value="">Select backup job</option>
            {backups.map((item) => <option key={item.id} value={item.id}>#{item.id} {item.scope} {item.backup_type} ({item.status})</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={restoreForm.tenant} onChange={(e) => setRestoreForm((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">Tenant (optional)</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input className="sm:col-span-2 rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Notes" value={restoreForm.notes} onChange={(e) => setRestoreForm((p) => ({ ...p, notes: e.target.value }))} />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Request Restore</button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {restores.slice(0, 12).map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="font-semibold">Restore #{row.id} (backup #{row.backup})</p>
              <p className="text-xs text-slate-400">Tenant: {row.tenant_name ?? 'Platform'} | Status: {row.status}</p>
              <div className="mt-2 space-x-2">
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void restoreAction(row.id, 'approve')}>Approve</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void restoreAction(row.id, 'start')}>Start</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void restoreAction(row.id, 'complete')}>Complete</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void restoreAction(row.id, 'fail')}>Fail</button>
                <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void restoreAction(row.id, 'execute')}>Execute</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
