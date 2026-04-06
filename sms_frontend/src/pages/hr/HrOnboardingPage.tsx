import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'
import { ROLE_REFERENCE_ORDER, STAFF_ROLE_NAMES, getRoleLabel } from '../../lib/roleCatalog'
import { extractApiErrorMessage } from '../../utils/forms'

type Employee = {
  id: number
  employee_id: string
  staff_id: string
  full_name: string
  department_name: string
  position_title: string
  staff_category: string
  onboarding_status: string
  account_role_name: string
  account_provisioned_at: string | null
  work_email: string
  personal_email: string
  has_biometric_link: boolean
  has_primary_emergency_contact: boolean
  qualification_count: number
}

type OnboardingTask = {
  id: number
  employee: number
  employee_name: string
  task_code: string
  task: string
  assigned_to_name: string
  due_date: string | null
  status: 'Pending' | 'In Progress' | 'Completed'
  is_required: boolean
  blocks_account_provisioning: boolean
  completed_at: string | null
  notes: string
}

type EmploymentProfile = {
  id: number
  employee: number
  kra_pin: string
  nhif_number: string
  nssf_number: string
  tsc_number: string
  bank_name: string
  bank_branch: string
  bank_account_name: string
  bank_account_number: string
  position_grade: string
  salary_scale: string
  employment_notes: string
}

type Qualification = {
  id: number
  employee: number
  qualification_type: string
  title: string
  institution: string
  field_of_study: string
  registration_number: string
  year_obtained: number | null
  issue_date: string | null
  expiry_date: string | null
  is_primary: boolean
}

type EmergencyContact = {
  id: number
  employee: number
  name: string
  relationship: string
  phone_primary: string
  phone_alt: string
  address: string
  is_primary: boolean
}

type OnboardingSummary = {
  employee_id: number
  staff_id: string
  onboarding_status: string
  suggested_onboarding_status: string
  identity: { is_complete: boolean; missing_fields: string[] }
  employment_profile: { id: number | null; is_complete: boolean; missing_fields: string[]; recommended_missing_fields: string[] }
  emergency_contacts: { count: number; has_primary: boolean; primary_contact_id: number | null }
  qualifications: { count: number; is_complete: boolean; primary_qualification_id: number | null }
  biometric: { is_linked: boolean; registry_id: number | null; fingerprint_id: string; card_no: string; dahua_user_id: string; enrolled_at: string | null }
  role_selection: { is_complete: boolean; role_name: string }
  task_summary: {
    total: number
    completed: number
    blocking_pending: number
    blocking_tasks: Array<{ id: number; task_code: string; task: string; status: string; due_date: string | null; is_auto_ready: boolean | null }>
  }
  blockers: Array<{ code: string; message: string; fields: string[] }>
  can_provision_account: boolean
}

const STAFF_CATEGORIES = ['TEACHING', 'ADMIN', 'SUPPORT', 'OPERATIONS', 'HOSTEL', 'SECURITY', 'KITCHEN', 'HEALTH'] as const
const STAFF_ROLE_OPTIONS = ROLE_REFERENCE_ORDER.filter((roleName) => STAFF_ROLE_NAMES.has(roleName))

const defaultIdentityForm = { personal_email: '', work_email: '', staff_category: '', account_role_name: '' }
const defaultEmploymentProfileForm = {
  kra_pin: '',
  nhif_number: '',
  nssf_number: '',
  tsc_number: '',
  bank_name: '',
  bank_branch: '',
  bank_account_name: '',
  bank_account_number: '',
  position_grade: '',
  salary_scale: '',
  employment_notes: '',
}
const defaultQualificationForm = { qualification_type: 'Degree', title: '', institution: '', field_of_study: '', registration_number: '', year_obtained: '', is_primary: true }
const defaultEmergencyContactForm = { name: '', relationship: '', phone_primary: '', phone_alt: '', address: '', is_primary: true }
const defaultBiometricForm = { fingerprint_id: '', card_no: '', dahua_user_id: '' }
const defaultProvisioningForm = { role_name: '', username: '', send_welcome_email: true }
const defaultTaskForm = { task: '', due_date: '', status: 'Pending' as OnboardingTask['status'], notes: '' }

const toArray = <T,>(value: T[] | { results?: T[] } | null | undefined): T[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  return Array.isArray(value.results) ? value.results : []
}

const statusTone = (status: string) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PROVISIONED') return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
  if (normalized === 'READY_FOR_PROVISIONING') return 'bg-sky-500/20 text-sky-200 border-sky-500/30'
  if (normalized === 'IN_PROGRESS') return 'bg-amber-500/20 text-amber-200 border-amber-500/30'
  return 'bg-slate-500/20 text-slate-200 border-slate-500/30'
}

