import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, LayoutDashboard } from 'lucide-react'

interface ModuleItem {
  key: string
  label: string
  route: string
}

interface ModuleGroup {
  label: string
  modules: ModuleItem[]
}

const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Student Management',
    modules: [
      { key: 'STUDENTS', label: 'Students', route: '/modules/students' },
      { key: 'ADMISSIONS', label: 'Admissions', route: '/modules/admissions/dashboard' },
      { key: 'ALUMNI', label: 'Alumni', route: '/modules/alumni/dashboard' },
      { key: 'PARENTS', label: 'Parent Portal', route: '/modules/parent-portal/dashboard' },
    ],
  },
  {
    label: 'Academic Management',
    modules: [
      { key: 'ACADEMICS', label: 'Academics', route: '/modules/academics/dashboard' },
      { key: 'CURRICULUM', label: 'Curriculum', route: '/modules/curriculum/dashboard' },
      { key: 'TIMETABLE', label: 'Timetable', route: '/modules/timetable/grid' },
      { key: 'EXAMINATIONS', label: 'Examinations', route: '/modules/examinations/dashboard' },
      { key: 'ELEARNING', label: 'E-Learning', route: '/modules/elearning/dashboard' },
      { key: 'PTM', label: 'PTM', route: '/modules/ptm/dashboard' },
    ],
  },
  {
    label: 'Finance & Commerce',
    modules: [
      { key: 'FINANCE', label: 'Finance', route: '/modules/finance' },
      { key: 'STORE', label: 'Store & Inventory', route: '/modules/store' },
      { key: 'ASSETS', label: 'Assets', route: '/modules/assets/dashboard' },
      { key: 'CAFETERIA', label: 'Cafeteria', route: '/modules/cafeteria/dashboard' },
    ],
  },
  {
    label: 'Staff & HR',
    modules: [
      { key: 'STAFF', label: 'Staff', route: '/modules/staff/dashboard' },
      { key: 'HR', label: 'HR', route: '/modules/hr/dashboard' },
      { key: 'CLOCKIN', label: 'Clock In/Out', route: '/modules/clockin/dashboard' },
    ],
  },
  {
    label: 'School Operations',
    modules: [
      { key: 'LIBRARY', label: 'Library', route: '/modules/library/dashboard' },
      { key: 'TRANSPORT', label: 'Transport', route: '/modules/transport/dashboard' },
      { key: 'HOSTEL', label: 'Hostel', route: '/modules/hostel/dashboard' },
      { key: 'VISITOR_MGMT', label: 'Visitor Management', route: '/modules/visitors/dashboard' },
      { key: 'DISPENSARY', label: 'Dispensary', route: '/modules/dispensary' },
      { key: 'MAINTENANCE', label: 'Maintenance', route: '/modules/maintenance/dashboard' },
    ],
  },
  {
    label: 'Student Life & Comms',
    modules: [
      { key: 'SPORTS', label: 'Sports', route: '/modules/sports/dashboard' },
      { key: 'COMMUNICATION', label: 'Communication', route: '/modules/communication/dashboard' },
    ],
  },
  {
    label: 'Reports & Analytics',
    modules: [
      { key: 'ANALYTICS', label: 'Analytics', route: '/modules/analytics/dashboard' },
      { key: 'REPORTING', label: 'Reporting', route: '/modules/reporting/audit-logs' },
    ],
  },
]

interface Props {
  currentModule?: string
}

export default function ModuleToolbar({ currentModule }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-5 space-y-2">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300"
      >
        <LayoutDashboard size={13} />
        <span>Dashboard</span>
      </button>

      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700/60 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
      >
        <span>Switch module</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          {MODULE_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'border-t border-slate-800/60' : ''}>
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {group.label}
              </p>
              <div className="px-2 pb-2 grid grid-cols-2 gap-1">
                {group.modules.map(mod => (
                  <button
                    key={mod.key}
                    onClick={() => { navigate(mod.route); setOpen(false) }}
                    className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition border ${
                      currentModule === mod.key
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-[#0d1421] hover:text-emerald-200'
                    }`}
                  >
                    {mod.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-800/80" />
    </div>
  )
}
