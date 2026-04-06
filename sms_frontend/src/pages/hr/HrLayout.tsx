import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import ModuleToolbar from '../../components/ModuleToolbar'

const navItems = [
  { label: 'Dashboard', to: '/modules/hr/dashboard' },
  { label: 'Employee Directory', to: '/modules/hr/employees' },
  { label: 'Departments & Positions', to: '/modules/hr/organization' },
  { label: 'Attendance & Time', to: '/modules/hr/attendance' },
  { label: 'Leave Management', to: '/modules/hr/leave' },
  { label: 'Payroll', to: '/modules/hr/payroll' },
  { label: 'Recruitment', to: '/modules/hr/recruitment' },
  { label: 'Onboarding', to: '/modules/hr/onboarding' },
  { label: 'Performance', to: '/modules/hr/performance' },
  { label: 'Training', to: '/modules/hr/training' },
  { label: 'Transfers', to: '/modules/hr/transfers' },
  { label: 'Career Events', to: '/modules/hr/career-events' },
  { label: 'Discipline', to: '/modules/hr/discipline' },
  { label: 'Exits', to: '/modules/hr/exits' },
  { label: 'HR Analytics', to: '/modules/hr/analytics' },
  { label: 'Compliance & Audit', to: '/modules/hr/compliance' },
]

export default function HrLayout() {
  const tenantId = useAuthStore((state) => state.tenantId)
  const username = useAuthStore((state) => state.username)
  const [isNavOpen, setIsNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl glass-panel p-5 md:col-span-3 lg:col-span-2">
          <ModuleToolbar currentModule="HR" />
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Human Resources</p>
          <h2 className="mt-2 text-lg font-display font-semibold">Module</h2>
          <button
            className="mt-4 w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 md:hidden"
            onClick={() => setIsNavOpen((prev) => !prev)}
          >
            {isNavOpen ? 'Hide menu' : 'Show menu'}
          </button>
          <div className={`mt-4 space-y-2 text-sm ${isNavOpen ? 'block' : 'hidden'} md:block`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsNavOpen(false)}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-2 transition ${
                    isActive ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-300 hover:bg-white/[0.035]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 text-xs text-slate-300">
            <p>
              <strong>Tenant:</strong> {tenantId ?? 'public'}
            </p>
            <p className="mt-2">
              <strong>User:</strong> {username ?? 'user'}
            </p>
          </div>
        </aside>

        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
