import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../../api/client'
import BackButton from '../../components/BackButton'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type Transaction = {
  id: number
  type: 'INVOICE' | 'PAYMENT' | 'EXPENSE'
  date: string
  reference: string
  description: string
  debit: number
  credit: number
}

const fmt = (v: number) => v.toLocaleString('en-KE', { minimumFractionDigits: 2 })

export default function FinanceGeneralLedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'INVOICE' | 'PAYMENT' | 'EXPENSE'>('ALL')

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, payRes, expRes] = await Promise.all([
        apiClient.get('/finance/invoices/?page_size=200'),
        apiClient.get('/finance/payments/?page_size=200'),
        apiClient.get('/finance/expenses/?page_size=200'),
      ])

      const combined: Transaction[] = [
        ...(invRes.data.results || invRes.data).map((item: any) => ({
          id: item.id,
          type: 'INVOICE',
          date: item.issue_date || item.created_at?.slice(0, 10),
          reference: item.invoice_number,
          description: `Invoice for ${item.student_name || 'Student'}`,
          debit: parseFloat(item.total_amount),
          credit: 0,
        })),
        ...(payRes.data.results || payRes.data).map((item: any) => ({
          id: item.id,
          type: 'PAYMENT',
          date: item.payment_date,
          reference: item.receipt_number,
          description: `Payment from ${item.student_name || 'Student'}`,
          debit: 0,
          credit: parseFloat(item.amount),
        })),
        ...(expRes.data.results || expRes.data).map((item: any) => ({
          id: item.id,
          type: 'EXPENSE',
          date: item.expense_date,
          reference: item.reference || `EXP-${item.id}`,
          description: item.description,
          debit: 0,
          credit: parseFloat(item.amount),
        })),
      ]

      setTransactions(combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    } catch (err) {
      console.error('Failed to load ledger', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesType = filterType === 'ALL' || t.type === filterType
      const matchesFrom = !dateFrom || t.date >= dateFrom
      const matchesTo = !dateTo || t.date <= dateTo
      return matchesType && matchesFrom && matchesTo
    })
  }, [transactions, filterType, dateFrom, dateTo])

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => ({
        debit: acc.debit + t.debit,
        credit: acc.credit + t.credit,
      }),
      { debit: 0, credit: 0 }
    )
  }, [filtered])

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <BackButton to="/modules/finance" label="Back to Finance" />
        <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="General Ledger"
        subtitle="Full double-entry accounting ledger"
        icon="💰"
      />
          <div>
            <h1 className="text-2xl font-display font-bold text-white">General Ledger</h1>
            <p className="mt-1 text-sm text-slate-400">Chronological view of all financial transactions</p>
          </div>
          <PrintButton />
        </div>
      </header>

      <div className="col-span-12 flex flex-wrap gap-4 items-center rounded-2xl glass-panel p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Type:</span>
          <select
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">All Types</option>
            <option value="INVOICE">Invoices</option>
            <option value="PAYMENT">Payments</option>
            <option value="EXPENSE">Expenses</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">From:</span>
          <input
            type="date"
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">To:</span>
          <input
            type="date"
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button
          onClick={() => { setDateFrom(''); setDateTo(''); setFilterType('ALL') }}
          className="text-sm text-slate-500 hover:text-slate-300 underline"
        >
          Clear
        </button>
      </div>

      <section className="col-span-12 rounded-2xl glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-200">
            <thead>
              <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 text-left">Date</th>
                <th className="px-5 py-4 text-left">Type</th>
                <th className="px-5 py-4 text-left">Reference</th>
                <th className="px-5 py-4 text-left">Description</th>
                <th className="px-5 py-4 text-right">Debit (KES)</th>
                <th className="px-5 py-4 text-right">Credit (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">Loading transactions...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">No transactions found.</td></tr>
              ) : (
                filtered.map((t, i) => (
                  <tr key={`${t.type}-${t.id}-${i}`} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-3 text-slate-400">{t.date}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        t.type === 'INVOICE' ? 'bg-blue-500/20 text-blue-300' :
                        t.type === 'PAYMENT' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{t.reference}</td>
                    <td className="px-5 py-3 text-slate-300">{t.description}</td>
                    <td className="px-5 py-3 text-right font-mono text-red-400">{t.debit > 0 ? fmt(t.debit) : '—'}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-400">{t.credit > 0 ? fmt(t.credit) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot className="bg-white/[0.03] font-bold border-t border-white/[0.09]">
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-right text-slate-400 text-xs uppercase tracking-wider">Totals</td>
                  <td className="px-5 py-4 text-right font-mono text-red-400">{fmt(totals.debit)}</td>
                  <td className="px-5 py-4 text-right font-mono text-emerald-400">{fmt(totals.credit)}</td>
                </tr>
                <tr className="border-t border-white/[0.07] bg-slate-950/40">
                  <td colSpan={4} className="px-5 py-3 text-right text-slate-400 text-xs uppercase tracking-wider">Net Position</td>
                  <td colSpan={2} className={`px-5 py-3 text-right font-mono text-lg ${totals.credit - totals.debit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    KES {fmt(Math.abs(totals.credit - totals.debit))} {totals.credit - totals.debit >= 0 ? 'CR' : 'DR'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </section>
  )
}
