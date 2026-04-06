import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertCircle, ArrowRight, BarChart2, BookOpen, Building2, CheckCircle2,
  ChevronDown, ChevronRight, DollarSign, GraduationCap, MessageSquare,
  Play, RefreshCw, ShoppingCart, Undo2, Users, Zap,
  FileText, LayoutGrid, TrendingDown,
  Settings, ClipboardList, CreditCard, CalendarDays, UserCheck,
} from 'lucide-react'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/auth'
import { isBackendModuleEnabled } from '../config/moduleFocus'
import { getRoleShortLabel, resolveDashboardRoleKey } from '../lib/roleCatalog'

function GreetingOrb({ period }: { period: 'morning' | 'afternoon' | 'evening' }) {
  if (period === 'morning') return (
    <div className="relative flex-shrink-0">
      <div className="w-14 h-14 rounded-[18px] overflow-hidden"
        style={{ boxShadow: '0 0 44px rgba(244,165,52,0.58), 0 8px 32px rgba(244,165,52,0.32), inset 0 0 0 1px rgba(255,210,80,0.18)' }}>
        <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="sky-m" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#060418" />
              <stop offset="26%" stopColor="#3a1050" />
              <stop offset="50%" stopColor="#842030" />
              <stop offset="68%" stopColor="#d25018" />
              <stop offset="83%" stopColor="#e88020" />
              <stop offset="100%" stopColor="#f4b83c" />
            </linearGradient>
            <radialGradient id="sun-gm" cx="50%" cy="100%" r="62%">
              <stop offset="0%" stopColor="#fff7d4" stopOpacity="1" />
              <stop offset="18%" stopColor="#ffe060" stopOpacity="0.85" />
              <stop offset="42%" stopColor="#f49018" stopOpacity="0.5" />
              <stop offset="72%" stopColor="#d44010" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#8c2020" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="56" height="56" fill="url(#sky-m)" />
          <ellipse cx="28" cy="56" rx="32" ry="24" fill="url(#sun-gm)" />
          <rect x="0" y="33" width="56" height="10" fill="#f07c20" opacity="0.1" />
          <circle cx="28" cy="48" r="10" fill="#fff9d0" opacity="0.9" />
          <circle cx="28" cy="48" r="8" fill="#fffce8" />
          <circle cx="28" cy="48" r="5.5" fill="#fffff2" />
          <line x1="28" y1="37" x2="28" y2="29" stroke="#ffe87a" strokeWidth="0.85" strokeOpacity="0.55" strokeLinecap="round" />
          <line x1="35" y1="38.5" x2="40.5" y2="31.5" stroke="#ffe87a" strokeWidth="0.85" strokeOpacity="0.48" strokeLinecap="round" />
          <line x1="21" y1="38.5" x2="15.5" y2="31.5" stroke="#ffe87a" strokeWidth="0.85" strokeOpacity="0.48" strokeLinecap="round" />
          <line x1="39" y1="42" x2="46" y2="37" stroke="#ffd860" strokeWidth="0.75" strokeOpacity="0.35" strokeLinecap="round" />
          <line x1="17" y1="42" x2="10" y2="37" stroke="#ffd860" strokeWidth="0.75" strokeOpacity="0.35" strokeLinecap="round" />
          <line x1="32.5" y1="37" x2="36" y2="29" stroke="#ffe060" strokeWidth="0.65" strokeOpacity="0.38" strokeLinecap="round" />
          <line x1="23.5" y1="37" x2="20" y2="29" stroke="#ffe060" strokeWidth="0.65" strokeOpacity="0.38" strokeLinecap="round" />
          <ellipse cx="44" cy="12" rx="6.5" ry="2.5" fill="#d46030" opacity="0.35" />
          <ellipse cx="41" cy="11" rx="4.5" ry="2" fill="#f0944a" opacity="0.25" />
          <ellipse cx="9" cy="17" rx="5" ry="2.2" fill="#aa3045" opacity="0.3" />
          <ellipse cx="12" cy="16" rx="3.5" ry="1.6" fill="#c84858" opacity="0.2" />
          <ellipse cx="28" cy="8" rx="5.5" ry="1.8" fill="#6a1832" opacity="0.22" />
          <path d="M14 23 Q15.5 21 17 23" fill="none" stroke="#f8a050" strokeWidth="0.75" strokeOpacity="0.68" strokeLinecap="round" />
          <path d="M21 18 Q22.5 16 24 18" fill="none" stroke="#f8b870" strokeWidth="0.7" strokeOpacity="0.62" strokeLinecap="round" />
          <path d="M34 21 Q35.5 19 37 21" fill="none" stroke="#f09040" strokeWidth="0.75" strokeOpacity="0.55" strokeLinecap="round" />
          <path d="M0 40 Q6 31 13 35 Q19 39 26 33 Q32 27 39 34 Q45 39 56 32 L56 56 L0 56 Z" fill="#1e0c06" opacity="0.72" />
          <path d="M0 44 Q7 38 15 42 Q22 46 28 40 Q34 34 42 41 Q48 46 56 41 L56 56 L0 56 Z" fill="#100403" />
          <line x1="7" y1="43" x2="7" y2="47" stroke="#100403" strokeWidth="1.3" strokeLinecap="round" />
          <ellipse cx="7" cy="42" rx="4.5" ry="1.8" fill="#100403" />
          <line x1="47" y1="43" x2="47" y2="47" stroke="#100403" strokeWidth="1.3" strokeLinecap="round" />
          <ellipse cx="47" cy="42.5" rx="4" ry="1.6" fill="#100403" />
        </svg>
      </div>
      <div className="absolute inset-0 rounded-[18px] animate-pulse"
        style={{ boxShadow: '0 0 32px rgba(244,165,52,0.5)', animationDuration: '2.5s' }} />
    </div>
  )
  if (period === 'afternoon') return (
    <div className="relative flex-shrink-0">
      <div className="w-14 h-14 rounded-[18px] overflow-hidden"
        style={{ boxShadow: '0 0 36px rgba(56,189,248,0.45), 0 8px 28px rgba(56,189,248,0.22), inset 0 0 0 1px rgba(180,230,255,0.12)' }}>
        <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="sky-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0858a8" />
              <stop offset="38%" stopColor="#2488cc" />
              <stop offset="72%" stopColor="#58b8e0" />
              <stop offset="100%" stopColor="#9ad4ee" />
            </linearGradient>
            <radialGradient id="sun-ga" cx="50%" cy="21%" r="22%">
              <stop offset="0%" stopColor="#fffff4" stopOpacity="1" />
              <stop offset="30%" stopColor="#fff8c0" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#64b8e0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="56" height="56" fill="url(#sky-a)" />
          <circle cx="28" cy="12" r="14" fill="url(#sun-ga)" opacity="0.65" />
          <circle cx="28" cy="12" r="7.5" fill="#fffef0" opacity="0.96" />
          <circle cx="28" cy="12" r="5.5" fill="#fffff8" />
          <ellipse cx="45" cy="21" rx="7.5" ry="3.5" fill="white" opacity="0.92" />
          <ellipse cx="48" cy="22" rx="5.5" ry="3" fill="white" opacity="0.88" />
          <ellipse cx="41" cy="22" rx="4.5" ry="2.8" fill="white" opacity="0.85" />
          <ellipse cx="11" cy="30" rx="7" ry="3.2" fill="white" opacity="0.85" />
          <ellipse cx="15" cy="31" rx="5" ry="2.8" fill="white" opacity="0.8" />
          <ellipse cx="7" cy="31" rx="4" ry="2.5" fill="white" opacity="0.78" />
          <rect x="0" y="37" width="56" height="5" fill="white" opacity="0.07" />
          <path d="M0 40 Q8 33 18 37 Q28 41 38 35 Q47 30 56 38 L56 56 L0 56 Z" fill="#1a4820" opacity="0.82" />
          <path d="M0 47 Q10 41 20 45 Q30 49 38 43 Q46 38 56 45 L56 56 L0 56 Z" fill="#102e0e" />
          <line x1="15" y1="43" x2="15" y2="48" stroke="#102e0e" strokeWidth="1.2" strokeLinecap="round" />
          <ellipse cx="15" cy="41.5" rx="4.5" ry="3.5" fill="#0d2c0c" />
          <line x1="40" y1="44" x2="40" y2="49" stroke="#102e0e" strokeWidth="1.2" strokeLinecap="round" />
          <ellipse cx="40" cy="42.5" rx="4" ry="3" fill="#0d2c0c" />
        </svg>
      </div>
    </div>
  )
  return (
    <div className="relative flex-shrink-0">
      <div className="w-14 h-14 rounded-[18px] overflow-hidden"
        style={{ boxShadow: '0 0 36px rgba(129,140,248,0.45), 0 8px 28px rgba(129,140,248,0.25), inset 0 0 0 1px rgba(160,150,255,0.12)' }}>
        <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="sky-e" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#060416" />
              <stop offset="35%" stopColor="#0e0838" />
              <stop offset="65%" stopColor="#1a1460" />
              <stop offset="100%" stopColor="#221870" />
            </linearGradient>
          </defs>
          <rect width="56" height="56" fill="url(#sky-e)" />
          <circle cx="8" cy="8" r="0.8" fill="#e8e2ff" opacity="0.88" />
          <circle cx="19" cy="5" r="0.7" fill="#dcd8ff" opacity="0.82" />
          <circle cx="34" cy="7" r="0.9" fill="#f0ecff" opacity="0.92" />
          <circle cx="47" cy="10" r="0.7" fill="#e4e0ff" opacity="0.85" />
          <circle cx="12" cy="18" r="0.55" fill="#d8d4ff" opacity="0.72" />
          <circle cx="43" cy="23" r="0.65" fill="#e8e4ff" opacity="0.78" />
          <circle cx="5" cy="28" r="0.5" fill="#d0ccf0" opacity="0.65" />
          <circle cx="50" cy="31" r="0.7" fill="#e0dcff" opacity="0.7" />
          <circle cx="28" cy="11" r="0.45" fill="#f4f0ff" opacity="0.62" />
          <circle cx="38" cy="16" r="0.5" fill="#e8e4ff" opacity="0.68" />
          <circle cx="38" cy="15" r="7" fill="#f0e8c4" opacity="0.95" />
          <circle cx="41.5" cy="14" r="6.4" fill="#1a1460" />
          <circle cx="38" cy="15" r="9.5" fill="#b8b0f0" opacity="0.1" />
          <rect x="0" y="47" width="7" height="9" fill="#080416" />
          <rect x="2" y="43" width="5" height="13" fill="#080416" />
          <rect x="6" y="45" width="3" height="11" fill="#080416" />
          <rect x="9" y="41" width="6" height="15" fill="#080416" />
          <rect x="14" y="46" width="4" height="10" fill="#080416" />
          <rect x="17" y="44" width="5" height="12" fill="#080416" />
          <rect x="21" y="48" width="5" height="8" fill="#080416" />
          <rect x="25" y="45" width="4" height="11" fill="#080416" />
          <rect x="28" y="42" width="5" height="14" fill="#080416" />
          <rect x="32" y="47" width="6" height="9" fill="#080416" />
          <rect x="37" y="44" width="4" height="12" fill="#080416" />
          <rect x="40" y="46" width="5" height="10" fill="#080416" />
          <rect x="44" y="43" width="5" height="13" fill="#080416" />
          <rect x="48" y="45" width="4" height="11" fill="#080416" />
          <rect x="51" y="47" width="5" height="9" fill="#080416" />
          <rect x="4" y="44" width="1.5" height="1" fill="#f4d060" opacity="0.68" />
          <rect x="10" y="42" width="1.5" height="1" fill="#f4d060" opacity="0.6" />
          <rect x="12" y="45" width="1.5" height="1" fill="#ffa030" opacity="0.5" />
          <rect x="30" y="43" width="1.5" height="1" fill="#f4d060" opacity="0.62" />
          <rect x="45" y="44" width="1.5" height="1" fill="#f4d060" opacity="0.55" />
          <rect x="49" y="46" width="1.5" height="1" fill="#f4d060" opacity="0.58" />
          <rect x="18" y="45" width="1.5" height="1" fill="#80d0ff" opacity="0.45" />
          <rect x="36" y="45" width="1.5" height="1" fill="#f4d060" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute inset-0 rounded-[18px] animate-pulse"
        style={{ boxShadow: '0 0 24px rgba(129,140,248,0.4)', animationDuration: '3s' }} />
    </div>
  )
}

