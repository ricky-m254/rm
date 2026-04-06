import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { resolveApiBaseUrl } from '../../api/baseUrl'
import { normalizePaginatedResponse } from '../../api/pagination'
import { buildPrintDocument, openPrintWindow, type TenantPrintMeta } from '../../utils/printTemplate'
import { downloadBlob, extractFilename } from '../../utils/download'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHero from '../../components/PageHero'

const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = resolveApiBaseUrl().replace(/\/$/, '').replace(/\/api$/, '')
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

const tabs = [
  'Personal',
  'Guardians',
  'Enrollment',
  'Academics',
  'Attendance',
  'Behavior',
  'Medical',
  'Documents',
]

type Guardian = {
  id: number
  name: string
  relationship?: string
  phone?: string
  email?: string
  is_active?: boolean
}

type StudentDetail = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  date_of_birth?: string
  gender?: string
  phone?: string
  email?: string
  address?: string
  is_active?: boolean
  photo?: string | null
  uploaded_documents?: Array<{ id: number; name: string; url: string }>
  guardians?: Guardian[]
}

type Enrollment = {
  id: number
  student: number
  school_class?: number
  class_name?: string
  term?: number
  term_name?: string
  enrollment_date?: string
}

type AttendanceSummary = {
  attendance_rate?: number
  present?: number
  absent?: number
  late?: number
  period_label?: string
}

type AttendanceRecord = {
  id: number
  date: string
  status: string
  notes?: string
}

type BehaviorIncident = {
  id: number
  incident_type: string
  category: string
  incident_date: string
  severity?: string
}

type AcademicRecord = {
  id: number
  subject: string
  score?: number
  grade?: string
  term?: string
}

type MedicalRecord = {
  id: number
  student: number
  blood_type?: string
  allergies?: string
  chronic_conditions?: string
  current_medications?: string
  doctor_name?: string
  doctor_phone?: string
  notes?: string
  last_visit?: string | null
}

type ClinicVisit = {
  id: number
  visit_date: string
  complaint?: string
  treatment?: string
  severity?: string
  parent_notified?: boolean
}

type StudentOperationalSummary = {
  attendance: {
    summary: AttendanceSummary
    records: AttendanceRecord[]
  }
  behavior: BehaviorIncident[]
  academics: AcademicRecord[]
  medical: {
    record: MedicalRecord | null
    visits: ClinicVisit[]
  }
}

type StudentReport = {
  student: {
    id: number
    admission_number: string
    first_name: string
    last_name: string
    gender?: string | null
    date_of_birth?: string | null
    photo?: string | null
  }
  guardians: Array<{
    id: number
    name: string
    relationship: string
    phone?: string | null
    email?: string | null
  }>
  enrollment: {
    class_id?: number | null
    term_id?: number | null
    enrollment_date?: string | null
  }
  attendance: {
    attendance_rate: number
    present: number
    absent: number
    late: number
  }
  behavior: Array<{
    incident_type: string
    category: string
    incident_date: string
    severity?: string | null
    description?: string | null
  }>
  medical: {
    record?: {
      blood_type?: string | null
      allergies?: string | null
      chronic_conditions?: string | null
      current_medications?: string | null
      doctor_name?: string | null
      doctor_phone?: string | null
    } | null
    visits?: Array<{
      visit_date: string
      complaint?: string | null
      treatment?: string | null
      severity?: string | null
      parent_notified?: boolean | null
    }>
  }
  documents: Array<{
    id: number
    name: string
    url: string
    uploaded_at?: string | null
  }>
}

