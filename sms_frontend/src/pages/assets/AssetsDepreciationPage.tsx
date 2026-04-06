import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type DepreciationEntry = {
  id: number; asset: number; asset_name: string; asset_code: string
  period_label: string; depreciation_amount: string; accumulated_depreciation: string
  net_book_value: string; notes: string; created_at: string
}

type RunResult = {
  period_label: string; processed: number; skipped: number
  entries: { asset_code: string; name: string; depreciation_amount: string; net_book_value: string }[]
  skipped_codes: string[]
}

export default function AssetsDepreciationPage() {
  const [records, setRecords] = useState<DepreciationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const [periodLabel, setPeriodLabel] = useState(String(currentYear))
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const [sendingToFinance, setSendingToFinance] = useState<number | null>(null)
  const [financeNotice, setFinanceNotice] = useState<string | null>(null)
  const [financeError, setFinanceError] = useState<string | null>(null)

  const loadRecords = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.get<DepreciationEntry[]>('/assets/depreciation/')
      setRecords(res.data)
    } catch { setError('Unable to load depreciation records.') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadRecords() }, [])

  const handleRun = async (e: FormEvent) => {
    e.preventDefault()
    setIsRunning(true); setRunResult(null); setRunError(null)
    try {
      const res = await apiClient.post<RunResult>('/assets/depreciation/run/', { period_label: periodLabel })
      setRunResult(res.data); loadRecords()
    } catch { setRunError('Failed to run depreciation. Check that assets have categories with a depreciation method set.') }
    finally { setIsRunning(false) }
  }

  const sendToFinance = async (entry: DepreciationEntry) => {
    setSendingToFinance(entry.id); setFinanceError(null); setFinanceNotice(null)
    try {
      await apiClient.post('/finance/expenses/', {
        description: `Depreciation - ${entry.asset_name} (${entry.period_label})`,
        amount: entry.depreciation_amount,
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Depreciation',
        notes: `Asset: ${entry.asset_code} | Period: ${entry.period_label} | Net Book Value: ${entry.net_book_value}`,
      })
      setFinanceNotice(`Depreciation for ${entry.asset_name} sent to Finance.`)
    } catch { setFinanceError('Unable to send to Finance. Check that a Finance expense endpoint is available.') }
    finally { setSendingToFinance(null) }
  }

  const fmt = (v: string | number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <PageHero
        badge="ASSETS & MAINTENANCE"
        badgeColor="orange"
        title="Depreciation Schedule"
        subtitle="IPSAS 17 — Fixed Assets. Run annual depreciation for all active assets with a depreciation method configured on their category (Straight Line or Declining Balance)."
        icon="🏗️"
      />

      {financeNotice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{financeNotice}</div> : null}
      {financeError ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{financeError}</div> : null}

      <form onSubmit={handleRun} className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Run Depreciation</h2>
        <p className="mt-1 text-xs text-slate-400">Each asset can only be depreciated once per period label. Use a year (e.g. "2026") or a quarter (e.g. "2026-Q1").</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Period Label</label>
            <input required placeholder="e.g. 2026" className="w-40 rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2 text-sm" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
          </div>
          <button type="submit" disabled={isRunning} className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50">
            {isRunning ? 'Running…' : 'Run Depreciation'}
          </button>
        </div>
        {runError ? <p className="mt-3 text-xs text-rose-300">{runError}</p> : null}

        {runResult ? (
          <div className="mt-5 rounded-xl border border-white/[0.09] bg-slate-950/60 p-4 text-sm">
            <p className="font-semibold text-slate-200">Period: {runResult.period_label} — {runResult.processed} asset(s) depreciated, {runResult.skipped} skipped</p>
            {runResult.entries.length > 0 ? (
              <table className="mt-3 min-w-full text-left text-xs">
                <thead className="border-b border-white/[0.09] text-slate-400">
                  <tr><th className="pb-2 pr-4">Code</th><th className="pb-2 pr-4">Asset</th><th className="pb-2 pr-4 text-right">Depreciation</th><th className="pb-2 text-right">Net Book Value</th></tr>
                </thead>
                <tbody>
                  {runResult.entries.map((e) => (
                    <tr key={e.asset_code} className="border-b border-white/[0.05]">
                      <td className="py-1.5 pr-4 font-mono text-slate-300">{e.asset_code}</td>
                      <td className="py-1.5 pr-4 text-slate-200">{e.name}</td>
                      <td className="py-1.5 pr-4 text-right text-rose-300">-{fmt(e.depreciation_amount)}</td>
                      <td className="py-1.5 text-right text-emerald-300">{fmt(e.net_book_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {runResult.skipped_codes.length > 0 ? <p className="mt-3 text-xs text-slate-500">Skipped: {runResult.skipped_codes.join(', ')}</p> : null}
          </div>
        ) : null}
      </form>

      <section className="rounded-2xl glass-panel p-6">
        <h2 className="text-sm font-semibold text-slate-200">Depreciation History</h2>
        {error ? <p className="mt-4 text-xs text-rose-300">{error}</p> : null}
        {isLoading ? <p className="mt-4 text-sm text-slate-400">Loading…</p> : records.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No depreciation entries yet. Run depreciation above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.07] text-slate-400">
                <tr>
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">Asset</th>
                  <th className="px-3 py-3 font-medium">Period</th>
                  <th className="px-3 py-3 font-medium text-right">Depreciation</th>
                  <th className="px-3 py-3 font-medium text-right">Accumulated</th>
                  <th className="px-3 py-3 font-medium text-right">Net Book Value</th>
                  <th className="px-3 py-3 font-medium">Method</th>
                  <th className="px-3 py-3 font-medium">Finance</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.05] hover:bg-slate-800/20">
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">{r.asset_code}</td>
                    <td className="px-3 py-3 font-medium text-slate-100">{r.asset_name}</td>
                    <td className="px-3 py-3 text-slate-300">{r.period_label}</td>
                    <td className="px-3 py-3 text-right text-rose-300">-{fmt(r.depreciation_amount)}</td>
                    <td className="px-3 py-3 text-right text-amber-300">{fmt(r.accumulated_depreciation)}</td>
                    <td className="px-3 py-3 text-right text-emerald-300">{fmt(r.net_book_value)}</td>
                    <td className="px-3 py-3 text-xs text-slate-400">{r.notes}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => void sendToFinance(r)}
                        disabled={sendingToFinance === r.id}
                        className="rounded-lg bg-sky-500/10 border border-sky-500/30 px-2 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 whitespace-nowrap"
                      >
                        {sendingToFinance === r.id ? 'Sending…' : '→ Finance'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
