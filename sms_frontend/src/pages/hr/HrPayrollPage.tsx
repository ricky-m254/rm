import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { downloadFromResponse } from '../../utils/download'
import { extractApiErrorMessage } from '../../utils/forms'
import PayslipPrintModal from '../../components/PayslipPrintModal'
import PageHero from '../../components/PageHero'

type Employee = {
  id: number
  employee_id: string
  full_name: string
}

type SalaryStructure = {
  id: number
  employee: number
  employee_name: string
  basic_salary: string
  currency: string
  pay_frequency: string
  effective_from: string
  effective_to: string | null
}

type SalaryComponent = {
  id: number
  structure: number
  component_type: 'Allowance' | 'Deduction'
  name: string
  amount_type: 'Fixed' | 'Percentage'
  amount: string
  is_taxable: boolean
  is_statutory: boolean
}

type ComponentItem = {
  name: string
  component_type: 'Allowance' | 'Deduction'
  amount_type: string
  amount: number
  is_taxable: boolean
}

type PayrollBreakdownRow = {
  id: number
  payroll_item: number
  line_type: 'ALLOWANCE' | 'ATTENDANCE_DEDUCTION' | 'STATUTORY_EMPLOYEE' | 'STATUTORY_EMPLOYER' | 'OTHER_DEDUCTION'
  code: string
  name: string
  base_amount: string
  rate: string
  amount: string
  display_order: number
  snapshot: Record<string, unknown>
}

type PayrollItem = {
  id: number
  payroll: number
  payroll_month: number
  payroll_year: number
  payroll_payment_date: string | null
  employee: number
  employee_name: string
  employee_id_str: string
  department_name: string
  position_name: string
  currency: string
  pay_frequency: string
  basic_salary: string
  total_allowances: string
  attendance_deduction_total: string
  statutory_deduction_total: string
  other_deduction_total: string
  employer_statutory_total: string
  total_deductions: string
  gross_salary: string
  net_salary: string
  net_payable: string
  days_worked: string
  overtime_hours: string
  posting_bucket: string
  is_blocked: boolean
  block_reason: string
  calculation_snapshot: Record<string, unknown>
  components: ComponentItem[]
  breakdown_rows: PayrollBreakdownRow[]
  sent_at: string | null
}

type PayrollDisbursement = {
  id: number
  payroll: number
  method: 'BANK' | 'CASH' | 'MOBILE' | 'MIXED'
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  reference: string
  total_amount: string
  scheduled_date: string | null
  disbursed_at: string | null
  disbursed_by: number | null
  disbursed_by_name: string
  notes: string
  created_at: string
  updated_at: string
}

type PayrollFinancePosting = {
  id: number
  payroll: number
  posting_stage: 'ACCRUAL' | 'DISBURSEMENT'
  entry_key: string
  status: 'PENDING' | 'POSTED' | 'FAILED'
  journal_entry: number | null
  cashbook_entry: number | null
  posted_by: number | null
  posted_by_name: string
  posted_at: string | null
  vote_head_summary: Record<string, string>
  error_message: string
  created_at: string
}

type PayrollBatch = {
  id: number
  month: number
  year: number
  status: string
  total_gross: string
  total_deductions: string
  total_net: string
  processed_by: number | null
  approved_by: number | null
  approved_at: string | null
  finance_approved_by: number | null
  finance_approved_at: string | null
  disbursed_by: number | null
  disbursed_at: string | null
  posted_by: number | null
  posted_at: string | null
  payment_date: string | null
  exception_count: number
  blocked_item_count: number
  workforce_snapshot?: {
    month?: number
    year?: number
    employee_count?: number
    source_employee_count?: number
    generated_at?: string
    results?: WorkforceFeedRow[]
  }
  statutory_snapshot?: {
    as_of_date?: string
    rules?: StatutoryRule[]
  }
  approval_notes: string
  bucket_totals?: Record<string, string>
  statutory_totals?: {
    employee_total: string
    employer_total: string
    liability_total: string
  }
  created_at: string
  disbursements?: PayrollDisbursement[]
  finance_postings?: PayrollFinancePosting[]
  items?: PayrollItem[]
}

type WorkforceLeaveItem = {
  leave_type_id: number
  leave_type_name: string
  days: string
}

type WorkforceFeedRow = {
  employee: number
  employee_id: string
  employee_name: string
  present_days: number
  late_days: number
  half_days: number
  overtime_hours: string
  approved_leave_days_total: string
  approved_leave_by_type: WorkforceLeaveItem[]
  blocked_alert_days: number
  blocked_reconciliation_days: number
  blocked_leave_days: number
  open_return_reconciliation_count: number
  is_payroll_ready: boolean
}

type WorkforceFeedResponse = {
  month: number
  year: number
  employee_count: number
  results: WorkforceFeedRow[]
}

type PayrollExceptionItem = {
  payroll_item_id: number
  employee: number
  employee_id: string
  employee_name: string
  posting_bucket: string
  is_blocked: boolean
  block_reason: string
  blocking_reasons: string[]
  missing_posting_bucket: boolean
}

type PayrollExceptionSummary = {
  payroll_id: number
  status: string
  blocked_item_count: number
  exception_count: number
  workforce_blocker_count: number
  missing_identifier_count: number
  missing_bucket_count: number
  reconciliation: {
    item_count: number
    item_totals: Record<string, string>
    batch_totals: Record<string, string>
    is_balanced: boolean
  }
  items: PayrollExceptionItem[]
}

type PayrollPostingSummary = {
  payroll_id: number
  status: string
  finance_approved_at: string | null
  disbursed_at: string | null
  posted_at: string | null
  has_completed_disbursement: boolean
  can_post_to_finance: boolean
  latest_disbursement: {
    id: number
    method: string
    status: string
    reference: string
    total_amount: string
    disbursed_at: string | null
  } | null
  exception_summary: PayrollExceptionSummary
  postings: Array<{
    posting_stage: string
    status: string
    entry_key: string
    journal_entry_id: number | null
    cashbook_entry_id: number | null
    posted_at: string | null
    vote_head_summary: Record<string, string>
    error_message: string
  }>
}

