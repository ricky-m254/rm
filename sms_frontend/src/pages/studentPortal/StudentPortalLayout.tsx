import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import brandLogo from '@/assets/brand/rynatyschool-logo.png'
import {
  LayoutDashboard, GraduationCap, Calendar, BookOpen,
  ClipboardList, Activity, LogOut, Menu, X, Library, CreditCard,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', to: '/student-portal', icon: LayoutDashboard, exact: true },
  { label: 'My Grades', to: '/student-portal/grades', icon: GraduationCap },
  { label: 'Timetable', to: '/student-portal/timetable', icon: Calendar },
  { label: 'Assignments', to: '/student-portal/assignments', icon: ClipboardList },
  { label: 'E-Learning', to: '/student-portal/elearning', icon: BookOpen },
  { label: 'Attendance', to: '/student-portal/attendance', icon: Activity },
  { label: 'Library', to: '/student-portal/library', icon: Library },
  { label: 'My Fees', to: '/student-portal/fees', icon: CreditCard },
]

export default function StudentPortalLayout() {
  const { username, logout } = useAuthStore(s => ({ username: s.username, logout: s.logout }))
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#070b12' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-0 z-40 md:static md:block md:w-[220px] md:flex-shrink-0 transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ background: 'linear-gradient(180deg, #0d1421 0%, #0a0f1a 100%)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07]">
          <img src={brandLogo} alt="RynatySchool" className="h-8 w-auto object-contain object-left select-none" draggable={false} />
          <button className="md:hidden text-slate-400" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        {/* User badge */}
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sky-300">{(username ?? 'S')[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{username}</p>
              <p className="text-[10px] text-sky-400">Student Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-200 font-semibold'
                    : 'text-slate-400 hover:bg-white/[0.035] hover:text-slate-200'
                }`
              }
            >
              <item.icon size={15} className="flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.07]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.07]"
          style={{ background: '#0d1421' }}>
          <button className="text-slate-400" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <img src={brandLogo} alt="RynatySchool" className="h-7 w-auto object-contain select-none" draggable={false} />
          <div className="w-5" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <footer className="px-6 py-3 border-t border-white/[0.05]">
          <p className="text-[10px] text-slate-700 text-center">
            © {new Date().getFullYear()} RynatySpace Technologies Ltd. · RynatySchool SmartCampus
          </p>
        </footer>
      </div>
    </div>
  )
}
