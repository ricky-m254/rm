import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { publicApiClient } from '../../api/publicClient'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type BusinessKpis = {
  kpis: {
    mrr: string
    arr: string
    arpt: string
    monthly_churn_rate_percent: string
    annual_churn_rate_percent: string
    ltv_estimate: string | null
  }
  tenant_segments: {
    trial: number
    active: number
    suspended: number
    cancelled: number
    archived: number
  }
}

type RevenuePayload = {
  invoiced_this_month: string
  paid_this_month: string
  overdue_invoices: number
  overdue_amount: string
  plan_breakdown: Array<{ plan__name: string | null; plan__code: string | null; count: number; total: string }>
  monthly_paid_trend: Array<{ month: string; total: string }>
}

type TenantGrowth = {
  by_month: Array<{ month: string; count: number }>
  totals: { trial: number; active: number; suspended: number; cancelled: number }
}

export default function PlatformRevenueAnalyticsPage() {
  const [kpis, setKpis] = useState<BusinessKpis | null>(null)
  const [revenue, setRevenue] = useState<RevenuePayload | null>(null)
  const [growth, setGrowth] = useState<TenantGrowth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      const [kpiResult, revResult, growthResult] = await Promise.allSettled([
        publicApiClient.get<BusinessKpis>('/platform/analytics/business-kpis/'),
        publicApiClient.get<RevenuePayload>('/platform/analytics/revenue/'),
        publicApiClient.get<TenantGrowth>('/platform/analytics/tenant-growth/'),
      ])
      if (!mounted) return
      if (kpiResult.status === 'fulfilled') setKpis(kpiResult.value.data)
      if (revResult.status === 'fulfilled') setRevenue(revResult.value.data)
      if (growthResult.status === 'fulfilled') setGrowth(growthResult.value.data)
      const firstError = [kpiResult, revResult, growthResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load revenue analytics.'))
      if (mounted) setIsLoading(false)
    }
    void load()
    return () => { mounted = false }
  }, [])

  const mrrTrend = useMemo(() =>
    (revenue?.monthly_paid_trend ?? []).map(row => ({
      month: row.month.slice(0, 7),
      paid: Number(row.total || '0'),
    })),
    [revenue],
  )

  const growthTrend = useMemo(() =>
    (growth?.by_month ?? []).map(row => ({
      month: row.month.slice(0, 7),
      count: row.count,
    })),
    [growth],
  )

  const planBreakdown = useMemo(() =>
    (revenue?.plan_breakdown ?? []).map(row => ({
      plan: row.plan__name ?? row.plan__code ?? 'No Plan',
      count: row.count,
      total: Number(row.total || '0'),
    })),
    [revenue],
  )

  const mrr = kpis ? Number(kpis.kpis.mrr) : 0

  return (
    <div className="space-y-6">
      <PageHero
        badge="PLATFORM"
        badgeColor="violet"
        title="Revenue Analytics"
        subtitle="SaaS health metrics — MRR, ARR, churn rate, and lifetime value"
        icon="💰"
      />

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}

      {isLoading ? (
        <div className="rounded-2xl glass-panel p-6 text-center text-sm text-slate-400">Loading revenue analytics…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'MRR', value: `$${Number(kpis?.kpis.mrr ?? 0).toLocaleString()}`, sub: 'Monthly recurring revenue', color: '#10b981' },
              { label: 'ARR', value: `$${Number(kpis?.kpis.arr ?? 0).toLocaleString()}`, sub: 'Annualised run rate', color: '#3b82f6' },
              { label: 'Monthly Churn', value: `${kpis?.kpis.monthly_churn_rate_percent ?? '0.00'}%`, sub: 'Tenant churn rate', color: '#ef4444' },
              { label: 'LTV Estimate', value: kpis?.kpis.ltv_estimate ? `$${Number(kpis.kpis.ltv_estimate).toLocaleString()}` : '—', sub: 'Average lifetime value', color: '#a78bfa' },
            ].map(m => (
              <div key={m.label} className="rounded-2xl glass-panel p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{m.label}</p>
                <p className="mt-1 text-2xl font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl glass-panel p-4">
              <p className="text-xs text-slate-500 uppercase">ARPT</p>
              <p className="mt-1 text-xl font-bold font-mono text-sky-300">${Number(kpis?.kpis.arpt ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-slate-500">Avg revenue per tenant</p>
            </div>
            <div className="rounded-2xl glass-panel p-4">
              <p className="text-xs text-slate-500 uppercase">Invoiced (Month)</p>
              <p className="mt-1 text-xl font-bold font-mono text-amber-300">${Number(revenue?.invoiced_this_month ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-slate-500">Overdue: {revenue?.overdue_invoices ?? 0} invoices</p>
            </div>
            <div className="rounded-2xl glass-panel p-4">
              <p className="text-xs text-slate-500 uppercase">Collected (Month)</p>
              <p className="mt-1 text-xl font-bold font-mono text-emerald-300">${Number(revenue?.paid_this_month ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-slate-500">Overdue amount: ${Number(revenue?.overdue_amount ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl glass-panel p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-200">Monthly Payments Collected</h2>
              {mrrTrend.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mrrTrend}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Paid']} />
                      <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No payment data yet.</p>
              )}
            </div>

            <div className="rounded-2xl glass-panel p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-200">New Tenants by Month</h2>
              {growthTrend.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthTrend}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No growth data yet.</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl glass-panel p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-200">Revenue by Plan</h2>
              <div className="space-y-3">
                {planBreakdown.length > 0 ? planBreakdown.map(p => {
                  const pct = mrr > 0 ? Math.round((p.total / mrr) * 100) : 0
                  return (
                    <div key={p.plan}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-300">{p.plan} <span className="text-slate-500">({p.count} tenants)</span></span>
                        <span className="font-mono text-slate-200">${p.total.toLocaleString()} <span className="text-slate-500">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                }) : (
                  <p className="text-sm text-slate-500">No plan breakdown data yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl glass-panel p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-200">Tenant Segments</h2>
              <div className="space-y-2">
                {kpis && Object.entries(kpis.tenant_segments).map(([seg, count]) => (
                  <div key={seg} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 capitalize">{seg}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      seg === 'active' ? 'bg-emerald-500/15 text-emerald-300' :
                      seg === 'trial' ? 'bg-blue-500/15 text-blue-300' :
                      seg === 'suspended' ? 'bg-amber-500/15 text-amber-300' :
                      'bg-white/10 text-slate-400'
                    }`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
