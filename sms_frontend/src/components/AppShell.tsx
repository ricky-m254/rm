import { useState, useEffect, useCallback, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { apiClient } from '../api/client'
import { getRoleShortLabel, isAdminFamilyRole } from '../lib/roleCatalog'
import DemoBanner from './DemoBanner'
import CommandPalette from './CommandPalette'
import brandLogo from '@/assets/brand/rynatyschool-logo.png'
import {
  Building2, ChevronDown, ChevronRight,
  GraduationCap, LayoutDashboard, LogOut, MessageSquare,
  Settings, Users, Trophy,
  UserCheck, DollarSign, BarChart3, Zap,
  PanelLeftClose, PanelLeftOpen, Menu, X, MoreHorizontal, Search,
} from 'lucide-react'

interface NavItem { label: string; route: string; moduleKey?: string }
interface NavGroup {
  key: string
  label: string
  icon: React.ElementType
  dotColor: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'student', label: 'Students', icon: Users, dotColor: 'bg-sky-400',
    items: [
      { label: 'Students', route: '/modules/students', moduleKey: 'STUDENTS' },
      { label: 'Admissions', route: '/modules/admissions/dashboard', moduleKey: 'ADMISSIONS' },
      { label: 'Alumni', route: '/modules/alumni/dashboard', moduleKey: 'ALUMNI' },
      { label: 'Parent Portal', route: '/modules/parent-portal/dashboard', moduleKey: 'PARENT_PORTAL' },
    ],
  },
  {
    key: 'academic', label: 'Academics', icon: GraduationCap, dotColor: 'bg-violet-400',
    items: [
      { label: 'Academics', route: '/modules/academics/dashboard', moduleKey: 'ACADEMICS' },
      { label: 'Curriculum', route: '/modules/curriculum/dashboard', moduleKey: 'CURRICULUM' },
      { label: 'Timetable', route: '/modules/timetable/grid', moduleKey: 'TIMETABLE' },
      { label: 'Examinations', route: '/modules/examinations', moduleKey: 'EXAMINATIONS' },
      { label: 'E-Learning', route: '/modules/elearning/dashboard', moduleKey: 'ELEARNING' },
      { label: 'Parent-Teacher Meetings', route: '/modules/ptm/dashboard', moduleKey: 'PTM' },
    ],
  },
  {
    key: 'finance', label: 'Finance', icon: DollarSign, dotColor: 'bg-emerald-400',
    items: [
      { label: 'Finance', route: '/modules/finance', moduleKey: 'FINANCE' },
      { label: 'Financial Reports', route: '/modules/finance/audit-reports', moduleKey: 'FINANCE' },
      { label: 'Cafeteria', route: '/modules/cafeteria/dashboard', moduleKey: 'CAFETERIA' },
      { label: 'Store & Inventory', route: '/modules/store', moduleKey: 'STORE' },
      { label: 'Assets', route: '/modules/assets/dashboard', moduleKey: 'ASSETS' },
    ],
  },
  {
    key: 'staff', label: 'Staff & HR', icon: UserCheck, dotColor: 'bg-amber-400',
    items: [
      { label: 'Staff Directory', route: '/modules/staff/dashboard', moduleKey: 'STAFF' },
      { label: 'HR & Payroll', route: '/modules/hr/dashboard', moduleKey: 'HR' },
      { label: 'Clock In / Out', route: '/modules/clockin/dashboard', moduleKey: 'CLOCKIN' },
    ],
  },
  {
    key: 'operations', label: 'Operations', icon: Building2, dotColor: 'bg-rose-400',
    items: [
      { label: 'Library', route: '/modules/library/dashboard', moduleKey: 'LIBRARY' },
      { label: 'Transport', route: '/modules/transport/dashboard', moduleKey: 'TRANSPORT' },
      { label: 'Hostel / Boarding', route: '/modules/hostel/dashboard', moduleKey: 'HOSTEL' },
      { label: 'Transfers', route: '/modules/transfers/dashboard' },
      { label: 'Visitor Management', route: '/modules/visitors/dashboard', moduleKey: 'VISITOR_MGMT' },
      { label: 'Dispensary', route: '/modules/dispensary', moduleKey: 'DISPENSARY' },
      { label: 'Maintenance', route: '/modules/maintenance/dashboard', moduleKey: 'MAINTENANCE' },
    ],
  },
  {
    key: 'student-life', label: 'Student Life', icon: Trophy, dotColor: 'bg-orange-400',
    items: [
      { label: 'Sports & Clubs', route: '/modules/sports/dashboard', moduleKey: 'SPORTS' },
      { label: 'Cafeteria', route: '/modules/cafeteria/dashboard', moduleKey: 'CAFETERIA' },
    ],
  },
  {
    key: 'communication', label: 'Communication', icon: MessageSquare, dotColor: 'bg-cyan-400',
    items: [
      { label: 'Communication', route: '/modules/communication/dashboard', moduleKey: 'COMMUNICATION' },
    ],
  },
  {
    key: 'intelligence', label: 'Analytics & Reporting', icon: BarChart3, dotColor: 'bg-pink-400',
    items: [
      { label: 'Analytics Dashboard', route: '/modules/analytics/dashboard', moduleKey: 'ANALYTICS' },
      { label: 'Audit Logs', route: '/modules/reporting/audit-logs', moduleKey: 'REPORTING' },
    ],
  },
]

