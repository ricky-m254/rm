import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Student = { id: number; full_name: string; admission_number: string }
type MealTransaction = { id: number; student: number; student_name: string; date: string; meal_type: string; served: boolean; notes: string }
type WalletTransaction = { id: number; student: number; student_name: string; transaction_type: string; amount: string; description: string; balance_after: string; created_at: string }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

const fmt = (v: string | number) => `Ksh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

export default function CafeteriaLogsPage() {
  const [mealLogs, setMealLogs] = useState<MealTransaction[]>([])
  const [walletLogs, setWalletLogs] = useState<WalletTransaction[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'meals' | 'wallet'>('meals')

  const [mStudentId, setMStudentId] = useState('')
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0])
  const [mMealType, setMMealType] = useState('Lunch')
  const [mNotes, setMNotes] = useState('')
  const [savingMeal, setSavingMeal] = useState(false)

  const [wStudentId, setWStudentId] = useState('')
  const [wType, setWType] = useState('Credit')
  const [wAmount, setWAmount] = useState('')
  const [wDesc, setWDesc] = useState('')
  const [savingWallet, setSavingWallet] = useState(false)

  const [deleteMealTarget, setDeleteMealTarget] = useState<MealTransaction | null>(null)
  const [deletingMeal, setDeletingMeal] = useState(false)
  const [deleteMealError, setDeleteMealError] = useState<string | null>(null)

  const [deleteWalletTarget, setDeleteWalletTarget] = useState<WalletTransaction | null>(null)
  const [deletingWallet, setDeletingWallet] = useState(false)
  const [deleteWalletError, setDeleteWalletError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, wRes, sRes] = await Promise.all([
        apiClient.get<MealTransaction[] | { results: MealTransaction[] }>('/cafeteria/transactions/'),
        apiClient.get<WalletTransaction[] | { results: WalletTransaction[] }>('/cafeteria/wallet/'),
        apiClient.get<Student[] | { results: Student[] }>('/students/?limit=500'),
      ])
      setMealLogs(asArray(mRes.data)); setWalletLogs(asArray(wRes.data)); setStudents(asArray(sRes.data))
    } catch { setError('Unable to load logs.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const recordMeal = async () => {
    if (!mStudentId || !mDate) return
    setSavingMeal(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/cafeteria/transactions/', { student: Number(mStudentId), date: mDate, meal_type: mMealType, served: true, notes: mNotes })
      setMStudentId(''); setMNotes(''); setNotice('Meal recorded.'); await load()
    } catch { setError('Unable to record meal. This student may already have a record for this date and meal type.') }
    finally { setSavingMeal(false) }
  }

  const recordWallet = async () => {
    if (!wStudentId || !wAmount) return
    setSavingWallet(true); setError(null); setNotice(null)
    try {
      await apiClient.post('/cafeteria/wallet/', { student: Number(wStudentId), transaction_type: wType, amount: Number(wAmount), description: wDesc, balance_after: 0 })
      setWStudentId(''); setWAmount(''); setWDesc(''); setNotice('Wallet transaction recorded.'); await load()
    } catch { setError('Unable to record wallet transaction.') }
    finally { setSavingWallet(false) }
  }

  const confirmDeleteMeal = async () => {
    if (!deleteMealTarget) return
    setDeletingMeal(true); setDeleteMealError(null)
    try { await apiClient.delete(`/cafeteria/transactions/${deleteMealTarget.id}/`); setDeleteMealTarget(null); await load() }
    catch { setDeleteMealError('Unable to delete meal log.') }
    finally { setDeletingMeal(false) }
  }

  const confirmDeleteWallet = async () => {
    if (!deleteWalletTarget) return
    setDeletingWallet(true); setDeleteWalletError(null)
    try { await apiClient.delete(`/cafeteria/wallet/${deleteWalletTarget.id}/`); setDeleteWalletTarget(null); await load() }
    catch { setDeleteWalletError('Unable to delete wallet transaction.') }
    finally { setDeletingWallet(false) }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="CAFETERIA"
        badgeColor="teal"
        title="Meal Logs"
        subtitle="Daily food service records and consumption logs"
        icon="🍽️"
      />
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Daily Logs</h1>
        <p className="mt-1 text-sm text-slate-400">Track daily meal serving and wallet transactions.</p>
      </div>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <div className="flex gap-2 border-b border-white/[0.07] pb-2">
        {(['meals', 'wallet'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${activeTab === tab ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}>{tab === 'meals' ? 'Meal Records' : 'Wallet Transactions'}</button>
        ))}
      </div>

      {activeTab === 'meals' ? (
        <>
          <div className="rounded-2xl glass-panel p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Record Meal Serving</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select value={mStudentId} onChange={e => setMStudentId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2">
                <option value="">Select student *</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.full_name}</option>)}
              </select>
              <input type="date" value={mDate} onChange={e => setMDate(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
              <select value={mMealType} onChange={e => setMMealType(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
                <option>Breakfast</option><option>Lunch</option><option>Supper</option>
              </select>
              <button onClick={recordMeal} disabled={savingMeal || !mStudentId} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{savingMeal ? 'Recording…' : 'Record'}</button>
            </div>
            <input value={mNotes} onChange={e => setMNotes(e.target.value)} placeholder="Notes (optional)" className="mt-3 w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </div>

          <div className="rounded-2xl glass-panel overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.07] text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Meal</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : mealLogs.slice(0, 100).map(m => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-semibold text-slate-200">{m.student_name}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{m.date}</td>
                    <td className="px-4 py-3 text-slate-300">{m.meal_type}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.served ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{m.served ? 'Served' : 'Not served'}</span></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.notes || '-'}</td>
                    <td className="px-4 py-3"><button onClick={() => setDeleteMealTarget(m)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button></td>
                  </tr>
                ))}
                {!loading && mealLogs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No meal records.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl glass-panel p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Record Wallet Transaction</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select value={wStudentId} onChange={e => setWStudentId(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2">
                <option value="">Select student *</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.full_name}</option>)}
              </select>
              <select value={wType} onChange={e => setWType(e.target.value)} className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
                <option>Credit</option><option>Debit</option>
              </select>
              <input type="number" value={wAmount} onChange={e => setWAmount(e.target.value)} placeholder="Amount (Ksh) *" className="rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
              <button onClick={recordWallet} disabled={savingWallet || !wStudentId || !wAmount} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">{savingWallet ? 'Recording…' : 'Record'}</button>
            </div>
            <input value={wDesc} onChange={e => setWDesc(e.target.value)} placeholder="Description (optional)" className="mt-3 w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
          </div>

          <div className="rounded-2xl glass-panel overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.07] text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Balance After</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> : walletLogs.slice(0, 100).map(w => (
                  <tr key={w.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-semibold text-slate-200">{w.student_name}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${w.transaction_type === 'Credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{w.transaction_type}</span></td>
                    <td className={`px-4 py-3 font-semibold ${w.transaction_type === 'Credit' ? 'text-emerald-400' : 'text-rose-400'}`}>{w.transaction_type === 'Credit' ? '+' : '-'}{fmt(w.amount)}</td>
                    <td className="px-4 py-3 text-slate-300">{fmt(w.balance_after)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{w.description || '-'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><button onClick={() => setDeleteWalletTarget(w)} className="text-xs font-semibold text-rose-400 hover:text-rose-300">Delete</button></td>
                  </tr>
                ))}
                {!loading && walletLogs.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No wallet transactions.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog open={!!deleteMealTarget} title="Delete Meal Record" description={`Delete meal record for ${deleteMealTarget?.student_name} on ${deleteMealTarget?.date}?`} confirmLabel="Delete" isProcessing={deletingMeal} error={deleteMealError} onConfirm={confirmDeleteMeal} onCancel={() => setDeleteMealTarget(null)} />
      <ConfirmDialog open={!!deleteWalletTarget} title="Delete Wallet Transaction" description={`Delete ${deleteWalletTarget?.transaction_type} of ${deleteWalletTarget?.amount} for ${deleteWalletTarget?.student_name}?`} confirmLabel="Delete" isProcessing={deletingWallet} error={deleteWalletError} onConfirm={confirmDeleteWallet} onCancel={() => setDeleteWalletTarget(null)} />
    </div>
  )
}
