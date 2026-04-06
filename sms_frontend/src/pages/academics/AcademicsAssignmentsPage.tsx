import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import PageHero from '../../components/PageHero'

type Subject = { id: number; name: string; code: string }
type SchoolClass = { id: number; display_name?: string; name: string }
type Student = { id: number; first_name: string; last_name: string; admission_number: string }
type Assignment = {
  id: number
  title: string
  subject: number
  subject_name?: string
  class_section: number
  class_section_name?: string
  due_date: string
  status: 'Draft' | 'Published' | 'Closed' | 'Graded'
  max_score?: string | null
}
type Submission = {
  id: number
  assignment: number
  student: number
  student_name?: string
  submitted_at: string
  is_late: boolean
  score?: string | null
  feedback?: string
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

export default function AcademicsAssignmentsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    subject: '',
    class_section: '',
    description: '',
    due_date: '',
    max_score: '',
    publish_date: '',
    status: 'Draft',
    is_active: true,
  })
  const [submissionForm, setSubmissionForm] = useState({
    assignment: '',
    student: '',
    notes: '',
  })
  const [gradeForm, setGradeForm] = useState<Record<number, { score: string; feedback: string }>>({})

  const selectedAssignment = useMemo(
    () => assignments.find((item) => String(item.id) === String(selectedAssignmentId)),
    [assignments, selectedAssignmentId],
  )

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [subjectRes, classRes, studentRes, assignmentRes] = await Promise.all([
        apiClient.get('/academics/subjects/'),
        apiClient.get('/academics/classes/'),
        apiClient.get('/students/'),
        apiClient.get('/academics/assignments/'),
      ])
      setSubjects(normalizePaginatedResponse<Subject>(subjectRes.data).items)
      setClasses(normalizePaginatedResponse<SchoolClass>(classRes.data).items)
      setStudents(normalizePaginatedResponse<Student>(studentRes.data).items)
      const assignmentItems = normalizePaginatedResponse<Assignment>(assignmentRes.data).items
      setAssignments(assignmentItems)
      if (!selectedAssignmentId && assignmentItems.length > 0) {
        setSelectedAssignmentId(String(assignmentItems[0].id))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubmissions = async (assignmentId: string) => {
    if (!assignmentId) {
      setSubmissions([])
      return
    }
    try {
      const res = await apiClient.get(`/academics/assignments/${assignmentId}/submissions/`)
      setSubmissions(normalizePaginatedResponse<Submission>(res.data).items)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    void loadSubmissions(selectedAssignmentId)
  }, [selectedAssignmentId])

  const formatDT = (v: string) => v ? (v.length === 16 ? `${v}:00` : v) : null

  const createAssignment = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/assignments/', {
        title: assignmentForm.title,
        subject: Number(assignmentForm.subject),
        class_section: Number(assignmentForm.class_section),
        description: assignmentForm.description,
        due_date: formatDT(assignmentForm.due_date),
        max_score: assignmentForm.max_score ? Number(assignmentForm.max_score) : null,
        publish_date: formatDT(assignmentForm.publish_date),
        status: assignmentForm.status,
        is_active: assignmentForm.is_active,
      })
      setAssignmentForm({
        title: '',
        subject: '',
        class_section: '',
        description: '',
        due_date: '',
        max_score: '',
        publish_date: '',
        status: 'Draft',
        is_active: true,
      })
      setFlash('Assignment created.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitWork = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFlash(null)
    try {
      await apiClient.post('/academics/submissions/', {
        assignment: Number(submissionForm.assignment),
        student: Number(submissionForm.student),
        notes: submissionForm.notes,
      })
      setSubmissionForm({ assignment: '', student: '', notes: '' })
      setFlash('Submission saved.')
      if (selectedAssignmentId) await loadSubmissions(selectedAssignmentId)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const gradeSubmission = async (submissionId: number) => {
    const payload = gradeForm[submissionId]
    if (!payload?.score) return
    setError(null)
    setFlash(null)
    try {
      await apiClient.patch(`/academics/submissions/${submissionId}/grade/`, {
        score: Number(payload.score),
        feedback: payload.feedback,
      })
      setFlash('Submission graded.')
      if (selectedAssignmentId) await loadSubmissions(selectedAssignmentId)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="ACADEMICS"
        badgeColor="blue"
        title="Homework & Assignments"
        subtitle="Create assignments, track submissions, and grade student work."
        icon="📖"
      />

      {isLoading ? <div className="col-span-12 rounded-2xl glass-panel p-4 text-sm text-slate-300">Loading assignments...</div> : null}
      {error ? <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div> : null}
      {flash ? <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">{flash}</div> : null}

      <section className="col-span-12 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Create Assignment</h2>
          <form className="mt-4 grid gap-3" onSubmit={createAssignment}>
            <input className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Title" value={assignmentForm.title} onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.subject} onChange={(e) => setAssignmentForm((p) => ({ ...p, subject: e.target.value }))} required>
                <option value="">Subject</option>
                {subjects.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
              </select>
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.class_section} onChange={(e) => setAssignmentForm((p) => ({ ...p, class_section: e.target.value }))} required>
                <option value="">Class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>)}
              </select>
            </div>
            <textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Instructions" value={assignmentForm.description} onChange={(e) => setAssignmentForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="datetime-local" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.due_date} onChange={(e) => setAssignmentForm((p) => ({ ...p, due_date: e.target.value }))} required />
              <input type="number" className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Max score" value={assignmentForm.max_score} onChange={(e) => setAssignmentForm((p) => ({ ...p, max_score: e.target.value }))} />
              <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={assignmentForm.status} onChange={(e) => setAssignmentForm((p) => ({ ...p, status: e.target.value }))}>
                {['Draft', 'Published', 'Closed', 'Graded'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Create</button>
          </form>
        </div>

        <div className="rounded-2xl glass-panel p-6">
          <h2 className="text-lg font-display font-semibold">Submit Work</h2>
          <form className="mt-4 grid gap-3" onSubmit={submitWork}>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={submissionForm.assignment} onChange={(e) => setSubmissionForm((p) => ({ ...p, assignment: e.target.value }))} required>
              <option value="">Assignment</option>
              {assignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={submissionForm.student} onChange={(e) => setSubmissionForm((p) => ({ ...p, student: e.target.value }))} required>
              <option value="">Student</option>
              {students.map((item) => <option key={item.id} value={item.id}>{item.admission_number} - {item.first_name} {item.last_name}</option>)}
            </select>
            <textarea className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" placeholder="Submission notes" value={submissionForm.notes} onChange={(e) => setSubmissionForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit" className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900">Submit</button>
          </form>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-display font-semibold">Assignments</h2>
          <select className="rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm" value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
            <option value="">Select assignment</option>
            {assignments.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.status})</option>)}
          </select>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Due Date</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {assignments.map((item) => (
                <tr key={item.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{item.title}</td>
                  <td className="px-3 py-2">{item.subject_name}</td>
                  <td className="px-3 py-2">{item.class_section_name}</td>
                  <td className="px-3 py-2">{new Date(item.due_date).toLocaleString()}</td>
                  <td className="px-3 py-2">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <h2 className="text-lg font-display font-semibold">Submissions {selectedAssignment ? `for ${selectedAssignment.title}` : ''}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Submitted</th>
                <th className="px-3 py-2 text-left">Late</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Feedback</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {submissions.map((item) => (
                <tr key={item.id} className="bg-slate-950/50">
                  <td className="px-3 py-2">{item.student_name}</td>
                  <td className="px-3 py-2">{new Date(item.submitted_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{item.is_late ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1 text-sm"
                      value={gradeForm[item.id]?.score ?? item.score ?? ''}
                      onChange={(e) =>
                        setGradeForm((p) => ({
                          ...p,
                          [item.id]: { score: e.target.value, feedback: p[item.id]?.feedback ?? item.feedback ?? '' },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-64 rounded-lg border border-white/[0.09] bg-slate-950 px-2 py-1 text-sm"
                      value={gradeForm[item.id]?.feedback ?? item.feedback ?? ''}
                      onChange={(e) =>
                        setGradeForm((p) => ({
                          ...p,
                          [item.id]: { score: p[item.id]?.score ?? item.score ?? '', feedback: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button className="rounded-lg border border-white/[0.09] px-2 py-1 text-xs" onClick={() => gradeSubmission(item.id)}>
                      Grade
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                    No submissions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
