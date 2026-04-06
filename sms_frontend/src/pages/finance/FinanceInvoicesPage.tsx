import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import PrintButton from '../../components/PrintButton'
import PageHero from '../../components/PageHero'

type Invoice = {
  id: number
  student: number
  student_admission_number?: string
  student_full_name?: string
  total_amount: number
  status: string
  due_date: string
  balance_due?: number
  created_at?: string
  invoice_date?: string
  line_items?: Array<{
    id: number
    description: string
    amount: number
    fee_structure?: number
  }>
}

type Payment = {
  id: number
  student: number
  amount: number
  payment_method: string
  reference_number: string
  payment_date: string
  unallocated_amount?: number
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
  school_class?: number
  term?: number
}

type Installment = {
  id: number
  sequence: number
  due_date: string
  amount: number
  collected_amount?: number
  outstanding_amount?: number
  status: string
  paid_at?: string | null
  late_fee_applied: boolean
}

type InstallmentPlan = {
  id?: number
  invoice: number
  installment_count: number
  installments: Installment[]
}

const formatMoney = (value: number | string | undefined) =>
  Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const parseDateValue = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export default function FinanceInvoicesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<FinanceStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [invoiceQuery, setInvoiceQuery] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState('all')
  const [studentFilter, setStudentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [invoicePage, setInvoicePage] = useState(1)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null)
  const [allocationPaymentId, setAllocationPaymentId] = useState('')
  const [allocationAmount, setAllocationAmount] = useState('')
  const [allocationDate, setAllocationDate] = useState('')
  const [allocationNotes, setAllocationNotes] = useState('')
  const [allocationInstallmentId, setAllocationInstallmentId] = useState('')
  const [allocationError, setAllocationError] = useState<string | null>(null)
  const [isAllocating, setIsAllocating] = useState(false)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [studentEnrollment, setStudentEnrollment] = useState<EnrollmentRef | null>(null)
  const [studentInfoNotice, setStudentInfoNotice] = useState<string | null>(null)
  const [openContextId, setOpenContextId] = useState<number | null>(null)
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)
  const [studentDetails, setStudentDetails] = useState<Record<number, StudentDetail>>({})
  const [studentEnrollments, setStudentEnrollments] = useState<Record<number, EnrollmentRef | null>>({})
  const [studentContextNotice, setStudentContextNotice] = useState<string | null>(null)
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan | null>(null)
  const [installmentCountInput, setInstallmentCountInput] = useState('3')
  const [installmentDatesInput, setInstallmentDatesInput] = useState('')
  const [installmentMessage, setInstallmentMessage] = useState<string | null>(null)
  const [isSavingInstallmentPlan, setIsSavingInstallmentPlan] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )

  useEffect(() => {
    const state = location.state as { flash?: string } | null
    if (state?.flash) {
      setFlash(state.flash)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  const pageSize = 6

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      if (dateFrom && dateTo && dateFrom > dateTo) {
        if (isMounted) {
          setError('Invalid filter: Date From cannot be later than Date To.')
          setIsLoading(false)
          setInvoices([])
          setTotalCount(0)
        }
        return
      }
      try {
        const [invoiceRes, paymentRes, studentRes] = await Promise.all([
          apiClient.get<Invoice[] | { results: Invoice[]; count: number }>('/finance/invoices/', {
            params: {
              page: invoicePage,
              search: invoiceQuery.trim() || undefined,
              status: invoiceStatus !== 'all' ? invoiceStatus : undefined,
              student: studentFilter !== 'all' ? studentFilter : undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            },
          }),
          apiClient.get<Payment[] | { results: Payment[]; count: number }>('/finance/payments/'),
          apiClient.get<FinanceStudent[] | { results: FinanceStudent[]; count: number }>(
            '/finance/ref/students/',
          ),
        ])
        if (isMounted) {
          setError(null)
          const normalized = normalizePaginatedResponse(invoiceRes.data)
          setInvoices(normalized.items)
          setTotalCount(normalized.totalCount)
          setIsServerPaginated(normalized.isPaginated)
          setPayments(normalizePaginatedResponse(paymentRes.data).items)
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
            setError('Unable to load invoices. Please try again.')
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
  }, [invoicePage, invoiceQuery, invoiceStatus, studentFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!selectedInvoiceId) {
      setInvoiceDetail(null)
      setAllocationPaymentId('')
      setAllocationAmount('')
      setAllocationDate('')
      setAllocationNotes('')
      setAllocationInstallmentId('')
      setStudentDetail(null)
      setStudentEnrollment(null)
      setStudentInfoNotice(null)
      return
    }
    let isMounted = true
    const loadInvoiceDetail = async () => {
      try {
        const response = await apiClient.get<Invoice>(`/finance/invoices/${selectedInvoiceId}/`)
        if (isMounted) {
          setInvoiceDetail(response.data)
          setAllocationError(null)
        }
      } catch {
        if (isMounted) {
          setAllocationError('Unable to load invoice details.')
        }
      }
    }
    loadInvoiceDetail()
    return () => {
      isMounted = false
    }
  }, [selectedInvoiceId])

  useEffect(() => {
    if (!selectedInvoiceId) {
      setInstallmentPlan(null)
      setInstallmentMessage(null)
      return
    }
    let isMounted = true
    const loadInstallments = async () => {
      try {
        const response = await apiClient.get<InstallmentPlan>(`/finance/invoices/${selectedInvoiceId}/installments/`)
        if (!isMounted) return
        setInstallmentPlan(response.data)
      } catch {
        if (!isMounted) return
        setInstallmentPlan(null)
      }
    }
    void loadInstallments()
    return () => {
      isMounted = false
    }
  }, [selectedInvoiceId])

  useEffect(() => {
    if (!invoiceDetail?.student) {
      setStudentDetail(null)
      setStudentEnrollment(null)
      setStudentInfoNotice(null)
      return
    }
    let isMounted = true
    const loadStudentInfo = async () => {
      try {
        const [detailRes, enrollmentRes] = await Promise.all([
          apiClient.get<StudentDetail>(`/students/${invoiceDetail.student}/`),
          apiClient.get<EnrollmentRef[] | { results: EnrollmentRef[]; count: number }>(
            '/finance/ref/enrollments/',
            { params: { student_id: invoiceDetail.student, active: true } },
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
  }, [invoiceDetail?.student])

  const handleAllocatePayment = async () => {
    if (!selectedInvoiceId) return
    if (!allocationPaymentId || !allocationAmount) {
      setAllocationError('Payment and amount are required.')
      return
    }
    const amountValue = Number(allocationAmount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setAllocationError('Allocation amount must be greater than zero.')
      return
    }
    const selectedPayment = filteredPayments.find((payment) => String(payment.id) === allocationPaymentId)
    if (!selectedPayment) {
      setAllocationError('Selected payment is not valid for this invoice.')
      return
    }
    const unallocated = Number(selectedPayment.unallocated_amount ?? selectedPayment.amount ?? 0)
    if (amountValue > unallocated) {
      setAllocationError(`Allocation cannot exceed unallocated payment amount (${formatMoney(unallocated)}).`)
      return
    }
    const invoiceBalance = Number(invoiceDetail?.balance_due ?? 0)
    if (invoiceBalance > 0 && amountValue > invoiceBalance) {
      setAllocationError(`Allocation cannot exceed invoice balance (${formatMoney(invoiceBalance)}).`)
      return
    }
    if (allocationInstallmentId) {
      const installment = installmentPlan?.installments?.find(
        (item) => String(item.id) === allocationInstallmentId,
      )
      if (!installment) {
        setAllocationError('Selected installment is invalid.')
        return
      }
      const outstanding = Number(installment.outstanding_amount ?? installment.amount ?? 0)
      if (outstanding > 0 && amountValue > outstanding) {
        setAllocationError(
          `Allocation cannot exceed selected installment outstanding amount (${formatMoney(outstanding)}).`,
        )
        return
      }
    }
    setAllocationError(null)
    setIsAllocating(true)
    try {
      await apiClient.post(`/finance/payments/${allocationPaymentId}/allocate/`, {
        invoice_id: selectedInvoiceId,
        amount: amountValue,
        installment_id: allocationInstallmentId ? Number(allocationInstallmentId) : undefined,
      })
      const response = await apiClient.get<Invoice>(`/finance/invoices/${selectedInvoiceId}/`)
      setInvoiceDetail(response.data)
      setAllocationAmount('')
      setAllocationDate('')
      setAllocationNotes('')
      setAllocationInstallmentId('')
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string; detail?: string; non_field_errors?: string[] } } })
        ?.response?.data
      const message = data?.error ?? data?.detail ?? data?.non_field_errors?.[0]
      setAllocationError(message ?? 'Allocation failed. Check balance and payment availability.')
    } finally {
      setIsAllocating(false)
    }
  }

  const handleAutoAllocatePayment = async () => {
    if (!allocationPaymentId || !selectedInvoiceId) {
      setAllocationError('Select a payment first.')
      return
    }
    setAllocationError(null)
    setIsAllocating(true)
    try {
      await apiClient.post(`/finance/payments/${allocationPaymentId}/auto-allocate/`, {})
      const response = await apiClient.get<Invoice>(`/finance/invoices/${selectedInvoiceId}/`)
      setInvoiceDetail(response.data)
      const planResponse = await apiClient.get<InstallmentPlan>(`/finance/invoices/${selectedInvoiceId}/installments/`)
      setInstallmentPlan(planResponse.data)
      setAllocationAmount('')
      setAllocationNotes('')
      setAllocationInstallmentId('')
    } catch {
      setAllocationError('Unable to auto-allocate payment.')
    } finally {
      setIsAllocating(false)
    }
  }

  const handleCreateInstallmentPlan = async () => {
    if (!selectedInvoiceId) return
    const count = Number(installmentCountInput)
    const dueDates = installmentDatesInput
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (!Number.isInteger(count) || count <= 0 || count > 24) {
      setInstallmentMessage('Installment count must be a whole number between 1 and 24.')
      return
    }
    if (dueDates.length !== count) {
      setInstallmentMessage('Installment count must match number of comma-separated due dates.')
      return
    }
    const parsedDates = dueDates.map(parseDateValue)
    if (parsedDates.some((date) => !date)) {
      setInstallmentMessage('All installment due dates must use valid YYYY-MM-DD format.')
      return
    }
    if (new Set(dueDates).size !== dueDates.length) {
      setInstallmentMessage('Installment due dates must be unique.')
      return
    }
    const isAscending = dueDates.every((date, index) => index === 0 || date >= dueDates[index - 1])
    if (!isAscending) {
      setInstallmentMessage('Installment due dates must be in ascending order.')
      return
    }
    const invoiceDueDate = invoiceDetail?.due_date
    if (invoiceDueDate && dueDates[dueDates.length - 1] > invoiceDueDate) {
      setInstallmentMessage('Last installment due date cannot be later than invoice due date.')
      return
    }
    setInstallmentMessage(null)
    setIsSavingInstallmentPlan(true)
    try {
      const response = await apiClient.post<InstallmentPlan>(`/finance/invoices/${selectedInvoiceId}/installments/`, {
        installment_count: count,
        due_dates: dueDates,
      })
      setInstallmentPlan(response.data)
      setInstallmentMessage('Installment plan saved.')
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string; detail?: string; non_field_errors?: string[] } } })
        ?.response?.data
      const message = data?.error ?? data?.detail ?? data?.non_field_errors?.[0]
      setInstallmentMessage(message ?? 'Failed to save installment plan.')
    } finally {
      setIsSavingInstallmentPlan(false)
    }
  }

  const selectedStudent = useMemo(() => {
    if (!invoiceDetail) return null
    return students.find((student) => student.id === invoiceDetail.student) ?? null
  }, [invoiceDetail, students])

  const filteredPayments = useMemo(() => {
    if (!invoiceDetail) return payments
    return payments.filter((payment) => payment.student === invoiceDetail.student)
  }, [invoiceDetail, payments])

  const outstandingInvoices = useMemo(() => {
    if (!invoiceDetail) return []
    return invoices.filter(
      (invoice) =>
        invoice.student === invoiceDetail.student &&
        invoice.id !== invoiceDetail.id &&
        Number(invoice.balance_due ?? 0) > 0,
    )
  }, [invoiceDetail, invoices])

  useEffect(() => {
    if (!allocationPaymentId) return
    const payment = payments.find((entry) => String(entry.id) === allocationPaymentId)
    if (payment?.payment_date) {
      setAllocationDate(payment.payment_date.slice(0, 10))
    }
  }, [allocationPaymentId, payments])

  const filteredInvoices = useMemo(() => {
    if (isServerPaginated) return invoices
    const term = invoiceQuery.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (invoiceStatus !== 'all' && invoice.status !== invoiceStatus) return false
      if (studentFilter !== 'all' && String(invoice.student) !== studentFilter) return false
      if (dateFrom && invoice.invoice_date && invoice.invoice_date < dateFrom) return false
      if (dateTo && invoice.invoice_date && invoice.invoice_date > dateTo) return false
      if (!term) return true
      const admission = invoice.student_admission_number?.toLowerCase() ?? ''
      const name = invoice.student_full_name?.toLowerCase() ?? ''
      return (
        admission.includes(term) ||
        name.includes(term) ||
        `inv-${invoice.id}`.includes(term)
      )
    })
  }, [invoiceQuery, invoiceStatus, invoices, isServerPaginated, studentFilter, dateFrom, dateTo])

  const statusBadge = (status: string, balanceDue?: number, totalAmount?: number) => {
    const normalized = status?.toLowerCase?.() ?? ''
    const balance = Number(balanceDue ?? 0)
    const total = Number(totalAmount ?? 0)
    let label = status || 'Unknown'
    if (!status) {
      if (balance <= 0 && total > 0) label = 'Paid'
      else if (balance < total && total > 0) label = 'Partially Paid'
      else label = 'Unpaid'
    }
    const color =
      normalized.includes('paid') || label.toLowerCase().includes('paid')
        ? 'border-emerald-400/40 text-emerald-200'
        : normalized.includes('overdue')
          ? 'border-rose-400/40 text-rose-200'
          : normalized.includes('draft') || normalized.includes('void')
            ? 'border-slate-500/40 text-slate-300'
            : 'border-amber-400/40 text-amber-200'
    return (
      <span className={`rounded-full border px-2 py-1 text-xs ${color}`}>{label}</span>
    )
  }

  const pagedInvoices = useMemo(() => {
    if (isServerPaginated) return filteredInvoices
    const start = (invoicePage - 1) * pageSize
    return filteredInvoices.slice(start, start + pageSize)
  }, [filteredInvoices, invoicePage, isServerPaginated])

  const totalInvoicePages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredInvoices.length) / pageSize),
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiClient.delete(`/finance/invoices/${deleteTarget.id}/`)
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setDeleteError(detail ?? 'Unable to delete invoice.')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleContext = async (invoice: Invoice) => {
    if (openContextId === invoice.id) {
      setOpenContextId(null)
      return
    }
    setOpenContextId(invoice.id)
    const studentId = invoice.student
    if (studentDetails[studentId] && studentEnrollments[studentId] !== undefined) {
      return
    }
    setDetailLoadingId(invoice.id)
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

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="FINANCE MODULE"
        badgeColor="emerald"
        title="Invoices"
        subtitle="Manage invoice lifecycle and allocations."
        icon="💰"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading invoices...</p>
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
            <h2 className="text-lg font-display font-semibold">Invoice list</h2>
            <p className="mt-1 text-sm text-slate-400">From `/api/finance/invoices/`</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PrintButton />
            <input
              className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Search invoice or admission #"
              value={invoiceQuery}
              onChange={(event) => {
                setInvoiceQuery(event.target.value)
                setInvoicePage(1)
              }}
            />
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={invoiceStatus}
              onChange={(event) => {
                setInvoiceStatus(event.target.value)
                setInvoicePage(1)
              }}
            >
              <option value="all">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="VOID">Void</option>
            </select>
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={studentFilter}
              onChange={(event) => {
                setStudentFilter(event.target.value)
                setInvoicePage(1)
              }}
            >
              <option value="all">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="w-full max-w-[150px] rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setInvoicePage(1)
              }}
            />
            <input
              type="date"
              className="w-full max-w-[150px] rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setInvoicePage(1)
              }}
            />
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => navigate('/modules/finance/invoices/new')}
            >
              Create invoice
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Invoice Date</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount Paid</th>
                <th className="px-4 py-3">Due Amount</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pagedInvoices.map((invoice, index) => (
                <Fragment key={invoice.id}>
                  <tr className="bg-slate-950/60">
                    <td className="px-4 py-3 text-slate-400">
                      {(invoicePage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold">INV-{invoice.id}</td>
                    <td className="px-4 py-3">
                      {invoice.student_full_name ??
                        invoice.student_admission_number ??
                        invoice.student}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.invoice_date ?? invoice.created_at ?? '--'}
                    </td>
                    <td className="px-4 py-3">{invoice.due_date ?? '--'}</td>
                    <td className="px-4 py-3">
                      {statusBadge(
                        invoice.status,
                        invoice.balance_due,
                        invoice.total_amount,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {Number(
                        (invoice.total_amount ?? 0) - (invoice.balance_due ?? 0),
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(invoice.balance_due ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                      >
                        View
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                        onClick={() => toggleContext(invoice)}
                      >
                        {openContextId === invoice.id ? 'Hide context' : 'Context'}
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                        onClick={() => navigate(`/modules/finance/invoices/${invoice.id}/edit`)}
                      >
                        Edit
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                        onClick={() => setDeleteTarget(invoice)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {openContextId === invoice.id ? (
                    <tr className="bg-slate-950/40">
                      <td colSpan={9} className="px-4 py-4">
                        {detailLoadingId === invoice.id ? (
                          <p className="text-xs text-slate-400">Loading student context...</p>
                        ) : (
                          <div className="grid gap-4 rounded-2xl border border-white/[0.07] bg-slate-950/60 p-4 md:grid-cols-3">
                            <div>
                              <p className="text-[11px] uppercase text-slate-400">Class / Term</p>
                              <p className="text-sm text-slate-200">
                                {studentEnrollments[invoice.student]?.class_name ?? '--'} /{' '}
                                {studentEnrollments[invoice.student]?.term_name ?? '--'}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-[11px] uppercase text-slate-400">
                                Parents / Guardians
                              </p>
                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                {(studentDetails[invoice.student]?.guardians ?? []).length > 0 ? (
                                  studentDetails[invoice.student]?.guardians?.map((guardian) => (
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
              {pagedInvoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={9}>
                    No invoices found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {invoicePage} of {totalInvoicePages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={invoicePage === 1}
              onClick={() => setInvoicePage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
              disabled={invoicePage === totalInvoicePages}
              onClick={() => setInvoicePage((prev) => Math.min(totalInvoicePages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedInvoiceId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="flex w-full max-w-4xl max-h-[90vh] flex-col rounded-2xl border border-white/[0.07] bg-slate-950">
            <div className="flex flex-shrink-0 items-center justify-between rounded-t-2xl border-b border-white/[0.07] bg-slate-950 px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
                  onClick={() => setSelectedInvoiceId(null)}
                >
                  ← Back
                </button>
                <h3 className="text-lg font-display font-semibold">Invoice detail</h3>
              </div>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-400 hover:text-white transition"
                onClick={() => setSelectedInvoiceId(null)}
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl glass-panel p-4 lg:col-span-2">
                <h4 className="text-base font-semibold">INV-{selectedInvoiceId}</h4>
                {invoiceDetail ? (
                  <>
                    <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase text-slate-400">Student</p>
                        <p>
                          {invoiceDetail.student_full_name ??
                            invoiceDetail.student_admission_number ??
                            invoiceDetail.student}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-400">Status</p>
                        <p>{invoiceDetail.status}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-400">Balance</p>
                        <p>{formatMoney(invoiceDetail.balance_due ?? 0)}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-slate-300 md:grid-cols-3">
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Class</p>
                        <p>{studentEnrollment?.class_name ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Term</p>
                        <p>{studentEnrollment?.term_name ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Admission #</p>
                        <p>{studentDetail?.admission_number ?? '--'}</p>
                      </div>
                    </div>
                    {studentInfoNotice ? (
                      <p className="mt-2 text-[11px] text-amber-200">{studentInfoNotice}</p>
                    ) : null}
                    <div className="mt-4 rounded-xl border border-white/[0.07] p-3">
                      <p className="text-xs uppercase text-slate-400">Parents / Guardians</p>
                      <div className="mt-2 space-y-2 text-xs text-slate-300">
                        {(studentDetail?.guardians ?? []).length > 0 ? (
                          studentDetail?.guardians?.map((guardian) => (
                            <div key={guardian.id} className="rounded-lg border border-white/[0.07] p-2">
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
                    <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.07]">
                      <table className="min-w-[420px] w-full text-left text-sm">
                        <thead className="bg-white/[0.03] text-xs uppercase text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {(invoiceDetail.line_items ?? []).map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">{item.description}</td>
                              <td className="px-3 py-2">{formatMoney(item.amount)}</td>
                            </tr>
                          ))}
                          {(invoiceDetail.line_items ?? []).length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-slate-400" colSpan={2}>
                                No line items available.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 rounded-xl border border-white/[0.07] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase text-slate-400">Installment Plan</p>
                        <span className="text-xs text-slate-400">
                          {installmentPlan?.installment_count ? `${installmentPlan.installment_count} installments` : 'Not configured'}
                        </span>
                      </div>
                      {(installmentPlan?.installments ?? []).length > 0 ? (
                        <div className="mt-2 space-y-2 text-xs text-slate-300">
                          {installmentPlan?.installments?.map((inst) => (
                            <div key={inst.id} className="flex items-center justify-between rounded-lg border border-white/[0.07] p-2">
                              <span>#{inst.sequence} • Due {inst.due_date}</span>
                              <span>
                                {Number(inst.collected_amount ?? 0).toLocaleString()} / {Number(inst.amount).toLocaleString()} • {inst.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No installment plan configured.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">Loading invoice detail...</p>
                )}
              </div>
              <div className="rounded-2xl glass-panel p-4">
                <h4 className="text-base font-semibold">Allocate payment</h4>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="uppercase text-slate-400">Student</span>
                      <span>
                        {selectedStudent
                          ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                          : invoiceDetail?.student ?? '--'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="uppercase text-slate-400">Current balance</span>
                      <span>{formatMoney(invoiceDetail?.balance_due ?? 0)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="uppercase text-slate-400">Class / Term</span>
                      <span>
                        {studentEnrollment?.class_name ?? '--'} /{' '}
                        {studentEnrollment?.term_name ?? '--'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="uppercase text-slate-400">Guardians</span>
                      <span>{(studentDetail?.guardians ?? []).length}</span>
                    </div>
                  </div>
                  <label className="block">
                    Payment
                    <select
                      className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={allocationPaymentId}
                      onChange={(event) => setAllocationPaymentId(event.target.value)}
                    >
                      <option value="">Select payment</option>
                      {filteredPayments.map((payment) => (
                        <option key={payment.id} value={payment.id}>
                          {payment.reference_number} - {formatMoney(payment.amount)}
                        </option>
                      ))}
                    </select>
                    {filteredPayments.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-400">
                        No payments found for this student.
                      </p>
                    ) : null}
                  </label>
                  <label className="block">
                    Installment (optional)
                    <select
                      className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={allocationInstallmentId}
                      onChange={(event) => setAllocationInstallmentId(event.target.value)}
                    >
                      <option value="">Auto by due order</option>
                      {(installmentPlan?.installments ?? [])
                        .filter((inst) => inst.status !== 'PAID' && inst.status !== 'WAIVED')
                        .map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            #{inst.sequence} • Due {inst.due_date} • Outstanding {Number(inst.outstanding_amount ?? 0).toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block">
                    Payment date
                    <input
                      type="date"
                      className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={allocationDate}
                      onChange={(event) => setAllocationDate(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    Amount
                    <input
                      className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={allocationAmount}
                      onChange={(event) => setAllocationAmount(event.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                  <label className="block">
                    Notes
                    <textarea
                      className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                      value={allocationNotes}
                      onChange={(event) => setAllocationNotes(event.target.value)}
                      rows={3}
                    />
                  </label>
                  {allocationError ? (
                    <p className="text-xs text-rose-300">{allocationError}</p>
                  ) : null}
                  <button
                    className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isAllocating}
                    onClick={handleAllocatePayment}
                  >
                    {isAllocating ? 'Allocating...' : 'Allocate payment'}
                  </button>
                  <button
                    className="w-full rounded-lg border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isAllocating}
                    onClick={handleAutoAllocatePayment}
                  >
                    {isAllocating ? 'Working...' : 'Auto-allocate payment'}
                  </button>
                  <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3 text-xs text-slate-300">
                    <p className="text-[11px] uppercase text-slate-400">Installment setup</p>
                    <div className="mt-2 space-y-2">
                      <input
                        className="w-full rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs text-white"
                        value={installmentCountInput}
                        onChange={(event) => setInstallmentCountInput(event.target.value)}
                        placeholder="Installment count"
                      />
                      <input
                        className="w-full rounded-lg border border-white/[0.07] bg-slate-950 px-2 py-1 text-xs text-white"
                        value={installmentDatesInput}
                        onChange={(event) => setInstallmentDatesInput(event.target.value)}
                        placeholder="YYYY-MM-DD, YYYY-MM-DD, ..."
                      />
                      <button
                        className="w-full rounded-lg border border-white/[0.09] px-2 py-1 text-xs text-slate-200 disabled:opacity-70"
                        onClick={handleCreateInstallmentPlan}
                        disabled={isSavingInstallmentPlan}
                      >
                        {isSavingInstallmentPlan ? 'Saving...' : 'Save installment plan'}
                      </button>
                      {installmentMessage ? <p className="text-[11px] text-amber-200">{installmentMessage}</p> : null}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3 text-xs text-slate-300">
                    <p className="text-[11px] uppercase text-slate-400">Outstanding invoices</p>
                    {outstandingInvoices.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {outstandingInvoices.map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between">
                            <span>INV-{invoice.id}</span>
                            <span>
                              Due {invoice.due_date ?? '--'} | Balance{' '}
                              {formatMoney(invoice.balance_due ?? 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-400">
                        No other outstanding invoices for this student.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete invoice"
        description={
          <>
            This will void <strong>INV-{deleteTarget?.id}</strong>. Continue?
          </>
        }
        confirmLabel="Confirm delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
