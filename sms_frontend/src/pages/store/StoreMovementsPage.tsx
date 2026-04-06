import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { apiClient } from '../../api/client';
import PageHero from '../../components/PageHero'

interface StoreItem { id: number; name: string; unit: string; }
interface Transaction {
  id: number; item: number; item_name: string; item_unit: string;
  transaction_type: string; quantity: number; reference: string;
  purpose: string; performed_by_name: string; date: string; notes: string;
}
interface Form {
  item: string; transaction_type: string; quantity: string;
  reference: string; purpose: string; date: string; notes: string;
}

const TYPE_COLOR: Record<string, string> = {
  RECEIPT: 'bg-emerald-500/20 text-emerald-300',
  ISSUANCE: 'bg-rose-500/20 text-rose-300',
  ADJUSTMENT: 'bg-amber-500/20 text-amber-300',
  OPENING: 'bg-sky-500/20 text-sky-300',
};

export default function StoreMovementsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    item: '', transaction_type: 'RECEIPT', quantity: '', reference: '', purpose: '', date: new Date().toISOString().slice(0, 10), notes: ''
  });

  const load = async () => {
    const params: Record<string, string> = {};
    if (typeFilter) params.transaction_type = typeFilter;
    const [txRes, itemsRes] = await Promise.all([
      apiClient.get('/store/transactions/', { params }),
      apiClient.get('/store/items/', { params: { is_active: 'true' } }),
    ]);
    setTransactions(txRes.data.results ?? txRes.data);
    setItems(itemsRes.data.results ?? itemsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter]);

  const submitForm = async () => {
    if (!form.item || !form.quantity || !form.date) return;
    setSaving(true);
    try {
      await apiClient.post('/store/transactions/', {
        item: Number(form.item),
        transaction_type: form.transaction_type,
        quantity: Number(form.quantity),
        reference: form.reference,
        purpose: form.purpose,
        date: form.date,
        notes: form.notes,
      });
      setShowForm(false);
      setForm({ item: '', transaction_type: 'RECEIPT', quantity: '', reference: '', purpose: '', date: new Date().toISOString().slice(0, 10), notes: '' });
      load();
    } finally { setSaving(false); }
  };

  const filtered = search
    ? transactions.filter(t => t.item_name?.toLowerCase().includes(search.toLowerCase()) || t.reference?.toLowerCase().includes(search.toLowerCase()))
    : transactions;

  return (
    <div className="space-y-5">
      <PageHero
        badge="STORE"
        badgeColor="orange"
        title="Stock Movements"
        subtitle="Goods received, issued and transferred records"
        icon="📦"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Stock Movements</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Record Movement
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by item or reference…"
            className="w-full bg-slate-950 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
          <option value="">All Types</option>
          <option value="RECEIPT">Receipts</option>
          <option value="ISSUANCE">Issuances</option>
          <option value="ADJUSTMENT">Adjustments</option>
          <option value="OPENING">Opening Stock</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-slate-500">No transactions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Quantity</th>
                <th className="text-left px-4 py-3">Purpose / Reference</th>
                <th className="text-left px-4 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3 text-slate-200">{tx.item_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLOR[tx.transaction_type] || ''}`}>{tx.transaction_type}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${tx.transaction_type === 'ISSUANCE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {tx.transaction_type === 'ISSUANCE' ? '-' : '+'}{tx.quantity} {tx.item_unit}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{tx.purpose || tx.reference || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{tx.performed_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1421] border border-white/[0.07] rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Record Stock Movement</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Item *</label>
                <select value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
                  <option value="">Select item…</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type *</label>
                <select value={form.transaction_type} onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
                  <option value="RECEIPT">Receipt (Stock In)</option>
                  <option value="ISSUANCE">Issuance (Stock Out)</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="OPENING">Opening Stock</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Quantity *</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Reference</label>
                <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Purpose</label>
                <input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={submitForm} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
