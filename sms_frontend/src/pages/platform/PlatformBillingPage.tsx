import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import { resolveApiBaseUrl } from '../../api/baseUrl'
import PageHero from '../../components/PageHero'

type Tenant = { id: number; name: string; schema_name: string }

type Plan = {
  id: number
  code: string
  name: string
  description?: string
  monthly_price: string
  annual_price: string
  max_students: number
  max_storage_gb: number
}

type Subscription = {
  id: number
  tenant: number
  tenant_name: string
  plan: number
  plan_detail: Plan | null
  billing_cycle: string
  status: string
  starts_on: string | null
  ends_on: string | null
  is_current: boolean
  created_at: string
}

type Invoice = {
  id: number
  tenant: number
  tenant_name: string
  invoice_number: string
  status: string
  billing_cycle: string
  total_amount: string
  due_date: string
}

type PlatformSetting = {
  id: number | null
  key: string
  value: Record<string, unknown>
  description: string
}

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const SEL = 'rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm'
const INP = 'rounded-lg border border-white/[0.09] bg-slate-950 text-white px-3 py-2 text-sm'

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-300',
  TRIAL: 'bg-sky-500/20 text-sky-300',
  SUSPENDED: 'bg-amber-500/20 text-amber-300',
  CANCELLED: 'bg-rose-500/20 text-rose-300',
}

const DEFAULT_PLANS = [
  { code: 'STARTER',    name: 'Starter',    description: 'For small schools with up to 50 students. KES 300/student/year. Includes 100 free SMS credits.',                       monthly_price: '1250.00',  annual_price: '15000.00',  max_students: 50,     max_storage_gb: 5,   enabled_modules: ['CORE','STUDENTS','ACADEMICS','FINANCE'], is_active: true },
  { code: 'GROWTH',     name: 'Growth',     description: 'For growing schools with 51-200 students. KES 280/student/year. Includes 500 free SMS credits.',                      monthly_price: '5000.00',  annual_price: '60000.00',  max_students: 200,    max_storage_gb: 20,  enabled_modules: [], is_active: true },
  { code: 'PRO',        name: 'Pro',        description: 'For established schools with 201-500 students. KES 260/student/year. Includes 2,000 free SMS credits.',              monthly_price: '12500.00', annual_price: '150000.00', max_students: 500,    max_storage_gb: 50,  enabled_modules: [], is_active: true },
  { code: 'ENTERPRISE', name: 'Enterprise', description: 'For large schools with 500+ students. KES 240/student/year. Includes 5,000+ free SMS credits. Custom pricing.',      monthly_price: '12500.00', annual_price: '150000.00', max_students: 9999,   max_storage_gb: 200, enabled_modules: [], is_active: true },
  { code: 'UNLIMITED',  name: 'Unlimited',  description: 'Unlimited students with high storage and white-label options.',                                                        monthly_price: '0.00',     annual_price: '0.00',      max_students: 999999, max_storage_gb: 500, enabled_modules: [], is_active: true },
]

const TIER: Record<string, { rate: number; sms: number; color: string }> = {
  STARTER:      { rate: 300, sms: 100,    color: 'border-slate-600/60' },
  GROWTH:       { rate: 280, sms: 500,    color: 'border-sky-500/30' },
  PRO:          { rate: 260, sms: 2000,   color: 'border-violet-500/30' },
  PROFESSIONAL: { rate: 260, sms: 2000,   color: 'border-violet-500/30' },
  ENTERPRISE:   { rate: 240, sms: 5000,   color: 'border-amber-500/30' },
  UNLIMITED:    { rate: 220, sms: 10000,  color: 'border-emerald-500/30' },
}

