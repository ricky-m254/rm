import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage, mapApiFieldErrors } from '../../utils/forms'
import BackButton from '../../components/BackButton'
import PageHero from '../../components/PageHero'

type FinanceStudent = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
}

type Guardian = {
  id: number
  name: string
  relationship?: string
  phone?: string
  email?: string
}

type StudentDetail = FinanceStudent & {
  guardians?: Guardian[]
}

type EnrollmentRef = {
  id: number
  student: number
  class_name?: string
  term_name?: string
  school_class?: number
  term?: number
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money', 'Cheque', 'Other'] as const

const todayDate = () => new Date().toISOString().slice(0, 10)

export default function FinancePaymentFormPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [studentEnrollment, setStudentEnrollment] = useState<EnrollmentRef | null>(null)
  const [studentInfoNotice, setStudentInfoNotice] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    student: '',
    amount: '',
    payment_date: todayDate(),
    payment_method: '',
    reference_number: '',
    notes: '',
  })

  useEffect(() => {
    let isMounted = true
    const loadStudents = async () => {
      try {
        const response = await apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>(
          '/finance/ref/students/',
        )
        if (isMounted) {
          setStudents(normalizePaginatedResponse(response.data).items)
        }
      } catch (err) {
        if (isMounted) {
          setFormError(extractApiErrorMessage(err, 'Unable to load student references.'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    loadStudents()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!formState.student) {
      setStudentDetail(null)
      setStudentEnrollment(null)
      setStudentInfoNotice(null)
      return
    }
    let isMounted = true
    const loadStudentInfo = async () => {
      try {
        const [detailRes, enrollmentRes] = await Promise.all([
          apiClient.get<StudentDetail>(`/students/${formState.student}/`),
          apiClient.get<EnrollmentRef[] | { results: EnrollmentRef[]; count: number }>(
            '/finance/ref/enrollments/',
            { params: { student_id: formState.student, active: true } },
          ),
        ])
        if (isMounted) {
          setStudentDetail(detailRes.data)
          const enrollments = Array.isArray(enrollmentRes.data)
            ? enrollmentRes.data
            : enrollmentRes.data.results ?? []
          setStudentEnrollment(enrollments[0] ?? null)
          setStudentInfoNotice(null)
        }
      } catch {
        if (!isMounted) return
        setStudentDetail(null)
        setStudentEnrollment(null)
        setStudentInfoNotice('Student contact or class info not available.')
      }
    }
    loadStudentInfo()
    return () => {
      isMounted = false
    }
  }, [formState.student])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const nextErrors: Record<string, string> = {}
    if (!formState.student) nextErrors.student = 'Select a student.'
    const amountValue = Number(formState.amount)
    if (!formState.amount || Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a valid amount.'
    }
    if (!formState.payment_date) nextErrors.payment_date = 'Select a payment date.'
    if (formState.payment_date > todayDate()) {
      nextErrors.payment_date = 'Payment date cannot be in the future.'
    }
    if (!formState.payment_method.trim()) {
      nextErrors.payment_method = 'Select a payment method.'
    } else if (!PAYMENT_METHODS.includes(formState.payment_method as (typeof PAYMENT_METHODS)[number])) {
      nextErrors.payment_method = 'Select a valid payment method.'
    }
    if (!formState.reference_number.trim()) nextErrors.reference_number = 'Enter a reference number.'
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/finance/payments/', {
        student: Number(formState.student),
        amount: Number(formState.amount),
        payment_date: formState.payment_date,
        payment_method: formState.payment_method,
        reference_number: formState.reference_number,
        notes: formState.notes,
      })
      navigate('/modules/finance/payments', { state: { flash: 'Payment recorded.' } })
    } catch (err) {
      const nextErrors = mapApiFieldErrors(err, [
        'student',
        'amount',
        'payment_date',
        'payment_method',
        'reference_number',
      ])
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors)
        setFormError(extractApiErrorMessage(err, 'Please correct the highlighted fields.'))
        return
      }
      setFormError(extractApiErrorMessage(err, 'Unable to record payment.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE"
        badgeColor="emerald"
        title="Record Payment"
        subtitle="Enter and process a student fee payment"
        icon="💰"
      />
      <div className="col-span-12">
        <BackButton to="/modules/finance/payments" label="Back to Payments" />
      </div>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading students...</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Student
            <select
              className={`mt-2 w-full rounded-xl border bg-slate-950 px-3 py-2 text-sm text-white outline-none ${
                fieldErrors.student ? 'border-rose-500/70' : 'border-white/[0.07] focus:border-emerald-400'
              }`}
              value={formState.student}
              aria-invalid={Boolean(fieldErrors.student)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, student: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, student: '' }))
              }}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admission_number} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            {fieldErrors.student ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.student}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.amount}
              aria-invalid={Boolean(fieldErrors.amount)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, amount: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, amount: '' }))
              }}
              placeholder="500.00"
            />
            {fieldErrors.amount ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.amount}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Payment Date
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.payment_date}
              aria-invalid={Boolean(fieldErrors.payment_date)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, payment_date: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, payment_date: '' }))
              }}
            />
            {fieldErrors.payment_date ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.payment_date}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Payment Method
            <select
              className={`mt-2 w-full rounded-xl border bg-slate-950 px-3 py-2 text-sm text-white outline-none ${
                fieldErrors.payment_method
                  ? 'border-rose-500/70'
                  : 'border-white/[0.07] focus:border-emerald-400'
              }`}
              value={formState.payment_method}
              aria-invalid={Boolean(fieldErrors.payment_method)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, payment_method: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, payment_method: '' }))
              }}
            >
              <option value="">Select method</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            {fieldErrors.payment_method ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.payment_method}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Reference Number
            <input
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.reference_number}
              aria-invalid={Boolean(fieldErrors.reference_number)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, reference_number: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, reference_number: '' }))
              }}
              placeholder="RCPT-1001"
            />
            {fieldErrors.reference_number ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.reference_number}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Notes
            <textarea
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
            />
          </label>
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Record payment'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              type="button"
              onClick={() => navigate('/modules/finance/payments')}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      <aside className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-5">
        <h3 className="text-sm font-semibold text-slate-200">Student context</h3>
        <div className="mt-3 grid gap-3 text-xs text-slate-300 md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase text-slate-400">Name</p>
            <p>
              {studentDetail
                ? `${studentDetail.first_name} ${studentDetail.last_name}`
                : 'Select a student'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-400">Admission #</p>
            <p>{studentDetail?.admission_number ?? '--'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-400">Class</p>
            <p>{studentEnrollment?.class_name ?? '--'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-400">Term</p>
            <p>{studentEnrollment?.term_name ?? '--'}</p>
          </div>
        </div>
        {studentInfoNotice ? (
          <p className="mt-2 text-[11px] text-amber-200">{studentInfoNotice}</p>
        ) : null}
        <div className="mt-4">
          <p className="text-[11px] uppercase text-slate-400">Parents / Guardians</p>
          <div className="mt-2 space-y-2">
            {(studentDetail?.guardians ?? []).length > 0 ? (
              studentDetail?.guardians?.map((guardian) => (
                <div key={guardian.id} className="rounded-xl border border-white/[0.07] p-3 text-xs">
                  <p className="text-sm text-white">{guardian.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {guardian.relationship ?? 'Guardian'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {guardian.phone ?? '--'} | {guardian.email ?? '--'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No guardian records found.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
