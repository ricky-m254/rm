export type RoleMeta = {
  label: string
  shortLabel: string
  description: string
  badgeClass: string
  outlineBadgeClass: string
  accentColor: string
  sortOrder: number
}

export const ROLE_CATALOG: Record<string, RoleMeta> = {
  TENANT_SUPER_ADMIN: {
    label: 'Tenant Super Admin',
    shortLabel: 'Super Admin',
    description: 'Full tenant-level control across modules, roles, settings, and operational oversight.',
    badgeClass: 'bg-purple-500/20 text-purple-300',
    outlineBadgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentColor: '#8b5cf6',
    sortOrder: 10,
  },
  ADMIN: {
    label: 'School Administrator',
    shortLabel: 'Administrator',
    description: 'Legacy school-wide admin role retained during transition with full operational visibility.',
    badgeClass: 'bg-blue-500/20 text-blue-300',
    outlineBadgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentColor: '#0ea5e9',
    sortOrder: 20,
  },
  PRINCIPAL: {
    label: 'School Principal',
    shortLabel: 'Principal',
    description: 'School-wide leadership access across approvals, users, analytics, and operational settings.',
    badgeClass: 'bg-indigo-500/20 text-indigo-300',
    outlineBadgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    accentColor: '#818cf8',
    sortOrder: 30,
  },
  DEPUTY_PRINCIPAL: {
    label: 'Deputy Principal',
    shortLabel: 'Deputy Principal',
    description: 'Academic and student-operations leadership with broad school oversight and settings visibility.',
    badgeClass: 'bg-cyan-500/20 text-cyan-300',
    outlineBadgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentColor: '#22d3ee',
    sortOrder: 40,
  },
  ACCOUNTANT: {
    label: 'Finance Manager',
    shortLabel: 'Finance Manager',
    description: 'Legacy finance role retained during transition for fee workflows, cashbook, reports, and billing.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
    outlineBadgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
    sortOrder: 50,
  },
  BURSAR: {
    label: 'School Bursar',
    shortLabel: 'Bursar',
    description: 'Finance-family role for collections, invoicing, reconciliations, and fee reporting.',
    badgeClass: 'bg-green-500/20 text-green-300',
    outlineBadgeClass: 'bg-green-500/20 text-green-300 border-green-500/30',
    accentColor: '#22c55e',
    sortOrder: 60,
  },
  HR_OFFICER: {
    label: 'HR Officer',
    shortLabel: 'HR Officer',
    description: 'HR and payroll operations role for employee records, recruitment, leave, and staff workflows.',
    badgeClass: 'bg-amber-500/20 text-amber-300',
    outlineBadgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentColor: '#f59e0b',
    sortOrder: 70,
  },
  REGISTRAR: {
    label: 'Registrar',
    shortLabel: 'Registrar',
    description: 'Admissions and student-record operations role for enrollment, transfers, and documentation.',
    badgeClass: 'bg-yellow-500/20 text-yellow-300',
    outlineBadgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accentColor: '#eab308',
    sortOrder: 80,
  },
  TEACHER: {
    label: 'Teaching Staff',
    shortLabel: 'Teacher',
    description: 'Legacy academic role retained during transition for academics, attendance, examinations, and class lists.',
    badgeClass: 'bg-amber-500/20 text-amber-300',
    outlineBadgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentColor: '#f59e0b',
    sortOrder: 90,
  },
  HOD: {
    label: 'Head of Department',
    shortLabel: 'HOD',
    description: 'Academic lead role for departmental teaching oversight, curriculum coordination, and staff supervision.',
    badgeClass: 'bg-orange-500/20 text-orange-300',
    outlineBadgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    accentColor: '#f97316',
    sortOrder: 100,
  },
  LIBRARIAN: {
    label: 'School Librarian',
    shortLabel: 'Librarian',
    description: 'Library operations role for catalog, circulation, membership, fines, and acquisitions.',
    badgeClass: 'bg-teal-500/20 text-teal-300',
    outlineBadgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    accentColor: '#14b8a6',
    sortOrder: 110,
  },
  NURSE: {
    label: 'School Nurse',
    shortLabel: 'Nurse',
    description: 'Health operations role for dispensary records, clinic visits, prescriptions, and student health notes.',
    badgeClass: 'bg-rose-500/20 text-rose-300',
    outlineBadgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    accentColor: '#f43f5e',
    sortOrder: 120,
  },
  SECURITY: {
    label: 'Security Staff',
    shortLabel: 'Security',
    description: 'Legacy security role retained during transition for gate, visitor, and campus security workflows.',
    badgeClass: 'bg-slate-500/20 text-slate-300',
    outlineBadgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    accentColor: '#94a3b8',
    sortOrder: 130,
  },
  SECURITY_GUARD: {
    label: 'Security Guard',
    shortLabel: 'Security Guard',
    description: 'Operations role focused on visitor management, gate logging, and campus access control.',
    badgeClass: 'bg-stone-500/20 text-stone-300',
    outlineBadgeClass: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
    accentColor: '#a8a29e',
    sortOrder: 140,
  },
  COOK: {
    label: 'Kitchen / Cook',
    shortLabel: 'Cook',
    description: 'Cafeteria and meal-service operations role for menu and service workflows.',
    badgeClass: 'bg-orange-500/20 text-orange-300',
    outlineBadgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    accentColor: '#f97316',
    sortOrder: 150,
  },
  STORE_CLERK: {
    label: 'Store Clerk',
    shortLabel: 'Store Clerk',
    description: 'Store and procurement support role for stock issues, deliveries, and inventory operations.',
    badgeClass: 'bg-lime-500/20 text-lime-300',
    outlineBadgeClass: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
    accentColor: '#84cc16',
    sortOrder: 160,
  },
  PARENT: {
    label: 'Parent / Guardian',
    shortLabel: 'Parent',
    description: 'Parent portal access using username, email, or phone for child progress, fees, and communication.',
    badgeClass: 'bg-sky-500/20 text-sky-300',
    outlineBadgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    accentColor: '#06b6d4',
    sortOrder: 170,
  },
  STUDENT: {
    label: 'Student',
    shortLabel: 'Student',
    description: 'Student portal access for timetable, e-learning, grades, assignments, and attendance.',
    badgeClass: 'bg-pink-500/20 text-pink-300',
    outlineBadgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    accentColor: '#ec4899',
    sortOrder: 180,
  },
  ALUMNI: {
    label: 'Alumni',
    shortLabel: 'Alumni',
    description: 'Alumni portal access for history, events, donations, and post-graduation engagement.',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300',
    outlineBadgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    accentColor: '#d946ef',
    sortOrder: 190,
  },
}