type StatutoryBand = {
  id: number
  rule: number
  lower_bound: string
  upper_bound: string | null
  employee_rate: string
  employer_rate: string
  fixed_amount: string
  additional_amount: string
  display_order: number
  is_active: boolean
}

type StatutoryRule = {
  id: number
  code: string
  name: string
  calculation_method: 'BAND' | 'PERCENT' | 'FIXED'
  base_name: string
  employee_rate: string
  employer_rate: string
  fixed_amount: string
  minimum_amount: string
  maximum_amount: string | null
  relief_amount: string
  is_kenya_default: boolean
  is_mandatory: boolean
  effective_from: string
  effective_to: string | null
  priority: number
  configuration_notes: string
  is_active: boolean
  created_at: string
  updated_at: string
  bands: StatutoryBand[]
}

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'TZS', 'UGX']

const defaultStructureForm = {
  employee: '',
  basic_salary: '',
  currency: 'KES',
  pay_frequency: 'Monthly',
  effective_from: '',
  effective_to: '',
}

const defaultComponentForm = {
  structure: '',
  component_type: 'Allowance' as 'Allowance' | 'Deduction',
  name: '',
  amount_type: 'Fixed' as 'Fixed' | 'Percentage',
  amount: '',
  is_taxable: true,
  is_statutory: false,
}

function asArray<T>(value: T[] | { results?: T[] } | undefined): T[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (Array.isArray(value.results)) return value.results
  return []
}

function readinessTone(isReady: boolean) {
  return isReady
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
}

function payrollStatusTone(statusValue: string) {
  switch (statusValue) {
    case 'Draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    case 'Ready for Finance Approval':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200'
    case 'Approved':
    case 'Finance Approved':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    case 'Disbursement In Progress':
      return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200'
    case 'Paid':
    case 'Disbursed':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-200'
    case 'Finance Posted':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
    case 'Closed':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-200'
    default:
      return 'border-white/10 bg-white/5 text-slate-200'
  }
}