export default function PlatformBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [message, setMessage] = useState<string | null>(null)
  const [invoiceFilters, setInvoiceFilters] = useState({ tenant: '', status: '' })
  const [subFilters, setSubFilters] = useState({ tenant: '', plan: '', status: '' })
  const [payingId, setPayingId] = useState<number | null>(null)
  const [subForm, setSubForm] = useState({ tenant: '', plan: '', billing_cycle: 'ANNUAL' })
  const [isCreatingSub, setIsCreatingSub] = useState(false)

  const [paybillSetting, setPaybillSetting] = useState<PlatformSetting | null>(null)
  const [paybillInput, setPaybillInput] = useState('522522')
  const [isSavingPaybill, setIsSavingPaybill] = useState(false)
  const [paybillMsg, setPaybillMsg] = useState<string | null>(null)

  const loadPlansAndTenants = useCallback(async () => {
    setPlansLoading(true)
    setPlansError(null)
    try {
      const base = resolveApiBaseUrl().replace(/\/$/, '')

      const [planRes, tenantRes, settingRes] = await Promise.allSettled([
        axios.get<Plan[]>(`${base}/api/platform/plans/`),
        publicApiClient.get('/platform/tenants/'),
        publicApiClient.get('/platform/settings/'),
      ])

      if (planRes.status === 'fulfilled') {
        const raw = planRes.value.data as unknown
        const items = normalizePaginatedResponse<Plan>(raw as Plan[]).items
        console.info('[Billing] Plans loaded:', items.length, items)
        setPlans(items)
        if (items.length === 0) setPlansError('No active subscription plans found in the database.')
      } else {
        console.error('[Billing] Plans error:', planRes.reason)
        setPlansError(extractApiErrorMessage(planRes.reason, 'Unable to load subscription plans.'))
      }

      if (tenantRes.status === 'fulfilled') {
        setTenants(normalizePaginatedResponse<Tenant>(tenantRes.value.data).items)
      } else {
        console.error('[Billing] Tenants error:', tenantRes.reason)
      }

      if (settingRes.status === 'fulfilled') {
        const settings = normalizePaginatedResponse<PlatformSetting>(settingRes.value.data).items
        const paybill = settings.find((s) => s.key === 'MPESA_PAYBILL') ?? null
        setPaybillSetting(paybill)
        if (paybill?.value?.number) setPaybillInput(String(paybill.value.number))
      } else {
        console.error('[Billing] Settings error:', settingRes.reason)
      }
    } finally {
      setPlansLoading(false)
    }
  }, [])

  const loadFilteredData = useCallback(async () => {
    setDataLoading(true)
    setDataError(null)
    const [invoiceRes, subRes] = await Promise.allSettled([
      publicApiClient.get('/platform/subscription-invoices/', {
        params: {
          tenant_id: invoiceFilters.tenant || undefined,
          status: invoiceFilters.status || undefined,
        },
      }),
      publicApiClient.get('/platform/subscriptions/', {
        params: {
          tenant_id: subFilters.tenant || undefined,
          plan_id: subFilters.plan || undefined,
          status: subFilters.status || undefined,
        },
      }),
    ])
    if (invoiceRes.status === 'fulfilled')
      setInvoices(normalizePaginatedResponse<Invoice>(invoiceRes.value.data).items)
    if (subRes.status === 'fulfilled')
      setSubscriptions(normalizePaginatedResponse<Subscription>(subRes.value.data).items)
    const firstFail = [invoiceRes, subRes].find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstFail) setDataError(extractApiErrorMessage(firstFail.reason, 'Unable to load billing records.'))
    setDataLoading(false)
  }, [invoiceFilters.tenant, invoiceFilters.status, subFilters.tenant, subFilters.plan, subFilters.status])

  useEffect(() => {
    void loadPlansAndTenants()
  }, [loadPlansAndTenants])

  useEffect(() => {
    void loadFilteredData()
  }, [loadFilteredData])

  const totals = useMemo(() => {
    let total = 0
    let paidCount = 0
    for (const row of invoices) {
      total += Number(row.total_amount || 0)
      if (row.status === 'PAID') paidCount += 1
    }
    return { total: total.toFixed(2), paidCount, count: invoices.length }
  }, [invoices])

  const recordPayment = async (invoice: Invoice) => {
    const amount = window.prompt(`Record payment amount for ${invoice.invoice_number}`, invoice.total_amount)
    if (!amount) return
    setPayingId(invoice.id)
    setMessage(null)
    try {
      await publicApiClient.post(`/platform/subscription-invoices/${invoice.id}/record-payment/`, {
        amount: Number(amount),
        method: 'MANUAL',
      })
      setMessage(`Payment recorded for invoice ${invoice.invoice_number}.`)
      void loadFilteredData()
    } catch (err) {
      setDataError(extractApiErrorMessage(err, 'Unable to record invoice payment.'))
    } finally {
      setPayingId(null)
    }
  }

  const createSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subForm.tenant || !subForm.plan) {
      setDataError('Please select both a tenant and a plan.')
      return
    }
    setIsCreatingSub(true)
    setDataError(null)
    setMessage(null)
    try {
      await publicApiClient.post('/platform/subscriptions/', {
        tenant: Number(subForm.tenant),
        plan: Number(subForm.plan),
        billing_cycle: subForm.billing_cycle,
      })
      setMessage('Subscription created successfully.')
      setSubForm({ tenant: '', plan: '', billing_cycle: 'ANNUAL' })
      void loadFilteredData()
    } catch (err) {
      setDataError(extractApiErrorMessage(err, 'Unable to create subscription.'))
    } finally {
      setIsCreatingSub(false)
    }
  }

  const [isSeeding, setIsSeeding] = useState(false)

  type PlanForm = {
    code: string; name: string; description: string
    monthly_price: string; annual_price: string
    max_students: string; max_storage_gb: string; is_active: boolean
  }
  const EMPTY_PLAN_FORM: PlanForm = { code: '', name: '', description: '', monthly_price: '', annual_price: '', max_students: '', max_storage_gb: '', is_active: true }
  const [planModal, setPlanModal] = useState<null | { mode: 'create' | 'edit'; id?: number }>(null)
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN_FORM)
  const [isPlanSaving, setIsPlanSaving] = useState(false)
  const [planModalError, setPlanModalError] = useState<string | null>(null)
  const [deletePlanId, setDeletePlanId] = useState<number | null>(null)
  const [isDeletingPlan, setIsDeletingPlan] = useState(false)

  const openEditPlan = (plan: Plan) => {
    setPlanForm({
      code: plan.code, name: plan.name, description: plan.description ?? '',
      monthly_price: plan.monthly_price, annual_price: plan.annual_price,
      max_students: String(plan.max_students), max_storage_gb: String(plan.max_storage_gb),
      is_active: true,
    })
    setPlanModalError(null)
    setPlanModal({ mode: 'edit', id: plan.id })
  }

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPlanSaving(true)
    setPlanModalError(null)
    const payload = {
      code: planForm.code.toUpperCase(),
      name: planForm.name,
      description: planForm.description,
      monthly_price: planForm.monthly_price,
      annual_price: planForm.annual_price,
      max_students: Number(planForm.max_students),
      max_storage_gb: Number(planForm.max_storage_gb),
      is_active: planForm.is_active,
    }
    try {
      if (planModal?.mode === 'edit' && planModal.id) {
        await publicApiClient.patch(`/platform/plans/${planModal.id}/`, payload)
        setMessage('Plan updated successfully.')
      } else {
        await publicApiClient.post('/platform/plans/', payload)
        setMessage('Plan created successfully.')
      }
      setPlanModal(null)
      void loadPlansAndTenants()
    } catch (err) {
      setPlanModalError(extractApiErrorMessage(err, 'Unable to save plan.'))
    } finally {
      setIsPlanSaving(false)
    }
  }

  const confirmDeletePlan = async () => {
    if (!deletePlanId) return
    setIsDeletingPlan(true)
    try {
      await publicApiClient.delete(`/platform/plans/${deletePlanId}/`)
      setMessage('Plan deleted.')
      setDeletePlanId(null)
      void loadPlansAndTenants()
    } catch (err) {
      setDataError(extractApiErrorMessage(err, 'Unable to delete plan.'))
      setDeletePlanId(null)
    } finally {
      setIsDeletingPlan(false)
    }
  }

  const seedDefaultPlans = async () => {
    setIsSeeding(true)
    setPlansError(null)
    try {
      for (const plan of DEFAULT_PLANS) {
        await publicApiClient.post('/platform/plans/', { ...plan, is_active: true })
      }
      setMessage('Default plans seeded successfully.')
      void loadPlansAndTenants()
    } catch (err) {
      setPlansError(extractApiErrorMessage(err, 'Unable to seed default plans.'))
    } finally {
      setIsSeeding(false)
    }
  }

  const savePaybill = async () => {
    const num = paybillInput.trim()
    if (!num) return
    setIsSavingPaybill(true)
    setPaybillMsg(null)
    try {
      if (paybillSetting?.id) {
        await publicApiClient.patch(`/platform/settings/${paybillSetting.id}/`, {
          value: { number: num },
        })
      } else {
        const res = await publicApiClient.post('/platform/settings/', {
          key: 'MPESA_PAYBILL',
          value: { number: num },
          description: 'M-Pesa Paybill number displayed on billing page and invoices.',
        })
        setPaybillSetting(res.data as PlatformSetting)
      }
      setPaybillMsg(`Paybill number saved as ${num}.`)
    } catch (err) {
      setPaybillMsg(extractApiErrorMessage(err, 'Unable to save paybill number.'))
    } finally {
      setIsSavingPaybill(false)
    }
  }

  const selectedPlan = plans.find((p) => String(p.id) === subForm.plan)

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Subscription & Billing"
        subtitle="Plans, subscriptions, billing cycles, invoice tracking, and payment capture."
        icon="📋"
      />

      {message ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {dataError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {dataError}
        </div>
      ) : null}

      {/* ── Payment Settings ───────────────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-5" style={GLASS}>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Payment Settings</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">M-Pesa Paybill Number</label>
            <input
              className={INP}
              value={paybillInput}
              onChange={(e) => setPaybillInput(e.target.value)}
              placeholder="e.g. 522522"
              maxLength={10}
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
            onClick={() => void savePaybill()}
            disabled={isSavingPaybill}
          >
            {isSavingPaybill ? 'Saving...' : 'Save Paybill'}
          </button>
          {paybillMsg ? (
            <span className={`text-xs ${paybillMsg.startsWith('Unable') ? 'text-rose-300' : 'text-emerald-300'}`}>
              {paybillMsg}
            </span>
          ) : null}
        </div>
      </section>

      {/* ── Subscription Plans (cards) ─────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Subscription Plans</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              KES 300/student/year base pricing · M-Pesa Paybill{' '}
              <span className="font-mono text-emerald-300">{paybillInput || '—'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300"
              onClick={() => void loadPlansAndTenants()}
              disabled={plansLoading}
            >
              {plansLoading ? 'Loading...' : 'Reload'}
            </button>
            <button
              type="button"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900"
              onClick={() => { setPlanForm(EMPTY_PLAN_FORM); setPlanModalError(null); setPlanModal({ mode: 'create' }) }}
            >
              + Add Plan
            </button>
          </div>
        </div>

        {plansError ? (
          <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 flex flex-wrap items-center gap-3 text-sm text-rose-300">
            <span className="flex-1">{plansError}</span>
            <button
              type="button"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shrink-0 disabled:opacity-70"
              onClick={() => void seedDefaultPlans()}
              disabled={isSeeding}
            >
              {isSeeding ? 'Creating...' : 'Seed Default Plans'}
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {plansLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-slate-950/60 p-4 animate-pulse h-44" />
            ))
          ) : plans.length === 0 ? null : (
            plans.map((plan) => {
              const t = TIER[plan.code] ?? { rate: 300, sms: 100, color: 'border-white/[0.07]' }
              return (
                <article key={plan.id} className={`rounded-xl border ${t.color} bg-slate-950/60 p-4 text-sm`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">{plan.code}</p>
                      <p className="font-bold text-white text-base">{plan.name}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    KES {Number(plan.annual_price).toLocaleString()}
                    <span className="text-sm font-normal text-slate-500">/yr</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    KES {Number(plan.monthly_price).toLocaleString()}/month
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-slate-400 border-t border-white/[0.07] pt-3">
                    <div className="flex justify-between">
                      <span>Students</span>
                      <span className="text-white">
                        ≤ {plan.max_students >= 9999 ? '500+' : plan.max_students}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Per-student rate</span>
                      <span className="text-white">KES {t.rate}/yr</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Free SMS credits</span>
                      <span className="text-white">{t.sms.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage</span>
                      <span className="text-white">{plan.max_storage_gb} GB</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.07] flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-white/[0.09] px-2 py-1 text-xs text-slate-300 hover:bg-white/[0.05]"
                      onClick={() => openEditPlan(plan)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                      onClick={() => setDeletePlanId(plan.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>

        <div className="mt-6 rounded-xl border border-white/[0.07] bg-slate-950/40 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Pricing Reference · KES 300/student/year
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/[0.07] text-slate-500 uppercase">
                  <th className="pb-2 pr-4 text-left">Plan</th>
                  <th className="pb-2 pr-4 text-left">Students</th>
                  <th className="pb-2 pr-4 text-right">Annual Fee</th>
                  <th className="pb-2 pr-4 text-right">Per-Student</th>
                  <th className="pb-2 text-right">Free SMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  { p: 'Starter', s: '1 – 50', fee: 'KES 15,000', rate: 'KES 300', sms: '100' },
                  { p: 'Growth', s: '51 – 200', fee: 'KES 60,000', rate: 'KES 280', sms: '500' },
                  { p: 'Pro', s: '201 – 500', fee: 'KES 150,000', rate: 'KES 260', sms: '2,000' },
                  { p: 'Enterprise', s: '500+', fee: 'Custom', rate: 'KES 240', sms: '5,000+' },
                ].map((r) => (
                  <tr key={r.p} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 font-medium text-white">{r.p}</td>
                    <td className="py-2 pr-4 text-slate-400">{r.s}</td>
                    <td className="py-2 pr-4 text-right text-emerald-400">{r.fee}</td>
                    <td className="py-2 pr-4 text-right">{r.rate}</td>
                    <td className="py-2 text-right">{r.sms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Assign / Create Subscription ──────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <h2 className="text-lg font-semibold">Assign / Create Subscription</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Select a tenant and a billing plan to activate or update their subscription.
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={(e) => void createSubscription(e)}>
          <select
            className={SEL}
            value={subForm.tenant}
            onChange={(e) => setSubForm((p) => ({ ...p, tenant: e.target.value }))}
            required
          >
            <option value="">Select tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            className={SEL}
            value={subForm.plan}
            onChange={(e) => setSubForm((p) => ({ ...p, plan: e.target.value }))}
            required
          >
            <option value="">Select billing plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — ≤{plan.max_students >= 9999 ? '500+' : plan.max_students} students · KES{' '}
                {Number(plan.annual_price).toLocaleString()}/yr
              </option>
            ))}
          </select>

          <select
            className={SEL}
            value={subForm.billing_cycle}
            onChange={(e) => setSubForm((p) => ({ ...p, billing_cycle: e.target.value }))}
          >
            <option value="ANNUAL">Annual (recommended)</option>
            <option value="MONTHLY">Monthly</option>
          </select>

          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
            disabled={isCreatingSub || plansLoading}
          >
            {isCreatingSub ? 'Creating...' : 'Create Subscription'}
          </button>
        </form>

        {selectedPlan ? (
          <div className="mt-3 flex flex-wrap items-start gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-300 text-sm">{selectedPlan.name} Plan selected</p>
              {selectedPlan.description ? (
                <p className="mt-0.5 text-slate-400">{selectedPlan.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-4 text-slate-300 shrink-0">
              {[
                ['Annual Fee', `KES ${Number(selectedPlan.annual_price).toLocaleString()}`],
                ['Monthly', `KES ${Number(selectedPlan.monthly_price).toLocaleString()}`],
                ['Max Students', selectedPlan.max_students >= 9999 ? '500+' : String(selectedPlan.max_students)],
                ['Storage', `${selectedPlan.max_storage_gb} GB`],
              ].map(([label, val]) => (
                <div key={label} className="text-center">
                  <p className="text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>
                    {label}
                  </p>
                  <p className="font-bold text-white">{val}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Active Subscriptions ───────────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold mr-2">Active Subscriptions</h2>
          <select className={SEL} value={subFilters.tenant} onChange={(e) => setSubFilters((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">All tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select className={SEL} value={subFilters.plan} onChange={(e) => setSubFilters((p) => ({ ...p, plan: e.target.value }))}>
            <option value="">All plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className={SEL} value={subFilters.status} onChange={(e) => setSubFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All statuses</option>
            {['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Cycle</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Starts</th>
                <th className="px-3 py-2">Ends</th>
                <th className="px-3 py-2">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dataLoading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-400" colSpan={7}>
                    Loading subscriptions...
                  </td>
                </tr>
              ) : null}
              {subscriptions.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2 font-medium text-white">{row.tenant_name}</td>
                  <td className="px-3 py-2">{row.plan_detail?.name ?? row.plan}</td>
                  <td className="px-3 py-2">{row.billing_cycle}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[row.status] ?? 'bg-white/[0.06] text-slate-300'}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{row.starts_on ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-400">{row.ends_on ?? '—'}</td>
                  <td className="px-3 py-2">
                    {row.is_current ? (
                      <span className="text-emerald-400 text-xs">✓ Current</span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!dataLoading && subscriptions.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-400" colSpan={7}>
                    No subscriptions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Invoice Management ─────────────────────────────────────────── */}
      <section className="col-span-12 rounded-2xl p-6" style={GLASS}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold mr-2">Invoice Management</h2>
          <select className={SEL} value={invoiceFilters.tenant} onChange={(e) => setInvoiceFilters((p) => ({ ...p, tenant: e.target.value }))}>
            <option value="">All tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select className={SEL} value={invoiceFilters.status} onChange={(e) => setInvoiceFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All statuses</option>
            {['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-white"
            onClick={() => void loadFilteredData()}
          >
            Refresh
          </button>
          <p className="ml-auto text-xs text-slate-400">
            Invoices: {totals.count} | Paid: {totals.paidCount} | Total: KES{' '}
            {Number(totals.total).toLocaleString()}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Cycle</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dataLoading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-400" colSpan={7}>
                    Loading billing records...
                  </td>
                </tr>
              ) : null}
              {invoices.map((row) => (
                <tr key={row.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{row.invoice_number}</td>
                  <td className="px-3 py-2">{row.tenant_name}</td>
                  <td className="px-3 py-2">{row.billing_cycle}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">KES {Number(row.total_amount).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.due_date}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border border-white/[0.09] px-2 py-1 text-xs disabled:opacity-60"
                      disabled={row.status === 'PAID' || payingId === row.id}
                      onClick={() => void recordPayment(row)}
                    >
                      {payingId === row.id ? 'Saving...' : 'Record Payment'}
                    </button>
                  </td>
                </tr>
              ))}
              {!dataLoading && invoices.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-400" colSpan={7}>
                    No invoices found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Plan Create/Edit Modal ─────────────────────────────────────── */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 text-white" style={GLASS}>
            <h2 className="text-lg font-semibold mb-4">
              {planModal.mode === 'create' ? 'Create New Plan' : 'Edit Plan'}
            </h2>
            <form className="space-y-3" onSubmit={(e) => void savePlan(e)}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Code</label>
                  <input className={INP} value={planForm.code} onChange={e => setPlanForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. STARTER" required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Name</label>
                  <input className={INP} value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter" required />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Description</label>
                <textarea className={`${INP} w-full`} rows={2} value={planForm.description} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Monthly Price (KES)</label>
                  <input className={INP} type="number" step="0.01" value={planForm.monthly_price} onChange={e => setPlanForm(p => ({ ...p, monthly_price: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Annual Price (KES)</label>
                  <input className={INP} type="number" step="0.01" value={planForm.annual_price} onChange={e => setPlanForm(p => ({ ...p, annual_price: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Students</label>
                  <input className={INP} type="number" value={planForm.max_students} onChange={e => setPlanForm(p => ({ ...p, max_students: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Storage (GB)</label>
                  <input className={INP} type="number" value={planForm.max_storage_gb} onChange={e => setPlanForm(p => ({ ...p, max_storage_gb: e.target.value }))} required />
                </div>
              </div>
              {planModalError && (
                <p className="text-xs text-rose-300">{planModalError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" disabled={isPlanSaving}>
                  {isPlanSaving ? 'Saving...' : planModal.mode === 'create' ? 'Create Plan' : 'Save Changes'}
                </button>
                <button type="button" className="rounded-lg border border-white/[0.09] px-4 py-2 text-sm text-slate-300" onClick={() => setPlanModal(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Plan Confirmation ───────────────────────────────────── */}
      {deletePlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 text-white" style={GLASS}>
            <h2 className="text-lg font-semibold">Delete Plan?</h2>
            <p className="mt-2 text-sm text-slate-400">
              This will permanently remove the plan. Existing subscriptions won't be affected.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg bg-rose-500 py-2 text-sm font-semibold text-white disabled:opacity-70"
                disabled={isDeletingPlan}
                onClick={() => void confirmDeletePlan()}
              >
                {isDeletingPlan ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/[0.09] px-4 py-2 text-sm text-slate-300"
                onClick={() => setDeletePlanId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
