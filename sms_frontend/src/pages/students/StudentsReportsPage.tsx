import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { buildPrintDocument, openPrintWindow, type TenantPrintMeta } from '../../utils/printTemplate'
import { downloadBlob, extractFilename } from '../../utils/download'

type StudentsSummary = {
  students_active?: number
  enrollments_active?: number
}

type ModuleReport = {
  students_active: number
  enrollments_active: number
  demographics: Record<string, number>
  attendance: {
    attendance_rate: number
    present: number
    absent: number
    late: number
  }
  behavior: Record<string, number>
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

type AdmissionsSummary = {
  counts?: Record<string, number>
}

type AttendanceSummary = {
  attendance_rate?: number
  present?: number
  absent?: number
  late?: number
}

type BehaviorIncident = {
  id: number
  incident_type: string
  category: string
  incident_date: string
}

type Student = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  gender?: string
  date_of_birth?: string
  is_active?: boolean
}

const isNetworkError = (err: unknown) => !(err as { response?: unknown })?.response
const getStatus = (err: unknown) => (err as { response?: { status?: number } })?.response?.status

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

export default function StudentsReportsPage() {
  const [summary, setSummary] = useState<StudentsSummary | null>(null)
  const [admissionsSummary, setAdmissionsSummary] = useState<AdmissionsSummary | null>(null)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null)
  const [behaviorIncidents, setBehaviorIncidents] = useState<BehaviorIncident[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [tenantMeta, setTenantMeta] = useState<TenantPrintMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadReports = async () => {
      setIsLoading(true)
      setError(null)
      const failures: string[] = []

      const [summaryRes, admissionsRes, attendanceRes, behaviorRes, studentsRes, profileRes] = await Promise.allSettled([
        apiClient.get<StudentsSummary>('/students/summary/'),
        apiClient.get<AdmissionsSummary>('/admissions/summary/'),
        apiClient.get<AttendanceSummary>('/attendance/summary/'),
        apiClient.get<BehaviorIncident[] | { results: BehaviorIncident[]; count: number }>('/behavior/incidents/', {
          params: { page_size: 50 },
        }),
        apiClient.get<Student[] | { results: Student[]; count: number }>('/students/', {
          params: { page_size: 200 },
        }),
        apiClient.get<SchoolProfileResponse>('/school/profile/'),
      ])

      if (!isMounted) return

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data)
      } else {
        setSummary(null)
        failures.push('students summary')
      }

      if (admissionsRes.status === 'fulfilled') {
        setAdmissionsSummary(admissionsRes.value.data)
      } else {
        setAdmissionsSummary(null)
        failures.push('admissions summary')
      }

      if (attendanceRes.status === 'fulfilled') {
        setAttendanceSummary(attendanceRes.value.data)
      } else {
        setAttendanceSummary(null)
        failures.push('attendance summary')
      }

      if (behaviorRes.status === 'fulfilled') {
        setBehaviorIncidents(normalizePaginatedResponse(behaviorRes.value.data).items)
      } else {
        setBehaviorIncidents([])
        failures.push('behavior incidents')
      }

      if (studentsRes.status === 'fulfilled') {
        setStudents(normalizePaginatedResponse(studentsRes.value.data).items)
      } else {
        setStudents([])
        const status = getStatus(studentsRes.reason)
        failures.push(
          isNetworkError(studentsRes.reason)
            ? 'students directory (network)'
            : `students directory${status ? ` (${status})` : ''}`,
        )
      }

      if (profileRes.status === 'fulfilled') {
        const payload = profileRes.value.data
        const name = payload.profile?.school_name ?? payload.tenant?.name ?? payload.tenant?.schema ?? undefined
        setTenantMeta({
          name,
          address: payload.profile?.address,
          phone: payload.profile?.phone,
          logoUrl: payload.profile?.logo_url ?? undefined,
          schema: payload.tenant?.schema,
        })
      } else {
        const fallbackTenant = localStorage.getItem('sms_tenant_id')
        setTenantMeta(fallbackTenant ? { name: fallbackTenant, schema: fallbackTenant } : null)
        failures.push('school profile')
      }

      setError(failures.length > 0 ? `Some report sources failed: ${failures.join(', ')}.` : null)
      setIsLoading(false)
    }

    loadReports()
    return () => {
      isMounted = false
    }
  }, [])

  const demographics = useMemo(() => {
    const genderCounts = students.reduce<Record<string, number>>((acc, student) => {
      const key = student.gender ?? 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return genderCounts
  }, [students])

  const enrollmentTotals = useMemo(() => {
    return {
      active_students: summary?.students_active ?? students.length,
      active_enrollments: summary?.enrollments_active ?? '--',
    }
  }, [summary, students.length])

  const attendanceTotals = useMemo(() => {
    return {
      rate: attendanceSummary?.attendance_rate ?? 0,
      present: attendanceSummary?.present ?? 0,
      absent: attendanceSummary?.absent ?? 0,
      late: attendanceSummary?.late ?? 0,
    }
  }, [attendanceSummary])

  const behaviorTotals = useMemo(() => {
    const positive = behaviorIncidents.filter((item) => item.incident_type === 'Positive').length
    const negative = behaviorIncidents.filter((item) => item.incident_type === 'Negative').length
    return { positive, negative }
  }, [behaviorIncidents])

  const admissionsCounts = admissionsSummary?.counts ?? {}

  const handleDownloadModule = async (format: 'csv' | 'pdf') => {
    setIsDownloading(true)
    setPrintError(null)
    try {
      const response = await apiClient.get(`/students/reports/summary/export/${format}/`, {
        responseType: 'blob',
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName = format === 'csv' ? 'students_module_report.csv' : 'students_module_report.pdf'
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setPrintError(`Unable to download module ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadStudent = async (format: 'csv' | 'pdf') => {
    if (!selectedStudentId) {
      setPrintError('Select a student first.')
      return
    }
    setIsDownloading(true)
    setPrintError(null)
    try {
      const response = await apiClient.get(`/students/${selectedStudentId}/report/export/${format}/`, {
        responseType: 'blob',
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName =
        format === 'csv'
          ? `student_report_${selectedStudentId}.csv`
          : `student_report_${selectedStudentId}.pdf`
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setPrintError(`Unable to download student ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const formatValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '--'
    return String(value)
  }

  const handlePrintModuleReport = async () => {
    setIsPrinting(true)
    setPrintError(null)
    try {
      const response = await apiClient.get<ModuleReport>('/students/reports/summary/')
      const moduleReport = response.data
      const html = `
        <div class="grid">
      <PageHero
        badge="STUDENTS"
        badgeColor="sky"
        title="Student Reports"
        subtitle="Comprehensive academic and behavioral reports"
        icon="👩‍🎓"
      />
          <div class="card">
            <h3>Totals</h3>
            <p>Active Students: ${moduleReport.students_active}</p>
            <p>Active Enrollments: ${moduleReport.enrollments_active}</p>
          </div>
          <div class="card">
            <h3>Attendance</h3>
            <p>Attendance Rate: ${moduleReport.attendance.attendance_rate}%</p>
            <p>Present: ${moduleReport.attendance.present}</p>
            <p>Absent: ${moduleReport.attendance.absent}</p>
            <p>Late: ${moduleReport.attendance.late}</p>
          </div>
        </div>
        <div class="divider"></div>
        <h2>Admissions Pipeline</h2>
        ${
          Object.keys(admissionsCounts).length > 0
            ? `<table><thead><tr><th>Status</th><th>Total</th></tr></thead><tbody>${Object.entries(admissionsCounts)
                .map(([status, total]) => `<tr><td>${status}</td><td>${total}</td></tr>`)
                .join('')}</tbody></table>`
            : '<p class="muted">No admissions data available.</p>'
        }
        <div class="divider"></div>
        <h2>Demographics</h2>
        ${
          Object.keys(moduleReport.demographics).length > 0
            ? `<table><thead><tr><th>Gender</th><th>Total</th></tr></thead><tbody>${Object.entries(moduleReport.demographics)
                .map(([gender, total]) => `<tr><td>${gender}</td><td>${total}</td></tr>`)
                .join('')}</tbody></table>`
            : '<p class="muted">No demographic data available.</p>'
        }
        <div class="divider"></div>
        <h2>Behavior Summary</h2>
        ${
          Object.keys(moduleReport.behavior).length > 0
            ? `<table><thead><tr><th>Type</th><th>Total</th></tr></thead><tbody>${Object.entries(moduleReport.behavior)
                .map(([type, total]) => `<tr><td>${type}</td><td>${total}</td></tr>`)
                .join('')}</tbody></table>`
            : '<p class="muted">No behavior data available.</p>'
        }
      `
      const documentHtml = buildPrintDocument({
        title: 'Student Module Report',
        header: {
          badge: 'Students Module',
          title: 'Module Report',
          generatedAt: new Date().toLocaleString(),
          tenant: tenantMeta ?? undefined,
        },
        bodyHtml: html,
      })
      openPrintWindow('Student Module Report', documentHtml)
    } catch {
      setPrintError('Unable to print module report.')
    } finally {
      setIsPrinting(false)
    }
  }

  const handlePrintStudentReport = async () => {
    if (!selectedStudentId) {
      setPrintError('Select a student first.')
      return
    }
    setIsPrinting(true)
    setPrintError(null)
    try {
      const response = await apiClient.get<StudentReport>(`/students/${selectedStudentId}/report/`)
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
      setIsPrintModalOpen(false)
      setSelectedStudentId('')
    } catch {
      setPrintError('Unable to print student report.')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Students</p>
            <h1 className="mt-2 text-2xl font-display font-semibold">Reports</h1>
            <p className="mt-2 text-sm text-slate-400">
              Live snapshots from admissions, attendance, and behavior endpoints.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownloadModule('csv')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download Module CSV'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownloadModule('pdf')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download Module PDF'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
              onClick={() => setIsPrintModalOpen(true)}
            >
              Print Student Report
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
              onClick={handlePrintModuleReport}
              disabled={isPrinting}
            >
              {isPrinting ? 'Preparing...' : 'Print Module Report'}
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading report data...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          {error}
        </div>
      ) : null}

      {printError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {printError}
        </div>
      ) : null}

      <section className="col-span-12 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Active Students</p>
          <p className="mt-2 text-2xl font-semibold">{enrollmentTotals.active_students}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Active Enrollments</p>
          <p className="mt-2 text-2xl font-semibold">{enrollmentTotals.active_enrollments}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Attendance Rate</p>
          <p className="mt-2 text-2xl font-semibold">{attendanceTotals.rate}%</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <p className="text-xs uppercase text-slate-400">Behavior Incidents</p>
          <p className="mt-2 text-2xl font-semibold">
            {behaviorTotals.negative + behaviorTotals.positive}
          </p>
        </div>
      </section>

      <section className="col-span-12 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl glass-panel p-5">
          <h2 className="text-base font-semibold text-white">Admissions Pipeline</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {Object.keys(admissionsCounts).length > 0 ? (
              Object.entries(admissionsCounts).map(([status, total]) => (
                <div key={status} className="flex items-center justify-between">
                  <span>{status}</span>
                  <span className="text-slate-100">{total}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No admissions data available.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-5">
          <h2 className="text-base font-semibold text-white">Demographics</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {Object.keys(demographics).length > 0 ? (
              Object.entries(demographics).map(([gender, total]) => (
                <div key={gender} className="flex items-center justify-between">
                  <span>{gender}</span>
                  <span className="text-slate-100">{total}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No demographic data available.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl glass-panel p-5">
          <h2 className="text-base font-semibold text-white">Attendance Summary</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Present</span>
              <span className="text-slate-100">{attendanceTotals.present}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Absent</span>
              <span className="text-slate-100">{attendanceTotals.absent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Late</span>
              <span className="text-slate-100">{attendanceTotals.late}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold">Recent Behavior Incidents</h2>
            <p className="mt-1 text-sm text-slate-400">Latest entries from behavior logs.</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {behaviorIncidents.slice(0, 8).map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{row.incident_type}</td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3">{row.incident_date}</td>
                </tr>
              ))}
              {behaviorIncidents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={3}>
                    No behavior incidents available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {isPrintModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-semibold">Print Student Report</h3>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                Select student
                <select
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                >
                  <option value="">Choose student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.admission_number})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-100 disabled:opacity-70"
                  onClick={() => handleDownloadStudent('csv')}
                  disabled={!selectedStudentId || isDownloading}
                >
                  {isDownloading ? 'Working...' : 'Download CSV'}
                </button>
                <button
                  className="w-full rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-100 disabled:opacity-70"
                  onClick={() => handleDownloadStudent('pdf')}
                  disabled={!selectedStudentId || isDownloading}
                >
                  {isDownloading ? 'Working...' : 'Download PDF'}
                </button>
              </div>
              <button
                className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
                onClick={handlePrintStudentReport}
                disabled={!selectedStudentId || isPrinting || isDownloading}
              >
                {isPrinting ? 'Preparing...' : 'Print Report'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
