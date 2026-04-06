import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Search } from 'lucide-react';
import { apiClient } from '../../api/client';
import PageHero from '../../components/PageHero'

interface Med {
  id: number; medication_name: string; generic_name: string; current_quantity: number;
  unit: string; reorder_level: number; expiry_date: string | null; supplier: string; notes: string;
  is_low_stock: boolean;
}
const BLANK: Partial<Med> = { medication_name: '', generic_name: '', current_quantity: 0, unit: 'tablets', reorder_level: 10, expiry_date: null, supplier: '', notes: '' };

export default function DispensaryStockPage() {
  const [meds, setMeds] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; item: Partial<Med> }>({ open: false, item: BLANK });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (lowOnly) params.low_stock = 'true';
    const r = await apiClient.get('/dispensary/stock/', { params });
    setMeds(r.data.results ?? r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, lowOnly]);

  const openAdd = () => setModal({ open: true, item: { ...BLANK } });
  const openEdit = (m: Med) => setModal({ open: true, item: { ...m } });
  const close = () => setModal({ open: false, item: BLANK });

  const save = async () => {
    setSaving(true);
    const { id, is_low_stock, updated_at, created_at, ...body } = modal.item as Med & { updated_at?: string; created_at?: string };
    try {
      if (id) await apiClient.patch(`/dispensary/stock/${id}/`, body);
      else await apiClient.post('/dispensary/stock/', body);
      close();
      load();
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await apiClient.delete(`/dispensary/stock/${id}/`);
    setDeleteId(null);
    load();
  };

  const f = (k: keyof Med, v: unknown) => setModal(m => ({ ...m, item: { ...m.item, [k]: v } }));

  return (
    <div className="space-y-5">
      <PageHero
        badge="DISPENSARY"
        badgeColor="rose"
        title="Medicine Stock"
        subtitle="Medical supplies inventory and stock levels"
        icon="💊"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Medication Stock</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Medication
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medications…"
            className="w-full bg-slate-950 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} className="accent-emerald-500" />
          Low stock only
        </label>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : !meds.length ? (
          <div className="p-8 text-center text-slate-500">No medications found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-4 py-3">Medication</th>
                <th className="text-left px-4 py-3">Generic Name</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Reorder</th>
                <th className="text-left px-4 py-3">Expiry</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meds.map(m => (
                <tr key={m.id} className={`border-b border-white/[0.05] hover:bg-white/[0.02] ${m.is_low_stock ? 'bg-rose-950/10' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {m.is_low_stock && <AlertTriangle size={13} className="text-rose-400 shrink-0" />}
                      <span className="text-slate-200 font-medium">{m.medication_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{m.generic_name || '—'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${m.is_low_stock ? 'text-rose-400' : 'text-emerald-400'}`}>{m.current_quantity} {m.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{m.reorder_level} {m.unit}</td>
                  <td className="px-4 py-3 text-slate-400">{m.expiry_date || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">{m.supplier || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1421] border border-white/[0.07] rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">{modal.item.id ? 'Edit Medication' : 'Add Medication'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Medication Name *</label>
                <input value={modal.item.medication_name || ''} onChange={e => f('medication_name', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Generic Name</label>
                <input value={modal.item.generic_name || ''} onChange={e => f('generic_name', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                <input value={modal.item.unit || ''} onChange={e => f('unit', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Current Quantity</label>
                <input type="number" value={modal.item.current_quantity ?? 0} onChange={e => f('current_quantity', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Reorder Level</label>
                <input type="number" value={modal.item.reorder_level ?? 0} onChange={e => f('reorder_level', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Expiry Date</label>
                <input type="date" value={modal.item.expiry_date || ''} onChange={e => f('expiry_date', e.target.value || null)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Supplier</label>
                <input value={modal.item.supplier || ''} onChange={e => f('supplier', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <textarea rows={2} value={modal.item.notes || ''} onChange={e => f('notes', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={close} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1421] border border-white/[0.07] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Remove Medication?</h3>
            <p className="text-sm text-slate-400 mb-5">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={() => remove(deleteId)} className="px-4 py-2 rounded-lg text-sm bg-rose-600 hover:bg-rose-500 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
