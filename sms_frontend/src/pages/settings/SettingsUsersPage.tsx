import { useEffect, useState, useRef } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { Search, Users, BookOpen, Heart, ChevronRight, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import {
  getRoleDescription,
  getRoleLabel,
  getRoleMeta,
  getRoleSortOrder,
  STAFF_ROLE_NAMES,
  STUDENT_ADMISSION_LOGIN_ROLES,
} from '../../lib/roleCatalog'

type Role = { id: number; name: string; description: string }

type TenantUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_staff: boolean
  date_joined: string | null
  last_login: string | null
  role_id: number | null
  role_name: string | null
  phone: string
  admission_number: string
}

type FormState = {
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  password: string
  role_id: string
  admission_number: string
}

type StudentResult = {
  id: number
  full_name: string
  first_name: string
  last_name: string
  admission_number: string
  has_account: boolean
}

type SchoolClass = { id: number; name: string; display_name?: string }

type BulkResult = { created_count: number; skipped_count: number; created: { name: string; admission_number: string }[]; skipped: { name: string; admission_number: string; reason: string }[] }
type UserType = 'staff' | 'student' | 'parent' | 'alumni'

const blank: FormState = { username: '', email: '', first_name: '', last_name: '', phone: '', password: '', role_id: '', admission_number: '' }

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: string }).detail
    if (detail) return detail
    const msgs = Object.values(data as Record<string, unknown>).flat()
    if (msgs.length) return (msgs as string[]).join(' ')
  }
  return fallback
}

