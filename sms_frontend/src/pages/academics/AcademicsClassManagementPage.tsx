import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

type Enrollment = {
  id: number
  student: number
  student_name?: string
  school_class: number
  class_section_name?: string
  term: number
  term_name?: string
  status: 'Active' | 'Completed' | 'Withdrawn' | 'Transferred'
  is_active: boolean
  enrollment_date: string
  left_date?: string | null
}

type TeacherAssignment = {
  id: number
  teacher: number
  teacher_name?: string
  subject: number
  subject_name?: string
  class_section: number
  class_section_name?: string
  academic_year: number
  academic_year_name?: string
  term?: number | null
  term_name?: string
  is_primary: boolean
  is_active: boolean
}

type Student = { id: number; first_name: string; last_name: string; admission_number: string }
type SchoolClass = { id: number; display_name?: string; name: string }
type Term = { id: number; name: string; academic_year_id?: number }
type AcademicYear = { id: number; name: string }
type Subject = { id: number; name: string; code: string }
type Staff = { id: number; first_name: string; last_name: string }

function getErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data) return 'Request failed.'
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const messages: string[] = []
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if (Array.isArray(value)) messages.push(`${key}: ${value.join(' ')}`)
      else if (typeof value === 'string') messages.push(`${key}: ${value}`)
    })
    if (messages.length > 0) return messages.join(' | ')
  }
  return 'Request failed.'
}

