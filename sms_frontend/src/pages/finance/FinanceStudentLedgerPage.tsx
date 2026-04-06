import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type Student = { id: number; first_name: string; last_name: string; admission_number: string }

type LedgerEntry = {
  date: string
  type: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT' | 'CARRY_FORWARD'
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  status?: string
  term?: string
  invoice_id?: number
  payment_id?: number
}

type LedgerResponse = {
  student: { id: number; name: string; admission_number: string; class_name: string; current_term: string }
  entry_count: number
  closing_balance: number
  entries: LedgerEntry[]
}

const fmt = (v: number) => v.toLocaleString('en-KE', { minimumFractionDigits: 2 })

const TYPE_LABELS: Record<string, string> = {
  INVOICE: 'Invoice',
  PAYMENT: 'Payment',
  ADJUSTMENT: 'Adjustment',
  CARRY_FORWARD: 'Carry Forward',
}

const TYPE_COLORS: Record<string, string> = {
  INVOICE: 'bg-blue-500/20 text-blue-300',
  PAYMENT: 'bg-emerald-500/20 text-emerald-300',
  ADJUSTMENT: 'bg-amber-500/20 text-amber-300',
  CARRY_FORWARD: 'bg-purple-500/20 text-purple-300',
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'text-emerald-300',
  DRAFT: 'text-slate-400',
  VOID: 'text-rose-400',
  REVERSED: 'text-rose-400',
  ACTIVE: 'text-emerald-300',
  POSTED: 'text-slate-300',
}

type TabKey = 'all' | 'invoices' | 'payments' | 'adjustments' | 'carry_forwards'

const TABS: { key: TabKey; label: string; type?: LedgerEntry['type'] }[] = [
  { key: 'all', label: 'All Transactions' },
  { key: 'invoices', label: 'Invoices', type: 'INVOICE' },
  { key: 'payments', label: 'Payments', type: 'PAYMENT' },
  { key: 'adjustments', label: 'Adjustments', type: 'ADJUSTMENT' },
  { key: 'carry_forwards', label: 'Carry Forwards', type: 'CARRY_FORWARD' },
]

