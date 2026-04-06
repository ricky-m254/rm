import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import brandLogo from '@/assets/brand/rynatyschool-logo.png'
import {
  LayoutDashboard, Users, ClipboardCheck, BookOpen,
  GraduationCap, Calendar, LogOut, Menu, X, ChevronRight,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', to: '/teacher-portal', icon: LayoutDashboard, exact: true },
  { label: 'My Classes', to: '/teacher-portal/classes', icon: Users },
  { label: 'Attendance', to: '/teacher-portal/attendance', icon: ClipboardCheck },
  { label: 'Gradebook', to: '/teacher-portal/gradebook', icon: GraduationCap },
  { label: 'Resources', to: '/teacher-portal/resources', icon: BookOpen },
  { label: 'Timetable', to: '/teacher-portal/timetable', icon: Calendar },
]

export default function TeacherPortalLayout() {
  const { username, logout } = useAuthStore(s => ({ username: s.username, logout: s.logout }))
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#070b12' }}>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[220px] flex-shrink-0 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #0d1421 0%, #0a0f1a 100%)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07] shrink-0">
          <img src={brandLogo} alt="RynatySchool" className="h-8 w-auto object-contain object-left select-none" draggable={false} />
          <button className="md:hidden text-slate-400" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        {/* User badge */}
        <div className="px-4 py-3 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {(username ?? 'T').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-white truncate">{username ?? 'Teacher'}</p>
              <p className="text-[10px] text-violet-400 font-medium">Teacher Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-violet-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
              style={({ isActive }) => isActive ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' } : {}}
            >
              <item.icon size={15} />
              {item.label}
              <ChevronRight size={11} className="ml-auto opacity-40" />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/[0.05] shrink-0">
          <button onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition mb-1">
            ← Main Dashboard
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-500 hover:text-rose-400 transition">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.07]"
          style={{ background: 'rgba(13,20,33,0.95)' }}>
          <button onClick={() => setOpen(true)} className="text-slate-400"><Menu size={20} /></button>
          <img src={brandLogo} alt="RynatySchool" className="h-7 w-auto" />
          <div className="w-8" />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
