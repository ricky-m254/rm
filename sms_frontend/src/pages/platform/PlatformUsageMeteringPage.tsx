import { useEffect, useState } from 'react'
import { publicApiClient } from '../../api/publicClient'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type Tenant = {
  id: number
  name: string
  schema_name: string
  subdomain: string | null
  status: string
  max_students: number
  max_storage_gb: number
  subscription_plan: number | null
}

type TenantStats = {
  students_active: number
  staff_active: number
  invoices_total: number
  payments_total: string
  users_total: number
}

type TenantRow = Tenant & { stats: TenantStats | null; loadingStats: boolean }

function UsageBar({ value, max, color = '#10b981' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const warn = pct >= 85
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-white/10">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: warn ? '#ef4444' : color }} />
      </div>
      <span className={`min-w-[36px] text-right text-xs font-mono font-semibold ${warn ? 'text-red-400' : 'text-slate-300'}`}>{pct}%</span>
    </div>
  )
}

export default function PlatformUsageMeteringPage() {
  const [rows, setRows] = useState<TenantRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await publicApiClient.get<Tenant[] | { results: Tenant[]; count: number }>('/platform/tenants/')
      const tenants = normalizePaginatedResponse(res.data).items
      const initial: TenantRow[] = tenants.map(t => ({ ...t, stats: null, loadingStats: true }))
      setRows(initial)
      setIsLoading(false)
      await Promise.allSettled(
        tenants.map(async (t) => {
          try {
            const sr = await publicApiClient.get<TenantStats>(`/platform/tenants/${t.id}/stats/`)
            setRows(prev => prev.map(r => r.id === t.id ? { ...r, stats: sr.data, loadingStats: false } : r))
          } catch {
            setRows(prev => prev.map(r => r.id === t.id ? { ...r, loadingStats: false } : r))
          }
        }),
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load usage data.'))
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const filtered = rows.filter(r =>
    !search.trim() ||
    `${r.name} ${r.schema_name} ${r.subdomain ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  )

  const totals = {
    students: rows.reduce((s, r) => s + (r.stats?.students_active ?? 0), 0),
    staff: rows.reduce((s, r) => s + (r.stats?.staff_active ?? 0), 0),
    users: rows.reduce((s, r) => s + (r.stats?.users_total ?? 0), 0),
    tenants: rows.length,
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="PLATFORM"
        badgeColor="blue"
        title="Usage Metering"
        subtitle="Real-time resource consumption across all tenant schools"
        icon="📊"
      />

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Tenants', value: totals.tenants.toLocaleString(), color: '#10b981' },
          { label: 'Active Students', value: totals.students.toLocaleString(), color: '#3b82f6' },
          { label: 'Active Staff', value: totals.staff.toLocaleString(), color: '#f59e0b' },
          { label: 'Platform Users', value: totals.users.toLocaleString(), color: '#a78bfa' },
        ].map(m => (
          <div key={m.label} className="rounded-2xl glass-panel p-4">
            <p className="text-xl font-bold font-mono" style={{ color: m.color }}>{isLoading ? '—' : m.value}</p>
            <p className="mt-1 text-xs text-slate-400">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl glass-panel p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Per-Tenant Usage Breakdown</h2>
          <div className="flex gap-2">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-60"
              placeholder="Search tenant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.035]"
              onClick={() => void loadData()}
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading tenant usage data…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-slate-500">
                  <th className="pb-3 pr-4">School</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4 min-w-[160px]">Students</th>
                  <th className="pb-3 pr-4 min-w-[120px]">Staff</th>
                  <th className="pb-3 pr-4">Invoices</th>
                  <th className="pb-3">Platform Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(row => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-200">{row.name}</p>
                      <p className="text-[10px] text-slate-500">{row.schema_name}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        row.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300' :
                        row.status === 'TRIAL' ? 'bg-blue-500/15 text-blue-300' :
                        'bg-amber-500/15 text-amber-300'
                      }`}>{row.status}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {row.loadingStats ? (
                        <span className="text-xs text-slate-500">Loading…</span>
                      ) : (
                        <>
                          <p className="mb-1 text-xs text-slate-300">{row.stats?.students_active ?? 0} / {row.max_students}</p>
                          <UsageBar value={row.stats?.students_active ?? 0} max={row.max_students} />
                        </>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {row.loadingStats ? '—' : (row.stats?.staff_active ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {row.loadingStats ? '—' : (row.stats?.invoices_total ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 text-slate-300 text-xs">
                      {row.loadingStats ? '—' : (row.stats?.users_total ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-sm text-slate-400">No tenants found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
