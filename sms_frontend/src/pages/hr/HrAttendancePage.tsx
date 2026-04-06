import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'
import { extractApiErrorMessage } from '../../utils/forms'

type ApiList<T> = T[] | { results?: T[] }

type Department = {
  id: number
  name: string
}

type Position = {
  id: number
  title: string
  department: number | null
  department_name: string
}

type EmployeeRow = {
  id: number
  employee_id: string
  full_name: string
  department: number | null
  department_name: string
  staff_category: string
}

type AttendanceRecord = {
  id: number
  employee: number
  employee_name: string
  shift_template: number | null
  shift_template_name: string
  date: string
  scheduled_shift_start: string | null
  scheduled_shift_end: string | null
  clock_in: string | null
  clock_out: string | null
  status: string
  attendance_source: string
  alert_status: string
  reconciliation_status: string
  payroll_feed_status: string
  expected_check_in_deadline: string | null
  hours_worked: string
  overtime_hours: string
  notes: string
}

type AttendanceSummary = {
  month: number
  year: number
  total_records: number
  present_count: number
  late_count: number
  absent_count: number
  average_overtime_hours: string
}

type AttendanceReportRow = {
  employee_id: string
  employee_name: string
  days: number
  present: number
  absent: number
  late: number
  average_hours: string
}

type WorkSchedule = {
  id: number
  employee: number | null
  employee_name: string
  department: number | null
  department_name: string
  shift_template: number | null
  shift_template_name: string
  assignment_priority: number
  staff_category_snapshot: string
  shift_start: string
  shift_end: string
  working_days: string[]
  break_duration: number
  effective_from: string
  effective_to: string | null
}

type ShiftTemplate = {
  id: number
  name: string
  code: string
  staff_category: string
  department: number | null
  department_name: string
  position: number | null
  position_title: string
  shift_start: string
  shift_end: string
  working_days: string[]
  break_duration_minutes: number
  grace_minutes: number
  requires_biometric_clock: boolean
  overtime_eligible: boolean
}

type AbsenceAlert = {
  id: number
  employee: number
  employee_name: string
  attendance_record: number
  shift_template: number | null
  shift_template_name: string
  alert_date: string
  expected_shift_start: string | null
  grace_deadline: string
  status: string
  notified_manager: number | null
  notified_manager_name: string
  hr_copied: boolean
  resolution_reason: string
  notes: string
  resolved_at: string | null
}

type TeachingSubstituteAssignment = {
  id: number
  absent_employee: number
  absent_employee_name: string
  substitute_employee: number
  substitute_employee_name: string
  attendance_record: number | null
  assignment_date: string
  start_time: string | null
  end_time: string | null
  class_context: string
  reason: string
  assigned_by_name: string
  notes: string
}

type ScheduleForm = {
  id: number | null
  employee: string
  department: string
  shift_template: string
  assignment_priority: string
  staff_category_snapshot: string
  shift_start: string
  shift_end: string
  working_days: string[]
  break_duration: string
  effective_from: string
  effective_to: string
}

type ShiftTemplateForm = {
  id: number | null
  name: string
  code: string
  staff_category: string
  department: string
  position: string
  shift_start: string
  shift_end: string
  working_days: string[]
  break_duration_minutes: string
  grace_minutes: string
  requires_biometric_clock: boolean
  overtime_eligible: boolean
}

type AlertEvaluationForm = {
  employee: string
  date: string
  triggered_at: string
}

type AlertResolveForm = {
  attendance_status: string
  resolution_reason: string
  notes: string
}

type SubstituteForm = {
  absent_employee: string
  substitute_employee: string
  attendance_record: string
  assignment_date: string
  start_time: string
  end_time: string
  class_context: string
  reason: string
  notes: string
}

const defaultSummary: AttendanceSummary = {
  month: 0,
  year: 0,
  total_records: 0,
  present_count: 0,
  late_count: 0,
  absent_count: 0,
  average_overtime_hours: '0.00',
}

const defaultScheduleForm: ScheduleForm = {
  id: null,
  employee: '',
  department: '',
  shift_template: '',
  assignment_priority: '100',
  staff_category_snapshot: '',
  shift_start: '',
  shift_end: '',
  working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  break_duration: '60',
  effective_from: '',
  effective_to: '',
}

const defaultShiftTemplateForm: ShiftTemplateForm = {
  id: null,
  name: '',
  code: '',
  staff_category: 'OPERATIONS',
  department: '',
  position: '',
  shift_start: '08:00',
  shift_end: '16:00',
  working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  break_duration_minutes: '60',
  grace_minutes: '15',
  requires_biometric_clock: false,
  overtime_eligible: true,
}

const defaultAlertEvaluationForm: AlertEvaluationForm = {
  employee: '',
  date: '',
  triggered_at: '',
}

const defaultAlertResolveForm: AlertResolveForm = {
  attendance_status: 'Absent',
  resolution_reason: '',
  notes: '',
}