/* Mobile bottom nav — 5 primary destinations */
const MOBILE_NAV = [
  { icon: LayoutDashboard, label: 'Home',     route: '/dashboard',                   exact: true  },
  { icon: Users,           label: 'Students', route: '/modules/students',             exact: false },
  { icon: DollarSign,      label: 'Finance',  route: '/modules/finance',              exact: false },
  { icon: UserCheck,       label: 'Staff',    route: '/modules/hr/dashboard',         exact: false },
  { icon: MoreHorizontal,  label: 'More',     route: null,                            exact: false },
]

interface SchoolBranding {
  school_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

/* ── Sidebar nav content (shared between desktop sidebar + mobile drawer) ── */
function SidebarNav({
  primaryColor, openGroups, toggleGroup, location, onNavigate, groups,
}: {
  primaryColor: string
  openGroups: Set<string>
  toggleGroup: (key: string) => void
  location: { pathname: string }
  onNavigate?: () => void
  groups: NavGroup[]
}) {
  const isActiveGroup = (group: NavGroup) =>
    group.items.some(i => location.pathname.startsWith(i.route.replace(/\/dashboard$/, '')))

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
      {/* Dashboard */}
      <NavLink
        to="/dashboard"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          `group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150 relative overflow-hidden
          ${isActive ? 'nav-active-glow text-white font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'}`
        }
      >
        {({ isActive }) => (
          <>
            <LayoutDashboard size={15} className={`flex-shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <span className="text-[13px] leading-none capitalize">Dashboard</span>
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </>
        )}
      </NavLink>

      {/* Approvals */}
      <NavLink
        to="/dashboard/approvals"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          `group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150 relative overflow-hidden
          ${isActive
            ? 'text-amber-300 font-semibold'
            : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/[0.06]'}`
        }
        style={({ isActive }) => isActive ? {
          background: 'linear-gradient(90deg, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0.04) 100%)',
          border: '1px solid rgba(245,158,11,0.28)',
          boxShadow: 'inset 3px 0 0 #f59e0b',
        } : {}}
      >
        {({ isActive }) => (
          <>
            <Zap size={15} className={`flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'}`} />
            <span className="text-[13px] leading-none capitalize">Approvals</span>
            <span className="ml-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
            </span>
          </>
        )}
      </NavLink>

      {/* Divider */}
      <div className="my-2 mx-2 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Module Groups */}
      {groups.map(group => {
        const Icon = group.icon
        const isActive = isActiveGroup(group)
        const isOpen = openGroups.has(group.key)
        return (
          <div key={group.key}>
            <button
              onClick={() => toggleGroup(group.key)}
              className={`group w-full flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-150
                ${isActive
                  ? 'text-slate-100'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'}`}
              style={isActive ? { background: 'rgba(255,255,255,0.04)' } : {}}
            >
              <Icon size={12} className={`flex-shrink-0 transition-colors ${isActive ? 'text-white opacity-80' : 'text-slate-600 group-hover:text-slate-400'}`} />
              <span className="flex-1 text-left text-[11px] font-bold uppercase tracking-[0.09em] capitalize">{group.label}</span>
              <div className="flex items-center gap-1.5">
                {isActive && <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${group.dotColor}`} />}
                {isOpen
                  ? <ChevronDown size={10} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                  : <ChevronRight size={10} className="text-slate-700 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                }
              </div>
            </button>
            {isOpen && (
              <div className="mt-0.5 ml-4 pl-2.5 space-y-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                {group.items.map(item => {
                  const itemActive = location.pathname.startsWith(item.route.replace(/\/dashboard$/, ''))
                  return (
                    <NavLink
                      key={item.route}
                      to={item.route}
                      onClick={onNavigate}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-100
                        ${itemActive
                          ? 'text-white font-semibold'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}`}
                      style={itemActive ? {
                        background: `linear-gradient(90deg, ${primaryColor}18 0%, ${primaryColor}06 100%)`,
                        borderLeft: `2px solid ${primaryColor}`,
                        paddingLeft: '8px',
                      } : {}}
                    >
                      {itemActive && (
                        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: primaryColor }} />
                      )}
                      <span className="truncate capitalize">{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['student', 'academic']))
  const [branding, setBranding] = useState<SchoolBranding | null>(null)
  const [cursor, setCursor] = useState({ x: -2000, y: -2000 })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { username, role, logout, assignedModules } = useAuthStore(s => ({
    username: s.username,
    role: s.role,
    logout: s.logout,
    assignedModules: s.assignedModules,
  }))

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  /* Close drawer on route change */
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  /* ⌘K / Ctrl+K — open command palette */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* Lock body scroll when drawer is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    apiClient.get<Record<string, unknown>>('/school/profile/').then(r => {
      const resp = r.data as Record<string, unknown>
      const p = (resp.profile as Record<string, unknown> | null) ?? resp
      const primary = (p?.primary_color as string) || '#10b981'
      setBranding({
        school_name: (p?.school_name as string) || 'RynatySchool SmartCampus',
        logo_url: (p?.logo_url as string) || null,
        primary_color: primary,
        secondary_color: (p?.secondary_color as string) || '#0ea5e9',
      })
      const root = document.documentElement
      root.style.setProperty('--brand-primary', primary)
      root.style.setProperty('--brand-secondary', (p?.secondary_color as string) || '#0ea5e9')
    }).catch(() => {})
  }, [])

  /* Compute filtered sidebar groups from the user's assigned module keys.
     - Admin / Super Admin: assignedModules contains ALL active modules (backend sends all)
     - Other roles: only their assigned subset
     - Fails CLOSED: if assignedModules is empty for a non-admin, show nothing until loaded
     No additional API call needed — data is populated at login via /api/auth/me/ */
  const filteredGroups: NavGroup[] = useMemo(() => {
    const upperRole = (role ?? '').toUpperCase()
    const isAdmin = isAdminFamilyRole(upperRole)

    // Admin with no assigned modules in store yet → show all while loading
    if (isAdmin && assignedModules.length === 0) return NAV_GROUPS

    // If assignedModules is populated, always filter (admins also filter, but they get all modules)
    if (assignedModules.length > 0) {
      const allowed = new Set(assignedModules.map(k => k.toUpperCase()))
      return NAV_GROUPS
        .map(g => ({
          ...g,
          items: g.items.filter(item => !item.moduleKey || allowed.has(item.moduleKey)),
        }))
        .filter(g => g.items.length > 0)
    }

    // Non-admin with no assigned modules: show nothing (fail closed)
    return []
  }, [role, assignedModules])

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const primaryColor = branding?.primary_color ?? '#10b981'

  const roleLabel = role ? getRoleShortLabel(role) : 'Staff'

  const LogoBlock = ({ showText }: { showText: boolean }) => (
    <div className="flex items-center w-full h-full overflow-hidden">
      {showText ? (
        branding?.logo_url ? (
          <img src={branding.logo_url} alt="School logo"
            className="w-full h-full object-contain object-left select-none"
            draggable={false} />
        ) : (
          <img src={brandLogo} alt="RynatySchool SmartCampus"
            className="w-full h-full object-contain object-left select-none"
            draggable={false} />
        )
      ) : (
        branding?.logo_url ? (
          <img src={branding.logo_url} alt="School logo"
            className="w-10 h-10 rounded-xl object-cover object-center flex-shrink-0 ring-1 ring-white/10 select-none"
            draggable={false} />
        ) : (
          <img src={brandLogo} alt="RynatySchool"
            className="w-10 h-10 rounded-xl object-cover object-left flex-shrink-0 select-none"
            draggable={false} />
        )
      )}
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#070b12' }}>

      {/* ═══════════════════════════════════════════════════
          DESKTOP SIDEBAR (hidden below md)
      ═══════════════════════════════════════════════════ */}
      <aside
        className={`hidden md:flex relative flex-col flex-shrink-0 border-r transition-all duration-300 ease-in-out overflow-hidden
          ${collapsed ? 'w-[60px]' : 'w-[230px]'}`}
        style={{ background: 'linear-gradient(180deg, #0d1421 0%, #0a0f1a 100%)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        {/* Logo */}
        <div
          className={`relative flex items-center border-b flex-shrink-0 overflow-hidden
            ${collapsed ? 'justify-center px-2' : 'px-3'}`}
          style={{ borderColor: 'rgba(255,255,255,0.07)', height: 64 }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: `radial-gradient(ellipse at top left, ${primaryColor}40 0%, transparent 65%)` }} />
          {!collapsed && <>
            <div className="aurora-blob-1 z-0" />
            <div className="aurora-blob-2 z-0" />
            <div className="aurora-blob-3 z-0" />
          </>}
          <div className="relative z-10 w-full min-w-0 flex items-center" style={{ height: 44 }}>
            <LogoBlock showText={!collapsed} />
          </div>
        </div>

        {/* Nav */}
        {collapsed ? (
          /* Collapsed: icon-only */
          <nav className="flex-1 overflow-y-auto py-3 px-1.5 space-y-1">
            <button onClick={() => navigate('/dashboard')} title="Dashboard"
              className={`w-full flex justify-center items-center rounded-xl py-2.5 transition-all ${location.pathname === '/dashboard' ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}>
              <LayoutDashboard size={15} className={location.pathname === '/dashboard' ? 'text-white' : 'text-slate-500'} />
            </button>
            {/* Search / Command Palette trigger */}
            <button onClick={() => setPaletteOpen(true)} title="Search (⌘K)"
              className="w-full flex justify-center items-center rounded-xl py-2.5 transition-all hover:bg-white/[0.04]">
              <Search size={15} className="text-slate-500" />
            </button>
            <button onClick={() => navigate('/dashboard/approvals')} title="Approvals"
              className={`w-full flex justify-center items-center rounded-xl py-2.5 transition-all ${location.pathname === '/dashboard/approvals' ? 'bg-amber-500/20' : 'hover:bg-white/[0.04]'}`}>
              <Zap size={15} className={location.pathname === '/dashboard/approvals' ? 'text-amber-400' : 'text-slate-500'} />
            </button>
            <div className="my-1 h-px mx-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
            {filteredGroups.map(group => {
              const Icon = group.icon
              const isActive = group.items.some(i => location.pathname.startsWith(i.route.replace(/\/dashboard$/, '')))
              return (
                <button key={group.key}
                  onClick={() => { setCollapsed(false); setOpenGroups(new Set([group.key])) }}
                  title={group.label}
                  className={`w-full flex justify-center items-center rounded-xl py-2.5 transition-all ${isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}>
                  <Icon size={15} className={isActive ? 'text-white' : 'text-slate-500'} />
                </button>
              )
            })}
          </nav>
        ) : (
          <>
            {/* Search / Command Palette trigger button */}
            <div className="px-3 pt-3 pb-1 flex-shrink-0">
              <button
                onClick={() => setPaletteOpen(true)}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all hover:bg-white/[0.06] group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Search size={12} className="text-slate-500 flex-shrink-0" />
                <span className="text-[12px] text-slate-500 flex-1">Search anything…</span>
                <kbd className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-600"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  ⌘K
                </kbd>
              </button>
            </div>
            <SidebarNav
              primaryColor={primaryColor}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              location={location}
              groups={filteredGroups}
            />
          </>
        )}

        {/* Bottom section */}
        <div className="flex-shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-2 pt-2">
            <NavLink to="/settings/school-profile" title="Settings"
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-xl transition-all duration-150
                ${collapsed ? 'justify-center px-0 py-2.5 w-full' : 'px-3 py-2.5'}
                ${isActive ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}`
              }>
              {!collapsed
                ? <><Settings size={14} className="flex-shrink-0" /><span className="text-[13px]">Settings</span></>
                : <Settings size={14} />
              }
            </NavLink>
          </div>
          <div className={`p-2 ${collapsed ? 'flex justify-center pb-3' : ''}`}>
            {collapsed ? (
              <button onClick={handleLogout} title="Log out"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition">
                <LogOut size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 mb-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white ring-1 ring-white/10"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}80, ${primaryColor}30)` }}>
                  {(username ?? 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 leading-tight truncate">{username ?? 'User'}</p>
                  <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: `${primaryColor}99` }}>{roleLabel}</p>
                </div>
                <button onClick={handleLogout} title="Log out"
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition">
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(c => !c)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-slate-600 hover:text-slate-300 transition-all ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed
              ? <PanelLeftOpen size={13} />
              : <><PanelLeftClose size={13} /><span className="text-[11px]">Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          MOBILE TOP HEADER (visible below md)
      ═══════════════════════════════════════════════════ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{
          background: 'rgba(10,15,26,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
          aria-label="Open menu">
          <Menu size={20} />
        </button>

        {/* Centre logo */}
        <div className="flex-1 flex justify-center px-2 min-w-0" style={{ height: 40 }}>
          <LogoBlock showText />
        </div>

        {/* Right: search + avatar */}
        <div className="flex items-center gap-1">
          <button onClick={() => setPaletteOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
            title="Search (⌘K)">
            <Search size={18} />
          </button>
          <button onClick={handleLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white ring-1 ring-white/10 transition hover:opacity-80"
            style={{ background: `linear-gradient(135deg, ${primaryColor}80, ${primaryColor}30)` }}
            title="Log out">
            {(username ?? 'U')[0].toUpperCase()}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE DRAWER OVERLAY
      ═══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="md:hidden fixed top-0 left-0 bottom-0 z-[70] w-[280px] flex flex-col animate-slide-in-left"
            style={{
              background: 'linear-gradient(180deg, #0d1421 0%, #0a0f1a 100%)',
              borderRight: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-3 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)', height: 64 }}>
              <div className="flex-1 min-w-0 mr-2" style={{ height: 44 }}>
                <LogoBlock showText />
              </div>
              <button onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.08] transition"
                aria-label="Close menu">
                <X size={16} />
              </button>
            </div>

            {/* Nav */}
            <SidebarNav
              primaryColor={primaryColor}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              location={location}
              onNavigate={() => setMobileOpen(false)}
              groups={filteredGroups}
            />

            {/* Drawer footer */}
            <div className="flex-shrink-0 border-t p-3 space-y-1" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <NavLink to="/settings/school-profile" onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all
                  ${isActive ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}`
                }>
                <Settings size={14} /><span className="text-[13px]">Settings</span>
              </NavLink>
              <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white ring-1 ring-white/10"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}80, ${primaryColor}30)` }}>
                  {(username ?? 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 leading-tight truncate">{username ?? 'User'}</p>
                  <p className="text-[10px] leading-tight mt-0.5" style={{ color: `${primaryColor}99` }}>{roleLabel}</p>
                </div>
                <button onClick={handleLogout} title="Log out"
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition">
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Cursor spotlight overlay ── */}
      <div className="pointer-events-none fixed inset-0 hidden md:block"
        style={{
          zIndex: 9998,
          background: `radial-gradient(700px circle at ${cursor.x}px ${cursor.y}px, rgba(16,185,129,0.05), transparent 45%)`,
          transition: 'background 0.05s ease',
        }}
      />

      {/* ═══════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Spacer for mobile top header */}
        <div className="md:hidden flex-shrink-0 h-14" />

        {/* Demo mode banner */}
        <DemoBanner />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* ═══════════════════════════════════════════════════
            MOBILE BOTTOM NAV
        ═══════════════════════════════════════════════════ */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
          style={{
            background: 'rgba(7,11,18,0.97)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
          {MOBILE_NAV.map(({ icon: Icon, label, route, exact }) => {
            const isActive = route
              ? (exact ? location.pathname === route : location.pathname.startsWith(route))
              : false
            return (
              <button
                key={label}
                onClick={() => {
                  if (route) { navigate(route) }
                  else { setMobileOpen(true) }
                }}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all relative"
              >
                {/* Active pill */}
                {isActive && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                    style={{ background: primaryColor }} />
                )}
                <div className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all duration-200 ${
                  isActive ? '' : 'bg-transparent'
                }`}
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${primaryColor}28, ${primaryColor}10)`,
                    boxShadow: `0 0 12px ${primaryColor}30`,
                  } : {}}>
                  <Icon
                    size={isActive ? 20 : 18}
                    className="transition-all duration-200"
                    style={{ color: isActive ? primaryColor : '#475569' }}
                  />
                </div>
                <span className="text-[9px] font-bold leading-none capitalize mt-0.5"
                  style={{ color: isActive ? primaryColor : '#475569' }}>
                  {label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ⌘K Command Palette — global */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
