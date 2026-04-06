import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Pill, BarChart2, Stethoscope, ClipboardList, ExternalLink } from 'lucide-react'
import ModuleToolbar from '../../components/ModuleToolbar'
import { useAuthStore } from '../../store/auth'

const NAV_ITEMS = [
  { to: '/modules/dispensary', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/modules/dispensary/visits', label: 'Patient Visits', icon: Users },
  { to: '/modules/dispensary/stock', label: 'Medication Stock', icon: Pill },
  { to: '/modules/dispensary/delivery-notes', label: 'Delivery Notes', icon: ClipboardList },
  { to: '/modules/dispensary/outside-treatments', label: 'Outside Treatments', icon: ExternalLink },
  { to: '/modules/dispensary/reports', label: 'Reports', icon: BarChart2 },
]

export default function DispensaryLayout() {
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
          <ModuleToolbar currentModule="DISPENSARY" />
          <div className="flex items-center gap-2 mt-1">
            <Stethoscope size={16} className="text-emerald-400" />
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dispensary</p>
          </div>
          <h2 className="mt-2 text-lg font-display font-semibold">Dispensary</h2>
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
