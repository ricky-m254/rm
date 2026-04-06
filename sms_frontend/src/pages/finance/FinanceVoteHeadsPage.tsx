import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'
import { BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

type VoteHead = {
  id: number
  name: string
  description: string
  allocation_percentage: string
  is_preloaded: boolean
  is_active: boolean
  order: number
}

type FormState = {
  name: string
  description: string
  allocation_percentage: string
  is_active: boolean
  order: number
}

type BudgetReportRow = {
  vote_head_id: number
  vote_head_name: string
  allocation_percentage: number
  budgeted_amount: number
  actual_collected: number
  variance: number
  utilization_pct: number | null
  status: 'OVER' | 'UNDER'
}

type BudgetReport = {
  date_from: string | null
  date_to: string | null
  total_annual_budget: number
  total_budgeted_via_allocation: number
  total_actual_collected: number
  overall_variance: number
  overall_utilization_pct: number | null
  rows: BudgetReportRow[]
}

const blank: FormState = { name: '', description: '', allocation_percentage: '0.00', is_active: true, order: 0 }

const fmtKsh = (n: number) => `Ksh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

const extractApiError = (err: unknown, fallback: string) => {
  const res = err as { response?: { status?: number; data?: unknown } }
  const status = res?.response?.status
  const data = res?.response?.data
  if (status === 500) return 'A server error occurred. Please try again or contact support.'
  if (typeof data === 'string' && data.trim() && !data.trimStart().startsWith('<')) return data
  if (data && typeof data === 'object') {
    const msgs = Object.values(data as Record<string, unknown>).flat()
    if (msgs.length) return (msgs as string[]).join(' ')
  }
  return fallback
}

export default function FinanceVoteHeadsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<VoteHead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<VoteHead | null>(null)
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<VoteHead | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  // Tabs
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list')

  // Budget report
  const [report, setReport] = useState<BudgetReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportDateFrom, setReportDateFrom] = useState('')
  const [reportDateTo, setReportDateTo] = useState('')

  const load = () => {
    setLoading(true)
    apiClient.get('/finance/vote-heads/').then(r => {
      setRows(r.data.results ?? r.data)
      setLoading(false)
    }).catch(() => { setError('Failed to load vote heads.'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const loadReport = async () => {
    setReportLoading(true)
    setReportError('')
    try {
      const params = new URLSearchParams()
      if (reportDateFrom) params.set('date_from', reportDateFrom)
      if (reportDateTo) params.set('date_to', reportDateTo)
      const res = await apiClient.get(`/finance/reports/vote-head-budget/?${params}`)
      setReport(res.data)
    } catch {
      setReportError('Failed to load budget report.')
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'report' && !report) void loadReport()
  }, [activeTab])

  const openCreate = () => { setEditing(null); setForm(blank); setSaveError(''); setShowForm(true) }
  const openEdit = (vh: VoteHead) => {
    setEditing(vh)
    setForm({ name: vh.name, description: vh.description, allocation_percentage: vh.allocation_percentage, is_active: vh.is_active, order: vh.order })
    setSaveError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true); setSaveError('')
    try {
      if (editing) await apiClient.patch(`/finance/vote-heads/${editing.id}/`, form)
      else await apiClient.post('/finance/vote-heads/', form)
      setShowForm(false); load()
    } catch (err) { setSaveError(extractApiError(err, 'Failed to save.')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await apiClient.delete(`/finance/vote-heads/${deleteTarget.id}/`)
    setDeleteTarget(null); load()
  }

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg('')
    try {
      const r = await apiClient.post('/finance/vote-heads/seed-defaults/')
      setSeedMsg(r.data.message || 'Done.'); load()
    } catch { setSeedMsg('Seeding failed.') }
    finally { setSeeding(false) }
  }

  const totalPct = rows.reduce((s, vh) => s + parseFloat(vh.allocation_percentage || '0'), 0)

  const utilizationColor = (pct: number | null) => {
    if (pct === null) return 'text-slate-500'
    if (pct >= 100) return 'text-rose-400'
    if (pct >= 80) return 'text-amber-400'
    return 'text-emerald-400'
  }

  const varianceColor = (v: number) => v >= 0 ? 'text-emerald-400' : 'text-rose-400'

  const utilizationBar = (pct: number | null) => {
    const w = Math.min(Math.max(pct ?? 0, 0), 100)
    const color = (pct ?? 0) >= 100 ? 'bg-rose-500' : (pct ?? 0) >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
    return (
      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${w}%` }} />
      </div>
    )
  }

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Vote Heads"
        subtitle="Budget categories, expenditure codes, and budget vs actual reports"
        icon="💰"
      />

      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <button
          onClick={() => navigate('/modules/finance')}
          className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition"
        >
          ← Back to Finance
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Vote Heads</h1>
            <p className="mt-1 text-sm text-slate-400">
              Define allocation categories — Tuition, Exam, Medical, Activity, Boarding/Meals, Development, Arrears
            </p>
          </div>
          {activeTab === 'list' && (
            <div className="flex gap-2">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {seeding ? 'Seeding…' : 'Seed Defaults'}
              </button>
              <button
                onClick={openCreate}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                + Add Vote Head
              </button>
            </div>
          )}
        </div>
        {seedMsg && (
          <p className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
            {seedMsg}
          </p>
        )}
        {activeTab === 'list' && totalPct > 0 && (
          <p className={`mt-3 rounded-xl border px-4 py-2 text-xs ${Math.abs(totalPct - 100) < 0.01 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`}>
            Total allocation: <strong>{totalPct.toFixed(2)}%</strong>
            {Math.abs(totalPct - 100) < 0.01 ? ' — fully allocated ✓' : ' — allocations should sum to 100%'}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-white/[0.07]">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'list' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Vote Heads
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'report' ? 'border-violet-400 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <BarChart3 size={14} />
            Budget vs Actual Report
          </button>
        </div>
      </header>

      {/* ── Vote Heads List Tab ─────────────────────────────── */}
      {activeTab === 'list' && (
        <section className="col-span-12 rounded-2xl glass-panel p-6">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4 text-left">Order</th>
                    <th className="pb-3 pr-4 text-left">Name</th>
                    <th className="pb-3 pr-4 text-left">Description</th>
                    <th className="pb-3 pr-4 text-right">Allocation %</th>
                    <th className="pb-3 pr-4 text-center">Status</th>
                    <th className="pb-3 pr-4 text-center">Type</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-500">No vote heads yet. Click &quot;Seed Defaults&quot; to add the standard set.</td></tr>
                  )}
                  {rows.map(vh => (
                    <tr key={vh.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 pr-4 text-slate-400">{vh.order}</td>
                      <td className="py-3 pr-4 font-medium text-white">{vh.name}</td>
                      <td className="py-3 pr-4 text-slate-400">{vh.description || '—'}</td>
                      <td className="py-3 pr-4 text-right font-mono text-emerald-400">{parseFloat(vh.allocation_percentage).toFixed(2)}%</td>
                      <td className="py-3 pr-4 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${vh.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                          {vh.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {vh.is_preloaded
                          ? <span className="text-xs text-blue-400">System</span>
                          : <span className="text-xs text-slate-500">Custom</span>}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => openEdit(vh)} className="text-xs text-slate-400 hover:text-white transition">Edit</button>
                          <button onClick={() => setDeleteTarget(vh)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Budget Report Tab ───────────────────────────────── */}
      {activeTab === 'report' && (
        <section className="col-span-12 space-y-6">
          {/* Filters */}
          <div className="rounded-2xl glass-panel p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Date From</label>
                <input
                  type="date"
                  className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  value={reportDateFrom}
                  onChange={e => setReportDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Date To</label>
                <input
                  type="date"
                  className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  value={reportDateTo}
                  onChange={e => setReportDateTo(e.target.value)}
                />
              </div>
              <button
                onClick={() => void loadReport()}
                disabled={reportLoading}
                className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw size={13} className={reportLoading ? 'animate-spin' : ''} />
                {reportLoading ? 'Loading…' : 'Generate Report'}
              </button>
            </div>
            {reportError && <p className="mt-2 text-xs text-red-400">{reportError}</p>}
          </div>

          {report && (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl glass-panel p-5">
                  <p className="text-xs uppercase text-slate-500">Total Annual Budget</p>
                  <p className="mt-2 text-lg font-bold text-white">{fmtKsh(report.total_annual_budget)}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">From active budgets</p>
                </div>
                <div className="rounded-2xl glass-panel p-5">
                  <p className="text-xs uppercase text-slate-500">Allocated Budget</p>
                  <p className="mt-2 text-lg font-bold text-white">{fmtKsh(report.total_budgeted_via_allocation)}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Sum of vote head budgets</p>
                </div>
                <div className="rounded-2xl glass-panel p-5">
                  <p className="text-xs uppercase text-slate-500">Actual Collected</p>
                  <p className={`mt-2 text-lg font-bold ${varianceColor(report.total_actual_collected)}`}>
                    {fmtKsh(report.total_actual_collected)}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Sum of allocations</p>
                </div>
                <div className="rounded-2xl glass-panel p-5">
                  <p className="text-xs uppercase text-slate-500">Overall Utilization</p>
                  <p className={`mt-2 text-lg font-bold ${utilizationColor(report.overall_utilization_pct)}`}>
                    {report.overall_utilization_pct !== null ? `${report.overall_utilization_pct.toFixed(1)}%` : '—'}
                  </p>
                  <div className="mt-1">{utilizationBar(report.overall_utilization_pct)}</div>
                </div>
              </div>

              {/* Overall variance */}
              <div className={`rounded-2xl border p-5 ${report.overall_variance >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <div className="flex items-center gap-3">
                  {report.overall_variance >= 0
                    ? <TrendingUp size={20} className="text-emerald-400 flex-shrink-0" />
                    : <TrendingDown size={20} className="text-rose-400 flex-shrink-0" />}
                  <div>
                    <p className={`font-bold text-lg ${varianceColor(report.overall_variance)}`}>
                      {report.overall_variance >= 0 ? '+' : ''}{fmtKsh(report.overall_variance)} overall variance
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {report.overall_variance >= 0
                        ? 'Actual collections exceed the allocated budget — revenue is ahead of target.'
                        : 'Actual collections are below the allocated budget — shortfall requires attention.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Per-vote-head table */}
              <div className="rounded-2xl glass-panel p-6">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={16} className="text-violet-400" />
                  Vote Head Analysis
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                        <th className="pb-3 pr-5 text-left">Vote Head</th>
                        <th className="pb-3 pr-5 text-right">Alloc %</th>
                        <th className="pb-3 pr-5 text-right">Budgeted</th>
                        <th className="pb-3 pr-5 text-right">Actual</th>
                        <th className="pb-3 pr-5 text-right">Variance</th>
                        <th className="pb-3 pr-5 text-right">Utilization</th>
                        <th className="pb-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {report.rows.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-slate-500">No data available for the selected period.</td></tr>
                      )}
                      {report.rows.map(r => (
                        <tr key={r.vote_head_id} className="hover:bg-white/[0.02] transition">
                          <td className="py-4 pr-5">
                            <p className="font-medium text-white">{r.vote_head_name}</p>
                          </td>
                          <td className="py-4 pr-5 text-right">
                            <span className="font-mono text-xs text-slate-400">{r.allocation_percentage.toFixed(2)}%</span>
                          </td>
                          <td className="py-4 pr-5 text-right">
                            <span className="font-mono text-sm text-slate-300">{fmtKsh(r.budgeted_amount)}</span>
                          </td>
                          <td className="py-4 pr-5 text-right">
                            <span className={`font-mono text-sm font-medium ${r.actual_collected > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                              {fmtKsh(r.actual_collected)}
                            </span>
                          </td>
                          <td className="py-4 pr-5 text-right">
                            <span className={`font-mono text-sm font-bold ${varianceColor(r.variance)}`}>
                              {r.variance >= 0 ? '+' : ''}{fmtKsh(r.variance)}
                            </span>
                          </td>
                          <td className="py-4 pr-5">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-mono ${utilizationColor(r.utilization_pct)}`}>
                                {r.utilization_pct !== null ? `${r.utilization_pct.toFixed(1)}%` : '—'}
                              </span>
                              {utilizationBar(r.utilization_pct)}
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            {r.budgeted_amount === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-700 text-slate-400">
                                <Minus size={10} /> No Budget
                              </span>
                            ) : r.status === 'OVER' ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300">
                                <TrendingUp size={10} /> On Track
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-300">
                                <TrendingDown size={10} /> Under Target
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {report.rows.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-white/[0.09] font-bold">
                          <td className="pt-3 pr-5 text-white text-sm">Totals</td>
                          <td className="pt-3 pr-5 text-right font-mono text-xs text-slate-400">{totalPct.toFixed(2)}%</td>
                          <td className="pt-3 pr-5 text-right font-mono text-sm text-slate-200">{fmtKsh(report.total_budgeted_via_allocation)}</td>
                          <td className="pt-3 pr-5 text-right font-mono text-sm text-emerald-400">{fmtKsh(report.total_actual_collected)}</td>
                          <td className={`pt-3 pr-5 text-right font-mono text-sm font-bold ${varianceColor(report.overall_variance)}`}>
                            {report.overall_variance >= 0 ? '+' : ''}{fmtKsh(report.overall_variance)}
                          </td>
                          <td className={`pt-3 pr-5 text-right font-mono text-sm ${utilizationColor(report.overall_utilization_pct)}`}>
                            {report.overall_utilization_pct !== null ? `${report.overall_utilization_pct.toFixed(1)}%` : '—'}
                          </td>
                          <td className="pt-3" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Narrative analysis */}
              <div className="rounded-2xl glass-panel p-6">
                <h3 className="text-sm font-bold text-white mb-4">Detailed Analysis</h3>
                <div className="space-y-3">
                  {report.rows.map(r => {
                    const atRisk = r.budgeted_amount > 0 && (r.utilization_pct ?? 0) < 50 && r.actual_collected === 0
                    const overPerforming = r.budgeted_amount > 0 && r.actual_collected > r.budgeted_amount
                    if (!atRisk && !overPerforming) return null
                    return (
                      <div
                        key={r.vote_head_id}
                        className={`rounded-xl border p-4 ${overPerforming ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}
                      >
                        <p className={`text-xs font-semibold ${overPerforming ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {overPerforming ? '✓ Over-performing:' : '⚠ At risk:'} {r.vote_head_name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {overPerforming
                            ? `Collected ${fmtKsh(r.actual_collected)} against a budget of ${fmtKsh(r.budgeted_amount)} — exceeds target by ${fmtKsh(r.variance)}.`
                            : `No collections recorded yet against a budget of ${fmtKsh(r.budgeted_amount)}. Requires immediate attention to meet targets.`}
                        </p>
                      </div>
                    )
                  }).filter(Boolean)}
                  {report.rows.every(r => {
                    if (r.budgeted_amount === 0) return true
                    const util = r.utilization_pct ?? 0
                    return util >= 50 && r.actual_collected <= r.budgeted_amount
                  }) && (
                    <p className="text-xs text-slate-500 text-center py-4">
                      All vote heads are performing within expected ranges.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {!report && !reportLoading && (
            <div className="rounded-2xl glass-panel p-12 text-center">
              <BarChart3 size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Click "Generate Report" to compare budget vs actual collections per vote head.</p>
            </div>
          )}
        </section>
      )}

      {/* ── Edit/Create Form Modal ──────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {editing ? 'Edit Vote Head' : 'Add Vote Head'}
            </h2>
            {saveError && <p className="mb-3 text-sm text-red-400">{saveError}</p>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Name</label>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Description</label>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Allocation % <span className="text-slate-600">(0 = not auto-split)</span></label>
                <input type="number" min="0" max="100" step="0.01" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.allocation_percentage} onChange={e => setForm(f => ({ ...f, allocation_percentage: e.target.value }))} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-400">Display Order</label>
                  <input type="number" min="0" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input type="checkbox" id="vh-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-emerald-500" />
                  <label htmlFor="vh-active" className="text-sm text-slate-300">Active</label>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Vote Head"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
