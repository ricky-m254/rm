import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { useAuthStore } from '../../store/auth'
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
  is_active?: boolean
}

type StudentDetail = FinanceStudent & {
  guardians?: Guardian[]
  gender?: string
  is_active?: boolean
}

type EnrollmentRef = {
  id: number
  student: number
  class_name?: string
  term_name?: string
  school_class?: number
  term?: number
  is_active?: boolean
}

type Term = {
  id: number
  name: string
}

type FeeStructure = {
  id: number
  name: string
  amount: number
}

type InvoiceLineItem = {
  fee_structure: string
  amount: string
  description: string
}

type InvoiceLineItemError = {
  fee_structure?: string
  amount?: string
  description?: string
}

type InvoiceDetail = {
  id: number
  student: number
  term: number
  due_date: string
  status?: string
  is_active?: boolean
  invoice_date?: string
  created_at?: string
  balance_due?: number
  line_items?: Array<{
    id: number
    fee_structure?: number
    amount: number
    description: string
  }>
}

export default function FinanceInvoiceFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const role = useAuthStore((state) => state.role)
  const canEditAdminFields = role === 'TENANT_SUPER_ADMIN'

  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUserTouched, setHasUserTouched] = useState(false)
  const [submitMode, setSubmitMode] = useState<'default' | 'add_another'>('default')
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [studentEnrollment, setStudentEnrollment] = useState<EnrollmentRef | null>(null)
  const [studentInfoNotice, setStudentInfoNotice] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    student: '',
    term: '',
    due_date: '',
  })
  const [metaState, setMetaState] = useState({
    status: 'DRAFT',
    is_active: true,
    invoice_date: '',
    created_at: '',
    balance_due: '',
  })

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { fee_structure: '', amount: '', description: '' },
  ])
  const [lineItemErrors, setLineItemErrors] = useState<InvoiceLineItemError[]>([])

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        const [studentRes, termRes, feeRes] = await Promise.all([
          apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>(
            '/finance/ref/students/',
          ),
          apiClient.get<Term[] | { results: Term[]; count: number }>('/academics/ref/terms/'),
          apiClient.get<FeeStructure[] | { results: FeeStructure[]; count: number }>(
            '/finance/fees/',
          ),
        ])
        if (isMounted) {
          setStudents(normalizePaginatedResponse(studentRes.data).items)
          setTerms(normalizePaginatedResponse(termRes.data).items)
          setFees(normalizePaginatedResponse(feeRes.data).items)
          setHasUserTouched(false)
        }
        if (isEdit && id) {
          const invoiceRes = await apiClient.get<InvoiceDetail>(`/finance/invoices/${id}/`)
          if (isMounted) {
            setFormState({
              student: String(invoiceRes.data.student ?? ''),
              term: String(invoiceRes.data.term ?? ''),
              due_date: invoiceRes.data.due_date ?? '',
            })
            setMetaState({
              status: invoiceRes.data.status ?? 'DRAFT',
              is_active: invoiceRes.data.is_active ?? true,
              invoice_date: invoiceRes.data.invoice_date ?? '',
              created_at: invoiceRes.data.created_at ?? '',
              balance_due:
                invoiceRes.data.balance_due !== undefined && invoiceRes.data.balance_due !== null
                  ? String(invoiceRes.data.balance_due)
                  : '',
            })
            const items = invoiceRes.data.line_items ?? []
            if (items.length > 0) {
              setLineItems(
                items.map((item) => ({
                  fee_structure: item.fee_structure ? String(item.fee_structure) : '',
                  amount: String(item.amount ?? ''),
                  description: item.description ?? '',
                })),
              )
            }
            setHasUserTouched(false)
          }
        }
      } catch (err) {
        if (isMounted) {
          setFormError(extractApiErrorMessage(err, 'Unable to load invoice references.'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    loadData()
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
  }, [formState.student])

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [lineItems])

  useEffect(() => {
    if (isEdit) return
    const today = new Date().toISOString().split('T')[0]
    setMetaState((prev) => ({
      ...prev,
      invoice_date: prev.invoice_date || today,
      created_at: prev.created_at || today,
      balance_due: totalAmount ? String(totalAmount) : prev.balance_due,
    }))
  }, [isEdit, totalAmount])

  useEffect(() => {
    if (isEdit) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUserTouched || isSubmitting) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUserTouched, isEdit, isSubmitting])

  const updateLineItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    setLineItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
    setLineItemErrors((prev) => prev.map((item, idx) => (idx === index ? {} : item)))
    setHasUserTouched(true)
  }

  const handleFeeSelect = (index: number, feeId: string) => {
    const fee = fees.find((entry) => String(entry.id) === feeId)
    setLineItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              fee_structure: feeId,
              amount: item.amount || (fee ? String(fee.amount) : item.amount),
            }
          : item,
      ),
    )
    setLineItemErrors((prev) => prev.map((item, idx) => (idx === index ? {} : item)))
    setHasUserTouched(true)
  }

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { fee_structure: '', amount: '', description: '' }])
    setLineItemErrors((prev) => [...prev, {}])
    setHasUserTouched(true)
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index))
    setLineItemErrors((prev) => prev.filter((_, idx) => idx !== index))
    setHasUserTouched(true)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setFormError(null)
    setFormSuccess(null)
    setFieldErrors({})
    setLineItemErrors([])

    if (isEdit) {
      return
    }

    const nextFieldErrors: Record<string, string> = {}
    if (!formState.student) nextFieldErrors.student = 'Select a student.'
    if (!formState.term) nextFieldErrors.term = 'Select a term.'
    if (!formState.due_date) nextFieldErrors.due_date = 'Choose a due date.'
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    if (lineItems.length === 0) {
      setFormError('Add at least one line item.')
      return
    }

    const selectedFees = lineItems
      .map((item) => item.fee_structure)
      .filter((value) => value !== '')
    const duplicateFees = new Set(
      selectedFees.filter((value, index) => selectedFees.indexOf(value) !== index),
    )

    const nextLineErrors = lineItems.map((item) => {
      const errors: InvoiceLineItemError = {}
      if (!item.fee_structure) errors.fee_structure = 'Select a fee.'
      if (item.fee_structure && duplicateFees.has(item.fee_structure)) {
        errors.fee_structure = 'This fee has already been added.'
      }
      const amountValue = Number(item.amount)
      if (!item.amount || Number.isNaN(amountValue) || amountValue <= 0) {
        errors.amount = 'Enter a valid amount.'
      }
      if (!item.description.trim()) {
        errors.description = 'Enter a description.'
      }
      return errors
    })
    const hasLineErrors = nextLineErrors.some(
      (errors) => errors.fee_structure || errors.amount || errors.description,
    )
    if (hasLineErrors) {
      setLineItemErrors(nextLineErrors)
      setFormError('Please fix the line item details.')
      return
    }

    const cleanedItems = lineItems.map((item) => ({
        fee_structure: Number(item.fee_structure),
        amount: Number(item.amount),
        description: item.description.trim(),
      }))

    setIsSubmitting(true)
    try {
      const payload = {
        student: Number(formState.student),
        term: Number(formState.term),
        due_date: formState.due_date,
        line_items: cleanedItems,
        ...(canEditAdminFields
          ? { status: metaState.status, is_active: metaState.is_active }
          : {}),
      }
      await apiClient.post('/finance/invoices/', payload)
      if (submitMode === 'add_another') {
        setFormState({ student: '', term: '', due_date: '' })
        setLineItems([{ fee_structure: '', amount: '', description: '' }])
        setLineItemErrors([])
        setHasUserTouched(false)
        setMetaState((prev) => ({
          ...prev,
          status: 'DRAFT',
          is_active: true,
          balance_due: '',
        }))
        setFormSuccess('Invoice created. You can add another now.')
      } else {
        navigate('/modules/finance/invoices', { state: { flash: 'Invoice created.' } })
      }
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data
      if (detail && 'missing' in detail && Array.isArray(detail.missing)) {
        const missing = detail.missing as string[]
        const nextErrors: Record<string, string> = {}
        if (missing.includes('student')) nextErrors.student = 'Select a student.'
        if (missing.includes('term')) nextErrors.term = 'Select a term.'
        if (missing.includes('due_date')) nextErrors.due_date = 'Choose a due date.'
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors)
        }
        if (missing.includes('line_items')) {
          setLineItemErrors((prev) => (prev.length > 0 ? prev : [{ fee_structure: 'Add line items.' }]))
        }
      }
      const nextErrors = mapApiFieldErrors(err, ['student', 'term', 'due_date'])
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }))
      }
      setFormError(extractApiErrorMessage(err, 'Unable to create invoice.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <BackButton to="/modules/finance/invoices" label="Back to Invoices" />
      </div>
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title={isEdit ? 'Invoice (View Only)' : 'Create Invoice'}
        subtitle={isEdit ? 'Editing is disabled by backend rules.' : 'Compose a new invoice with line items.'}
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading invoice references...</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        {isEdit ? (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            This invoice is read-only. If adjustments are needed, create an invoice adjustment instead.
          </div>
        ) : null}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-12 gap-4">
            <label className="col-span-12 text-sm md:col-span-4">
              Student
              <select
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                value={formState.student}
                aria-invalid={Boolean(fieldErrors.student)}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, student: event.target.value }))
                  setFieldErrors((prev) => ({ ...prev, student: '' }))
                  setHasUserTouched(true)
                }}
                disabled={isEdit}
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
            <label className="col-span-12 text-sm md:col-span-4">
              Term
              <select
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                value={formState.term}
                aria-invalid={Boolean(fieldErrors.term)}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, term: event.target.value }))
                  setFieldErrors((prev) => ({ ...prev, term: '' }))
                  setHasUserTouched(true)
                }}
                disabled={isEdit}
              >
                <option value="">Select term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
              {fieldErrors.term ? (
                <p className="mt-1 text-xs text-rose-300">{fieldErrors.term}</p>
              ) : null}
            </label>
            <label className="col-span-12 text-sm md:col-span-4">
              Due Date
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
                value={formState.due_date}
                aria-invalid={Boolean(fieldErrors.due_date)}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, due_date: event.target.value }))
                  setFieldErrors((prev) => ({ ...prev, due_date: '' }))
                  setHasUserTouched(true)
                }}
                disabled={isEdit}
              />
              {fieldErrors.due_date ? (
                <p className="mt-1 text-xs text-rose-300">{fieldErrors.due_date}</p>
              ) : null}
            </label>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 rounded-2xl border border-white/[0.07] bg-slate-950/40 p-4 md:col-span-7">
              <h3 className="text-sm font-semibold text-slate-200">Student information</h3>
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
            </div>
            <div className="col-span-12 rounded-2xl border border-white/[0.07] bg-slate-950/40 p-4 md:col-span-5">
              <h3 className="text-sm font-semibold text-slate-200">Parent / Guardian</h3>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                {(studentDetail?.guardians ?? []).length > 0 ? (
                  studentDetail?.guardians?.map((guardian) => (
                    <div key={guardian.id} className="rounded-xl border border-white/[0.07] p-3">
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
          </div>

          <div className="grid grid-cols-12 gap-4">
            <label className="col-span-12 text-sm md:col-span-3">
              Total Amount
              <input
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white"
                value={totalAmount.toLocaleString()}
                readOnly
              />
            </label>
            <label className="col-span-12 text-sm md:col-span-3">
              Status
              <select
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                value={metaState.status}
                onChange={(event) => {
                  setMetaState((prev) => ({ ...prev, status: event.target.value }))
                  setHasUserTouched(true)
                }}
                disabled={!canEditAdminFields}
              >
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="VOID">Void</option>
              </select>
            </label>
            <label className="col-span-12 flex items-center gap-2 text-sm md:col-span-3">
              <input
                type="checkbox"
                checked={metaState.is_active}
                onChange={(event) => {
                  setMetaState((prev) => ({ ...prev, is_active: event.target.checked }))
                  setHasUserTouched(true)
                }}
                disabled={!canEditAdminFields}
              />
              Is active
            </label>
            <label className="col-span-12 text-sm md:col-span-3">
              Invoice Date
              <input
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white"
                value={metaState.invoice_date || '--'}
                readOnly
              />
            </label>
            <label className="col-span-12 text-sm md:col-span-3">
              Created At
              <input
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white"
                value={metaState.created_at || '--'}
                readOnly
              />
            </label>
            <label className="col-span-12 text-sm md:col-span-3">
              Balance Due
              <input
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white"
                value={metaState.balance_due || '--'}
                readOnly
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Line items</h2>
              <button
                className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                type="button"
                onClick={addLineItem}
                disabled={isEdit}
              >
                Add line
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {lineItems.map((item, index) => (
                <div key={`line-${index}`} className="grid grid-cols-12 gap-3">
                  <select
                    className="col-span-12 rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white md:col-span-4"
                    value={item.fee_structure}
                    onChange={(event) => handleFeeSelect(index, event.target.value)}
                    disabled={isEdit}
                  >
                    <option value="">Fee structure</option>
                    {fees.map((fee) => (
                      <option key={fee.id} value={fee.id}>
                        {fee.name} - {Number(fee.amount).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {lineItemErrors[index]?.fee_structure ? (
                    <p className="col-span-12 text-xs text-rose-300 md:col-span-4">
                      {lineItemErrors[index]?.fee_structure}
                    </p>
                  ) : null}
                  <input
                    className="col-span-12 rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white md:col-span-3"
                    value={item.amount}
                    onChange={(event) => updateLineItem(index, { amount: event.target.value })}
                    placeholder="Amount"
                    disabled={isEdit}
                  />
                  {lineItemErrors[index]?.amount ? (
                    <p className="col-span-12 text-xs text-rose-300 md:col-span-3">
                      {lineItemErrors[index]?.amount}
                    </p>
                  ) : null}
                  <input
                    className="col-span-12 rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white md:col-span-4"
                    value={item.description}
                    onChange={(event) => updateLineItem(index, { description: event.target.value })}
                    placeholder="Description"
                    disabled={isEdit}
                  />
                  {lineItemErrors[index]?.description ? (
                    <p className="col-span-12 text-xs text-rose-300 md:col-span-4">
                      {lineItemErrors[index]?.description}
                    </p>
                  ) : null}
                  <button
                    className="col-span-12 rounded-lg border border-white/[0.09] px-3 py-2 text-xs text-slate-200 md:col-span-1"
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1 || isEdit}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Total amount</span>
            <span className="text-base font-semibold">{totalAmount.toLocaleString()}</span>
          </div>

          {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
          {formSuccess ? <p className="text-xs text-emerald-300">{formSuccess}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting || isEdit}
              onClick={() => setSubmitMode('default')}
            >
              {isSubmitting ? 'Saving...' : 'Create invoice'}
            </button>
            <button
              className="rounded-xl border border-emerald-400/50 px-4 py-2 text-sm text-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting || isEdit}
              onClick={() => setSubmitMode('add_another')}
            >
              {isSubmitting ? 'Saving...' : 'Create & add another'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              type="button"
              onClick={() => {
                if (!isEdit && hasUserTouched && !isSubmitting) {
                  const shouldLeave = window.confirm('You have unsaved changes. Discard and leave?')
                  if (!shouldLeave) return
                }
                navigate('/modules/finance/invoices')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
