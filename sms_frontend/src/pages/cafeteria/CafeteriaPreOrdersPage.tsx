import { useState } from 'react'
import { ShoppingBag, Calendar, Check, X, Clock, Users } from 'lucide-react'
import PageHero from '../../components/PageHero'

type OrderStatus = 'Pending' | 'Confirmed' | 'Cancelled'

type PreOrder = {
  id: number
  orderId: string
  studentName: string
  grade: string
  mealDate: string
  mealType: string
  mealItem: string
  orderedBy: string
  placedAt: string
  status: OrderStatus
}

const MENU_TOMORROW = [
  { type: 'Breakfast', items: ['Uji wa Mtama', 'Mandazi', 'Milk Tea'] },
  { type: 'Lunch', items: ['Rice + Beef Stew', 'Rice + Vegetable Curry', 'Ugali + Mboga'] },
  { type: 'Snack', items: ['Banana', 'Yogurt', 'Orange'] },
]

const PREORDERS: PreOrder[] = [
  { id: 1, orderId: 'ORD-2026-001', studentName: 'Amara Wanjiku', grade: 'Grade 7A', mealDate: '2026-03-18', mealType: 'Lunch', mealItem: 'Rice + Beef Stew', orderedBy: 'Parent', placedAt: '2026-03-17 08:14', status: 'Confirmed' },
  { id: 2, orderId: 'ORD-2026-002', studentName: 'Brian Otieno', grade: 'Grade 8B', mealDate: '2026-03-18', mealType: 'Breakfast', mealItem: 'Uji wa Mtama', orderedBy: 'Student', placedAt: '2026-03-17 09:01', status: 'Pending' },
  { id: 3, orderId: 'ORD-2026-003', studentName: 'Cynthia Akinyi', grade: 'Grade 9A', mealDate: '2026-03-18', mealType: 'Lunch', mealItem: 'Rice + Vegetable Curry', orderedBy: 'Parent', placedAt: '2026-03-17 07:45', status: 'Confirmed' },
  { id: 4, orderId: 'ORD-2026-004', studentName: 'David Kimani', grade: 'PP2B', mealDate: '2026-03-18', mealType: 'Snack', mealItem: 'Banana', orderedBy: 'Parent', placedAt: '2026-03-17 10:20', status: 'Cancelled' },
  { id: 5, orderId: 'ORD-2026-005', studentName: 'Esther Mutua', grade: 'Grade 7C', mealDate: '2026-03-18', mealType: 'Lunch', mealItem: 'Ugali + Mboga', orderedBy: 'Student', placedAt: '2026-03-17 11:05', status: 'Pending' },
  { id: 6, orderId: 'ORD-2026-006', studentName: 'Felix Njoroge', grade: 'Grade 8A', mealDate: '2026-03-18', mealType: 'Breakfast', mealItem: 'Mandazi', orderedBy: 'Parent', placedAt: '2026-03-17 08:55', status: 'Confirmed' },
]

const STATUS_STYLE: Record<OrderStatus, string> = {
  Pending: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  Confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  Cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
}
const STATUS_ICON: Record<OrderStatus, React.ElementType> = {
  Pending: Clock,
  Confirmed: Check,
  Cancelled: X,
}

export default function CafeteriaPreOrdersPage() {
  const [orders, setOrders] = useState<PreOrder[]>(PREORDERS)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'All'>('All')

  const confirmed = orders.filter(o => o.status === 'Confirmed').length
  const pending = orders.filter(o => o.status === 'Pending').length

  const filtered = filterStatus === 'All' ? orders : orders.filter(o => o.status === filterStatus)

  function updateStatus(id: number, status: OrderStatus) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Meal Pre-Orders"
        subtitle="Students and parents pre-order meals for upcoming days — reduces food waste and aids kitchen planning"
        icon={ShoppingBag}
        theme="orange"
        stats={[
          { label: 'Pre-Orders Today', value: orders.length },
          { label: 'Confirmed', value: confirmed },
          { label: 'Pending', value: pending },
        ]}
      />

      <div className="flex border-b border-white/[0.07] gap-4">
        {[
          { key: 'orders', label: 'Pre-Orders', icon: ShoppingBag },
          { key: 'menu', label: "Tomorrow's Menu", icon: Calendar },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition border-b-2 ${activeTab === t.key ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Pending', 'Confirmed', 'Cancelled'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition border ${filterStatus === s ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'border-white/[0.07] text-slate-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.03] text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Order ID</th>
                  <th className="px-5 py-3 text-left">Student</th>
                  <th className="px-5 py-3 text-left">Meal</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Ordered By</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(o => {
                  const Icon = STATUS_ICON[o.status]
                  return (
                    <tr key={o.id} className="hover:bg-white/[0.025] transition">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{o.orderId}</td>
                      <td className="px-5 py-3">
                        <div className="text-white font-medium">{o.studentName}</div>
                        <div className="text-xs text-slate-500">{o.grade}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-white">{o.mealItem}</div>
                        <div className="text-xs text-slate-500">{o.mealType}</div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">{o.mealDate}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{o.orderedBy}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                          <Icon size={11} /> {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {o.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateStatus(o.id, 'Confirmed')} className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 transition">Confirm</button>
                            <button onClick={() => updateStatus(o.id, 'Cancelled')} className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/10 transition">Cancel</button>
                          </div>
                        )}
                        {o.status !== 'Pending' && <span className="text-xs text-slate-600">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MENU_TOMORROW.map(section => (
            <div key={section.type} className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-emerald-400" />
                <h3 className="font-display font-semibold text-sm text-emerald-300">{section.type}</h3>
              </div>
              <div className="flex items-center gap-1.5 mb-4 text-xs text-slate-500">
                <Users size={12} />
                <span>{orders.filter(o => o.mealType === section.type && o.status === 'Confirmed').length} pre-orders confirmed</span>
              </div>
              <ul className="space-y-2">
                {section.items.map(item => (
                  <li key={item} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200">
                    <ShoppingBag size={13} className="text-slate-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
