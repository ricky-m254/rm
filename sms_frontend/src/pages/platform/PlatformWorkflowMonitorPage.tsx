import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type TenantRow = {
  tenant_id: number
  tenant_name: string
  status: string
  students?: number
  staff?: number
  pending_transfers?: number
  pending_admissions?: number
  overdue_invoices?: number
  recent_payments?: number
  error?: string
}

type CrossTenant = {
  pending: number
  approved_from_source: number
  completed_30d: number
}

type WorkflowData = {
  totals: {
    total_students: number
    total_staff: number
    pending_transfers: number
    pending_admissions: number
    overdue_invoices: number
    recent_payments: number
  }
  cross_tenant_transfers: CrossTenant
  tenants: TenantRow[]
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-2xl p-5" style={GLASS}>
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ?? 'text-white'}`}>{value}</p>
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

export default function PlatformWorkflowMonitorPage() {
  const [data, setData] = useState<WorkflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    publicApiClient
      .get('/platform/analytics/workflow-monitor/')
      .then(r => setData(r.data))
      .catch(e => setError(extractApiErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <PageHero
        title="Workflow Monitor"
        subtitle="Cross-tenant real-time view of admissions, transfers, and payments across all schools"
      />

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          Loading workflow data…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Students"      value={data.totals.total_students.toLocaleString()} accent="text-emerald-300" />
            <StatCard label="Total Staff"         value={data.totals.total_staff.toLocaleString()} accent="text-sky-300" />
            <StatCard label="Pending Transfers"   value={data.totals.pending_transfers} accent={data.totals.pending_transfers > 0 ? 'text-amber-300' : 'text-white'} />
            <StatCard label="Pending Admissions"  value={data.totals.pending_admissions} accent={data.totals.pending_admissions > 0 ? 'text-amber-300' : 'text-white'} />
            <StatCard label="Overdue Invoices"    value={data.totals.overdue_invoices} accent={data.totals.overdue_invoices > 0 ? 'text-red-300' : 'text-white'} />
            <StatCard label="Payments (30d)"      value={data.totals.recent_payments} accent="text-emerald-300" />
          </div>

          {/* Cross-tenant transfers */}
          {data.cross_tenant_transfers && (
            <div className="rounded-2xl p-6" style={GLASS}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Cross-School Transfers</h2>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Pending Approval</p>
                  <p className={`mt-1 text-2xl font-bold ${data.cross_tenant_transfers.pending > 0 ? 'text-amber-300' : 'text-white'}`}>
                    {data.cross_tenant_transfers.pending}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Awaiting Destination</p>
                  <p className={`mt-1 text-2xl font-bold ${data.cross_tenant_transfers.approved_from_source > 0 ? 'text-sky-300' : 'text-white'}`}>
                    {data.cross_tenant_transfers.approved_from_source}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Completed (30d)</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-300">
                    {data.cross_tenant_transfers.completed_30d}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Per-tenant table */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="border-b border-white/[0.07] px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Per-School Breakdown ({data.tenants.length} schools)
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
                    <th className="px-4 py-3 text-right">Pending Tx</th>
                    <th className="px-4 py-3 text-right">Pending Adm</th>
                    <th className="px-4 py-3 text-right">Overdue Inv</th>
                    <th className="px-4 py-3 text-right">Pay (30d)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map(t => (
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
                          <td className={`px-4 py-3 text-right font-semibold ${(t.pending_transfers ?? 0) > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                            {t.pending_transfers ?? 0}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${(t.pending_admissions ?? 0) > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                            {t.pending_admissions ?? 0}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${(t.overdue_invoices ?? 0) > 0 ? 'text-red-300' : 'text-slate-400'}`}>
                            {t.overdue_invoices ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-300">{t.recent_payments ?? 0}</td>
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
