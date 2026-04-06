import { useEffect, useState } from 'react'
import { ClipboardList, Plus, CheckCircle, XCircle, Clock, Package, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED'

type OrderItem = {
  id: number
  item_name: string
  item: number | null
  quantity_requested: number
  quantity_approved?: number
  unit: string
  notes: string
}

type StoreOrder = {
  id: number
  request_code: string
  title: string
  description: string
  requested_by_name?: string
  send_to: string
  status: RequestStatus
  notes: string
  created_at: string
  items: OrderItem[]
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING:   { label: 'Pending',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/20',   icon: Clock },
  APPROVED:  { label: 'Approved',  color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', icon: CheckCircle },
  REJECTED:  { label: 'Rejected',  color: 'bg-rose-500/15 text-rose-300 border-rose-500/20',     icon: XCircle },
  FULFILLED: { label: 'Fulfilled', color: 'bg-sky-500/15 text-sky-300 border-sky-500/20',         icon: Package },
}

function asArr<T>(v: T[] | { results?: T[] }): T[] {
  return Array.isArray(v) ? v : (v.results ?? [])
}

export default function StoreRequestsPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL')
  const [expanded, setExpanded] = useState<number | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', send_to: 'FINANCE', items: [{ item_name: '', quantity_requested: 1, unit: 'pcs', notes: '' }] })

  const load = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/store/orders/')
      setOrders(asArr<StoreOrder>(res.data))
      setError(null)
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)
  const pending   = orders.filter(o => o.status === 'PENDING').length
  const approved  = orders.filter(o => o.status === 'APPROVED').length
  const fulfilled = orders.filter(o => o.status === 'FULFILLED').length

  async function updateStatus(id: number, status: RequestStatus) {
    try {
      await apiClient.post(`/store/orders/${id}/review/`, { status, notes: '' })
      setNotice(`Order ${status.toLowerCase()}.`)
      void load()
    } catch {
      setNotice('Action failed.')
    }
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.items[0].item_name) return
    setSaving(true)
    try {
      await apiClient.post('/store/orders/', {
        title: form.title,
        description: form.description,
        send_to: form.send_to,
        items: form.items,
      })
      setNotice('Request submitted.')
      setShowModal(false)
      setForm({ title: '', description: '', send_to: 'FINANCE', items: [{ item_name: '', quantity_requested: 1, unit: 'pcs', notes: '' }] })
      void load()
    } catch {
      setNotice('Submission failed.')
    } finally {
      setSaving(false)
    }
  }

  function addItem() {
    setForm(p => ({ ...p, items: [...p.items, { item_name: '', quantity_requested: 1, unit: 'pcs', notes: '' }] }))
  }

  function removeItem(i: number) {
    setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  }

  function setItem(i: number, key: string, value: string | number) {
    setForm(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [key]: value } : it) }))
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Stock Requests"
        subtitle="Department order requests for inventory items — review and approve"
        icon={ClipboardList}
        theme="amber"
        stats={[
          { label: 'Pending', value: pending },
          { label: 'Approved', value: approved },
          { label: 'Fulfilled', value: fulfilled },
          { label: 'Total', value: orders.length },
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'FULFILLED', 'REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium transition ${filter === s ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'border border-white/[0.07] text-slate-400 hover:text-white'}`}
            >
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          <Plus size={16} /> New Request
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse glass-panel" />)}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Request Code</th>
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Send To</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(o => {
                const cfg = STATUS_CONFIG[o.status]
                const Icon = cfg.icon
                const isExpanded = expanded === o.id
                return (
                  <>
                    <tr key={o.id} className="hover:bg-white/[0.025] transition cursor-pointer" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{o.request_code || `ORD-${o.id}`}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-white">{o.title}</div>
                        {o.description && <div className="text-xs text-slate-500 truncate max-w-[200px]">{o.description}</div>}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{o.send_to}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{o.created_at.slice(0, 10)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${cfg.color}`}>
                          <Icon size={11} /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {o.status === 'PENDING' && (
                            <>
                              <button onClick={e => { e.stopPropagation(); void updateStatus(o.id, 'APPROVED') }} className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 transition">Approve</button>
                              <button onClick={e => { e.stopPropagation(); void updateStatus(o.id, 'REJECTED') }} className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/10 transition">Reject</button>
                            </>
                          )}
                          {o.status === 'APPROVED' && (
                            <button onClick={e => { e.stopPropagation(); void updateStatus(o.id, 'FULFILLED') }} className="rounded-lg border border-sky-500/30 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-500/10 transition">Fulfilled</button>
                          )}
                          {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && o.items && o.items.length > 0 && (
                      <tr key={`${o.id}-exp`} className="bg-white/[0.015]">
                        <td colSpan={6} className="px-8 py-3">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Items Requested</p>
                          <div className="space-y-1">
                            {o.items.map(it => (
                              <div key={it.id} className="flex items-center gap-4 text-sm">
                                <span className="text-white">{it.item_name || 'Item'}</span>
                                <span className="text-slate-400">{it.quantity_requested} {it.unit}</span>
                                {it.notes && <span className="text-slate-500 text-xs">{it.notes}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">
                  {loading ? 'Loading…' : 'No requests found.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1421] border border-white/[0.09] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-display font-semibold">New Stock Request</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Request Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Science Lab Supplies — Term 2"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Optional: reason or urgency"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Send To</label>
                <select value={form.send_to} onChange={e => setForm(p => ({ ...p, send_to: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0d1421] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  <option value="FINANCE">Finance Office</option>
                  <option value="ADMIN">Administration</option>
                  <option value="BOTH">Finance & Admin</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400">Items *</label>
                  <button onClick={addItem} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add Item</button>
                </div>
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
                    <input value={it.item_name} onChange={e => setItem(i, 'item_name', e.target.value)}
                      placeholder="Item name *" className="col-span-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none" />
                    <input type="number" min="1" value={it.quantity_requested} onChange={e => setItem(i, 'quantity_requested', Number(e.target.value))}
                      placeholder="Qty" className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none" />
                    <select value={it.unit} onChange={e => setItem(i, 'unit', e.target.value)}
                      className="rounded-xl border border-white/[0.09] bg-[#0d1421] px-2 py-2 text-sm text-white focus:outline-none">
                      {['pcs', 'kg', 'litres', 'reams', 'pairs', 'boxes', 'metres', 'cans'].map(u => <option key={u}>{u}</option>)}
                    </select>
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={() => void handleSubmit()} disabled={saving} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-60">
                {saving ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
