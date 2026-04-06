import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'
import { extractApiErrorMessage } from '../../utils/forms'

type Employee = {
  id: number
  employee_id: string
  full_name: string
  employment_type: string
}

type LeaveType = {
  id: number
  name: string
  code: string
  is_paid: boolean
  max_days_year: number | null
  notice_days: number
}

type LeavePolicy = {
  id: number
  leave_type: number
  leave_type_name: string
  employment_type: string
  entitlement_days: string
  accrual_method: string
  effective_from: string
}

type LeaveBalance = {
  id: number
  leave_type_name: string
  year: number
  opening_balance: string
  accrued: string
  used: string
  pending: string
  available: string
}

type LeaveRequest = {
  id: number
  employee: number
  employee_name: string
  leave_type: number
  leave_type_name: string
  start_date: string
  end_date: string
  days_requested: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  approval_stage: string
  requires_dual_approval: boolean
  long_leave_threshold_days_snapshot: string
  return_reconciliation_required: boolean
  return_reconciliation_status: string
  current_approver_name: string
  manager_approved_by_name: string
  manager_approved_at: string | null
  hr_approved_by_name: string
  hr_approved_at: string | null
  approved_by_name: string
  approved_at: string | null
  rejection_reason: string
  submitted_at: string
}

type LeaveCalendarRow = {
  id: number
  employee_name: string
  department: string
  leave_type: string
  start_date: string
  end_date: string
  days_requested: string
  status: string
}

type ReturnToWorkReconciliation = {
  id: number
  employee: number
  employee_name: string
  leave_request: number
  leave_request_status: string
  attendance_record: number | null
  expected_return_date: string
  actual_return_date: string | null
  status: string
  extension_required: boolean
  attendance_correction_required: boolean
  payroll_hold_required: boolean
  substitute_closed: boolean
  completed_by_name: string
  completed_at: string | null
  notes: string
}

type ReturnCompletionForm = {
  actual_return_date: string
  extension_required: boolean
  attendance_correction_required: boolean
  payroll_hold_required: boolean
  substitute_closed: boolean
  notes: string
}

const defaultLeaveTypeForm = {
  name: '',
  code: '',
  is_paid: true,
  requires_approval: true,
  requires_document: false,
  max_days_year: '',
  notice_days: '0',
  color: '#16A34A',
}

const defaultLeavePolicyForm = {
  leave_type: '',
  employment_type: 'Full-time',
  entitlement_days: '0',
  accrual_method: 'Annual',
  carry_forward_max: '0',
  effective_from: '',
}

const defaultLeaveRequestForm = {
  employee: '',
  leave_type: '',
  start_date: '',
  end_date: '',
  reason: '',
}

const defaultReturnCompletionForm: ReturnCompletionForm = {
  actual_return_date: '',
  extension_required: false,
  attendance_correction_required: false,
  payroll_hold_required: false,
  substitute_closed: false,
  notes: '',
}

