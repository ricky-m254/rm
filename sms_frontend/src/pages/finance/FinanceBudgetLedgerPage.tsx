import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../../api/client'
import BackButton from '../../components/BackButton'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type Budget = {
  id: number
  vote_head: number
  vote_head_name: string
  amount: string
  academic_year_name: string
}

type Expense = {
  id: number
  vote_head: number
  amount: string
}

type VoteHead = {
  id: number
  name: string
}

const fmt = (v: number | string) => parseFloat(String(v) || '0').toLocaleString('en-KE', { minimumFractionDigits: 2 })

export default function FinanceBudgetLedgerPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [voteHeads, setVoteHeads] = useState<VoteHead[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [budRes, expRes, vhRes] = await Promise.all([
        apiClient.get('/finance/budgets/?page_size=100'),
        apiClient.get('/finance/expenses/?page_size=500'),
        apiClient.get('/finance/vote-heads/'),
      ])
      setBudgets(budRes.data.results || budRes.data)
      setExpenses(expRes.data.results || expRes.data)
      setVoteHeads(vhRes.data.results || vhRes.data)
    } catch (err) {
      console.error('Failed to load budget ledger', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const reportData = useMemo(() => {
    return voteHeads.map((vh) => {
      const budget = budgets.find((b) => b.vote_head === vh.id)
      const budgetedAmount = budget ? parseFloat(budget.amount) : 0
      const spent = expenses
        .filter((e) => e.vote_head === vh.id)
        .reduce((acc, e) => acc + parseFloat(e.amount), 0)
      const remaining = budgetedAmount - spent
      const percentUsed = budgetedAmount > 0 ? (spent / budgetedAmount) * 100 : 0

      return {
        voteHead: vh.name,
        budgetedAmount,
        spent,
        remaining,
        percentUsed,
      }
    })
  }, [voteHeads, budgets, expenses])

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <BackButton to="/modules/finance" label="Back to Finance" />
        <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Budget Ledger"
        subtitle="Track budget vs actual spend by vote head"
        icon="💰"
      />
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Budget vs Actual Ledger</h1>
            <p className="mt-1 text-sm text-slate-400">Track spending against allocated budgets per vote head</p>
          </div>
          <PrintButton />
        </div>
      </header>

      <section className="col-span-12 rounded-2xl glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-200">
            <thead>
              <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 text-left">Vote Head</th>
                <th className="px-5 py-4 text-right">Budgeted (KES)</th>
                <th className="px-5 py-4 text-right">Spent (KES)</th>
                <th className="px-5 py-4 text-right">Remaining (KES)</th>
                <th className="px-5 py-4 text-center w-48">Usage %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-500">Loading budget data...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-500">No budget data available.</td></tr>
              ) : (
                reportData.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4 font-semibold text-slate-200">{row.voteHead}</td>
                    <td className="px-5 py-4 text-right font-mono text-blue-300">{fmt(row.budgetedAmount)}</td>
                    <td className="px-5 py-4 text-right font-mono text-red-300">{fmt(row.spent)}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">{fmt(row.remaining)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              row.percentUsed > 90 ? 'bg-rose-500' :
                              row.percentUsed > 70 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(row.percentUsed, 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold min-w-[3rem] text-right ${
                          row.percentUsed > 90 ? 'text-rose-400' :
                          row.percentUsed > 70 ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}>
                          {row.percentUsed.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
