import { useState } from 'react'
import { ChefHat, AlertTriangle, Plus, Package, RefreshCw } from 'lucide-react'
import PageHero from '../../components/PageHero'

type StockLevel = 'Good' | 'Low' | 'Critical' | 'Out of Stock'

type Ingredient = {
  id: number
  name: string
  category: string
  quantity: number
  unit: string
  reorderLevel: number
  supplier: string
  expiryDate: string
  status: StockLevel
}

const INGREDIENTS: Ingredient[] = [
  { id: 1, name: 'Rice', category: 'Grains', quantity: 45, unit: 'kg', reorderLevel: 20, supplier: 'Nairobi Grains Ltd', expiryDate: '2026-12-31', status: 'Good' },
  { id: 2, name: 'Beans', category: 'Legumes', quantity: 18, unit: 'kg', reorderLevel: 15, supplier: 'Nairobi Grains Ltd', expiryDate: '2026-12-31', status: 'Good' },
  { id: 3, name: 'Cooking Oil', category: 'Fats & Oils', quantity: 4, unit: 'litres', reorderLevel: 10, supplier: 'Bidco Africa', expiryDate: '2027-06-30', status: 'Low' },
  { id: 4, name: 'Milk', category: 'Dairy', quantity: 2, unit: 'litres', reorderLevel: 20, supplier: 'New KCC', expiryDate: '2026-03-19', status: 'Critical' },
  { id: 5, name: 'Bread', category: 'Bakery', quantity: 0, unit: 'loaves', reorderLevel: 10, supplier: 'Elliots Bakery', expiryDate: '2026-03-18', status: 'Out of Stock' },
  { id: 6, name: 'Sugar', category: 'Sweeteners', quantity: 22, unit: 'kg', reorderLevel: 10, supplier: 'Mumias Sugar', expiryDate: '2027-01-01', status: 'Good' },
  { id: 7, name: 'Ugali Flour (Maize)', category: 'Grains', quantity: 30, unit: 'kg', reorderLevel: 25, supplier: 'Unga Group', expiryDate: '2026-09-30', status: 'Good' },
  { id: 8, name: 'Beef', category: 'Meat & Protein', quantity: 8, unit: 'kg', reorderLevel: 10, supplier: 'City Butchery', expiryDate: '2026-03-18', status: 'Low' },
  { id: 9, name: 'Tomatoes', category: 'Vegetables', quantity: 3, unit: 'kg', reorderLevel: 5, supplier: 'Fresh Farms', expiryDate: '2026-03-18', status: 'Low' },
  { id: 10, name: 'Onions', category: 'Vegetables', quantity: 6, unit: 'kg', reorderLevel: 5, supplier: 'Fresh Farms', expiryDate: '2026-03-25', status: 'Good' },
  { id: 11, name: 'Salt', category: 'Seasonings', quantity: 5, unit: 'kg', reorderLevel: 2, supplier: 'Kensalt', expiryDate: '2028-01-01', status: 'Good' },
  { id: 12, name: 'Uji Flour (Millet)', category: 'Grains', quantity: 0, unit: 'kg', reorderLevel: 10, supplier: 'Unga Group', expiryDate: '2026-09-30', status: 'Out of Stock' },
]

