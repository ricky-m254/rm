import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import ModuleToolbar from '../../components/ModuleToolbar'

const navItems = [
  { label: 'Dashboard', to: '/modules/sports' },
  { label: 'Clubs & Societies', to: '/modules/sports/clubs' },
  { label: 'Memberships', to: '/modules/sports/memberships' },
  { label: 'Tournaments', to: '/modules/sports/tournaments' },
  { label: 'Student Awards', to: '/modules/sports/awards' },
]

export default function SportsLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        <aside className="col-span-12 rounded-2xl glass-panel p-5 md:col-span-3 lg:col-span-2">
          <ModuleToolbar currentModule="SPORTS" />
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sports & Clubs</p>
            <h2 className="mt-2 text-lg font-display font-semibold text-emerald-400">Module</h2>
          </div>
          <button
            className="mt-4 w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 md:hidden"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? 'Hide menu' : 'Show menu'}
          </button>
          <div className={`mt-4 space-y-2 text-sm ${open ? 'block' : 'hidden'} md:block`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/modules/sports'}
                onClick={() => setOpen(false)}
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
        </aside>
        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
