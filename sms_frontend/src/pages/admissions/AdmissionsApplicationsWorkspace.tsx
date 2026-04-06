import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import BackButton from '../../components/BackButton'
import PageHero from '../../components/PageHero'

const pipelineStages = [
  'Inquiry',
  'Submitted',
  'Documents Received',
  'Interview Scheduled',
  'Assessed',
  'Admitted',
  'Rejected',
  'Enrolled',
  'Withdrawn',
]

type ApplicationDocument = {
  type: string
  received: boolean
}

type Application = {
  id: number
  application_number?: string
  student_first_name: string
  student_last_name: string
  student_dob?: string
  student_gender?: string
  previous_school?: string
  applying_for_grade?: number | null
  applying_for_grade_name?: string
  application_date?: string
  status?: string
  interview_date?: string | null
  interview_notes?: string
  assessment_score?: number | null
  decision?: string | null
  decision_date?: string | null
  decision_notes?: string
  student?: number | null
  guardian_name?: string
  guardian_phone?: string
  guardian_email?: string
  notes?: string
  student_photo?: string | null
  uploaded_documents?: Array<{ id: number; name: string; url: string }>
  documents?: ApplicationDocument[]
  created_at?: string
}

type GradeOption = {
  id: number
  name: string
}

type TermOption = {
  id: number
  name: string
}

type AdmissionsSummary = {
  total: number
  stages: string[]
  counts: Record<string, number>
}

type SurfaceKind = 'admissions' | 'students'

type SurfaceConfig = {
  hero: {
    badge: string
    badgeColor: string
    title: string
    subtitle: string
    icon: string
  }
  applicationsSubtitle: string
  newApplicationLabel: string
  modalBackLabel: string
  settingsLinkTo: string
  settingsLinkLabel: string
  decisionCallout: string
  banner: {
    tone: 'amber' | 'sky'
    title: string
    body: string
  }
}

const SURFACE_CONFIG: Record<SurfaceKind, SurfaceConfig> = {
  admissions: {
    hero: {
      badge: 'ADMISSIONS',
      badgeColor: 'amber',
      title: 'Applications',
      subtitle:
        'Own the applicant pipeline, documents, and enrollment readiness from one admissions workspace.',
      icon: 'ADM',
    },
    applicationsSubtitle: 'Review and advance applicants from submission through enrollment.',
    newApplicationLabel: 'New application',
    modalBackLabel: 'Back to Applications',
    settingsLinkTo: '/settings/admission',
    settingsLinkLabel: 'Open Admissions Settings',
    decisionCallout:
      'Decision, offer, and parent response stay on the Admissions Decisions page so workflow overlays remain attached to the canonical application record.',
    banner: {
      tone: 'amber',
      title: 'Canonical intake workspace',
      body:
        'Admissions owns the application pipeline. The students-module admissions route remains a compatibility surface for existing operational flows.',
    },
  },
  students: {
    hero: {
      badge: 'MODULE',
      badgeColor: 'emerald',
      title: 'Admissions',
      subtitle: 'Track applications and enrollment in one place.',
      icon: 'STU',
    },
    applicationsSubtitle: 'Review active applicants from the student operations side.',
    newApplicationLabel: 'New application',
    modalBackLabel: 'Back to Admissions',
    settingsLinkTo: '/settings/students',
    settingsLinkLabel: 'Open Student Settings',
    decisionCallout: 'Decision, offer, and parent response are managed in the Admissions Decisions page.',
    banner: {
      tone: 'sky',
      title: 'Compatibility surface',
      body:
        'This students-side view remains available for existing workflows, but the admissions module now owns the first-class application workspace.',
    },
  },
}

const ADMISSIONS_HERO_LINKS = [
  { label: 'Inquiries', to: '/modules/admissions/inquiries' },
  { label: 'Reviews', to: '/modules/admissions/reviews' },
  { label: 'Decisions', to: '/modules/admissions/decisions' },
  { label: 'Enrollment', to: '/modules/admissions/enrollment' },
]

