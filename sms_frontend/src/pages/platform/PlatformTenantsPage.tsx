import { useEffect, useMemo, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type Plan = {
  id: number
  code: string
  name: string
  description: string
  monthly_price: string
  annual_price: string
  max_students: number
  max_storage_gb: number
}

type Tenant = {
  id: number
  name: string
  schema_name: string
  subdomain: string | null
  contact_name: string
  contact_email: string
  contact_phone: string
  status: string
  subscription_plan: number | null
  max_students: number
  max_storage_gb: number
  created_at: string
}

type ConfirmAction =
  | { kind: 'none' }
  | { kind: 'status'; tenant: Tenant; action: 'activate' | 'suspend' | 'resume' }
  | { kind: 'reset-creds'; tenant: Tenant; username: string }
  | { kind: 'generate-invoice'; tenant: Tenant }

const DEFAULT_TENANT_FORM = {
  name: '',
  subdomain: '',
  contact_email: '',
  trial_days: '14',
  max_students: '200',
  max_storage_gb: '5',
  school_admin_username: 'admin',
  school_admin_password: '',
  subscription_plan: '',
}

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isAssigningPlan, setIsAssigningPlan] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null)
  const [createForm, setCreateForm] = useState(DEFAULT_TENANT_FORM)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>({ kind: 'none' })
  const [editForm, setEditForm] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    max_students: '200',
    max_storage_gb: '5',
  })
  const [assignForm, setAssignForm] = useState({ plan_id: '', billing_cycle: 'MONTHLY' })
  const [credentialForm, setCredentialForm] = useState({ username: 'admin', password: '' })

  const selectedTenant = useMemo(
    () => tenants.find((item) => item.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants],
  )

  const stats = useMemo(() => {
    const byStatus = tenants.reduce<Record<string, number>>((acc, tenant) => {
      const key = tenant.status || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return {
      total: tenants.length,
      active: byStatus.ACTIVE || 0,
      trial: byStatus.TRIAL || 0,
      suspended: byStatus.SUSPENDED || 0,
    }
  }, [tenants])

  const loadTenants = async () => {
    setIsLoading(true)
    setError(null)
    const [tenantResult, planResult] = await Promise.allSettled([
      publicApiClient.get<Tenant[] | { results: Tenant[]; count: number }>('/platform/tenants/'),
      publicApiClient.get<Plan[] | { results: Plan[]; count: number }>('/platform/plans/'),
    ])
    if (tenantResult.status === 'fulfilled') {
      setTenants(normalizePaginatedResponse(tenantResult.value.data).items)
    } else {
      setError(extractApiErrorMessage(tenantResult.reason, 'Unable to load tenants.'))
    }
    if (planResult.status === 'fulfilled') {
      setPlans(normalizePaginatedResponse(planResult.value.data).items)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    void loadTenants()
  }, [])

  useEffect(() => {
    if (!selectedTenant) return
    setEditForm({
      name: selectedTenant.name,
      contact_name: selectedTenant.contact_name || '',
      contact_email: selectedTenant.contact_email || '',
      contact_phone: selectedTenant.contact_phone || '',
      max_students: String(selectedTenant.max_students ?? 200),
      max_storage_gb: String(selectedTenant.max_storage_gb ?? 5),
    })
    setAssignForm((prev) => ({
      ...prev,
      plan_id: selectedTenant.subscription_plan ? String(selectedTenant.subscription_plan) : '',
    }))
    setCredentialForm({ username: 'admin', password: '' })
  }, [selectedTenant])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tenants.filter((row) => {
      const statusMatch = !statusFilter || row.status === statusFilter
      const searchMatch =
        !term ||
        `${row.name} ${row.schema_name} ${row.subdomain ?? ''} ${row.contact_email}`.toLowerCase().includes(term)
      return statusMatch && searchMatch
    })
  }, [search, statusFilter, tenants])

  const createTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsCreating(true)
    try {
      const response = await publicApiClient.post('/platform/tenants/', {
        name: createForm.name.trim(),
        subdomain: createForm.subdomain.trim() || undefined,
        contact_email: createForm.contact_email.trim() || undefined,
        trial_days: Number(createForm.trial_days),
        max_students: Number(createForm.max_students),
        max_storage_gb: Number(createForm.max_storage_gb),
        school_admin_username: createForm.school_admin_username.trim() || undefined,
        school_admin_password: createForm.school_admin_password.trim() || undefined,
        subscription_plan: createForm.subscription_plan ? Number(createForm.subscription_plan) : undefined,
      })
      const provision = (response.data as { provisioning?: { school_admin_username?: string; school_admin_temp_password?: string } }).provisioning
      setMessage(
        `Tenant created. Admin user: ${provision?.school_admin_username ?? 'admin'} | Temporary password: ${
          provision?.school_admin_temp_password ?? 'generated'
        }`,
      )
      setCreateForm(DEFAULT_TENANT_FORM)
      await loadTenants()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create tenant.'))
    } finally {
      setIsCreating(false)
    }
  }

  const runStatusAction = async (tenant: Tenant, action: 'activate' | 'suspend' | 'resume') => {
    setError(null)
    setMessage(null)
    setIsConfirming(true)
    try {
      const payload = action === 'suspend' ? { reason: 'Manual suspend from platform UI' } : {}
      await publicApiClient.post(`/platform/tenants/${tenant.id}/${action}/`, payload)
      setMessage(`Tenant "${tenant.name}" is now ${action === 'resume' ? 'active' : `${action}d`}.`)
      await loadTenants()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Unable to ${action} tenant.`))
    } finally {
      setIsConfirming(false)
      setConfirmAction({ kind: 'none' })
    }
  }

  const saveTenantProfile = async () => {
    if (!selectedTenant) return
    setError(null)
    setMessage(null)
    setIsSavingProfile(true)
    try {
      await publicApiClient.patch(`/platform/tenants/${selectedTenant.id}/`, {
        name: editForm.name.trim(),
        contact_name: editForm.contact_name.trim(),
        contact_email: editForm.contact_email.trim(),
        contact_phone: editForm.contact_phone.trim(),
        max_students: Number(editForm.max_students),
        max_storage_gb: Number(editForm.max_storage_gb),
      })
      setMessage(`Profile updated for "${selectedTenant.name}".`)
      await loadTenants()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to update tenant profile.'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const assignPlan = async () => {
    if (!selectedTenant || !assignForm.plan_id) {
      setError('Select a plan first.')
      return
    }
    setError(null)
    setMessage(null)
    setIsAssigningPlan(true)
    try {
      await publicApiClient.post(`/platform/tenants/${selectedTenant.id}/assign-plan/`, {
        subscription_plan: Number(assignForm.plan_id),
        billing_cycle: assignForm.billing_cycle,
      })
      setMessage(`Plan assigned to "${selectedTenant.name}".`)
      await loadTenants()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to assign subscription plan.'))
    } finally {
      setIsAssigningPlan(false)
    }
  }

  const generateInvoice = async (tenant: Tenant) => {
    setError(null)
    setMessage(null)
    setIsConfirming(true)
    try {
      await publicApiClient.post(`/platform/tenants/${tenant.id}/generate-invoice/`, {})
      setMessage(`Invoice generated for "${tenant.name}".`)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to generate billing invoice.'))
    } finally {
      setIsConfirming(false)
      setConfirmAction({ kind: 'none' })
    }
  }

  const resetTenantAdminCredentials = async (tenant: Tenant, username: string) => {
    if (!credentialForm.password.trim()) {
      setError('Enter a new password before resetting credentials.')
      return
    }
    setError(null)
    setMessage(null)
    setIsConfirming(true)
    try {
      await publicApiClient.post(`/platform/tenants/${tenant.id}/reset-school-admin/`, {
        username: username.trim() || 'admin',
        password: credentialForm.password,
      })
      setCredentialForm((prev) => ({ ...prev, password: '' }))
      setMessage(`Credentials updated for "${tenant.name}" (${username || 'admin'}).`)
    } catch (err) {
      const parsed = extractApiErrorMessage(err, 'Unable to reset tenant admin credentials.')
      const normalized = parsed.includes('404')
        ? 'Reset credentials endpoint is unavailable on the running backend. Restart Django server to load latest platform routes.'
        : parsed
      setError(normalized)
    } finally {
      setIsConfirming(false)
      setConfirmAction({ kind: 'none' })
    }
  }

  const confirmTitle =
    confirmAction.kind === 'status'
      ? `${confirmAction.action[0].toUpperCase()}${confirmAction.action.slice(1)} Tenant`
      : confirmAction.kind === 'reset-creds'
        ? 'Reset Tenant Credentials'
        : confirmAction.kind === 'generate-invoice'
          ? 'Generate Invoice'
          : 'Confirm Action'

  const confirmDescription =
    confirmAction.kind === 'status'
      ? `This will ${confirmAction.action} "${confirmAction.tenant.name}".`
      : confirmAction.kind === 'reset-creds'
        ? `Reset password for "${confirmAction.username || 'admin'}" in "${confirmAction.tenant.name}".`
        : confirmAction.kind === 'generate-invoice'
          ? `Generate a new billing invoice for "${confirmAction.tenant.name}".`
          : ''

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="PLATFORM"
        badgeColor="rose"
        title="Tenants"
        subtitle="Manage all school tenants on the platform"
        icon="🛡️"
      />

      <section className="col-span-12 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Tenants</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </article>
        <article className="rounded-2xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">{stats.active}</p>
        </article>
        <article className="rounded-2xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Trial</p>
          <p className="mt-1 text-2xl font-semibold text-sky-300">{stats.trial}</p>
        </article>
        <article className="rounded-2xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Suspended</p>
          <p className="mt-1 text-2xl font-semibold text-amber-300">{stats.suspended}</p>
        </article>
      </section>

      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Step 1: Create Tenant</h2>
        <p className="mt-1 text-xs text-slate-400">Use this only when onboarding a new school tenant.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createTenant}>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="School name" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Subdomain (optional)" value={createForm.subdomain} onChange={(e) => setCreateForm((p) => ({ ...p, subdomain: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Contact email" type="email" value={createForm.contact_email} onChange={(e) => setCreateForm((p) => ({ ...p, contact_email: e.target.value }))} />
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={createForm.subscription_plan} onChange={(e) => setCreateForm((p) => ({ ...p, subscription_plan: e.target.value }))}>
            <option value="">Plan (optional)</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — ≤{plan.max_students === 9999 ? '500+' : plan.max_students} students · KES {Number(plan.annual_price).toLocaleString()}/yr
              </option>
            ))}
          </select>
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Trial days" type="number" min={1} value={createForm.trial_days} onChange={(e) => setCreateForm((p) => ({ ...p, trial_days: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Max students" type="number" min={1} value={createForm.max_students} onChange={(e) => setCreateForm((p) => ({ ...p, max_students: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Max storage GB" type="number" min={1} value={createForm.max_storage_gb} onChange={(e) => setCreateForm((p) => ({ ...p, max_storage_gb: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="School admin username" value={createForm.school_admin_username} onChange={(e) => setCreateForm((p) => ({ ...p, school_admin_username: e.target.value }))} />
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm md:col-span-2" placeholder="School admin password (optional)" value={createForm.school_admin_password} onChange={(e) => setCreateForm((p) => ({ ...p, school_admin_password: e.target.value }))} />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Tenant'}</button>
        </form>
        {createForm.subscription_plan && (() => {
          const p = plans.find(pl => String(pl.id) === createForm.subscription_plan)
          if (!p) return null
          return (
            <div className="mt-3 flex flex-wrap items-start gap-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-xs">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sky-300 text-sm">{p.name} Plan selected</p>
                <p className="mt-0.5 text-slate-400">{p.description}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-slate-300 shrink-0">
                <div className="text-center">
                  <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Annual Fee</p>
                  <p className="font-bold text-white">KES {Number(p.annual_price).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Monthly</p>
                  <p className="font-bold text-white">KES {Number(p.monthly_price).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Max Students</p>
                  <p className="font-bold text-white">{p.max_students === 9999 ? '500+' : p.max_students}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Storage</p>
                  <p className="font-bold text-white">{p.max_storage_gb} GB</p>
                </div>
              </div>
            </div>
          )
        })()}
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-semibold">Step 2: Select and Operate Tenant</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Search tenant" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'ARCHIVED'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => void loadTenants()}>Refresh</button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Name</th><th className="px-3 py-2">Schema</th><th className="px-3 py-2">Subdomain</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Limits</th><th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? <tr><td className="px-3 py-3 text-slate-400" colSpan={6}>Loading tenants...</td></tr> : null}
              {filtered.map((row) => {
                const selected = row.id === selectedTenantId
                return (
                  <tr key={row.id} className={selected ? 'bg-emerald-500/10' : 'bg-slate-950/50'}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.schema_name}</td>
                    <td className="px-3 py-2">{row.subdomain ?? '--'}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.max_students} students | {row.max_storage_gb}GB</td>
                    <td className="px-3 py-2 space-x-2">
                      <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setSelectedTenantId(row.id)}>{selected ? 'Selected' : 'Select'}</button>
                      <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setConfirmAction({ kind: 'status', tenant: row, action: 'activate' })}>Activate</button>
                      <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setConfirmAction({ kind: 'status', tenant: row, action: 'suspend' })}>Suspend</button>
                      <button className="rounded border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setConfirmAction({ kind: 'status', tenant: row, action: 'resume' })}>Resume</button>
                    </td>
                  </tr>
                )
              })}
              {!isLoading && filtered.length === 0 ? <tr><td className="px-3 py-4 text-slate-400" colSpan={6}>No tenants found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedTenant ? (
        <section className="col-span-12 rounded-2xl border border-emerald-500/40 glass-panel p-6">
          <h2 className="text-lg font-semibold">Step 3: Manage "{selectedTenant.name}"</h2>
          <p className="mt-1 text-xs text-slate-400">Edit profile, set billing plan, create invoice, and update tenant admin credentials.</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <article className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold">A. Tenant Profile</h3>
              <div className="mt-3 grid gap-2">
                <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Contact name" value={editForm.contact_name} onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))} />
                <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Contact email" value={editForm.contact_email} onChange={(e) => setEditForm((p) => ({ ...p, contact_email: e.target.value }))} />
                <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Contact phone" value={editForm.contact_phone} onChange={(e) => setEditForm((p) => ({ ...p, contact_phone: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" type="number" min={1} placeholder="Max students" value={editForm.max_students} onChange={(e) => setEditForm((p) => ({ ...p, max_students: e.target.value }))} />
                  <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" type="number" min={1} placeholder="Max storage GB" value={editForm.max_storage_gb} onChange={(e) => setEditForm((p) => ({ ...p, max_storage_gb: e.target.value }))} />
                </div>
                <button type="button" className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" disabled={isSavingProfile} onClick={() => void saveTenantProfile()}>
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </article>

            <article className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold">B. Subscription & Billing</h3>
              <div className="mt-3 grid gap-2">
                <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignForm.plan_id} onChange={(e) => setAssignForm((p) => ({ ...p, plan_id: e.target.value }))}>
                  <option value="">Select plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — ≤{plan.max_students === 9999 ? '500+' : plan.max_students} students · KES {Number(plan.annual_price).toLocaleString()}/yr
                    </option>
                  ))}
                </select>
                {assignForm.plan_id && (() => {
                  const p = plans.find(pl => String(pl.id) === assignForm.plan_id)
                  if (!p) return null
                  return (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1">
                      <p className="font-semibold text-emerald-300">{p.name} Plan</p>
                      <p className="text-slate-400">{p.description}</p>
                      <div className="flex gap-4 mt-1 text-slate-300">
                        <span>📅 KES {Number(p.annual_price).toLocaleString()}/yr</span>
                        <span>👥 Up to {p.max_students === 9999 ? '500+' : p.max_students} students</span>
                        <span>💾 {p.max_storage_gb} GB storage</span>
                      </div>
                    </div>
                  )
                })()}
                <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignForm.billing_cycle} onChange={(e) => setAssignForm((p) => ({ ...p, billing_cycle: e.target.value }))}>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm disabled:opacity-70" disabled={isAssigningPlan} onClick={() => void assignPlan()}>
                    {isAssigningPlan ? 'Assigning...' : 'Assign Plan'}
                  </button>
                  <button type="button" className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm" onClick={() => setConfirmAction({ kind: 'generate-invoice', tenant: selectedTenant })}>
                    Generate Invoice
                  </button>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold">C. School Admin Credentials</h3>
              <p className="mt-1 text-xs text-slate-400">Use this when the school admin forgot the password or the account must be handed over.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Username (default admin)" value={credentialForm.username} onChange={(e) => setCredentialForm((p) => ({ ...p, username: e.target.value }))} />
                <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="New password" type="password" value={credentialForm.password} onChange={(e) => setCredentialForm((p) => ({ ...p, password: e.target.value }))} />
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900"
                  onClick={() => setConfirmAction({ kind: 'reset-creds', tenant: selectedTenant, username: credentialForm.username.trim() || 'admin' })}
                >
                  Reset Credentials
                </button>
              </div>
            </article>
          </div>
        </section>
      ) : (
        <section className="col-span-12 rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.025] p-6 text-sm text-slate-400">
          Select a tenant from Step 2 to unlock profile, billing, and credential management actions.
        </section>
      )}

      <ConfirmDialog
        open={confirmAction.kind !== 'none'}
        title={confirmTitle}
        description={confirmDescription}
        isProcessing={isConfirming}
        onCancel={() => setConfirmAction({ kind: 'none' })}
        onConfirm={() => {
          if (confirmAction.kind === 'status') {
            void runStatusAction(confirmAction.tenant, confirmAction.action)
            return
          }
          if (confirmAction.kind === 'generate-invoice') {
            void generateInvoice(confirmAction.tenant)
            return
          }
          if (confirmAction.kind === 'reset-creds') {
            void resetTenantAdminCredentials(confirmAction.tenant, confirmAction.username)
          }
        }}
        confirmLabel="Confirm"
      />
    </div>
  )
}