export const ADMIN_FAMILY_ROLES = new Set(['TENANT_SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'DEPUTY_PRINCIPAL'])
export const FINANCE_FAMILY_ROLES = new Set(['ACCOUNTANT', 'BURSAR'])
export const ACADEMIC_FAMILY_ROLES = new Set(['TEACHER', 'HOD'])
export const STAFF_ROLE_NAMES = new Set([
  'TENANT_SUPER_ADMIN',
  'ADMIN',
  'PRINCIPAL',
  'DEPUTY_PRINCIPAL',
  'ACCOUNTANT',
  'BURSAR',
  'HR_OFFICER',
  'REGISTRAR',
  'TEACHER',
  'HOD',
  'LIBRARIAN',
  'NURSE',
  'SECURITY',
  'SECURITY_GUARD',
  'COOK',
  'STORE_CLERK',
])
export const PORTAL_ROLE_NAMES = new Set(['PARENT', 'STUDENT', 'ALUMNI'])
export const STUDENT_ADMISSION_LOGIN_ROLES = new Set(['STUDENT'])

export const ROLE_REFERENCE_ORDER = Object.keys(ROLE_CATALOG)

export function normalizeRoleName(roleName: string | null | undefined): string {
  return (roleName ?? '').trim().toUpperCase()
}

export function getRoleMeta(roleName: string | null | undefined): RoleMeta {
  const normalized = normalizeRoleName(roleName)
  return ROLE_CATALOG[normalized] ?? {
    label: normalized || 'Unknown Role',
    shortLabel: normalized || 'Unknown',
    description: 'Role metadata has not been defined for this catalog entry yet.',
    badgeClass: 'bg-slate-500/20 text-slate-300',
    outlineBadgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    accentColor: '#94a3b8',
    sortOrder: 999,
  }
}

export function getRoleLabel(roleName: string | null | undefined): string {
  return getRoleMeta(roleName).label
}

export function getRoleShortLabel(roleName: string | null | undefined): string {
  return getRoleMeta(roleName).shortLabel
}

export function getRoleDescription(roleName: string | null | undefined): string {
  return getRoleMeta(roleName).description
}

export function getRoleSortOrder(roleName: string | null | undefined): number {
  return getRoleMeta(roleName).sortOrder
}

export function isAdminFamilyRole(roleName: string | null | undefined): boolean {
  return ADMIN_FAMILY_ROLES.has(normalizeRoleName(roleName))
}

export function resolveDashboardRoleKey(roleName: string | null | undefined): string {
  const normalized = normalizeRoleName(roleName)
  if (normalized === 'TENANT_SUPER_ADMIN') return 'TENANT_SUPER_ADMIN'
  if (normalized === 'PRINCIPAL') return 'PRINCIPAL'
  if (normalized === 'DEPUTY_PRINCIPAL') return 'DEPUTY_PRINCIPAL'
  if (normalized === 'ADMIN') return 'ADMIN'
  if (FINANCE_FAMILY_ROLES.has(normalized)) return 'ACCOUNTANT'
  if (normalized === 'HOD') return 'HOD'
  if (normalized === 'HR_OFFICER') return 'HR_OFFICER'
  if (normalized === 'REGISTRAR') return 'REGISTRAR'
  if (normalized === 'LIBRARIAN') return 'LIBRARIAN'
  if (normalized === 'NURSE') return 'NURSE'
  if (normalized === 'SECURITY' || normalized === 'SECURITY_GUARD') return 'SECURITY_GUARD'
  if (normalized === 'STORE_CLERK') return 'STORE_CLERK'
  if (normalized === 'COOK') return 'COOK'
  if (normalized === 'ALUMNI') return 'ALUMNI'
  if (normalized === 'PARENT') return 'PARENT'
  if (normalized === 'STUDENT') return 'STUDENT'
  if (ACADEMIC_FAMILY_ROLES.has(normalized)) return 'TEACHER'
  return 'DEFAULT'
}
