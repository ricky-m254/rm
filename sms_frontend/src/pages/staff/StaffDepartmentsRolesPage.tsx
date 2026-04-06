import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type StaffDept = { id: number; name: string; code: string; department_type: string }
type Role = { id: number; name: string; code: string; level: number }
type StaffRow = { id: number; full_name: string; staff_id: string }
type Assignment = { id: number; staff_name: string; department_name: string; role_name: string; is_primary: boolean }

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export default function StaffDepartmentsRolesPage() {
  const [departments, setDepartments] = useState<StaffDept[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [departmentName, setDepartmentName] = useState('')
  const [departmentCode, setDepartmentCode] = useState('')
  const [roleName, setRoleName] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('')
  const [selectedDepartment, setSelectedDepartment] = useState<number | ''>('')
  const [selectedRole, setSelectedRole] = useState<number | ''>('')
  const [effectiveFrom, setEffectiveFrom] = useState('')

  const load = async () => {
    setError(null)
    try {
      const [d, r, s, a] = await Promise.all([
        apiClient.get<StaffDept[] | { results: StaffDept[] }>('/staff/departments/'),
        apiClient.get<Role[] | { results: Role[] }>('/staff/roles/'),
        apiClient.get<StaffRow[] | { results: StaffRow[] }>('/staff/'),
        apiClient.get<Assignment[] | { results: Assignment[] }>('/staff/assignments/'),
      ])
      setDepartments(asArray(d.data))
      setRoles(asArray(r.data))
      setStaff(asArray(s.data))
      setAssignments(asArray(a.data))
    } catch {
      setError('Unable to load departments and roles data.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createDepartment = async () => {
    if (!departmentName.trim() || !departmentCode.trim()) return
    setError(null)
    try {
      await apiClient.post('/staff/departments/', {
        name: departmentName.trim(),
        code: departmentCode.trim(),
        department_type: 'Academic',
      })
      setDepartmentName('')
      setDepartmentCode('')
      setNotice('Department created.')
      await load()
    } catch {
      setError('Unable to create department.')
    }
  }

  const createRole = async () => {
    if (!roleName.trim() || !roleCode.trim()) return
    setError(null)
    try {
      await apiClient.post('/staff/roles/', {
        name: roleName.trim(),
        code: roleCode.trim(),
        level: 3,
      })
      setRoleName('')
      setRoleCode('')
      setNotice('Role created.')
      await load()
    } catch {
      setError('Unable to create role.')
    }
  }

  const createAssignment = async () => {
    if (!selectedStaff || !selectedDepartment || !selectedRole || !effectiveFrom) return
    setError(null)
    try {
      await apiClient.post('/staff/assignments/', {
        staff: selectedStaff,
        department: selectedDepartment,
        role: selectedRole,
        effective_from: effectiveFrom,
        is_primary: true,
      })
      setNotice('Staff assignment created.')
      await load()
    } catch {
      setError('Unable to create assignment.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="STAFF"
        badgeColor="blue"
        title="Departments & Roles"
        subtitle="Organisational units and role definitions"
        icon="👤"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Departments & Roles</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Organization and Role Assignments</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Create Department</h2>
          <div className="mt-3 space-y-2">
            <input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Department name" className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <input value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} placeholder="Code (SCI)" className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createDepartment} className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create Department</button>
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Create Role</h2>
          <div className="mt-3 space-y-2">
            <input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Role name" className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <input value={roleCode} onChange={(e) => setRoleCode(e.target.value)} placeholder="Code (TEACHER)" className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createRole} className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Create Role</button>
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Assign Staff</h2>
          <div className="mt-3 space-y-2">
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option value="">Select staff</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{row.staff_id} - {row.full_name}</option>)}
            </select>
            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option value="">Select department</option>
              {departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option value="">Select role</option>
              {roles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createAssignment} className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">Assign</button>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl glass-panel p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Current Assignments</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr><th className="px-2 py-2">Staff</th><th className="px-2 py-2">Department</th><th className="px-2 py-2">Role</th><th className="px-2 py-2">Primary</th></tr>
              </thead>
              <tbody>
                {assignments.map((row) => (
                  <tr key={row.id} className="border-t border-white/[0.07]">
                    <td className="px-2 py-2">{row.staff_name}</td>
                    <td className="px-2 py-2">{row.department_name}</td>
                    <td className="px-2 py-2">{row.role_name}</td>
                    <td className="px-2 py-2">{row.is_primary ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold">Staff Department Projections</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {departments.map((row) => (
              <div key={`staff-${row.id}`} className="rounded-lg bg-slate-950/60 px-3 py-2">
                <p className="font-medium">{row.name}</p>
                <p className="text-slate-500">{row.code} · {row.department_type}</p>
              </div>
            ))}
            {departments.length === 0 ? <p className="text-slate-500">No staff department projections yet.</p> : null}
          </div>
        </article>
      </section>
    </div>
  )
}