const STATUS_CONFIG: Record<StockLevel, { color: string; barColor: string }> = {
  Good: { color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', barColor: 'bg-emerald-500/60' },
  Low: { color: 'bg-amber-500/15 text-amber-300 border-amber-500/20', barColor: 'bg-amber-500/60' },
  Critical: { color: 'bg-rose-500/15 text-rose-300 border-rose-500/20', barColor: 'bg-rose-500/60' },
  'Out of Stock': { color: 'bg-slate-500/15 text-slate-400 border-slate-500/20', barColor: 'bg-slate-600/60' },
}

const CATEGORIES = ['All', 'Grains', 'Legumes', 'Dairy', 'Meat & Protein', 'Vegetables', 'Fats & Oils', 'Bakery', 'Sweeteners', 'Seasonings']

export default function CafeteriaKitchenPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>(INGREDIENTS)
  const [filterCat, setFilterCat] = useState('All')
  const [filterStatus, setFilterStatus] = useState<StockLevel | 'All'>('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Grains', quantity: '', unit: 'kg', reorderLevel: '', supplier: '', expiryDate: '' })

  const alerts = ingredients.filter(i => i.status === 'Critical' || i.status === 'Out of Stock')
  const lowCount = ingredients.filter(i => i.status === 'Low').length

  const filtered = ingredients.filter(i => {
    const matchCat = filterCat === 'All' || i.category === filterCat
    const matchStatus = filterStatus === 'All' || i.status === filterStatus
    return matchCat && matchStatus
  })

  function handleRestock(id: number) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, quantity: i.reorderLevel * 2, status: 'Good' } : i))
  }

  function handleAdd() {
    if (!form.name || !form.quantity) return
    const qty = Number(form.quantity)
    const reorder = Number(form.reorderLevel) || 5
    let status: StockLevel = 'Good'
    if (qty === 0) status = 'Out of Stock'
    else if (qty <= reorder * 0.3) status = 'Critical'
    else if (qty <= reorder) status = 'Low'
    const newItem: Ingredient = {
      id: Date.now(),
      name: form.name,
      category: form.category,
      quantity: qty,
      unit: form.unit,
      reorderLevel: reorder,
      supplier: form.supplier || 'Unknown',
      expiryDate: form.expiryDate || '—',
      status,
    }
    setIngredients(prev => [newItem, ...prev])
    setForm({ name: '', category: 'Grains', quantity: '', unit: 'kg', reorderLevel: '', supplier: '', expiryDate: '' })
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Kitchen Inventory"
        subtitle="Monitor ingredient stock levels, reorder alerts, and supplier tracking"
        icon={ChefHat}
        theme="orange"
        stats={[
          { label: 'Total Ingredients', value: ingredients.length },
          { label: 'Alerts', value: alerts.length },
          { label: 'Low Stock', value: lowCount },
        ]}
      />

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <div>
                  <span className="text-sm font-semibold text-rose-300">{a.name}</span>
                  <span className="text-xs text-rose-400/70 ml-2">— {a.status}: {a.quantity} {a.unit} remaining</span>
                </div>
              </div>
              <button onClick={() => handleRestock(a.id)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/15 transition">
                <RefreshCw size={11} /> Restock
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.slice(0, 6).map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition border ${filterCat === c ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'border-white/[0.07] text-slate-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as StockLevel | 'All')}
            className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-xs text-white focus:outline-none">
            <option value="All">All Statuses</option>
            {(['Good', 'Low', 'Critical', 'Out of Stock'] as StockLevel[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            <Plus size={15} /> Add Ingredient
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Ingredient</th>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-left">Stock Level</th>
              <th className="px-5 py-3 text-left">Reorder At</th>
              <th className="px-5 py-3 text-left">Supplier</th>
              <th className="px-5 py-3 text-left">Expiry</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(i => {
              const cfg = STATUS_CONFIG[i.status]
              const pct = i.reorderLevel > 0 ? Math.min(100, Math.round((i.quantity / (i.reorderLevel * 2)) * 100)) : 0
              return (
                <tr key={i.id} className="hover:bg-white/[0.025] transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Package size={13} className="text-slate-500" />
                      <span className="font-medium text-white">{i.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{i.category}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.06]">
                        <div className={`h-1.5 rounded-full ${cfg.barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-slate-300">{i.quantity} {i.unit}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{i.reorderLevel} {i.unit}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{i.supplier}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{i.expiryDate}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${cfg.color}`}>{i.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    {(i.status === 'Low' || i.status === 'Critical' || i.status === 'Out of Stock') && (
                      <button onClick={() => handleRestock(i.id)} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 transition">
                        <RefreshCw size={10} /> Restock
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-5">
            <h3 className="text-lg font-display font-semibold">Add Ingredient</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Ingredient Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Milk" className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2.5 text-sm text-white focus:outline-none">
                    {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                  <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-3 py-2.5 text-sm text-white focus:outline-none">
                    {['kg', 'g', 'litres', 'ml', 'pcs', 'loaves', 'boxes', 'cans'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Quantity *</label>
                  <input type="number" min="0" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="0" className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Reorder Level</label>
                  <input type="number" min="0" value={form.reorderLevel} onChange={e => setForm(p => ({ ...p, reorderLevel: e.target.value }))}
                    placeholder="5" className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Supplier</label>
                  <input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}
                    placeholder="e.g. New KCC" className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={handleAdd} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">Add Ingredient</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
