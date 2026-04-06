import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'
import { normalizePaginatedResponse } from '../../api/pagination'
import { downloadBlob, extractFilename } from '../../utils/download'
import PageHero from '../../components/PageHero'

const incidentTypes = ['Positive', 'Negative']
const severityOptions = ['Low', 'Medium', 'High', 'Critical']

type BehaviorIncident = {
  id: number
  student: number
  student_name?: string
  incident_type: string
  category: string
  incident_date: string
  severity?: string
  description?: string
}

type StudentRef = {
  id: number
  admission_number: string
  first_name: string
  last_name: string
  school_class?: number
  class_name?: string
}

const isNetworkError = (err: unknown) => !(err as { response?: unknown })?.response

export default function StudentsBehaviorPage() {
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([])
  const [students, setStudents] = useState<StudentRef[]>([])
  const [classes, setClasses] = useState<{ id: number; display_name: string }[]>([])
  const [formClassFilter, setFormClassFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [studentFilter, setStudentFilter] = useState('')
  const [incidentType, setIncidentType] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isServerPaginated, setIsServerPaginated] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const pageSize = 10

  const [formState, setFormState] = useState({
    student: '',
    incident_type: '',
    category: '',
    incident_date: new Date().toISOString().slice(0, 10),
    severity: '',
    description: '',
  })

  useEffect(() => {
    let isMounted = true
    const loadIncidents = async () => {
      try {
        const response = await apiClient.get<BehaviorIncident[] | { results: BehaviorIncident[]; count: number }>(
          '/behavior/incidents/',
          {
            params: {
              page,
              page_size: pageSize,
              student: studentFilter || undefined,
              incident_type: incidentType !== 'all' ? incidentType : undefined,
              severity: severityFilter !== 'all' ? severityFilter : undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            },
          },
        )
        if (!isMounted) return
        const normalized = normalizePaginatedResponse(response.data)
        setIncidents(normalized.items)
        setTotalCount(normalized.totalCount)
        setIsServerPaginated(normalized.isPaginated)
        setError(null)
      } catch (err) {
        if (!isMounted) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) setError('Session expired. Please log in again.')
        else if (status === 403) setError('Access denied. Ensure this user has the STUDENTS module.')
        else setError('Unable to load behavior incidents.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    const loadStudents = async () => {
      try {
        const response = await apiClient.get<StudentRef[] | { results: StudentRef[]; count: number }>(
          '/students/',
          { params: { page_size: 200 } },
        )
        if (!isMounted) return
        setStudents(normalizePaginatedResponse(response.data).items)
      } catch {
        if (!isMounted) return
        setStudents([])
      }
    }

    const loadClasses = async () => {
      try {
        const res = await apiClient.get('/academics/classes/')
        if (!isMounted) return
        setClasses(res.data.results || res.data || [])
      } catch {
        if (!isMounted) return
      }
    }

    loadIncidents()
    loadStudents()
    loadClasses()
    return () => {
      isMounted = false
    }
  }, [page, studentFilter, incidentType, severityFilter, dateFrom, dateTo, refreshKey])

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPaginated ? totalCount : incidents.length) / pageSize),
  )

  const handleSubmit = async () => {
    setFormError(null)
    setFlash(null)
    if (!formState.student || !formState.incident_type || !formState.category || !formState.incident_date) {
      setFormError('Student, type, category, and date are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        student: Number(formState.student),
        incident_type: formState.incident_type,
        category: formState.category.trim(),
        incident_date: formState.incident_date,
      }
      if (formState.severity) payload.severity = formState.severity
      if (formState.description.trim()) payload.description = formState.description.trim()

      await apiClient.post('/behavior/incidents/', payload)
      setIsFormOpen(false)
      setFormState({
        student: '',
        incident_type: '',
        category: '',
        incident_date: new Date().toISOString().slice(0, 10),
        severity: '',
        description: '',
      })
      setPage(1)
      setFlash('Behavior incident logged successfully.')
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setFormError(isNetworkError(err) ? 'Network error. Please try again.' : 'Unable to save incident.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownload = async (format: 'csv' | 'pdf') => {
    setDownloadError(null)
    setIsDownloading(true)
    try {
      const response = await apiClient.get(`/behavior/incidents/export/${format}/`, {
        responseType: 'blob',
        params: {
          student: studentFilter || undefined,
          incident_type: incidentType !== 'all' ? incidentType : undefined,
          severity: severityFilter !== 'all' ? severityFilter : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const defaultName =
        format === 'csv' ? 'behavior_incidents_report.csv' : 'behavior_incidents_report.pdf'
      const filename = extractFilename(contentDisposition, defaultName)
      downloadBlob(response.data as Blob, filename)
    } catch {
      setDownloadError(`Unable to download behavior ${format.toUpperCase()} report.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const displayIncidents = useMemo(() => incidents, [incidents])

  return (
    <div className="grid grid-cols-12 gap-6">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Behavior & Discipline"
        subtitle="Log incidents and track student conduct."
        icon="📋"
      />

      {isLoading ? (
        <div className="col-span-12 rounded-2xl glass-panel p-6">
          <p className="text-sm text-slate-300">Loading incidents...</p>
        </div>
      ) : null}

      {error ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {downloadError ? (
        <div className="col-span-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
          {downloadError}
        </div>
      ) : null}

      {flash ? (
        <div className="col-span-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200">
          {flash}
        </div>
      ) : null}

      <section className="col-span-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Recent incidents</h2>
            <p className="mt-1 text-sm text-slate-400">Most recent behavior reports.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownload('csv')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download CSV'}
            </button>
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200 disabled:opacity-70"
              onClick={() => handleDownload('pdf')}
              disabled={isDownloading}
            >
              {isDownloading ? 'Working...' : 'Download PDF'}
            </button>
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={studentFilter}
              onChange={(event) => {
                setStudentFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.admission_number} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={incidentType}
              onChange={(event) => {
                setIncidentType(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All types</option>
              {incidentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={severityFilter}
              onChange={(event) => {
                setSeverityFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All severities</option>
              {severityOptions.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
            />
            <input
              type="date"
              className="rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPage(1)
              }}
            />
            <button
              className="rounded-xl border border-white/[0.09] px-3 py-2 text-sm text-slate-200"
              onClick={() => {
                setStudentFilter('')
                setIncidentType('all')
                setSeverityFilter('all')
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
            >
              Reset
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => {
                setIsFormOpen(true)
                setFormError(null)
              }}
            >
              Log incident
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayIncidents.map((row) => (
                <tr key={row.id} className="bg-slate-950/60">
                  <td className="px-4 py-3 font-semibold">{row.student_name ?? row.student}</td>
                  <td className="px-4 py-3">{row.incident_type}</td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3">{row.incident_date}</td>
                  <td className="px-4 py-3">{row.severity ?? '--'}</td>
                  <td className="px-4 py-3">{row.description ?? '--'}</td>
                </tr>
              ))}
              {displayIncidents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No incidents found.
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
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.07] bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Behavior</p>
                <h3 className="text-lg font-display font-semibold">Log incident</h3>
              </div>
              <button
                className="rounded-lg border border-white/[0.09] px-3 py-1 text-xs text-slate-200"
                onClick={() => { setIsFormOpen(false); setFormClassFilter(''); setFormError(null) }}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  Filter by Class
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={formClassFilter}
                    onChange={(event) => { setFormClassFilter(event.target.value); setFormState((prev) => ({ ...prev, student: '' })) }}
                  >
                    <option value="">All classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.display_name}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Student
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={formState.student}
                    onChange={(event) => setFormState((prev) => ({ ...prev, student: event.target.value }))}
                  >
                    <option value="">Select student</option>
                    {students
                      .filter(s => !formClassFilter || String(s.school_class) === formClassFilter)
                      .map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.admission_number} - {student.first_name} {student.last_name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  Incident type
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={formState.incident_type}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, incident_type: event.target.value }))
                    }
                  >
                    <option value="">Select type</option>
                    {incidentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Severity
                  <select
                    className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                    value={formState.severity}
                    onChange={(event) => setFormState((prev) => ({ ...prev, severity: event.target.value }))}
                  >
                    <option value="">Select severity</option>
                    {severityOptions.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                Category
                <input
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={formState.category}
                  onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Incident date
                <input
                  type="date"
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={formState.incident_date}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, incident_date: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                Notes
                <textarea
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2 text-sm text-white"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
            </div>

            {formError ? <p className="mt-4 text-xs text-rose-300">{formError}</p> : null}
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