type SchoolProfileResponse = {
  tenant?: {
    name?: string | null
    schema?: string | null
  } | null
  profile?: {
    school_name?: string | null
    address?: string | null
    phone?: string | null
    logo_url?: string | null
  } | null
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState('Personal')
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [behaviorIncidents, setBehaviorIncidents] = useState<BehaviorIncident[]>([])
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([])
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null)
  const [clinicVisits, setClinicVisits] = useState<ClinicVisit[]>([])
  const [dataNotice, setDataNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const [tenantMeta, setTenantMeta] = useState<TenantPrintMeta | null>(null)
  const [printError, setPrintError] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const [deleteDocTarget, setDeleteDocTarget] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  const [resettingLogin, setResettingLogin] = useState(false)
  const [loginResetMsg, setLoginResetMsg] = useState<string | null>(null)
  const [loginResetError, setLoginResetError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let isMounted = true
    const loadProfile = async () => {
      try {
        const [studentRes, enrollmentRes] = await Promise.all([
          apiClient.get<StudentDetail>(`/students/${id}/`),
          apiClient.get<Enrollment[] | { results: Enrollment[]; count: number }>(
            '/enrollments/',
            { params: { student: id } },
          ),
        ])
        if (!isMounted) return
        setStudent(studentRes.data)
        const enrollmentItems = normalizePaginatedResponse(enrollmentRes.data).items
        setEnrollments(enrollmentItems.filter((entry) => String(entry.student) === String(id)))
        setDataNotice(null)
      } catch (err) {
        if (!isMounted) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          setError('Session expired. Please log in again.')
        } else if (status === 403) {
          setError('Access denied. Ensure this user has the STUDENTS module and proper role.')
        } else if (status === 404) {
          setError('Student record not found.')
        } else {
          setError('Unable to load student profile.')
        }
        setStudent(null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    let isMounted = true
    const loadProfileMeta = async () => {
      try {
        const profileRes = await apiClient.get<SchoolProfileResponse>('/school/profile/')
        if (!isMounted) return
        const payload = profileRes.data
        const name = payload.profile?.school_name ?? payload.tenant?.name ?? payload.tenant?.schema ?? undefined
        setTenantMeta({
          name,
          address: payload.profile?.address,
          phone: payload.profile?.phone,
          logoUrl: payload.profile?.logo_url ?? undefined,
          schema: payload.tenant?.schema,
        })
      } catch {
        const fallbackTenant = localStorage.getItem('sms_tenant_id')
        if (!isMounted) return
        setTenantMeta(fallbackTenant ? { name: fallbackTenant, schema: fallbackTenant } : null)
      }
    }
    loadProfileMeta()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let isMounted = true
    const loadStudentOperationalData = async () => {
      try {
        const response = await apiClient.get<StudentOperationalSummary>(`/students/${id}/operational-summary/`)
        if (isMounted) {
          setAttendanceSummary(response.data.attendance?.summary ?? null)
          setAttendanceRecords(response.data.attendance?.records ?? [])
          setBehaviorIncidents(response.data.behavior ?? [])
          setAcademicRecords(response.data.academics ?? [])
          setMedicalRecord(response.data.medical?.record ?? null)
          setClinicVisits(response.data.medical?.visits ?? [])
          setDataNotice(null)
        }
      } catch {
        if (isMounted) {
          setAttendanceSummary(null)
          setAttendanceRecords([])
          setBehaviorIncidents([])
          setAcademicRecords([])
          setMedicalRecord(null)
          setClinicVisits([])
          setDataNotice('Operational student data unavailable.')
        }
      }
    }
    loadStudentOperationalData()
    return () => {
      isMounted = false
    }
  }, [id])

  const activeEnrollment = useMemo(() => {
    if (enrollments.length === 0) return null
    return enrollments[0]
  }, [enrollments])

  const handlePhotoUpload = async (file: File) => {
    if (!id) return
    setUploadingPhoto(true)
    setDocError(null)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await apiClient.post<{ photo: string }>(`/students/${id}/photo/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStudent((prev) => (prev ? { ...prev, photo: res.data.photo } : prev))
    } catch {
      setDocError('Unable to upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDocumentsUpload = async (files: FileList | null) => {
    if (!id || !files || files.length === 0) return
    setUploadingDocs(true)
    setDocError(null)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('documents', file))
      const res = await apiClient.post<{ documents: Array<{ id: number; name: string; url: string }> }>(
        `/students/${id}/documents/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              uploaded_documents: [
                ...(prev.uploaded_documents ?? []),
                ...res.data.documents,
              ],
            }
          : prev,
      )
    } catch {
      setDocError('Unable to upload documents.')
    } finally {
      setUploadingDocs(false)
    }
  }

  const handleDocumentDelete = async () => {
    if (!id || !deleteDocTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    setDocError(null)
    try {
      await apiClient.delete(`/students/${id}/documents/${deleteDocTarget}/`)
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              uploaded_documents: (prev.uploaded_documents ?? []).filter((doc) => doc.id !== deleteDocTarget),
            }
          : prev,
      )
      setDeleteDocTarget(null)
    } catch {
      setDeleteError('Unable to delete document.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '--'
    return String(value)
  }

  const handleDownloadStudentReport = async (format: 'csv' | 'pdf') => {
    if (!id) return
    setPrintError(null)
    setIsDownloading(true)
    try {
      const response = await apiClient.get(`/students/${id}/report/export/${format}/`, {
        responseType: 'blob',
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName = format === 'csv' ? `student_report_${id}.csv` : `student_report_${id}.pdf`
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setPrintError(`Unable to download ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadOperationalReport = async (scope: 'attendance' | 'behavior', format: 'csv' | 'pdf') => {
    if (!id) return
    setPrintError(null)
    setIsDownloading(true)
    try {
      const endpoint =
        scope === 'attendance' ? `/attendance/records/export/${format}/` : `/behavior/incidents/export/${format}/`
      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
        params: { student: id },
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName =
        scope === 'attendance'
          ? format === 'csv'
            ? `student_${id}_attendance.csv`
            : `student_${id}_attendance.pdf`
          : format === 'csv'
            ? `student_${id}_behavior.csv`
            : `student_${id}_behavior.pdf`
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      const area = scope === 'attendance' ? 'attendance' : 'behavior'
      setPrintError(`Unable to download ${area} ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const openEditProfile = () => {
    if (!student) return
    setProfileForm({
      first_name:    student.first_name    ?? '',
      last_name:     student.last_name     ?? '',
      date_of_birth: student.date_of_birth ?? '',
      gender:        student.gender        ?? '',
      phone:         student.phone         ?? '',
      email:         student.email         ?? '',
      address:       student.address       ?? '',
    })
    setProfileError(null)
    setProfileSuccess(null)
    setEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    if (!id) return
    setSavingProfile(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      const res = await apiClient.patch<StudentDetail>(`/students/${id}/`, {
        first_name:    profileForm.first_name.trim(),
        last_name:     profileForm.last_name.trim(),
        date_of_birth: profileForm.date_of_birth || undefined,
        gender:        profileForm.gender || undefined,
        phone:         profileForm.phone.trim() || undefined,
        email:         profileForm.email.trim() || undefined,
        address:       profileForm.address.trim() || undefined,
      })
      setStudent(prev => prev ? { ...prev, ...res.data } : res.data)
      setProfileSuccess('Profile updated successfully.')
      setEditingProfile(false)
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
      const msg = data ? Object.values(data).flat().join(' ') : 'Unable to save profile.'
      setProfileError(msg)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResetLogin = async () => {
    if (!id || !student) return
    const adm = student.admission_number
    if (!confirm(`Reset login for ${student.first_name} ${student.last_name}?\n\nThis will create a portal account (or reset the password) with:\n  Username: ${adm}\n  Password: student123\n\nProceed?`)) return
    setResettingLogin(true)
    setLoginResetMsg(null)
    setLoginResetError(null)
    try {
      await apiClient.post(`/students/${id}/create-login/`, { password: 'student123' })
      setLoginResetMsg(`Login ready. Username: ${adm} · Password: student123`)
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data
      setLoginResetError(data?.detail ?? 'Failed to reset login. Please try again.')
    } finally {
      setResettingLogin(false)
    }
  }

  const handlePrintStudentReport = async () => {
    if (!id) return
    setPrintError(null)
    setIsPrinting(true)
    try {
      const response = await apiClient.get<StudentReport>(`/students/${id}/report/`)
      const report = response.data
      const html = `
        <h2>Student Overview</h2>
        <div class="card">
          <p>Name: ${report.student.first_name} ${report.student.last_name}</p>
          <p>Admission #: ${formatValue(report.student.admission_number)}</p>
          <p>Gender: ${formatValue(report.student.gender)}</p>
          <p>Date of Birth: ${formatValue(report.student.date_of_birth)}</p>
        </div>
        <div class="divider"></div>
        <h2>Guardians</h2>
        ${
          report.guardians.length > 0
            ? `<table><thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th></tr></thead><tbody>${report.guardians
                .map(
                  (guardian) =>
                    `<tr><td>${guardian.name}</td><td>${guardian.relationship}</td><td>${formatValue(
                      guardian.phone,
                    )}</td><td>${formatValue(guardian.email)}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : '<p class="muted">No guardians recorded.</p>'
        }
        <div class="divider"></div>
        <h2>Enrollment</h2>
        <div class="card">
          <p>Class ID: ${formatValue(report.enrollment.class_id)}</p>
          <p>Term ID: ${formatValue(report.enrollment.term_id)}</p>
          <p>Enrollment Date: ${formatValue(report.enrollment.enrollment_date)}</p>
        </div>
        <div class="divider"></div>
        <h2>Attendance</h2>
        <div class="card">
          <p>Attendance Rate: ${report.attendance.attendance_rate}%</p>
          <p>Present: ${report.attendance.present}</p>
          <p>Absent: ${report.attendance.absent}</p>
          <p>Late: ${report.attendance.late}</p>
        </div>
        <div class="divider"></div>
        <h2>Behavior (Latest)</h2>
        ${
          report.behavior.length > 0
            ? `<table><thead><tr><th>Type</th><th>Category</th><th>Date</th><th>Severity</th><th>Notes</th></tr></thead><tbody>${report.behavior
                .map(
                  (incident) =>
                    `<tr><td>${incident.incident_type}</td><td>${incident.category}</td><td>${incident.incident_date}</td><td>${formatValue(
                      incident.severity,
                    )}</td><td>${formatValue(incident.description)}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : '<p class="muted">No behavior incidents.</p>'
        }
        <div class="divider"></div>
        <h2>Medical</h2>
        <div class="card">
          <p>Blood Type: ${formatValue(report.medical.record?.blood_type)}</p>
          <p>Allergies: ${formatValue(report.medical.record?.allergies)}</p>
          <p>Chronic Conditions: ${formatValue(report.medical.record?.chronic_conditions)}</p>
          <p>Current Medications: ${formatValue(report.medical.record?.current_medications)}</p>
          <p>Doctor: ${formatValue(report.medical.record?.doctor_name)}</p>
          <p>Doctor Phone: ${formatValue(report.medical.record?.doctor_phone)}</p>
        </div>
        <h3>Recent Clinic Visits</h3>
        ${
          (report.medical.visits ?? []).length > 0
            ? `<table><thead><tr><th>Date</th><th>Complaint</th><th>Treatment</th><th>Severity</th><th>Parent Notified</th></tr></thead><tbody>${(
                report.medical.visits ?? []
              )
                .map(
                  (visit) =>
                    `<tr><td>${visit.visit_date}</td><td>${formatValue(visit.complaint)}</td><td>${formatValue(
                      visit.treatment,
                    )}</td><td>${formatValue(visit.severity)}</td><td>${visit.parent_notified ? 'Yes' : 'No'}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : '<p class="muted">No clinic visits recorded.</p>'
        }
        <div class="divider"></div>
        <h2>Documents</h2>
        ${
          report.documents.length > 0
            ? `<table><thead><tr><th>Name</th><th>Uploaded At</th></tr></thead><tbody>${report.documents
                .map((doc) => `<tr><td>${doc.name}</td><td>${formatValue(doc.uploaded_at)}</td></tr>`)
                .join('')}</tbody></table>`
            : '<p class="muted">No documents uploaded.</p>'
        }
      `
      const documentHtml = buildPrintDocument({
        title: `Student Report - ${report.student.first_name} ${report.student.last_name}`,
        header: {
          badge: 'Student Report',
          title: `${report.student.first_name} ${report.student.last_name}`,
          subtitle: `Admission #: ${formatValue(report.student.admission_number)}`,
          generatedAt: new Date().toLocaleString(),
          tenant: tenantMeta ?? undefined,
        },
        bodyHtml: html,
      })
      openPrintWindow(`Student Report - ${report.student.first_name} ${report.student.last_name}`, documentHtml)
    } catch {
      setPrintError('Unable to print student report.')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Student Profile"
        subtitle={`Profile ID: ${id ?? '--'}`}
        icon="📋"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading student profile...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}
      {printError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <p className="text-sm text-rose-300">{printError}</p>
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-[240px]">
            <h2 className="text-lg font-display font-semibold">
              {student ? `${student.first_name} ${student.last_name}`.trim() : '--'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {student?.admission_number ?? '--'} - {activeEnrollment?.class_name ?? '--'} -{' '}
              {student?.is_active ? 'Active' : 'Inactive'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/[0.09] px-3 py-1">
                DOB: {student?.date_of_birth ?? '--'}
              </span>
              <span className="rounded-full border border-white/[0.09] px-3 py-1">
                Gender: {student?.gender ?? '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
              onClick={handlePrintStudentReport}
              disabled={isPrinting || isDownloading}
            >
              {isPrinting ? 'Preparing...' : 'Print report'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-70"
              onClick={() => handleDownloadStudentReport('csv')}
              disabled={isDownloading || isPrinting}
            >
              {isDownloading ? 'Working...' : 'Download CSV'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200 disabled:opacity-70"
              onClick={() => handleDownloadStudentReport('pdf')}
              disabled={isDownloading || isPrinting}
            >
              {isDownloading ? 'Working...' : 'Download PDF'}
            </button>
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-950">
              {student?.photo ? (
                <img src={resolveMediaUrl(student.photo)} alt="Student" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">
                  No photo
                </div>
              )}
            </div>
            <label className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200">
              {uploadingPhoto ? 'Uploading...' : 'Replace photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handlePhotoUpload(file)
                  event.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        </div>

        {!student ? (
          <p className="mt-3 text-xs text-amber-200">
            Student record unavailable. Verify the backend and permissions.
          </p>
        ) : null}
        {dataNotice ? (
          <p className="mt-2 text-xs text-amber-200">{dataNotice}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`rounded-xl px-3 py-1 text-xs ${
                activeTab === tab
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'border border-white/[0.07] text-slate-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {profileSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
            {profileSuccess}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-slate-950/60 p-4 text-sm text-slate-300">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-xs uppercase text-slate-400">{activeTab}</p>
            {activeTab === 'Personal' && student && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetLogin}
                  disabled={resettingLogin}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
                >
                  {resettingLogin ? '…' : '🔑 Reset Login'}
                </button>
                <button
                  onClick={openEditProfile}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
          {activeTab === 'Personal' && loginResetMsg && (
            <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200 font-mono">
              {loginResetMsg}
            </div>
          )}
          {activeTab === 'Personal' && loginResetError && (
            <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
              {loginResetError}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {activeTab === 'Personal' ? (
              <>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">First Name</p>
                  <p className="font-medium text-white">{student?.first_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Last Name</p>
                  <p className="font-medium text-white">{student?.last_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Admission #</p>
                  <p className="font-mono">{student?.admission_number ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Gender</p>
                  <p>{student?.gender === 'M' ? 'Male' : student?.gender === 'F' ? 'Female' : student?.gender ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Date of Birth</p>
                  <p>{student?.date_of_birth ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Status</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${student?.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${student?.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {student?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Phone</p>
                  <p>{student?.phone || '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Email</p>
                  <p className="truncate">{student?.email || '--'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase text-slate-400">Address</p>
                  <p className="text-sm text-white whitespace-pre-line">{student?.address || '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Current Class</p>
                  <p>{activeEnrollment?.class_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Current Term</p>
                  <p>{activeEnrollment?.term_name ?? '--'}</p>
                </div>
              </>
            ) : null}

            {activeTab === 'Guardians' ? (
              <div className="col-span-2 space-y-2">
                {(student?.guardians ?? []).map((guardian) => (
                  <div key={guardian.id} className="rounded-xl border border-white/[0.07] p-3 text-xs">
                    <p className="text-sm text-white">{guardian.name}</p>
                    <p className="text-[11px] text-slate-400">{guardian.relationship}</p>
                    <p className="text-[11px] text-slate-400">
                      {guardian.phone} | {guardian.email}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === 'Enrollment' ? (
              <div className="col-span-2 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Class</p>
                  <p>{activeEnrollment?.class_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Term</p>
                  <p>{activeEnrollment?.term_name ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Enrollment Date</p>
                  <p>{activeEnrollment?.enrollment_date ?? '--'}</p>
                </div>
              </div>
            ) : null}

            {activeTab === 'Attendance' ? (
              <div className="col-span-2 grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('attendance', 'csv')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Attendance CSV'}
                  </button>
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('attendance', 'pdf')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Attendance PDF'}
                  </button>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Attendance rate</p>
                  <p>{attendanceSummary?.attendance_rate ?? '--'}%</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Period</p>
                  <p>{attendanceSummary?.period_label ?? 'Last 30 days'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Present</p>
                  <p>{attendanceSummary?.present ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Absent</p>
                  <p>{attendanceSummary?.absent ?? '--'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-400">Late</p>
                  <p>{attendanceSummary?.late ?? '--'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[11px] uppercase text-slate-400">Recent records</p>
                  <div className="mt-2 space-y-2 text-xs">
                    {attendanceRecords.length > 0 ? (
                      attendanceRecords.map((record) => (
                        <div key={record.id} className="rounded-lg border border-white/[0.07] p-2">
                          {record.date} - {record.status}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">No attendance records.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'Behavior' ? (
              <div className="col-span-2 space-y-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('behavior', 'csv')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Behavior CSV'}
                  </button>
                  <button
                    className="rounded-xl border border-white/[0.09] px-3 py-1 text-xs text-slate-200 disabled:opacity-70"
                    onClick={() => handleDownloadOperationalReport('behavior', 'pdf')}
                    disabled={isDownloading || isPrinting}
                  >
                    {isDownloading ? 'Working...' : 'Export Behavior PDF'}
                  </button>
                </div>
                {behaviorIncidents.length > 0 ? (
                  behaviorIncidents.map((incident) => (
                    <div key={incident.id} className="rounded-lg border border-white/[0.07] p-2 text-xs">
                      <p className="text-sm text-white">
                        {incident.incident_type}: {incident.category}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {incident.incident_date} - {incident.severity ?? '--'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No behavior incidents.</p>
                )}
              </div>
            ) : null}

            {activeTab === 'Academics' ? (
              <div className="col-span-2 space-y-2">
                {academicRecords.length > 0 ? (
                  academicRecords.map((record) => (
                    <div key={record.id} className="rounded-lg border border-white/[0.07] p-2 text-xs">
                      <p className="text-sm text-white">{record.subject}</p>
                      <p className="text-[11px] text-slate-400">
                        Score: {record.score ?? '--'} | Grade: {record.grade ?? '--'} | Term:{' '}
                        {record.term ?? '--'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No academic records.</p>
                )}
              </div>
            ) : null}

            {activeTab === 'Medical' ? (
              <div className="col-span-2 space-y-3">
                <div className="rounded-xl border border-white/[0.07] p-4 text-xs">
                  <p className="text-xs uppercase text-slate-400">Medical profile</p>
                  {medicalRecord ? (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Blood type</p>
                        <p>{medicalRecord.blood_type ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Last visit</p>
                        <p>{medicalRecord.last_visit ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Allergies</p>
                        <p>{medicalRecord.allergies || '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Conditions</p>
                        <p>{medicalRecord.chronic_conditions || '--'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[11px] uppercase text-slate-400">Medications</p>
                        <p>{medicalRecord.current_medications || '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Doctor</p>
                        <p>{medicalRecord.doctor_name || '--'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">Doctor phone</p>
                        <p>{medicalRecord.doctor_phone || '--'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[11px] uppercase text-slate-400">Notes</p>
                        <p>{medicalRecord.notes || '--'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No medical profile on record.</p>
                  )}
                </div>

                <div className="rounded-xl border border-white/[0.07] p-4 text-xs">
                  <p className="text-xs uppercase text-slate-400">Recent clinic visits</p>
                  <div className="mt-2 space-y-2">
                    {clinicVisits.length > 0 ? (
                      clinicVisits.map((visit) => (
                        <div key={visit.id} className="rounded-lg border border-white/[0.07] p-2">
                          <p className="text-sm text-white">{visit.visit_date}</p>
                          <p className="text-[11px] text-slate-400">
                            {visit.complaint || 'No complaint'} - {visit.severity || 'Unspecified'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Parent notified: {visit.parent_notified ? 'Yes' : 'No'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No clinic visits logged.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'Documents' ? (
              <div className="col-span-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">Upload student documents</p>
                  <label className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200">
                    {uploadingDocs ? 'Uploading...' : 'Add documents'}
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      disabled={uploadingDocs}
                      onChange={(event) => {
                        void handleDocumentsUpload(event.target.files)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                </div>
                {docError ? <p className="text-xs text-rose-300">{docError}</p> : null}
                {(student?.uploaded_documents ?? []).length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {(student?.uploaded_documents ?? []).map((doc) => (
                      <div key={doc.id} className="rounded-xl border border-white/[0.07] p-3 text-xs">
                        <p className="text-sm text-white">{doc.name}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <a
                            className="text-xs text-emerald-200 underline"
                            href={resolveMediaUrl(doc.url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                          <button
                            className="text-xs text-rose-200"
                            onClick={() => setDeleteDocTarget(doc.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No documents uploaded.</p>
                )}
              </div>
            ) : null}

          </div>
        </div>
      </section>

      {/* ── Edit Profile Modal ── */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-white">Edit Student Profile</h2>
              <button
                onClick={() => setEditingProfile(false)}
                className="text-slate-500 hover:text-slate-300 transition text-xl leading-none"
              >×</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">First Name</label>
                <input
                  value={profileForm.first_name}
                  onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                  placeholder="First name"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Last Name</label>
                <input
                  value={profileForm.last_name}
                  onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                  placeholder="Last name"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                <input
                  type="date"
                  value={profileForm.date_of_birth}
                  onChange={e => setProfileForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                >
                  <option value="">Select…</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                  placeholder="+254 7XX XXX XXX"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                  placeholder="student@school.ac.ke"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Address</label>
                <textarea
                  value={profileForm.address}
                  onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-white/[0.09] bg-[#0d1421] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Home address…"
                />
              </div>
            </div>

            {profileError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {profileError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile || !profileForm.first_name.trim() || !profileForm.last_name.trim()}
                className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="flex-1 rounded-xl border border-white/[0.09] py-2 text-sm text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteDocTarget !== null}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={handleDocumentDelete}
        onCancel={() => {
          setDeleteDocTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}



