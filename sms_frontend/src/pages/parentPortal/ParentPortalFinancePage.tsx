import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type FinanceSummary = {
  student_id?: number
  total_billed?: number | string
  total_paid?: number | string
  outstanding_balance?: number | string
  invoice_count?: number
}

type Invoice = {
  id: number
  invoice_date: string
  due_date: string | null
  total_amount: number | string
  status: string
  balance_due: number | string
  download_url?: string
}

type Payment = {
  id: number
  payment_date: string
  amount: number | string
  payment_method: string
  reference_number: string
  receipt_url?: string
}

type PaymentInitiationResponse = {
  payment_id: number
  reference_number: string
  status: string
}

const PAYMENT_METHODS = ['Online', 'M-Pesa', 'Bank Transfer', 'Cash']

const fmt = (value: number | string | null | undefined) => (value != null ? `KES ${Number(value).toLocaleString()}` : 'KES 0')

const statusBadge = (status: string) => {
  const badgeMap: Record<string, string> = {
    PAID: 'bg-emerald-500/15 text-emerald-400',
    PARTIAL: 'bg-amber-500/15 text-amber-400',
    PENDING: 'bg-sky-500/15 text-sky-400',
    OVERDUE: 'bg-rose-500/15 text-rose-400',
  }
  return badgeMap[status?.toUpperCase()] ?? 'bg-slate-500/15 text-slate-400'
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = (error.response as { data?: Record<string, unknown> }).data
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.error === 'string') return data.error
  }
  return fallback
}

export default function ParentPortalFinancePage() {
  const [summary, setSummary] = useState<FinanceSummary>({})
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Online')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const loadFinance = async () => {
    setError(null)
    try {
      const [summaryResponse, invoicesResponse, paymentsResponse] = await Promise.all([
        apiClient.get<FinanceSummary>('/parent-portal/finance/summary/'),
        apiClient.get<Invoice[]>('/parent-portal/finance/invoices/'),
        apiClient.get<Payment[]>('/parent-portal/finance/payments/'),
      ])
      const nextSummary = summaryResponse.data ?? {}
      setSummary(nextSummary)
      setInvoices(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [])
      setPayments(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [])
      const nextOutstanding = Number(nextSummary.outstanding_balance ?? 0)
      setPaymentAmount((currentAmount) => currentAmount || (nextOutstanding > 0 ? nextOutstanding.toFixed(2) : ''))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load financial records.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFinance()
  }, [])

  const outstanding = Number(summary.outstanding_balance ?? 0)

  const submitPayment = async () => {
    if (!paymentAmount.trim()) {
      setError('Enter the amount you want to pay.')
      return
    }
    setSubmittingPayment(true)
    setError(null)
    setNotice(null)
    try {
      const response = await apiClient.post<PaymentInitiationResponse>('/parent-portal/finance/pay/', {
        amount: paymentAmount,
        payment_method: paymentMethod,
      })
      setNotice(`Payment initiated. Reference: ${response.data.reference_number}.`)
      setTab('payments')
      setPaymentAmount('')
      await loadFinance()
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to initiate payment.'))
    } finally {
      setSubmittingPayment(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">FINANCE</p>
        <h1 className="text-2xl font-display font-bold text-white">Financial Information</h1>
        <p className="mt-1 text-sm text-slate-500">Fees, invoices, and payment history for your child</p>
      </div>

      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Billed', value: fmt(summary.total_billed), icon: FileText, color: '#38bdf8', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Total Paid', value: fmt(summary.total_paid), icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          {
            label: 'Outstanding Balance',
            value: fmt(outstanding),
            icon: outstanding > 0 ? AlertCircle : CheckCircle2,
            color: outstanding > 0 ? '#f59e0b' : '#10b981',
            bg: outstanding > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
          },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-4 rounded-2xl p-5" style={GLASS}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: card.bg }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{card.label}</p>
              <p className="font-mono text-lg font-bold" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {outstanding > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <AlertCircle size={16} className="flex-shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200">
              Your child has an outstanding balance of <strong>{fmt(outstanding)}</strong>. You can initiate a full or partial payment below.
            </p>
          </div>
          <div className="rounded-2xl p-5" style={GLASS}>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Make Payment</h2>
              <p className="mt-1 text-xs text-slate-500">This records a parent-initiated payment request and generates a reference immediately.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-slate-400">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-slate-400">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Outstanding now: {fmt(outstanding)}</p>
              <button
                onClick={submitPayment}
                disabled={submittingPayment || !paymentAmount.trim()}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
              >
                {submittingPayment ? 'Submitting...' : 'Initiate Payment'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          All current invoices are settled. Payment history remains available below.
        </div>
      )}

      <div className="flex gap-2">
        {(['invoices', 'payments'] as const).map((nextTab) => (
          <button
            key={nextTab}
            onClick={() => setTab(nextTab)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === nextTab ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {nextTab === 'invoices' ? `Invoices (${invoices.length})` : `Payments (${payments.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading financial records...</div>
      ) : tab === 'invoices' ? (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm text-slate-500" style={GLASS}>
              No invoices found.
            </div>
          ) : (
            invoices.map((invoice) => {
              const totalAmount = Number(invoice.total_amount ?? 0)
              const balanceDue = Number(invoice.balance_due ?? 0)
              const amountPaid = Math.max(totalAmount - balanceDue, 0)
              return (
                <div key={invoice.id} className="rounded-2xl p-5" style={GLASS}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge(invoice.status)}`}>{invoice.status}</span>
                        <span className="font-mono text-xs text-slate-500">Invoice #{invoice.id}</span>
                      </div>
                      <p className="truncate font-semibold text-slate-200">School Fees</p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                        {invoice.invoice_date ? <span>Issued: {new Date(invoice.invoice_date).toLocaleDateString()}</span> : null}
                        {invoice.due_date ? (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-white">{fmt(totalAmount)}</p>
                      {amountPaid > 0 ? <p className="text-xs text-emerald-400">Paid: {fmt(amountPaid)}</p> : null}
                      {balanceDue > 0 ? <p className="text-xs text-amber-400">Due: {fmt(balanceDue)}</p> : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl" style={GLASS}>
          {payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No payments recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Date', 'Amount', 'Method', 'Reference'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {payments.map((payment, index) => (
                  <tr key={payment.id} className={`hover:bg-white/[0.015] ${index % 2 !== 0 ? 'bg-white/[0.008]' : ''}`}>
                    <td className="px-4 py-3 text-slate-400">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">{fmt(payment.amount)}</td>
                    <td className="px-4 py-3 text-slate-400">{payment.payment_method || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{payment.reference_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
