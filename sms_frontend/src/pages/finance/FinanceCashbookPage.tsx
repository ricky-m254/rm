import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type Entry = {
  id: number
  book_type: string
  entry_date: string
  entry_type: string
  reference: string
  description: string
  amount_in: string
  amount_out: string
  running_balance: string
  is_auto: boolean
}

type Summary = {
  cash: { total_in: number; total_out: number; closing_balance: number; opening_balance: number; entry_count: number }
  bank: { total_in: number; total_out: number; closing_balance: number; opening_balance: number; entry_count: number }
}

type FormState = {
  book_type: string
  entry_date: string
  entry_type: string
  reference: string
  description: string
  amount_in: string
  amount_out: string
}

const blankForm: FormState = {
  book_type: 'CASH',
  entry_date: new Date().toISOString().slice(0, 10),
  entry_type: 'RECEIPT',
  reference: '',
  description: '',
  amount_in: '',
  amount_out: '',
}

const fmt = (v: number | string) => parseFloat(String(v) || '0').toLocaleString('en-KE', { minimumFractionDigits: 2 })

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const msgs = Object.values(data as Record<string, unknown>).flat()
    if (msgs.length) return (msgs as string[]).join(' ')
  }
  return fallback
}

export default function FinanceCashbookPage() {
  const navigate = useNavigate()
  const [activeBook, setActiveBook] = useState<'CASH' | 'BANK'>('CASH')
  const [entries, setEntries] = useState<Entry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = async () => {
    setLoading(true)
    const params: Record<string, string> = { book_type: activeBook }
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    const [entriesRes, summaryRes] = await Promise.all([
      apiClient.get('/finance/cashbook/', { params }),
      apiClient.get('/finance/cashbook/summary/'),
    ])
    setEntries(entriesRes.data.results ?? entriesRes.data)
    setSummary(summaryRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [activeBook, dateFrom, dateTo])

  const openCreate = () => { setForm({ ...blankForm, book_type: activeBook }); setSaveError(''); setShowForm(true) }

  const handleSave = async () => {
    setSaving(true); setSaveError('')
    try {
      await apiClient.post('/finance/cashbook/', {
        ...form, amount_in: form.amount_in || '0', amount_out: form.amount_out || '0'
      })
      setShowForm(false); load()
    } catch (err) { setSaveError(extractApiError(err, 'Failed to save entry.')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await apiClient.delete(`/finance/cashbook/${deleteTarget.id}/`)
    setDeleteTarget(null); load()
  }

  const activeSummary = summary?.[activeBook.toLowerCase() as 'cash' | 'bank']

  const typeColor = (t: string) => {
    if (t === 'RECEIPT') return 'bg-emerald-500/20 text-emerald-300'
    if (t === 'EXPENSE') return 'bg-red-500/20 text-red-300'
    if (t === 'OPENING') return 'bg-blue-500/20 text-blue-300'
    return 'bg-slate-700 text-slate-300'
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
        title="Cashbook"
        subtitle="Daily cash receipts and payments"
        icon="💰"
      />
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Cashbook & Bankbook</h1>
            <p className="mt-1 text-sm text-slate-400">Daily transaction ledger with running balances</p>
          </div>
          <button onClick={openCreate} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
            + Add Entry
          </button>
          <PrintButton />
        </div>
        <div className="mt-4 flex gap-2">
          {(['CASH', 'BANK'] as const).map(bt => (
            <button key={bt} onClick={() => setActiveBook(bt)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition ${activeBook === bt ? 'bg-emerald-500 text-white' : 'border border-white/[0.09] text-slate-300 hover:bg-slate-800'}`}>
              {bt === 'CASH' ? 'Cashbook' : 'Bankbook'}
            </button>
          ))}
        </div>
      </header>

      {activeSummary && (
        <section className="col-span-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Opening Balance', value: activeSummary.opening_balance, color: 'text-slate-300' },
            { label: 'Total Receipts', value: activeSummary.total_in, color: 'text-emerald-400' },
            { label: 'Total Payments', value: activeSummary.total_out, color: 'text-red-400' },
            { label: 'Closing Balance', value: activeSummary.closing_balance, color: 'text-blue-400' },
          ].map(card => (
            <div key={card.label} className="rounded-2xl glass-panel p-5">
              <p className="text-xs uppercase text-slate-500">{card.label}</p>
              <p className={`mt-2 text-xl font-bold font-mono ${card.color}`}>KES {fmt(card.value)}</p>
            </div>
          ))}
        </section>
      )}

      <div className="col-span-12 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-sm text-slate-500 hover:text-slate-300 underline">Clear</button>
        )}
      </div>

      <section className="col-span-12 rounded-2xl glass-panel overflow-x-auto">
        {loading ? (
          <p className="p-6 text-slate-400 text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm text-slate-200">
            <thead>
              <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 text-left">Date</th>
                <th className="px-5 py-4 text-left">Type</th>
                <th className="px-5 py-4 text-left">Reference</th>
                <th className="px-5 py-4 text-left">Description</th>
                <th className="px-5 py-4 text-right">In (KES)</th>
                <th className="px-5 py-4 text-right">Out (KES)</th>
                <th className="px-5 py-4 text-right">Balance (KES)</th>
                <th className="px-5 py-4 text-center">Source</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {entries.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-slate-500">No entries for this period.</td></tr>
              )}
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-5 py-3 text-slate-400">{e.entry_date}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeColor(e.entry_type)}`}>{e.entry_type}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{e.reference || '—'}</td>
                  <td className="px-5 py-3 text-slate-300">{e.description}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-400">{parseFloat(e.amount_in) > 0 ? fmt(e.amount_in) : ''}</td>
                  <td className="px-5 py-3 text-right font-mono text-red-400">{parseFloat(e.amount_out) > 0 ? fmt(e.amount_out) : ''}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-blue-300">{fmt(e.running_balance)}</td>
                  <td className="px-5 py-3 text-center">
                    {e.is_auto ? <span className="text-xs text-slate-600">Auto</span> : <span className="text-xs text-emerald-500">Manual</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!e.is_auto && (
                      <button onClick={() => setDeleteTarget(e)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-white">Add Entry</h2>
            {saveError && <p className="mb-3 text-sm text-red-400">{saveError}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Book</label>
                  <select className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.book_type} onChange={e => setForm(f => ({ ...f, book_type: e.target.value }))}>
                    <option value="CASH">Cashbook</option>
                    <option value="BANK">Bankbook</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Type</label>
                  <select className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.entry_type} onChange={e => setForm(f => ({ ...f, entry_type: e.target.value }))}>
                    <option value="OPENING">Opening Balance</option>
                    <option value="RECEIPT">Receipt</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Date</label>
                <input type="date" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Description</label>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Reference</label>
                <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Amount In (KES)</label>
                  <input type="number" min="0" step="0.01" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.amount_in} onChange={e => setForm(f => ({ ...f, amount_in: e.target.value, amount_out: '' }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Amount Out (KES)</label>
                  <input type="number" min="0" step="0.01" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.amount_out} onChange={e => setForm(f => ({ ...f, amount_out: e.target.value, amount_in: '' }))} />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Entry"
        description={`Delete "${deleteTarget?.description}"? Running balances will be recomputed.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
