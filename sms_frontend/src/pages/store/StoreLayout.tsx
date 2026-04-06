import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Truck, ShoppingCart, AlertTriangle,
  Store, UtensilsCrossed, Briefcase, Tag, ClipboardList, Users, BarChart3
} from 'lucide-react'
import ModuleToolbar from '../../components/ModuleToolbar'
import { useAuthStore } from '../../store/auth'

const NAV_ITEMS = [
  { to: '/modules/store', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/modules/store/items', label: 'All Items', icon: Package },
  { to: '/modules/store/items?type=FOOD', label: 'Food Store', icon: UtensilsCrossed },
  { to: '/modules/store/items?type=OFFICE', label: 'Office Store', icon: Briefcase },
  { to: '/modules/store/categories', label: 'Categories', icon: Tag },
  { to: '/modules/store/requests', label: 'Stock Requests', icon: ClipboardList },
  { to: '/modules/store/movements', label: 'Stock Movements', icon: Truck },
  { to: '/modules/store/orders', label: 'Purchase Orders', icon: ShoppingCart },
  { to: '/modules/store/suppliers', label: 'Suppliers', icon: Store },
  { to: '/modules/store/allocation', label: 'Dept. Allocation', icon: Users },
  { to: '/modules/store/low-stock', label: 'Low Stock Alerts', icon: AlertTriangle },
  { to: '/modules/store/reports', label: 'Reports', icon: BarChart3 },
]

export default function StoreLayout() {
  const navigate = useNavigate()
  const tenantId = useAuthStore((state) => state.tenantId)
  const username = useAuthStore((state) => state.username)
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => { setIsNavOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl glass-panel p-5 md:col-span-3 lg:col-span-2">
          <ModuleToolbar currentModule="STORE" />
          <div className="flex items-center gap-2 mt-1">
            <Store size={16} className="text-emerald-400" />
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Store</p>
          </div>
          <h2 className="mt-2 text-lg font-display font-semibold">Store & Inventory</h2>
          <button
            className="mt-4 w-full rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-slate-200 md:hidden"
            onClick={() => setIsNavOpen((p) => !p)}
          >
            {isNavOpen ? 'Hide menu ↑' : 'Show menu ↓'}
          </button>
          <div className={`mt-4 space-y-1 text-sm ${isNavOpen ? 'block' : 'hidden'} md:block`}>
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setIsNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-4 py-2.5 transition ${
                    isActive ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-300 hover:bg-white/[0.035]'
                  }`
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 text-xs text-slate-300">
            <p><strong>Tenant:</strong> {tenantId ?? 'public'}</p>
            <p className="mt-2"><strong>User:</strong> {username ?? 'user'}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-3 w-full rounded-lg border border-white/[0.09] px-3 py-2 text-xs text-slate-200 hover:text-white transition"
            >
              ← Dashboard
            </button>
          </div>
        </aside>
        <main className="col-span-12 overflow-y-auto md:col-span-9 lg:col-span-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
