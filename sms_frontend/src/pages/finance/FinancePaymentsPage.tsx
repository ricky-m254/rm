import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useAuthStore } from '../../store/auth'
import { extractApiErrorMessage } from '../../utils/forms'
import { downloadBlob } from '../../utils/download'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'
import PermissionGate from '../../components/PermissionGate'

type Payment = {
  id: number
  student: number
  amount: number
  payment_method: string
  reference_number: string
  receipt_number?: string
  payment_date: string
  is_active: boolean
  reversed_at?: string | null
  reversal_reason?: string
  allocated_amount?: number
  unallocated_amount?: number
}

type PaymentReversalRequest = {
  id: number
  payment: number
  payment_reference?: string
  payment_receipt?: string
  reason: string
  requested_by_name?: string
  requested_at: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_by_name?: string
  reviewed_at?: string | null
}

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
}

const formatMoney = (value: number | string | undefined) =>
  Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDateTime = (value: string | undefined) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const paymentStatusBadgeClass = (status: 'Reversed' | 'Allocated' | 'Partial' | 'Unallocated') => {
  if (status === 'Reversed') return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
  if (status === 'Allocated') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  if (status === 'Partial') return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
  return 'border-slate-600 glass-panel text-slate-300'
}

const reversalStatusBadgeClass = (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
  if (status === 'APPROVED') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  if (status === 'REJECTED') return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
  return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
}

