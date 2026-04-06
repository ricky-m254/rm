import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import ModuleToolbar from '../../components/ModuleToolbar'

const navItems = [
  { label: 'Dashboard', to: '/modules/admissions/dashboard' },
  { label: 'Inquiries', to: '/modules/admissions/inquiries' },
  { label: 'Applications', to: '/modules/admissions/applications' },
  { label: 'Reviews', to: '/modules/admissions/reviews' },
  { label: 'Assessments', to: '/modules/admissions/assessments' },
  { label: 'Interviews', to: '/modules/admissions/interviews' },
  { label: 'Decisions', to: '/modules/admissions/decisions' },
  { label: 'Enrollment', to: '/modules/admissions/enrollment' },
  { label: 'Analytics', to: '/modules/admissions/analytics' },
]

export default function AdmissionsLayout() {
  const tenantId = useAuthStore((state) => state.tenantId)
  const username = useAuthStore((state) => state.username)
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => { setIsNavOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl glass-panel p-5 md:col-span-3 lg:col-span-2">
          <ModuleToolbar currentModule="ADMISSIONS" />
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admissions</p>
          <h2 className="mt-2 text-lg font-display font-semibold">Module</h2>
          <button
            className="mt-4 w-full rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-slate-200 md:hidden"
            onClick={() => setIsNavOpen((p) => !p)}
          >
            {isNavOpen ? 'Hide menu ↑' : 'Show menu ↓'}
          </button>
          <div className={`mt-4 space-y-2 text-sm ${isNavOpen ? 'block' : 'hidden'} md:block`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsNavOpen(false)}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-2.5 transition ${
                    isActive ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-300 hover:bg-white/[0.035]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 text-xs text-slate-300">
            <p><strong>Tenant:</strong> {tenantId ?? 'public'}</p>
            <p className="mt-2"><strong>User:</strong> {username ?? 'user'}</p>
          </div>
        </aside>
        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
