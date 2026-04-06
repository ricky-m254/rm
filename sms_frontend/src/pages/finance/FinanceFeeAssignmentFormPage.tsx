import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse, type PaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage, mapApiFieldErrors } from '../../utils/forms'
import BackButton from '../../components/BackButton'
import PageHero from '../../components/PageHero'

type FeeStructure = { id: number; name: string; amount?: number }
type FinanceStudent = { id: number; admission_number: string; first_name: string; last_name: string }
type Guardian = { id: number; name: string; relationship?: string; phone?: string; email?: string; is_active?: boolean }
type StudentDetail = FinanceStudent & { guardians?: Guardian[]; gender?: string; is_active?: boolean }
type EnrollmentRef = { id: number; student: number; class_name?: string; term_name?: string; school_class?: number; term?: number; is_active?: boolean }
type ClassRef = { id: number; name: string; stream: string; student_count: number }
type Term = { id: number; name: string }

type FeeAssignment = {
  id: number; student: number; fee_structure: number; discount_amount: number
  is_active: boolean; start_date?: string; end_date?: string
}

type Mode = 'student' | 'class'

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <label className="block text-sm">
    {label}
    {children}
    {error ? <p className="mt-1 text-xs text-rose-300">{error}</p> : null}
  </label>
)

export default function FinanceFeeAssignmentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [mode, setMode] = useState<Mode>(isEdit ? 'student' : 'student')
  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [classes, setClasses] = useState<ClassRef[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [studentEnrollment, setStudentEnrollment] = useState<EnrollmentRef | null>(null)
  const [studentInfoNotice, setStudentInfoNotice] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ message: string; created: number; updated: number; student_count: number } | null>(null)

  const [formState, setFormState] = useState({
    student: '', fee_structure: '', discount_amount: '', start_date: '', end_date: '', is_active: true,
  })
  const [classForm, setClassForm] = useState({
    class_id: '', fee_structure_id: '', term_id: '', discount_amount: '',
  })

  const isFormDisabled = isSubmitting || isLoading

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const [studentRes, feeRes, classRes, termRes] = await Promise.all([
          apiClient.get<FinanceStudent[] | PaginatedResponse<FinanceStudent>>('/finance/ref/students/'),
          apiClient.get<FeeStructure[] | PaginatedResponse<FeeStructure>>('/finance/fees/'),
          apiClient.get<ClassRef[]>('/finance/ref/classes/'),
          apiClient.get<Term[] | PaginatedResponse<Term>>('/finance/terms/'),
        ])
        if (!isMounted) return
        setStudents(normalizePaginatedResponse(studentRes.data).items)
        setFees(normalizePaginatedResponse(feeRes.data).items)
        setClasses(Array.isArray(classRes.data) ? classRes.data : [])
        setTerms(normalizePaginatedResponse(termRes.data).items)

        if (isEdit && id) {
          const assignmentRes = await apiClient.get<FeeAssignment>(`/finance/fee-assignments/${id}/`)
          if (isMounted) {
            setFormState({
              student: String(assignmentRes.data.student),
              fee_structure: String(assignmentRes.data.fee_structure),
              discount_amount: String(assignmentRes.data.discount_amount ?? 0),
              start_date: assignmentRes.data.start_date ?? '',
              end_date: assignmentRes.data.end_date ?? '',
              is_active: assignmentRes.data.is_active,
            })
          }
        }
      } catch (err) {
        if (isMounted) setFormError(extractApiErrorMessage(err, 'Unable to load data.'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [id, isEdit])

  useEffect(() => {
    if (!formState.student) { setStudentDetail(null); setStudentEnrollment(null); setStudentInfoNotice(null); return }
    let isMounted = true
    const load = async () => {
      try {
        const [detailRes, enrollmentRes] = await Promise.all([
          apiClient.get<StudentDetail>(`/students/${formState.student}/`),
          apiClient.get<EnrollmentRef[] | PaginatedResponse<EnrollmentRef>>('/finance/ref/enrollments/', { params: { student_id: formState.student, active: true } }),
        ])
        if (!isMounted) return
        setStudentDetail(detailRes.data)
        setStudentEnrollment(normalizePaginatedResponse(enrollmentRes.data).items[0] ?? null)
        setStudentInfoNotice(null)
      } catch {
        if (!isMounted) return
        setStudentDetail(null); setStudentEnrollment(null)
        setStudentInfoNotice('Student class/contact info not available.')
      }
    }
    load()
    return () => { isMounted = false }
  }, [formState.student])

  const selectedClass = classes.find(c => String(c.id) === classForm.class_id)

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null); setFieldErrors({})
    const errs: Record<string, string> = {}
    if (!formState.student) errs.student = 'Select a student.'
    if (!formState.fee_structure) errs.fee_structure = 'Select a fee structure.'
    const disc = Number(formState.discount_amount)
    if (formState.discount_amount && (isNaN(disc) || disc < 0)) errs.discount_amount = 'Enter a valid discount amount.'
    if (formState.start_date && formState.end_date && formState.end_date < formState.start_date) errs.end_date = 'End date cannot be before start date.'
    if (Object.keys(errs).length) { setFieldErrors(errs); setFormError('Please correct the highlighted fields.'); return }

    const payload = {
      student: Number(formState.student),
      fee_structure: Number(formState.fee_structure),
      discount_amount: Number(formState.discount_amount || 0),
      start_date: formState.start_date || undefined,
      end_date: formState.end_date || undefined,
      is_active: formState.is_active,
    }
    setIsSubmitting(true)
    try {
      if (isEdit && id) await apiClient.patch(`/finance/fee-assignments/${id}/`, payload)
      else await apiClient.post('/finance/fee-assignments/', payload)
      navigate('/modules/finance/fee-assignments', { state: { flash: isEdit ? 'Fee assignment updated.' : 'Fee assignment created.' } })
    } catch (err) {
      const nextErrors = mapApiFieldErrors(err, ['student', 'fee_structure', 'discount_amount', 'start_date', 'end_date', 'is_active'])
      if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); setFormError(extractApiErrorMessage(err, 'Please correct the highlighted fields.')); return }
      setFormError(extractApiErrorMessage(err, 'Unable to save fee assignment.'))
    } finally { setIsSubmitting(false) }
  }

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null); setFieldErrors({}); setBulkResult(null)
    const errs: Record<string, string> = {}
    if (!classForm.class_id) errs.class_id = 'Select a class.'
    if (!classForm.fee_structure_id) errs.fee_structure_id = 'Select a fee structure.'
    if (Object.keys(errs).length) { setFieldErrors(errs); setFormError('Please correct the highlighted fields.'); return }
    setIsSubmitting(true)
    try {
      const res = await apiClient.post<{ message: string; created: number; updated: number; student_count: number }>(
        '/finance/fee-assignments/by-class/',
        { class_id: Number(classForm.class_id), fee_structure_id: Number(classForm.fee_structure_id), term_id: classForm.term_id ? Number(classForm.term_id) : undefined, discount_amount: Number(classForm.discount_amount || 0) }
      )
      setBulkResult(res.data)
    } catch (err) {
      setFormError(extractApiErrorMessage(err, 'Failed to assign fees by class.'))
    } finally { setIsSubmitting(false) }
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400'

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Fee Assignment"
        subtitle="Assign fee structures to student groups"
        icon="💰"
      />
      <div className="col-span-12">
        <BackButton to="/modules/finance/fee-assignments" label="Back to Fee Assignments" />
      </div>

      {!isEdit && (
        <div className="col-span-12 flex gap-2">
          <button
            onClick={() => { setMode('student'); setFormError(null); setBulkResult(null) }}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition ${mode === 'student' ? 'bg-emerald-500 text-slate-950' : 'border border-white/[0.09] text-slate-300 hover:bg-white/[0.035]'}`}
          >
            By Student
          </button>
          <button
            onClick={() => { setMode('class'); setFormError(null); setBulkResult(null) }}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition ${mode === 'class' ? 'bg-emerald-500 text-slate-950' : 'border border-white/[0.09] text-slate-300 hover:bg-white/[0.035]'}`}
          >
            By Class
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading...</p>
        </div>
      ) : null}

      {mode === 'student' && !isLoading && (
        <>
          <section className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-7">
            <form className="space-y-4" onSubmit={handleStudentSubmit}>
              <Field label="Student" error={fieldErrors.student}>
                <select className={inputClass} value={formState.student} disabled={isFormDisabled}
                  onChange={e => { setFormState(p => ({ ...p, student: e.target.value })); setFieldErrors(p => ({ ...p, student: '' })) }}>
                  <option value="">Select student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.first_name} {s.last_name}</option>)}
                </select>
              </Field>
              <Field label="Fee Structure" error={fieldErrors.fee_structure}>
                <select className={inputClass} value={formState.fee_structure} disabled={isFormDisabled}
                  onChange={e => { setFormState(p => ({ ...p, fee_structure: e.target.value })); setFieldErrors(p => ({ ...p, fee_structure: '' })) }}>
                  <option value="">Select fee</option>
                  {fees.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Field>
              <Field label="Discount Amount" error={fieldErrors.discount_amount}>
                <input type="number" min="0" step="0.01" className={inputClass} value={formState.discount_amount} placeholder="0.00" disabled={isFormDisabled}
                  onChange={e => { setFormState(p => ({ ...p, discount_amount: e.target.value })); setFieldErrors(p => ({ ...p, discount_amount: '' })) }} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date" error={fieldErrors.start_date}>
                  <input type="date" className={inputClass} value={formState.start_date} disabled={isFormDisabled}
                    onChange={e => setFormState(p => ({ ...p, start_date: e.target.value }))} />
                </Field>
                <Field label="End Date" error={fieldErrors.end_date}>
                  <input type="date" className={inputClass} value={formState.end_date} disabled={isFormDisabled}
                    onChange={e => setFormState(p => ({ ...p, end_date: e.target.value }))} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formState.is_active} disabled={isFormDisabled}
                  onChange={e => setFormState(p => ({ ...p, is_active: e.target.checked }))} />
                Active
              </label>
              {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : isEdit ? 'Update assignment' : 'Assign fee'}
                </button>
                <button className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200" type="button" onClick={() => navigate('/modules/finance/fee-assignments')}>Cancel</button>
              </div>
            </form>
          </section>

          <aside className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-5">
            <h3 className="text-sm font-semibold text-slate-200">Student context</h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 md:grid-cols-2">
              <div><p className="text-[11px] uppercase text-slate-400">Name</p><p>{studentDetail ? `${studentDetail.first_name} ${studentDetail.last_name}` : 'Select a student'}</p></div>
              <div><p className="text-[11px] uppercase text-slate-400">Admission #</p><p>{studentDetail?.admission_number ?? '--'}</p></div>
              <div><p className="text-[11px] uppercase text-slate-400">Class</p><p>{studentEnrollment?.class_name ?? '--'}</p></div>
              <div><p className="text-[11px] uppercase text-slate-400">Term</p><p>{studentEnrollment?.term_name ?? '--'}</p></div>
            </div>
            {studentInfoNotice ? <p className="mt-2 text-[11px] text-amber-200">{studentInfoNotice}</p> : null}
            <div className="mt-4">
              <p className="text-[11px] uppercase text-slate-400">Parents / Guardians</p>
              <div className="mt-2 space-y-2">
                {(studentDetail?.guardians ?? []).length > 0 ? studentDetail?.guardians?.map(g => (
                  <div key={g.id} className="rounded-xl border border-white/[0.07] p-3 text-xs">
                    <p className="text-sm text-white">{g.name}</p>
                    <p className="text-[11px] text-slate-400">{g.relationship ?? 'Guardian'}</p>
                    <p className="text-[11px] text-slate-400">{g.phone ?? '--'} | {g.email ?? '--'}</p>
                  </div>
                )) : <p className="text-[11px] text-slate-400">No guardian records found.</p>}
              </div>
            </div>
          </aside>
        </>
      )}

      {mode === 'class' && !isLoading && (
        <section className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-7">
          {bulkResult ? (
            <div className="rounded-2xl border border-emerald-600 bg-emerald-900/20 p-5">
              <p className="font-semibold text-emerald-300">{bulkResult.message}</p>
              <div className="mt-3 flex gap-6 text-sm text-slate-300">
                <div><span className="text-xs uppercase text-slate-500">Students</span><br /><span className="text-lg font-bold text-white">{bulkResult.student_count}</span></div>
                <div><span className="text-xs uppercase text-slate-500">New</span><br /><span className="text-lg font-bold text-emerald-300">{bulkResult.created}</span></div>
                <div><span className="text-xs uppercase text-slate-500">Updated</span><br /><span className="text-lg font-bold text-amber-300">{bulkResult.updated}</span></div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={() => { setBulkResult(null); setClassForm({ class_id: '', fee_structure_id: '', term_id: '', discount_amount: '' }) }}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">Assign another class</button>
                <button onClick={() => navigate('/modules/finance/fee-assignments')}
                  className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200">View all assignments</button>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleClassSubmit}>
              <div className="rounded-xl border border-slate-700/50 bg-white/[0.02] p-4 text-sm text-slate-400">
                Assigns the selected fee structure to <strong className="text-slate-200">all enrolled students</strong> in the chosen class. Existing assignments for the same fee are updated; new ones are created.
              </div>

              <Field label="Class" error={fieldErrors.class_id}>
                <select className={inputClass} value={classForm.class_id} disabled={isFormDisabled}
                  onChange={e => { setClassForm(p => ({ ...p, class_id: e.target.value })); setFieldErrors(p => ({ ...p, class_id: '' })) }}>
                  <option value="">Select class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.student_count > 0 ? ` (${c.student_count} students)` : ' (no students)'}</option>
                  ))}
                </select>
              </Field>

              <Field label="Term (optional — leave blank for all terms)">
                <select className={inputClass} value={classForm.term_id} disabled={isFormDisabled}
                  onChange={e => setClassForm(p => ({ ...p, term_id: e.target.value }))}>
                  <option value="">All terms</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>

              <Field label="Fee Structure" error={fieldErrors.fee_structure_id}>
                <select className={inputClass} value={classForm.fee_structure_id} disabled={isFormDisabled}
                  onChange={e => { setClassForm(p => ({ ...p, fee_structure_id: e.target.value })); setFieldErrors(p => ({ ...p, fee_structure_id: '' })) }}>
                  <option value="">Select fee structure</option>
                  {fees.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Field>

              <Field label="Discount Amount (applied to every student)">
                <input type="number" min="0" step="0.01" className={inputClass} value={classForm.discount_amount} placeholder="0.00" disabled={isFormDisabled}
                  onChange={e => setClassForm(p => ({ ...p, discount_amount: e.target.value }))} />
              </Field>

              {selectedClass && (
                <div className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-4 text-sm text-slate-300">
                  <strong className="text-slate-100">{selectedClass.name}</strong> — {selectedClass.student_count} enrolled student{selectedClass.student_count !== 1 ? 's' : ''}
                  {classForm.fee_structure_id && fees.find(f => String(f.id) === classForm.fee_structure_id) && (
                    <> will be assigned <strong className="text-emerald-300">{fees.find(f => String(f.id) === classForm.fee_structure_id)!.name}</strong></>
                  )}.
                </div>
              )}

              {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Assigning…' : 'Assign fee to class'}
                </button>
                <button className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200" type="button" onClick={() => navigate('/modules/finance/fee-assignments')}>Cancel</button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  )
}