function LedgerTable({ entries, showBalance }: { entries: LedgerEntry[]; showBalance: boolean }) {
  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No records found.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-slate-200">
        <thead>
          <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
            <th className="px-5 py-3 text-left">Date</th>
            <th className="px-5 py-3 text-left">Type</th>
            <th className="px-5 py-3 text-left">Reference</th>
            <th className="px-5 py-3 text-left">Description</th>
            {entries[0]?.term !== undefined && <th className="px-5 py-3 text-left">Term</th>}
            <th className="px-5 py-3 text-right">Debit (KES)</th>
            <th className="px-5 py-3 text-right">Credit (KES)</th>
            {showBalance && <th className="px-5 py-3 text-right">Balance (KES)</th>}
            <th className="px-5 py-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {entries.map((entry, i) => (
            <tr key={i} className="hover:bg-white/[0.02] transition">
              <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{entry.date}</td>
              <td className="px-5 py-3">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[entry.type] ?? 'bg-slate-700 text-slate-300'}`}>
                  {TYPE_LABELS[entry.type] ?? entry.type}
                </span>
              </td>
              <td className="px-5 py-3 font-mono text-xs text-slate-300">{entry.reference}</td>
              <td className="px-5 py-3 text-slate-300 max-w-xs truncate">{entry.description}</td>
              {entry.term !== undefined && <td className="px-5 py-3 text-xs text-slate-400">{entry.term || '—'}</td>}
              <td className="px-5 py-3 text-right font-mono text-red-400">{entry.debit > 0 ? fmt(entry.debit) : ''}</td>
              <td className="px-5 py-3 text-right font-mono text-emerald-400">{entry.credit > 0 ? fmt(entry.credit) : ''}</td>
              {showBalance && (
                <td className={`px-5 py-3 text-right font-mono font-semibold ${entry.balance > 0 ? 'text-red-300' : entry.balance < 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {fmt(Math.abs(entry.balance))}{entry.balance < 0 ? ' CR' : entry.balance > 0 ? ' DR' : ''}
                </td>
              )}
              <td className="px-5 py-3 text-center">
                <span className={`text-xs ${STATUS_COLORS[entry.status ?? ''] ?? 'text-slate-500'}`}>
                  {entry.status || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        {showBalance && entries.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-600 bg-white/[0.03]">
              <td colSpan={5} className="px-5 py-3 text-right text-xs text-slate-400 font-semibold">Closing Balance</td>
              <td colSpan={3} className={`px-5 py-3 text-right font-mono font-bold text-base ${entries[entries.length - 1].balance > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                KES {fmt(Math.abs(entries[entries.length - 1].balance))}
                {entries[entries.length - 1].balance > 0 ? ' DR' : entries[entries.length - 1].balance < 0 ? ' CR' : ''}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default function FinanceStudentLedgerPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [students, setStudents] = useState<Student[]>([])
  const [terms, setTerms] = useState<{ id: number; name: string }[]>([])
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('student') || '')
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  useEffect(() => {
    Promise.all([
      apiClient.get('/finance/ref/students/'),
      apiClient.get('/finance/terms/'),
    ]).then(([sRes, tRes]) => {
      setStudents(sRes.data.results ?? sRes.data)
      setTerms(tRes.data.results ?? tRes.data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedStudent) loadLedger()
    else setLedger(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, selectedTerm, dateFrom, dateTo])

  const loadLedger = async () => {
    if (!selectedStudent) return
    setLoading(true); setError('')
    try {
      const params: Record<string, string> = {}
      if (selectedTerm) params.term = selectedTerm
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const r = await apiClient.get<LedgerResponse>(`/finance/students/${selectedStudent}/ledger/`, { params })
      setLedger(r.data)
      setActiveTab('all')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) setError('Student not found.')
      else if (status === 403) setError('You do not have permission to view this ledger.')
      else if (status === 500) setError('A server error occurred loading the ledger. Please try again later.')
      else setError('Failed to load ledger — check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectStudent = (s: Student) => {
    setSelectedStudent(String(s.id))
    setSelectedStudentName(`${s.first_name} ${s.last_name} (${s.admission_number})`)
    setSearchQuery(`${s.first_name} ${s.last_name} (${s.admission_number})`)
    setShowSuggestions(false)
    setSearchParams({ student: String(s.id) })
  }

  const clearStudent = () => {
    setSelectedStudent('')
    setSelectedStudentName('')
    setSearchQuery('')
    setShowSuggestions(false)
    setLedger(null)
    setError('')
    setSearchParams({})
  }

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || selectedStudentName === searchQuery) return []
    return students.filter(s =>
      `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [students, searchQuery, selectedStudentName])

  const tabEntries = useMemo(() => {
    if (!ledger) return []
    const tab = TABS.find(t => t.key === activeTab)
    if (!tab?.type) return ledger.entries
    return ledger.entries.filter(e => e.type === tab.type)
  }, [ledger, activeTab])

  const tabCounts = useMemo(() => {
    if (!ledger) return {} as Record<TabKey, number>
    return {
      all: ledger.entries.length,
      invoices: ledger.entries.filter(e => e.type === 'INVOICE').length,
      payments: ledger.entries.filter(e => e.type === 'PAYMENT').length,
      adjustments: ledger.entries.filter(e => e.type === 'ADJUSTMENT').length,
      carry_forwards: ledger.entries.filter(e => e.type === 'CARRY_FORWARD').length,
    }
  }, [ledger])

  const totals = useMemo(() => {
    if (!ledger) return { invoiced: 0, paid: 0, adjustments: 0, carryForward: 0 }
    const invoiced = ledger.entries.filter(e => e.type === 'INVOICE').reduce((s, e) => s + e.debit, 0)
    const paid = ledger.entries.filter(e => e.type === 'PAYMENT').reduce((s, e) => s + e.credit, 0)
    const adjDebit = ledger.entries.filter(e => e.type === 'ADJUSTMENT').reduce((s, e) => s + e.debit, 0)
    const adjCredit = ledger.entries.filter(e => e.type === 'ADJUSTMENT').reduce((s, e) => s + e.credit, 0)
    const carryForward = ledger.entries.filter(e => e.type === 'CARRY_FORWARD').reduce((s, e) => s + e.debit - e.credit, 0)
    return { invoiced, paid, adjustments: adjDebit - adjCredit, carryForward }
  }, [ledger])

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <button onClick={() => navigate('/modules/finance')} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition">
          ← Back to Finance
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Student Ledger"
        subtitle="Per-student fee account and transaction history"
        icon="💰"
      />
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Student Account Ledger</h1>
            <p className="mt-1 text-sm text-slate-400">Full financial statement — invoices, payments, adjustments, carry-forwards</p>
          </div>
          {ledger && (
            <PrintButton label="Print Statement" />
          )}
        </div>
      </header>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-64">
            <label className="mb-1 block text-xs text-slate-400">Search student by name or admission number</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="Type name or admission no. (e.g. Alice or ST001)…"
                value={searchQuery}
                autoComplete="off"
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(true)
                  if (!e.target.value) clearStudent()
                }}
                onFocus={() => { if (searchQuery && !selectedStudentName) setShowSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {selectedStudent && (
                <button onClick={clearStudent} className="shrink-0 rounded-lg border border-white/[0.09] px-2 py-2 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition" title="Clear">✕</button>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-30 mt-1 w-full rounded-xl border border-white/[0.09] bg-[#0d1421] shadow-xl overflow-hidden">
                {suggestions.map(s => (
                  <li key={s.id}>
                    <button
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-800 transition flex items-center justify-between gap-2"
                      onMouseDown={() => selectStudent(s)}
                    >
                      <span className="text-white">{s.first_name} {s.last_name}</span>
                      <span className="text-xs text-slate-400 font-mono">{s.admission_number}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showSuggestions && searchQuery.trim().length > 1 && suggestions.length === 0 && !selectedStudentName && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-4 py-3 text-sm text-slate-500">
                No students match "{searchQuery}"
              </div>
            )}
            {selectedStudent && (
              <p className="mt-1 text-xs text-emerald-400">✓ Student selected — ledger loaded below</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Term</label>
            <select className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">From Date</label>
            <input type="date" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">To Date</label>
            <input type="date" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      {!selectedStudent && (
        <div className="col-span-12 rounded-2xl glass-panel py-14 text-center text-slate-500">
          Search and select a student above to view their account ledger.
        </div>
      )}

      {loading && (
        <div className="col-span-12 flex items-center justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      )}

      {ledger && !loading && (
        <>
          <section className="col-span-12 grid grid-cols-2 gap-4 md:grid-cols-6">
            <div className="col-span-2 rounded-2xl glass-panel p-5">
              <p className="text-xs uppercase text-slate-500">Student</p>
              <p className="mt-1 font-semibold text-white">{ledger.student.name}</p>
              <p className="text-xs text-slate-400">{ledger.student.admission_number}</p>
            </div>
            <div className="rounded-2xl glass-panel p-5">
              <p className="text-xs uppercase text-slate-500">Class</p>
              <p className="mt-1 font-semibold text-white text-sm">{ledger.student.class_name}</p>
              <p className="text-xs text-slate-400">{ledger.student.current_term}</p>
            </div>
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
              <p className="text-xs uppercase text-slate-500">Invoiced</p>
              <p className="mt-1 font-mono font-bold text-blue-300 text-sm">KES {fmt(totals.invoiced)}</p>
              <p className="text-xs text-slate-500">{tabCounts.invoices ?? 0} invoice{tabCounts.invoices !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <p className="text-xs uppercase text-slate-500">Paid</p>
              <p className="mt-1 font-mono font-bold text-emerald-300 text-sm">KES {fmt(totals.paid)}</p>
              <p className="text-xs text-slate-500">{tabCounts.payments ?? 0} payment{tabCounts.payments !== 1 ? 's' : ''}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${ledger.closing_balance > 0 ? 'border-red-500/40 bg-red-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
              <p className="text-xs uppercase text-slate-400">Balance</p>
              <p className={`mt-1 font-mono font-bold text-sm ${ledger.closing_balance > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                KES {fmt(Math.abs(ledger.closing_balance))}
              </p>
              <p className="text-xs text-slate-500">{ledger.closing_balance > 0 ? 'Owing' : ledger.closing_balance < 0 ? 'Overpaid' : 'Settled'}</p>
            </div>
          </section>

          <section className="col-span-12 rounded-2xl glass-panel overflow-hidden">
            <div className="border-b border-white/[0.09] flex overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-5 py-4 text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-b-2 border-emerald-500 text-emerald-300 bg-emerald-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.025]'
                  }`}
                >
                  {tab.label}
                  {ledger && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/60 text-slate-400'}`}>
                      {tabCounts[tab.key] ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <LedgerTable entries={tabEntries} showBalance={activeTab === 'all'} />
          </section>
        </>
      )}
    </section>
  )
}
