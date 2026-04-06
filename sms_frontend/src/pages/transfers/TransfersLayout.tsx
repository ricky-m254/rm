import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import ModuleToolbar from '../../components/ModuleToolbar'

const navItems = [
  { label: 'Dashboard',    to: '/modules/transfers/dashboard' },
  { label: 'Initiate Transfer', to: '/modules/transfers/initiate' },
  { label: 'Incoming',    to: '/modules/transfers/incoming' },
  { label: 'Outgoing',    to: '/modules/transfers/outgoing' },
  { label: 'History',     to: '/modules/transfers/history' },
]

export default function TransfersLayout() {
  const tenantId = useAuthStore((s) => s.tenantId)
  const username = useAuthStore((s) => s.username)
  const role     = useAuthStore((s) => s.role)
  const [open, setOpen] = useState(false)

  const visibleNav = role === 'PARENT'
    ? [
        { label: 'My Requests', to: '/modules/transfers/dashboard' },
        { label: 'Request Transfer', to: '/modules/transfers/initiate' },
      ]
    : navItems

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl glass-panel p-5 md:col-span-3 lg:col-span-2">
          <ModuleToolbar currentModule="TRANSFERS" />
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Transfers</p>
          <h2 className="mt-2 text-lg font-display font-semibold text-emerald-400">Module</h2>
          <button
            className="mt-4 w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 md:hidden"
            onClick={() => setOpen((p) => !p)}
          >
            {open ? 'Hide menu' : 'Show menu'}
          </button>
          <div className={`mt-4 space-y-2 text-sm ${open ? 'block' : 'hidden'} md:block`}>
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-2 transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'text-slate-300 hover:bg-white/[0.035]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 text-xs text-slate-300">
            <p><strong>Tenant:</strong> {tenantId ?? 'public'}</p>
            <p className="mt-1"><strong>Role:</strong> {role ?? '—'}</p>
            <p className="mt-1"><strong>User:</strong> {username ?? '—'}</p>
          </div>
        </aside>
        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
