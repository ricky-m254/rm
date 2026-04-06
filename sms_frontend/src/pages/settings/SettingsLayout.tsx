import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Building2, ChevronDown, ChevronRight, DollarSign,
  LayoutDashboard, MessageSquare, Settings,
  Shield, Upload, Wrench,
} from 'lucide-react'
import ModuleToolbar from '../../components/ModuleToolbar'
import { isAdminFamilyRole } from '../../lib/roleCatalog'
import { useAuthStore } from '../../store/auth'

interface SidebarItem {
  key: string
  label: string
  route: string
  tag?: 'soon'
}

interface SidebarGroup {
  label: string
  icon: React.ElementType
  color: string
  items: SidebarItem[]
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Institution Control',
    icon: Settings,
    color: 'text-emerald-400',
    items: [
      { key: 'control-plane', label: 'Control Plane', route: '/settings/control-plane' },
    ],
  },
  {
    label: 'School Setup',
    icon: Building2,
    color: 'text-sky-400',
    items: [
      { key: 'school-profile', label: 'School Profile', route: '/settings/school-profile' },
      { key: 'academics', label: 'Academic Configuration', route: '/settings/academics' },
      { key: 'admission', label: 'Admission Numbers', route: '/settings/admission' },
      { key: 'students', label: 'Student Configuration', route: '/settings/students' },
      { key: 'staff', label: 'Staff Configuration', route: '/settings/staff' },
      { key: 'departments', label: 'Departments', route: '/settings/departments', tag: 'soon' },
    ],
  },
  {
    label: 'Finance & Commerce',
    icon: DollarSign,
    color: 'text-emerald-400',
    items: [
      { key: 'finance', label: 'Finance Configuration', route: '/settings/finance' },
      { key: 'parents', label: 'Parent Portal Settings', route: '/settings/parents' },
    ],
  },
  {
    label: 'Communication',
    icon: MessageSquare,
    color: 'text-violet-400',
    items: [
      { key: 'communication', label: 'Communication Settings', route: '/settings/communication' },
    ],
  },
  {
    label: 'Access Control',
    icon: Shield,
    color: 'text-rose-400',
    items: [
      { key: 'security', label: 'Security Policy', route: '/settings/security' },
      { key: 'users', label: 'User Management', route: '/settings/users' },
      { key: 'roles', label: 'Roles & Permissions', route: '/settings/roles' },
      { key: 'domain', label: 'Custom Domain', route: '/settings/domain' },
    ],
  },
  {
    label: 'Module Configuration',
    icon: Wrench,
    color: 'text-amber-400',
    items: [
      { key: 'modules', label: 'Module Settings', route: '/settings/modules' },
      { key: 'timetable', label: 'Timetable Config', route: '/settings/timetable' },
      { key: 'examinations', label: 'Examinations Config', route: '/settings/examinations' },
      { key: 'library', label: 'Library Config', route: '/settings/library' },
      { key: 'transport', label: 'Transport Config', route: '/settings/transport' },
      { key: 'hostel', label: 'Hostel Config', route: '/settings/hostel' },
      { key: 'assets', label: 'Inventory & Assets Config', route: '/settings/assets' },
      { key: 'dispensary', label: 'Health & Dispensary Config', route: '/settings/dispensary' },
      { key: 'visitor-mgmt', label: 'Visitor Management Config', route: '/settings/visitor-mgmt' },
    ],
  },
  {
    label: 'Data Management',
    icon: Upload,
    color: 'text-sky-400',
    items: [
      { key: 'import-export', label: 'Import & Export', route: '/settings/import-export' },
    ],
  },
  {
    label: 'System',
    icon: Settings,
    color: 'text-slate-400',
    items: [
      { key: 'global', label: 'Global & Theme', route: '/settings/global' },
      { key: 'seed-data', label: 'Seed Sample Data', route: '/settings/seed-data' },
      { key: 'integrations', label: 'Integrations', route: '/settings/integrations', tag: 'soon' },
      { key: 'audit-logs', label: 'Audit Logs', route: '/settings/audit-logs', tag: 'soon' },
    ],
  },
]

const DEFAULT_OPEN_GROUPS = ['Institution Control', 'School Setup', 'Access Control']

function SidebarGroup({ group }: { group: SidebarGroup }) {
  const [open, setOpen] = useState(DEFAULT_OPEN_GROUPS.includes(group.label))
  const Icon = group.icon

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.025]"
      >
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${group.color}`} />
        <span className="flex-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">{group.label}</span>
        {open ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {group.items.map(item => (
            item.tag === 'soon'
              ? (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg px-3 py-2 opacity-40 cursor-not-allowed"
                >
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">Soon</span>
                </div>
              )
              : (
                <NavLink
                  key={item.key}
                  to={item.route}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg px-3 py-2 text-xs transition ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-200 font-medium'
                        : 'text-slate-300 hover:bg-white/[0.03] hover:text-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
          ))}
        </div>
      )}
    </div>
  )
}

export default function SettingsLayout() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = useAuthStore(s => s.role)
  const isAdmin = isAdminFamilyRole(role)
  const visibleGroups = SIDEBAR_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.key !== 'seed-data' || isAdmin),
    }))
    .filter(group => group.items.length > 0)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-12 gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="rounded-2xl glass-panel p-4 sticky top-6">
            <ModuleToolbar />

            {/* Control Center header */}
            <div className="mb-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <Settings className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Admin</p>
                <h2 className="text-sm font-semibold text-slate-100 leading-tight">Control Center</h2>
              </div>
            </div>

            {/* Mobile toggle */}
            <button
              className="w-full rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-300 mb-3 md:hidden"
              onClick={() => setMobileOpen(p => !p)}
            >
              {mobileOpen ? 'Hide menu' : 'Show menu'}
            </button>

            <nav className={`space-y-3 ${mobileOpen ? 'block' : 'hidden'} md:block`}>
              {/* Dashboard shortcut */}
              <button
                onClick={() => navigate('/dashboard')}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                ← Back to Dashboard
              </button>

              <div className="border-t border-white/[0.06] pt-3 space-y-3">
                {visibleGroups.map(group => (
                  <SidebarGroup key={group.label} group={group} />
                ))}
              </div>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
