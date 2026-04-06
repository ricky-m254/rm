import { apiClient } from './client'

export type ControlPlaneStatus = 'NOT_READY' | 'PARTIALLY_READY' | 'READY'
export type BlockerSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface ControlPlaneBlocker {
  section: string
  severity: BlockerSeverity
  code: string
  message: string
  route: string
  api_path: string
}

export interface ControlPlaneOwner {
  section: string
  route: string
  api_path: string
}

export interface ControlPlaneSection {
  label: string
  status: ControlPlaneStatus
  owner: ControlPlaneOwner
  data: Record<string, unknown> | null
  blockers: ControlPlaneBlocker[]
}

export interface ControlPlaneSummary {
  overall_status: ControlPlaneStatus
  summary_counts: {
    sections: number
    critical_blockers: number
    warning_blockers: number
    info_blockers: number
  }
  sections: Record<string, ControlPlaneSection>
  blockers: ControlPlaneBlocker[]
}

export interface SecurityPolicy {
  id: number
  session_timeout_minutes: number
  max_login_attempts: number
  lockout_duration_minutes: number
  min_password_length: number
  require_uppercase: boolean
  require_numbers: boolean
  require_special_characters: boolean
  password_expiry_days: number
  mfa_mode: 'DISABLED' | 'ADMIN_ONLY' | 'ALL_STAFF'
  mfa_method: 'SMS' | 'EMAIL' | 'TOTP'
  ip_whitelist_enabled: boolean
  allowed_ip_ranges: string[]
  audit_log_retention_days: number
  updated_by: number | null
  updated_by_name: string | null
  created_at: string
  updated_at: string
}

export interface SecurityPolicyUpdatePayload
  extends Partial<Omit<SecurityPolicy, 'allowed_ip_ranges'>> {
  allowed_ip_ranges?: string[] | string
}

export interface LifecycleTaskTemplate {
  id: number
  task_code: string
  title: string
  description: string
  task_group: string
  required: boolean
  display_order: number
  waivable: boolean
  validation_key: string
}

export interface LifecycleTemplate {
  id: number
  code: 'TENANT_ONBOARDING' | 'TERM_START' | 'YEAR_CLOSE'
  name: string
  description: string
  is_active: boolean
  task_templates: LifecycleTaskTemplate[]
  created_at: string
  updated_at: string
}

export interface LifecycleTaskRun {
  id: number
  template_task_id: number
  template_task_code: string
  template_task_title: string
  template_task_description: string
  template_task_group: string
  required: boolean
  waivable: boolean
  validation_key: string
  status: 'PENDING' | 'COMPLETED' | 'WAIVED' | 'BLOCKED'
  completed_by: number | null
  completed_by_name: string | null
  completed_at: string | null
  waived_by: number | null
  waived_by_name: string | null
  waived_at: string | null
  notes: string
  evidence: Record<string, unknown>
  blocker_message: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface LifecycleRun {
  id: number
  template: number
  template_code: 'TENANT_ONBOARDING' | 'TERM_START' | 'YEAR_CLOSE'
  template_name: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED'
  started_by: number | null
  started_by_name: string | null
  completed_by: number | null
  completed_by_name: string | null
  started_at: string | null
  completed_at: string | null
  target_academic_year: number | null
  target_academic_year_name: string | null
  target_term: number | null
  target_term_name: string | null
  target_term_academic_year_id: number | null
  summary: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  task_runs?: LifecycleTaskRun[]
}

type CountedResponse<T> = {
  count: number
  results: T[]
}

export async function getControlPlaneSummary(): Promise<ControlPlaneSummary> {
  const response = await apiClient.get<ControlPlaneSummary>('/settings/control-plane/')
  return response.data
}

export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  const response = await apiClient.get<SecurityPolicy>('/settings/security-policy/')
  return response.data
}

export async function updateSecurityPolicy(payload: SecurityPolicyUpdatePayload): Promise<SecurityPolicy> {
  const response = await apiClient.patch<SecurityPolicy>('/settings/security-policy/', payload)
  return response.data
}

export async function getLifecycleTemplates(): Promise<LifecycleTemplate[]> {
  const response = await apiClient.get<CountedResponse<LifecycleTemplate>>('/settings/lifecycle-templates/')
  return response.data.results
}

export async function getLifecycleRuns(): Promise<LifecycleRun[]> {
  const response = await apiClient.get<CountedResponse<LifecycleRun>>('/settings/lifecycle-runs/')
  return response.data.results
}

export async function createLifecycleRun(payload: {
  template_code: LifecycleTemplate['code']
  target_academic_year?: number | null
  target_term?: number | null
  metadata?: Record<string, unknown>
}): Promise<LifecycleRun> {
  const response = await apiClient.post<LifecycleRun>('/settings/lifecycle-runs/', payload)
  return response.data
}

export async function getLifecycleRun(runId: number): Promise<LifecycleRun> {
  const response = await apiClient.get<LifecycleRun>(`/settings/lifecycle-runs/${runId}/`)
  return response.data
}

export async function startLifecycleRun(runId: number): Promise<LifecycleRun> {
  const response = await apiClient.post<LifecycleRun>(`/settings/lifecycle-runs/${runId}/start/`, {})
  return response.data
}

export async function completeLifecycleRun(runId: number): Promise<LifecycleRun> {
  const response = await apiClient.post<LifecycleRun>(`/settings/lifecycle-runs/${runId}/complete/`, {})
  return response.data
}

export async function completeLifecycleTask(
  runId: number,
  taskId: number,
  payload: { notes?: string; evidence?: Record<string, unknown> } = {},
): Promise<LifecycleRun> {
  const response = await apiClient.post<LifecycleRun>(`/settings/lifecycle-runs/${runId}/tasks/${taskId}/complete/`, payload)
  return response.data
}

export async function waiveLifecycleTask(
  runId: number,
  taskId: number,
  payload: { notes: string },
): Promise<LifecycleRun> {
  const response = await apiClient.post<LifecycleRun>(`/settings/lifecycle-runs/${runId}/tasks/${taskId}/waive/`, payload)
  return response.data
}
