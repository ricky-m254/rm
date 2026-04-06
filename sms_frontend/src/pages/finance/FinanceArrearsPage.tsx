import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type ArrearRow = {
  invoice_id: number
  invoice_number: string
  student_id: number
  student_name: string
  admission_number: string
  class_name: string
  term: string
  total_amount: number
  balance_due: number
  due_date: string
  status: string
}

type ClassGroup = {
  class_name: string
  student_count: number
  total_balance: number
  invoices: ArrearRow[]
}

type Term = { id: number; name: string }

type CarryForward = {
  id: number
  student_name: string
  student_admission_number: string
  from_term_name: string
  to_term_name: string
  amount: string
  notes: string
  created_at: string
}

type CFForm = {
  student: string
  from_term: string
  to_term: string
  amount: string
  notes: string
}

const fmt = (v: number) => v.toLocaleString('en-KE', { minimumFractionDigits: 2 })

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const msgs = Object.values(data as Record<string, unknown>).flat()
    if (msgs.length) return (msgs as string[]).join(' ')
  }
  return fallback
}

const statusColor = (s: string) => {
  if (s === 'OVERDUE') return 'bg-red-500/20 text-red-300'
  if (s === 'PARTIALLY_PAID') return 'bg-amber-500/20 text-amber-300'
  return 'bg-orange-500/20 text-orange-300'
}

