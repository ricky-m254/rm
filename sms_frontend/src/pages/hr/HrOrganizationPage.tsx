import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Department = {
  id: number
  name: string
  code: string
  parent: number | null
  parent_name: string
  head: number | null
  head_name: string
  description: string
  budget: string | null
  is_active?: boolean
}

type Position = {
  id: number
  title: string
  department: number
  department_name: string
  headcount: number
  is_active?: boolean
}

type OrgChartRow = {
  id: number
  name: string
  code: string
  parent_id: number | null
  head: string
  employee_count: number
}

type Vacancy = {
  position_id: number
  headcount: number
  filled: number
  vacancies: number
}

type DepartmentForm = {
  id: number | null
  name: string
  code: string
  parent: string
  description: string
  budget: string
}

type PositionForm = {
  id: number | null
  title: string
  department: string
  headcount: string
}

const defaultDepartmentForm: DepartmentForm = {
  id: null,
  name: '',
  code: '',
  parent: '',
  description: '',
  budget: '',
}

const defaultPositionForm: PositionForm = {
  id: null,
  title: '',
  department: '',
  headcount: '1',
}

type ModalMode = 'none' | 'createDepartment' | 'editDepartment' | 'createPosition' | 'editPosition'

function exportVacanciesCsv(rows: Array<{ position: string; department: string; headcount: number; filled: number; vacancies: number }>) {
  const headers = ['Position', 'Department', 'Headcount', 'Filled', 'Vacancies']
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      [row.position, row.department, String(row.headcount), String(row.filled), String(row.vacancies)]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    ),
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'hr_vacancies.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function HrOrganizationPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [orgChart, setOrgChart] = useState<OrgChartRow[]>([])
  const [vacanciesByPosition, setVacanciesByPosition] = useState<Record<number, Vacancy>>({})
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('')
  const [vacancySearch, setVacancySearch] = useState('')
  const [minimumVacancyFilter, setMinimumVacancyFilter] = useState('0')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>('none')

  const [deleteDeptTarget, setDeleteDeptTarget] = useState<number | null>(null)
  const [deletePosTarget, setDeletePosTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>(defaultDepartmentForm)
  const [positionForm, setPositionForm] = useState<PositionForm>(defaultPositionForm)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [departmentsRes, positionsRes, orgChartRes] = await Promise.all([
        apiClient.get<Department[]>('/hr/departments/'),
        apiClient.get<Position[]>('/hr/positions/'),
        apiClient.get<OrgChartRow[]>('/hr/departments/org-chart/'),
      ])
      const departmentsData = departmentsRes.data
      const positionsData = positionsRes.data
      setDepartments(departmentsData)
      setPositions(positionsData)
      setOrgChart(orgChartRes.data)

      const vacancyRows = await Promise.all(
        positionsData.map(async (position) => {
          const response = await apiClient.get<Vacancy>(`/hr/positions/${position.id}/vacancies/`)
          return response.data
        }),
      )
      const mapped: Record<number, Vacancy> = {}
      vacancyRows.forEach((row) => {
        mapped[row.position_id] = row
      })
      setVacanciesByPosition(mapped)
    } catch {
      setError('Unable to load organization data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const openCreateDepartment = () => {
    setDepartmentForm(defaultDepartmentForm)
    setModalMode('createDepartment')
  }

  const openEditDepartment = (department: Department) => {
    setDepartmentForm({
      id: department.id,
      name: department.name,
      code: department.code,
      parent: department.parent ? String(department.parent) : '',
      description: department.description ?? '',
      budget: department.budget ?? '',
    })
    setModalMode('editDepartment')
  }

  const openCreatePosition = () => {
    setPositionForm(defaultPositionForm)
    setModalMode('createPosition')
  }

  const openEditPosition = (position: Position) => {
    setPositionForm({
      id: position.id,
      title: position.title,
      department: String(position.department),
      headcount: String(position.headcount),
    })
    setModalMode('editPosition')
  }

  const closeModal = () => {
    setModalMode('none')
    setDepartmentForm(defaultDepartmentForm)
    setPositionForm(defaultPositionForm)
  }

  const saveDepartment = async () => {
    if (!departmentForm.name || !departmentForm.code) {
      setError('Department name and code are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        name: departmentForm.name,
        code: departmentForm.code,
        parent: departmentForm.parent ? Number(departmentForm.parent) : null,
        description: departmentForm.description,
        budget: departmentForm.budget ? Number(departmentForm.budget) : null,
      }
      if (modalMode === 'editDepartment' && departmentForm.id) {
        await apiClient.patch(`/hr/departments/${departmentForm.id}/`, payload)
        setNotice('Department updated.')
      } else {
        await apiClient.post('/hr/departments/', payload)
        setNotice('Department created.')
      }
      closeModal()
      await load()
    } catch {
      setError('Unable to save department.')
    } finally {
      setWorking(false)
    }
  }

  const archiveDepartment = async () => {
    if (!deleteDeptTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await apiClient.delete(`/hr/departments/${deleteDeptTarget}/`)
      setNotice('Department archived.')
      setDeleteDeptTarget(null)
      await load()
    } catch {
      setDeleteError('Unable to archive department.')
    } finally {
      setIsDeleting(false)
    }
  }

  const savePosition = async () => {
    if (!positionForm.title || !positionForm.department) {
      setError('Position title and department are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        title: positionForm.title,
        department: Number(positionForm.department),
        headcount: Number(positionForm.headcount || '1'),
      }
      if (modalMode === 'editPosition' && positionForm.id) {
        await apiClient.patch(`/hr/positions/${positionForm.id}/`, payload)
        setNotice('Position updated.')
      } else {
        await apiClient.post('/hr/positions/', payload)
        setNotice('Position created.')
      }
      closeModal()
      await load()
    } catch {
      setError('Unable to save position.')
    } finally {
      setWorking(false)
    }
  }

  const archivePosition = async () => {
    if (!deletePosTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await apiClient.delete(`/hr/positions/${deletePosTarget}/`)
      setNotice('Position archived.')
      setDeletePosTarget(null)
      await load()
    } catch {
      setDeleteError('Unable to archive position.')
    } finally {
      setIsDeleting(false)
    }
  }

  const vacancyRows = useMemo(() => {
    const minVacancies = Number(minimumVacancyFilter || '0')
    return positions
      .map((position) => {
        const vacancy = vacanciesByPosition[position.id]
        return {
          positionId: position.id,
          position: position.title,
          department: position.department_name,
          headcount: vacancy?.headcount ?? position.headcount,
          filled: vacancy?.filled ?? 0,
          vacancies: vacancy?.vacancies ?? 0,
        }
      })
      .filter((row) => (selectedDepartmentFilter ? row.department === selectedDepartmentFilter : true))
      .filter((row) => row.vacancies >= minVacancies)
      .filter((row) => {
        const term = vacancySearch.trim().toLowerCase()
        if (!term) return true
        return `${row.position} ${row.department}`.toLowerCase().includes(term)
      })
  }, [positions, vacanciesByPosition, selectedDepartmentFilter, minimumVacancyFilter, vacancySearch])

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Organisation Chart"
        subtitle="School departments, roles and hierarchy"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Departments & Positions</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Organization Structure</h1>
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

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="overflow-hidden rounded-xl glass-panel">
          <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-100">Departments</h2>
            <button
              onClick={openCreateDepartment}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200"
            >
              Create
            </button>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Parent</th>
                  <th className="px-4 py-3 text-left">Head</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : departments).map((department) => (
                  <tr key={department.id} className="border-t border-white/[0.07]">
                    <td className="px-4 py-3 text-slate-100">{department.name}</td>
                    <td className="px-4 py-3 text-slate-300">{department.code}</td>
                    <td className="px-4 py-3 text-slate-300">{department.parent_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{department.head_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditDepartment(department)}
                          className="text-xs text-emerald-300"
                          disabled={working}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteDeptTarget(department.id)}
                          className="text-xs text-rose-300"
                          disabled={working}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="overflow-hidden rounded-xl glass-panel">
          <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-100">Positions</h2>
            <button
              onClick={openCreatePosition}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200"
            >
              Create
            </button>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Headcount</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : positions).map((position) => (
                  <tr key={position.id} className="border-t border-white/[0.07]">
                    <td className="px-4 py-3 text-slate-100">{position.title}</td>
                    <td className="px-4 py-3 text-slate-300">{position.department_name}</td>
                    <td className="px-4 py-3 text-slate-300">{position.headcount}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditPosition(position)}
                          className="text-xs text-emerald-300"
                          disabled={working}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletePosTarget(position.id)}
                          className="text-xs text-rose-300"
                          disabled={working}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Org Chart Snapshot</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Parent ID</th>
                <th className="px-4 py-3 text-left">Head</th>
                <th className="px-4 py-3 text-left">Employees</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : orgChart).map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07]">
                  <td className="px-4 py-3 text-slate-100">{row.name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.parent_id ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{row.head || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{row.employee_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Vacancy Dashboard</h2>
        </header>
        <div className="space-y-3 border-b border-white/[0.07] px-4 py-3">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={vacancySearch}
              onChange={(event) => setVacancySearch(event.target.value)}
              placeholder="Search position/department..."
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <select
              value={selectedDepartmentFilter}
              onChange={(event) => setSelectedDepartmentFilter(event.target.value)}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="">All departments</option>
              {Array.from(new Set(positions.map((position) => position.department_name))).map((departmentName) => (
                <option key={departmentName} value={departmentName}>
                  {departmentName}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={minimumVacancyFilter}
              onChange={(event) => setMinimumVacancyFilter(event.target.value)}
              placeholder="Minimum vacancies"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <button
              onClick={() => exportVacanciesCsv(vacancyRows)}
              className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Headcount</th>
                <th className="px-4 py-3 text-left">Filled</th>
                <th className="px-4 py-3 text-left">Vacancies</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : vacancyRows).map((row) => (
                <tr key={row.positionId} className="border-t border-white/[0.07]">
                  <td className="px-4 py-3 text-slate-100">{row.position}</td>
                  <td className="px-4 py-3 text-slate-300">{row.department}</td>
                  <td className="px-4 py-3 text-slate-300">{row.headcount}</td>
                  <td className="px-4 py-3 text-slate-300">{row.filled}</td>
                  <td className="px-4 py-3 text-slate-300">{row.vacancies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalMode !== 'none' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-white/[0.07] bg-[#0d1421] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                {modalMode === 'createDepartment' && 'Create Department'}
                {modalMode === 'editDepartment' && 'Edit Department'}
                {modalMode === 'createPosition' && 'Create Position'}
                {modalMode === 'editPosition' && 'Edit Position'}
              </h2>
              <button onClick={closeModal} className="text-sm text-slate-400">
                Close
              </button>
            </div>

            {(modalMode === 'createDepartment' || modalMode === 'editDepartment') && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={departmentForm.name}
                  onChange={(event) => setDepartmentForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Department name"
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
                />
                <input
                  value={departmentForm.code}
                  onChange={(event) => setDepartmentForm((prev) => ({ ...prev, code: event.target.value }))}
                  placeholder="Code"
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
                />
                <select
                  value={departmentForm.parent}
                  onChange={(event) => setDepartmentForm((prev) => ({ ...prev, parent: event.target.value }))}
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
                >
                  <option value="">No parent</option>
                  {departments
                    .filter((department) => (departmentForm.id ? department.id !== departmentForm.id : true))
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
                <input
                  value={departmentForm.budget}
                  onChange={(event) => setDepartmentForm((prev) => ({ ...prev, budget: event.target.value }))}
                  placeholder="Budget (optional)"
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
                />
                <textarea
                  value={departmentForm.description}
                  onChange={(event) => setDepartmentForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description"
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
                />
                <button
                  onClick={() => void saveDepartment()}
                  disabled={working}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
                >
                  Save Department
                </button>
              </div>
            )}

            {(modalMode === 'createPosition' || modalMode === 'editPosition') && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={positionForm.title}
                  onChange={(event) => setPositionForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Position title"
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
                />
                <select
                  value={positionForm.department}
                  onChange={(event) => setPositionForm((prev) => ({ ...prev, department: event.target.value }))}
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={positionForm.headcount}
                  onChange={(event) => setPositionForm((prev) => ({ ...prev, headcount: event.target.value }))}
                  placeholder="Headcount"
                  className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void savePosition()}
                  disabled={working}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
                >
                  Save Position
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteDeptTarget !== null}
        title="Archive Department"
        description="Are you sure you want to archive this department?"
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={archiveDepartment}
        onCancel={() => {
          setDeleteDeptTarget(null)
          setDeleteError(null)
        }}
      />

      <ConfirmDialog
        open={deletePosTarget !== null}
        title="Archive Position"
        description="Are you sure you want to archive this position?"
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={archivePosition}
        onCancel={() => {
          setDeletePosTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
