import { useState } from 'react'
import { Wallet, Search, Plus, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react'
import PageHero from '../../components/PageHero'

type Account = {
  id: number
  studentName: string
  admissionNo: string
  grade: string
  balance: number
  totalSpent: number
  lastTransaction: string
  mealPlan: string
  status: 'Active' | 'Low Balance' | 'Suspended'
}

const ACCOUNTS: Account[] = [
  { id: 1, studentName: 'Amara Wanjiku', admissionNo: 'ADM-2023-001', grade: 'Grade 7A', balance: 1200, totalSpent: 4800, lastTransaction: '2026-03-17', mealPlan: 'Monthly', status: 'Active' },
  { id: 2, studentName: 'Brian Otieno', admissionNo: 'ADM-2023-002', grade: 'Grade 8B', balance: 80, totalSpent: 6220, lastTransaction: '2026-03-16', mealPlan: 'Weekly', status: 'Low Balance' },
  { id: 3, studentName: 'Cynthia Akinyi', admissionNo: 'ADM-2022-015', grade: 'Grade 9A', balance: 2400, totalSpent: 9600, lastTransaction: '2026-03-17', mealPlan: 'Monthly', status: 'Active' },
  { id: 4, studentName: 'David Kimani', admissionNo: 'ADM-2024-003', grade: 'PP2B', balance: 0, totalSpent: 1500, lastTransaction: '2026-03-10', mealPlan: 'Daily', status: 'Suspended' },
  { id: 5, studentName: 'Esther Mutua', admissionNo: 'ADM-2023-018', grade: 'Grade 7C', balance: 3500, totalSpent: 7000, lastTransaction: '2026-03-15', mealPlan: 'Monthly', status: 'Active' },
  { id: 6, studentName: 'Felix Njoroge', admissionNo: 'ADM-2022-042', grade: 'Grade 8A', balance: 120, totalSpent: 5400, lastTransaction: '2026-03-14', mealPlan: 'Pay-as-you-eat', status: 'Low Balance' },
  { id: 7, studentName: 'Grace Adhiambo', admissionNo: 'ADM-2024-007', grade: 'Grade 1A', balance: 900, totalSpent: 1800, lastTransaction: '2026-03-17', mealPlan: 'Weekly', status: 'Active' },
  { id: 8, studentName: 'Hassan Mwenda', admissionNo: 'ADM-2022-031', grade: 'Grade 9B', balance: 1700, totalSpent: 8500, lastTransaction: '2026-03-16', mealPlan: 'Monthly', status: 'Active' },
]

const STATUS_STYLE: Record<Account['status'], string> = {
  Active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Low Balance': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  Suspended: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
}

export default function CafeteriaAccountsPage() {
  const [accounts] = useState<Account[]>(ACCOUNTS)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<Account['status'] | 'All'>('All')
  const [topupTarget, setTopupTarget] = useState<Account | null>(null)
  const [topupAmount, setTopupAmount] = useState('')

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const lowCount = accounts.filter(a => a.status === 'Low Balance').length
  const activeCount = accounts.filter(a => a.status === 'Active').length

  const filtered = accounts.filter(a => {
    const matchSearch = a.studentName.toLowerCase().includes(search.toLowerCase()) || a.admissionNo.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <PageHero
        title="Student Meal Accounts"
        subtitle="Track cafeteria wallet balances, top-ups, and meal history per student"
        icon={Wallet}
        theme="emerald"
        stats={[
          { label: 'Total Wallets', value: accounts.length },
          { label: 'Total Balance', value: `Ksh ${totalBalance.toLocaleString()}` },
          { label: 'Low Balance', value: lowCount },
          { label: 'Active', value: activeCount },
        ]}
      />

      {lowCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-5 py-4">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">{lowCount} student{lowCount > 1 ? 's' : ''} with low balance</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Balances below Ksh 200 — parents should be notified to top up.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student or admission..."
            className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['All', 'Active', 'Low Balance', 'Suspended'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition border ${filterStatus === s ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'border-white/[0.07] text-slate-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Student</th>
              <th className="px-5 py-3 text-left">Grade</th>
              <th className="px-5 py-3 text-left">Meal Plan</th>
              <th className="px-5 py-3 text-right">Balance (Ksh)</th>
              <th className="px-5 py-3 text-right">Total Spent (Ksh)</th>
              <th className="px-5 py-3 text-left">Last Transaction</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.025] transition">
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{a.studentName}</div>
                  <div className="text-xs text-slate-500">{a.admissionNo}</div>
                </td>
                <td className="px-5 py-3 text-slate-300 text-xs">{a.grade}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">{a.mealPlan}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-semibold ${a.balance < 200 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {a.balance.toLocaleString()}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-slate-400">{a.totalSpent.toLocaleString()}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{a.lastTransaction}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[a.status]}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => { setTopupTarget(a); setTopupAmount('') }}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 transition">
                    <Plus size={11} /> Top Up
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500 text-sm">No accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {topupTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <ArrowUpCircle size={22} className="text-emerald-400" />
              <h3 className="text-lg font-display font-semibold">Top Up Wallet</h3>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4">
              <p className="text-sm font-medium text-white">{topupTarget.studentName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{topupTarget.admissionNo} · {topupTarget.grade}</p>
              <div className="flex items-center gap-2 mt-3">
                <Wallet size={14} className="text-slate-500" />
                <span className="text-sm text-slate-300">Current balance:</span>
                <span className={`font-semibold text-sm ${topupTarget.balance < 200 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  Ksh {topupTarget.balance.toLocaleString()}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount to Add (Ksh) *</label>
              <input type="number" min="50" step="50" value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              <div className="flex gap-2 mt-2">
                {[200, 500, 1000, 2000].map(amt => (
                  <button key={amt} onClick={() => setTopupAmount(String(amt))}
                    className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition">
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
            {topupAmount && Number(topupAmount) > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-4 py-3">
                <ArrowDownCircle size={14} className="text-emerald-400" />
                <span className="text-sm text-slate-300">New balance:</span>
                <span className="font-semibold text-emerald-400">Ksh {(topupTarget.balance + Number(topupAmount)).toLocaleString()}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setTopupTarget(null)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={() => setTopupTarget(null)} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">Confirm Top Up</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