const defaultSubstituteForm: SubstituteForm = {
  absent_employee: '',
  substitute_employee: '',
  attendance_record: '',
  assignment_date: '',
  start_time: '',
  end_time: '',
  class_context: '',
  reason: '',
  notes: '',
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const STAFF_CATEGORIES = ['TEACHING', 'ADMIN', 'SUPPORT', 'OPERATIONS', 'HOSTEL', 'SECURITY', 'KITCHEN', 'HEALTH']
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half-Day', 'On Leave']

const POLICY_THRESHOLD_KEY = 'hr:attendance:overtime_threshold_hours'
const POLICY_INCLUDE_BREAK_KEY = 'hr:attendance:include_break'

function asArray<T>(value: ApiList<T> | null | undefined): T[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : '-'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const asDate = new Date(value)
  if (Number.isNaN(asDate.getTime())) return value
  return asDate.toLocaleString()
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function badgeTone(value: string) {
  const normalized = value.toUpperCase()
  if (
    normalized.includes('READY') ||
    normalized.includes('PRESENT') ||
    normalized.includes('APPROVED') ||
    normalized.includes('AUTO_RESOLVED') ||
    normalized.includes('COMPLETED')
  ) {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  }
  if (
    normalized.includes('PENDING') ||
    normalized.includes('LATE') ||
    normalized.includes('ESCALATED') ||
    normalized.includes('HALF')
  ) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
  }
  if (
    normalized.includes('ABSENT') ||
    normalized.includes('BLOCKED') ||
    normalized.includes('REJECT') ||
    normalized.includes('CANCEL')
  ) {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
  }
  return 'border-white/[0.12] bg-white/[0.06] text-slate-200'
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvRows = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function HrAttendancePage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [reportRows, setReportRows] = useState<AttendanceReportRow[]>([])
  const [summary, setSummary] = useState<AttendanceSummary>(defaultSummary)
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([])
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [alerts, setAlerts] = useState<AbsenceAlert[]>([])
  const [substituteAssignments, setSubstituteAssignments] = useState<TeachingSubstituteAssignment[]>([])

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('')
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [monthlyExportMonth, setMonthlyExportMonth] = useState(String(new Date().getMonth() + 1))
  const [monthlyExportYear, setMonthlyExportYear] = useState(String(new Date().getFullYear()))

  const [clockEmployee, setClockEmployee] = useState('')
  const [clockDate, setClockDate] = useState('')
  const [clockInTime, setClockInTime] = useState('')
  const [clockOutTime, setClockOutTime] = useState('')

  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateForm, setTemplateForm] = useState<ShiftTemplateForm>(defaultShiftTemplateForm)
  const [overtimeThresholdHours, setOvertimeThresholdHours] = useState('8')
  const [includeBreakInPolicy, setIncludeBreakInPolicy] = useState(false)

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(defaultScheduleForm)
  const [alertEvaluationForm, setAlertEvaluationForm] = useState<AlertEvaluationForm>(defaultAlertEvaluationForm)
  const [activeAlertId, setActiveAlertId] = useState<number | null>(null)
  const [alertResolveForm, setAlertResolveForm] = useState<AlertResolveForm>(defaultAlertResolveForm)
  const [substituteForm, setSubstituteForm] = useState<SubstituteForm>(defaultSubstituteForm)

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'schedule' | 'template'; id: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const storedThreshold = localStorage.getItem(POLICY_THRESHOLD_KEY)
    const storedIncludeBreak = localStorage.getItem(POLICY_INCLUDE_BREAK_KEY)
    if (storedThreshold) setOvertimeThresholdHours(storedThreshold)
    if (storedIncludeBreak) setIncludeBreakInPolicy(storedIncludeBreak === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem(POLICY_THRESHOLD_KEY, overtimeThresholdHours || '8')
    localStorage.setItem(POLICY_INCLUDE_BREAK_KEY, String(includeBreakInPolicy))
  }, [overtimeThresholdHours, includeBreakInPolicy])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParts = [
        selectedEmployeeFilter ? `employee=${selectedEmployeeFilter}` : '',
        selectedDepartmentFilter ? `department=${selectedDepartmentFilter}` : '',
        dateFrom ? `date_from=${dateFrom}` : '',
        dateTo ? `date_to=${dateTo}` : '',
      ].filter(Boolean)
      const attendanceQuery = queryParts.length ? `?${queryParts.join('&')}` : ''

      const summaryQueryParts = [
        `month=${monthlyExportMonth}`,
        `year=${monthlyExportYear}`,
        selectedEmployeeFilter ? `employee=${selectedEmployeeFilter}` : '',
        selectedDepartmentFilter ? `department=${selectedDepartmentFilter}` : '',
      ].filter(Boolean)

      const [departmentsRes, positionsRes, employeesRes, recordsRes, summaryRes, reportRes, templatesRes, schedulesRes, alertsRes, substitutesRes] =
        await Promise.all([
        apiClient.get<ApiList<Department>>('/hr/departments/'),
        apiClient.get<ApiList<Position>>('/hr/positions/'),
        apiClient.get<ApiList<EmployeeRow>>('/hr/employees/'),
        apiClient.get<ApiList<AttendanceRecord>>(`/hr/attendance/${attendanceQuery}`),
        apiClient.get<AttendanceSummary>(`/hr/attendance/summary/?${summaryQueryParts.join('&')}`),
        apiClient.get<AttendanceReportRow[]>(`/hr/attendance/report/${attendanceQuery}`),
        apiClient.get<ApiList<ShiftTemplate>>('/hr/shift-templates/'),
        apiClient.get<ApiList<WorkSchedule>>('/hr/schedules/'),
        apiClient.get<ApiList<AbsenceAlert>>('/hr/absence-alerts/'),
        apiClient.get<ApiList<TeachingSubstituteAssignment>>('/hr/substitute-assignments/'),
      ])

      setDepartments(asArray(departmentsRes.data))
      setPositions(asArray(positionsRes.data))
      setEmployees(asArray(employeesRes.data))
      setRecords(asArray(recordsRes.data))
      setSummary(summaryRes.data)
      setReportRows(reportRes.data)
      setShiftTemplates(asArray(templatesRes.data))
      setSchedules(asArray(schedulesRes.data))
      setAlerts(asArray(alertsRes.data))
      setSubstituteAssignments(asArray(substitutesRes.data))
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load attendance data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [selectedDepartmentFilter, selectedEmployeeFilter, dateFrom, dateTo, monthlyExportMonth, monthlyExportYear])

  const filteredEmployees = useMemo(() => {
    if (!selectedDepartmentFilter) return employees
    return employees.filter((employee) => String(employee.department ?? '') === selectedDepartmentFilter)
  }, [employees, selectedDepartmentFilter])

  const teachingEmployees = useMemo(
    () => employees.filter((employee) => employee.staff_category === 'TEACHING'),
    [employees],
  )

  const selectedClockEmployeeLabel = useMemo(() => {
    const match = employees.find((employee) => String(employee.id) === clockEmployee)
    return match ? `${match.employee_id} - ${match.full_name}` : ''
  }, [employees, clockEmployee])

  const activeAlert = useMemo(
    () => alerts.find((alert) => alert.id === activeAlertId) ?? null,
    [alerts, activeAlertId],
  )

  const substituteAttendanceOptions = useMemo(() => {
    return records.filter((record) => {
      if (!substituteForm.absent_employee || String(record.employee) !== substituteForm.absent_employee) return false
      if (substituteForm.assignment_date && record.date !== substituteForm.assignment_date) return false
      return ['Absent', 'On Leave'].includes(record.status)
    })
  }, [records, substituteForm.absent_employee, substituteForm.assignment_date])

  const policyOvertimePreview = useMemo(() => {
    const threshold = Number(overtimeThresholdHours || '8')
    const totalHours = records.reduce((sum, record) => sum + Number(record.hours_worked || '0'), 0)
    const entries = records.length || 1
    const averageHours = totalHours / entries
    const preview = Math.max(averageHours - threshold, 0)
    return preview.toFixed(2)
  }, [records, overtimeThresholdHours])

  const openCreateTemplate = () => {
    setTemplateForm(defaultShiftTemplateForm)
    setShowTemplateModal(true)
  }

  const openEditTemplate = (template: ShiftTemplate) => {
    setTemplateForm({
      id: template.id,
      name: template.name,
      code: template.code,
      staff_category: template.staff_category || '',
      department: template.department ? String(template.department) : '',
      position: template.position ? String(template.position) : '',
      shift_start: formatTime(template.shift_start),
      shift_end: formatTime(template.shift_end),
      working_days: template.working_days ?? [],
      break_duration_minutes: String(template.break_duration_minutes ?? 60),
      grace_minutes: String(template.grace_minutes ?? 15),
      requires_biometric_clock: Boolean(template.requires_biometric_clock),
      overtime_eligible: Boolean(template.overtime_eligible),
    })
    setShowTemplateModal(true)
  }

  const closeTemplateModal = () => {
    setShowTemplateModal(false)
    setTemplateForm(defaultShiftTemplateForm)
  }

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.code || !templateForm.shift_start || !templateForm.shift_end) {
      setError('Template name, code, shift start, and shift end are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        name: templateForm.name.trim(),
        code: templateForm.code.trim(),
        staff_category: templateForm.staff_category || '',
        department: templateForm.department ? Number(templateForm.department) : null,
        position: templateForm.position ? Number(templateForm.position) : null,
        shift_start: `${templateForm.shift_start}:00`,
        shift_end: `${templateForm.shift_end}:00`,
        working_days: templateForm.working_days,
        break_duration_minutes: Number(templateForm.break_duration_minutes || '60'),
        grace_minutes: Number(templateForm.grace_minutes || '15'),
        requires_biometric_clock: templateForm.requires_biometric_clock,
        overtime_eligible: templateForm.overtime_eligible,
      }
      if (templateForm.id) {
        await apiClient.patch(`/hr/shift-templates/${templateForm.id}/`, payload)
        setNotice('Shift template updated.')
      } else {
        await apiClient.post('/hr/shift-templates/', payload)
        setNotice('Shift template created.')
      }
      closeTemplateModal()
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to save shift template.'))
    } finally {
      setWorking(false)
    }
  }

  const openCreateSchedule = () => {
    setScheduleForm(defaultScheduleForm)
    setShowScheduleModal(true)
  }

  const openEditSchedule = (schedule: WorkSchedule) => {
    setScheduleForm({
      id: schedule.id,
      employee: schedule.employee ? String(schedule.employee) : '',
      department: schedule.department ? String(schedule.department) : '',
      shift_template: schedule.shift_template ? String(schedule.shift_template) : '',
      assignment_priority: String(schedule.assignment_priority ?? 100),
      staff_category_snapshot: schedule.staff_category_snapshot ?? '',
      shift_start: schedule.shift_start?.slice(0, 5) ?? '',
      shift_end: schedule.shift_end?.slice(0, 5) ?? '',
      working_days: schedule.working_days ?? [],
      break_duration: String(schedule.break_duration ?? 60),
      effective_from: schedule.effective_from ?? '',
      effective_to: schedule.effective_to ?? '',
    })
    setShowScheduleModal(true)
  }

  const closeScheduleModal = () => {
    setShowScheduleModal(false)
    setScheduleForm(defaultScheduleForm)
  }

  const saveSchedule = async () => {
    if (!scheduleForm.employee && !scheduleForm.department) {
      setError('Choose an employee or department for the schedule scope.')
      return
    }
    if (!scheduleForm.effective_from) {
      setError('Effective from is required.')
      return
    }
    if (!scheduleForm.shift_template && (!scheduleForm.shift_start || !scheduleForm.shift_end)) {
      setError('Shift start and shift end are required when no shift template is selected.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        employee: scheduleForm.employee ? Number(scheduleForm.employee) : null,
        department: scheduleForm.department ? Number(scheduleForm.department) : null,
        shift_template: scheduleForm.shift_template ? Number(scheduleForm.shift_template) : null,
        assignment_priority: Number(scheduleForm.assignment_priority || '100'),
        staff_category_snapshot: scheduleForm.staff_category_snapshot || '',
        shift_start: scheduleForm.shift_start ? `${scheduleForm.shift_start}:00` : undefined,
        shift_end: scheduleForm.shift_end ? `${scheduleForm.shift_end}:00` : undefined,
        working_days: scheduleForm.working_days,
        break_duration: Number(scheduleForm.break_duration || '60'),
        effective_from: scheduleForm.effective_from,
        effective_to: scheduleForm.effective_to || null,
      }
      if (scheduleForm.id) {
        await apiClient.patch(`/hr/schedules/${scheduleForm.id}/`, payload)
        setNotice('Work schedule updated.')
      } else {
        await apiClient.post('/hr/schedules/', payload)
        setNotice('Work schedule created.')
      }
      closeScheduleModal()
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to save work schedule.'))
    } finally {
      setWorking(false)
    }
  }

  const archiveItem = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      const path =
        deleteTarget.kind === 'template'
          ? `/hr/shift-templates/${deleteTarget.id}/`
          : `/hr/schedules/${deleteTarget.id}/`
      await apiClient.delete(path)
      setNotice(deleteTarget.kind === 'template' ? 'Shift template archived.' : 'Work schedule archived.')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setDeleteError(
        extractApiErrorMessage(
          err,
          deleteTarget.kind === 'template' ? 'Unable to archive shift template.' : 'Unable to archive schedule.',
        ),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClockIn = async () => {
    if (!clockEmployee || !clockDate) {
      setError('Employee and date are required for clock-in.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/attendance/clock-in/', {
        employee: Number(clockEmployee),
        date: clockDate,
        clock_in: clockInTime ? `${clockInTime}:00` : undefined,
      })
      setNotice('Clock-in recorded.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Clock-in failed.'))
    } finally {
      setWorking(false)
    }
  }

  const handleClockOut = async () => {
    if (!clockEmployee || !clockDate) {
      setError('Employee and date are required for clock-out.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/attendance/clock-out/', {
        employee: Number(clockEmployee),
        date: clockDate,
        clock_out: clockOutTime ? `${clockOutTime}:00` : undefined,
      })
      setNotice('Clock-out recorded.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Clock-out failed.'))
    } finally {
      setWorking(false)
    }
  }

  const evaluateAlert = async () => {
    if (!alertEvaluationForm.employee || !alertEvaluationForm.date) {
      setError('Employee and date are required to evaluate a missed check-in.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/absence-alerts/evaluate/', {
        employee: Number(alertEvaluationForm.employee),
        date: alertEvaluationForm.date,
        triggered_at: alertEvaluationForm.triggered_at || undefined,
      })
      setNotice('Absence alert evaluation completed.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to evaluate the missed check-in alert.'))
    } finally {
      setWorking(false)
    }
  }

  const openResolveAlert = (alert: AbsenceAlert) => {
    setActiveAlertId(alert.id)
    setAlertResolveForm({
      attendance_status: 'Absent',
      resolution_reason: alert.resolution_reason ?? '',
      notes: alert.notes ?? '',
    })
  }

  const submitAlertResolution = async () => {
    if (!activeAlert) return
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/absence-alerts/${activeAlert.id}/resolve/`, {
        attendance_status: alertResolveForm.attendance_status,
        resolution_reason: alertResolveForm.resolution_reason,
        notes: alertResolveForm.notes,
      })
      setNotice('Absence alert resolved.')
      setActiveAlertId(null)
      setAlertResolveForm(defaultAlertResolveForm)
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to resolve absence alert.'))
    } finally {
      setWorking(false)
    }
  }

  const escalateAlert = async (alertId: number) => {
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post(`/hr/absence-alerts/${alertId}/escalate/`, {})
      setNotice('Absence alert escalated to HR.')
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to escalate absence alert.'))
    } finally {
      setWorking(false)
    }
  }

  const saveSubstituteAssignment = async () => {
    if (!substituteForm.absent_employee || !substituteForm.substitute_employee || !substituteForm.assignment_date) {
      setError('Absent employee, substitute employee, and assignment date are required.')
      return
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      await apiClient.post('/hr/substitute-assignments/', {
        absent_employee: Number(substituteForm.absent_employee),
        substitute_employee: Number(substituteForm.substitute_employee),
        attendance_record: substituteForm.attendance_record ? Number(substituteForm.attendance_record) : null,
        assignment_date: substituteForm.assignment_date,
        start_time: substituteForm.start_time ? `${substituteForm.start_time}:00` : null,
        end_time: substituteForm.end_time ? `${substituteForm.end_time}:00` : null,
        class_context: substituteForm.class_context,
        reason: substituteForm.reason,
        notes: substituteForm.notes,
      })
      setNotice('Teaching substitute assignment saved.')
      setSubstituteForm(defaultSubstituteForm)
      await load()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to save teaching substitute assignment.'))
    } finally {
      setWorking(false)
    }
  }

  const exportMonthlyAttendanceCsv = () => {
    const month = Number(monthlyExportMonth)
    const year = Number(monthlyExportYear)
    const monthlyRecords = records.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate.getUTCMonth() + 1 === month && recordDate.getUTCFullYear() === year
    })
    downloadCsv(
      `hr_attendance_${year}_${String(month).padStart(2, '0')}.csv`,
      [
        'Employee',
        'Date',
        'Shift Template',
        'Scheduled Shift',
        'Clock In',
        'Clock Out',
        'Status',
        'Alert',
        'Payroll Feed',
        'Hours Worked',
        'Overtime Hours',
      ],
      monthlyRecords.map((record) => [
        record.employee_name,
        record.date,
        record.shift_template_name || '',
        `${formatTime(record.scheduled_shift_start)} - ${formatTime(record.scheduled_shift_end)}`,
        record.clock_in ?? '',
        record.clock_out ?? '',
        record.status,
        record.alert_status,
        record.payroll_feed_status,
        record.hours_worked,
        record.overtime_hours,
      ]),
    )
  }

  const toggleTemplateDay = (day: string) => {
    setTemplateForm((prev) => {
      const hasDay = prev.working_days.includes(day)
      return {
        ...prev,
        working_days: hasDay ? prev.working_days.filter((item) => item !== day) : [...prev.working_days, day],
      }
    })
  }

  const toggleScheduleDay = (day: string) => {
    setScheduleForm((prev) => {
      const hasDay = prev.working_days.includes(day)
      return {
        ...prev,
        working_days: hasDay ? prev.working_days.filter((item) => item !== day) : [...prev.working_days, day],
      }
    })
  }

  const openAlertAsSubstitute = (alert: AbsenceAlert) => {
    setSubstituteForm((prev) => ({
      ...prev,
      absent_employee: String(alert.employee),
      assignment_date: alert.alert_date,
      attendance_record: String(alert.attendance_record),
    }))
  }

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Staff Attendance"
        subtitle="Track shift-aware attendance, same-day alerts, and teaching coverage"
        icon="👥"
      />
      <section className="rounded-2xl glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Attendance & Workforce Control</p>
        <h1 className="mt-2 text-2xl font-display font-semibold">Time Tracking, Alerts, and Shift Coverage</h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Records</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.total_records}</p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Present</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.present_count}</p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Late</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.late_count}</p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Open Alerts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {records.filter((record) => record.alert_status === 'OPEN').length}
          </p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Blocked Feed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {records.filter((record) => record.payroll_feed_status !== 'READY').length}
          </p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Shift Templates</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{shiftTemplates.length}</p>
        </article>
        <article className="rounded-xl glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Avg Overtime</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.average_overtime_hours}</p>
        </article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-100">Filters & Monthly Export</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <select
            value={selectedDepartmentFilter}
            onChange={(event) => {
              setSelectedDepartmentFilter(event.target.value)
              setSelectedEmployeeFilter('')
            }}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            value={selectedEmployeeFilter}
            onChange={(event) => setSelectedEmployeeFilter(event.target.value)}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          >
            <option value="">All employees</option>
            {filteredEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_id} - {employee.full_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={12}
              value={monthlyExportMonth}
              onChange={(event) => setMonthlyExportMonth(event.target.value)}
              className="w-20 rounded-lg border border-white/[0.09] bg-slate-950/60 px-2 py-2 text-sm"
            />
            <input
              type="number"
              min={2000}
              max={2100}
              value={monthlyExportYear}
              onChange={(event) => setMonthlyExportYear(event.target.value)}
              className="w-24 rounded-lg border border-white/[0.09] bg-slate-950/60 px-2 py-2 text-sm"
            />
          </div>
          <button
            onClick={exportMonthlyAttendanceCsv}
            className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200"
          >
            Export Monthly CSV
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Shift Templates</h2>
              <p className="mt-1 text-xs text-slate-500">
                Define reusable shift patterns by category and optional department or position scope.
              </p>
            </div>
            <button
              onClick={openCreateTemplate}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200"
            >
              Create
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {(loading ? [] : shiftTemplates).map((template) => (
              <div key={template.id} className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-100">{template.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeTone(template.staff_category || 'Scope')}`}>
                        {template.staff_category || 'Mixed'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{template.code}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {formatTime(template.shift_start)} - {formatTime(template.shift_end)} • Grace {template.grace_minutes} min
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {(template.working_days || []).join(', ') || 'All days'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {template.department_name || 'All departments'}
                      {template.position_title ? ` • ${template.position_title}` : ''}
                      {template.requires_biometric_clock ? ' • Biometric required' : ' • Manual allowed'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditTemplate(template)}
                      disabled={working}
                      className="rounded border border-white/[0.09] px-2 py-1 text-[11px] text-slate-200 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ kind: 'template', id: template.id })}
                      disabled={working}
                      className="rounded border border-rose-700/40 px-2 py-1 text-[11px] text-rose-300 disabled:opacity-60"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && shiftTemplates.length === 0 ? (
              <p className="text-xs text-slate-500">No shift templates configured yet.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Missed Check-In Evaluation</h2>
          <p className="mt-1 text-xs text-slate-500">
            Trigger the same-day absence alert rules for a staff member and date after the grace window.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={alertEvaluationForm.employee}
              onChange={(event) => setAlertEvaluationForm((prev) => ({ ...prev, employee: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_id} - {employee.full_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={alertEvaluationForm.date}
              onChange={(event) => setAlertEvaluationForm((prev) => ({ ...prev, date: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={alertEvaluationForm.triggered_at}
              onChange={(event) => setAlertEvaluationForm((prev) => ({ ...prev, triggered_at: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <button
              onClick={evaluateAlert}
              disabled={working}
              className="rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-200 disabled:opacity-60 sm:col-span-2"
            >
              Evaluate Missed Check-In
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-100">Overtime Policy Settings</h2>
        <p className="mt-1 text-xs text-slate-500">
          Policy settings are currently UI-level reporting controls and do not override backend attendance computation yet.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            min={0}
            step="0.5"
            value={overtimeThresholdHours}
            onChange={(event) => setOvertimeThresholdHours(event.target.value)}
            placeholder="Threshold hours"
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={includeBreakInPolicy}
              onChange={(event) => setIncludeBreakInPolicy(event.target.checked)}
            />
            Include break duration
          </label>
          <div className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
            Preview avg overtime by policy: <span className="font-semibold text-slate-100">{policyOvertimePreview}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-100">Clock Actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={clockEmployee}
            onChange={(event) => setClockEmployee(event.target.value)}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_id} - {employee.full_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={clockDate}
            onChange={(event) => setClockDate(event.target.value)}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={clockInTime}
            onChange={(event) => setClockInTime(event.target.value)}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={clockOutTime}
            onChange={(event) => setClockOutTime(event.target.value)}
            className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleClockIn}
              disabled={working}
              className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
            >
              Clock In
            </button>
            <button
              onClick={handleClockOut}
              disabled={working}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              Clock Out
            </button>
          </div>
        </div>
        {selectedClockEmployeeLabel ? (
          <p className="mt-2 text-xs text-slate-400">Selected: {selectedClockEmployeeLabel}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Attendance Records</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Shift</th>
                <th className="px-4 py-3 text-left">Clock</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Payroll Feed</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : records).map((record) => (
                <tr key={record.id} className="border-t border-white/[0.07] align-top">
                  <td className="px-4 py-3 text-slate-100">
                    <p>{record.employee_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.shift_template_name || 'No shift template resolved'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p>{record.date}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Deadline: {record.expected_check_in_deadline ? formatDateTime(record.expected_check_in_deadline) : 'None'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {record.scheduled_shift_start || record.scheduled_shift_end ? (
                      <>
                        <p>
                          {formatTime(record.scheduled_shift_start)} - {formatTime(record.scheduled_shift_end)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Alert: {formatLabel(record.alert_status)} • Reconciliation: {formatLabel(record.reconciliation_status)}
                        </p>
                      </>
                    ) : (
                      <span className="text-slate-500">Unscheduled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p>In: {formatTime(record.clock_in)}</p>
                    <p className="mt-1">Out: {formatTime(record.clock_out)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.hours_worked} hrs • OT {record.overtime_hours}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${badgeTone(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${badgeTone(record.attendance_source)}`}>
                      {formatLabel(record.attendance_source)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${badgeTone(record.payroll_feed_status)}`}>
                      {formatLabel(record.payroll_feed_status)}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-sm text-slate-500">
                    No attendance records found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Attendance Report (By Employee)</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee ID</th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Present</th>
                <th className="px-4 py-3 text-left">Absent</th>
                <th className="px-4 py-3 text-left">Late</th>
                <th className="px-4 py-3 text-left">Avg Hours</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : reportRows).map((row) => (
                <tr key={row.employee_id} className="border-t border-white/[0.07]">
                  <td className="px-4 py-3 text-slate-100">{row.employee_id}</td>
                  <td className="px-4 py-3 text-slate-300">{row.employee_name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.days}</td>
                  <td className="px-4 py-3 text-slate-300">{row.present}</td>
                  <td className="px-4 py-3 text-slate-300">{row.absent}</td>
                  <td className="px-4 py-3 text-slate-300">{row.late}</td>
                  <td className="px-4 py-3 text-slate-300">{row.average_hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Work Schedules</h2>
            <p className="mt-1 text-xs text-slate-500">Employee schedules override department schedules when both apply.</p>
          </div>
          <button
            onClick={openCreateSchedule}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200"
          >
            Create
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Scope</th>
                <th className="px-4 py-3 text-left">Template</th>
                <th className="px-4 py-3 text-left">Shift</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Effective</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : schedules).map((schedule) => (
                <tr key={schedule.id} className="border-t border-white/[0.07]">
                  <td className="px-4 py-3 text-slate-300">
                    {schedule.employee_name || schedule.department_name || 'Scoped schedule'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p>{schedule.shift_template_name || 'Manual shift'}</p>
                    <p className="mt-1 text-xs text-slate-500">{schedule.staff_category_snapshot || 'No category snapshot'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatTime(schedule.shift_start)} - {formatTime(schedule.shift_end)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{(schedule.working_days || []).join(', ')}</td>
                  <td className="px-4 py-3 text-slate-300">{schedule.assignment_priority}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {schedule.effective_from}
                    {schedule.effective_to ? ` to ${schedule.effective_to}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditSchedule(schedule)}
                        className="text-xs text-emerald-300"
                        disabled={working}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ kind: 'schedule', id: schedule.id })}
                        className="text-xs text-rose-300"
                        disabled={working}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl glass-panel">
        <header className="border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Absence Alert Queue</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Shift</th>
                <th className="px-4 py-3 text-left">Manager</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Resolution</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : alerts).map((alert) => (
                <tr key={alert.id} className="border-t border-white/[0.07] align-top">
                  <td className="px-4 py-3 text-slate-100">
                    <p>{alert.employee_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{alert.alert_date}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p>{alert.shift_template_name || 'Resolved schedule'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatTime(alert.expected_shift_start)} • Grace until {formatDateTime(alert.grace_deadline)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p>{alert.notified_manager_name || 'HR fallback'}</p>
                    <p className="mt-1 text-xs text-slate-500">{alert.hr_copied ? 'HR copied' : 'Manager-first'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${badgeTone(alert.status)}`}>
                      {formatLabel(alert.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <p className="text-xs text-slate-400">{alert.resolution_reason || 'Open operational case'}</p>
                    <p className="mt-1 text-xs text-slate-500">{alert.notes || 'No notes'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openResolveAlert(alert)}
                        disabled={working}
                        className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 disabled:opacity-60"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => void escalateAlert(alert.id)}
                        disabled={working || alert.status !== 'OPEN'}
                        className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200 disabled:opacity-50"
                      >
                        Escalate
                      </button>
                      <button
                        onClick={() => openAlertAsSubstitute(alert)}
                        disabled={working}
                        className="rounded border border-white/[0.09] px-2 py-1 text-xs text-slate-200 disabled:opacity-50"
                      >
                        Use for Substitute
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-slate-500">
                    No absence alerts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {activeAlert ? (
        <section className="rounded-xl glass-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Resolve Alert #{activeAlert.id}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeAlert.employee_name} • {activeAlert.alert_date}
              </p>
            </div>
            <button
              onClick={() => {
                setActiveAlertId(null)
                setAlertResolveForm(defaultAlertResolveForm)
              }}
              className="text-xs text-slate-400"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <select
              value={alertResolveForm.attendance_status}
              onChange={(event) => setAlertResolveForm((prev) => ({ ...prev, attendance_status: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            >
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              value={alertResolveForm.resolution_reason}
              onChange={(event) => setAlertResolveForm((prev) => ({ ...prev, resolution_reason: event.target.value }))}
              placeholder="Resolution reason"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              value={alertResolveForm.notes}
              onChange={(event) => setAlertResolveForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Resolution notes"
              rows={3}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-3"
            />
            <button
              onClick={submitAlertResolution}
              disabled={working}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-3"
            >
              Save Alert Resolution
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Teaching Substitute Coverage</h2>
          <p className="mt-1 text-xs text-slate-500">
            Substitute assignments are restricted to teaching staff and do not replace the canonical attendance outcome.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={substituteForm.absent_employee}
              onChange={(event) =>
                setSubstituteForm((prev) => ({ ...prev, absent_employee: event.target.value, attendance_record: '' }))
              }
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="">Absent teacher</option>
              {teachingEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_id} - {employee.full_name}
                </option>
              ))}
            </select>
            <select
              value={substituteForm.substitute_employee}
              onChange={(event) => setSubstituteForm((prev) => ({ ...prev, substitute_employee: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="">Substitute teacher</option>
              {teachingEmployees
                .filter((employee) => String(employee.id) !== substituteForm.absent_employee)
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_id} - {employee.full_name}
                  </option>
                ))}
            </select>
            <input
              type="date"
              value={substituteForm.assignment_date}
              onChange={(event) =>
                setSubstituteForm((prev) => ({ ...prev, assignment_date: event.target.value, attendance_record: '' }))
              }
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <select
              value={substituteForm.attendance_record}
              onChange={(event) => setSubstituteForm((prev) => ({ ...prev, attendance_record: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="">Attendance record (optional)</option>
              {substituteAttendanceOptions.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.date} • {record.status}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={substituteForm.start_time}
              onChange={(event) => setSubstituteForm((prev) => ({ ...prev, start_time: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={substituteForm.end_time}
              onChange={(event) => setSubstituteForm((prev) => ({ ...prev, end_time: event.target.value }))}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
            />
            <input
              value={substituteForm.class_context}
              onChange={(event) => setSubstituteForm((prev) => ({ ...prev, class_context: event.target.value }))}
              placeholder="Class or timetable context"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              value={substituteForm.reason}
              onChange={(event) => setSubstituteForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Reason"
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              value={substituteForm.notes}
              onChange={(event) => setSubstituteForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notes"
              rows={3}
              className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
            />
            <button
              onClick={saveSubstituteAssignment}
              disabled={working}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
            >
              Save Substitute Assignment
            </button>
          </div>
        </article>

        <article className="rounded-xl glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-100">Current Substitute Assignments</h2>
          <div className="mt-4 space-y-2">
            {(loading ? [] : substituteAssignments).map((assignment) => (
              <div key={assignment.id} className="rounded-lg border border-white/[0.07] bg-slate-950/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">
                      {assignment.absent_employee_name} → {assignment.substitute_employee_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {assignment.assignment_date}
                      {assignment.start_time ? ` • ${formatTime(assignment.start_time)}` : ''}
                      {assignment.end_time ? ` - ${formatTime(assignment.end_time)}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{assignment.class_context || 'No class context provided'}</p>
                    <p className="mt-1 text-xs text-slate-500">{assignment.reason || 'No reason provided'}</p>
                  </div>
                  <p className="text-[11px] text-slate-500">{assignment.assigned_by_name || 'System'}</p>
                </div>
              </div>
            ))}
            {!loading && substituteAssignments.length === 0 ? (
              <p className="text-xs text-slate-500">No substitute assignments yet.</p>
            ) : null}
          </div>
        </article>
      </section>

      {showTemplateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-white/[0.07] bg-[#0d1421] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                {templateForm.id ? 'Edit Shift Template' : 'Create Shift Template'}
              </h2>
              <button onClick={closeTemplateModal} className="text-sm text-slate-400">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={templateForm.name}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Template name"
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                value={templateForm.code}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="Template code"
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <select
                value={templateForm.staff_category}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, staff_category: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">All staff categories</option>
                {STAFF_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {formatLabel(category)}
                  </option>
                ))}
              </select>
              <select
                value={templateForm.department}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, department: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <select
                value={templateForm.position}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, position: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">All positions</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={templateForm.shift_start}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, shift_start: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={templateForm.shift_end}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, shift_end: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={templateForm.break_duration_minutes}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, break_duration_minutes: event.target.value }))}
                placeholder="Break duration (minutes)"
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={templateForm.grace_minutes}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, grace_minutes: event.target.value }))}
                placeholder="Grace minutes"
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={templateForm.requires_biometric_clock}
                  onChange={(event) =>
                    setTemplateForm((prev) => ({ ...prev, requires_biometric_clock: event.target.checked }))
                  }
                />
                Require biometric clock
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={templateForm.overtime_eligible}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, overtime_eligible: event.target.checked }))}
                />
                Overtime eligible
              </label>
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Working Days</p>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <label
                      key={day}
                      className={`cursor-pointer rounded-lg border px-3 py-1 text-xs ${
                        templateForm.working_days.includes(day)
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                          : 'border-white/[0.09] bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={templateForm.working_days.includes(day)}
                        onChange={() => toggleTemplateDay(day)}
                        className="sr-only"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={saveTemplate}
                disabled={working}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
              >
                Save Shift Template
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showScheduleModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-white/[0.07] bg-[#0d1421] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                {scheduleForm.id ? 'Edit Work Schedule' : 'Create Work Schedule'}
              </h2>
              <button onClick={closeScheduleModal} className="text-sm text-slate-400">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                value={scheduleForm.department}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, department: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">Department scope (optional)</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <select
                value={scheduleForm.employee}
                onChange={(event) => {
                  const selectedEmployee = employees.find((employee) => String(employee.id) === event.target.value)
                  setScheduleForm((prev) => ({
                    ...prev,
                    employee: event.target.value,
                    staff_category_snapshot: selectedEmployee?.staff_category ?? prev.staff_category_snapshot,
                  }))
                }}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">Employee scope (optional)</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_id} - {employee.full_name}
                  </option>
                ))}
              </select>
              <select
                value={scheduleForm.shift_template}
                onChange={(event) => {
                  const selectedTemplate = shiftTemplates.find((template) => String(template.id) === event.target.value)
                  setScheduleForm((prev) => ({
                    ...prev,
                    shift_template: event.target.value,
                    staff_category_snapshot: selectedTemplate?.staff_category || prev.staff_category_snapshot,
                    shift_start: selectedTemplate ? formatTime(selectedTemplate.shift_start) : prev.shift_start,
                    shift_end: selectedTemplate ? formatTime(selectedTemplate.shift_end) : prev.shift_end,
                    working_days: selectedTemplate?.working_days ?? prev.working_days,
                    break_duration: selectedTemplate ? String(selectedTemplate.break_duration_minutes) : prev.break_duration,
                  }))
                }}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              >
                <option value="">Resolved from shift template (optional)</option>
                {shiftTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.code} - {template.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={scheduleForm.assignment_priority}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, assignment_priority: event.target.value }))}
                placeholder="Assignment priority"
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                value={scheduleForm.staff_category_snapshot}
                onChange={(event) =>
                  setScheduleForm((prev) => ({ ...prev, staff_category_snapshot: event.target.value }))
                }
                placeholder="Staff category snapshot"
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={scheduleForm.shift_start}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, shift_start: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={scheduleForm.shift_end}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, shift_end: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={scheduleForm.break_duration}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, break_duration: event.target.value }))}
                placeholder="Break duration (minutes)"
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={scheduleForm.effective_from}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, effective_from: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={scheduleForm.effective_to}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, effective_to: event.target.value }))}
                className="rounded-lg border border-white/[0.09] bg-slate-950/60 px-3 py-2 text-sm sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Working Days</p>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <label
                      key={day}
                      className={`cursor-pointer rounded-lg border px-3 py-1 text-xs ${
                        scheduleForm.working_days.includes(day)
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                          : 'border-white/[0.09] bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={scheduleForm.working_days.includes(day)}
                        onChange={() => toggleScheduleDay(day)}
                        className="sr-only"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={saveSchedule}
                disabled={working}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 sm:col-span-2"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'template' ? 'Archive Shift Template' : 'Archive Work Schedule'}
        description={
          deleteTarget?.kind === 'template'
            ? 'Are you sure you want to archive this shift template? Existing attendance history will remain.'
            : 'Are you sure you want to archive this work schedule? Existing attendance history will remain.'
        }
        confirmLabel="Archive"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={archiveItem}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
