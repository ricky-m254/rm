import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../../api/client'
import BackButton from '../../components/BackButton'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type Expense = {
  id: number
  expense_date: string
  description: string
  vote_head_name: string
  vote_head: number
  amount: string
  approved_by_name: string
}

type VoteHead = {
  id: number
  name: string
}

const fmt = (v: number | string) => parseFloat(String(v) || '0').toLocaleString('en-KE', { minimumFractionDigits: 2 })

export default function FinanceExpenseLedgerPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [voteHeads, setVoteHeads] = useState<VoteHead[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedVoteHead, setSelectedVoteHead] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const [expRes, vhRes] = await Promise.all([
        apiClient.get('/finance/expenses/?page_size=500'),
        apiClient.get('/finance/vote-heads/'),
      ])
      setExpenses(expRes.data.results || expRes.data)
      setVoteHeads(vhRes.data.results || vhRes.data)
    } catch (err) {
      console.error('Failed to load expense ledger', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesVH = !selectedVoteHead || String(e.vote_head) === selectedVoteHead
      const matchesFrom = !dateFrom || e.expense_date >= dateFrom
      const matchesTo = !dateTo || e.expense_date <= dateTo
      return matchesVH && matchesFrom && matchesTo
    })
  }, [expenses, selectedVoteHead, dateFrom, dateTo])

  const grouped = useMemo(() => {
    const groups: Record<string, { expenses: Expense[]; total: number }> = {}
    filtered.forEach((e) => {
      const vh = e.vote_head_name || 'Uncategorized'
      if (!groups[vh]) groups[vh] = { expenses: [], total: 0 }
      groups[vh].expenses.push(e)
      groups[vh].total += parseFloat(e.amount)
    })
    return groups
  }, [filtered])

  const grandTotal = useMemo(() => {
    return filtered.reduce((acc, e) => acc + parseFloat(e.amount), 0)
  }, [filtered])

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <BackButton to="/modules/finance" label="Back to Finance" />
        <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Expense Ledger"
        subtitle="Itemised expenditure ledger by category"
        icon="💰"
      />
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Expense Ledger</h1>
            <p className="mt-1 text-sm text-slate-400">Expenses grouped by vote head and category</p>
          </div>
          <PrintButton />
        </div>
      </header>

      <div className="col-span-12 flex flex-wrap gap-4 items-center rounded-2xl glass-panel p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Vote Head:</span>
          <select
            className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
            value={selectedVoteHead}
            onChange={(e) => setSelectedVoteHead(e.target.value)}
          >
            <option value="">All Vote Heads</option>
            {voteHeads.map((vh) => (
              <option key={vh.id} value={vh.id}>{vh.name}</option>
            ))}
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
          onClick={() => { setDateFrom(''); setDateTo(''); setSelectedVoteHead('') }}
          className="text-sm text-slate-500 hover:text-slate-300 underline"
        >
          Clear
        </button>
      </div>

      <div className="col-span-12 space-y-6">
        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading expense data...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-slate-500 text-center py-10">No expenses found matching criteria.</p>
        ) : (
          Object.entries(grouped).map(([vh, group]) => (
            <section key={vh} className="rounded-2xl glass-panel overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.09] bg-white/[0.025]">
                <h3 className="font-semibold text-emerald-400">{vh}</h3>
                <span className="font-mono font-bold text-white">KES {fmt(group.total)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="px-5 py-3 text-left font-medium">Date</th>
                      <th className="px-5 py-3 text-left font-medium">Description</th>
                      <th className="px-5 py-3 text-left font-medium">Approved By</th>
                      <th className="px-5 py-3 text-right font-medium">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {group.expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-5 py-2.5 text-slate-400 whitespace-nowrap">{e.expense_date}</td>
                        <td className="px-5 py-2.5">{e.description}</td>
                        <td className="px-5 py-2.5 text-xs text-slate-500">{e.approved_by_name || '—'}</td>
                        <td className="px-5 py-2.5 text-right font-mono text-white">{fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}

        {!loading && grandTotal > 0 && (
          <div className="flex justify-end p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="text-right">
              <p className="text-xs uppercase text-slate-500 tracking-widest">Grand Total Expenses</p>
              <p className="text-3xl font-display font-bold text-white mt-1">KES {fmt(grandTotal)}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
