import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/client';
import PageHero from '../../components/PageHero'

interface Category { id: number; name: string; item_type: string; }
interface StoreItem {
  id: number; name: string; sku: string; category: number | null; category_name: string;
  unit: string; item_type: string; current_stock: number; reorder_level: number;
  max_stock: number; cost_price: number; is_active: boolean; is_low_stock: boolean; notes: string;
}
const BLANK: Partial<StoreItem> = { name: '', sku: '', category: null, unit: 'pcs', item_type: 'OFFICE', reorder_level: 0, max_stock: 0, cost_price: 0, is_active: true, notes: '' };

export default function StoreItemsPage() {
  const [searchParams] = useSearchParams();
  const typeFilter = (searchParams.get('type') || 'ALL').toUpperCase();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(typeFilter === 'ALL' ? '' : typeFilter);
  const [modal, setModal] = useState<{ open: boolean; item: Partial<StoreItem> }>({ open: false, item: BLANK });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    const params: Record<string, string> = {};
    if (filterType) params.item_type = filterType;
    if (search) params.search = search;
    const [itemsRes, catRes] = await Promise.all([
      apiClient.get('/store/items/', { params }),
      apiClient.get('/store/categories/'),
    ]);
    setItems(itemsRes.data.results ?? itemsRes.data);
    setCategories(catRes.data.results ?? catRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterType, search]);

  const openAdd = () => setModal({ open: true, item: { ...BLANK } });
  const openEdit = (item: StoreItem) => setModal({ open: true, item: { ...item } });
  const close = () => setModal({ open: false, item: BLANK });

  const save = async () => {
    setSaving(true);
    const { id, is_low_stock, current_stock, category_name, ...body } = modal.item as StoreItem;
    try {
      if (id) await apiClient.patch(`/store/items/${id}/`, body);
      else await apiClient.post('/store/items/', body);
      close();
      load();
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await apiClient.delete(`/store/items/${id}/`);
    setDeleteId(null);
    load();
  };

  const field = (k: keyof StoreItem, v: unknown) => setModal(m => ({ ...m, item: { ...m.item, [k]: v } }));

  return (
    <div className="space-y-5">
      <PageHero
        badge="STORE"
        badgeColor="orange"
        title="Store Items"
        subtitle="School store inventory and stock catalogue"
        icon="📦"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">
          {filterType ? `${filterType === 'FOOD' ? 'Food' : 'Office'} Store` : 'All Items'}
        </h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            className="w-full bg-slate-950 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
          <option value="">All Types</option>
          <option value="FOOD">Food</option>
          <option value="OFFICE">Office/Stationery</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : !items.length ? (
          <div className="p-8 text-center text-slate-500">No items found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Reorder</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-b border-white/[0.05] hover:bg-white/[0.02] ${item.is_low_stock ? 'bg-rose-950/10' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.is_low_stock && <AlertTriangle size={13} className="text-rose-400 shrink-0" />}
                      <div>
                        <p className="text-slate-200 font-medium">{item.name}</p>
                        {item.sku && <p className="text-xs text-slate-500">SKU: {item.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{item.category_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.item_type === 'FOOD' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'}`}>
                      {item.item_type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${item.is_low_stock ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {item.current_stock} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">{item.reorder_level} {item.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
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
            <h2 className="text-lg font-semibold text-slate-100">{modal.item.id ? 'Edit Item' : 'Add Item'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Name *</label>
                <input value={modal.item.name || ''} onChange={e => field('name', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">SKU</label>
                <input value={modal.item.sku || ''} onChange={e => field('sku', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                <input value={modal.item.unit || ''} onChange={e => field('unit', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category</label>
                <select value={modal.item.category ?? ''} onChange={e => field('category', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <select value={modal.item.item_type || 'OFFICE'} onChange={e => field('item_type', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
                  <option value="FOOD">Food</option>
                  <option value="OFFICE">Office/Stationery</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Reorder Level</label>
                <input type="number" value={modal.item.reorder_level ?? 0} onChange={e => field('reorder_level', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Max Stock</label>
                <input type="number" value={modal.item.max_stock ?? 0} onChange={e => field('max_stock', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <textarea rows={2} value={modal.item.notes || ''} onChange={e => field('notes', e.target.value)}
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
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Item?</h3>
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
