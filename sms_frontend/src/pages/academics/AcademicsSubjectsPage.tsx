import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type Department = {
  id: number
  name: string
  description?: string
  is_active: boolean
}

type Subject = {
  id: number
  name: string
  code: string
  department?: number | null
  department_name?: string
  subject_type: 'Compulsory' | 'Elective'
  periods_week: number
  is_active: boolean
}

type SubjectMapping = {
  id: number
  subject: number
  subject_name?: string
  subject_code?: string
  grade_level: number
  grade_level_name?: string
  academic_year: number
  academic_year_name?: string
  is_compulsory: boolean
  is_active: boolean
}

type SyllabusTopic = {
  id: number
  subject: number
  subject_name?: string
  grade_level: number
  grade_level_name?: string
  term: number
  term_name?: string
  topic_name: string
  order: number
  is_completed: boolean
  completed_date?: string | null
}

type AcademicYear = { id: number; name: string }
type GradeLevel = { id: number; name: string }
type Term = { id: number; name: string; academic_year_id?: number }

type SyllabusProgress = {
  subject_id: number
  subject_name: string
  grade_level_name: string
  term_name: string
  total_topics: number
  completed_topics: number
  completion_percent: number
}

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

export default function AcademicsSubjectsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [mappings, setMappings] = useState<SubjectMapping[]>([])
  const [topics, setTopics] = useState<SyllabusTopic[]>([])
  const [progress, setProgress] = useState<SyllabusProgress[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [grades, setGrades] = useState<GradeLevel[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '', is_active: true })
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    department: '',
    subject_type: 'Compulsory' as 'Compulsory' | 'Elective',
    periods_week: 4,
    is_active: true,
  })
  const [mappingForm, setMappingForm] = useState({
    subject: '',
    grade_level: '',
    academic_year: '',
    is_compulsory: true,
    is_active: true,
  })
  const [topicForm, setTopicForm] = useState({
    subject: '',
    grade_level: '',
    term: '',
    topic_name: '',
    order: 1,
    is_active: true,
  })

  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name)),
    [departments],
  )
  const sortedSubjects = useMemo(() => [...subjects].sort((a, b) => a.name.localeCompare(b.name)), [subjects])
  const sortedMappings = useMemo(() => [...mappings].sort((a, b) => a.id - b.id), [mappings])
  const sortedTopics = useMemo(() => [...topics].sort((a, b) => a.order - b.order || a.id - b.id), [topics])

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [depRes, subRes, mapRes, topicRes, progressRes, yearRes, gradeRes, termRes] = await Promise.all([
        apiClient.get('/academics/departments/'),
        apiClient.get('/academics/subjects/'),
        apiClient.get('/academics/subject-mappings/'),
        apiClient.get('/academics/syllabus/'),
        apiClient.get('/academics/syllabus/progress/'),
        apiClient.get('/academics/ref/academic-years/'),
        apiClient.get('/academics/grade-levels/'),
        apiClient.get('/academics/ref/terms/'),
      ])
      setDepartments(normalizePaginatedResponse<Department>(depRes.data).items)
      setSubjects(normalizePaginatedResponse<Subject>(subRes.data).items)
      setMappings(normalizePaginatedResponse<SubjectMapping>(mapRes.data).items)
      setTopics(normalizePaginatedResponse<SyllabusTopic>(topicRes.data).items)
      setProgress(Array.isArray(progressRes.data) ? progressRes.data : [])
      setYears(normalizePaginatedResponse<AcademicYear>(yearRes.data).items)
      setGrades(normalizePaginatedResponse<GradeLevel>(gradeRes.data).items)
      setTerms(normalizePaginatedResponse<Term>(termRes.data).items)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const submitDepartment = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/departments/', departmentForm)
      setDepartmentForm({ name: '', description: '', is_active: true })
      setFlash('Department created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitSubject = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/subjects/', {
        ...subjectForm,
        department: subjectForm.department ? Number(subjectForm.department) : null,
        periods_week: Number(subjectForm.periods_week),
      })
      setSubjectForm({
        name: '',
        code: '',
        department: '',
        subject_type: 'Compulsory',
        periods_week: 4,
        is_active: true,
      })
      setFlash('Subject created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitMapping = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/subject-mappings/', {
        subject: Number(mappingForm.subject),
        grade_level: Number(mappingForm.grade_level),
        academic_year: Number(mappingForm.academic_year),
        is_compulsory: mappingForm.is_compulsory,
        is_active: mappingForm.is_active,
      })
      setMappingForm({
        subject: '',
        grade_level: '',
        academic_year: '',
        is_compulsory: true,
        is_active: true,
      })
      setFlash('Subject mapping created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitTopic = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/syllabus/', {
        subject: Number(topicForm.subject),
        grade_level: Number(topicForm.grade_level),
        term: Number(topicForm.term),
        topic_name: topicForm.topic_name,
        order: Number(topicForm.order),
        is_active: topicForm.is_active,
      })
      setTopicForm({
        subject: '',
        grade_level: '',
        term: '',
        topic_name: '',
        order: 1,
        is_active: true,
      })
      setFlash('Syllabus topic created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const markComplete = async (topicId: number) => {
    setError(null)
    setFlash(null)
    try {
      await apiClient.patch(`/academics/syllabus/${topicId}/complete/`, {})
      setFlash('Topic marked as completed.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="blue"
        title="Subjects & Curriculum"
        subtitle="Manage departments, subjects, grade mappings, and syllabus completion."
        icon="📖"
      />

      {isLoading ? <div className="col-span-12 rounded-2xl glass-panel p-4 text-sm text-slate-300">Loading subjects and curriculum...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}
      {flash ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">{flash}</div> : null}

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Departments</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitDepartment}>
            <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Department name" value={departmentForm.name} onChange={(e) => setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Description" value={departmentForm.description} onChange={(e) => setDepartmentForm((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" type="submit">Create department</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Description</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {sortedDepartments.map((item) => (
                  <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.description || '--'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Subjects</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitSubject}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Subject name" value={subjectForm.name} onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))} required />
              <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Code" value={subjectForm.code} onChange={(e) => setSubjectForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={subjectForm.department} onChange={(e) => setSubjectForm((prev) => ({ ...prev, department: e.target.value }))}>
                <option value="">No department</option>
                {sortedDepartments.map((dep) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={subjectForm.subject_type} onChange={(e) => setSubjectForm((prev) => ({ ...prev, subject_type: e.target.value as 'Compulsory' | 'Elective' }))}>
                <option value="Compulsory">Compulsory</option>
                <option value="Elective">Elective</option>
              </select>
              <input type="number" min={0} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Periods/week" value={subjectForm.periods_week} onChange={(e) => setSubjectForm((prev) => ({ ...prev, periods_week: Number(e.target.value) }))} />
            </div>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" type="submit">Create subject</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Department</th><th className="px-3 py-2 text-left">Type</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {sortedSubjects.map((item) => (
                  <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.code}</td><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.department_name || '--'}</td><td className="px-3 py-2">{item.subject_type}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Subject Mappings</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitMapping}>
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={mappingForm.subject} onChange={(e) => setMappingForm((prev) => ({ ...prev, subject: e.target.value }))} required>
                <option value="">Select subject</option>
                {sortedSubjects.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={mappingForm.grade_level} onChange={(e) => setMappingForm((prev) => ({ ...prev, grade_level: e.target.value }))} required>
                <option value="">Select grade</option>
                {grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={mappingForm.academic_year} onChange={(e) => setMappingForm((prev) => ({ ...prev, academic_year: e.target.value }))} required>
                <option value="">Select year</option>
                {years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={mappingForm.is_compulsory} onChange={(e) => setMappingForm((prev) => ({ ...prev, is_compulsory: e.target.checked }))} />Compulsory in this grade</label>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" type="submit">Create mapping</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[540px] text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Grade</th><th className="px-3 py-2 text-left">Year</th><th className="px-3 py-2 text-left">Compulsory</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {sortedMappings.map((item) => (
                  <tr key={item.id} className="bg-slate-950/50"><td className="px-3 py-2">{item.subject_code} - {item.subject_name}</td><td className="px-3 py-2">{item.grade_level_name}</td><td className="px-3 py-2">{item.academic_year_name}</td><td className="px-3 py-2">{item.is_compulsory ? 'Yes' : 'No'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Syllabus Topics</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitTopic}>
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={topicForm.subject} onChange={(e) => setTopicForm((prev) => ({ ...prev, subject: e.target.value }))} required>
                <option value="">Select subject</option>
                {sortedSubjects.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={topicForm.grade_level} onChange={(e) => setTopicForm((prev) => ({ ...prev, grade_level: e.target.value }))} required>
                <option value="">Select grade</option>
                {grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={topicForm.term} onChange={(e) => setTopicForm((prev) => ({ ...prev, term: e.target.value }))} required>
                <option value="">Select term</option>
                {terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Topic name" value={topicForm.topic_name} onChange={(e) => setTopicForm((prev) => ({ ...prev, topic_name: e.target.value }))} required />
              <input type="number" min={1} className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Order" value={topicForm.order} onChange={(e) => setTopicForm((prev) => ({ ...prev, order: Number(e.target.value) }))} required />
            </div>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" type="submit">Create topic</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Topic</th><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Grade</th><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-left">Done</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {sortedTopics.map((item) => (
                  <tr key={item.id} className="bg-slate-950/50">
                    <td className="px-3 py-2">{item.order}. {item.topic_name}</td>
                    <td className="px-3 py-2">{item.subject_name}</td>
                    <td className="px-3 py-2">{item.grade_level_name}</td>
                    <td className="px-3 py-2">{item.term_name}</td>
                    <td className="px-3 py-2">{item.is_completed ? `Yes (${item.completed_date || ''})` : 'No'}</td>
                    <td className="px-3 py-2">
                      <button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs disabled:opacity-60" onClick={() => markComplete(item.id)} disabled={item.is_completed}>Mark complete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Syllabus Progress</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 text-left">Subject</th><th className="px-3 py-2 text-left">Grade</th><th className="px-3 py-2 text-left">Term</th><th className="px-3 py-2 text-left">Completed</th><th className="px-3 py-2 text-left">Total</th><th className="px-3 py-2 text-left">Progress</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {progress.map((item) => (
                <tr key={`${item.subject_id}-${item.grade_level_name}-${item.term_name}`} className="bg-slate-950/50">
                  <td className="px-3 py-2">{item.subject_name}</td>
                  <td className="px-3 py-2">{item.grade_level_name}</td>
                  <td className="px-3 py-2">{item.term_name}</td>
                  <td className="px-3 py-2">{item.completed_topics}</td>
                  <td className="px-3 py-2">{item.total_topics}</td>
                  <td className="px-3 py-2">{item.completion_percent}%</td>
                </tr>
              ))}
              {progress.length === 0 ? (
                <tr className="bg-slate-950/50"><td className="px-3 py-3 text-slate-400" colSpan={6}>No progress data yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
