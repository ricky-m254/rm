import { useEffect, useState } from 'react'
import { Users, Plus, Building2, Package, Loader2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

const DEPARTMENTS = ['Science', 'Administration', 'Cafeteria', 'IT', 'Maintenance', 'Academics', 'HR', 'Library', 'Sports', 'Other']

type StoreItem = { id: number; name: string; unit: string; current_stock: number }
type Transaction = {
  id: number
  reference: string
  item: number
  item_name: string
  item_unit: string
  department: string
  quantity: number
  purpose: string
  performed_by_name: string
  date: string
}

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function StoreAllocationPage() {
  const [allocations, setAllocations] = useState<Transaction[]>([])
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filterDept, setFilterDept] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ item: '', department: '', quantity: '', purpose: '' })

  const load = async () => {
    try {
      setLoading(true)
      const [txRes, itemRes] = await Promise.all([
        apiClient.get('/store/transactions/', { params: { transaction_type: 'ISSUANCE' } }),
        apiClient.get('/store/items/', { params: { is_active: 'true' } }),
      ])
      setAllocations(asArr<Transaction>(txRes.data))
      setItems(asArr<StoreItem>(itemRes.data))
      setError(null)
    } catch {
      setError('Failed to load allocations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const departments = ['All', ...DEPARTMENTS]
  const filtered = filterDept === 'All' ? allocations : allocations.filter(a => a.department === filterDept)

  const deptSummary = DEPARTMENTS.map(d => ({
    name: d,
    count: allocations.filter(a => a.department === d).length,
    total: allocations.filter(a => a.department === d).reduce((s, a) => s + a.quantity, 0),
  })).filter(d => d.count > 0)

  const thisMonth = allocations.filter(a => a.date && a.date.startsWith(new Date().toISOString().slice(0, 7))).length

  async function handleSubmit() {
    if (!form.item || !form.department || !form.quantity) return
    setSaving(true)
    try {
      await apiClient.post('/store/transactions/', {
        item: Number(form.item),
        transaction_type: 'ISSUANCE',
        quantity: Number(form.quantity),
        department: form.department,
        purpose: form.purpose,
        date: new Date().toISOString().slice(0, 10),
      })
      setNotice('Allocation recorded.')
      setShowModal(false)
      setForm({ item: '', department: '', quantity: '', purpose: '' })
      void load()
    } catch {
      setNotice('Failed to record allocation. Check stock levels.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Department Allocation"
        subtitle="Track inventory issued to each department (stock issuances)"
        icon={Users}
        theme="violet"
        stats={[
          { label: 'Total Allocations', value: allocations.length },
          { label: 'Departments', value: deptSummary.length },
          { label: 'This Month', value: thisMonth },
        ]}
      />

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice} <button onClick={() => setNotice(null)} className="ml-2 text-xs underline">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}

      {deptSummary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {deptSummary.map(d => (
            <button
              key={d.name}
              onClick={() => setFilterDept(filterDept === d.name ? 'All' : d.name)}
              className={`rounded-2xl p-4 text-left transition border ${filterDept === d.name ? 'bg-violet-500/15 border-violet-500/30 text-violet-200' : 'glass-panel border-transparent text-slate-300 hover:border-white/10'}`}
            >
              <Building2 size={16} className="mb-2 opacity-60" />
              <p className="text-xs font-semibold">{d.name}</p>
              <p className="text-lg font-bold mt-1">{d.count}</p>
              <p className="text-xs text-slate-500">allocations</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {departments.slice(0, 6).map(d => (
            <button
              key={d}
              onClick={() => setFilterDept(d)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${filterDept === d ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'border border-white/[0.07] text-slate-400 hover:text-white'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          <Plus size={16} /> Allocate Items
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse glass-panel" />)}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Reference</th>
                <th className="px-5 py-3 text-left">Department</th>
                <th className="px-5 py-3 text-left">Item</th>
                <th className="px-5 py-3 text-left">Quantity</th>
                <th className="px-5 py-3 text-left">Purpose</th>
                <th className="px-5 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.025] transition">
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{a.reference || `ISS-${a.id}`}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-300">
                      <Building2 size={10} /> {a.department || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Package size={13} className="text-slate-500" />
                      <span className="text-white">{a.item_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{a.quantity} {a.item_unit}</td>
                  <td className="px-5 py-3 text-slate-400 max-w-[180px] truncate">{a.purpose || '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{a.date}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">No allocations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-4">
            <h3 className="text-lg font-display font-semibold">Allocate Inventory</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Department *</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Item *</label>
                <select value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  <option value="">Select item</option>
                  {items.map(it => <option key={it.id} value={it.id}>{it.name} (Stock: {it.current_stock} {it.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Quantity *</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Purpose / Notes</label>
                <input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                  placeholder="e.g. Term 2 biology practicals"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={() => void handleSubmit()} disabled={saving} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