export default function AcademicsClassManagementPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [enrollmentForm, setEnrollmentForm] = useState({
    student: '',
    school_class: '',
    term: '',
    status: 'Active' as Enrollment['status'],
    is_active: true,
  })
  const [assignmentForm, setAssignmentForm] = useState({
    teacher: '',
    subject: '',
    class_section: '',
    academic_year: '',
    term: '',
    is_primary: true,
    is_active: true,
  })
  const [promotionForm, setPromotionForm] = useState({
    from_academic_year: '',
    to_academic_year: '',
    from_term: '',
    to_term: '',
  })

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [
        enrollmentsRes,
        assignmentsRes,
        studentsRes,
        classesRes,
        termsRes,
        yearsRes,
        subjectsRes,
        staffRes,
      ] = await Promise.all([
        apiClient.get('/academics/enrollments/'),
        apiClient.get('/academics/teacher-assignments/'),
        apiClient.get('/students/'),
        apiClient.get('/academics/classes/'),
        apiClient.get('/academics/ref/terms/'),
        apiClient.get('/academics/ref/academic-years/'),
        apiClient.get('/academics/subjects/'),
        apiClient.get('/hr/staff/'),
      ])
      setEnrollments(normalizePaginatedResponse<Enrollment>(enrollmentsRes.data).items)
      setAssignments(normalizePaginatedResponse<TeacherAssignment>(assignmentsRes.data).items)
      setStudents(normalizePaginatedResponse<Student>(studentsRes.data).items)
      setClasses(normalizePaginatedResponse<SchoolClass>(classesRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(termsRes.data).items)
      setYears(normalizePaginatedResponse<AcademicYear>(yearsRes.data).items)
      setSubjects(normalizePaginatedResponse<Subject>(subjectsRes.data).items)
      setStaff(normalizePaginatedResponse<Staff>(staffRes.data).items)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const submitEnrollment = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/enrollments/', {
        student: Number(enrollmentForm.student),
        school_class: Number(enrollmentForm.school_class),
        term: Number(enrollmentForm.term),
        status: enrollmentForm.status,
        is_active: enrollmentForm.is_active,
      })
      setEnrollmentForm({ student: '', school_class: '', term: '', status: 'Active', is_active: true })
      setFlash('Enrollment created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitAssignment = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/teacher-assignments/', {
        teacher: Number(assignmentForm.teacher),
        subject: Number(assignmentForm.subject),
        class_section: Number(assignmentForm.class_section),
        academic_year: Number(assignmentForm.academic_year),
        term: assignmentForm.term ? Number(assignmentForm.term) : null,
        is_primary: assignmentForm.is_primary,
        is_active: assignmentForm.is_active,
      })
      setAssignmentForm({
        teacher: '',
        subject: '',
        class_section: '',
        academic_year: '',
        term: '',
        is_primary: true,
        is_active: true,
      })
      setFlash('Teacher assignment created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitBulkPromote = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      const response = await apiClient.post('/academics/enrollments/bulk-promote/', {
        from_academic_year: Number(promotionForm.from_academic_year),
        to_academic_year: Number(promotionForm.to_academic_year),
        from_term: Number(promotionForm.from_term),
        to_term: Number(promotionForm.to_term),
      })
      setFlash(
        `Bulk promote done. Promoted: ${response.data?.promoted ?? 0}, skipped: ${response.data?.skipped ?? 0}.`,
      )
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const removeAssignment = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/academics/teacher-assignments/${deleteTarget}/`)
      setFlash('Teacher assignment removed.')
      setDeleteTarget(null)
      await loadAll()
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const sortedEnrollments = useMemo(() => [...enrollments].sort((a, b) => b.id - a.id), [enrollments])
  const sortedAssignments = useMemo(() => [...assignments].sort((a, b) => b.id - a.id), [assignments])

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="blue"
        title="Class Management"
        subtitle="Manage class enrollments, teacher-subject assignments, and bulk promotion."
        icon="📖"
      />

      {isLoading ? <div className="col-span-12 rounded-2xl glass-panel p-4 text-sm text-slate-300">Loading class management...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}
      {flash ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">{flash}</div> : null}

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Enroll Student</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitEnrollment}>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={enrollmentForm.student} onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, student: e.target.value }))} required>
              <option value="">Select student</option>
              {students.map((item) => <option key={item.id} value={item.id}>{item.admission_number} - {item.first_name} {item.last_name}</option>)}
            </select>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={enrollmentForm.school_class} onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, school_class: e.target.value }))} required>
              <option value="">Select class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>)}
            </select>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={enrollmentForm.term} onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, term: e.target.value }))} required>
              <option value="">Select term</option>
              {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" type="submit">Enroll</button>
          </form>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Bulk Promote</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitBulkPromote}>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={promotionForm.from_academic_year} onChange={(e) => setPromotionForm((prev) => ({ ...prev, from_academic_year: e.target.value }))} required>
                <option value="">From year</option>
                {years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={promotionForm.to_academic_year} onChange={(e) => setPromotionForm((prev) => ({ ...prev, to_academic_year: e.target.value }))} required>
                <option value="">To year</option>
                {years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={promotionForm.from_term} onChange={(e) => setPromotionForm((prev) => ({ ...prev, from_term: e.target.value }))} required>
                <option value="">From term</option>
                {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={promotionForm.to_term} onChange={(e) => setPromotionForm((prev) => ({ ...prev, to_term: e.target.value }))} required>
                <option value="">To term</option>
                {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" type="submit">Run bulk promote</button>
          </form>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Enrollments</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Enrolled</th><th className="px-3 py-2 text-left">Left</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {sortedEnrollments.map((item) => (
                <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.student_name}</td><td className="px-3 py-2">{item.class_section_name}</td><td className="px-3 py-2">{item.term_name}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{item.enrollment_date}</td><td className="px-3 py-2">{item.left_date || '--'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Teacher Assignment</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitAssignment}>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.teacher} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, teacher: e.target.value }))} required>
              <option value="">Select teacher</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.first_name} {item.last_name}</option>)}
            </select>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.subject} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, subject: e.target.value }))} required>
              <option value="">Select subject</option>
              {subjects.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
            </select>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.class_section} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, class_section: e.target.value }))} required>
              <option value="">Select class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.academic_year} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, academic_year: e.target.value }))} required>
                <option value="">Academic year</option>
                {years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.term} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, term: e.target.value }))}>
                <option value="">Full year (no term)</option>
                {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={assignmentForm.is_primary} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, is_primary: e.target.checked }))} />Primary teacher</label>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" type="submit">Assign teacher</button>
          </form>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Teacher Assignments</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Teacher</th><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Year</th><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {sortedAssignments.map((item) => (
                  <tr key={item.id} className="bg-slate-950/50">
                    <td className="px-3 py-2">{item.teacher_name}</td>
                    <td className="px-3 py-2">{item.subject_name}</td>
                    <td className="px-3 py-2">{item.class_section_name}</td>
                    <td className="px-3 py-2">{item.academic_year_name}</td>
                    <td className="px-3 py-2">{item.term_name || 'Full year'}</td>
                    <td className="px-3 py-2"><button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => setDeleteTarget(item.id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove Teacher Assignment"
        description="Are you sure you want to remove this teacher assignment? This action cannot be undone."
        confirmLabel="Remove"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={removeAssignment}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