export default function FinancePaymentsPage() {
  const role = useAuthStore((state) => state.role)
  const canReviewReversal = role === 'ADMIN' || role === 'TENANT_SUPER_ADMIN'
  const navigate = useNavigate()
  const location = useLocation()
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [paymentQuery, setPaymentQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [allocationFilter, setAllocationFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentPage, setPaymentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [openContextId, setOpenContextId] = useState<number | null>(null)
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)
  const [studentDetails, setStudentDetails] = useState<Record<number, StudentDetail>>({})
  const [studentEnrollments, setStudentEnrollments] = useState<Record<number, EnrollmentRef | null>>({})
  const [studentContextNotice, setStudentContextNotice] = useState<string | null>(null)
  const [reversalRows, setReversalRows] = useState<PaymentReversalRequest[]>([])
  const [reversalLoading, setReversalLoading] = useState(false)
  const [reversalError, setReversalError] = useState<string | null>(null)
  const [reversalMessage, setReversalMessage] = useState<string | null>(null)
  const [reversalTarget, setReversalTarget] = useState<Payment | null>(null)
  const [reversalReason, setReversalReason] = useState('')
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false)
  const [reviewingReversalId, setReviewingReversalId] = useState<number | null>(null)
  const [reversalQuery, setReversalQuery] = useState('')
  const [reversalStatusFilter, setReversalStatusFilter] = useState('')
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )

  const pageSize = 8
  const hasInvalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo)

  useEffect(() => {
    const state = location.state as { flash?: string } | null
    if (state?.flash) {
      setFlash(state.flash)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  const loadReversals = async () => {
    setReversalLoading(true)
    setReversalError(null)
    try {
      const response = await apiClient.get<
        PaymentReversalRequest[] | { results: PaymentReversalRequest[]; count: number }
      >('/finance/payment-reversals/', {
        params: {
          search: reversalQuery.trim() || undefined,
          status: reversalStatusFilter || undefined,
        },
      })
      setReversalRows(normalizePaginatedResponse(response.data).items)
    } catch (err) {
      setReversalError(extractApiErrorMessage(err, 'Unable to load payment reversal requests.'))
    } finally {
      setReversalLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      if (hasInvalidDateRange) {
        if (isMounted) {
          setError('Invalid payment date range: From date cannot be after To date.')
          setIsLoading(false)
        }
        return
      }
      try {
        if (isMounted) setError(null)
        const [paymentRes, studentRes] = await Promise.all([
          apiClient.get<Payment[] | { results: Payment[]; count: number }>(
            '/finance/payments/',
            {
              params: {
                page: paymentPage,
                search: paymentQuery.trim() || undefined,
                student: studentFilter !== 'all' ? studentFilter : undefined,
                payment_method: methodFilter !== 'all' ? methodFilter : undefined,
                allocation_status: allocationFilter !== 'all' ? allocationFilter : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
              },
            },
          ),
          apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>(
            '/finance/ref/students/',
          ),
        ])
        if (isMounted) {
          const normalized = normalizePaginatedResponse(paymentRes.data)
          setPayments(normalized.items)
          setTotalCount(normalized.totalCount)
          setIsServerPaginated(normalized.isPaginated)
          setStudents(normalizePaginatedResponse(studentRes.data).items)
        }
      } catch (err) {
        if (isMounted) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            setError('Session expired. Please log in again.')
          } else if (status === 403) {
            setError('Access denied. Ensure this user has the FINANCE module and proper role.')
          } else if (status === 404) {
            setError('Finance endpoints not found (404). Verify tenant routing.')
          } else {
            setError(extractApiErrorMessage(err, 'Unable to load payments. Please try again.'))
          }
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
  }, [
    paymentPage,
    paymentQuery,
    studentFilter,
    methodFilter,
    allocationFilter,
    dateFrom,
    dateTo,
    hasInvalidDateRange,
  ])

  useEffect(() => {
    void loadReversals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reversalQuery, reversalStatusFilter])

  const studentMap = useMemo(() => {
    return students.reduce<Record<number, string>>((acc, student) => {
      acc[student.id] = `${student.first_name} ${student.last_name} ${student.admission_number}`.trim()
      return acc
    }, {})
  }, [students])

  const filteredPayments = useMemo(() => {
    const term = paymentQuery.trim().toLowerCase()
    return payments.filter((payment) => {
      if (studentFilter !== 'all' && String(payment.student) !== studentFilter) {
        return false
      }
      if (methodFilter !== 'all' && payment.payment_method !== methodFilter) {
        return false
      }
      if (allocationFilter !== 'all') {
        const unallocated = Number(payment.unallocated_amount ?? 0)
        const allocated = Number(payment.allocated_amount ?? 0)
        const status =
          unallocated <= 0 && allocated > 0
            ? 'allocated'
            : allocated > 0
              ? 'partial'
              : 'unallocated'
        if (allocationFilter !== status) return false
      }
      if (dateFrom && payment.payment_date && payment.payment_date < dateFrom) return false
      if (dateTo && payment.payment_date && payment.payment_date > dateTo) return false
      if (!term) return true
      const studentName = studentMap[payment.student]?.toLowerCase() ?? ''
      return (
        payment.reference_number.toLowerCase().includes(term) ||
        String(payment.student).includes(term) ||
        payment.payment_method.toLowerCase().includes(term) ||
        studentName.includes(term)
      )
    })
  }, [
    paymentQuery,
    payments,
    studentFilter,
    studentMap,
    methodFilter,
    allocationFilter,
    dateFrom,
    dateTo,
  ])

  const paymentMethods = useMemo(() => {
    const set = new Set<string>()
    payments.forEach((payment) => {
      if (payment.payment_method) set.add(payment.payment_method)
    })
    return Array.from(set).sort()
  }, [payments])

  const pagedPayments = useMemo(() => {
    if (isServerPaginated) return filteredPayments
    const start = (paymentPage - 1) * pageSize
    return filteredPayments.slice(start, start + pageSize)
  }, [filteredPayments, paymentPage, isServerPaginated])

  const totalPaymentPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredPayments.length) / pageSize),
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/finance/payments/${deleteTarget.id}/`)
      setPayments((prev) => prev.filter((payment) => payment.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(extractApiErrorMessage(err, 'Unable to delete payment.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleContext = async (payment: Payment) => {
    if (openContextId === payment.id) {
      setOpenContextId(null)
      return
    }
    setOpenContextId(payment.id)
    const studentId = payment.student
    if (studentDetails[studentId] && studentEnrollments[studentId] !== undefined) {
      return
    }
    setDetailLoadingId(payment.id)
    setStudentContextNotice(null)
    try {
      const [detailRes, enrollmentRes] = await Promise.all([
        apiClient.get<StudentDetail>(`/students/${studentId}/`),
        apiClient.get<EnrollmentRef[] | { results: EnrollmentRef[]; count: number }>(
          '/finance/ref/enrollments/',
          { params: { student_id: studentId, active: true } },
        ),
      ])
      const enrollments = normalizePaginatedResponse(enrollmentRes.data).items
      setStudentDetails((prev) => ({ ...prev, [studentId]: detailRes.data }))
      setStudentEnrollments((prev) => ({ ...prev, [studentId]: enrollments[0] ?? null }))
    } catch {
      setStudentDetails((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      setStudentEnrollments((prev) => ({ ...prev, [studentId]: null }))
      setStudentContextNotice('Student contact or class info not available.')
    } finally {
      setDetailLoadingId(null)
    }
  }

  const openReversalRequest = (payment: Payment) => {
    if (!payment.is_active) {
      setReversalMessage('This payment is already reversed.')
      return
    }
    setReversalTarget(payment)
    setReversalReason('')
    setReversalMessage(null)
  }

  const submitReversalRequest = async () => {
    if (!reversalTarget || isSubmittingReversal || reviewingReversalId !== null) return
    if (!reversalReason.trim()) {
      setReversalMessage('Reversal reason is required.')
      return
    }
    setIsSubmittingReversal(true)
    setReversalMessage(null)
    try {
      await apiClient.post('/finance/payment-reversals/', {
        payment: reversalTarget.id,
        reason: reversalReason.trim(),
      })
      setReversalMessage(`Reversal request submitted for ${reversalTarget.reference_number}.`)
      setReversalTarget(null)
      setReversalReason('')
      await loadReversals()
    } catch (err) {
      const detail = extractApiErrorMessage(
        err,
        `Failed to submit reversal request for ${reversalTarget.reference_number}.`,
      )
      setReversalMessage(detail)
    } finally {
      setIsSubmittingReversal(false)
    }
  }

  const reviewReversal = async (reversalId: number, action: 'approve' | 'reject') => {
    if (reviewingReversalId !== null || isSubmittingReversal) return
    setReversalMessage(null)
    setReviewingReversalId(reversalId)
    try {
      await apiClient.post(`/finance/payment-reversals/${reversalId}/${action}/`, {})
      setReversalMessage(`Reversal ${action}d.`)
      await loadReversals()
      const paymentRes = await apiClient.get<Payment[] | { results: Payment[]; count: number }>(
        '/finance/payments/',
        {
          params: {
            page: paymentPage,
            search: paymentQuery.trim() || undefined,
            student: studentFilter !== 'all' ? studentFilter : undefined,
            payment_method: methodFilter !== 'all' ? methodFilter : undefined,
            allocation_status: allocationFilter !== 'all' ? allocationFilter : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
        },
      )
      const normalized = normalizePaginatedResponse(paymentRes.data)
      setPayments(normalized.items)
      setTotalCount(normalized.totalCount)
      setIsServerPaginated(normalized.isPaginated)
    } catch (err) {
      setReversalMessage(extractApiErrorMessage(err, `Unable to ${action} reversal request.`))
    } finally {
      setReviewingReversalId(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Payments"
        subtitle="Track collections and payment history."
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading payments...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-sm text-emerald-200">{flash}</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Payment list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/payments/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PrintButton />
            <input
              className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Admission no., invoice ref, receipt…"
              value={paymentQuery}
              onChange={(event) => {
                setPaymentQuery(event.target.value)
                setPaymentPage(1)
              }}
            />
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white sm:w-auto"
              value={studentFilter}
              onChange={(event) => {
                setStudentFilter(event.target.value)
                setPaymentPage(1)
              }}
            >
              <option value="all">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white sm:w-auto"
              value={methodFilter}
              onChange={(event) => {
                setMethodFilter(event.target.value)
                setPaymentPage(1)
              }}
            >
              <option value="all">All methods</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white sm:w-auto"
              value={allocationFilter}
              onChange={(event) => {
                setAllocationFilter(event.target.value)
                setPaymentPage(1)
              }}
            >
              <option value="all">All allocation</option>
              <option value="allocated">Fully allocated</option>
              <option value="partial">Partially allocated</option>
              <option value="unallocated">Unallocated</option>
            </select>
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:max-w-[150px]"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPaymentPage(1)
              }}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 sm:max-w-[150px]"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPaymentPage(1)
              }}
            />
            <PermissionGate permission="finance.payment.create">
              <button
                className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 sm:w-auto"
                onClick={() => navigate('/modules/finance/payments/new')}
              >
                Record payment
              </button>
            </PermissionGate>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">On small screens, scroll the table horizontally.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Allocated</th>
                <th className="px-4 py-3">Unallocated</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedPayments.map((payment) => (
                <Fragment key={payment.id}>
                  <tr className="bg-slate-950/60">
                    <td className="px-4 py-3 font-semibold">{payment.reference_number}</td>
                    <td className="px-4 py-3">
                      {studentMap[payment.student] ?? payment.student}
                    </td>
                    <td className="px-4 py-3">{payment.payment_method}</td>
                    <td className="px-4 py-3">{formatMoney(payment.amount)}</td>
                    <td className="px-4 py-3">
                      {formatMoney(payment.allocated_amount)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(payment.unallocated_amount)}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const status = (!payment.is_active
                          ? 'Reversed'
                          : Number(payment.unallocated_amount ?? 0) <= 0 && Number(payment.allocated_amount ?? 0) > 0
                            ? 'Allocated'
                            : Number(payment.allocated_amount ?? 0) > 0
                              ? 'Partial'
                              : 'Unallocated') as 'Reversed' | 'Allocated' | 'Partial' | 'Unallocated'
                        return (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${paymentStatusBadgeClass(status)}`}>
                            {status}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">{formatDateTime(payment.payment_date)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                        onClick={() => toggleContext(payment)}
                      >
                        {openContextId === payment.id ? 'Hide context' : 'Context'}
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-sky-500/50 px-3 py-1 text-xs text-sky-200 hover:bg-sky-900/30"
                        onClick={async () => {
                          const res = await apiClient.get(`/api/finance/payments/${payment.id}/receipt/pdf/`, { responseType: 'blob' })
                          downloadBlob(res.data, `receipt_${payment.receipt_number || payment.id}.pdf`)
                        }}
                      >
                        Receipt PDF
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                        onClick={() => setDeleteTarget(payment)}
                        disabled={!payment.is_active}
                      >
                        Delete
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-amber-500/50 px-3 py-1 text-xs text-amber-200 disabled:opacity-50"
                        onClick={() => openReversalRequest(payment)}
                        disabled={!payment.is_active}
                      >
                        Request reversal
                      </button>
                    </td>
                  </tr>
                  {openContextId === payment.id ? (
                    <tr className="bg-slate-950/40">
                      <td colSpan={9} className="px-4 py-4">
                        {detailLoadingId === payment.id ? (
                          <p className="text-xs text-slate-400">Loading student context...</p>
                        ) : (
                          <div className="grid gap-4 rounded-2xl border border-white/[0.07] bg-slate-950/60 p-4 md:grid-cols-3">
                            <div>
                              <p className="text-[11px] uppercase text-slate-400">Class / Term</p>
                              <p className="text-sm text-slate-200">
                                {studentEnrollments[payment.student]?.class_name ?? '--'} /{' '}
                                {studentEnrollments[payment.student]?.term_name ?? '--'}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-[11px] uppercase text-slate-400">
                                Parents / Guardians
                              </p>
                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                {(studentDetails[payment.student]?.guardians ?? []).length > 0 ? (
                                  studentDetails[payment.student]?.guardians?.map((guardian) => (
                                    <div
                                      key={guardian.id}
                                      className="rounded-xl border border-white/[0.07] p-3 text-xs text-slate-300"
                                    >
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
                                  <p className="text-[11px] text-slate-400">
                                    No guardian records found.
                                  </p>
                                )}
                              </div>
                            </div>
                            {studentContextNotice ? (
                              <p className="text-[11px] text-amber-200">{studentContextNotice}</p>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {pagedPayments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={9}>
                    No payments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {paymentPage} of {totalPaymentPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={paymentPage === 1}
              onClick={() => setPaymentPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={paymentPage === totalPaymentPages}
              onClick={() => setPaymentPage((prev) => Math.min(totalPaymentPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Payment reversal requests</h2>
            <p className="mt-1 text-sm text-slate-400">Maker/checker queue for reversal approvals.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search reference, receipt, reason"
              value={reversalQuery}
              onChange={(event) => setReversalQuery(event.target.value)}
            />
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={reversalStatusFilter}
              onChange={(event) => setReversalStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>
        {reversalError ? (
          <p className="mt-3 text-xs text-rose-300">{reversalError}</p>
        ) : null}
        {reversalMessage ? (
          <p className="mt-3 text-xs text-emerald-300">{reversalMessage}</p>
        ) : null}
        {reversalLoading ? (
          <p className="mt-4 text-sm text-slate-300">Loading reversal requests...</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Reviewed By</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reversalRows.map((row) => (
                  <tr key={row.id} className="bg-slate-950/60">
                    <td className="px-4 py-3">{row.payment_reference || `PAY-${row.payment}`}</td>
                    <td className="px-4 py-3">{row.payment_receipt || '--'}</td>
                    <td className="px-4 py-3">{row.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${reversalStatusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(row.requested_at)}</td>
                    <td className="px-4 py-3">{row.reviewed_by_name || '--'}</td>
                    <td className="px-4 py-3">
                      {canReviewReversal && row.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-200 disabled:opacity-70"
                            onClick={() => void reviewReversal(row.id, 'approve')}
                            disabled={reviewingReversalId !== null || isSubmittingReversal}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded border border-rose-600 px-2 py-1 text-xs text-rose-200 disabled:opacity-70"
                            onClick={() => void reviewReversal(row.id, 'reject')}
                            disabled={reviewingReversalId !== null || isSubmittingReversal}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {reversalRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={7}>
                      No reversal requests found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete payment"
        description={
          <>
            This will remove payment <strong>{deleteTarget?.reference_number}</strong>. Continue?
          </>
        }
        confirmLabel="Confirm delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {reversalTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <h3 className="text-lg font-display font-semibold">Request payment reversal</h3>
            <p className="mt-2 text-sm text-slate-400">
              Submit reversal request for <strong>{reversalTarget.reference_number}</strong>.
            </p>
            <label className="mt-4 block text-sm text-slate-200">
              Reason
              <textarea
                className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                rows={3}
                value={reversalReason}
                onChange={(event) => setReversalReason(event.target.value)}
                placeholder="Enter reversal reason"
              />
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
                onClick={() => void submitReversalRequest()}
                disabled={isSubmittingReversal || reviewingReversalId !== null}
              >
                {isSubmittingReversal ? 'Submitting...' : 'Submit request'}
              </button>
              <button
                className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
                onClick={() => {
                  if (isSubmittingReversal || reviewingReversalId !== null) return
                  setReversalTarget(null)
                  setReversalReason('')
                }}
                disabled={isSubmittingReversal || reviewingReversalId !== null}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