export default function FinanceArrearsPage() {
  const navigate = useNavigate()
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [groupBy, setGroupBy] = useState<'student' | 'class'>('student')
  const [rows, setRows] = useState<ArrearRow[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [totalBalance, setTotalBalance] = useState(0)
  const [tab, setTab] = useState<'arrears' | 'carry-forward'>('arrears')
  const [carryForwards, setCarryForwards] = useState<CarryForward[]>([])
  const [cfLoading, setCfLoading] = useState(false)
  const [showCfForm, setShowCfForm] = useState(false)
  const [cfForm, setCfForm] = useState<CFForm>({ student: '', from_term: '', to_term: '', amount: '', notes: '' })
  const [cfSaving, setCfSaving] = useState(false)
  const [cfError, setCfError] = useState('')
  const [students, setStudents] = useState<{ id: number; name: string; admission_number: string }[]>([])

  useEffect(() => {
    apiClient.get('/finance/terms/').then(r => setTerms(r.data.results ?? r.data))
    apiClient.get('/finance/ref/students/').then(r =>
      setStudents((r.data.results ?? r.data).map((s: { id: number; first_name: string; last_name: string; admission_number: string }) => ({
        id: s.id, name: `${s.first_name} ${s.last_name}`.trim(), admission_number: s.admission_number,
      })))
    )
  }, [])

  const loadArrears = async () => {
    setLoading(true)
    const params: Record<string, string> = { group_by: groupBy }
    if (selectedTerm) params.term = selectedTerm
    const r = await apiClient.get('/finance/reports/arrears/', { params })
    if (groupBy === 'class') {
      setClassGroups(r.data.data || [])
      setRows([])
      setTotalBalance((r.data.data || []).reduce((s: number, g: ClassGroup) => s + g.total_balance, 0))
    } else {
      setRows(r.data.results || [])
      setClassGroups([])
      setTotalBalance((r.data.results || []).reduce((s: number, row: ArrearRow) => s + row.balance_due, 0))
    }
    setLoading(false)
  }

  const loadCarryForwards = async () => {
    setCfLoading(true)
    const r = await apiClient.get('/finance/carry-forwards/')
    setCarryForwards(r.data.results ?? r.data)
    setCfLoading(false)
  }

  useEffect(() => {
    if (tab === 'arrears') loadArrears()
    else loadCarryForwards()
  }, [tab, selectedTerm, groupBy])

  const handleCfSave = async () => {
    setCfSaving(true); setCfError('')
    try {
      await apiClient.post('/finance/carry-forwards/', {
        student: parseInt(cfForm.student),
        from_term: parseInt(cfForm.from_term),
        to_term: parseInt(cfForm.to_term),
        amount: cfForm.amount,
        notes: cfForm.notes,
      })
      setShowCfForm(false); loadCarryForwards()
    } catch (err) { setCfError(extractApiError(err, 'Failed to save.')) }
    finally { setCfSaving(false) }
  }

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
        title="Fee Arrears"
        subtitle="Students with outstanding fee balances"
        icon="💰"
      />
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Arrears Management</h1>
            <p className="mt-1 text-sm text-slate-400">Track outstanding balances and carry forwards between terms</p>
          </div>
          {tab === 'carry-forward' && (
            <button onClick={() => { setCfForm({ student: '', from_term: '', to_term: '', amount: '', notes: '' }); setCfError(''); setShowCfForm(true) }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
              + Add Carry Forward
            </button>
          )}
          <PrintButton />
        </div>
        <div className="mt-4 flex gap-4 border-b border-white/[0.09]">
          {(['arrears', 'carry-forward'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition ${tab === t ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {t === 'arrears' ? 'Arrears List' : 'Carry Forwards'}
            </button>
          ))}
        </div>
      </header>

      {tab === 'arrears' && (
        <>
          <div className="col-span-12 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Term:</span>
              <select className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                <option value="">All Terms</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Group by:</span>
              <select className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400" value={groupBy} onChange={e => setGroupBy(e.target.value as 'student' | 'class')}>
                <option value="student">Student</option>
                <option value="class">Class</option>
              </select>
            </div>
            {totalBalance > 0 && (
              <div className="ml-auto rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                Total Outstanding: <strong>KES {fmt(totalBalance)}</strong>
              </div>
            )}
          </div>

          {loading && <p className="col-span-12 text-slate-400 text-sm">Loading…</p>}

          {!loading && groupBy === 'student' && (
            <section className="col-span-12 rounded-2xl glass-panel overflow-x-auto">
              <table className="w-full text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4 text-left">Invoice</th>
                    <th className="px-5 py-4 text-left">Student</th>
                    <th className="px-5 py-4 text-left">Adm. No.</th>
                    <th className="px-5 py-4 text-left">Class</th>
                    <th className="px-5 py-4 text-left">Term</th>
                    <th className="px-5 py-4 text-right">Billed</th>
                    <th className="px-5 py-4 text-right">Balance Due</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-left">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-slate-500">No outstanding arrears found.</td></tr>
                  )}
                  {rows.map(row => (
                    <tr key={row.invoice_id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.invoice_number}</td>
                      <td className="px-5 py-3 font-medium text-white">
                        <button onClick={() => navigate(`/modules/finance/ledger?student=${row.student_id}`)} className="hover:text-emerald-400 transition text-left">
                          {row.student_name}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{row.admission_number}</td>
                      <td className="px-5 py-3 text-slate-400">{row.class_name}</td>
                      <td className="px-5 py-3 text-slate-400">{row.term}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-300">{fmt(row.total_amount)}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-red-400">{fmt(row.balance_due)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(row.status)}`}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{row.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!loading && groupBy === 'class' && (
            <div className="col-span-12 space-y-4">
              {classGroups.length === 0 && <p className="text-slate-500 text-center py-10">No outstanding arrears found.</p>}
              {classGroups.map(group => (
                <section key={group.class_name} className="rounded-2xl glass-panel overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.09]">
                    <div>
                      <span className="font-semibold text-white">{group.class_name}</span>
                      <span className="ml-3 text-slate-500 text-sm">{group.student_count} student{group.student_count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="font-semibold text-red-400">KES {fmt(group.total_balance)}</span>
                  </div>
                  <table className="w-full text-sm text-slate-200">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-slate-600">
                        <th className="px-5 py-2 text-left">Student</th>
                        <th className="px-5 py-2 text-left">Term</th>
                        <th className="px-5 py-2 text-right">Balance Due</th>
                        <th className="px-5 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {group.invoices.map(row => (
                        <tr key={row.invoice_id} className="hover:bg-white/[0.02] transition">
                          <td className="px-5 py-2 text-slate-300">{row.student_name} <span className="text-slate-600 text-xs">({row.admission_number})</span></td>
                          <td className="px-5 py-2 text-slate-400">{row.term}</td>
                          <td className="px-5 py-2 text-right font-mono font-semibold text-red-400">{fmt(row.balance_due)}</td>
                          <td className="px-5 py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(row.status)}`}>{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'carry-forward' && (
        <>
          {cfLoading && <p className="col-span-12 text-slate-400 text-sm">Loading…</p>}
          {!cfLoading && (
            <section className="col-span-12 rounded-2xl glass-panel overflow-x-auto">
              <table className="w-full text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4 text-left">Student</th>
                    <th className="px-5 py-4 text-left">Adm. No.</th>
                    <th className="px-5 py-4 text-left">From Term</th>
                    <th className="px-5 py-4 text-left">To Term</th>
                    <th className="px-5 py-4 text-right">Amount (KES)</th>
                    <th className="px-5 py-4 text-left">Notes</th>
                    <th className="px-5 py-4 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {carryForwards.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-500">No carry forwards recorded yet.</td></tr>
                  )}
                  {carryForwards.map(cf => (
                    <tr key={cf.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3 font-medium text-white">{cf.student_name}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{cf.student_admission_number}</td>
                      <td className="px-5 py-3 text-slate-400">{cf.from_term_name}</td>
                      <td className="px-5 py-3 text-slate-400">{cf.to_term_name}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-red-400">{fmt(parseFloat(cf.amount))}</td>
                      <td className="px-5 py-3 text-slate-500">{cf.notes || '—'}</td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{new Date(cf.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {showCfForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-white">Add Balance Carry Forward</h2>
            {cfError && <p className="mb-3 text-sm text-red-400">{cfError}</p>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Student</label>
                <select className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={cfForm.student} onChange={e => setCfForm(f => ({ ...f, student: e.target.value }))}>
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admission_number})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">From Term</label>
                  <select className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={cfForm.from_term} onChange={e => setCfForm(f => ({ ...f, from_term: e.target.value }))}>
                    <option value="">Select…</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">To Term</label>
                  <select className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={cfForm.to_term} onChange={e => setCfForm(f => ({ ...f, to_term: e.target.value }))}>
                    <option value="">Select…</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Amount (KES)</label>
                <input type="number" min="0" step="0.01" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={cfForm.amount} onChange={e => setCfForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Notes</label>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={cfForm.notes} onChange={e => setCfForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowCfForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={handleCfSave} disabled={cfSaving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">{cfSaving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