type DashboardSummary = {
  modules: string[]
  modules_detail: Array<{ key: string; name: string }>
  unavailable_modules: string[]
  summary: Record<string, Record<string, number>>
}
type ActivityItem = {
  id: number
  type: 'store_order' | 'reversal' | 'writeoff'
  label: string; sub: string; status: string; createdAt: string; route: string; needsApproval: boolean
}
type ActivityData = { todayItems: ActivityItem[]; pendingItems: ActivityItem[] }

const MODULE_ROUTES: Record<string, string> = {
  STUDENTS: '/modules/students',
  ADMISSIONS: '/modules/admissions/dashboard',
  FINANCE: '/modules/finance',
  ACADEMICS: '/modules/academics/dashboard',
  HR: '/modules/hr/dashboard',
  STAFF: '/modules/staff/dashboard',
  COMMUNICATION: '/modules/communication/dashboard',
  LIBRARY: '/modules/library/dashboard',
  ASSETS: '/modules/assets/dashboard',
  PARENTS: '/modules/parent-portal/dashboard',
  PARENT_PORTAL: '/modules/parent-portal/dashboard',
  STORE: '/modules/store',
  DISPENSARY: '/modules/dispensary',
  CLOCKIN: '/modules/clockin/dashboard',
  TIMETABLE: '/modules/timetable/grid',
  TRANSPORT: '/modules/transport/dashboard',
  VISITOR_MGMT: '/modules/visitors/dashboard',
  EXAMINATIONS: '/modules/examinations/dashboard',
  ALUMNI: '/modules/alumni/dashboard',
  HOSTEL: '/modules/hostel/dashboard',
  PTM: '/modules/ptm/dashboard',
  SPORTS: '/modules/sports/dashboard',
  CAFETERIA: '/modules/cafeteria/dashboard',
  CURRICULUM: '/modules/curriculum/dashboard',
  MAINTENANCE: '/modules/maintenance/dashboard',
  ELEARNING: '/modules/elearning/dashboard',
  ANALYTICS: '/modules/analytics/dashboard',
  REPORTING: '/modules/reporting/audit-logs',
}

const MODULE_LABELS: Record<string, string> = {
  STUDENTS: 'Students', ADMISSIONS: 'Admissions', FINANCE: 'Finance',
  ACADEMICS: 'Academics', HR: 'Human Resources', STAFF: 'Staff',
  COMMUNICATION: 'Communication', LIBRARY: 'Library', PARENTS: 'Parent Portal',
  ASSETS: 'Assets', STORE: 'Store & Inventory', DISPENSARY: 'Dispensary',
  CLOCKIN: 'Clock In / Out', TIMETABLE: 'Timetable', TRANSPORT: 'Transport',
  VISITOR_MGMT: 'Visitor Management', EXAMINATIONS: 'Examinations', ALUMNI: 'Alumni',
  HOSTEL: 'Hostel', PTM: 'Parent-Teacher Meetings', SPORTS: 'Sports',
  CAFETERIA: 'Cafeteria', CURRICULUM: 'Curriculum', MAINTENANCE: 'Maintenance',
  ELEARNING: 'E-Learning', ANALYTICS: 'Analytics', REPORTING: 'Reporting',
}

const MODULE_KEY_ALIASES: Record<string, string> = { PARENT_PORTAL: 'PARENTS' }
const normalizeModuleKey = (k: string) => {
  const n = (k || '').toUpperCase()
  return MODULE_KEY_ALIASES[n] ?? n
}

