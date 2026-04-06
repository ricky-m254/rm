import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

const navItems = [
  { to: '/platform', label: 'Overview' },
  { to: '/platform/tenants', label: 'Tenants' },
  { to: '/platform/workflow-monitor', label: 'Workflow Monitor' },
  { to: '/platform/global-reports', label: 'Global Reports' },
  { to: '/platform/domain-requests', label: 'Domain Requests' },
  { to: '/platform/billing', label: 'Subscription & Billing' },
  { to: '/platform/revenue-analytics', label: 'Revenue Analytics' },
  { to: '/platform/support', label: 'Support' },
  { to: '/platform/impersonation', label: 'Impersonation' },
  { to: '/platform/monitoring', label: 'Monitoring' },
  { to: '/platform/deployment', label: 'Deployment' },
  { to: '/platform/backup-recovery', label: 'Backup & Recovery' },
  { to: '/platform/security-compliance', label: 'Security & Compliance' },
  { to: '/platform/action-logs', label: 'Action Logs' },
  { to: '/platform/settings', label: 'Platform Settings' },
  { to: '/platform/admin-users', label: 'Admin Users' },
  { to: '/platform/usage-metering', label: 'Usage Metering' },
  { to: '/platform/feature-flags', label: 'Feature Flags' },
  { to: '/platform/notifications', label: 'Notifications' },
  { to: '/platform/api-integrations', label: 'API & Integrations' },
]

export default function PlatformLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const username = useAuthStore((state) => state.username)
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => { setIsNavOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl glass-panel p-5 md:col-span-3 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Platform</p>
          <h1 className="mt-2 text-lg font-display font-semibold">Super Admin</h1>
          <button
            className="mt-4 w-full rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-slate-200 md:hidden"
            onClick={() => setIsNavOpen((p) => !p)}
          >
            {isNavOpen ? 'Hide menu ↑' : 'Show menu ↓'}
          </button>
          <div className={`mt-5 space-y-2 text-sm ${isNavOpen ? 'block' : 'hidden'} md:block`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/platform'}
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
            <p><strong>User:</strong> {username ?? 'platform-admin'}</p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-white/[0.09] px-3 py-2.5 text-xs text-slate-200"
              onClick={() => { logout(); navigate('/platform/login') }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
