import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, Search } from 'lucide-react'

const GLASS = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }

type WalletTx = {
  id: number
  student: number
  student_name: string
  transaction_type: 'Credit' | 'Debit'
  amount: string
  description: string
  balance_after: string
  created_at: string
}

type Student = { id: number; full_name: string; admission_number: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v?.results ?? [])
}

function fmt(amount: string | number) {
  return `Ksh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

export default function CafeteriaPaymentsPage() {
  const [txns, setTxns] = useState<WalletTx[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Credit' | 'Debit'>('all')
  const [showForm, setShowForm] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [txType, setTxType] = useState<'Credit' | 'Debit'>('Credit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, sRes] = await Promise.allSettled([
        apiClient.get<WalletTx[] | { results: WalletTx[] }>('/cafeteria/wallet/?limit=200'),
        apiClient.get<Student[] | { results: Student[] }>('/students/?limit=500'),
      ])
      if (tRes.status === 'fulfilled') setTxns(asArray(tRes.value.data))
      if (sRes.status === 'fulfilled') setStudents(asArray(sRes.value.data))
    } catch {
      setError('Unable to load wallet transactions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!studentId || !amount) return
    setSaving(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/cafeteria/wallet/', {
        student: Number(studentId),
        transaction_type: txType,
        amount: parseFloat(amount),
        description,
        balance_after: 0,
      })
      setStudentId(''); setAmount(''); setDescription(''); setShowForm(false)
      setNotice(`${txType} of ${fmt(amount)} recorded successfully.`)
      await load()
    } catch {
      setError('Failed to save transaction.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = txns.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.student_name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || t.transaction_type === typeFilter
    return matchSearch && matchType
  })

  const totalCredit = txns.filter(t => t.transaction_type === 'Credit').reduce((s, t) => s + Number(t.amount), 0)
  const totalDebit = txns.filter(t => t.transaction_type === 'Debit').reduce((s, t) => s + Number(t.amount), 0)
  const netBalance = totalCredit - totalDebit

  return (
    <div className="space-y-6">
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Cafeteria Payments"
        subtitle="Student meal wallet — top-ups, deductions and balance tracking"
        icon="💳"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Top-ups', value: fmt(totalCredit), color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: ArrowUpCircle },
          { label: 'Total Deductions', value: fmt(totalDebit), color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: ArrowDownCircle },
          { label: 'Net Balance', value: fmt(netBalance), color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', icon: TrendingUp },
          { label: 'Transactions', value: txns.length, color: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: Wallet },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">{k.label}</p>
              <k.icon size={14} style={{ color: k.color }} />
            </div>
            <p className="text-xl font-bold text-white tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Supported Payment Methods */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Supported Payment Methods</p>
        <div className="flex flex-wrap gap-2">
          {['Cash', 'School Wallet', 'M-Pesa', 'Airtel Money', 'MTN MoMo', 'Bank Transfer'].map(m => (
            <span key={m} className="rounded-full px-3 py-1 text-xs font-semibold text-emerald-300"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'Credit', 'Debit'] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className="rounded-xl px-4 py-2 text-xs font-semibold transition"
              style={{
                background: typeFilter === f ? (f === 'Credit' ? '#10b981' : f === 'Debit' ? '#ef4444' : '#0ea5e9') : 'rgba(255,255,255,0.04)',
                color: typeFilter === f ? (f === 'Credit' ? '#fff' : f === 'Debit' ? '#fff' : '#fff') : '#94a3b8',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
              {f === 'all' ? 'All' : f === 'Credit' ? 'Top-ups' : 'Deductions'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 transition">
          {showForm ? 'Cancel' : '+ Record Transaction'}
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      {/* New Transaction Form */}
      {showForm && (
        <div className="rounded-2xl p-6" style={GLASS}>
          <p className="text-sm font-bold text-white mb-4">Record Wallet Transaction</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select value={studentId} onChange={e => setStudentId(e.target.value)}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2">
              <option value="">Select student *</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} — {s.full_name}</option>)}
            </select>
            <select value={txType} onChange={e => setTxType(e.target.value as 'Credit' | 'Debit')}
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="Credit">Credit (Top-up)</option>
              <option value="Debit">Debit (Deduction)</option>
            </select>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Amount (Ksh) *"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description / reference"
              className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2 lg:col-span-4" />
          </div>
          <button onClick={save} disabled={saving || !studentId || !amount}
            className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">
            {saving ? 'Saving…' : 'Record Transaction'}
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white">Transaction Ledger</p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search size={13} className="text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or description…"
              className="w-full max-w-xs rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Date', 'Student', 'Type', 'Amount', 'Balance After', 'Description'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No transactions found.</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                    {new Date(t.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">{t.student_name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold"
                      style={{ color: t.transaction_type === 'Credit' ? '#10b981' : '#ef4444' }}>
                      {t.transaction_type === 'Credit'
                        ? <ArrowUpCircle size={12} />
                        : <ArrowDownCircle size={12} />}
                      {t.transaction_type === 'Credit' ? 'Top-up' : 'Deduction'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums" style={{ color: t.transaction_type === 'Credit' ? '#10b981' : '#ef4444' }}>
                    {t.transaction_type === 'Credit' ? '+' : '-'}{fmt(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 tabular-nums">{fmt(t.balance_after)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">{t.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