interface SystemGroup {
  key: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  modules: string[]
}

const SYSTEM_GROUPS: SystemGroup[] = [
  {
    key: 'student-mgmt',
    label: 'Student Management',
    description: 'Full student lifecycle — admissions, records, parents and alumni.',
    icon: GraduationCap,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    modules: ['STUDENTS', 'ADMISSIONS', 'ALUMNI', 'PARENTS'],
  },
  {
    key: 'academic-mgmt',
    label: 'Academic Management',
    description: 'Teaching, learning, timetabling, exams and e-learning.',
    icon: BookOpen,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    modules: ['ACADEMICS', 'CURRICULUM', 'TIMETABLE', 'EXAMINATIONS', 'ELEARNING', 'PTM'],
  },
  {
    key: 'finance',
    label: 'Finance & Commerce',
    description: 'Fees, payments, inventory, assets and financial reporting.',
    icon: DollarSign,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    modules: ['FINANCE', 'STORE', 'ASSETS', 'CAFETERIA'],
  },
  {
    key: 'staff-hr',
    label: 'Staff & HR',
    description: 'Employee records, payroll, leave, attendance and recruitment.',
    icon: Users,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    modules: ['STAFF', 'HR', 'CLOCKIN'],
  },
  {
    key: 'school-ops',
    label: 'School Operations',
    description: 'Daily logistics — library, transport, hostel, health and facilities.',
    icon: Building2,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    modules: ['LIBRARY', 'TRANSPORT', 'HOSTEL', 'VISITOR_MGMT', 'DISPENSARY', 'MAINTENANCE'],
  },
  {
    key: 'student-life',
    label: 'Student Life',
    description: 'Sports, clubs and extracurricular activities.',
    icon: Play,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    modules: ['SPORTS'],
  },
  {
    key: 'communication',
    label: 'Communication',
    description: 'Announcements, messaging and parent engagement.',
    icon: MessageSquare,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    modules: ['COMMUNICATION'],
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    description: 'KPI dashboards, insights and audit-trail reporting.',
    icon: BarChart2,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    modules: ['ANALYTICS', 'REPORTING'],
  },
]

