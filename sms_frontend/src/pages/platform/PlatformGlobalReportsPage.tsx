import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type TenantReport = {
  tenant_id: number
  tenant_name: string
  status: string
  students?: number
  staff?: number
  invoiced?: string
  paid?: string
  overdue?: string
  collection_rate_percent?: string
  error?: string
}

type ReportData = {
  summary: {
    total_students: number
    total_staff: number
    total_invoiced: string
    total_paid: string
    total_overdue: string
    overall_collection_rate_percent: string
  }
  by_tenant: TenantReport[]
}

function fmt(v: string | undefined) {
  if (!v) return '—'
  return `KES ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

function CollectionBar({ rate }: { rate: string }) {
  const pct = Math.min(100, Math.max(0, parseFloat(rate) || 0))
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-white/[0.08]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-300">{pct.toFixed(1)}%</span>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-5" style={GLASS}>
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function badge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300',
    trial:  'bg-sky-500/20 text-sky-300',
    suspended: 'bg-red-500/20 text-red-300',
  }
  return map[status] ?? 'bg-slate-500/20 text-slate-300'
}

export default function PlatformGlobalReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    publicApiClient
      .get('/platform/analytics/global-reports/')
      .then(r => setData(r.data))
      .catch(e => setError(extractApiErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <PageHero
        title="Global Reports"
        subtitle="Cross-tenant student enrollment, staffing, and financial health across all schools"
      />

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          Compiling global reports…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="Total Students"    value={data.summary.total_students.toLocaleString()} />
            <SummaryCard label="Total Staff"       value={data.summary.total_staff.toLocaleString()} />
            <SummaryCard label="Total Invoiced"    value={fmt(data.summary.total_invoiced)} />
            <SummaryCard label="Total Collected"   value={fmt(data.summary.total_paid)} />
            <SummaryCard label="Total Overdue"     value={fmt(data.summary.total_overdue)} />
            <SummaryCard
              label="Collection Rate"
              value={`${parseFloat(data.summary.overall_collection_rate_percent).toFixed(1)}%`}
              sub="platform-wide"
            />
          </div>

          {/* Collection-rate progress overview */}
          <div className="rounded-2xl p-6" style={GLASS}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
              Financial Health by School
            </h2>
            <div className="space-y-3">
              {data.by_tenant
                .filter(t => !t.error)
                .sort((a, b) => parseFloat(b.collection_rate_percent ?? '0') - parseFloat(a.collection_rate_percent ?? '0'))
                .map(t => (
                  <div key={t.tenant_id} className="flex items-center gap-4">
                    <div className="w-40 truncate text-sm text-slate-300">{t.tenant_name}</div>
                    <CollectionBar rate={t.collection_rate_percent ?? '0'} />
                    <div className="ml-auto flex gap-6 text-xs text-slate-400">
                      <span>Inv: {fmt(t.invoiced)}</span>
                      <span>Paid: {fmt(t.paid)}</span>
                      <span className={parseFloat(t.overdue ?? '0') > 0 ? 'text-red-400' : ''}>
                        Overdue: {fmt(t.overdue)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Per-tenant table */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="border-b border-white/[0.07] px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Per-School Report ({data.by_tenant.length} schools)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] text-xs uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-3 text-left">School</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Students</th>
                    <th className="px-4 py-3 text-right">Staff</th>
                    <th className="px-4 py-3 text-right">Invoiced</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                    <th className="px-4 py-3 text-right">Overdue</th>
                    <th className="px-4 py-3 text-right">Collection %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_tenant.map(t => (
                    <tr
                      key={t.tenant_id}
                      className="border-b border-white/[0.04] transition hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-3 font-medium text-white">{t.tenant_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      {t.error ? (
                        <td colSpan={6} className="px-4 py-3 text-center text-xs text-red-400 italic">{t.error}</td>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right text-slate-300">{(t.students ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{(t.staff ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{fmt(t.invoiced)}</td>
                          <td className="px-4 py-3 text-right text-emerald-300">{fmt(t.paid)}</td>
                          <td className={`px-4 py-3 text-right ${parseFloat(t.overdue ?? '0') > 0 ? 'text-red-300' : 'text-slate-400'}`}>
                            {fmt(t.overdue)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CollectionBar rate={t.collection_rate_percent ?? '0'} />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
