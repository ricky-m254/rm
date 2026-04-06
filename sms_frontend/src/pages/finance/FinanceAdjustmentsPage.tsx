import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { useAuthStore } from '../../store/auth'
import { extractApiErrorMessage } from '../../utils/forms'
import PageHero from '../../components/PageHero'

type InvoiceAdjustment = {
  id: number
  invoice: number
  adjustment_type: 'CREDIT' | 'DEBIT'
  amount: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adjusted_by?: number
  adjusted_by_name?: string
  reviewed_by_name?: string
  review_notes?: string
  created_at: string
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

export default function FinanceAdjustmentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = useAuthStore((state) => state.role)
  const canReview = role === 'ADMIN' || role === 'TENANT_SUPER_ADMIN'
  const [adjustments, setAdjustments] = useState<InvoiceAdjustment[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [invoiceFilter, setInvoiceFilter] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )
  const hasInvalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo)
  const hasInvalidAmountRange = Boolean(
    minAmount &&
      maxAmount &&
      !Number.isNaN(Number(minAmount)) &&
      !Number.isNaN(Number(maxAmount)) &&
      Number(minAmount) > Number(maxAmount),
  )

  const loadData = async (currentMountedRef?: { current: boolean }) => {
    try {
      if (!currentMountedRef || currentMountedRef.current) setError(null)
      const response = await apiClient.get<
        InvoiceAdjustment[] | { results: InvoiceAdjustment[]; count: number }
      >('/finance/invoice-adjustments/', {
        params: {
          page,
          search: query.trim() || undefined,
          invoice: invoiceFilter.trim() || undefined,
          min_amount: minAmount || undefined,
          max_amount: maxAmount || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          status: statusFilter || undefined,
        },
      })
      if (!currentMountedRef || currentMountedRef.current) {
        const normalized = normalizePaginatedResponse(response.data)
        setAdjustments(normalized.items)
        setTotalCount(normalized.totalCount)
        setIsServerPaginated(normalized.isPaginated)
      }
    } catch (err) {
      if (!currentMountedRef || currentMountedRef.current) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          setError('Session expired. Please log in again.')
        } else if (status === 403) {
          setError('Access denied. Ensure this user has the FINANCE module and proper role.')
        } else if (status === 404) {
          setError('Adjustments endpoint not found (404). Verify tenant routing.')
        } else {
          setError(extractApiErrorMessage(err, 'Unable to load adjustments. Please try again.'))
        }
      }
    } finally {
      if (!currentMountedRef || currentMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    const state = location.state as { flash?: string } | null
    if (state?.flash) {
      setFlash(state.flash)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    let isMounted = true
    const mountedRef = { current: isMounted }
    if (hasInvalidDateRange) {
      setError('Invalid date range: From date cannot be after To date.')
      setIsLoading(false)
      return () => {
        mountedRef.current = false
      }
    }
    if (hasInvalidAmountRange) {
      setError('Invalid amount range: Min amount cannot be greater than Max amount.')
      setIsLoading(false)
      return () => {
        mountedRef.current = false
      }
    }
    void loadData(mountedRef)
    return () => {
      mountedRef.current = false
    }
  }, [
    page,
    query,
    invoiceFilter,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo,
    statusFilter,
    hasInvalidDateRange,
    hasInvalidAmountRange,
  ])

  const filteredAdjustments = useMemo(() => {
    const term = query.trim().toLowerCase()
    const minValue = minAmount ? Number(minAmount) : null
    const maxValue = maxAmount ? Number(maxAmount) : null
    const fromValue = dateFrom ? new Date(dateFrom) : null
    const toValue = dateTo ? new Date(dateTo) : null

    return adjustments.filter((adj) => {
      if (invoiceFilter && String(adj.invoice) !== invoiceFilter) return false
      if (statusFilter && adj.status !== statusFilter) return false
      if (term) {
        const reason = adj.reason.toLowerCase()
        if (
          !String(adj.invoice).includes(term) &&
          !reason.includes(term) &&
          !String(adj.amount).includes(term)
        ) {
          return false
        }
      }
      const amountValue = Number(adj.amount)
      if (minValue !== null && amountValue < minValue) return false
      if (maxValue !== null && amountValue > maxValue) return false
      if (fromValue || toValue) {
        const created = new Date(adj.created_at)
        if (fromValue && created < fromValue) return false
        if (toValue && created > toValue) return false
      }
      return true
    })
  }, [adjustments, dateFrom, dateTo, invoiceFilter, maxAmount, minAmount, query, statusFilter])

  const runReviewAction = async (id: number, action: 'approve' | 'reject') => {
    if (reviewingId !== null) return
    setActionMessage(null)
    setReviewingId(id)
    try {
      await apiClient.post(`/finance/invoice-adjustments/${id}/${action}/`, {})
      setActionMessage(`Adjustment ${action}d.`)
      await loadData()
    } catch (err) {
      setActionMessage(extractApiErrorMessage(err, `Unable to ${action} adjustment.`))
    } finally {
      setReviewingId(null)
    }
  }

  const pagedAdjustments = useMemo(() => {
    if (isServerPaginated) return filteredAdjustments
    const start = (page - 1) * pageSize
    return filteredAdjustments.slice(start, start + pageSize)
  }, [filteredAdjustments, page, isServerPaginated])

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredAdjustments.length) / pageSize),
  )

  const summary = useMemo(() => {
    const total = filteredAdjustments.reduce((sum, adj) => sum + Number(adj.amount || 0), 0)
    const count = filteredAdjustments.length
    const average = count > 0 ? total / count : 0
    const now = new Date()
    const last30 = filteredAdjustments.filter((adj) => {
      const created = new Date(adj.created_at)
      const diff = now.getTime() - created.getTime()
      return diff <= 30 * 24 * 60 * 60 * 1000
    }).length
    return { total, count, average, last30 }
  }, [filteredAdjustments])

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Invoice Adjustments"
        subtitle="Credit notes and waivers applied to invoices."
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading adjustments...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}
      {actionMessage ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-xs text-emerald-200">{actionMessage}</p>
        </div>
      ) : null}
      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-xs text-emerald-200">{flash}</p>
        </div>
      ) : null}

      <section className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 rounded-2xl glass-panel p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Adjustments</p>
          <p className="mt-2 text-xl font-display font-semibold">{summary.count}</p>
        </div>
        <div className="col-span-12 rounded-2xl glass-panel p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Amount</p>
          <p className="mt-2 text-xl font-display font-semibold">
            {formatMoney(summary.total)}
          </p>
        </div>
        <div className="col-span-12 rounded-2xl glass-panel p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg Adjustment</p>
          <p className="mt-2 text-xl font-display font-semibold">
            {formatMoney(summary.average)}
          </p>
        </div>
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 glass-panel p-4 md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Last 30 Days</p>
          <p className="mt-2 text-xl font-display font-semibold">{summary.last30}</p>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Adjustment list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/invoice-adjustments/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search invoice, amount, reason"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
            <input
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:w-28"
              placeholder="Invoice #"
              value={invoiceFilter}
              onChange={(event) => {
                setInvoiceFilter(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:w-24"
              placeholder="Min"
              value={minAmount}
              onChange={(event) => {
                setMinAmount(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:w-24"
              placeholder="Max"
              value={maxAmount}
              onChange={(event) => {
                setMaxAmount(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:w-auto"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:w-auto"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPage(1)
              }}
            />
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:w-auto"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <button
              className="w-full rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200 sm:w-auto"
              onClick={() => {
                setQuery('')
                setInvoiceFilter('')
                setMinAmount('')
                setMaxAmount('')
                setDateFrom('')
                setDateTo('')
                setStatusFilter('')
                setPage(1)
              }}
            >
              Reset
            </button>
            <button
              className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 sm:w-auto"
              onClick={() => navigate('/modules/finance/adjustments/new')}
            >
              Create adjustment
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">On small screens, scroll the table horizontally.</p>
        {isServerPaginated ? (
          <p className="mt-3 text-xs text-slate-500">
            Filters and summaries apply to the current page only while pagination is enabled.
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Adjusted By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedAdjustments.map((adj) => (
                <tr key={adj.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">INV-{adj.invoice}</td>
                  <td className="px-4 py-3">{adj.adjustment_type}</td>
                  <td className="px-4 py-3">{formatMoney(adj.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(adj.status)}`}>
                      {adj.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{adj.reason}</td>
                  <td className="px-4 py-3">{adj.adjusted_by_name ?? adj.adjusted_by ?? '--'}</td>
                  <td className="px-4 py-3">{formatDateTime(adj.created_at)}</td>
                  <td className="px-4 py-3">
                    {canReview && adj.status === 'PENDING' ? (
                      <div className="flex gap-2">
                        <button
                          className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-200 disabled:opacity-70"
                          onClick={() => void runReviewAction(adj.id, 'approve')}
                          disabled={reviewingId !== null}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded border border-rose-600 px-2 py-1 text-xs text-rose-200 disabled:opacity-70"
                          onClick={() => void runReviewAction(adj.id, 'reject')}
                          disabled={reviewingId !== null}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {pagedAdjustments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={8}>
                    No adjustments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
