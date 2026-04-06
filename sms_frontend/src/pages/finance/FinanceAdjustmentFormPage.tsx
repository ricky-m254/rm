import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { extractApiErrorMessage, mapApiFieldErrors } from '../../utils/forms'
import BackButton from '../../components/BackButton'
import PageHero from '../../components/PageHero'

type Invoice = {
  id: number
  student?: number
  student_full_name?: string
  balance_due?: number
}

type Guardian = {
  id: number
  name: string
  relationship?: string
  phone?: string
  email?: string
}

type StudentDetail = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
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

export default function FinanceAdjustmentFormPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [studentEnrollment, setStudentEnrollment] = useState<EnrollmentRef | null>(null)
  const [studentInfoNotice, setStudentInfoNotice] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    invoice: '',
    amount: '',
    reason: '',
    notes: '',
  })

  useEffect(() => {
    let isMounted = true
    const loadInvoices = async () => {
      try {
        if (isMounted) setFormError(null)
        const response = await apiClient.get<Invoice[] | { results: Invoice[]; count: number }>(
          '/finance/invoices/',
        )
        if (isMounted) {
          setInvoices(normalizePaginatedResponse(response.data).items)
        }
      } catch (err) {
        if (isMounted) {
          setFormError(extractApiErrorMessage(err, 'Unable to load invoices.'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    loadInvoices()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!formState.invoice) {
      setStudentDetail(null)
      setStudentEnrollment(null)
      setStudentInfoNotice(null)
      return
    }
    const selectedInvoice = invoices.find((inv) => String(inv.id) === formState.invoice)
    const studentId = selectedInvoice?.student
    if (!studentId) {
      setStudentDetail(null)
      setStudentEnrollment(null)
      setStudentInfoNotice('Student info not available for this invoice.')
      return
    }
    let isMounted = true
    const loadStudentInfo = async () => {
      try {
        const [detailRes, enrollmentRes] = await Promise.all([
          apiClient.get<StudentDetail>(`/students/${studentId}/`),
          apiClient.get<EnrollmentRef[] | { results: EnrollmentRef[]; count: number }>(
            '/finance/ref/enrollments/',
            { params: { student_id: studentId, active: true } },
          ),
        ])
        if (isMounted) {
          setStudentDetail(detailRes.data)
          const enrollments = normalizePaginatedResponse(enrollmentRes.data).items
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
  }, [formState.invoice, invoices])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const nextErrors: Record<string, string> = {}
    if (!formState.invoice) nextErrors.invoice = 'Select an invoice.'
    const amountValue = Number(formState.amount)
    if (!formState.amount || Number.isNaN(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a valid amount.'
    }
    if (!formState.reason.trim()) nextErrors.reason = 'Enter a reason.'
    if (!formState.notes.trim()) nextErrors.notes = 'Notes are required.'
    if (formState.notes.trim().length < 5) nextErrors.notes = 'Notes must be at least 5 characters.'
    const selectedInvoice = invoices.find((inv) => String(inv.id) === formState.invoice)
    if (
      selectedInvoice &&
      selectedInvoice.balance_due !== undefined &&
      amountValue > Number(selectedInvoice.balance_due)
    ) {
      nextErrors.amount = `Amount exceeds balance due (${selectedInvoice.balance_due}).`
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/finance/invoice-adjustments/', {
        invoice: Number(formState.invoice),
        amount: Number(formState.amount),
        reason: formState.reason.trim(),
        notes: formState.notes.trim(),
      })
      navigate('/modules/finance/adjustments', {
        state: { flash: 'Adjustment submitted for review.' },
      })
    } catch (err) {
      const nextErrors = mapApiFieldErrors(err, ['invoice', 'amount', 'reason', 'notes'])
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors)
        setFormError(extractApiErrorMessage(err, 'Please correct the highlighted fields.'))
        return
      }
      setFormError(extractApiErrorMessage(err, 'Unable to create adjustment.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <BackButton to="/modules/finance/adjustments" label="Back to Adjustments" />
      </div>
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Create Adjustment"
        subtitle="Apply a waiver or credit to an invoice."
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading invoices...</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6 lg:col-span-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Invoice
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.invoice}
              aria-invalid={Boolean(fieldErrors.invoice)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, invoice: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, invoice: '' }))
              }}
            >
              <option value="">Select invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  INV-{invoice.id}
                  {invoice.balance_due !== undefined
                    ? ` - Balance ${Number(invoice.balance_due).toLocaleString()}`
                    : ''}
                </option>
              ))}
            </select>
            {fieldErrors.invoice ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.invoice}</p>
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
              placeholder="100.00"
            />
            {fieldErrors.amount ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.amount}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Reason
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={formState.reason}
              aria-invalid={Boolean(fieldErrors.reason)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, reason: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, reason: '' }))
              }}
            >
              <option value="">Select reason</option>
              <option value="Late Fee">Late Fee</option>
              <option value="Scholarship">Scholarship</option>
              <option value="Refund">Refund</option>
              <option value="Correction">Correction</option>
              <option value="Other">Other</option>
            </select>
            {fieldErrors.reason ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.reason}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            Notes
            <textarea
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={formState.notes}
              aria-invalid={Boolean(fieldErrors.notes)}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
                setFieldErrors((prev) => ({ ...prev, notes: '' }))
              }}
              rows={3}
            />
            {fieldErrors.notes ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors.notes}</p>
            ) : null}
          </label>
          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Create adjustment'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              type="button"
              onClick={() => navigate('/modules/finance/adjustments')}
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
                : 'Select an invoice'}
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