export default function HrOnboardingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(searchParams.get('employee') ?? '')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [summary, setSummary] = useState<OnboardingSummary | null>(null)
  const [employmentProfile, setEmploymentProfile] = useState<EmploymentProfile | null>(null)
  const [qualifications, setQualifications] = useState<Qualification[]>([])
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [identityForm, setIdentityForm] = useState(defaultIdentityForm)
  const [employmentProfileForm, setEmploymentProfileForm] = useState(defaultEmploymentProfileForm)
  const [qualificationForm, setQualificationForm] = useState(defaultQualificationForm)
  const [emergencyContactForm, setEmergencyContactForm] = useState(defaultEmergencyContactForm)
  const [biometricForm, setBiometricForm] = useState(defaultBiometricForm)
  const [provisioningForm, setProvisioningForm] = useState(defaultProvisioningForm)
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [provisionedCredentials, setProvisionedCredentials] = useState<{ username: string; temporaryPassword: string; welcomeEmailStatus: string; welcomeEmailFailureReason: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [workingKey, setWorkingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteQualificationTarget, setDeleteQualificationTarget] = useState<Qualification | null>(null)
  const [deleteContactTarget, setDeleteContactTarget] = useState<EmergencyContact | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const selectedEmployee = useMemo(
    () => employees.find((row) => String(row.id) === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )

  const loadEmployees = async (preferredEmployeeId?: string | null) => {
    const response = await apiClient.get<Employee[] | { results: Employee[] }>('/hr/employees/')
    const rows = toArray(response.data)
    setEmployees(rows)
    const requestedEmployeeId = preferredEmployeeId ?? searchParams.get('employee') ?? selectedEmployeeId
    const nextSelected =
      (requestedEmployeeId && rows.some((row) => String(row.id) === requestedEmployeeId) && requestedEmployeeId) ||
      (rows[0] ? String(rows[0].id) : '')
    setSelectedEmployeeId(nextSelected)
    setSearchParams(nextSelected ? { employee: nextSelected } : {})
    return nextSelected
  }

  const loadWorkspace = async (employeeId: string) => {
    if (!employeeId) {
      setEmployee(null)
      setSummary(null)
      setEmploymentProfile(null)
      setQualifications([])
      setContacts([])
      setTasks([])
      return
    }

    const [employeeRes, summaryRes, profileRes, qualificationRes, contactRes, taskRes] = await Promise.all([
      apiClient.get<Employee>(`/hr/employees/${employeeId}/`),
      apiClient.get<OnboardingSummary>(`/hr/employees/${employeeId}/onboarding-summary/`),
      apiClient.get<EmploymentProfile[] | { results: EmploymentProfile[] }>(`/hr/employment-profiles/?employee=${employeeId}`),
      apiClient.get<Qualification[] | { results: Qualification[] }>(`/hr/qualifications/?employee=${employeeId}`),
      apiClient.get<EmergencyContact[] | { results: EmergencyContact[] }>(`/hr/emergency-contacts/?employee=${employeeId}`),
      apiClient.get<OnboardingTask[]>(`/hr/onboarding/${employeeId}/`),
    ])

    const loadedEmployee = employeeRes.data
    const loadedSummary = summaryRes.data
    const loadedProfile = toArray(profileRes.data)[0] ?? null

    setEmployee(loadedEmployee)
    setSummary(loadedSummary)
    setEmploymentProfile(loadedProfile)
    setQualifications(toArray(qualificationRes.data))
    setContacts(toArray(contactRes.data))
    setTasks(taskRes.data)
    setIdentityForm({
      personal_email: loadedEmployee.personal_email ?? '',
      work_email: loadedEmployee.work_email ?? '',
      staff_category: loadedEmployee.staff_category ?? '',
      account_role_name: loadedEmployee.account_role_name ?? '',
    })
    setEmploymentProfileForm({
      kra_pin: loadedProfile?.kra_pin ?? '',
      nhif_number: loadedProfile?.nhif_number ?? '',
      nssf_number: loadedProfile?.nssf_number ?? '',
      tsc_number: loadedProfile?.tsc_number ?? '',
      bank_name: loadedProfile?.bank_name ?? '',
      bank_branch: loadedProfile?.bank_branch ?? '',
      bank_account_name: loadedProfile?.bank_account_name ?? '',
      bank_account_number: loadedProfile?.bank_account_number ?? '',
      position_grade: loadedProfile?.position_grade ?? '',
      salary_scale: loadedProfile?.salary_scale ?? '',
      employment_notes: loadedProfile?.employment_notes ?? '',
    })
    setBiometricForm({
      fingerprint_id: loadedSummary.biometric.fingerprint_id ?? '',
      card_no: loadedSummary.biometric.card_no ?? '',
      dahua_user_id: loadedSummary.biometric.dahua_user_id ?? '',
    })
    setProvisioningForm((current) => ({ ...current, role_name: loadedEmployee.account_role_name ?? '', username: current.username }))
  }

  const refreshWorkspace = async (employeeId?: string) => {
    const targetEmployeeId = employeeId ?? selectedEmployeeId
    if (!targetEmployeeId) return
    await Promise.all([loadEmployees(targetEmployeeId), loadWorkspace(targetEmployeeId)])
  }

  useEffect(() => {
    const boot = async () => {
      setLoading(true)
      setError(null)
      try {
        const initialEmployeeId = await loadEmployees(searchParams.get('employee'))
        if (initialEmployeeId) await loadWorkspace(initialEmployeeId)
      } catch (err) {
        setError(extractApiErrorMessage(err, 'Unable to load onboarding workspace.'))
      } finally {
        setLoading(false)
      }
    }
    void boot()
  }, [])

  useEffect(() => {
    if (!selectedEmployeeId) return
    setSearchParams({ employee: selectedEmployeeId })
    setProvisionedCredentials(null)
    void loadWorkspace(selectedEmployeeId).catch((err) => {
      setError(extractApiErrorMessage(err, 'Unable to load selected onboarding record.'))
    })
  }, [selectedEmployeeId])

  const withAction = async (key: string, action: () => Promise<void>) => {
    setWorkingKey(key)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'The requested onboarding action could not be completed.'))
    } finally {
      setWorkingKey(null)
    }
  }

  const saveIdentity = async () => {
    if (!selectedEmployeeId) return
    await withAction('identity', async () => {
      await apiClient.patch(`/hr/employees/${selectedEmployeeId}/`, identityForm)
      await refreshWorkspace(selectedEmployeeId)
      setNotice('Identity and account-role details updated.')
    })
  }

  const saveEmploymentProfile = async () => {
    if (!selectedEmployeeId) return
    await withAction('profile', async () => {
      const payload = { employee: Number(selectedEmployeeId), ...employmentProfileForm }
      if (employmentProfile?.id) await apiClient.patch(`/hr/employment-profiles/${employmentProfile.id}/`, payload)
      else await apiClient.post('/hr/employment-profiles/', payload)
      await refreshWorkspace(selectedEmployeeId)
      setNotice('Employment profile saved.')
    })
  }

  const addQualification = async () => {
    if (!selectedEmployeeId || !qualificationForm.title.trim()) {
      setError('Qualification title is required.')
      return
    }
    await withAction('qualification', async () => {
      await apiClient.post('/hr/qualifications/', {
        employee: Number(selectedEmployeeId),
        qualification_type: qualificationForm.qualification_type,
        title: qualificationForm.title.trim(),
        institution: qualificationForm.institution.trim(),
        field_of_study: qualificationForm.field_of_study.trim(),
        registration_number: qualificationForm.registration_number.trim(),
        year_obtained: qualificationForm.year_obtained ? Number(qualificationForm.year_obtained) : null,
        is_primary: qualificationForm.is_primary,
      })
      setQualificationForm(defaultQualificationForm)
      await refreshWorkspace(selectedEmployeeId)
      setNotice('Qualification captured.')
    })
  }

  const archiveQualification = async () => {
    if (!deleteQualificationTarget || !selectedEmployeeId) return
    setDeleteError(null)
    await withAction('delete-qualification', async () => {
      await apiClient.delete(`/hr/qualifications/${deleteQualificationTarget.id}/`)
      setDeleteQualificationTarget(null)
      await refreshWorkspace(selectedEmployeeId)
      setNotice('Qualification archived.')
    })
  }

  const addEmergencyContact = async () => {
    if (!selectedEmployeeId || !emergencyContactForm.name.trim() || !emergencyContactForm.phone_primary.trim()) {
      setError('Contact name and primary phone are required.')
      return
    }
    await withAction('contact', async () => {
      await apiClient.post('/hr/emergency-contacts/', {
        employee: Number(selectedEmployeeId),
        ...emergencyContactForm,
        name: emergencyContactForm.name.trim(),
        relationship: emergencyContactForm.relationship.trim(),
        phone_primary: emergencyContactForm.phone_primary.trim(),
        phone_alt: emergencyContactForm.phone_alt.trim(),
        address: emergencyContactForm.address.trim(),
      })
      setEmergencyContactForm(defaultEmergencyContactForm)
      await refreshWorkspace(selectedEmployeeId)
      setNotice('Emergency contact saved.')
    })
  }

  const archiveEmergencyContact = async () => {
    if (!deleteContactTarget || !selectedEmployeeId) return
    setDeleteError(null)
    await withAction('delete-contact', async () => {
      await apiClient.delete(`/hr/emergency-contacts/${deleteContactTarget.id}/`)
      setDeleteContactTarget(null)
      await refreshWorkspace(selectedEmployeeId)
      setNotice('Emergency contact archived.')
    })
  }

  const linkBiometric = async () => {
    if (!selectedEmployeeId) return
    await withAction('biometric', async () => {
      await apiClient.post(`/hr/employees/${selectedEmployeeId}/link-biometric/`, biometricForm)
      await refreshWorkspace(selectedEmployeeId)
      setNotice('Biometric identity linked.')
    })
  }

  const provisionAccount = async () => {
    if (!selectedEmployeeId) return
    await withAction('provision', async () => {
      const response = await apiClient.post(`/hr/employees/${selectedEmployeeId}/provision-account/`, provisioningForm)
      setProvisionedCredentials({
        username: response.data.username,
        temporaryPassword: response.data.temporary_password,
        welcomeEmailStatus: response.data.welcome_email?.status ?? 'unknown',
        welcomeEmailFailureReason: response.data.welcome_email?.failure_reason ?? '',
      })
      await refreshWorkspace(selectedEmployeeId)
      setNotice('System account provisioned successfully.')
    })
  }

  const createTask = async () => {
    if (!selectedEmployeeId || !taskForm.task.trim()) {
      setError('Task label is required.')
      return
    }
    await withAction('task', async () => {
      await apiClient.post('/hr/onboarding/', {
        employee: Number(selectedEmployeeId),
        task: taskForm.task.trim(),
        due_date: taskForm.due_date || null,
        status: taskForm.status,
        notes: taskForm.notes.trim(),
      })
      setTaskForm(defaultTaskForm)
      await loadWorkspace(selectedEmployeeId)
      setNotice('Onboarding task created.')
    })
  }

  const completeTask = async (taskId: number) => {
    if (!selectedEmployeeId) return
    await withAction(`task-${taskId}`, async () => {
      await apiClient.patch(`/hr/onboarding/${taskId}/complete/`, { notes: 'Completed from onboarding workspace' })
      await loadWorkspace(selectedEmployeeId)
      setNotice('Onboarding task completed.')
    })
  }

  const effectiveEmployee = employee ?? selectedEmployee
  const suggestedStatus = summary?.suggested_onboarding_status ?? effectiveEmployee?.onboarding_status ?? 'PENDING'
  const blockerCount = summary?.blockers.length ?? 0
  const blockingTasks = summary?.task_summary.blocking_tasks ?? []
  const recommendedEmploymentFields = summary?.employment_profile.recommended_missing_fields ?? []
  const canProvisionAccount = Boolean(summary?.can_provision_account)
  const resolvedRoleName = provisioningForm.role_name || identityForm.account_role_name || effectiveEmployee?.account_role_name || ''
  const heroStats = [
    { label: 'Staff ID', value: effectiveEmployee?.staff_id || 'Not assigned' },
    { label: 'Status', value: suggestedStatus.replaceAll('_', ' ') },
    { label: 'Blockers', value: blockerCount, color: blockerCount > 0 ? '#fda4af' : '#86efac' },
    { label: 'Tasks', value: `${summary?.task_summary.completed ?? 0}/${summary?.task_summary.total ?? tasks.length}` },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        badge="HR"
        badgeColor="violet"
        title="Staff Onboarding"
        titleAccent="Workspace"
        subtitle="Complete staff identity, readiness, biometric linkage, and account provisioning from the Session 6 onboarding spine."
        icon="ID"
        stats={heroStats}
        actions={
          <>
            <Link
              to="/modules/hr/recruitment"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Open Recruitment
            </Link>
            {selectedEmployeeId ? (
              <Link
                to={`/modules/hr/employees/${selectedEmployeeId}`}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Open Full Profile
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}

      {!selectedEmployeeId ? (
        <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-8 text-center text-sm text-slate-300">
          <p className="text-base font-semibold text-slate-100">No onboarding record is selected yet.</p>
          <p className="mt-2 text-slate-400">Hire a candidate from recruitment or choose an existing employee once records are available.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.28em] text-violet-300/80">Selected Staff Record</p>
                  <h2 className="text-2xl font-display font-semibold text-white">{effectiveEmployee?.full_name || 'Staff onboarding workspace'}</h2>
                  <p className="text-sm text-slate-400">
                    {(effectiveEmployee?.position_title || 'No position title')}{effectiveEmployee?.department_name ? ` - ${effectiveEmployee.department_name}` : ''}
                  </p>
                </div>
                <div className="w-full max-w-sm">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Employee
                    <select
                      value={selectedEmployeeId}
                      onChange={(event) => setSelectedEmployeeId(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400"
                    >
                      {employees.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.staff_id || row.employee_id} - {row.full_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Staff ID</p>
                  <p className="mt-2 text-base font-semibold text-slate-100">{effectiveEmployee?.staff_id || 'Pending'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Category</p>
                  <p className="mt-2 text-base font-semibold text-slate-100">{effectiveEmployee?.staff_category || 'Select category'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Role</p>
                  <p className="mt-2 text-base font-semibold text-slate-100">{resolvedRoleName ? getRoleLabel(resolvedRoleName) : 'Select role'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Account</p>
                  <p className="mt-2 text-base font-semibold text-slate-100">{effectiveEmployee?.account_provisioned_at ? 'Provisioned' : 'Not provisioned'}</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-sky-300/80">Backend Readiness</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Provisioning gate</h2>
                  <p className="mt-2 text-sm text-slate-400">The backend summary remains authoritative for blockers, auto-ready tasks, and whether provisioning is allowed.</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${statusTone(suggestedStatus)}`}>
                  {suggestedStatus.replaceAll('_', ' ')}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {summary?.blockers.length ? (
                  summary.blockers.map((blocker) => (
                    <div key={blocker.code} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-rose-100">{blocker.message}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-rose-200/70">{blocker.code}</p>
                        </div>
                        <span className="rounded-full bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-200">{blocker.fields.length} field(s)</span>
                      </div>
                      {blocker.fields.length ? <p className="mt-3 text-xs text-rose-100/80">Missing: {blocker.fields.join(', ')}</p> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    All required onboarding blockers are cleared. Provisioning can proceed from this workspace.
                  </div>
                )}

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">Blocking checklist tasks</p>
                    <span className="text-xs text-slate-400">{summary?.task_summary.blocking_pending ?? 0} pending</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {blockingTasks.length ? (
                      blockingTasks.map((task) => (
                        <div key={task.id} className="rounded-2xl border border-white/[0.08] bg-slate-950/80 px-3 py-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-100">{task.task}</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{task.status}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                            <span>{task.task_code}</span>
                            <span>{task.due_date || 'No due date'}</span>
                            <span>{task.is_auto_ready ? 'Auto-ready once section is complete' : 'Manual completion required'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No blocking checklist items are currently pending.</p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-amber-300/80">Identity</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Canonical staff record</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${summary?.identity.is_complete ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-amber-500/30 bg-amber-500/15 text-amber-200'}`}>
                  {summary?.identity.is_complete ? 'Ready' : 'Needs work'}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Personal email
                  <input
                    value={identityForm.personal_email}
                    onChange={(event) => setIdentityForm((current) => ({ ...current, personal_email: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400"
                    placeholder="person@example.com"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Work email
                  <input
                    value={identityForm.work_email}
                    onChange={(event) => setIdentityForm((current) => ({ ...current, work_email: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400"
                    placeholder="staff@school.org"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Staff category
                  <select
                    value={identityForm.staff_category}
                    onChange={(event) => setIdentityForm((current) => ({ ...current, staff_category: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400"
                  >
                    <option value="">Select staff category</option>
                    {STAFF_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  Session 5 role baseline
                  <select
                    value={identityForm.account_role_name}
                    onChange={(event) => {
                      const nextRole = event.target.value
                      setIdentityForm((current) => ({ ...current, account_role_name: nextRole }))
                      setProvisioningForm((current) => ({ ...current, role_name: nextRole || current.role_name }))
                    }}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400"
                  >
                    <option value="">Select provisioned role</option>
                    {STAFF_ROLE_OPTIONS.map((roleName) => (
                      <option key={roleName} value={roleName}>
                        {getRoleLabel(roleName)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Missing required identity fields</p>
                <p className="mt-2 text-sm text-slate-300">{summary?.identity.missing_fields.length ? summary.identity.missing_fields.join(', ') : 'None. Identity requirements are satisfied.'}</p>
              </div>

              <button
                onClick={() => void saveIdentity()}
                disabled={workingKey === 'identity'}
                className="mt-5 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingKey === 'identity' ? 'Saving identity...' : 'Save identity details'}
              </button>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-sky-300/80">Employment Profile</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Statutory and payroll-ready details</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${summary?.employment_profile.is_complete ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-sky-500/30 bg-sky-500/15 text-sky-200'}`}>
                  {summary?.employment_profile.is_complete ? 'Required fields complete' : 'Still blocked'}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  KRA PIN
                  <input value={employmentProfileForm.kra_pin} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, kra_pin: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="text-sm text-slate-300">
                  NHIF number
                  <input value={employmentProfileForm.nhif_number} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, nhif_number: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="text-sm text-slate-300">
                  NSSF number
                  <input value={employmentProfileForm.nssf_number} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, nssf_number: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="text-sm text-slate-300">
                  TSC number
                  <input value={employmentProfileForm.tsc_number} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, tsc_number: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Bank name
                  <input value={employmentProfileForm.bank_name} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, bank_name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Bank account number
                  <input value={employmentProfileForm.bank_account_number} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, bank_account_number: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Position grade
                  <input value={employmentProfileForm.position_grade} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, position_grade: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Salary scale
                  <input value={employmentProfileForm.salary_scale} onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, salary_scale: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
              </div>
              <label className="mt-4 block text-sm text-slate-300">
                Employment notes
                <textarea
                  value={employmentProfileForm.employment_notes}
                  onChange={(event) => setEmploymentProfileForm((current) => ({ ...current, employment_notes: event.target.value }))}
                  className="mt-2 h-28 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
                  placeholder="Optional notes for onboarding, payroll, or internal HR follow-up."
                />
              </label>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Required missing fields</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {summary?.employment_profile.missing_fields.length ? summary.employment_profile.missing_fields.join(', ') : 'None. Statutory requirements are satisfied.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recommended follow-up</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {recommendedEmploymentFields.length ? recommendedEmploymentFields.join(', ') : 'No recommended follow-up fields are currently missing.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => void saveEmploymentProfile()}
                disabled={workingKey === 'profile'}
                className="mt-5 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingKey === 'profile' ? 'Saving profile...' : 'Save employment profile'}
              </button>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">Qualifications</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Professional readiness records</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${summary?.qualifications.is_complete ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-amber-500/30 bg-amber-500/15 text-amber-200'}`}>
                  {summary?.qualifications.count ?? 0} active
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {qualifications.length ? (
                  qualifications.map((qualification) => (
                    <div key={qualification.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{qualification.title}</p>
                          <p className="mt-1 text-sm text-slate-400">{qualification.institution || 'Institution not recorded'}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {[qualification.qualification_type, qualification.field_of_study, qualification.year_obtained].filter(Boolean).join(' - ') || 'No qualification metadata yet'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {qualification.is_primary ? <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Primary</span> : null}
                          <button
                            onClick={() => setDeleteQualificationTarget(qualification)}
                            className="rounded-full border border-rose-500/30 px-2 py-1 text-[11px] font-semibold text-rose-200"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-4 text-sm text-slate-400">
                    No active qualifications yet. Add at least one to clear the provisioning blocker.
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Qualification type
                  <input value={qualificationForm.qualification_type} onChange={(event) => setQualificationForm((current) => ({ ...current, qualification_type: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Title
                  <input value={qualificationForm.title} onChange={(event) => setQualificationForm((current) => ({ ...current, title: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Institution
                  <input value={qualificationForm.institution} onChange={(event) => setQualificationForm((current) => ({ ...current, institution: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Field of study
                  <input value={qualificationForm.field_of_study} onChange={(event) => setQualificationForm((current) => ({ ...current, field_of_study: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Registration number
                  <input value={qualificationForm.registration_number} onChange={(event) => setQualificationForm((current) => ({ ...current, registration_number: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Year obtained
                  <input value={qualificationForm.year_obtained} onChange={(event) => setQualificationForm((current) => ({ ...current, year_obtained: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400" placeholder="2024" />
                </label>
              </div>

              <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={qualificationForm.is_primary}
                  onChange={(event) => setQualificationForm((current) => ({ ...current, is_primary: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/[0.16] bg-slate-950 text-emerald-400"
                />
                Mark this as the primary qualification
              </label>

              <button
                onClick={() => void addQualification()}
                disabled={workingKey === 'qualification'}
                className="mt-5 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingKey === 'qualification' ? 'Saving qualification...' : 'Add qualification'}
              </button>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-orange-300/80">Emergency Contacts</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Primary contact readiness</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${summary?.emergency_contacts.has_primary ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-orange-500/30 bg-orange-500/15 text-orange-200'}`}>
                  {summary?.emergency_contacts.has_primary ? 'Primary captured' : 'Primary missing'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {contacts.length ? (
                  contacts.map((contact) => (
                    <div key={contact.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{contact.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{contact.relationship || 'Relationship not recorded'}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {[contact.phone_primary, contact.phone_alt, contact.address].filter(Boolean).join(' - ') || 'No supporting details yet'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {contact.is_primary ? <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Primary</span> : null}
                          <button
                            onClick={() => setDeleteContactTarget(contact)}
                            className="rounded-full border border-rose-500/30 px-2 py-1 text-[11px] font-semibold text-rose-200"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-4 text-sm text-slate-400">
                    No emergency contacts yet. Add at least one primary contact to clear readiness blockers.
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Contact name
                  <input value={emergencyContactForm.name} onChange={(event) => setEmergencyContactForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Relationship
                  <input value={emergencyContactForm.relationship} onChange={(event) => setEmergencyContactForm((current) => ({ ...current, relationship: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Primary phone
                  <input value={emergencyContactForm.phone_primary} onChange={(event) => setEmergencyContactForm((current) => ({ ...current, phone_primary: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Alternate phone
                  <input value={emergencyContactForm.phone_alt} onChange={(event) => setEmergencyContactForm((current) => ({ ...current, phone_alt: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-400" />
                </label>
              </div>

              <label className="mt-4 block text-sm text-slate-300">
                Address
                <textarea value={emergencyContactForm.address} onChange={(event) => setEmergencyContactForm((current) => ({ ...current, address: event.target.value }))} className="mt-2 h-24 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-400" />
              </label>

              <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={emergencyContactForm.is_primary}
                  onChange={(event) => setEmergencyContactForm((current) => ({ ...current, is_primary: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/[0.16] bg-slate-950 text-orange-400"
                />
                Mark this as the primary emergency contact
              </label>

              <button
                onClick={() => void addEmergencyContact()}
                disabled={workingKey === 'contact'}
                className="mt-5 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingKey === 'contact' ? 'Saving contact...' : 'Add emergency contact'}
              </button>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Biometric Linkage</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Clock-in identity bridge</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${summary?.biometric.is_linked ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-200'}`}>
                  {summary?.biometric.is_linked ? 'Linked' : 'Pending link'}
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Fingerprint ID
                  <input value={biometricForm.fingerprint_id} onChange={(event) => setBiometricForm((current) => ({ ...current, fingerprint_id: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Card number
                  <input value={biometricForm.card_no} onChange={(event) => setBiometricForm((current) => ({ ...current, card_no: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400" />
                </label>
                <label className="text-sm text-slate-300 md:col-span-2">
                  Dahua user ID
                  <input value={biometricForm.dahua_user_id} onChange={(event) => setBiometricForm((current) => ({ ...current, dahua_user_id: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400" />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">Current biometric status</p>
                <p className="mt-2">Registry ID: {summary?.biometric.registry_id ?? 'Not linked'}</p>
                <p className="mt-1">Enrolled: {summary?.biometric.enrolled_at ? new Date(summary.biometric.enrolled_at).toLocaleString() : 'Not yet enrolled'}</p>
              </div>

              <button
                onClick={() => void linkBiometric()}
                disabled={workingKey === 'biometric'}
                className="mt-5 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingKey === 'biometric' ? 'Linking biometric...' : 'Save biometric link'}
              </button>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/80">Provision Account</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Session 5 role and module baseline</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${canProvisionAccount ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200'}`}>
                  {canProvisionAccount ? 'Ready to provision' : 'Blocked by backend'}
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="text-sm text-slate-300">
                  Role to provision
                  <select
                    value={provisioningForm.role_name}
                    onChange={(event) => setProvisioningForm((current) => ({ ...current, role_name: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-fuchsia-400"
                  >
                    <option value="">Select Session 5 role baseline</option>
                    {STAFF_ROLE_OPTIONS.map((roleName) => (
                      <option key={roleName} value={roleName}>
                        {getRoleLabel(roleName)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  Login username override
                  <input
                    value={provisioningForm.username}
                    onChange={(event) => setProvisioningForm((current) => ({ ...current, username: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-fuchsia-400"
                    placeholder="Optional. Defaults to work email or staff ID."
                  />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={provisioningForm.send_welcome_email}
                    onChange={(event) => setProvisioningForm((current) => ({ ...current, send_welcome_email: event.target.checked }))}
                    className="h-4 w-4 rounded border-white/[0.16] bg-slate-950 text-fuchsia-400"
                  />
                  Send the welcome email after provisioning
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">Provisioning notes</p>
                <p className="mt-2">Selected role: {resolvedRoleName ? getRoleLabel(resolvedRoleName) : 'No role selected yet'}</p>
                <p className="mt-1">Linked account: {effectiveEmployee?.account_provisioned_at ? `Provisioned on ${new Date(effectiveEmployee.account_provisioned_at).toLocaleString()}` : 'No linked account yet'}</p>
              </div>

              {provisionedCredentials ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <p className="font-semibold">Temporary credentials</p>
                  <p className="mt-2">Username: {provisionedCredentials.username}</p>
                  <p className="mt-1">Temporary password: {provisionedCredentials.temporaryPassword}</p>
                  <p className="mt-1">Welcome email: {provisionedCredentials.welcomeEmailStatus}</p>
                  {provisionedCredentials.welcomeEmailFailureReason ? <p className="mt-1 text-amber-100">Email note: {provisionedCredentials.welcomeEmailFailureReason}</p> : null}
                </div>
              ) : null}

              <button
                onClick={() => void provisionAccount()}
                disabled={!canProvisionAccount || workingKey === 'provision'}
                className="mt-5 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingKey === 'provision' ? 'Provisioning account...' : 'Provision staff account'}
              </button>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Checklist</p>
                <h2 className="mt-2 text-xl font-display font-semibold text-white">Add onboarding task</h2>
                <p className="mt-2 text-sm text-slate-400">The legacy task contract stays intact as one panel inside the new onboarding workspace.</p>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="text-sm text-slate-300">
                  Task
                  <input value={taskForm.task} onChange={(event) => setTaskForm((current) => ({ ...current, task: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Due date
                  <input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm((current) => ({ ...current, due_date: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-400" />
                </label>
                <label className="text-sm text-slate-300">
                  Status
                  <select value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value as OnboardingTask['status'] }))} className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-400">
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  Notes
                  <textarea value={taskForm.notes} onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))} className="mt-2 h-24 w-full rounded-2xl border border-white/[0.1] bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-400" />
                </label>
              </div>

              <button
                onClick={() => void createTask()}
                disabled={workingKey === 'task'}
                className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingKey === 'task' ? 'Creating task...' : 'Create onboarding task'}
              </button>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Legacy Tasks</p>
                  <h2 className="mt-2 text-xl font-display font-semibold text-white">Onboarding checklist table</h2>
                </div>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-slate-300">
                  {summary?.task_summary.completed ?? 0} completed / {summary?.task_summary.total ?? tasks.length}
                </span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Task</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Due</th>
                      <th className="px-3 py-3">Assigned</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-t border-white/[0.08]">
                        <td className="px-3 py-3 align-top">
                          <p className="font-medium text-slate-100">{task.task}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{task.task_code || 'manual.task'}</p>
                        </td>
                        <td className="px-3 py-3 align-top text-slate-300">
                          <div>{task.status}</div>
                          {task.blocks_account_provisioning ? <div className="mt-1 text-xs text-amber-300">Blocks provisioning</div> : null}
                        </td>
                        <td className="px-3 py-3 align-top text-slate-300">{task.due_date || '-'}</td>
                        <td className="px-3 py-3 align-top text-slate-300">{task.assigned_to_name || '-'}</td>
                        <td className="px-3 py-3 align-top">
                          <button
                            onClick={() => void completeTask(task.id)}
                            disabled={task.status === 'Completed' || workingKey === `task-${task.id}`}
                            className="rounded-xl border border-white/[0.12] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {task.status === 'Completed' ? 'Completed' : workingKey === `task-${task.id}` ? 'Completing...' : 'Mark complete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && tasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-400">
                          No onboarding tasks are recorded for this employee yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteQualificationTarget)}
        title="Archive qualification?"
        description={deleteQualificationTarget ? `This will hide ${deleteQualificationTarget.title} from the active onboarding summary.` : ''}
        confirmLabel="Archive qualification"
        cancelLabel="Cancel"
        variant="danger"
        error={deleteError}
        isProcessing={workingKey === 'delete-qualification'}
        onConfirm={() => void archiveQualification()}
        onCancel={() => {
          setDeleteQualificationTarget(null)
          setDeleteError(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteContactTarget)}
        title="Archive contact?"
        description={deleteContactTarget ? `This will remove ${deleteContactTarget.name} from active emergency-contact readiness.` : ''}
        confirmLabel="Archive contact"
        cancelLabel="Cancel"
        variant="danger"
        error={deleteError}
        isProcessing={workingKey === 'delete-contact'}
        onConfirm={() => void archiveEmergencyContact()}
        onCancel={() => {
          setDeleteContactTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
