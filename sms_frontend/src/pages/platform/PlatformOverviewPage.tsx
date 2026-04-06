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

type OverviewPayload = {
  tenants: {
    total: number
    trial: number
    active: number
    suspended: number
    cancelled: number
    archived: number
  }
  revenue: {
    mrr: string
    arr: string
    invoiced_this_month: string
    paid_this_month: string
    overdue_invoices: number
  }
  growth: {
    new_tenants_this_month: number
    new_tenants_this_year: number
  }
  churn: {
    churned_this_month: number
    monthly_churn_rate_percent: string
  }
}

type BusinessKpisPayload = {
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

type StorageUsagePayload = {
  latest_total_storage_gb: string
  points: Array<{
    month: string
    total_storage_gb: string
    datapoints: number
  }>
}

export default function PlatformOverviewPage() {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [businessKpis, setBusinessKpis] = useState<BusinessKpisPayload | null>(null)
  const [storageUsage, setStorageUsage] = useState<StorageUsagePayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const storageTrend = useMemo(
    () =>
      (storageUsage?.points ?? []).map((row) => ({
        month: row.month.slice(0, 7),
        total_storage_gb: Number(row.total_storage_gb || '0'),
      })),
    [storageUsage],
  )

  const tenantSegments = useMemo(() => {
    if (!businessKpis) return []
    return [
      { status: 'ACTIVE', count: businessKpis.tenant_segments.active },
      { status: 'TRIAL', count: businessKpis.tenant_segments.trial },
      { status: 'SUSPENDED', count: businessKpis.tenant_segments.suspended },
      { status: 'CANCELLED', count: businessKpis.tenant_segments.cancelled },
      { status: 'ARCHIVED', count: businessKpis.tenant_segments.archived },
    ]
  }, [businessKpis])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      const [overviewResult, kpiResult, storageResult] = await Promise.allSettled([
        publicApiClient.get<OverviewPayload>('/platform/analytics/overview/'),
        publicApiClient.get<BusinessKpisPayload>('/platform/analytics/business-kpis/'),
        publicApiClient.get<StorageUsagePayload>('/platform/analytics/storage-usage/'),
      ])
      if (!mounted) return
      if (overviewResult.status === 'fulfilled') setData(overviewResult.value.data)
      if (kpiResult.status === 'fulfilled') setBusinessKpis(kpiResult.value.data)
      if (storageResult.status === 'fulfilled') setStorageUsage(storageResult.value.data)
      const firstError = [overviewResult, kpiResult, storageResult].find((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (firstError) setError(extractApiErrorMessage(firstError.reason, 'Unable to load platform overview.'))
      setIsLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Overview Dashboard"
        subtitle="Overview Dashboard management and overview."
        icon="📋"
      />
      {isLoading ? <div className="col-span-12 rounded-2xl glass-panel p-4 text-sm text-slate-300">Loading overview...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {data ? (
        <>
          <section className="col-span-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl glass-panel p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Tenants</p>
              <p className="mt-2 text-3xl font-semibold">{data.tenants.total}</p>
              <p className="mt-2 text-xs text-slate-300">Active: {data.tenants.active} | Trial: {data.tenants.trial}</p>
            </div>
            <div className="rounded-2xl glass-panel p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Revenue</p>
              <p className="mt-2 text-3xl font-semibold">${data.revenue.mrr}</p>
              <p className="mt-2 text-xs text-slate-300">ARR: ${data.revenue.arr}</p>
            </div>
            <div className="rounded-2xl glass-panel p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Churn</p>
              <p className="mt-2 text-3xl font-semibold">{data.churn.monthly_churn_rate_percent}%</p>
              <p className="mt-2 text-xs text-slate-300">Churned this month: {data.churn.churned_this_month}</p>
            </div>
          </section>
          {businessKpis ? (
            <section className="col-span-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">ARPT: ${businessKpis.kpis.arpt}</div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">Annual churn: {businessKpis.kpis.annual_churn_rate_percent}%</div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">LTV estimate: {businessKpis.kpis.ltv_estimate ? `$${businessKpis.kpis.ltv_estimate}` : '--'}</div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">Invoiced (month): ${data.revenue.invoiced_this_month}</div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">Paid (month): ${data.revenue.paid_this_month}</div>
            </section>
          ) : null}
          <section className="col-span-12 rounded-2xl glass-panel p-6">
            <h2 className="text-lg font-display font-semibold">Operational Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">Suspended tenants: {data.tenants.suspended}</div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">Overdue invoices: {data.revenue.overdue_invoices}</div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">New tenants (month): {data.growth.new_tenants_this_month}</div>
              <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">New tenants (year): {data.growth.new_tenants_this_year}</div>
            </div>
          </section>
          <section className="col-span-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl glass-panel p-6">
              <h2 className="text-lg font-display font-semibold">Storage Usage Trend (GB)</h2>
              <p className="mt-1 text-xs text-slate-400">Latest total: {storageUsage?.latest_total_storage_gb ?? '0.00'} GB</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={storageTrend}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total_storage_gb" stroke="#34d399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl glass-panel p-6">
              <h2 className="text-lg font-display font-semibold">Tenant Segments</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tenantSegments}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
