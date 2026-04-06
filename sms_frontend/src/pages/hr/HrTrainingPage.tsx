import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type Employee = { id: number; employee_id: string; full_name: string }
type TrainingProgram = {
  id: number
  title: string
  trainer: string
  start_date: string | null
  end_date: string | null
  capacity: number
  cost: string | null
}
type TrainingEnrollment = {
  id: number
  program: number
  program_title: string
  employee: number
  employee_name: string
  status: string
  completion_date: string | null
}

const defaultProgramForm = {
  title: '',
  description: '',
  trainer: '',
  start_date: '',
  end_date: '',
  capacity: '0',
  cost: '',
}

const defaultEnrollmentForm = {
  program: '',
  employee: '',
  status: 'Enrolled',
  completion_date: '',
}

function asArray<T>(value: T[] | { results?: T[] }): T[] {
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

function statusBadgeClass(status: string) {
  if (status === 'Completed') return 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
  if (status === 'Attended') return 'border border-sky-500/30 bg-sky-500/15 text-sky-200'
  if (status === 'Cancelled') return 'border border-rose-500/30 bg-rose-500/15 text-rose-200'
  return 'border border-slate-600 bg-slate-800/70 text-slate-200'
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvRows = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function HrTrainingPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([])
  const [programForm, setProgramForm] = useState(defaultProgramForm)
  const [enrollmentForm, setEnrollmentForm] = useState(defaultEnrollmentForm)
  const [search, setSearch] = useState('')
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [empRes, programRes, enrollmentRes] = await Promise.all([
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
        apiClient.get<TrainingProgram[] | { results: TrainingProgram[] }>('/hr/training-programs/'),
        apiClient.get<TrainingEnrollment[] | { results: TrainingEnrollment[] }>('/hr/training-enrollments/'),
      ])
      const employeeRows = asArray(empRes.data)
      const programRows = asArray(programRes.data)
      setEmployees(employeeRows)
      setPrograms(programRows)
      setEnrollments(asArray(enrollmentRes.data))
      if (employeeRows.length > 0 || programRows.length > 0) {
        setEnrollmentForm((prev) => ({
          ...prev,
          employee: prev.employee || (employeeRows[0] ? String(employeeRows[0].id) : ''),
          program: prev.program || (programRows[0] ? String(programRows[0].id) : ''),
        }))
      }
    } catch {
      setError('Unable to load training data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase()
    return programs.filter((program) => {
      if (!query) return true
      return `${program.title} ${program.trainer}`.toLowerCase().includes(query)
    })
  }, [programs, search])

  const filteredEnrollments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return enrollments.filter((enrollment) => {
      const statusOk = enrollmentStatusFilter === 'All' || enrollment.status === enrollmentStatusFilter
      const searchOk = !query || `${enrollment.employee_name} ${enrollment.program_title}`.toLowerCase().includes(query)
      return statusOk && searchOk
    })
  }, [enrollments, search, enrollmentStatusFilter])

  const createProgram = async () => {
    if (!programForm.title.trim()) {
      setError('Program title is required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/training-programs/', {
        title: programForm.title.trim(),
        description: programForm.description,
        trainer: programForm.trainer,
        start_date: programForm.start_date || null,
        end_date: programForm.end_date || null,
        capacity: Number(programForm.capacity || '0'),
        cost: programForm.cost ? Number(programForm.cost) : null,
      })
      setProgramForm(defaultProgramForm)
      setNotice('Training program created.')
      await load()
    } catch {
      setError('Unable to create training program.')
    } finally {
      setWorking(false)
    }
  }

  const createEnrollment = async () => {
    if (!enrollmentForm.program || !enrollmentForm.employee) {
      setError('Program and employee are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/training-enrollments/', {
        program: Number(enrollmentForm.program),
        employee: Number(enrollmentForm.employee),
        status: enrollmentForm.status,
        completion_date: enrollmentForm.completion_date || null,
      })
      setEnrollmentForm((prev) => ({ ...defaultEnrollmentForm, employee: prev.employee, program: prev.program }))
      setNotice('Employee enrolled in training.')
      await load()
    } catch {
      setError('Unable to create enrollment.')
    } finally {
      setWorking(false)
    }
  }

  const exportPrograms = () =>
    downloadCsv(
      'hr_training_programs.csv',
      ['Title', 'Trainer', 'Start Date', 'End Date', 'Capacity', 'Cost'],
      filteredPrograms.map((program) => [program.title, program.trainer || '', program.start_date || '', program.end_date || '', String(program.capacity), program.cost || '']),
    )

  const exportEnrollments = () =>
    downloadCsv(
      'hr_training_enrollments.csv',
      ['Program', 'Employee', 'Status', 'Completion Date'],
      filteredEnrollments.map((enrollment) => [enrollment.program_title, enrollment.employee_name, enrollment.status, enrollment.completion_date || '']),
    )

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Training & CPD"
        subtitle="Continuing professional development records"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Training & Development</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Programs, Enrollment, Completion Tracking</h1>
      </section>
      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Programs</p><p className="mt-2 text-2xl font-semibold text-slate-100">{programs.length}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Enrollments</p><p className="mt-2 text-2xl font-semibold text-slate-100">{enrollments.length}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Completed</p><p className="mt-2 text-2xl font-semibold text-slate-100">{enrollments.filter((e) => e.status === 'Completed').length}</p></article>
        <article className="rounded-xl glass-panel p-4"><p className="text-xs text-slate-400">Pending/Active</p><p className="mt-2 text-2xl font-semibold text-slate-100">{enrollments.filter((e) => ['Enrolled', 'Attended'].includes(e.status)).length}</p></article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search programs or enrollments..." className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
          <button onClick={() => { setSearch(''); setEnrollmentStatusFilter('All') }} className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-200">Reset Filters</button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Program</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={programForm.title} onChange={(e) => setProgramForm((p) => ({ ...p, title: e.target.value }))} placeholder="Program title" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
            <input value={programForm.trainer} onChange={(e) => setProgramForm((p) => ({ ...p, trainer: e.target.value }))} placeholder="Trainer" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2" />
            <input type="date" value={programForm.start_date} onChange={(e) => setProgramForm((p) => ({ ...p, start_date: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <input type="date" value={programForm.end_date} onChange={(e) => setProgramForm((p) => ({ ...p, end_date: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <input type="number" min="0" value={programForm.capacity} onChange={(e) => setProgramForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Capacity" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <input type="number" min="0" step="0.01" value={programForm.cost} onChange={(e) => setProgramForm((p) => ({ ...p, cost: e.target.value }))} placeholder="Cost per participant" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createProgram} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60 sm:col-span-2">Save Program</button>
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Enroll Employee</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select value={enrollmentForm.program} onChange={(e) => setEnrollmentForm((p) => ({ ...p, program: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2">
              <option value="">Select program</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
            </select>
            <select value={enrollmentForm.employee} onChange={(e) => setEnrollmentForm((p) => ({ ...p, employee: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm sm:col-span-2">
              <option value="">Select employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_id} - {employee.full_name}</option>)}
            </select>
            <select value={enrollmentForm.status} onChange={(e) => setEnrollmentForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm">
              <option>Enrolled</option><option>Attended</option><option>Completed</option><option>Cancelled</option>
            </select>
            <input type="date" value={enrollmentForm.completion_date} onChange={(e) => setEnrollmentForm((p) => ({ ...p, completion_date: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" />
            <button onClick={createEnrollment} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60 sm:col-span-2">Save Enrollment</button>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Training Programs</h2>
            <button onClick={exportPrograms} className="rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200">Export</button>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {filteredPrograms.map((program) => (
              <div key={program.id} className="rounded-lg border border-white/[0.07] px-3 py-2">
                <p className="font-semibold text-slate-100">{program.title}</p>
                <p>Trainer: {program.trainer || '-'} | Capacity: {program.capacity}</p>
                <p>{program.start_date || '-'} to {program.end_date || '-'}</p>
              </div>
            ))}
            {!loading && filteredPrograms.length === 0 ? <p className="text-slate-400">No programs match filters.</p> : null}
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Enrollments</h2>
            <div className="flex items-center gap-2">
              <select value={enrollmentStatusFilter} onChange={(e) => setEnrollmentStatusFilter(e.target.value)} className="rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1 text-xs">
                <option>All</option><option>Enrolled</option><option>Attended</option><option>Completed</option><option>Cancelled</option>
              </select>
              <button onClick={exportEnrollments} className="rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200">Export</button>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {filteredEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-lg border border-white/[0.07] px-3 py-2">
                <p className="font-semibold text-slate-100">{enrollment.employee_name}</p>
                <p>{enrollment.program_title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] ${statusBadgeClass(enrollment.status)}`}>{enrollment.status}</span>
                  <span>{enrollment.completion_date ? `Completed: ${enrollment.completion_date}` : 'Completion date pending'}</span>
                </div>
              </div>
            ))}
            {!loading && filteredEnrollments.length === 0 ? <p className="text-slate-400">No enrollments match filters.</p> : null}
          </div>
        </article>
      </section>
    </div>
  )
}
