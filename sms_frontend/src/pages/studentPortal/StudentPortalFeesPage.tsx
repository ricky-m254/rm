import { useEffect, useState, type ReactNode } from 'react'
import { CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { apiClient } from '../../api/client'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type Invoice = {
  id: number
  invoice_number: string
  description: string
  amount: string
  amount_paid: string
  balance: string
  status: string
  invoice_date: string | null
  due_date: string | null
  term: string | null
  academic_year: string | null
}

type Payment = {
  id: number
  amount_paid: string
  payment_date: string
  payment_method: string
  transaction_reference: string
  notes: string
}

const STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-emerald-500/15 text-emerald-300',
  PARTIALLY_PAID: 'bg-amber-500/15 text-amber-300',
  ISSUED: 'bg-blue-500/15 text-blue-300',
  DRAFT: 'bg-slate-500/15 text-slate-300',
  OVERDUE: 'bg-rose-500/15 text-rose-300',
  VOID: 'bg-slate-500/15 text-slate-400',
  CONFIRMED: 'bg-cyan-500/15 text-cyan-300',
}

const STATUS_ICON: Record<string, ReactNode> = {
  PAID: <CheckCircle size={13} className="text-emerald-400" />,
  PARTIALLY_PAID: <Clock size={13} className="text-amber-400" />,
  ISSUED: <Clock size={13} className="text-blue-400" />,
  DRAFT: <Clock size={13} className="text-slate-400" />,
  OVERDUE: <AlertCircle size={13} className="text-rose-400" />,
  VOID: <AlertCircle size={13} className="text-slate-400" />,
  CONFIRMED: <CheckCircle size={13} className="text-cyan-400" />,
}

function asStatusKey(status: string | null | undefined) {
  return status?.toUpperCase() ?? ''
}

export default function StudentPortalFeesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [invRes, payRes] = await Promise.all([
          apiClient.get<Invoice[]>('/student-portal/my-invoices/').catch(() => ({ data: [] as Invoice[] })),
          apiClient.get<Payment[]>('/student-portal/my-payments/').catch(() => ({ data: [] as Payment[] })),
        ])
        setInvoices(Array.isArray(invRes.data) ? invRes.data : [])
        setPayments(Array.isArray(payRes.data) ? payRes.data : [])
      } catch {
        setError('Could not load fee information. Please contact the school office.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const totalBilled = invoices.reduce((s, inv) => s + Number(inv.amount), 0)
  const totalPaid = invoices.reduce((s, inv) => s + Number(inv.amount_paid), 0)
  const totalBalance = invoices.reduce((s, inv) => s + Number(inv.balance), 0)
  const hasOverdue = invoices.some(inv => asStatusKey(inv.status) === 'OVERDUE')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="space-y-3 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mx-auto"></div>
          <p className="text-sm text-slate-500">Loading fee information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">My Fees</h1>
        <p className="text-slate-500 text-sm mt-1">View your invoices, payments, and outstanding balances</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {hasOverdue && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertCircle size={16} /> You have overdue fees. Please contact the school finance office.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Billed', value: `KES ${totalBilled.toLocaleString()}`, color: 'text-white' },
          { label: 'Total Paid', value: `KES ${totalPaid.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Balance Due', value: `KES ${totalBalance.toLocaleString()}`, color: totalBalance > 0 ? 'text-rose-400' : 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={GLASS}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={GLASS}>
          <CreditCard className="mx-auto mb-3 text-slate-600" size={32} />
          <p className="text-slate-400 text-sm">No fee invoices found for your account.</p>
          <p className="text-slate-600 text-xs mt-1">Contact the school office if you believe this is an error.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Invoices</h2>
          {invoices.map(inv => {
            const statusKey = asStatusKey(inv.status)
            return (
              <div key={inv.id} className="rounded-2xl p-5" style={GLASS}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-200 text-sm">
                        {inv.description || inv.invoice_number || `Invoice #${inv.id}`}
                      </p>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[statusKey] ?? 'bg-slate-500/15 text-slate-400'}`}>
                        {STATUS_ICON[statusKey]}
                        {statusKey ? statusKey.replace(/_/g, ' ') : 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="grid gap-1 mt-2 text-xs text-slate-500 sm:grid-cols-2">
                      <span>Invoice No: {inv.invoice_number || `INV-${inv.id}`}</span>
                      {inv.invoice_date && <span>Issued: {inv.invoice_date}</span>}
                      {inv.term && <span>Term: {inv.term}</span>}
                      {inv.academic_year && <span>Year: {inv.academic_year}</span>}
                      {inv.due_date && <span>Due: {inv.due_date}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">KES {Number(inv.amount).toLocaleString()}</p>
                    <p className="text-xs text-emerald-400">Paid: {Number(inv.amount_paid).toLocaleString()}</p>
                    {Number(inv.balance) > 0 && (
                      <p className="text-xs text-rose-400">Due: {Number(inv.balance).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {payments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Payment History</h2>
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Date', 'Amount', 'Method', 'Reference'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">KES {Number(p.amount_paid).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{p.payment_method?.replace(/_/g, ' ') || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.transaction_reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
