import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Department = { id: number; name: string }
type Position = { id: number; title: string }

type Employee = {
  id: number
  employee_id: string
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  department: number | null
  department_name: string
  position: number | null
  position_title: string
  employment_type: string
  status: string
  join_date: string
}

type NewEmployee = {
  first_name: string
  middle_name: string
  last_name: string
  date_of_birth: string
  gender: 'Male' | 'Female' | 'Other'
  marital_status: 'Single' | 'Married' | 'Divorced' | 'Widowed'
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Intern'
  status: 'Active' | 'On Leave' | 'Suspended' | 'Terminated' | 'Retired'
  join_date: string
  department: string
  position: string
  notice_period_days: string
}

const initialForm: NewEmployee = {
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'Female',
  marital_status: 'Single',
  employment_type: 'Full-time',
  status: 'Active',
  join_date: '',
  department: '',
  position: '',
  notice_period_days: '30',
}

export default function HrEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<NewEmployee>(initialForm)
  const [saving, setSaving] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<NewEmployee>>({})
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [employeesRes, departmentsRes, positionsRes] = await Promise.all([
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
        apiClient.get<Department[] | { results: Department[] }>('/hr/departments/'),
        apiClient.get<Position[] | { results: Position[] }>('/hr/positions/'),
      ])
      const asArr = <T,>(v: T[] | { results?: T[] }): T[] => Array.isArray(v) ? v : v.results ?? []
      setEmployees(asArr(employeesRes.data))
      setDepartments(asArr(departmentsRes.data))
      setPositions(asArr(positionsRes.data))
    } catch {
      setError('Unable to load employee directory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((employee) => {
      const haystack = [
        employee.employee_id,
        employee.full_name,
        employee.department_name,
        employee.position_title,
        employee.status,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [employees, search])

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.date_of_birth || !form.join_date) {
      setError('First name, last name, date of birth and join date are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await apiClient.post('/hr/employees/', {
        ...form,
        department: form.department ? Number(form.department) : null,
        position: form.position ? Number(form.position) : null,
        notice_period_days: Number(form.notice_period_days || '30'),
      })
      setForm(initialForm)
      setShowCreate(false)
      await load()
    } catch {
      setError('Unable to create employee record.')
    } finally {
      setSaving(false)
    }
  }

  const startEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id)
    setEditForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      middle_name: emp.middle_name,
      employment_type: emp.employment_type as NewEmployee['employment_type'],
      status: emp.status as NewEmployee['status'],
      join_date: emp.join_date,
      department: emp.department != null ? String(emp.department) : '',
      position: emp.position != null ? String(emp.position) : '',
    })
  }

  const saveEmployeeEdit = async () => {
    if (!editingEmployeeId) return
    setSaving(true)
    setError(null)
    try {
      await apiClient.patch(`/hr/employees/${editingEmployeeId}/`, {
        first_name: editForm.first_name,
        middle_name: editForm.middle_name,
        last_name: editForm.last_name,
        employment_type: editForm.employment_type,
        status: editForm.status,
        join_date: editForm.join_date,
        department: editForm.department ? Number(editForm.department) : null,
        position: editForm.position ? Number(editForm.position) : null,
      })
      setEditingEmployeeId(null)
      setNotice('Employee updated successfully.')
      await load()
    } catch {
      setError('Unable to update employee record.')
    } finally {
      setSaving(false)
    }
  }

  const deleteEmployee = async (id: number) => {
    setSaving(true)
    setError(null)
    try {
      await apiClient.patch(`/hr/employees/${id}/`, { status: 'Terminated' })
      setDeletingEmployeeId(null)
      setNotice('Employee deactivated.')
      await load()
    } catch {
      setError('Unable to deactivate employee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Employees"
        subtitle="Full staff directory and employment details"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Employee Directory</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Staff Profiles</h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <section className="rounded-xl glass-panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, department, position..."
            className="w-full rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-100 sm:max-w-md"
          />
          <button
            onClick={() => setShowCreate((prev) => !prev)}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200"
          >
            {showCreate ? 'Close Form' : 'Create Employee'}
          </button>
        </div>

        {showCreate ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-white/[0.07] bg-slate-950/60 p-4 sm:grid-cols-2">
            <input
              value={form.first_name}
              onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
              placeholder="First name"
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            />
            <input
              value={form.middle_name}
              onChange={(event) => setForm((prev) => ({ ...prev, middle_name: event.target.value }))}
              placeholder="Middle name"
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            />
            <input
              value={form.last_name}
              onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
              placeholder="Last name"
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(event) => setForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.join_date}
              onChange={(event) => setForm((prev) => ({ ...prev, join_date: event.target.value }))}
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            />
            <input
              value={form.notice_period_days}
              onChange={(event) => setForm((prev) => ({ ...prev, notice_period_days: event.target.value }))}
              placeholder="Notice period days"
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            />
            <select
              value={form.gender}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, gender: event.target.value as NewEmployee['gender'] }))
              }
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={form.marital_status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, marital_status: event.target.value as NewEmployee['marital_status'] }))
              }
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
            <select
              value={form.employment_type}
              onChange={(event) =>
                setForm((prev) =>
                  ({ ...prev, employment_type: event.target.value as NewEmployee['employment_type'] }),
                )
              }
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Intern">Intern</option>
            </select>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as NewEmployee['status'] }))
              }
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Suspended">Suspended</option>
              <option value="Terminated">Terminated</option>
              <option value="Retired">Retired</option>
            </select>
            <select
              value={form.department}
              onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            >
              <option value="">Department (optional)</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <select
              value={form.position}
              onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
              className="rounded-lg border border-white/[0.09] glass-panel px-3 py-2 text-sm"
            >
              <option value="">Position (optional)</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Join Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : filteredEmployees).map((employee) => editingEmployeeId === employee.id ? (
                <tr key={employee.id} className="border-t border-emerald-600/30 bg-white/[0.03]">
                  <td className="px-2 py-2 text-slate-400 text-xs">{employee.employee_id}</td>
                  <td className="px-2 py-2" colSpan={4}>
                    <div className="grid gap-1.5 sm:grid-cols-3">
                      <input value={editForm.first_name ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="First name" className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-xs" />
                      <input value={editForm.middle_name ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, middle_name: e.target.value }))} placeholder="Middle name" className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-xs" />
                      <input value={editForm.last_name ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-xs" />
                      <select value={editForm.department ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-xs">
                        <option value="">No department</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <select value={editForm.position ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, position: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-xs">
                        <option value="">No position</option>
                        {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                      <select value={editForm.status ?? 'Active'} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as NewEmployee['status'] }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1.5 text-xs">
                        <option>Active</option><option>On Leave</option><option>Suspended</option><option>Terminated</option><option>Retired</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-2 py-2" colSpan={3}>
                    <div className="flex gap-2">
                      <button onClick={saveEmployeeEdit} disabled={saving} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-60">Save</button>
                      <button onClick={() => setEditingEmployeeId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : deletingEmployeeId === employee.id ? (
                <tr key={employee.id} className="border-t border-rose-500/30 bg-rose-500/5">
                  <td className="px-4 py-3" colSpan={8}>
                    <div className="flex items-center gap-4">
                      <p className="text-xs text-rose-200">Deactivate "{employee.full_name}" (set to Terminated)?</p>
                      <button onClick={() => void deleteEmployee(employee.id)} disabled={saving} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-60">Confirm</button>
                      <button onClick={() => setDeletingEmployeeId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={employee.id} className="border-t border-white/[0.07]">
                  <td className="px-4 py-3 text-slate-200">{employee.employee_id}</td>
                  <td className="px-4 py-3 text-slate-100">{employee.full_name}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.department_name || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.position_title || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.employment_type}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.status}</td>
                  <td className="px-4 py-3 text-slate-300">{employee.join_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200 border border-emerald-700/40" to={`/modules/hr/employees/${employee.id}`}>Open</Link>
                      <button onClick={() => startEditEmployee(employee)} className="rounded-md px-2 py-1 text-xs font-semibold border border-slate-600 text-slate-200 hover:bg-slate-700/50">Edit</button>
                      <button onClick={() => setDeletingEmployeeId(employee.id)} className="rounded-md px-2 py-1 text-xs font-semibold border border-rose-600/50 text-rose-300 hover:bg-rose-500/10">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredEmployees.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">No employees found for the current filter.</p>
        ) : null}
      </section>
    </div>
  )
}
