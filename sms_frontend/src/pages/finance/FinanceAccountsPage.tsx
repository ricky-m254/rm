import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import PageHero from '../../components/PageHero'

type AccountingAccount = {
  id: number
  code: string
  name: string
  account_type: string
  is_active: boolean
}

type AccountingPeriod = {
  id: number
  name: string
  start_date: string
  end_date: string
  is_closed: boolean
}

type TrialBalanceRow = {
  account_id: number
  code: string
  name: string
  type: string
  debit: number
  credit: number
}

type TrialBalanceResponse = {
  rows: TrialBalanceRow[]
  total_debit: number
  total_credit: number
  is_balanced: boolean
}

type LedgerRow = {
  entry_id: number
  entry_date: string
  memo: string
  source_type: string
  source_id: number | null
  debit: number
  credit: number
  running_balance: number
}

type LedgerResponse = {
  account_id: number
  rows: LedgerRow[]
  closing_balance: number
}

type ApiListResponse<T> = { results?: T[] } | T[]

function asList<T>(payload: ApiListResponse<T>): T[] {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
    const first = Object.values(data as Record<string, unknown>).find((value) =>
      Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0,
    )
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

const money = (value: number | string | undefined) =>
  Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function FinanceAccountsPage() {
  const role = useAuthStore((state) => state.role)
  const canManagePeriods = role === 'ADMIN' || role === 'TENANT_SUPER_ADMIN'
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [ledgerBusy, setLedgerBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [periodActionId, setPeriodActionId] = useState<number | null>(null)

  const loadCore = async () => {
    setBusy(true)
    setError(null)
    try {
      const [accountsRes, periodsRes, trialRes] = await Promise.all([
        apiClient.get<ApiListResponse<AccountingAccount>>('/finance/accounting/accounts/'),
        apiClient.get<ApiListResponse<AccountingPeriod>>('/finance/accounting/periods/'),
        apiClient.get<TrialBalanceResponse>('/finance/accounting/trial-balance/'),
      ])
      const accountsData = asList(accountsRes.data).filter((a) => a.is_active)
      setAccounts(accountsData)
      setPeriods(asList(periodsRes.data))
      setTrialBalance(trialRes.data)
      if (!selectedAccountId && accountsData.length > 0) {
        setSelectedAccountId(accountsData[0].id)
      }
    } catch (err) {
      setError(extractApiError(err, 'Unable to load accounting workspace.'))
    } finally {
      setBusy(false)
    }
  }

  const loadLedger = async (accountId: number) => {
    setLedgerBusy(true)
    setError(null)
    try {
      const response = await apiClient.get<LedgerResponse>(`/finance/accounting/ledger/?account_id=${accountId}`)
      setLedger(response.data)
    } catch (err) {
      setLedger(null)
      setError(extractApiError(err, 'Unable to load ledger for selected account.'))
    } finally {
      setLedgerBusy(false)
    }
  }

  useEffect(() => {
    void loadCore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedAccountId) return
    void loadLedger(selectedAccountId)
  }, [selectedAccountId])

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((a) => `${a.code} ${a.name} ${a.account_type}`.toLowerCase().includes(q))
  }, [accounts, search])

  const closePeriod = async (periodId: number) => {
    if (periodActionId !== null || busy || ledgerBusy) return
    setError(null)
    setMessage(null)
    setPeriodActionId(periodId)
    try {
      await apiClient.post(`/finance/accounting/periods/${periodId}/close/`)
      setMessage('Period closed.')
      await loadCore()
    } catch (err) {
      setError(extractApiError(err, 'Unable to close period (admin role required).'))
    } finally {
      setPeriodActionId(null)
    }
  }

  const reopenPeriod = async (periodId: number) => {
    if (periodActionId !== null || busy || ledgerBusy) return
    setError(null)
    setMessage(null)
    setPeriodActionId(periodId)
    try {
      await apiClient.post(`/finance/accounting/periods/${periodId}/reopen/`)
      setMessage('Period reopened.')
      await loadCore()
    } catch (err) {
      setError(extractApiError(err, 'Unable to reopen period (admin role required).'))
    } finally {
      setPeriodActionId(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Accounting Workspace"
        subtitle="Trial balance, period controls, and account ledger from live journal entries."
        icon="💰"
      />

      {busy ? (
        <div className="col-span-12 rounded-2xl glass-panel p-4 text-sm text-slate-300">
          Loading accounting data...
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

      <section className="col-span-12 lg:col-span-4 rounded-2xl glass-panel p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Chart of Accounts</h2>
          <button
            className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
            onClick={() => void loadCore()}
            disabled={busy || ledgerBusy || periodActionId !== null}
          >
            Refresh
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code/name/type"
          className="mt-3 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          className="mt-2 rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
          onClick={() => setSearch('')}
        >
          Reset search
        </button>
        <div className="mt-3 max-h-[26rem] overflow-y-auto rounded-xl border border-white/[0.07]">
          {filteredAccounts.map((account) => {
            const active = selectedAccountId === account.id
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccountId(account.id)}
                className={`w-full border-b border-white/[0.07] px-3 py-2 text-left last:border-b-0 ${
                  active ? 'bg-emerald-500/10' : 'bg-slate-950/60'
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  {account.code} - {account.name}
                </p>
                <p className="text-xs text-slate-400">{account.account_type}</p>
              </button>
            )
          })}
          {filteredAccounts.length === 0 ? (
            <p className="p-4 text-xs text-slate-400">No accounts found.</p>
          ) : null}
        </div>
      </section>

      <section className="col-span-12 lg:col-span-8 rounded-2xl glass-panel p-5">
        <h2 className="text-base font-semibold">Trial Balance</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Debit</th>
                <th className="px-3 py-2">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {trialBalance?.rows.map((row) => (
                <tr key={row.account_id} className="bg-slate-950/60">
                  <td className="px-3 py-2">{row.code}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2">{money(row.debit)}</td>
                  <td className="px-3 py-2">{money(row.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
          <span>Total Debit: {money(trialBalance?.total_debit)}</span>
          <span>Total Credit: {money(trialBalance?.total_credit)}</span>
          <span className={trialBalance?.is_balanced ? 'text-emerald-300' : 'text-rose-300'}>
            {trialBalance?.is_balanced ? 'Balanced' : 'Not balanced'}
          </span>
        </div>
      </section>

      <section className="col-span-12 lg:col-span-4 rounded-2xl glass-panel p-5">
        <h2 className="text-base font-semibold">Accounting Periods</h2>
        <div className="mt-3 space-y-2">
          {periods.map((period) => (
            <div key={period.id} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">
              <p className="text-sm font-semibold text-white">{period.name}</p>
              <p className="text-xs text-slate-400">
                {period.start_date} to {period.end_date}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[11px] ${
                    period.is_closed ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  {period.is_closed ? 'Closed' : 'Open'}
                </span>
                {period.is_closed ? (
                  <button
                    type="button"
                    className="rounded border border-white/[0.09] px-2 py-0.5 text-[11px] text-slate-200"
                    onClick={() => void reopenPeriod(period.id)}
                    disabled={!canManagePeriods || periodActionId !== null || busy || ledgerBusy}
                  >
                    {periodActionId === period.id ? 'Working...' : 'Reopen'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded border border-white/[0.09] px-2 py-0.5 text-[11px] text-slate-200"
                    onClick={() => void closePeriod(period.id)}
                    disabled={!canManagePeriods || periodActionId !== null || busy || ledgerBusy}
                  >
                    {periodActionId === period.id ? 'Working...' : 'Close'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {periods.length === 0 ? <p className="text-xs text-slate-400">No accounting periods yet.</p> : null}
        </div>
      </section>

      <section className="col-span-12 lg:col-span-8 rounded-2xl glass-panel p-5">
        <h2 className="text-base font-semibold">Ledger</h2>
        <p className="mt-1 text-xs text-slate-400">
          {selectedAccountId ? `Account ID: ${selectedAccountId}` : 'Select an account to view entries.'}
        </p>
        {ledgerBusy ? <p className="mt-2 text-xs text-slate-400">Loading ledger...</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Memo</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Debit</th>
                <th className="px-3 py-2">Credit</th>
                <th className="px-3 py-2">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ledger?.rows.map((row, idx) => (
                <tr key={`${row.entry_id}-${idx}`} className="bg-slate-950/60">
                  <td className="px-3 py-2">{row.entry_date}</td>
                  <td className="px-3 py-2">{row.memo || '-'}</td>
                  <td className="px-3 py-2">{row.source_type || '-'}</td>
                  <td className="px-3 py-2">{money(row.debit)}</td>
                  <td className="px-3 py-2">{money(row.credit)}</td>
                  <td className="px-3 py-2">{money(row.running_balance)}</td>
                </tr>
              ))}
              {!ledger || ledger.rows.length === 0 ? (
                <tr className="bg-slate-950/60">
                  <td className="px-3 py-4 text-xs text-slate-400" colSpan={6}>
                    No ledger entries for this account.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-300">Closing balance: {money(ledger?.closing_balance)}</p>
      </section>
      {!canManagePeriods ? (
        <div className="col-span-12 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          Period close/reopen controls are restricted to `ADMIN` or `TENANT_SUPER_ADMIN`.
        </div>
      ) : null}
    </div>
  )
}
