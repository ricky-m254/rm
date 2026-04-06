import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import BackButton from '../../components/BackButton';
import PrintButton from '../../components/PrintButton';
import { ShoppingCart, CheckCircle, XCircle, Clock, PackageCheck, Receipt } from 'lucide-react';
import PageHero from '../../components/PageHero'

interface OrderItem {
  id: number;
  item_name_display: string;
  quantity_requested: number;
  quantity_approved: number | null;
  unit: string;
  cost_price?: number;
}

interface Order {
  id: number;
  request_code: string | null;
  title: string;
  description: string;
  send_to: string;
  status: string;
  requested_by_name: string;
  created_at: string;
  items: OrderItem[];
  notes: string;
  generated_expense_id: number | null;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  PENDING: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
  APPROVED: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
  REJECTED: { color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle },
  FULFILLED: { color: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icon: PackageCheck },
};

export default function FinanceStoreRequestsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      // Get orders and filter client-side for send_to FINANCE or BOTH
      const res = await apiClient.get('/store/orders/?page_size=200');
      const allOrders: Order[] = res.data.results ?? res.data;
      const filtered = allOrders.filter(o => o.send_to === 'FINANCE' || o.send_to === 'BOTH');
      setOrders(filtered);
    } catch (err) {
      console.error('Failed to load store orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const calculateTotal = (order: Order) => {
    return order.items.reduce((acc, item) => {
      const qty = item.quantity_approved ?? item.quantity_requested;
      const price = item.cost_price ?? 0;
      return acc + (qty * price);
    }, 0);
  };

  const generateExpense = async (orderId: number) => {
    setProcessing(orderId);
    try {
      const res = await apiClient.post(`/store/orders/${orderId}/generate-expense/`);
      if (res.data.already_generated) {
        showToast(`Already sent — Expense #${res.data.expense_id} was previously created for this order.`, 'success');
      } else {
        showToast(`Expense #${res.data.expense_id} created successfully.`, 'success');
      }
      load();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to generate expense', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const filteredOrders = statusFilter 
    ? orders.filter(o => o.status === statusFilter)
    : orders;

  const formatCurrency = (amount: number) => {
    return 'Ksh ' + amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl transition-all ${toast.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Store Requests"
        subtitle="Finance approval for store purchase orders"
        icon="💰"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BackButton to="/modules/finance" label="Finance Module" />
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="text-emerald-500" size={24} />
            Store Requests
          </h1>
          <p className="text-sm text-slate-400 mt-1">Review and process store orders sent to Finance</p>
        </div>
        <div className="flex items-center gap-3">
          <PrintButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.07] p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filter Status:</label>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-white/[0.07] rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="text-xs text-slate-500">
          Showing {filteredOrders.length} of {orders.length} requests
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 glass-panel rounded-2xl">Loading requests...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 glass-panel rounded-2xl">No store requests found.</div>
        ) : (
          filteredOrders.map(order => {
            const Config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = Config.icon;
            const totalCost = calculateTotal(order);
            const canGenerateExpense = order.status === 'APPROVED' || order.status === 'FULFILLED';

            const alreadySent = !!order.generated_expense_id;

            return (
              <div key={order.id} className="glass-panel rounded-2xl overflow-hidden hover:border-white/[0.09] transition-colors">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {order.request_code || `REQ-#${order.id}`}
                        </span>
                        <h3 className="text-lg font-semibold text-slate-100">{order.title}</h3>
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${Config.color}`}>
                          <StatusIcon size={10} />
                          {order.status}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-medium">
                          Sent to: {order.send_to}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 italic">{order.description || 'No description provided'}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                        <span>Requested by: <b className="text-slate-300">{order.requested_by_name}</b></span>
                        <span>•</span>
                        <span>Date: {new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-widest font-medium">Est. Total Cost</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">
                        {formatCurrency(totalCost)}
                      </div>
                      {canGenerateExpense && (
                        alreadySent ? (
                          <div className="mt-3 flex items-center gap-2 bg-slate-700/60 text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-slate-600/50 cursor-default">
                            <Receipt size={14} className="text-emerald-500" />
                            Already Sent · Exp #{order.generated_expense_id}
                          </div>
                        ) : (
                          <button
                            onClick={() => generateExpense(order.id)}
                            disabled={processing === order.id}
                            className="mt-3 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                          >
                            <Receipt size={14} />
                            {processing === order.id ? 'Processing...' : 'Generate Expense'}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Order Items</h4>
                    <div className="overflow-hidden border border-white/[0.07] rounded-xl bg-slate-950/40">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white/[0.03] text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5">Item</th>
                            <th className="px-4 py-2.5 text-right">Qty Req</th>
                            <th className="px-4 py-2.5 text-right">Qty Appr</th>
                            <th className="px-4 py-2.5 text-right">Unit Price</th>
                            <th className="px-4 py-2.5 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {order.items.map(item => {
                            const qty = item.quantity_approved ?? item.quantity_requested;
                            const price = item.cost_price ?? 0;
                            return (
                              <tr key={item.id} className="text-slate-300">
                                <td className="px-4 py-3 font-medium">{item.item_name_display}</td>
                                <td className="px-4 py-3 text-right text-slate-400">{item.quantity_requested} {item.unit}</td>
                                <td className="px-4 py-3 text-right">
                                  {item.quantity_approved !== null ? (
                                    <span className="text-emerald-400 font-medium">{item.quantity_approved} {item.unit}</span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-400">{formatCurrency(price)}</td>
                                <td className="px-4 py-3 text-right text-emerald-400/80 font-medium">{formatCurrency(qty * price)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
