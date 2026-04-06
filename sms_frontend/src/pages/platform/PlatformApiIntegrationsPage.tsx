import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { normalizePaginatedResponse } from '../../api/pagination'
import { publicApiClient } from '../../api/publicClient'
import PageHero from '../../components/PageHero'
import { extractApiErrorMessage } from '../../utils/forms'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Tenant = {
  id: number
  name: string
  schema_name: string
  status: string
}

type ApiKey = {
  id: number
  tenant: number
  tenant_name: string
  label: string
  key: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
  revoked_at: string | null
}

type Integration = {
  id: number
  code: string
  name: string
  category: string
  status: 'connected' | 'disconnected' | 'error'
  description: string
  configured: boolean
  setting_key: string
  updated_at: string | null
}

const STATUS_COLOR: Record<Integration['status'], string> = {
  connected: 'bg-emerald-500/15 text-emerald-300',
  disconnected: 'bg-white/10 text-slate-400',
  error: 'bg-red-500/15 text-red-400',
}

const INTEGRATION_ICONS: Record<string, string> = {
  stripe: '💳',
  africas_talking: '📱',
  google_workspace: '🔵',
  zoom: '🎥',
  mpesa: '📲',
  sendgrid: '📧',
}

export default function PlatformApiIntegrationsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tenant: '', label: '' })

  const activeTenants = useMemo(
    () => tenants.filter((tenant) => tenant.status === 'ACTIVE' || tenant.status === 'TRIAL'),
    [tenants],
  )

  const load = async () => {
    setIsLoading(true)
    setError(null)
    const [keyResult, integrationResult, tenantResult] = await Promise.allSettled([
      publicApiClient.get<ApiKey[] | { results: ApiKey[]; count: number }>('/platform/api-keys/'),
      publicApiClient.get<Integration[]>('/platform/integrations/'),
      publicApiClient.get<Tenant[] | { results: Tenant[]; count: number }>('/platform/tenants/'),
    ])

    if (keyResult.status === 'fulfilled') {
      setKeys(normalizePaginatedResponse<ApiKey>(keyResult.value.data).items)
    } else {
      setKeys([])
      setError(extractApiErrorMessage(keyResult.reason, 'Unable to load platform API keys.'))
    }

    if (integrationResult.status === 'fulfilled') {
      const items = Array.isArray(integrationResult.value.data)
        ? integrationResult.value.data
        : normalizePaginatedResponse<Integration>(integrationResult.value.data).items
      setIntegrations(items)
    } else if (!error) {
      setIntegrations([])
      setError(extractApiErrorMessage(integrationResult.reason, 'Unable to load platform integrations.'))
    }

    if (tenantResult.status === 'fulfilled') {
      setTenants(normalizePaginatedResponse<Tenant>(tenantResult.value.data).items)
    } else if (!error) {
      setTenants([])
      setError(extractApiErrorMessage(tenantResult.reason, 'Unable to load tenants.'))
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!form.tenant && activeTenants.length > 0) {
      setForm((prev) => ({ ...prev, tenant: String(activeTenants[0].id) }))
    }
  }, [activeTenants, form.tenant])

  const revoke = async (id: number) => {
    setError(null)
    setMessage(null)
    setGeneratedKey(null)
    try {
      await publicApiClient.post(`/platform/api-keys/${id}/revoke/`, {})
      setMessage('API key revoked.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to revoke API key.'))
    }
  }

  const generate = async () => {
    if (!form.label.trim() || !form.tenant) {
      setError('Choose a tenant and provide a key label before generating a key.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    setGeneratedKey(null)
    try {
      const response = await publicApiClient.post<ApiKey & { raw_key?: string }>('/platform/api-keys/', {
        tenant: Number(form.tenant),
        label: form.label.trim(),
      })
      const tenantName = activeTenants.find((item) => String(item.id) === form.tenant)?.name ?? 'tenant'
      setMessage(`New API key generated for ${tenantName}. Copy it now; the full key is only shown once.`)
      setGeneratedKey(response.data.raw_key ?? null)
      setForm((prev) => ({ ...prev, label: '' }))
      setShowForm(false)
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to generate API key.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero title="API & Integration Management" subtitle="Manage live platform API keys and review third-party integration status" />

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
          {generatedKey ? (
            <div className="mt-3 rounded-lg border border-emerald-400/20 bg-slate-950/60 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-[0.24em] text-emerald-300/80">Generated Key</p>
              <code className="block break-all text-xs text-slate-100">{generatedKey}</code>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Active Integrations</h2>
            <p className="mt-1 text-xs text-slate-500">Statuses are derived from server-side platform settings, not local mocks.</p>
          </div>
          <Link
            to="/platform/settings"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
          >
            Open Platform Settings
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.018] p-4">
              <span className="text-2xl">{INTEGRATION_ICONS[integration.code] ?? '🔌'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-200">{integration.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[integration.status]}`}>
                    {integration.status}
                  </span>
                </div>
                <p className="mb-0.5 text-[10px] text-slate-500">{integration.category}</p>
                <p className="text-xs text-slate-400">{integration.description}</p>
                <p className="mt-2 text-[10px] text-slate-500">
                  {integration.configured ? `Setting: ${integration.setting_key}` : 'No saved platform setting yet'}
                </p>
                <p className="mt-1 text-[10px] text-slate-600">
                  {integration.updated_at ? `Updated ${new Date(integration.updated_at).toLocaleString()}` : 'Not configured'}
                </p>
              </div>
            </div>
          ))}
          {!isLoading && integrations.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.018] p-4 text-sm text-slate-400">
              No integrations available.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={GLASS}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Tenant API Keys</h2>
            <p className="mt-1 text-xs text-slate-500">Generate and revoke real platform keys for tenant-scoped integrations.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void load()}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowForm((value) => !value)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Generate Key'}
            </button>
          </div>
        </div>

        {showForm ? (
          <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <select
              className="rounded-xl border border-white/10 bg-[#0d1623] px-3 py-2 text-sm text-slate-200"
              value={form.tenant}
              onChange={(event) => setForm((prev) => ({ ...prev, tenant: event.target.value }))}
            >
              <option value="">Select tenant</option>
              {activeTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <input
              className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Key label (e.g. Production Webhook)"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            />
            <button
              onClick={() => void generate()}
              disabled={isSubmitting || activeTenants.length === 0}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Generating…' : 'Generate'}
            </button>
          </div>
        ) : null}

        <div className="space-y-2">
          {keys.map((keyRow) => (
            <div
              key={keyRow.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-opacity ${
                keyRow.is_active ? 'border-white/5 bg-white/[0.018]' : 'border-white/5 bg-white/[0.008] opacity-50'
              }`}
            >
              <div>
                <p className="font-medium text-slate-200">
                  {keyRow.label} <span className="text-xs text-slate-500">— {keyRow.tenant_name}</span>
                </p>
                <code className="font-mono text-xs text-slate-400">{keyRow.key}</code>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Created: {new Date(keyRow.created_at).toLocaleDateString()}</span>
                <span>Last used: {keyRow.last_used_at ? new Date(keyRow.last_used_at).toLocaleString() : 'never'}</span>
                {keyRow.is_active ? (
                  <button
                    onClick={() => void revoke(keyRow.id)}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-500">Revoked</span>
                )}
              </div>
            </div>
          ))}
          {!isLoading && keys.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.018] p-4 text-sm text-slate-400">
              No platform API keys have been generated yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
