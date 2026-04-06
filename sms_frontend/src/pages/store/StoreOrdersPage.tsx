import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import PageHero from '../../components/PageHero'

interface StoreItem { id: number; name: string; unit: string; }
interface OrderItem {
  id: number; item: number | null; item_name: string; item_name_display: string;
  unit: string; quantity_requested: number; quantity_approved: number | null; notes: string;
}
interface Order {
  id: number; request_code: string | null; title: string; description: string; send_to: string; status: string;
  requested_by_name: string; reviewed_by_name: string; reviewed_at: string | null;
  created_at: string; notes: string; items: OrderItem[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300',
  APPROVED: 'bg-emerald-500/20 text-emerald-300',
  REJECTED: 'bg-rose-500/20 text-rose-300',
  FULFILLED: 'bg-sky-500/20 text-sky-300',
};

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [newOrder, setNewOrder] = useState({
    title: '', description: '', send_to: 'FINANCE', notes: '',
    order_items: [{ item: '', item_name: '', unit: 'pcs', quantity_requested: 1, notes: '' }]
  });

  const load = async () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    const [ordersRes, itemsRes] = await Promise.all([
      apiClient.get('/store/orders/', { params }),
      apiClient.get('/store/items/', { params: { is_active: 'true' } }),
    ]);
    setOrders(ordersRes.data.results ?? ordersRes.data);
    setItems(itemsRes.data.results ?? itemsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const toggle = (id: number) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const addOrderItem = () => setNewOrder(o => ({ ...o, order_items: [...o.order_items, { item: '', item_name: '', unit: 'pcs', quantity_requested: 1, notes: '' }] }));
  const removeOrderItem = (idx: number) => setNewOrder(o => ({ ...o, order_items: o.order_items.filter((_, i) => i !== idx) }));
  const setOrderItem = (idx: number, k: string, v: unknown) => setNewOrder(o => ({
    ...o, order_items: o.order_items.map((it, i) => i === idx ? { ...it, [k]: v } : it)
  }));

  const createOrder = async () => {
    if (!newOrder.title) return;
    setCreating(true);
    try {
      const payload = {
        title: newOrder.title,
        description: newOrder.description,
        send_to: newOrder.send_to,
        notes: newOrder.notes,
        order_items: newOrder.order_items
          .filter(i => i.item || i.item_name)
          .map(i => ({
            item: i.item ? Number(i.item) : null,
            item_name: i.item_name,
            unit: i.unit,
            quantity_requested: Number(i.quantity_requested),
            notes: i.notes,
          }))
      };
      await apiClient.post('/store/orders/', payload);
      setShowCreate(false);
      setNewOrder({ title: '', description: '', send_to: 'FINANCE', notes: '', order_items: [{ item: '', item_name: '', unit: 'pcs', quantity_requested: 1, notes: '' }] });
      load();
    } finally { setCreating(false); }
  };

  const doReview = async () => {
    if (!reviewId) return;
    setReviewing(true);
    try {
      await apiClient.patch(`/store/orders/${reviewId}/review/`, { action: reviewAction, notes: reviewNotes });
      setReviewId(null);
      setReviewNotes('');
      load();
    } finally { setReviewing(false); }
  };

  return (
    <div className="space-y-5">
      <PageHero
        badge="STORE"
        badgeColor="orange"
        title="Purchase Orders"
        subtitle="Procurement requests and supplier orders"
        icon="📦"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Order Requests</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Order Request
        </button>
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="FULFILLED">Fulfilled</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : !orders.length ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-500">No orders found.</div>
        ) : orders.map(order => (
          <div key={order.id} className="glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => toggle(order.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {order.request_code || `REQ-#${order.id}`}
                  </span>
                  <span className="text-slate-200 font-medium">{order.title}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[order.status] || ''}`}>{order.status}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    order.send_to === 'FINANCE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    order.send_to === 'ADMIN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}>
                    {order.send_to}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">By {order.requested_by_name} · {order.created_at.slice(0, 10)}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                {order.status === 'PENDING' && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setReviewId(order.id); setReviewAction('APPROVE'); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                      <Check size={12} /> Approve
                    </button>
                    <button onClick={() => { setReviewId(order.id); setReviewAction('REJECT'); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500/30">
                      <X size={12} /> Reject
                    </button>
                  </div>
                )}
                {expanded.has(order.id) ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
              </div>
            </div>
            {expanded.has(order.id) && (
              <div className="px-5 pb-4 border-t border-white/[0.05] pt-3 space-y-3">
                {order.description && <p className="text-sm text-slate-400">{order.description}</p>}
                {order.notes && <p className="text-sm text-slate-500 italic">{order.notes}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/[0.07]">
                        <th className="text-left py-2 pr-4">Item</th>
                        <th className="text-right py-2 pr-4">Requested</th>
                        <th className="text-right py-2">Approved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map(oi => (
                        <tr key={oi.id} className="border-b border-slate-800/30">
                          <td className="py-2 pr-4 text-slate-300">{oi.item_name_display}</td>
                          <td className="py-2 pr-4 text-right text-slate-400">{oi.quantity_requested} {oi.unit}</td>
                          <td className="py-2 text-right">{oi.quantity_approved != null ? <span className="text-emerald-400">{oi.quantity_approved} {oi.unit}</span> : <span className="text-slate-600">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1421] border border-white/[0.07] rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-100">New Order Request</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Title *</label>
                <input value={newOrder.title} onChange={e => setNewOrder(o => ({ ...o, title: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Send To</label>
                <select value={newOrder.send_to} onChange={e => setNewOrder(o => ({ ...o, send_to: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
                  <option value="FINANCE">Finance Office</option>
                  <option value="ADMIN">Administration</option>
                  <option value="BOTH">Finance & Admin</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <textarea rows={2} value={newOrder.description} onChange={e => setNewOrder(o => ({ ...o, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Items</label>
                <button onClick={addOrderItem} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add item</button>
              </div>
              <div className="space-y-2">
                {newOrder.order_items.map((oi, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-4">
                      <select value={oi.item} onChange={e => {
                        const item = items.find(i => i.id === Number(e.target.value));
                        setOrderItem(idx, 'item', e.target.value);
                        if (item) { setOrderItem(idx, 'item_name', item.name); setOrderItem(idx, 'unit', item.unit); }
                      }} className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400">
                        <option value="">Select item…</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input placeholder="Or type name" value={oi.item_name} onChange={e => setOrderItem(idx, 'item_name', e.target.value)}
                        className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" placeholder="Qty" value={oi.quantity_requested} onChange={e => setOrderItem(idx, 'quantity_requested', e.target.value)}
                        className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                    </div>
                    <div className="col-span-2">
                      <input placeholder="Unit" value={oi.unit} onChange={e => setOrderItem(idx, 'unit', e.target.value)}
                        className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                    </div>
                    <div className="col-span-1 flex justify-center pt-1.5">
                      <button onClick={() => removeOrderItem(idx)} className="text-rose-400 hover:text-rose-300 text-xs"><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={createOrder} disabled={creating} className="px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50">
                {creating ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1421] border border-white/[0.07] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">{reviewAction === 'APPROVE' ? 'Approve Order' : 'Reject Order'}</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setReviewId(null); setReviewNotes(''); }} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={doReview} disabled={reviewing}
                className={`px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-50 ${reviewAction === 'APPROVE' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-600 hover:bg-rose-500'}`}>
                {reviewing ? 'Processing…' : reviewAction === 'APPROVE' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