const isNetworkError = (err: unknown) => !(err as { response?: unknown })?.response
const getStatus = (err: unknown) => (err as { response?: { status?: number } })?.response?.status

type AdmissionsApplicationsWorkspaceProps = {
  surface?: SurfaceKind
}

export default function AdmissionsApplicationsWorkspace(
  { surface = 'admissions' }: AdmissionsApplicationsWorkspaceProps = {},
) {
  const surfaceConfig = SURFACE_CONFIG[surface]
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [summaryCounts, setSummaryCounts] = useState<Record<string, number> | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formState, setFormState] = useState({
    student_first_name: '',
    student_last_name: '',
    student_dob: '',
    student_gender: '',
    previous_school: '',
    applying_for_grade: '',
    application_date: new Date().toISOString().slice(0, 10),
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    notes: '',
    documents: [] as File[],
    student_photo: null as File | null,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [gradeOptions, setGradeOptions] = useState<GradeOption[]>([])
  const [termOptions, setTermOptions] = useState<TermOption[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [interviewDate, setInterviewDate] = useState('')
  const [assessmentScore, setAssessmentScore] = useState('')
  const [applicationStatus, setApplicationStatus] = useState('Submitted')
  const [isSavingMeta, setIsSavingMeta] = useState(false)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pendingDocumentDeleteId, setPendingDocumentDeleteId] = useState<number | null>(null)
  const [isDeletingDocument, setIsDeletingDocument] = useState(false)
  const [enrollForm, setEnrollForm] = useState({
    admission_number: '',
    school_class: '',
    term: '',
    enrollment_date: new Date().toISOString().slice(0, 10),
  })
  const [flash, setFlash] = useState<string | null>(null)
  const pageSize = 8

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      const [applicationsResult, classesResult, termsResult, summaryResult] = await Promise.allSettled([
        apiClient.get<Application[] | { results: Application[]; count: number }>(
          '/admissions/applications/',
          {
            params: {
              page,
              page_size: pageSize,
              search: query.trim() || undefined,
              status: statusFilter !== 'all' ? statusFilter : undefined,
            },
          },
        ),
        apiClient.get<GradeOption[] | { results: GradeOption[]; count: number }>(
          '/academics/ref/classes/',
        ),
        apiClient.get<TermOption[] | { results: TermOption[]; count: number }>(
          '/academics/ref/terms/',
        ),
        apiClient.get<AdmissionsSummary>('/admissions/summary/'),
      ])

      if (!isMounted) return

      if (applicationsResult.status === 'fulfilled') {
        const normalized = normalizePaginatedResponse(applicationsResult.value.data)
        setApplications(normalized.items)
        setTotalCount(normalized.totalCount)
        setIsServerPaginated(normalized.isPaginated)
      } else {
        const status = getStatus(applicationsResult.reason)
        setApplications([])
        setTotalCount(0)
        setIsServerPaginated(false)
        setError(
          isNetworkError(applicationsResult.reason)
            ? 'Admissions API unreachable.'
            : `Admissions API error${status ? ` (${status})` : ''}.`,
        )
      }

      if (classesResult.status === 'fulfilled') {
        const normalized = normalizePaginatedResponse(classesResult.value.data)
        setGradeOptions(normalized.items)
      } else {
        setGradeOptions([])
      }

      if (termsResult.status === 'fulfilled') {
        const normalized = normalizePaginatedResponse<TermOption>(termsResult.value.data)
        setTermOptions(normalized.items)
      } else {
        setTermOptions([])
      }

      if (summaryResult.status === 'fulfilled') {
        setSummaryCounts(summaryResult.value.data.counts ?? {})
      } else {
        setSummaryCounts(null)
      }

      setIsLoading(false)
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [page, query, statusFilter, refreshKey])

  useEffect(() => {
    if (!selectedApplication) return
    const updated = applications.find((item) => item.id === selectedApplication.id)
    if (updated) setSelectedApplication(updated)
  }, [applications, selectedApplication])

  useEffect(() => {
    if (!selectedApplication) {
      setInterviewDate('')
      setAssessmentScore('')
      setApplicationStatus('Submitted')
      return
    }
    setInterviewDate(selectedApplication.interview_date ?? '')
    setAssessmentScore(
      selectedApplication.assessment_score != null ? String(selectedApplication.assessment_score) : '',
    )
    setApplicationStatus(selectedApplication.status ?? 'Submitted')
  }, [selectedApplication])

  const pipelineCounts = useMemo(() => {
    const counts = new Map<string, number>()
    pipelineStages.forEach((stage) => counts.set(stage, 0))
    applications.forEach((application) => {
      const status = application.status ?? 'Submitted'
      if (counts.has(status)) {
        counts.set(status, (counts.get(status) ?? 0) + 1)
      }
    })
    return counts
  }, [applications])

  const effectivePipelineCounts = useMemo(() => {
    if (!summaryCounts) return pipelineCounts
    const counts = new Map<string, number>()
    pipelineStages.forEach((stage) => counts.set(stage, summaryCounts[stage] ?? 0))
    return counts
  }, [pipelineCounts, summaryCounts])

  const filteredApplications = useMemo(() => {
    if (isServerPaginated) return applications
    const term = query.trim().toLowerCase()
    return applications.filter((application) => {
      if (statusFilter !== 'all' && application.status !== statusFilter) return false
      if (!term) return true
      const fullName = `${application.student_first_name} ${application.student_last_name}`.toLowerCase()
      return (
        fullName.includes(term) ||
        (application.application_number ?? '').toLowerCase().includes(term)
      )
    })
  }, [applications, query, statusFilter, isServerPaginated])

  const pagedApplications = useMemo(() => {
    if (isServerPaginated) return filteredApplications
    const start = (page - 1) * pageSize
    return filteredApplications.slice(start, start + pageSize)
  }, [filteredApplications, isServerPaginated, page])

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : filteredApplications.length) / pageSize),
  )

  const heroStats = useMemo(() => {
    const summaryTotal = summaryCounts
      ? Object.values(summaryCounts).reduce((sum, count) => sum + count, 0)
      : null
    return [
      {
        label: 'Applications',
        value: (summaryTotal ?? totalCount) || applications.length,
        color: surface === 'admissions' ? '#fcd34d' : '#34d399',
      },
      {
        label: 'Admitted',
        value: effectivePipelineCounts.get('Admitted') ?? 0,
        color: '#fb923c',
      },
      {
        label: 'Enrolled',
        value: effectivePipelineCounts.get('Enrolled') ?? 0,
        color: '#34d399',
      },
    ]
  }, [applications.length, effectivePipelineCounts, summaryCounts, surface, totalCount])

  const clearFormErrors = () => {
    setFormError(null)
    setFieldErrors({})
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFormErrors()

    const emailValue = formState.guardian_email.trim()
    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

    const nextErrors: Record<string, string> = {}
    if (!formState.student_first_name.trim()) nextErrors.student_first_name = 'First name is required.'
    if (!formState.student_last_name.trim()) nextErrors.student_last_name = 'Last name is required.'
    if (!formState.student_dob) nextErrors.student_dob = 'Date of birth is required.'
    if (!formState.student_gender) nextErrors.student_gender = 'Gender is required.'
    if (!formState.applying_for_grade) nextErrors.applying_for_grade = 'Select grade.'
    if (!formState.application_date) nextErrors.application_date = 'Application date is required.'
    if (emailValue && !isValidEmail(emailValue)) nextErrors.guardian_email = 'Enter a valid email address.'

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    setIsSubmitting(true)
    try {
      const hasUploads = formState.documents.length > 0 || Boolean(formState.student_photo)

      if (hasUploads) {
        const formData = new FormData()
        formData.append('student_first_name', formState.student_first_name.trim())
        formData.append('student_last_name', formState.student_last_name.trim())
        formData.append('student_dob', formState.student_dob)
        formData.append('student_gender', formState.student_gender)
        formData.append('applying_for_grade', String(formState.applying_for_grade))
        formData.append('application_date', formState.application_date)

        if (formState.previous_school.trim()) formData.append('previous_school', formState.previous_school.trim())
        if (formState.guardian_name.trim()) formData.append('guardian_name', formState.guardian_name.trim())
        if (formState.guardian_phone.trim()) formData.append('guardian_phone', formState.guardian_phone.trim())
        if (emailValue) formData.append('guardian_email', emailValue.toLowerCase())
        if (formState.notes.trim()) formData.append('notes', formState.notes.trim())

        if (formState.student_photo) {
          formData.append('student_photo', formState.student_photo)
        }
        formState.documents.forEach((file) => {
          formData.append('documents_upload', file)
        })

        await apiClient.post('/admissions/applications/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        const payload: Record<string, unknown> = {
          student_first_name: formState.student_first_name.trim(),
          student_last_name: formState.student_last_name.trim(),
          student_dob: formState.student_dob,
          student_gender: formState.student_gender,
          applying_for_grade: Number(formState.applying_for_grade),
          application_date: formState.application_date,
        }

        if (formState.previous_school.trim()) payload.previous_school = formState.previous_school.trim()
        if (formState.guardian_name.trim()) payload.guardian_name = formState.guardian_name.trim()
        if (formState.guardian_phone.trim()) payload.guardian_phone = formState.guardian_phone.trim()
        if (emailValue) payload.guardian_email = emailValue.toLowerCase()
        if (formState.notes.trim()) payload.notes = formState.notes.trim()

        await apiClient.post('/admissions/applications/', payload)
      }
      setFlash('Application submitted.')
      setFormState({
        student_first_name: '',
        student_last_name: '',
        student_dob: '',
        student_gender: '',
        previous_school: '',
        applying_for_grade: '',
        application_date: new Date().toISOString().slice(0, 10),
        guardian_name: '',
        guardian_phone: '',
        guardian_email: '',
        notes: '',
        documents: [],
        student_photo: null,
      })
      setIsFormOpen(false)
      setPage(1)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      if (data && typeof data === 'object') {
        const nextErrors: Record<string, string> = {}
        const assign = (key: string) => {
          const value = data[key]
          if (Array.isArray(value)) nextErrors[key] = value.join(' ')
          else if (typeof value === 'string') nextErrors[key] = value
        }
        ;[
          'student_first_name',
          'student_last_name',
          'student_dob',
          'student_gender',
          'applying_for_grade',
          'application_date',
          'guardian_email',
          'guardian_phone',
          'guardian_name',
        ].forEach(assign)
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors)
          setFormError('Please correct the highlighted fields.')
          return
        }
      }
      setFormError(isNetworkError(err) ? 'Network error. Please try again.' : 'Unable to submit application.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApplicationMetaUpdate = async () => {
    if (!selectedApplication) return
    clearFormErrors()
    const scoreValue = assessmentScore.trim()
    if (scoreValue) {
      const parsed = Number(scoreValue)
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        setFormError('Assessment score must be a number between 0 and 100.')
        return
      }
    }
    setIsSavingMeta(true)
    try {
      const payload: Record<string, unknown> = {}
      if (interviewDate) payload.interview_date = interviewDate
      if (scoreValue) payload.assessment_score = Number(scoreValue)
      payload.status = applicationStatus
      if (Object.keys(payload).length === 0) {
        setFormError('No interview or assessment updates to save.')
        return
      }

      await apiClient.patch(`/admissions/applications/${selectedApplication.id}/`, payload)
      setFlash('Application details updated.')
      setSelectedApplication(null)
      setInterviewDate('')
      setAssessmentScore('')
      setApplicationStatus('Submitted')
      setPage(1)
      setRefreshKey((prev) => prev + 1)
    } catch {
      setFormError('Unable to update application.')
    } finally {
      setIsSavingMeta(false)
    }
  }

  const handleEnroll = async () => {
    if (!selectedApplication) return
    if (selectedApplication.status === 'Enrolled') {
      setFormError('This application is already enrolled.')
      return
    }
    if (!enrollForm.school_class || !enrollForm.term) {
      setFormError('School class and term are required to enroll.')
      return
    }
    setIsEnrolling(true)
    try {
      const checkResponse = await apiClient.post(
        `/admissions/applications/${selectedApplication.id}/enrollment-check/`,
      )
      if (!checkResponse.data?.eligible) {
        const checks = checkResponse.data?.checks ?? {}
        const failed = Object.entries(checks)
          .filter(([, value]) => !value)
          .map(([key]) => key)
        setFormError(
          `Enrollment blocked. Failed checks: ${failed.join(', ') || 'unknown'}. Complete decision + parent response first in Admissions > Decisions.`,
        )
        setIsEnrolling(false)
        return
      }

      const payload: Record<string, unknown> = {
        assign_admission_number: !enrollForm.admission_number.trim(),
        school_class: Number(enrollForm.school_class),
        term: Number(enrollForm.term),
        enrollment_date: enrollForm.enrollment_date,
      }
      if (enrollForm.admission_number.trim()) {
        payload.admission_number = enrollForm.admission_number.trim()
      }
      await apiClient.post(`/admissions/applications/${selectedApplication.id}/enroll/`, payload)
      setFlash('Enrollment completed.')
      setSelectedApplication(null)
      setEnrollForm({
        admission_number: '',
        school_class: '',
        term: '',
        enrollment_date: new Date().toISOString().slice(0, 10),
      })
      setPage(1)
      setRefreshKey((prev) => prev + 1)
    } catch (err: any) {
      const detail = err?.response?.data
      if (detail?.error) {
        setFormError(String(detail.error))
      } else {
        setFormError('Unable to enroll application.')
      }
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleApplicationPhotoReplace = async (file: File) => {
    if (!selectedApplication) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('student_photo', file)
      await apiClient.patch(`/admissions/applications/${selectedApplication.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFlash('Photo updated.')
      setRefreshKey((prev) => prev + 1)
    } catch {
      setFormError('Unable to update photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleApplicationDocumentsUpload = async (files: FileList | null) => {
    if (!selectedApplication || !files || files.length === 0) return
    setUploadingDocs(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('documents_upload', file))
      await apiClient.post(`/admissions/applications/${selectedApplication.id}/documents/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFlash('Documents uploaded.')
      setRefreshKey((prev) => prev + 1)
    } catch {
      setFormError('Unable to upload documents.')
    } finally {
      setUploadingDocs(false)
    }
  }

  const handleApplicationDocumentDelete = async (docId: number) => {
    if (!selectedApplication) return
    setPendingDocumentDeleteId(docId)
  }

  const confirmApplicationDocumentDelete = async () => {
    if (!selectedApplication || pendingDocumentDeleteId === null) return
    setIsDeletingDocument(true)
    try {
      await apiClient.delete(
        `/admissions/applications/${selectedApplication.id}/documents/${pendingDocumentDeleteId}/`,
      )
      setFlash('Document removed.')
      setRefreshKey((prev) => prev + 1)
    } catch {
      setFormError('Unable to delete document.')
    } finally {
      setIsDeletingDocument(false)
      setPendingDocumentDeleteId(null)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge={surfaceConfig.hero.badge}
        badgeColor={surfaceConfig.hero.badgeColor}
        title={surfaceConfig.hero.title}
        subtitle={surfaceConfig.hero.subtitle}
        stats={heroStats}
        actions={
          surface === 'admissions' ? (
            <>
              {ADMISSIONS_HERO_LINKS.map((item) => (
                <Link
                  key={item.to}
                  className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                  to={item.to}
                >
                  {item.label}
                </Link>
              ))}
            </>
          ) : undefined
        }
        icon="📋"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading admissions...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          {error}
        </div>
      ) : null}

      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
          {flash}
        </div>
      ) : null}

      <section
        className={`col-span-12 rounded-2xl border p-4 ${
          surfaceConfig.banner.tone === 'amber'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
            : 'border-sky-500/30 bg-sky-500/10 text-sky-100'
        }`}
      >
        <p className="text-sm font-semibold">{surfaceConfig.banner.title}</p>
        <p className="mt-1 text-xs leading-5 opacity-90">{surfaceConfig.banner.body}</p>
      </section>

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold">Pipeline stages</h2>
            <p className="mt-1 text-xs text-slate-400">
              {summaryCounts
                ? 'Global counts from admissions summary.'
                : isServerPaginated
                  ? 'Counts reflect the current page.'
                  : 'Live counts based on loaded data.'}
            </p>
          </div>
        </div>
        {!summaryCounts ? (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            Admissions summary is unavailable. Counts are based on loaded data only.
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pipelineStages.map((stage) => (
            <div key={stage} className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">{stage}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">
                {effectivePipelineCounts.get(stage) ?? 0}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="col-span-12">
        <div className="rounded-2xl glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold">Applications</h2>
              <p className="mt-1 text-sm text-slate-400">{surfaceConfig.applicationsSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-xl border border-white/[0.09] px-3 py-2 text-xs text-slate-200"
                onClick={() => setIsFormOpen(true)}
              >
                {surfaceConfig.newApplicationLabel}
              </button>
              <input
                className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                placeholder="Search applicant or application #"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
              />
              <select
                className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All statuses</option>
                {pipelineStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pagedApplications.map((application) => (
                  <tr key={application.id} className="bg-slate-950/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-white/[0.07] bg-[#0d1421]">
                          {application.student_photo ? (
                            <img
                              src={application.student_photo}
                              alt={`${application.student_first_name} ${application.student_last_name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                              NA
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">
                            {application.student_first_name} {application.student_last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {application.application_number ?? '--'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {application.applying_for_grade_name ?? application.applying_for_grade ?? '--'}
                    </td>
                    <td className="px-4 py-3">{application.status ?? 'Submitted'}</td>
                    <td className="px-4 py-3">{application.application_date ?? '--'}</td>
                    <td className="px-4 py-3">
                      {(application.uploaded_documents ?? []).length > 0 ? (
                        <div className="text-xs text-slate-300">
                          {application.uploaded_documents?.length} file(s)
                        </div>
                      ) : (application.documents ?? []).length > 0 ? (
                        <div className="text-xs text-slate-400">Checklist only</div>
                      ) : (
                        <span className="text-xs text-slate-500">No docs</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200"
                        onClick={() => {
                          clearFormErrors()
                          setSelectedApplication(application)
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {pagedApplications.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                      No applications found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-[900px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <div className="mb-4">
              <BackButton onClick={() => setIsFormOpen(false)} label={surfaceConfig.modalBackLabel} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-semibold">New application</h3>
                <p className="mt-1 text-xs text-slate-400">Enter applicant details and submit.</p>
              </div>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
                onClick={() => setIsFormOpen(false)}
              >
                Close
              </button>
            </div>
            <form className="mt-6 space-y-6 text-sm" onSubmit={handleSubmit}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Student Information
                  </div>
                  <div className="grid gap-4">
                    <label className="block">
                      <span className="text-xs text-slate-400">First name</span>
                      <input
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                        placeholder="First name"
                        value={formState.student_first_name}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, student_first_name: event.target.value }))
                        }
                      />
                      {fieldErrors.student_first_name ? (
                        <p className="mt-1 text-xs text-rose-300">{fieldErrors.student_first_name}</p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-400">Last name</span>
                      <input
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                        placeholder="Last name"
                        value={formState.student_last_name}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, student_last_name: event.target.value }))
                        }
                      />
                      {fieldErrors.student_last_name ? (
                        <p className="mt-1 text-xs text-rose-300">{fieldErrors.student_last_name}</p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-400">Date of birth</span>
                      <input
                        type="date"
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                        value={formState.student_dob}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, student_dob: event.target.value }))
                        }
                      />
                      {fieldErrors.student_dob ? (
                        <p className="mt-1 text-xs text-rose-300">{fieldErrors.student_dob}</p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-400">Gender</span>
                      <select
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                        value={formState.student_gender}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, student_gender: event.target.value }))
                        }
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {fieldErrors.student_gender ? (
                        <p className="mt-1 text-xs text-rose-300">{fieldErrors.student_gender}</p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-400">Grade applying for</span>
                      <select
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                        value={formState.applying_for_grade}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, applying_for_grade: event.target.value }))
                        }
                      >
                        <option value="">Select grade</option>
                        {gradeOptions.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.applying_for_grade ? (
                        <p className="mt-1 text-xs text-rose-300">{fieldErrors.applying_for_grade}</p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-400">Application date</span>
                      <input
                        type="date"
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                        value={formState.application_date}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, application_date: event.target.value }))
                        }
                      />
                      {fieldErrors.application_date ? (
                        <p className="mt-1 text-xs text-rose-300">{fieldErrors.application_date}</p>
                      ) : null}
                    </label>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Previous School
                    </div>
                    <label className="block">
                      <span className="text-xs text-slate-400">Previous school name (optional)</span>
                      <input
                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                        placeholder="Previous school"
                        value={formState.previous_school}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, previous_school: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div>
                    <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Parent / Guardian Information
                    </div>
                    <div className="grid gap-4">
                      <label className="block">
                        <span className="text-xs text-slate-400">Guardian name (optional)</span>
                        <input
                          className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                          placeholder="Guardian name"
                          value={formState.guardian_name}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, guardian_name: event.target.value }))
                          }
                        />
                        {fieldErrors.guardian_name ? (
                          <p className="mt-1 text-xs text-rose-300">{fieldErrors.guardian_name}</p>
                        ) : null}
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">Guardian phone (optional)</span>
                        <input
                          className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                          placeholder="+255700000001"
                          value={formState.guardian_phone}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, guardian_phone: event.target.value }))
                          }
                        />
                        {fieldErrors.guardian_phone ? (
                          <p className="mt-1 text-xs text-rose-300">{fieldErrors.guardian_phone}</p>
                        ) : null}
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-400">Guardian email (optional)</span>
                        <input
                          className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                          placeholder="guardian@example.com"
                          value={formState.guardian_email}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, guardian_email: event.target.value }))
                          }
                        />
                        {fieldErrors.guardian_email ? (
                          <p className="mt-1 text-xs text-rose-300">{fieldErrors.guardian_email}</p>
                        ) : null}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.07] pt-6">
                <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Additional Information
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block lg:col-span-2">
                    <span className="text-xs text-slate-400">Notes (optional)</span>
                    <textarea
                      className="mt-2 w-full rounded-lg border border-white/[0.07] bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                      rows={4}
                      value={formState.notes}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, notes: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-400">Student photo (optional)</span>
                    <div className="mt-2 rounded-xl border border-dashed border-white/[0.09] bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-400">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-xs text-slate-300"
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            student_photo: event.target.files?.[0] ?? null,
                          }))
                        }
                      />
                      <p className="mt-2">Drop or click to upload</p>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-400">Supporting documents (optional)</span>
                    <div className="mt-2 rounded-xl border border-dashed border-white/[0.09] bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-400">
                      <input
                        type="file"
                        multiple
                        className="w-full text-xs text-slate-300"
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            documents: Array.from(event.target.files ?? []),
                          }))
                        }
                      />
                      <p className="mt-2">Upload documents</p>
                    </div>
                  </label>
                </div>
              </div>

              {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedApplication ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-semibold">Manage application</h3>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
                onClick={() => {
                  clearFormErrors()
                  setSelectedApplication(null)
                }}
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-2xl glass-panel p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Uploads</p>
                    <p className="text-sm text-slate-300">Student photo and documents</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-400">Student photo</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d1421]">
                        {selectedApplication.student_photo ? (
                          <img
                            src={selectedApplication.student_photo}
                            alt="Student"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                            NA
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) handleApplicationPhotoReplace(file)
                            }}
                          />
                          {uploadingPhoto ? 'Uploading...' : 'Replace'}
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-400">Documents</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{selectedApplication.uploaded_documents?.length ?? 0} file(s)</span>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200">
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(event) => handleApplicationDocumentsUpload(event.target.files)}
                        />
                        {uploadingDocs ? 'Uploading...' : 'Add files'}
                      </label>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(selectedApplication.uploaded_documents ?? []).length > 0 ? (
                        selectedApplication.uploaded_documents?.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-lg border border-white/[0.07] px-3 py-2 text-xs"
                          >
                            <a
                              className="truncate text-slate-200 underline-offset-2 hover:underline"
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {doc.name}
                            </a>
                            <button
                              className="text-rose-300 hover:text-rose-200"
                              onClick={() => handleApplicationDocumentDelete(doc.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No uploaded documents.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <label className="block text-sm">
                Interview date
                <input
                  type="date"
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={interviewDate}
                  onChange={(event) => setInterviewDate(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                Assessment score
                <input
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={assessmentScore}
                  onChange={(event) => setAssessmentScore(event.target.value)}
                  placeholder="0-100"
                />
              </label>
              <label className="block text-sm md:col-span-2">
                Application stage
                <select
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={applicationStatus}
                  onChange={(event) => setApplicationStatus(event.target.value)}
                >
                  {pipelineStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              {surfaceConfig.decisionCallout}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
                onClick={() => handleApplicationMetaUpdate()}
                disabled={isSavingMeta}
              >
                {isSavingMeta ? 'Saving...' : 'Save updates'}
              </button>
              <Link
                className="rounded-xl border border-white/[0.09] px-4 py-2 text-sm text-slate-200"
                to={surfaceConfig.settingsLinkTo}
              >
                {surfaceConfig.settingsLinkLabel}
              </Link>
            </div>

            <div className="mt-6 rounded-2xl glass-panel p-4">
              <h4 className="text-sm font-semibold">Enroll applicant</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  Admission #
                  <input
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={enrollForm.admission_number}
                    onChange={(event) =>
                      setEnrollForm((prev) => ({ ...prev, admission_number: event.target.value }))
                    }
                    placeholder="Leave blank to auto-assign"
                  />
                </label>
                <label className="block text-sm">
                  Class
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={enrollForm.school_class}
                    onChange={(event) =>
                      setEnrollForm((prev) => ({ ...prev, school_class: event.target.value }))
                    }
                  >
                    <option value="">Select class</option>
                    {gradeOptions.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Term
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={enrollForm.term}
                    onChange={(event) =>
                      setEnrollForm((prev) => ({ ...prev, term: event.target.value }))
                    }
                  >
                    <option value="">Select term</option>
                    {termOptions.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Enrollment date
                  <input
                    type="date"
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={enrollForm.enrollment_date}
                    onChange={(event) =>
                      setEnrollForm((prev) => ({ ...prev, enrollment_date: event.target.value }))
                    }
                  />
                </label>
              </div>
              <button
                className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
                onClick={handleEnroll}
                disabled={isEnrolling || selectedApplication.status === 'Enrolled'}
              >
                {selectedApplication.status === 'Enrolled'
                  ? 'Already enrolled'
                  : isEnrolling
                    ? 'Enrolling...'
                    : 'Enroll applicant'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDocumentDeleteId !== null}
        title="Delete application document"
        description="This document will be removed from the application. Continue?"
        confirmLabel="Confirm delete"
        isProcessing={isDeletingDocument}
        error={null}
        onConfirm={() => void confirmApplicationDocumentDelete()}
        onCancel={() => setPendingDocumentDeleteId(null)}
      />
    </div>
  )
}