function fmtMoney(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  return `Ksh ${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toNumber(value: string | number | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function breakdownCategoryLabel(lineType: PayrollBreakdownRow['line_type']) {
  switch (lineType) {
    case 'ALLOWANCE':
      return 'Allowance'
    case 'ATTENDANCE_DEDUCTION':
      return 'Attendance'
    case 'STATUTORY_EMPLOYEE':
      return 'Statutory'
    case 'STATUTORY_EMPLOYER':
      return 'Employer'
    case 'OTHER_DEDUCTION':
      return 'Other'
    default:
      return lineType
  }
}

export default function HrPayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [structures, setStructures] = useState<SalaryStructure[]>([])
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [payrolls, setPayrolls] = useState<PayrollBatch[]>([])
  const [payslips, setPayslips] = useState<PayrollItem[]>([])
  const [statutoryRules, setStatutoryRules] = useState<StatutoryRule[]>([])
  const [workforceFeed, setWorkforceFeed] = useState<WorkforceFeedResponse | null>(null)
  const [workforceFeedLoading, setWorkforceFeedLoading] = useState(false)
  const [workforceFeedError, setWorkforceFeedError] = useState<string | null>(null)
  const [selectedExceptions, setSelectedExceptions] = useState<PayrollExceptionSummary | null>(null)
  const [selectedPostingSummary, setSelectedPostingSummary] = useState<PayrollPostingSummary | null>(null)
  const [selectedDiagnosticsLoading, setSelectedDiagnosticsLoading] = useState(false)
  const [selectedDiagnosticsError, setSelectedDiagnosticsError] = useState<string | null>(null)

  const [structureForm, setStructureForm] = useState(defaultStructureForm)
  const [componentForm, setComponentForm] = useState(defaultComponentForm)
  const [runMonth, setRunMonth] = useState(String(new Date().getMonth() + 1))
  const [runYear, setRunYear] = useState(String(new Date().getFullYear()))
  const [paymentDate, setPaymentDate] = useState('')
  const [selectedPayrollId, setSelectedPayrollId] = useState('')

  const [printSlip, setPrintSlip] = useState<PayrollItem | null>(null)
  const [schoolName, setSchoolName] = useState('Rynaty School Management System')

  const [editingStructureId, setEditingStructureId] = useState<number | null>(null)
  const [editStructureForm, setEditStructureForm] = useState(defaultStructureForm)
  const [editingComponentId, setEditingComponentId] = useState<number | null>(null)
  const [editComponentForm, setEditComponentForm] = useState(defaultComponentForm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ type: 'structure' | 'component'; id: number } | null>(null)

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [employeesRes, structuresRes, componentsRes, payrollsRes, rulesRes, profileRes] = await Promise.all([
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
        apiClient.get<SalaryStructure[] | { results: SalaryStructure[] }>('/hr/salary-structures/'),
        apiClient.get<SalaryComponent[] | { results: SalaryComponent[] }>('/hr/salary-components/'),
        apiClient.get<PayrollBatch[] | { results: PayrollBatch[] }>('/hr/payrolls/'),
        apiClient.get<StatutoryRule[] | { results: StatutoryRule[] }>('/hr/statutory-rules/'),
        apiClient.get<{ name?: string }>('/school/profile/').catch(() => ({ data: {} })),
      ])
      const profileName = (profileRes as { data: { name?: string } }).data?.name
      if (profileName) setSchoolName(profileName)

      const employeeRows = asArray(employeesRes.data)
      const structureRows = asArray(structuresRes.data)
      const componentRows = asArray(componentsRes.data)
      const payrollRows = asArray(payrollsRes.data)
      const ruleRows = asArray(rulesRes.data)

      setEmployees(employeeRows)
      setStructures(structureRows)
      setComponents(componentRows)
      setPayrolls(payrollRows)
      setStatutoryRules(ruleRows)

      if (payrollRows.length > 0) {
        setSelectedPayrollId((current) => current || String(payrollRows[0].id))
      }
    } catch {
      setError('Unable to load payroll data.')
    } finally {
      setLoading(false)
    }
  }

  const loadPayslips = async (payrollId: string) => {
    if (!payrollId) {
      setPayslips([])
      return
    }
    try {
      const response = await apiClient.get<PayrollItem[] | { results: PayrollItem[] }>(`/hr/payslips/?payroll=${payrollId}`)
      setPayslips(asArray(response.data))
    } catch {
      setError('Unable to load payslips for selected payroll.')
    }
  }

  const loadWorkforceFeed = async (month: string, year: string) => {
    if (!month || !year) {
      setWorkforceFeed(null)
      return
    }
    setWorkforceFeedLoading(true)
    setWorkforceFeedError(null)
    try {
      const response = await apiClient.get<WorkforceFeedResponse>(`/hr/payrolls/workforce-feed/?month=${month}&year=${year}`)
      setWorkforceFeed(response.data)
    } catch (err) {
      setWorkforceFeedError(extractApiErrorMessage(err, 'Unable to load workforce readiness feed.'))
    } finally {
      setWorkforceFeedLoading(false)
    }
  }

  const loadSelectedPayrollDiagnostics = async (payrollId: string) => {
    if (!payrollId) {
      setSelectedExceptions(null)
      setSelectedPostingSummary(null)
      setSelectedDiagnosticsError(null)
      return
    }
    setSelectedDiagnosticsLoading(true)
    setSelectedDiagnosticsError(null)
    try {
      const [exceptionsRes, postingSummaryRes] = await Promise.all([
        apiClient.get<PayrollExceptionSummary>(`/hr/payrolls/${payrollId}/exceptions/`),
        apiClient.get<PayrollPostingSummary>(`/hr/payrolls/${payrollId}/posting-summary/`),
      ])
      setSelectedExceptions(exceptionsRes.data)
      setSelectedPostingSummary(postingSummaryRes.data)
    } catch (err) {
      setSelectedDiagnosticsError(extractApiErrorMessage(err, 'Unable to load payroll diagnostics.'))
    } finally {
      setSelectedDiagnosticsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    try {
      const raw = localStorage.getItem('settings:finance')
      if (raw) {
        const parsed = JSON.parse(raw) as { defaultCurrency?: string }
        if (parsed.defaultCurrency && CURRENCIES.includes(parsed.defaultCurrency)) {
          setStructureForm((prev) => ({ ...prev, currency: parsed.defaultCurrency! }))
        }
      }
    } catch {
      // ignore localStorage read errors
    }
  }, [])

  useEffect(() => {
    void loadPayslips(selectedPayrollId)
  }, [selectedPayrollId])

  useEffect(() => {
    void loadSelectedPayrollDiagnostics(selectedPayrollId)
  }, [selectedPayrollId])

  const selectedPayroll = useMemo(
    () => payrolls.find((batch) => String(batch.id) === selectedPayrollId) ?? null,
    [payrolls, selectedPayrollId],
  )

  const workforceMonth = String(selectedPayroll?.month ?? Number(runMonth || new Date().getMonth() + 1))
  const workforceYear = String(selectedPayroll?.year ?? Number(runYear || new Date().getFullYear()))

  const workforceSummary = useMemo(() => {
    const rows = workforceFeed?.results ?? []
    return {
      readyCount: rows.filter((row) => row.is_payroll_ready).length,
      alertBlockers: rows.reduce((sum, row) => sum + row.blocked_alert_days, 0),
      reconciliationBlockers: rows.reduce((sum, row) => sum + row.blocked_reconciliation_days + row.open_return_reconciliation_count, 0),
      leaveBlockers: rows.reduce((sum, row) => sum + row.blocked_leave_days, 0),
    }
  }, [workforceFeed])

  const selectedPayrollItems = selectedPayroll?.items ?? []

  const selectedBatchRollups = useMemo(() => {
    const bucketTotals: Record<string, number> = {}
    let statutoryEmployee = 0
    let statutoryEmployer = 0
    let blockedItems = 0

    selectedPayrollItems.forEach((item) => {
      statutoryEmployee += toNumber(item.statutory_deduction_total)
      statutoryEmployer += toNumber(item.employer_statutory_total)
      if (item.is_blocked) blockedItems += 1
      if (item.posting_bucket) {
        bucketTotals[item.posting_bucket] = (bucketTotals[item.posting_bucket] ?? 0)
          + toNumber(item.net_payable)
          + toNumber(item.statutory_deduction_total)
          + toNumber(item.employer_statutory_total)
      }
    })

    return {
      bucketTotals,
      statutoryEmployee,
      statutoryEmployer,
      blockedItems,
      payslipCount: selectedPayrollItems.length,
    }
  }, [selectedPayrollItems])

  useEffect(() => {
    void loadWorkforceFeed(workforceMonth, workforceYear)
  }, [workforceMonth, workforceYear])

  const createStructure = async () => {
    if (!structureForm.employee || !structureForm.basic_salary || !structureForm.effective_from) {
      setError('Employee, basic salary, and effective from are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/salary-structures/', {
        employee: Number(structureForm.employee),
        basic_salary: Number(structureForm.basic_salary),
        currency: structureForm.currency.trim() || 'KES',
        pay_frequency: structureForm.pay_frequency,
        effective_from: structureForm.effective_from,
        effective_to: structureForm.effective_to || null,
      })
      setStructureForm(defaultStructureForm)
      setNotice('Salary structure created.')
      await load()
    } catch {
      setError('Unable to create salary structure.')
    } finally {
      setWorking(false)
    }
  }

  const createComponent = async () => {
    if (!componentForm.structure || !componentForm.name || !componentForm.amount) {
      setError('Structure, component name, and amount are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/salary-components/', {
        structure: Number(componentForm.structure),
        component_type: componentForm.component_type,
        name: componentForm.name.trim(),
        amount_type: componentForm.amount_type,
        amount: Number(componentForm.amount),
        is_taxable: componentForm.is_taxable,
        is_statutory: componentForm.is_statutory,
      })
      setComponentForm(defaultComponentForm)
      setNotice('Salary component created.')
      await load()
    } catch {
      setError('Unable to create salary component.')
    } finally {
      setWorking(false)
    }
  }

  const processPayroll = async () => {
    if (!runMonth || !runYear) {
      setError('Month and year are required to process payroll.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const response = await apiClient.post<PayrollBatch>('/hr/payrolls/process/', {
        month: Number(runMonth),
        year: Number(runYear),
        payment_date: paymentDate || null,
      })
      setNotice(`Payroll processed for ${response.data.month}/${response.data.year}.`)
      await load()
      setSelectedPayrollId(String(response.data.id))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to process payroll.'))
    } finally {
      setWorking(false)
    }
  }

  const financeApprovePayroll = async (payrollId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const response = await apiClient.post<PayrollBatch>(`/hr/payrolls/${payrollId}/finance-approve/`, {
        approval_notes: 'Finance approved from HR payroll workbench.',
      })
      setNotice(`Payroll finance approved for ${response.data.month}/${response.data.year}.`)
      await load()
      await loadPayslips(String(payrollId))
      await loadSelectedPayrollDiagnostics(String(payrollId))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to finance approve payroll.'))
    } finally {
      setWorking(false)
    }
  }

  const startDisbursement = async (batch: PayrollBatch) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/payrolls/${batch.id}/start-disbursement/`, {
        method: 'BANK',
        scheduled_date: batch.payment_date || paymentDate || null,
        reference: `PAY-${batch.year}-${String(batch.month).padStart(2, '0')}`,
        notes: 'Disbursement started from HR payroll workbench.',
      })
      setNotice('Disbursement started.')
      await load()
      await loadSelectedPayrollDiagnostics(String(batch.id))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to start payroll disbursement.'))
    } finally {
      setWorking(false)
    }
  }

  const markDisbursed = async (batch: PayrollBatch) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/payrolls/${batch.id}/mark-disbursed/`, {
        reference: `PAY-${batch.year}-${String(batch.month).padStart(2, '0')}-DONE`,
        notes: 'Disbursement completed from HR payroll workbench.',
        disbursed_at: new Date().toISOString(),
      })
      setNotice('Payroll marked as disbursed.')
      await load()
      await loadSelectedPayrollDiagnostics(String(batch.id))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to mark payroll as disbursed.'))
    } finally {
      setWorking(false)
    }
  }

  const postToFinance = async (batch: PayrollBatch) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/payrolls/${batch.id}/post-to-finance/`, {
        entry_date: batch.payment_date || paymentDate || null,
      })
      setNotice('Payroll posted to finance.')
      await load()
      await loadSelectedPayrollDiagnostics(String(batch.id))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to post payroll to finance.'))
    } finally {
      setWorking(false)
    }
  }

  const downloadBankFile = async (payrollId: number) => {
    try {
      const response = await apiClient.get(`/hr/payrolls/${payrollId}/bank-file/`, { responseType: 'blob' })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        `payroll_bank_file_${payrollId}.csv`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download bank file.'))
    }
  }

  const downloadTaxReport = async () => {
    try {
      const response = await apiClient.get(`/hr/payrolls/tax-report/?month=${runMonth}&year=${runYear}`, {
        responseType: 'blob',
      })
      downloadFromResponse(
        response as { data: Blob; headers?: Record<string, unknown> },
        `payroll_tax_report_${runYear}_${runMonth}.csv`,
      )
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to download tax report.'))
    }
  }

  const viewPayslip = (item: PayrollItem) => {
    setPrintSlip(item)
  }

  const startEditStructure = (s: SalaryStructure) => {
    setEditingStructureId(s.id)
    setEditStructureForm({
      employee: String(s.employee),
      basic_salary: s.basic_salary,
      currency: s.currency,
      pay_frequency: s.pay_frequency,
      effective_from: s.effective_from,
      effective_to: s.effective_to ?? '',
    })
  }

  const saveStructureEdit = async () => {
    if (!editingStructureId) return
    setWorking(true)
    setError(null)
    try {
      await apiClient.patch(`/hr/salary-structures/${editingStructureId}/`, {
        basic_salary: Number(editStructureForm.basic_salary),
        currency: editStructureForm.currency,
        pay_frequency: editStructureForm.pay_frequency,
        effective_from: editStructureForm.effective_from,
        effective_to: editStructureForm.effective_to || null,
      })
      setEditingStructureId(null)
      setNotice('Salary structure updated.')
      await load()
    } catch {
      setError('Unable to update salary structure.')
    } finally {
      setWorking(false)
    }
  }

  const deleteStructure = async (id: number) => {
    setWorking(true)
    setError(null)
    try {
      await apiClient.patch(`/hr/salary-structures/${id}/`, { is_active: false })
      setConfirmDeleteId(null)
      setNotice('Salary structure removed.')
      await load()
    } catch {
      setError('Unable to remove salary structure.')
    } finally {
      setWorking(false)
    }
  }

  const startEditComponent = (c: SalaryComponent) => {
    setEditingComponentId(c.id)
    setEditComponentForm({
      structure: String(c.structure),
      component_type: c.component_type,
      name: c.name,
      amount_type: c.amount_type,
      amount: c.amount,
      is_taxable: c.is_taxable,
      is_statutory: c.is_statutory,
    })
  }

  const saveComponentEdit = async () => {
    if (!editingComponentId) return
    setWorking(true)
    setError(null)
    try {
      await apiClient.patch(`/hr/salary-components/${editingComponentId}/`, {
        name: editComponentForm.name,
        component_type: editComponentForm.component_type,
        amount_type: editComponentForm.amount_type,
        amount: Number(editComponentForm.amount),
        is_taxable: editComponentForm.is_taxable,
        is_statutory: editComponentForm.is_statutory,
      })
      setEditingComponentId(null)
      setNotice('Salary component updated.')
      await load()
    } catch {
      setError('Unable to update salary component.')
    } finally {
      setWorking(false)
    }
  }

  const deleteComponent = async (id: number) => {
    setWorking(true)
    setError(null)
    try {
      await apiClient.patch(`/hr/salary-components/${id}/`, { is_active: false })
      setConfirmDeleteId(null)
      setNotice('Salary component removed.')
      await load()
    } catch {
      setError('Unable to remove salary component.')
    } finally {
      setWorking(false)
    }
  }

  const emailPayslips = async () => {
    if (payslips.length === 0) {
      setError('No payslips available for selected payroll.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/payslips/email/', { payslip_ids: payslips.map((item) => item.id) })
      setNotice('Payslips marked as sent.')
      await loadPayslips(selectedPayrollId)
    } catch {
      setError('Unable to mark payslips as sent.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Payroll"
        subtitle="Monthly salary processing and pay slips"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Payroll</p>
            <h1 className="mt-2 text-2xl font-display font-semibold">Salary Structures, Processing, and Payslips</h1>
          </div>
          <Link
            to="/modules/finance"
            className="shrink-0 rounded-xl border border-emerald-700/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
          >
            Finance Module →
          </Link>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Default currency is read from Finance settings. Go to Finance → Settings to change it.
        </p>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Salary Structure</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">
              Employee
              <select
                value={structureForm.employee}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, employee: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_id} - {employee.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Basic Salary
              <input
                value={structureForm.basic_salary}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, basic_salary: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
              />
            </label>
            <label className="text-xs text-slate-300">
              Currency
              <select
                value={structureForm.currency}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, currency: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Pay Frequency
              <select
                value={structureForm.pay_frequency}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, pay_frequency: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              >
                <option>Monthly</option>
                <option>Bi-weekly</option>
                <option>Weekly</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Effective From
              <input
                value={structureForm.effective_from}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, effective_from: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
                type="date"
              />
            </label>
            <label className="text-xs text-slate-300">
              Effective To
              <input
                value={structureForm.effective_to}
                onChange={(event) => setStructureForm((prev) => ({ ...prev, effective_to: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
                type="date"
              />
            </label>
          </div>
          <button
            onClick={createStructure}
            disabled={working}
            className="mt-4 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {working ? 'Saving...' : 'Save Structure'}
          </button>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Create Salary Component</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300 sm:col-span-2">
              Salary Structure
              <select
                value={componentForm.structure}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, structure: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">Select structure</option>
                {structures.map((structure) => (
                  <option key={structure.id} value={structure.id}>
                    {structure.employee_name} - {structure.currency} {structure.basic_salary}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Type
              <select
                value={componentForm.component_type}
                onChange={(event) =>
                  setComponentForm((prev) => ({ ...prev, component_type: event.target.value as 'Allowance' | 'Deduction' }))
                }
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="Allowance">Allowance</option>
                <option value="Deduction">Deduction</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Amount Type
              <select
                value={componentForm.amount_type}
                onChange={(event) =>
                  setComponentForm((prev) => ({ ...prev, amount_type: event.target.value as 'Fixed' | 'Percentage' }))
                }
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="Fixed">Fixed</option>
                <option value="Percentage">Percentage</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Name
              <input
                value={componentForm.name}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-300">
              {componentForm.amount_type === 'Percentage' ? 'Percentage of Basic (%)' : 'Fixed Amount (Ksh)'}
              <div className="relative mt-1">
                <input
                  value={componentForm.amount}
                  onChange={(event) => setComponentForm((prev) => ({ ...prev, amount: event.target.value }))}
                  className="w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 pr-8 text-sm"
                  type="number"
                  min="0"
                  max={componentForm.amount_type === 'Percentage' ? '100' : undefined}
                  step={componentForm.amount_type === 'Percentage' ? '0.01' : '0.01'}
                  placeholder={componentForm.amount_type === 'Percentage' ? 'e.g. 5 for 5%' : '0.00'}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  {componentForm.amount_type === 'Percentage' ? '%' : 'Ksh'}
                </span>
              </div>
              {componentForm.amount_type === 'Percentage' && (
                <p className="mt-1 text-xs text-slate-500">This percentage is applied to the employee&apos;s basic salary.</p>
              )}
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={componentForm.is_taxable}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, is_taxable: event.target.checked }))}
              />
              Taxable
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={componentForm.is_statutory}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, is_statutory: event.target.checked }))}
              />
              Statutory
            </label>
          </div>
          <button
            onClick={createComponent}
            disabled={working}
            className="mt-4 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {working ? 'Saving...' : 'Save Component'}
          </button>
        </article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-100">Process Payroll</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-xs text-slate-300">
            Month
            <input
              value={runMonth}
              onChange={(event) => setRunMonth(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              type="number"
              min="1"
              max="12"
            />
          </label>
          <label className="text-xs text-slate-300">
            Year
            <input
              value={runYear}
              onChange={(event) => setRunYear(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              type="number"
              min="2000"
              max="2099"
            />
          </label>
          <label className="text-xs text-slate-300 sm:col-span-2">
            Payment Date
            <input
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.09] bg-slate-950 px-3 py-2 text-sm"
              type="date"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={processPayroll}
            disabled={working}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {working ? 'Processing...' : 'Process Payroll'}
          </button>
          <button
            onClick={downloadTaxReport}
            className="rounded-lg border border-white/[0.09] px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Export Tax Report
          </button>
        </div>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Statutory Rules</h2>
            <p className="mt-1 text-xs text-slate-500">
              Session 8 payroll now snapshots tenant statutory rules into each batch. These rows are the active baseline currently exposed by the backend.
            </p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
            {statutoryRules.length} rule(s)
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Method</th>
                <th className="px-2 py-2">Base</th>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Employer</th>
                <th className="px-2 py-2">Bands</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {statutoryRules.map((rule) => (
                <tr key={rule.id} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2 text-slate-200">
                    <p className="font-semibold">{rule.code}</p>
                    <p className="text-[11px] text-slate-500">{rule.name}</p>
                  </td>
                  <td className="px-2 py-2 text-slate-300">{rule.calculation_method}</td>
                  <td className="px-2 py-2 text-slate-300">{rule.base_name}</td>
                  <td className="px-2 py-2 text-slate-300">{rule.employee_rate || rule.fixed_amount}</td>
                  <td className="px-2 py-2 text-slate-300">{rule.employer_rate || '0.00'}</td>
                  <td className="px-2 py-2 text-slate-300">{rule.bands.length}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${rule.is_active ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-500/30 bg-slate-500/10 text-slate-300'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {statutoryRules.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-400" colSpan={7}>
                    No statutory rules exposed yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Session 7 Workforce Readiness</h2>
            <p className="mt-1 text-xs text-slate-500">
              This additive workforce feed shows which employees are payroll-ready for {workforceMonth}/{workforceYear} and which cases are still blocked by alerts, leave, or reconciliation.
            </p>
          </div>
          {workforceFeedLoading ? <span className="text-xs text-slate-400">Refreshing…</span> : null}
        </div>
        {workforceFeedError ? (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {workforceFeedError}
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Ready Employees</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{workforceSummary.readyCount}</p>
          </article>
          <article className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Alert Blockers</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{workforceSummary.alertBlockers}</p>
          </article>
          <article className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Reconciliation Blockers</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{workforceSummary.reconciliationBlockers}</p>
          </article>
          <article className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Leave Blockers</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{workforceSummary.leaveBlockers}</p>
          </article>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Worked</th>
                <th className="px-2 py-2">Approved Leave</th>
                <th className="px-2 py-2">Blockers</th>
                <th className="px-2 py-2">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {(workforceFeed?.results ?? []).map((row) => (
                <tr key={row.employee} className="border-t border-white/[0.07] align-top">
                  <td className="px-2 py-2 text-slate-200">
                    <p>{row.employee_name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{row.employee_id}</p>
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    <p>Present {row.present_days}</p>
                    <p className="mt-1">Late {row.late_days} • Half-days {row.half_days}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Overtime {row.overtime_hours} hrs</p>
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    <p>{row.approved_leave_days_total} days</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {row.approved_leave_by_type.length
                        ? row.approved_leave_by_type.map((leave) => `${leave.leave_type_name} ${leave.days}`).join(' • ')
                        : 'No approved leave'}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    <p>Alerts {row.blocked_alert_days}</p>
                    <p className="mt-1">Leave {row.blocked_leave_days}</p>
                    <p className="mt-1">Reconciliation {row.blocked_reconciliation_days}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Open returns {row.open_return_reconciliation_count}</p>
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${readinessTone(row.is_payroll_ready)}`}>
                      {row.is_payroll_ready ? 'Ready' : 'Blocked'}
                    </span>
                  </td>
                </tr>
              ))}
              {!workforceFeedLoading && (workforceFeed?.results ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-3 text-slate-400">
                    No workforce readiness rows for the selected period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <article className="rounded-xl glass-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Payroll Batches</h2>
              <p className="mt-1 text-xs text-slate-500">Session 8 lifecycle: process, finance approve, disburse, post to finance.</p>
            </div>
            {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Period</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Blocked</th>
                  <th className="px-2 py-2">Net</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((batch) => {
                  const isSelected = selectedPayrollId === String(batch.id)
                  const canFinanceApprove = (batch.status === 'Ready for Finance Approval' || batch.status === 'Approved') && !batch.finance_approved_at
                  const canStartDisbursement = (batch.status === 'Finance Approved' || (batch.status === 'Approved' && !!batch.finance_approved_at))
                  const canMarkDisbursed = batch.status === 'Disbursement In Progress'
                  const canPostFinance = batch.status === 'Disbursed'

                  return (
                    <tr
                      key={batch.id}
                      className={`border-t border-white/[0.07] align-top ${isSelected ? 'bg-white/[0.025]' : ''}`}
                    >
                      <td className="px-2 py-2 text-slate-200">
                        <p className="font-semibold">{batch.month}/{batch.year}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{batch.payment_date || 'Payment date not set'}</p>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${payrollStatusTone(batch.status)}`}>
                          {batch.status}
                        </span>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {batch.finance_approved_at ? 'Finance approved' : 'Awaiting finance gate'}
                        </p>
                      </td>
                      <td className="px-2 py-2 text-slate-300">
                        <p>{batch.blocked_item_count} blocked</p>
                        <p className="mt-1 text-[11px] text-slate-500">{batch.exception_count} exceptions</p>
                      </td>
                      <td className="px-2 py-2 text-slate-200">{fmtMoney(batch.total_net)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedPayrollId(String(batch.id))}
                            className="rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200"
                          >
                            View
                          </button>
                          {canFinanceApprove ? (
                            <button
                              onClick={() => void financeApprovePayroll(batch.id)}
                              disabled={working || batch.blocked_item_count > 0}
                              className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200 disabled:opacity-50"
                            >
                              Finance Approve
                            </button>
                          ) : null}
                          {canStartDisbursement ? (
                            <button
                              onClick={() => void startDisbursement(batch)}
                              disabled={working}
                              className="rounded-md bg-indigo-500/20 px-2 py-1 text-[11px] font-semibold text-indigo-200 disabled:opacity-50"
                            >
                              Start Disbursement
                            </button>
                          ) : null}
                          {canMarkDisbursed ? (
                            <button
                              onClick={() => void markDisbursed(batch)}
                              disabled={working}
                              className="rounded-md bg-violet-500/20 px-2 py-1 text-[11px] font-semibold text-violet-200 disabled:opacity-50"
                            >
                              Mark Disbursed
                            </button>
                          ) : null}
                          {canPostFinance ? (
                            <button
                              onClick={() => void postToFinance(batch)}
                              disabled={working}
                              className="rounded-md bg-cyan-500/20 px-2 py-1 text-[11px] font-semibold text-cyan-200 disabled:opacity-50"
                            >
                              Post to Finance
                            </button>
                          ) : null}
                          <button
                            onClick={() => void downloadBankFile(batch.id)}
                            className="rounded-md border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200"
                          >
                            Bank File
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {payrolls.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-slate-400" colSpan={5}>
                      No payroll batches yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Selected Payroll</h2>
          {selectedPayroll ? (
            <div className="mt-3 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{selectedPayroll.status}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Period {selectedPayroll.month}/{selectedPayroll.year}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Blocked Items</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{selectedPayroll.blocked_item_count}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{selectedPayroll.exception_count} exception(s)</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Statutory Liability</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">
                    {fmtMoney(selectedPayroll.statutory_totals?.liability_total ?? selectedBatchRollups.statutoryEmployee + selectedBatchRollups.statutoryEmployer)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Employee {fmtMoney(selectedPayroll.statutory_totals?.employee_total ?? selectedBatchRollups.statutoryEmployee)} • Employer {fmtMoney(selectedPayroll.statutory_totals?.employer_total ?? selectedBatchRollups.statutoryEmployer)}
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Payslips</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{selectedBatchRollups.payslipCount}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Payment date {selectedPayroll.payment_date || 'Not set'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <p>Total Gross: {fmtMoney(selectedPayroll.total_gross)}</p>
                <p>Total Deductions: {fmtMoney(selectedPayroll.total_deductions)}</p>
                <p>Total Net: {fmtMoney(selectedPayroll.total_net)}</p>
                <p>Finance Approved At: {selectedPayroll.finance_approved_at || 'Not yet approved'}</p>
                <p>Disbursed At: {selectedPayroll.disbursed_at || 'Not yet disbursed'}</p>
                <p>Posted At: {selectedPayroll.posted_at || 'Not yet posted'}</p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Bucket Totals</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(selectedPayroll.bucket_totals ?? Object.fromEntries(Object.entries(selectedBatchRollups.bucketTotals).map(([key, value]) => [key, value.toFixed(2)]))).map(([bucket, amount]) => (
                    <div key={bucket} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
                      <span>{bucket}</span>
                      <span className="font-semibold text-slate-100">{fmtMoney(amount)}</span>
                    </div>
                  ))}
                  {Object.keys(selectedPayroll.bucket_totals ?? selectedBatchRollups.bucketTotals).length === 0 ? (
                    <p className="text-xs text-slate-500">No payroll bucket totals available yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void emailPayslips()}
                  disabled={working || payslips.length === 0}
                  className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60"
                >
                  Mark Payslips Sent
                </button>
                <button
                  onClick={() => void loadSelectedPayrollDiagnostics(String(selectedPayroll.id))}
                  disabled={working}
                  className="rounded-lg border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
                >
                  Refresh Diagnostics
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Select a payroll batch to view details.</p>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Batch Exceptions</h2>
              <p className="mt-1 text-xs text-slate-500">Finance approval and posting gates read from these tracked blockers.</p>
            </div>
            {selectedDiagnosticsLoading ? <span className="text-xs text-slate-400">Refreshing…</span> : null}
          </div>
          {selectedDiagnosticsError ? (
            <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {selectedDiagnosticsError}
            </div>
          ) : null}
          {selectedExceptions ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Blocked Items</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{selectedExceptions.blocked_item_count}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Workforce</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{selectedExceptions.workforce_blocker_count}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Identifiers</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{selectedExceptions.missing_identifier_count}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Reconciled</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">
                    {selectedExceptions.reconciliation.is_balanced ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {selectedExceptions.items.map((item) => (
                  <div key={item.payroll_item_id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-slate-300">
                    <p className="font-semibold text-slate-100">{item.employee_name} ({item.employee_id})</p>
                    <p className="mt-1 text-slate-400">Bucket: {item.posting_bucket || 'Unmapped'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.blocking_reasons.map((reason) => (
                        <span key={reason} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedExceptions.items.length === 0 ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    This payroll batch has no unresolved exceptions.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Select a payroll batch to inspect exceptions.</p>
          )}
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Finance Posting Summary</h2>
          {selectedPostingSummary ? (
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Completed Disbursement</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{selectedPostingSummary.has_completed_disbursement ? 'Yes' : 'No'}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Can Post</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{selectedPostingSummary.can_post_to_finance ? 'Yes' : 'No'}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Posting Records</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{selectedPostingSummary.postings.length}</p>
                </div>
              </div>
              <div className="space-y-2">
                {selectedPostingSummary.postings.map((posting) => (
                  <div key={posting.entry_key} className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-100">{posting.posting_stage}</p>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${posting.status === 'POSTED' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                        {posting.status}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-400">Journal #{posting.journal_entry_id ?? '—'} • Cashbook #{posting.cashbook_entry_id ?? '—'}</p>
                    <p className="mt-1 text-slate-400">{posting.entry_key}</p>
                  </div>
                ))}
                {selectedPostingSummary.postings.length === 0 ? (
                  <div className="rounded-lg border border-white/[0.07] bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                    Finance postings have not been created yet for this batch.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Select a payroll batch to inspect finance posting references.</p>
          )}
        </article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-100">Payslips</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Bucket</th>
                <th className="px-2 py-2">Gross</th>
                <th className="px-2 py-2">Deductions</th>
                <th className="px-2 py-2">Net</th>
                <th className="px-2 py-2">Snapshot Lines</th>
                <th className="px-2 py-2">Sent</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((item) => (
                <tr key={item.id} className="border-t border-white/[0.07] align-top">
                  <td className="px-2 py-2 text-slate-200">
                    <p>{item.employee_name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{item.employee_id_str}</p>
                    {item.is_blocked ? (
                      <span className="mt-2 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                        Blocked
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-slate-300">{item.posting_bucket || 'Unmapped'}</td>
                  <td className="px-2 py-2 text-slate-300">{fmtMoney(item.gross_salary)}</td>
                  <td className="px-2 py-2 text-slate-300">{fmtMoney(item.total_deductions)}</td>
                  <td className="px-2 py-2 text-slate-200">{fmtMoney(item.net_payable)}</td>
                  <td className="px-2 py-2 text-slate-300">
                    <p>{item.breakdown_rows.length} line(s)</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.breakdown_rows.slice(0, 3).map((row) => `${breakdownCategoryLabel(row.line_type)} ${row.name}`).join(' • ') || 'No breakdown'}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-slate-300">{item.sent_at ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => viewPayslip(item)}
                      className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200"
                    >
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}
              {payslips.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-400" colSpan={8}>
                    No payslips available for selected batch.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Active Salary Structures</h2>
          <div className="space-y-2 text-xs">
            {structures.map((s) => editingStructureId === s.id ? (
              <div key={s.id} className="rounded-lg border border-emerald-600/40 bg-slate-950/80 p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="number" value={editStructureForm.basic_salary} onChange={(e) => setEditStructureForm((p) => ({ ...p, basic_salary: e.target.value }))} placeholder="Basic salary" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
                  <select value={editStructureForm.currency} onChange={(e) => setEditStructureForm((p) => ({ ...p, currency: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select value={editStructureForm.pay_frequency} onChange={(e) => setEditStructureForm((p) => ({ ...p, pay_frequency: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                    <option>Monthly</option><option>Bi-weekly</option><option>Weekly</option>
                  </select>
                  <input type="date" value={editStructureForm.effective_from} onChange={(e) => setEditStructureForm((p) => ({ ...p, effective_from: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveStructureEdit} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-60">Save</button>
                  <button onClick={() => setEditingStructureId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                </div>
              </div>
            ) : confirmDeleteId?.type === 'structure' && confirmDeleteId.id === s.id ? (
              <div key={s.id} className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                <p className="text-xs text-rose-200 mb-2">Remove "{s.employee_name}" structure?</p>
                <div className="flex gap-2">
                  <button onClick={() => void deleteStructure(s.id)} disabled={working} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-60">Confirm Remove</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="flex items-start justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-slate-300">
                <div>
                  <p className="font-semibold text-slate-100">{s.employee_name}</p>
                  <p>{s.currency} {s.basic_salary} · {s.pay_frequency}</p>
                  <p className="text-slate-400">From {s.effective_from}{s.effective_to ? ` to ${s.effective_to}` : ''}</p>
                </div>
                <div className="flex shrink-0 gap-1 ml-2">
                  <button onClick={() => startEditStructure(s)} className="rounded px-2 py-1 text-[10px] border border-white/[0.09] text-slate-300">Edit</button>
                  <button onClick={() => setConfirmDeleteId({ type: 'structure', id: s.id })} className="rounded px-2 py-1 text-[10px] border border-rose-700/50 text-rose-300">Remove</button>
                </div>
              </div>
            ))}
            {structures.length === 0 && <p className="text-slate-400">No salary structures configured.</p>}
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Salary Components</h2>
          <div className="space-y-2 text-xs">
            {components.map((c) => editingComponentId === c.id ? (
              <div key={c.id} className="rounded-lg border border-emerald-600/40 bg-slate-950/80 p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={editComponentForm.name} onChange={(e) => setEditComponentForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
                  <select value={editComponentForm.component_type} onChange={(e) => setEditComponentForm((p) => ({ ...p, component_type: e.target.value as 'Allowance' | 'Deduction' }))} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                    <option value="Allowance">Allowance</option><option value="Deduction">Deduction</option>
                  </select>
                  <select value={editComponentForm.amount_type} onChange={(e) => setEditComponentForm((p) => ({ ...p, amount_type: e.target.value as 'Fixed' | 'Percentage' }))} className="rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm">
                    <option value="Fixed">Fixed</option><option value="Percentage">Percentage</option>
                  </select>
                  <div className="relative">
                    <input type="number" value={editComponentForm.amount} onChange={(e) => setEditComponentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 pr-7 text-sm" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{editComponentForm.amount_type === 'Percentage' ? '%' : 'Ksh'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveComponentEdit} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-60">Save</button>
                  <button onClick={() => setEditingComponentId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                </div>
              </div>
            ) : confirmDeleteId?.type === 'component' && confirmDeleteId.id === c.id ? (
              <div key={c.id} className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                <p className="text-xs text-rose-200 mb-2">Remove "{c.name}" component?</p>
                <div className="flex gap-2">
                  <button onClick={() => void deleteComponent(c.id)} disabled={working} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-60">Confirm Remove</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="flex items-start justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-slate-300">
                <div>
                  <p className="font-semibold text-slate-100">{c.name}</p>
                  <p className={c.component_type === 'Allowance' ? 'text-emerald-400' : 'text-rose-400'}>{c.component_type}</p>
                  <p>{c.amount_type === 'Percentage' ? `${c.amount}% of basic` : `Ksh ${c.amount}`} · {c.is_taxable ? 'Taxable' : 'Non-taxable'}</p>
                </div>
                <div className="flex shrink-0 gap-1 ml-2">
                  <button onClick={() => startEditComponent(c)} className="rounded px-2 py-1 text-[10px] border border-white/[0.09] text-slate-300">Edit</button>
                  <button onClick={() => setConfirmDeleteId({ type: 'component', id: c.id })} className="rounded px-2 py-1 text-[10px] border border-rose-700/50 text-rose-300">Remove</button>
                </div>
              </div>
            ))}
            {components.length === 0 && <p className="text-slate-400">No salary components configured.</p>}
          </div>
        </article>
      </section>

      {printSlip && (
        <PayslipPrintModal
          payslip={printSlip}
          schoolName={schoolName}
          onClose={() => setPrintSlip(null)}
        />
      )}
    </div>
  )
}
