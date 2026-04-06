import { type ChangeEvent, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { downloadBlob, downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type GatewayTx = {
  id: number
  provider: string
  external_id: string
  amount: string
  status: string
  is_reconciled: boolean
  student_name?: string
  invoice_number?: string
  created_at: string
}

type BankLine = {
  id: number
  statement_date: string
  amount: string
  reference: string
  narration: string
  source: string
  status: string
  matched_payment_reference?: string
  matched_gateway_external_id?: string
}

type WebhookEvent = {
  id: number
  provider: string
  event_type: string
  event_id: string
  processed: boolean
  error?: string
  received_at: string
}

type ApiList<T> = { results?: T[] } | T[]
const asList = <T,>(payload: ApiList<T>): T[] => (Array.isArray(payload) ? payload : payload.results ?? [])
const money = (v: string | number | undefined) =>
  Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function FinanceReconciliationPage() {
  const [transactions, setTransactions] = useState<GatewayTx[]>([])
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [lines, setLines] = useState<BankLine[]>([])
  const [lineStatus, setLineStatus] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [actingTxId, setActingTxId] = useState<number | null>(null)
  const [actingLine, setActingLine] = useState<{ lineId: number; action: string } | null>(null)

  const loadData = async () => {
    setBusy(true)
    setError(null)
    try {
      const [txRes, evRes, lineRes] = await Promise.all([
        apiClient.get<ApiList<GatewayTx>>('/finance/gateway/transactions/'),
        apiClient.get<ApiList<WebhookEvent>>('/finance/gateway/events/'),
        apiClient.get<ApiList<BankLine>>('/finance/reconciliation/bank-lines/'),
      ])
      setTransactions(asList(txRes.data))
      setEvents(asList(evRes.data))
      setLines(asList(lineRes.data))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load reconciliation workspace.'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const withLineAction = async (lineId: number, action: 'auto-match' | 'clear' | 'ignore' | 'unmatch') => {
    if (actingLine !== null || actingTxId !== null || busy) return
    setError(null)
    setMessage(null)
    setActingLine({ lineId, action })
    try {
      await apiClient.post(`/finance/reconciliation/bank-lines/${lineId}/${action}/`)
      setMessage(`Line ${action} completed.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, `Line ${action} failed.`))
    } finally {
      setActingLine(null)
    }
  }

  const markReconciled = async (txId: number) => {
    if (actingTxId !== null || actingLine !== null || busy) return
    setError(null)
    setMessage(null)
    setActingTxId(txId)
    try {
      await apiClient.post(`/finance/gateway/transactions/${txId}/mark-reconciled/`)
      setMessage('Transaction marked reconciled.')
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to mark transaction reconciled.'))
    } finally {
      setActingTxId(null)
    }
  }

  const filteredLines = lines.filter((line) => {
    const matchesStatus = !lineStatus || line.status === lineStatus
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || `${line.reference} ${line.narration} ${line.source}`.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const downloadCsv = (rows: string[][], filename: string) => {
    const escaped = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([escaped], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  }

  const exportGatewayCsv = () => {
    const rows = [
      ['id', 'provider', 'external_id', 'amount', 'status', 'is_reconciled', 'student_name', 'invoice_number', 'created_at'],
      ...transactions.map((tx) => [
        String(tx.id),
        tx.provider,
        tx.external_id,
        String(tx.amount),
        tx.status,
        tx.is_reconciled ? 'true' : 'false',
        tx.student_name || '',
        tx.invoice_number || '',
        tx.created_at,
      ]),
    ]
    downloadCsv(rows, 'finance_gateway_transactions.csv')
  }

  const exportEventsCsv = () => {
    const rows = [
      ['id', 'provider', 'event_type', 'event_id', 'processed', 'error', 'received_at'],
      ...events.map((event) => [
        String(event.id),
        event.provider,
        event.event_type,
        event.event_id,
        event.processed ? 'true' : 'false',
        event.error || '',
        event.received_at,
      ]),
    ]
    downloadCsv(rows, 'finance_gateway_events.csv')
  }

  const exportLinesCsv = async () => {
    try {
      const response = await apiClient.get('/finance/reconciliation/bank-lines/export-csv/', { responseType: 'blob' })
      downloadFromResponse(response as { data: Blob; headers?: Record<string, unknown> }, 'finance_bank_statement_lines.csv')
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to export bank statement lines CSV.'))
    }
  }

  const onImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    setError(null)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await apiClient.post('/finance/reconciliation/bank-lines/import-csv/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = response.data as { created?: number; failed?: number }
      setMessage(`Import completed. Created=${data.created ?? 0}, Failed=${data.failed ?? 0}.`)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to import CSV. Ensure columns include statement_date and amount.'))
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Gateway and Reconciliation"
        subtitle="Monitor webhook ingestion, gateway transactions, and bank-line matching/clearing."
        icon="💰"
      />

      {busy ? (
        <div className="col-span-12 rounded-2xl glass-panel p-4 text-sm text-slate-300">
          Loading reconciliation data...
        </div>
      ) : null}
      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">
          {message}
        </div>
      ) : null}

      <section className="col-span-12 xl:col-span-6 rounded-2xl glass-panel p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Gateway Transactions</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
              onClick={exportGatewayCsv}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
              onClick={() => void loadData()}
              disabled={busy || actingLine !== null || actingTxId !== null}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">External ID</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reconciled</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {transactions.map((tx) => (
                <tr key={tx.id} className="bg-slate-950/60">
                  <td className="px-3 py-2">{tx.provider}</td>
                  <td className="px-3 py-2">{tx.external_id}</td>
                  <td className="px-3 py-2">{money(tx.amount)}</td>
                  <td className="px-3 py-2">{tx.status}</td>
                  <td className="px-3 py-2">{tx.is_reconciled ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">
                    {!tx.is_reconciled ? (
                      <button
                        type="button"
                        className="rounded border border-white/[0.09] px-2 py-0.5 text-[11px] text-slate-200"
                        onClick={() => void markReconciled(tx.id)}
                        disabled={actingTxId !== null || actingLine !== null || busy}
                      >
                        {actingTxId === tx.id ? 'Marking...' : 'Mark reconciled'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 ? (
                <tr className="bg-slate-950/60">
                  <td className="px-3 py-4 text-xs text-slate-400" colSpan={6}>
                    No gateway transactions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="col-span-12 xl:col-span-6 rounded-2xl glass-panel p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Webhook Events</h2>
          <button
            type="button"
            className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
            onClick={exportEventsCsv}
          >
            Export CSV
          </button>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Event ID</th>
                <th className="px-3 py-2">Processed</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map((event) => (
                <tr key={event.id} className="bg-slate-950/60">
                  <td className="px-3 py-2">{event.provider}</td>
                  <td className="px-3 py-2">{event.event_type}</td>
                  <td className="px-3 py-2">{event.event_id}</td>
                  <td className="px-3 py-2">{event.processed ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-xs text-rose-300">{event.error || '-'}</td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr className="bg-slate-950/60">
                  <td className="px-3 py-4 text-xs text-slate-400" colSpan={5}>
                    No webhook events recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Bank Statement Lines</h2>
          <div className="flex flex-wrap gap-2">
            <label className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 cursor-pointer">
              {isImporting ? 'Importing...' : 'Import CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void onImportCsv(e)}
                disabled={isImporting || busy || actingLine !== null || actingTxId !== null}
              />
            </label>
            <button
              type="button"
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
              onClick={() => void exportLinesCsv()}
              disabled={isImporting || busy || actingLine !== null || actingTxId !== null}
            >
              Export CSV
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference/narration/source"
              className="w-72 rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            />
            <select
              value={lineStatus}
              onChange={(e) => setLineStatus(e.target.value)}
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            >
              <option value="">All statuses</option>
              <option value="UNMATCHED">UNMATCHED</option>
              <option value="MATCHED">MATCHED</option>
              <option value="CLEARED">CLEARED</option>
              <option value="IGNORED">IGNORED</option>
            </select>
            <button
              type="button"
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
              onClick={() => {
                setSearch('')
                setLineStatus('')
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[1060px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Matched Payment</th>
                <th className="px-3 py-2">Matched Gateway Tx</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLines.map((line) => (
                <tr key={line.id} className="bg-slate-950/60">
                  <td className="px-3 py-2">{line.statement_date}</td>
                  <td className="px-3 py-2">{money(line.amount)}</td>
                  <td className="px-3 py-2">{line.reference || '-'}</td>
                  <td className="px-3 py-2">{line.status}</td>
                  <td className="px-3 py-2">{line.matched_payment_reference || '-'}</td>
                  <td className="px-3 py-2">{line.matched_gateway_external_id || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="rounded border border-white/[0.09] px-2 py-0.5 text-[11px] text-slate-200"
                        onClick={() => void withLineAction(line.id, 'auto-match')}
                        disabled={actingLine !== null || actingTxId !== null || busy}
                      >
                        {actingLine?.lineId === line.id && actingLine.action === 'auto-match'
                          ? 'Working...'
                          : 'Auto-match'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-white/[0.09] px-2 py-0.5 text-[11px] text-slate-200"
                        onClick={() => void withLineAction(line.id, 'clear')}
                        disabled={actingLine !== null || actingTxId !== null || busy}
                      >
                        {actingLine?.lineId === line.id && actingLine.action === 'clear'
                          ? 'Working...'
                          : 'Clear'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-white/[0.09] px-2 py-0.5 text-[11px] text-slate-200"
                        onClick={() => void withLineAction(line.id, 'unmatch')}
                        disabled={actingLine !== null || actingTxId !== null || busy}
                      >
                        {actingLine?.lineId === line.id && actingLine.action === 'unmatch'
                          ? 'Working...'
                          : 'Unmatch'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-white/[0.09] px-2 py-0.5 text-[11px] text-slate-200"
                        onClick={() => void withLineAction(line.id, 'ignore')}
                        disabled={actingLine !== null || actingTxId !== null || busy}
                      >
                        {actingLine?.lineId === line.id && actingLine.action === 'ignore'
                          ? 'Working...'
                          : 'Ignore'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLines.length === 0 ? (
                <tr className="bg-slate-950/60">
                  <td className="px-3 py-4 text-xs text-slate-400" colSpan={7}>
                    No bank statement lines match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