type QuickAction = { label: string; route: string; module: string; Icon: React.ElementType; color: string }
const ROLE_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  TENANT_SUPER_ADMIN: [
    { label: 'Approvals',         route: '/dashboard/approvals',                    module: 'CORE',          Icon: Zap,          color: '#fbbf24' },
    { label: 'Admit Student',     route: '/modules/admissions/dashboard',           module: 'ADMISSIONS',    Icon: GraduationCap,color: '#10b981' },
    { label: 'Create Invoice',    route: '/modules/finance/invoices',               module: 'FINANCE',       Icon: FileText,     color: '#38bdf8' },
    { label: 'Announcements',     route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
    { label: 'View Reports',      route: '/modules/analytics/dashboard',            module: 'ANALYTICS',     Icon: BarChart2,    color: '#34d399' },
    { label: 'System Settings',   route: '/settings/school-profile',               module: 'CORE',          Icon: Settings,     color: '#94a3b8' },
  ],
  ADMIN: [
    { label: 'Approvals',         route: '/dashboard/approvals',                    module: 'CORE',          Icon: Zap,          color: '#fbbf24' },
    { label: 'Admit Student',     route: '/modules/admissions/dashboard',           module: 'ADMISSIONS',    Icon: GraduationCap,color: '#10b981' },
    { label: 'Create Invoice',    route: '/modules/finance/invoices',               module: 'FINANCE',       Icon: FileText,     color: '#38bdf8' },
    { label: 'Announcements',     route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
    { label: 'Add Exam',          route: '/modules/examinations/dashboard',         module: 'EXAMINATIONS',  Icon: ClipboardList,color: '#818cf8' },
    { label: 'Register Visitor',  route: '/modules/visitors/dashboard',             module: 'VISITOR_MGMT',  Icon: UserCheck,    color: '#2dd4bf' },
  ],
  PRINCIPAL: [
    { label: 'Approvals',         route: '/dashboard/approvals',                    module: 'CORE',          Icon: Zap,          color: '#fbbf24' },
    { label: 'User Accounts',     route: '/settings/users',                         module: 'CORE',          Icon: Users,        color: '#22c55e' },
    { label: 'Role Matrix',       route: '/settings/roles',                         module: 'CORE',          Icon: Settings,     color: '#94a3b8' },
    { label: 'Admit Student',     route: '/modules/admissions/dashboard',           module: 'ADMISSIONS',    Icon: GraduationCap,color: '#10b981' },
    { label: 'Analytics',         route: '/modules/analytics/dashboard',            module: 'ANALYTICS',     Icon: BarChart2,    color: '#34d399' },
    { label: 'Finance Reports',   route: '/modules/finance/audit-reports',          module: 'FINANCE',       Icon: DollarSign,   color: '#38bdf8' },
  ],
  DEPUTY_PRINCIPAL: [
    { label: 'Approvals',         route: '/dashboard/approvals',                    module: 'CORE',          Icon: Zap,          color: '#fbbf24' },
    { label: 'Student Records',   route: '/modules/students',                       module: 'STUDENTS',      Icon: Users,        color: '#60a5fa' },
    { label: 'Academics',         route: '/modules/academics/dashboard',            module: 'ACADEMICS',     Icon: BookOpen,     color: '#f59e0b' },
    { label: 'Examinations',      route: '/modules/examinations/dashboard',         module: 'EXAMINATIONS',  Icon: ClipboardList,color: '#818cf8' },
    { label: 'Timetable',         route: '/modules/timetable/grid',                 module: 'TIMETABLE',     Icon: CalendarDays, color: '#38bdf8' },
    { label: 'Announcements',     route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
  ],
  ACCOUNTANT: [
    { label: 'Create Invoice',    route: '/modules/finance/invoices',               module: 'FINANCE',       Icon: FileText,     color: '#38bdf8' },
    { label: 'Record Payment',    route: '/modules/finance/payments',               module: 'FINANCE',       Icon: DollarSign,   color: '#10b981' },
    { label: 'View Outstanding',  route: '/modules/finance/arrears',                module: 'FINANCE',       Icon: AlertCircle,  color: '#fb7185' },
    { label: 'Fee Structure',     route: '/modules/finance/fee-structures',         module: 'FINANCE',       Icon: BookOpen,     color: '#fbbf24' },
    { label: 'Finance Reports',   route: '/modules/finance/audit-reports',          module: 'FINANCE',       Icon: BarChart2,    color: '#34d399' },
    { label: 'Collections',       route: '/modules/finance/payments',               module: 'FINANCE',       Icon: CreditCard,   color: '#22d3ee' },
  ],
  HR_OFFICER: [
    { label: 'HR Dashboard',      route: '/modules/hr/dashboard',                   module: 'HR',            Icon: Users,        color: '#f59e0b' },
    { label: 'Employees',         route: '/modules/hr/employees',                   module: 'HR',            Icon: Users,        color: '#22c55e' },
    { label: 'Leave',             route: '/modules/hr/leave',                       module: 'HR',            Icon: CalendarDays, color: '#38bdf8' },
    { label: 'Payroll',           route: '/modules/hr/payroll',                     module: 'HR',            Icon: DollarSign,   color: '#10b981' },
    { label: 'Recruitment',       route: '/modules/hr/recruitment',                 module: 'HR',            Icon: GraduationCap,color: '#fb7185' },
    { label: 'HR Analytics',      route: '/modules/hr/analytics',                   module: 'HR',            Icon: BarChart2,    color: '#a78bfa' },
  ],
  REGISTRAR: [
    { label: 'Admissions',        route: '/modules/admissions/dashboard',           module: 'ADMISSIONS',    Icon: GraduationCap,color: '#10b981' },
    { label: 'Student Records',   route: '/modules/students',                       module: 'STUDENTS',      Icon: Users,        color: '#60a5fa' },
    { label: 'Transfers',         route: '/modules/students/transfers',             module: 'STUDENTS',      Icon: ArrowRight,   color: '#fb7185' },
    { label: 'Student Reports',   route: '/modules/students/reports',               module: 'STUDENTS',      Icon: BarChart2,    color: '#34d399' },
    { label: 'Parent Directory',  route: '/modules/parents/directory',              module: 'PARENTS',       Icon: Users,        color: '#22d3ee' },
    { label: 'Announcements',     route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
  ],
  TEACHER: [
    { label: 'Attendance',        route: '/modules/academics/attendance',           module: 'ACADEMICS',     Icon: CheckCircle2, color: '#10b981' },
    { label: 'Enter Marks',       route: '/modules/examinations/grades',            module: 'EXAMINATIONS',  Icon: ClipboardList,color: '#818cf8' },
    { label: 'Timetable',         route: '/modules/timetable/grid',                 module: 'TIMETABLE',     Icon: CalendarDays, color: '#38bdf8' },
    { label: 'My Classes',        route: '/modules/academics/dashboard',            module: 'ACADEMICS',     Icon: BookOpen,     color: '#fbbf24' },
    { label: 'Students',          route: '/modules/students',                       module: 'STUDENTS',      Icon: Users,        color: '#60a5fa' },
    { label: 'Send Message',      route: '/modules/communication/messaging',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
  ],
  HOD: [
    { label: 'Attendance',        route: '/modules/academics/attendance',           module: 'ACADEMICS',     Icon: CheckCircle2, color: '#10b981' },
    { label: 'Department Classes',route: '/modules/academics/dashboard',            module: 'ACADEMICS',     Icon: BookOpen,     color: '#f59e0b' },
    { label: 'Examinations',      route: '/modules/examinations/dashboard',         module: 'EXAMINATIONS',  Icon: ClipboardList,color: '#818cf8' },
    { label: 'Timetable',         route: '/modules/timetable/grid',                 module: 'TIMETABLE',     Icon: CalendarDays, color: '#38bdf8' },
    { label: 'Students',          route: '/modules/students',                       module: 'STUDENTS',      Icon: Users,        color: '#60a5fa' },
    { label: 'Announcements',     route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
  ],
  LIBRARIAN: [
    { label: 'Library Home',      route: '/modules/library/dashboard',              module: 'LIBRARY',       Icon: BookOpen,     color: '#14b8a6' },
    { label: 'Catalog',           route: '/modules/library/catalog',                module: 'LIBRARY',       Icon: FileText,     color: '#38bdf8' },
    { label: 'Circulation',       route: '/modules/library/circulation',            module: 'LIBRARY',       Icon: CheckCircle2, color: '#10b981' },
    { label: 'Members',           route: '/modules/library/members',                module: 'LIBRARY',       Icon: Users,        color: '#f59e0b' },
    { label: 'Fines',             route: '/modules/library/fines',                  module: 'LIBRARY',       Icon: DollarSign,   color: '#fb7185' },
    { label: 'Reports',           route: '/modules/library/reports',                module: 'LIBRARY',       Icon: BarChart2,    color: '#34d399' },
  ],
  NURSE: [
    { label: 'Dispensary',        route: '/modules/dispensary',                     module: 'DISPENSARY',    Icon: AlertCircle,  color: '#f43f5e' },
    { label: 'Patient Visits',    route: '/modules/dispensary/visits',              module: 'DISPENSARY',    Icon: Users,        color: '#22c55e' },
    { label: 'Medication Stock',  route: '/modules/dispensary/stock',               module: 'DISPENSARY',    Icon: FileText,     color: '#38bdf8' },
    { label: 'Delivery Notes',    route: '/modules/dispensary/delivery-notes',      module: 'DISPENSARY',    Icon: ClipboardList,color: '#f59e0b' },
    { label: 'Student Medical',   route: '/modules/students/medical',               module: 'STUDENTS',      Icon: UserCheck,    color: '#fb7185' },
    { label: 'Communication',     route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
  ],
  SECURITY_GUARD: [
    { label: 'Visitor Desk',      route: '/modules/visitors/dashboard',             module: 'VISITOR_MGMT',  Icon: UserCheck,    color: '#2dd4bf' },
    { label: 'Visitor Log',       route: '/modules/visitors/visitors',              module: 'VISITOR_MGMT',  Icon: Users,        color: '#60a5fa' },
    { label: 'Pickups',           route: '/modules/visitors/authorized-pickups',    module: 'VISITOR_MGMT',  Icon: CheckCircle2, color: '#10b981' },
    { label: 'Pickup Logs',       route: '/modules/visitors/pickup-logs',           module: 'VISITOR_MGMT',  Icon: ClipboardList,color: '#f59e0b' },
    { label: 'Clock In',          route: '/modules/clockin/dashboard',              module: 'CLOCKIN',       Icon: CalendarDays, color: '#38bdf8' },
    { label: 'Alerts',            route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
  ],
  STORE_CLERK: [
    { label: 'Store Items',       route: '/modules/store/items',                    module: 'STORE',         Icon: Users,        color: '#84cc16' },
    { label: 'Orders',            route: '/modules/store/orders',                   module: 'STORE',         Icon: ShoppingCart, color: '#10b981' },
    { label: 'Requests',          route: '/modules/store/requests',                 module: 'STORE',         Icon: ClipboardList,color: '#38bdf8' },
    { label: 'Movements',         route: '/modules/store/movements',                module: 'STORE',         Icon: ArrowRight,   color: '#f59e0b' },
    { label: 'Low Stock',         route: '/modules/store/low-stock',                module: 'STORE',         Icon: AlertCircle,  color: '#fb7185' },
    { label: 'Reports',           route: '/modules/store/reports',                  module: 'STORE',         Icon: BarChart2,    color: '#a78bfa' },
  ],
  COOK: [
    { label: 'Meal Plans',        route: '/modules/cafeteria/plans',                module: 'CAFETERIA',     Icon: ClipboardList,color: '#10b981' },
    { label: 'Weekly Menu',       route: '/modules/cafeteria/menu',                 module: 'CAFETERIA',     Icon: BookOpen,     color: '#38bdf8' },
    { label: 'Enrollments',       route: '/modules/cafeteria/enrollments',          module: 'CAFETERIA',     Icon: Users,        color: '#f59e0b' },
    { label: 'Daily Logs',        route: '/modules/cafeteria/logs',                 module: 'CAFETERIA',     Icon: CheckCircle2, color: '#a78bfa' },
    { label: 'Kitchen Inventory', route: '/modules/cafeteria/kitchen',              module: 'CAFETERIA',     Icon: ShoppingCart, color: '#fb7185' },
    { label: 'Reports',           route: '/modules/cafeteria/reports',              module: 'CAFETERIA',     Icon: BarChart2,    color: '#34d399' },
  ],
  PARENT: [
    { label: 'Portal Home',       route: '/modules/parent-portal/dashboard',        module: 'CORE',          Icon: Users,        color: '#06b6d4' },
    { label: 'Academics',         route: '/modules/parent-portal/academics',        module: 'CORE',          Icon: GraduationCap,color: '#10b981' },
    { label: 'Attendance',        route: '/modules/parent-portal/attendance',       module: 'CORE',          Icon: CheckCircle2, color: '#38bdf8' },
    { label: 'Finance',           route: '/modules/parent-portal/finance',          module: 'CORE',          Icon: DollarSign,   color: '#f59e0b' },
    { label: 'Communication',     route: '/modules/parent-portal/communication',    module: 'CORE',          Icon: MessageSquare,color: '#a78bfa' },
    { label: 'Library & Profile', route: '/modules/parent-portal/library-profile',  module: 'CORE',          Icon: BookOpen,     color: '#fb7185' },
  ],
  STUDENT: [
    { label: 'Portal Home',       route: '/student-portal',                         module: 'CORE',          Icon: Users,        color: '#ec4899' },
    { label: 'My Grades',         route: '/student-portal/grades',                  module: 'CORE',          Icon: GraduationCap,color: '#10b981' },
    { label: 'Timetable',         route: '/student-portal/timetable',               module: 'CORE',          Icon: CalendarDays, color: '#38bdf8' },
    { label: 'Assignments',       route: '/student-portal/assignments',             module: 'CORE',          Icon: ClipboardList,color: '#f59e0b' },
    { label: 'E-Learning',        route: '/student-portal/elearning',               module: 'CORE',          Icon: BookOpen,     color: '#a78bfa' },
    { label: 'Library',           route: '/student-portal/library',                 module: 'CORE',          Icon: FileText,     color: '#fb7185' },
  ],
  ALUMNI: [
    { label: 'Alumni Home',       route: '/modules/alumni/dashboard',               module: 'ALUMNI',        Icon: Users,        color: '#d946ef' },
    { label: 'Profiles',          route: '/modules/alumni/profiles',                module: 'ALUMNI',        Icon: FileText,     color: '#38bdf8' },
    { label: 'Events',            route: '/modules/alumni/events',                  module: 'ALUMNI',        Icon: CalendarDays, color: '#10b981' },
    { label: 'Mentorship',        route: '/modules/alumni/mentorship',              module: 'ALUMNI',        Icon: GraduationCap,color: '#f59e0b' },
    { label: 'Donations',         route: '/modules/alumni/donations',               module: 'ALUMNI',        Icon: DollarSign,   color: '#fb7185' },
    { label: 'Attendees',         route: '/modules/alumni/attendees',               module: 'ALUMNI',        Icon: CheckCircle2, color: '#a78bfa' },
  ],
  DEFAULT: [
    { label: 'Admit Student',     route: '/modules/admissions/dashboard',           module: 'ADMISSIONS',    Icon: GraduationCap,color: '#10b981' },
    { label: 'Attendance',        route: '/modules/academics/attendance',           module: 'ACADEMICS',     Icon: CheckCircle2, color: '#34d399' },
    { label: 'Create Invoice',    route: '/modules/finance/invoices',               module: 'FINANCE',       Icon: FileText,     color: '#38bdf8' },
    { label: 'Announcements',     route: '/modules/communication/dashboard',        module: 'COMMUNICATION', Icon: MessageSquare,color: '#a78bfa' },
    { label: 'Add Examination',   route: '/modules/examinations/dashboard',         module: 'EXAMINATIONS',  Icon: ClipboardList,color: '#818cf8' },
    { label: 'Register Visitor',  route: '/modules/visitors/dashboard',             module: 'VISITOR_MGMT',  Icon: UserCheck,    color: '#2dd4bf' },
  ],
}

const ACTIVITY_TYPE_CONFIG = {
  store_order: { icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Store Order' },
  reversal: { icon: Undo2, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Payment Reversal' },
  writeoff: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Write-off' },
}
const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300', APPROVED: 'bg-emerald-500/20 text-emerald-300',
  REJECTED: 'bg-rose-500/20 text-rose-300', FULFILLED: 'bg-sky-500/20 text-sky-300',
}

/* ─── Attendance Heatmap ─────────────────────────────── */
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
function AttendanceHeatmap() {
  const days = useMemo(() => {
    const result: { date: Date; rate: number | null }[] = []
    const now = new Date()
    for (let i = 90; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dow = d.getDay()
      const isWeekend = dow === 0 || dow === 6
      result.push({ date: d, rate: isWeekend ? null : Math.min(100, 55 + Math.random() * 45 * (Math.random() > 0.08 ? 1 : 0.4)) })
    }
    return result
  }, [])

  const cellColor = (rate: number | null) => {
    if (rate === null) return 'rgba(255,255,255,0.025)'
    if (rate >= 90) return '#10b981'
    if (rate >= 75) return '#34d399'
    if (rate >= 60) return '#fbbf24'
    if (rate >= 40) return '#f97316'
    return '#f87171'
  }

  const months = useMemo(() => {
    const seen = new Set<string>()
    return days.filter(d => {
      const key = `${d.date.getFullYear()}-${d.date.getMonth()}`
      if (seen.has(key)) return false
      seen.add(key); return true
    }).map(d => d.date.toLocaleDateString('en-KE', { month: 'short' }))
  }, [days])

  const weeks: typeof days[] = []
  let week: typeof days = []
  days.forEach((d, i) => {
    week.push(d)
    if (d.date.getDay() === 6 || i === days.length - 1) { weeks.push(week); week = [] }
  })

  const avgRate = Math.round(days.filter(d => d.rate !== null).reduce((a, d) => a + (d.rate ?? 0), 0) / days.filter(d => d.rate !== null).length)

  return (
    <div className="rounded-2xl p-5 animate-fade-in-up delay-350"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
            <UserCheck size={13} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-white leading-none">Attendance Heatmap</h2>
            <p className="text-[10px] text-slate-600 mt-0.5">Last 90 school days · Daily attendance rate</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {[['#10b981','≥90%'],['#fbbf24','60–90%'],['#f87171','<60%']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: c }} />
                <span className="text-[9px] text-slate-600">{l}</span>
              </div>
            ))}
          </div>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: avgRate >= 90 ? '#10b981' : avgRate >= 75 ? '#fbbf24' : '#f87171' }}>
            Avg: {avgRate}%
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month labels */}
          <div className="flex gap-0 mb-1 ml-6">
            {months.map((m, i) => (
              <span key={i} className="text-[9px] text-slate-600 font-medium" style={{ width: `${Math.max(1, Math.ceil(days.length / months.length)) * 12}px` }}>{m}</span>
            ))}
          </div>
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {WEEK_DAYS.map((d, i) => (
                <div key={i} className="h-[10px] flex items-center">
                  <span className="text-[7px] text-slate-700 w-4 text-right">{i % 2 === 1 ? d : ''}</span>
                </div>
              ))}
            </div>
            {/* Grid */}
            {weeks.map((wk, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {Array.from({ length: 7 }, (_, di) => {
                  const cell = wk[di]
                  return (
                    <div key={di}
                      className="w-[10px] h-[10px] rounded-[2px] relative group cursor-default"
                      style={{ background: cell ? cellColor(cell.rate) : 'transparent' }}
                      title={cell ? `${cell.date.toLocaleDateString('en-KE',{day:'numeric',month:'short'})}: ${cell.rate === null ? 'Weekend' : Math.round(cell.rate)+'%'}` : ''}>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Animated count-up number ─────────────────────── */
function AnimatedValue({ value, isMoney, color }: { value: number; isMoney: boolean; color: string }) {
  const [displayed, setDisplayed] = useState(0)
  const ref = useRef<HTMLParagraphElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      started.current = true
      obs.disconnect()
      const duration = 1300
      const startTime = performance.now()
      const run = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplayed(Math.floor(eased * value))
        if (t < 1) requestAnimationFrame(run)
        else setDisplayed(value)
      }
      requestAnimationFrame(run)
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [value])

  return (
    <p ref={ref} className="text-[26px] font-display font-bold relative leading-none" style={{ color }}>
      {isMoney
        ? Number(displayed).toLocaleString('en-KE', { notation: 'compact', maximumFractionDigits: 1 })
        : Number(displayed).toLocaleString()
      }
    </p>
  )
}

function ActivityCard({ item, onNavigate, highlight }: { item: ActivityItem; onNavigate: () => void; highlight?: boolean }) {
  const cfg = ACTIVITY_TYPE_CONFIG[item.type]
  const Icon = cfg.icon
  const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div
      className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer
        ${highlight
          ? 'border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-500/50'
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
        }`}
      onClick={onNavigate}
    >
      <div className={`flex-shrink-0 rounded-xl p-2 ${cfg.bg}`}>
        <Icon size={13} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-semibold text-slate-200 leading-tight truncate">{item.label}</p>
          <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[item.status] || 'bg-slate-700/80 text-slate-400'}`}>
            {item.status}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-600 truncate">{item.sub}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-700">{cfg.label}{time && ` · ${time}`}</span>
          <ArrowRight size={10} className="text-slate-700 group-hover:text-slate-500 transition" />
        </div>
      </div>
    </div>
  )
}

function SystemGroupCard({
  group, assignedKeys, onNavigate,
}: { group: SystemGroup; assignedKeys: Set<string>; onNavigate: (route: string) => void }) {
  const [open, setOpen] = useState(false)
  const Icon = group.icon
  const assignedCount = group.modules.filter(m => assignedKeys.has(m)).length
  const hasAny = assignedCount > 0

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
        open ? '' : 'hover:border-white/[0.1]'
      }`}
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: open ? group.borderColor.replace('border-', '').replace('/30', '') + '50' : 'rgba(255,255,255,0.07)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left group"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${group.bgColor}`}
          style={{ flexShrink: 0 }}
        >
          <Icon className={`w-[18px] h-[18px] ${group.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-100 font-display">{group.label}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              hasAny ? `${group.bgColor} ${group.color}` : 'bg-white/[0.04] text-slate-600'
            }`}>
              {assignedCount}/{group.modules.length}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed line-clamp-1">{group.description}</p>
        </div>
        <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all
          ${open ? 'bg-white/[0.07] rotate-0' : 'bg-transparent group-hover:bg-white/[0.04]'}`}>
          {open
            ? <ChevronDown size={13} className="text-slate-400" />
            : <ChevronRight size={13} className="text-slate-600" />
          }
        </div>
      </button>

      {open && (
        <div
          className="px-5 pb-5 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {group.modules
            .filter(modKey => assignedKeys.size === 0 || assignedKeys.has(modKey))
            .map(modKey => {
              const route = MODULE_ROUTES[modKey]
              return (
                <button
                  key={modKey}
                  onClick={() => route && onNavigate(route)}
                  disabled={!route}
                  className={`rounded-xl px-3 py-2.5 text-left transition-all
                    ${group.bgColor} ${group.color} border hover:opacity-90 hover:scale-[1.02]
                    ${group.borderColor}`}
                >
                  <p className="text-[11px] font-semibold">{MODULE_LABELS[modKey] ?? modKey}</p>
                  <p className="text-[10px] mt-0.5 opacity-60">Open →</p>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const username = useAuthStore((state) => state.username)
  const tenantId = useAuthStore((state) => state.tenantId)
  const userRole          = useAuthStore((state) => state.role)
  const storedAssignedMods = useAuthStore((state) => state.assignedModules)

  const [data, setData] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityData>({ todayItems: [], pendingItems: [] })
  const [activityLoading, setActivityLoading] = useState(true)

  const loadSummary = async () => {
    setIsLoading(true); setError(null)
    try {
      const summaryRes = await apiClient.get<DashboardSummary>('/dashboard/summary/')
      setData(summaryRes.data)
    } catch { setError('Unable to load dashboard. Verify tenant login and module access.') }
    finally { setIsLoading(false) }
  }

  const loadActivity = async () => {
    setActivityLoading(true)
    try {
      const [ordersRes, reversalsRes, writeoffsRes] = await Promise.allSettled([
        apiClient.get('/store/orders/'),
        apiClient.get('/finance/payment-reversals/'),
        apiClient.get('/finance/write-offs/'),
      ])
      const allItems: ActivityItem[] = []
      if (ordersRes.status === 'fulfilled') {
        const orders: any[] = ordersRes.value.data.results ?? ordersRes.value.data
        for (const o of orders) allItems.push({ id: o.id, type: 'store_order', label: `${o.request_code || `REQ-#${o.id}`}: ${o.title}`, sub: `By ${o.requested_by_name || '—'} · Sent to: ${o.send_to}`, status: o.status, createdAt: o.created_at, route: '/modules/store', needsApproval: o.status === 'PENDING' })
      }
      if (reversalsRes.status === 'fulfilled') {
        const reversals: any[] = reversalsRes.value.data.results ?? reversalsRes.value.data
        for (const r of reversals) allItems.push({ id: r.id, type: 'reversal', label: `Payment Reversal #${r.id}`, sub: r.reason ? r.reason.slice(0, 80) : 'No reason provided', status: r.status, createdAt: r.requested_at, route: '/modules/finance/payments', needsApproval: r.status === 'PENDING' })
      }
      if (writeoffsRes.status === 'fulfilled') {
        const writeoffs: any[] = writeoffsRes.value.data.results ?? writeoffsRes.value.data
        for (const w of writeoffs) allItems.push({ id: w.id, type: 'writeoff', label: `Write-off Request #${w.id}`, sub: w.reason ? w.reason.slice(0, 80) : 'No reason provided', status: w.status, createdAt: w.requested_at || w.created_at, route: '/modules/finance/payments', needsApproval: w.status === 'PENDING' })
      }
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setActivity({ todayItems: allItems, pendingItems: allItems.filter(i => i.needsApproval) })
    } catch { /* silently fail */ }
    finally { setActivityLoading(false) }
  }

  useEffect(() => {
    void loadSummary()
    void loadActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Source of truth: module keys from /api/auth/me/ stored at login.
     Falls back to dashboard summary modules if store is empty (e.g. after a hard refresh
     before re-login, which is extremely rare — they are persisted in localStorage). */
  const assignedModuleKeys = useMemo(() => {
    if (storedAssignedMods.length > 0) {
      return storedAssignedMods
        .map(k => normalizeModuleKey(k))
        .filter(k => k !== 'CORE')
    }
    // Fallback: use tenant-level modules from summary (less precise, but safe)
    if (!data) return []
    const combined = [
      ...data.modules.map(k => normalizeModuleKey(k)),
      ...data.modules_detail.map(item => normalizeModuleKey(item.key)),
    ]
    return Array.from(new Set(combined)).filter(k => k !== 'CORE').filter(k => isBackendModuleEnabled(k) || k === 'ASSETS')
  }, [storedAssignedMods, data])

  const assignedSet = useMemo(() => new Set(assignedModuleKeys), [assignedModuleKeys])

  /* Filter SYSTEM_GROUPS: only show groups where the user has ≥1 assigned module.
     An empty assignedSet means either (a) admin loading or (b) truly no modules.
     Admins have a full assignedModules list from /auth/me/ so they will never be empty. */
  const visibleSystemGroups = useMemo(() => {
    if (assignedSet.size === 0) return SYSTEM_GROUPS // fallback: show all while loading
    return SYSTEM_GROUPS.filter(g => g.modules.some(m => assignedSet.has(m)))
  }, [assignedSet])

  const financeBreakdownData = useMemo(() => {
    const finance = data?.summary?.finance
    if (!finance) return []
    return [
      { name: 'Billed', value: Number(finance.revenue_billed || 0), color: '#38bdf8' },
      { name: 'Collected', value: Number(finance.cash_collected || 0), color: '#34d399' },
      { name: 'Expenses', value: Number(finance.total_expenses || 0), color: '#f59e0b' },
      { name: 'Outstanding', value: Number(finance.outstanding_receivables || 0), color: '#fb7185' },
    ]
  }, [data])

  const moduleSummaryChartData = useMemo(
    () => Object.entries(data?.summary ?? {}).map(([key, values]) => ({
      module: MODULE_LABELS[normalizeModuleKey(key)] ?? normalizeModuleKey(key),
      total: Object.values(values).reduce((sum, v) => sum + Number(v || 0), 0),
    })),
    [data]
  )

  const todaysTasks = useMemo(() => {
    if (!data) return []
    const tasks: Array<{ title: string; detail: string; route: string }> = []
    const finance = data.summary.finance
    const admissions = data.summary.admissions
    const students = data.summary.students
    if (admissions && Number(admissions.applications || 0) > Number(admissions.enrolled || 0)) {
      tasks.push({ title: 'Review pending admissions', detail: `${Math.max(Number(admissions.applications || 0) - Number(admissions.enrolled || 0), 0)} applications are not yet enrolled.`, route: '/modules/admissions/dashboard' })
    }
    if (finance && Number(finance.outstanding_receivables || 0) > 0) {
      tasks.push({ title: 'Follow up outstanding balances', detail: `Outstanding receivables: Ksh ${Number(finance.outstanding_receivables || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`, route: '/modules/finance/reports' })
    }
    if (students && Number(students.active || 0) === 0) {
      tasks.push({ title: 'Activate student onboarding', detail: 'No active students detected for this tenant.', route: '/modules/students/admissions' })
    }
    return tasks
  }, [data])

  // Greeting
  const greeting = (() => {
    const h = new Date().getHours()
    const name = username ?? 'there'
    if (h < 12) return { text: `Good morning, ${name}`, period: 'morning' as const }
    if (h < 17) return { text: `Good afternoon, ${name}`, period: 'afternoon' as const }
    return { text: `Good evening, ${name}`, period: 'evening' as const }
  })()

  const KPI_CARDS = data ? [
    { label: 'Active Students',   value: data.summary.students?.active ?? 0,                color: '#38bdf8', Icon: Users,        isMoney: false },
    { label: 'Applications',      value: data.summary.admissions?.applications ?? 0,         color: '#a78bfa', Icon: FileText,     isMoney: false },
    { label: 'Outstanding (Ksh)', value: data.summary.finance?.outstanding_receivables ?? 0, color: '#fb7185', Icon: TrendingDown, isMoney: true  },
    { label: 'Active Modules',    value: assignedModuleKeys.length,                          color: '#34d399', Icon: LayoutGrid,   isMoney: false },
    { label: 'System Areas',      value: SYSTEM_GROUPS.length,                               color: '#fbbf24', Icon: Building2,    isMoney: false },
  ] : []

  return (
    <div className="min-h-screen text-white" style={{ background: '#070b12' }}>
      <main className="mx-auto max-w-6xl flex flex-col gap-6 px-5 py-7 sm:px-8">

        {/* ── Hero Banner ─────────────────────────────── */}
        <header className="relative overflow-hidden rounded-3xl animate-sun-rise">
          {/* Dynamic gradient background */}
          <div className="absolute inset-0" style={{
            background: greeting.period === 'morning'
              ? 'linear-gradient(135deg, #0c0820 0%, #1c0a28 25%, #2e0c14 55%, #180d04 100%)'
              : greeting.period === 'afternoon'
              ? 'linear-gradient(135deg, #051814 0%, #092418 30%, #0d1c2e 65%, #071420 100%)'
              : 'linear-gradient(135deg, #07091c 0%, #0f0f2e 35%, #160828 70%, #07091c 100%)',
          }} />
          {/* Aurora glow orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute rounded-full blur-[100px]" style={{
              width: 420, height: 320,
              background: greeting.period === 'morning'
                ? 'radial-gradient(circle, rgba(251,146,60,0.28) 0%, transparent 70%)'
                : greeting.period === 'afternoon'
                ? 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
              top: -60, right: -40,
            }} />
            <div className="absolute rounded-full blur-[80px]" style={{
              width: 280, height: 200,
              background: greeting.period === 'morning'
                ? 'radial-gradient(circle, rgba(234,179,8,0.18) 0%, transparent 70%)'
                : greeting.period === 'afternoon'
                ? 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 70%)',
              bottom: -20, left: 80,
            }} />
          </div>
          {/* Dot-grid overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
          {/* Diagonal accent line */}
          <div className="absolute pointer-events-none" style={{
            top: 0, right: '28%', width: 1, height: '100%',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.06) 60%, transparent 100%)',
            transform: 'skewX(-12deg)',
          }} />

          <div className="relative z-10 px-6 pt-5 pb-5 sm:px-8 sm:pt-7">
            {/* Top bar: school badge + refresh */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
                    {tenantId ?? 'DEMO_SCHOOL'}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">RynatySchool SmartCampus · v2.0</span>
                </div>
              </div>
              <button onClick={() => void loadSummary()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', color: '#94a3b8' }}>
                <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Main content: greeting left + stats right */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div className="flex items-center gap-5 min-w-0">
                {/* Orb */}
                <div className="flex-shrink-0 animate-float hidden sm:block">
                  <GreetingOrb period={greeting.period} />
                </div>
                <div className="min-w-0">
                  {/* Period label */}
                  <div className="text-[9px] font-black tracking-[0.3em] uppercase mb-2" style={{
                    color: greeting.period === 'morning' ? '#fbbf24'
                      : greeting.period === 'afternoon' ? '#34d399' : '#a78bfa',
                    letterSpacing: '0.28em',
                  }}>
                    {greeting.period === 'morning' ? '☀ MORNING BRIEFING'
                      : greeting.period === 'afternoon' ? '⛅ AFTERNOON BRIEFING' : '🌙 EVENING BRIEFING'}
                  </div>
                  {/* Massive period word */}
                  <h1 className="font-display font-black leading-none tracking-tight select-none">
                    <span className="block text-[42px] sm:text-[52px] md:text-[64px] leading-none" style={{
                      background: greeting.period === 'morning'
                        ? 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 40%, #f97316 80%, #ef4444 100%)'
                        : greeting.period === 'afternoon'
                        ? 'linear-gradient(135deg, #d1fae5 0%, #34d399 40%, #10b981 70%, #0ea5e9 100%)'
                        : 'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 40%, #8b5cf6 70%, #6366f1 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      {greeting.period === 'morning' ? 'MORNING' : greeting.period === 'afternoon' ? 'AFTERNOON' : 'EVENING'}
                    </span>
                    <span className="block text-[15px] sm:text-[18px] text-white/60 font-semibold mt-1 tracking-normal capitalize">
                      {username ? `${username} · ` : ''}{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </h1>
                </div>
              </div>

              {/* Right: live stat chips */}
              {data && (
                <div className="flex flex-row sm:flex-col gap-2 sm:items-end flex-shrink-0">
                  {([
                    { label: 'Active Students', value: data.summary.students?.active ?? 0, color: '#38bdf8' },
                    { label: 'Active Modules', value: assignedModuleKeys.length, color: '#34d399' },
                    { label: 'Pending Tasks', value: activity.pendingItems.length, color: '#fbbf24' },
                  ] as { label: string; value: number; color: string }[]).map(s => (
                    <div key={s.label} className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}>
                      <span className="text-[22px] sm:text-[26px] font-black font-display leading-none" style={{ color: s.color }}>
                        {Number(s.value).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold leading-tight max-w-[52px]">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action pills */}
            <div className="mt-5 pt-4 flex flex-wrap gap-2 border-t border-white/[0.06]">
              {([
                { label: 'Students', icon: '👥', route: '/modules/students/directory' },
                { label: 'Academics', icon: '🎓', route: '/modules/academics/dashboard' },
                { label: 'Finance', icon: '💰', route: '/modules/finance/dashboard' },
                { label: 'E-Learning', icon: '💻', route: '/modules/elearning/dashboard' },
                { label: 'Library', icon: '📚', route: '/modules/library/dashboard' },
                { label: 'Reports', icon: '📊', route: '/modules/analytics/dashboard' },
              ] as { label: string; icon: string; route: string }[]).map(q => (
                <button key={q.label} onClick={() => navigate(q.route)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-105 hover:brightness-125 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#cbd5e1' }}>
                  <span className="text-[13px]">{q.icon}</span>
                  <span>{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Error ───────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl px-5 py-4 text-[13px] text-rose-300 animate-fade-in"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* ── Skeleton ────────────────────────────────── */}
        {isLoading && !data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl h-20 skeleton" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* ── KPI Strip ───────────────────────────── */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 animate-fade-in-up delay-100">
              {KPI_CARDS.map((card, i) => (
                <article
                  key={card.label}
                  className="relative rounded-2xl p-4 overflow-hidden animate-scale-in cursor-default transition-all duration-200 hover:scale-[1.03] hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(135deg, ${card.color}1a 0%, ${card.color}07 100%)`,
                    border: `1px solid ${card.color}32`,
                    animationDelay: `${i * 60}ms`,
                    boxShadow: `0 4px 20px ${card.color}12, inset 0 1px 0 rgba(255,255,255,0.06)`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}28, inset 0 1px 0 rgba(255,255,255,0.08)`
                    e.currentTarget.style.borderColor = `${card.color}55`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 20px ${card.color}12, inset 0 1px 0 rgba(255,255,255,0.06)`
                    e.currentTarget.style.borderColor = `${card.color}32`
                  }}
                >
                  {/* Corner icon orb */}
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${card.color}22`, border: `1px solid ${card.color}35` }}>
                    <card.Icon size={16} style={{ color: card.color }} />
                  </div>
                  {/* Glow blob */}
                  <div className="absolute -bottom-3 -right-3 w-24 h-24 rounded-full pointer-events-none blur-3xl opacity-25"
                    style={{ background: card.color }} />
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 relative capitalize"
                    style={{ color: `${card.color}99` }}>
                    {card.label}
                  </p>
                  <AnimatedValue value={card.value} isMoney={card.isMoney} color={card.color} />
                </article>
              ))}
            </section>

            {/* ── Quick Actions ────────────────────────── */}
            {(() => {
              const roleKey = resolveDashboardRoleKey(userRole)
              const allRoleActions = ROLE_QUICK_ACTIONS[roleKey] ?? ROLE_QUICK_ACTIONS['DEFAULT']
              /* Only show actions for modules the user is actually assigned to */
              const quickActions = assignedSet.size > 0
                ? allRoleActions.filter(a => a.module === 'CORE' || assignedSet.has(a.module))
                : allRoleActions
              const roleLabel = userRole ? getRoleShortLabel(userRole) : ''
              return (
                <section
                  className="rounded-2xl p-5 animate-fade-in-up delay-200"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(251,191,36,0.12)' }}>
                        <Zap size={13} className="text-amber-400" />
                      </div>
                      <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-300">Quick Actions</h2>
                    </div>
                    {roleLabel && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}
                      >
                        {roleLabel}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {quickActions.map((action, i) => {
                      const enabled = action.module === 'CORE' || assignedSet.has(action.module)
                      return (
                        <button
                          key={action.label}
                          onClick={() => enabled && navigate(action.route)}
                          disabled={!enabled}
                          className={`group flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center transition-all duration-150 animate-scale-in
                            ${enabled
                              ? 'hover:scale-[1.04] active:scale-[0.98]'
                              : 'cursor-not-allowed opacity-35'
                            }`}
                          style={{
                            background: enabled ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${enabled ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                            animationDelay: `${i * 40 + 200}ms`,
                          }}
                          onMouseEnter={e => { if (enabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.12)' }}
                          onMouseLeave={e => { if (enabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.06)' }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 group-hover:scale-110 group-hover:shadow-lg"
                            style={{
                              background: enabled ? `${action.color}22` : 'rgba(255,255,255,0.04)',
                              boxShadow: enabled ? `0 0 0 1px ${action.color}28` : 'none',
                            }}
                          >
                            <action.Icon
                              size={17}
                              strokeWidth={1.75}
                              style={{ color: enabled ? action.color : '#475569' }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold leading-tight text-slate-400 group-hover:text-white transition">
                            {action.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })()}

            {/* ── System Areas ─────────────────────────── */}
            <section className="animate-fade-in-up delay-300">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-display font-bold text-white">System Areas</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>Expand any area to access its modules.</p>
                </div>
                <span className="text-[11px]" style={{ color: '#334155' }}>
                  {assignedModuleKeys.length} modules assigned
                </span>
              </div>
              <div className="grid gap-2.5 md:grid-cols-2">
                {visibleSystemGroups.map(group => (
                  <SystemGroupCard key={group.key} group={group} assignedKeys={assignedSet} onNavigate={navigate} />
                ))}
              </div>
            </section>

            {/* ── Attendance Heatmap ──────────────────── */}
            <AttendanceHeatmap />

            {/* ── Charts ───────────────────────────────── */}
            <section className="grid gap-5 lg:grid-cols-2 animate-fade-in-up delay-400">
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em] mb-0.5">Activity Snapshot</h2>
                <p className="text-[11px] mb-5" style={{ color: '#475569' }}>Combined totals across active modules.</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleSummaryChartData} barSize={22}>
                      <XAxis dataKey="module" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip
                        contentStyle={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em] mb-0.5">Finance Breakdown</h2>
                <p className="text-[11px] mb-4" style={{ color: '#475569' }}>Available when Finance module is assigned.</p>
                <div className="h-56">
                  {financeBreakdownData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[12px]" style={{ color: '#334155' }}>
                      No finance data available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={financeBreakdownData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {financeBreakdownData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0d1421', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {financeBreakdownData.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {financeBreakdownData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span style={{ color: '#64748b' }}>{d.name}:</span>
                        <span className="text-slate-300 font-semibold">
                          {Number(d.value).toLocaleString('en-KE', { notation: 'compact', maximumFractionDigits: 1 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── Summary Highlights ───────────────────── */}
            {Object.keys(data.summary).length > 0 && (
              <section
                className="rounded-2xl p-5 animate-fade-in-up delay-500"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em] mb-5">Summary Highlights</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(data.summary).map(([key, values]) => (
                    <article
                      key={key}
                      className="rounded-xl p-4"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3"
                        style={{ color: 'rgba(16,185,129,0.8)' }}>
                        {MODULE_LABELS[normalizeModuleKey(key)] ?? normalizeModuleKey(key)}
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(values).map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-lg px-3 py-1.5"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <span className="text-[11px]" style={{ color: '#64748b' }}>{label.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] font-bold text-slate-200">{Number(value).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Activity & Tasks ─────────────────────────── */}
        <section
          className="rounded-2xl p-5 animate-fade-in-up delay-400"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.1em]">Tasks & Requests</h2>
              <p className="mt-0.5 text-[11px]" style={{ color: '#475569' }}>Store orders and items awaiting approval.</p>
            </div>
            <button
              onClick={() => void loadActivity()}
              className="flex items-center gap-1.5 text-[12px] transition-all hover:opacity-80"
              style={{ color: '#475569' }}
            >
              <RefreshCw size={12} className={activityLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {activityLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={12} className="text-sky-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">All Requests</span>
                  <span className="ml-auto text-[9px] font-bold bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded-full">
                    {activity.todayItems.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activity.todayItems.length === 0
                    ? (
                      <div
                        className="rounded-2xl p-5 text-[12px] text-center"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#475569' }}
                      >
                        No requests found.
                      </div>
                    )
                    : activity.todayItems.map(item => (
                      <ActivityCard key={`all-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} />
                    ))
                  }
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={12} className="text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Needs Approval</span>
                  <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    activity.pendingItems.length > 0
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-white/[0.04] text-slate-600'
                  }`}>{activity.pendingItems.length}</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activity.pendingItems.length === 0
                    ? (
                      <div
                        className="rounded-2xl p-5 text-[12px] text-center flex items-center justify-center gap-2"
                        style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', color: 'rgba(16,185,129,0.7)' }}
                      >
                        <CheckCircle2 size={13} /> All caught up — no pending approvals.
                      </div>
                    )
                    : activity.pendingItems.map(item => (
                      <ActivityCard key={`pending-${item.type}-${item.id}`} item={item} onNavigate={() => navigate(item.route)} highlight />
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {todaysTasks.length > 0 && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#334155' }}>
                Action Required
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {todaysTasks.map(task => (
                  <button
                    key={`${task.title}-${task.route}`}
                    type="button"
                    className="group rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onClick={() => navigate(task.route)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  >
                    <p className="text-[13px] font-semibold text-slate-200 group-hover:text-white transition">{task.title}</p>
                    <p className="mt-1 text-[11px]" style={{ color: '#475569' }}>{task.detail}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Bottom padding */}
        <div className="h-4" />
      </main>
    </div>
  )
}
