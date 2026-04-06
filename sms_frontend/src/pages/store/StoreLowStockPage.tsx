import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/client';
import PageHero from '../../components/PageHero'

interface StoreItem {
  id: number; name: string; sku: string; category_name: string;
  unit: string; item_type: string; current_stock: number; reorder_level: number;
  is_low_stock: boolean;
}

export default function StoreLowStockPage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/store/items/', { params: { low_stock: 'true' } })
      .then(r => setItems(r.data.results ?? r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <PageHero
        badge="STORE"
        badgeColor="orange"
        title="Low Stock Alerts"
        subtitle="Items below minimum stock level thresholds"
        icon="📦"
      />
      <div className="flex items-center gap-3">
        <AlertTriangle size={22} className="text-rose-400" />
        <h1 className="text-2xl font-bold text-slate-100">Low Stock Alerts</h1>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : !items.length ? (
          <div className="p-8 text-center text-slate-500">All stock levels are adequate.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]">
              <tr className="text-xs text-slate-500">
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Current Stock</th>
                <th className="text-right px-4 py-3">Reorder Level</th>
                <th className="text-right px-4 py-3">Deficit</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-white/[0.05] bg-rose-950/10 hover:bg-rose-950/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} className="text-rose-400 shrink-0" />
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
                  <td className="px-4 py-3 text-right font-medium text-rose-400">{item.current_stock} {item.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{item.reorder_level} {item.unit}</td>
                  <td className="px-4 py-3 text-right text-rose-300 font-medium">
                    {Math.max(0, item.reorder_level - item.current_stock).toFixed(2)} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
