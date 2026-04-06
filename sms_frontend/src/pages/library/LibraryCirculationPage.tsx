import { useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import { Search, RotateCcw, BookOpen, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

interface Transaction {
  id: number
  member: number
  member_name: string
  member_member_id: string
  copy: number
  copy_accession_number: string
  resource_title: string
  issue_date: string
  due_date: string
  return_date: string | null
  transaction_type: string
  renewal_count: number
  is_overdue: boolean
  overdue_days: number
}

type StatusFilter = 'all' | 'Active' | 'Overdue' | 'Returned'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active:   { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
  Overdue:  { bg: 'rgba(239,68,68,0.15)',   text: '#fca5a5' },
  Returned: { bg: 'rgba(99,102,241,0.15)',  text: '#a5b4fc' },
}

function txnStatus(t: Transaction): string {
  if (t.return_date) return 'Returned'
  if (t.is_overdue) return 'Overdue'
  return 'Active'
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

export default function LibraryCirculationPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get('/library/circulation/transactions/')
      const data = r.data
      setTransactions(Array.isArray(data) ? data : data.results ?? [])
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleReturn = async (txn: Transaction) => {
    setActionBusy(txn.id)
    try {
      await apiClient.post('/library/circulation/return/', {
        copy_id: txn.copy,
        member_id: txn.member,
      })
      showToast(`"${txn.resource_title}" returned successfully`)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Return failed'
      showToast(msg, false)
    } finally {
      setActionBusy(null)
    }
  }

  const handleRenew = async (txn: Transaction) => {
    setActionBusy(txn.id)
    try {
      await apiClient.post('/library/circulation/renew/', {
        transaction_id: txn.id,
      })
      showToast(`"${txn.resource_title}" renewed for 14 days`)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Renewal failed'
      showToast(msg, false)
    } finally {
      setActionBusy(null)
    }
  }

  const filtered = transactions.filter(t => {
    const status = txnStatus(t)
    const matchStatus = statusFilter === 'all' || status === statusFilter
    const matchSearch = search === '' ||
      (t.member_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.resource_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.copy_accession_number || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const active   = transactions.filter(t => txnStatus(t) === 'Active').length
  const overdue  = transactions.filter(t => txnStatus(t) === 'Overdue').length
  const returned = transactions.filter(t => txnStatus(t) === 'Returned').length

  const handleSearch = (e: FormEvent) => e.preventDefault()

  return (
    <div className="space-y-6">
      <PageHero badge="LIBRARY" badgeColor="teal" title="Circulation" subtitle="Track borrowing, returns and renewals" icon="🔄" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all"
          style={{ background: toast.ok ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)', color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Currently Borrowed', value: active,   icon: BookOpen,     color: '#10b981' },
          { label: 'Overdue',            value: overdue,  icon: AlertTriangle, color: '#ef4444' },
          { label: 'Returned',           value: returned, icon: CheckCircle,  color: '#6366f1' },
        ].map(s => {
          const Icon = s.icon
          return (
            <GlassCard key={s.label} className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                <Icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-white">{loading ? '…' : s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search member, book, or accession number…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </form>
        <div className="flex gap-2">
          {(['all', 'Active', 'Overdue', 'Returned'] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
              style={statusFilter === f
                ? { background: '#6366f1', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="text-indigo-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-slate-400 text-sm">No transactions found. Issue books using the Borrow flow to see records here.</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['#', 'Member', 'Accession', 'Book Title', 'Issued', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const status = txnStatus(t)
                const sc = STATUS_COLORS[status]
                const busy = actionBusy === t.id
                return (
                  <tr key={t.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 text-slate-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{t.member_name || t.member_member_id}</p>
                      <p className="text-xs text-slate-500">{t.member_member_id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{t.copy_accession_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{t.resource_title}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{t.issue_date}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="flex items-center gap-1" style={{ color: t.is_overdue ? '#fca5a5' : '#cbd5e1' }}>
                        <Clock size={11} /> {t.due_date}
                        {t.is_overdue && <span className="ml-1 text-rose-400">({t.overdue_days}d)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: sc.bg, color: sc.text }}>{status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {status !== 'Returned' && (
                          <button
                            disabled={busy}
                            onClick={() => handleReturn(t)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                            {busy ? <Loader2 size={10} className="inline animate-spin" /> : 'Return'}
                          </button>
                        )}
                        {status === 'Active' && t.renewal_count < 2 && (
                          <button
                            disabled={busy}
                            onClick={() => handleRenew(t)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                            style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                            <RotateCcw size={11} className="inline mr-1" />
                            {busy ? '…' : 'Renew'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  )
}
