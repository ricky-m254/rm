import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { useAuthStore } from '../../store/auth'
import PageHero from '../../components/PageHero'

type WriteOff = {
  id: number
  invoice: number
  invoice_number?: string
  student_name?: string
  amount: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requested_by_name?: string
  reviewed_by_name?: string
  requested_at: string
}

type FinanceInvoiceOption = {
  id: number
  invoice_number?: string
  student_full_name?: string
  student_name?: string
  balance_due?: number
  status?: string
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

const formatMoney = (value: number | string | undefined) =>
  Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDateTime = (value: string | undefined) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const statusBadgeClass = (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
  if (status === 'APPROVED') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  if (status === 'REJECTED') return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
  return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
}

export default function FinanceRefundsPage() {
  const role = useAuthStore((state) => state.role)
  const canReview = role === 'ADMIN' || role === 'TENANT_SUPER_ADMIN'

  const [rows, setRows] = useState<WriteOff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [invoiceOptions, setInvoiceOptions] = useState<FinanceInvoiceOption[]>([])
  const [invoiceOptionsError, setInvoiceOptionsError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewingId, setReviewingId] = useState<number | null>(null)

  const loadRows = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<WriteOff[] | { results: WriteOff[]; count: number }>(
        '/finance/write-offs/',
        {
          params: {
            search: query.trim() || undefined,
            status: statusFilter || undefined,
          },
        },
      )
      const normalized = normalizePaginatedResponse(response.data)
      setRows(normalized.items)
    } catch (err) {
      setError(extractApiError(err, 'Unable to load write-off requests.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter])

  useEffect(() => {
    let isMounted = true
    const loadInvoiceOptions = async () => {
      setInvoiceOptionsError(null)
      try {
        const response = await apiClient.get<
          FinanceInvoiceOption[] | { results: FinanceInvoiceOption[]; count: number }
        >('/finance/invoices/', {
          params: {
            page: 1,
            page_size: 100,
          },
        })
        const normalized = normalizePaginatedResponse(response.data)
        if (isMounted) {
          setInvoiceOptions(normalized.items)
        }
      } catch (err) {
        if (isMounted) {
          setInvoiceOptions([])
          setInvoiceOptionsError(
            extractApiError(err, 'Unable to load invoice options. You can still enter Invoice ID manually.'),
          )
        }
      }
    }
    void loadInvoiceOptions()
    return () => {
      isMounted = false
    }
  }, [])

  const summary = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'PENDING').length
    const approved = rows.filter((r) => r.status === 'APPROVED').length
    const rejected = rows.filter((r) => r.status === 'REJECTED').length
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    return { pending, approved, rejected, totalAmount }
  }, [rows])

  const createRequest = async () => {
    if (isSubmitting || reviewingId !== null) return
    const parsedInvoiceId = Number(invoiceId)
    const parsedAmount = Number(amount)
    if (!parsedInvoiceId || !parsedAmount || !reason.trim()) {
      setMessage('Invoice, amount, and reason are required.')
      return
    }
    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
      setMessage('Invoice ID must be a positive whole number.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage('Amount must be greater than zero.')
      return
    }
    const selectedInvoice = invoiceOptions.find((item) => item.id === parsedInvoiceId)
    const invoiceBalance = Number(selectedInvoice?.balance_due ?? 0)
    if (selectedInvoice && invoiceBalance > 0 && parsedAmount > invoiceBalance) {
      setMessage('Amount cannot exceed invoice balance due.')
      return
    }
    setMessage(null)
    setIsSubmitting(true)
    try {
      await apiClient.post('/finance/write-offs/', {
        invoice: parsedInvoiceId,
        amount: parsedAmount,
        reason: reason.trim(),
      })
      setMessage('Write-off request submitted.')
      setInvoiceId('')
      setAmount('')
      setReason('')
      await loadRows()
    } catch (err) {
      setMessage(extractApiError(err, 'Failed to submit write-off request.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const reviewRequest = async (id: number, action: 'approve' | 'reject') => {
    if (reviewingId !== null || isSubmitting) return
    setMessage(null)
    setReviewingId(id)
    try {
      await apiClient.post(`/finance/write-offs/${id}/${action}/`, {})
      setMessage(`Write-off ${action}d.`)
      await loadRows()
    } catch (err) {
      setMessage(extractApiError(err, `Unable to ${action} write-off.`))
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Write-offs"
        subtitle="Maker/checker workflow for invoice write-off requests."
        icon="💰"
      />

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

      <section className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Pending</p>
          <p className="mt-2 text-xl font-semibold">{summary.pending}</p>
        </div>
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Approved</p>
          <p className="mt-2 text-xl font-semibold">{summary.approved}</p>
        </div>
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Rejected</p>
          <p className="mt-2 text-xl font-semibold">{summary.rejected}</p>
        </div>
        <div className="col-span-6 md:col-span-3 rounded-2xl glass-panel p-4">
          <p className="text-xs text-slate-400">Total Requested</p>
          <p className="mt-2 text-xl font-semibold">{formatMoney(summary.totalAmount)}</p>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Create write-off request</h2>
        {invoiceOptionsError ? <p className="mt-2 text-xs text-amber-300">{invoiceOptionsError}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {invoiceOptions.length > 0 ? (
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              <option value="">Select invoice</option>
              {invoiceOptions.map((invoice) => (
                <option key={invoice.id} value={String(invoice.id)}>
                  {(invoice.invoice_number || `INV-${invoice.id}`) +
                    ' - ' +
                    (invoice.student_full_name || invoice.student_name || 'Student') +
                    ` (Balance: ${formatMoney(invoice.balance_due)})`}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Invoice ID"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            />
          )}
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 md:col-span-2"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button
          className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
          onClick={() => void createRequest()}
          disabled={isSubmitting || reviewingId !== null}
        >
          {isSubmitting ? 'Submitting...' : 'Submit request'}
        </button>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-display font-semibold">Write-off requests</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search invoice/student/reason"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200"
              onClick={() => {
                setQuery('')
                setStatusFilter('')
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-300">Loading write-offs...</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-slate-950/60">
                    <td className="px-4 py-3">{row.invoice_number || `INV-${row.invoice}`}</td>
                    <td className="px-4 py-3">{row.student_name || '--'}</td>
                    <td className="px-4 py-3">{formatMoney(row.amount)}</td>
                    <td className="px-4 py-3">{row.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(row.requested_at)}</td>
                    <td className="px-4 py-3">
                      {canReview && row.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-200 disabled:opacity-70"
                            onClick={() => void reviewRequest(row.id, 'approve')}
                            disabled={reviewingId !== null || isSubmitting}
                          >
                            {reviewingId === row.id ? 'Working...' : 'Approve'}
                          </button>
                          <button
                            className="rounded border border-rose-600 px-2 py-1 text-xs text-rose-200 disabled:opacity-70"
                            onClick={() => void reviewRequest(row.id, 'reject')}
                            disabled={reviewingId !== null || isSubmitting}
                          >
                            {reviewingId === row.id ? 'Working...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={7}>
                      No write-off requests found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
