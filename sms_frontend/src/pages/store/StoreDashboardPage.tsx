import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, ShoppingCart, Tag, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import PageHero from '../../components/PageHero'

interface DashboardData {
  total_items: number;
  low_stock_count: number;
  low_stock_items: { id: number; name: string; current_stock: number; reorder_level: number; unit: string; item_type: string }[];
  pending_orders: number;
  total_categories: number;
  recent_transactions: { id: number; transaction_type: string; quantity: number; date: string; item__name: string; item__unit: string; purpose: string }[];
}

export default function StoreDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/store/dashboard/').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const TX_COLOR: Record<string, string> = {
    RECEIPT: 'text-emerald-400',
    ISSUANCE: 'text-rose-400',
    ADJUSTMENT: 'text-amber-400',
    OPENING: 'text-sky-400',
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHero
        badge="STORE"
        badgeColor="orange"
        title="Dashboard"
        subtitle="Manage dashboard for this school"
        icon="📦"
      />
      <h1 className="text-2xl font-bold text-slate-100">Store Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: data?.total_items ?? 0, icon: Package, color: 'text-sky-400' },
          { label: 'Low Stock Items', value: data?.low_stock_count ?? 0, icon: AlertTriangle, color: 'text-rose-400' },
          { label: 'Pending Orders', value: data?.pending_orders ?? 0, icon: ShoppingCart, color: 'text-amber-400' },
          { label: 'Categories', value: data?.total_categories ?? 0, icon: Tag, color: 'text-emerald-400' },
        ].map(card => (
          <div key={card.label} className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{card.label}</span>
              <card.icon size={18} className={card.color} />
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-400" /> Low Stock Alerts
            </h2>
            <button onClick={() => navigate('/modules/store/low-stock')} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          {!data?.low_stock_items.length ? (
            <p className="text-slate-500 text-sm">All stock levels are adequate.</p>
          ) : (
            <div className="space-y-2">
              {data.low_stock_items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/[0.07] last:border-0">
                  <div>
                    <p className="text-sm text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.item_type}</p>
                  </div>
                  <span className="text-xs font-medium text-rose-400">{item.current_stock} / {item.reorder_level} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Package size={16} className="text-emerald-400" /> Recent Movements
          </h2>
          {!data?.recent_transactions.length ? (
            <p className="text-slate-500 text-sm">No recent transactions.</p>
          ) : (
            <div className="space-y-0">
              {data.recent_transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.07] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{tx.item__name}</p>
                    <p className="text-xs text-slate-500">{tx.date} · {tx.purpose || '—'}</p>
                  </div>
                  <div className="text-right ml-3">
                    <span className={`text-sm font-medium ${TX_COLOR[tx.transaction_type] || 'text-slate-400'}`}>
                      {tx.transaction_type === 'ISSUANCE' ? '-' : '+'}{tx.quantity} {tx.item__unit}
                    </span>
                    <p className="text-xs text-slate-500">{tx.transaction_type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