const fmtKsh = (n: number) => `Ksh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
void fmtKsh

const resolveUserTypeFromRole = (roleName: string | null | undefined): UserType => {
  const normalized = (roleName ?? '').trim().toUpperCase()
  if (normalized === 'STUDENT') return 'student'
  if (normalized === 'PARENT') return 'parent'
  if (normalized === 'ALUMNI') return 'alumni'
  return 'staff'
}

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TenantUser | null>(null)
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  // User type selector step
  const [userType, setUserType] = useState<UserType | null>(null)

  // Student search (for single student creation)
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [studentSearching, setStudentSearching] = useState(false)
  const studentDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Bulk create by class
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  const [bulkClasses, setBulkClasses] = useState<SchoolClass[]>([])
  const [bulkSelectedClass, setBulkSelectedClass] = useState<string>('')
  const [bulkStudents, setBulkStudents] = useState<StudentResult[]>([])
  const [bulkLoadingStudents, setBulkLoadingStudents] = useState(false)
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set())
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [bulkError, setBulkError] = useState('')

  const load = async (includeInactive = false) => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get(`/users/${includeInactive ? '?include_inactive=1' : ''}`),
        apiClient.get('/users/roles/'),
      ])
      setUsers(usersRes.data.results ?? usersRes.data)
      const rolesData = Array.isArray(rolesRes.data) ? rolesRes.data : []
      setRoles(rolesData)
    } catch {
      setUsers([])
      setRoles([])
    }
    setLoading(false)
  }

  useEffect(() => { load(showInactive) }, [showInactive])

  // Debounced student search
  useEffect(() => {
    if (!studentQuery.trim() || studentQuery.trim().length < 2) {
      setStudentResults([])
      return
    }
    if (studentDebounce.current) clearTimeout(studentDebounce.current)
    studentDebounce.current = setTimeout(async () => {
      setStudentSearching(true)
      try {
        const res = await apiClient.get(`/users/student-search/?q=${encodeURIComponent(studentQuery.trim())}`)
        setStudentResults(res.data.results ?? [])
      } catch {
        setStudentResults([])
      } finally {
        setStudentSearching(false)
      }
    }, 350)
  }, [studentQuery])

  const openCreate = () => {
    setEditing(null)
    setForm(blank)
    setSaveError('')
    setUserType(null)
    setStudentQuery('')
    setStudentResults([])
    setShowForm(true)
  }

  const openEdit = (u: TenantUser) => {
    setEditing(u)
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      password: '',
      role_id: u.role_id ? String(u.role_id) : '',
      admission_number: u.admission_number ?? '',
    })
    setSaveError('')
    setUserType(resolveUserTypeFromRole(u.role_name))
    setShowForm(true)
  }

  const selectStudentForForm = (s: StudentResult) => {
    const matchedRole = roles.find(r => r.name === 'STUDENT')
    setForm(f => ({
      ...f,
      first_name: s.first_name,
      last_name: s.last_name,
      username: s.admission_number,
      admission_number: s.admission_number,
      role_id: matchedRole ? String(matchedRole.id) : f.role_id,
    }))
    setStudentQuery('')
    setStudentResults([])
  }

  const selectUserType = (type: UserType) => {
    setUserType(type)
    const roleName = type === 'staff'
      ? null
      : type === 'student'
        ? 'STUDENT'
        : type === 'parent'
          ? 'PARENT'
          : 'ALUMNI'
    const matchedRole = roleName ? roles.find(r => r.name === roleName) : null
    setForm(f => ({
      ...f,
      role_id: matchedRole ? String(matchedRole.id) : '',
      admission_number: type === 'student' ? f.admission_number : '',
    }))
  }

  const handleSave = async () => {
    setSaving(true); setSaveError('')
    try {
      if (editing) {
        const payload: Partial<FormState> = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          role_id: form.role_id,
          admission_number: form.admission_number,
        }
        if (form.password) payload.password = form.password
        await apiClient.patch(`/users/${editing.id}/`, payload)
        setMessage('User updated successfully.')
      } else {
        await apiClient.post('/users/', { ...form, role_id: parseInt(form.role_id) || null })
        setMessage('User created successfully.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      setSaveError(extractApiError(err, 'Failed to save user.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (u: TenantUser) => {
    if (!confirm(`Deactivate "${u.username}"? They will lose access immediately but the account will be preserved.`)) return
    try {
      await apiClient.patch(`/users/${u.id}/`, { is_active: false })
      setMessage(`${u.username} has been deactivated.`)
      setMessageType('success')
      load(showInactive)
    } catch (err) {
      setMessage(extractApiError(err, 'Failed to deactivate user.'))
      setMessageType('error')
    }
  }

  const handleReactivate = async (u: TenantUser) => {
    if (!confirm(`Reactivate "${u.username}"? They will regain access immediately.`)) return
    try {
      await apiClient.patch(`/users/${u.id}/`, { is_active: true })
      setMessage(`${u.username} has been reactivated.`)
      setMessageType('success')
      load(showInactive)
    } catch (err) {
      setMessage(extractApiError(err, 'Failed to reactivate user.'))
      setMessageType('error')
    }
  }

  const handleDelete = async (u: TenantUser) => {
    if (!confirm(`PERMANENTLY DELETE "${u.username}"? This cannot be undone — all data for this account will be removed.`)) return
    if (!confirm(`Are you sure? Type OK to confirm deletion of "${u.username}".`)) return
    try {
      await apiClient.delete(`/users/${u.id}/`)
      setMessage(`${u.username} has been permanently deleted.`)
      setMessageType('success')
      load(showInactive)
    } catch (err) {
      setMessage(extractApiError(err, 'Failed to delete user.'))
      setMessageType('error')
    }
  }

  // ── Bulk Create ──────────────────────────────────────────────────────────────

  const openBulkCreate = async () => {
    setBulkResult(null)
    setBulkError('')
    setBulkSelectedClass('')
    setBulkStudents([])
    setBulkSelectedIds(new Set())
    setShowBulkCreate(true)
    try {
      const res = await apiClient.get('/school/classes/')
      const data = Array.isArray(res.data) ? res.data : (res.data.results ?? [])
      setBulkClasses(data)
    } catch {
      setBulkClasses([])
    }
  }

  const loadBulkStudents = async (classId: string) => {
    if (!classId) { setBulkStudents([]); return }
    setBulkLoadingStudents(true)
    try {
      const res = await apiClient.get(`/users/students-by-class/?class_id=${classId}`)
      const students: StudentResult[] = res.data.results ?? []
      setBulkStudents(students)
      setBulkSelectedIds(new Set(students.filter(s => !s.has_account).map(s => s.id)))
    } catch {
      setBulkStudents([])
    } finally {
      setBulkLoadingStudents(false)
    }
  }

  const handleBulkCreate = async () => {
    if (bulkSelectedIds.size === 0) return
    setBulkCreating(true)
    setBulkError('')
    try {
      const res = await apiClient.post('/users/bulk-create-students/', {
        student_ids: [...bulkSelectedIds],
        role: 'STUDENT',
      })
      setBulkResult(res.data)
      load()
      // Refresh student list for this class
      await loadBulkStudents(bulkSelectedClass)
    } catch (err) {
      setBulkError(extractApiError(err, 'Bulk create failed.'))
    } finally {
      setBulkCreating(false)
    }
  }

  const activeUsers = users.filter(u => u.is_active)
  const inactiveUsers = users.filter(u => !u.is_active)

  const filtered = activeUsers.filter(u => {
    const q = search.toLowerCase()
    return !q || [u.username, u.email, u.first_name, u.last_name, u.role_name].join(' ').toLowerCase().includes(q)
  })

  const filteredInactive = inactiveUsers.filter(u => {
    const q = search.toLowerCase()
    return !q || [u.username, u.email, u.first_name, u.last_name, u.role_name].join(' ').toLowerCase().includes(q)
  })

  const summary = {
    total: activeUsers.length,
    inactive: inactiveUsers.length,
    byRole: roles.reduce((acc, r) => {
      acc[r.name] = activeUsers.filter(u => u.role_name === r.name).length
      return acc
    }, {} as Record<string, number>),
  }

  const sortedRoles = [...roles].sort((a, b) => {
    const orderDiff = getRoleSortOrder(a.name) - getRoleSortOrder(b.name)
    if (orderDiff !== 0) return orderDiff
    return getRoleLabel(a.name).localeCompare(getRoleLabel(b.name))
  })
  const selectedRoleName = roles.find(r => String(r.id) === form.role_id)?.name ?? ''
  const roleOptions = sortedRoles.filter(r => {
    if (!userType || userType === 'staff') return STAFF_ROLE_NAMES.has(r.name)
    if (userType === 'student') return r.name === 'STUDENT'
    if (userType === 'parent') return r.name === 'PARENT'
    if (userType === 'alumni') return r.name === 'ALUMNI'
    return true
  })

  return (
    <div className="space-y-6">
      <PageHero
        badge="SETTINGS"
        badgeColor="slate"
        title="User Accounts"
        subtitle="Create and manage user accounts and passwords"
        icon="⚙️"
      />

      {/* Header card */}
      <div className="rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">User Management</h1>
            <p className="mt-1 text-sm text-slate-400">
              Create accounts and assign roles. Use Bulk Create to provision student logins by class.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowInactive(v => !v)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${showInactive ? 'border-amber-500/50 bg-amber-500/15 text-amber-300' : 'border-white/[0.09] bg-white/[0.04] text-slate-400 hover:text-white'}`}
            >
              {showInactive ? `Hide Deactivated (${summary.inactive})` : `Show Deactivated${summary.inactive > 0 ? ` (${summary.inactive})` : ''}`}
            </button>
            <button
              onClick={openBulkCreate}
              className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
            >
              Bulk Create Students
            </button>
            <button
              onClick={openCreate}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              + Add User
            </button>
          </div>
        </div>
        {message && (
          <p className={`mt-3 rounded-xl border px-4 py-2 text-xs ${messageType === 'error' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-500">Total Users</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.total}</p>
        </div>
        {sortedRoles.map(r => (
          <div key={r.id} className="rounded-2xl glass-panel p-5">
            <p className="text-xs uppercase text-slate-500">{getRoleLabel(r.name)}</p>
            <p className="mt-2 text-2xl font-bold text-white">{summary.byRole[r.name] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="rounded-2xl glass-panel p-6">
        <div className="mb-4">
          <input
            className="w-full max-w-sm rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 placeholder:text-slate-600"
            placeholder="Search by name, username, email, or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500 text-sm">Loading users…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-200">
              <thead>
                <tr className="border-b border-white/[0.09] text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-5 text-left">Name</th>
                  <th className="pb-3 pr-5 text-left">Username / Adm No.</th>
                  <th className="pb-3 pr-5 text-left">Email</th>
                  <th className="pb-3 pr-5 text-left">Phone</th>
                  <th className="pb-3 pr-5 text-left">Role</th>
                  <th className="pb-3 pr-5 text-left">Last Login</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      {search ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pr-5">
                      <div className="font-medium text-white">
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : <span className="text-slate-500 italic">No name</span>}
                      </div>
                      {u.is_staff && <span className="text-xs text-slate-600">Staff</span>}
                    </td>
                    <td className="py-3 pr-5">
                      <div className="font-mono text-xs text-slate-400">{u.username}</div>
                      {u.admission_number && (
                        <div className="mt-0.5 font-mono text-xs text-sky-400" title="Admission number / login ID">
                          {u.admission_number}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-5 text-slate-400">{u.email || <span className="text-slate-600">—</span>}</td>
                    <td className="py-3 pr-5 text-slate-400">{u.phone || <span className="text-slate-600">—</span>}</td>
                    <td className="py-3 pr-5">
                      {u.role_name ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleMeta(u.role_name).badgeClass}`}>
                          {getRoleLabel(u.role_name)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-300">No Role</span>
                      )}
                    </td>
                    <td className="py-3 pr-5 text-xs text-slate-500">{u.last_login ?? 'Never'}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(u)} className="text-xs text-slate-400 hover:text-white transition">Edit</button>
                        <button onClick={() => handleDeactivate(u)} className="text-xs text-amber-400 hover:text-amber-300 transition">Deactivate</button>
                        <button onClick={() => handleDelete(u)} className="text-xs text-red-500 hover:text-red-400 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deactivated Users Section */}
      {showInactive && (
        <div className="rounded-2xl glass-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-base font-semibold text-amber-300">Deactivated Accounts</h2>
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              {filteredInactive.length}
            </span>
          </div>
          {filteredInactive.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No deactivated accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-400">
                <thead>
                  <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-slate-600">
                    <th className="pb-3 pr-5 text-left">Name</th>
                    <th className="pb-3 pr-5 text-left">Username / Adm No.</th>
                    <th className="pb-3 pr-5 text-left">Role</th>
                    <th className="pb-3 pr-5 text-left">Last Login</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredInactive.map(u => (
                    <tr key={u.id} className="opacity-60 hover:opacity-80 transition">
                      <td className="py-3 pr-5">
                        <div className="font-medium text-slate-300 line-through decoration-slate-600">
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : <span className="text-slate-600 italic no-underline">No name</span>}
                        </div>
                      </td>
                      <td className="py-3 pr-5">
                        <div className="font-mono text-xs text-slate-500">{u.username}</div>
                        {u.admission_number && (
                          <div className="mt-0.5 font-mono text-xs text-slate-600">{u.admission_number}</div>
                        )}
                      </td>
                      <td className="py-3 pr-5">
                        {u.role_name ? (
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleMeta(u.role_name).outlineBadgeClass}`}>
                            {getRoleLabel(u.role_name)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-5 text-xs text-slate-600">{u.last_login ?? 'Never'}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleReactivate(u)}
                            className="text-xs text-emerald-500 hover:text-emerald-400 transition font-medium"
                          >
                            Reactivate
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-xs text-red-500 hover:text-red-400 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Role reference */}
      <div className="rounded-2xl glass-panel p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Role Permissions Reference</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {sortedRoles.map(role => (
            <div key={role.name} className="flex gap-3 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
              <span className={`mt-0.5 h-fit rounded-full px-2 py-0.5 text-xs font-medium ${getRoleMeta(role.name).badgeClass}`}>
                {getRoleLabel(role.name)}
              </span>
              <p className="text-xs text-slate-400">{getRoleDescription(role.name) || role.description}</p>
            </div>
          ))}
          {false && [
            { name: 'TENANT_SUPER_ADMIN', label: 'Tenant Super Admin', desc: 'Full tenant-level control across modules, settings, and user administration.' },
            { name: 'ADMIN', label: 'School Administrator', desc: 'Legacy school-wide admin role retained during transition with full operational visibility.' },
            { name: 'PRINCIPAL', label: 'School Principal', desc: 'School-wide leadership access across approvals, users, reports, and operational settings.' },
            { name: 'DEPUTY_PRINCIPAL', label: 'Deputy Principal', desc: 'Academic and student-operations leadership with broad oversight and settings visibility.' },
            { name: 'ACCOUNTANT', label: 'Finance Manager', desc: 'Finance module only — invoices, payments, cashbook, vote heads, reports.' },
            { name: 'TEACHER', label: 'Teaching Staff', desc: 'Academics, Students, and Attendance modules. Grade entry and class lists.' },
            { name: 'PARENT', label: 'Parent / Guardian', desc: 'Parent Portal — child\'s grades, attendance, fees, assignments and timetable.' },
            { name: 'STUDENT', label: 'Student', desc: 'Student Portal — grades, timetable, assignments, e-learning, attendance.' },
          ].map(r => (
            <div key={r.name} className="flex gap-3 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4">
              <span className={`mt-0.5 h-fit rounded-full px-2 py-0.5 text-xs font-medium ${getRoleMeta(r.name).badgeClass}`}>{r.label}</span>
              <p className="text-xs text-slate-400">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CREATE / EDIT MODAL ══════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* ── Step 1: User Type Selection (new users only) ── */}
            {!editing && userType === null ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Who is this account for?</h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-600 hover:text-slate-300">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid gap-3">
                  <button
                    onClick={() => selectUserType('staff')}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left hover:border-emerald-500/40 hover:bg-emerald-500/5 transition"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Users size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">School Staff</p>
                      <p className="text-xs text-slate-500 mt-0.5">Principal, bursar, HOD, registrar, librarian, nurse, and other staff roles use a normal username and password.</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition" />
                  </button>

                  <button
                    onClick={() => selectUserType('student')}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left hover:border-sky-500/40 hover:bg-sky-500/5 transition"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                      <BookOpen size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Student</p>
                      <p className="text-xs text-slate-500 mt-0.5">Student portal access. Username usually starts from the admission number.</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-sky-400 transition" />
                  </button>

                  <button
                    onClick={() => selectUserType('parent')}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left hover:border-violet-500/40 hover:bg-violet-500/5 transition"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                      <Heart size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Parent / Guardian</p>
                      <p className="text-xs text-slate-500 mt-0.5">Parent portal access. Login supports username, email, or phone.</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-violet-400 transition" />
                  </button>

                  <button
                    onClick={() => selectUserType('alumni')}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-400">
                      <CheckCircle2 size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Alumni</p>
                      <p className="text-xs text-slate-500 mt-0.5">Alumni portal access for post-graduation community, events, and donations.</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-fuchsia-400 transition" />
                  </button>
                </div>
              </>
            ) : (
              /* ── Step 2 / Edit Form ── */
              <>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {editing
                        ? `Edit User: ${editing.username}`
                        : userType === 'student' ? 'Create Student Account'
                        : userType === 'parent' ? 'Create Parent Account'
                        : userType === 'alumni' ? 'Create Alumni Account'
                        : 'Create Staff Account'}
                    </h2>
                    {!editing && (
                      <button
                        onClick={() => { setUserType(null); setForm(blank); setStudentQuery(''); setStudentResults([]) }}
                        className="text-xs text-slate-500 hover:text-slate-300 mt-0.5"
                      >
                        ← Change type
                      </button>
                    )}
                  </div>
                  <button onClick={() => setShowForm(false)} className="text-slate-600 hover:text-slate-300">
                    <X size={16} />
                  </button>
                </div>

                {saveError && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{saveError}</p>}

                {/* Student search for Student creation */}
                {!editing && userType === 'student' && (
                  <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                    <p className="text-xs font-semibold text-sky-300 mb-2">
                      Search Student Records to Auto-fill
                    </p>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                      <input
                        className="w-full rounded-xl border border-white/[0.09] bg-slate-950 pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-sky-400 placeholder:text-slate-600"
                        placeholder="Type name or admission number…"
                        value={studentQuery}
                        onChange={e => setStudentQuery(e.target.value)}
                      />
                      {studentSearching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500" />}
                    </div>
                    {studentResults.length > 0 && (
                      <div className="mt-2 rounded-xl border border-white/[0.07] bg-slate-950 overflow-hidden max-h-40 overflow-y-auto">
                        {studentResults.map(s => (
                          <button
                            key={s.id}
                            onClick={() => selectStudentForForm(s)}
                            disabled={s.has_account}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition hover:bg-white/[0.05] ${s.has_account ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div>
                              <p className="text-sm font-medium text-white">{s.full_name}</p>
                              <p className="text-xs font-mono text-slate-500">{s.admission_number}</p>
                            </div>
                            {s.has_account
                              ? <span className="text-[10px] text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">Has account</span>
                              : <span className="text-[10px] text-sky-400">Select</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-slate-600">
                      Or fill the form below manually — the admission number will be used as the login username.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">First Name</label>
                      <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Last Name</label>
                      <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                    </div>
                  </div>

                  {!editing && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">
                        Username <span className="text-red-400">*</span>
                        {userType === 'student' && (
                          <span className="ml-1 text-slate-600">(can start from the admission number for student login)</span>
                        )}
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 font-mono"
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Email</label>
                    <input type="email" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Phone</label>
                    <input className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      {editing ? 'New Password (leave blank to keep current)' : 'Password'} {!editing && <span className="text-red-400">*</span>}
                    </label>
                    <input type="password" className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Role <span className="text-red-400">*</span></label>
                    <select
                      className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={form.role_id}
                      onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                    >
                      <option value="">— Select a role —</option>
                      {roleOptions.map(r => (
                        <option key={r.id} value={r.id}>{getRoleLabel(r.name)}</option>
                      ))}
                    </select>
                    {form.role_id && (
                      <p className="mt-1 text-xs text-slate-500">
                        {getRoleDescription(selectedRoleName) || roles.find(r => String(r.id) === form.role_id)?.description}
                      </p>
                    )}
                  </div>

                  {STUDENT_ADMISSION_LOGIN_ROLES.has(selectedRoleName) && (
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                      <label className="mb-1 block text-xs font-medium text-sky-300">
                        Admission Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400 font-mono"
                        placeholder="e.g. ADM-0001"
                        value={form.admission_number}
                        onChange={e => setForm(f => ({ ...f, admission_number: e.target.value }))}
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        This supports the student record and the current student login bridge during the transition.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                    {saving ? 'Saving…' : editing ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ BULK CREATE MODAL ═══════════════════════════════════════════════ */}
      {showBulkCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/[0.09] bg-[#0d1421] p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Bulk Create Student Accounts</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select a class and create logins for all students at once</p>
              </div>
              <button onClick={() => setShowBulkCreate(false)} className="text-slate-600 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <div className="flex-shrink-0 mb-4">
              <label className="mb-1 block text-xs text-slate-400">Select Class</label>
              <select
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                value={bulkSelectedClass}
                onChange={e => {
                  setBulkSelectedClass(e.target.value)
                  setBulkResult(null)
                  void loadBulkStudents(e.target.value)
                }}
              >
                <option value="">— Choose a class —</option>
                {bulkClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name ?? c.name}</option>
                ))}
              </select>
            </div>

            {/* Info */}
            {bulkSelectedClass && !bulkLoadingStudents && bulkStudents.length > 0 && (
              <div className="flex-shrink-0 mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {bulkStudents.length} student{bulkStudents.length !== 1 ? 's' : ''} · {bulkStudents.filter(s => s.has_account).length} already have accounts
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkSelectedIds(new Set(bulkStudents.filter(s => !s.has_account).map(s => s.id)))}
                    className="text-sky-400 hover:text-sky-300"
                  >Select all without accounts</button>
                  <button onClick={() => setBulkSelectedIds(new Set())} className="text-slate-500 hover:text-slate-300">Clear</button>
                </div>
              </div>
            )}

            {/* Student list */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-xl border border-white/[0.07] bg-slate-950/60">
              {bulkLoadingStudents && (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading students…</span>
                </div>
              )}
              {!bulkLoadingStudents && !bulkSelectedClass && (
                <p className="py-10 text-center text-xs text-slate-600">Select a class above to view students</p>
              )}
              {!bulkLoadingStudents && bulkSelectedClass && bulkStudents.length === 0 && (
                <p className="py-10 text-center text-xs text-slate-600">No students enrolled in this class</p>
              )}
              {!bulkLoadingStudents && bulkStudents.map(s => (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 cursor-pointer hover:bg-white/[0.03] transition ${s.has_account ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={bulkSelectedIds.has(s.id)}
                    disabled={s.has_account}
                    onChange={e => {
                      const next = new Set(bulkSelectedIds)
                      if (e.target.checked) next.add(s.id)
                      else next.delete(s.id)
                      setBulkSelectedIds(next)
                    }}
                    className="accent-sky-500 w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{s.full_name}</p>
                    <p className="text-xs font-mono text-slate-500">{s.admission_number}</p>
                  </div>
                  {s.has_account && (
                    <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                      <CheckCircle2 size={10} /> Has account
                    </span>
                  )}
                </label>
              ))}
            </div>

            {/* Formula note */}
            {bulkSelectedIds.size > 0 && (
              <div className="flex-shrink-0 mt-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-slate-400">
                <span className="font-semibold text-sky-300">Account formula:</span>{' '}
                Username = Admission Number · Password = Admission Number (student changes on first login) · Role = Student
              </div>
            )}

            {bulkError && (
              <div className="flex-shrink-0 mt-3 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={12} /> {bulkError}
              </div>
            )}

            {/* Result */}
            {bulkResult && (
              <div className="flex-shrink-0 mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1 text-xs">
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> {bulkResult.created_count} account{bulkResult.created_count !== 1 ? 's' : ''} created
                  {bulkResult.skipped_count > 0 && <span className="text-amber-300 ml-2">· {bulkResult.skipped_count} skipped</span>}
                </p>
                {bulkResult.skipped.length > 0 && (
                  <ul className="mt-1 text-slate-500 space-y-0.5">
                    {bulkResult.skipped.map((s, i) => (
                      <li key={i}>{s.admission_number} — {s.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex-shrink-0 mt-4 flex justify-end gap-3">
              <button onClick={() => setShowBulkCreate(false)} className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Close
              </button>
              <button
                onClick={handleBulkCreate}
                disabled={bulkCreating || bulkSelectedIds.size === 0}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 flex items-center gap-2"
              >
                {bulkCreating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : `Create ${bulkSelectedIds.size} Account${bulkSelectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
