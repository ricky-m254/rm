import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type Tenant = { id: number; name: string }
type ImpersonationSession = {
  id: number
  tenant: number
  tenant_name?: string
  target_username: string
  status: string
  duration_minutes: number
  read_only: boolean
  requested_by_username?: string
  approved_by_username?: string
  created_at: string
}

export default function PlatformImpersonationPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [sessions, setSessions] = useState<ImpersonationSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [authDump, setAuthDump] = useState<string | null>(null)
  const [form, setForm] = useState({
    tenant: '',
    target_username: '',
    reason: '',
    duration_minutes: '60',
    read_only: true,
  })

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    const [tenantResult, sessionResult] = await Promise.allSettled([
      publicApiClient.get<Tenant[] | { results: Tenant[]; count: number }>('/platform/tenants/'),
      publicApiClient.get<ImpersonationSession[] | { results: ImpersonationSession[]; count: number }>(
        '/platform/impersonation-sessions/',
      ),
    ])
    if (tenantResult.status === 'fulfilled') setTenants(normalizePaginatedResponse(tenantResult.value.data).items)
    if (sessionResult.status === 'fulfilled') setSessions(normalizePaginatedResponse(sessionResult.value.data).items)
    const firstError = [tenantResult, sessionResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load impersonation sessions.'))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const selected = sessions.find((item) => item.id === selectedId) ?? null

  const createSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/impersonation-sessions/', {
        tenant: Number(form.tenant),
        target_username: form.target_username.trim(),
        reason: form.reason.trim(),
        duration_minutes: Number(form.duration_minutes),
        read_only: form.read_only,
      })
      setMessage('Impersonation session requested.')
      setForm({ tenant: '', target_username: '', reason: '', duration_minutes: '60', read_only: true })
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create impersonation session.'))
    }
  }

  const actionSession = async (id: number, action: 'approve' | 'end') => {
    setError(null)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/impersonation-sessions/${id}/${action}/`, {
        approval_notes: action === 'approve' ? 'Approved from platform UI' : undefined,
      })
      setMessage(`Session ${action}d.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} session.`))
    }
  }

  const startSession = async (id: number) => {
    setError(null)
    setMessage(null)
    try {
      const response = await publicApiClient.post(`/platform/impersonation-sessions/${id}/start/`, {})
      setMessage('Impersonation session started. Auth payload generated.')
      setAuthDump(JSON.stringify(response.data, null, 2))
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to start impersonation session.'))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Impersonation Sessions"
        subtitle="Impersonation Sessions management and overview."
        icon="📋"
      />
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Request Session</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={createSession}>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={form.tenant} onChange={(e) => setForm((p) => ({ ...p, tenant: e.target.value }))} required>
            <option value="">Select tenant</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Target username" value={form.target_username} onChange={(e) => setForm((p) => ({ ...p, target_username: e.target.value }))} required />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Duration minutes" type="number" min={1} max={240} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={String(form.read_only)} onChange={(e) => setForm((p) => ({ ...p, read_only: e.target.value === 'true' }))}>
            <option value="true">Read-only</option>
            <option value="false">Read/Write</option>
          </select>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
          <button type="submit" className="md:col-span-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Request Session</button>
        </form>
      </section>
      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Duration</th><th className="px-3 py-2">Requested By</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={6}>Loading...</td></tr> : null}
              {sessions.map((row) => (
                <tr key={row.id} className={`bg-slate-950/50 ${selectedId === row.id ? 'ring-1 ring-emerald-500/50' : ''}`}>
                  <td className="px-3 py-2">{row.tenant_name ?? row.tenant}</td><td className="px-3 py-2">{row.target_username}</td><td className="px-3 py-2">{row.status}</td><td className="px-3 py-2">{row.duration_minutes}</td><td className="px-3 py-2">{row.requested_by_username ?? '--'}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setSelectedId(row.id)}>Select</button>
                    <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void actionSession(row.id, 'approve')}>Approve</button>
                    <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void startSession(row.id)}>Start</button>
                    <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => void actionSession(row.id, 'end')}>End</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selected && authDump ? (
        <section className="col-span-12 rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-semibold">Start Payload (Session #{selected.id})</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 text-xs text-slate-300">{authDump}</pre>
        </section>
      ) : null}
    </div>
  )
}
