export type JsonRecord = Record<string, unknown>

export type EmployeeRef = {
  id: number
  employee_id: string
  first_name?: string
  last_name?: string
  full_name?: string
  status?: string
  department_name?: string
  position_title?: string
}

export type DepartmentRef = {
  id: number
  name: string
}

export type PositionRef = {
  id: number
  title: string
  department?: number | null
  department_name?: string
}

export type StaffLifecycleEvent = {
  id: number
  employee: number
  employee_name: string
  event_group: string
  event_type: string
  title: string
  summary: string
  status_snapshot: string
  effective_date: string | null
  occurred_at: string
  recorded_by: number | null
  recorded_by_name: string
  source_model: string
  source_id: number | null
  before_snapshot: JsonRecord
  after_snapshot: JsonRecord
  metadata: JsonRecord
  created_at: string
}

export type StaffCareerAction = {
  id: number
  employee: number
  employee_name: string
  parent_action: number | null
  parent_action_type: string
  action_type: 'PROMOTION' | 'DEMOTION' | 'ACTING_APPOINTMENT' | 'ACTING_APPOINTMENT_END'
  from_department: number | null
  from_department_name: string
  from_position_ref: number | null
  from_position_ref_title: string
  from_position_title: string
  to_department: number | null
  to_department_name: string
  to_position_ref: number | null
  to_position_ref_title: string
  to_position_title: string
  target_position_grade: string
  target_salary_scale: string
  reason: string
  effective_date: string
  status: 'DRAFT' | 'SCHEDULED' | 'EFFECTIVE' | 'CANCELLED'
  previous_assignment_snapshot: JsonRecord
  notes: string
  requested_by: number | null
  requested_by_name: string
  applied_by: number | null
  applied_by_name: string
  created_at: string
  updated_at: string
}

export type DisciplinaryCase = {
  id: number
  employee: number
  employee_name: string
  case_number: string
  category: string
  opened_on: string
  incident_date: string | null
  summary: string
  details: string
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  outcome: '' | 'ADVISORY' | 'WARNING' | 'SUSPENSION' | 'DISMISSAL' | 'EXONERATED'
  effective_date: string | null
  opened_by: number | null
  opened_by_name: string
  closed_by: number | null
  closed_by_name: string
  notes: string
  created_at: string
  updated_at: string
}

export type ExitCase = {
  id: number
  employee: number
  employee_name: string
  exit_type: 'RESIGNATION' | 'RETIREMENT' | 'DISMISSAL' | 'CONTRACT_END'
  notice_date: string | null
  last_working_date: string | null
  effective_date: string | null
  reason: string
  status: 'DRAFT' | 'CLEARANCE' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED'
  requested_by: number | null
  requested_by_name: string
  completed_by: number | null
  completed_by_name: string
  notes: string
  created_at: string
  updated_at: string
}

export type ExitClearanceItem = {
  id: number
  exit_case: number
  exit_case_status: string
  label: string
  department_name: string
  status: 'PENDING' | 'CLEARED' | 'WAIVED'
  completed_at: string | null
  completed_by: number | null
  completed_by_name: string
  notes: string
  display_order: number
  created_at: string
  updated_at: string
}

export const toArray = <T,>(value: T[] | { results?: T[] } | null | undefined): T[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString()
}

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

export const formatLabel = (value: string | null | undefined): string => {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (part) => part.toUpperCase())
}

export const getEmployeeDisplayName = (employee: EmployeeRef): string => {
  if (employee.full_name && employee.full_name.trim()) return employee.full_name
  const combined = `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim()
  return combined || employee.employee_id
}

export const asRecord = (value: unknown): JsonRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as JsonRecord
}

export const readNestedText = (record: JsonRecord | null | undefined, key: string): string => {
  if (!record) return ''
  const value = record[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

export const readSnapshotStatus = (snapshot: unknown): string => {
  return readNestedText(asRecord(snapshot), 'status')
}

export const readSnapshotDepartmentName = (snapshot: unknown): string => {
  const container = asRecord(snapshot)
  const department = asRecord(container?.department)
  return readNestedText(department, 'name')
}

export const readSnapshotPositionTitle = (snapshot: unknown): string => {
  const container = asRecord(snapshot)
  const position = asRecord(container?.position)
  return readNestedText(position, 'title')
}
