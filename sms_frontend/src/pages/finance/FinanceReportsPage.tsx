import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { downloadBlob, extractFilename } from '../../utils/download'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type FinanceSummary = {
  revenue_billed?: number
  cash_collected?: number
  total_expenses?: number
  net_profit?: number
  outstanding_receivables?: number
  active_students_count?: number
}

type AgingBuckets = {
  [key: string]: { count: number; amount: number }
}

type AgingResponse = {
  as_of: string
  buckets: AgingBuckets
}

type OverdueRow = {
  invoice_id: number
  invoice_number: string
  student_name: string
  admission_number: string
  due_date: string
  status: string
  balance_due: number
  overdue_days: number
}

type OverdueResponse = {
  count: number
  results: OverdueRow[]
}

type BudgetVarianceRow = {
  budget_id: number
  academic_year: string
  term: string
  monthly_budget: number
  quarterly_budget: number
  annual_budget: number
  total_actual_spend: number
  variance: number
  utilization_pct: number | null
  status: 'UNDER' | 'OVER'
}

type BudgetCategoryRow = {
  category: string
  actual: number
}

type BudgetVarianceResponse = {
  rows: BudgetVarianceRow[]
  by_category: BudgetCategoryRow[]
  total_actual: number
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

const reports = [
  {
    id: 'income-statement',
    title: 'Income Statement (P&L)',
    description: 'Revenue, expenses, and net profit by period.',
    exportMode: 'none' as const,
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity snapshot.',
    exportMode: 'none' as const,
  },
  {
    id: 'cashflow',
    title: 'Cash Flow Statement',
    description: 'Operating, investing, and financing activities.',
    exportMode: 'none' as const,
  },
  {
    id: 'debtors-aging',
    title: 'Debtors Aging Report',
    description: 'Outstanding balances by aging bucket.',
    exportMode: 'aging' as const,
  },
  {
    id: 'collection-report',
    title: 'Collections Report',
    description: 'Payment volume and collection rate trends.',
    exportMode: 'overdue' as const,
  },
  {
    id: 'budget-variance',
    title: 'Budget Variance Report',
    description: 'Budget vs actual spend by category.',
    exportMode: 'none' as const,
  },
  {
    id: 'student-ledger',
    title: 'Student Account Statement',
    description: 'Ledger of invoices, payments, and adjustments.',
    exportMode: 'student-ledger' as const,
  },
  {
    id: 'vote-head-allocation',
    title: 'Vote Head Allocation Report',
    description: 'How payments are distributed across vote heads (Tuition, Exam, Medical, etc.).',
    exportMode: 'vote-head' as const,
  },
  {
    id: 'class-balances',
    title: 'Class Balances Report',
    description: 'Outstanding balances grouped by class/stream.',
    exportMode: 'class-balances' as const,
  },
  {
    id: 'arrears-by-term',
    title: 'Arrears by Term Report',
    description: 'Total outstanding arrears summarised per term.',
    exportMode: 'arrears-term' as const,
  },
]

const toCurrency = (value: number | undefined) => {
  const amount = Number(value ?? 0)
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FinanceReportsPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [aging, setAging] = useState<AgingResponse | null>(null)
  const [installmentAging, setInstallmentAging] = useState<AgingResponse | null>(null)
  const [overdue, setOverdue] = useState<OverdueRow[]>([])
  const [search, setSearch] = useState('')
  const [collectionsBusy, setCollectionsBusy] = useState(false)
  const [collectionsMessage, setCollectionsMessage] = useState<string | null>(null)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)
  const [budgetVariance, setBudgetVariance] = useState<BudgetVarianceResponse | null>(null)
  const [budgetVarianceBusy, setBudgetVarianceBusy] = useState(false)
  const [budgetVarianceError, setBudgetVarianceError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadSummary = async () => {
      try {
        const response = await apiClient.get<FinanceSummary>('/finance/summary/')
        if (!isMounted) return
        setSummary(response.data)
        setError(null)
      } catch (err) {
        if (!isMounted) return
        setSummary(null)
        setError(extractApiError(err, 'Finance summary is unavailable.'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadSummary()
    return () => {
      isMounted = false
    }
  }, [])

  const loadCollections = async (searchValue = '') => {
    try {
      setCollectionsError(null)
      const [agingRes, installmentAgingRes, overdueRes] = await Promise.all([
        apiClient.get<AgingResponse>('/finance/reports/receivables-aging/'),
        apiClient.get<AgingResponse>('/finance/reports/installments-aging/'),
        apiClient.get<OverdueResponse>(`/finance/reports/overdue-accounts/${searchValue ? `?search=${encodeURIComponent(searchValue)}` : ''}`),
      ])
      setAging(agingRes.data)
      setInstallmentAging(installmentAgingRes.data)
      setOverdue(overdueRes.data.results ?? [])
    } catch (err) {
      setAging(null)
      setInstallmentAging(null)
      setOverdue([])
      setCollectionsError(extractApiError(err, 'Unable to load collections data.'))
    }
  }

  useEffect(() => {
    void loadCollections()
  }, [])

  const loadBudgetVariance = async () => {
    setBudgetVarianceBusy(true)
    setBudgetVarianceError(null)
    try {
      const res = await apiClient.get<BudgetVarianceResponse>('/finance/reports/budget-variance/')
      setBudgetVariance(res.data)
    } catch (err) {
      setBudgetVarianceError(extractApiError(err, 'Unable to load budget variance report.'))
    } finally {
      setBudgetVarianceBusy(false)
    }
  }

  const handleDownload = async (format: 'csv' | 'pdf') => {
    if (isDownloading) return
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const response = await apiClient.get(`/finance/reports/summary/export/${format}/`, {
        responseType: 'blob',
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName = format === 'csv' ? 'finance_summary_report.csv' : 'finance_summary_report.pdf'
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch (err) {
      setDownloadError(extractApiError(err, `Unable to download finance ${format.toUpperCase()} report.`))
    } finally {
      setIsDownloading(false)
    }
  }

  const sendInvoiceReminder = async (invoiceId: number) => {
    if (collectionsBusy) return
    setCollectionsBusy(true)
    setCollectionsMessage(null)
    setCollectionsError(null)
    try {
      await apiClient.post(`/finance/invoices/${invoiceId}/send-reminder/`, { channel: 'EMAIL' })
      setCollectionsMessage(`Reminder sent for invoice #${invoiceId}.`)
    } catch (err) {
      setCollectionsError(extractApiError(err, `Failed to send reminder for invoice #${invoiceId}.`))
    } finally {
      setCollectionsBusy(false)
    }
  }

  const sendBulkOverdueReminders = async () => {
    if (collectionsBusy) return
    setCollectionsBusy(true)
    setCollectionsMessage(null)
    setCollectionsError(null)
    try {
      const response = await apiClient.post('/finance/reminders/send-overdue/', { channel: 'EMAIL' })
      const data = response.data as { invoices?: number; messages_sent?: number }
      setCollectionsMessage(`Bulk reminders sent. Invoices=${data.invoices ?? 0}, messages=${data.messages_sent ?? 0}.`)
    } catch (err) {
      setCollectionsError(extractApiError(err, 'Bulk reminder run failed.'))
    } finally {
      setCollectionsBusy(false)
    }
  }

  const sendScheduledReminders = async (mode: 'PRE_DUE' | 'DUE' | 'OVERDUE') => {
    if (collectionsBusy) return
    setCollectionsBusy(true)
    setCollectionsMessage(null)
    setCollectionsError(null)
    try {
      const response = await apiClient.post('/finance/reminders/send-scheduled/', {
        channel: 'EMAIL',
        mode,
        days_before: 3,
      })
      const data = response.data as { invoices?: number; messages_sent?: number; mode?: string }
      setCollectionsMessage(
        `Scheduled reminders (${data.mode ?? mode}) sent. Invoices=${data.invoices ?? 0}, messages=${data.messages_sent ?? 0}.`,
      )
    } catch (err) {
      setCollectionsError(extractApiError(err, 'Scheduled reminder run failed.'))
    } finally {
      setCollectionsBusy(false)
    }
  }

  const sendInstallmentScheduledReminders = async (mode: 'PRE_DUE' | 'DUE' | 'OVERDUE') => {
    if (collectionsBusy) return
    setCollectionsBusy(true)
    setCollectionsMessage(null)
    setCollectionsError(null)
    try {
      const response = await apiClient.post('/finance/reminders/send-installment-scheduled/', {
        channel: 'EMAIL',
        mode,
        days_before: 3,
      })
      const data = response.data as { installments?: number; messages_sent?: number; mode?: string }
      setCollectionsMessage(
        `Installment reminders (${data.mode ?? mode}) sent. Installments=${data.installments ?? 0}, messages=${data.messages_sent ?? 0}.`,
      )
    } catch (err) {
      setCollectionsError(extractApiError(err, 'Installment reminder run failed.'))
    } finally {
      setCollectionsBusy(false)
    }
  }

  const previewLateFees = async () => {
    if (collectionsBusy) return
    setCollectionsBusy(true)
    setCollectionsMessage(null)
    setCollectionsError(null)
    try {
      const response = await apiClient.post('/finance/late-fee-rules/apply/', { dry_run: true })
      const data = response.data as { would_update?: number; estimated_total?: number }
      setCollectionsMessage(
        `Late-fee preview: installments=${data.would_update ?? 0}, estimated total=${toCurrency(Number(data.estimated_total ?? 0))}.`,
      )
    } catch (err) {
      setCollectionsError(extractApiError(err, 'Late-fee preview failed.'))
    } finally {
      setCollectionsBusy(false)
    }
  }

  const applyLateFees = async () => {
    if (collectionsBusy) return
    setCollectionsBusy(true)
    setCollectionsMessage(null)
    setCollectionsError(null)
    try {
      const response = await apiClient.post('/finance/late-fee-rules/apply/', { dry_run: false })
      const data = response.data as { updated?: number }
      setCollectionsMessage(`Late fees applied to ${data.updated ?? 0} installment(s).`)
      await loadCollections(search)
    } catch (err) {
      setCollectionsError(extractApiError(err, 'Late-fee apply failed.'))
    } finally {
      setCollectionsBusy(false)
    }
  }

  const exportCollectionsCsv = async (type: 'aging' | 'overdue') => {
    if (collectionsBusy) return
    setCollectionsError(null)
    const endpoint =
      type === 'aging'
        ? '/finance/reports/receivables-aging/export/csv/'
        : `/finance/reports/overdue-accounts/export/csv/${search ? `?search=${encodeURIComponent(search)}` : ''}`
    try {
      const response = await apiClient.get(endpoint, { responseType: 'blob' })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const fallback = type === 'aging' ? 'finance_receivables_aging.csv' : 'finance_overdue_accounts.csv'
      const filename = extractFilename(contentDisposition, fallback)
      downloadBlob(response.data as Blob, filename)
    } catch (err) {
      setCollectionsError(extractApiError(err, `Failed to export ${type} CSV.`))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Finance Reports"
        subtitle="Income statements, balance sheets and forecasts"
        icon="💰"
      />
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
            <h1 className="mt-2 text-2xl font-display font-semibold">Reports</h1>
            <p className="mt-2 text-sm text-slate-400">Live finance summary with CSV/PDF export.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownload('csv')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download CSV'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownload('pdf')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading finance summary...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          {error}
        </div>
      ) : null}

      {downloadError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {downloadError}
        </div>
      ) : null}

      <section className="col-span-12 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Revenue Billed</p>
          <p className="mt-2 text-xl font-semibold">{toCurrency(summary?.revenue_billed)}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Cash Collected</p>
          <p className="mt-2 text-xl font-semibold">{toCurrency(summary?.cash_collected)}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Total Expenses</p>
          <p className="mt-2 text-xl font-semibold">{toCurrency(summary?.total_expenses)}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Net Profit</p>
          <p className="mt-2 text-xl font-semibold">{toCurrency(summary?.net_profit)}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Outstanding</p>
          <p className="mt-2 text-xl font-semibold">{toCurrency(summary?.outstanding_receivables)}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Active Students</p>
          <p className="mt-2 text-xl font-semibold">{summary?.active_students_count ?? 0}</p>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-white/[0.07] bg-slate-950/60 p-4">
              <h3 className="text-base font-semibold text-white">{report.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{report.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.exportMode === 'aging' ? (
                  <button
                    className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => void exportCollectionsCsv('aging')}
                    disabled={collectionsBusy}
                  >
                    Export Aging CSV
                  </button>
                ) : null}
                {report.exportMode === 'overdue' ? (
                  <button
                    className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => void exportCollectionsCsv('overdue')}
                    disabled={collectionsBusy}
                  >
                    Export Overdue CSV
                  </button>
                ) : null}
                {report.exportMode === 'none' && report.id === 'budget-variance' ? (
                  <button
                    className="rounded-lg border border-emerald-600 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 transition"
                    onClick={() => void loadBudgetVariance()}
                    disabled={budgetVarianceBusy}
                  >
                    {budgetVarianceBusy ? 'Loading…' : 'Load Report'}
                  </button>
                ) : report.exportMode === 'none' ? (
                  <span className="rounded-lg border border-white/[0.07] px-3 py-1 text-xs text-slate-500">
                    Available from accounting pack
                  </span>
                ) : null}
                {report.exportMode === 'student-ledger' ? (
                  <a
                    href="/modules/finance/ledger"
                    className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Open Student Ledger →
                  </a>
                ) : null}
                {report.exportMode === 'vote-head' ? (
                  <a
                    href="/modules/finance/vote-heads"
                    className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Manage Vote Heads →
                  </a>
                ) : null}
                {report.exportMode === 'class-balances' ? (
                  <a
                    href="/modules/finance/arrears"
                    className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    View Class Balances →
                  </a>
                ) : null}
                {report.exportMode === 'arrears-term' ? (
                  <a
                    href="/modules/finance/arrears"
                    className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    View Arrears by Term →
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Receivables Aging</h2>
            <p className="mt-1 text-sm text-slate-400">Live aging buckets as of {aging?.as_of ?? '-'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => void exportCollectionsCsv('aging')}
              disabled={collectionsBusy}
            >
              Export Aging CSV
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={sendBulkOverdueReminders}
              disabled={collectionsBusy}
            >
              {collectionsBusy ? 'Working...' : 'Send Bulk Reminders'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => void sendScheduledReminders('PRE_DUE')}
              disabled={collectionsBusy}
            >
              Pre-due reminders
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => void sendScheduledReminders('DUE')}
              disabled={collectionsBusy}
            >
              Due-today reminders
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => void sendInstallmentScheduledReminders('OVERDUE')}
              disabled={collectionsBusy}
            >
              Installment overdue reminders
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={previewLateFees}
              disabled={collectionsBusy}
            >
              Preview late fees
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={applyLateFees}
              disabled={collectionsBusy}
            >
              Apply late fees
            </button>
          </div>
        </div>
        {collectionsMessage ? <p className="mt-3 text-xs text-emerald-300">{collectionsMessage}</p> : null}
        {collectionsError ? <p className="mt-3 text-xs text-rose-300">{collectionsError}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { key: '0_30', label: '0-30 Days' },
            { key: '31_60', label: '31-60 Days' },
            { key: '61_90', label: '61-90 Days' },
            { key: '90_plus', label: '90+ Days' },
          ].map((bucket) => (
            <div key={bucket.key} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
              <p className="text-xs uppercase text-slate-400">{bucket.label}</p>
              <p className="mt-2 text-lg font-semibold text-white">{toCurrency(aging?.buckets?.[bucket.key]?.amount)}</p>
              <p className="text-xs text-slate-400">Invoices: {aging?.buckets?.[bucket.key]?.count ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Installment Aging</h2>
            <p className="mt-1 text-sm text-slate-400">Unpaid installment schedule aging as of {installmentAging?.as_of ?? '-'}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { key: '0_30', label: '0-30 Days' },
            { key: '31_60', label: '31-60 Days' },
            { key: '61_90', label: '61-90 Days' },
            { key: '90_plus', label: '90+ Days' },
          ].map((bucket) => (
            <div key={bucket.key} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
              <p className="text-xs uppercase text-slate-400">{bucket.label}</p>
              <p className="mt-2 text-lg font-semibold text-white">{toCurrency(installmentAging?.buckets?.[bucket.key]?.amount)}</p>
              <p className="text-xs text-slate-400">Installments: {installmentAging?.buckets?.[bucket.key]?.count ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Overdue Accounts</h2>
            <p className="mt-1 text-sm text-slate-400">Operational list for collection follow-up.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice/student/admission"
              className="w-72 rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            />
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={() => void loadCollections(search)}
              disabled={collectionsBusy}
            >
              Filter
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={() => {
                setSearch('')
                void loadCollections('')
              }}
              disabled={collectionsBusy}
            >
              Reset
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={() => void exportCollectionsCsv('overdue')}
              disabled={collectionsBusy}
            >
              Export Overdue CSV
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {overdue.map((row) => (
                <tr key={row.invoice_id} className="bg-slate-950/60">
                  <td className="px-4 py-3">{row.invoice_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{row.student_name}</p>
                    <p className="text-xs text-slate-400">{row.admission_number}</p>
                  </td>
                  <td className="px-4 py-3">{row.due_date}</td>
                  <td className="px-4 py-3">{row.overdue_days}</td>
                  <td className="px-4 py-3">{toCurrency(row.balance_due)}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                      onClick={() => void sendInvoiceReminder(row.invoice_id)}
                      disabled={collectionsBusy}
                    >
                      Send reminder
                    </button>
                  </td>
                </tr>
              ))}
              {overdue.length === 0 ? (
                <tr className="bg-slate-950/60">
                  <td className="px-4 py-5 text-xs text-slate-400" colSpan={6}>
                    No overdue accounts found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {(budgetVariance || budgetVarianceBusy || budgetVarianceError) && (
        <section className="col-span-12 rounded-2xl glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold">Budget Variance Report (IPSAS 24)</h2>
              <p className="mt-1 text-sm text-slate-400">Budget vs actual spend — variance and utilisation by term.</p>
            </div>
            <button
              onClick={() => void loadBudgetVariance()}
              disabled={budgetVarianceBusy}
              className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-50 transition"
            >
              {budgetVarianceBusy ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {budgetVarianceError && <p className="mb-4 text-sm text-rose-300">{budgetVarianceError}</p>}
          {budgetVarianceBusy && <p className="text-sm text-slate-400">Loading budget variance data…</p>}
          {budgetVariance && !budgetVarianceBusy && (
            <>
              {budgetVariance.rows.length === 0 ? (
                <p className="text-sm text-slate-400">No budget records found. Create a budget on the Expenses page first.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                  <table className="w-full text-sm text-slate-300">
                    <thead className="bg-white/[0.035] text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Academic Year</th>
                        <th className="px-4 py-3 text-left">Term</th>
                        <th className="px-4 py-3 text-right">Annual Budget</th>
                        <th className="px-4 py-3 text-right">Actual Spend</th>
                        <th className="px-4 py-3 text-right">Variance</th>
                        <th className="px-4 py-3 text-right">Utilisation %</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {budgetVariance.rows.map((row) => (
                        <tr key={row.budget_id} className="bg-slate-950/40">
                          <td className="px-4 py-3">{row.academic_year}</td>
                          <td className="px-4 py-3">{row.term}</td>
                          <td className="px-4 py-3 text-right">{row.annual_budget.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{row.total_actual_spend.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${row.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.variance >= 0 ? '+' : ''}{row.variance.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.utilization_pct !== null ? `${row.utilization_pct}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.status === 'UNDER' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {row.status === 'UNDER' ? 'Under Budget' : 'Over Budget'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {budgetVariance.by_category.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-300">Spend by Category</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {budgetVariance.by_category.map((cat) => (
                      <div key={cat.category} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">
                        <p className="text-xs uppercase text-slate-400 truncate">{cat.category}</p>
                        <p className="mt-1 text-base font-semibold text-white">{cat.actual.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