function badgeTone(value: string) {
  const normalized = value.toUpperCase()
  if (
    normalized.includes('APPROVED') ||
    normalized.includes('COMPLETED')
  ) {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  }
  if (
    normalized.includes('PENDING') ||
    normalized.includes('REOPENED')
  ) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
  }
  if (
    normalized.includes('REJECT') ||
    normalized.includes('CANCEL')
  ) {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
  }
  return 'border-white/[0.12] bg-white/[0.06] text-slate-200'
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function HrLeavePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveCalendar, setLeaveCalendar] = useState<LeaveCalendarRow[]>([])
  const [reconciliations, setReconciliations] = useState<ReturnToWorkReconciliation[]>([])
  const [selectedEmployeeForBalance, setSelectedEmployeeForBalance] = useState('')
  const [balances, setBalances] = useState<LeaveBalance[]>([])

  const [leaveTypeForm, setLeaveTypeForm] = useState(defaultLeaveTypeForm)
  const [leavePolicyForm, setLeavePolicyForm] = useState(defaultLeavePolicyForm)
  const [leaveRequestForm, setLeaveRequestForm] = useState(defaultLeaveRequestForm)
  const [activeTab, setActiveTab] = useState<'types' | 'policies' | 'requests' | 'balances'>('requests')
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [activeReconciliationId, setActiveReconciliationId] = useState<number | null>(null)
  const [returnCompletionForm, setReturnCompletionForm] = useState<ReturnCompletionForm>(defaultReturnCompletionForm)

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const noticeDaysGiven = useMemo(() => {
    if (!leaveRequestForm.start_date) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(leaveRequestForm.start_date)
    start.setHours(0, 0, 0, 0)
    return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }, [leaveRequestForm.start_date])

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((t) => String(t.id) === leaveRequestForm.leave_type) ?? null,
    [leaveTypes, leaveRequestForm.leave_type]
  )

  const activeReconciliation = useMemo(
    () => reconciliations.find((row) => row.id === activeReconciliationId) ?? null,
    [reconciliations, activeReconciliationId],
  )

  const toArr = <T,>(v: T[] | { results?: T[] } | null | undefined): T[] =>
    !v ? [] : Array.isArray(v) ? v : v.results ?? []

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [employeesRes, leaveTypesRes, leavePoliciesRes, leaveRequestsRes, leaveCalendarRes, reconciliationsRes] = await Promise.all([
        apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/'),
        apiClient.get<LeaveType[] | { results: LeaveType[] }>('/hr/leave-types/'),
        apiClient.get<LeavePolicy[] | { results: LeavePolicy[] }>('/hr/leave-policies/'),
        apiClient.get<LeaveRequest[] | { results: LeaveRequest[] }>('/hr/leave-requests/'),
        apiClient.get<LeaveCalendarRow[] | { results: LeaveCalendarRow[] }>('/hr/leave-calendar/'),
        apiClient.get<ReturnToWorkReconciliation[] | { results: ReturnToWorkReconciliation[] }>('/hr/return-to-work/'),
      ])
      setEmployees(toArr(employeesRes.data))
      setLeaveTypes(toArr(leaveTypesRes.data))
      setLeavePolicies(toArr(leavePoliciesRes.data))
      setLeaveRequests(toArr(leaveRequestsRes.data))
      setLeaveCalendar(toArr(leaveCalendarRes.data))
      setReconciliations(toArr(reconciliationsRes.data))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load leave management data.'))
    } finally {
      setLoading(false)
    }
  }

  const loadBalances = async (employeeId: string) => {
    if (!employeeId) {
      setBalances([])
      return
    }
    try {
      const response = await apiClient.get<LeaveBalance[]>(`/hr/leave-balance/${employeeId}/`)
      setBalances(response.data)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load leave balances for selected employee.'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    void loadBalances(selectedEmployeeForBalance)
  }, [selectedEmployeeForBalance])

  const createLeaveType = async () => {
    if (!leaveTypeForm.name || !leaveTypeForm.code) {
      setError('Leave type name and code are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/leave-types/', {
        ...leaveTypeForm,
        max_days_year: leaveTypeForm.max_days_year ? Number(leaveTypeForm.max_days_year) : null,
        notice_days: Number(leaveTypeForm.notice_days || '0'),
      })
      setLeaveTypeForm(defaultLeaveTypeForm)
      setShowTypeForm(false)
      setNotice('Leave type created.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create leave type.'))
    } finally {
      setWorking(false)
    }
  }

  const createLeavePolicy = async () => {
    if (!leavePolicyForm.leave_type || !leavePolicyForm.effective_from) {
      setError('Leave type and effective date are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/leave-policies/', {
        ...leavePolicyForm,
        leave_type: Number(leavePolicyForm.leave_type),
        entitlement_days: Number(leavePolicyForm.entitlement_days || '0'),
        carry_forward_max: Number(leavePolicyForm.carry_forward_max || '0'),
      })
      setLeavePolicyForm(defaultLeavePolicyForm)
      setShowPolicyForm(false)
      setNotice('Leave policy created.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to create leave policy.'))
    } finally {
      setWorking(false)
    }
  }

  const createLeaveRequest = async () => {
    if (!leaveRequestForm.employee || !leaveRequestForm.leave_type || !leaveRequestForm.start_date || !leaveRequestForm.end_date) {
      setError('Employee, leave type, start date and end date are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/leave-requests/', {
        ...leaveRequestForm,
        employee: Number(leaveRequestForm.employee),
        leave_type: Number(leaveRequestForm.leave_type),
      })
      setLeaveRequestForm(defaultLeaveRequestForm)
      setShowRequestForm(false)
      setNotice('Leave request submitted.')
      await load()
      if (selectedEmployeeForBalance === leaveRequestForm.employee) {
        await loadBalances(selectedEmployeeForBalance)
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to submit leave request.'))
    } finally {
      setWorking(false)
    }
  }

  const approveLeaveRequest = async (requestId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/approve/`, {})
      setNotice('Leave request approved.')
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to approve leave request.'))
    } finally {
      setWorking(false)
    }
  }

  const managerApproveLeaveRequest = async (requestId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/manager-approve/`, {})
      setNotice('Manager-stage approval recorded.')
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to record manager approval.'))
    } finally {
      setWorking(false)
    }
  }

  const hrFinalApproveLeaveRequest = async (requestId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/hr-final-approve/`, {})
      setNotice('HR final approval recorded.')
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to record HR final approval.'))
    } finally {
      setWorking(false)
    }
  }

  const rejectLeaveRequest = async (requestId: number) => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/reject/`, { rejection_reason: rejectReason.trim() })
      setNotice('Leave request rejected.')
      setRejectReason('')
      setRejectingRequestId(null)
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to reject leave request.'))
    } finally {
      setWorking(false)
    }
  }

  const [editingLeaveTypeId, setEditingLeaveTypeId] = useState<number | null>(null)
  const [editLeaveTypeForm, setEditLeaveTypeForm] = useState(defaultLeaveTypeForm)
  const [deletingLeaveTypeId, setDeletingLeaveTypeId] = useState<number | null>(null)
  const [deletingLeavePolicyId, setDeletingLeavePolicyId] = useState<number | null>(null)

  const startEditLeaveType = (t: LeaveType) => {
    setEditingLeaveTypeId(t.id)
    setEditLeaveTypeForm({
      name: t.name,
      code: t.code,
      is_paid: t.is_paid,
      requires_approval: true,
      requires_document: false,
      max_days_year: t.max_days_year != null ? String(t.max_days_year) : '',
      notice_days: String(t.notice_days),
      color: '#16A34A',
    })
  }

  const saveLeaveTypeEdit = async () => {
    if (!editingLeaveTypeId) return
    setWorking(true)
    setError(null)
    try {
      await apiClient.patch(`/hr/leave-types/${editingLeaveTypeId}/`, {
        name: editLeaveTypeForm.name,
        max_days_year: editLeaveTypeForm.max_days_year ? Number(editLeaveTypeForm.max_days_year) : null,
        notice_days: Number(editLeaveTypeForm.notice_days || '0'),
        is_paid: editLeaveTypeForm.is_paid,
      })
      setEditingLeaveTypeId(null)
      setNotice('Leave type updated.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to update leave type.'))
    } finally {
      setWorking(false)
    }
  }

  const deleteLeaveType = async (id: number) => {
    setWorking(true)
    setError(null)
    try {
      await apiClient.delete(`/hr/leave-types/${id}/`)
      setDeletingLeaveTypeId(null)
      setNotice('Leave type deleted.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to delete leave type.'))
    } finally {
      setWorking(false)
    }
  }

  const deleteLeavePolicy = async (id: number) => {
    setWorking(true)
    setError(null)
    try {
      await apiClient.delete(`/hr/leave-policies/${id}/`)
      setDeletingLeavePolicyId(null)
      setNotice('Leave policy deleted.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to delete leave policy.'))
    } finally {
      setWorking(false)
    }
  }

  const cancelLeaveRequest = async (requestId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/leave-requests/${requestId}/cancel/`, {})
      setNotice('Leave request cancelled.')
      await load()
      if (selectedEmployeeForBalance) await loadBalances(selectedEmployeeForBalance)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to cancel leave request.'))
    } finally {
      setWorking(false)
    }
  }

  const openReconciliation = (row: ReturnToWorkReconciliation) => {
    setActiveReconciliationId(row.id)
    setReturnCompletionForm({
      actual_return_date: row.actual_return_date || row.expected_return_date,
      extension_required: row.extension_required,
      attendance_correction_required: row.attendance_correction_required,
      payroll_hold_required: row.payroll_hold_required,
      substitute_closed: row.substitute_closed,
      notes: row.notes || '',
    })
  }

  const completeReconciliation = async () => {
    if (!activeReconciliation) return
    if (!returnCompletionForm.actual_return_date) {
      setError('Actual return date is required to complete reconciliation.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/return-to-work/${activeReconciliation.id}/complete/`, returnCompletionForm)
      setNotice('Return-to-work reconciliation completed.')
      setActiveReconciliationId(null)
      setReturnCompletionForm(defaultReturnCompletionForm)
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to complete return-to-work reconciliation.'))
    } finally {
      setWorking(false)
    }
  }

  const reopenReconciliation = async (id: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/return-to-work/${id}/reopen/`, { notes: '' })
      setNotice('Return-to-work reconciliation reopened.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to reopen return-to-work reconciliation.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Leave Management"
        subtitle="Staff leave requests, approvals and balances"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Leave Management</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Policies, Requests, and Balances</h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pending Requests</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {leaveRequests.filter((request) => request.status === 'Pending').length}
          </p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Manager Stage</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {leaveRequests.filter((request) => request.approval_stage === 'PENDING_MANAGER').length}
          </p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">HR Final Stage</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {leaveRequests.filter((request) => request.approval_stage === 'PENDING_HR').length}
          </p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Return Reconciliation</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {reconciliations.filter((row) => row.status !== 'COMPLETED').length}
          </p>
        </article>
      </section>

      <section className="rounded-xl glass-panel overflow-hidden">
        <div className="flex border-b border-white/[0.07] overflow-x-auto">
          {(['requests', 'types', 'policies', 'balances'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-5 py-3 text-sm font-semibold transition capitalize ${activeTab === tab ? 'border-b-2 border-emerald-500 text-emerald-400 bg-slate-950/40' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab === 'types' ? 'Leave Types' : tab === 'policies' ? 'Leave Policies' : tab === 'requests' ? 'New Request' : 'Balances'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'types' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">Leave Types</h2>
                <button onClick={() => setShowTypeForm((prev) => !prev)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">{showTypeForm ? 'Close' : 'Create'}</button>
              </div>
              {showTypeForm && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <input value={leaveTypeForm.name} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                  <input value={leaveTypeForm.code} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, code: e.target.value }))} placeholder="Code (e.g. ANNUAL)" className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                  <input value={leaveTypeForm.max_days_year} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, max_days_year: e.target.value }))} placeholder="Max days/year (blank = unlimited)" className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                  <input value={leaveTypeForm.notice_days} onChange={(e) => setLeaveTypeForm((p) => ({ ...p, notice_days: e.target.value }))} placeholder="Required notice days" type="number" min="0" className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                  <button onClick={createLeaveType} disabled={working} className="sm:col-span-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Save Leave Type</button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(loading ? [] : leaveTypes).map((row) => editingLeaveTypeId === row.id ? (
                  <div key={row.id} className="rounded-lg border border-emerald-600/40 bg-slate-950/80 p-3 space-y-2 col-span-1">
                    <input value={editLeaveTypeForm.name} onChange={(e) => setEditLeaveTypeForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
                    <input value={editLeaveTypeForm.max_days_year} onChange={(e) => setEditLeaveTypeForm((p) => ({ ...p, max_days_year: e.target.value }))} placeholder="Max days/year" type="number" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
                    <input value={editLeaveTypeForm.notice_days} onChange={(e) => setEditLeaveTypeForm((p) => ({ ...p, notice_days: e.target.value }))} placeholder="Notice days" type="number" className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm" />
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={editLeaveTypeForm.is_paid} onChange={(e) => setEditLeaveTypeForm((p) => ({ ...p, is_paid: e.target.checked }))} />
                      Paid leave
                    </label>
                    <div className="flex gap-2">
                      <button onClick={saveLeaveTypeEdit} disabled={working} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-60">Save</button>
                      <button onClick={() => setEditingLeaveTypeId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                    </div>
                  </div>
                ) : deletingLeaveTypeId === row.id ? (
                  <div key={row.id} className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                    <p className="text-xs text-rose-200 mb-2">Delete "{row.name}"?</p>
                    <div className="flex gap-2">
                      <button onClick={() => void deleteLeaveType(row.id)} disabled={working} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-60">Delete</button>
                      <button onClick={() => setDeletingLeaveTypeId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-100">{row.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.code}</p>
                        <p className="text-xs text-slate-400 mt-1">Max: {row.max_days_year ?? 'Unlimited'} days/yr · Notice: {row.notice_days}d</p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.is_paid ? 'Paid' : 'Unpaid'}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 ml-1">
                        <button onClick={() => startEditLeaveType(row)} className="rounded px-2 py-0.5 text-[10px] border border-white/[0.09] text-slate-300">Edit</button>
                        <button onClick={() => setDeletingLeaveTypeId(row.id)} className="rounded px-2 py-0.5 text-[10px] border border-rose-700/50 text-rose-300">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && leaveTypes.length === 0 && <p className="col-span-3 text-xs text-slate-500">No leave types yet. Create one above.</p>}
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">Leave Policies</h2>
                <button onClick={() => setShowPolicyForm((prev) => !prev)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">{showPolicyForm ? 'Close' : 'Create'}</button>
              </div>
              {showPolicyForm && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <select value={leavePolicyForm.leave_type} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, leave_type: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="">Leave type</option>
                    {leaveTypes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                  <select value={leavePolicyForm.employment_type} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, employment_type: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="">All employment types</option>
                  </select>
                  <input value={leavePolicyForm.entitlement_days} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, entitlement_days: e.target.value }))} placeholder="Entitlement days" type="number" min="0" className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                  <input type="date" value={leavePolicyForm.effective_from} onChange={(e) => setLeavePolicyForm((p) => ({ ...p, effective_from: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                  <button onClick={createLeavePolicy} disabled={working} className="sm:col-span-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Save Policy</button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(loading ? [] : leavePolicies).map((row) => deletingLeavePolicyId === row.id ? (
                  <div key={row.id} className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                    <p className="text-xs text-rose-200 mb-2">Delete "{row.leave_type_name}" policy?</p>
                    <div className="flex gap-2">
                      <button onClick={() => void deleteLeavePolicy(row.id)} disabled={working} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-60">Delete</button>
                      <button onClick={() => setDeletingLeavePolicyId(null)} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-100">{row.leave_type_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{row.employment_type || 'All types'} · {row.accrual_method}</p>
                        <p className="text-xs text-emerald-400 mt-1">{row.entitlement_days} days entitlement</p>
                        <p className="text-xs text-slate-500">From {row.effective_from}</p>
                      </div>
                      <button onClick={() => setDeletingLeavePolicyId(row.id)} className="shrink-0 rounded px-2 py-0.5 text-[10px] border border-rose-700/50 text-rose-300 ml-1">Delete</button>
                    </div>
                  </div>
                ))}
                {!loading && leavePolicies.length === 0 && <p className="col-span-3 text-xs text-slate-500">No leave policies yet. Create one above.</p>}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">New Leave Request</h2>
                <button onClick={() => setShowRequestForm((prev) => !prev)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">{showRequestForm ? 'Close' : 'Open Form'}</button>
              </div>
              {showRequestForm && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <select value={leaveRequestForm.employee} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, employee: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="">Select employee</option>
                    {employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} - {row.full_name}</option>)}
                  </select>
                  <select value={leaveRequestForm.leave_type} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, leave_type: e.target.value }))} className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm">
                    <option value="">Leave type</option>
                    {leaveTypes.map((row) => <option key={row.id} value={row.id}>{row.name}{row.notice_days > 0 ? ` (${row.notice_days}d notice)` : ''}</option>)}
                  </select>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                    <input type="date" value={leaveRequestForm.start_date} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, start_date: e.target.value }))} className="w-full rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                    {noticeDaysGiven !== null && (
                      <p className={`mt-1 text-xs font-medium ${noticeDaysGiven < 0 ? 'text-rose-400' : selectedLeaveType && noticeDaysGiven < selectedLeaveType.notice_days ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {noticeDaysGiven < 0
                          ? `⚠ Start date is ${Math.abs(noticeDaysGiven)} day(s) in the past`
                          : `${noticeDaysGiven} day(s) notice given${selectedLeaveType && selectedLeaveType.notice_days > 0 ? ` · ${selectedLeaveType.notice_days} required` : ''}`}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">End Date</label>
                    <input type="date" value={leaveRequestForm.end_date} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, end_date: e.target.value }))} className="w-full rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" />
                  </div>
                  <textarea value={leaveRequestForm.reason} onChange={(e) => setLeaveRequestForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for leave" className="sm:col-span-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm" rows={2} />
                  <button onClick={createLeaveRequest} disabled={working} className="sm:col-span-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Submit Request</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'balances' && (
            <div>
              <h2 className="text-sm font-semibold text-slate-100 mb-4">Leave Balances by Employee</h2>
              <select value={selectedEmployeeForBalance} onChange={(e) => setSelectedEmployeeForBalance(e.target.value)} className="w-full max-w-sm rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm">
                <option value="">Select employee</option>
                {employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} - {row.full_name}</option>)}
              </select>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {balances.map((row) => (
                  <div key={row.id} className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
                    <p className="font-semibold text-slate-100">{row.leave_type_name}</p>
                    <p className="text-xs text-slate-500">{row.year}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-emerald-400">Available: {row.available}</span>
                      <span className="text-slate-400">Used: {row.used}</span>
                      <span className="text-amber-400">Pending: {row.pending}</span>
                    </div>
                  </div>
                ))}
                {balances.length === 0 && selectedEmployeeForBalance && <p className="col-span-3 text-xs text-slate-500">No leave balances found for this employee.</p>}
                {!selectedEmployeeForBalance && <p className="col-span-3 text-xs text-slate-500">Select an employee to view their leave balances.</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Leave Requests</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Stage</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : leaveRequests).map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07]">
                  <td className="px-4 py-3 text-slate-100">{row.employee_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.leave_type_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.start_date} to {row.end_date}</td>
                  <td className="px-4 py-3 text-slate-300">{row.days_requested}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${badgeTone(row.approval_stage)}`}>
                      {formatLabel(row.approval_stage)}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.requires_dual_approval ? `Dual approval • Threshold ${row.long_leave_threshold_days_snapshot} days` : 'Single-stage approval'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Approver: {row.current_approver_name || row.hr_approved_by_name || row.manager_approved_by_name || 'System'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${badgeTone(row.status)}`}>
                      {row.status}
                    </span>
                    {row.return_reconciliation_required ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Reconciliation: {row.return_reconciliation_status || 'Pending setup'}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.status === 'Pending' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {row.approval_stage === 'PENDING_MANAGER' ? (
                          <button onClick={() => void managerApproveLeaveRequest(row.id)} disabled={working} className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">Manager Approve</button>
                        ) : null}
                        {row.approval_stage === 'PENDING_HR' && row.requires_dual_approval ? (
                          <button onClick={() => void hrFinalApproveLeaveRequest(row.id)} disabled={working} className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">HR Final Approve</button>
                        ) : null}
                        {row.approval_stage === 'PENDING_HR' && !row.requires_dual_approval ? (
                          <button onClick={() => void approveLeaveRequest(row.id)} disabled={working} className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">Approve</button>
                        ) : null}
                        <button onClick={() => setRejectingRequestId(row.id)} disabled={working} className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">Reject</button>
                        <button onClick={() => void cancelLeaveRequest(row.id)} disabled={working} className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Cancel</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {rejectingRequestId ? (
        <section className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Reject Leave Request #{rejectingRequestId}</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason"
              className="flex-1 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <button onClick={() => void rejectLeaveRequest(rejectingRequestId)} disabled={working} className="rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-200 disabled:opacity-60">Confirm Reject</button>
            <button onClick={() => { setRejectingRequestId(null); setRejectReason('') }} className="rounded-lg border border-white/[0.09] px-3 py-2 text-sm text-slate-300">Dismiss</button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Return-to-Work Reconciliation</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Expected Return</th>
                <th className="px-4 py-3 text-left">Actual Return</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Flags</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : reconciliations).map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07] align-top">
                  <td className="px-4 py-3 text-slate-100">
                    <p>{row.employee_name}</p>
                    <p className="mt-1 text-xs text-slate-500">Leave request #{row.leave_request}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{row.expected_return_date}</td>
                  <td className="px-4 py-3 text-slate-300">{row.actual_return_date || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${badgeTone(row.status)}`}>
                      {formatLabel(row.status)}
                    </span>
                    {row.completed_by_name ? (
                      <p className="mt-1 text-xs text-slate-500">By {row.completed_by_name}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p className="text-xs text-slate-500">Attendance correction: {row.attendance_correction_required ? 'Yes' : 'No'}</p>
                    <p className="mt-1 text-xs text-slate-500">Payroll hold: {row.payroll_hold_required ? 'Yes' : 'No'}</p>
                    <p className="mt-1 text-xs text-slate-500">Substitute closed: {row.substitute_closed ? 'Yes' : 'No'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex flex-wrap gap-2">
                      {row.status !== 'COMPLETED' ? (
                        <button onClick={() => openReconciliation(row)} disabled={working} className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">Complete</button>
                      ) : (
                        <button onClick={() => void reopenReconciliation(row.id)} disabled={working} className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">Reopen</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-slate-500">
                    No return-to-work reconciliations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {activeReconciliation ? (
        <section className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Complete Reconciliation #{activeReconciliation.id}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeReconciliation.employee_name} • expected back {activeReconciliation.expected_return_date}
              </p>
            </div>
            <button
              onClick={() => {
                setActiveReconciliationId(null)
                setReturnCompletionForm(defaultReturnCompletionForm)
              }}
              className="text-xs text-slate-400"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={returnCompletionForm.actual_return_date}
              onChange={(event) => setReturnCompletionForm((prev) => ({ ...prev, actual_return_date: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={returnCompletionForm.extension_required}
                onChange={(event) => setReturnCompletionForm((prev) => ({ ...prev, extension_required: event.target.checked }))}
              />
              Extension required
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={returnCompletionForm.attendance_correction_required}
                onChange={(event) => setReturnCompletionForm((prev) => ({ ...prev, attendance_correction_required: event.target.checked }))}
              />
              Attendance correction required
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={returnCompletionForm.payroll_hold_required}
                onChange={(event) => setReturnCompletionForm((prev) => ({ ...prev, payroll_hold_required: event.target.checked }))}
              />
              Payroll hold required
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={returnCompletionForm.substitute_closed}
                onChange={(event) => setReturnCompletionForm((prev) => ({ ...prev, substitute_closed: event.target.checked }))}
              />
              Teaching substitute coverage closed
            </label>
            <textarea
              value={returnCompletionForm.notes}
              onChange={(event) => setReturnCompletionForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              placeholder="Completion notes"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <button
              onClick={completeReconciliation}
              disabled={working}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
            >
              Complete Reconciliation
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Team Leave Calendar</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Dates</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : leaveCalendar).map((row) => (
                <tr key={row.id} className="border-t border-white/[0.07]">
                  <td className="px-4 py-3 text-slate-100">{row.employee_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.department || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{row.leave_type}</td>
                  <td className="px-4 py-3 text-slate-300">{row.start_date} to {row.end_date}</td>
                  <td className="px-4 py-3 text-slate-300">{row.days_requested}</td>
                  <td className="px-4 py-3 text-slate-300">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
