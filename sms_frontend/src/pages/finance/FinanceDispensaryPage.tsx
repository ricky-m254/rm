import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Visit = { id: number; student_name: string; visit_date: string; complaint: string; diagnosis: string; treatment: string; staff_name: string }
type StockItem = { id: number; item_name: string; quantity: number; unit: string; expiry_date: string; reorder_level: number }

function asArray<T>(v: T[] | { results?: T[] }): T[] {
  if (Array.isArray(v)) return v
  return Array.isArray(v.results) ? v.results : []
}

export default function FinanceDispensaryPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [tab, setTab] = useState<'visits' | 'stock'>('visits')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [rv, rs] = await Promise.all([
          apiClient.get<Visit[] | { results: Visit[] }>('/dispensary/visits/?limit=20'),
          apiClient.get<StockItem[] | { results: StockItem[] }>('/dispensary/stock/'),
        ])
        setVisits(asArray(rv.data)); setStock(asArray(rs.data))
      } catch { setError('Unable to load dispensary data.') }
    }
    void loadAll()
  }, [])

  const lowStock = stock.filter(s => s.quantity <= s.reorder_level)

  return (
    <div className="space-y-6">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Dispensary Finance"
        subtitle="Medical supply costs and dispensary expenses"
        icon="💰"
      />
      <section className="rounded-2xl glass-panel p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
          <h1 className="mt-1 text-2xl font-display font-semibold">Dispensary Records</h1>
          <p className="text-sm text-slate-400 mt-1">Read-only summary. Full management in the Dispensary module.</p>
        </div>
        <Link to="/modules/dispensary" className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 transition">
          Open Dispensary →
        </Link>
      </section>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          ⚠ {lowStock.length} stock item{lowStock.length > 1 ? 's' : ''} at or below reorder level: {lowStock.map(s => s.item_name).join(', ')}
        </div>
      )}

      <div className="flex gap-2">
        {(['visits', 'stock'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-xs font-medium border transition capitalize ${tab === t ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'border-white/[0.09] text-slate-400 hover:bg-slate-800'}`}>
            {t === 'visits' ? 'Recent Visits' : 'Stock Summary'}
          </button>
        ))}
      </div>

      {tab === 'visits' && (
        <div className="rounded-2xl glass-panel overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Complaint</th><th className="px-4 py-3">Diagnosis</th><th className="px-4 py-3">Attended By</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visits.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No visits found.</td></tr>
              ) : visits.map(v => (
                <tr key={v.id} className="hover:bg-white/[0.025] transition">
                  <td className="px-4 py-3 font-mono text-xs">{v.visit_date}</td>
                  <td className="px-4 py-3 font-medium text-white">{v.student_name}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{v.complaint}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{v.diagnosis || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{v.staff_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stock' && (
        <div className="rounded-2xl glass-panel overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/[0.07] bg-slate-950/50 text-slate-400 uppercase text-xs">
              <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Reorder Level</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stock.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No stock items.</td></tr>
              ) : stock.map(s => (
                <tr key={s.id} className="hover:bg-white/[0.025] transition">
                  <td className="px-4 py-3 font-medium text-white">{s.item_name}</td>
                  <td className="px-4 py-3 font-mono">{s.quantity}</td>
                  <td className="px-4 py-3 text-slate-400">{s.unit}</td>
                  <td className="px-4 py-3 text-slate-400">{s.reorder_level}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.expiry_date || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${s.quantity <= s.reorder_level ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{s.quantity <= s.reorder_level ? 'Low' : 'OK'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
